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

function contextFrom(ir, manifest, runId, projectDir, runDir) {
  const pipeline = ir.pipeline || {};
  const variables = (manifest && manifest.variables) || {};
  const artifactRoot = pipeline.artifactDir || (manifest && manifest.artifactRoot) || "artifacts";
  const dataRoot = manifest && manifest.paths && manifest.paths.data ? manifest.paths.data : "data";
  const scriptsRoot = manifest && manifest.paths && manifest.paths.scripts ? manifest.paths.scripts : "scripts";
  const logsRoot = manifest && manifest.paths && manifest.paths.runs ? manifest.paths.runs : "runs";
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
    "project.runs": logsRoot,
    "run.id": runId,
    "run.dir": runDir,
    "run.artifacts": path.join(runDir, "artifacts"),
    "run.logs": path.join(runDir, "block_logs"),
  };
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
  return { ok: true, status: "manual", rule };
}

function shellAction(command, projectDir, timeoutMs, dryRun) {
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

function pythonAction(action, projectDir, context, timeoutMs, dryRun) {
  const entry = expand(action.entry || "", context);
  if (!entry) return { status: "failed", code: 1, stdout: "", stderr: "python exec requires an entry" };
  const entryPath = safeRelative(projectDir, entry, "python entry");
  const args = [];
  Object.entries(action.args || {}).forEach(([key, value]) => {
    args.push(`--${key.replace(/_/g, "-")}`, expand(value, context));
  });
  const command = `python3 ${entry} ${args.map((arg) => JSON.stringify(arg)).join(" ")}`;
  if (dryRun) return { status: "dry_run", code: 0, stdout: "", stderr: "", command };
  const result = spawnSync("python3", [entryPath, ...args], {
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
  fs.writeFileSync(script, code, "utf8");
  if (dryRun) return { status: "dry_run", code: 0, stdout: "", stderr: "", command: `python3 ${script}` };
  const result = spawnSync("python3", [script], {
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
    command: `python3 ${script}`,
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
  const loaded = loadSource(options, projectDir, manifest);
  const ir = parseLoaded(options, projectDir, manifest, loaded);
  let plan = AAPS.buildExecutionPlan(ir, { project: manifest || null });
  if (options.block) {
    plan = { ...plan, steps: plan.steps.filter((step) => step.id === options.block || step.path.includes(options.block)) };
    plan.executableSteps = plan.steps.filter((step) => step.executable).length;
    plan.promptOnlySteps = plan.steps.filter((step) => step.promptOnly).length;
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
  writeJson(path.join(runDir, "resolved_workflow.json"), ir);
  writeJson(path.join(runDir, "execution_plan.json"), plan);

  const context = contextFrom(ir, manifest, runId, projectDir, runDir);
  const dryRun = Boolean(options.dryRun);
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

  function contextForStep(step) {
    const local = {
      ...context,
      "block.name": step.id || "",
      "block.kind": step.kind || "",
      "block.path": step.path || "",
    };
    (step.inputs || []).forEach((port) => {
      local[port.name] = port.value || local[port.name] || "";
      local[`input.${port.name}`] = port.value || local[`input.${port.name}`] || "";
    });
    (step.outputs || []).forEach((port) => {
      local[port.name] = port.value || local[port.name] || "";
      local[`output.${port.name}`] = port.value || local[`output.${port.name}`] || "";
    });
    (step.artifacts || []).forEach((artifact) => {
      local[`artifact.${artifact.name}`] = artifact.path || "";
    });
    return local;
  }

  function executeAction(step, action, attempt) {
    const stepSlug = AAPS.slug(`${step.id}-${action.id}-${attempt}`, "step");
    const stepContext = contextForStep(step);
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

  function executeStep(step) {
    const stepContext = contextForStep(step);
    event({ type: "step_start", step: step.path, executable: step.executable });
    if (!step.executable) {
      const status = step.promptOnly ? "prompt_only" : "planned";
      const result = { step: step.path, id: step.id, status, actions: [], validations: [], repair: "" };
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
        outcome = executeAction(step, action, attempt);
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
          fallbackResult = executeStep(target);
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
    const result = { step: step.path, id: step.id, status, actions, validations, fallback: fallbackResult, repair };
    results.push(result);
    event({ type: "step_end", step: step.path, status });
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
  plan.steps.forEach(executeStep);

  const failed = results.filter((item) => item.status === "failed");
  const missingRequirements = requirements.filter((item) => !item.ok);
  const summaryStatus = ir.diagnostics.length || missingRequirements.length ? "failed" : failed.length ? "failed" : "succeeded";
  const summary = {
    ok: ir.diagnostics.length === 0 && failed.length === 0 && missingRequirements.length === 0,
    runId,
    status: summaryStatus,
    file: loaded.file,
    project: projectDir,
    runDir,
    dryRun,
    diagnostics: ir.diagnostics,
    requirements,
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
  if (options.command !== "run" && options.command !== "plan") {
    throw new Error(`Unknown command: ${options.command}`);
  }
  const projectDir = path.resolve(options.project || ".");
  const manifest = readManifest(projectDir);
  const loaded = loadSource(options, projectDir, manifest);
  const ir = parseLoaded(options, projectDir, manifest, loaded);
  if (options.command === "plan") {
    let plan = AAPS.buildExecutionPlan(ir, { project: manifest || null });
    if (options.block) {
      plan = { ...plan, steps: plan.steps.filter((step) => step.id === options.block || step.path.includes(options.block)) };
      plan.executableSteps = plan.steps.filter((step) => step.executable).length;
      plan.promptOnlySteps = plan.steps.filter((step) => step.promptOnly).length;
    }
    console.log(JSON.stringify({ file: loaded.file, diagnostics: ir.diagnostics, plan }, null, 2));
    process.exit(ir.diagnostics.length ? 1 : 0);
  }
  const summary = run(options);
  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else console.log(`AAPS run ${summary.runId}: ${summary.status}\n${summary.runDir}`);
  process.exit(summary.ok ? 0 : 1);
}

try {
  main();
} catch (error) {
  const payload = { ok: false, status: "failed", error: error.message };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}
