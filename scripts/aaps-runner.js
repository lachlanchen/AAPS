#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const AAPS = require("../src/aaps");

function parseArgs(argv) {
  const args = { command: argv[2] || "run" };
  for (let index = 3; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function nowIso() {
  return new Date().toISOString();
}

function safeRelative(base, value, label = "path") {
  const text = String(value || "").trim();
  if (!text) return base;
  const candidate = path.normalize(text);
  if (path.isAbsolute(candidate) || candidate.startsWith("..") || candidate.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`${label} must be project-relative: ${value}`);
  }
  const resolved = path.resolve(base, candidate);
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

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadRegistries(projectDir, manifest) {
  const paths = (manifest && manifest.paths) || {};
  const toolFile = path.join(projectDir, paths.tools || "tools", "tool_registry.json");
  const agentFile = path.join(projectDir, paths.agents || "agents", "agent_registry.json");
  const envFile = path.join(projectDir, paths.environments || "environments", "aaps_environment.json");
  const toolsRaw = readJsonIfExists(toolFile) || {};
  const agentsRaw = readJsonIfExists(agentFile) || {};
  const envRaw = readJsonIfExists(envFile) || {};
  const tools = {};
  const agents = {};
  function addTool(item) {
    if (!item) return;
    if (typeof item === "string") {
      tools[item] = tools[item] || { name: item, type: "command", command: item };
    } else if (item.name) {
      tools[item.name] = { ...(tools[item.name] || {}), ...item };
    }
  }
  function addAgent(item) {
    if (!item) return;
    if (typeof item === "string") {
      agents[item] = agents[item] || { name: item, invocation: "prompt" };
    } else if (item.name) {
      agents[item.name] = { ...(agents[item.name] || {}), ...item };
    }
  }
  (Array.isArray(toolsRaw.tools) ? toolsRaw.tools : Array.isArray(toolsRaw) ? toolsRaw : Object.values(toolsRaw)).forEach(addTool);
  (Array.isArray(agentsRaw.agents) ? agentsRaw.agents : Array.isArray(agentsRaw) ? agentsRaw : Object.values(agentsRaw)).forEach(addAgent);
  ((manifest && manifest.tools) || []).forEach(addTool);
  ((manifest && manifest.agents) || []).forEach(addAgent);
  return {
    tools,
    agents,
    environment: { ...((manifest && manifest.environment) || {}), ...envRaw },
    files: {
      tools: fs.existsSync(toolFile) ? path.relative(projectDir, toolFile).split(path.sep).join("/") : "",
      agents: fs.existsSync(agentFile) ? path.relative(projectDir, agentFile).split(path.sep).join("/") : "",
      environment: fs.existsSync(envFile) ? path.relative(projectDir, envFile).split(path.sep).join("/") : "",
    },
  };
}

function commandExists(command, cwd) {
  if (!command) return false;
  const result = spawnSync("sh", ["-lc", `command -v ${JSON.stringify(command)} >/dev/null 2>&1`], { cwd });
  return result.status === 0;
}

function pythonPackageExists(pkg, python, cwd) {
  const packageName = String(pkg || "").split(/[<>=!~]/)[0].trim();
  const aliases = {
    "opencv-python": "cv2",
    "scikit-image": "skimage",
    "pillow": "PIL",
    "pyyaml": "yaml",
  };
  const module = aliases[packageName] || packageName.replace(/-/g, "_");
  if (!module) return true;
  const result = spawnSync(python || "python3", ["-c", `import ${module}`], {
    cwd,
    encoding: "utf8",
  });
  return result.status === 0;
}

function globToRegex(pattern) {
  const escaped = String(pattern || "*")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "<<<GLOBSTAR>>>")
    .replace(/\*/g, "[^/]*")
    .replace(/<<<GLOBSTAR>>>/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function walkFiles(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(full);
    }
  }
  if (fs.statSync(root).isDirectory()) walk(root);
  else out.push(root);
  return out;
}

function listFiles(projectDir, folderOrPattern, pattern = "") {
  const normalized = String(folderOrPattern || "").replace(/\\/g, "/").replace(/^["']|["']$/g, "");
  if (!normalized) return [];
  const hasGlob = /[*?]/.test(normalized);
  const imageExtensions = new Set([".pgm", ".png", ".jpg", ".jpeg", ".tif", ".tiff"]);
  if (hasGlob) {
    const basePart = normalized.split(/[*?]/)[0].replace(/[/\\][^/\\]*$/, "");
    const base = basePart ? safeRelative(projectDir, basePart, "glob base") : projectDir;
    const regex = globToRegex(normalized);
    return walkFiles(base)
      .map((file) => path.relative(projectDir, file).split(path.sep).join("/"))
      .filter((file) => regex.test(file))
      .sort();
  }
  const folder = safeRelative(projectDir, normalized, "iterator folder");
  const files = walkFiles(folder).map((file) => path.relative(projectDir, file).split(path.sep).join("/"));
  if (pattern) {
    const regex = globToRegex(pattern);
    return files.filter((file) => regex.test(path.basename(file))).sort();
  }
  return files.filter((file) => imageExtensions.has(path.extname(file).toLowerCase())).sort();
}

function collectAapsFiles(projectDir) {
  const files = {};
  const skip = new Set([".git", ".aaps-work", "node_modules", "vendor", "runtime"]);
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".aaps")) {
        const full = path.join(dir, entry.name);
        files[path.relative(projectDir, full).split(path.sep).join("/")] = fs.readFileSync(full, "utf8");
      }
    }
  }
  walk(projectDir);
  return files;
}

function loadSource(options, projectDir, manifest) {
  if (options.source) {
    return {
      file: path.relative(projectDir, path.resolve(options.source)).split(path.sep).join("/"),
      source: fs.readFileSync(path.resolve(options.source), "utf8"),
    };
  }
  const file = options.file || (manifest && manifest.activeFile) || (manifest && manifest.defaultMain);
  if (!file) throw new Error("Provide --source or --file, or set activeFile/defaultMain in aaps.project.json.");
  const sourcePath = safeRelative(projectDir, file, "AAPS file");
  return { file, source: fs.readFileSync(sourcePath, "utf8") };
}

function parseLoaded(options, projectDir, manifest, loaded) {
  if (manifest && !options.source) {
    const files = collectAapsFiles(projectDir);
    return AAPS.parseAAPSProject(files, loaded.file, manifest);
  }
  return AAPS.parseAAPS(loaded.source, { sourceFile: loaded.file });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendJsonl(file, value) {
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`, "utf8");
}

function contextFrom(ir, manifest, runId, projectDir, runDir, registries = {}) {
  const pipeline = ir.pipeline || {};
  const variables = (manifest && manifest.variables) || {};
  const artifactRoot = pipeline.artifactDir || (manifest && manifest.artifactRoot) || "artifacts";
  const dataRoot = manifest && manifest.paths && manifest.paths.data ? manifest.paths.data : "data";
  const scriptsRoot = manifest && manifest.paths && manifest.paths.scripts ? manifest.paths.scripts : "scripts";
  const logsRoot = manifest && manifest.paths && manifest.paths.runs ? manifest.paths.runs : "runs";
  const environmentsRoot = manifest && manifest.paths && manifest.paths.environments ? manifest.paths.environments : "environments";
  const toolsRoot = manifest && manifest.paths && manifest.paths.tools ? manifest.paths.tools : "tools";
  const agentsRoot = manifest && manifest.paths && manifest.paths.agents ? manifest.paths.agents : "agents";
  const context = {
    ...variables,
    run_id: runId,
    project: projectDir,
    run_dir: runDir,
    artifacts: artifactRoot,
    artifact_dir: artifactRoot,
    database: pipeline.databasePath || (manifest && manifest.runDatabase) || "runtime/runs/aaps-runs.jsonl",
    "project.root": projectDir,
    "project.data": dataRoot,
    "project.artifacts": artifactRoot,
    "project.scripts": scriptsRoot,
    "project.environments": environmentsRoot,
    "project.tools": toolsRoot,
    "project.agents": agentsRoot,
    "project.runs": logsRoot,
    "run.id": runId,
    "run.dir": runDir,
    "run.artifacts": path.join(runDir, "artifacts"),
    "run.logs": path.join(runDir, "block_logs"),
  };
  Object.entries(registries.tools || {}).forEach(([name, tool]) => {
    if (tool.path) context[`tool.${name}.path`] = tool.path;
    if (tool.command) context[`tool.${name}.command`] = tool.command;
    context[`tool.${name}.name`] = name;
  });
  Object.entries(registries.agents || {}).forEach(([name, agent]) => {
    context[`agent.${name}.name`] = name;
    if (agent.invocation) context[`agent.${name}.invocation`] = agent.invocation;
  });
  (pipeline.inputPorts || []).forEach((port) => {
    context[port.name] = port.value || "";
    context[`input.${port.name}`] = port.value || "";
  });
  (pipeline.outputPorts || []).forEach((port) => {
    context[port.name] = port.value || "";
    context[`output.${port.name}`] = port.value || "";
  });
  Object.entries(process.env).forEach(([key, value]) => {
    context[`env.${key}`] = value;
  });
  return context;
}

function expand(value, context) {
  let output = String(value || "");
  for (let index = 0; index < 5; index += 1) {
    const next = output
      .replace(/\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g, (_, key) => String(context[key] ?? ""))
      .replace(/\$\{\s*([A-Za-z_][\w.-]*)\s*\}/g, (_, key) => String(context[key] ?? ""));
    if (next === output) break;
    output = next;
  }
  return output;
}

function unresolvedVariables(value, context) {
  const missing = [];
  String(value || "").replace(/\$\{\s*([A-Za-z_][\w.-]*)\s*\}|\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g, (_, a, b) => {
    const key = a || b;
    if (!Object.prototype.hasOwnProperty.call(context, key)) missing.push(key);
    return "";
  });
  return [...new Set(missing)];
}

function unescapeRuntimeString(value) {
  return String(value || "").replace(/\\"/g, '"').replace(/\\'/g, "'");
}

function resolveRuntimePath(projectDir, value, context) {
  const expanded = expand(value, context);
  if (path.isAbsolute(expanded)) return expanded;
  return safeRelative(projectDir, expanded, "runtime path");
}

function parseValidation(raw) {
  const text = String(raw || "").trim();
  let match = text.match(/^(?:file\s+)?exists\s+(.+)$/i);
  if (match) return { kind: "exists", path: AAPS.unquote ? AAPS.unquote(match[1]) : match[1].replace(/^["']|["']$/g, "") };
  match = text.match(/^nonempty\s+(.+)$/i);
  if (match) return { kind: "nonempty", path: AAPS.unquote ? AAPS.unquote(match[1]) : match[1].replace(/^["']|["']$/g, "") };
  match = text.match(/^mask_not_empty\s+(.+)$/i);
  if (match) return { kind: "mask_not_empty", path: AAPS.unquote ? AAPS.unquote(match[1]) : match[1].replace(/^["']|["']$/g, "") };
  match = text.match(/^(?:json|valid_json)\s+(.+)$/i);
  if (match) return { kind: "json", path: AAPS.unquote ? AAPS.unquote(match[1]) : match[1].replace(/^["']|["']$/g, "") };
  return { kind: "manual", text };
}

function checkValidation(rule, projectDir, context) {
  const parsed = parseValidation(rule);
  if (parsed.kind === "manual") {
    return { ok: true, status: "manual", rule, message: "Manual validation recorded but not executable." };
  }
  const target = resolveRuntimePath(projectDir, parsed.path, context);
  if (parsed.kind === "exists") {
    return { ok: fs.existsSync(target), status: fs.existsSync(target) ? "passed" : "failed", rule, path: target };
  }
  if (parsed.kind === "nonempty") {
    const ok = fs.existsSync(target) && fs.statSync(target).size > 0;
    return { ok, status: ok ? "passed" : "failed", rule, path: target };
  }
  if (parsed.kind === "json") {
    try {
      JSON.parse(fs.readFileSync(target, "utf8"));
      return { ok: true, status: "passed", rule, path: target };
    } catch (error) {
      return { ok: false, status: "failed", rule, path: target, message: error.message };
    }
  }
  if (parsed.kind === "mask_not_empty") {
    try {
      const text = fs.readFileSync(target, "utf8");
      const tokens = text
        .split(/\s+/)
        .filter((token) => token && !token.startsWith("#"));
      const numeric = tokens.slice(4).map(Number).filter((value) => Number.isFinite(value));
      const ok = numeric.some((value) => value > 0);
      return { ok, status: ok ? "passed" : "failed", rule, path: target };
    } catch (error) {
      return { ok: false, status: "failed", rule, path: target, message: error.message };
    }
  }
  return { ok: true, status: "manual", rule };
}

function shellAction(command, projectDir, timeoutMs, dryRun) {
  if (unsafeShellCommand(command)) {
    return { status: "failed", code: 126, stdout: "", stderr: "Unsafe shell command blocked by AAPS runtime policy.", command };
  }
  if (dryRun) return { status: "dry_run", code: 0, stdout: "", stderr: "", command };
  const result = spawnSync(command, {
    cwd: projectDir,
    shell: true,
    encoding: "utf8",
    timeout: timeoutMs || undefined,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status === 0 ? "succeeded" : "failed",
    code: result.status,
    signal: result.signal || "",
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
    command,
  };
}

function unsafeShellCommand(command) {
  const text = String(command || "").trim().toLowerCase();
  if (!text) return false;
  return [
    /\brm\s+-[a-z]*r[f]?\s+(\/|\*|~|\$home)/,
    /\bsudo\s+rm\b/,
    /\bmkfs\b/,
    /\bshutdown\b/,
    /\breboot\b/,
    /\bdd\s+if=/,
    /:\(\)\s*\{/,
  ].some((pattern) => pattern.test(text));
}

function pythonAction(action, projectDir, context, timeoutMs, dryRun) {
  const entry = expand(action.entry || "", context);
  if (!entry) return { status: "failed", code: 1, stdout: "", stderr: "python exec requires an entry" };
  const entryPath = safeRelative(projectDir, entry, "python entry");
  const python = expand(context["block.python"] || context["project.python"] || context["env.PYTHON"] || "python3", context);
  const args = [];
  Object.entries(action.args || {}).forEach(([key, value]) => {
    args.push(`--${key.replace(/_/g, "-")}`, expand(value, context));
  });
  const command = `${python} ${entry} ${args.map((arg) => JSON.stringify(arg)).join(" ")}`;
  if (dryRun) return { status: "dry_run", code: 0, stdout: "", stderr: "", command };
  const result = spawnSync(python, [entryPath, ...args], {
    cwd: projectDir,
    encoding: "utf8",
    timeout: timeoutMs || undefined,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status === 0 ? "succeeded" : "failed",
    code: result.status,
    signal: result.signal || "",
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
    command,
  };
}

function pythonInlineAction(action, projectDir, context, timeoutMs, dryRun, runDir, stepSlug) {
  const code = expand(action.code || "", context);
  if (!code.trim()) return { status: "failed", code: 1, stdout: "", stderr: "python_inline exec requires code" };
  const script = path.join(runDir, `${stepSlug}.inline.py`);
  const python = expand(context["block.python"] || context["project.python"] || context["env.PYTHON"] || "python3", context);
  fs.writeFileSync(script, code, "utf8");
  if (dryRun) return { status: "dry_run", code: 0, stdout: "", stderr: "", command: `${python} ${script}` };
  const result = spawnSync(python, [script], {
    cwd: projectDir,
    encoding: "utf8",
    timeout: timeoutMs || undefined,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, ...Object.fromEntries(Object.entries(context).map(([key, value]) => [`AAPS_${key.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase()}`, String(value)])) },
  });
  return {
    status: result.status === 0 ? "succeeded" : "failed",
    code: result.status,
    signal: result.signal || "",
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
    command: `${python} ${script}`,
  };
}

function nodeScriptAction(action, projectDir, context, timeoutMs, dryRun) {
  const entry = expand(action.entry || action.command || "", context);
  if (!entry) return { status: "failed", code: 1, stdout: "", stderr: "node_script exec requires an entry" };
  const entryPath = safeRelative(projectDir, entry, "node entry");
  const args = [];
  Object.entries(action.args || {}).forEach(([key, value]) => {
    args.push(`--${key.replace(/_/g, "-")}`, expand(value, context));
  });
  if (dryRun) return { status: "dry_run", code: 0, stdout: "", stderr: "", command: `node ${entry} ${args.join(" ")}` };
  const result = spawnSync("node", [entryPath, ...args], {
    cwd: projectDir,
    encoding: "utf8",
    timeout: timeoutMs || undefined,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status === 0 ? "succeeded" : "failed",
    code: result.status,
    signal: result.signal || "",
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
    command: `node ${entry} ${args.join(" ")}`,
  };
}

function npmScriptAction(action, projectDir, context, timeoutMs, dryRun) {
  const script = expand(action.command || action.entry || "", context);
  if (!script) return { status: "failed", code: 1, stdout: "", stderr: "npm_script exec requires a script name" };
  if (dryRun) return { status: "dry_run", code: 0, stdout: "", stderr: "", command: `npm run ${script}` };
  const result = spawnSync("npm", ["run", script], {
    cwd: projectDir,
    encoding: "utf8",
    timeout: timeoutMs || undefined,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status === 0 ? "succeeded" : "failed",
    code: result.status,
    signal: result.signal || "",
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
    command: `npm run ${script}`,
  };
}

function checkRequirements(ir, projectDir) {
  const pipeline = ir.pipeline || {};
  const checks = [];
  (pipeline.requiredCommands || []).forEach((command) => {
    const result = spawnSync("sh", ["-lc", `command -v ${JSON.stringify(command)} >/dev/null 2>&1`], { cwd: projectDir });
    checks.push({ kind: "command", name: command, ok: result.status === 0 });
  });
  (pipeline.requiredFiles || []).forEach((file) => {
    checks.push({ kind: "file", name: file, ok: fs.existsSync(safeRelative(projectDir, file, "required file")) });
  });
  (pipeline.requiredPythonPackages || []).forEach((pkg) => {
    const result = spawnSync("python3", ["-c", `import ${pkg.replace(/-/g, "_")}`], { cwd: projectDir });
    checks.push({ kind: "python_package", name: pkg, ok: result.status === 0 });
  });
  return checks;
}

function projectPython(manifest, registries) {
  return (
    (registries.environment && registries.environment.python) ||
    (manifest && manifest.environment && manifest.environment.python) ||
    "python3"
  );
}

function checkTool(name, registries, projectDir) {
  const tool = (registries.tools || {})[name];
  if (!tool) return { kind: "tool", name, ok: false, message: "Tool is not registered." };
  const checks = [];
  if (tool.path) {
    try {
      const ok = fs.existsSync(safeRelative(projectDir, tool.path, "tool path"));
      checks.push({ ok, message: ok ? `path found: ${tool.path}` : `path not found: ${tool.path}` });
    } catch (error) {
      checks.push({ ok: false, message: error.message });
    }
  }
  if (tool.command) {
    const ok = commandExists(tool.command, projectDir);
    checks.push({ ok, message: ok ? `command found: ${tool.command}` : `command not found: ${tool.command}` });
  }
  if (checks.length) {
    const ok = checks.every((check) => check.ok) || Boolean(tool.optional);
    return {
      kind: "tool",
      name,
      ok,
      optional: Boolean(tool.optional),
      message: checks.map((check) => check.message).join("; "),
      tool,
    };
  }
  return { kind: "tool", name, ok: true, message: "registered", tool };
}

function checkAgent(name, registries) {
  if (!name) return { kind: "agent", name, ok: true };
  const agent = (registries.agents || {})[name];
  if (!agent) {
    return {
      kind: "agent",
      name,
      ok: false,
      message: "Agent is not registered; AAPS can still prepare a prompt but cannot invoke it automatically.",
    };
  }
  return { kind: "agent", name, ok: true, message: "registered", agent };
}

function checkBlockReadiness(step, projectDir, manifest, registries, baseContext) {
  const checks = [];
  const stepContext = {
    ...baseContext,
    "block.name": step.id || "",
    "block.kind": step.kind || "",
    "block.path": step.path || "",
    "block.python": (step.environment && step.environment.python) || projectPython(manifest, registries),
  };
  function deferredCheck(kind, name, value, missing) {
    return {
      kind,
      name,
      path: value,
      ok: true,
      status: "deferred",
      deferred: true,
      missingVariables: missing,
      message: "resolved during loop execution or by an earlier runtime artifact",
    };
  }
  function isDeferredRuntimeValue(raw, missing) {
    const text = String(raw || "");
    if (missing.length && step.path.includes("for_each:")) return true;
    if (missing.some((key) => key === "item" || key.startsWith("item.") || key.startsWith("loop."))) return true;
    if (/\$\{\s*run\.artifacts\s*\}|\$\{\s*run\.dir\s*\}|\$\{\s*run\.logs\s*\}/.test(text)) return true;
    return false;
  }
  (step.inputs || []).forEach((port) => {
    const raw = port.value || stepContext[port.name] || "";
    const missing = unresolvedVariables(raw, stepContext);
    if (raw && isDeferredRuntimeValue(raw, missing)) {
      checks.push(deferredCheck("input", port.name, raw, missing));
      return;
    }
    const value = expand(raw, stepContext);
    if (port.required && !value) {
      checks.push({ kind: "input", name: port.name, ok: false, message: "required input has no value" });
      return;
    }
    if (value && ["file", "image", "json", "csv", "table", "folder", "path"].includes(String(port.type || "").toLowerCase())) {
      try {
        const full = resolveRuntimePath(projectDir, value, stepContext);
        const exists = fs.existsSync(full);
        const wantsFolder = String(port.type || "").toLowerCase() === "folder";
        checks.push({
          kind: "input",
          name: port.name,
          path: value,
          ok: !port.required || (exists && (!wantsFolder || fs.statSync(full).isDirectory())),
          message: exists ? "input exists" : "input does not exist yet",
        });
      } catch (error) {
        checks.push({ kind: "input", name: port.name, ok: false, message: error.message });
      }
    }
  });
  (step.outputs || []).forEach((port) => {
    if (!port.value) return;
    const missing = unresolvedVariables(port.value, stepContext);
    if (isDeferredRuntimeValue(port.value, missing)) {
      checks.push(deferredCheck("output", port.name, port.value, missing));
      return;
    }
    try {
      const full = resolveRuntimePath(projectDir, port.value, stepContext);
      const parent = path.dirname(full);
      checks.push({
        kind: "output",
        name: port.name,
        path: port.value,
        ok: fs.existsSync(parent) ? fs.statSync(parent).isDirectory() : true,
        message: fs.existsSync(parent) ? "output directory ready" : "output directory will be created if needed",
      });
    } catch (error) {
      checks.push({ kind: "output", name: port.name, ok: false, message: error.message });
    }
  });
  (step.actions || []).forEach((action) => {
    if (["python", "python_script", "node_script"].includes(action.type)) {
      const entry = expand(action.entry || "", stepContext);
      if (entry) {
        try {
          const full = safeRelative(projectDir, entry, "script");
          checks.push({ kind: "script", name: entry, path: entry, ok: fs.existsSync(full), message: fs.existsSync(full) ? "script exists" : "script missing" });
        } catch (error) {
          checks.push({ kind: "script", name: entry, ok: false, message: error.message });
        }
      }
    }
    if (["shell", "sh", "bash"].includes(action.type)) {
      const command = expand(action.command || "", stepContext).trim().split(/\s+/)[0];
      if (command) checks.push({ kind: "command", name: command, ok: commandExists(command, projectDir), message: commandExists(command, projectDir) ? "command found" : "command missing" });
    }
    if (action.type === "agent") {
      checks.push(checkAgent(action.command || action.entry || step.agent, registries));
    }
  });
  const requirements = step.requirements || {};
  const python = (step.environment && step.environment.python) || projectPython(manifest, registries);
  if (step.actions.some((action) => ["python", "python_script", "python_inline"].includes(action.type)) || (requirements.commands || []).includes("python")) {
    checks.push({ kind: "command", name: python, ok: commandExists(python, projectDir), message: commandExists(python, projectDir) ? "python found" : "python interpreter missing" });
  }
  (requirements.commands || []).forEach((command) => {
    checks.push({ kind: "command", name: command, ok: commandExists(command, projectDir), message: commandExists(command, projectDir) ? "command found" : "command missing" });
  });
  (requirements.files || []).forEach((file) => {
    try {
      const full = safeRelative(projectDir, expand(unescapeRuntimeString(file), stepContext), "required file");
      checks.push({ kind: "file", name: file, path: file, ok: fs.existsSync(full), message: fs.existsSync(full) ? "file exists" : "file missing" });
    } catch (error) {
      checks.push({ kind: "file", name: file, path: file, ok: false, message: error.message });
    }
  });
  (requirements.pythonPackages || []).forEach((pkg) => {
    checks.push({ kind: "python_package", name: pkg, ok: pythonPackageExists(pkg, python, projectDir), message: pythonPackageExists(pkg, python, projectDir) ? "package import ok" : "package missing" });
  });
  (requirements.nodePackages || []).forEach((pkg) => {
    checks.push({ kind: "node_package", name: pkg, ok: fs.existsSync(path.join(projectDir, "node_modules", pkg)), message: "checked node_modules" });
  });
  (requirements.tools || []).forEach((tool) => checks.push(checkTool(tool, registries, projectDir)));
  (requirements.agents || []).forEach((agent) => checks.push(checkAgent(agent, registries)));
  if (step.agent) checks.push(checkAgent(step.agent, registries));

  const failed = checks.filter((check) => !check.ok);
  const warnings = checks.filter((check) => !check.ok && ["tool", "agent", "node_package"].includes(check.kind));
  const status = failed.length
    ? warnings.length === failed.length
      ? "ready_with_warning"
      : `missing_${failed[0].kind}`
    : step.reviews && step.reviews.length && !step.executable
      ? "waiting_for_human_review"
      : "ready";
  return {
    id: step.id,
    path: step.path,
    kind: step.kind,
    status,
    ready: failed.length === 0 || warnings.length === failed.length,
    checks,
    suggestions: failed.map((check) => suggestionForCheck(check, projectDir, manifest, registries)),
  };
}

function suggestionForCheck(check, projectDir, manifest, registries) {
  const python = projectPython(manifest, registries);
  if (check.kind === "python_package") {
    return `${python} -m pip install ${check.name}`;
  }
  if (check.kind === "script") {
    return `Ask the compile agent to create ${check.path || check.name} from the block contract.`;
  }
  if (check.kind === "tool") {
    const tool = (registries.tools || {})[check.name] || {};
    return tool.install || tool.setup || `Register or install tool ${check.name}.`;
  }
  if (check.kind === "agent") {
    return `Add ${check.name} to agents/agent_registry.json or use compile_agent to prepare a prompt-only handoff.`;
  }
  if (check.kind === "command") {
    return `Install command ${check.name} in the project environment.`;
  }
  return check.message || `Resolve ${check.kind} ${check.name || ""}`.trim();
}

function buildReadiness(plan, projectDir, manifest, registries, context) {
  const blocks = (plan.steps || []).map((step) => checkBlockReadiness(step, projectDir, manifest, registries, context));
  const failed = blocks.filter((block) => !block.ready);
  return {
    version: "aaps_readiness/0.1",
    ok: failed.length === 0,
    status: failed.length ? "failed_preflight" : "ready",
    project: projectDir,
    registryFiles: registries.files || {},
    blocks,
  };
}

function filterPlanByBlock(plan, block, includeAncestors = false) {
  if (!block) return plan;
  const matched = (plan.steps || []).filter((step) => step.id === block || step.path.includes(block));
  const keep = new Set(matched.map((step) => step.path));
  if (includeAncestors) {
    matched.forEach((step) => {
      const parts = String(step.path || "").split("/");
      for (let index = 1; index < parts.length; index += 1) {
        keep.add(parts.slice(0, index).join("/"));
      }
    });
  }
  const steps = (plan.steps || []).filter((step) => keep.has(step.path));
  return {
    ...plan,
    steps,
    executableSteps: steps.filter((step) => step.executable).length,
    promptOnlySteps: steps.filter((step) => step.promptOnly).length,
  };
}

function timeoutMs(step) {
  const raw = String(step.timeout || "").trim();
  if (!raw) return 0;
  const match = raw.match(/^(\d+)(ms|s|m)?$/i);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = (match[2] || "ms").toLowerCase();
  if (unit === "m") return value * 60 * 1000;
  if (unit === "s") return value * 1000;
  return value;
}

function run(options) {
  const projectDir = path.resolve(options.project || ".");
  const manifest = readManifest(projectDir);
  const registries = loadRegistries(projectDir, manifest);
  const loaded = loadSource(options, projectDir, manifest);
  const ir = parseLoaded(options, projectDir, manifest, loaded);
  let plan = AAPS.buildExecutionPlan(ir, { project: manifest || null });
  if (options.block) {
    plan = filterPlanByBlock(plan, options.block, true);
  }
  const runId = options.runId || `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const runRoot = path.resolve(options.runRoot || path.join(projectDir, "runtime", "runs"));
  const runDir = path.join(runRoot, runId);
  ensureDir(runDir);
  ensureDir(path.join(runDir, "artifacts"));
  ensureDir(path.join(runDir, "block_logs"));
  ensureDir(path.join(runDir, "reports"));
  ensureDir(path.join(runDir, "errors"));
  ensureDir(path.join(runDir, "repair_prompts"));
  ensureDir(path.join(runDir, "setup_prompts"));
  writeJson(path.join(runDir, "resolved_workflow.json"), ir);
  writeJson(path.join(runDir, "execution_plan.json"), plan);

  const context = contextFrom(ir, manifest, runId, projectDir, runDir, registries);
  context["project.python"] = projectPython(manifest, registries);
  const readiness = buildReadiness(plan, projectDir, manifest, registries, context);
  const compilePlan = AAPS.buildAgentCompilePlan(plan, readiness);
  writeJson(path.join(runDir, "block_readiness.json"), readiness);
  writeJson(path.join(runDir, "tool_resolution.json"), {
    version: "aaps_tool_resolution/0.1",
    tools: registries.tools,
    agents: registries.agents,
    environment: registries.environment,
    registryFiles: registries.files,
  });
  writeJson(path.join(runDir, "agent_compile_plan.json"), compilePlan);
  compilePlan.requests.forEach((request, index) => {
    fs.writeFileSync(
      path.join(runDir, "setup_prompts", `${String(index + 1).padStart(2, "0")}-${AAPS.slug(request.block || "block")}.md`),
      request.prompt,
      "utf8"
    );
  });
  const dryRun = Boolean(options.dryRun);
  if (!dryRun && !readiness.ok) {
    const blocked = {
      ok: false,
      runId,
      status: "blocked_compile_check",
      file: loaded.file,
      project: projectDir,
      runDir,
      dryRun,
      diagnostics: ir.diagnostics,
      requirements: checkRequirements(ir, projectDir),
      readiness,
      compilePlan,
      plan: {
        steps: plan.steps.length,
        executableSteps: plan.executableSteps,
        promptOnlySteps: plan.promptOnlySteps,
        warnings: plan.warnings,
      },
      results: [],
      startedAt: nowIso(),
      finishedAt: nowIso(),
      message: "Execution stopped before side effects because compile/readiness checks failed.",
    };
    writeJson(path.join(runDir, "run.json"), blocked);
    fs.writeFileSync(
      path.join(runDir, "report.md"),
      [
        `# AAPS Run ${runId}`,
        "",
        `Status: ${blocked.status}`,
        `File: ${blocked.file}`,
        "",
        "Execution was blocked because required blocks, scripts, tools, agents, dependencies, or inputs are unresolved.",
        "",
        "## Compile Requests",
        ...(compilePlan.requests || []).map((request) => `- ${request.block}: ${request.missing.map((item) => item.kind).join(", ")}`),
        "",
      ].join("\n"),
      "utf8"
    );
    const database = resolveRuntimePath(projectDir, context.database, context);
    appendJsonl(database, {
      runId,
      file: loaded.file,
      status: blocked.status,
      runDir,
      block: options.block || "",
      finishedAt: blocked.finishedAt,
    });
    return blocked;
  }
  const eventsFile = path.join(runDir, "events.jsonl");
  const results = [];
  const fallbackVisited = new Set();

  function event(payload) {
    appendJsonl(eventsFile, { time: nowIso(), runId, ...payload });
  }

  function repairRecord(step, reason) {
    const file = path.join(runDir, "repair_prompts", `${step.id || "step"}-repair.md`);
    const body = [
      `# Repair Request: ${step.id}`,
      "",
      `Path: ${step.path}`,
      `Reason: ${reason}`,
      "",
      "## Recovery Rules",
      ...(step.recovery || []).map((item) => `- ${item}`),
      "",
      "## Suggested Repair",
      "Inspect stdout, stderr, declared artifacts, and validation failures. Apply the smallest focused repair, then rerun this step.",
      "",
    ].join("\n");
    fs.writeFileSync(file, body, "utf8");
    return file;
  }

  function contextForStep(step, overrides = {}) {
    const local = {
      ...context,
      ...overrides,
      "block.name": step.id || "",
      "block.kind": step.kind || "",
      "block.path": step.path || "",
      "block.python": (step.environment && step.environment.python) || context["project.python"] || "python3",
    };
    (step.inputs || []).forEach((port) => {
      const value = port.value ? expand(port.value, local) : local[port.name] || "";
      local[port.name] = value;
      local[`input.${port.name}`] = value;
    });
    (step.outputs || []).forEach((port) => {
      const value = port.value ? expand(port.value, local) : local[port.name] || "";
      local[port.name] = value;
      local[`output.${port.name}`] = value;
    });
    (step.artifacts || []).forEach((artifact) => {
      local[`artifact.${artifact.name}`] = artifact.path ? expand(artifact.path, local) : "";
    });
    return local;
  }

  function executeAction(step, action, attempt, overrides = {}) {
    const loopSuffix = overrides["loop.index"] !== undefined ? `-${overrides["loop.index"]}` : "";
    const stepSlug = AAPS.slug(`${step.id}${loopSuffix}-${action.id}-${attempt}`, "step");
    const stepContext = contextForStep(step, overrides);
    const expandedCommand = expand(action.command || "", stepContext);
    const missingVariables = [
      ...unresolvedVariables(action.command || "", stepContext),
      ...unresolvedVariables(action.entry || "", stepContext),
      ...unresolvedVariables(action.code || "", stepContext),
      ...Object.values(action.args || {}).flatMap((value) => unresolvedVariables(value, stepContext)),
    ];
    if (missingVariables.length) {
      const outcome = {
        status: "failed",
        code: 1,
        stdout: "",
        stderr: `Unresolved runtime variables: ${missingVariables.join(", ")}`,
        command: action.command || action.entry || action.type,
      };
      event({ type: "action", step: step.path, action: action.id, attempt, outcome });
      return outcome;
    }
    let outcome;
    if (["shell", "sh", "bash"].includes(action.type)) {
      outcome = shellAction(expandedCommand, projectDir, timeoutMs(step), dryRun);
    } else if (["python", "python_script"].includes(action.type)) {
      outcome = pythonAction(action, projectDir, stepContext, timeoutMs(step), dryRun);
    } else if (action.type === "python_inline") {
      outcome = pythonInlineAction(action, projectDir, stepContext, timeoutMs(step), dryRun, runDir, stepSlug);
    } else if (action.type === "node_script") {
      outcome = nodeScriptAction(action, projectDir, stepContext, timeoutMs(step), dryRun);
    } else if (action.type === "npm_script") {
      outcome = npmScriptAction(action, projectDir, stepContext, timeoutMs(step), dryRun);
    } else if (action.type === "noop") {
      outcome = { status: "succeeded", code: 0, stdout: "noop\n", stderr: "", command: "noop" };
    } else if (action.type === "manual") {
      outcome = { status: "manual_review", code: 0, stdout: "", stderr: "", command: action.command || "manual review" };
    } else if (action.type === "agent") {
      const agentName = action.command || action.entry || step.agent || "codex_repair_agent";
      const promptFile = path.join(runDir, "repair_prompts", `${stepSlug}.agent.md`);
      fs.writeFileSync(
        promptFile,
        [
          `# AAPS Agent Task: ${agentName}`,
          "",
          `Block: ${step.id}`,
          `Path: ${step.path}`,
          "",
          action.code || step.prompt || action.command || "Prepare or execute this agent-assisted block.",
          "",
          "## Context",
          JSON.stringify(stepContext, null, 2),
        ].join("\n"),
        "utf8"
      );
      outcome = { status: "agent_prompt_prepared", code: 0, stdout: promptFile, stderr: "", command: `agent ${agentName}` };
    } else if (action.type === "internal") {
      outcome = { status: "skipped", code: 0, stdout: "", stderr: "Internal adapters are not registered in this runtime.", command: action.command || "" };
    } else {
      outcome = {
        status: "skipped",
        code: 0,
        stdout: "",
        stderr: `No runtime adapter for exec type: ${action.type}`,
        command: action.command || action.entry || "",
      };
    }
    fs.writeFileSync(path.join(runDir, "block_logs", `${stepSlug}.stdout.log`), outcome.stdout || "", "utf8");
    fs.writeFileSync(path.join(runDir, "block_logs", `${stepSlug}.stderr.log`), outcome.stderr || "", "utf8");
    event({ type: "action", step: step.path, action: action.id, attempt, outcome });
    return outcome;
  }

  function executeStep(step, overrides = {}) {
    const stepContext = contextForStep(step, overrides);
    event({ type: "step_start", step: step.path, executable: step.executable, loop: overrides["loop.index"] ?? "" });
    if (!step.executable) {
      const status = step.promptOnly ? "prompt_only" : "planned";
      const result = { step: step.path, id: step.id, status, loop: overrides["loop.index"] ?? null, actions: [], validations: [], repair: "" };
      results.push(result);
      event({ type: "step_end", step: step.path, status });
      return result;
    }

    const actions = [];
    let ok = true;
    for (const action of step.actions) {
      let attempt = 0;
      let outcome;
      do {
        attempt += 1;
        outcome = executeAction(step, action, attempt, overrides);
      } while (outcome.status === "failed" && attempt <= step.retry);
      actions.push(outcome);
      if (outcome.status === "failed") ok = false;
    }

    const validations = [];
    const validationRules = [...(step.validations || [])];
    (step.artifacts || []).forEach((artifact) => {
      validationRules.push(`exists ${artifact.path}`);
      if (artifact.validation) validationRules.push(artifact.validation);
    });
    validationRules.forEach((rule) => {
      const checked = dryRun
        ? { ok: true, status: "dry_run", rule, message: "Validation skipped during dry run." }
        : checkValidation(rule, projectDir, stepContext);
      validations.push(checked);
      if (!checked.ok) ok = false;
      event({ type: "validation", step: step.path, validation: checked });
    });

    let repair = "";
    let fallbackResult = null;
    if (!ok && step.fallback) {
      event({ type: "fallback_start", step: step.path, fallback: step.fallback });
      if (/^run\s*:/i.test(step.fallback)) {
        const command = expand(step.fallback.replace(/^run\s*:/i, "").trim(), stepContext);
        fallbackResult = shellAction(command, projectDir, timeoutMs(step), dryRun);
        event({ type: "fallback_action", step: step.path, outcome: fallbackResult });
        ok = fallbackResult.status !== "failed";
      } else {
        const target = plan.steps.find((candidate) => candidate.id === step.fallback);
        if (target && target.path !== step.path && !fallbackVisited.has(target.path)) {
          fallbackVisited.add(target.path);
          fallbackResult = executeStep(target, overrides);
          ok = fallbackResult.status !== "failed";
        } else {
          fallbackResult = { status: "failed", error: `Fallback target not available: ${step.fallback}` };
        }
      }
      event({ type: "fallback_end", step: step.path, fallback: step.fallback, outcome: fallbackResult });
    }
    if (!ok && step.repair) {
      repair = repairRecord(step, "Action or validation failed.");
      event({ type: "repair_request", step: step.path, file: repair });
    }

    const status = ok ? (fallbackResult ? "recovered" : "succeeded") : "failed";
    const result = { step: step.path, id: step.id, status, loop: overrides["loop.index"] ?? null, item: overrides.item || "", actions, validations, fallback: fallbackResult, repair };
    results.push(result);
    event({ type: "step_end", step: step.path, status });
    return result;
  }

  const stepByPath = new Map(plan.steps.map((step) => [step.path, step]));
  function parentPath(stepPath) {
    const parts = String(stepPath || "").split("/");
    parts.pop();
    return parts.join("/");
  }
  const childrenByPath = new Map();
  plan.steps.forEach((step) => {
    const parent = parentPath(step.path);
    if (!childrenByPath.has(parent)) childrenByPath.set(parent, []);
    childrenByPath.get(parent).push(step);
  });
  const rootSteps = plan.steps.filter((step) => !stepByPath.has(parentPath(step.path)));

  function enumerateLoopItems(step, overrides) {
    const iterator = step.iterator || {};
    const source = unescapeRuntimeString(expand(iterator.source || "", { ...context, ...overrides }));
    const listCall = source.match(/^list_files\((.+?)(?:,\s*pattern\s*=\s*["']([^"']+)["'])?\)$/i);
    let files;
    if (listCall) files = listFiles(projectDir, listCall[1].trim().replace(/^["']|["']$/g, ""), listCall[2] || "");
    else files = listFiles(projectDir, source);
    return files.map((file, index) => {
      const parsed = path.parse(file);
      return {
        [iterator.item || "item"]: file,
        item: file,
        "item.path": file,
        "item.basename": parsed.base,
        "item.stem": parsed.name,
        "item.ext": parsed.ext,
        "item.index": index,
        "loop.index": index,
      };
    });
  }

  function conditionPasses(step, overrides) {
    if (!step.condition) return true;
    const expanded = expand(step.condition, { ...context, ...overrides }).trim();
    if (!expanded || /^(true|yes|1)$/i.test(expanded)) return true;
    if (/^(false|no|0)$/i.test(expanded)) return false;
    const exists = expanded.match(/^exists\s+(.+)$/i);
    if (exists) {
      try {
        return fs.existsSync(resolveRuntimePath(projectDir, exists[1].replace(/^["']|["']$/g, ""), { ...context, ...overrides }));
      } catch {
        return false;
      }
    }
    return true;
  }

  function executeTree(step, overrides = {}) {
    if (step.kind === "for_each") {
      const items = enumerateLoopItems(step, overrides);
      event({ type: "loop_start", step: step.path, iterator: step.iterator, count: items.length });
      const result = executeStep(step, overrides);
      const children = childrenByPath.get(step.path) || [];
      items.forEach((itemOverrides) => {
        const merged = { ...overrides, ...itemOverrides };
        event({ type: "loop_item", step: step.path, item: merged.item, index: merged["loop.index"] });
        children.forEach((child) => executeTree(child, merged));
      });
      event({ type: "loop_end", step: step.path, count: items.length });
      return result;
    }
    if (!conditionPasses(step, overrides)) {
      const result = { step: step.path, id: step.id, status: "skipped", reason: "condition_false", loop: overrides["loop.index"] ?? null, item: overrides.item || "" };
      results.push(result);
      event({ type: "step_skipped", step: step.path, reason: "condition_false" });
      return result;
    }
    const result = executeStep(step, overrides);
    (childrenByPath.get(step.path) || []).forEach((child) => executeTree(child, overrides));
    return result;
  }

  const requirements = checkRequirements(ir, projectDir);
  requirements.forEach((check) => event({ type: "requirement", check }));
  event({ type: "run_start", file: loaded.file, dryRun, block: options.block || "" });
  if (ir.diagnostics.length) {
    ir.diagnostics.forEach((diagnostic) => event({ type: "parser_diagnostic", diagnostic }));
  }
  requirements.filter((check) => !check.ok).forEach((check) => {
    event({ type: "missing_requirement", check });
  });
  rootSteps.forEach((step) => executeTree(step));

  const failed = results.filter((item) => item.status === "failed");
  const missingRequirements = requirements.filter((item) => !item.ok);
  const failedReadiness = (readiness.blocks || []).filter((item) => !item.ready);
  const summaryStatus = ir.diagnostics.length || missingRequirements.length || failedReadiness.length ? "failed" : failed.length ? "failed" : "succeeded";
  const summary = {
    ok: ir.diagnostics.length === 0 && failed.length === 0 && missingRequirements.length === 0 && failedReadiness.length === 0,
    runId,
    status: summaryStatus,
    file: loaded.file,
    project: projectDir,
    runDir,
    dryRun,
    diagnostics: ir.diagnostics,
    requirements,
    readiness,
    compilePlan,
    plan: {
      steps: plan.steps.length,
      executableSteps: plan.executableSteps,
      promptOnlySteps: plan.promptOnlySteps,
      warnings: plan.warnings,
    },
    results,
    startedAt: fs.existsSync(eventsFile) ? fs.statSync(eventsFile).birthtime.toISOString() : nowIso(),
    finishedAt: nowIso(),
  };
  writeJson(path.join(runDir, "run.json"), summary);
  fs.writeFileSync(
    path.join(runDir, "report.md"),
    [
      `# AAPS Run ${runId}`,
      "",
      `Status: ${summary.status}`,
      `File: ${summary.file}`,
      `Dry run: ${summary.dryRun}`,
      "",
      "## Steps",
      ...results.map((item) => `- ${item.status}: ${item.step}${item.repair ? ` (repair: ${item.repair})` : ""}`),
      "",
    ].join("\n"),
    "utf8"
  );
  const database = resolveRuntimePath(projectDir, context.database, context);
  appendJsonl(database, {
    runId,
    file: loaded.file,
    status: summary.status,
    runDir,
    block: options.block || "",
    finishedAt: summary.finishedAt,
  });
  event({ type: "run_end", status: summary.status });
  return summary;
}

function main() {
  const options = parseArgs(process.argv);
  if (options.command !== "run" && options.command !== "plan" && options.command !== "check") {
    throw new Error(`Unknown command: ${options.command}`);
  }
  const projectDir = path.resolve(options.project || ".");
  const manifest = readManifest(projectDir);
  const registries = loadRegistries(projectDir, manifest);
  const loaded = loadSource(options, projectDir, manifest);
  const ir = parseLoaded(options, projectDir, manifest, loaded);
  if (options.command === "plan" || options.command === "check") {
    let plan = AAPS.buildExecutionPlan(ir, { project: manifest || null });
    if (options.block) {
      plan = filterPlanByBlock(plan, options.block, false);
    }
    const runId = options.runId || `check-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const runRoot = path.resolve(options.runRoot || path.join(projectDir, "runtime", "runs"));
    const runDir = path.join(runRoot, runId);
    const context = contextFrom(ir, manifest, runId, projectDir, runDir, registries);
    context["project.python"] = projectPython(manifest, registries);
    const readiness = buildReadiness(plan, projectDir, manifest, registries, context);
    const compilePlan = AAPS.buildAgentCompilePlan(plan, readiness);
    console.log(JSON.stringify({ file: loaded.file, diagnostics: ir.diagnostics, plan, readiness, compilePlan }, null, 2));
    process.exit(ir.diagnostics.length || !readiness.ok ? 1 : 0);
  }
  const summary = run(options);
  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else console.log(`AAPS run ${summary.runId}: ${summary.status}\n${summary.runDir}`);
  process.exit(summary.ok ? 0 : 1);
}

module.exports = {
  appendJsonl,
  buildReadiness,
  checkAgent,
  checkBlockReadiness,
  checkRequirements,
  checkTool,
  collectAapsFiles,
  commandExists,
  contextFrom,
  ensureDir,
  expand,
  filterPlanByBlock,
  listFiles,
  loadRegistries,
  loadSource,
  parseArgs,
  parseLoaded,
  projectPython,
  pythonPackageExists,
  readJsonIfExists,
  readManifest,
  run,
  safeRelative,
  suggestionForCheck,
  unresolvedVariables,
  writeJson,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const payload = { ok: false, status: "failed", error: error.message };
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }
}
