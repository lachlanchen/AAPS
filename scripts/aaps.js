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
    "  aaps plan <file> [--project .] [--json]",
    "  aaps run <file> [--project .] [--json]",
    "  aaps run-block <file> --block <id> [--project .] [--json]",
    "  aaps validate [file] [--project .] [--json]",
    "  aaps studio [--host 127.0.0.1] [--port 8796] [--mock-codex]",
    "",
    "Options:",
    "  --project <dir>   AAPS project root. Defaults to current directory.",
    "  --block <id>      Block ID or execution-plan path fragment for run-block.",
    "  --host <host>     Studio host for `aaps studio`.",
    "  --port <port>     Studio port for `aaps studio`.",
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

function commandStudio(options) {
  const root = path.resolve(__dirname, "..");
  const host = String(options.host || "127.0.0.1");
  const port = String(options.port || "8796");
  const env = { ...process.env };
  if (options.mockCodex) env.AAPS_MOCK_CODEX = "1";
  const args = [
    path.join(root, "backend", "aaps_codex_server.py"),
    "--host",
    host,
    "--port",
    port,
  ];
  const result = childProcess.spawnSync("python3", args, {
    cwd: root,
    env,
    stdio: "inherit",
  });
  process.exit(result.status || 0);
}

function main() {
  const { command, positional, options } = parseArgs(process.argv);
  const file = positional[0];
  if (command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
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
  if (command === "studio") {
    commandStudio(options);
    return;
  }
  if (command === "plan" || command === "run") {
    if (!file) throw new Error(`aaps ${command} requires a .aaps file.`);
    runRunner(command, file, options);
    return;
  }
  if (command === "run-block") {
    if (!file) throw new Error("aaps run-block requires a .aaps file.");
    if (!options.block) throw new Error("aaps run-block requires --block <id>.");
    runRunner("run", file, options);
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
