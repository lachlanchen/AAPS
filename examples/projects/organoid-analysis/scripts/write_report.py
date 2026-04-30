#!/usr/bin/env python3
"""Write a small Markdown report from executable organoid demo artifacts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_json(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--qc-report", required=True)
    parser.add_argument("--segmentation-report", required=True)
    parser.add_argument("--metrics-report", required=True)
    parser.add_argument("--output-report", required=True)
    args = parser.parse_args()

    qc = load_json(args.qc_report)
    segmentation = load_json(args.segmentation_report)
    metrics = load_json(args.metrics_report)
    body = [
        "# Executable Organoid Demo Report",
        "",
        "## QC",
        f"- Mean intensity: {qc.get('mean_intensity')}",
        f"- Contrast score: {qc.get('contrast_score')}",
        f"- Route hint: {qc.get('route_hint')}",
        "",
        "## Segmentation",
        f"- Method: {segmentation.get('method')}",
        f"- Selected fraction: {segmentation.get('selected_fraction')}",
        f"- Mask: `{segmentation.get('mask_path')}`",
        "",
        "## Quantification",
        f"- Object count: {metrics.get('object_count')}",
        f"- Total area: {metrics.get('total_area')}",
        f"- Object table: `{metrics.get('object_table')}`",
        "",
        "## Review",
        "Approve the overlay and report before using this demo as a template for real data.",
        "",
    ]
    out = Path(args.output_report)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(body), encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
