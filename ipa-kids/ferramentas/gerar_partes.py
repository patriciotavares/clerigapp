#!/usr/bin/env python3
"""
Recorta cada personagem em partes móveis (cabeça, asas, orelhas, rabo, braços)
para o app animar como um boneco articulado.

Uso:  python3 ferramentas/gerar_partes.py
Gera: web/img/personagens/partes/*.png  e  web/js/rig.js

Cada parte é um polígono (em pixels da imagem web/img/personagens/<id>.png)
com um ponto de articulação ("pivo"). O corpo perde a parte de fora,
mas mantém um "disco de junta" em volta do pivo para não abrir buraco
quando a parte gira.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

RAIZ = Path(__file__).resolve().parent.parent
DIR = RAIZ / "web" / "img" / "personagens"
SAIDA = DIR / "partes"

# tipo: cabeca | asa | orelha | rabo | braco  (define o estilo de movimento no app)
RIG = {
    "pato": [
        {"nome": "asa", "tipo": "asa", "pivo": [100, 320], "junta": 40,
         "poli": [(0, 272), (118, 282), (112, 462), (0, 462)]},
        {"nome": "cabeca", "tipo": "cabeca", "pivo": [205, 268], "junta": 48,
         "poli": [(0, 0), (351, 0), (351, 268), (0, 268)]},
    ],
    "urso": [
        {"nome": "braco_e", "tipo": "braco", "pivo": [118, 262], "junta": 38,
         "poli": [(0, 250), (132, 238), (138, 350), (0, 350)]},
        {"nome": "braco_d", "tipo": "braco_d", "pivo": [246, 272], "junta": 38,
         "poli": [(228, 258), (364, 258), (364, 372), (228, 372)]},
        {"nome": "cabeca", "tipo": "cabeca", "pivo": [182, 205], "junta": 60,
         "poli": [(30, 0), (334, 0), (334, 202), (30, 202)]},
    ],
    "cachorro": [
        {"nome": "rabo", "tipo": "rabo", "pivo": [306, 392], "junta": 30,
         "poli": [(292, 238), (384, 238), (384, 425), (300, 425)]},
        {"nome": "cabeca", "tipo": "cabeca", "pivo": [165, 300], "junta": 55,
         "poli": [(0, 0), (384, 0), (384, 218), (298, 236), (286, 306), (70, 306), (0, 260)]},
    ],
    "coelho": [
        {"nome": "orelha_e", "tipo": "orelha", "pivo": [125, 228], "junta": 30,
         "poli": [(0, 0), (155, 0), (158, 200), (142, 242), (92, 236), (0, 112)]},
        {"nome": "orelha_d", "tipo": "orelha_d", "pivo": [206, 200], "junta": 28,
         "poli": [(155, 0), (272, 0), (266, 190), (232, 216), (184, 216), (158, 200)]},
    ],
    "pinguim": [
        {"nome": "asa_e", "tipo": "asa", "pivo": [104, 236], "junta": 34,
         "poli": [(0, 188), (112, 200), (110, 314), (0, 324)]},
        {"nome": "asa_d", "tipo": "asa_d", "pivo": [302, 232], "junta": 34,
         "poli": [(298, 176), (427, 236), (427, 316), (298, 304)]},
    ],
}


def mascara_poligono(tam, poli, suave=1.5):
    m = Image.new("L", tam, 0)
    ImageDraw.Draw(m).polygon(poli, fill=255)
    return np.array(m.filter(ImageFilter.GaussianBlur(suave))).astype(np.float32) / 255


def disco(tam, centro, raio):
    m = Image.new("L", tam, 0)
    x, y = centro
    ImageDraw.Draw(m).ellipse((x - raio, y - raio, x + raio, y + raio), fill=255)
    return np.array(m.filter(ImageFilter.GaussianBlur(4))).astype(np.float32) / 255


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    rig_js = {}
    for pid, partes in RIG.items():
        im = Image.open(DIR / f"{pid}.png").convert("RGBA")
        arr = np.array(im).astype(np.float32)
        alfa = arr[:, :, 3] / 255
        w, h = im.size
        corpo = alfa.copy()
        info = []
        # "miolo": o personagem encolhido alguns pixels a partir da borda. Ele fica no corpo
        # por baixo de cada parte; quando a parte gira um pouco, não aparece buraco nem fantasma.
        def miolo(k):
            e = ndimage.binary_erosion(alfa > 0.5, iterations=k)
            return np.array(Image.fromarray((e * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255
        for p in partes:
            m = mascara_poligono((w, h), p["poli"])
            parte = arr.copy()
            parte[:, :, 3] = alfa * m * 255
            Image.fromarray(parte.astype(np.uint8), "RGBA").save(SAIDA / f"{pid}_{p['nome']}.png", optimize=True)
            # tira a parte do corpo, menos a junta (para não abrir buraco ao girar)
            corpo = corpo * (1 - m * (1 - disco((w, h), p["pivo"], p["junta"])))
            k = 16 if p["tipo"] == "cabeca" else 8
            # por baixo da parte (com folga de alguns pixels) o corpo fica 100% opaco,
            # assim a emenda suave do recorte não vira uma linha transparente
            dentro = ndimage.binary_dilation(mascara_poligono((w, h), p["poli"], 0) > 0.5, iterations=6)
            corpo = np.maximum(corpo, alfa * dentro * miolo(k))
            info.append({"nome": p["nome"], "tipo": p["tipo"],
                         "px": round(p["pivo"][0] / w * 100, 2), "py": round(p["pivo"][1] / h * 100, 2)})
        c = arr.copy()
        c[:, :, 3] = corpo * 255
        Image.fromarray(c.astype(np.uint8), "RGBA").save(SAIDA / f"{pid}_corpo.png", optimize=True)
        rig_js[pid] = {"proporcao": round(w / h, 4), "partes": info}
        print(pid, [p["nome"] for p in partes])
    (RAIZ / "web" / "js" / "rig.js").write_text(
        "/* Gerado por ferramentas/gerar_partes.py — partes móveis de cada personagem */\n"
        "window.RIG = " + json.dumps(rig_js, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
