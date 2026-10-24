#!/usr/bin/env bash
# Reel 09 "Dois hóspedes, um chalé", do roteiro ao vídeo, num comando só:   bash scripts/reel.sh [--refaz 2,5]
# A chave do ElevenLabs NUNCA fica no repositório: nesta nuvem a rede a põe no cabeçalho xi-api-key
# (Segredos de rede); fora dela, exporte ELEVENLABS_API_KEY no ambiente do terminal.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/voz.py ${1:+"$1"} ${2:+"$2"}   # narração (só os blocos que faltam ou mudaram)
python3 scripts/linha.py                        # palavras da Clara e da narração no tempo do vídeo -> audio/linha.json
bash scripts/quadros.sh                         # quadros dos clipes da Clara -> src/quadros/ (fora do git)
node scripts/render.cjs cues                    # eventos de som da animação -> audio/cues.json
python3 scripts/audio.py                        # vozes igualadas + trilha + efeitos -> audio/mix.wav (−14 LUFS)
bash scripts/previa_audio.sh                    # prévia só de áudio (sem trilha) -> revisao/previa-audio.mp3
node scripts/render.cjs video                   # -> output/fazlo-hospeda-reel-09.mp4
