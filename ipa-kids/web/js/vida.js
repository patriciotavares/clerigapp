/*
 * Vida — movimento realista dos personagens, calculado a cada quadro (60 fps).
 *
 * Em vez de animações repetidas, cada boneco tem:
 *  - respiração e peso: o corpo sobe/desce e se acomoda como um corpo de verdade;
 *  - "ruído orgânico": cada parte (cabeça, asas, orelhas, rabo…) mexe de um jeito
 *    nunca igual, misturando ondas lentas com fases aleatórias;
 *  - olhar curioso: de tempos em tempos a cabeça vira para outro lado e volta com mola;
 *  - fala sincronizada: quando o personagem fala, a cabeça e os braços acompanham
 *    o VOLUME real da voz (cada sílaba mexe), não um balanço fixo;
 *  - pulo com física: impulso, gravidade, esticar no ar e amassar ao cair;
 *  - chegada: o bicho entra andando aos pulinhos (o caracol entra voando, rapidinho).
 */
(() => {
"use strict";

// Como cada tipo de parte se mexe: amplitude parado, ao falar, comemorando; frequência; lado
const PARTES = {
  cabeca:   { parado: 2.4, fala: 5,  festa: 8,  freq: 0.30, lado: 1 },
  asa:      { parado: 5,   fala: 14, festa: 32, freq: 0.45, lado: -1 },
  asa_d:    { parado: 5,   fala: 14, festa: 32, freq: 0.45, lado: 1 },
  orelha:   { parado: 3.5, fala: 6,  festa: 12, freq: 0.22, lado: -1 },
  orelha_d: { parado: 3.5, fala: 6,  festa: 12, freq: 0.25, lado: 1 },
  rabo:     { parado: 10,  fala: 14, festa: 24, freq: 1.5,  lado: 1 },
  braco:    { parado: 3,   fala: 11, festa: 24, freq: 0.38, lado: -1 },
  braco_d:  { parado: 3,   fala: 11, festa: 24, freq: 0.42, lado: 1 },
  casco:    { parado: 1.4, fala: 2,  festa: 4,  freq: 0.25, lado: 1 },
  cachecol: { parado: 7,   fala: 9,  festa: 20, freq: 1.2,  lado: 1 },
  olho:     { parado: 4,   fala: 7,  festa: 12, freq: 0.55, lado: -1 },
  olho_d:   { parado: 4,   fala: 7,  festa: 12, freq: 0.5,  lado: 1 },
};

const estados = new WeakMap();
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

// "ruído" suave: soma de senos com fases aleatórias (nunca se repete igual)
function criarRuido() {
  const f = [rnd(0.8, 1.2), rnd(1.9, 2.4), rnd(0.31, 0.43)];
  const p = [rnd(0, TAU), rnd(0, TAU), rnd(0, TAU)];
  return (t, freq) => 0.6 * Math.sin(TAU * freq * f[0] * t + p[0]) + 0.28 * Math.sin(TAU * freq * f[1] * t + p[1]) + 0.4 * Math.sin(TAU * freq * f[2] * t + p[2]);
}

function iniciar(el, agora) {
  const e = {
    inicio: agora,
    chegando: el.classList.contains("chegando"),
    rapido: el.dataset.pid === "caracol",
    respira: rnd(0.9, 1.2), fase: rnd(0, TAU),
    ruidoCorpo: criarRuido(),
    partes: [...el.querySelectorAll(".parte")].map((p) => ({ el: p, cfg: PARTES[p.dataset.tipo] || PARTES.cabeca, ruido: criarRuido(), fase: rnd(0, TAU) })),
    // mola do olhar
    olhar: 0, olharV: 0, olharAlvo: 0, proximoOlhar: agora + rnd(1500, 4000),
    // física do pulo
    y: 0, vy: 0, amassa: 0, pulos: 0, estavaFeliz: false,
    energia: 0, // volume da fala (0–1), suavizado
  };
  estados.set(el, e);
  return e;
}

let ultimo = performance.now();
function quadro(agora) {
  const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
  const t = agora / 1000;
  const nivelVoz = window.SonsMagicosAudio ? window.SonsMagicosAudio.nivel() : null;

  for (const el of document.querySelectorAll(".boneco")) {
    const e = estados.get(el) || iniciar(el, agora);
    const falando = el.classList.contains("falando");
    const feliz = el.classList.contains("feliz");

    // ---- energia da fala: volume real da voz, ou um ritmo de sílabas se não houver medidor
    let alvo = 0;
    if (falando) {
      if (nivelVoz !== null) alvo = Math.min(1, nivelVoz * 3.2);
      else alvo = 0.35 + 0.65 * Math.max(0, Math.sin(t * 13 + e.fase)) * (0.6 + 0.4 * Math.sin(t * 3.1));
    }
    e.energia += (alvo - e.energia) * (alvo > e.energia ? 0.45 : 0.18);

    // ---- olhar curioso (mola amortecida)
    if (agora > e.proximoOlhar) {
      e.olharAlvo = falando ? rnd(-2, 2) : (Math.random() < 0.35 ? 0 : rnd(-6, 6));
      e.proximoOlhar = agora + rnd(1800, 5000);
    }
    e.olharV += ((e.olharAlvo - e.olhar) * 40 - e.olharV * 9) * dt;
    e.olhar += e.olharV * dt;

    // ---- pulo com física
    if (feliz && !e.estavaFeliz) e.pulos = 3;
    e.estavaFeliz = feliz;
    if (e.pulos > 0 && e.y >= 0 && e.vy >= 0) { e.vy = -rnd(780, 900); e.pulos--; e.amassa = -0.08; }
    if (e.y < 0 || e.vy < 0) {
      e.vy += 2600 * dt; e.y += e.vy * dt;
      if (e.y >= 0) { e.y = 0; e.amassa = Math.min(0.16, e.vy / 6000); e.vy = 0; }
    }
    e.amassa *= Math.pow(0.0015, dt); // volta ao normal rapidinho

    // ---- chegada
    let x = 0, yChegada = 0, inclina = 0;
    if (e.chegando) {
      const dur = e.rapido ? 650 : 1100;
      const p = Math.min(1, (agora - e.inicio) / dur);
      const sai = 1 - Math.pow(1 - p, 3);
      x = -800 * (1 - sai);
      if (e.rapido) inclina = -12 * (1 - p) + (p > 0.85 ? 6 * Math.sin((p - 0.85) / 0.15 * Math.PI) : 0); // freia e balança
      else yChegada = -Math.abs(Math.sin(p * Math.PI * 4)) * 50 * (1 - p);
      if (p >= 1) e.chegando = false;
    }

    // ---- corpo: respiração + peso + fala + pulo
    const respira = Math.sin(t * TAU * 0.28 * e.respira + e.fase);
    const noAr = e.y < 0 ? Math.min(0.1, -e.vy / 9000) : 0;
    const sy = 1 + respira * 0.012 + e.energia * 0.025 - e.amassa + noAr;
    const sx = 1 - respira * 0.006 + e.amassa * 0.9 - noAr * 0.6;
    const rot = e.ruidoCorpo(t, 0.12) * 1.1 + e.olhar * 0.25 + e.energia * 1.6 * Math.sin(t * 7 + e.fase) + inclina;
    el.style.transform = `translate(${x.toFixed(1)}px, ${(e.y + yChegada).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;

    // ---- partes
    for (const pt of e.partes) {
      const c = pt.cfg;
      let a = c.parado * pt.ruido(t, c.freq);
      if (pt.el.dataset.tipo === "cabeca") a += e.olhar + e.energia * c.fala * (0.4 + 0.6 * Math.sin(t * 11 + pt.fase));
      else a += c.lado * e.energia * c.fala * (0.5 + 0.5 * Math.sin(t * 9 + pt.fase));
      if (feliz || e.y < 0) a += c.lado * c.festa * Math.sin(t * 16 + pt.fase);
      // rabo e cachecol "atrasam" com o pulo (inércia)
      if (pt.el.dataset.tipo === "rabo" || pt.el.dataset.tipo === "cachecol") a += e.vy * 0.012;
      pt.el.style.transform = `rotate(${a.toFixed(2)}deg)`;
    }
  }
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
})();
