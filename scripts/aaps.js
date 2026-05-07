#!/usr/bin/env node
"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const AAPS = require("../src/aaps");

const SKIP_DIRS = new Set([".git", ".aaps-work", "node_modules", "vendor", "runtime", "__pycache__"]);

function usage() {
  return [
    "Usage:",
    "  aaps parse <file> [--project .]",
    "  aaps compile <file> [--project .] [--mode check|suggest|apply|interactive|force] [--json]",
    "  aaps compile-project [--project .] [--mode check|suggest|apply] [--json]",
    "  aaps missing <file> [--project .] [--json]",
    "  aaps generate-block <name> [--project .] [--mode apply] [--json]",
    "  aaps generate-script <name-or-path> [--project .] [--mode apply] [--json]",
    "  aaps prepare-setup <file> [--project .] [--json]",
    "  aaps plan <file> [--project .] [--json]",
    "  aaps check <file> [--project .] [--json]",
    "  aaps audit [file] [--project .] [--json]",
    "  aaps check-block <file> --block <id> [--project .] [--json]",
    "  aaps run <file> [--project .] [--json]",
    "  aaps run-block <file> --block <id> [--project .] [--json]",
    "  aaps prompt \"goal\" [--project .] [--backend aginti|print] [--json]",
    "  aaps \"goal\" [--project .] [--backend aginti|print] [--json]",
    "  aaps validate [file] [--project .] [--json]",
    "  aaps studio [--project .] [--host 127.0.0.1] [--port 8796] [--mock-codex]",
    "  aaps --version",
    "",
    "Options:",
    "  --project <dir>   AAPS project root. Defaults to current directory.",
    "  --block <id>      Block ID or execution-plan path fragment for run-block.",
    "  --mode <mode>     Compile mode: check, suggest, apply, interactive, or force.",
    "  --host <host>     Studio host for `aaps studio`.",
    "  --port <port>     Studio port for `aaps studio`.",
    "  --run-root <dir>  Runtime output directory for `run` and `run-block`.",
    "  --run-id <id>     Stable run identifier for reproducible test runs.",
    "  --dry-run         Build plan/readiness and skip action side effects.",
    "  --backend <name>  Prompt backend for direct goals. Defaults to aginti.",
    "  --provider <name> Provider passed to AgInTi backend.",
    "  --routing <mode>  Routing passed to AgInTi backend. Defaults to complex for backend implementation.",
    "  --aginti-safety <safe|normal|danger> Safety shortcut passed to AgInTi backend.",
    "  --sandbox-mode <mode> Sandbox mode passed to AgInTi backend.",
    "  --package-install-policy <policy> Package policy passed to AgInTi backend.",
    "  --approve-package-installs Approve package installs for the AgInTi backend run.",
    "  --allow-destructive Pass trusted host/destructive approval to AgInTi backend.",
    "  --print-prompt    Save and print the generated backend prompt without running it.",
    "  --audit-scope <entry|project> Post-backend audit scope. Defaults to entry for prompt backends.",
    "  --mock-codex      Start Studio with AAPS_MOCK_CODEX=1.",
    "  --json            Print machine-readable JSON where supported.",
  ].join("\n");
}

function parseArgs(argv) {
  const command = argv[2] || "help";
  const positional = [];
  const options = { project: "." };
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

function toProjectPath(file) {
  return file.split(path.sep).join("/");
}

function safeRelative(base, value, label = "path") {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required.`);
  const normalized = path.normalize(text);
  if (path.isAbsolute(normalized) || normalized.startsWith("..") || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`${label} must be project-relative: ${value}`);
  }
  const resolved = path.resolve(base, normalized);
  const relative = path.relative(base, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes project root: ${value}`);
  }
  return resolved;
}

function readManifest(projectDir) {
  const manifestPath = path.join(projectDir, "aaps.project.json");
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function scanAapsFiles(projectDir) {
  const files = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".aaps")) {
        const full = path.join(dir, entry.name);
        files[toProjectPath(path.relative(projectDir, full))] = fs.readFileSync(full, "utf8");
      }
    }
  }
  walk(projectDir);
  return files;
}

function resolveEntry(projectDir, manifest, fileArg) {
  const file = fileArg || (manifest && (manifest.activeFile || manifest.defaultMain));
  if (!file) throw new Error("Provide a .aaps file or set activeFile/defaultMain in aaps.project.json.");
  const full = safeRelative(projectDir, file, "AAPS file");
  if (!fs.existsSync(full)) throw new Error(`AAPS file not found: ${file}`);
  return toProjectPath(path.relative(projectDir, full));
}

function parseProjectAware(projectDir, fileArg) {
  const manifest = readManifest(projectDir);
  if (manifest) {
    const entry = resolveEntry(projectDir, manifest, fileArg);
    return { manifest, entry, ir: AAPS.parseAAPSProject(scanAapsFiles(projectDir), entry, manifest) };
  }
  const full = safeRelative(projectDir, fileArg, "AAPS file");
  return {
    manifest: null,
    entry: toProjectPath(path.relative(projectDir, full)),
    ir: AAPS.parseAAPS(fs.readFileSync(full, "utf8"), { sourceFile: toProjectPath(path.relative(projectDir, full)) }),
  };
}

function print(value, asJson) {
  if (asJson) console.log(JSON.stringify(value, null, 2));
  else console.log(value);
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function packageVersion() {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
    return String(manifest.version || "latest");
  } catch (_error) {
    return "latest";
  }
}

function shellCommandExists(command, cwd) {
  const result = childProcess.spawnSync("sh", ["-lc", `command -v ${JSON.stringify(command)} >/dev/null 2>&1`], {
    cwd,
    stdio: "ignore",
  });
  return result.status === 0;
}

function collectWorkflowCandidates(projectDir, fileArg = "", options = {}) {
  if (fileArg) {
    const full = safeRelative(projectDir, fileArg, "AAPS file");
    if (!fs.existsSync(full)) throw new Error(`AAPS file not found: ${fileArg}`);
    return [toProjectPath(path.relative(projectDir, full))];
  }
  const manifest = readManifest(projectDir);
  const files = Object.keys(scanAapsFiles(projectDir)).sort();
  const preferred = [];
  if (manifest?.activeFile && files.includes(manifest.activeFile)) preferred.push(manifest.activeFile);
  if (manifest?.defaultMain && files.includes(manifest.defaultMain)) preferred.push(manifest.defaultMain);
  if (options.scope === "entry") {
    if (preferred.length) return [...new Set(preferred)].slice(0, 20);
    const manifestWorkflows = Array.isArray(manifest?.files?.workflows)
      ? manifest.files.workflows.filter((file) => files.includes(file))
      : [];
    if (manifestWorkflows.length) return [...new Set(manifestWorkflows)].slice(0, 20);
    if (Number.isFinite(options.sinceMs)) {
      const changed = files.filter((file) => {
        try {
          return fs.statSync(path.join(projectDir, file)).mtimeMs >= options.sinceMs - 1000;
        } catch (_error) {
          return false;
        }
      });
      return changed.slice(0, 20);
    }
    return [];
  }
  const workflowFiles = files.filter((file) => file.startsWith("workflows/"));
  const candidates = [...new Set([...preferred, ...workflowFiles, ...files])];
  return candidates.slice(0, 20);
}

function collectOutputPorts(node, ports = []) {
  if (!node || typeof node !== "object") return ports;
  if (Array.isArray(node.outputPorts)) ports.push(...node.outputPorts);
  for (const key of ["tasks", "blocks", "stages", "skills", "children"]) {
    if (Array.isArray(node[key])) {
      for (const child of node[key]) collectOutputPorts(child, ports);
    }
  }
  return ports;
}

function checkDeclaredOutputs(projectDir, ir) {
  const seen = new Set();
  const outputs = [];
  for (const port of collectOutputPorts(ir.pipeline || {})) {
    const value = String(port.value || "").trim();
    if (!value || value.includes("${") || path.isAbsolute(value) || seen.has(value)) continue;
    seen.add(value);
    const full = path.resolve(projectDir, value);
    const rel = path.relative(projectDir, full);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      outputs.push({ name: port.name || "", path: value, exists: false, size: 0, error: "escapes_project" });
      continue;
    }
    let stat = null;
    try {
      stat = fs.statSync(full);
    } catch (_error) {
      stat = null;
    }
    outputs.push({
      name: port.name || "",
      type: port.type || "",
      path: toProjectPath(rel),
      exists: Boolean(stat),
      size: stat?.size || 0,
      nonempty: Boolean(stat && stat.size > 0),
    });
  }
  return outputs;
}

function runAapsSelf(projectDir, args) {
  const result = childProcess.spawnSync(process.execPath, [path.join(__dirname, "aaps.js"), ...args], {
    cwd: projectDir,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    command: ["node", path.join(__dirname, "aaps.js"), ...args],
    exitCode: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function auditAapsBackendResult(projectDir, fileArg = "", options = {}) {
  const workflows = collectWorkflowCandidates(projectDir, fileArg, options);
  const audit = {
    ok: false,
    status: workflows.length ? "checked" : "no_workflows",
    workflowCount: workflows.length,
    workflows: [],
  };
  for (const workflow of workflows) {
    const item = {
      file: workflow,
      parseOk: false,
      compileOk: false,
      declaredOutputs: [],
      missingOutputs: [],
      diagnostics: [],
      compileStatus: "",
      compileDir: "",
    };
    try {
      const parsed = parseProjectAware(projectDir, workflow);
      item.parseOk = parsed.ir.diagnostics.length === 0;
      item.diagnostics = parsed.ir.diagnostics || [];
      item.declaredOutputs = checkDeclaredOutputs(projectDir, parsed.ir);
      item.missingOutputs = item.declaredOutputs.filter((output) => !output.exists || output.size === 0);
    } catch (error) {
      item.diagnostics = [{ severity: "error", message: error.message }];
    }
    const compile = runAapsSelf(projectDir, ["compile", workflow, "--project", ".", "--mode", "check", "--json"]);
    item.compileExitCode = compile.exitCode;
    if (compile.stdout.trim()) {
      try {
        const report = JSON.parse(compile.stdout);
        item.compileOk = Boolean(report.ok);
        item.compileStatus = report.status || "";
        item.compileDir = report.compileDir || "";
        item.missingComponents = report.missingComponents || [];
      } catch (_error) {
        item.compileOk = false;
      }
    }
    if (compile.stderr.trim()) item.compileStderr = compile.stderr.trim().slice(0, 4000);
    audit.workflows.push(item);
  }
  audit.ok = audit.workflows.length > 0 && audit.workflows.every((item) => item.parseOk && item.compileOk && item.declaredOutputs.length > 0 && item.missingOutputs.length === 0);
  audit.status = audit.ok ? "verified" : "unverified";
  return audit;
}

function buildPromptHandoff(projectDir, goal, options) {
  const promptDir = path.join(projectDir, ".aaps-work", "prompts");
  fs.mkdirSync(promptDir, { recursive: true });
  const promptPath = path.join(promptDir, `${timestampSlug()}-aginti-backend.md`);
  const aapsCli = path.join(__dirname, "aaps.js");
  const dockerSafeAapsCli = `npx -y @lazyingart/aaps@${packageVersion()}`;
  const projectRelativePromptPath = toProjectPath(path.relative(projectDir, promptPath));
  const text = [
    "# AAPS Backend Agent Task",
    "",
    "You are the backend implementation agent for an AAPS project.",
    "",
    "## User Goal",
    "",
    goal,
    "",
    "## Project",
    "",
    `- Project root: ${projectDir}`,
    "- Preferred AAPS CLI: `aaps` when it is installed in the active shell or sandbox.",
    `- Docker-safe AAPS CLI fallback: \`${dockerSafeAapsCli}\` when package installs/network are approved.`,
    `- Host/source AAPS CLI fallback: \`node ${aapsCli}\` only if that host path exists inside the active sandbox.`,
    "- In AgInTi docker-workspace, host-global binaries and host source paths may not be visible. Verify the CLI before relying on it.",
    "",
    "## Operating Contract",
    "",
    "1. Inspect the current AAPS project before editing.",
    "2. If no AAPS project exists, create a small project-local AAPS structure instead of writing unrelated files.",
    "3. Prefer editing `.aaps` workflows, blocks, scripts, tool registries, and agent registries before ad hoc prose.",
    "4. Run `aaps validate`, `aaps compile ... --mode check`, and `aaps run ...` when the workflow is executable.",
    "5. If a step is prompt-only, record it as a handoff unless you actually execute it and verify declared outputs.",
    "6. Save durable reports under `reports/` and durable generated artifacts under project-local folders.",
    "7. Do not use sudo or destructive host commands. Ask for a stronger mode when the task requires broader permission.",
    "8. Finish with exact paths to the workflow, compile/run logs, and outputs.",
    options.allowDestructive
      ? "9. This run was launched with explicit trusted-host/destructive approval. Use it only for the requested project work, avoid unrelated host changes, and keep secrets out of reports."
      : "9. If broad host commands are blocked, report the blocker and rerun command instead of looping on variants.",
    "",
    "## AAPS Syntax Contract",
    "",
    "- `.aaps` files are not YAML. Do not write `name:`, `stages:`, YAML arrays, or loose key/value workflow files.",
    "- Use the native AAPS language shape: `pipeline \"Name\" { ... agent ... task ... exec shell \"...\" output ... validate exists \"...\" }`.",
    "- Before claiming success, run `aaps validate <workflow> --project .`, `aaps parse <workflow> --project . --json`, and `aaps compile <workflow> --project . --mode check --json`.",
    "- If parse/validate/compile fails, repair the `.aaps` file and rerun the checks. Do not continue with an invalid workflow.",
    "",
    "## Scientific Runtime Contract",
    "",
    "- For Python/data/image-analysis tasks, prefer a project-local `.venv` and project-local scripts over global host `pip install`.",
    "- Pin or constrain binary scientific dependencies when practical, especially `numpy`, `matplotlib`, `scipy`, `scikit-image`, `opencv-python-headless`, `pillow`, `pandas`, and `tifffile`.",
    "- Record environment setup in project-local files such as `requirements.txt`, `tools/*.yaml`, or `environments/*.yaml` so the workflow is reproducible.",
    "- Do not treat shell pipeline exit code as reliable when piping through `tee`. Use `set -o pipefail` where available, or separately verify the declared output files after the command.",
    "- Long-running jobs may use tmux, but do not finish while they are still running. Wait for completion, then verify declared outputs, logs, reports, and host-side file checks.",
    "- If the first `.aaps` or script attempt is incomplete, repair the correct `.aaps`, script, tool, or environment file and rerun parse/compile/run. Do not stop at partial progress.",
    "",
    "## Expected Output",
    "",
    "- A short AAPS-oriented implementation report.",
    "- Any generated `.aaps` files or executable artifacts needed for the goal.",
    "- Evidence from parse/validate/compile/run, or a precise blocker if a backend/tool is unavailable.",
    "",
  ].join("\n");
  fs.writeFileSync(promptPath, text, "utf8");
  return { promptPath, projectRelativePromptPath, prompt: text, aapsCli, dockerSafeAapsCli };
}

function commandPrompt(goal, options) {
  const projectDir = path.resolve(options.project || ".");
  const text = String(goal || "").trim();
  if (!text) throw new Error("aaps prompt requires a goal string.");
  const backend = String(options.backend || process.env.AAPS_BACKEND || "aginti").toLowerCase();
  const handoff = buildPromptHandoff(projectDir, text, options);
  const payload = {
    ok: true,
    backend,
    project: projectDir,
    promptFile: handoff.projectRelativePromptPath,
    promptPath: handoff.promptPath,
    executed: false,
    command: [],
    status: "prompt_prepared",
  };
  const printOnly = options.printPrompt || options.dryRun || backend === "print";
  if (printOnly) {
    if (options.json) print(payload, true);
    else print(handoff.prompt, false);
    return;
  }
  if (backend !== "aginti") {
    throw new Error(`Unsupported AAPS prompt backend: ${backend}. Supported backends: aginti, print.`);
  }
  if (!shellCommandExists("aginti", projectDir)) {
    payload.ok = false;
    payload.status = "missing_backend";
    payload.error = "AgInTiFlow CLI (`aginti`) was not found on PATH. Install @lazyingart/agintiflow or rerun with --backend print.";
    if (options.json) print(payload, true);
    else {
      console.error(payload.error);
      console.error(`Prepared prompt: ${handoff.projectRelativePromptPath}`);
    }
    process.exit(1);
  }
  const args = [
    "--profile",
    options.profile || "aaps",
    "--cwd",
    projectDir,
    "--sandbox-mode",
    options.sandboxMode || "docker-workspace",
    "--package-install-policy",
    options.packageInstallPolicy || "prompt",
    "--routing",
    options.routing || "complex",
    "--allow-shell",
    "--allow-file-tools",
  ];
  if (options.agintiSafety) args.push("-s", String(options.agintiSafety));
  if (options.packageInstallPolicy === "allow" || options.approvePackageInstalls) {
    args.push("--approve-package-installs");
  }
  if (options.allowDestructive) args.push("--allow-destructive");
  if (options.provider) args.push("--provider", options.provider);
  if (options.model) args.push("--model", options.model);
  if (options.scoutCount) args.push("--scout-count", String(options.scoutCount));
  const handoffGoal = [
    `Read and execute the AAPS backend handoff file at ${handoff.projectRelativePromptPath}.`,
    "Treat that file as the authoritative task contract.",
    "Inspect it before editing, then parse/compile/run/verify declared outputs before finishing.",
  ].join(" ");
  args.push(handoffGoal);
  payload.command = ["aginti", ...args];
  payload.handoffMode = "file";
  payload.handoffGoal = handoffGoal;
  const auditStartedAtMs = Date.now();
  const result = childProcess.spawnSync("aginti", args, {
    cwd: projectDir,
    encoding: "utf8",
    stdio: options.json ? ["ignore", "pipe", "pipe"] : "inherit",
    maxBuffer: 20 * 1024 * 1024,
  });
  payload.executed = true;
  payload.exitCode = result.status ?? 1;
  payload.signal = result.signal || "";
  payload.postRunAudit = auditAapsBackendResult(projectDir, options.auditFile || "", {
    scope: String(options.auditScope || "entry").toLowerCase() === "project" ? "project" : "entry",
    sinceMs: auditStartedAtMs,
  });
  if (payload.exitCode === 0 && payload.postRunAudit.ok) payload.status = "succeeded_verified";
  else if (payload.exitCode === 0) payload.status = "backend_returned_unverified";
  else payload.status = "failed";
  if (options.json) {
    payload.stdout = result.stdout || "";
    payload.stderr = result.stderr || result.error?.message || "";
    payload.ok = payload.exitCode === 0 && payload.postRunAudit.ok;
    print(payload, true);
  }
  process.exit(payload.ok ? 0 : payload.exitCode || 1);
}

function runRunner(command, file, options) {
  const projectDir = path.resolve(options.project || ".");
  const runnerFile = path.isAbsolute(file) ? toProjectPath(path.relative(projectDir, file)) : file;
  const args = [
    path.join(__dirname, "aaps-runner.js"),
    command,
    "--project",
    ".",
    "--file",
    runnerFile,
  ];
  if (options.block) args.push("--block", options.block);
  if (options.runRoot) args.push("--run-root", options.runRoot);
  if (options.runId) args.push("--run-id", options.runId);
  if (options.dryRun) args.push("--dry-run");
  if (options.json) args.push("--json");
  const result = childProcess.spawnSync("node", args, {
    cwd: projectDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status || 0);
}

function runCompiler(command, positional, options) {
  const projectDir = path.resolve(options.project || ".");
  const args = [path.join(__dirname, "aaps-compiler.js"), command];
  positional.forEach((item) => args.push(item));
  args.push("--project", ".");
  if (options.mode) args.push("--mode", options.mode);
  if (options.file && !positional.length) args.push("--file", options.file);
  if (options.compileId) args.push("--compile-id", options.compileId);
  if (options.json) args.push("--json");
  const result = childProcess.spawnSync("node", args, {
    cwd: projectDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status || 0);
}

function commandParse(fileArg, options) {
  const projectDir = path.resolve(options.project || ".");
  const parsed = parseProjectAware(projectDir, fileArg);
  print(parsed.ir, true);
  process.exit(parsed.ir.diagnostics && parsed.ir.diagnostics.length ? 1 : 0);
}

function commandValidate(fileArg, options) {
  const projectDir = path.resolve(options.project || ".");
  const manifest = readManifest(projectDir);
  const fileMap = scanAapsFiles(projectDir);
  const files = Object.keys(fileMap).sort();
  const diagnostics = [];
  let ok = true;

  if (manifest) {
    const checked = AAPS.validateProjectManifest(manifest, files);
    diagnostics.push(...checked.diagnostics);
    ok = ok && checked.ok;
  }

  const targets = fileArg
    ? [resolveEntry(projectDir, manifest, fileArg)]
    : manifest
      ? AAPS.projectFileIndex(manifest).filter((file) => Object.prototype.hasOwnProperty.call(fileMap, file))
      : files;
  targets.forEach((file) => {
    const ir = manifest
      ? AAPS.parseAAPSProject(fileMap, file, manifest)
      : AAPS.parseAAPS(fileMap[file], { sourceFile: file });
    (ir.diagnostics || []).forEach((diagnostic) => {
      diagnostics.push({
        severity: "error",
        field: file,
        message: `line ${diagnostic.line || 1}: ${diagnostic.message}`,
      });
    });
  });
  ok = ok && !diagnostics.some((diagnostic) => diagnostic.severity === "error");

  const payload = {
    ok,
    project: manifest ? manifest.name : path.basename(projectDir),
    files: targets.length,
    diagnostics,
  };
  if (options.json) print(payload, true);
  else if (ok) print(`AAPS validation passed for ${targets.length} file${targets.length === 1 ? "" : "s"}.`, false);
  else print(JSON.stringify(payload, null, 2), false);
  process.exit(ok ? 0 : 1);
}

function commandAudit(fileArg, options) {
  const projectDir = path.resolve(options.project || ".");
  const payload = auditAapsBackendResult(projectDir, fileArg || "");
  payload.project = projectDir;
  if (options.json) print(payload, true);
  else if (payload.ok) print(`AAPS audit verified ${payload.workflowCount} workflow${payload.workflowCount === 1 ? "" : "s"}.`, false);
  else print(JSON.stringify(payload, null, 2), false);
  process.exit(payload.ok ? 0 : 1);
}

function commandStudio(options) {
  const root = path.resolve(__dirname, "..");
  const projectDir = path.resolve(options.project || ".");
  const host = String(options.host || "127.0.0.1");
  const port = String(options.port || "8796");
  const env = { ...process.env };
  if (options.mockCodex) env.AAPS_MOCK_CODEX = "1";
  env.AAPS_STUDIO_PROJECT = projectDir;
  const args = [
    path.join(root, "backend", "aaps_codex_server.py"),
    "--host",
    host,
    "--port",
    port,
  ];
  const result = childProcess.spawnSync("python3", args, {
    cwd: projectDir,
    env,
    stdio: "inherit",
  });
  process.exit(result.status || 0);
}

function main() {
  const { command, positional, options } = parseArgs(process.argv);
  const file = positional[0];
  const knownCommands = new Set([
    "help",
    "--help",
    "-h",
    "version",
    "--version",
    "-v",
    "parse",
    "validate",
    "studio",
    "compile",
    "compile-project",
    "missing",
    "generate-block",
    "generate-script",
    "prepare-setup",
    "plan",
    "check",
    "audit",
    "run",
    "check-block",
    "run-block",
    "prompt",
  ]);
  if (command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }
  if (command === "version" || command === "--version" || command === "-v") {
    console.log(packageVersion());
    return;
  }
  if (command === "prompt") {
    commandPrompt(positional.join(" "), options);
    return;
  }
  if (command === "parse") {
    commandParse(file, options);
    return;
  }
  if (command === "validate") {
    commandValidate(file, options);
    return;
  }
  if (command === "audit") {
    commandAudit(file, options);
    return;
  }
  if (command === "studio") {
    commandStudio(options);
    return;
  }
  if (["compile", "compile-project", "missing", "generate-block", "generate-script", "prepare-setup"].includes(command)) {
    runCompiler(command, positional, options);
    return;
  }
  if (command === "plan" || command === "check" || command === "run") {
    if (!file) throw new Error(`aaps ${command} requires a .aaps file.`);
    runRunner(command, file, options);
    return;
  }
  if (command === "check-block") {
    if (!file) throw new Error("aaps check-block requires a .aaps file.");
    if (!options.block) throw new Error("aaps check-block requires --block <id>.");
    runRunner("check", file, options);
    return;
  }
  if (command === "run-block") {
    if (!file) throw new Error("aaps run-block requires a .aaps file.");
    if (!options.block) throw new Error("aaps run-block requires --block <id>.");
    runRunner("run", file, options);
    return;
  }
  if (!knownCommands.has(command)) {
    commandPrompt([command, ...positional].join(" "), options);
    return;
  }
  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
