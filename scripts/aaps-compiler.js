#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const AAPS = require("../src/aaps");
const Runner = require("./aaps-runner");

const MODES = new Set(["check", "suggest", "apply", "interactive", "force"]);
const WRITE_MODES = new Set(["apply", "force"]);
const SKIP_DIRS = new Set([".git", ".aaps-work", "node_modules", "vendor", "runtime", "__pycache__"]);

function nowStamp() {
  return new Date().toISOString().replace(/T/, "_").replace(/[:.]/g, "-").replace(/Z$/, "");
}

function nowIso() {
  return new Date().toISOString();
}

function toProjectPath(file) {
  return String(file || "").split(path.sep).join("/");
}

function slug(value, fallback = "component") {
  return AAPS.slug ? AAPS.slug(value, fallback) : String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hashFile(file) {
  if (!fs.existsSync(file)) return "";
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function safeRelative(projectDir, value, label = "path") {
  return Runner.safeRelative(projectDir, value, label);
}

function readTextIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function collectProjectTree(projectDir) {
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else {
        files.push(toProjectPath(path.relative(projectDir, path.join(dir, entry.name))));
      }
    }
  }
  walk(projectDir);
  return files.sort();
}

function runRootFor(projectDir, manifest) {
  const configured = manifest && manifest.paths && manifest.paths.runs ? manifest.paths.runs : "runs";
  return safeRelative(projectDir, configured, "runs path");
}

function compileDirFor(projectDir, manifest, compileId) {
  return path.join(runRootFor(projectDir, manifest), compileId || `${nowStamp()}_compile`);
}

function normalizeMode(mode) {
  const value = String(mode || "check").toLowerCase();
  if (!MODES.has(value)) throw new Error(`Invalid compile mode: ${mode}`);
  return value;
}

function contextText(value) {
  try {
    return JSON.stringify(value || {});
  } catch {
    return "";
  }
}

function inferKind(name, context = {}) {
  const text = `${String(name || "")} ${contextText(context)}`.toLowerCase();
  if (/cellpose|microscop|organoid|brightfield|tiff?|\.tiff?\b|image_glob|mask_count|overlay_count|foreground_fraction|threshold_morphology/.test(text)) {
    return "tiff_segmentation";
  }
  if (/segment|threshold|mask/.test(text)) return "segment";
  if (/qc|quality|inspect/.test(text)) return "qc";
  if (/quantif|measure|metric|object/.test(text)) return "quantify";
  if (/summar|batch|report/.test(text)) return "summarize";
  if (/generate[_ -]?images|synthetic|demo image|image generator/.test(text)) return "generate_images";
  if (/static|scan|project|app/.test(text)) return "static_check";
  return "generic";
}

function pythonScriptFor(kind) {
  if (kind === "segment") {
    return `#!/usr/bin/env python3
"""AAPS generated threshold segmentation script.

This local helper intentionally uses only the Python standard library. It reads
ASCII PGM/P2 images, writes a binary mask, optional overlay, optional object
table, and a JSON report. It is meant as a safe fallback until a stronger tool
such as Cellpose/SAM is installed and registered.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def read_pgm(path: Path):
    tokens = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            tokens.extend(line.split())
    if not tokens or tokens[0] != "P2":
        raise ValueError("expected an ASCII PGM/P2 image")
    width, height, max_value = map(int, tokens[1:4])
    pixels = [int(value) for value in tokens[4:]]
    if len(pixels) != width * height:
        raise ValueError("pixel count does not match image dimensions")
    return width, height, max_value, pixels


def write_pgm(path: Path, width: int, height: int, max_value: int, pixels):
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = [" ".join(str(pixels[row * width + col]) for col in range(width)) for row in range(height)]
    path.write_text(f"P2\\n{width} {height}\\n{max_value}\\n" + "\\n".join(rows) + "\\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-image", "--image-path", "--image", dest="image_path", required=True)
    parser.add_argument("--output-mask", "--mask-path", "--mask", dest="mask_path", required=True)
    parser.add_argument("--output-overlay", "--overlay-path", dest="overlay_path", default="")
    parser.add_argument("--output-table", "--object-table", dest="object_table", default="")
    parser.add_argument("--report-json", "--output-json", dest="report_json", default="")
    parser.add_argument("--threshold", type=int, default=0)
    args, _unknown = parser.parse_known_args()

    width, height, max_value, pixels = read_pgm(Path(args.image_path))
    mean = sum(pixels) / len(pixels)
    threshold = args.threshold or max(1, int(mean + 16))
    mask = [max_value if value >= threshold else 0 for value in pixels]
    write_pgm(Path(args.mask_path), width, height, max_value, mask)
    if args.overlay_path:
        overlay = [max(pixel, 220) if selected else pixel for pixel, selected in zip(pixels, mask)]
        write_pgm(Path(args.overlay_path), width, height, max_value, overlay)
    selected = sum(1 for value in mask if value)
    if args.object_table:
        table = Path(args.object_table)
        table.parent.mkdir(parents=True, exist_ok=True)
        with table.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=["id", "area", "mean_intensity"])
            writer.writeheader()
            writer.writerow({"id": 1, "area": selected, "mean_intensity": round(mean, 3)})
    report = {
        "ok": selected > 0,
        "method": "aaps_standard_library_threshold",
        "threshold": threshold,
        "selected_pixels": selected,
        "selected_fraction": selected / float(width * height),
        "mask_path": args.mask_path,
        "overlay_path": args.overlay_path,
        "object_table": args.object_table,
    }
    if args.report_json:
        out = Path(args.report_json)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=2) + "\\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
`;
  }
  if (kind === "tiff_segmentation") {
    return `#!/usr/bin/env python3
"""AAPS generated TIFF microscopy segmentation preview script.

This helper is intentionally deterministic and project-local. It is meant for
compile/apply manifestation: process real microscopy TIFF files, create masks
and overlays, calculate per-image and summary metrics, and write enough
artifacts for AAPS Studio to show a biology user what happened.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import traceback
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import tifffile
from scipy import ndimage as ndi
from skimage import exposure, filters, measure, morphology, segmentation


REQUIRED_COLUMNS = [
    "image_id",
    "image_path",
    "condition",
    "date_group",
    "method",
    "object_count",
    "foreground_area",
    "foreground_fraction",
    "mean_object_area",
    "median_object_area",
    "qc_flag",
    "qc_notes",
    "mask_path",
    "overlay_path",
]


def safe_stem(path: Path) -> str:
    text = "_".join(path.with_suffix("").parts[-3:])
    text = re.sub(r"[^A-Za-z0-9._-]+", "_", text)
    return text.strip("._-") or "image"


def infer_condition(path: Path) -> str:
    text = str(path).lower()
    if "low" in text:
        return "low_density"
    if "middle" in text or "mid" in text:
        return "middle_density"
    if "high" in text:
        return "high_density"
    return "unknown"


def select_preview(paths, limit: int):
    if limit <= 0 or len(paths) <= limit:
        return paths
    selected = []
    used = set()
    for needle in ["low", "middle", "high"]:
        for path in paths:
            if needle in path.name.lower() and path not in used:
                selected.append(path)
                used.add(path)
                break
    for path in paths:
        if len(selected) >= limit:
            break
        if path not in used:
            selected.append(path)
            used.add(path)
    return selected[:limit]


def read_gray(path: Path) -> np.ndarray:
    image = tifffile.imread(path)
    image = np.asarray(image)
    image = np.squeeze(image)
    if image.ndim == 3:
        if image.shape[-1] in (3, 4):
            image = image[..., :3].mean(axis=-1)
        else:
            image = image.mean(axis=0)
    if image.ndim != 2:
        raise ValueError(f"expected a 2D image after channel reduction, got shape {image.shape}")
    image = image.astype("float32", copy=False)
    finite = np.isfinite(image)
    if not finite.all():
        image = np.where(finite, image, np.nanmedian(image[finite]))
    low, high = np.percentile(image, [1, 99])
    if not math.isfinite(float(high - low)) or high <= low:
        low, high = float(np.min(image)), float(np.max(image))
    if high <= low:
        return np.zeros_like(image, dtype="float32")
    norm = np.clip((image - low) / (high - low), 0, 1)
    return exposure.equalize_adapthist(norm, clip_limit=0.01).astype("float32")


def candidate_masks(gray: np.ndarray):
    threshold = filters.threshold_otsu(gray)
    yield "dark_otsu", gray < threshold
    yield "bright_otsu", gray > threshold
    block = max(63, min(251, int(min(gray.shape) // 12) | 1))
    local = filters.threshold_local(gray, block_size=block, offset=0)
    yield "dark_local", gray < local
    yield "bright_local", gray > local


def filter_regions(mask: np.ndarray, min_size: int) -> np.ndarray:
    labels = measure.label(mask)
    keep = np.zeros_like(mask, dtype=bool)
    max_area = max(min_size * 10, int(mask.size * 0.055))
    height, width = mask.shape
    for region in measure.regionprops(labels):
        area = int(region.area)
        if area < min_size:
            continue
        min_row, min_col, max_row, max_col = region.bbox
        box_h = max_row - min_row
        box_w = max_col - min_col
        aspect = max(box_h, box_w) / max(1, min(box_h, box_w))
        touches_border = min_row <= 1 or min_col <= 1 or max_row >= height - 1 or max_col >= width - 1
        if touches_border and area > min_size * 6:
            continue
        if area > max_area and aspect > 2.8:
            continue
        if aspect > 9.0:
            continue
        if region.eccentricity > 0.985 and aspect > 4.0:
            continue
        keep[labels == region.label] = True
    return keep


def clean_mask(mask: np.ndarray, min_size: int) -> np.ndarray:
    mask = ndi.binary_fill_holes(mask)
    mask = morphology.remove_small_objects(mask.astype(bool), min_size=min_size)
    mask = morphology.remove_small_holes(mask, area_threshold=max(min_size * 2, 128))
    mask = morphology.binary_closing(mask, morphology.disk(4))
    mask = morphology.binary_opening(mask, morphology.disk(2))
    return filter_regions(mask.astype(bool), min_size)


def choose_mask(gray: np.ndarray, min_mask_pixels: int = 50):
    min_size = max(int(min_mask_pixels), int(gray.size * 0.00008))
    best = None
    for name, raw_mask in candidate_masks(gray):
        mask = clean_mask(raw_mask, min_size)
        frac = float(mask.mean())
        labels = measure.label(mask)
        objects = [region.area for region in measure.regionprops(labels)]
        object_count = len(objects)
        if frac <= 0 or frac >= 0.95:
            score = -10.0
        else:
            balance = 1.0 - abs(frac - 0.18)
            score = balance + min(object_count, 50) * 0.02
            if frac < 0.003 or frac > 0.75:
                score -= 2.0
        record = (score, name, mask, labels, objects, frac)
        if best is None or score > best[0]:
            best = record
    if best is None:
        mask = np.zeros_like(gray, dtype=bool)
        return "failed_no_candidate", mask, measure.label(mask), [], 0.0
    return best[1], best[2], best[3], best[4], best[5]


def save_overlay(gray: np.ndarray, mask: np.ndarray, output: Path):
    output.parent.mkdir(parents=True, exist_ok=True)
    boundaries = segmentation.find_boundaries(mask, mode="outer")
    rgb = np.dstack([gray, gray, gray])
    rgb[mask, 0] = np.maximum(rgb[mask, 0], 0.95)
    rgb[mask, 1] *= 0.45
    rgb[mask, 2] *= 0.45
    rgb[boundaries] = [1.0, 1.0, 0.0]
    plt.imsave(output, np.clip(rgb, 0, 1))


def write_csv(path: Path, rows, fieldnames):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def summarize(rows):
    groups = {}
    for row in rows:
        group = groups.setdefault(row["condition"], {
            "condition": row["condition"],
            "image_count": 0,
            "total_objects": 0,
            "total_foreground_area": 0.0,
            "mean_foreground_fraction": 0.0,
            "mean_object_area": 0.0,
        })
        group["image_count"] += 1
        group["total_objects"] += int(row["object_count"])
        group["total_foreground_area"] += float(row["foreground_area"])
        group["mean_foreground_fraction"] += float(row["foreground_fraction"])
        group["mean_object_area"] += float(row["mean_object_area"])
    for group in groups.values():
        n = max(1, int(group["image_count"]))
        group["mean_foreground_fraction"] = round(group["mean_foreground_fraction"] / n, 6)
        group["mean_object_area"] = round(group["mean_object_area"] / n, 3)
        group["total_foreground_area"] = round(group["total_foreground_area"], 3)
    return list(groups.values())


def save_summary_figure(summary_rows, output: Path):
    output.parent.mkdir(parents=True, exist_ok=True)
    conditions = [row["condition"] for row in summary_rows] or ["none"]
    fractions = [float(row.get("mean_foreground_fraction", 0)) for row in summary_rows] or [0]
    objects = [int(row.get("total_objects", 0)) for row in summary_rows] or [0]
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    axes[0].bar(conditions, fractions, color="#3c7f72")
    axes[0].set_ylabel("Mean foreground fraction")
    axes[0].tick_params(axis="x", rotation=25)
    axes[1].bar(conditions, objects, color="#b06945")
    axes[1].set_ylabel("Total objects")
    axes[1].tick_params(axis="x", rotation=25)
    fig.suptitle("App81 DEO segmentation preview")
    fig.tight_layout()
    fig.savefig(output, dpi=160)
    plt.close(fig)


def main() -> int:
    parser = argparse.ArgumentParser(description="AAPS App81 TIFF segmentation preview", allow_abbrev=False)
    parser.add_argument("--data-root", required=True)
    parser.add_argument("--image-glob", default="**/*10x*.tif")
    parser.add_argument("--condition-map", default="")
    parser.add_argument("--out-dir", "--output-dir", "--output-root", dest="out_dir", required=True)
    parser.add_argument("--preview", default="false")
    parser.add_argument("--preview-limit", type=int, default=3)
    parser.add_argument("--mode", "--method", "--method-hint", dest="method", default="auto")
    parser.add_argument("--min-mask-pixels", type=int, default=50)
    args, _unknown = parser.parse_known_args()

    data_root = Path(args.data_root)
    out_dir = Path(args.out_dir)
    if not data_root.exists():
        raise SystemExit(f"missing data root: {data_root}")
    out_dir.mkdir(parents=True, exist_ok=True)
    logs_dir = out_dir.parent / "block_logs" if out_dir.name == "artifacts" else out_dir / "logs"
    alt_logs_dir = out_dir.parent / "logs" if out_dir.name == "artifacts" else logs_dir
    logs_dir.mkdir(parents=True, exist_ok=True)
    alt_logs_dir.mkdir(parents=True, exist_ok=True)
    debug_log = logs_dir / "app81_deo_segmentation_debug.log"
    alt_debug_log = alt_logs_dir / "app81_deo_segmentation_debug.log"
    fallback_reason = ""
    selected_method = args.method
    if args.method in {"cellpose", "cellpose_multiscale", "auto"}:
        try:
            __import__("cellpose")
            fallback_reason = "cellpose detected but deterministic preview template uses threshold_morphology for reproducibility"
        except Exception as exc:
            fallback_reason = f"cellpose unavailable, using threshold_morphology: {exc.__class__.__name__}"
        selected_method = "threshold_morphology"

    patterns = [args.image_glob]
    if args.image_glob.endswith(".tif"):
        patterns.append(args.image_glob + "f")
    paths = []
    for pattern in patterns:
        paths.extend(sorted(path for path in data_root.glob(pattern) if path.is_file()))
    if not paths:
        paths = sorted(data_root.rglob("*.tif")) + sorted(data_root.rglob("*.tiff"))
    paths = [path for path in paths if "10x" in path.name.lower()] or paths
    paths = select_preview(list(dict.fromkeys(paths)), int(args.preview_limit))
    if not paths:
        raise SystemExit(f"no TIFF images found under {data_root} using {args.image_glob}")

    masks_dir = out_dir / "masks"
    overlays_dir = out_dir / "overlays"
    stats_dir = out_dir / "stats"
    db_dir = out_dir / "databases"
    figures_dir = out_dir / "figures"
    for folder in [masks_dir, overlays_dir, stats_dir, db_dir, figures_dir]:
        folder.mkdir(parents=True, exist_ok=True)

    rows = []
    log_lines = [
        f"data_root={data_root}",
        f"image_glob={args.image_glob}",
        f"preview_limit={args.preview_limit}",
        f"selected_method={selected_method}",
        f"fallback_reason={fallback_reason}",
        f"selected_images={len(paths)}",
    ]
    for index, image_path in enumerate(paths, start=1):
        gray = read_gray(image_path)
        candidate_name, mask, labels, object_areas, foreground_fraction = choose_mask(gray, args.min_mask_pixels)
        mask_path = masks_dir / f"{safe_stem(image_path)}.mask.png"
        overlay_path = overlays_dir / f"{safe_stem(image_path)}.overlay.png"
        plt.imsave(mask_path, mask.astype("uint8") * 255, cmap="gray")
        save_overlay(gray, mask, overlay_path)
        foreground_area = int(mask.sum())
        object_count = int(len(object_areas))
        mean_object_area = float(np.mean(object_areas)) if object_areas else 0.0
        median_object_area = float(np.median(object_areas)) if object_areas else 0.0
        qc_notes = []
        if foreground_area == 0:
            qc_notes.append("empty mask")
        if foreground_fraction > 0.85:
            qc_notes.append("foreground fraction unusually high")
        if object_count == 0:
            qc_notes.append("no labeled objects")
        row = {
            "image_id": safe_stem(image_path),
            "image_path": str(image_path),
            "condition": infer_condition(image_path),
            "date_group": image_path.parent.name,
            "method": f"{selected_method}:{candidate_name}",
            "object_count": object_count,
            "foreground_area": foreground_area,
            "foreground_fraction": round(float(foreground_fraction), 6),
            "mean_object_area": round(mean_object_area, 3),
            "median_object_area": round(median_object_area, 3),
            "qc_flag": "warn" if qc_notes else "pass",
            "qc_notes": "; ".join(qc_notes),
            "mask_path": str(mask_path),
            "overlay_path": str(overlay_path),
        }
        rows.append(row)
        (stats_dir / f"{row['image_id']}.segmentation_stats.json").write_text(json.dumps(row, indent=2, ensure_ascii=False) + "\\n", encoding="utf-8")
        log_lines.append(f"{index}. {image_path} -> objects={object_count}, foreground_fraction={foreground_fraction:.6f}, qc={row['qc_flag']}")

    summary_rows = summarize(rows)
    per_image_csv = db_dir / "per_image_metrics.csv"
    per_image_json = db_dir / "per_image_metrics.json"
    summary_csv = db_dir / "summary.csv"
    summary_json = db_dir / "summary.json"
    figure_path = figures_dir / "app81_deo_segmentation_summary.png"
    report_path = out_dir / "report.md"
    manifest_path = out_dir / "run_manifest.json"
    method_selection_path = out_dir / "method_selection.json"
    image_manifest_json = out_dir / "manifest.json"
    image_manifest_csv = out_dir / "manifest.csv"
    result_path = out_dir / "result.json"
    stdout_log = logs_dir / "segmentation-stdout.log"
    stderr_log = logs_dir / "segmentation-stderr.log"

    write_csv(per_image_csv, rows, REQUIRED_COLUMNS)
    per_image_json.write_text(json.dumps({"rows": rows, "row_count": len(rows)}, indent=2, ensure_ascii=False) + "\\n", encoding="utf-8")
    write_csv(summary_csv, summary_rows, ["condition", "image_count", "total_objects", "total_foreground_area", "mean_foreground_fraction", "mean_object_area"])
    summary_json.write_text(json.dumps({"rows": summary_rows, "row_count": len(summary_rows)}, indent=2, ensure_ascii=False) + "\\n", encoding="utf-8")
    save_summary_figure(summary_rows, figure_path)
    manifest_rows = [
        {
            "image_id": row["image_id"],
            "image_path": row["image_path"],
            "mask_path": row["mask_path"],
            "overlay_path": row["overlay_path"],
            "qc_flag": row["qc_flag"],
        }
        for row in rows
    ]
    write_csv(image_manifest_csv, manifest_rows, ["image_id", "image_path", "mask_path", "overlay_path", "qc_flag"])
    image_manifest_json.write_text(json.dumps({"images": manifest_rows, "image_count": len(manifest_rows)}, indent=2, ensure_ascii=False) + "\\n", encoding="utf-8")
    method_selection_path.write_text(json.dumps({
        "requested_method": args.method,
        "selected_method": selected_method,
        "fallback_reason": fallback_reason,
        "preview": str(args.preview).lower() in {"1", "true", "yes", "on"},
        "preview_limit": int(args.preview_limit),
        "min_mask_pixels": int(args.min_mask_pixels),
        "method_family": "deterministic_threshold_morphology",
    }, indent=2, ensure_ascii=False) + "\\n", encoding="utf-8")

    required_paths = [manifest_path, method_selection_path, image_manifest_json, image_manifest_csv, masks_dir, overlays_dir, stats_dir, per_image_csv, per_image_json, summary_csv, summary_json, figure_path, report_path, result_path, stdout_log, stderr_log]
    manifest = {
        "ok": True,
        "method": selected_method,
        "fallback_reason": fallback_reason,
        "preview": str(args.preview).lower() in {"1", "true", "yes", "on"},
        "preview_limit": int(args.preview_limit),
        "min_mask_pixels": int(args.min_mask_pixels),
        "data_root": str(data_root),
        "image_glob": args.image_glob,
        "output_root": str(out_dir),
        "processed_count": len(rows),
        "mask_count": len(list(masks_dir.glob("*.png"))),
        "overlay_count": len(list(overlays_dir.glob("*.png"))),
        "required_outputs": [str(path) for path in required_paths],
        "condition_map": args.condition_map,
        "debug_log": str(debug_log),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\\n", encoding="utf-8")
    report_lines = [
        "# App81 DEO Segmentation Preview",
        "",
        f"- Data root: {data_root}",
        f"- Images processed: {len(rows)}",
        f"- Method: {selected_method}",
        f"- Fallback reason: {fallback_reason or 'none'}",
        f"- Per-image metrics: {per_image_csv}",
        f"- Summary metrics: {summary_csv}",
        f"- Summary figure: {figure_path}",
        f"- Masks: {masks_dir}",
        f"- Overlays: {overlays_dir}",
        "",
        "## QC",
    ]
    report_lines.extend([f"- {row['image_id']}: {row['qc_flag']} ({row['qc_notes'] or 'no warnings'})" for row in rows])
    report_path.write_text("\\n".join(report_lines) + "\\n", encoding="utf-8")
    debug_log.write_text("\\n".join(log_lines) + "\\n", encoding="utf-8")
    alt_debug_log.write_text("\\n".join(log_lines) + "\\n", encoding="utf-8")
    (out_dir / "app81_deo_segmentation_debug.log").write_text("\\n".join(log_lines) + "\\n", encoding="utf-8")
    stdout_log.write_text("\\n".join(log_lines) + "\\n", encoding="utf-8")
    stderr_log.write_text("", encoding="utf-8")
    result_path.write_text(json.dumps({"ok": True, "run_manifest": str(manifest_path), "processed_count": len(rows), "outputs": manifest}, indent=2, ensure_ascii=False) + "\\n", encoding="utf-8")

    missing = [str(path) for path in required_paths if not path.exists()]
    if missing:
        raise SystemExit("missing required outputs after run: " + ", ".join(missing))
    if len(rows) == 0 or len(list(masks_dir.glob("*.png"))) < len(rows) or len(list(overlays_dir.glob("*.png"))) < len(rows):
        raise SystemExit("segmentation output count check failed")
    print(json.dumps(manifest, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
`;
  }
  if (kind === "qc") {
    return `#!/usr/bin/env python3
"""AAPS generated image QC script for ASCII PGM/P2 images."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def read_pgm(path: Path):
    tokens = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            tokens.extend(line.split())
    if not tokens or tokens[0] != "P2":
        raise ValueError("expected an ASCII PGM/P2 image")
    width, height, max_value = map(int, tokens[1:4])
    pixels = [int(value) for value in tokens[4:]]
    return width, height, max_value, pixels


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image-path", "--input-image", "--image", dest="image_path", required=True)
    parser.add_argument("--output-json", "--qc-report", dest="output_json", required=True)
    parser.add_argument("--preview-path", dest="preview_path", default="")
    args, _unknown = parser.parse_known_args()
    width, height, max_value, pixels = read_pgm(Path(args.image_path))
    mean = sum(pixels) / len(pixels)
    variance = sum((value - mean) ** 2 for value in pixels) / len(pixels)
    report = {
        "ok": True,
        "image_path": args.image_path,
        "width": width,
        "height": height,
        "max_value": max_value,
        "mean_intensity": round(mean, 3),
        "contrast_score": round(variance ** 0.5, 3),
        "route_hint": "threshold",
    }
    out = Path(args.output_json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\\n", encoding="utf-8")
    if args.preview_path:
        preview = Path(args.preview_path)
        preview.parent.mkdir(parents=True, exist_ok=True)
        preview.write_text(Path(args.image_path).read_text(encoding="utf-8"), encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
`;
  }
  if (kind === "quantify") {
    return `#!/usr/bin/env python3
"""AAPS generated binary mask quantification script for ASCII PGM/P2 masks."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def read_pgm(path: Path):
    tokens = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            tokens.extend(line.split())
    if not tokens or tokens[0] != "P2":
        raise ValueError("expected an ASCII PGM/P2 image")
    width, height, _max_value = map(int, tokens[1:4])
    pixels = [int(value) for value in tokens[4:]]
    return width, height, pixels


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mask-path", "--mask", dest="mask_path", required=True)
    parser.add_argument("--object-table", "--output-table", dest="object_table", required=True)
    parser.add_argument("--metrics-report", "--report-json", "--output-json", dest="metrics_report", required=True)
    args, _unknown = parser.parse_known_args()
    width, height, pixels = read_pgm(Path(args.mask_path))
    foreground = [index for index, value in enumerate(pixels) if value > 0]
    table = Path(args.object_table)
    table.parent.mkdir(parents=True, exist_ok=True)
    with table.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["id", "area", "centroid_x", "centroid_y"])
        writer.writeheader()
        if foreground:
            xs = [index % width for index in foreground]
            ys = [index // width for index in foreground]
            writer.writerow({"id": 1, "area": len(foreground), "centroid_x": sum(xs) / len(xs), "centroid_y": sum(ys) / len(ys)})
    report = {"ok": True, "object_count": 1 if foreground else 0, "total_area": len(foreground), "mask_path": args.mask_path}
    out = Path(args.metrics_report)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
`;
  }
  if (kind === "summarize") {
    return `#!/usr/bin/env python3
"""AAPS generated batch summary script."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts-dir", required=True)
    parser.add_argument("--output-csv", required=True)
    parser.add_argument("--output-json", required=True)
    parser.add_argument("--output-report", default="")
    args, _unknown = parser.parse_known_args()
    artifacts = Path(args.artifacts_dir)
    metrics = sorted(artifacts.glob("*.metrics.json")) + sorted(artifacts.glob("*.segmentation.json"))
    rows = []
    for file in metrics:
        payload = json.loads(file.read_text(encoding="utf-8"))
        rows.append({"sample": file.stem, "object_count": payload.get("object_count", payload.get("selected_pixels", 0)), "total_area": payload.get("total_area", payload.get("selected_pixels", 0))})
    csv_path = Path(args.output_csv)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["sample", "object_count", "total_area"])
        writer.writeheader()
        writer.writerows(rows)
    summary = {"ok": True, "row_count": len(rows), "total_objects": sum(int(row["object_count"]) for row in rows)}
    out = Path(args.output_json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(summary, indent=2) + "\\n", encoding="utf-8")
    if args.output_report:
        report = Path(args.output_report)
        report.parent.mkdir(parents=True, exist_ok=True)
        report.write_text("# AAPS Batch Summary\\n\\n" + json.dumps(summary, indent=2) + "\\n", encoding="utf-8")
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
`;
  }
  if (kind === "generate_images") {
    return `#!/usr/bin/env python3
"""AAPS generated synthetic PGM image generator."""

from __future__ import annotations

import argparse
import random
from pathlib import Path


def write_pgm(path: Path, width: int, height: int, pixels):
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = [" ".join(str(pixels[row * width + col]) for col in range(width)) for row in range(height)]
    path.write_text(f"P2\\n{width} {height}\\n255\\n" + "\\n".join(rows) + "\\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", "--image-folder", dest="output_dir", required=True)
    parser.add_argument("--count", type=int, default=4)
    args, _unknown = parser.parse_known_args()
    root = Path(args.output_dir)
    root.mkdir(parents=True, exist_ok=True)
    for index in range(args.count):
        width = height = 48
        pixels = []
        cx = 16 + index * 4
        cy = 24
        for y in range(height):
            for x in range(width):
                base = 20 + random.randint(0, 8)
                bright = 190 if (x - cx) ** 2 + (y - cy) ** 2 < 90 else 0
                pixels.append(min(255, base + bright))
        write_pgm(root / f"synthetic_{index + 1}.pgm", width, height, pixels)
    print(f"generated {args.count} images in {root}")


if __name__ == "__main__":
    main()
`;
  }
  if (kind === "static_check") {
    return `#!/usr/bin/env python3
"""AAPS generated static project check script."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-dir", "--input-dir", dest="project_dir", default=".")
    parser.add_argument("--output-json", "--report-json", dest="output_json", required=True)
    args, _unknown = parser.parse_known_args()
    root = Path(args.project_dir)
    files = [path for path in root.rglob("*") if path.is_file() and ".git" not in path.parts and "node_modules" not in path.parts]
    report = {
        "ok": True,
        "project_dir": str(root),
        "file_count": len(files),
        "has_readme": any(path.name.lower().startswith("readme") for path in files),
        "has_package_json": any(path.name == "package.json" for path in files),
    }
    out = Path(args.output_json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
`;
  }
  return `#!/usr/bin/env python3
"""AAPS generated generic block script."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-json", "--output", dest="output_json", default="artifacts/aaps_generated_result.json")
    parser.add_argument("--message", default="generated by AAPS compiler")
    args, unknown = parser.parse_known_args()
    payload = {"ok": True, "message": args.message, "unknown_args": unknown}
    out = Path(args.output_json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\\n", encoding="utf-8")
    print(json.dumps(payload))


if __name__ == "__main__":
    main()
`;
}

function blockSourceFor(name) {
  const id = slug(name, "generated_block");
  const title = id.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  const kind = inferKind(id);
  const script = kind === "segment" ? "scripts/threshold_segment.py" : `scripts/${id}.py`;
  const outputName = kind === "segment" ? "mask_path" : kind === "qc" ? "qc_report" : "result_json";
  const outputType = kind === "segment" ? "image" : "json";
  const validation = kind === "segment"
    ? `      validate exists "\${output.mask_path}"
      validate mask_not_empty "\${output.mask_path}"`
    : `      validate json "\${output.${outputName}}"`;
  const args = kind === "segment"
    ? `      arg image_path = "\${input.image_path}"
      arg mask_path = "\${output.mask_path}"
      arg overlay_path = "\${run.artifacts}/${id}.overlay.pgm"
      arg report_json = "\${run.artifacts}/${id}.segmentation.json"`
    : kind === "qc"
      ? `      arg image_path = "\${input.image_path}"
      arg output_json = "\${output.qc_report}"`
      : `      arg output_json = "\${output.${outputName}}"`;
  return {
    file: `blocks/${id}.aaps`,
    script,
    source: `pipeline "${title} Block" {
  subtitle "Prompt Is All You Need"
  domain "generated"
  tags "compiler, generated"

  block ${id} {
    input image_path: image optional
    output ${outputName}: ${outputType} = "\${run.artifacts}/${id}.${outputType === "image" ? "pgm" : "json"}"
    environment python = "python3"
    requires_commands "python3"
    requires_files "${script}"
    compile_agent "codex_repair_agent"
    compile_prompt "Generated by the AAPS compiler because ${id} was referenced but not defined."
    exec python_script "${script}"
${args}
${validation}
    repair true
  }
}
`,
  };
}

function componentKey(item) {
  return `${item.type}:${item.name || item.path || item.expected || ""}:${item.block || ""}`;
}

function collectMissing({ ir, plan, readiness, requirements, registries, projectDir }) {
  const missing = [];
  (ir.unresolvedImports || []).forEach((item) => {
    missing.push({
      type: "missing_import",
      name: item.path,
      expected: item.path,
      sourceFile: item.sourceFile || "",
      reason: "Imported .aaps file is not present in the project file map.",
      safeAutoAction: "create prompt",
      requiresApproval: false,
    });
  });
  (ir.circularImports || []).forEach((item) => {
    missing.push({
      type: "circular_import",
      name: item.path || item.cycle || "import cycle",
      reason: "Import graph has a circular reference.",
      safeAutoAction: "none",
      requiresApproval: true,
    });
  });
  (plan.warnings || []).forEach((warning) => {
    const match = String(warning.message || "").match(/Call target not found:\s*([A-Za-z_][\w.-]*)/);
    if (match) {
      missing.push({
        type: "missing_block",
        name: match[1],
        block: match[1],
        action: "call",
        path: warning.path,
        reason: "Workflow calls a block/skill that is not defined or imported.",
        possibleGeneratedReplacement: `blocks/${slug(match[1])}.aaps`,
        safeAutoAction: "generate_block",
        requiresApproval: false,
      });
    } else {
      missing.push({
        type: "plan_warning",
        name: warning.message,
        path: warning.path,
        reason: warning.message,
        safeAutoAction: "prompt",
        requiresApproval: false,
      });
    }
  });
  (readiness.blocks || []).forEach((record) => {
    (record.checks || []).forEach((check) => {
      if (check.ok || check.deferred) return;
      const typeMap = {
        script: "missing_script",
        file: "missing_file",
        command: "missing_binary",
        tool: "missing_tool",
        agent: "missing_agent",
        python_package: "missing_python_package",
        node_package: "missing_node_package",
        gpu_contract: "gpu_contract_mismatch",
        input: "missing_input",
        output: "invalid_output_path",
      };
      missing.push({
        type: typeMap[check.kind] || `missing_${check.kind || "component"}`,
        name: check.name || check.path || record.id,
        block: record.id,
        action: "",
        expected: check.path || check.name || "",
        path: record.path,
        reason: check.message || "Readiness check failed.",
        possibleFallbacks: [],
        possibleGeneratedReplacement: ["script", "gpu_contract"].includes(check.kind) ? check.path || check.name : "",
        suggestedSetupCommand: setupSuggestionFor(check, projectDir, registries),
        safeAutoAction: check.kind === "script" ? "generate_script" : check.kind === "gpu_contract" ? "repair_script" : ["python_package", "command", "tool"].includes(check.kind) ? "setup_prompt" : "prompt",
        requiresApproval: ["python_package", "node_package", "command", "tool"].includes(check.kind),
        raw: check,
      });
    });
  });
  (requirements || []).forEach((check) => {
    if (check.ok) return;
    missing.push({
      type: check.kind === "command" ? "missing_binary" : check.kind === "file" ? "missing_file" : `missing_${check.kind}`,
      name: check.name,
      reason: "Pipeline-level requirement failed.",
      expected: check.name,
      suggestedSetupCommand: setupSuggestionFor(check, projectDir, registries),
      safeAutoAction: check.kind === "file" ? "generate_prompt" : "setup_prompt",
      requiresApproval: check.kind !== "file",
      raw: check,
    });
  });
  const seen = new Set();
  return missing.filter((item) => {
    const key = componentKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function setupSuggestionFor(check, projectDir, registries) {
  if (!check) return "";
  if (check.kind === "python_package") {
    const python = Runner.projectPython(null, registries);
    return `${python} -m pip install ${check.name}`;
  }
  if (check.kind === "node_package") return `npm install ${check.name}`;
  if (check.kind === "command") return `Install command '${check.name}' in the active project environment.`;
  if (check.kind === "tool") {
    const tool = (registries.tools || {})[check.name] || check.tool || {};
    return tool.install || tool.setup || `Register ${check.name} in tools/tool_registry.json or choose a fallback tool.`;
  }
  if (check.kind === "agent") return `Register ${check.name} in agents/agent_registry.json or use prompt-only handoff.`;
  if (check.kind === "script") return `Generate ${check.path || check.name} with AAPS compile --mode apply.`;
  if (check.kind === "gpu_contract") return `Repair ${check.path || check.name} with AAPS compile --mode apply so the implementation matches the GPU block contract.`;
  return check.message || "";
}

function agentPromptFor(missing, step, projectSummary) {
  const blockContract = step && step.contract ? step.contract : {};
  const verificationCommands = [
    step && step.sourceFile ? `aaps validate ${step.sourceFile} --project . --json` : "",
    step && step.sourceFile ? `aaps parse ${step.sourceFile} --project . --json` : "",
    step && step.sourceFile ? `aaps check ${step.sourceFile} --project . --json` : "",
  ].filter(Boolean);
  const implementationHint = missing.type === "gpu_contract_mismatch"
    ? [
        "The AAPS contract requires GPU execution, but the current implementation contradicts it.",
        "Do not remove or weaken `requires_gpu`. Repair the implementation so it detects GPU availability, requests GPU execution where available, records whether GPU was requested/available/used, and emits validation-friendly logs/artifacts.",
      ].join(" ")
    : "Implement or repair the smallest project-local component that satisfies the declared block contract.";
  return [
    `# AAPS Compile Request: ${missing.name}`,
    "",
    `Missing item type: ${missing.type}`,
    `Required by block: ${missing.block || "(workflow)"}`,
    `Plan path: ${missing.path || ""}`,
    `Expected path/command: ${missing.expected || missing.path || missing.name || ""}`,
    `Reason: ${missing.reason || ""}`,
    `Safe auto-action: ${missing.safeAutoAction || "prompt"}`,
    "",
    "## Project Summary",
    JSON.stringify(projectSummary, null, 2),
    "",
    "## Compile Objective",
    implementationHint,
    "",
    "The `.aaps` source is the contract. Do not make readiness pass by deleting inputs, outputs, validation rules, tool requirements, agent requirements, or hardware requirements. Repair the component beneath the contract unless the contract is clearly invalid, and if so explain the exact invalid field.",
    "",
    "Prefer Codex GPT-5.5 xhigh or an equivalent careful code agent for nontrivial code generation/repair. Generated code should be explicit, project-local, CLI-invocable, logged, and testable with a small representative input.",
    "",
    "## Required Implementation Shape",
    "- Use project-relative files and paths.",
    "- Prefer external scripts with explicit CLI arguments over hidden globals.",
    "- Write JSON/CSV/log/figure artifacts that match declared AAPS outputs.",
    "- Preserve existing user files; overwrite only the target file when the compile report says it is the failing component, and keep a backup if possible.",
    "- After editing, rerun AAPS parse/check commands and repair until readiness/validation is meaningful.",
    "",
    "## Safety Rules",
    "- Do not delete user files.",
    "- Do not install globally.",
    "- Prefer project-local scripts, requirements, registries, and prompts.",
    "- Ask for approval before downloads, package installation, credentials, or risky shell commands.",
    "",
    missing.suggestedSetupCommand ? `Suggested setup: ${missing.suggestedSetupCommand}` : "",
    step ? ["", "## Block Contract", JSON.stringify(blockContract, null, 2)].join("\n") : "",
    verificationCommands.length ? ["", "## Verification Commands", ...verificationCommands.map((command) => `- \`${command}\``)].join("\n") : "",
    "",
    "## Expected Agent Output",
    "- Files created or modified.",
    "- Commands run and their status.",
    "- Remaining readiness failures, if any.",
  ].filter(Boolean).join("\n");
}

function setupPromptFor(missing) {
  return [
    `# AAPS Setup Prompt: ${missing.name}`,
    "",
    `Type: ${missing.type}`,
    `Required by: ${missing.block || "(pipeline)"}`,
    `Reason: ${missing.reason || ""}`,
    "",
    missing.suggestedSetupCommand ? "## Suggested Project-Local Setup" : "## Suggested Setup",
    missing.suggestedSetupCommand || "Register or provide this component in the current AAPS project.",
    "",
    "Do not install globally or download external binaries unless the user explicitly approves the action.",
  ].join("\n");
}

function writePromptFiles(compileDir, missingComponents, plan, projectSummary) {
  const agentPrompts = [];
  const setupPrompts = [];
  const stepById = new Map((plan.steps || []).map((step) => [step.id, step]));
  missingComponents.forEach((missing, index) => {
    const base = `${String(index + 1).padStart(2, "0")}-${slug(missing.block || missing.name || missing.type)}`;
    const step = stepById.get(missing.block);
    const agentPrompt = agentPromptFor(missing, step, projectSummary);
    const agentFile = path.join(compileDir, "agent_prompts", `${base}.md`);
    fs.writeFileSync(agentFile, agentPrompt, "utf8");
    agentPrompts.push({ missing: missing.name, file: toProjectPath(path.relative(compileDir, agentFile)), prompt: agentPrompt });
    if (missing.suggestedSetupCommand || missing.requiresApproval) {
      const setupPrompt = setupPromptFor(missing);
      const setupFile = path.join(compileDir, "setup_prompts", `${base}.md`);
      fs.writeFileSync(setupFile, setupPrompt, "utf8");
      setupPrompts.push({ missing: missing.name, file: toProjectPath(path.relative(compileDir, setupFile)), prompt: setupPrompt });
    }
  });
  return { agentPrompts, setupPrompts };
}

function writeGenerated(projectDir, compileDir, mode, file, content, reason, metadata = {}) {
  const target = safeRelative(projectDir, file, "generated file");
  const rel = toProjectPath(path.relative(projectDir, target));
  const existed = fs.existsSync(target);
  const beforeHash = hashFile(target);
  const record = {
    file: rel,
    reason,
    mode,
    generatedAt: nowIso(),
    existed,
    hashBefore: beforeHash,
    hashAfter: "",
    written: false,
    backup: "",
    ...metadata,
  };
  const proposedFile = path.join(compileDir, "diffs", `${slug(rel)}.proposed`);
  ensureDir(path.dirname(proposedFile));
  fs.writeFileSync(proposedFile, content, "utf8");
  record.proposed = toProjectPath(path.relative(compileDir, proposedFile));
  if (!WRITE_MODES.has(mode)) return record;
  const allowOverwrite = Boolean(metadata.allowOverwrite);
  if (existed && mode !== "force" && !allowOverwrite) {
    record.skipped = "target exists; use --mode force to overwrite with backup";
    return record;
  }
  ensureDir(path.dirname(target));
  if (existed && (mode === "force" || allowOverwrite)) {
    const backup = `${target}.bak-${Date.now()}`;
    fs.copyFileSync(target, backup);
    record.backup = toProjectPath(path.relative(projectDir, backup));
  }
  fs.writeFileSync(target, content, "utf8");
  if (target.endsWith(".py") || target.endsWith(".sh")) fs.chmodSync(target, 0o755);
  record.written = true;
  record.hashAfter = hashFile(target);
  return record;
}

function repairGpuContractScriptSource(source) {
  let content = String(source || "");
  if (!/CellposeModel\s*\([^)]*gpu\s*=\s*False/i.test(content)) return null;
  let insertedGpuDetection = false;
  const exactLoadBlock = `    load_start = time.time()
    model = models.CellposeModel(gpu=False, pretrained_model="cpsam")
    model_load_sec = round(time.time() - load_start, 3)
`;
  if (content.includes(exactLoadBlock)) {
    content = content.replace(
      exactLoadBlock,
      `    gpu_requested = True
    gpu_available = False
    cuda_device = ""
    cuda_error = ""
    try:
        import torch

        gpu_available = bool(torch.cuda.is_available())
        cuda_device = torch.cuda.get_device_name(0) if gpu_available else ""
    except Exception as exc:
        cuda_error = f"{type(exc).__name__}: {exc}"
    gpu_used = bool(gpu_requested and gpu_available)

    load_start = time.time()
    model = models.CellposeModel(gpu=gpu_used, pretrained_model="cpsam")
    model_load_sec = round(time.time() - load_start, 3)
`
    );
    insertedGpuDetection = true;
  } else {
    content = content.replace(/CellposeModel\s*\(\s*gpu\s*=\s*False/i, "CellposeModel(gpu=True");
  }
  if (insertedGpuDetection && content.includes(`        "status": "not_run",`)) {
    content = content.replace(
      `        "status": "not_run",`,
      `        "status": "not_run",
        "gpu_requested": gpu_requested,
        "gpu_available": gpu_available,
        "gpu_used": gpu_used,
        "cuda_device": cuda_device,
        "cuda_error": cuda_error,`
    );
  }
  if (insertedGpuDetection && content.includes(`        "cellpose_model": "CellposeModel(pretrained_model='cpsam', gpu=False)",`)) {
    content = content.replace(
      `        "cellpose_model": "CellposeModel(pretrained_model='cpsam', gpu=False)",`,
      `        "cellpose_model": f"CellposeModel(pretrained_model='cpsam', gpu={gpu_used})",
        "gpu_requested": gpu_requested,
        "gpu_available": gpu_available,
        "gpu_used": gpu_used,
        "cuda_device": cuda_device,
        "cuda_error": cuda_error,`
    );
  } else {
    content = content.replace(/gpu=False/g, "gpu=True");
  }
  return content;
}

function repairGpuContractScript(projectDir, compileDir, mode, missing) {
  const file = missing.expected || missing.name;
  if (!file || /\$\{/.test(file)) return null;
  const target = safeRelative(projectDir, file, "gpu contract script");
  const repaired = repairGpuContractScriptSource(readTextIfExists(target));
  if (!repaired) return null;
  return writeGenerated(projectDir, compileDir, mode, file, repaired, `repair GPU contract mismatch in ${file}`, {
    kind: "script_repair",
    block: missing.block || "",
    agent: "aaps_internal_compiler",
    allowOverwrite: true,
  });
}

function ensureWorkflowImport(projectDir, compileDir, mode, loadedFile, blockFile, blockName) {
  if (!loadedFile || path.isAbsolute(loadedFile)) return null;
  let target;
  try {
    target = safeRelative(projectDir, loadedFile, "workflow file");
  } catch {
    return null;
  }
  if (!fs.existsSync(target)) return null;
  const source = fs.readFileSync(target, "utf8");
  const importLine = `  import block "${blockFile}" as ${slug(blockName)}`;
  if (source.includes(`"${blockFile}"`) || source.includes(`'${blockFile}'`)) return null;
  const replaced = source.replace(/(pipeline\s+["'][^"']+["']\s*\{\n)/, `$1${importLine}\n`);
  if (replaced === source) return null;
  return writeGenerated(
    projectDir,
    compileDir,
    mode,
    loadedFile,
    replaced,
    `import generated block ${blockName}`,
    { kind: "workflow_import", block: blockName, allowOverwrite: true }
  );
}

function updateRequirements(projectDir, compileDir, mode, missingComponents) {
  const packages = [...new Set(missingComponents.filter((item) => item.type === "missing_python_package").map((item) => item.name).filter(Boolean))];
  if (!packages.length) return null;
  const file = "environments/requirements.txt";
  const current = readTextIfExists(safeRelative(projectDir, file, "requirements file"));
  const existing = new Set(current.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  const additions = packages.filter((pkg) => !existing.has(pkg));
  if (!additions.length) return null;
  const content = `${current}${current && !current.endsWith("\n") ? "\n" : ""}${additions.join("\n")}\n`;
  return writeGenerated(projectDir, compileDir, mode, file, content, "declare missing Python packages", { kind: "requirements" });
}

function parentBlockId(pathText) {
  const match = String(pathText || "").match(/(?:^|\/)block:([^/]+)/);
  return match ? match[1] : "";
}

function forceScriptTargets(plan) {
  const targets = [];
  const seen = new Set();
  const stepsById = new Map((plan.steps || []).map((step) => [step.id, step]));
  (plan.steps || []).forEach((step) => {
    const parent = stepsById.get(parentBlockId(step.path)) || null;
    const compilePrompt = step.compile?.prompt || parent?.compile?.prompt || "";
    if (!compilePrompt) return;
    (step.actions || []).forEach((action) => {
      if (action.type !== "python_script" || !action.entry || /\$\{/.test(action.entry)) return;
      if (seen.has(action.entry)) return;
      seen.add(action.entry);
      targets.push({
        type: "force_script",
        name: action.entry,
        expected: action.entry,
        block: step.id,
        path: step.path,
        reason: "Force-regenerate script from block compile contract.",
        safeAutoAction: "generate_script",
        requiresApproval: false,
        raw: {
          action,
          step: {
            id: step.id,
            path: step.path,
            kind: step.kind,
            compile: step.compile,
            contract: step.contract,
          },
          parentBlock: parent ? {
            id: parent.id,
            path: parent.path,
            kind: parent.kind,
            compile: parent.compile,
            contract: parent.contract,
          } : null,
          compilePrompt,
        },
      });
    });
  });
  return targets;
}

function generateAssets({ projectDir, compileDir, mode, missingComponents, loadedFile, manualTarget, manualKind, plan }) {
  const generatedFiles = [];
  const modifiedFiles = [];
  const stepById = new Map(((plan && plan.steps) || []).map((step) => [step.id, step]));
  const manualMissing = manualTarget
    ? [{ type: manualKind === "script" ? "missing_script" : "missing_block", name: manualTarget, block: manualTarget, safeAutoAction: manualKind === "script" ? "generate_script" : "generate_block" }]
    : [];
  const targets = [
    ...missingComponents,
    ...manualMissing,
    ...(mode === "force" ? forceScriptTargets(plan || {}) : []),
  ];
  targets.forEach((missing) => {
    if (missing.type === "missing_block") {
      const block = blockSourceFor(missing.name);
      const blockRecord = writeGenerated(projectDir, compileDir, mode, block.file, block.source, `generate missing block ${missing.name}`, {
        kind: "block",
        block: missing.name,
        agent: "aaps_internal_compiler",
      });
      generatedFiles.push(blockRecord);
      const scriptKind = inferKind(missing.name, missing);
      const scriptRecord = writeGenerated(projectDir, compileDir, mode, block.script, pythonScriptFor(scriptKind), `generate script for ${missing.name}`, {
        kind: "script",
        block: missing.name,
        agent: "aaps_internal_compiler",
      });
      generatedFiles.push(scriptRecord);
      const importRecord = ensureWorkflowImport(projectDir, compileDir, mode, loadedFile, block.file, missing.name);
      if (importRecord) modifiedFiles.push(importRecord);
    }
    if (missing.type === "missing_script" || missing.type === "force_script") {
      const scriptFile = missing.expected || missing.name;
      if (!scriptFile || /\$\{/.test(scriptFile)) return;
      const step = stepById.get(missing.block);
      const context = {
        ...missing,
        step,
        contract: step && step.contract ? step.contract : {},
      };
      const scriptRecord = writeGenerated(projectDir, compileDir, mode, scriptFile, pythonScriptFor(inferKind(scriptFile, context)), `generate missing script ${scriptFile}`, {
        kind: "script",
        block: missing.block || "",
        agent: "aaps_internal_compiler",
      });
      generatedFiles.push(scriptRecord);
    }
    if (missing.type === "gpu_contract_mismatch" || missing.safeAutoAction === "repair_script") {
      const repairRecord = repairGpuContractScript(projectDir, compileDir, mode, missing);
      if (repairRecord) modifiedFiles.push(repairRecord);
    }
  });
  const requirementsRecord = updateRequirements(projectDir, compileDir, mode, missingComponents);
  if (requirementsRecord) modifiedFiles.push(requirementsRecord);
  return { generatedFiles, modifiedFiles };
}

function validateGeneratedFiles(projectDir, records) {
  return records
    .filter((record) => record.written && record.file.endsWith(".py"))
    .map((record) => {
      const full = safeRelative(projectDir, record.file, "generated script");
      const process = spawnSync("python3", ["-m", "py_compile", full], { cwd: projectDir, encoding: "utf8" });
      return {
        file: record.file,
        ok: process.status === 0,
        stdout: process.stdout || "",
        stderr: process.stderr || process.error?.message || "",
      };
    });
}

function hasReadyScriptForBlock(readiness, blockId) {
  if (!blockId) return false;
  const record = (readiness.blocks || []).find((item) => item.id === blockId);
  if (!record) return false;
  return (record.checks || []).some((check) => check.kind === "script" && check.ok);
}

function filterPostApplyMissing(missingComponents, readiness) {
  const remaining = [];
  const warnings = [];
  missingComponents.forEach((item) => {
    if (item.type === "missing_agent" && hasReadyScriptForBlock(readiness, item.block)) {
      warnings.push({
        ...item,
        warning: "compile_agent is not registered, but the block now has a generated script and can be compiled/run locally.",
      });
      return;
    }
    remaining.push(item);
  });
  return { remaining, warnings };
}

function loadContext(options) {
  const projectDir = path.resolve(options.project || ".");
  const manifest = Runner.readManifest(projectDir);
  const baseRegistries = Runner.loadRegistries(projectDir, manifest);
  const sourceOptions = {
    file: options.file,
    source: options.source,
  };
  let loaded;
  let ir;
  if ((options.manualTarget && !options.file && !options.source) && !(manifest && (manifest.activeFile || manifest.defaultMain))) {
    loaded = {
      file: "",
      source: `pipeline "Compiler Request" {\n  task compile_request {\n    call ${slug(options.manualTarget)}\n  }\n}\n`,
    };
    ir = AAPS.parseAAPS(loaded.source, { sourceFile: "compiler-request.aaps" });
  } else {
    loaded = Runner.loadSource(sourceOptions, projectDir, manifest);
    ir = Runner.parseLoaded(sourceOptions, projectDir, manifest, loaded);
  }
  const registries = Runner.mergeWorkflowRegistries(baseRegistries, ir);
  const plan = AAPS.buildExecutionPlan(ir, { project: manifest || null });
  const compileId = options.compileId || `${nowStamp()}_compile`;
  const compileDir = compileDirFor(projectDir, manifest, compileId);
  ensureDir(compileDir);
  ["agent_prompts", "setup_prompts", "diffs", "logs"].forEach((folder) => ensureDir(path.join(compileDir, folder)));
  const runtimeContext = Runner.contextFrom(ir, manifest, compileId, projectDir, compileDir, registries);
  runtimeContext["project.python"] = Runner.projectPython(manifest, registries);
  const readiness = Runner.buildReadiness(plan, projectDir, manifest, registries, runtimeContext);
  const requirements = Runner.checkRequirements(ir, projectDir);
  return {
    projectDir,
    manifest,
    registries,
    loaded,
    ir,
    plan,
    compileId,
    compileDir,
    runtimeContext,
    readiness,
    requirements,
    projectTree: collectProjectTree(projectDir),
  };
}

function compile(options = {}) {
  const mode = normalizeMode(options.mode);
  const startedAt = nowIso();
  const context = loadContext({ ...options, mode });
  const projectSummary = {
    name: context.manifest ? context.manifest.name : path.basename(context.projectDir),
    projectRoot: context.projectDir,
    activeFile: context.loaded.file,
    tools: Object.keys(context.registries.tools || {}),
    agents: Object.keys(context.registries.agents || {}),
    environment: context.registries.environment || {},
    fileCount: context.projectTree.length,
  };

  const missingComponents = collectMissing({
    ir: context.ir,
    plan: context.plan,
    readiness: context.readiness,
    requirements: context.requirements,
    registries: context.registries,
    projectDir: context.projectDir,
  });
  const prompts = writePromptFiles(context.compileDir, missingComponents, context.plan, projectSummary);
  const assets = generateAssets({
    projectDir: context.projectDir,
    compileDir: context.compileDir,
    mode,
    missingComponents,
    loadedFile: context.loaded.file,
    manualTarget: options.manualTarget,
    manualKind: options.manualKind,
    plan: context.plan,
  });
  const validation = validateGeneratedFiles(context.projectDir, [...assets.generatedFiles, ...assets.modifiedFiles]);

  let finalReadiness = context.readiness;
  let finalRequirements = context.requirements;
  let finalPlan = context.plan;
  let finalIr = context.ir;
  let finalMissingComponents = missingComponents;
  let postApplyWarnings = [];
  if (WRITE_MODES.has(mode)) {
    const refreshed = loadContext({ ...options, mode, compileId: context.compileId });
    finalPlan = refreshed.plan;
    finalIr = refreshed.ir;
    finalReadiness = refreshed.readiness;
    finalRequirements = refreshed.requirements;
    finalMissingComponents = collectMissing({
      ir: refreshed.ir,
      plan: refreshed.plan,
      readiness: refreshed.readiness,
      requirements: refreshed.requirements,
      registries: refreshed.registries,
      projectDir: refreshed.projectDir,
    });
    const filtered = filterPostApplyMissing(finalMissingComponents, finalReadiness);
    finalMissingComponents = filtered.remaining;
    postApplyWarnings = filtered.warnings;
    if (options.manualTarget) {
      const manualSlug = slug(options.manualTarget);
      const manualTargetExists = assets.generatedFiles.some((record) => record.file === options.manualTarget && (record.written || record.existed));
      if (manualTargetExists) {
        const kept = [];
        finalMissingComponents.forEach((item) => {
          if (item.type === "missing_block" && (item.name === manualSlug || item.block === manualSlug)) {
            postApplyWarnings.push({
              ...item,
              warning: "manual generation target was written; the synthetic compiler-request block is not a real project dependency.",
            });
            return;
          }
          kept.push(item);
        });
        finalMissingComponents = kept;
      }
    }
  }

  const generatedOk = validation.every((item) => item.ok);
  const ok = finalIr.diagnostics.length === 0 && generatedOk && finalMissingComponents.length === 0 && finalRequirements.every((item) => item.ok || item.kind === "file");
  const status = ok ? "compiled" : finalMissingComponents.length ? "missing_components" : finalIr.diagnostics.length ? "parse_failed" : "compiled_with_warnings";

  const resolvedIr = {
    ...finalIr,
    compile: {
      version: "aaps_compile/0.1",
      mode,
      status,
      missingComponents: finalMissingComponents,
      initialMissingComponents: missingComponents,
      generatedFiles: assets.generatedFiles,
      modifiedFiles: assets.modifiedFiles,
      postApplyWarnings,
      setupPrompts: prompts.setupPrompts.map((item) => item.file),
      agentPrompts: prompts.agentPrompts.map((item) => item.file),
    },
  };

  const report = {
    ok,
    version: "aaps_compile_report/0.1",
    mode,
    status,
    phase: {
      parse: finalIr.diagnostics.length ? "failed" : "ok",
      compile: finalMissingComponents.length ? "needs_resolution" : "ok",
      plan: finalPlan.warnings.length ? "warning" : "ok",
      execute: ok ? "ready" : "blocked",
    },
    project: projectSummary,
    file: context.loaded.file,
    compileId: context.compileId,
    compileDir: context.compileDir,
    missingComponents: finalMissingComponents,
    initialMissingComponents: missingComponents,
    generatedFiles: assets.generatedFiles,
    modifiedFiles: assets.modifiedFiles,
    setupSuggestions: finalMissingComponents.map((item) => item.suggestedSetupCommand).filter(Boolean),
    setupPrompts: prompts.setupPrompts,
    agentPrompts: prompts.agentPrompts,
    postApplyWarnings,
    validation,
    diagnostics: finalIr.diagnostics,
    readiness: finalReadiness,
    plan: {
      steps: finalPlan.steps.length,
      executableSteps: finalPlan.executableSteps,
      promptOnlySteps: finalPlan.promptOnlySteps,
      warnings: finalPlan.warnings,
    },
    startedAt,
    finishedAt: nowIso(),
  };

  writeJson(path.join(context.compileDir, "parsed_ir.json"), context.ir);
  writeJson(path.join(context.compileDir, "unresolved_ir.json"), context.ir);
  writeJson(path.join(context.compileDir, "resolved_ir.json"), resolvedIr);
  writeJson(path.join(context.compileDir, "execution_plan.json"), finalPlan);
  writeJson(path.join(context.compileDir, "block_readiness.json"), finalReadiness);
  writeJson(path.join(context.compileDir, "compile_report.json"), report);
  writeJson(path.join(context.compileDir, "missing_components.json"), finalMissingComponents);
  writeJson(path.join(context.compileDir, "initial_missing_components.json"), missingComponents);
  writeJson(path.join(context.compileDir, "post_apply_warnings.json"), postApplyWarnings);
  writeJson(path.join(context.compileDir, "generated_files.json"), assets.generatedFiles);
  writeJson(path.join(context.compileDir, "modified_files.json"), assets.modifiedFiles);
  fs.writeFileSync(
    path.join(context.compileDir, "logs", "compile.log"),
    [
      `AAPS compile ${context.compileId}`,
      `mode=${mode}`,
      `status=${status}`,
      `missing=${finalMissingComponents.length}`,
      `initial_missing=${missingComponents.length}`,
      `generated=${assets.generatedFiles.filter((item) => item.written).length}`,
      "",
    ].join("\n"),
    "utf8"
  );

  return report;
}

function parseArgs(argv) {
  const command = argv[2] || "help";
  const positional = [];
  const options = { project: ".", mode: "check" };
  for (let index = 3; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      positional.push(item);
      continue;
    }
    const key = item.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) options[key] = true;
    else {
      options[key] = next;
      index += 1;
    }
  }
  return { command, positional, options };
}

function usage() {
  return [
    "Usage:",
    "  aaps-compiler compile <file> --project . [--mode check|suggest|apply|interactive|force] [--json]",
    "  aaps-compiler compile-project --project . [--mode check|suggest|apply] [--json]",
    "  aaps-compiler missing <file> --project . [--json]",
    "  aaps-compiler generate-block <name> --project . [--mode apply] [--json]",
    "  aaps-compiler generate-script <name-or-path> --project . [--mode apply] [--json]",
    "  aaps-compiler prepare-setup <file> --project . [--json]",
  ].join("\n");
}

function printHuman(report) {
  console.log(`AAPS compile ${report.compileId}: ${report.status}`);
  console.log(`Project: ${report.project.name}`);
  console.log(`File: ${report.file || "(none)"}`);
  console.log(`Compile dir: ${report.compileDir}`);
  if (report.missingComponents.length) {
    console.log("Missing components:");
    report.missingComponents.forEach((item) => {
      console.log(`- ${item.type}: ${item.name}${item.block ? ` (block ${item.block})` : ""}`);
      if (item.suggestedSetupCommand) console.log(`  setup: ${item.suggestedSetupCommand}`);
    });
  }
  const written = [...report.generatedFiles, ...report.modifiedFiles].filter((item) => item.written);
  if (written.length) {
    console.log("Written files:");
    written.forEach((item) => console.log(`- ${item.file}`));
  }
}

function main() {
  const { command, positional, options } = parseArgs(process.argv);
  if (command === "help" || command === "-h" || command === "--help") {
    console.log(usage());
    return;
  }
  let report;
  if (command === "compile" || command === "missing" || command === "prepare-setup") {
    const file = positional[0] || options.file;
    if (!file && !options.source) throw new Error(`${command} requires a .aaps file or --source.`);
    report = compile({ ...options, file, mode: command === "missing" || command === "prepare-setup" ? "suggest" : options.mode });
    if (command === "missing") {
      const payload = { ok: report.missingComponents.length === 0, missingComponents: report.missingComponents, compileDir: report.compileDir };
      console.log(JSON.stringify(payload, null, 2));
      process.exit(payload.ok ? 0 : 1);
    }
    if (command === "prepare-setup") {
      const payload = { ok: true, setupPrompts: report.setupPrompts, setupSuggestions: report.setupSuggestions, compileDir: report.compileDir };
      console.log(JSON.stringify(payload, null, 2));
      return;
    }
  } else if (command === "compile-project") {
    report = compile({ ...options, mode: options.mode });
  } else if (command === "generate-block") {
    const target = positional[0];
    if (!target) throw new Error("generate-block requires a block name.");
    report = compile({ ...options, mode: options.mode || "apply", manualTarget: target, manualKind: "block" });
  } else if (command === "generate-script") {
    const target = positional[0];
    if (!target) throw new Error("generate-script requires a script name or path.");
    report = compile({ ...options, mode: options.mode || "apply", manualTarget: target, manualKind: "script" });
  } else {
    throw new Error(`Unknown command: ${command}\n\n${usage()}`);
  }
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printHuman(report);
  process.exit(report.ok ? 0 : 1);
}

module.exports = {
  blockSourceFor,
  collectMissing,
  compile,
  inferKind,
  pythonScriptFor,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({ ok: false, status: "failed", error: error.message }, null, 2));
    process.exit(1);
  }
}
