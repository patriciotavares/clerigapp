Use o conector da Higgsfield para gerar 18 vídeos curtos de personagens de um app infantil. Use as gerações ILIMITADAS do teste grátis (use_unlim: true); se algum pedido for cobrar créditos, pare e me avise antes.

PASSO 1 — Importe estas 6 imagens com media_import_url (type: image) e guarde o media_id de cada uma:
- pato: https://raw.githubusercontent.com/patriciotavares/clerigapp/claude/ipa-toddler-literacy-app-yhccza/ipa-kids/art/verde/pato.jpg
- urso: https://raw.githubusercontent.com/patriciotavares/clerigapp/claude/ipa-toddler-literacy-app-yhccza/ipa-kids/art/verde/urso.jpg
- cachorro: https://raw.githubusercontent.com/patriciotavares/clerigapp/claude/ipa-toddler-literacy-app-yhccza/ipa-kids/art/verde/cachorro.jpg
- coelho: https://raw.githubusercontent.com/patriciotavares/clerigapp/claude/ipa-toddler-literacy-app-yhccza/ipa-kids/art/verde/coelho.jpg
- pinguim: https://raw.githubusercontent.com/patriciotavares/clerigapp/claude/ipa-toddler-literacy-app-yhccza/ipa-kids/art/verde/pinguim.jpg
- caracol: https://raw.githubusercontent.com/patriciotavares/clerigapp/claude/ipa-toddler-literacy-app-yhccza/ipa-kids/art/verde/caracol.jpg

PASSO 2 — Para cada personagem, gere 3 vídeos (parado, falando, comemorando) = 18 vídeos, com EXATAMENTE estes parâmetros:
- model: seedance_2_5
- mode: omni_reference
- resolution: 720p
- aspect_ratio: 3:4
- duration: 5
- generate_audio: false
- use_unlim: true
- medias: start_image = media_id do personagem, e end_image = o MESMO media_id (para o vídeo fazer loop)
- prompt: o texto abaixo, trocando [PERSONAGEM] pela descrição do personagem

Descrições:
- pato: "the cute 3D cartoon yellow duckling"
- urso: "the cute 3D cartoon fluffy brown teddy bear"
- cachorro: "the cute 3D cartoon orange puppy with a red collar"
- coelho: "the cute 3D cartoon white bunny holding a carrot"
- pinguim: "the cute 3D cartoon penguin"
- caracol: "the cute 3D cartoon mint-green snail with an orange spiral shell and a blue scarf"

Prompt PARADO:
"[PERSONAGEM] stays in place and comes alive with gentle, natural idle animation: soft breathing, blinks, looks around curiously with small head tilts, tiny weight shifts, then settles back exactly into the starting pose. Static locked camera, no camera movement, no zoom. The background stays a flat solid pure green chroma-key color the whole time, no shadows, no other objects, the character always fully in frame."

Prompt FALANDO:
"[PERSONAGEM] stays in place and talks happily to the viewer like a friendly preschool teacher: mouth moving as if speaking, expressive eyebrows, head nods, gestures with its arms/wings/paws, then settles back exactly into the starting pose. Static locked camera, no camera movement, no zoom. The background stays a flat solid pure green chroma-key color the whole time, no shadows, no other objects, the character always fully in frame."

Prompt COMEMORANDO:
"[PERSONAGEM] celebrates joyfully in place: jumps up with a big happy smile, waves its arms/wings/paws, a little spin, lands softly and settles back exactly into the starting pose. Static locked camera, no camera movement, no zoom. The background stays a flat solid pure green chroma-key color the whole time, no shadows, no other objects, the character always fully in frame."

Pode gerar em lotes (até 8 ao mesmo tempo). Se algum vídeo falhar, tente de novo uma vez.

PASSO 3 — No final, me mostre uma tabela com: personagem, tipo (parado/falando/comemorando) e o job_id de cada vídeo concluído.
