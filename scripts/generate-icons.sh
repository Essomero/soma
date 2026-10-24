#!/usr/bin/env bash
# Regenerate the Soma icon set from brand/soma-set/ (extracted neon S tiles).
#
# s-128.png is the master: full detail for icon-soma, 192/512, apple-touch,
# maskable, and og-image. s-16/s-32/s-64.png are the simplified small-size
# renderings, resized directly so the 16px favicon stays the readable blob
# instead of a downscaled blur. Everything sits on the site background colour
# so favicons stay legible in light browser themes.
#
# Requires ImageMagick (`brew install imagemagick`).
set -euo pipefail

cd "$(dirname "$0")/.."

MASTER=brand/soma-set/s-128.png
BG="#10141a"   # tailwind: background
RADIUS=22      # percent of size

[ -f "$MASTER" ] || { echo "missing $MASTER" >&2; exit 1; }

# Dithered 256-colour palette: the neon glows band visibly without dither,
# and stay smooth with it (spot-checked at 192 and 512).
quantize() { magick "$1" -strip -colors 256 -dither FloydSteinberg "PNG8:$1"; }

# round <src> <size> <out>: exact resize, rounded corners, transparent outside.
round() {
  local src=$1 size=$2 out=$3
  local rad=$(( size * RADIUS / 100 ))
  magick "$src" -resize "${size}x${size}!" -alpha set \
    \( +clone -alpha transparent -fill white \
      -draw "roundrectangle 0,0,$(( size - 1 )),$(( size - 1 )),${rad},${rad}" \) \
    -alpha off -compose copyopacity -composite "$out"
}

round "$MASTER" 331 public/icon-soma.png
round brand/soma-set/s-16.png 16 public/favicon-16x16.png
round brand/soma-set/s-32.png 32 public/favicon-32x32.png
round brand/soma-set/s-64.png 48 public/favicon-48x48.png
round "$MASTER" 192 public/icon-192.png
round "$MASTER" 512 public/icon-512.png
quantize public/icon-512.png

# Multi-resolution .ico
magick public/favicon-16x16.png public/favicon-32x32.png public/favicon-48x48.png public/favicon.ico

# Opaque, unrounded - iOS applies its own corner mask.
magick -size 180x180 "xc:${BG}" \( "$MASTER" -resize 154x154! \) -gravity center -composite public/apple-touch-icon.png
quantize public/apple-touch-icon.png

# Maskable: full-bleed background, no rounding (Android masks it) and the art
# pulled into the 80% safe zone so no mask shape can clip it.
magick -size 512x512 "xc:${BG}" \( "$MASTER" -resize 336x336! \) -gravity center -composite public/icon-maskable-512.png
quantize public/icon-maskable-512.png

# 1200x630 social card, screenshotted from scripts/og-card.html so it uses the
# site's real webfonts. Kept 24-bit: the brand glow bands visibly at 256 colours.
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
