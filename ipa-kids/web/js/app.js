/* Sons Mágicos — alfabetização com IPA para crianças pequenas.
 * Feito para TV (1920x1080) e controle remoto: setas, OK e Voltar.
 */
(() => {
"use strict";

const C = window.CURRICULO;
const palco = document.getElementById("palco");
const ANDROID = window.AndroidTV || null; // ponte com o app Android (se existir)

/* ======================= Utilidades ======================= */
const $ = (sel, raiz = palco) => raiz.querySelector(sel);
const $$ = (sel, raiz = palco) => [...raiz.querySelectorAll(sel)];
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const embaralhar = (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sortear = (l) => l[Math.floor(Math.random() * l.length)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }

// Índices rápidos
const SONS = {};          // id -> som (com unidade)
C.unidades.forEach((u) => u.sons.forEach((s) => { SONS[s.id] = { ...s, unidade: u }; }));
const PALAVRAS = {};
C.palavras.forEach((p) => { p.escritaFinal = p.escrita || p.s.map((x) => x[0]).join(""); p.ipaFinal = p.s.map((x, i) => (i === p.tonica && p.s.length > 1 ? "ˈ" : "") + x[1]).join("."); PALAVRAS[p.id] = p; });
const VOGAIS_SILABA = ["a", "e", "i", "o", "u"]; // ids dos sons de vogal usados nas sílabas

/* ======================= Escala do palco ======================= */
// Tamanho visível de verdade. Algumas TVs informam um tamanho maior do que o que aparece;
// por isso usamos o menor valor entre as medidas (e a medida exata que o app Android manda).
function tamanhoTela() {
  const ws = [window.innerWidth, document.documentElement.clientWidth];
  const hs = [window.innerHeight, document.documentElement.clientHeight];
  if (window.visualViewport) { ws.push(window.visualViewport.width); hs.push(window.visualViewport.height); }
  try {
    if (window.AndroidTV && window.AndroidTV.tela) {
      const [w, h] = String(window.AndroidTV.tela()).split(",").map(Number);
      if (w > 0 && h > 0) { ws.push(w); hs.push(h); }
    }
  } catch { /* ok */ }
  return { w: Math.min(...ws.filter((x) => x > 0)), h: Math.min(...hs.filter((x) => x > 0)) };
}
function ajustarEscala() {
  const { w, h } = tamanhoTela();
  if (!(w > 0 && h > 0)) return;
  let zoom = 1;
  try { zoom = Number(JSON.parse(localStorage.getItem("sons-magicos:config") || "{}").zoom) || 1; } catch { /* ok */ }
  const s = Math.min(w / 1920, h / 1080) * zoom;
  palco.style.transform = `scale(${s}) translate(-50%, -50%)`;
  palco.style.transformOrigin = "0 0";
  palco.style.left = "50%"; palco.style.top = "50%";
}
window.addEventListener("resize", ajustarEscala);
if (window.visualViewport) window.visualViewport.addEventListener("resize", ajustarEscala);
ajustarEscala();
// a TV às vezes só informa o tamanho certo depois de carregar: ajusta de novo
[200, 800, 2000].forEach((ms) => setTimeout(ajustarEscala, ms));

/* ======================= Configuração e progresso ======================= */
const ARMAZ = "sons-magicos";
function lerLocal(chave, padrao) { try { const v = localStorage.getItem(ARMAZ + ":" + chave); return v ? JSON.parse(v) : padrao; } catch { return padrao; } }
function salvarLocal(chave, v) { try { localStorage.setItem(ARMAZ + ":" + chave, JSON.stringify(v)); } catch { /* sem armazenamento */ } }

const config = Object.assign({
  mostrarIPA: true,
  mostrarEscrita: true,
  minutos: 15,          // tempo de tela por sessão (0 = sem limite)
  servidor: "",         // ex.: http://192.168.0.10:8080
  perfis: ["Criança 1"],
  perfil: "Criança 1",
  maiusculas: true,     // letras em MAIÚSCULAS (a criança ainda não conhece as minúsculas)
  horario: "sempre",    // horários em que o app pode ser usado
}, lerLocal("config", {}));
function salvarConfig() { salvarLocal("config", config); aplicarVisual(); }
function aplicarVisual() {
  palco.classList.toggle("esconder-ipa", !config.mostrarIPA);
  palco.classList.toggle("esconder-escrita", !config.mostrarEscrita);
  palco.classList.toggle("maiusculas", config.maiusculas !== false);
}
// As letras aparecem em MAIÚSCULAS pelo CSS (classe "maiusculas" no palco), assim a troca na área dos pais vale para todas as telas.
const letraPrincipal = (s) => s.letras.split(",")[0].replace(/\s*\(.*\)/, "").trim();

let progresso = novoProgresso();
function novoProgresso() { return { sons: {}, silabas: {}, palavras: {}, leitura: {}, monte: {}, dias: {}, ultima: null, estrelas: 0, atualizado: 0 }; }
function carregarProgresso() { progresso = Object.assign(novoProgresso(), lerLocal("progresso:" + config.perfil, {})); }
function salvarProgresso() {
  progresso.atualizado = Date.now();
  salvarLocal("progresso:" + config.perfil, progresso);
  enviarProgresso();
}
// Registro do dia (tempo de uso, acertos e erros) para o relatório dos pais
function hojeChave() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function dia() {
  const dias = progresso.dias || (progresso.dias = {});
  const k = hojeChave();
  if (!dias[k]) {
    dias[k] = { s: 0, a: 0, e: 0 };
    const chaves = Object.keys(dias).sort();
    while (chaves.length > 90) delete dias[chaves.shift()]; // guarda ~3 meses
  }
  return dias[k];
}
/*
 * Revisão inteligente (repetição espaçada, estilo "caixas de Leitner"):
 * cada acerto de primeira sobe o item uma caixa (revisar depois de 1, 2, 4, 8, 16 dias);
 * um erro volta o item para a caixa 0 (revisar logo).
 */
const INTERVALO_DIAS = [0, 1, 2, 4, 8, 16];
function marcar(tipo, id, acertou) {
  const grupo = progresso[tipo] || (progresso[tipo] = {});
  const m = grupo[id] || (grupo[id] = { vistos: 0, acertos: 0, erros: 0, caixa: 0, ultimo: 0 });
  if (acertou === undefined) m.vistos++;
  else if (acertou) { m.acertos++; m.caixa = Math.min(INTERVALO_DIAS.length - 1, (m.caixa || 0) + 1); progresso.estrelas++; dia().a++; }
  else { m.erros = (m.erros || 0) + 1; m.caixa = 0; dia().e++; }
  m.ultimo = Date.now();
  salvarProgresso();
}
function vencido(m) { return !m || Date.now() - (m.ultimo || 0) >= INTERVALO_DIAS[m.caixa || 0] * 864e5; }
function fraco(m) { return m && (m.erros || 0) > (m.acertos || 0); }
// Prioridade para revisar: primeiro os que a criança erra, depois os vencidos mais antigos
function paraRevisar(tipo, ids) {
  const g = progresso[tipo] || {};
  return ids.filter((id) => g[id] && (fraco(g[id]) || vencido(g[id])))
    .sort((a, b) => (fraco(g[b]) - fraco(g[a])) || ((g[a].ultimo || 0) - (g[b].ultimo || 0)));
}
function lembrarUltima(nome, args) { progresso.ultima = { nome, args }; salvarLocal("progresso:" + config.perfil, progresso); }
carregarProgresso();
aplicarVisual();

/* ======================= Servidor caseiro ======================= */
let servidor = null;              // URL base do servidor que respondeu
let audiosPersonalizados = new Set(); // gravações dos pais (/admin)
let versoesAudio = {};                // versão de cada gravação (para a TV não usar a antiga em cache)
let infoServidor = {};
let vozesNaturais = new Set();        // vozes Piper geradas no servidor

function candidatosServidor() {
  const l = [];
  if (config.servidor) l.push(config.servidor.replace(/\/+$/, ""));
  if (ANDROID && ANDROID.servidor) { const s = ANDROID.servidor(); if (s) l.push(s); }
  if (/^https?:/.test(location.protocol)) l.push(location.origin);
  return [...new Set(l)];
}
async function buscar(url, opts = {}, ms = 2500) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); } finally { clearTimeout(t); }
}
async function conectarServidor() {
  servidor = null;
  for (const base of candidatosServidor()) {
    try {
      const r = await buscar(base + "/api/ping");
      const info = r.ok ? await r.json() : {};
      if (info.app === "sons-magicos") { servidor = base; infoServidor = info; break; }
    } catch { /* tenta o próximo */ }
  }
  if (!servidor) return false;
  try {
    const a = await (await buscar(servidor + "/api/audios")).json();
    audiosPersonalizados = new Set(a.arquivos || []);
    versoesAudio = a.versoes || {};
    vozesNaturais = new Set(a.vozes || []);
  } catch { /* ok */ }
  try {
    const p = await (await buscar(servidor + "/api/progresso/" + encodeURIComponent(config.perfil))).json();
    if (p && p.atualizado > (progresso.atualizado || 0)) { progresso = Object.assign(novoProgresso(), p); salvarLocal("progresso:" + config.perfil, progresso); }
    else if (progresso.atualizado) enviarProgresso();
  } catch { /* ok */ }
  try {
    const perfis = await (await buscar(servidor + "/api/perfis")).json();
    if (Array.isArray(perfis) && perfis.length) { config.perfis = [...new Set([...config.perfis, ...perfis])]; salvarConfig(); }
  } catch { /* ok */ }
  return true;
}
let envioPendente = null;
function enviarProgresso() {
  if (!servidor) return;
  clearTimeout(envioPendente);
  envioPendente = setTimeout(() => {
    buscar(servidor + "/api/progresso/" + encodeURIComponent(config.perfil), {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(progresso),
    }).catch(() => {});
  }, 1500);
}

/* ======================= Áudio ======================= */
const player = new Audio();
player.preload = "auto";
let tocandoResolve = null;
function urlAudio(nome) {
  const arq = nome + ".mp3";
  if (servidor && audiosPersonalizados.has(arq)) return servidor + "/personalizado/audio/" + arq + "?v=" + (versoesAudio[arq] || 0);
  if (servidor && vozesNaturais.has(arq)) return servidor + "/vozes/audio/" + arq;
  return "audio/" + arq;
}
/* Medidor de volume da voz: os personagens mexem a boca/cabeça no ritmo real da fala.
 * Só liga quando o app vem do servidor (http) e depois do primeiro toque no controle;
 * se não der, o vida.js usa um ritmo de sílabas aproximado. */
let actx = null, analisador = null, amostras = null;
function ligarMedidor() {
  if (actx) { if (actx.state === "suspended") actx.resume().catch(() => {}); return; }
  if (!/^https?:/.test(location.protocol)) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    actx = new AC();
    player.crossOrigin = "anonymous";
    const fonte = actx.createMediaElementSource(player);
    analisador = actx.createAnalyser(); analisador.fftSize = 512;
    fonte.connect(analisador); analisador.connect(actx.destination);
    amostras = new Uint8Array(analisador.fftSize);
  } catch { analisador = null; }
}
["keydown", "click"].forEach((ev) => document.addEventListener(ev, ligarMedidor, true));
window.SonsMagicosAudio = {
  nivel() {
    if (!analisador || !actx || actx.state !== "running" || player.paused) return null;
    analisador.getByteTimeDomainData(amostras);
    let soma = 0; for (const v of amostras) { const d = (v - 128) / 128; soma += d * d; }
    return Math.sqrt(soma / amostras.length);
  },
};

function tocar(nome, { personagem = null } = {}) {
  if (actx && actx.state === "suspended") actx.resume().catch(() => {});
  return new Promise((resolve) => {
    pararAudio();
    const fim = () => { clearTimeout(limite); player.onended = player.onerror = null; if (personagem) personagem.classList.remove("falando"); tocandoResolve = null; resolve(); };
    tocandoResolve = fim;
    const limite = setTimeout(fim, 8000);
    player.onended = fim; player.onerror = fim;
    player.src = urlAudio(nome);
    if (personagem) personagem.classList.add("falando");
    const p = player.play(); if (p && p.catch) p.catch(fim);
  });
}
function pararAudio() { try { player.pause(); } catch { /* ok */ } if (tocandoResolve) tocandoResolve(); }

/* ======================= Navegação por telas ======================= */
// Cada tela recebe um "token"; quando o usuário troca de tela, as animações antigas param.
let token = 0;
const pilha = [];
let telaAtual = null;
function vivo(t) { return t === token; }

/* ---------- Horários permitidos ---------- */
const HORARIOS = {
  sempre: { nome: "Sempre", faixas: [[0, 24]] },
  manha: { nome: "Manhã (8h–12h)", faixas: [[8, 12]] },
  tarde: { nome: "Tarde (14h–18h)", faixas: [[14, 18]] },
  manha_tarde: { nome: "Manhã e tarde", faixas: [[8, 12], [14, 18]] },
  dia: { nome: "8h às 19h", faixas: [[8, 19]] },
};
function horarioPermitido() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return (HORARIOS[config.horario] || HORARIOS.sempre).faixas.some(([a, b]) => h >= a && h < b);
}
const TELAS_LIVRES = new Set(["pais", "foraHorario"]);
const TELAS_LICAO = new Set(["som", "silabas", "palavra", "monte"]);

/* ---------- Tempo de uso (para o relatório dos pais) ---------- */
let ultimaAtividade = Date.now();
["keydown", "click"].forEach((ev) => document.addEventListener(ev, () => { ultimaAtividade = Date.now(); }, true));
setInterval(() => {
  const ativo = document.visibilityState !== "hidden" && (modoAssistir || Date.now() - ultimaAtividade < 3 * 60000);
  if (ativo && telaAtual && !TELAS_LIVRES.has(telaAtual.nome)) { dia().s += 30; salvarProgresso(); }
}, 30000);

function irPara(nome, args = {}, { empilhar = true } = {}) {
  pararAudio();
  if (!TELAS_LIVRES.has(nome) && !horarioPermitido()) { nome = "foraHorario"; args = {}; empilhar = false; pilha.length = 0; }
  if (TELAS_LICAO.has(nome)) lembrarUltima(nome, args);
  if (empilhar && telaAtual) pilha.push(telaAtual);
  telaAtual = { nome, args };
  token++;
  palco.innerHTML = '<div class="nuvem" style="width:260px;height:80px;top:70px;animation-delay:-12s"></div><div class="nuvem" style="width:200px;height:60px;top:260px;animation-delay:-40s;animation-duration:80s"></div>';
  const tela = el('<div class="tela"></div>');
  palco.appendChild(tela);
  TELAS[nome](tela, args, token);
  focarPrimeiro(tela);
}
function voltar() {
  if (modoAssistir || !telaAtual) { pararAssistir(); pilha.length = 0; irPara("inicio", {}, { empilhar: false }); return true; }
  if (!pilha.length) return false;
  const ant = pilha.pop();
  irPara(ant.nome, ant.args, { empilhar: false });
  return true;
}
window.voltar = voltar; // chamado pelo botão Voltar do Android

function focarPrimeiro(raiz) {
  const alvo = $(".foco[data-inicial]", raiz) || $(".foco", raiz);
  if (alvo) alvo.focus({ preventScroll: false });
}

/* ---------- Navegação espacial com as setas ---------- */
function mover(direcao, origem = document.activeElement) {
  const focaveis = $$(".foco").filter((e) => e.offsetParent !== null && !e.disabled);
  if (!focaveis.length) return;
  const atual = origem && focaveis.includes(origem) ? origem : null;
  if (!atual) { focaveis[0].focus(); return; }
  const r0 = atual.getBoundingClientRect();
  const c0 = { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
  let melhor = null, melhorNota = Infinity;
  for (const e of focaveis) {
    if (e === atual) continue;
    const r = e.getBoundingClientRect();
    const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const dx = c.x - c0.x, dy = c.y - c0.y;
    let principal, lateral;
    if (direcao === "esquerda") { principal = -dx; lateral = Math.abs(dy); }
    if (direcao === "direita")  { principal = dx;  lateral = Math.abs(dy); }
    if (direcao === "cima")     { principal = -dy; lateral = Math.abs(dx); }
    if (direcao === "baixo")    { principal = dy;  lateral = Math.abs(dx); }
    if (principal <= 4) continue;
    const nota = principal + lateral * 2.2;
    if (nota < melhorNota) { melhorNota = nota; melhor = e; }
  }
  if (melhor) { melhor.focus(); melhor.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
}

document.addEventListener("keydown", (ev) => {
  const k = ev.key;
  if (modoAssistir && !["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(k)) {
    // qualquer tecla durante o "Assistir" volta ao início
    ev.preventDefault(); pararAssistir(); irPara("inicio", {}, { empilhar: false }); pilha.length = 0; return;
  }
  const emCampo = document.activeElement && document.activeElement.tagName === "INPUT";
  if (k === "ArrowLeft" && !emCampo) { ev.preventDefault(); mover("esquerda"); }
  else if (k === "ArrowRight" && !emCampo) { ev.preventDefault(); mover("direita"); }
  else if (k === "ArrowUp" || k === "ArrowDown") {
    ev.preventDefault();
    // ao focar o próximo item, o campo de texto perde o foco sozinho; se não houver próximo, o foco fica onde está
    mover(k === "ArrowUp" ? "cima" : "baixo");
  }
  else if ((k === "Enter" || k === " ") && !emCampo) {
    ev.preventDefault();
    const a = document.activeElement; if (a && a.classList.contains("foco")) a.click();
  }
  else if (k === "Escape" || k === "BrowserBack" || k === "GoBack" || (k === "Backspace" && !emCampo)) {
    ev.preventDefault(); voltar();
  }
  else if (k === "MediaPlayPause" || k === "MediaPlay") { ev.preventDefault(); iniciarAssistir(); }
});
palco.addEventListener("click", (ev) => { const f = ev.target.closest(".foco"); if (f && f !== document.activeElement) f.focus(); });

/* ======================= Peças visuais ======================= */
// Personagem como boneco articulado: corpo + partes móveis (ver ferramentas/gerar_partes.py)
function imgPersonagem(pid, estilo = "", classe = "") {
  const p = C.personagens[pid];
  const r = window.RIG && window.RIG[pid];
  if (!r) return `<img class="personagem ${classe}" src="${p.img}" alt="${esc(p.nome)}" style="${estilo}">`;
  const alt = /height:\s*(\d+)px/.exec(estilo);
  const largura = alt ? `width:${Math.round(+alt[1] * r.proporcao)}px;` : "";
  return `<div class="personagem boneco ${classe}" data-pid="${pid}" role="img" aria-label="${esc(p.nome)}" style="${estilo};${largura}">
    <img class="camada" src="img/personagens/partes/${pid}_corpo.png" alt="">
    ${r.partes.map((x) => `<img class="camada parte" data-tipo="${x.tipo}" src="img/personagens/partes/${pid}_${x.nome}.png" alt="" style="transform-origin:${x.px}% ${x.py}%">`).join("")}
  </div>`;
}
function figuraPalavra(p) {
  if (p.img) return `<div class="figura"><img src="${C.personagens[p.img].img}" alt=""></div>`;
  return `<div class="figura">${p.emoji}</div>`;
}
function palavraMarcada(p, ipaAlvo) {
  // destaca as sílabas que contêm o som
  const tem = (ipa) => ipaAlvo && ipa.normalize("NFC").includes(ipaAlvo.normalize("NFC"));
  const escrita = p.s.map(([o, i]) => tem(i) ? `<span class="marca">${esc(o)}</span>` : esc(o)).join("");
  const ipa = p.s.map(([o, i], k) => (k === p.tonica && p.s.length > 1 ? "ˈ" : "") + (tem(i) ? `<span class="marca">${esc(i)}</span>` : esc(i))).join(".");
  return `<div class="palavra-textos"><div class="escrita so-escrita">${p.escrita && !ipaAlvo ? esc(p.escrita) : escrita}</div><div class="pipa so-ipa">/${ipa}/</div></div>`;
}
function estrelasTxt() { return `<span class="estrelas">★</span> ${progresso.estrelas}`; }
function balao(texto, x, y) { return `<div class="balao" style="left:${x}px;top:${y}px">${esc(texto)}</div>`; }

function comemorar(bicho) {
  bicho.classList.add("feliz");
  setTimeout(() => bicho.classList.remove("feliz"), 2600);
}

function festa(n = 70) {
  const cores = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#c77dff", "#ff9f43"];
  for (let i = 0; i < n; i++) {
    const c = el(`<div class="confete"></div>`);
    c.style.left = Math.random() * 1920 + "px";
    c.style.background = sortear(cores);
    c.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
    c.style.animationDelay = Math.random() * .5 + "s";
    palco.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
  const e = el(`<div class="estrela-voa">⭐</div>`);
  palco.appendChild(e); setTimeout(() => e.remove(), 1500);
}

/* ======================= TELAS ======================= */
const TELAS = {};

/* ---------- Início ---------- */
TELAS.inicio = (tela) => {
  const unidadesHtml = C.unidades.map((u, i) => {
    const per = C.personagens[u.personagem];
    const feitos = u.sons.filter((s) => progresso.sons[s.id]).length;
    return `<div class="bloco foco" tabindex="0" data-unidade="${u.id}" style="background:linear-gradient(160deg,#fff 30%,${per.cor})">
      <div class="simbolos maiusc">${u.sons.slice(0, 3).map((s) => esc(letraPrincipal(s))).join(" ")}</div>
      <img class="bicho" src="${per.img}" alt="">
      <div class="rotulo">${esc(u.titulo)}</div>
      <div class="sub">${feitos}/${u.sons.length} sons</div>
    </div>`;
  }).join("");
  tela.innerHTML = `
    <div class="topo">
      <h1>Sons Mágicos</h1><div class="espaco"></div>
      <div class="pilula">👧 ${esc(config.perfil)}</div>
      <div class="pilula">${estrelasTxt()}</div>
    </div>
    <div class="inicio-grade">
      <div class="bloco assistir foco" tabindex="0" data-inicial id="b-assistir">
        <div class="play"></div>
        <div class="rotulo">Assistir</div>
        <div class="sub">a turma ensina sozinha</div>
        <div class="turma">${Object.keys(C.personagens).map((k) => `<img src="${C.personagens[k].img}" alt="">`).join("")}</div>
      </div>
      ${unidadesHtml}
      <div class="bloco foco" tabindex="0" id="b-silabas" style="background:linear-gradient(160deg,#fff 30%,#a5e3a0)">
        <div class="simbolos maiusc">pa · bo</div><div class="rotulo">Sílabas</div><div class="sub">juntar sons</div></div>
      <div class="bloco foco" tabindex="0" id="b-palavras" style="background:linear-gradient(160deg,#fff 30%,#ffd6a5)">
        <div class="simbolos">🍇 🐸</div><div class="rotulo">Palavras</div><div class="sub">juntar sílabas</div></div>
      <div class="bloco foco" tabindex="0" id="b-jogos" style="background:linear-gradient(160deg,#fff 30%,#c9b8ff)">
        <div class="simbolos">📖 🧩 📒</div><div class="rotulo">Jogos</div><div class="sub">ler, montar e figurinhas</div></div>
    </div>
    <div class="barra-inferior">
      ${progresso.ultima && TELAS[progresso.ultima.nome] ? '<button class="botao foco" id="b-ultima">↻ Última lição</button>' : ""}
      <button class="botao foco" id="b-pais">⚙️ Pais</button>
    </div>`;
  $("#b-assistir", tela).onclick = () => iniciarAssistir();
  $$("[data-unidade]", tela).forEach((b) => (b.onclick = () => irPara("unidade", { id: b.dataset.unidade })));
  $("#b-silabas", tela).onclick = () => irPara("silabasMenu");
  $("#b-palavras", tela).onclick = () => irPara("palavrasMenu");
  $("#b-jogos", tela).onclick = () => irPara("jogos");
  $("#b-pais", tela).onclick = () => irPara("pais");
  const bu = $("#b-ultima", tela); if (bu) bu.onclick = () => irPara(progresso.ultima.nome, progresso.ultima.args);
};

/* ---------- Unidade: grade de sons do personagem ---------- */
TELAS.unidade = (tela, { id }, t) => {
  const u = C.unidades.find((x) => x.id === id);
  const per = C.personagens[u.personagem];
  tela.innerHTML = `
    <div class="topo"><h1>${esc(u.titulo)}</h1><div class="espaco"></div><div class="pilula">${estrelasTxt()}</div></div>
    ${imgPersonagem(u.personagem, "left:60px;top:330px;height:650px", "chegando")}
    ${balao(u.frase, 330, 170)}
    <div class="grade-sons" style="top:400px">
      ${u.sons.map((s, i) => `<div class="som-cartao foco" tabindex="0" data-i="${i}" ${i === 0 ? "data-inicial" : ""}>
        ${progresso.sons[s.id] ? '<div class="selo">⭐</div>' : ""}
        <div class="letras so-escrita">${esc(s.letras)}</div><div class="ipa so-ipa">/${esc(s.ipa)}/</div></div>`).join("")}
    </div>`;
  $(".grade-sons", tela).style.left = "560px";
  $$(".som-cartao", tela).forEach((c) => (c.onclick = () => irPara("som", { unidade: id, i: +c.dataset.i })));
  const bicho = $(".personagem", tela);
  esperar(600).then(() => vivo(t) && tocar("intro_" + u.id, { personagem: bicho }));
};

/* ---------- Lição de um som ---------- */
function tamanhoLetras(t) { const n = String(t).length; return Math.round(Math.min(300, 840 / Math.max(1, n))); }
async function apresentarSom(tela, s, t, { passivo = false } = {}) {
  const u = s.unidade || SONS[s.id].unidade;
  const p = PALAVRAS[s.exemplo];
  tela.innerHTML = `
    ${imgPersonagem(u.personagem, "left:70px;top:300px;height:680px", "chegando")}
    <div class="cartao-ipa" style="opacity:0">
      <div class="letra-grande so-escrita" style="font-size:${tamanhoLetras(s.letras)}px">${esc(s.letras)}</div>
      <div class="ipa-pequeno so-ipa">/${esc(s.ipa)}/</div></div>
    <div class="cartao-palavra" style="opacity:0">${figuraPalavra(p)}${palavraMarcada(p, s.ipa)}</div>
    <div class="dica" style="opacity:0">💡 ${esc(s.dica)}</div>`;
  const bicho = $(".personagem", tela);
  const cartao = $(".cartao-ipa", tela);
  const ok = () => vivo(t);

  await esperar(700); if (!ok()) return false;
  await tocar(`frase_${u.personagem}_escute`, { personagem: bicho }); if (!ok()) return false;
  cartao.style.opacity = 1; cartao.classList.add("aparecer");
  await esperar(500); if (!ok()) return false;
  for (let i = 0; i < 3; i++) {
    cartao.classList.remove("pulsar"); void cartao.offsetWidth; cartao.classList.add("pulsar");
    await tocar("som_" + s.id, { personagem: bicho }); if (!ok()) return false;
    await esperar(500); if (!ok()) return false;
  }
  $(".dica", tela).style.opacity = 1;
  await esperar(600); if (!ok()) return false;
  const cp = $(".cartao-palavra", tela); cp.style.opacity = 1; cp.classList.add("aparecer");
  await esperar(500); if (!ok()) return false;
  await tocar("palavra_" + p.id, { personagem: bicho }); if (!ok()) return false;
  await esperar(400);
  cartao.classList.remove("pulsar"); void cartao.offsetWidth; cartao.classList.add("pulsar");
  await tocar("som_" + s.id, { personagem: bicho }); if (!ok()) return false;
  await esperar(300);
  await tocar("palavra_" + p.id, { personagem: bicho }); if (!ok()) return false;
  marcar("sons", s.id);
  if (passivo) { await esperar(1200); return ok(); }
  return true;
}

TELAS.som = async (tela, { unidade, i }, t) => {
  const u = C.unidades.find((x) => x.id === unidade);
  const s = { ...u.sons[i], unidade: u };
  const continuou = await apresentarSom(tela, s, t);
  if (!continuou || !vivo(t)) return;
  await jogoEncontrarSom(tela, s, u, t);
};

async function jogoEncontrarSom(tela, s, u, t) {
  // Escolhe 2 distratores da mesma unidade (ou de qualquer uma, se faltar)
  let outros = u.sons.filter((x) => x.id !== s.id);
  if (outros.length < 2) outros = Object.values(SONS).filter((x) => x.id !== s.id);
  const opcoes = embaralhar([s, ...embaralhar(outros).slice(0, 2)]);
  const bicho = $(".personagem", tela);
  $(".dica", tela).style.opacity = 0;
  const caixa = el(`<div class="opcoes">${opcoes.map((o) => `<div class="opcao opcao-som foco" tabindex="0" data-id="${o.id}">
      <div class="op-letras so-escrita" style="font-size:${Math.round(tamanhoLetras(o.letras) * 0.42)}px">${esc(o.letras)}</div><div class="op-ipa so-ipa">/${esc(o.ipa)}/</div></div>`).join("")}
     <button class="botao foco" id="b-ouvir" style="align-self:center">🔊</button></div>`);
  tela.appendChild(caixa);
  const perguntar = async () => {
    await tocar(`frase_${u.personagem}_onde_esta`, { personagem: bicho }); if (!vivo(t)) return;
    await tocar("som_" + s.id, { personagem: bicho });
  };
  $("#b-ouvir", caixa).onclick = perguntar;
  $(".opcao", caixa).focus();
  perguntar();
  let tentativas = 0;
  $$(".opcao", caixa).forEach((b) => (b.onclick = async () => {
    if (b.dataset.id === s.id) {
      b.classList.add("certo");
      if (tentativas === 0) marcar("sons", s.id, true);
      festa(); comemorar(bicho);
      await tocar(`frase_${u.personagem}_muito_bem`, { personagem: bicho }); if (!vivo(t)) return;
      await tocar("som_" + s.id); if (!vivo(t)) return;
      mostrarProximo(tela, () => {
        const prox = u.sons.findIndex((x) => x.id === s.id) + 1;
        if (prox < u.sons.length) irPara("som", { unidade: u.id, i: prox }, { empilhar: false });
        else voltar();
      }, () => irPara("som", { unidade: u.id, i: u.sons.findIndex((x) => x.id === s.id) }, { empilhar: false }));
    } else {
      tentativas++;
      if (tentativas === 1) marcar("sons", s.id, false);
      b.classList.remove("errado"); void b.offsetWidth; b.classList.add("errado");
      await tocar(`frase_${u.personagem}_de_novo`, { personagem: bicho }); if (!vivo(t)) return;
      await tocar("som_" + s.id, { personagem: bicho });
    }
  }));
}

function mostrarProximo(tela, proximo, repetir) {
  const antiga = $(".opcoes", tela); if (antiga) antiga.remove();
  const barra = el(`<div class="opcoes"><button class="botao grande foco" id="b-rep">↻ De novo</button><button class="botao grande primario foco" id="b-prox">Próximo ▶</button></div>`);
  tela.appendChild(barra);
  $("#b-prox", barra).onclick = proximo;
  $("#b-rep", barra).onclick = repetir;
  $("#b-prox", barra).focus();
}

/* ---------- Sílabas ---------- */
TELAS.silabasMenu = (tela) => {
  tela.innerHTML = `
    <div class="topo"><h1>Sílabas</h1><div class="espaco"></div><div class="pilula">${estrelasTxt()}</div></div>
    <div class="rolagem"><div class="grade-ladrilhos">
      ${C.silabas.map((g, i) => { const s = SONS[g.c]; const feitas = g.itens.filter(([o]) => progresso.silabas[g.c + "_" + o]).length;
        return `<div class="ladrilho foco" tabindex="0" data-c="${g.c}" ${i === 0 ? "data-inicial" : ""}>
          ${feitas ? `<div class="selo">⭐ ${feitas}</div>` : ""}
          <div class="esc-grande so-escrita">${esc(g.itens[0][0])} ${esc(g.itens[1][0])} ${esc(g.itens[2][0])}</div><div class="p-ipa so-ipa">/${esc(s.ipa)}/</div></div>`; }).join("")}
    </div></div>`;
  $$(".ladrilho", tela).forEach((b) => (b.onclick = () => irPara("silabas", { c: b.dataset.c })));
};

async function demonstrarSilabas(tela, grupo, t, { passivo = false } = {}) {
  const cons = SONS[grupo.c];
  const per = cons.unidade.personagem;
  tela.innerHTML = `
    ${imgPersonagem(per, "left:40px;top:330px;height:640px", "chegando")}
    <div class="mistura">
      <div class="peca consoante"><div class="esc so-escrita">${esc(grupo.itens[0][0].replace(/[aeiou]$/, ""))}</div><div class="ipa so-ipa">/${esc(cons.ipa)}/</div></div>
      <div class="mais">+</div>
      <div class="peca vogal"><div class="esc so-escrita"></div><div class="ipa so-ipa"></div></div>
    </div>
    <div class="fila-vogais">${grupo.itens.map(([o, ipa]) => `<div class="mini" data-o="${esc(o)}"><div class="esc so-escrita">${esc(o)}</div><div class="ipa so-ipa">/${esc(ipa)}/</div></div>`).join("")}</div>`;
  const bicho = $(".personagem", tela);
  const pc = $(".peca.consoante", tela), pv = $(".peca.vogal", tela), mais = $(".mais", tela);
  const ok = () => vivo(t);
  await esperar(700); if (!ok()) return false;
  await tocar(`frase_${per}_juntos`, { personagem: bicho }); if (!ok()) return false;

  for (let k = 0; k < grupo.itens.length; k++) {
    const [o, ipa] = grupo.itens[k];
    const vogalId = VOGAIS_SILABA[k];
    const vog = SONS[vogalId];
    // separa
    pc.classList.remove("juntas", "sumir"); pv.classList.remove("juntas", "sumir"); mais.style.opacity = 1;
    pc.innerHTML = `<div class="esc so-escrita">${esc(o.replace(/[aeiou]$/, ""))}</div><div class="ipa so-ipa">/${esc(ipa.replace(/[aeiouɛɔ]$/, "") || cons.ipa)}/</div>`;
    pv.innerHTML = `<div class="esc so-escrita">${esc(o.slice(-1))}</div><div class="ipa so-ipa">/${esc(vog.ipa)}/</div>`;
    await esperar(700); if (!ok()) return false;
    pc.classList.remove("ativa"); void pc.offsetWidth; pc.classList.add("ativa");
    await tocar("som_" + grupo.c, { personagem: bicho }); if (!ok()) return false;
    pv.classList.remove("ativa"); void pv.offsetWidth; pv.classList.add("ativa");
    await tocar("som_" + vogalId, { personagem: bicho }); if (!ok()) return false;
    // junta
    mais.style.opacity = 0;
    pc.style.left = "250px"; pv.style.left = "640px"; // encostam uma na outra
    await esperar(900); if (!ok()) return false;
    pv.classList.add("sumir");
    pc.style.left = "";
    pc.classList.add("juntas");
    pc.innerHTML = `<div class="esc so-escrita">${esc(o)}</div><div class="ipa so-ipa">/${esc(ipa)}/</div>`;
    await tocar(`silaba_${grupo.c}_${o}`, { personagem: bicho }); if (!ok()) return false;
    await esperar(400);
    await tocar(`silaba_${grupo.c}_${o}`, { personagem: bicho }); if (!ok()) return false;
    $$(".mini", tela)[k].classList.add("ok");
    marcar("silabas", grupo.c + "_" + o);
    await esperar(900); if (!ok()) return false;
    pc.style.left = ""; pv.style.left = "";
    pc.classList.remove("juntas"); pv.classList.remove("sumir");
  }
  return true;
}

TELAS.silabas = async (tela, { c }, t) => {
  const grupo = C.silabas.find((g) => g.c === c);
  const continuou = await demonstrarSilabas(tela, grupo, t);
  if (!continuou || !vivo(t)) return;
  // Jogo: ouvir a sílaba e achar
  const per = SONS[c].unidade.personagem;
  const bicho = $(".personagem", tela);
  $(".mistura", tela).style.opacity = 0.0;
  const alvo = sortear(grupo.itens);
  const opcoes = embaralhar([alvo, ...embaralhar(grupo.itens.filter((x) => x !== alvo)).slice(0, 2)]);
  $(".fila-vogais", tela).remove();
  const caixa = el(`<div class="opcoes" style="top:420px">${opcoes.map(([o, ipa]) => `<div class="opcao foco" tabindex="0" data-o="${esc(o)}" style="flex-direction:column;display:flex;justify-content:center;height:300px;min-width:300px">
    <div class="so-escrita" style="color:var(--tinta);font-size:120px">${esc(o)}</div><div class="so-ipa" style="font-size:60px">/${esc(ipa)}/</div></div>`).join("")}
    <button class="botao foco" id="b-ouvir" style="align-self:center">🔊</button></div>`);
  tela.appendChild(caixa);
  const perguntar = async () => { await tocar(`frase_${per}_escute`, { personagem: bicho }); if (vivo(t)) await tocar(`silaba_${c}_${alvo[0]}`, { personagem: bicho }); };
  $("#b-ouvir", caixa).onclick = perguntar;
  $(".opcao", caixa).focus();
  perguntar();
  let tent = 0;
  $$(".opcao", caixa).forEach((b) => (b.onclick = async () => {
    if (b.dataset.o === alvo[0]) {
      b.classList.add("certo"); festa(); comemorar(bicho);
      if (tent === 0) marcar("silabas", c + "_" + alvo[0], true);
      await tocar(`frase_${per}_muito_bem`, { personagem: bicho }); if (!vivo(t)) return;
      const idx = C.silabas.findIndex((g) => g.c === c);
      caixa.remove();
      mostrarProximo(tela, () => { const prox = C.silabas[idx + 1]; if (prox) irPara("silabas", { c: prox.c }, { empilhar: false }); else voltar(); },
        () => irPara("silabas", { c }, { empilhar: false }));
    } else {
      tent++; if (tent === 1) marcar("silabas", c + "_" + alvo[0], false);
      b.classList.remove("errado"); void b.offsetWidth; b.classList.add("errado");
      await tocar(`frase_${per}_de_novo`, { personagem: bicho }); if (vivo(t)) await tocar(`silaba_${c}_${alvo[0]}`, { personagem: bicho });
    }
  }));
};

/* ---------- Palavras ---------- */
TELAS.palavrasMenu = (tela) => {
  tela.innerHTML = `
    <div class="topo"><h1>Palavras</h1><div class="espaco"></div><div class="pilula">${estrelasTxt()}</div></div>
    <div class="rolagem"><div class="grade-ladrilhos">
      ${C.palavras.map((p, i) => `<div class="ladrilho foco" tabindex="0" data-id="${p.id}" ${i === 0 ? "data-inicial" : ""}>
        ${progresso.palavras[p.id] ? '<div class="selo">⭐</div>' : ""}
        ${figuraPalavra(p)}<div class="esc so-escrita">${esc(p.escritaFinal)}</div><div class="p-ipa so-ipa">/${esc(p.ipaFinal)}/</div></div>`).join("")}
    </div></div>`;
  $$(".ladrilho", tela).forEach((b) => (b.onclick = () => irPara("palavra", { id: b.dataset.id })));
};

async function demonstrarPalavra(tela, p, t) {
  const per = p.img || sortear(Object.keys(C.personagens));
  const guia = p.img ? sortear(Object.keys(C.personagens).filter((k) => k !== p.img)) : per;
  tela.innerHTML = `
    ${imgPersonagem(guia, "left:40px;top:330px;height:640px", "chegando")}
    <div class="revelar escondida">${figuraPalavra(p)}<div class="misterio">?</div></div>
    <div class="silabas-linha">${p.s.map(([o, ipa], i) => `<div class="bloco-silaba ${i === p.tonica && p.s.length > 1 ? "tonica" : ""}"><div class="esc so-escrita">${esc(o)}</div><div class="ipa so-ipa">${esc(ipa)}</div></div>`).join("")}</div>
    <div class="ipa-palavra so-ipa" style="opacity:0">/${esc(p.ipaFinal)}/</div>`;
  const bicho = $(".personagem", tela);
  const blocos = $$(".bloco-silaba", tela);
  const ok = () => vivo(t);
  await esperar(800); if (!ok()) return false;
  for (let rodada = 0; rodada < 2; rodada++) {
    for (let i = 0; i < blocos.length; i++) {
      blocos[i].classList.add("acesa");
      await tocar(`psil_${p.id}_${i}`, { personagem: bicho }); if (!ok()) return false;
      await esperar(rodada === 0 ? 450 : 150);
      blocos[i].classList.remove("acesa");
    }
    await esperar(300);
  }
  $(".silabas-linha", tela).classList.add("unidas");
  $(".ipa-palavra", tela).style.opacity = 1;
  await esperar(500); if (!ok()) return false;
  await tocar("palavra_" + p.id, { personagem: bicho }); if (!ok()) return false;
  $(".revelar", tela).classList.remove("escondida");
  festa(30);
  await esperar(900); if (!ok()) return false;
  await tocar("palavra_" + p.id, { personagem: bicho }); if (!ok()) return false;
  marcar("palavras", p.id);
  return true;
}

TELAS.palavra = async (tela, { id }, t) => {
  const p = PALAVRAS[id];
  const ok = await demonstrarPalavra(tela, p, t);
  if (!ok || !vivo(t)) return;
  const idx = C.palavras.indexOf(p);
  mostrarProximo(tela, () => { const prox = C.palavras[idx + 1]; if (prox) irPara("palavra", { id: prox.id }, { empilhar: false }); else voltar(); },
    () => irPara("palavra", { id }, { empilhar: false }));
  $(".opcoes", tela).style.top = "880px";
  $(".ipa-palavra", tela).style.top = "820px";
};

/* ---------- Ler: ver a palavra escrita e achar a figura ---------- */
TELAS.ler = async (tela, { nivel = 0 } = {}, t) => {
  // metade das vezes revisa uma palavra que a criança errou ou está "vencida"
  const pool = C.palavras;
  const revisar = paraRevisar("leitura", pool.map((x) => x.id));
  const p = revisar.length && Math.random() < 0.5 ? PALAVRAS[revisar[0]] : sortear(pool);
  const outras = embaralhar(pool.filter((x) => x !== p)).slice(0, 2);
  const opcoes = embaralhar([p, ...outras]);
  const guia = sortear(Object.keys(C.personagens));
  tela.innerHTML = `
    <div class="topo"><h1>Ler</h1><div class="espaco"></div><div class="pilula">${estrelasTxt()}</div></div>
    ${imgPersonagem(guia, "left:40px;top:330px;height:640px", "chegando")}
    <div class="palavra-ler"><div class="esc maiusc">${esc(p.escritaFinal)}</div><div class="ipa so-ipa">/${esc(p.ipaFinal)}/</div></div>
    <div class="opcoes figuras">${opcoes.map((o) => `<div class="opcao foco" tabindex="0" data-id="${o.id}">${figuraPalavra(o)}</div>`).join("")}
      <button class="botao foco" id="b-ajuda" style="align-self:center">🔊 Ajuda</button></div>`;
  const bicho = $(".personagem", tela);
  esperar(700).then(() => vivo(t) && tocar(`frase_${guia}_leia`, { personagem: bicho }));
  $("#b-ajuda", tela).onclick = async () => {
    for (let i = 0; i < p.s.length; i++) { await tocar(`psil_${p.id}_${i}`, { personagem: bicho }); if (!vivo(t)) return; await esperar(250); }
  };
  let tent = 0;
  $$(".opcao", tela).forEach((b) => (b.onclick = async () => {
    if (b.dataset.id === p.id) {
      b.classList.add("certo"); festa(); comemorar(bicho);
      if (tent === 0) marcar("leitura", p.id, true);
      await tocar("palavra_" + p.id, { personagem: bicho }); if (!vivo(t)) return;
      await tocar(`frase_${guia}_muito_bem`, { personagem: bicho }); if (!vivo(t)) return;
      await esperar(600); if (!vivo(t)) return;
      irPara("ler", {}, { empilhar: false });
    } else {
      tent++; if (tent === 1) marcar("leitura", p.id, false);
      b.classList.remove("errado"); void b.offsetWidth; b.classList.add("errado");
      await tocar(`frase_${guia}_de_novo`, { personagem: bicho });
    }
  }));
};

/* ---------- Jogos ---------- */
function temFigurinha(id) { return ((progresso.leitura[id] || {}).acertos || 0) + (((progresso.monte || {})[id] || {}).acertos || 0) > 0; }
TELAS.jogos = (tela, args, t) => {
  const ganhas = C.palavras.filter((p) => temFigurinha(p.id)).length;
  tela.innerHTML = `
    <div class="topo"><h1>Jogos</h1><div class="espaco"></div><div class="pilula">${estrelasTxt()}</div></div>
    ${imgPersonagem("caracol", "left:30px;top:420px;height:560px", "chegando")}
    ${balao("Eu sou o Caracol, o mais rapidinho da turma!", 300, 150)}
    <div class="grade-jogos">
      <div class="bloco foco jogo" tabindex="0" data-inicial id="j-ler" style="background:linear-gradient(160deg,#fff 30%,#c9b8ff)">
        <div class="icone-jogo">📖</div><div class="rotulo">Ler</div><div class="sub">ler a palavra e achar a figura</div></div>
      <div class="bloco foco jogo" tabindex="0" id="j-monte" style="background:linear-gradient(160deg,#fff 30%,#a5e3a0)">
        <div class="icone-jogo">🧩</div><div class="rotulo">Monte a palavra</div><div class="sub">juntar as sílabas na ordem</div></div>
      <div class="bloco foco jogo" tabindex="0" id="j-album" style="background:linear-gradient(160deg,#fff 30%,#ffd6a5)">
        <div class="icone-jogo">📒</div><div class="rotulo">Álbum</div><div class="sub">${ganhas} de ${C.palavras.length} figurinhas</div></div>
    </div>`;
  const bicho = $(".personagem", tela);
  esperar(700).then(() => vivo(t) && tocar("intro_jogos", { personagem: bicho }));
  $("#j-ler", tela).onclick = () => irPara("ler");
  $("#j-monte", tela).onclick = () => irPara("monte");
  $("#j-album", tela).onclick = () => irPara("album");
};

/* ---------- Monte a palavra: ver a figura e escolher as sílabas na ordem ---------- */
TELAS.monte = async (tela, { id } = {}, t) => {
  const candidatas = C.palavras.filter((p) => p.s.length >= 2);
  const revisar = paraRevisar("monte", candidatas.map((x) => x.id));
  const p = id ? PALAVRAS[id] : (revisar.length && Math.random() < 0.5 ? PALAVRAS[revisar[0]] : sortear(candidatas.filter((x) => x.nivel === 1 || Object.keys(progresso.sons).length > 15)));
  const outras = embaralhar(C.palavras.filter((x) => x !== p).flatMap((x) => x.s.map((y) => y[0])))
    .filter((o, i, arr) => arr.indexOf(o) === i && !p.s.some((y) => y[0] === o)).slice(0, 2);
  const pecas = embaralhar([...p.s.map(([o, ipa], i) => ({ o, ipa, i })), ...outras.map((o) => ({ o, ipa: "", i: -1 }))]);
  const guia = "caracol";
  tela.innerHTML = `
    <div class="topo"><h1>Monte a palavra</h1><div class="espaco"></div><div class="pilula">${estrelasTxt()}</div></div>
    ${imgPersonagem(guia, "left:40px;top:330px;height:640px", "chegando")}
    <div class="monte-figura">${figuraPalavra(p)}</div>
    <div class="monte-casas">${p.s.map(() => `<div class="casa"><div class="esc so-escrita"></div><div class="ipa so-ipa"></div></div>`).join("")}</div>
    <div class="monte-pecas">${pecas.map((x, k) => `<div class="peca-monte foco" tabindex="0" data-k="${k}"><span class="so-escrita">${esc(x.o)}</span></div>`).join("")}
      <button class="botao foco" id="b-ouvir">🔊</button></div>`;
  const bicho = $(".personagem", tela);
  const casas = $$(".casa", tela);
  let proxima = 0, tent = 0;
  const dica = async () => { await tocar("palavra_" + p.id, { personagem: bicho }); };
  $("#b-ouvir", tela).onclick = dica;
  esperar(700).then(async () => { if (!vivo(t)) return; await tocar(`frase_${guia}_juntos`, { personagem: bicho }); if (vivo(t)) dica(); });
  let ocupado = false;
  $$(".peca-monte", tela).forEach((b) => (b.onclick = async () => {
    if (b.classList.contains("usada") || ocupado || proxima >= p.s.length) return;
    const x = pecas[+b.dataset.k];
    if (x.o === p.s[proxima][0]) {
      b.classList.add("usada");
      const n = proxima++; // avança já: a criança pode apertar a próxima sílaba enquanto esta toca
      const casa = casas[n];
      $(".esc", casa).textContent = x.o; $(".ipa", casa).textContent = "/" + p.s[n][1] + "/";
      casa.classList.add("cheia");
      if (proxima === p.s.length) { ocupado = true; await tocar(`psil_${p.id}_${n}`, { personagem: bicho }); }
      else tocar(`psil_${p.id}_${n}`, { personagem: bicho });
      if (proxima === p.s.length) {
        if (!vivo(t)) return;
        $(".monte-casas", tela).classList.add("completa");
        if (tent === 0) marcar("monte", p.id, true);
        festa(); comemorar(bicho);
        await tocar("palavra_" + p.id, { personagem: bicho }); if (!vivo(t)) return;
        await tocar(`frase_${guia}_muito_bem`, { personagem: bicho }); if (!vivo(t)) return;
        $(".monte-pecas", tela).remove();
        mostrarProximo(tela, () => irPara("monte", {}, { empilhar: false }), () => irPara("monte", { id: p.id }, { empilhar: false }));
        $(".opcoes", tela).style.top = "880px";
      } else {
        const livre = $$(".peca-monte:not(.usada)", tela)[0]; if (livre && document.activeElement === b) livre.focus();
      }
    } else {
      tent++; if (tent === 1) marcar("monte", p.id, false);
      b.classList.remove("errado"); void b.offsetWidth; b.classList.add("errado");
      setTimeout(() => b.classList.toggle("errado", false), 700);
      await tocar(`frase_${guia}_de_novo`, { personagem: bicho }); if (vivo(t)) await tocar(`psil_${p.id}_${proxima}`, { personagem: bicho });
    }
  }));
};

/* ---------- Álbum de figurinhas ---------- */
TELAS.album = (tela) => {
  const ganhas = C.palavras.filter((p) => temFigurinha(p.id));
  tela.innerHTML = `
    <div class="topo"><h1>Álbum</h1><div class="espaco"></div><div class="pilula">📒 ${ganhas.length} / ${C.palavras.length}</div></div>
    <div class="rolagem"><div class="grade-ladrilhos">
      ${C.palavras.map((p, i) => { const tem = temFigurinha(p.id);
        return `<div class="ladrilho foco figurinha ${tem ? "" : "bloqueada"}" tabindex="0" data-id="${p.id}" ${i === 0 ? "data-inicial" : ""}>
          ${figuraPalavra(p)}<div class="esc so-escrita">${tem ? esc(p.escritaFinal) : "?"}</div></div>`; }).join("")}
    </div></div>`;
  $$(".figurinha", tela).forEach((b) => (b.onclick = async () => {
    if (b.classList.contains("bloqueada")) { b.classList.remove("errado"); void b.offsetWidth; b.classList.add("errado"); return; }
    b.classList.remove("pulo"); void b.offsetWidth; b.classList.add("pulo");
    await tocar("palavra_" + b.dataset.id);
  }));
  if (ganhas.length === C.palavras.length) festa(120);
};

/* ---------- Fora do horário ---------- */
TELAS.foraHorario = (tela) => {
  tela.innerHTML = `<div class="descanso">
    <div class="turma">${Object.keys(C.personagens).map((k) => `<img src="${C.personagens[k].img}" alt="">`).join("")}</div>
    <h2>A turma está descansando 🌙</h2><p>Volte no horário de brincar: ${esc((HORARIOS[config.horario] || HORARIOS.sempre).nome)}</p>
    <button class="botao foco" id="b-pais-fora" style="margin-top:40px">⚙️ Pais</button></div>`;
  $("#b-pais-fora", tela).onclick = () => irPara("pais");
};

/* ---------- Área dos pais ---------- */
function linkCelular() {
  if (!servidor) return "";
  const u = new URL(servidor);
  return infoServidor.https ? `https://${u.hostname}:${infoServidor.https}/admin` : `${servidor}/admin`;
}
function qrSvg(texto) {
  try {
    const q = window.qrcode(0, "M"); q.addData(texto); q.make();
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  } catch { return ""; }
}
TELAS.pais = (tela, args, t) => {
  const opMin = [0, 10, 15, 20, 30];
  const celular = linkCelular();
  tela.innerHTML = `
    <div class="topo"><h1>Área dos pais</h1></div>
    <div class="config rolagem-pais">
      <div class="linha-config"><div class="nome">Criança</div>
        ${config.perfis.map((n) => `<button class="botao foco perfil ${n === config.perfil ? "primario" : ""}" data-n="${esc(n)}">${esc(n)}</button>`).join("")}
        <button class="botao foco" id="b-novo">＋</button></div>
      <div class="linha-config"><div class="nome">Letras</div>
        <button class="botao foco ${config.maiusculas !== false ? "primario" : ""}" id="b-mai">MAIÚSCULAS</button>
        <button class="botao foco ${config.maiusculas === false ? "primario" : ""}" id="b-min">minúsculas</button></div>
      <div class="linha-config"><div class="nome">Mostrar símbolos IPA</div>
        <button class="botao foco ${config.mostrarIPA ? "primario" : ""}" id="b-ipa">${config.mostrarIPA ? "Sim" : "Não"}</button></div>
      <div class="linha-config"><div class="nome">Mostrar escrita (letras)</div>
        <button class="botao foco ${config.mostrarEscrita ? "primario" : ""}" id="b-esc">${config.mostrarEscrita ? "Sim" : "Não"}</button></div>
      <div class="linha-config"><div class="nome">Tempo de tela (Assistir)</div>
        ${opMin.map((m) => `<button class="botao foco min ${config.minutos === m ? "primario" : ""}" data-m="${m}">${m ? m + " min" : "livre"}</button>`).join("")}</div>
      <div class="linha-config"><div class="nome">Horário de uso</div>
        ${Object.entries(HORARIOS).map(([k, h]) => `<button class="botao foco hor ${config.horario === k ? "primario" : ""}" data-h="${k}">${esc(h.nome)}</button>`).join("")}</div>
      <div class="linha-config"><div class="nome">Tamanho na tela</div>
        <button class="botao foco" id="b-menor">－</button>
        <div class="estado" style="min-width:140px;text-align:center">${Math.round((config.zoom || 1) * 100)}%</div>
        <button class="botao foco" id="b-maior">＋</button>
        <button class="botao foco" id="b-zoom1">Padrão</button></div>
      <div class="linha-config"><div class="nome">Servidor da casa</div>
        <input class="foco" id="i-serv" placeholder="http://192.168.0.10:8080" value="${esc(config.servidor)}">
        <button class="botao foco" id="b-testar">Conectar</button></div>
      <div class="linha-config"><div class="nome"></div><div class="estado" id="estado">${servidor ? "✅ Conectado a " + esc(servidor) : "⚪ Sem servidor (funciona offline)"}</div></div>
      ${celular ? `<div class="linha-config celular"><div class="nome">No celular<br><span class="estado">gravar áudios e ver relatórios</span></div>
        <div class="qr foco" tabindex="0">${qrSvg(celular)}</div>
        <div class="estado">Aponte a câmera do celular para o código<br>ou abra: <b>${esc(celular)}</b>${infoServidor.https ? "<br>Se o celular avisar que o site não é seguro, toque em <b>Avançado → Continuar</b>." : ""}</div></div>` : ""}
      <div class="linha-config"><div class="nome">Progresso de ${esc(config.perfil)}</div>
        <div class="estado">${Object.keys(progresso.sons).length} sons · ${Object.keys(progresso.silabas).length} sílabas · ${Object.keys(progresso.palavras).length} palavras · ${C.palavras.filter((p) => temFigurinha(p.id)).length} figurinhas · ${progresso.estrelas} ★</div></div>
    </div>`;
  const recarregar = (sel) => { irPara("pais", {}, { empilhar: false }); const b = $(sel); if (b) { b.focus(); b.scrollIntoView({ block: "nearest" }); } };
  $$(".perfil", tela).forEach((b) => (b.onclick = () => { config.perfil = b.dataset.n; salvarConfig(); carregarProgresso(); conectarServidor().finally(() => irPara("pais", {}, { empilhar: false })); }));
  $("#b-novo", tela).onclick = () => {
    const linha = $("#b-novo", tela).parentElement;
    const inp = el(`<input class="foco" placeholder="Nome" style="width:360px">`);
    linha.appendChild(inp); inp.focus();
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && inp.value.trim()) {
        const n = inp.value.trim().slice(0, 20);
        if (!config.perfis.includes(n)) config.perfis.push(n);
        config.perfil = n; salvarConfig(); carregarProgresso();
        if (servidor) buscar(servidor + "/api/perfis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: n }) }).catch(() => {});
        irPara("pais", {}, { empilhar: false });
      }
    });
  };
  $("#b-mai", tela).onclick = () => { config.maiusculas = true; salvarConfig(); recarregar("#b-mai"); };
  $("#b-min", tela).onclick = () => { config.maiusculas = false; salvarConfig(); recarregar("#b-min"); };
  $("#b-ipa", tela).onclick = () => { config.mostrarIPA = !config.mostrarIPA; if (!config.mostrarIPA && !config.mostrarEscrita) config.mostrarEscrita = true; salvarConfig(); recarregar("#b-ipa"); };
  $("#b-esc", tela).onclick = () => { config.mostrarEscrita = !config.mostrarEscrita; if (!config.mostrarIPA && !config.mostrarEscrita) config.mostrarIPA = true; salvarConfig(); recarregar("#b-esc"); };
  $$(".min", tela).forEach((b) => (b.onclick = () => { config.minutos = +b.dataset.m; salvarConfig(); recarregar(`.min[data-m="${config.minutos}"]`); }));
  $$(".hor", tela).forEach((b) => (b.onclick = () => { config.horario = b.dataset.h; salvarConfig(); recarregar(`.hor[data-h="${config.horario}"]`); }));
  const mudarZoom = (z, id) => { config.zoom = Math.min(1.3, Math.max(0.5, Math.round(z * 20) / 20)); salvarConfig(); ajustarEscala(); recarregar("#" + id); };
  $("#b-menor", tela).onclick = () => mudarZoom((config.zoom || 1) - 0.05, "b-menor");
  $("#b-maior", tela).onclick = () => mudarZoom((config.zoom || 1) + 0.05, "b-maior");
  $("#b-zoom1", tela).onclick = () => mudarZoom(1, "b-zoom1");
  $("#i-serv", tela).addEventListener("keydown", (e) => { if (e.key === "Enter") $("#b-testar", tela).click(); });
  $("#b-testar", tela).onclick = async () => {
    let v = $("#i-serv", tela).value.trim();
    if (v && !/^https?:\/\//.test(v)) v = "http://" + v;
    if (v && !/:\d+$/.test(v.replace(/\/+$/, ""))) v = v.replace(/\/+$/, "") + ":8080";
    config.servidor = v; salvarConfig();
    $("#estado", tela).textContent = "⏳ Procurando…";
    const ok = await conectarServidor();
    if (!vivo(t)) return;
    if (ok) irPara("pais", {}, { empilhar: false });
    else $("#estado", tela).textContent = "❌ Não encontrei o servidor nesse endereço";
  };
  // pais: foco inicial no perfil atual
  const atual = $(".perfil.primario", tela); if (atual) atual.setAttribute("data-inicial", "");
};

/* ---------- Assistir: a turma ensina sozinha ---------- */
let modoAssistir = false;
let fimAssistir = 0;
let relogioAssistir = null;

function proximosConteudos() {
  // Monta uma sequência que avança conforme o progresso, com revisão inteligente:
  // primeiro os sons que a criança erra ou que estão "vencidos", depois um som novo;
  // em seguida 1 grupo de sílabas e 2 palavras -> repete
  const sons = Object.values(SONS);
  const novos = sons.filter((s) => !progresso.sons[s.id]);
  const revisar = paraRevisar("sons", sons.map((s) => s.id)).map((id) => SONS[id]);
  const vistos = embaralhar(sons.filter((s) => progresso.sons[s.id]));
  const filaSons = [...revisar.slice(0, 2), ...novos.slice(0, 1)];
  for (const s of [...novos.slice(1), ...vistos]) { if (filaSons.length >= 3) break; if (!filaSons.includes(s)) filaSons.push(s); }
  const sonsVistos = new Set(Object.keys(progresso.sons));
  const gruposSil = C.silabas.filter((g) => sonsVistos.has(g.c));
  const grupo = sortear(gruposSil.length ? gruposSil : C.silabas.slice(0, 3));
  const palavrasNivel = C.palavras.filter((p) => p.nivel === 1 || Object.keys(progresso.sons).length > 20);
  const palavrasRevisar = paraRevisar("leitura", palavrasNivel.map((p) => p.id)).map((id) => PALAVRAS[id]);
  const palavras = [...palavrasRevisar.slice(0, 1), ...embaralhar(palavrasNivel)].filter((p, i, a) => a.indexOf(p) === i).slice(0, 2);
  return [
    ...filaSons.map((s) => ({ tipo: "som", s })),
    { tipo: "silabas", grupo },
    ...palavras.map((p) => ({ tipo: "palavra", p })),
  ];
}

async function iniciarAssistir() {
  if (modoAssistir) return;
  if (!horarioPermitido()) { irPara("foraHorario", {}, { empilhar: false }); return; }
  modoAssistir = true;
  pilha.length = 0; telaAtual = { nome: "inicio", args: {} };
  fimAssistir = config.minutos ? Date.now() + config.minutos * 60000 : Infinity;
  const inicio = Date.now();
  const meu = ++token;
  const barra = () => {
    const b = $(".progresso-assistir");
    if (b && fimAssistir !== Infinity) b.style.width = Math.min(100, (Date.now() - inicio) / (fimAssistir - inicio) * 100) + "%";
  };
  clearInterval(relogioAssistir); relogioAssistir = setInterval(barra, 1000);

  while (modoAssistir && token === meu) {
    for (const item of proximosConteudos()) {
      if (!modoAssistir || token !== meu) return;
      if (Date.now() > fimAssistir || !horarioPermitido()) { mostrarDescanso(); return; }
      palco.innerHTML = "";
      const tela = el('<div class="tela"></div>'); palco.appendChild(tela);
      const cont = el('<div></div>'); tela.appendChild(cont);
      const legenda = el('<div class="legenda-assistir">Aperte OK para sair</div>');
      const prog = el('<div class="progresso-assistir" style="width:0"></div>');
      palco.append(legenda, prog); barra();
      let ok;
      if (item.tipo === "som") ok = await apresentarSom(cont, item.s, meu, { passivo: true });
      if (item.tipo === "silabas") ok = await demonstrarSilabas(cont, item.grupo, meu, { passivo: true });
      if (item.tipo === "palavra") ok = await demonstrarPalavra(cont, item.p, meu);
      if (!ok || token !== meu) return;
      await esperar(1500);
    }
  }
}
function pararAssistir() { modoAssistir = false; clearInterval(relogioAssistir); token++; pararAudio(); }

function mostrarDescanso() {
  pararAssistir();
  palco.innerHTML = `<div class="tela"><div class="descanso">
    <div class="turma">${Object.keys(C.personagens).map((k) => `<img src="${C.personagens[k].img}" alt="">`).join("")}</div>
    <h2>Hora de descansar 🌙</h2><p>A turma vai dormir. Até amanhã!</p>
    <button class="botao grande foco" id="b-volta" style="margin-top:40px">Voltar ao início</button></div></div>`;
  tocar("frase_urso_descansar");
  const b = $("#b-volta"); b.focus();
  b.onclick = () => { pilha.length = 0; telaAtual = null; irPara("inicio"); };
}

/* ======================= Começo ======================= */
irPara("inicio");
conectarServidor().then((ok) => { if (ok && telaAtual && telaAtual.nome === "inicio") irPara("inicio", {}, { empilhar: false }); });
window.SonsMagicos = {
  irPara, voltar, iniciarAssistir, config, get progresso() { return progresso; },
  // app minimizado na TV: para o som e o modo Assistir
  pausar: () => { if (modoAssistir) { pararAssistir(); pilha.length = 0; irPara("inicio", {}, { empilhar: false }); } else pararAudio(); },
  // chamado pelo app Android quando ele encontra o servidor na rede da casa
  reconectar: () => conectarServidor().then((ok) => { if (ok && telaAtual && telaAtual.nome === "inicio" && !modoAssistir) irPara("inicio", {}, { empilhar: false }); return ok; }),
};
})();
