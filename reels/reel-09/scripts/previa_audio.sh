#!/usr/bin/env bash
# Prévia só de áudio do Reel 09 (sem trilha): a fala da Clara (0,2–7,0 s do clipe) e as 4 narrações nos tempos da
# timeline, todas igualadas em -16 LUFS.   bash scripts/previa_audio.sh  ->  revisao/previa-audio.mp3
set -euo pipefail
cd "$(dirname "$0")/.."
N='loudnorm=I=-16:TP=-1.5:LRA=7,aresample=44100'
ffmpeg -v error -y -ss 0.2 -to 7.0 -i src/clips/clara-fala.mp4 -i audio/voz/bloco-2.wav -i audio/voz/bloco-3.wav \
  -i audio/voz/bloco-5.wav -i audio/voz/bloco-7.wav -filter_complex "\
[0:a]$N[a0];[1]$N,adelay=7000:all=1[a1];[2]$N,adelay=13600:all=1[a2];[3]$N,adelay=25800:all=1[a3];[4]$N,adelay=42200:all=1[a4];\
[a0][a1][a2][a3][a4]amix=inputs=5:normalize=0,apad=whole_dur=50.6,atrim=0:50.6" -ac 1 -ar 44100 -b:a 192k revisao/previa-audio.mp3
echo "ok -> revisao/previa-audio.mp3"
