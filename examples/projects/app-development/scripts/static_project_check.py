#!/usr/bin/env python3
"""Local executable app-project static check for AAPS demos."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


SKIP = {".git", "node_modules", "vendor", "runtime", ".aaps-work"}


def walk(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
      if any(part in SKIP for part in path.parts):
          continue
      if path.is_file():
          files.append(path)
    return files


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app-root", default=".")
    parser.add_argument("--output-json", required=True)
    args = parser.parse_args()

    root = Path(args.app_root)
    files = walk(root)
    suffix_counts: dict[str, int] = {}
    for file in files:
        suffix_counts[file.suffix or "(none)"] = suffix_counts.get(file.suffix or "(none)", 0) + 1
    report = {
        "app_root": str(root),
        "file_count": len(files),
        "has_readme": any(file.name.lower().startswith("readme") for file in files),
        "has_package_json": any(file.name == "package.json" for file in files),
        "has_manifest": any(file.name in {"manifest.json", "site.webmanifest"} for file in files),
        "suffix_counts": suffix_counts,
        "sample_files": [str(file) for file in files[:25]],
    }
    out = Path(args.output_json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
