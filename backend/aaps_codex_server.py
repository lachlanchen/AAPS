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
SCHEMAS = {
    "response": ROOT / "schemas" / "aaps_response.schema.json",
    "aaps_edit": ROOT / "schemas" / "aaps_edit.schema.json",
}


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(handler: SimpleHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if not length:
        return {}
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))


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
- Keep prompts first-class.
- Prefer named tasks with dependencies and verify checks.
- Do not claim to commit, push, deploy, or execute commands.

Current AAPS source:
```aaps
{source}
```

User instruction:
{instruction}
"""


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
    parser.add_argument("--port", type=int, default=int(os.environ.get("AAPS_PORT", "8766")))
    args = parser.parse_args()

    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    print(f"AAPS Studio: http://{args.host}:{args.port}")
    print("API: /api/health, /api/aaps/edit, /api/codex/respond, /api/codex/jobs")
    ThreadingHTTPServer((args.host, args.port), AAPSHandler).serve_forever()


if __name__ == "__main__":
    main()
