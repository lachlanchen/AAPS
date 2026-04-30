#!/usr/bin/env python3
"""Generate a small folder of synthetic PGM organoid-like images."""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from pgm_utils import write_pgm


def make_image(width: int, height: int, seed: int) -> list[int]:
    centers = [
        (22 + seed * 3, 24 + seed, 14 + seed % 3, 170 + seed * 8),
        (58 + seed * 2, 42 - seed, 11 + (seed % 2), 135 + seed * 7),
        (74 - seed, 20 + seed * 2, 7 + seed % 3, 118 + seed * 5),
    ]
    pixels: list[int] = []
    for y in range(height):
        for x in range(width):
            value = 18 + ((x * 5 + y * 7 + seed * 11) % 19)
            for cx, cy, radius, intensity in centers:
                dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
                if dist <= radius:
                    edge = max(0.0, 1.0 - dist / radius)
                    value = max(value, int(intensity * (0.42 + 0.58 * edge)))
            pixels.append(min(255, value))
    return pixels


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--count", type=int, default=4)
    parser.add_argument("--width", type=int, default=96)
    parser.add_argument("--height", type=int, default=72)
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    existing = sorted(out_dir.glob("*.pgm"))
    if len(existing) >= args.count:
        print(f"using existing {len(existing)} demo images in {out_dir}")
        return

    for index in range(1, args.count + 1):
        pixels = make_image(args.width, args.height, index)
        write_pgm(out_dir / f"demo_{index:02d}.pgm", args.width, args.height, 255, pixels)
    print(f"wrote {args.count} demo images to {out_dir}")


if __name__ == "__main__":
    main()
