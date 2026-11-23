#!/usr/bin/env node
/*
 * Gera todos os áudios do app a partir de web/js/curriculo.js
 * usando espeak-ng + voz MBROLA brasileira (br4, feminina).
 *
 * Requisitos (Debian/Ubuntu):
 *   sudo apt install espeak-ng mbrola mbrola-br4 ffmpeg
 *
 * Uso:
 *   node ferramentas/gerar_audios.mjs            # gera só o que falta
 *   node ferramentas/gerar_audios.mjs --tudo     # refaz tudo
 *
 * Dica: a melhor voz para uma criança é a voz da mãe ou do pai!
 * Qualquer arquivo pode ser substituído por uma gravação sua pela
 * página de administração do servidor (http://SEU-SERVIDOR:8080/admin).
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import os from "node:os";

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const saida = path.join(raiz, "web", "audio");
const refazer = process.argv.includes("--tudo");
fs.mkdirSync(saida, { recursive: true });

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(raiz, "web/js/curriculo.js"), "utf8"), ctx);
const C = ctx.window.CURRICULO;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ipa-audio-"));
const VOZ = "mb-br4";          // voz natural (MBROLA)
const VOZ_FORMANTE = "pt-br+f3"; // voz de reserva para sons que a MBROLA não faz sozinha

// IPA -> mnemônicos de fonema do espeak-ng (português)
const MAPA = [
  ["tʃ", "tS"], ["dʒ", "dZ"],
  ["ã", "&~"], ["ẽ", "e~"], ["ĩ", "i~"], ["õ", "o~"], ["ũ", "u~"],
  ["ɛ", "E"], ["ɔ", "O"], ["ʃ", "S"], ["ʒ", "Z"], ["ʁ", "x"], ["ɾ", "*"],
  ["ɲ", "n^"], ["ʎ", "l^"],
];
function ipaParaEspeak(ipa) {
  let r = ipa.normalize("NFC");
  for (const [a, b] of MAPA) r = r.split(a).join(b);
  return r;
}

function sintetizar(texto, wav, { tom = 50, velocidade = 140, formante = false } = {}) {
  const args = ["-p", String(tom), "-s", String(velocidade)];
  if (!formante) {
    const r = spawnSync("espeak-ng", ["-v", VOZ, ...args, "-w", wav, texto], { encoding: "utf8" });
    // MBROLA avisa "unknown" quando não tem o par de fonemas -> usa a voz formante
    if (r.status === 0 && !/unknown/.test(r.stderr || "")) return;
  }
  execFileSync("espeak-ng", ["-v", VOZ_FORMANTE, ...args, "-w", wav, texto]);
}

// Normaliza volume, converte para mp3 mono e (opcional) estica sons contínuos
function finalizar(wav, mp3, { esticar = 1 } = {}) {
  const filtros = [];
  filtros.push("silenceremove=start_periods=1:start_threshold=-50dB");
  if (esticar !== 1) filtros.push(`atempo=${1 / esticar}`);
  filtros.push("loudnorm=I=-16:TP=-1.5:LRA=11");
  filtros.push("adelay=80");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-af", filtros.join(","),
    "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "64k", mp3]);
}

let feitos = 0, pulados = 0;
function gerar(nome, fn) {
  const mp3 = path.join(saida, nome + ".mp3");
  if (!refazer && fs.existsSync(mp3)) { pulados++; return; }
  const wav = path.join(tmp, nome + ".wav");
  fn(wav, mp3);
  feitos++;
  process.stdout.write(".");
}

// 1) Sons isolados
for (const u of C.unidades) {
  for (const s of u.sons) {
    gerar("som_" + s.id, (wav, mp3) => {
      const vogal = /:$/.test(s.esp);
      if (vogal) {
        sintetizar(`[[${s.esp}]]`, wav, { tom: 55, velocidade: 90 });
        finalizar(wav, mp3, { esticar: 1.6 });
      } else if (s.continuo) {
        // consoante que pode ser prolongada: mmmm, ffff, ssss...
        sintetizar(`[[${s.esp}${s.esp}${s.esp}]]`, wav, { tom: 55, velocidade: 80, formante: true });
        finalizar(wav, mp3, { esticar: 1.5 });
      } else {
        // oclusiva: som curtinho
        sintetizar(`[[${s.esp}]]`, wav, { tom: 55, velocidade: 120, formante: true });
        finalizar(wav, mp3);
      }
    });
  }
}

// 2) Sílabas
for (const grupo of C.silabas) {
  for (const [escrita, ipa] of grupo.itens) {
    gerar(`silaba_${grupo.c}_${escrita}`, (wav, mp3) => {
      sintetizar(`[['${ipaParaEspeak(ipa)}]]`, wav, { tom: 55, velocidade: 110 });
      finalizar(wav, mp3);
    });
  }
}

// 3) Sílabas das palavras (podem ter IPA diferente da grade, ex.: "to" -> /tu/)
for (const p of C.palavras) {
  p.s.forEach(([escrita, ipa], i) => {
    gerar(`psil_${p.id}_${i}`, (wav, mp3) => {
      sintetizar(`[['${ipaParaEspeak(ipa)}]]`, wav, { tom: 55, velocidade: 110 });
      finalizar(wav, mp3);
    });
  });
}

// 4) Palavras inteiras
for (const p of C.palavras) {
  const escrita = p.escrita || p.s.map((x) => x[0]).join("");
  gerar("palavra_" + p.id, (wav, mp3) => {
    sintetizar(escrita, wav, { tom: 55, velocidade: 120 });
    finalizar(wav, mp3);
  });
}

// 5) Frases de cada personagem (cada um com seu tom de voz)
for (const [pid, per] of Object.entries(C.personagens)) {
  for (const [chave, texto] of Object.entries(C.frases)) {
    gerar(`frase_${pid}_${chave}`, (wav, mp3) => {
      sintetizar(texto, wav, { tom: per.tom, velocidade: 135 });
      finalizar(wav, mp3);
    });
  }
}
for (const u of C.unidades) {
  gerar(`intro_${u.id}`, (wav, mp3) => {
    sintetizar(u.frase, wav, { tom: C.personagens[u.personagem].tom, velocidade: 135 });
    finalizar(wav, mp3);
  });
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nÁudios gerados: ${feitos}, já existiam: ${pulados}. Pasta: ${saida}`);
