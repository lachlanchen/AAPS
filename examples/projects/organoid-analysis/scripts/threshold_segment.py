#!/usr/bin/env python3
"""Threshold a PGM image and create mask, overlay, and segmentation report."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from pgm_utils import read_pgm, write_pgm


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image-path", "--image", dest="image_path", required=True)
    parser.add_argument("--mask-path", "--output-mask", "--output", dest="mask_path", required=True)
    parser.add_argument("--overlay-path", dest="overlay_path", default="")
    parser.add_argument("--report-json", "--output-json", dest="report_json", required=True)
    parser.add_argument("--threshold", type=int, default=0)
    args = parser.parse_args()

    width, height, max_value, pixels = read_pgm(args.image_path)
    mean = sum(pixels) / len(pixels)
    threshold = args.threshold or int(mean + 24)
    mask = [max_value if value >= threshold else 0 for value in pixels]
    write_pgm(args.mask_path, width, height, max_value, mask)

    if args.overlay_path:
        overlay = [max(pixel, 220) if mask_value else pixel for pixel, mask_value in zip(pixels, mask)]
        write_pgm(args.overlay_path, width, height, max_value, overlay)

    selected = sum(1 for value in mask if value)
    report = {
        "method": "standard_library_threshold",
        "threshold": threshold,
        "mask_path": args.mask_path,
        "overlay_path": args.overlay_path,
        "selected_pixels": selected,
        "selected_fraction": round(selected / len(mask), 4),
        "valid": selected > 0,
    }
    out = Path(args.report_json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
