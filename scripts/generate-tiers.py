#!/usr/bin/env python3
"""Generate Lanczos3 display tiers for resting-lanczos / srcset.

Always resizes from a single full-res crop (never cascade tier→tier).
Hover zoom should use CSS transform: scale() — these files are resting candidates only.

Usage:
  python scripts/generate-tiers.py --input master.png --id mycard --out-dir ./out
  python scripts/generate-tiers.py --input master.png --id mycard --tiers 400,800 --aspect 4:3
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image

DEFAULT_TIERS = [(400, None), (800, None)]  # height derived from aspect if None
WEBP_QUALITY = 90


def parse_aspect(s: str) -> float:
    if ":" in s:
        a, b = s.split(":", 1)
        return float(a) / float(b)
    return float(s)


def parse_tiers(s: str, aspect: float) -> list[tuple[int, int]]:
    """'400,800' or '400x300,800x600' → list of (w, h)."""
    out: list[tuple[int, int]] = []
    for part in s.split(","):
        part = part.strip()
        if not part:
            continue
        if "x" in part.lower():
            w_s, h_s = re.split(r"[xX]", part, maxsplit=1)
            out.append((int(w_s), int(h_s)))
        else:
            w = int(part)
            h = int(round(w / aspect))
            out.append((w, h))
    if not out:
        raise SystemExit("no tiers parsed")
    return out


def crop_cover(im: Image.Image, aspect: float, gravity: str) -> Image.Image:
    """object-fit: cover crop; gravity top|center|bottom (vertical) / implied horizontal center."""
    sw, sh = im.size
    src_aspect = sw / sh

    if src_aspect > aspect:
        new_w = int(round(sh * aspect))
        left = (sw - new_w) // 2
        box = (left, 0, left + new_w, sh)
    else:
        new_h = int(round(sw / aspect))
        if gravity == "top":
            top = 0
        elif gravity == "bottom":
            top = sh - new_h
        else:
            top = (sh - new_h) // 2
        box = (0, top, sw, top + new_h)

    return im.crop(box)


def process_one(
    src: Path,
    asset_id: str,
    out_dir: Path,
    tiers: list[tuple[int, int]],
    aspect: float,
    gravity: str,
    quality: int,
    no_crop: bool,
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        rgb = im.convert("RGB")
        base = rgb if no_crop else crop_cover(rgb, aspect, gravity)

        for width, height in tiers:
            if base.size == (width, height):
                out = base
            else:
                out = base.resize((width, height), Image.Resampling.LANCZOS)
            dest = out_dir / f"{asset_id}-{width}.webp"
            out.save(dest, "WEBP", quality=quality, method=6)
            print(f"wrote {dest} ({width}x{height}, q={quality}, LANCZOS)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prebake Lanczos3 WebP tiers for srcset (resting display sizes)."
    )
    parser.add_argument("--input", type=Path, required=True, help="Master image path")
    parser.add_argument("--id", type=str, required=True, help="Output basename prefix")
    parser.add_argument("--out-dir", type=Path, required=True, help="Output directory")
    parser.add_argument(
        "--tiers",
        type=str,
        default="400,800",
        help="Comma-separated widths, or WxH pairs (default: 400,800)",
    )
    parser.add_argument(
        "--aspect",
        type=str,
        default="4:3",
        help="Crop aspect when not using explicit HxW (default: 4:3)",
    )
    parser.add_argument(
        "--crop-gravity",
        choices=("top", "center", "bottom"),
        default="top",
        help="Vertical gravity for cover crop (default: top)",
    )
    parser.add_argument(
        "--no-crop",
        action="store_true",
        help="Skip cover crop; letterbox-free stretch via Lanczos to each tier size",
    )
    parser.add_argument("--quality", type=int, default=WEBP_QUALITY, help="WebP quality")
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"input not found: {args.input}")

    aspect = parse_aspect(args.aspect)
    tiers = parse_tiers(args.tiers, aspect)
    process_one(
        args.input,
        args.id,
        args.out_dir,
        tiers,
        aspect,
        args.crop_gravity,
        args.quality,
        args.no_crop,
    )


if __name__ == "__main__":
    main()
