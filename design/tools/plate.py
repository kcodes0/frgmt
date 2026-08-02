#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=10"]
# ///
"""
Prepare the plate asset: the tall photograph that hangs down the right side.

The shader does the dithering and the theming, so the shipped asset is just a
clean grayscale field with the full tonal range. One file serves both themes:
light draws dark ink where the image is dark, dark draws light ink in the same
places, which is the photographic negative the dark room wants.

    uv run design/tools/plate.py design/assets/raw/cliff-flux-01.png public/media/plate.webp
"""

import sys
from pathlib import Path

from PIL import Image, ImageOps


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])

    im = Image.open(src).convert("L")
    # stretch to the full range, clipping half a percent of stray pixels so one
    # hot speck cannot flatten the histogram
    im = ImageOps.autocontrast(im, cutoff=(0.5, 0.5))
    # the dither cell is ~2 css px, so texture beyond ~960 wide is dead weight,
    # and the 1-bit dither also eats any compression artifact below it
    im.thumbnail((960, 1707), Image.LANCZOS)

    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=64)
    print(f"{dst}  {im.size[0]}x{im.size[1]}  {dst.stat().st_size / 1024:.0f}kb")


if __name__ == "__main__":
    main()
