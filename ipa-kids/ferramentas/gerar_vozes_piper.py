#!/usr/bin/env python3
"""
Gera vozes NATURAIS (neurais) para o app com o Piper, que roda sem internet no seu servidor.

Os áudios vão para PASTA_DADOS/vozes/ e o servidor passa a entregá-los no lugar
das vozes robóticas. Prioridade no app: sua gravação (/admin) > voz Piper > voz padrão.

Uso no servidor (Docker):
    docker compose --profile vozes run --rm --build vozes

Opções (variáveis de ambiente):
    VOZ=pt_BR-faber-medium    voz do Piper (veja https://rhasspy.github.io/piper-samples/)
    REFAZER=1                 refaz tudo (senão só gera o que falta)
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
import wave
from pathlib import Path

import json5
import numpy as np
from piper import PiperVoice, SynthesisConfig

WEB = Path(os.environ.get("WEB", "/web"))
SAIDA = Path(os.environ.get("SAIDA", "/dados/vozes"))
MODELOS = Path(os.environ.get("MODELOS", "/dados/modelos-voz"))
VOZ = os.environ.get("VOZ", "pt_BR-faber-medium")
REFAZER = os.environ.get("REFAZER") == "1"

# Tom de voz de cada personagem, em semitons (bichos pequenos = voz mais aguda)
TOM = {"pato": 4, "coelho": 5, "pinguim": 3, "cachorro": 1, "urso": -3}

# Fonemas do nosso IPA que o modelo (treinado com o espeak) escreve de outro jeito
TROCAS = {"g": ["ɡ"], "ʁ": ["x"], "ã": ["ɐ", "̃"], "ʎ": ["l", "j"], "tʃ": ["t", "ʃ"], "dʒ": ["d", "ʒ"]}
TAXA = 22050  # trocada pela taxa real da voz em main()


def carregar_curriculo():
    txt = (WEB / "js" / "curriculo.js").read_text(encoding="utf-8")
    txt = txt[txt.index("{"): txt.rindex("}") + 1]
    return json5.loads(txt)


def baixar_voz():
    MODELOS.mkdir(parents=True, exist_ok=True)
    onnx = MODELOS / f"{VOZ}.onnx"
    if not onnx.exists():
        print(f"Baixando a voz {VOZ}…", flush=True)
        subprocess.run([sys.executable, "-m", "piper.download_voices", VOZ, "--data-dir", str(MODELOS)], check=True)
    return PiperVoice.load(str(onnx))


def ipa_para_fonemas(ipa, mapa):
    """Lista de fonemas para o Piper a partir do nosso IPA (troca o que o modelo não conhece)."""
    ipa = unicodedata.normalize("NFC", ipa)
    out = ["ˈ"]
    i = 0
    while i < len(ipa):
        par = ipa[i:i + 2]
        if par in TROCAS:
            out += TROCAS[par]; i += 2; continue
        ch = ipa[i]
        if ch in TROCAS and ch not in mapa:
            out += TROCAS[ch]
        else:
            out += list(unicodedata.normalize("NFD", ch))
        i += 1
    return [f for f in out if f in mapa]


def salvar_wav(caminho, audio, taxa):
    audio = np.clip(audio, -1, 1)
    with wave.open(str(caminho), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(taxa)
        w.writeframes((audio * 32767).astype(np.int16).tobytes())


def para_mp3(wav, mp3, semitons=0, esticar=1.0):
    f = []
    if semitons:
        r = 2 ** (semitons / 12)
        f += [f"asetrate={TAXA}*{r:.4f}", "aresample=24000", f"atempo={1 / r:.4f}"]
    if esticar != 1.0:
        f.append(f"atempo={1 / esticar:.4f}")
    f += ["silenceremove=start_periods=1:start_threshold=-45dB",
          "areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
          "loudnorm=I=-16:TP=-1.5:LRA=11", "adelay=80"]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-af", ",".join(f),
                    "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "64k", str(mp3)], check=True)


def main():
    C = carregar_curriculo()
    voz = baixar_voz()
    mapa = voz.config.phoneme_id_map
    taxa = voz.config.sample_rate
    global TAXA
    TAXA = taxa
    SAIDA.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    feitos = pulados = falhas = 0

    def gerar(nome, fn):
        nonlocal feitos, pulados, falhas
        mp3 = SAIDA / f"{nome}.mp3"
        if mp3.exists() and not REFAZER:
            pulados += 1; return
        try:
            if fn(tmp / f"{nome}.wav", mp3) is False:
                pulados += 1; return
            feitos += 1
            print(".", end="", flush=True)
        except Exception as e:  # um áudio com problema não para o resto
            falhas += 1
            print(f"\n  ! {nome}: {e}", flush=True)

    def texto(t, semitons=0, velocidade=1.0):
        def fn(wav, mp3):
            with wave.open(str(wav), "wb") as w:
                voz.synthesize_wav(t, w, syn_config=SynthesisConfig(length_scale=velocidade))
            para_mp3(wav, mp3, semitons)
        return fn

    def fonemas(ipa, longo=False, esticar=1.0):
        def fn(wav, mp3):
            fs = ipa_para_fonemas(ipa, mapa)
            if longo and "ː" in mapa:
                fs.append("ː")
            if len(fs) <= 1:
                return False
            audio = voz.phoneme_ids_to_audio(voz.phonemes_to_ids(fs), SynthesisConfig(length_scale=1.5 if longo else 1.15))
            audio = audio[0] if isinstance(audio, tuple) else audio
            if len(audio) < taxa * 0.12 or float(np.sqrt(np.mean(audio ** 2))) < 0.01:
                return False  # saiu mudo ou curto demais: mantém a voz padrão
            salvar_wav(wav, audio, taxa)
            para_mp3(wav, mp3, esticar=esticar)
        return fn

    # 1) sons isolados: vogais e consoantes contínuas (as oclusivas p, b, t… ficam com a voz padrão
    #    ou a sua gravação, porque não existem sozinhas numa voz natural)
    for u in C["unidades"]:
        for s in u["sons"]:
            vogal = s["esp"].endswith(":")
            if vogal or s.get("continuo"):
                gerar("som_" + s["id"], fonemas(s["ipa"], longo=True, esticar=1.3 if vogal else 1.6))

    # 2) sílabas
    for g in C["silabas"]:
        for escrita, ipa in g["itens"]:
            gerar(f"silaba_{g['c']}_{escrita}", fonemas(ipa))

    # 3) sílabas dentro das palavras
    for p in C["palavras"]:
        for i, (escrita, ipa) in enumerate(p["s"]):
            gerar(f"psil_{p['id']}_{i}", fonemas(ipa))

    # 4) palavras inteiras (lidas pelo texto: entonação natural)
    for p in C["palavras"]:
        escrita = p.get("escrita") or "".join(x[0] for x in p["s"])
        gerar("palavra_" + p["id"], texto(escrita + ".", velocidade=1.1))

    # 5) frases de cada personagem, cada um com seu tom
    for pid in C["personagens"]:
        for chave, frase in C["frases"].items():
            gerar(f"frase_{pid}_{chave}", texto(frase, TOM.get(pid, 0)))
    for u in C["unidades"]:
        gerar(f"intro_{u['id']}", texto(u["frase"], TOM.get(u["personagem"], 0)))

    (SAIDA / "voz.json").write_text(json.dumps({"voz": VOZ}), encoding="utf-8")
    print(f"\nVozes prontas: {feitos} novas, {pulados} mantidas, {falhas} com erro. Pasta: {SAIDA}")
    print("A TV já usa as vozes novas na próxima vez que abrir o app.")


if __name__ == "__main__":
    main()
