#!/usr/bin/env bash
# Um episódio da série Rotina, do roteiro ao vídeo revisado, num comando só:
#   scripts/episodio.sh ep-03
# Lê episodios/ep-03.json e gera, em output/ep-03/: o MP4, a capa (png + jpg) e a revisão
# (relatório técnico, sincronia, zonas seguras, recorte 3:4, capa no feed).
set -euo pipefail
cd "$(dirname "$0")/.."
EP="${1:?uso: scripts/episodio.sh <id do episódio, ex. ep-03>}"
test -f "episodios/$EP.json" || { echo "episodios/$EP.json não existe"; exit 1; }
node scripts/render.cjs cues  --ep "$EP"        # linha do tempo -> audio/$EP/cues.json
python3 scripts/audio.py "$EP"                   # efeitos nos cues -> audio/$EP/efeitos.wav (−16 LUFS)
node scripts/render.cjs boxes --ep "$EP"        # caixas de cada elemento -> output/$EP/revisao/caixas.json
node scripts/render.cjs video --ep "$EP"        # -> output/$EP/fazlo-hospeda-rotina-$EP.mp4
node scripts/capa.cjs --ep "$EP"                # -> output/$EP/capa.png
VIZ=$(ls -d output/ep-* | grep -v "output/$EP\$" | sort | tail -2 || true)
python3 ../tools/revisao_capa.py . --saida "output/$EP" ${VIZ:+--vizinhos $VIZ}
python3 scripts/qa.py "$EP"
