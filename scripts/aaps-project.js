#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const AAPS = require("../src/aaps");

const SKIP_DIRS = new Set([".git", "node_modules", "vendor", "runtime"]);

function toProjectPath(file) {
  return file.split(path.sep).join("/");
}

function readManifest(projectDir) {
  const manifestPath = path.join(projectDir, "aaps.project.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`aaps.project.json not found in ${projectDir}`);
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function scanAapsFiles(projectDir) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".aaps")) {
        files.push(toProjectPath(path.relative(projectDir, path.join(dir, entry.name))));
      }
    }
  }
  walk(projectDir);
  return files.sort();
}

function validate(projectDir) {
  const manifest = readManifest(projectDir);
  const files = scanAapsFiles(projectDir);
  const result = AAPS.validateProjectManifest(manifest, files);
  const parseDiagnostics = [];

  files.forEach((file) => {
    const source = fs.readFileSync(path.join(projectDir, file), "utf8");
    const parsed = AAPS.parseAAPS(source);
    parsed.diagnostics.forEach((diagnostic) => {
      parseDiagnostics.push({
        severity: "error",
        field: file,
        message: `line ${diagnostic.line}: ${diagnostic.message}`,
      });
    });
  });

  const diagnostics = [...result.diagnostics, ...parseDiagnostics];
  const ok = result.ok && !parseDiagnostics.length;
  console.log(
    JSON.stringify(
      {
        ok,
        project: result.project.name,
        files: files.length,
        diagnostics,
      },
      null,
      2
    )
  );
  process.exit(ok ? 0 : 1);
}

function init(projectDir, name = "Untitled AAPS Project", domain = "general") {
  fs.mkdirSync(projectDir, { recursive: true });
  const manifestPath = path.join(projectDir, "aaps.project.json");
  if (fs.existsSync(manifestPath)) {
    throw new Error(`Refusing to overwrite existing ${manifestPath}`);
  }
  const manifest = AAPS.createProjectManifest({ name, domain });
  Object.values(manifest.paths).forEach((relativeDir) => {
    fs.mkdirSync(path.join(projectDir, relativeDir), { recursive: true });
  });
  const mainPath = path.join(projectDir, manifest.defaultMain);
  fs.mkdirSync(path.dirname(mainPath), { recursive: true });
  fs.writeFileSync(mainPath, AAPS.samples.general, "utf8");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: true, manifest: manifestPath, main: mainPath }, null, 2));
}

function main() {
  const [command = "validate", projectDirArg = ".", name, domain] = process.argv.slice(2);
  const projectDir = path.resolve(projectDirArg);
  if (command === "validate") {
    validate(projectDir);
    return;
  }
  if (command === "init") {
    init(projectDir, name, domain);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
