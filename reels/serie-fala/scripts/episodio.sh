#!/usr/bin/env bash
# Um episódio da série Fala, do roteiro ao vídeo revisado, num comando só:
#   scripts/episodio.sh fala-02          (gera a narração na API, se ainda não existir)
#   scripts/episodio.sh fala-02 --voz    (refaz a narração mesmo se já existir)
# Lê episodios/fala-02.json e gera, em output/fala-02/: o MP4, a capa (png + jpg), o storyboard e a revisão.
# A chave do ElevenLabs NUNCA fica no repositório: nesta nuvem a rede a põe no cabeçalho xi-api-key
# (Segredos de rede); fora dela, exporte ELEVENLABS_API_KEY no ambiente do terminal.
set -euo pipefail
cd "$(dirname "$0")/.."
EP="${1:?uso: scripts/episodio.sh <id do episódio, ex. fala-02> [--voz]}"
test -f "episodios/$EP.json" || { echo "episodios/$EP.json não existe"; exit 1; }
if [ "${2:-}" = "--voz" ] || [ ! -f "audio/$EP/voz/falas.json" ]; then python3 scripts/voz.py "$EP"; fi
python3 scripts/linha.py "$EP"                      # cenas e palavras no tempo do vídeo + a narração montada
node scripts/render.cjs cues  --ep "$EP"            # os eventos da animação -> audio/$EP/cues.json
node scripts/render.cjs boxes --ep "$EP"            # as palavras e as páginas da legenda -> output/$EP/revisao/
python3 scripts/audio.py "$EP"                      # voz + trilha com ducking + efeitos -> audio/$EP/mix.wav (−14 LUFS)
node scripts/render.cjs video --ep "$EP"            # -> output/$EP/fazlo-hospeda-<id>.mp4
node scripts/capa.cjs --ep "$EP"                    # -> output/$EP/capa.png
VIZ=$(ls -d ../serie-rotina/output/ep-0* 2>/dev/null | sort | tail -2 || true)
python3 ../tools/revisao_capa.py . --saida "output/$EP" ${VIZ:+--vizinhos $VIZ}
python3 scripts/qa.py "$EP"
python3 scripts/storyboard.py "$EP"
