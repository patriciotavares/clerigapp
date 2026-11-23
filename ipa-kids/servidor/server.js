/*
 * Servidor caseiro do Sons Mágicos (Node.js, sem dependências).
 *
 *  - Serve o app web (para testar no computador): http://IP:8080/
 *  - Guarda o progresso de cada criança:          /api/progresso/:perfil
 *  - Recebe gravações de voz dos pais:            /admin
 *  - Entrega o APK para instalar na TV:           http://IP:8080/apk
 *
 * Tudo fica salvo em DADOS (no Docker: o volume no seu HD de 8 TB).
 */
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const PORTA = Number(process.env.PORTA || 8080);
const WEB = path.resolve(process.env.WEB || path.join(__dirname, "..", "web"));
const DADOS = path.resolve(process.env.DADOS || path.join(__dirname, "..", "dados"));
const DIR_AUDIO = path.join(DADOS, "audio");
const DIR_PROG = path.join(DADOS, "progresso");
const DIR_APK = path.join(DADOS, "apk");
const DIR_VOZES = path.join(DADOS, "vozes"); // vozes naturais geradas pelo Piper
for (const d of [DIR_AUDIO, DIR_PROG, DIR_APK, DIR_VOZES]) fs.mkdirSync(d, { recursive: true });

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav", ".woff2": "font/woff2",
  ".apk": "application/vnd.android.package-archive",
};

const nomeSeguro = (n) => /^[\w.-]{1,80}$/.test(n) && !n.startsWith(".");
const perfilArquivo = (p) => path.join(DIR_PROG, Buffer.from(p, "utf8").toString("hex").slice(0, 120) + ".json");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
function json(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}
function lerCorpo(req, limite = 20 * 1024 * 1024) {
  return new Promise((ok, falha) => {
    const partes = []; let tam = 0;
    req.on("data", (c) => { tam += c.length; if (tam > limite) { falha(new Error("grande demais")); req.destroy(); } else partes.push(c); });
    req.on("end", () => ok(Buffer.concat(partes)));
    req.on("error", falha);
  });
}
function enviarArquivo(req, res, arquivo, extraHeaders = {}) {
  fs.stat(arquivo, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("não encontrado"); }
    const tipo = TIPOS[path.extname(arquivo).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const ini = range[1] ? +range[1] : 0, fim = range[2] ? +range[2] : st.size - 1;
      res.writeHead(206, { "Content-Type": tipo, "Content-Range": `bytes ${ini}-${fim}/${st.size}`, "Accept-Ranges": "bytes", "Content-Length": fim - ini + 1, ...extraHeaders });
      return fs.createReadStream(arquivo, { start: ini, end: fim }).pipe(res);
    }
    res.writeHead(200, { "Content-Type": tipo, "Content-Length": st.size, "Accept-Ranges": "bytes", ...extraHeaders });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(arquivo).pipe(res);
  });
}
function dentroDe(base, rel) {
  const alvo = path.resolve(base, "." + path.sep + rel);
  return alvo === base || alvo.startsWith(base + path.sep) ? alvo : null;
}

const servidor = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  let url;
  try { url = new URL(req.url, "http://x"); } catch { res.writeHead(400); return res.end(); }
  const p = decodeURIComponent(url.pathname);

  try {
    // ---------- API ----------
    if (p === "/api/ping") return json(res, 200, { app: "sons-magicos", versao: 1, nome: os.hostname() });

    if (p === "/api/audios") {
      const arquivos = fs.readdirSync(DIR_AUDIO).filter(nomeSeguro);
      const vozes = fs.readdirSync(DIR_VOZES).filter((f) => nomeSeguro(f) && f.endsWith(".mp3"));
      return json(res, 200, { arquivos, vozes });
    }
    let m;
    if ((m = /^\/api\/audios\/([^/]+)$/.exec(p))) {
      const nome = m[1];
      if (!nomeSeguro(nome) || !/\.mp3$/.test(nome)) return json(res, 400, { erro: "nome inválido" });
      const arq = path.join(DIR_AUDIO, nome);
      if (req.method === "PUT") {
        const corpo = await lerCorpo(req);
        if (!corpo.length) return json(res, 400, { erro: "arquivo vazio" });
        // Converte qualquer gravação (m4a, ogg, wav...) para mp3 com volume normalizado
        const tmp = path.join(os.tmpdir(), "rec-" + Date.now() + "-" + Math.random().toString(36).slice(2));
        fs.writeFileSync(tmp, corpo);
        const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-af",
          "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5,adelay=80",
          "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "64k", arq]);
        if (r.error || r.status !== 0) fs.copyFileSync(tmp, arq); // sem ffmpeg: guarda como veio
        fs.rmSync(tmp, { force: true });
        return json(res, 200, { ok: true, convertido: !r.error && r.status === 0 });
      }
      if (req.method === "DELETE") { fs.rmSync(arq, { force: true }); return json(res, 200, { ok: true }); }
    }

    if (p === "/api/perfis") {
      const arq = path.join(DADOS, "perfis.json");
      const lista = fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, "utf8")) : [];
      if (req.method === "POST") {
        const { nome } = JSON.parse((await lerCorpo(req, 10000)).toString() || "{}");
        if (typeof nome === "string" && nome.trim() && !lista.includes(nome.trim())) { lista.push(nome.trim().slice(0, 20)); fs.writeFileSync(arq, JSON.stringify(lista)); }
      }
      return json(res, 200, lista);
    }

    if ((m = /^\/api\/progresso\/(.+)$/.exec(p))) {
      const arq = perfilArquivo(m[1]);
      if (req.method === "PUT") {
        const dados = JSON.parse((await lerCorpo(req, 2 * 1024 * 1024)).toString());
        dados.perfil = m[1];
        fs.writeFileSync(arq, JSON.stringify(dados));
        return json(res, 200, { ok: true });
      }
      return json(res, 200, fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, "utf8")) : {});
    }

    if (p === "/api/relatorio") {
      const lista = fs.readdirSync(DIR_PROG).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(DIR_PROG, f), "utf8")));
      return json(res, 200, lista);
    }

    // ---------- Gravações dos pais ----------
    if (p.startsWith("/personalizado/audio/")) {
      const nome = p.slice("/personalizado/audio/".length);
      if (!nomeSeguro(nome)) { res.writeHead(400); return res.end(); }
      return enviarArquivo(req, res, path.join(DIR_AUDIO, nome), { "Cache-Control": "no-cache" });
    }

    if (p.startsWith("/vozes/audio/")) {
      const nome = p.slice("/vozes/audio/".length);
      if (!nomeSeguro(nome)) { res.writeHead(400); return res.end(); }
      return enviarArquivo(req, res, path.join(DIR_VOZES, nome), { "Cache-Control": "max-age=3600" });
    }

    // ---------- APK para a TV ----------
    if (p === "/apk" || p === "/apk/" || p === "/sons-magicos.apk") {
      const apks = fs.readdirSync(DIR_APK).filter((f) => f.endsWith(".apk")).map((f) => ({ f, t: fs.statSync(path.join(DIR_APK, f)).mtimeMs })).sort((a, b) => b.t - a.t);
      if (!apks.length) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Nenhum APK ainda. Copie o arquivo .apk para a pasta dados/apk do servidor."); }
      return enviarArquivo(req, res, path.join(DIR_APK, apks[0].f), { "Content-Disposition": 'attachment; filename="sons-magicos.apk"' });
    }

    if (p === "/admin" || p === "/admin/") return enviarArquivo(req, res, path.join(__dirname, "admin.html"), { "Cache-Control": "no-cache" });

    // ---------- App web ----------
    const rel = p === "/" ? "index.html" : p.replace(/^\/+/, "");
    const arq = dentroDe(WEB, rel);
    if (!arq) { res.writeHead(403); return res.end(); }
    return enviarArquivo(req, res, arq, { "Cache-Control": /\.(mp3|png|woff2)$/.test(arq) ? "max-age=86400" : "no-cache" });
  } catch (e) {
    console.error(e);
    return json(res, 500, { erro: String(e.message || e) });
  }
});

servidor.listen(PORTA, "0.0.0.0", () => {
  const noDocker = fs.existsSync("/.dockerenv");
  const ips = noDocker ? ["IP-DO-SEU-SERVIDOR"] : Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
  console.log(`Sons Mágicos rodando na porta ${PORTA}`);
  for (const ip of ips) console.log(`  App:   http://${ip}:${PORTA}/\n  Admin: http://${ip}:${PORTA}/admin\n  APK:   http://${ip}:${PORTA}/apk`);
  console.log(`  Dados em: ${DADOS}`);
});
