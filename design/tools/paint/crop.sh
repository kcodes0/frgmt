#!/usr/bin/env bash
# Slice out/sheet.png into the site's painted assets. Rects mirror sheet.js.
set -euo pipefail
cd "$(dirname "$0")"
DEST=../../../public/media/paint
mkdir -p "$DEST"

# p5 renders at pixelDensity 2, so rects are doubled: assets come out retina
crop() { magick out/sheet.png -crop "$((2 * $2))x$((2 * $3))+$((2 * $4))+$((2 * $5))" +repage -quality 90 "$DEST/$1.webp"; }

crop hero-l    1400 340    0    0
crop divider-l 1200  60    0  360
crop mark-l     380 110  820  440
crop mark-d     380 110  820 1160
crop hero-d    1400 340    0  720
crop divider-d 1200  60    0 1080
for i in 0 1 2 3 4 5; do
  crop "bloom-essay-$i-l" 120 120 $((i * 130))  440
  crop "bloom-note-$i-l"  120 120 $((i * 130))  580
  crop "bloom-essay-$i-d" 120 120 $((i * 130)) 1160
  crop "bloom-note-$i-d"  120 120 $((i * 130)) 1300
done
ls -la "$DEST"
