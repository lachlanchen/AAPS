#!/usr/bin/env python3
"""Quantify a binary PGM mask for the executable AAPS organoid demo."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from pgm_utils import read_pgm


def neighbors(index: int, width: int, height: int) -> list[int]:
    x = index % width
    y = index // width
    out: list[int] = []
    if x > 0:
        out.append(index - 1)
    if x < width - 1:
        out.append(index + 1)
    if y > 0:
        out.append(index - width)
    if y < height - 1:
        out.append(index + width)
    return out


def components(width: int, height: int, pixels: list[int]) -> list[list[int]]:
    foreground = {index for index, value in enumerate(pixels) if value > 0}
    found: list[list[int]] = []
    while foreground:
        seed = foreground.pop()
        stack = [seed]
        current = [seed]
        while stack:
            index = stack.pop()
            for neighbor in neighbors(index, width, height):
                if neighbor in foreground:
                    foreground.remove(neighbor)
                    stack.append(neighbor)
                    current.append(neighbor)
        found.append(current)
    return found


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mask-path", "--mask", dest="mask_path", required=True)
    parser.add_argument("--object-table", "--objects", dest="object_table", required=True)
    parser.add_argument("--metrics-report", "--report-json", dest="metrics_report", required=True)
    args = parser.parse_args()

    width, height, _max_value, pixels = read_pgm(args.mask_path)
    comps = components(width, height, pixels)
    table = Path(args.object_table)
    table.parent.mkdir(parents=True, exist_ok=True)
    with table.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["id", "area", "centroid_x", "centroid_y"])
        writer.writeheader()
        for idx, comp in enumerate(comps, start=1):
            xs = [item % width for item in comp]
            ys = [item // width for item in comp]
            writer.writerow(
                {
                    "id": idx,
                    "area": len(comp),
                    "centroid_x": round(sum(xs) / len(xs), 3),
                    "centroid_y": round(sum(ys) / len(ys), 3),
                }
            )

    report = {
        "mask_path": args.mask_path,
        "object_count": len(comps),
        "total_area": sum(len(comp) for comp in comps),
        "object_table": args.object_table,
    }
    out = Path(args.metrics_report)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
