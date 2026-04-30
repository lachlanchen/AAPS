#!/usr/bin/env python3
"""Generate a simple ASCII PGM microscopy-like image for local AAPS demos."""

from __future__ import annotations

import argparse
import math
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-image", "--output", dest="output_image", required=True)
    parser.add_argument("--width", type=int, default=96)
    parser.add_argument("--height", type=int, default=72)
    args = parser.parse_args()

    centers = [(30, 34, 18, 190), (62, 28, 13, 155), (58, 50, 10, 125)]
    pixels: list[int] = []
    for y in range(args.height):
        for x in range(args.width):
            value = 18 + ((x * 3 + y * 5) % 17)
            for cx, cy, radius, intensity in centers:
                dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
                if dist <= radius:
                    edge = max(0.0, 1.0 - dist / radius)
                    value = max(value, int(intensity * (0.48 + 0.52 * edge)))
            pixels.append(min(255, value))

    out = Path(args.output_image)
    out.parent.mkdir(parents=True, exist_ok=True)
    rows = [" ".join(str(pixels[y * args.width + x]) for x in range(args.width)) for y in range(args.height)]
    out.write_text(f"P2\n{args.width} {args.height}\n255\n" + "\n".join(rows) + "\n", encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
