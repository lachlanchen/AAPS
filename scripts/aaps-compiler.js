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

function inferKind(name) {
  const text = String(name || "").toLowerCase();
  if (/segment|threshold|mask/.test(text)) return "segment";
  if (/qc|quality|inspect/.test(text)) return "qc";
  if (/quantif|measure|metric|object/.test(text)) return "quantify";
  if (/summar|batch|report/.test(text)) return "summarize";
  if (/generate|synthetic|demo/.test(text)) return "generate_images";
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
        possibleGeneratedReplacement: check.kind === "script" ? check.path || check.name : "",
        suggestedSetupCommand: setupSuggestionFor(check, projectDir, registries),
        safeAutoAction: check.kind === "script" ? "generate_script" : ["python_package", "command", "tool"].includes(check.kind) ? "setup_prompt" : "prompt",
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
  return check.message || "";
}

function agentPromptFor(missing, step, projectSummary) {
  return [
    `# AAPS Compile Request: ${missing.name}`,
    "",
    `Missing item type: ${missing.type}`,
    `Required by block: ${missing.block || "(workflow)"}`,
    `Plan path: ${missing.path || ""}`,
    `Expected path/command: ${missing.expected || missing.path || missing.name || ""}`,
    "",
    "## Project Summary",
    JSON.stringify(projectSummary, null, 2),
    "",
    "## Desired Result",
    "Create the smallest safe project-local implementation or setup plan that satisfies the block contract.",
    "",
    "## Safety Rules",
    "- Do not delete user files.",
    "- Do not install globally.",
    "- Prefer project-local scripts, requirements, registries, and prompts.",
    "- Ask for approval before downloads, package installation, credentials, or risky shell commands.",
    "",
    missing.suggestedSetupCommand ? `Suggested setup: ${missing.suggestedSetupCommand}` : "",
    step ? ["", "## Block Contract", JSON.stringify(step.contract || {}, null, 2)].join("\n") : "",
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

function generateAssets({ projectDir, compileDir, mode, missingComponents, loadedFile, manualTarget, manualKind }) {
  const generatedFiles = [];
  const modifiedFiles = [];
  const manualMissing = manualTarget
    ? [{ type: manualKind === "script" ? "missing_script" : "missing_block", name: manualTarget, block: manualTarget, safeAutoAction: manualKind === "script" ? "generate_script" : "generate_block" }]
    : [];
  const targets = [...missingComponents, ...manualMissing];
  targets.forEach((missing) => {
    if (missing.type === "missing_block") {
      const block = blockSourceFor(missing.name);
      const blockRecord = writeGenerated(projectDir, compileDir, mode, block.file, block.source, `generate missing block ${missing.name}`, {
        kind: "block",
        block: missing.name,
        agent: "aaps_internal_compiler",
      });
      generatedFiles.push(blockRecord);
      const scriptKind = inferKind(missing.name);
      const scriptRecord = writeGenerated(projectDir, compileDir, mode, block.script, pythonScriptFor(scriptKind), `generate script for ${missing.name}`, {
        kind: "script",
        block: missing.name,
        agent: "aaps_internal_compiler",
      });
      generatedFiles.push(scriptRecord);
      const importRecord = ensureWorkflowImport(projectDir, compileDir, mode, loadedFile, block.file, missing.name);
      if (importRecord) modifiedFiles.push(importRecord);
    }
    if (missing.type === "missing_script") {
      const scriptFile = missing.expected || missing.name;
      if (!scriptFile || /\$\{/.test(scriptFile)) return;
      const scriptRecord = writeGenerated(projectDir, compileDir, mode, scriptFile, pythonScriptFor(inferKind(scriptFile)), `generate missing script ${scriptFile}`, {
        kind: "script",
        block: missing.block || "",
        agent: "aaps_internal_compiler",
      });
      generatedFiles.push(scriptRecord);
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

function loadContext(options) {
  const projectDir = path.resolve(options.project || ".");
  const manifest = Runner.readManifest(projectDir);
  const registries = Runner.loadRegistries(projectDir, manifest);
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
  });
  const validation = validateGeneratedFiles(context.projectDir, [...assets.generatedFiles, ...assets.modifiedFiles]);

  const generatedOk = validation.every((item) => item.ok);
  const unresolvedAfterApply = mode === "apply" || mode === "force"
    ? missingComponents.filter((item) => !["missing_block", "missing_script", "missing_python_package"].includes(item.type))
    : missingComponents;
  const ok = context.ir.diagnostics.length === 0 && generatedOk && unresolvedAfterApply.length === 0 && context.requirements.every((item) => item.ok || item.kind === "file");
  const status = ok ? "compiled" : missingComponents.length ? "missing_components" : context.ir.diagnostics.length ? "parse_failed" : "compiled_with_warnings";

  const resolvedIr = {
    ...context.ir,
    compile: {
      version: "aaps_compile/0.1",
      mode,
      status,
      missingComponents,
      generatedFiles: assets.generatedFiles,
      modifiedFiles: assets.modifiedFiles,
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
      parse: context.ir.diagnostics.length ? "failed" : "ok",
      compile: missingComponents.length ? "needs_resolution" : "ok",
      plan: context.plan.warnings.length ? "warning" : "ok",
      execute: ok ? "ready" : "blocked",
    },
    project: projectSummary,
    file: context.loaded.file,
    compileId: context.compileId,
    compileDir: context.compileDir,
    missingComponents,
    generatedFiles: assets.generatedFiles,
    modifiedFiles: assets.modifiedFiles,
    setupSuggestions: missingComponents.map((item) => item.suggestedSetupCommand).filter(Boolean),
    setupPrompts: prompts.setupPrompts,
    agentPrompts: prompts.agentPrompts,
    validation,
    diagnostics: context.ir.diagnostics,
    readiness: context.readiness,
    plan: {
      steps: context.plan.steps.length,
      executableSteps: context.plan.executableSteps,
      promptOnlySteps: context.plan.promptOnlySteps,
      warnings: context.plan.warnings,
    },
    startedAt,
    finishedAt: nowIso(),
  };

  writeJson(path.join(context.compileDir, "parsed_ir.json"), context.ir);
  writeJson(path.join(context.compileDir, "unresolved_ir.json"), context.ir);
  writeJson(path.join(context.compileDir, "resolved_ir.json"), resolvedIr);
  writeJson(path.join(context.compileDir, "execution_plan.json"), context.plan);
  writeJson(path.join(context.compileDir, "block_readiness.json"), context.readiness);
  writeJson(path.join(context.compileDir, "compile_report.json"), report);
  writeJson(path.join(context.compileDir, "missing_components.json"), missingComponents);
  writeJson(path.join(context.compileDir, "generated_files.json"), assets.generatedFiles);
  writeJson(path.join(context.compileDir, "modified_files.json"), assets.modifiedFiles);
  fs.writeFileSync(
    path.join(context.compileDir, "logs", "compile.log"),
    [
      `AAPS compile ${context.compileId}`,
      `mode=${mode}`,
      `status=${status}`,
      `missing=${missingComponents.length}`,
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
