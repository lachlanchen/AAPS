#!/usr/bin/env python3
"""Local AAPS Studio server with a Codex wrapper API."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import shutil
import subprocess
import threading
import time
import urllib.error
import urllib.request
import uuid
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(os.environ.get("AAPS_STUDIO_PROJECT") or ROOT).expanduser().resolve()
STUDIO_DIR = ROOT / "studio"
if PROJECT_ROOT == ROOT:
    RUNTIME_DIR = ROOT / "runtime" / "codex-jobs"
    RUN_DIR = ROOT / "runtime" / "aaps-runs"
    COMPILE_DIR = ROOT / "runtime" / "aaps-compiles"
else:
    RUNTIME_DIR = PROJECT_ROOT / ".aaps-work" / "studio-codex-jobs"
    RUN_DIR = PROJECT_ROOT / ".aaps-work" / "studio-aaps-runs"
    COMPILE_DIR = PROJECT_ROOT / ".aaps-work" / "studio-aaps-compiles"
SETTINGS_PATH = PROJECT_ROOT / ".aaps-work" / "aaps-settings.json"
STUDIO_HISTORY_DIR = PROJECT_ROOT / ".aaps-work" / "studio-history"
STUDIO_ARTIFACT_DIR = PROJECT_ROOT / ".aaps-work" / "studio-artifacts"
STUDIO_VERSION_DIR = PROJECT_ROOT / ".aaps-work" / "versions"
PROJECT_MANIFEST = "aaps.project.json"
SKIP_SCAN_DIRS = {
    ".git",
    ".aaps-work",
    ".aginti",
    ".aginti-sessions",
    ".sessions",
    ".venv",
    "__pycache__",
    "data",
    "node_modules",
    "outputs",
    "runs",
    "runtime",
    "supervision-ledger",
    "vendor",
}
TEXT_FILE_EXTENSIONS = {".aaps", ".py", ".sh", ".js", ".mjs", ".cjs", ".json", ".md", ".txt", ".yaml", ".yml", ".toml"}
SCRIPT_FILE_EXTENSIONS = {".py", ".sh", ".js", ".mjs", ".cjs"}
ENVIRONMENT_FILE_EXTENSIONS = {".txt", ".json", ".yaml", ".yml"}
ARTIFACT_FILE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".webp",
    ".csv",
    ".tsv",
    ".json",
    ".jsonl",
    ".md",
    ".txt",
    ".log",
    ".html",
    ".pdf",
}
PROJECT_FILE_CATEGORIES = [
    "blocks",
    "skills",
    "modules",
    "subworkflows",
    "workflows",
    "drafts",
    "archives",
    "references",
]
SCHEMAS = {
    "response": ROOT / "schemas" / "aaps_response.schema.json",
    "aaps_edit": ROOT / "schemas" / "aaps_edit.schema.json",
    "aaps_chat": ROOT / "schemas" / "aaps_chat.schema.json",
}
DEFAULT_SETTINGS = {
    "agentProvider": "codex",
    "codexModel": "gpt-5.3-codex",
    "codexReasoning": "medium",
    "codexTimeout": 240,
    "deepseekBaseUrl": "https://api.deepseek.com",
    "deepseekModel": "deepseek-v4-pro",
    "deepseekTimeout": 180,
    "agintiProvider": "deepseek",
    "agintiSafety": "normal",
    "agintiSessionId": "",
    "agintiTimeout": 900,
    "agentContextPack": True,
    "autoCompileAfterChat": True,
    "autoSaveAgentEdits": True,
}


def load_dotenv() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_dotenv()


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def stamp() -> str:
    return time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())


def read_settings() -> dict:
    settings = dict(DEFAULT_SETTINGS)
    env_defaults = {
        "agentProvider": os.environ.get("AAPS_AGENT_PROVIDER"),
        "codexModel": os.environ.get("AAPS_CODEX_MODEL"),
        "codexReasoning": os.environ.get("AAPS_CODEX_REASONING"),
        "deepseekBaseUrl": os.environ.get("AAPS_DEEPSEEK_BASE_URL"),
        "deepseekModel": os.environ.get("AAPS_DEEPSEEK_MODEL"),
        "agintiProvider": os.environ.get("AAPS_AGINTI_PROVIDER"),
        "agintiSafety": os.environ.get("AAPS_AGINTI_SAFETY"),
        "agintiSessionId": os.environ.get("AAPS_AGINTI_SESSION_ID"),
    }
    settings.update({key: value for key, value in env_defaults.items() if value})
    if SETTINGS_PATH.exists():
        try:
            loaded = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                settings.update({key: value for key, value in loaded.items() if key in DEFAULT_SETTINGS})
        except json.JSONDecodeError:
            pass
    if settings.get("agentProvider") not in {"codex", "deepseek", "aginti"}:
        settings["agentProvider"] = "codex"
    if settings.get("codexReasoning") not in {"low", "medium", "high", "xhigh"}:
        settings["codexReasoning"] = "medium"
    if settings.get("agintiSafety") not in {"safe", "normal", "danger"}:
        settings["agintiSafety"] = "normal"
    return settings


def public_settings() -> dict:
    settings = read_settings()
    settings["codexAvailable"] = bool(shutil.which("codex"))
    settings["deepseekKeyAvailable"] = bool(os.environ.get("AAPS_DEEPSEEK_API_KEY") or os.environ.get("DEEPSEEK_API_KEY"))
    settings["openaiKeyAvailable"] = bool(os.environ.get("OPENAI_API_KEY"))
    settings["agintiflowAvailable"] = bool(shutil.which("aginti")) or (ROOT / "vendor" / "AgInTiFlow").exists()
    return settings


def write_settings(payload: dict) -> dict:
    settings = read_settings()
    allowed_provider = {"codex", "deepseek", "aginti"}
    text_fields = [
        "codexModel",
        "codexReasoning",
        "deepseekBaseUrl",
        "deepseekModel",
        "agintiProvider",
        "agintiSafety",
        "agintiSessionId",
    ]
    for key in text_fields:
        if key in payload:
            settings[key] = str(payload.get(key) or DEFAULT_SETTINGS[key]).strip() or DEFAULT_SETTINGS[key]
    if "agentProvider" in payload:
        provider = str(payload.get("agentProvider") or "codex").strip().lower()
        settings["agentProvider"] = provider if provider in allowed_provider else "codex"
    if "autoCompileAfterChat" in payload:
        settings["autoCompileAfterChat"] = bool(payload.get("autoCompileAfterChat"))
    if "autoSaveAgentEdits" in payload:
        settings["autoSaveAgentEdits"] = bool(payload.get("autoSaveAgentEdits"))
    if "agentContextPack" in payload:
        settings["agentContextPack"] = bool(payload.get("agentContextPack"))
    if settings.get("agintiSafety") not in {"safe", "normal", "danger"}:
        settings["agintiSafety"] = "normal"
    for key in ["codexTimeout", "deepseekTimeout", "agintiTimeout"]:
        if key in payload:
            try:
                settings[key] = max(10, int(payload.get(key)))
            except (TypeError, ValueError):
                settings[key] = DEFAULT_SETTINGS[key]
    SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_PATH.write_text(json.dumps({key: settings[key] for key in DEFAULT_SETTINGS}, indent=2) + "\n", encoding="utf-8")
    return public_settings()


def persist_runtime_settings(updates: dict) -> None:
    settings = read_settings()
    for key, value in updates.items():
        if key in DEFAULT_SETTINGS:
            settings[key] = value
    SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_PATH.write_text(json.dumps({key: settings[key] for key in DEFAULT_SETTINGS}, indent=2) + "\n", encoding="utf-8")


def read_json(handler: SimpleHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if not length:
        return {}
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8"))


def project_label(project_dir: Path) -> str:
    resolved = project_dir.resolve()
    if resolved == PROJECT_ROOT:
        return "."
    try:
        return resolved.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return str(resolved)


def project_arg(project_dir: Path) -> str:
    resolved = project_dir.resolve()
    if resolved == PROJECT_ROOT:
        return str(PROJECT_ROOT)
    return str(resolved)


def safe_repo_path(value: str | None = ".") -> Path:
    text = str(value or ".").strip() or "."
    candidate = Path(text)
    if text.startswith("~") or ".." in candidate.parts:
        raise ValueError(f"path must stay inside the AAPS Studio project: {text}")
    resolved = candidate.resolve() if candidate.is_absolute() else (PROJECT_ROOT / candidate).resolve()
    resolved.relative_to(PROJECT_ROOT)
    return resolved


def relative_to_project(project_dir: Path, file_name: str) -> Path:
    text = str(file_name or "").strip()
    candidate = Path(text)
    if not text or candidate.is_absolute() or text.startswith("~") or ".." in candidate.parts:
        raise ValueError(f"file must be project-relative: {text}")
    resolved = (project_dir / candidate).resolve()
    resolved.relative_to(project_dir.resolve())
    return resolved


def is_relative_to(path_value: Path, root: Path) -> bool:
    try:
        path_value.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


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


def json_safe(value):
    try:
        json.dumps(value)
        return value
    except TypeError:
        return str(value)


def studio_scope_path(root: Path, scope: str, scope_id: str, suffix: str = ".jsonl") -> Path:
    safe_scope = slug(scope, "scope")
    safe_id = slug(scope_id, "item")
    return root / safe_scope / f"{safe_id}{suffix}"


def append_jsonl(path: Path, payload: dict) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
    return path


def write_studio_chat_event(project_dir: Path, scope: str, scope_id: str, message: str, response: dict, metadata: dict | None = None) -> tuple[str, str]:
    event = {
        "time": now_iso(),
        "project": project_label(project_dir),
        "scope": scope,
        "scope_id": scope_id,
        "message": message,
        "response": json_safe(response),
        "metadata": metadata or {},
    }
    history_path = append_jsonl(studio_scope_path(STUDIO_HISTORY_DIR, scope, scope_id), event)
    artifact_path = STUDIO_ARTIFACT_DIR / slug(scope, "scope") / slug(scope_id, "item") / f"{stamp()}-{uuid.uuid4().hex[:8]}.json"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(json.dumps(event, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return history_path.relative_to(project_dir).as_posix(), artifact_path.relative_to(project_dir).as_posix()


def snapshot_file(project_dir: Path, file_path: Path, action: str) -> str:
    if not file_path.exists() or not file_path.is_file():
        return ""
    rel = file_path.relative_to(project_dir).as_posix()
    snapshot = STUDIO_VERSION_DIR / rel / f"{stamp()}-{uuid.uuid4().hex[:8]}.bak"
    snapshot.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(file_path, snapshot)
    append_jsonl(
        STUDIO_VERSION_DIR / "index.jsonl",
        {
            "time": now_iso(),
            "action": action,
            "file": rel,
            "snapshot": snapshot.relative_to(project_dir).as_posix(),
        },
    )
    return snapshot.relative_to(project_dir).as_posix()


def write_project_text(project_dir: Path, file_path: Path, source: str, action: str) -> str:
    snapshot = snapshot_file(project_dir, file_path, action)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(source, encoding="utf-8")
    return snapshot


def ensure_manifest_files(manifest: dict) -> dict:
    files = manifest.get("files")
    if not isinstance(files, dict):
        files = {}
    for category in PROJECT_FILE_CATEGORIES:
        value = files.get(category)
        files[category] = [str(item) for item in value] if isinstance(value, list) else []
    manifest["files"] = files
    return files


def manifest_category_for_file(file_name: str, kind: str = "workflow") -> str:
    text = str(file_name or "")
    if text.startswith("blocks/") or kind == "block":
        return "blocks"
    if text.startswith("skills/") or kind == "skill":
        return "skills"
    if text.startswith("modules/") or kind == "module":
        return "modules"
    if text.startswith("subworkflows/") or kind == "subworkflow":
        return "subworkflows"
    if text.startswith("archive/") or text.startswith("archives/"):
        return "archives"
    if text.startswith("drafts/") or kind == "draft":
        return "drafts"
    return "workflows"


def update_manifest_file_listing(project_dir: Path, action: str, file_name: str, target_name: str = "", kind: str = "workflow") -> str:
    manifest_path = project_dir / PROJECT_MANIFEST
    if not manifest_path.exists():
        return ""
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    files = ensure_manifest_files(manifest)
    changed = False

    def remove_from_all(name: str) -> None:
        nonlocal changed
        if not name:
            return
        for category in PROJECT_FILE_CATEGORIES:
            before = list(files.get(category) or [])
            after = [item for item in before if item != name]
            if after != before:
                files[category] = after
                changed = True

    def add_to_category(name: str, category: str) -> None:
        nonlocal changed
        if not name:
            return
        values = list(files.get(category) or [])
        if name not in values:
            values.append(name)
            files[category] = sorted(values)
            changed = True

    category = manifest_category_for_file(target_name or file_name, kind)
    if action == "create":
        add_to_category(file_name, category)
        if category == "workflows":
            manifest["activeFile"] = file_name
            if not manifest.get("defaultMain"):
                manifest["defaultMain"] = file_name
            changed = True
    elif action == "duplicate":
        target_category = manifest_category_for_file(target_name, kind)
        add_to_category(target_name, target_category)
        if target_category == "workflows":
            manifest["activeFile"] = target_name
            changed = True
    elif action == "rename":
        remove_from_all(file_name)
        target_category = manifest_category_for_file(target_name, kind)
        add_to_category(target_name, target_category)
        if manifest.get("activeFile") == file_name:
            manifest["activeFile"] = target_name if target_category == "workflows" else ""
            changed = True
        if manifest.get("defaultMain") == file_name:
            manifest["defaultMain"] = target_name if target_category == "workflows" else ""
            changed = True
    elif action in {"archive", "delete"}:
        remove_from_all(file_name)
        if action == "archive" and target_name:
            add_to_category(target_name, "archives")
        if manifest.get("activeFile") == file_name:
            manifest["activeFile"] = (files.get("workflows") or [manifest.get("defaultMain", "")])[0] if (files.get("workflows") or [manifest.get("defaultMain", "")]) else ""
            changed = True
        if manifest.get("defaultMain") == file_name:
            manifest["defaultMain"] = (files.get("workflows") or [manifest.get("activeFile", "")])[0] if (files.get("workflows") or [manifest.get("activeFile", "")]) else ""
            changed = True
    if not changed:
        return ""
    manifest["updated"] = now_iso()
    return write_project_text(
        project_dir,
        manifest_path,
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        f"project_manifest_{action}_file_listing",
    )


def aaps_literal(value: str) -> str:
    return json.dumps(str(value or ""), ensure_ascii=False)


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


def starter_project_manifest(project_dir: Path, name: str, domain: str, goal: str) -> dict:
    project_path = project_label(project_dir)
    return {
        "schema": "aaps_project/0.1",
        "name": name,
        "path": project_path,
        "description": goal or f"{name} AAPS workspace.",
        "domain": domain or "general",
        "tags": [domain or "general", "starter"],
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
            "environments": "environments",
            "tools": "tools",
            "agents": "agents",
        },
        "dataFolders": ["data"],
        "artifactRoot": "artifacts",
        "runDatabase": "runs/aaps-runs.jsonl",
        "variables": {"goal": goal},
        "tools": ["python3", "aaps_compiler", "noop"],
        "models": ["codex", "deepseek-v4-pro"],
        "agents": ["codex_repair_agent", "deepseek_v4_pro_prompt_agent"],
        "notes": [
            "Use this project as one topic workspace with many workflows, reusable blocks, scripts, tools, and agents.",
            "Codex is the default backend agent. DeepSeek v4 pro is available when selected in Studio settings.",
        ],
        "safety": {
            "defaultBackendAgent": "codex",
            "allowGlobalInstalls": False,
            "requireApprovalForShell": True,
            "preferProjectLocalEnvironment": True,
        },
        "execution": {
            "defaultMode": "dry-run",
            "runCommand": "aaps run workflows/main.aaps --project . --json",
            "tmuxHint": f"tmux new-session -d -s aaps-{slug(name)} 'aaps run workflows/main.aaps --project . --json'",
        },
        "files": {
            "blocks": [
                "blocks/define_goal.aaps",
                "blocks/plan_workflow.aaps",
                "blocks/write_status.aaps",
            ],
            "skills": [],
            "modules": [],
            "subworkflows": [],
            "workflows": ["workflows/main.aaps"],
            "drafts": [],
            "archives": [],
            "references": [],
        },
    }


def starter_block_source(block_id: str, project_name: str, goal: str) -> str:
    if block_id == "define_goal":
        goal_value = aaps_literal(goal)
        return f'''pipeline "Define Goal Block" {{
  subtitle "Prompt Is All You Need"
  version "0.3"
  domain "general"
  goal "Clarify the project goal and convert it into an auditable AAPS brief."

  block define_goal {{
    input project_goal: text required = {goal_value}
    compile_agent "codex_repair_agent"
    prompt """
Clarify the project topic, desired outputs, reusable blocks, tools, agents, and first runnable workflow.
Keep the result short enough to guide a compile pass.
"""
    exec noop "document goal"
    validate "goal brief is reviewable"
    review "Approve or edit the project goal before expanding the workflow."
  }}
}}
'''
    if block_id == "plan_workflow":
        return '''pipeline "Plan Workflow Block" {
  subtitle "Prompt Is All You Need"
  version "0.3"
  domain "general"
  goal "Turn a project goal into a runnable workflow plan."

  block plan_workflow {
    input project_goal: text optional
    required_agent "codex_repair_agent"
    required_agent "deepseek_v4_pro_prompt_agent"
    compile_agent "codex_repair_agent"
    compile_prompt "Create missing blocks, scripts, requirements, setup prompts, and tests from the approved project goal."
    prompt """
Design small functional blocks with typed inputs, typed outputs, executable actions, validation, recovery, and artifacts.
Prefer local scripts first; prepare agent prompts when external APIs or risky setup are required.
"""
    exec agent "codex_repair_agent"
    validate "workflow plan lists blocks, scripts, tools, agents, and checks"
  }
}
'''
    return '''pipeline "Write Status Block" {
  subtitle "Prompt Is All You Need"
  version "0.3"
  domain "general"
  goal "Minimal executable starter block for a new AAPS project."

  block write_status {
    input message: text optional = "AAPS starter project is ready"
    output status_json: json = "${run.artifacts}/starter_status.json"
    environment python = "python3"
    required_tool "python3"
    required_file "scripts/write_status.py"
    compile_agent "codex_repair_agent"
    exec python_script "scripts/write_status.py"
    arg message = "${input.message}"
    arg output_json = "${output.status_json}"
    validate "json ${output.status_json}"
    repair true
    recover "Prepare a Codex repair prompt if the script fails."
  }
}
'''


def starter_workflow_source(name: str, domain: str, goal: str) -> str:
    title = aaps_literal(f"{name} Starter Workflow")
    domain_value = aaps_literal(domain or "general")
    goal_value = aaps_literal(goal or "Create a runnable AAPS workflow from this project topic.")
    input_goal = aaps_literal(goal or "Describe the project goal here.")
    return f'''pipeline {title} {{
  subtitle "Prompt Is All You Need"
  version "0.3"
  domain {domain_value}
  tags "starter, project, compile"
  goal {goal_value}
  artifact_dir "artifacts"
  database "runs/aaps-runs.jsonl"
  execution_mode "dry-run-first"
  requires_agents "codex_repair_agent, deepseek_v4_pro_prompt_agent"

  import block "blocks/define_goal.aaps" as define_goal
  import block "blocks/plan_workflow.aaps" as plan_workflow
  import block "blocks/write_status.aaps" as write_status

  input goal: text = {input_goal}
  output status_json: json = "${{run.artifacts}}/starter_status.json"

  task project_start {{
    prompt "Review the project goal, prepare reusable blocks, then compile missing scripts and prompts."
    call define_goal
    call plan_workflow
    call write_status
    verify "The starter workflow parses, compiles, and can dry-run locally."
  }}
}}
'''


def starter_status_script() -> str:
    return '''#!/usr/bin/env python3
"""Write a small JSON status artifact for an AAPS starter project."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--message", default="AAPS starter project is ready")
    parser.add_argument("--output-json", "--output_json", dest="output_json", required=True)
    args, _ = parser.parse_known_args()
    output = Path(args.output_json)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(
            {
                "ok": True,
                "message": args.message,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "next_steps": [
                    "Edit workflows/main.aaps",
                    "Use block chat to generate scripts",
                    "Run a compile check before execution",
                ],
            },
            indent=2,
        )
        + "\\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
'''


def create_starter_project(body: dict) -> dict:
    project_dir = safe_repo_path(str(body.get("path") or "projects/new-aaps-project"))
    name = str(body.get("name") or project_dir.name.replace("-", " ").replace("_", " ").title() or "AAPS Project").strip()
    domain = str(body.get("domain") or "general").strip() or "general"
    goal = str(body.get("goal") or "Create a practical AAPS workflow with reusable blocks and safe execution.").strip()
    overwrite = bool(body.get("overwrite"))

    for folder in [
        "blocks",
        "skills",
        "workflows",
        "scripts",
        "environments",
        "tools",
        "agents",
        "data",
        "artifacts",
        "runs",
        "reports",
        "notes",
        "archive",
    ]:
        (project_dir / folder).mkdir(parents=True, exist_ok=True)

    writes: dict[str, str] = {
        PROJECT_MANIFEST: json.dumps(starter_project_manifest(project_dir, name, domain, goal), ensure_ascii=False, indent=2) + "\n",
        "blocks/define_goal.aaps": starter_block_source("define_goal", name, goal),
        "blocks/plan_workflow.aaps": starter_block_source("plan_workflow", name, goal),
        "blocks/write_status.aaps": starter_block_source("write_status", name, goal),
        "workflows/main.aaps": starter_workflow_source(name, domain, goal),
        "scripts/write_status.py": starter_status_script(),
        "environments/requirements.txt": "# Add project-local Python packages here.\n",
        "environments/aaps_environment.json": json.dumps(
            {
                "python": "python3",
                "requirements": [],
                "commands": ["python3"],
                "nodePackages": [],
                "setup": [
                    "python3 -m venv .venv",
                    ".venv/bin/python -m pip install -r environments/requirements.txt",
                ],
            },
            indent=2,
        )
        + "\n",
        "tools/tool_registry.json": json.dumps(
            {
                "tools": [
                    {"name": "python3", "type": "system_command", "command": "python3", "supportedBlockTypes": ["python_script", "python_inline"]},
                    {"name": "aaps_compiler", "type": "internal", "command": "aaps compile", "supportedBlockTypes": ["compile"]},
                    {"name": "noop", "type": "internal", "command": "noop", "supportedBlockTypes": ["manual", "documentation"]},
                ]
            },
            indent=2,
        )
        + "\n",
        "agents/agent_registry.json": json.dumps(
            {
                "agents": [
                    {
                        "name": "codex_repair_agent",
                        "purpose": "Default code authoring, compile, and repair agent for AAPS Studio.",
                        "invocation": "codex_wrapper",
                        "supportedTasks": ["code_authoring", "compile", "repair", "setup_prompt"],
                        "safety": ["project-local edits only", "ask before risky shell commands", "no secrets in logs"],
                        "fallback": "prepare prompt",
                    },
                    {
                        "name": "deepseek_v4_pro_prompt_agent",
                        "purpose": "Prompt-compatible planning and drafting agent when DeepSeek is selected in settings.",
                        "invocation": "openai_compatible",
                        "baseUrl": "https://api.deepseek.com",
                        "model": "deepseek-v4-pro",
                        "supportedTasks": ["planning", "summarization", "compile_prompt"],
                        "fallback": "codex_repair_agent",
                    },
                ]
            },
            indent=2,
        )
        + "\n",
        "notes/README.md": f"# {name}\n\nGoal: {goal}\n\nUse Studio Project -> Compile before running workflows.\n",
    }

    written: list[str] = []
    skipped: list[str] = []
    for rel, content in writes.items():
        target = relative_to_project(project_dir, rel)
        if target.exists() and not overwrite:
            skipped.append(rel)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        if rel.endswith(".py"):
            target.chmod(0o755)
        written.append(rel)

    payload = read_project(project_dir)
    payload["created"] = {"written": written, "skipped": skipped}
    return payload


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
                "environments": "environments",
                "tools": "tools",
                "agents": "agents",
            },
            "dataFolders": ["data"],
            "artifactRoot": "artifacts",
            "runDatabase": "runs/aaps-runs.jsonl",
            "variables": {},
            "tools": [],
            "models": [],
            "agents": [],
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
        "project_path": project_label(project_dir),
        "files": scan_aaps_files(project_dir),
        "script_files": scan_project_files(project_dir, SCRIPT_FILE_EXTENSIONS),
        "environment_files": [
            file
            for file in scan_project_files(project_dir, ENVIRONMENT_FILE_EXTENSIONS)
            if file.startswith("environments/")
        ],
        "tool_files": [
            file
            for file in scan_project_files(project_dir, {".json"})
            if file.startswith("tools/")
        ],
        "agent_files": [
            file
            for file in scan_project_files(project_dir, {".json"})
            if file.startswith("agents/")
        ],
        "text_files": scan_project_files(project_dir, TEXT_FILE_EXTENSIONS),
    }


def artifact_kind(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}:
        return "image"
    if suffix in {".csv", ".tsv"}:
        return "table"
    if suffix == ".json":
        return "json"
    if suffix == ".jsonl":
        return "jsonl"
    if suffix in {".md", ".txt", ".log"}:
        return "text"
    if suffix in {".aaps", ".py", ".js", ".sh"}:
        return "source"
    return "file"


def summarize_aaps_run_file(path: Path) -> dict | None:
    if path.name != "run.json":
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    results = data.get("results") if isinstance(data.get("results"), list) else []
    validations: list[dict] = []
    for result in results:
        if isinstance(result, dict) and isinstance(result.get("validations"), list):
            validations.extend(item for item in result["validations"] if isinstance(item, dict))
    failed_steps = [item for item in results if isinstance(item, dict) and item.get("status") == "failed"]
    failed_validations = [item for item in validations if item.get("ok") is False or item.get("status") == "failed"]
    return {
        "status": data.get("status") or "unknown",
        "runId": data.get("runId") or "",
        "file": data.get("file") or "",
        "block": data.get("block") or "",
        "runDir": data.get("runDir") or "",
        "startedAt": data.get("startedAt") or "",
        "finishedAt": data.get("finishedAt") or "",
        "steps": len(results),
        "failedSteps": len(failed_steps),
        "validations": len(validations),
        "failedValidations": len(failed_validations),
        "methodSelections": len(data.get("methodSelections") if isinstance(data.get("methodSelections"), list) else []),
    }


def list_files_under(project_dir: Path, root: Path, source: str, limit: int) -> list[dict]:
    items: list[dict] = []
    if not root.exists():
        return items
    for current, dirnames, filenames in os.walk(root):
        dirnames[:] = [name for name in dirnames if name not in {".git", "__pycache__", "node_modules"}]
        for filename in filenames:
            path = Path(current) / filename
            try:
                stat = path.stat()
                rel = path.relative_to(project_dir).as_posix()
            except (OSError, ValueError):
                continue
            item = {
                "source": source,
                "path": rel,
                "kind": artifact_kind(path),
                "size": stat.st_size,
                "mtime": int(stat.st_mtime),
            }
            run_summary = summarize_aaps_run_file(path)
            if run_summary:
                item["runSummary"] = run_summary
                item["kind"] = "run"
            items.append(item)
    return sorted(items, key=lambda item: (item["mtime"], item["path"]), reverse=True)[:limit]


def list_studio_artifacts(project_dir: Path, limit: int = 240) -> dict:
    manifest = read_project(project_dir)["manifest"]
    roots = []
    artifact_root = str(manifest.get("artifactRoot") or "outputs")
    for source, rel in [
        ("outputs", artifact_root),
        ("studio_artifacts", ".aaps-work/studio-artifacts"),
        ("studio_history", ".aaps-work/studio-history"),
        ("studio_runs", ".aaps-work/studio-aaps-runs"),
        ("studio_compiles", ".aaps-work/studio-aaps-compiles"),
        ("versions", ".aaps-work/versions"),
    ]:
        try:
            roots.append((source, relative_to_project(project_dir, rel)))
        except ValueError:
            continue
    seen: set[str] = set()
    items: list[dict] = []
    for source, root in roots:
        for item in list_files_under(project_dir, root, source, limit):
            if item["path"] in seen:
                continue
            seen.add(item["path"])
            items.append(item)
    items = sorted(items, key=lambda item: (item["mtime"], item["path"]), reverse=True)[:limit]
    counts: dict[str, int] = {}
    kind_counts: dict[str, int] = {}
    for item in items:
        counts[item["source"]] = counts.get(item["source"], 0) + 1
        kind_counts[item["kind"]] = kind_counts.get(item["kind"], 0) + 1
    return {
        "ok": True,
        "project_path": project_label(project_dir),
        "limit": limit,
        "counts": counts,
        "kindCounts": kind_counts,
        "items": items,
    }


def artifact_roots(project_dir: Path) -> list[Path]:
    manifest = read_project(project_dir)["manifest"]
    artifact_root = str(manifest.get("artifactRoot") or "outputs")
    roots: list[Path] = []
    for rel in [
        artifact_root,
        ".aaps-work/studio-artifacts",
        ".aaps-work/studio-history",
        ".aaps-work/studio-aaps-runs",
        ".aaps-work/studio-aaps-compiles",
        ".aaps-work/versions",
    ]:
        try:
            roots.append(relative_to_project(project_dir, rel))
        except ValueError:
            continue
    return roots


def artifact_public_item(project_dir: Path, file_path: Path, source: str = "block_preview", title: str = "") -> dict:
    stat = file_path.stat()
    rel = file_path.relative_to(project_dir).as_posix()
    return {
        "source": source,
        "path": rel,
        "title": title or file_path.name,
        "kind": artifact_kind(file_path),
        "size": stat.st_size,
        "mtime": int(stat.st_mtime),
    }


def collect_canvas_items(project_dir: Path, root_rel: str, source: str = "block_preview", limit: int = 24) -> list[dict]:
    try:
        root = relative_to_project(project_dir, root_rel)
    except ValueError:
        return []
    if not root.exists():
        return []
    priority = {"image": 0, "json": 1, "table": 2, "text": 3, "jsonl": 4, "source": 5, "file": 6}
    items = list_files_under(project_dir, root, source, max(limit * 6, 48))
    items.sort(key=lambda item: (priority.get(item["kind"], 9), -int(item.get("mtime") or 0), item["path"]))
    return items[:limit]


def write_project_artifact_file(handler: SimpleHTTPRequestHandler, project_dir: Path, file_name: str) -> None:
    file_path = relative_to_project(project_dir, file_name)
    if not file_path.exists() or not file_path.is_file():
        write_json(handler, {"error": "artifact file not found"}, 404)
        return
    if file_path.suffix.lower() not in ARTIFACT_FILE_EXTENSIONS:
        write_json(handler, {"error": f"artifact extension is not previewable: {file_path.suffix}"}, 400)
        return
    if not any(is_relative_to(file_path, root) for root in artifact_roots(project_dir)):
        write_json(handler, {"error": "artifact file must live under outputs or AAPS Studio artifact folders"}, 403)
        return
    size = file_path.stat().st_size
    if size > 50 * 1024 * 1024:
        write_json(handler, {"error": "artifact file is too large to preview through Studio"}, 413)
        return
    mime = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    handler.send_response(HTTPStatus.OK)
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Content-Type", mime)
    handler.send_header("Content-Length", str(size))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    with file_path.open("rb") as handle:
        shutil.copyfileobj(handle, handler.wfile)


def list_version_snapshots(project_dir: Path, limit: int = 120) -> dict:
    index_path = STUDIO_VERSION_DIR / "index.jsonl"
    records: list[dict] = []
    if index_path.exists():
        for raw in index_path.read_text(encoding="utf-8").splitlines():
            if not raw.strip():
                continue
            try:
                record = json.loads(raw)
            except json.JSONDecodeError:
                continue
            snapshot = str(record.get("snapshot") or "")
            if not snapshot:
                continue
            try:
                snapshot_path = relative_to_project(project_dir, snapshot)
                snapshot_path.resolve().relative_to(STUDIO_VERSION_DIR.resolve())
                stat = snapshot_path.stat()
            except (OSError, ValueError):
                continue
            records.append(
                {
                    "time": str(record.get("time") or ""),
                    "action": str(record.get("action") or ""),
                    "file": str(record.get("file") or ""),
                    "snapshot": snapshot,
                    "kind": artifact_kind(snapshot_path),
                    "size": stat.st_size,
                    "mtime": int(stat.st_mtime),
                }
            )
    records = sorted(records, key=lambda item: (item.get("time") or "", item.get("snapshot") or ""), reverse=True)[:limit]
    return {
        "ok": True,
        "project_path": project_label(project_dir),
        "limit": limit,
        "count": len(records),
        "items": records,
    }


def restore_version_snapshot(project_dir: Path, snapshot: str) -> dict:
    snapshot_path = relative_to_project(project_dir, snapshot)
    snapshot_path.resolve().relative_to(STUDIO_VERSION_DIR.resolve())
    if not snapshot_path.exists() or not snapshot_path.is_file():
        raise FileNotFoundError(f"snapshot not found: {snapshot}")
    rel_to_versions = snapshot_path.relative_to(STUDIO_VERSION_DIR)
    if len(rel_to_versions.parts) < 2:
        raise ValueError(f"invalid snapshot path: {snapshot}")
    original_rel = Path(*rel_to_versions.parts[:-1])
    original_path = relative_to_project(project_dir, original_rel.as_posix())
    snapshot_before_restore = snapshot_file(project_dir, original_path, "project_version_restore_current")
    original_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(snapshot_path, original_path)
    append_jsonl(
        STUDIO_VERSION_DIR / "index.jsonl",
        {
            "time": now_iso(),
            "action": "project_version_restore",
            "file": original_rel.as_posix(),
            "snapshot": snapshot,
            "previousSnapshot": snapshot_before_restore,
        },
    )
    payload = read_project(project_dir)
    payload["restored"] = {
        "file": original_rel.as_posix(),
        "snapshot": snapshot,
        "previousSnapshot": snapshot_before_restore,
    }
    return payload


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


def compile_dir(compile_id: str) -> Path:
    return COMPILE_DIR / compile_id


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


def write_compile_record(compile_id: str, payload: dict) -> None:
    folder = compile_dir(compile_id)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "api-compile.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def read_compile_record(compile_id: str) -> dict | None:
    path = compile_dir(compile_id) / "api-compile.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def codex_command(schema: str, output_path: Path, settings: dict | None = None) -> list[str]:
    active = settings or read_settings()
    model = str(active.get("codexModel") or "gpt-5.3-codex")
    reasoning = str(active.get("codexReasoning") or "medium")
    command = [
        "codex",
        "exec",
        "--ephemeral",
        "--model",
        model,
        "-c",
        f'model_reasoning_effort="{reasoning}"',
        "--cd",
        str(PROJECT_ROOT),
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


def read_text_excerpt(path: Path, max_chars: int = 4000) -> str:
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:  # noqa: BLE001
        return ""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n...[truncated]...\n"


def recent_studio_history(project_dir: Path, scope: str, scope_id: str, limit: int = 12) -> list[dict]:
    history_file = studio_scope_path(STUDIO_HISTORY_DIR, scope, scope_id)
    if not history_file.exists():
        return []
    rows: list[dict] = []
    for raw in history_file.read_text(encoding="utf-8").splitlines()[-limit:]:
        if not raw.strip():
            continue
        try:
            event = json.loads(raw)
        except json.JSONDecodeError:
            continue
        rows.append(
            {
                "time": event.get("time"),
                "scope": event.get("scope"),
                "scope_id": event.get("scope_id"),
                "message": str(event.get("message") or "")[:1200],
                "response_summary": str((event.get("response") or {}).get("message") or (event.get("response") or {}).get("summary") or "")[:1200]
                if isinstance(event.get("response"), dict)
                else "",
            }
        )
    return rows


def build_agent_context_pack(source: str, message: str, context: dict | None = None) -> str:
    active_settings = read_settings()
    if not active_settings.get("agentContextPack", True):
        return ""
    context_payload = context or {}
    project_dir = safe_repo_path(str(context_payload.get("projectPath") or "."))
    scope = str(context_payload.get("tab") or "program")
    selected_block = context_payload.get("selectedBlock") if isinstance(context_payload.get("selectedBlock"), dict) else {}
    working_file = str(context_payload.get("workingFile") or context_payload.get("activeFile") or "").strip()
    selected_workflow = str(context_payload.get("selectedWorkflowFile") or "").strip()
    selected_program = str(context_payload.get("selectedProgramFile") or "").strip()
    selected_block_file = str(context_payload.get("selectedBlockFile") or "").strip()
    scope_id = working_file or str(selected_block.get("id") or "active")
    try:
        project = read_project(project_dir)
        manifest = project.get("manifest", {})
    except Exception as exc:  # noqa: BLE001
        project = {"error": str(exc)}
        manifest = {}
    docs = {
        "language_spec_excerpt": read_text_excerpt(ROOT / "docs" / "language-spec.md", 5500),
        "compiler_excerpt": read_text_excerpt(ROOT / "docs" / "compiler.md", 4200),
        "runtime_excerpt": read_text_excerpt(ROOT / "docs" / "runtime.md", 4200),
    }
    latest_artifacts = []
    try:
        latest_artifacts = list_studio_artifacts(project_dir, 40).get("items", [])
    except Exception:  # noqa: BLE001
        latest_artifacts = []
    pack = {
        "contract": {
            "product": "AAPS Studio",
            "role": "AAPS is a project-oriented, prompt-native programming language and visual studio.",
            "goal": "Maintain project blocks and programs that parse, compile, execute, self-debug generated scripts, and produce durable verified artifacts.",
            "strict_rules": [
                "Return JSON only when the endpoint schema requires JSON.",
                "The selected workflow, block, and program are stable AAPS objects. Switching backend provider must not switch the object being edited.",
                "Edit only the selected/working AAPS source unless the user explicitly asks to create or switch to another file.",
                "Do not claim a block or program works unless the .aaps source declares outputs and validations that can prove it.",
                "Every block should include redundant context: biological purpose, data roots, typed inputs, declared outputs, executable action contract, validations, recovery/review notes, and expected artifacts.",
                "Generated scripts must be self-debuggable: include clear CLI args, dependency errors, output manifest, logs, deterministic small-preview mode, and validation-friendly outputs.",
                "For segmentation blocks, declare masks, overlays, per-image metrics, summary metrics, figures, reports, and QC review expectations.",
                "A program may use placeholder blocks, but compilation must resolve every referenced block into editable project block files before real execution.",
                "Prefer project-local files under blocks/, workflows/, scripts/, environments/, tools/, outputs/, and reports/.",
                "AAPS syntax is not YAML. Preserve braces and AAPS grammar from the examples/spec.",
            ],
        },
        "project": {
            "path": project_label(project_dir),
            "manifest": manifest,
            "aaps_files": project.get("files", []) if isinstance(project, dict) else [],
            "script_files": project.get("script_files", []) if isinstance(project, dict) else [],
            "text_files": project.get("text_files", [])[:80] if isinstance(project, dict) else [],
            "latest_artifacts": latest_artifacts[:40],
        },
        "studio_context": {
            "scope": scope,
            "scope_id": scope_id,
            "working_file": working_file,
            "working_role": context_payload.get("workingRole"),
            "selected_workflow_file": selected_workflow,
            "selected_program_file": selected_program,
            "selected_block_file": selected_block_file,
            "selected_block": context_payload.get("selectedBlock"),
            "active_run_id": context_payload.get("activeRunId"),
            "diagnostics": context_payload.get("diagnostics", []),
            "settings": {
                key: value
                for key, value in active_settings.items()
                if key
                in {
                    "agentProvider",
                    "codexModel",
                    "codexReasoning",
                    "deepseekModel",
                    "agintiProvider",
                    "agintiSafety",
                    "agintiSessionId",
                    "autoCompileAfterChat",
                    "autoSaveAgentEdits",
                }
            },
            "recent_history": recent_studio_history(project_dir, scope, scope_id),
        },
        "docs": docs,
        "current_source_preview": source[:12000],
        "user_message": message,
    }
    return json.dumps(pack, ensure_ascii=False, indent=2)


def build_edit_prompt(source: str, instruction: str, context: dict | None = None) -> str:
    context_pack = build_agent_context_pack(source, instruction, context)
    return f"""You are the AAPS Studio editing engine.

AAPS is Autonomous Agentic Pipeline Script. Edit only the AAPS source requested by the user.
Return JSON matching the schema with:
- source: the complete updated .aaps source
- summary: one concise sentence about the edit
- diagnostics: actionable issues, or an empty list

Rules:
- Preserve valid AAPS syntax; AAPS is not YAML.
- Keep prompts first-class, but require explicit inputs, outputs, verification, and artifacts for useful work.
- Prefer named agents, skills, tasks, stages, actions, methods, guards, if/else branches, and for_each loops.
- Use typed ports such as `input image: image = "path"` and `output mask: image = "runtime/mask.png"`.
- For segmentation/QC workflows, route through inspect -> choose method -> method action -> guard/QC -> quantify.
- Preserve the selected Studio scope: backend selection is only an execution adapter, not a reason to switch workflow/block/program.
- Programs should call or reference reusable blocks, and any required block must be discoverable and editable as a project block file.
- Blocks must be compile-ready: include enough biological/project context, executable action requirements, validations, recovery/review expectations, and declared artifacts for a later compiler or backend agent to implement and self-debug the scripts.
- When generating or requesting scripts, require a small-preview/test mode, explicit CLI arguments, an output manifest, logs, and validation-friendly CSV/JSON/figure/report outputs.
- Do not claim to commit, push, deploy, or execute commands.

Agent context pack:
```json
{context_pack}
```

Current AAPS source:
```aaps
{source}
```

User instruction:
{instruction}
"""


def build_chat_prompt(source: str, message: str, context: dict | None = None) -> str:
    context_payload = context or {}
    context_pack = build_agent_context_pack(source, message, context_payload)
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
- Blocks are the reusable working parts. They should be editable, versioned, richly documented, and compile-ready.
- The selected workflow, block, and program are persistent Studio scope. Backend changes between Codex, DeepSeek, and AgInTiFlow must preserve the same AAPS source unless the user explicitly switches files.
- Programs should reference reusable blocks; every referenced block must be discoverable in the project manifest and editable from Blocks.
- For backend-agent generated blocks/scripts, include self-debug instructions: run a small representative preview, inspect logs, verify declared outputs, and refine until masks/metrics/artifacts are meaningful.
- For biology segmentation, prefer a clear method route such as Cellpose/multiscale Cellpose when available, and deterministic threshold/morphology fallback when unavailable. Always declare how the compiler/runtime proves the result.

Current source:
```aaps
{source}
```

AAPS context pack for the backend agent:
```json
{context_pack}
```

Studio context:
```json
{json.dumps(context_payload, ensure_ascii=False, indent=2)}
```

User message:
{message}
"""


def infer_deo_study(block_id: str, message: str) -> str:
    text = f"{block_id} {message}".lower()
    if "app65" in text or "alginate" in text:
        return "app65"
    if "app81" in text or "density" in text:
        return "app81"
    if "app80" in text or "y-27632" in text or "y27632" in text or "fusion" in text:
        return "app80"
    return ""


def deo_data_root(study: str) -> str:
    roots = {
        "app80": "data/App80 DEO",
        "app65": "data/App65 DEO+Alginate",
        "app81": "data/DEO App81 P8",
    }
    return roots.get(study, "data")


def generated_deo_python_code(study: str, purpose: str) -> str:
    default_study = study or "app80"
    default_purpose = purpose or "all"
    return f'''#!/usr/bin/env python3
"""AAPS Studio generated DEO microscopy analysis block.

This script is intentionally project-local and deterministic. It handles TIFF
discovery, fallback segmentation, per-image metrics, grouped summaries, plots,
and a Markdown report for APP80/APP65/APP81 DEO microscopy datasets.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import warnings
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

try:
    import tifffile
except Exception as exc:  # pragma: no cover - runtime dependency check
    raise SystemExit("Missing dependency: tifffile. Install project-local imaging dependencies first.") from exc

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
except Exception:  # pragma: no cover - plots become optional at runtime
    plt = None

try:
    from scipy import ndimage as ndi
except Exception:  # pragma: no cover
    ndi = None

try:
    from skimage import exposure, filters, measure, morphology, segmentation, transform
except Exception as exc:  # pragma: no cover
    raise SystemExit("Missing dependency: scikit-image. Install project-local imaging dependencies first.") from exc


DEFAULT_STUDY = {json.dumps(default_study)}
DEFAULT_PURPOSE = {json.dumps(default_purpose)}
DEFAULT_DATA_ROOTS = {{
    "app80": "data/App80 DEO",
    "app65": "data/App65 DEO+Alginate",
    "app81": "data/DEO App81 P8",
}}


def safe_name(value: str) -> str:
    text = re.sub(r"[^A-Za-z0-9_.-]+", "_", str(value or "item")).strip("_")
    return text[:120] or "item"


def normalize_image(image: np.ndarray) -> np.ndarray:
    arr = np.asarray(image)
    if arr.ndim >= 3 and arr.shape[-1] in (3, 4):
        rgb = arr[..., :3].astype("float32")
        gray = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    elif arr.ndim >= 3:
        gray = np.max(arr.astype("float32"), axis=0)
    else:
        gray = arr.astype("float32")
    if gray.size == 0:
        raise ValueError("empty image")
    lo, hi = np.percentile(gray, [1, 99.5])
    if not np.isfinite(lo) or not np.isfinite(hi) or hi <= lo:
        lo, hi = float(np.min(gray)), float(np.max(gray))
    if hi <= lo:
        return np.zeros_like(gray, dtype="float32")
    return np.clip((gray - lo) / (hi - lo), 0, 1).astype("float32")


def resize_for_analysis(gray: np.ndarray, max_dimension: int) -> tuple[np.ndarray, float]:
    if max_dimension <= 0:
        return gray, 1.0
    current = max(gray.shape)
    if current <= max_dimension:
        return gray, 1.0
    scale = max_dimension / float(current)
    resized = transform.resize(gray, (max(1, int(gray.shape[0] * scale)), max(1, int(gray.shape[1] * scale))), anti_aliasing=True)
    return resized.astype("float32"), scale


def discover_images(data_root: Path, study: str, include_4x: bool) -> list[Path]:
    paths = sorted([p for p in data_root.rglob("*") if p.suffix.lower() in {{".tif", ".tiff"}}])
    selected = []
    for path in paths:
        text = path.as_posix().lower()
        name = path.name.lower()
        if study in {{"app80", "app81"}} and "10x" not in name:
            continue
        if study == "app65" and not include_4x and "10x" not in name:
            continue
        if study == "app81" and "transfer" in text:
            continue
        selected.append(path)
    return selected


def infer_metadata(path: Path, root: Path, study: str) -> dict:
    rel = path.relative_to(root)
    parts = list(rel.parts)
    name = path.stem
    lower = name.lower()
    magnification = "10x" if "10x" in lower else "4x" if "4x" in lower else "unknown"
    meta = {{
        "study": study,
        "relative_path": rel.as_posix(),
        "filename": path.name,
        "date": parts[-2] if len(parts) >= 2 else "unknown",
        "condition": "unknown",
        "magnification": magnification,
    }}
    if study == "app80":
        meta["condition"] = parts[0] if len(parts) >= 3 else "unknown"
        meta["concentration"] = meta["condition"]
    elif study == "app65":
        prefix = re.split(r"\\s+(?:4x|10x)", name, flags=re.IGNORECASE)[0].strip()
        meta["condition"] = prefix or "unknown"
        meta["alginate"] = meta["condition"]
    elif study == "app81":
        if "middle" in lower:
            condition = "middle"
        elif "high" in lower:
            condition = "high"
        elif "low" in lower:
            condition = "low"
        else:
            condition = "unknown"
        meta["condition"] = condition
        meta["density"] = condition
    return meta


def choose_foreground(gray: np.ndarray) -> tuple[np.ndarray, float, str]:
    smooth = filters.gaussian(gray, sigma=1.2, preserve_range=True)
    try:
        threshold = float(filters.threshold_otsu(smooth))
    except Exception:
        threshold = float(np.median(smooth))
    candidates = [("dark", smooth < threshold), ("bright", smooth > threshold)]
    best_name, best_mask, best_score = "dark", candidates[0][1], -1e9
    for name, mask in candidates:
        frac = float(np.mean(mask))
        if frac <= 0 or frac >= 0.85:
            score = -abs(frac - 0.12) - 1
        else:
            score = -abs(frac - 0.12)
        if score > best_score:
            best_name, best_mask, best_score = name, mask, score
    return best_mask.astype(bool), threshold, best_name


def segment(gray: np.ndarray, min_area: int) -> tuple[np.ndarray, np.ndarray, dict]:
    raw, threshold, polarity = choose_foreground(gray)
    min_area = max(16, int(min_area))
    mask = morphology.remove_small_objects(raw, min_size=min_area)
    mask = morphology.binary_closing(mask, morphology.disk(3))
    if ndi is not None:
        mask = ndi.binary_fill_holes(mask)
    mask = morphology.remove_small_holes(mask, area_threshold=min_area * 2)
    distance = ndi.distance_transform_edt(mask) if ndi is not None else mask.astype("float32")
    try:
        local_max = morphology.local_maxima(distance)
        markers = measure.label(local_max)
        labels = segmentation.watershed(-distance, markers, mask=mask) if int(markers.max()) > 0 else measure.label(mask)
    except Exception:
        labels = measure.label(mask)
    labels = morphology.remove_small_objects(labels, min_size=min_area)
    labels = measure.label(labels > 0)
    stats = {{
        "threshold": threshold,
        "polarity": polarity,
        "foreground_fraction": float(np.mean(labels > 0)),
        "instance_count": int(labels.max()),
    }}
    return labels.astype("int32"), mask.astype(bool), stats


def region_metrics(gray: np.ndarray, labels: np.ndarray, meta: dict, scale: float) -> dict:
    mask = labels > 0
    props = measure.regionprops(labels, intensity_image=gray)
    areas = np.array([p.area for p in props], dtype="float64")
    perimeters = np.array([max(p.perimeter, 1.0) for p in props], dtype="float64")
    roundness = 4.0 * math.pi * areas / np.maximum(perimeters ** 2, 1.0) if len(props) else np.array([])
    edge = filters.sobel(gray)
    boundary = segmentation.find_boundaries(labels, mode="outer") if labels.size else mask
    edge_intensity = float(np.mean(edge[boundary])) if np.any(boundary) else 0.0
    dark_fraction = float(np.mean(gray[mask] < 0.35)) if np.any(mask) else 0.0
    total_area = float(np.sum(areas))
    largest_fraction = float(np.max(areas) / total_area) if total_area > 0 and len(areas) else 0.0
    count = int(len(props))
    fill_fraction = float(np.mean(mask))
    count_factor = min(1.0, count / 24.0)
    fusion_visual = 5.0 * min(1.0, 0.45 * fill_fraction + 0.35 * largest_fraction + 0.20 * count_factor)
    fusion_objective = 5.0 * min(1.0, 0.40 * dark_fraction + 0.35 * largest_fraction + 0.25 * count_factor)
    center_y, center_x = (np.array(gray.shape) - 1) / 2.0
    yy, xx = np.nonzero(boundary)
    if len(xx):
        dist = np.sqrt((yy - center_y) ** 2 + (xx - center_x) ** 2)
        center_weight = 1.0 - np.clip(dist / max(gray.shape), 0, 1)
        center_weighted_edge_sum = float(np.sum(edge[yy, xx] * center_weight))
    else:
        center_weighted_edge_sum = 0.0
    area_norm_edge = center_weighted_edge_sum / max(total_area, 1.0)
    mean_roundness = float(np.mean(roundness)) if len(roundness) else 0.0
    perimeter_mean = float(np.mean(perimeters)) if len(perimeters) else 0.0
    curvature = float(np.mean(1.0 / np.maximum(perimeters / (2.0 * math.pi), 1.0))) if len(perimeters) else 0.0
    row = {{
        **meta,
        "analysis_scale": scale,
        "count": count,
        "total_area_px": total_area,
        "average_area_px": float(np.mean(areas)) if len(areas) else 0.0,
        "largest_area_fraction": largest_fraction,
        "foreground_fraction": fill_fraction,
        "average_perimeter_px": perimeter_mean,
        "roundness": mean_roundness,
        "roundness_deviation_norm": float(np.mean(np.abs(roundness - 1.0))) if len(roundness) else 0.0,
        "roundness_deviation_px_total": float(np.sum(np.abs(roundness - 1.0) * areas)) if len(roundness) else 0.0,
        "curvature": curvature,
        "edge_intensity": edge_intensity,
        "center_weighted_edge_sum": center_weighted_edge_sum,
        "area_normalized_center_weighted_edge_instance_mean": area_norm_edge,
        "wall_darkness_mean": dark_fraction,
        "very_dark_area_ratio_gt035": dark_fraction,
        "fusion_score_visual_0_to_5": fusion_visual,
        "fusion_score_objective_0_to_5": fusion_objective,
        "fusion_score_combined_0_to_5": (fusion_visual + fusion_objective) / 2.0,
        "normalized_edge_over_count_curvature": edge_intensity / max(count * max(curvature, 1e-6), 1e-6),
    }}
    return row


def write_png(path: Path, array: np.ndarray, cmap: str = "gray") -> None:
    if plt is None:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    plt.imsave(path, array, cmap=cmap)


def write_overlay(path: Path, gray: np.ndarray, labels: np.ndarray) -> None:
    if plt is None:
        return
    fig, ax = plt.subplots(figsize=(6, 4), dpi=150)
    ax.imshow(gray, cmap="gray")
    ax.contour(labels > 0, levels=[0.5], colors=["#ffcc33"], linewidths=0.5)
    ax.set_axis_off()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, bbox_inches="tight", pad_inches=0)
    plt.close(fig)


def write_rows_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    keys = sorted({{key for row in rows for key in row.keys()}})
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=keys)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")


def aggregate(rows: list[dict]) -> list[dict]:
    groups: dict[tuple[str, str, str], list[dict]] = defaultdict(list)
    for row in rows:
        groups[(str(row.get("condition", "unknown")), str(row.get("date", "unknown")), str(row.get("magnification", "unknown")))].append(row)
    numeric = [
        "count",
        "total_area_px",
        "average_area_px",
        "foreground_fraction",
        "roundness",
        "curvature",
        "edge_intensity",
        "center_weighted_edge_sum",
        "area_normalized_center_weighted_edge_instance_mean",
        "wall_darkness_mean",
        "very_dark_area_ratio_gt035",
        "fusion_score_combined_0_to_5",
        "normalized_edge_over_count_curvature",
    ]
    out = []
    for (condition, date, mag), items in sorted(groups.items()):
        row = {{"condition": condition, "date": date, "magnification": mag, "n_images": len(items)}}
        for key in numeric:
            values = [float(item.get(key, 0) or 0) for item in items]
            row[f"{{key}}_mean"] = float(np.mean(values)) if values else 0.0
            row[f"{{key}}_std"] = float(np.std(values)) if len(values) > 1 else 0.0
        out.append(row)
    return out


def plot_summary(path: Path, summary: list[dict], study: str) -> None:
    if plt is None or not summary:
        return
    metrics = [
        "total_area_px_mean",
        "count_mean",
        "roundness_mean",
        "edge_intensity_mean",
        "fusion_score_combined_0_to_5_mean" if study == "app80" else "normalized_edge_over_count_curvature_mean",
        "area_normalized_center_weighted_edge_instance_mean",
    ]
    fig, axes = plt.subplots(2, 3, figsize=(15, 8), dpi=160)
    labels = [f"{{row['condition']}}\\n{{row['date']}}" for row in summary]
    x = np.arange(len(summary))
    for ax, metric in zip(axes.flat, metrics):
        values = [float(row.get(metric, 0) or 0) for row in summary]
        ax.bar(x, values, color="#2f7f9f")
        ax.set_title(metric.replace("_", " "))
        ax.set_xticks(x)
        ax.set_xticklabels(labels, rotation=70, ha="right", fontsize=7)
        ax.grid(axis="y", alpha=0.25)
    fig.suptitle(f"{{study.upper()}} DEO AAPS generated analysis summary")
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)


def load_existing_metrics(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def run(args: argparse.Namespace) -> dict:
    study = args.study.lower()
    data_root = Path(args.data_root or DEFAULT_DATA_ROOTS.get(study, "data"))
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    manifest_path = output_root / "manifest.json"
    manifest_csv = output_root / "manifest.csv"
    metrics_csv = output_root / "databases" / "per_image_metrics.csv"
    metrics_json = output_root / "databases" / "per_image_metrics.json"
    summary_csv = output_root / "databases" / "summary.csv"
    summary_json = output_root / "databases" / "summary.json"
    figure_path = output_root / "figures" / f"{{study}}_aaps_summary.png"
    report_path = output_root / "report.md"
    masks_dir = output_root / "masks"
    overlays_dir = output_root / "overlays"
    stats_dir = output_root / "stats"

    images = discover_images(data_root, study, args.include_4x)
    if args.max_images and args.max_images > 0:
        images = images[: args.max_images]
    manifest_rows = [infer_metadata(path, data_root, study) for path in images]
    write_json(manifest_path, {{"study": study, "data_root": str(data_root), "total_images": len(images), "images": manifest_rows}})
    write_rows_csv(manifest_csv, manifest_rows)

    rows = [] if args.mode in {{"all", "segment", "metrics"}} else load_existing_metrics(metrics_csv)
    if args.mode in {{"all", "segment", "metrics"}}:
        for index, path in enumerate(images, start=1):
            meta = infer_metadata(path, data_root, study)
            stem = safe_name(Path(meta["relative_path"]).with_suffix("").as_posix())
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    image = tifffile.imread(path)
                gray_full = normalize_image(image)
                gray, scale = resize_for_analysis(gray_full, args.max_dimension)
                labels, mask, seg_stats = segment(gray, args.min_area)
                row = region_metrics(gray, labels, meta, scale)
                row.update({{"segmentation_polarity": seg_stats["polarity"], "segmentation_threshold": seg_stats["threshold"]}})
                mask_path = masks_dir / f"{{stem}}_mask.png"
                stats_path = stats_dir / f"{{stem}}_metrics.json"
                write_png(mask_path, labels > 0)
                if args.preview_limit <= 0 or index <= args.preview_limit:
                    write_overlay(overlays_dir / f"{{stem}}_overlay.png", gray, labels)
                row["mask_path"] = mask_path.as_posix()
                row["stats_path"] = stats_path.as_posix()
                write_json(stats_path, row)
                rows.append(row)
            except Exception as exc:
                error_row = {{**meta, "error": str(exc), "count": 0, "total_area_px": 0.0}}
                rows.append(error_row)
    write_rows_csv(metrics_csv, rows)
    write_json(metrics_json, rows)

    summary = aggregate(rows)
    write_rows_csv(summary_csv, summary)
    write_json(summary_json, summary)
    plot_summary(figure_path, summary, study)

    report_lines = [
        f"# {{study.upper()}} DEO AAPS Analysis Report",
        "",
        f"- Created: {{datetime.now(timezone.utc).isoformat()}}",
        f"- Data root: `{{data_root}}`",
        f"- Output root: `{{output_root}}`",
        f"- Images discovered: {{len(images)}}",
        f"- Metrics rows: {{len(rows)}}",
        f"- Summary rows: {{len(summary)}}",
        "",
        "## Declared Outputs",
        f"- Manifest JSON: `{{manifest_path}}`",
        f"- Manifest CSV: `{{manifest_csv}}`",
        f"- Per-image metrics CSV: `{{metrics_csv}}`",
        f"- Summary CSV: `{{summary_csv}}`",
        f"- Summary figure: `{{figure_path}}`",
        f"- Report: `{{report_path}}`",
        "",
        "## Method",
        "The block uses TIFF discovery, robust grayscale normalization, Otsu polarity selection, morphological cleanup, watershed-style connected component labeling, and deterministic project-local metrics. It is a fallback block suitable when Cellpose or external vision APIs are unavailable.",
        "",
        "## Caveats",
        "Metrics are scaled-analysis pixel metrics when max-dimension downsampling is active. Use the recorded `analysis_scale` column for interpretation and rerun with `--max-dimension 0` for full-resolution analysis.",
    ]
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\\n".join(report_lines) + "\\n", encoding="utf-8")

    result = {{
        "ok": True,
        "study": study,
        "data_root": str(data_root),
        "output_root": str(output_root),
        "total_images": len(images),
        "metrics_rows": len(rows),
        "summary_rows": len(summary),
        "outputs": {{
            "manifest_json": str(manifest_path),
            "manifest_csv": str(manifest_csv),
            "metrics_csv": str(metrics_csv),
            "metrics_json": str(metrics_json),
            "summary_csv": str(summary_csv),
            "summary_json": str(summary_json),
            "figure": str(figure_path),
            "report": str(report_path),
        }},
    }}
    write_json(output_root / "run_manifest.json", result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--study", default=DEFAULT_STUDY, choices=["app80", "app65", "app81"])
    parser.add_argument("--data-root", "--data_root", default="")
    parser.add_argument("--output-root", "--output_root", default=f"outputs/{{DEFAULT_STUDY}}")
    parser.add_argument("--mode", default=DEFAULT_PURPOSE, choices=["all", "discover", "segment", "metrics", "aggregate", "plot", "report"])
    parser.add_argument("--max-images", "--max_images", type=int, default=0)
    parser.add_argument("--max-dimension", "--max_dimension", type=int, default=1400)
    parser.add_argument("--min-area", "--min_area", type=int, default=80)
    parser.add_argument("--preview-limit", "--preview_limit", type=int, default=60)
    parser.add_argument("--include-4x", "--include_4x", action="store_true")
    parser.add_argument("--result-json", "--result_json", default="")
    args, _ = parser.parse_known_args()
    if not args.data_root:
        args.data_root = DEFAULT_DATA_ROOTS.get(args.study, "data")
    result = run(args)
    if args.result_json:
        write_json(Path(args.result_json), result)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
'''


def generated_python_code(kind: str) -> str:
    if kind.startswith("deo_"):
        parts = kind.split("_", 2)
        study = parts[1] if len(parts) > 1 else "app80"
        purpose = parts[2] if len(parts) > 2 else "all"
        return generated_deo_python_code(study, purpose)
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


def deo_block_study_details(study: str) -> dict:
    if study == "app65":
        return {
            "label": "APP65 DEO + Alginate",
            "groups": "date, alginate condition, magnification, biological replicate when visible from filenames",
            "method": "Segment TIFF brightfield/organoid fields with deterministic Otsu polarity selection, morphological cleanup, connected components, and watershed fallback when SciPy/skimage distance tools are available.",
            "metrics": [
                "object count",
                "total organoid area",
                "average area",
                "average perimeter",
                "foreground fraction",
                "roundness",
                "roundness deviation",
                "curvature",
                "edge intensity",
                "alginate-condition grouped summary",
            ],
        }
    if study == "app81":
        return {
            "label": "APP81 DEO Density",
            "groups": "date, low/middle/high density, 10x magnification; skip transfer folders",
            "method": "Segment 10x TIFF density images with Otsu dark/bright polarity selection, morphological cleanup, connected components, watershed fallback, and preview overlays for human QC.",
            "metrics": [
                "object count",
                "total organoid area",
                "average perimeter",
                "curvature",
                "roundness deviation",
                "edge intensity",
                "normalized edge over count-curvature",
                "density grouped summary",
            ],
        }
    return {
        "label": "APP80 DEO Y-27632",
        "groups": "date, Y-27632 concentration, 10x magnification, biological replicate when visible from folders",
        "method": "Segment 10x TIFF Y-27632 images with multiscale-compatible Otsu/watershed fallback, retaining masks, overlays, per-image JSON metrics, grouped tables, and summary figures.",
        "metrics": [
            "object count",
            "total organoid area",
            "foreground fraction",
            "largest object fraction",
            "fusion visual score",
            "fusion objective score",
            "combined fusion score",
            "edge intensity",
            "Y-27632 grouped response summary",
        ],
    }


def block_source_from_chat_payload(block_id: str, message: str, action: dict, validations: list[str]) -> str:
    title = block_id.replace("_", " ").title()
    action_type = str(action.get("type") or "noop")
    command = str(action.get("command") or action.get("entry") or "noop")
    args = action.get("args") if isinstance(action.get("args"), dict) else {}
    prompt = message.strip() or f"Reusable block {block_id}."
    study = str(args.get("study") or "")
    output_root = str(args.get("output_root") or f"outputs/blocks/{block_id}")
    details = deo_block_study_details(study) if study else {}
    lines = [
        f'pipeline "{title} Block" {{',
        '  subtitle "Prompt Is All You Need"',
        '  version "0.3"',
        '  domain "biology"',
        f'  goal "Reusable project-local block generated by AAPS Studio chat for {block_id}."',
        "",
        f"  block {block_id} {{",
        '    compile_agent "codex_repair_agent"',
        '    prompt """',
        prompt,
        '"""',
    ]
    if "image_path" in args:
        lines.append('    input image_path: image optional')
    if "data_root" in args:
        lines.append(f'    input data_root: directory optional = "{args["data_root"]}"')
    if "mask_path" in args:
        lines.append(f'    output mask_path: image = "{args["mask_path"]}"')
    if "output_root" in args:
        lines.append(f'    output output_root: directory = "{args["output_root"]}"')
    if "output_json" in args:
        lines.append(f'    output output_json: json = "{args["output_json"]}"')
    if "report_json" in args:
        lines.append(f'    output report_json: json = "{args["report_json"]}"')
    if "result_json" in args:
        lines.append(f'    output result_json: json = "{args["result_json"]}"')
    if study:
        lines.extend(
            [
                f'    artifact masks: image = "{output_root}/masks"',
                f'    artifact overlays: image = "{output_root}/overlays"',
                f'    artifact per_image_metrics: table = "{output_root}/databases/per_image_metrics.csv"',
                f'    artifact summary_table: table = "{output_root}/databases/summary.csv"',
                f'    artifact summary_figure: image = "{output_root}/figures/{study}_aaps_summary.png"',
                f'    artifact report: markdown = "{output_root}/report.md"',
                f'    metric grouping = "{details["groups"]}"',
            ]
        )
        for metric in details["metrics"]:
            lines.append(f'    metric {slug(metric)} = "{metric}"')
        lines.extend(
            [
                '    note "This block is intended to be edited and refined through AAPS Studio block chat, then reused by workflow programs."',
                f'    note "Study contract: {details["label"]}; data root {args.get("data_root", deo_data_root(study))}; output root {output_root}."',
                "",
                "    stage inspect_dataset {",
                f'      prompt "Inspect the dataset organization and verify grouping: {details["groups"]}. Confirm that sample TIFFs exist before running segmentation."',
                '      verify "Representative TIFF paths are discovered, and excluded folders/images are intentional."',
                "    }",
                "",
                "    method deterministic_fallback_segmentation {",
                f'      prompt "{details["method"]}"',
                '      verify "Preview masks and overlays are produced for sample images, not only CSV files."',
                "    }",
                "",
                "    guard biology_qc {",
                '      prompt "A biology user reviews overlays, masks, metric distributions, and grouped plots before trusting the full analysis."',
                f'      validate "exists {output_root}/databases/per_image_metrics.csv"',
                f'      validate "exists {output_root}/databases/summary.csv"',
                f'      validate "exists {output_root}/report.md"',
                '      review "If masks are empty, overly merged, or biologically implausible, refine the block prompt and rerun the preview before full execution."',
                "    }",
            ]
        )
    lines.append(f'    exec {action_type} "{command}"')
    for key, value in args.items():
        lines.append(f'    arg {key} = "{value}"')
    for check in validations:
        lines.append(f'    validate "{check}"')
    lines.extend(
        [
            '    repair true',
            '    review "Inspect generated artifacts and refine this block through Studio block chat before publication use."',
            "  }",
            "}",
            "",
        ]
    )
    return "\n".join(lines)


def materialize_block_chat(project_dir: Path, block_id: str, message: str, payload: dict, body: dict) -> dict:
    block_file = str(body.get("blockFile") or body.get("block_file") or f"blocks/{block_id}.aaps")
    block_path = relative_to_project(project_dir, block_file)
    if not block_path.name.endswith(".aaps"):
        raise ValueError("materialized block files must end with .aaps")
    source = block_source_from_chat_payload(block_id, message, payload.get("action") or {}, payload.get("validations") or [])
    snapshot = write_project_text(project_dir, block_path, source, f"block_chat:{block_id}")
    payload["blockFile"] = block_path.relative_to(project_dir).as_posix()
    payload["blockSource"] = source
    if snapshot:
        payload["previousSnapshot"] = snapshot
    return payload


def append_provenance(project_dir: Path, payload: dict) -> None:
    record = {"time": now_iso(), **payload}
    target = project_dir / "runs" / "code-provenance.jsonl"
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def run_block_preview(project_dir: Path, block_id: str, action: dict, body: dict) -> dict:
    args = action.get("args") if isinstance(action.get("args"), dict) else {}
    study = str(args.get("study") or "")
    entry = str(action.get("entry") or "")
    if action.get("type") != "python_script" or not entry or not study:
        return {
            "ok": False,
            "status": "skipped",
            "reason": "Preview runs are currently available for generated DEO Python script blocks.",
            "canvasItems": [],
        }
    script_path = relative_to_project(project_dir, entry)
    if not script_path.exists():
        return {"ok": False, "status": "failed", "reason": f"script missing: {entry}", "canvasItems": []}
    max_images = int(body.get("previewMaxImages") or body.get("preview_max_images") or 3)
    max_images = max(1, min(12, max_images))
    preview_root = str(
        body.get("previewOutputRoot")
        or body.get("preview_output_root")
        or f"outputs/blocks/{block_id}/preview/{stamp()}"
    )
    result_json = f"{preview_root}/run_manifest.json"
    command = [
        "python3",
        entry,
        "--study",
        study,
        "--data-root",
        str(args.get("data_root") or deo_data_root(study)),
        "--output-root",
        preview_root,
        "--mode",
        "all",
        "--max-images",
        str(max_images),
        "--max-dimension",
        str(body.get("previewMaxDimension") or body.get("preview_max_dimension") or 768),
        "--preview-limit",
        str(max_images),
        "--result-json",
        result_json,
    ]
    started = now_iso()
    process = subprocess.run(
        command,
        cwd=project_dir,
        text=True,
        capture_output=True,
        timeout=int(body.get("previewTimeout") or body.get("preview_timeout") or 180),
        check=False,
    )
    preview_dir = relative_to_project(project_dir, preview_root)
    preview_dir.mkdir(parents=True, exist_ok=True)
    (preview_dir / "preview-stdout.log").write_text(process.stdout or "", encoding="utf-8")
    (preview_dir / "preview-stderr.log").write_text(process.stderr or "", encoding="utf-8")
    canvas_items = collect_canvas_items(project_dir, preview_root, "block_preview", 36)
    manifest = {
        "ok": process.returncode == 0,
        "status": "succeeded" if process.returncode == 0 else "failed",
        "blockId": block_id,
        "study": study,
        "command": command,
        "startedAt": started,
        "finishedAt": now_iso(),
        "previewRoot": preview_root,
        "resultJson": result_json,
        "returnCode": process.returncode,
        "stdoutPreview": (process.stdout or "")[-4000:],
        "stderrPreview": (process.stderr or "")[-4000:],
        "canvasItems": canvas_items,
    }
    canvas_path = STUDIO_ARTIFACT_DIR / "block" / block_id / f"{stamp()}-preview-canvas.json"
    canvas_path.parent.mkdir(parents=True, exist_ok=True)
    canvas_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest["canvasPath"] = canvas_path.relative_to(project_dir).as_posix()
    return manifest


def build_block_chat_response(body: dict) -> dict:
    project_dir = safe_repo_path(str(body.get("path") or "."))
    block_id = slug(str(body.get("blockId") or body.get("block_id") or "block"))
    message = str(body.get("message") or "").strip()
    if not message:
        raise ValueError("message is required")

    lower = message.lower()
    if any(word in lower for word in ["requirements", "dependency", "dependencies", "environment", "setup"]):
        requirements = {"commands": ["python3"], "files": [], "pythonPackages": [], "tools": [], "agents": ["codex_repair_agent"]}
        environment = {
            "python": "python3",
            "requirements": [],
            "commands": ["python3"],
            "nodePackages": [],
            "files": [],
            "env": {},
            "setup": ["python3 -m venv .venv"],
        }
        append_provenance(
            project_dir,
            {
                "block": block_id,
                "message": message,
                "mode": "requirements",
                "action_type": "environment_update",
            },
        )
        payload = {
            "ok": True,
            "mode": "requirements",
            "summary": f"Prepared project-local Python readiness metadata for {block_id}.",
            "action": {},
            "requirements": requirements,
            "environment": environment,
            "compile": {
                "agent": "codex_repair_agent",
                "prompt": "Create project-local scripts or setup prompts when declared dependencies are missing.",
                "onMissing": "prompt",
            },
            "validations": [],
            "script": "",
        }
        if body.get("materialize"):
            payload = materialize_block_chat(project_dir, block_id, message, payload, body)
        history_path, artifact_path = write_studio_chat_event(project_dir, "block", block_id, message, payload)
        payload["historyPath"] = history_path
        payload["artifactPath"] = artifact_path
        return payload

    if "shell" in lower or "command" in lower:
        command = "echo AAPS block action"
        if ":" in message:
            command = message.split(":", 1)[1].strip() or command
        payload = {
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
        if body.get("materialize"):
            payload = materialize_block_chat(project_dir, block_id, message, payload, body)
        history_path, artifact_path = write_studio_chat_event(project_dir, "block", block_id, message, payload)
        payload["historyPath"] = history_path
        payload["artifactPath"] = artifact_path
        return payload

    inline = "inline" in lower
    deo_study = infer_deo_study(block_id, message)
    deo_prompt = bool(deo_study) or any(word in lower for word in ["deo", "microscopy", "organoid"]) or bool(re.search(r"\b(?:tif|tiff|tifs|tiffs)\b|\.tiff?\b", lower))
    if deo_prompt:
        study = deo_study or "app80"
        purpose = "segment" if any(word in lower for word in ["segment", "segmentation", "mask", "overlay"]) else "metrics"
        kind = f"deo_{study}_all"
    else:
        study = ""
        purpose = ""
        kind = "threshold" if any(word in lower for word in ["segment", "segmentation", "threshold", "mask"]) else "qc" if "qc" in lower else "generic"
    default_script = f"scripts/{block_id}.py" if deo_prompt else f"scripts/{block_id}_{kind}.py"
    script_rel = str(body.get("targetFile") or body.get("target_file") or default_script)
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
        write_project_text(project_dir, script_path, code, f"block_chat_script:{block_id}")
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
    if deo_prompt:
        output_root = f"outputs/blocks/{block_id}"
        result_json = f"{output_root}/run_manifest.json"
        data_root = deo_data_root(study)
        action["args"] = {
            "study": study,
            "data_root": data_root,
            "output_root": output_root,
            "mode": "all",
            "result_json": result_json,
        }
        validations = [
            f"exists {result_json}",
            f"exists {output_root}/databases/summary.csv",
            f"exists {output_root}/figures/{study}_aaps_summary.png",
            f"exists {output_root}/report.md",
        ]
    elif kind == "threshold":
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
            "study": study,
            "purpose": purpose,
            "mode": "inline" if inline else "script",
            "action_type": action["type"],
        },
    )
    payload = {
        "ok": True,
        "mode": "python_inline" if inline else "python_script",
        "summary": f"Prepared {action['type']} action for {block_id}.",
        "action": action,
        "validations": validations,
        "script": script_written,
        "code": code,
    }
    if body.get("materialize"):
        payload = materialize_block_chat(project_dir, block_id, message, payload, body)
    if body.get("runPreview") or body.get("run_preview"):
        preview = run_block_preview(project_dir, block_id, action, body)
        payload["previewRun"] = preview
        payload["canvasItems"] = preview.get("canvasItems") or []
        payload["canvasPath"] = preview.get("canvasPath", "")
    history_path, artifact_path = write_studio_chat_event(project_dir, "block", block_id, message, payload)
    payload["historyPath"] = history_path
    payload["artifactPath"] = artifact_path
    return payload


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


def schema_instruction(schema: str) -> str:
    schema_path = SCHEMAS.get(schema)
    if not schema_path or not schema_path.exists():
        return "Return a compact JSON object. Do not include Markdown."
    try:
        loaded = json.loads(schema_path.read_text(encoding="utf-8"))
        return f"Return valid JSON matching this JSON Schema:\n{json.dumps(loaded, ensure_ascii=False)}"
    except Exception:  # noqa: BLE001
        return "Return a compact JSON object. Do not include Markdown."


def run_deepseek(job_id: str, prompt: str, schema: str = "response", settings: dict | None = None) -> dict:
    active = settings or read_settings()
    folder = job_dir(job_id)
    folder.mkdir(parents=True, exist_ok=True)
    output_path = folder / "output.json"
    stdout_path = folder / "stdout.log"
    stderr_path = folder / "stderr.log"
    (folder / "prompt.txt").write_text(prompt, encoding="utf-8")

    api_key = os.environ.get("AAPS_DEEPSEEK_API_KEY") or os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return {
            "status": "failed",
            "error": "DeepSeek API key is not configured. Set AAPS_DEEPSEEK_API_KEY in .env or DEEPSEEK_API_KEY in the shell.",
        }

    base_url = str(active.get("deepseekBaseUrl") or "https://api.deepseek.com").rstrip("/")
    model = str(active.get("deepseekModel") or "deepseek-v4-pro")
    timeout = int(active.get("deepseekTimeout") or 180)
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the AAPS Studio backend agent. "
                    "You must return JSON only. Do not include Markdown fences.\n\n"
                    f"{schema_instruction(schema)}"
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    request = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310
            raw = response.read().decode("utf-8")
        stdout_path.write_text(raw, encoding="utf-8")
        stderr_path.write_text("", encoding="utf-8")
        data = json.loads(raw)
        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            result = {"message": content}
        output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        return {"status": "succeeded", "result": result}
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        stderr_path.write_text(error_body, encoding="utf-8")
        return {"status": "failed", "error": f"DeepSeek HTTP {exc.code}: {error_body[:600]}"}
    except Exception as exc:  # noqa: BLE001
        stderr_path.write_text(str(exc), encoding="utf-8")
        return {"status": "failed", "error": str(exc)}


def extract_json_object(text: str) -> dict | None:
    stripped = text.strip()
    if not stripped:
        return None
    try:
        loaded = json.loads(stripped)
        if isinstance(loaded, dict):
            return loaded
    except json.JSONDecodeError:
        pass
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start >= 0 and end > start:
        try:
            loaded = json.loads(stripped[start : end + 1])
            if isinstance(loaded, dict):
                return loaded
        except json.JSONDecodeError:
            return None
    return None


def parse_aginti_session_id(text: str) -> str:
    match = re.search(r"\b(?:session(?:_id)?\s*[=:]\s*)?(web-agent-[0-9A-Za-z-]+)\b", text)
    return match.group(1) if match else ""


def run_aginti(job_id: str, prompt: str, schema: str = "response", settings: dict | None = None) -> dict:
    active = settings or read_settings()
    folder = job_dir(job_id)
    folder.mkdir(parents=True, exist_ok=True)
    output_path = folder / "output.json"
    stdout_path = folder / "stdout.log"
    stderr_path = folder / "stderr.log"
    prompt_path = folder / "prompt.txt"
    handoff_path = folder / "aginti-handoff.md"
    project_output_rel = output_path.relative_to(PROJECT_ROOT).as_posix() if is_relative_to(output_path, PROJECT_ROOT) else output_path.as_posix()
    project_handoff_rel = handoff_path.relative_to(PROJECT_ROOT).as_posix() if is_relative_to(handoff_path, PROJECT_ROOT) else handoff_path.as_posix()
    prompt_path.write_text(prompt, encoding="utf-8")

    if not shutil.which("aginti"):
        return {"status": "failed", "error": "AgInTiFlow CLI (`aginti`) was not found on PATH."}

    schema_text = schema_instruction(schema)
    aginti_prompt = f"""You are the persistent AgInTiFlow backend agent for AAPS Studio.

The AAPS Studio server has already prepared a complete context pack below. Use it to write high-quality AAPS source and preserve project logic.

Required output contract:
- Write a JSON object to `{project_output_rel}`.
- The JSON must match this schema:
{schema_text}
- If you edit `.aaps` source, include the complete updated source in the `source` field.
- Do not write secrets into the JSON.
- If implementation would require a long run, still return the best bounded edit plus diagnostics.

Backend task:
{prompt}
"""
    handoff_path.write_text(aginti_prompt, encoding="utf-8")
    short_prompt = (
        "You are the persistent AgInTiFlow backend agent for AAPS Studio. "
        f"Read the full handoff at `{project_handoff_rel}`, follow it exactly, "
        f"write the required JSON response to `{project_output_rel}`, and stop. "
        "Do not print secrets or modify unrelated files."
    )
    session_id = str(active.get("agintiSessionId") or "").strip()
    timeout = int(active.get("agintiTimeout") or 900)
    if session_id:
        command = ["aginti", "--no-auto-update", "resume", session_id, short_prompt]
    else:
        command = [
            "aginti",
            "--no-auto-update",
            "-s",
            str(active.get("agintiSafety") or "normal"),
            "--provider",
            str(active.get("agintiProvider") or "deepseek"),
            "--sandbox-mode",
            "docker-workspace",
            "--package-install-policy",
            "allow",
            "--approve-package-installs",
            "--allow-shell",
            "--allow-file-tools",
            short_prompt,
        ]
    try:
        process = subprocess.run(
            command,
            cwd=PROJECT_ROOT,
            text=True,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
        stdout_path.write_text(process.stdout or "", encoding="utf-8")
        stderr_path.write_text(process.stderr or "", encoding="utf-8")
        discovered = parse_aginti_session_id((process.stdout or "") + "\n" + (process.stderr or ""))
        if discovered and discovered != session_id:
            persist_runtime_settings({"agintiSessionId": discovered})
        result: dict | None = None
        if output_path.exists():
            try:
                loaded = json.loads(output_path.read_text(encoding="utf-8"))
                if isinstance(loaded, dict):
                    result = loaded
            except json.JSONDecodeError:
                result = None
        if result is None:
            result = extract_json_object(process.stdout or "")
        if result is None:
            result = {
                "mode": "reply" if schema == "aaps_chat" else "error",
                "route": "aginti_backend",
                "message": (process.stdout or process.stderr or "").strip()[-4000:],
                "source": "",
                "diagnostics": ["AgInTiFlow backend did not produce a parseable JSON output file."],
            }
        if process.returncode != 0:
            return {
                "status": "failed",
                "error": process.stderr.strip() or f"aginti exited with {process.returncode}",
                "result": result,
            }
        return {
            "status": "succeeded",
            "result": result,
            "backend": "aginti",
            "agintiSessionId": discovered or session_id,
        }
    except Exception as exc:  # noqa: BLE001
        stderr_path.write_text(str(exc), encoding="utf-8")
        return {"status": "failed", "error": str(exc)}


def run_codex(job_id: str, prompt: str, schema: str = "response") -> dict:
    settings = read_settings()
    if settings.get("agentProvider") == "aginti" and os.environ.get("AAPS_MOCK_CODEX") != "1":
        return run_aginti(job_id, prompt, schema, settings)
    if settings.get("agentProvider") == "deepseek" and os.environ.get("AAPS_MOCK_CODEX") != "1":
        return run_deepseek(job_id, prompt, schema, settings)

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

    timeout = int(settings.get("codexTimeout") or os.environ.get("AAPS_CODEX_TIMEOUT", "240"))
    process = subprocess.run(
        codex_command(schema, output_path, settings),
        input=prompt,
        text=True,
        cwd=PROJECT_ROOT,
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
    project_arg_value = project_arg(project_dir)
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
        "project": project_label(project_dir),
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
            project_arg_value,
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
                cwd=PROJECT_ROOT,
                text=True,
                capture_output=True,
                timeout=int(os.environ.get("AAPS_RUNTIME_TIMEOUT", "1800")),
                check=False,
            )
            (folder / "api-stdout.log").write_text(process.stdout or "", encoding="utf-8")
            (folder / "api-stderr.log").write_text(process.stderr or "", encoding="utf-8")
            try:
                result = json.loads(process.stdout)
            except json.JSONDecodeError as exc:
                durable_summary = folder / "run.json"
                if durable_summary.exists():
                    result = json.loads(durable_summary.read_text(encoding="utf-8"))
                    result.setdefault("warnings", []).append(
                        f"Runner stdout was not parseable JSON; loaded durable run.json instead: {exc}"
                    )
                else:
                    result = {"ok": False, "message": process.stdout.strip(), "parseError": str(exc)}
            succeeded = bool(result.get("ok")) or str(result.get("status") or "").lower() == "succeeded"
            current.update(
                {
                    "status": "succeeded" if succeeded else "failed",
                    "updated_at": now_iso(),
                    "result": result,
                    "error": process.stderr.strip() if process.returncode and not succeeded else "",
                }
            )
        except Exception as exc:  # noqa: BLE001
            current.update({"status": "failed", "updated_at": now_iso(), "error": str(exc)})
        write_run_record(run_id, current)

    threading.Thread(target=worker, daemon=True).start()
    return record


def start_aaps_compile(body: dict) -> dict:
    compile_id = uuid.uuid4().hex[:16]
    folder = compile_dir(compile_id)
    folder.mkdir(parents=True, exist_ok=True)
    project_dir = safe_repo_path(str(body.get("path") or "."))
    project_arg_value = project_arg(project_dir)
    mode = str(body.get("mode") or "check").strip().lower()
    source = str(body.get("source") or "")
    file_name = str(body.get("file") or "").strip()
    project_wide = bool(body.get("projectWide") or body.get("project_wide"))
    source_path = ""
    if source:
        source_path = str(folder / "input.aaps")
        (folder / "input.aaps").write_text(source, encoding="utf-8")
    elif file_name:
        relative_to_project(project_dir, file_name)
    elif not project_wide:
        project = read_project(project_dir)["manifest"]
        file_name = str(project.get("activeFile") or project.get("defaultMain") or "")
        if file_name:
            relative_to_project(project_dir, file_name)

    record = {
        "id": compile_id,
        "status": "running",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "project": project_label(project_dir),
        "file": file_name,
        "mode": mode,
        "projectWide": project_wide,
        "result": None,
        "error": "",
    }
    write_compile_record(compile_id, record)

    def worker() -> None:
        current = read_compile_record(compile_id) or record
        command = [
            "node",
            str(ROOT / "scripts" / "aaps-compiler.js"),
            "compile-project" if project_wide else "compile",
            "--project",
            project_arg_value,
            "--mode",
            mode,
            "--compile-id",
            compile_id,
            "--json",
        ]
        if source_path:
            command.extend(["--source", source_path])
        elif file_name and not project_wide:
            command.extend(["--file", file_name])
        try:
            process = subprocess.run(
                command,
                cwd=PROJECT_ROOT,
                text=True,
                capture_output=True,
                timeout=int(os.environ.get("AAPS_COMPILE_TIMEOUT", "900")),
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
        write_compile_record(compile_id, current)

    threading.Thread(target=worker, daemon=True).start()
    return record


def persist_agent_chat_edit(project_dir: Path, body: dict, result: dict, previous_source: str, provider: str, job_id: str) -> dict:
    if not isinstance(result, dict):
        return result
    new_source = result.get("source")
    if not isinstance(new_source, str) or not new_source or new_source == previous_source:
        return result
    settings = read_settings()
    if not settings.get("autoSaveAgentEdits", True):
        result["versioned"] = False
        result["versionNote"] = "autoSaveAgentEdits is disabled; source is only staged in the Studio editor."
        return result
    context = body.get("context") if isinstance(body.get("context"), dict) else {}
    file_name = str(context.get("workingFile") or context.get("activeFile") or body.get("file") or "").strip()
    if not file_name or not file_name.endswith(".aaps"):
        result["versioned"] = False
        result["versionNote"] = "No active .aaps file was provided for automatic versioned save."
        return result
    file_path = relative_to_project(project_dir, file_name)
    snapshot = write_project_text(project_dir, file_path, new_source, f"agent_chat_edit:{provider}:{job_id}")
    result["versioned"] = True
    result["savedFile"] = file_path.relative_to(project_dir).as_posix()
    result["previousSnapshot"] = snapshot
    return result


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
                    "compile_runtime": str(COMPILE_DIR),
                    "settings": public_settings(),
                },
            )
            return
        if parsed.path == "/api/aaps/settings":
            write_json(self, public_settings())
            return
        if parsed.path == "/api/aaps/history":
            try:
                query = parse_qs(parsed.query)
                project_dir = safe_repo_path(query.get("path", ["."])[0])
                scope = query.get("scope", ["program"])[0]
                scope_id = query.get("id", ["active"])[0]
                history_file = studio_scope_path(STUDIO_HISTORY_DIR, scope, scope_id)
                rows = []
                if history_file.exists():
                    for raw in history_file.read_text(encoding="utf-8").splitlines():
                        if not raw.strip():
                            continue
                        try:
                            rows.append(json.loads(raw))
                        except json.JSONDecodeError:
                            rows.append({"raw": raw, "malformed": True})
                write_json(
                    self,
                    {
                        "ok": True,
                        "project_path": project_label(project_dir),
                        "scope": scope,
                        "id": scope_id,
                        "historyPath": history_file.relative_to(project_dir).as_posix(),
                        "events": rows,
                    },
                )
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return
        if parsed.path == "/api/aaps/project":
            try:
                project_dir = safe_repo_path(parse_qs(parsed.query).get("path", ["."])[0])
                write_json(self, read_project(project_dir))
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return
        if parsed.path == "/api/aaps/artifacts":
            try:
                query = parse_qs(parsed.query)
                project_dir = safe_repo_path(query.get("path", ["."])[0])
                limit = max(1, min(1000, int(query.get("limit", ["240"])[0] or "240")))
                write_json(self, list_studio_artifacts(project_dir, limit))
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return
        if parsed.path == "/api/aaps/artifact-file":
            try:
                query = parse_qs(parsed.query)
                project_dir = safe_repo_path(query.get("path", ["."])[0])
                write_project_artifact_file(self, project_dir, query.get("file", [""])[0])
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return
        if parsed.path == "/api/aaps/versions":
            try:
                query = parse_qs(parsed.query)
                project_dir = safe_repo_path(query.get("path", ["."])[0])
                limit = max(1, min(500, int(query.get("limit", ["120"])[0] or "120")))
                write_json(self, list_version_snapshots(project_dir, limit))
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
                        "project_path": project_label(project_dir),
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
                        "project_path": project_label(project_dir),
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
        if parsed.path == "/api/aaps/compile":
            compile_id = parse_qs(parsed.query).get("id", [""])[0]
            record = read_compile_record(compile_id)
            write_json(self, record or {"error": "compile not found"}, 200 if record else 404)
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
            context = body.get("context") if isinstance(body.get("context"), dict) else {}
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
            prompt = build_edit_prompt(source, instruction, context)
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
                project_dir = safe_repo_path(str(context.get("projectPath") or body.get("path") or "."))
                result = {
                    "mode": "reply",
                    "route": "mock",
                    "message": "Mock router accepted the message; source left unchanged.",
                    "source": source,
                    "diagnostics": [],
                }
                history_path, artifact_path = write_studio_chat_event(
                    project_dir,
                    str(context.get("tab") or "program"),
                    str(context.get("workingFile") or context.get("activeFile") or body.get("file") or "active"),
                    message,
                    result,
                    {"context": context},
                )
                result["historyPath"] = history_path
                result["artifactPath"] = artifact_path
                write_json(
                    self,
                    {
                        "id": uuid.uuid4().hex[:16],
                        "status": "succeeded",
                        "result": result,
                    },
                )
                return
            job_id = uuid.uuid4().hex[:16]
            outcome = run_codex(job_id, build_chat_prompt(source, message, context), "aaps_chat")
            try:
                project_dir = safe_repo_path(str(context.get("projectPath") or body.get("path") or "."))
                result = outcome.get("result") if isinstance(outcome.get("result"), dict) else {}
                if isinstance(result, dict):
                    persist_agent_chat_edit(
                        project_dir,
                        body,
                        result,
                        source,
                        str(read_settings().get("agentProvider") or "codex"),
                        job_id,
                    )
                history_path, artifact_path = write_studio_chat_event(
                    project_dir,
                    str(context.get("tab") or "program"),
                    str(context.get("workingFile") or context.get("activeFile") or body.get("file") or "active"),
                    message,
                    result,
                    {
                        "context": context,
                        "job_id": job_id,
                        "backend": str(read_settings().get("agentProvider") or "codex"),
                        "agintiSessionId": outcome.get("agintiSessionId", ""),
                    },
                )
                if isinstance(outcome.get("result"), dict):
                    outcome["result"]["historyPath"] = history_path
                    outcome["result"]["artifactPath"] = artifact_path
            except Exception as exc:  # noqa: BLE001
                outcome.setdefault("warnings", []).append(f"failed to persist chat history: {exc}")
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
                snapshot = write_project_text(
                    project_dir,
                    manifest_path,
                    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                    "project_manifest_save",
                )
                payload = read_project(project_dir)
                if snapshot:
                    payload["previousSnapshot"] = snapshot
                write_json(self, payload)
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return

        if parsed.path == "/api/aaps/project/create":
            try:
                write_json(self, create_starter_project(body))
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return

        if parsed.path == "/api/aaps/settings":
            try:
                write_json(self, write_settings(body))
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
                snapshot = write_project_text(project_dir, file_path, source, "project_file_save")
                write_json(
                    self,
                    {
                        "ok": True,
                        "project_path": project_label(project_dir),
                        "file": file_path.relative_to(project_dir).as_posix(),
                        "files": scan_aaps_files(project_dir),
                        "previousSnapshot": snapshot,
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
                snapshot = write_project_text(project_dir, file_path, source, "project_text_file_save")
                write_json(
                    self,
                    {
                        "ok": True,
                        "project_path": project_label(project_dir),
                        "file": file_path.relative_to(project_dir).as_posix(),
                        "previousSnapshot": snapshot,
                        "files": scan_aaps_files(project_dir),
                        "script_files": scan_project_files(project_dir, SCRIPT_FILE_EXTENSIONS),
                        "environment_files": [
                            file
                            for file in scan_project_files(project_dir, ENVIRONMENT_FILE_EXTENSIONS)
                            if file.startswith("environments/")
                        ],
                        "tool_files": [
                            file
                            for file in scan_project_files(project_dir, {".json"})
                            if file.startswith("tools/")
                        ],
                        "agent_files": [
                            file
                            for file in scan_project_files(project_dir, {".json"})
                            if file.startswith("agents/")
                        ],
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
                manifest_target = target_name
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
                    write_project_text(project_dir, file_path, default_aaps_source(kind, file_path.stem), "project_file_create")
                    file_name = file_path.relative_to(project_dir).as_posix()
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
                    snapshot_file(project_dir, target_path, "project_file_duplicate_target")
                    shutil.copyfile(file_path, target_path)
                    file_name = file_path.relative_to(project_dir).as_posix()
                    manifest_target = target_path.relative_to(project_dir).as_posix()
                elif action == "rename":
                    file_path = relative_to_project(project_dir, file_name)
                    target_path = relative_to_project(project_dir, target_name)
                    if not file_path.exists():
                        write_json(self, {"error": "source file not found"}, 404)
                        return
                    snapshot_file(project_dir, file_path, "project_file_rename_source")
                    snapshot_file(project_dir, target_path, "project_file_rename_target")
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    file_path.rename(target_path)
                    file_name = file_path.relative_to(project_dir).as_posix()
                    manifest_target = target_path.relative_to(project_dir).as_posix()
                elif action in {"archive", "delete"}:
                    file_path = relative_to_project(project_dir, file_name)
                    if not file_path.exists():
                        write_json(self, {"error": "source file not found"}, 404)
                        return
                    snapshot_file(project_dir, file_path, f"project_file_{action}")
                    archive_root = project_dir / "archive"
                    archive_root.mkdir(parents=True, exist_ok=True)
                    archived = archive_root / f"{int(time.time())}-{file_path.name}"
                    file_path.rename(archived)
                    file_name = file_path.relative_to(project_dir).as_posix()
                    manifest_target = archived.relative_to(project_dir).as_posix() if action == "archive" else ""
                else:
                    write_json(self, {"error": f"unknown file action: {action}"}, 400)
                    return
                manifest_snapshot = update_manifest_file_listing(project_dir, action, file_name, manifest_target, kind)
                payload = read_project(project_dir)
                if manifest_snapshot:
                    payload["manifestSnapshot"] = manifest_snapshot
                write_json(self, payload)
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return

        if parsed.path == "/api/aaps/versions/restore":
            try:
                project_dir = safe_repo_path(str(body.get("path") or "."))
                snapshot = str(body.get("snapshot") or "").strip()
                if not snapshot:
                    write_json(self, {"error": "snapshot is required"}, 400)
                    return
                write_json(self, restore_version_snapshot(project_dir, snapshot))
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return

        if parsed.path == "/api/aaps/run":
            try:
                write_json(self, start_aaps_run(body), 202)
            except Exception as exc:  # noqa: BLE001
                write_json(self, {"error": str(exc)}, 400)
            return

        if parsed.path == "/api/aaps/compile":
            try:
                write_json(self, start_aaps_compile(body), 202)
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
    COMPILE_DIR.mkdir(parents=True, exist_ok=True)
    print(f"AAPS Studio: http://{args.host}:{args.port}")
    print("API: /api/health, /api/aaps/settings, /api/aaps/project, /api/aaps/project/create, /api/aaps/project/file, /api/aaps/project/text-file, /api/aaps/block/chat, /api/aaps/compile, /api/aaps/run, /api/aaps/chat, /api/aaps/edit, /api/codex/respond, /api/codex/jobs")
    ThreadingHTTPServer((args.host, args.port), AAPSHandler).serve_forever()


if __name__ == "__main__":
    main()
