#!/usr/bin/env node
/*
 * Monta o roteiro de falas para o ElevenLabs a partir do curriculo.js.
 * Saída: ferramentas/elevenlabs_roteiro.json  — lotes por voz, cada item = {nome, texto}
 *
 * Os textos são escritos "do jeito que se fala" (pá, pê, chá…), para a voz
 * pronunciar exatamente o som do IPA.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(raiz, "web/js/curriculo.js"), "utf8"), ctx);
const C = ctx.window.CURRICULO;

// IPA (de uma sílaba) -> escrita que a voz lê com esse som
const VOGAL = { a: "á", e: "ê", "ɛ": "é", i: "i", o: "ô", "ɔ": "ó", u: "u", "ã": "ã", "ẽ": "ên", "ĩ": "in", "õ": "om", "ũ": "un" };
const FRENTE = /^[eiɛẽĩ]/;
export function ipaParaTexto(ipa) {
  let s = ipa.normalize("NFC").replace(/ˈ|\./g, "");
  let out = "";
  while (s.length) {
    const resto = s.slice(1);
    let m;
    if ((m = /^(tʃ|dʒ)/.exec(s))) { out += m[1] === "tʃ" ? "t" : "d"; s = s.slice(2); continue; }
    const c = s[0];
    if (VOGAL[c] !== undefined) { out += VOGAL[c]; s = resto; continue; }
    const mapa = { k: FRENTE.test(resto) ? "qu" : "c", g: FRENTE.test(resto) ? "gu" : "g", "ʃ": "ch", "ʒ": "j",
      "ʁ": "r", "ɾ": "r", "ɲ": "nh", "ʎ": "lh", w: "u" };
    out += mapa[c] ?? c;
    s = resto;
  }
  return out;
}

// Sons isolados: contínuos prolongados. Oclusivas e o tepe (ɾ) não existem sozinhos numa voz natural.
const SOM = {
  a: "Aaaa.", i: "Iiii.", u: "Uuuu.", e: "Êêêê.", o: "Ôôôô.", eh: "Éééé.", oh: "Óóóó.",
  m: "Mmmmmm.", n: "Nnnnnn.", nh: "Nhnhnhnh.", l: "Llllll.", lh: "Lhlhlhlh.",
  f: "Ffffff.", v: "Vvvvvv.", s: "Ssssss.", z: "Zzzzzz.", ch: "Shhhhhh.", j: "Jjjjjj.", rr: "Rrrrrr.",
  an: "Ããããã.", en: "Ẽẽẽẽ.", in: "Ĩĩĩĩ.", on: "Õõõõ.", un: "Ũũũũ.",
};

const narrador = [];
for (const u of C.unidades) for (const s of u.sons) if (SOM[s.id]) narrador.push({ nome: "som_" + s.id, texto: SOM[s.id] });
for (const g of C.silabas) for (const [esc, ipa] of g.itens) narrador.push({ nome: `silaba_${g.c}_${esc}`, texto: ipaParaTexto(ipa) + "." });
for (const p of C.palavras) p.s.forEach(([esc, ipa], i) => {
  if (/(^|[aeiouɛɔ])ɾ/.test(ipa)) return; // ɾ entre vogais: a voz lê como "rr". Fica com a voz padrão.
  narrador.push({ nome: `psil_${p.id}_${i}`, texto: ipaParaTexto(ipa) + "." });
});
for (const p of C.palavras) narrador.push({ nome: "palavra_" + p.id, texto: (p.escrita || p.s.map((x) => x[0]).join("")) + "." });

const personagens = {};
for (const pid of Object.keys(C.personagens)) {
  personagens[pid] = Object.entries(C.frases).map(([k, t]) => ({ nome: `frase_${pid}_${k}`, texto: t }));
}
for (const u of C.unidades) personagens[u.personagem].push({ nome: `intro_${u.id}`, texto: u.frase });

// Textos repetidos (ex.: "pá." aparece em várias palavras) são gerados uma vez só
const unicos = new Map();
for (const it of narrador) {
  if (!unicos.has(it.texto)) unicos.set(it.texto, { nome: it.nome, texto: it.texto, copias: [] });
  else unicos.get(it.texto).copias.push(it.nome);
}
// lotes pequenos (até 30 falas) para separar os áudios com segurança
const lista = [...unicos.values()];
const lotesNarrador = [];
for (let i = 0; i < lista.length; i += 30) lotesNarrador.push({ voz: "narrador", itens: lista.slice(i, i + 30) });
const lotes = [...lotesNarrador, ...Object.entries(personagens).map(([voz, itens]) => ({ voz, itens }))];
const total = lotes.reduce((n, l) => n + l.itens.reduce((m, i) => m + i.texto.length, 0), 0);
fs.writeFileSync(path.join(raiz, "ferramentas/elevenlabs_roteiro.json"), JSON.stringify({ lotes }, null, 1));
console.log(lotes.map((l) => `${l.voz}: ${l.itens.length} falas, ${l.itens.reduce((m, i) => m + i.texto.length, 0)} caracteres`).join("\n"), `\ntotal de caracteres: ${total}`);
