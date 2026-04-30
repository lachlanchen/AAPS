#!/usr/bin/env python3
"""Local AAPS Studio server with a Codex wrapper API."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import threading
import time
import uuid
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[1]
STUDIO_DIR = ROOT / "studio"
RUNTIME_DIR = ROOT / "runtime" / "codex-jobs"
RUN_DIR = ROOT / "runtime" / "aaps-runs"
PROJECT_MANIFEST = "aaps.project.json"
SKIP_SCAN_DIRS = {".git", ".aaps-work", "node_modules", "vendor", "runtime", "__pycache__"}
TEXT_FILE_EXTENSIONS = {".aaps", ".py", ".sh", ".js", ".mjs", ".cjs", ".json", ".md", ".txt", ".yaml", ".yml", ".toml"}
SCRIPT_FILE_EXTENSIONS = {".py", ".sh", ".js", ".mjs", ".cjs"}
SCHEMAS = {
    "response": ROOT / "schemas" / "aaps_response.schema.json",
    "aaps_edit": ROOT / "schemas" / "aaps_edit.schema.json",
    "aaps_chat": ROOT / "schemas" / "aaps_chat.schema.json",
}


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(handler: SimpleHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if not length:
        return {}
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))


def safe_repo_path(value: str | None = ".") -> Path:
    text = str(value or ".").strip() or "."
    candidate = Path(text)
    if candidate.is_absolute() or text.startswith("~") or ".." in candidate.parts:
        raise ValueError(f"path must be relative to the AAPS repository: {text}")
    resolved = (ROOT / candidate).resolve()
    resolved.relative_to(ROOT)
    return resolved


def relative_to_project(project_dir: Path, file_name: str) -> Path:
    text = str(file_name or "").strip()
    candidate = Path(text)
    if not text or candidate.is_absolute() or text.startswith("~") or ".." in candidate.parts:
        raise ValueError(f"file must be project-relative: {text}")
    resolved = (project_dir / candidate).resolve()
    resolved.relative_to(project_dir.resolve())
    return resolved


def scan_aaps_files(project_dir: Path) -> list[str]:
    files: list[str] = []
    if not project_dir.exists():
        return files
    for current, dirnames, filenames in os.walk(project_dir):
        dirnames[:] = [name for name in dirnames if name not in SKIP_SCAN_DIRS]
        for filename in filenames:
            if filename.endswith(".aaps"):
                full = Path(current) / filename
                files.append(full.relative_to(project_dir).as_posix())
    return sorted(files)


def scan_project_files(project_dir: Path, extensions: set[str]) -> list[str]:
    files: list[str] = []
    if not project_dir.exists():
        return files
    for current, dirnames, filenames in os.walk(project_dir):
        dirnames[:] = [name for name in dirnames if name not in SKIP_SCAN_DIRS]
        for filename in filenames:
            full = Path(current) / filename
            if full.suffix.lower() in extensions:
                files.append(full.relative_to(project_dir).as_posix())
    return sorted(files)


def ensure_text_file(file_path: Path) -> None:
    if file_path.suffix.lower() not in TEXT_FILE_EXTENSIONS:
        raise ValueError(f"unsupported text file extension: {file_path.suffix}")


def slug(value: str, fallback: str = "block") -> str:
    text = "".join(char.lower() if char.isalnum() else "_" for char in str(value or fallback))
    text = "_".join(part for part in text.split("_") if part)
    return text[:48] or fallback


def default_aaps_source(kind: str, name: str) -> str:
    block_id = slug(name or kind)
    title = block_id.replace("_", " ").title()
    if kind == "block":
        return f'''pipeline "{title} Block" {{
  subtitle "Prompt Is All You Need"
  version "0.2"
  domain "general"
  goal "Reusable AAPS block."

  block {block_id} {{
    input item: artifact optional
    output result: json
    prompt "Describe the block behavior, executable actions, validation, and recovery."
  }}
}}
'''
    return f'''pipeline "{title}" {{
  subtitle "Prompt Is All You Need"
  version "0.2"
  domain "general"
  goal "AAPS workflow."

  task {block_id} {{
    prompt "Describe the workflow goal and add typed blocks."
  }}
}}
'''


def read_project(project_dir: Path) -> dict:
    manifest_path = project_dir / PROJECT_MANIFEST
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = {
            "schema": "aaps_project/0.1",
            "name": project_dir.name or "AAPS Project",
            "path": ".",
            "description": "AAPS project manifest.",
            "domain": "general",
            "tags": [],
            "defaultMain": "workflows/main.aaps",
            "activeFile": "workflows/main.aaps",
            "created": now_iso(),
            "updated": now_iso(),
            "paths": {
                "blocks": "blocks",
                "skills": "skills",
                "modules": "modules",
                "subworkflows": "subworkflows",
                "workflows": "workflows",
                "drafts": "drafts",
                "archives": "archive",
                "data": "data",
                "artifacts": "artifacts",
                "runs": "runs",
                "reports": "reports",
                "notes": "notes",
            },
            "dataFolders": ["data"],
            "artifactRoot": "artifacts",
            "runDatabase": "runs/aaps-runs.jsonl",
            "variables": {},
            "tools": [],
            "models": [],
            "notes": [],
            "files": {
                "blocks": [],
                "skills": [],
                "modules": [],
                "subworkflows": [],
                "workflows": ["workflows/main.aaps"],
                "drafts": [],
                "archives": [],
                "references": [],
            },
        }
    return {
        "manifest": manifest,
        "manifest_exists": manifest_path.exists(),
        "project_path": project_dir.relative_to(ROOT).as_posix() if project_dir != ROOT else ".",
        "files": scan_aaps_files(project_dir),
        "script_files": scan_project_files(project_dir, SCRIPT_FILE_EXTENSIONS),
        "text_files": scan_project_files(project_dir, TEXT_FILE_EXTENSIONS),
    }


def write_json(handler: SimpleHTTPRequestHandler, payload: dict, status: int = 200) -> None:
    body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "content-type")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def job_dir(job_id: str) -> Path:
    return RUNTIME_DIR / job_id


def write_job(job_id: str, payload: dict) -> None:
    folder = job_dir(job_id)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "job.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def read_job(job_id: str) -> dict | None:
    path = job_dir(job_id) / "job.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def run_dir(run_id: str) -> Path:
    return RUN_DIR / run_id


def write_run_record(run_id: str, payload: dict) -> None:
    folder = run_dir(run_id)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "api-run.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def read_run_record(run_id: str) -> dict | None:
    path = run_dir(run_id) / "api-run.json"
    if not path.exists():
        summary = run_dir(run_id) / "run.json"
        if summary.exists():
            return json.loads(summary.read_text(encoding="utf-8"))
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def codex_command(schema: str, output_path: Path) -> list[str]:
    model = os.environ.get("AAPS_CODEX_MODEL", "gpt-5.3-codex")
    reasoning = os.environ.get("AAPS_CODEX_REASONING", "medium")
    command = [
        "codex",
        "exec",
        "--ephemeral",
        "--model",
        model,
        "-c",
        f'model_reasoning_effort="{reasoning}"',
        "--cd",
        str(ROOT),
        "--output-last-message",
        str(output_path),
    ]
    schema_path = SCHEMAS.get(schema)
    if schema_path and schema_path.exists():
        command.extend(["--output-schema", str(schema_path)])
    if os.environ.get("AAPS_CODEX_BYPASS_SANDBOX") == "1":
        command.append("--dangerously-bypass-approvals-and-sandbox")
    command.append("-")
    return command


def build_edit_prompt(source: str, instruction: str) -> str:
    return f"""You are the AAPS Studio editing engine.

AAPS is Autonomous Agentic Pipeline Script. Edit only the AAPS source requested by the user.
Return JSON matching the schema with:
- source: the complete updated .aaps source
- summary: one concise sentence about the edit
- diagnostics: actionable issues, or an empty list

Rules:
- Preserve valid AAPS syntax.
- Keep prompts first-class, but require explicit inputs, outputs, verification, and artifacts for useful work.
- Prefer named agents, skills, tasks, stages, actions, methods, guards, if/else branches, and for_each loops.
- Use typed ports such as `input image: image = "path"` and `output mask: image = "runtime/mask.png"`.
- For segmentation/QC workflows, route through inspect -> choose method -> method action -> guard/QC -> quantify.
- Do not claim to commit, push, deploy, or execute commands.

Current AAPS source:
```aaps
{source}
```

User instruction:
{instruction}
"""


def build_chat_prompt(source: str, message: str, context: dict | None = None) -> str:
    context_payload = context or {}
    return f"""You are the AAPS Studio chat router.

Follow the LazyBlog Studio rule: chat may explain and remember, but source mutation must be an explicit bounded edit.

Return JSON matching the schema:
- mode: "reply" or "edit"
- route: short route label such as "explain", "edit_source", "create_skill", "create_task", "clarify"
- message: user-facing concise response
- source: complete updated .aaps source when mode is "edit"; otherwise the unchanged source
- diagnostics: parser or design issues, or []

AAPS v0.2 supports:
- `pipeline`, `agent`, `skill`, `task`, `stage`, `method`, `action`, `guard`, `choose`, `if`, `else`, `for_each`
- typed `input` and `output` ports
- `prompt`, `run`, `exec`, `arg`, `verify`, `call`, `param`, `metric`, and `policy`
- executable validation with `validate exists`, `validate nonempty`, and `validate json`
- runtime recovery with `retry`, `fallback`, `repair true`, `recover`, and `review`
- project-root relative `include` statements
- AAPS projects with `aaps.project.json` for blocks, skills, modules, subworkflows, workflows, drafts, archives, artifacts, and runs

Current source:
```aaps
{source}
```

Studio context:
```json
{json.dumps(context_payload, ensure_ascii=False, indent=2)}
```

User message:
{message}
"""


def generated_python_code(kind: str) -> str:
    if kind == "threshold":
        return '''#!/usr/bin/env python3
"""AAPS generated threshold segmentation helper.

Reads a portable graymap (P2) image, writes a binary P2 mask, and emits JSON metrics.
It intentionally uses only the Python standard library for local demos.
"""

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
    if len(pixels) != width * height:
        raise ValueError("pixel count does not match PGM dimensions")
    return width, height, max_value, pixels


def write_pgm(path: Path, width: int, height: int, max_value: int, pixels):
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = [" ".join(str(pixels[row * width + col]) for col in range(width)) for row in range(height)]
    path.write_text(f"P2\\n{width} {height}\\n{max_value}\\n" + "\\n".join(rows) + "\\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image-path", "--image", dest="image_path", required=True)
    parser.add_argument("--mask-path", "--output-mask", "--output", dest="mask_path", required=True)
    parser.add_argument("--report-json", "--output-json", dest="report_json", default="")
    parser.add_argument("--threshold", type=int, default=0)
    args, _ = parser.parse_known_args()

    width, height, max_value, pixels = read_pgm(Path(args.image_path))
    threshold = args.threshold or max(1, sum(pixels) // len(pixels))
    mask = [max_value if value >= threshold else 0 for value in pixels]
    write_pgm(Path(args.mask_path), width, height, max_value, mask)

    if args.report_json:
        selected = sum(1 for value in mask if value)
        report = {
            "threshold": threshold,
            "width": width,
            "height": height,
            "selected_pixels": selected,
            "selected_fraction": selected / float(width * height),
            "mask_path": args.mask_path,
        }
        Path(args.report_json).parent.mkdir(parents=True, exist_ok=True)
        Path(args.report_json).write_text(json.dumps(report, indent=2) + "\\n", encoding="utf-8")


if __name__ == "__main__":
    main()
'''
    if kind == "qc":
        return '''#!/usr/bin/env python3
"""AAPS generated lightweight image QC helper."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def read_numbers(path: Path):
    values = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if not line or line == "P2":
            continue
        values.extend(int(part) for part in line.split() if part.isdigit())
    return values[3:] if len(values) > 3 else values


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image-path", "--image", dest="image_path", required=True)
    parser.add_argument("--output-json", "--qc-report", dest="output_json", required=True)
    parser.add_argument("--preview-path", dest="preview_path", default="")
    args, _ = parser.parse_known_args()

    image = Path(args.image_path)
    if not image.exists():
        raise FileNotFoundError(args.image_path)
    values = read_numbers(image)
    mean = sum(values) / len(values) if values else 0
    report = {
        "image_path": args.image_path,
        "exists": True,
        "pixel_count": len(values),
        "mean_intensity": mean,
        "blur_score": "not_computed",
        "contrast_score": "simple",
        "route_hint": "threshold" if mean > 0 else "manual_review",
    }
    out = Path(args.output_json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\\n", encoding="utf-8")
    if args.preview_path:
        preview = Path(args.preview_path)
        preview.parent.mkdir(parents=True, exist_ok=True)
        preview.write_text(image.read_text(encoding="utf-8"), encoding="utf-8")


if __name__ == "__main__":
    main()
'''
    return '''#!/usr/bin/env python3
"""AAPS generated block helper."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-json", "--output", dest="output_json", default="artifacts/generated_result.json")
    parser.add_argument("--message", default="generated by AAPS block chat")
    args, unknown = parser.parse_known_args()
    payload = {
        "ok": True,
        "message": args.message,
        "unknown_args": unknown,
    }
    out = Path(args.output_json)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\\n", encoding="utf-8")


if __name__ == "__main__":
    main()
'''


def append_provenance(project_dir: Path, payload: dict) -> None:
    record = {"time": now_iso(), **payload}
    target = project_dir / "runs" / "code-provenance.jsonl"
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def build_block_chat_response(body: dict) -> dict:
    project_dir = safe_repo_path(str(body.get("path") or "."))
    block_id = slug(str(body.get("blockId") or body.get("block_id") or "block"))
    message = str(body.get("message") or "").strip()
    if not message:
        raise ValueError("message is required")

    lower = message.lower()
    if "shell" in lower or "command" in lower:
        command = "echo AAPS block action"
        if ":" in message:
            command = message.split(":", 1)[1].strip() or command
        return {
            "ok": True,
            "mode": "shell_action",
            "summary": f"Prepared shell action for {block_id}.",
            "action": {
                "type": "shell",
                "command": command,
                "entry": "",
                "args": {},
                "source": "block_chat",
            },
            "validations": [],
            "script": "",
        }

    inline = "inline" in lower
    kind = "threshold" if any(word in lower for word in ["segment", "segmentation", "threshold", "mask"]) else "qc" if "qc" in lower else "generic"
    script_rel = str(body.get("targetFile") or body.get("target_file") or f"scripts/{block_id}_{kind}.py")
    code = generated_python_code(kind)

    action: dict
    script_written = ""
    if inline:
        action = {
            "type": "python_inline",
            "command": "",
            "entry": "",
            "code": code,
            "args": {},
            "source": "block_chat",
        }
    else:
        script_path = relative_to_project(project_dir, script_rel)
        ensure_text_file(script_path)
        if script_path.suffix.lower() != ".py":
            raise ValueError("generated Python code must be saved to a .py file")
        script_path.parent.mkdir(parents=True, exist_ok=True)
        if script_path.exists():
            backup = script_path.with_suffix(script_path.suffix + f".bak-{int(time.time())}")
            script_path.rename(backup)
        script_path.write_text(code, encoding="utf-8")
        script_path.chmod(0o755)
        script_written = script_path.relative_to(project_dir).as_posix()
        action = {
            "type": "python_script",
            "command": "",
            "entry": script_written,
            "args": {},
            "source": "block_chat",
        }

    validations = []
    if kind == "threshold":
        action["args"] = {
            "image_path": "${input.image_path}",
            "mask_path": "${output.mask_path}",
            "report_json": "${run.artifacts}/segmentation_report.json",
        }
        validations = ["exists ${output.mask_path}", "json ${run.artifacts}/segmentation_report.json"]
    elif kind == "qc":
        action["args"] = {
            "image_path": "${input.image_path}",
            "output_json": "${output.qc_report}",
            "preview_path": "${run.artifacts}/qc_preview.pgm",
        }
        validations = ["json ${output.qc_report}", "exists ${run.artifacts}/qc_preview.pgm"]
    else:
        action["args"] = {"output_json": "${run.artifacts}/generated_result.json"}
        validations = ["json ${run.artifacts}/generated_result.json"]

    append_provenance(
        project_dir,
        {
            "block": block_id,
            "message": message,
            "target_file": script_written,
            "mode": "inline" if inline else "script",
            "action_type": action["type"],
        },
    )
    return {
        "ok": True,
        "mode": "python_inline" if inline else "python_script",
        "summary": f"Prepared {action['type']} action for {block_id}.",
        "action": action,
        "validations": validations,
        "script": script_written,
        "code": code,
    }


def build_generic_prompt(body: dict) -> str:
    prompt = str(body.get("prompt") or "").strip()
    input_payload = body.get("input", {})
    return f"""You are the AAPS agent wrapper.

Return a concise JSON response matching the requested schema.

Prompt:
{prompt}

Input:
```json
{json.dumps(input_payload, ensure_ascii=False, indent=2)}
```
"""


def run_codex(job_id: str, prompt: str, schema: str = "response") -> dict:
    folder = job_dir(job_id)
    folder.mkdir(parents=True, exist_ok=True)
    output_path = folder / "output.json"
    stdout_path = folder / "stdout.log"
    stderr_path = folder / "stderr.log"
    (folder / "prompt.txt").write_text(prompt, encoding="utf-8")

    if os.environ.get("AAPS_MOCK_CODEX") == "1":
        output = {
            "ok": True,
            "summary": "Mock Codex response generated.",
            "message": "Set AAPS_MOCK_CODEX=0 to call codex exec.",
        }
        output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
        return {"status": "succeeded", "result": output}

    if not shutil.which("codex"):
        return {
            "status": "failed",
            "error": "codex CLI was not found on PATH.",
        }

    timeout = int(os.environ.get("AAPS_CODEX_TIMEOUT", "240"))
    process = subprocess.run(
        codex_command(schema, output_path),
        input=prompt,
        text=True,
        cwd=ROOT,
        capture_output=True,
        timeout=timeout,
        check=False,
    )
    stdout_path.write_text(process.stdout or "", encoding="utf-8")
    stderr_path.write_text(process.stderr or "", encoding="utf-8")

    if output_path.exists():
        try:
            result = json.loads(output_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            result = {"message": output_path.read_text(encoding="utf-8")}
    else:
        result = {"message": process.stdout.strip()}

    if process.returncode != 0:
        return {
            "status": "failed",
            "error": process.stderr.strip() or f"codex exited with {process.returncode}",
            "result": result,
        }
    return {"status": "succeeded", "result": result}


def start_job(body: dict, schema: str = "response", prompt: str | None = None) -> dict:
    job_id = uuid.uuid4().hex[:16]
    folder = job_dir(job_id)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "input.json").write_text(json.dumps(body, ensure_ascii=False, indent=2), encoding="utf-8")
    record = {
        "id": job_id,
        "status": "running",
        "schema": schema,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "result": None,
        "error": "",
    }
    write_job(job_id, record)

    def worker() -> None:
        current = read_job(job_id) or record
        try:
            outcome = run_codex(job_id, prompt or build_generic_prompt(body), schema)
            current.update(
                {
                    "status": outcome["status"],
                    "updated_at": now_iso(),
                    "result": outcome.get("result"),
                    "error": outcome.get("error", ""),
                }
            )
        except Exception as exc:  # noqa: BLE001
            current.update({"status": "failed", "updated_at": now_iso(), "error": str(exc)})
        write_job(job_id, current)

    threading.Thread(target=worker, daemon=True).start()
    return record


def start_aaps_run(body: dict) -> dict:
    run_id = uuid.uuid4().hex[:16]
    folder = run_dir(run_id)
    folder.mkdir(parents=True, exist_ok=True)
    project_dir = safe_repo_path(str(body.get("path") or "."))
    project_arg = project_dir.relative_to(ROOT).as_posix() if project_dir != ROOT else "."
    dry_run = bool(body.get("dryRun") or body.get("dry_run"))
    block = str(body.get("block") or body.get("blockId") or "").strip()
    source = str(body.get("source") or "")
    file_name = str(body.get("file") or "").strip()
    source_path = ""
    if source:
        source_path = str(folder / "input.aaps")
        (folder / "input.aaps").write_text(source, encoding="utf-8")
    elif file_name:
        relative_to_project(project_dir, file_name)
    else:
        project = read_project(project_dir)["manifest"]
        file_name = str(project.get("activeFile") or project.get("defaultMain") or "")
        if file_name:
            relative_to_project(project_dir, file_name)

    record = {
        "id": run_id,
        "status": "running",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "project": project_arg,
        "file": file_name,
        "dryRun": dry_run,
        "block": block,
        "result": None,
        "error": "",
    }
    write_run_record(run_id, record)

    def worker() -> None:
        current = read_run_record(run_id) or record
        command = [
            "node",
            str(ROOT / "scripts" / "aaps-runner.js"),
            "run",
            "--project",
            project_arg,
            "--run-root",
            str(RUN_DIR),
            "--run-id",
            run_id,
            "--json",
        ]
        if source_path:
            command.extend(["--source", source_path])
        elif file_name:
            command.extend(["--file", file_name])
        if dry_run:
            command.append("--dry-run")
        if block:
            command.extend(["--block", block])
        try:
            process = subprocess.run(
                command,
                cwd=ROOT,
                text=True,
                capture_output=True,
                timeout=int(os.environ.get("AAPS_RUNTIME_TIMEOUT", "1800")),
                check=False,
            )
            (folder / "api-stdout.log").write_text(process.stdout or "", encoding="utf-8")
            (folder / "api-stderr.log").write_text(process.stderr or "", encoding="utf-8")
            try:
                result = json.loads(process.stdout)
            except json.JSONDecodeError:
                result = {"message": process.stdout.strip()}
            current.update(
                {
                    "status": "succeeded" if result.get("ok") else "failed",
                    "updated_at": now_iso(),
                    "result": result,
                    "error": process.stderr.strip() if process.returncode and not result.get("ok") else "",
                }
            )
        except Exception as exc:  # noqa: BLE001
            current.update({"status": "failed", "updated_at": now_iso(), "error": str(exc)})
        write_run_record(run_id, current)

    threading.Thread(target=worker, daemon=True).start()
    return record


class AAPSHandler(SimpleHTTPRequestHandler):
    server_version = "AAPSStudio/0.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STUDIO_DIR), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        if os.environ.get("AAPS_DEBUG_HTTP") == "1":
            super().log_message(fmt, *args)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            write_json(
                self,
                {
                    "ok": True,
                    "codex": bool(shutil.which("codex")),
                    "agintiflow_submodule": (ROOT / "vendor" / "AgInTiFlow").exists(),
                    "runtime": str(RUNTIME_DIR),
                },
            )
            return
        if parsed.path == "/api/aaps/project":
            try:
                project_dir = safe_repo_path(parse_qs(parsed.query).get("path", ["."])[0])
                write_json(self, read_project(project_dir))
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return
        if parsed.path == "/api/aaps/project/file":
            try:
                query = parse_qs(parsed.query)
                project_dir = safe_repo_path(query.get("path", ["."])[0])
                file_path = relative_to_project(project_dir, query.get("file", [""])[0])
                if not file_path.name.endswith(".aaps"):
                    write_json(self, {"error": "only .aaps files can be loaded"}, 400)
                    return
                if not file_path.exists():
                    write_json(self, {"error": "file not found"}, 404)
                    return
                write_json(
                    self,
                    {
                        "project_path": project_dir.relative_to(ROOT).as_posix() if project_dir != ROOT else ".",
                        "file": file_path.relative_to(project_dir).as_posix(),
                        "source": file_path.read_text(encoding="utf-8"),
                    },
                )
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return
        if parsed.path == "/api/aaps/project/text-file":
            try:
                query = parse_qs(parsed.query)
                project_dir = safe_repo_path(query.get("path", ["."])[0])
                file_path = relative_to_project(project_dir, query.get("file", [""])[0])
                ensure_text_file(file_path)
                if not file_path.exists():
                    write_json(self, {"error": "file not found"}, 404)
                    return
                write_json(
                    self,
                    {
                        "project_path": project_dir.relative_to(ROOT).as_posix() if project_dir != ROOT else ".",
                        "file": file_path.relative_to(project_dir).as_posix(),
                        "source": file_path.read_text(encoding="utf-8"),
                    },
                )
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return
        if parsed.path == "/api/codex/job":
            job_id = parse_qs(parsed.query).get("id", [""])[0]
            record = read_job(job_id)
            write_json(self, record or {"error": "job not found"}, 200 if record else 404)
            return
        if parsed.path == "/api/codex/result":
            job_id = parse_qs(parsed.query).get("id", [""])[0]
            record = read_job(job_id)
            if not record:
                write_json(self, {"error": "job not found"}, 404)
                return
            write_json(self, {"id": job_id, "status": record["status"], "result": record.get("result")})
            return
        if parsed.path == "/api/aaps/run":
            run_id = parse_qs(parsed.query).get("id", [""])[0]
            record = read_run_record(run_id)
            write_json(self, record or {"error": "run not found"}, 200 if record else 404)
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        try:
            body = read_json(self)
        except Exception as exc:  # noqa: BLE001
            write_json(self, {"error": f"invalid JSON: {exc}"}, 400)
            return

        parsed = urlparse(self.path)
        if parsed.path == "/api/aaps/edit":
            source = str(body.get("source") or "")
            instruction = str(body.get("instruction") or "").strip()
            if not instruction:
                write_json(self, {"error": "instruction is required"}, 400)
                return
            if os.environ.get("AAPS_MOCK_CODEX") == "1":
                write_json(
                    self,
                    {
                        "id": uuid.uuid4().hex[:16],
                        "status": "succeeded",
                        "result": {
                            "source": source,
                            "summary": "Mock Codex edit accepted; source left unchanged.",
                            "diagnostics": [],
                        },
                    },
                )
                return
            job_id = uuid.uuid4().hex[:16]
            prompt = build_edit_prompt(source, instruction)
            outcome = run_codex(job_id, prompt, "aaps_edit")
            status = 200 if outcome["status"] == "succeeded" else 500
            write_json(self, {"id": job_id, **outcome}, status)
            return

        if parsed.path == "/api/aaps/chat":
            source = str(body.get("source") or "")
            message = str(body.get("message") or body.get("instruction") or "").strip()
            context = body.get("context") if isinstance(body.get("context"), dict) else {}
            if not message:
                write_json(self, {"error": "message is required"}, 400)
                return
            if os.environ.get("AAPS_MOCK_CODEX") == "1":
                write_json(
                    self,
                    {
                        "id": uuid.uuid4().hex[:16],
                        "status": "succeeded",
                        "result": {
                            "mode": "reply",
                            "route": "mock",
                            "message": "Mock router accepted the message; source left unchanged.",
                            "source": source,
                            "diagnostics": [],
                        },
                    },
                )
                return
            job_id = uuid.uuid4().hex[:16]
            outcome = run_codex(job_id, build_chat_prompt(source, message, context), "aaps_chat")
            status = 200 if outcome["status"] == "succeeded" else 500
            write_json(self, {"id": job_id, **outcome}, status)
            return

        if parsed.path == "/api/aaps/project":
            try:
                project_dir = safe_repo_path(str(body.get("path") or "."))
                project_dir.mkdir(parents=True, exist_ok=True)
                manifest = body.get("manifest")
                if not isinstance(manifest, dict):
                    write_json(self, {"error": "manifest object is required"}, 400)
                    return
                manifest["updated"] = manifest.get("updated") or now_iso()
                manifest_path = project_dir / PROJECT_MANIFEST
                manifest_path.write_text(
                    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                write_json(self, read_project(project_dir))
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return

        if parsed.path == "/api/aaps/project/file":
            try:
                project_dir = safe_repo_path(str(body.get("path") or "."))
                file_name = str(body.get("file") or "").strip()
                source = str(body.get("source") or "")
                if not file_name.endswith(".aaps"):
                    write_json(self, {"error": "only .aaps files can be saved"}, 400)
                    return
                file_path = relative_to_project(project_dir, file_name)
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(source, encoding="utf-8")
                write_json(
                    self,
                    {
                        "ok": True,
                        "project_path": project_dir.relative_to(ROOT).as_posix() if project_dir != ROOT else ".",
                        "file": file_path.relative_to(project_dir).as_posix(),
                        "files": scan_aaps_files(project_dir),
                    },
                )
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return

        if parsed.path == "/api/aaps/project/text-file":
            try:
                project_dir = safe_repo_path(str(body.get("path") or "."))
                file_name = str(body.get("file") or "").strip()
                source = str(body.get("source") or "")
                file_path = relative_to_project(project_dir, file_name)
                ensure_text_file(file_path)
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(source, encoding="utf-8")
                write_json(
                    self,
                    {
                        "ok": True,
                        "project_path": project_dir.relative_to(ROOT).as_posix() if project_dir != ROOT else ".",
                        "file": file_path.relative_to(project_dir).as_posix(),
                        "files": scan_aaps_files(project_dir),
                        "script_files": scan_project_files(project_dir, SCRIPT_FILE_EXTENSIONS),
                        "text_files": scan_project_files(project_dir, TEXT_FILE_EXTENSIONS),
                    },
                )
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return

        if parsed.path == "/api/aaps/project/file-action":
            try:
                project_dir = safe_repo_path(str(body.get("path") or "."))
                action = str(body.get("action") or "").strip().lower()
                file_name = str(body.get("file") or "").strip()
                target_name = str(body.get("target") or "").strip()
                kind = str(body.get("kind") or "workflow").strip().lower()
                if not action:
                    write_json(self, {"error": "action is required"}, 400)
                    return
                if action == "create":
                    file_path = relative_to_project(project_dir, file_name)
                    if not file_path.name.endswith(".aaps"):
                        write_json(self, {"error": "created workflow files must end with .aaps"}, 400)
                        return
                    if file_path.exists():
                        write_json(self, {"error": "file already exists"}, 409)
                        return
                    file_path.parent.mkdir(parents=True, exist_ok=True)
                    file_path.write_text(default_aaps_source(kind, file_path.stem), encoding="utf-8")
                elif action == "duplicate":
                    file_path = relative_to_project(project_dir, file_name)
                    target_path = relative_to_project(project_dir, target_name)
                    if not file_path.exists():
                        write_json(self, {"error": "source file not found"}, 404)
                        return
                    if target_path.exists():
                        write_json(self, {"error": "target file already exists"}, 409)
                        return
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(file_path, target_path)
                elif action == "rename":
                    file_path = relative_to_project(project_dir, file_name)
                    target_path = relative_to_project(project_dir, target_name)
                    if not file_path.exists():
                        write_json(self, {"error": "source file not found"}, 404)
                        return
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    file_path.rename(target_path)
                elif action in {"archive", "delete"}:
                    file_path = relative_to_project(project_dir, file_name)
                    if not file_path.exists():
                        write_json(self, {"error": "source file not found"}, 404)
                        return
                    archive_root = project_dir / "archive"
                    archive_root.mkdir(parents=True, exist_ok=True)
                    archived = archive_root / f"{int(time.time())}-{file_path.name}"
                    file_path.rename(archived)
                else:
                    write_json(self, {"error": f"unknown file action: {action}"}, 400)
                    return
                write_json(self, read_project(project_dir))
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return

        if parsed.path == "/api/aaps/run":
            try:
                write_json(self, start_aaps_run(body), 202)
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return

        if parsed.path == "/api/aaps/block/chat":
            try:
                write_json(self, build_block_chat_response(body))
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return

        if parsed.path == "/api/codex/respond":
            schema = str(body.get("schema") or "response")
            job_id = uuid.uuid4().hex[:16]
            outcome = run_codex(job_id, build_generic_prompt(body), schema)
            status = 200 if outcome["status"] == "succeeded" else 500
            write_json(self, {"id": job_id, **outcome}, status)
            return

        if parsed.path == "/api/codex/jobs":
            schema = str(body.get("schema") or "response")
            write_json(self, start_job(body, schema), 202)
            return

        write_json(self, {"error": "not found"}, 404)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve AAPS Studio with Codex wrapper APIs.")
    parser.add_argument("--host", default=os.environ.get("AAPS_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("AAPS_PORT", "8796")))
    args = parser.parse_args()

    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    print(f"AAPS Studio: http://{args.host}:{args.port}")
    print("API: /api/health, /api/aaps/project, /api/aaps/project/file, /api/aaps/project/text-file, /api/aaps/block/chat, /api/aaps/run, /api/aaps/chat, /api/aaps/edit, /api/codex/respond, /api/codex/jobs")
    ThreadingHTTPServer((args.host, args.port), AAPSHandler).serve_forever()


if __name__ == "__main__":
    main()
