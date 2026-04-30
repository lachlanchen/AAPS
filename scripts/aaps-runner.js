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
  const context = {
    ...variables,
    run_id: runId,
    project: projectDir,
    run_dir: runDir,
    artifacts: pipeline.artifactDir || (manifest && manifest.artifactRoot) || "artifacts",
    artifact_dir: pipeline.artifactDir || (manifest && manifest.artifactRoot) || "artifacts",
    database: pipeline.databasePath || (manifest && manifest.runDatabase) || "runtime/runs/aaps-runs.jsonl",
  };
  (pipeline.inputPorts || []).forEach((port) => {
    context[port.name] = port.value || "";
  });
  (pipeline.outputPorts || []).forEach((port) => {
    context[port.name] = port.value || "";
  });
  return context;
}

function expand(value, context) {
  return String(value || "")
    .replace(/\{\{\s*([A-Za-z_][\w.-]*)\s*\}\}/g, (_, key) => String(context[key] ?? ""))
    .replace(/\$\{\s*([A-Za-z_][\w.-]*)\s*\}/g, (_, key) => String(context[key] ?? ""));
}

function resolveRuntimePath(projectDir, value, context) {
  return safeRelative(projectDir, expand(value, context), "runtime path");
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
  const ir = AAPS.parseAAPS(loaded.source);
  const plan = AAPS.buildExecutionPlan(ir);
  const runId = options.runId || `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const runRoot = path.resolve(options.runRoot || path.join(projectDir, "runtime", "runs"));
  const runDir = path.join(runRoot, runId);
  ensureDir(runDir);

  const context = contextFrom(ir, manifest, runId, projectDir, runDir);
  const dryRun = Boolean(options.dryRun);
  const eventsFile = path.join(runDir, "events.jsonl");
  const results = [];
  const fallbackVisited = new Set();

  function event(payload) {
    appendJsonl(eventsFile, { time: nowIso(), runId, ...payload });
  }

  function repairRecord(step, reason) {
    const file = path.join(runDir, `${step.id || "step"}-repair.md`);
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

  function executeAction(step, action, attempt) {
    const stepSlug = AAPS.slug(`${step.id}-${action.id}-${attempt}`, "step");
    const expandedCommand = expand(action.command || "", context);
    let outcome;
    if (["shell", "sh", "bash"].includes(action.type)) {
      outcome = shellAction(expandedCommand, projectDir, timeoutMs(step), dryRun);
    } else if (action.type === "python") {
      outcome = pythonAction(action, projectDir, context, timeoutMs(step), dryRun);
    } else {
      outcome = {
        status: "skipped",
        code: 0,
        stdout: "",
        stderr: `No runtime adapter for exec type: ${action.type}`,
        command: action.command || action.entry || "",
      };
    }
    fs.writeFileSync(path.join(runDir, `${stepSlug}.stdout.log`), outcome.stdout || "", "utf8");
    fs.writeFileSync(path.join(runDir, `${stepSlug}.stderr.log`), outcome.stderr || "", "utf8");
    event({ type: "action", step: step.path, action: action.id, attempt, outcome });
    return outcome;
  }

  function executeStep(step) {
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
      const checked = checkValidation(rule, projectDir, context);
      validations.push(checked);
      if (!checked.ok) ok = false;
      event({ type: "validation", step: step.path, validation: checked });
    });

    let repair = "";
    let fallbackResult = null;
    if (!ok && step.fallback) {
      event({ type: "fallback_start", step: step.path, fallback: step.fallback });
      if (/^run\s*:/i.test(step.fallback)) {
        const command = expand(step.fallback.replace(/^run\s*:/i, "").trim(), context);
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

  event({ type: "run_start", file: loaded.file, dryRun });
  if (ir.diagnostics.length) {
    ir.diagnostics.forEach((diagnostic) => event({ type: "parser_diagnostic", diagnostic }));
  }
  plan.steps.forEach(executeStep);

  const failed = results.filter((item) => item.status === "failed");
  const summary = {
    ok: ir.diagnostics.length === 0 && failed.length === 0,
    runId,
    status: ir.diagnostics.length ? "failed" : failed.length ? "failed" : "succeeded",
    file: loaded.file,
    project: projectDir,
    runDir,
    dryRun,
    diagnostics: ir.diagnostics,
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
  const ir = AAPS.parseAAPS(loaded.source);
  if (options.command === "plan") {
    const plan = AAPS.buildExecutionPlan(ir);
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
