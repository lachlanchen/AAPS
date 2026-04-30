#!/usr/bin/env python3
"""Combine per-image organoid metrics into batch reports."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts-dir", required=True)
    parser.add_argument("--output-csv", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--output-report", required=True)
    args = parser.parse_args()

    artifacts = Path(args.artifacts_dir)
    metrics_files = sorted(artifacts.glob("*.metrics.json"))
    rows = []
    for file in metrics_files:
        payload = load_json(file)
        rows.append(
            {
                "sample": file.name.replace(".metrics.json", ""),
                "mask_path": payload.get("mask_path", ""),
                "object_count": payload.get("object_count", 0),
                "total_area": payload.get("total_area", 0),
                "object_table": payload.get("object_table", ""),
            }
        )

    csv_path = Path(args.output_csv)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["sample", "mask_path", "object_count", "total_area", "object_table"])
        writer.writeheader()
        writer.writerows(rows)

    summary = {
        "image_count": len(rows),
        "total_objects": sum(int(row["object_count"]) for row in rows),
        "total_foreground_area": sum(int(row["total_area"]) for row in rows),
        "combined_csv": args.output_csv,
    }
    json_path = Path(args.output_json)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    report_path = Path(args.output_report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report = [
        "# Executable Folder Segmentation Report",
        "",
        f"- Images processed: {summary['image_count']}",
        f"- Total objects: {summary['total_objects']}",
        f"- Total foreground area: {summary['total_foreground_area']}",
        f"- Combined CSV: `{args.output_csv}`",
        f"- Summary JSON: `{args.output_json}`",
        "",
        "## Samples",
        *[f"- {row['sample']}: {row['object_count']} objects, area {row['total_area']}" for row in rows],
        "",
    ]
    report_path.write_text("\n".join(report), encoding="utf-8")
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
