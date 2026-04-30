#!/usr/bin/env python3
"""Compute lightweight image QC metrics for the executable AAPS organoid demo."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from pgm_utils import read_pgm, write_pgm


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image-path", "--image", dest="image_path", required=True)
    parser.add_argument("--output-json", "--qc-report", dest="output_json", required=True)
    parser.add_argument("--preview-path", dest="preview_path", default="")
    args = parser.parse_args()

    width, height, max_value, pixels = read_pgm(args.image_path)
    mean = sum(pixels) / len(pixels)
    variance = sum((value - mean) ** 2 for value in pixels) / len(pixels)
    bright = sum(1 for value in pixels if value > mean + 20)
    report = {
        "image_path": args.image_path,
        "width": width,
        "height": height,
        "max_value": max_value,
        "mean_intensity": round(mean, 3),
        "contrast_score": round(variance ** 0.5, 3),
        "bright_fraction": round(bright / len(pixels), 4),
        "blur_score": "not_measured",
        "density_level": "high" if bright / len(pixels) > 0.22 else "moderate",
        "route_hint": "threshold",
    }
    out = Path(args.output_json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if args.preview_path:
        write_pgm(args.preview_path, width, height, max_value, pixels)
    print(json.dumps(report))


if __name__ == "__main__":
    main()
