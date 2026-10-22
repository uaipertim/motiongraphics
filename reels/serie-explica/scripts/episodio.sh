#!/usr/bin/env bash
# Um episódio da SÉRIE EXPLICA, do roteiro ao vídeo revisado, num comando só:
#   scripts/episodio.sh explica-02              (gera na API a narração dos capítulos que ainda não têm)
#   scripts/episodio.sh explica-02 --refaz 3,5  (gera de novo, INTEIROS, os capítulos 3 e 5)
# Lê episodios/explica-02.json e gera, em output/explica-02/: o MP4, a capa (png + jpg), o storyboard e a revisão.
# A chave do ElevenLabs NUNCA fica no repositório: nesta nuvem a rede a põe no cabeçalho xi-api-key
# (Segredos de rede); fora dela, exporte ELEVENLABS_API_KEY no ambiente do terminal.
set -euo pipefail
cd "$(dirname "$0")/.."
EP="${1:?uso: scripts/episodio.sh <id do episódio, ex. explica-02> [--refaz 3,5]}"
test -f "episodios/$EP.json" || { echo "episodios/$EP.json não existe"; exit 1; }
python3 scripts/voz.py "$EP" ${2:+"$2"} ${3:+"$3"}  # uma geração inteira por capítulo (só os que faltam ou mudaram)
python3 scripts/linha.py "$EP"                      # capítulos, frases, apoios e palavras no tempo do vídeo + a narração montada
node scripts/render.cjs cues --ep "$EP"             # os eventos da animação -> audio/$EP/cues.json
python3 scripts/audio.py "$EP"                      # voz + trilha contínua com ducking + efeitos -> audio/$EP/mix.wav (−14 LUFS)
node scripts/render.cjs video --ep "$EP"            # -> output/$EP/fazlo-hospeda-<id>.mp4
node scripts/render.cjs capa --ep "$EP"             # -> output/$EP/capa.png (o quadro 0) + revisao/capa-caixas.json
python3 ../tools/revisao_capa.py . --saida "output/$EP"
node scripts/render.cjs info --ep "$EP"             # -> revisao/motor.json + caixas.json (dados para a revisão)
python3 scripts/qa.py "$EP"
python3 scripts/storyboard.py "$EP"
