#!/usr/bin/env bash
# encode-films.sh — genera los DOS films scrub-ready (desktop + móvil) y sus
# posters de frame 0, desde un único clip fuente.
#
# Uso:  scripts/encode-films.sh <clip-fuente.mp4>
# Sale: public/bg.mp4 · public/bg-mobile.mp4 · public/img/poster-desktop.webp
#       · public/img/poster-mobile.webp
#
# ─── PARÁMETROS DE ENCUADRE (tunear acá, un solo lugar) ─────────────────────
# El "alejamiento" funciona así: el film se escala a FILM_SCALE × lienzo y se
# centra sobre una extensión blureada de sí mismo (patrón reels). Más chico el
# FILM_SCALE → burger más lejos, más blur-pad visible alrededor.
#
CANVAS_DESKTOP="960x540"   # lienzo 16:9 del film desktop
FILM_SCALE_DESKTOP="0.88"  # 1.0 = sin aire (film a lienzo completo); 0.88 = ~12% de aire
CRF_DESKTOP="23"           # calidad desktop (18 = más nítido/pesado, 26 = más liviano)
#
CANVAS_MOBILE="640x640"    # lienzo CUADRADO: en portrait-cover muestra ~46% del
                           # ancho del film en vez de 26% → burger completo
FILM_SCALE_MOBILE="1.0"    # el alejamiento móvil ya lo da el lienzo cuadrado;
                           # bajalo (p.ej. 0.9) para alejar TODAVÍA más
CRF_MOBILE="25"            # móvil prioriza peso (2-2.5MB objetivo)
#
BLUR="24"                  # intensidad del blur-pad (boxblur luma_radius)
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

INPUT="${1:?uso: encode-films.sh <clip-fuente.mp4>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

encode() { # $1=canvas WxH  $2=film_scale  $3=crf  $4=salida
  local W="${1%x*}" H="${1#*x}" SCALE="$2" CRF="$3" OUT="$4"
  local FW
  FW=$(awk "BEGIN{printf \"%d\", int($W*$SCALE/2)*2}") # ancho del film, par
  ffmpeg -v error -y -i "$INPUT" -an -filter_complex \
    "[0:v]split=2[bg][fg];\
     [bg]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=luma_radius=${BLUR}:luma_power=2:chroma_radius=$((BLUR/2)):chroma_power=2[bgb];\
     [fg]scale=${FW}:-2[fgs];\
     [bgb][fgs]overlay=(W-w)/2:(H-h)/2" \
    -c:v libx264 -preset slow -crf "$CRF" -g 1 -keyint_min 1 -sc_threshold 0 \
    -pix_fmt yuv420p -movflags +faststart "$OUT"
}

echo "→ desktop  (${CANVAS_DESKTOP}, film ${FILM_SCALE_DESKTOP}, crf ${CRF_DESKTOP})"
encode "$CANVAS_DESKTOP" "$FILM_SCALE_DESKTOP" "$CRF_DESKTOP" "$ROOT/public/bg.mp4"
echo "→ mobile   (${CANVAS_MOBILE}, film ${FILM_SCALE_MOBILE}, crf ${CRF_MOBILE})"
encode "$CANVAS_MOBILE" "$FILM_SCALE_MOBILE" "$CRF_MOBILE" "$ROOT/public/bg-mobile.mp4"

# Posters = frame 0 de CADA asset → la transición poster→film es invisible
# (mismo encuadre exacto). Los usa motion.js al elegir el src por modo.
ffmpeg -v error -y -i "$ROOT/public/bg.mp4"        -frames:v 1 -c:v libwebp -quality 82 "$ROOT/public/img/poster-desktop.webp"
ffmpeg -v error -y -i "$ROOT/public/bg-mobile.mp4" -frames:v 1 -c:v libwebp -quality 82 "$ROOT/public/img/poster-mobile.webp"

echo "--- verificación all-keyframe (ambos deben ser 100% I-frames) ---"
for f in "$ROOT/public/bg.mp4" "$ROOT/public/bg-mobile.mp4"; do
  printf "%s: " "$(basename "$f")"
  ffprobe -v error -select_streams v:0 -show_entries frame=pict_type -of csv=p=0 "$f" | sort | uniq -c | tr '\n' ' '
  du -h "$f" | cut -f1
done
