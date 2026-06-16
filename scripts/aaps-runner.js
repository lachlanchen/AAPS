#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync, spawn } = require("child_process");
const AAPS = require("../src/aaps");

function parseArgs(argv) {
  const args = { command: argv[2] || "run" };
  for (let index = 3; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      if (key === "set") args.set = [...(Array.isArray(args.set) ? args.set : []), "true"];
      else args[key] = true;
    }
    else {
      if (key === "set") args.set = [...(Array.isArray(args.set) ? args.set : []), next];
      else args[key] = next;
      index += 1;
    }
  }
  return args;
}

function normalizeRuntimeOverrideKey(rawKey) {
  const key = String(rawKey || "")
    .trim()
    .replace(/^(input|param|parameter)\./i, "");
  if (!/^[A-Za-z_][\w.-]*$/.test(key)) {
    throw new Error(`Invalid runtime override key: ${rawKey}`);
  }
  return key;
}

function parseRuntimeOverrides(rawValue) {
  const values = Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : [];
  return values
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => {
      const separator = item.indexOf("=");
      if (separator < 1) throw new Error(`Runtime override must use name=value syntax: ${item}`);
      return {
        key: normalizeRuntimeOverrideKey(item.slice(0, separator)),
        value: item.slice(separator + 1),
        raw: item,
      };
    });
}

function collectRuntimeNodes(ir) {
  const nodes = [];
  function walk(list) {
    (list || []).forEach((node) => {
      nodes.push(node);
      walk(node.children || []);
    });
  }
  const pipeline = ir.pipeline || {};
  walk(pipeline.agents || []);
  walk(pipeline.blocks || []);
  walk(pipeline.skills || []);
  walk(pipeline.tasks || []);
  return nodes;
}

function applyOverrideToPorts(ports, override, target, applied) {
  (ports || []).forEach((port) => {
    if (port && port.name === override.key) {
      port.value = String(override.value);
      applied.push({ key: override.key, value: String(override.value), target });
    }
  });
}

function applyOverrideToParams(params, override, target, applied) {
  if (!params || typeof params !== "object" || !Object.prototype.hasOwnProperty.call(params, override.key)) return;
  params[override.key] = String(override.value);
  applied.push({ key: override.key, value: String(override.value), target });
}

function applyRuntimeOverrides(ir, overrides) {
  const parsed = Array.isArray(overrides) ? overrides : [];
  const applied = [];
  const pipeline = ir.pipeline || {};
  parsed.forEach((override) => {
    applyOverrideToPorts(pipeline.inputPorts || pipeline.inputs, override, "pipeline.input", applied);
    applyOverrideToParams(pipeline.params, override, "pipeline.param", applied);
    collectRuntimeNodes(ir).forEach((node) => {
      const label = `${node.kind || "node"}.${node.id || "unnamed"}`;
      applyOverrideToPorts(node.inputs, override, `${label}.input`, applied);
      applyOverrideToParams(node.params, override, `${label}.param`, applied);
      applyOverrideToParams(node.parameters || (node.contract && node.contract.parameters), override, `${label}.parameter`, applied);
    });
  });
  const appliedKeys = new Set(applied.map((item) => item.key));
  return {
    overrides: parsed.map((item) => ({ key: item.key, value: String(item.value) })),
    applied,
    unmatched: parsed.filter((item) => !appliedKeys.has(item.key)).map((item) => item.key),
  };
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

function mergeWorkflowRegistries(registries, ir) {
  const merged = {
    tools: { ...((registries && registries.tools) || {}) },
    agents: { ...((registries && registries.agents) || {}) },
    environment: { ...((registries && registries.environment) || {}) },
    files: { ...((registries && registries.files) || {}) },
  };
  const pipeline = (ir && ir.pipeline) || {};
  for (const agent of pipeline.agents || []) {
    const name = agent && (agent.name || agent.id);
    if (!name) continue;
    merged.agents[name] = {
      name,
      invocation: agent.model === "local" ? "local" : "prompt",
      source: "workflow",
      role: agent.role || "",
      model: agent.model || "",
      tools: agent.tools || [],
      ...(merged.agents[name] || {}),
    };
  }
  return merged;
}

function commandExists(command, cwd) {
  if (!command) return false;
  const result = spawnSync("sh", ["-lc", `command -v ${JSON.stringify(command)} >/dev/null 2>&1`], { cwd });
  return result.status === 0;
}

function gpuAvailable(cwd) {
  if (commandExists("nvidia-smi", cwd)) {
    const result = spawnSync("nvidia-smi", ["-L"], { cwd, encoding: "utf8" });
    return result.status === 0 && Boolean(String(result.stdout || "").trim());
  }
  return false;
}

function hasRequiredGpuRequirement(requirements) {
  return [...((requirements && requirements.pipelineGpu) || []), ...((requirements && requirements.gpu) || [])].some((gpuRequirement) => {
    const value = String(gpuRequirement || "preferred").toLowerCase();
    return ["required", "require", "true", "cuda", "nvidia"].includes(value);
  });
}

function checkGpuScriptContract(scriptPath) {
  let source = "";
  try {
    source = fs.readFileSync(scriptPath, "utf8");
  } catch (error) {
    return [];
  }
  const checks = [];
  if (/CellposeModel\s*\([^)]*gpu\s*=\s*False/i.test(source)) {
    checks.push({
      kind: "gpu_contract",
      name: path.basename(scriptPath),
      path: scriptPath,
      ok: false,
      message: "script hard-codes CellposeModel(gpu=False) while the block requires GPU execution",
    });
  }
  return checks;
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

function splitValidationArgs(text) {
  const args = [];
  const pattern = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(String(text || "")))) {
    args.push(unescapeRuntimeString(match[1] ?? match[2] ?? match[3] ?? ""));
  }
  return args;
}

function parseColumnList(values) {
  return values
    .join(" ")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function compareNumber(actual, comparator, expected) {
  if (comparator === ">" || comparator === "gt") return actual > expected;
  if (comparator === ">=" || comparator === "gte") return actual >= expected;
  if (comparator === "<" || comparator === "lt") return actual < expected;
  if (comparator === "<=" || comparator === "lte") return actual <= expected;
  if (comparator === "=" || comparator === "==" || comparator === "eq") return actual === expected;
  return false;
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < String(line || "").length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function readCsvTable(file) {
  const lines = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  return { headers, rows: lines.slice(1).map(parseCsvLine) };
}

function readJsonField(value, field) {
  if (!field) return { exists: true, value };
  const parts = String(field)
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  let current = value;
  for (const part of parts) {
    if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(Object(current), part)) {
      return { exists: false, value: undefined };
    }
    current = current[part];
  }
  return { exists: current !== undefined && current !== null, value: current };
}

function checkPgmMaskNotEmpty(target) {
  const text = fs.readFileSync(target, "utf8");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean);
  const tokens = lines.join(" ").split(/\s+/).filter(Boolean);
  const numeric = tokens.slice(4).map(Number).filter((value) => Number.isFinite(value));
  return numeric.some((value) => value > 0);
}

function checkRasterMaskNotEmpty(target, projectDir) {
  if (path.extname(target).toLowerCase() === ".pgm") {
    return { ok: checkPgmMaskNotEmpty(target), message: "" };
  }
  const code = `
import sys
from pathlib import Path
path = Path(sys.argv[1])
try:
    import numpy as np
except Exception as exc:
    raise SystemExit(f"numpy unavailable for image validation: {exc}")
arr = None
errors = []
for loader in ("matplotlib", "PIL", "imageio"):
    try:
        if loader == "matplotlib":
            import matplotlib.image as mpimg
            arr = mpimg.imread(path)
        elif loader == "PIL":
            from PIL import Image
            arr = np.asarray(Image.open(path))
        else:
            import imageio.v3 as iio
            arr = iio.imread(path)
        break
    except Exception as exc:
        errors.append(f"{loader}: {exc}")
if arr is None:
    raise SystemExit("; ".join(errors))
arr = np.asarray(arr)
if arr.ndim == 3 and arr.shape[-1] >= 3:
    arr = arr[..., :3]
print("1" if arr.size and float(np.nanmax(arr)) > 0 else "0")
`;
  const result = spawnSync("python3", ["-c", code, target], {
    cwd: projectDir,
    encoding: "utf8",
    timeout: 15000,
  });
  if (result.status !== 0) {
    return { ok: false, message: result.stderr || result.stdout || "image validation failed" };
  }
  return {
    ok: result.stdout.trim() === "1",
    message: result.stdout.trim() === "1" ? "" : "image contains no positive foreground pixels",
  };
}

function resolveRuntimePath(projectDir, value, context) {
  const expanded = expand(value, context);
  if (path.isAbsolute(expanded)) return expanded;
  return safeRelative(projectDir, expanded, "runtime path");
}

function parseValidation(raw) {
  const text = String(raw || "").trim();
  const tokens = splitValidationArgs(text);
  const command = String(tokens[0] || "").toLowerCase();
  const pathArg = command === "file" && String(tokens[1] || "").toLowerCase() === "exists" ? tokens[2] : tokens[1];
  if ((command === "file" && String(tokens[1] || "").toLowerCase() === "exists") || command === "exists") {
    return { kind: "exists", path: pathArg };
  }
  if (command === "nonempty") return { kind: "nonempty", path: pathArg };
  if (command === "mask_not_empty" || command === "png_nonempty" || command === "image_nonempty") {
    return { kind: "mask_not_empty", path: pathArg };
  }
  if (command === "json" || command === "valid_json") return { kind: "json", path: pathArg };
  if (command === "json_field") return { kind: "json_field", path: pathArg, field: tokens[2] || "" };
  if (command === "csv_min_rows" || command === "csv_rows" || command === "table_min_rows" || command === "table_rows") {
    const hasComparator = /^[<>]=?|={1,2}$/.test(tokens[2] || "");
    const comparator = hasComparator ? tokens[2] : ">=";
    const expectedToken = hasComparator ? tokens[3] : tokens[2];
    return { kind: "csv_rows", path: pathArg, comparator, expected: expectedToken };
  }
  if (command === "csv_columns" || command === "table_columns") {
    return { kind: "csv_columns", path: pathArg, columns: parseColumnList(tokens.slice(2)) };
  }
  if (command === "file_size") {
    const hasComparator = /^[<>]=?|={1,2}$/.test(tokens[2] || "");
    const comparator = hasComparator ? tokens[2] : ">=";
    const expectedToken = hasComparator ? tokens[3] : tokens[2];
    return { kind: "file_size", path: pathArg, comparator, expected: expectedToken };
  }
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
  if (parsed.kind === "json_field") {
    try {
      const json = JSON.parse(fs.readFileSync(target, "utf8"));
      const field = readJsonField(json, parsed.field);
      return {
        ok: field.exists,
        status: field.exists ? "passed" : "failed",
        rule,
        path: target,
        observed: field.exists ? JSON.stringify(field.value).slice(0, 240) : "",
        expected: parsed.field,
      };
    } catch (error) {
      return { ok: false, status: "failed", rule, path: target, message: error.message };
    }
  }
  if (parsed.kind === "csv_rows") {
    try {
      const table = readCsvTable(target);
      const expected = Number(expand(parsed.expected, context));
      const ok = Number.isFinite(expected) && compareNumber(table.rows.length, parsed.comparator, expected);
      return {
        ok,
        status: ok ? "passed" : "failed",
        rule,
        path: target,
        observed: table.rows.length,
        expected: `${parsed.comparator} ${expected}`,
      };
    } catch (error) {
      return { ok: false, status: "failed", rule, path: target, message: error.message };
    }
  }
  if (parsed.kind === "csv_columns") {
    try {
      const table = readCsvTable(target);
      const missing = parsed.columns.filter((column) => !table.headers.includes(column));
      return {
        ok: missing.length === 0,
        status: missing.length === 0 ? "passed" : "failed",
        rule,
        path: target,
        observed: table.headers.join(","),
        expected: parsed.columns.join(","),
        message: missing.length ? `missing columns: ${missing.join(", ")}` : "",
      };
    } catch (error) {
      return { ok: false, status: "failed", rule, path: target, message: error.message };
    }
  }
  if (parsed.kind === "file_size") {
    try {
      const actual = fs.statSync(target).size;
      const expected = Number(expand(parsed.expected, context));
      const ok = Number.isFinite(expected) && compareNumber(actual, parsed.comparator, expected);
      return {
        ok,
        status: ok ? "passed" : "failed",
        rule,
        path: target,
        observed: actual,
        expected: `${parsed.comparator} ${expected}`,
      };
    } catch (error) {
      return { ok: false, status: "failed", rule, path: target, message: error.message };
    }
  }
  if (parsed.kind === "mask_not_empty") {
    try {
      const checked = checkRasterMaskNotEmpty(target, projectDir);
      return { ok: checked.ok, status: checked.ok ? "passed" : "failed", rule, path: target, message: checked.message };
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
  const shellArgs = commandExists("bash", projectDir)
    ? ["bash", ["-o", "pipefail", "-lc", command]]
    : ["sh", ["-lc", command]];
  const result = spawnSync(shellArgs[0], shellArgs[1], {
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
  Object.entries(step.parameters || (step.contract && step.contract.parameters) || {}).forEach(([key, value]) => {
    const expanded = expand(value, stepContext);
    stepContext[`param.${key}`] = expanded;
    stepContext[`parameter.${key}`] = expanded;
  });
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
  const requirements = step.requirements || {};
  const requiresGpu = hasRequiredGpuRequirement(requirements);
  (step.actions || []).forEach((action) => {
    if (["python", "python_script", "node_script"].includes(action.type)) {
      const entry = expand(action.entry || "", stepContext);
      if (entry) {
        try {
          const full = safeRelative(projectDir, entry, "script");
          checks.push({ kind: "script", name: entry, path: entry, ok: fs.existsSync(full), message: fs.existsSync(full) ? "script exists" : "script missing" });
          if (requiresGpu && fs.existsSync(full) && ["python", "python_script"].includes(action.type)) {
            for (const scriptCheck of checkGpuScriptContract(full)) {
              checks.push({ ...scriptCheck, name: entry, path: entry });
            }
          }
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
  [...(requirements.pipelineGpu || []), ...(requirements.gpu || [])].forEach((gpuRequirement) => {
    const value = String(gpuRequirement || "preferred").toLowerCase();
    const required = ["required", "require", "true", "cuda", "nvidia"].includes(value);
    const ok = gpuAvailable(projectDir);
    checks.push({
      kind: "gpu",
      name: value,
      ok: ok || !required,
      required,
      available: ok,
      message: ok ? "GPU detected with nvidia-smi" : required ? "required GPU not detected" : "preferred GPU not detected; CPU fallback allowed",
    });
  });
  (requirements.tools || []).forEach((tool) => checks.push(checkTool(tool, registries, projectDir)));
  (requirements.agents || []).forEach((agent) => checks.push(checkAgent(agent, registries)));
  if (step.agent) checks.push(checkAgent(step.agent, registries));

  const failed = checks.filter((check) => !check.ok);
  const warnings = checks.filter((check) => !check.ok && ["tool", "agent", "node_package"].includes(check.kind));
  const softWarnings = checks.filter((check) => check.kind === "gpu" && !check.available && !check.required);
  const status = failed.length
    ? warnings.length === failed.length
      ? "ready_with_warning"
      : `missing_${failed[0].kind}`
    : softWarnings.length
      ? "ready_with_warning"
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
    suggestions: [...failed, ...softWarnings].map((check) => suggestionForCheck(check, projectDir, manifest, registries)),
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
  if (check.kind === "gpu") {
    return check.required
      ? "Install/configure NVIDIA GPU support for this project, or change the block to `requires_gpu \"preferred\"` with a CPU fallback."
      : "GPU was preferred but not detected; AAPS can continue on CPU or route to a GPU worker later.";
  }
  if (check.kind === "gpu_contract") {
    return `Ask the compile agent to update ${check.path || check.name} so the GPU-required block actually enables GPU execution or records an explicit fallback.`;
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
    blockFilter: {
      block,
      matched: matched.length,
      includeAncestors,
    },
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

function startRuntimeWatchdog(runDir, runId, options = {}) {
  if (String(process.env.AAPS_DISABLE_RUNTIME_WATCHDOG || "").match(/^(1|true|yes)$/i)) {
    return { enabled: false, reason: "disabled_by_env" };
  }
  const watchdogDir = path.join(runDir, "watchdog");
  ensureDir(watchdogDir);
  const statusPath = path.join(watchdogDir, "status.json");
  const donePath = path.join(watchdogDir, "done");
  const alertsPath = path.join(watchdogDir, "alerts.jsonl");
  const repairDir = path.join(runDir, "repair_prompts");
  const intervalMs = Math.max(1000, Number(options.watchdogIntervalMs || process.env.AAPS_WATCHDOG_INTERVAL_MS || 10000));
  const stallMs = Math.max(intervalMs * 2, Number(options.watchdogStallMs || process.env.AAPS_WATCHDOG_STALL_MS || 120000));
  const maxMs = Math.max(stallMs, Number(options.watchdogMaxMs || process.env.AAPS_WATCHDOG_MAX_MS || 24 * 60 * 60 * 1000));
  const code = `
const fs = require("fs");
const path = require("path");
const statusPath = process.argv[1];
const donePath = process.argv[2];
const alertsPath = process.argv[3];
const repairDir = process.argv[4];
const intervalMs = Number(process.argv[5]);
const stallMs = Number(process.argv[6]);
const maxMs = Number(process.argv[7]);
const started = Date.now();
let lastAlertKey = "";
function readStatus() {
  try { return JSON.parse(fs.readFileSync(statusPath, "utf8")); }
  catch { return {}; }
}
function appendJsonl(file, item) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(item) + "\\n");
}
function safeName(text) {
  return String(text || "run").toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "run";
}
function writePrompt(status, ageMs) {
  fs.mkdirSync(repairDir, { recursive: true });
  const name = safeName(status.activeStep || status.activeAction || status.state || "run");
  const promptPath = path.join(repairDir, "watchdog-stall-" + name + ".md");
  const body = [
    "# AAPS Watchdog Dormant Repair Agent",
    "",
    "The runtime heartbeat for this AAPS run appears stale. Do not assume the run is failed; inspect process state, block logs, artifacts, and events first.",
    "",
    "## Run",
    "- Run ID: " + (status.runId || ""),
    "- Project: " + (status.project || ""),
    "- Workflow: " + (status.file || ""),
    "- Active step: " + (status.activeStep || ""),
    "- Active action: " + (status.activeAction || ""),
    "- State: " + (status.state || ""),
    "- Heartbeat age ms: " + ageMs,
    "",
    "## Required repair loop",
    "1. Inspect events.jsonl, block_logs, stdout/stderr, validation records, and generated artifacts.",
    "2. If the block is stalled, stop only the specific child process if it is safe and clearly associated with this run.",
    "3. Repair the smallest project-local workflow, script, tool, or environment issue.",
    "4. Rerun a focused AAPS command such as \`aaps check\`, \`aaps run-block\`, or the failed report block.",
    "5. If this is a report block, fix the report generator first; do not hand-edit generated TeX/PDF as the durable solution.",
    "",
    "## Last status",
    "\`\`\`json",
    JSON.stringify(status, null, 2),
    "\`\`\`",
    "",
  ].join("\\n");
  fs.writeFileSync(promptPath, body, "utf8");
  return promptPath;
}
const timer = setInterval(() => {
  if (fs.existsSync(donePath) || Date.now() - started > maxMs) {
    clearInterval(timer);
    process.exit(0);
  }
  let stat;
  try { stat = fs.statSync(statusPath); }
  catch { return; }
  const ageMs = Date.now() - stat.mtimeMs;
  if (ageMs < stallMs) return;
  const status = readStatus();
  if (["finished", "failed", "succeeded", "blocked"].includes(String(status.state || ""))) return;
  const key = [status.activeStep || "", status.activeAction || "", status.state || ""].join("|");
  if (key === lastAlertKey) return;
  lastAlertKey = key;
  const promptPath = writePrompt(status, Math.round(ageMs));
  appendJsonl(alertsPath, { time: new Date().toISOString(), runId: status.runId || "", state: status.state || "", activeStep: status.activeStep || "", activeAction: status.activeAction || "", ageMs: Math.round(ageMs), promptPath });
}, intervalMs);
`;
  try {
    const child = spawn(process.execPath, ["-e", code, statusPath, donePath, alertsPath, repairDir, String(intervalMs), String(stallMs), String(maxMs)], {
      cwd: runDir,
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return { enabled: true, pid: child.pid, statusPath, donePath, alertsPath, intervalMs, stallMs, maxMs };
  } catch (error) {
    return { enabled: false, error: error.message };
  }
}

function run(options) {
  const projectDir = path.resolve(options.project || ".");
  const manifest = readManifest(projectDir);
  let registries = loadRegistries(projectDir, manifest);
  const loaded = loadSource(options, projectDir, manifest);
  const ir = parseLoaded(options, projectDir, manifest, loaded);
  const runtimeOverrides = applyRuntimeOverrides(ir, parseRuntimeOverrides(options.set));
  registries = mergeWorkflowRegistries(registries, ir);
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
  if (options.block && plan.blockFilter && plan.blockFilter.matched === 0) {
    const failed = {
      ok: false,
      runId,
      status: "failed_missing_block",
      file: loaded.file,
      project: projectDir,
      runDir,
      dryRun,
      runtimeOverrides,
      diagnostics: ir.diagnostics,
      requirements: checkRequirements(ir, projectDir),
      readiness,
      compilePlan,
      plan: {
        steps: plan.steps.length,
        executableSteps: plan.executableSteps,
        promptOnlySteps: plan.promptOnlySteps,
        warnings: plan.warnings,
        blockFilter: plan.blockFilter,
      },
      results: [],
      startedAt: nowIso(),
      finishedAt: nowIso(),
      message: `No executable plan step matched requested block: ${options.block}`,
    };
    writeJson(path.join(runDir, "run.json"), failed);
    fs.writeFileSync(
      path.join(runDir, "report.md"),
      [
        `# AAPS Run ${runId}`,
        "",
        `Status: ${failed.status}`,
        `File: ${failed.file}`,
        `Requested block: ${options.block}`,
        "",
        failed.message,
        "",
      ].join("\n"),
      "utf8"
    );
    const database = resolveRuntimePath(projectDir, context.database, context);
    appendJsonl(database, {
      runId,
      file: loaded.file,
      status: failed.status,
      runDir,
      block: options.block || "",
      finishedAt: failed.finishedAt,
    });
    return failed;
  }
  if (!dryRun && !readiness.ok) {
    const blocked = {
      ok: false,
      runId,
      status: "blocked_compile_check",
      file: loaded.file,
      project: projectDir,
      runDir,
      dryRun,
      runtimeOverrides,
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
  const watchdog = startRuntimeWatchdog(runDir, runId, options);
  writeJson(path.join(runDir, "runtime_watchdog.json"), {
    version: "aaps_runtime_watchdog/0.1",
    runId,
    ...watchdog,
  });
  const results = [];
  const fallbackVisited = new Set();
  const methodSelections = [];

  function touchWatchdog(state, extra = {}) {
    const watchdogDir = path.join(runDir, "watchdog");
    ensureDir(watchdogDir);
    writeJson(path.join(watchdogDir, "status.json"), {
      version: "aaps_watchdog_status/0.1",
      time: nowIso(),
      pid: process.pid,
      runId,
      state,
      file: loaded.file,
      project: projectDir,
      block: options.block || "",
      runDir,
      eventsFile,
      ...extra,
    });
  }

  function finishWatchdog(state, extra = {}) {
    touchWatchdog(state, extra);
    const donePath = path.join(runDir, "watchdog", "done");
    ensureDir(path.dirname(donePath));
    fs.writeFileSync(donePath, `${nowIso()} ${state}\n`, "utf8");
  }

  function event(payload) {
    appendJsonl(eventsFile, { time: nowIso(), runId, ...payload });
  }

  function writeMethodSelections() {
    writeJson(path.join(runDir, "method_selection.json"), {
      version: "aaps_method_selection/0.1",
      runId,
      selections: methodSelections,
    });
  }

  function recordMethodSelection(stage, chooseSteps, candidates, selected, reason, overrides = {}) {
    const selection = {
      time: nowIso(),
      stage: stage.path,
      stageId: stage.id,
      selected: selected ? selected.id : "",
      selectedPath: selected ? selected.path : "",
      candidates: candidates.map((item) => ({ id: item.id, path: item.path, condition: item.condition || "" })),
      router: chooseSteps.map((item) => ({ id: item.id, path: item.path, prompt: item.prompt || "" })),
      reason,
      loop: overrides["loop.index"] ?? null,
      item: overrides.item || "",
    };
    methodSelections.push(selection);
    writeMethodSelections();
    event({ type: "method_selection", selection });
    return selection;
  }

  function repairRecord(step, reason, details = {}) {
    const file = path.join(runDir, "repair_prompts", `${step.id || "step"}-repair.md`);
    const jsonFile = path.join(runDir, "repair_prompts", `${step.id || "step"}-repair.json`);
    const reportGuidance = /report|latex|tex|pdf/i.test(`${step.id} ${step.path} ${(step.outputs || []).map((item) => item.type || item.name).join(" ")}`);
    const packet = {
      version: "aaps_dormant_repair_agent_packet/0.1",
      runId,
      project: projectDir,
      workflow: loaded.file,
      step: {
        id: step.id,
        path: step.path,
        kind: step.kind,
        agent: step.agent || "",
        repair: Boolean(step.repair),
        retry: step.retry || 0,
        fallback: step.fallback || "",
        recovery: step.recovery || [],
      },
      reason,
      details,
      commands: {
        parse: `aaps parse ${loaded.file} --project ${projectDir} --json --no-auto-update`,
        validate: `aaps validate ${loaded.file} --project ${projectDir} --json --no-auto-update`,
        checkBlock: `aaps check-block ${loaded.file} --project ${projectDir} --block ${step.id} --json --no-auto-update`,
        rerunBlock: `aaps run-block ${loaded.file} --project ${projectDir} --block ${step.id} --run-root ${runRoot} --json --no-auto-update`,
      },
      reportGuidance: reportGuidance
        ? "This looks like a report/TeX/PDF block. Prefer fixing the report generator or source data escaping, then rerun the report block. Do not hand-edit generated TeX/PDF as the durable fix unless no generator exists."
        : "",
    };
    writeJson(jsonFile, packet);
    const body = [
      `# Repair Request: ${step.id}`,
      "",
      `Path: ${step.path}`,
      `Reason: ${reason}`,
      `Run directory: ${runDir}`,
      `JSON packet: ${jsonFile}`,
      "",
      "## Recovery Rules",
      ...(step.recovery || []).map((item) => `- ${item}`),
      "",
      "## Rerun Commands",
      `- \`${packet.commands.parse}\``,
      `- \`${packet.commands.validate}\``,
      `- \`${packet.commands.checkBlock}\``,
      `- \`${packet.commands.rerunBlock}\``,
      "",
      ...(reportGuidance
        ? [
            "## Report Block Repair Guidance",
            packet.reportGuidance,
            "Inspect LaTeX logs for unescaped underscores, percent signs, dollar signs, raw itemize content, missing figures, and overlong verbatim/text paths.",
            "",
          ]
        : []),
      "## Failure Evidence",
      "```json",
      JSON.stringify(details, null, 2),
      "```",
      "",
      "## Suggested Repair",
      "Inspect stdout, stderr, declared artifacts, and validation failures. Apply the smallest focused repair, then rerun this step.",
      "",
    ].join("\n");
    fs.writeFileSync(file, body, "utf8");
    return file;
  }

  const stepByPath = new Map(plan.steps.map((step) => [step.path, step]));
  function parentPath(stepPath) {
    const parts = String(stepPath || "").split("/");
    parts.pop();
    return parts.join("/");
  }

  function ancestorSteps(step) {
    const chain = [];
    let current = parentPath(step.path);
    while (current) {
      const parent = stepByPath.get(current);
      if (parent) chain.unshift(parent);
      current = parentPath(current);
    }
    return chain;
  }

  function applyPorts(local, sourceStep) {
    Object.entries(sourceStep.parameters || (sourceStep.contract && sourceStep.contract.parameters) || {}).forEach(([key, value]) => {
      const expanded = expand(value, local);
      local[`param.${key}`] = expanded;
      local[`parameter.${key}`] = expanded;
    });
    (sourceStep.inputs || []).forEach((port) => {
      const value = port.value ? expand(port.value, local) : local[port.name] || "";
      local[port.name] = value;
      local[`input.${port.name}`] = value;
    });
    (sourceStep.outputs || []).forEach((port) => {
      const value = port.value ? expand(port.value, local) : local[port.name] || "";
      local[port.name] = value;
      local[`output.${port.name}`] = value;
    });
    (sourceStep.artifacts || []).forEach((artifact) => {
      local[`artifact.${artifact.name}`] = artifact.path ? expand(artifact.path, local) : "";
    });
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
    ancestorSteps(step).forEach((ancestor) => applyPorts(local, ancestor));
    applyPorts(local, step);
    return local;
  }

  function executeAction(step, action, attempt, overrides = {}) {
    const loopSuffix = overrides["loop.index"] !== undefined ? `-${overrides["loop.index"]}` : "";
    const stepSlug = AAPS.slug(`${step.id}${loopSuffix}-${action.id}-${attempt}`, "step");
    const stepContext = contextForStep(step, overrides);
    touchWatchdog("running_action", {
      activeStep: step.path,
      activeAction: action.id,
      actionType: action.type,
      attempt,
      timeoutMs: timeoutMs(step),
      loop: overrides["loop.index"] ?? null,
      item: overrides.item || "",
    });
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
      touchWatchdog("action_failed", { activeStep: step.path, activeAction: action.id, attempt, reason: outcome.stderr });
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
    touchWatchdog(outcome.status === "failed" ? "action_failed" : "action_finished", {
      activeStep: step.path,
      activeAction: action.id,
      actionType: action.type,
      attempt,
      outcomeStatus: outcome.status,
      returnCode: outcome.code,
      command: outcome.command,
      stdoutLog: path.join(runDir, "block_logs", `${stepSlug}.stdout.log`),
      stderrLog: path.join(runDir, "block_logs", `${stepSlug}.stderr.log`),
      loop: overrides["loop.index"] ?? null,
      item: overrides.item || "",
    });
    return outcome;
  }

  function executeStep(step, overrides = {}) {
    const stepContext = contextForStep(step, overrides);
    touchWatchdog("running_step", {
      activeStep: step.path,
      loop: overrides["loop.index"] ?? null,
      item: overrides.item || "",
    });
    event({ type: "step_start", step: step.path, executable: step.executable, loop: overrides["loop.index"] ?? "" });
    if (!step.executable) {
      const status = step.promptOnly ? "prompt_only" : "planned";
      const result = { step: step.path, id: step.id, status, loop: overrides["loop.index"] ?? null, actions: [], validations: [], repair: "" };
      results.push(result);
      event({ type: "step_end", step: step.path, status });
      touchWatchdog("step_finished", {
        activeStep: step.path,
        status,
        loop: overrides["loop.index"] ?? null,
        item: overrides.item || "",
      });
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
        const runTarget = String(step.fallback || "").trim().match(/^run\s+([A-Za-z_][\w.-]*)$/i);
        const targetId = runTarget ? runTarget[1] : step.fallback;
        const target = plan.steps.find((candidate) => candidate.id === targetId);
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
      repair = repairRecord(step, "Action or validation failed.", {
        actions,
        validations,
        fallback: fallbackResult,
        loop: overrides["loop.index"] ?? null,
        item: overrides.item || "",
        context: stepContext,
      });
      event({ type: "repair_request", step: step.path, file: repair });
    }

    const status = ok ? (fallbackResult ? "recovered" : "succeeded") : "failed";
    const result = { step: step.path, id: step.id, status, loop: overrides["loop.index"] ?? null, item: overrides.item || "", actions, validations, fallback: fallbackResult, repair };
    results.push(result);
    event({ type: "step_end", step: step.path, status });
    touchWatchdog("step_finished", {
      activeStep: step.path,
      status,
      repair,
      loop: overrides["loop.index"] ?? null,
      item: overrides.item || "",
    });
    return result;
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
    const children = childrenByPath.get(step.path) || [];
    const chooseChildren = children.filter((child) => child.kind === "choose");
    const methodChildren = children.filter((child) => child.kind === "method");
    if (step.kind === "stage" && chooseChildren.length && methodChildren.length) {
      const result = executeStep(step, overrides);
      chooseChildren.forEach((child) => executeTree(child, overrides));
      const runnableMethods = methodChildren.filter((child) => conditionPasses(child, overrides));
      const executedMethodPaths = new Set();
      let selectedResult = null;
      runnableMethods.forEach((candidate, index) => {
        if (selectedResult && selectedResult.status !== "failed") return;
        recordMethodSelection(
          step,
          chooseChildren,
          runnableMethods,
          candidate,
          index === 0 ? "first_available_method" : "previous_method_failed_try_next",
          overrides
        );
        selectedResult = executeTree(candidate, { ...overrides, "method.selected": candidate.id });
        executedMethodPaths.add(candidate.path);
        if (selectedResult && selectedResult.fallback && selectedResult.fallback.step) {
          executedMethodPaths.add(selectedResult.fallback.step);
        }
      });
      methodChildren.forEach((candidate) => {
        if (executedMethodPaths.has(candidate.path)) return;
        const reason = runnableMethods.includes(candidate) ? "method_not_selected" : "condition_false";
        const skipped = {
          step: candidate.path,
          id: candidate.id,
          status: "skipped",
          reason,
          selectedMethod: methodSelections[methodSelections.length - 1]?.selected || "",
          loop: overrides["loop.index"] ?? null,
          item: overrides.item || "",
        };
        results.push(skipped);
        event({ type: "step_skipped", step: candidate.path, reason, selectedMethod: skipped.selectedMethod });
      });
      children
        .filter((child) => child.kind !== "choose" && child.kind !== "method")
        .forEach((child) => executeTree(child, overrides));
      return result;
    }
    const result = executeStep(step, overrides);
    children.forEach((child) => executeTree(child, overrides));
    return result;
  }

  const requirements = checkRequirements(ir, projectDir);
  requirements.forEach((check) => event({ type: "requirement", check }));
  event({ type: "run_start", file: loaded.file, dryRun, block: options.block || "" });
  touchWatchdog("running", { activeStep: "", activeAction: "" });
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
    block: options.block || "",
    project: projectDir,
    runDir,
    dryRun,
    runtimeOverrides,
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
    methodSelections,
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
  finishWatchdog(summary.status, { resultCount: results.length, failedCount: failed.length });
  return summary;
}

function main() {
  const options = parseArgs(process.argv);
  if (options.command !== "run" && options.command !== "plan" && options.command !== "check") {
    throw new Error(`Unknown command: ${options.command}`);
  }
  const projectDir = path.resolve(options.project || ".");
  const manifest = readManifest(projectDir);
  let registries = loadRegistries(projectDir, manifest);
  const loaded = loadSource(options, projectDir, manifest);
  const ir = parseLoaded(options, projectDir, manifest, loaded);
  const runtimeOverrides = applyRuntimeOverrides(ir, parseRuntimeOverrides(options.set));
  registries = mergeWorkflowRegistries(registries, ir);
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
    console.log(JSON.stringify({ file: loaded.file, diagnostics: ir.diagnostics, runtimeOverrides, plan, readiness, compilePlan }, null, 2));
    process.exit(ir.diagnostics.length || !readiness.ok || (options.block && plan.blockFilter && plan.blockFilter.matched === 0) ? 1 : 0);
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
  mergeWorkflowRegistries,
  parseArgs,
  parseLoaded,
  parseRuntimeOverrides,
  projectPython,
  pythonPackageExists,
  readJsonIfExists,
  readManifest,
  run,
  safeRelative,
  suggestionForCheck,
  applyRuntimeOverrides,
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
