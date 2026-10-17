#!/usr/bin/env bash
# Regenerate the site icon set from public/icon-mono-dark.png.
#
# The source is 512x512 white line art on a transparent background, already
# centred (art bbox 289x440+111+36). Favicon variants sit on a rounded tile in
# the site's background colour so they stay legible in light browser themes;
# apple-touch-icon is fully opaque because iOS masks it itself and flattens
# transparency to black.
#
# Requires ImageMagick (`brew install imagemagick`).
set -euo pipefail

cd "$(dirname "$0")/.."

SRC=public/icon-mono-dark.png
HEAD=public/.icon-head.png   # temp: head-only crop, see below
BG="#10141a"   # tailwind: background
RADIUS=22      # percent of size

[ -f "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }

# The full portrait (head + neck + cabling, art bbox 289x440+111+36) turns to
# mush below ~32px. The 32/48 favicons use a head-only crop instead, which
# resolves as a face at those sizes; everything larger keeps the full art.
magick "$SRC" -crop 289x310+111+36 +repage "$HEAD"
trap 'rm -f "$HEAD"' EXIT

# The art is greyscale line work, so a 256-colour palette is visually lossless
# (RMSE ~0.008) and shrinks the 512px tile from ~430KB to ~30KB.
quantize() { magick "$1" -strip -colors 256 "PNG8:$1"; }

# tile <size> <art-percent> <out> [source]
tile() {
  local size=$1 pct=$2 out=$3 src=${4:-$SRC}
  local art=$(( size * pct / 100 ))
  local rad=$(( size * RADIUS / 100 ))
  magick -size "${size}x${size}" xc:none \
    -fill "$BG" -draw "roundrectangle 0,0,$(( size - 1 )),$(( size - 1 )),${rad},${rad}" \
    \( "$src" -resize "${art}x${art}" \) -gravity center -composite \
    "$out"
  quantize "$out"
}

tile 16  92 public/favicon-16x16.png
tile 32  96 public/favicon-32x32.png "$HEAD"
tile 48  96 public/favicon-48x48.png "$HEAD"
tile 192 88 public/icon-192.png
tile 512 86 public/icon-512.png

# Multi-resolution .ico
magick public/favicon-16x16.png public/favicon-32x32.png public/favicon-48x48.png public/favicon.ico

# Opaque, unrounded - iOS applies its own corner mask.
magick -size 180x180 "xc:${BG}" \( "$SRC" -resize 154x154 \) -gravity center -composite public/apple-touch-icon.png
quantize public/apple-touch-icon.png

# Maskable: full-bleed background, no rounding (Android masks it) and the art
# pulled into the 80% safe zone so no mask shape can clip it.
magick -size 512x512 "xc:${BG}" \( "$SRC" -resize 336x336 \) -gravity center -composite public/icon-maskable-512.png
quantize public/icon-maskable-512.png

# 1200x630 social card, screenshotted from scripts/og-card.html so it uses the
# site's real webfonts. Kept as 24-bit PNG: the brand glows band visibly at 256
# colours, and lossless keeps the line art edges crisp.
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [ -x "$CHROME" ]; then
  "$CHROME" --headless --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --force-device-scale-factor=1 --window-size=1200,630 \
    --screenshot="$(pwd)/public/og-image.png" "file://$(pwd)/scripts/og-card.html" 2>/dev/null
  magick public/og-image.png -strip public/og-image.png
else
  echo "chrome not found at $CHROME - skipped og-image.png" >&2
fi

echo "icons written to public/"
