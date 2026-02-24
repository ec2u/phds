#!/usr/bin/env python3
"""Embed and quantise PNG references in SVG screenshots.

Converts external PNG references in OmniGraffle-exported SVGs to self-contained
base64 data URIs with 256-colour quantisation. Fixes vertical compression caused
by OmniGraffle matrix transforms.

Usage:
    python3 embed.py                    # process all SVGs in script directory
    python3 embed.py file.svg           # process specific file(s)
    python3 embed.py *.svg              # process glob pattern
"""

import base64
import io
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip3 install Pillow", file=sys.stderr)
    sys.exit(1)

COLOURS = 256
QUANTISE_METHOD = 2  # PIL.Image.Quantize.MEDIANCUT

# cache quantised base64 by resolved path to avoid re-processing shared PNGs
_b64_cache: dict[str, str] = {}


def quantise_png_to_base64(png_path: Path) -> str:
    """Read a PNG, quantise to 256 colours, and return base64-encoded string."""
    key = str(png_path.resolve())

    if key in _b64_cache:
        print(f"    {png_path.name}: cached")
        return _b64_cache[key]

    img = Image.open(png_path)
    quantised = img.quantize(colors=COLOURS, method=QUANTISE_METHOD)

    buf = io.BytesIO()
    quantised.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()

    original_kb = png_path.stat().st_size // 1024
    quantised_kb = len(buf.getvalue()) // 1024
    print(f"    {png_path.name}: {original_kb} KB -> {quantised_kb} KB")

    _b64_cache[key] = b64
    return b64


def fix_matrix_transforms(content: str) -> str:
    """Replace matrix(1 0 0 scaleY tx ty) with translate(tx, ty).

    OmniGraffle exports use matrix transforms to fit images into the viewBox,
    but the clipPath already handles cropping. The vertical scale factor causes
    compression when the image is embedded. Only fixes transforms where scaleX=1
    (vertical-only compression). Leaves genuinely scaled elements (thumbnails
    with scaleX != 1) untouched.
    """

    def replace_match(match: re.Match) -> str:
        scale_x = float(match.group(1))
        tx = match.group(3)
        ty = match.group(4)

        if scale_x == 1.0:
            return f'transform="translate({tx} {ty})"'
        else:
            return match.group(0)

    pattern = r'transform="matrix\(([.\d]+) 0 0 ([.\d]+) ([.\d-]+) ([.\d-]+)\)"'
    return re.sub(pattern, replace_match, content)


def embed_svg(svg_path: Path) -> bool:
    """Replace external PNG references with embedded base64 and fix transforms.

    Returns True if the file was modified.
    """
    content = svg_path.read_text(encoding="utf-8")
    svg_dir = svg_path.parent

    # find external PNG references (skip data: URIs already embedded)
    png_pattern = r'xl:href="((?!data:)[^"]+\.png)"'
    matches = re.findall(png_pattern, content)

    if not matches:
        print(f"  {svg_path.name}: already embedded or no PNG references, skipping")
        return False

    unique_pngs = list(dict.fromkeys(matches))
    print(f"  {svg_path.name}: embedding {len(unique_pngs)} PNG(s)")

    for png_name in unique_pngs:
        png_path = svg_dir / png_name

        if not png_path.exists():
            print(f"    WARNING: {png_name} not found at {svg_dir}, skipping", file=sys.stderr)
            continue

        b64 = quantise_png_to_base64(png_path)
        data_uri = f"data:image/png;base64,{b64}"
        content = content.replace(f'xl:href="{png_name}"', f'xl:href="{data_uri}"')

    content = fix_matrix_transforms(content)

    svg_path.write_text(content, encoding="utf-8")

    final_kb = svg_path.stat().st_size // 1024
    print(f"  {svg_path.name}: {final_kb} KB")

    return True


def main() -> None:
    if len(sys.argv) > 1:
        svg_files = [Path(arg) for arg in sys.argv[1:] if arg.endswith(".svg")]
    else:
        script_dir = Path(__file__).parent
        svg_files = sorted(script_dir.glob("*.svg"))

    if not svg_files:
        print("No SVG files to process")
        print(__doc__)
        sys.exit(1)

    print(f"Processing {len(svg_files)} SVG file(s)...\n")

    modified = 0

    for svg_path in svg_files:
        if not svg_path.exists():
            print(f"  {svg_path}: not found, skipping", file=sys.stderr)
            continue

        if embed_svg(svg_path):
            modified += 1

        print()

    print(f"Done. {modified}/{len(svg_files)} file(s) modified.")

    if modified > 0:
        print("Verify rendering before removing external PNG files.")


if __name__ == "__main__":
    main()
