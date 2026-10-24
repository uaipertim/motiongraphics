#!/usr/bin/env bash
# Extrai os quadros (24 fps, JPG) de cada clipe da Clara para src/quadros/<clipe>/NNNN.jpg (não vão para o git: saem dos MP4).
#   bash scripts/quadros.sh
set -euo pipefail
cd "$(dirname "$0")/.."
for f in src/clips/*.mp4; do
  n=$(basename "$f" .mp4); mkdir -p "src/quadros/$n"
  [ -f "src/quadros/$n/0001.jpg" ] || ffmpeg -v error -i "$f" -q:v 2 "src/quadros/$n/%04d.jpg"
  echo "  $n: $(ls src/quadros/$n | wc -l) quadros"
done
