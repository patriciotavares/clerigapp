# 🐧🐰🐻🐶🦆 Sons Mágicos

App de alfabetização com **IPA (Alfabeto Fonético Internacional)** para crianças a partir de 2 anos,
feito para a **TV (Google TV / Android TV)** e controlado pelo **controle remoto**.

A criança aprende na ordem:

1. **Sons isolados**: cada personagem guia um grupo de sons:
   | Personagem | Grupo | Sons |
   |---|---|---|
   | 🦆 Pato | Vogais | a i u e o ɛ ɔ |
   | 🐻 Urso | Sons que zumbem (nasais e líquidas) | m n ɲ l ʎ ɾ |
   | 🐶 Cachorro | Sons de sopro (fricativas) | f v s z ʃ ʒ ʁ |
   | 🐰 Coelho | Sons que pulam (oclusivas) | p b t d k g tʃ dʒ |
   | 🐧 Pinguim | Vogais do nariz (nasais) | ã ẽ ĩ õ ũ |
2. **Sílabas**: o som da consoante e o da vogal se juntam (/p/ + /a/ = /pa/).
3. **Palavras**: as sílabas acendem uma a uma, se juntam e a figura aparece.
4. **Ler**: a palavra aparece escrita e a criança acha a figura certa.

E o botão **▶ Assistir** faz a turma ensinar sozinha, seguindo o progresso da criança e parando no tempo de tela que você definir.

---

## Como as peças se encaixam

```
Servidor Linux (Docker, HD 8 TB)          TV TCL (Google TV)
 ├─ guarda o progresso de cada filho  ◀──▶ app "Sons Mágicos"
 ├─ guarda as gravações com a sua voz       (funciona até sem servidor)
 └─ entrega o APK para instalar na TV
```

---

## 1. Ligar o servidor (uma vez)

No servidor Linux:

```bash
git clone https://github.com/patriciotavares/clerigapp.git
cd clerigapp/ipa-kids
cp .env.exemplo .env
nano .env          # PASTA_DADOS=/caminho/do/seu/HD/sons-magicos
docker compose up -d --build
```

Pronto. Confira no navegador do computador: `http://IP-DO-SERVIDOR:8080`
(o próprio app abre ali e você já pode testar com as setas do teclado).

Para descobrir o IP do servidor: `hostname -I`.

## 2. Gerar o APK da TV

Escolha um dos caminhos:

- **GitHub (automático):** a cada mudança, o GitHub gera o APK. Em *Actions → Sons Mágicos - APK da TV*,
  abra a última execução e baixe **sons-magicos-apk**. Descompacte e copie o `sons-magicos.apk` para
  `PASTA_DADOS/apk/` no servidor.
- **No próprio servidor (recomendado):** `docker compose --profile apk run --rm --build apk`
  (demora uns 10 minutos na primeira vez e já deixa o APK em `PASTA_DADOS/apk/`).
  Ele cria uma chave de assinatura em `PASTA_DADOS/chave/`, que fica guardada no seu HD. Com ela, cada nova versão instala por cima da anterior sem perder nada.

> O APK do GitHub sai com uma chave diferente a cada vez. Para atualizar com ele, desinstale a versão anterior da TV primeiro
> (o progresso fica salvo no servidor). Ou cadastre a chave do servidor no GitHub como segredo `SONS_KEYSTORE_BASE64`
> (`base64 -w0 PASTA_DADOS/chave/sons-magicos.keystore`).

## 3. Instalar na TV TCL (Google TV)

1. Na TV: **Configurações → Sistema → Sobre → Build do Android TV OS**. Aperte **OK 7 vezes** para virar "desenvolvedor".
2. Instale o app **Downloader** (da AFTVnews) pela Play Store da TV.
3. **Configurações → Apps → Segurança e restrições → Fontes desconhecidas**: ative para o **Downloader**.
4. Abra o Downloader e digite: `http://IP-DO-SERVIDOR:8080/apk` → **Instalar**.
5. O **Sons Mágicos** aparece na tela inicial da TV (em "Apps").

O app encontra o servidor sozinho na rede da casa. Se não encontrar, vá em **⚙️ Pais → Servidor da casa** e digite o IP.

## 4. Usar com o controle remoto

| Botão | O que faz |
|---|---|
| Setas | escolher |
| OK | entrar / responder |
| Voltar | voltar uma tela (durante o **Assistir**, qualquer botão sai) |
| ⏯ Play | começa o **Assistir** |

**⚙️ Pais** (na tela inicial): perfis para cada filho, mostrar ou esconder IPA e letras, tempo de tela e servidor.

## 5. Gravar com a sua voz (recomendado!)

As vozes que vêm no app são sintetizadas (espeak-ng + MBROLA). **A voz da mãe ou do pai ensina muito melhor.**
No celular, abra `http://IP-DO-SERVIDOR:8080/admin`:

- veja o progresso de cada criança;
- para cada som, sílaba, palavra ou frase dos personagens: ouça o áudio padrão e **envie uma gravação** feita no gravador do celular.
  O servidor converte e ajusta o volume sozinho, e a TV passa a usar a sua voz.

Dicas para gravar os sons isolados:
- **Contínuos** (m, n, f, v, s, z, ʃ, ʒ, l, ʁ e as vogais): segure o som por 1 a 2 segundos, *sem vogal no fim* ("mmmm", não "mê").
- **Oclusivas** (p, b, t, d, k, g): som curtinho, só o "estalo" ("p", não "pê").

---

## Para quem for mexer no código

```
ipa-kids/
├─ web/                    o app (HTML/CSS/JS puro, sem dependências)
│  ├─ js/curriculo.js      ← sons, sílabas, palavras e frases: edite aqui para adicionar conteúdo
│  ├─ js/app.js            telas, navegação pelo controle, jogos, modo Assistir
│  ├─ audio/               áudios gerados
│  └─ img/personagens/     personagens recortados (originais em art/originais)
├─ ferramentas/gerar_audios.mjs   gera os áudios a partir do curriculo.js
├─ servidor/               servidor Node (sem dependências) + página /admin
├─ android/                app Android TV (WebView que carrega a pasta web/)
├─ Dockerfile, docker-compose.yml
```

- **Adicionar palavras:** inclua em `palavras` no `curriculo.js` e rode
  `node ferramentas/gerar_audios.mjs` (precisa de `espeak-ng mbrola mbrola-br4 ffmpeg`).
- **Novo personagem:** coloque o PNG (fundo transparente) em `web/img/personagens/` e adicione em `personagens`.
- **Testar no computador:** `node servidor/server.js` e abra `http://localhost:8080` (setas, Enter e Esc).

Transcrição usada: IPA "larga" do português brasileiro (ex.: *pato* → /ˈpa.tu/, *tigre* → /ˈtʃi.gɾi/), exatamente como a criança ouve.
