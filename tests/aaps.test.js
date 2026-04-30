const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const AAPS = require("../src/aaps");

function parseFile(file) {
  return AAPS.parseAAPS(fs.readFileSync(file, "utf8"));
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (full.endsWith(".aaps")) files.push(full);
  }
  return files;
}

function walkProjectFiles(dir) {
  return walk(dir).map((file) => path.relative(dir, file).split(path.sep).join("/"));
}

function findManifests(dir) {
  const manifests = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && ![".git", ".aaps-work", "node_modules", "vendor", "runtime"].includes(entry.name)) {
      manifests.push(...findManifests(full));
    }
    else if (entry.name === "aaps.project.json") manifests.push(full);
  }
  return manifests;
}

const ir = AAPS.parseAAPS(AAPS.sample);

assert.strictEqual(ir.version, "aaps_ir/0.2");
assert.strictEqual(ir.pipeline.name, "Ship AAPS Studio");
assert.strictEqual(ir.pipeline.workflowVersion, "0.2");
assert.strictEqual(ir.pipeline.artifactDir, "runtime/artifacts");
assert.strictEqual(ir.pipeline.databasePath, "runtime/aaps-runs.jsonl");
assert.strictEqual(ir.pipeline.requiredTools.includes("codex"), true);
assert.strictEqual(ir.pipeline.inputs.repo, "./");
assert.strictEqual(ir.pipeline.inputPorts[0].required, true);
assert.strictEqual(ir.pipeline.skills[0].children.length, 3);
assert.strictEqual(ir.pipeline.skills[0].children[2].validations.length, 1);
assert.strictEqual(ir.pipeline.skills[0].children[2].recovery.length, 1);
assert.strictEqual(ir.pipeline.tasks[0].calls[0].skill, "bounded_change");
assert.strictEqual(ir.diagnostics.length, 0, JSON.stringify(ir.diagnostics));

const biology = AAPS.parseAAPS(AAPS.samples.biology);
assert.strictEqual(biology.pipeline.domain, "biology");
assert.strictEqual(biology.pipeline.requiredModels.includes("cellpose"), true);
assert.strictEqual(biology.pipeline.skills[0].children.some((child) => child.kind === "choose"), true);
assert.strictEqual(biology.pipeline.skills[0].children.some((child) => child.kind === "if"), true);
assert.strictEqual(
  biology.pipeline.tasks[0].children.some((child) => child.kind === "for_each"),
  true
);
const qcGate = biology.pipeline.skills[0].children.find((child) => child.kind === "stage" && child.id === "qc");
assert.strictEqual(qcGate.validations.length, 1);
assert.strictEqual(qcGate.recovery.length, 1);
assert.strictEqual(qcGate.reviews.length, 1);
assert.strictEqual(biology.diagnostics.length, 0, JSON.stringify(biology.diagnostics));

const serialized = AAPS.serializeAAPS(biology);
const reparsed = AAPS.parseAAPS(serialized);
assert.strictEqual(reparsed.pipeline.skills[0].id, "segment_image");
assert.strictEqual(reparsed.pipeline.tasks[0].children[0].kind, "for_each");
assert.strictEqual(reparsed.pipeline.requiredTools.includes("cellpose"), true);
assert.strictEqual(reparsed.diagnostics.length, 0, JSON.stringify(reparsed.diagnostics));

assert.strictEqual(AAPS.PROJECT_VERSION, "aaps_project/0.1");
const projectCheck = AAPS.validateProjectManifest(AAPS.sampleProject, AAPS.projectFileIndex(AAPS.sampleProject));
assert.strictEqual(projectCheck.ok, true, JSON.stringify(projectCheck.diagnostics));
assert(projectCheck.files.includes("blocks/qc_image.aaps"));
assert(AAPS.projectStructureText(AAPS.sampleProject).includes("aaps.project.json"));

const projectMain = parseFile(path.join(__dirname, "..", "examples", "projects", "organoid-analysis", "workflows", "main.aaps"));
assert.strictEqual(projectMain.pipeline.includes.includes("blocks/qc_image.aaps"), true);
assert.strictEqual(projectMain.diagnostics.length, 0, JSON.stringify(projectMain.diagnostics));

const executable = parseFile(path.join(__dirname, "..", "examples", "executable_runtime.aaps"));
assert.strictEqual(executable.pipeline.tasks[0].exec.length, 1);
const executionPlan = AAPS.buildExecutionPlan(executable);
assert.strictEqual(executionPlan.version, "aaps_plan/0.1");
assert.strictEqual(executionPlan.executableSteps, 1);
assert(executionPlan.steps.some((step) => step.repair === true));

const runtimeResult = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps-runner.js",
    "run",
    "--source",
    "examples/executable_runtime.aaps",
    "--project",
    ".",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "test-runtime",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(runtimeResult.status, 0, runtimeResult.stderr || runtimeResult.stdout);
const runtimeSummary = JSON.parse(runtimeResult.stdout);
assert.strictEqual(runtimeSummary.status, "succeeded");
assert.strictEqual(runtimeSummary.plan.executableSteps, 1);
assert(fs.existsSync(path.join(__dirname, "..", "runtime", "artifacts", "executable", "qc.json")));

const fallbackDir = path.join(__dirname, "..", ".aaps-work", "tests");
fs.mkdirSync(fallbackDir, { recursive: true });
const fallbackFile = path.join(fallbackDir, "fallback.aaps");
fs.writeFileSync(
  fallbackFile,
  `pipeline "Fallback Runtime Test" {
  domain "runtime"
  database "runtime/runs/fallback_runtime.jsonl"
  task primary {
    retry 0
    fallback "run: mkdir -p runtime/artifacts/executable && printf fallback > runtime/artifacts/executable/fallback.txt"
    exec shell "false"
  }
}
`,
  "utf8"
);
const fallbackResult = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps-runner.js",
    "run",
    "--source",
    fallbackFile,
    "--project",
    ".",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "test-runtime-fallback",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(fallbackResult.status, 0, fallbackResult.stderr || fallbackResult.stdout);
const fallbackSummary = JSON.parse(fallbackResult.stdout);
assert.strictEqual(fallbackSummary.results[0].status, "recovered");
assert(fs.existsSync(path.join(__dirname, "..", "runtime", "artifacts", "executable", "fallback.txt")));

const badProject = AAPS.validateProjectManifest({
  ...AAPS.sampleProject,
  path: "/tmp/bad",
  defaultMain: "workflows/main.txt",
});
assert.strictEqual(badProject.ok, false);
assert(badProject.diagnostics.some((diagnostic) => diagnostic.severity === "error"));

const invalid = AAPS.parseAAPS('task missing_pipeline {\n  prompt "bad"\n}\n');
assert(invalid.diagnostics.some((diagnostic) => diagnostic.message.includes("Missing pipeline")));

const malformedPort = AAPS.parseAAPS('pipeline "Bad" {\n  input @@@\n}\n');
assert(malformedPort.diagnostics.some((diagnostic) => diagnostic.message.includes("input must look")));

for (const file of walk(path.join(__dirname, "..", "examples"))) {
  const parsed = parseFile(file);
  assert.strictEqual(parsed.diagnostics.length, 0, `${file}: ${JSON.stringify(parsed.diagnostics)}`);
}

for (const file of walk(path.join(__dirname, "..", "references", "pipeline-scripts", "converted"))) {
  const parsed = parseFile(file);
  assert.strictEqual(parsed.diagnostics.length, 0, `${file}: ${JSON.stringify(parsed.diagnostics)}`);
}

for (const manifestFile of findManifests(path.join(__dirname, ".."))) {
  if (manifestFile.includes(`${path.sep}node_modules${path.sep}`)) continue;
  const projectDir = path.dirname(manifestFile);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const checked = AAPS.validateProjectManifest(manifest, walkProjectFiles(projectDir));
  assert.strictEqual(checked.ok, true, `${manifestFile}: ${JSON.stringify(checked.diagnostics)}`);
}

const markdown = AAPS.toMarkdown(biology);
assert(markdown.includes("# Organoid Segmentation QC"));
assert(markdown.includes("for_each"));
assert(markdown.includes("cellpose"));
assert(markdown.includes("Human review"));

console.log("AAPS parser smoke tests passed.");
