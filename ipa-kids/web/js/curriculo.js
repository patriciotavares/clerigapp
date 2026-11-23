/*
 * Currículo IPA para português do Brasil.
 *
 * Ordem pedagógica:
 *   1. Sons isolados, agrupados pelo jeito de articular (cada grupo tem um personagem guia)
 *   2. Sílabas (consoante + vogal)
 *   3. Palavras (sílabas juntas)
 *   4. Leitura (ver a palavra escrita e achar a figura)
 *
 * Transcrição "larga" (broad) do português brasileiro: o "o" final átono vira /u/,
 * o "e" final átono vira /i/, "ti/di" viram /tʃi/ /dʒi/ — exatamente como as crianças ouvem.
 *
 * Campos usados pelo gerador de áudio (ferramentas/gerar_audios.py):
 *   esp  = fonemas no formato do espeak-ng (usado para sintetizar o som isolado / sílaba)
 *   fala = texto para sintetizar a palavra
 */
window.CURRICULO = {
  personagens: {
    pato:     { nome: "Pato",     img: "img/personagens/pato.png",     cor: "#FFC93C", tom: 70 },
    urso:     { nome: "Urso",     img: "img/personagens/urso.png",     cor: "#B9814F", tom: 25 },
    cachorro: { nome: "Cachorro", img: "img/personagens/cachorro.png", cor: "#F08A4B", tom: 50 },
    coelho:   { nome: "Coelho",   img: "img/personagens/coelho.png",   cor: "#F7A1C4", tom: 80 },
    pinguim:  { nome: "Pinguim",  img: "img/personagens/pinguim.png",  cor: "#5DA9E9", tom: 60 }
  },

  unidades: [
    {
      id: "vogais", titulo: "Vogais", personagem: "pato",
      frase: "Oi! Eu sou o Pato. Vamos cantar as vogais!",
      descricao: "Sons com a boca aberta, a voz sai livre.",
      sons: [
        { id: "a", ipa: "a", esp: "a:", letras: "a", dica: "Boca bem aberta, como no médico: aaa!", exemplo: "abelha" },
        { id: "i", ipa: "i", esp: "i:", letras: "i", dica: "Sorriso bem largo: iii!", exemplo: "igreja" },
        { id: "u", ipa: "u", esp: "u:", letras: "u", dica: "Biquinho de beijo: uuu!", exemplo: "uva" },
        { id: "e", ipa: "e", esp: "e:", letras: "ê", dica: "Sorriso pequeno: êêê (de dedo).", exemplo: "dedo" },
        { id: "o", ipa: "o", esp: "o:", letras: "ô", dica: "Boca redondinha: ôôô (de ovo).", exemplo: "ovo" },
        { id: "eh", ipa: "ɛ", esp: "E:", letras: "é", dica: "Boca mais aberta: ééé (de pé).", exemplo: "pe" },
        { id: "oh", ipa: "ɔ", esp: "O:", letras: "ó", dica: "Boca redonda e aberta: óóó (de bola).", exemplo: "bola" }
      ]
    },
    {
      id: "zumbido", titulo: "Sons que zumbem", personagem: "urso",
      frase: "Oi! Eu sou o Urso. Meus sons fazem a boca vibrar. Mmmm!",
      descricao: "Nasais e líquidas: a voz continua soando.",
      sons: [
        { id: "m", ipa: "m", esp: "m", letras: "m", dica: "Lábios fechados, a voz sai pelo nariz: mmm!", exemplo: "macaco", continuo: true },
        { id: "n", ipa: "n", esp: "n", letras: "n", dica: "Língua atrás dos dentes, voz pelo nariz: nnn!", exemplo: "navio", continuo: true },
        { id: "nh", ipa: "ɲ", esp: "n^", letras: "nh", dica: "Língua grudada no céu da boca: nhnh!", exemplo: "ninho", continuo: true },
        { id: "l", ipa: "l", esp: "l", letras: "l", dica: "Pontinha da língua nos dentes de cima: lll!", exemplo: "lua", continuo: true },
        { id: "lh", ipa: "ʎ", esp: "l^", letras: "lh", dica: "Língua larga no céu da boca: lhlh!", exemplo: "abelha", continuo: true },
        { id: "r", ipa: "ɾ", esp: "*", letras: "r", dica: "A língua bate rapidinho: r (de arara).", exemplo: "arara" }
      ]
    },
    {
      id: "sopro", titulo: "Sons de sopro", personagem: "cachorro",
      frase: "Au au! Eu sou o Cachorro. Meus sons são de soprar e farejar!",
      descricao: "Fricativas: o ar passa apertadinho.",
      sons: [
        { id: "f", ipa: "f", esp: "f", letras: "f", dica: "Dentes no lábio de baixo e sopra: fff!", exemplo: "foca", continuo: true },
        { id: "v", ipa: "v", esp: "v", letras: "v", dica: "Igual ao fff, mas com voz: vvv!", exemplo: "vaca", continuo: true },
        { id: "s", ipa: "s", esp: "s", letras: "s, ç", dica: "Como uma cobrinha: sss!", exemplo: "sapo", continuo: true },
        { id: "z", ipa: "z", esp: "z", letras: "z, s", dica: "Como uma abelha: zzz!", exemplo: "zebra", continuo: true },
        { id: "ch", ipa: "ʃ", esp: "S", letras: "ch, x", dica: "Pedindo silêncio: xiii!", exemplo: "chave", continuo: true },
        { id: "j", ipa: "ʒ", esp: "Z", letras: "j, g", dica: "Igual ao xiii, mas com voz: jjj!", exemplo: "jacare", continuo: true },
        { id: "rr", ipa: "ʁ", esp: "x", letras: "r, rr", dica: "Lá no fundo da garganta: rrr (de rato).", exemplo: "rato", continuo: true }
      ]
    },
    {
      id: "pulos", titulo: "Sons que pulam", personagem: "coelho",
      frase: "Oi! Eu sou o Coelho. Meus sons pulam: p! b! t!",
      descricao: "Oclusivas: a boca fecha e solta o ar de uma vez.",
      sons: [
        { id: "p", ipa: "p", esp: "p", letras: "p", dica: "Lábios fechados e solta o ar: p!", exemplo: "pato" },
        { id: "b", ipa: "b", esp: "b", letras: "b", dica: "Igual ao p, mas com voz: b!", exemplo: "bola" },
        { id: "t", ipa: "t", esp: "t", letras: "t", dica: "Língua atrás dos dentes e solta: t!", exemplo: "tomate" },
        { id: "d", ipa: "d", esp: "d", letras: "d", dica: "Igual ao t, mas com voz: d!", exemplo: "dado" },
        { id: "k", ipa: "k", esp: "k", letras: "c, qu", dica: "Lá no fundo da boca: k!", exemplo: "copo" },
        { id: "g", ipa: "g", esp: "g", letras: "g, gu", dica: "Igual ao k, mas com voz: g!", exemplo: "gato" },
        { id: "tch", ipa: "tʃ", esp: "tS", letras: "t (ti)", dica: "Um t que vira xiii: tchi (de tigre).", exemplo: "tigre" },
        { id: "dj", ipa: "dʒ", esp: "dZ", letras: "d (di)", dica: "Um d que vira jjj: dji (de dia).", exemplo: "dinossauro" }
      ]
    },
    {
      id: "nariz", titulo: "Vogais do nariz", personagem: "pinguim",
      frase: "Oi! Eu sou o Pinguim. Minhas vogais saem pelo nariz!",
      descricao: "Vogais nasais: o ar sai pela boca e pelo nariz.",
      sons: [
        { id: "an", ipa: "ã", esp: "&~:", letras: "ã, am, an", dica: "Aaa com o nariz: ãã (de maçã).", exemplo: "maca" },
        { id: "en", ipa: "ẽ", esp: "e~:", letras: "em, en", dica: "Êêê com o nariz: ẽẽ (de dente).", exemplo: "dente" },
        { id: "in", ipa: "ĩ", esp: "i~:", letras: "im, in", dica: "Iii com o nariz: ĩĩ (de pinguim).", exemplo: "pinguim" },
        { id: "on", ipa: "õ", esp: "o~:", letras: "om, on", dica: "Ôôô com o nariz: õõ (de ponte).", exemplo: "ponte" },
        { id: "un", ipa: "ũ", esp: "u~:", letras: "um, un", dica: "Uuu com o nariz: ũũ (de mundo).", exemplo: "mundo" }
      ]
    }
  ],

  /* Sílabas: consoante (id do som) + vogal. o = como se escreve, ipa = como se fala */
  silabas: [
    { c: "p",  itens: [["pa","pa"],["pe","pe"],["pi","pi"],["po","po"],["pu","pu"]] },
    { c: "b",  itens: [["ba","ba"],["be","be"],["bi","bi"],["bo","bo"],["bu","bu"]] },
    { c: "m",  itens: [["ma","ma"],["me","me"],["mi","mi"],["mo","mo"],["mu","mu"]] },
    { c: "t",  itens: [["ta","ta"],["te","te"],["ti","tʃi"],["to","to"],["tu","tu"]] },
    { c: "d",  itens: [["da","da"],["de","de"],["di","dʒi"],["do","do"],["du","du"]] },
    { c: "n",  itens: [["na","na"],["ne","ne"],["ni","ni"],["no","no"],["nu","nu"]] },
    { c: "l",  itens: [["la","la"],["le","le"],["li","li"],["lo","lo"],["lu","lu"]] },
    { c: "f",  itens: [["fa","fa"],["fe","fe"],["fi","fi"],["fo","fo"],["fu","fu"]] },
    { c: "v",  itens: [["va","va"],["ve","ve"],["vi","vi"],["vo","vo"],["vu","vu"]] },
    { c: "s",  itens: [["sa","sa"],["se","se"],["si","si"],["so","so"],["su","su"]] },
    { c: "z",  itens: [["za","za"],["ze","ze"],["zi","zi"],["zo","zo"],["zu","zu"]] },
    { c: "k",  itens: [["ca","ka"],["que","ke"],["qui","ki"],["co","ko"],["cu","ku"]] },
    { c: "g",  itens: [["ga","ga"],["gue","ge"],["gui","gi"],["go","go"],["gu","gu"]] },
    { c: "ch", itens: [["cha","ʃa"],["che","ʃe"],["chi","ʃi"],["cho","ʃo"],["chu","ʃu"]] },
    { c: "j",  itens: [["ja","ʒa"],["je","ʒe"],["ji","ʒi"],["jo","ʒo"],["ju","ʒu"]] },
    { c: "rr", itens: [["ra","ʁa"],["re","ʁe"],["ri","ʁi"],["ro","ʁo"],["ru","ʁu"]] },
    { c: "nh", itens: [["nha","ɲa"],["nhe","ɲe"],["nhi","ɲi"],["nho","ɲo"],["nhu","ɲu"]] },
    { c: "lh", itens: [["lha","ʎa"],["lhe","ʎe"],["lhi","ʎi"],["lho","ʎo"],["lhu","ʎu"]] }
  ],

  /*
   * Palavras. s = sílabas [escrita, ipa]; tonica = índice da sílaba forte.
   * nivel 1 = só sílabas simples (CV), nivel 2 = sons mais difíceis.
   * img = personagem (quando existe) ; emoji = figura
   */
  palavras: [
    { id: "pato",    s: [["pa","pa"],["to","tu"]],              tonica: 0, img: "pato",    nivel: 1 },
    { id: "bola",    s: [["bo","bɔ"],["la","la"]],              tonica: 0, emoji: "⚽",    nivel: 1 },
    { id: "uva",     s: [["u","u"],["va","va"]],                tonica: 0, emoji: "🍇",    nivel: 1 },
    { id: "ovo",     s: [["o","o"],["vo","vu"]],                tonica: 0, emoji: "🥚",    nivel: 1 },
    { id: "dado",    s: [["da","da"],["do","du"]],              tonica: 0, emoji: "🎲",    nivel: 1 },
    { id: "dedo",    s: [["de","de"],["do","du"]],              tonica: 0, emoji: "☝️",    nivel: 1 },
    { id: "pe",      s: [["pé","pɛ"]],                          tonica: 0, emoji: "🦶",    nivel: 1 },
    { id: "lua",     s: [["lu","lu"],["a","a"]],                tonica: 0, emoji: "🌙",    nivel: 1 },
    { id: "vaca",    s: [["va","va"],["ca","ka"]],              tonica: 0, emoji: "🐄",    nivel: 1 },
    { id: "foca",    s: [["fo","fɔ"],["ca","ka"]],              tonica: 0, emoji: "🦭",    nivel: 1 },
    { id: "sapo",    s: [["sa","sa"],["po","pu"]],              tonica: 0, emoji: "🐸",    nivel: 1 },
    { id: "gato",    s: [["ga","ga"],["to","tu"]],              tonica: 0, emoji: "🐱",    nivel: 1 },
    { id: "copo",    s: [["co","kɔ"],["po","pu"]],              tonica: 0, emoji: "🥛",    nivel: 1 },
    { id: "rato",    s: [["ra","ʁa"],["to","tu"]],              tonica: 0, emoji: "🐭",    nivel: 1 },
    { id: "casa",    s: [["ca","ka"],["sa","za"]],              tonica: 0, emoji: "🏠",    nivel: 1 },
    { id: "bolo",    s: [["bo","bo"],["lo","lu"]],              tonica: 0, emoji: "🎂",    nivel: 1 },
    { id: "galo",    s: [["ga","ga"],["lo","lu"]],              tonica: 0, emoji: "🐓",    nivel: 1 },
    { id: "lobo",    s: [["lo","lo"],["bo","bu"]],              tonica: 0, emoji: "🐺",    nivel: 1 },
    { id: "mala",    s: [["ma","ma"],["la","la"]],              tonica: 0, emoji: "🧳",    nivel: 1 },
    { id: "bota",    s: [["bo","bɔ"],["ta","ta"]],              tonica: 0, emoji: "👢",    nivel: 1 },
    { id: "pipa",    s: [["pi","pi"],["pa","pa"]],              tonica: 0, emoji: "🪁",    nivel: 1 },
    { id: "vela",    s: [["ve","vɛ"],["la","la"]],              tonica: 0, emoji: "🕯️",    nivel: 1 },
    { id: "fogo",    s: [["fo","fo"],["go","gu"]],              tonica: 0, emoji: "🔥",    nivel: 1 },
    { id: "gelo",    s: [["ge","ʒe"],["lo","lu"]],              tonica: 0, emoji: "🧊",    nivel: 1 },
    { id: "moto",    s: [["mo","mɔ"],["to","tu"]],              tonica: 0, emoji: "🏍️",    nivel: 1 },
    { id: "cafe",    s: [["ca","ka"],["fé","fɛ"]],              tonica: 1, emoji: "☕",    nivel: 1 },
    { id: "sofa",    s: [["so","so"],["fá","fa"]],              tonica: 1, emoji: "🛋️",    nivel: 1 },
    { id: "bebe",    s: [["be","be"],["bê","be"]],              tonica: 1, emoji: "👶",    nivel: 1 },
    { id: "vovo",    s: [["vo","vo"],["vó","vɔ"]],              tonica: 1, emoji: "👵",    nivel: 1 },
    { id: "macaco",  s: [["ma","ma"],["ca","ka"],["co","ku"]],  tonica: 1, emoji: "🐒",    nivel: 1 },
    { id: "sapato",  s: [["sa","sa"],["pa","pa"],["to","tu"]],  tonica: 1, emoji: "👞",    nivel: 1 },
    { id: "navio",   s: [["na","na"],["vi","vi"],["o","u"]],    tonica: 1, emoji: "🚢",    nivel: 1 },
    { id: "arara",   s: [["a","a"],["ra","ɾa"],["ra","ɾa"]],    tonica: 1, emoji: "🦜",    nivel: 2 },
    { id: "chave",   s: [["cha","ʃa"],["ve","vi"]],             tonica: 0, emoji: "🔑",    nivel: 2 },
    { id: "janela",  s: [["ja","ʒa"],["ne","nɛ"],["la","la"]],  tonica: 1, emoji: "🪟",    nivel: 2 },
    { id: "jacare",  s: [["ja","ʒa"],["ca","ka"],["ré","ɾɛ"]],  tonica: 2, emoji: "🐊",    nivel: 2 },
    { id: "ninho",   s: [["ni","nĩ"],["nho","ɲu"]],             tonica: 0, emoji: "🪺",    nivel: 2 },
    { id: "abelha",  s: [["a","a"],["be","be"],["lha","ʎa"]],   tonica: 1, emoji: "🐝",    nivel: 2 },
    { id: "coelho",  s: [["co","ko"],["e","e"],["lho","ʎu"]],   tonica: 1, img: "coelho",  nivel: 2 },
    { id: "tomate",  s: [["to","to"],["ma","ma"],["te","tʃi"]], tonica: 1, emoji: "🍅",    nivel: 2 },
    { id: "zebra",   s: [["ze","ze"],["bra","bɾa"]],            tonica: 0, emoji: "🦓",    nivel: 2 },
    { id: "tigre",   s: [["ti","tʃi"],["gre","gɾi"]],           tonica: 0, emoji: "🐯",    nivel: 2 },
    { id: "dinossauro", s: [["di","dʒi"],["nos","no"],["sau","saw"],["ro","ɾu"]], tonica: 2, emoji: "🦕", nivel: 2 },
    { id: "igreja",  s: [["i","i"],["gre","gɾe"],["ja","ʒa"]],  tonica: 1, emoji: "⛪",    nivel: 2 },
    { id: "cachorro",s: [["ca","ka"],["chor","ʃo"],["ro","ʁu"]],tonica: 1, img: "cachorro",nivel: 2 },
    { id: "urso",    s: [["ur","uʁ"],["so","su"]],              tonica: 0, img: "urso",    nivel: 2 },
    { id: "maca",    s: [["ma","ma"],["çã","sã"]],              tonica: 1, emoji: "🍎",    nivel: 2, escrita: "maçã" },
    { id: "dente",   s: [["den","dẽ"],["te","tʃi"]],            tonica: 0, emoji: "🦷",    nivel: 2 },
    { id: "pinguim", s: [["pin","pĩ"],["guim","gwĩ"]],          tonica: 1, img: "pinguim", nivel: 2 },
    { id: "ponte",   s: [["pon","põ"],["te","tʃi"]],            tonica: 0, emoji: "🌉",    nivel: 2 },
    { id: "mundo",   s: [["mun","mũ"],["do","du"]],             tonica: 0, emoji: "🌍",    nivel: 2 },
    { id: "banana",  s: [["ba","ba"],["na","nã"],["na","na"]],  tonica: 1, emoji: "🍌",    nivel: 2 }
  ],

  /* Frases dos personagens (geradas em áudio) */
  frases: {
    muito_bem: "Muito bem!",
    parabens: "Parabéns! Você conseguiu!",
    de_novo: "Vamos tentar de novo?",
    onde_esta: "Onde está o som?",
    escute: "Escute!",
    repita: "Agora fale você!",
    juntos: "Vamos juntar os sons!",
    leia: "Que palavra é essa?",
    descansar: "Hora de descansar. Até amanhã!",
    ola: "Oi! Vamos aprender?"
  }
};
