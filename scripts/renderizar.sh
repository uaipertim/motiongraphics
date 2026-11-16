#!/usr/bin/env bash
# Renderiza o vídeo inteiro (4 processos), junta os trechos sem perdas e gera as entregas.
#   bash scripts/renderizar.sh [pasta_de_trabalho]
set -euo pipefail
cd "$(dirname "$0")/.."
TRAB="${1:-.trabalho}"
FPS=60
N=4
mkdir -p "$TRAB" output

python3 scripts/gerar_dados.py >/dev/null
DUR=$(python3 -c "import json;print(json.load(open('audio/narracao/palavras.json'))['duracao'])")
TOTAL=$(python3 -c "print(round($DUR*$FPS))")
echo "duração $DUR s → $TOTAL quadros a $FPS fps"

# 1) quadros → trechos sem perdas (RGB), em paralelo
: > "$TRAB/lista.txt"
pids=()
for i in $(seq 0 $((N-1))); do
  INI=$(( TOTAL * i / N )); FIM=$(( TOTAL * (i+1) / N ))
  node scripts/render.mjs --ini $INI --fim $FIM --fps $FPS --saida "$TRAB/trecho_$i.mkv" &
  pids+=($!)
  echo "file 'trecho_$i.mkv'" >> "$TRAB/lista.txt"
done
for p in "${pids[@]}"; do wait "$p"; done

# 2) mestre: 1080×1920, 60 fps, H.264 (BT.709), AAC 192 kbps
COR="scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p"
TAGS="-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv"
ffmpeg -v error -stats -y -f concat -safe 0 -i "$TRAB/lista.txt" -i audio/mix.wav \
  -map 0:v -map 1:a -vf "$COR" -r $FPS -c:v libx264 -preset slow -crf 15 -profile:v high -level 4.2 \
  -g 120 -bf 2 $TAGS -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest output/apresentacao.mp4

# 3) WhatsApp: 720×1280, 30 fps, duas passadas, ≤ ~16 MB
VB=630k
COR2="fps=30,scale=720:1280:in_range=full:out_range=tv:out_color_matrix=bt709:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p"
ffmpeg -v error -y -f concat -safe 0 -i "$TRAB/lista.txt" -vf "$COR2" -c:v libx264 -preset veryslow -b:v $VB \
  -profile:v high -level 3.1 -g 60 -bf 3 $TAGS -pass 1 -passlogfile "$TRAB/p2" -an -f mp4 /dev/null
ffmpeg -v error -stats -y -f concat -safe 0 -i "$TRAB/lista.txt" -i audio/mix.wav -map 0:v -map 1:a -vf "$COR2" \
  -c:v libx264 -preset veryslow -b:v $VB -maxrate 1400k -bufsize 2800k -profile:v high -level 3.1 -g 60 -bf 3 $TAGS \
  -pass 2 -passlogfile "$TRAB/p2" -c:a aac -b:a 96k -ar 44100 -movflags +faststart -shortest output/apresentacao-whatsapp.mp4

# 4) miniatura (quadro 0 do mestre)
ffmpeg -v error -y -i output/apresentacao.mp4 -frames:v 1 -q:v 2 output/miniatura.jpg
ls -la output/
