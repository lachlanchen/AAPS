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

const projectFileMap = {
  "workflows/main.aaps": `pipeline "Import Test" {
  import block "blocks/write_json.aaps" as write_json
  task main {
    call write_json
  }
}
`,
  "blocks/write_json.aaps": `pipeline "Write JSON Block" {
  block write_json {
    output report: json = "runtime/artifacts/import-test.json"
    exec python_inline
    code """
from pathlib import Path
Path("runtime/artifacts").mkdir(parents=True, exist_ok=True)
Path("runtime/artifacts/import-test.json").write_text('{"ok": true}\\n', encoding="utf-8")
"""
    validate json "runtime/artifacts/import-test.json"
  }
}
`,
};
const parsedProject = AAPS.parseAAPSProject(projectFileMap, "workflows/main.aaps", AAPS.createProjectManifest());
assert.strictEqual(parsedProject.diagnostics.length, 0, JSON.stringify(parsedProject.diagnostics));
assert.strictEqual(parsedProject.pipeline.imports[0].kind, "block");
assert.strictEqual(parsedProject.pipeline.blocks[0].id, "write_json");
assert.strictEqual(parsedProject.pipeline.blocks[0].imported, true);
const importedPlan = AAPS.buildExecutionPlan(parsedProject);
assert(importedPlan.steps.some((step) => step.id === "write_json" && step.actions[0].type === "python_inline"));

const missingImport = AAPS.parseAAPSProject(
  {
    "workflows/main.aaps": `pipeline "Missing Import" {
  import block "blocks/missing.aaps" as missing
}
`,
  },
  "workflows/main.aaps",
  AAPS.createProjectManifest()
);
assert(missingImport.unresolvedImports.some((item) => item.path === "blocks/missing.aaps"));
assert(missingImport.diagnostics.some((diagnostic) => diagnostic.message.includes("Unresolved import")));

const circularImport = AAPS.parseAAPSProject(
  {
    "workflows/a.aaps": `pipeline "A" {
  import block "workflows/b.aaps" as b
}
`,
    "workflows/b.aaps": `pipeline "B" {
  import block "workflows/a.aaps" as a
}
`,
  },
  "workflows/a.aaps",
  AAPS.createProjectManifest()
);
assert(circularImport.circularImports.length >= 1);
assert(circularImport.diagnostics.some((diagnostic) => diagnostic.message.includes("Circular import")));

const executable = parseFile(path.join(__dirname, "..", "examples", "executable_runtime.aaps"));
assert.strictEqual(executable.pipeline.tasks[0].exec.length, 1);
const executionPlan = AAPS.buildExecutionPlan(executable);
assert.strictEqual(executionPlan.version, "aaps_plan/0.1");
assert.strictEqual(executionPlan.executableSteps, 1);
assert(executionPlan.steps.some((step) => step.repair === true));

const folderWorkflow = parseFile(path.join(__dirname, "..", "examples", "projects", "organoid-analysis", "workflows", "executable_folder_segmentation.aaps"));
assert.strictEqual(folderWorkflow.diagnostics.length, 0, JSON.stringify(folderWorkflow.diagnostics));
assert(folderWorkflow.pipeline.requiredAgents.includes("codex_repair_agent"));
assert.strictEqual(folderWorkflow.pipeline.environment.python, "python3");
const folderLoop = folderWorkflow.pipeline.tasks.find((task) => task.kind === "for_each");
assert(folderLoop, "folder segmentation workflow should contain a for_each loop");
assert.strictEqual(folderLoop.iterator.source.includes('pattern="*.pgm"'), true);
const folderPlan = AAPS.buildExecutionPlan(folderWorkflow);
assert(folderPlan.steps.some((step) => step.id === "segment_image" && step.requirements.tools.includes("threshold_segmentation")));
assert(folderPlan.steps.some((step) => step.id === "segment_image" && step.compile.agent === "codex_repair_agent"));

const missingScriptPlan = AAPS.buildExecutionPlan(
  AAPS.parseAAPS(`pipeline "Compile Missing Script" {
  task missing_script {
    compile_agent "codex_repair_agent"
    exec python_script "scripts/missing_script.py"
  }
}`)
);
const compilePlan = AAPS.buildAgentCompilePlan(missingScriptPlan, {
  blocks: [
    {
      id: "missing_script",
      path: "task:missing_script",
      checks: [{ kind: "script", name: "scripts/missing_script.py", ok: false, message: "script missing" }],
    },
  ],
});
assert.strictEqual(compilePlan.requests.length, 1);
assert(compilePlan.requests[0].prompt.includes("scripts/missing_script.py"));

const inlineFile = path.join(__dirname, "..", ".aaps-work", "tests", "inline.aaps");
fs.mkdirSync(path.dirname(inlineFile), { recursive: true });
fs.writeFileSync(
  inlineFile,
  `pipeline "Inline Runtime Test" {
  task inline_writer {
    output report: json = "runtime/artifacts/executable/inline.json"
    exec python_inline
    code """
from pathlib import Path
Path("runtime/artifacts/executable").mkdir(parents=True, exist_ok=True)
Path("runtime/artifacts/executable/inline.json").write_text('{"inline": true}\\n', encoding="utf-8")
"""
    validate json "${"${output.report}"}"
  }
}
`,
  "utf8"
);
const inlineParsed = parseFile(inlineFile);
assert.strictEqual(inlineParsed.pipeline.tasks[0].exec[0].type, "python_inline");
assert(inlineParsed.pipeline.tasks[0].code.includes("inline"));
const inlinePlan = AAPS.buildExecutionPlan(inlineParsed);
assert.strictEqual(inlinePlan.executableSteps, 1);
const inlineRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps-runner.js",
    "run",
    "--source",
    inlineFile,
    "--project",
    ".",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "test-runtime-inline",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(inlineRun.status, 0, inlineRun.stderr || inlineRun.stdout);
assert.strictEqual(JSON.parse(inlineRun.stdout).status, "succeeded");

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

const cliParse = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "parse", "workflows/executable_organoid_demo.aaps", "--project", "examples/projects/organoid-analysis"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(cliParse.status, 0, cliParse.stderr || cliParse.stdout);
assert.strictEqual(JSON.parse(cliParse.stdout).pipeline.name, "Executable Organoid Demo");

const cliValidate = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "validate", "--project", "examples/projects/book-writing", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(cliValidate.status, 0, cliValidate.stderr || cliValidate.stdout);
assert.strictEqual(JSON.parse(cliValidate.stdout).ok, true);

const blockRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "run-block",
    "workflows/executable_organoid_demo.aaps",
    "--project",
    "examples/projects/organoid-analysis",
    "--block",
    "generate_image",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(blockRun.status, 0, blockRun.stderr || blockRun.stdout);
assert.strictEqual(JSON.parse(blockRun.stdout).plan.executableSteps, 1);

const folderCheck = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "check",
    "workflows/executable_folder_segmentation.aaps",
    "--project",
    "examples/projects/organoid-analysis",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(folderCheck.status, 0, folderCheck.stderr || folderCheck.stdout);
const folderCheckSummary = JSON.parse(folderCheck.stdout);
assert.strictEqual(folderCheckSummary.readiness.ok, true);
assert(folderCheckSummary.readiness.blocks.every((block) => block.ready));

const compilerProject = path.join(__dirname, "..", ".aaps-work", "tests", "compiler-project");
fs.rmSync(compilerProject, { recursive: true, force: true });
fs.mkdirSync(path.join(compilerProject, "workflows"), { recursive: true });
fs.writeFileSync(
  path.join(compilerProject, "aaps.project.json"),
  JSON.stringify(
    {
      schema: "aaps_project/0.1",
      name: "Compiler Project",
      path: ".",
      description: "Compiler smoke project.",
      domain: "test",
      tags: ["compiler"],
      defaultMain: "workflows/main.aaps",
      activeFile: "workflows/main.aaps",
      artifactRoot: "artifacts",
      runDatabase: "runs/compiler.jsonl",
      paths: {
        blocks: "blocks",
        skills: "skills",
        modules: "modules",
        subworkflows: "subworkflows",
        workflows: "workflows",
        drafts: "drafts",
        archives: "archive",
        data: "data",
        artifacts: "artifacts",
        runs: "runs",
        reports: "reports",
        notes: "notes",
        environments: "environments",
        tools: "tools",
        agents: "agents",
      },
      variables: {},
      tools: [],
      agents: [],
      files: { workflows: ["workflows/main.aaps"], blocks: [], skills: [], modules: [], subworkflows: [], drafts: [], archives: [], references: [] },
    },
    null,
    2
  ) + "\n",
  "utf8"
);
fs.writeFileSync(
  path.join(compilerProject, "workflows", "main.aaps"),
  `pipeline "Compiler Missing Block" {
  task main {
    call segment_image
  }
}
`,
  "utf8"
);
const compileCheck = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "compile", "workflows/main.aaps", "--project", ".aaps-work/tests/compiler-project", "--mode", "check", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(compileCheck.status, 1, compileCheck.stderr || compileCheck.stdout);
const compileCheckReport = JSON.parse(compileCheck.stdout);
assert(compileCheckReport.missingComponents.some((item) => item.type === "missing_block" && item.name === "segment_image"));
assert(fs.existsSync(path.join(compileCheckReport.compileDir, "compile_report.json")));

const missingCli = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "missing", "workflows/main.aaps", "--project", ".aaps-work/tests/compiler-project", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(missingCli.status, 1, missingCli.stderr || missingCli.stdout);
assert(JSON.parse(missingCli.stdout).missingComponents.length >= 1);

const compileApply = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "compile", "workflows/main.aaps", "--project", ".aaps-work/tests/compiler-project", "--mode", "apply", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(compileApply.status, 0, compileApply.stderr || compileApply.stdout);
const compileApplyReport = JSON.parse(compileApply.stdout);
assert.strictEqual(compileApplyReport.ok, true);
assert(fs.existsSync(path.join(compilerProject, "blocks", "segment_image.aaps")));
assert(fs.existsSync(path.join(compilerProject, "scripts", "threshold_segment.py")));
assert(fs.readFileSync(path.join(compilerProject, "workflows", "main.aaps"), "utf8").includes('import block "blocks/segment_image.aaps"'));
assert(compileApplyReport.generatedFiles.some((item) => item.file === "scripts/threshold_segment.py" && item.written));
assert(compileApplyReport.modifiedFiles.some((item) => item.file === "workflows/main.aaps" && item.written));

const parsedCompiledProject = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "parse", "workflows/main.aaps", "--project", ".aaps-work/tests/compiler-project"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(parsedCompiledProject.status, 0, parsedCompiledProject.stderr || parsedCompiledProject.stdout);
assert(JSON.parse(parsedCompiledProject.stdout).pipeline.blocks.some((block) => block.id === "segment_image"));

fs.writeFileSync(
  path.join(compilerProject, "sample.pgm"),
  "P2\n4 4\n255\n0 0 0 0\n0 210 220 0\n0 205 230 0\n0 0 0 0\n",
  "utf8"
);
const generatedSegmentRun = childProcess.spawnSync(
  "python3",
  [
    "scripts/threshold_segment.py",
    "--input-image",
    "sample.pgm",
    "--output-mask",
    "artifacts/mask.pgm",
    "--output-overlay",
    "artifacts/overlay.pgm",
    "--output-table",
    "artifacts/objects.csv",
    "--report-json",
    "artifacts/segmentation.json",
  ],
  { cwd: compilerProject, encoding: "utf8" }
);
assert.strictEqual(generatedSegmentRun.status, 0, generatedSegmentRun.stderr || generatedSegmentRun.stdout);
assert(fs.existsSync(path.join(compilerProject, "artifacts", "mask.pgm")));
assert(fs.existsSync(path.join(compilerProject, "artifacts", "objects.csv")));

const generateScriptProject = path.join(__dirname, "..", ".aaps-work", "tests", "compiler-script-project");
fs.rmSync(generateScriptProject, { recursive: true, force: true });
fs.mkdirSync(generateScriptProject, { recursive: true });
const generateScript = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "generate-script", "scripts/qc_image.py", "--project", ".aaps-work/tests/compiler-script-project", "--mode", "apply", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(generateScript.status, 0, generateScript.stderr || generateScript.stdout);
assert(fs.existsSync(path.join(generateScriptProject, "scripts", "qc_image.py")));

const folderDemoRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "run",
    "workflows/executable_folder_segmentation.aaps",
    "--project",
    "examples/projects/organoid-analysis",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "test-folder-segmentation",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(folderDemoRun.status, 0, folderDemoRun.stderr || folderDemoRun.stdout);
const folderRunSummary = JSON.parse(folderDemoRun.stdout);
assert.strictEqual(folderRunSummary.status, "succeeded");
assert(folderRunSummary.results.filter((result) => result.id === "segment_image" && result.status === "succeeded").length >= 4);
assert(fs.existsSync(path.join(folderRunSummary.runDir, "artifacts", "batch_summary.csv")));
assert(fs.existsSync(path.join(folderRunSummary.runDir, "block_readiness.json")));

const appDemoRun = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "run", "workflows/executable_static_check.aaps", "--project", "examples/projects/app-development", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(appDemoRun.status, 0, appDemoRun.stderr || appDemoRun.stdout);
assert.strictEqual(JSON.parse(appDemoRun.stdout).status, "succeeded");

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
