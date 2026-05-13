const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const AAPS = require("../src/aaps");
const AutoUpdate = require("../src/auto-update");

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
assert.strictEqual(AutoUpdate.isNewerVersion("0.4.29", "0.4.28"), true);
assert.strictEqual(AutoUpdate.shouldAutoUpdateCommand(["chat"]), true);
assert.strictEqual(AutoUpdate.shouldAutoUpdateCommand(["parse"]), false);
assert.strictEqual(AutoUpdate.shouldAutoUpdateCommand(["chat", "--no-auto-update"]), false);
const autoUpdateHome = fs.mkdtempSync(path.join(os.tmpdir(), "aaps-auto-update-"));
const autoUpdateSmoke = childProcess.spawnSync(
  process.execPath,
  [
    "-e",
    `
const assert = require("assert");
const os = require("os");
const path = require("path");
const AutoUpdate = require("./src/auto-update");
(async () => {
  const updateEvents = [];
  const updateWrites = [];
  const result = await AutoUpdate.maybeAutoUpdate({
    argv: ["chat"],
    packageDir: path.join(os.tmpdir(), "global", "node_modules", "@lazyingart", "aaps"),
    packageVersion: "0.4.28",
    latestVersion: async () => "0.4.99",
    selectUpdateAction: async () => {
      updateEvents.push("selector");
      return "update";
    },
    installPackage: async (packageName) => {
      updateEvents.push(\`install:\${packageName}\`);
      return { ok: true, code: 0 };
    },
    restart: true,
    restartProcess: async () => {
      updateEvents.push("restart");
      return { ok: true, exitCode: 0 };
    },
    stdout: {
      isTTY: true,
      write(value) {
        updateWrites.push(String(value));
      },
    },
    stderr: {
      write(value) {
        updateWrites.push(String(value));
      },
    },
  });
  assert.strictEqual(result.updated, true);
  assert.strictEqual(result.restarted, true);
  assert(updateEvents.includes("selector"), "auto-update selector was not called");
  assert(updateEvents.includes("install:@lazyingart/aaps"), "auto-update install hook was not called");
  assert(updateEvents.includes("restart"), "auto-update restart hook was not called");
  assert(updateWrites.join("").includes("Restarting AAPS with the updated package"));
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
`,
  ],
  {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
    env: { ...process.env, AAPS_HOME: autoUpdateHome, CI: "" },
  }
);
assert.strictEqual(autoUpdateSmoke.status, 0, autoUpdateSmoke.stderr || autoUpdateSmoke.stdout);
fs.rmSync(autoUpdateHome, { recursive: true, force: true });
const projectCheck = AAPS.validateProjectManifest(AAPS.sampleProject, AAPS.projectFileIndex(AAPS.sampleProject));
assert.strictEqual(projectCheck.ok, true, JSON.stringify(projectCheck.diagnostics));
assert(projectCheck.files.includes("blocks/qc_image.aaps"));
assert(AAPS.projectStructureText(AAPS.sampleProject).includes("aaps.project.json"));
const projectWithMarkdownReference = AAPS.validateProjectManifest(
  {
    ...AAPS.sampleProject,
    files: {
      ...AAPS.sampleProject.files,
      references: ["references/biology-method.md"],
    },
  },
  AAPS.projectFileIndex(AAPS.sampleProject)
);
assert.strictEqual(projectWithMarkdownReference.ok, true, JSON.stringify(projectWithMarkdownReference.diagnostics));

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

const nodeExecutionMode = AAPS.parseAAPS(`pipeline "Node Execution Mode" {
  block segment {
    execution_mode "local_deterministic"
    compile_agent "codex_repair_agent"
  }
}
`);
assert.deepStrictEqual(nodeExecutionMode.diagnostics, []);
assert.strictEqual(nodeExecutionMode.pipeline.blocks[0].executionMode, "local_deterministic");
assert(AAPS.serializeAAPS(nodeExecutionMode).includes('execution_mode "local_deterministic"'));

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

const cliVersion = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "--version"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(cliVersion.status, 0, cliVersion.stderr || cliVersion.stdout);
assert.strictEqual(cliVersion.stdout.trim(), require("../package.json").version);
assert.strictEqual(cliVersion.stderr, "");

const cliShortVersion = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "-v"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(cliShortVersion.status, 0, cliShortVersion.stderr || cliShortVersion.stdout);
assert.strictEqual(cliShortVersion.stdout.trim(), require("../package.json").version);
assert.strictEqual(cliShortVersion.stderr, "");

const webappProject = path.join(__dirname, "..", ".aaps-work", "tests", "webapp-project");
fs.rmSync(webappProject, { recursive: true, force: true });
fs.mkdirSync(path.join(webappProject, "workflows"), { recursive: true });
fs.writeFileSync(
  path.join(webappProject, "aaps.project.json"),
  JSON.stringify({ name: "Webapp Project", activeFile: "workflows/main.aaps" }, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(webappProject, "workflows", "main.aaps"),
  'pipeline "Webapp Project" {\n  task main {\n    prompt "Keep AAPS Studio available."\n  }\n}\n',
  "utf8"
);
const webappPort = "8897";
const webappEnv = { ...process.env, AAPS_HOME: path.join(webappProject, ".aaps-home") };
const webappStart = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "webapp", "--project", ".aaps-work/tests/webapp-project", "--host", "127.0.0.1", "--port", webappPort, "--mock-codex", "--json"],
  { cwd: path.join(__dirname, ".."), env: webappEnv, encoding: "utf8" }
);
assert.strictEqual(webappStart.status, 0, webappStart.stderr || webappStart.stdout);
const webappPayload = JSON.parse(webappStart.stdout);
assert.strictEqual(webappPayload.ok, true, JSON.stringify(webappPayload));
assert.strictEqual(webappPayload.url, `http://127.0.0.1:${webappPort}`);
const webappHealth = httpJson(`${webappPayload.url}/api/health`);
assert.strictEqual(webappHealth.ok, true);
assert.strictEqual(webappHealth.app, "aaps");
const webappReuse = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "webapp", "--project", ".aaps-work/tests/webapp-project", "--host", "127.0.0.1", "--port", webappPort, "--json"],
  { cwd: path.join(__dirname, ".."), env: webappEnv, encoding: "utf8" }
);
assert.strictEqual(webappReuse.status, 0, webappReuse.stderr || webappReuse.stdout);
assert.strictEqual(JSON.parse(webappReuse.stdout).reused, true);
const webappRestart = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "webapp", "restart", "--project", ".aaps-work/tests/webapp-project", "--host", "127.0.0.1", "--port", webappPort, "--mock-codex", "--json"],
  { cwd: path.join(__dirname, ".."), env: webappEnv, encoding: "utf8" }
);
assert.strictEqual(webappRestart.status, 0, webappRestart.stderr || webappRestart.stdout);
assert.strictEqual(JSON.parse(webappRestart.stdout).restarted, true);
const webappChat = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "chat", "--project", ".aaps-work/tests/webapp-project", "--host", "127.0.0.1", "--port", webappPort, "--no-webapp"],
  { cwd: path.join(__dirname, ".."), env: webappEnv, input: "/webapp 8897\n/webapp restart\n/webapp stop\n/status\n/files\n/backend aginti\n/backend codex\n/backend print\n/help\n/exit\n", encoding: "utf8" }
);
assert.strictEqual(webappChat.status, 0, webappChat.stderr || webappChat.stdout);
assert(webappChat.stdout.includes("AAPS v"), webappChat.stdout);
assert(webappChat.stdout.includes(`AAPS Studio reused: http://127.0.0.1:${webappPort}`), webappChat.stdout);
assert(webappChat.stdout.includes(`AAPS Studio restarted: http://127.0.0.1:${webappPort}`), webappChat.stdout);
assert(webappChat.stdout.includes(`AAPS Studio stopped: http://127.0.0.1:${webappPort}`), webappChat.stdout);
assert(webappChat.stdout.includes("workflows/main.aaps"), webappChat.stdout);
assert(webappChat.stdout.includes("backend=aginti"), webappChat.stdout);
assert(webappChat.stdout.includes("backend=codex"), webappChat.stdout);
assert(webappChat.stdout.includes("backend=print"), webappChat.stdout);
assert(webappChat.stdout.includes("Ctrl-J inserts a newline"), webappChat.stdout);
const webappStop = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "webapp", "stop", "--project", ".aaps-work/tests/webapp-project", "--host", "127.0.0.1", "--port", webappPort, "--json"],
  { cwd: path.join(__dirname, ".."), env: webappEnv, encoding: "utf8" }
);
assert.strictEqual(webappStop.status, 0, webappStop.stderr || webappStop.stdout);
assert.strictEqual(JSON.parse(webappStop.stdout).alreadyStopped, true);
let stoppedHealthResponded = true;
try {
  httpJson(`${webappPayload.url}/api/health`);
} catch (_error) {
  stoppedHealthResponded = false;
}
assert.strictEqual(stoppedHealthResponded, false, "AAPS Studio should not respond after webapp stop");
const webappDisable = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "webapp", "disable", "--project", ".aaps-work/tests/webapp-project", "--host", "127.0.0.1", "--port", webappPort, "--json"],
  { cwd: path.join(__dirname, ".."), env: webappEnv, encoding: "utf8" }
);
assert.strictEqual(webappDisable.status, 0, webappDisable.stderr || webappDisable.stdout);
assert.strictEqual(JSON.parse(webappDisable.stdout).autoStart, false);
const webappDisabledChat = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "chat", "--project", ".aaps-work/tests/webapp-project", "--host", "127.0.0.1", "--port", webappPort],
  { cwd: path.join(__dirname, ".."), env: webappEnv, input: "/exit\n", encoding: "utf8" }
);
assert.strictEqual(webappDisabledChat.status, 0, webappDisabledChat.stderr || webappDisabledChat.stdout);
assert(webappDisabledChat.stdout.includes("webapp auto-start disabled - use /webapp to start manually"), webappDisabledChat.stdout);
const webappEnable = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "webapp", "enable", "--project", ".aaps-work/tests/webapp-project", "--host", "127.0.0.1", "--port", webappPort, "--json"],
  { cwd: path.join(__dirname, ".."), env: webappEnv, encoding: "utf8" }
);
assert.strictEqual(webappEnable.status, 0, webappEnable.stderr || webappEnable.stdout);
assert.strictEqual(JSON.parse(webappEnable.stdout).autoStart, true);

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

const microscopyScriptProject = path.join(__dirname, "..", ".aaps-work", "tests", "compiler-microscopy-script-project");
fs.rmSync(microscopyScriptProject, { recursive: true, force: true });
fs.mkdirSync(path.join(microscopyScriptProject, "blocks"), { recursive: true });
fs.writeFileSync(
  path.join(microscopyScriptProject, "aaps.project.json"),
  JSON.stringify({ name: "compiler-microscopy-script-project", activeFile: "blocks/app81_preview.aaps" }, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(microscopyScriptProject, "blocks", "app81_preview.aaps"),
  `pipeline "Microscopy Script Compile" {
  domain "biology"
  block app81_preview {
    purpose "Segment App81 TIFF microscopy images and write masks, overlays, metrics, figures, and report artifacts."
    input data_root: artifact required = "data/DEO App81 P8"
    input image_glob: text optional = "**/*10x*.tif"
    input preview_limit: integer optional = "3"
    output run_manifest: json = "${"${run.artifacts}"}/run_manifest.json"
    output per_image_metrics_csv: table = "${"${run.artifacts}"}/databases/per_image_metrics.csv"
    requires_files "scripts/app81_backend_agent_tdv_test.py"
    compile_prompt "Create a self-debuggable TIFF microscopy segmentation CLI. It must accept --data-root, --image-glob, --out-dir, --preview-limit, and --method, write masks, overlays, per-image metrics CSV/JSON, summary CSV/JSON, a summary figure, report.md, run_manifest.json, and debug logs."
    stage segment_images {
      method deterministic_threshold_morphology {
        exec python_script "scripts/app81_backend_agent_tdv_test.py"
        arg data_root = "${"${input.data_root}"}"
        arg image_glob = "${"${input.image_glob}"}"
        arg out_dir = "${"${run.artifacts}"}"
        arg preview_limit = "${"${input.preview_limit}"}"
        arg method = "threshold_morphology"
      }
    }
  }
}
`,
  "utf8"
);
const microscopyCompileApply = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "compile", "blocks/app81_preview.aaps", "--project", ".aaps-work/tests/compiler-microscopy-script-project", "--mode", "apply", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(microscopyCompileApply.status, 0, microscopyCompileApply.stderr || microscopyCompileApply.stdout);
const microscopyScript = fs.readFileSync(path.join(microscopyScriptProject, "scripts", "app81_backend_agent_tdv_test.py"), "utf8");
assert(microscopyScript.includes("AAPS generated TIFF microscopy segmentation preview script"));
assert(microscopyScript.includes("--data-root"));
assert(microscopyScript.includes("allow_abbrev=False"));
assert(microscopyScript.includes("--preview"));
assert(microscopyScript.includes("--mode"));
assert(microscopyScript.includes("method_selection.json"));
assert(microscopyScript.includes("per_image_metrics.csv"));
assert(!microscopyScript.includes("static project check script"));
fs.writeFileSync(
  path.join(microscopyScriptProject, "scripts", "app81_backend_agent_tdv_test.py"),
  "#!/usr/bin/env python3\n\"\"\"AAPS generated static project check script.\"\"\"\nprint('stale')\n",
  "utf8"
);
const microscopyCompileForce = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "compile", "blocks/app81_preview.aaps", "--project", ".aaps-work/tests/compiler-microscopy-script-project", "--mode", "force", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(microscopyCompileForce.status, 0, microscopyCompileForce.stderr || microscopyCompileForce.stdout);
const microscopyForceReport = JSON.parse(microscopyCompileForce.stdout);
assert(microscopyForceReport.generatedFiles.some((item) => item.file === "scripts/app81_backend_agent_tdv_test.py" && item.written && item.backup));
const microscopyForceScript = fs.readFileSync(path.join(microscopyScriptProject, "scripts", "app81_backend_agent_tdv_test.py"), "utf8");
assert(microscopyForceScript.includes("AAPS generated TIFF microscopy segmentation preview script"));
assert(!microscopyForceScript.includes("print('stale')"));

const neutralMicroscopyProject = path.join(__dirname, "..", ".aaps-work", "tests", "compiler-neutral-microscopy-script-project");
fs.rmSync(neutralMicroscopyProject, { recursive: true, force: true });
fs.mkdirSync(path.join(neutralMicroscopyProject, "blocks"), { recursive: true });
fs.writeFileSync(
  path.join(neutralMicroscopyProject, "aaps.project.json"),
  JSON.stringify({ name: "compiler-neutral-microscopy-script-project", activeFile: "blocks/neutral_preview.aaps" }, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(neutralMicroscopyProject, "blocks", "neutral_preview.aaps"),
  `pipeline "Neutral Filename Microscopy Compile" {
  domain "biology"
  block neutral_step {
    purpose "Compile a TIFF microscopy segmentation preview that writes masks, overlays, per-image metrics, summary tables, a figure, report, and run manifest."
    input data_root: artifact required = "data/DEO App81 P8"
    input image_glob: text optional = "**/*10x*.tif"
    input output_root: artifact optional = "outputs/neutral"
    output per_image_metrics_csv: table = "${"${input.output_root}"}/databases/per_image_metrics.csv"
    output summary_figure: image = "${"${input.output_root}"}/figures/app81_deo_segmentation_summary.png"
    requires_files "scripts/do_work.py"
    exec python_script "scripts/do_work.py"
    arg data_root = "${"${input.data_root}"}"
    arg image_glob = "${"${input.image_glob}"}"
    arg output_root = "${"${input.output_root}"}"
    arg preview_limit = "3"
    arg method_hint = "cellpose_then_threshold_fallback"
  }
}
`,
  "utf8"
);
const neutralMicroscopyCompileApply = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "compile", "blocks/neutral_preview.aaps", "--project", ".aaps-work/tests/compiler-neutral-microscopy-script-project", "--mode", "apply", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(neutralMicroscopyCompileApply.status, 0, neutralMicroscopyCompileApply.stderr || neutralMicroscopyCompileApply.stdout);
const neutralMicroscopyScript = fs.readFileSync(path.join(neutralMicroscopyProject, "scripts", "do_work.py"), "utf8");
assert(neutralMicroscopyScript.includes("AAPS generated TIFF microscopy segmentation preview script"));
assert(neutralMicroscopyScript.includes("--data-root"));
assert(neutralMicroscopyScript.includes("--output-root"));
assert(neutralMicroscopyScript.includes("--min-mask-pixels"));
assert(neutralMicroscopyScript.includes("method_selection.json"));
assert(!neutralMicroscopyScript.includes("synthetic PGM image generator"));

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

const inlineAgentProject = path.join(__dirname, "..", ".aaps-work", "tests", "inline-agent-project");
fs.rmSync(inlineAgentProject, { recursive: true, force: true });
fs.mkdirSync(path.join(inlineAgentProject, "workflows"), { recursive: true });
fs.writeFileSync(
  path.join(inlineAgentProject, "aaps.project.json"),
  JSON.stringify({ name: "inline-agent-project", activeFile: "workflows/main.aaps" }, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(inlineAgentProject, "workflows", "main.aaps"),
  `pipeline "Inline Agent Compile" {
  agent runner {
    role "Local test runner."
    model "local"
    tools "shell"
  }
  task write_file {
    uses runner
    exec shell "mkdir -p runtime/artifacts && printf ok > runtime/artifacts/ok.txt"
    output ok_file: text = "runtime/artifacts/ok.txt"
    validate exists "runtime/artifacts/ok.txt"
  }
}
`,
  "utf8"
);
const inlineAgentCompile = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "compile", "workflows/main.aaps", "--project", ".aaps-work/tests/inline-agent-project", "--mode", "check", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(inlineAgentCompile.status, 0, inlineAgentCompile.stderr || inlineAgentCompile.stdout);
const inlineAgentCompileJson = JSON.parse(inlineAgentCompile.stdout);
assert.strictEqual(inlineAgentCompileJson.status, "compiled");
assert(!JSON.stringify(inlineAgentCompileJson.missingComponents || []).includes("missing_agent"));

const missingBlockRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "run-block",
    "workflows/main.aaps",
    "--project",
    ".aaps-work/tests/inline-agent-project",
    "--block",
    "does_not_exist",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "missing-block-runtime",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.notStrictEqual(missingBlockRun.status, 0, missingBlockRun.stdout);
const missingBlockRunJson = JSON.parse(missingBlockRun.stdout);
assert.strictEqual(missingBlockRunJson.status, "failed_missing_block");
assert.strictEqual(missingBlockRunJson.plan.blockFilter.matched, 0);

const nestedContractProject = path.join(__dirname, "..", ".aaps-work", "tests", "nested-contract-project");
fs.rmSync(nestedContractProject, { recursive: true, force: true });
fs.mkdirSync(path.join(nestedContractProject, "blocks"), { recursive: true });
fs.writeFileSync(
  path.join(nestedContractProject, "aaps.project.json"),
  JSON.stringify({ name: "nested-contract-project", activeFile: "blocks/nested.aaps" }, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(nestedContractProject, "blocks", "nested.aaps"),
  `pipeline "Nested Contract Runtime" {
  block parent_block {
    input message: text required = "hello inherited"
    output out_file: text = "${"${run.artifacts}"}/nested.txt"
    stage write_stage {
      action write_file {
        exec shell "mkdir -p ${"${run.artifacts}"} && printf '%s' '${"${input.message}"}' > '${"${output.out_file}"}'"
        validate exists "${"${output.out_file}"}"
        validate nonempty "${"${output.out_file}"}"
      }
    }
  }
}
`,
  "utf8"
);
const nestedContractRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "run-block",
    "blocks/nested.aaps",
    "--project",
    ".aaps-work/tests/nested-contract-project",
    "--block",
    "parent_block",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "nested-contract-runtime",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(nestedContractRun.status, 0, nestedContractRun.stderr || nestedContractRun.stdout);
const nestedContractRunJson = JSON.parse(nestedContractRun.stdout);
assert.strictEqual(nestedContractRunJson.status, "succeeded");
assert.strictEqual(fs.readFileSync(path.join(nestedContractRunJson.runDir, "artifacts", "nested.txt"), "utf8"), "hello inherited");

const parameterContextProject = path.join(__dirname, "..", ".aaps-work", "tests", "parameter-context-project");
fs.rmSync(parameterContextProject, { recursive: true, force: true });
fs.mkdirSync(path.join(parameterContextProject, "blocks"), { recursive: true });
fs.writeFileSync(
  path.join(parameterContextProject, "aaps.project.json"),
  JSON.stringify({ name: "parameter-context-project", activeFile: "blocks/params.aaps" }, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(parameterContextProject, "blocks", "params.aaps"),
  `pipeline "Parameter Runtime Context" {
  block parent_block {
    param min_mask_pixels = "50"
    param min_rows = "1"
    output observed: text = "${"${run.artifacts}"}/param.txt"
    output observed_table: table = "${"${run.artifacts}"}/rows.csv"
    stage write_stage {
      action write_param {
        exec shell "mkdir -p ${"${run.artifacts}"} && printf '%s' '${"${param.min_mask_pixels}"}' > '${"${output.observed}"}' && printf 'name\\napp81\\n' > '${"${output.observed_table}"}'"
        validate exists "${"${output.observed}"}"
        validate nonempty "${"${output.observed}"}"
        validate csv_min_rows "${"${output.observed_table}"}" "${"${param.min_rows}"}"
      }
    }
  }
}
`,
  "utf8"
);
const parameterContextRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "run-block",
    "blocks/params.aaps",
    "--project",
    ".aaps-work/tests/parameter-context-project",
    "--block",
    "parent_block",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "parameter-context-runtime",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(parameterContextRun.status, 0, parameterContextRun.stderr || parameterContextRun.stdout);
const parameterContextRunJson = JSON.parse(parameterContextRun.stdout);
assert.strictEqual(parameterContextRunJson.status, "succeeded");
assert.strictEqual(fs.readFileSync(path.join(parameterContextRunJson.runDir, "artifacts", "param.txt"), "utf8"), "50");

const parameterOverrideRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "run-block",
    "blocks/params.aaps",
    "--project",
    ".aaps-work/tests/parameter-context-project",
    "--block",
    "parent_block",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "parameter-override-runtime",
    "--set",
    "param.min_mask_pixels=75",
    "--set",
    "unknown_preview_knob=1",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(parameterOverrideRun.status, 0, parameterOverrideRun.stderr || parameterOverrideRun.stdout);
const parameterOverrideRunJson = JSON.parse(parameterOverrideRun.stdout);
assert.strictEqual(parameterOverrideRunJson.status, "succeeded");
assert.strictEqual(fs.readFileSync(path.join(parameterOverrideRunJson.runDir, "artifacts", "param.txt"), "utf8"), "75");
assert(parameterOverrideRunJson.runtimeOverrides.applied.some((item) => item.key === "min_mask_pixels" && item.value === "75"));
assert.deepStrictEqual(parameterOverrideRunJson.runtimeOverrides.unmatched, ["unknown_preview_knob"]);

const semanticValidationProject = path.join(__dirname, "..", ".aaps-work", "tests", "semantic-validation-project");
fs.rmSync(semanticValidationProject, { recursive: true, force: true });
fs.mkdirSync(path.join(semanticValidationProject, "workflows"), { recursive: true });
fs.writeFileSync(
  path.join(semanticValidationProject, "aaps.project.json"),
  JSON.stringify({ name: "semantic-validation-project", activeFile: "workflows/main.aaps" }, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(semanticValidationProject, "workflows", "main.aaps"),
  `pipeline "Semantic Runtime Validation" {
  task write_outputs {
    output table: table = "${"${run.artifacts}"}/metrics.csv"
    output manifest: json = "${"${run.artifacts}"}/manifest.json"
    output mask: image = "${"${run.artifacts}"}/mask.pgm"
    output report: artifact = "${"${run.artifacts}"}/report.md"
    exec python_inline
    code """
from pathlib import Path
root = Path("${"${run.artifacts}"}")
root.mkdir(parents=True, exist_ok=True)
(root / "metrics.csv").write_text("image_id,condition,object_count\\nimg1,low,2\\nimg2,high,3\\n", encoding="utf-8")
(root / "manifest.json").write_text('{"processed_count": 2, "rows": [{"image_id": "img1"}]}\\n', encoding="utf-8")
(root / "mask.pgm").write_text("P2\\n3 3\\n255\\n0 0 0\\n0 9 0\\n0 0 0\\n", encoding="utf-8")
(root / "report.md").write_text("# Semantic validation report\\n", encoding="utf-8")
"""
    validate csv_min_rows "${"${output.table}"}" 2
    validate csv_rows "${"${output.table}"}" == 2
    validate csv_columns "${"${output.table}"}" "image_id,condition,object_count"
    validate json_field "${"${output.manifest}"}" "processed_count"
    validate mask_not_empty "${"${output.mask}"}"
    validate file_size "${"${output.report}"}" >= 8
  }
}
`,
  "utf8"
);
const semanticValidationRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "run",
    "workflows/main.aaps",
    "--project",
    ".aaps-work/tests/semantic-validation-project",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "semantic-validation-runtime",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(semanticValidationRun.status, 0, semanticValidationRun.stderr || semanticValidationRun.stdout);
const semanticValidationRunJson = JSON.parse(semanticValidationRun.stdout);
assert.strictEqual(semanticValidationRunJson.status, "succeeded");
assert(
  semanticValidationRunJson.results[0].validations.some((item) => item.rule.includes("csv_columns") && item.status === "passed")
);

fs.writeFileSync(
  path.join(semanticValidationProject, "workflows", "negative.aaps"),
  fs.readFileSync(path.join(semanticValidationProject, "workflows", "main.aaps"), "utf8").replace(
    'validate csv_min_rows "${output.table}" 2',
    'validate csv_min_rows "${output.table}" 3'
  ),
  "utf8"
);
const semanticValidationNegativeRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "run",
    "workflows/negative.aaps",
    "--project",
    ".aaps-work/tests/semantic-validation-project",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "semantic-validation-negative-runtime",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.notStrictEqual(semanticValidationNegativeRun.status, 0, semanticValidationNegativeRun.stdout);
assert.strictEqual(JSON.parse(semanticValidationNegativeRun.stdout).status, "failed");

const methodRouterProject = path.join(__dirname, "..", ".aaps-work", "tests", "method-router-project");
fs.rmSync(methodRouterProject, { recursive: true, force: true });
fs.mkdirSync(path.join(methodRouterProject, "workflows"), { recursive: true });
fs.writeFileSync(
  path.join(methodRouterProject, "aaps.project.json"),
  JSON.stringify({ name: "method-router-project", activeFile: "workflows/main.aaps" }, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(methodRouterProject, "workflows", "main.aaps"),
  `pipeline "Method Router Runtime" {
  block route_once {
    output selected: text = "${"${run.artifacts}"}/selected.txt"
    output second_marker: text = "${"${run.artifacts}"}/second.txt"
    stage choose_method {
      choose method_route {
        prompt "Pick one segmentation method for this run."
      }
      method first_method {
        exec shell "mkdir -p ${"${run.artifacts}"} && printf first > ${"${output.selected}"}"
        validate exists "${"${output.selected}"}"
      }
      method second_method {
        exec shell "mkdir -p ${"${run.artifacts}"} && printf second > ${"${output.second_marker}"}"
      }
    }
  }
}
`,
  "utf8"
);
const methodRouterRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "run-block",
    "workflows/main.aaps",
    "--project",
    ".aaps-work/tests/method-router-project",
    "--block",
    "route_once",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "method-router-runtime",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(methodRouterRun.status, 0, methodRouterRun.stderr || methodRouterRun.stdout);
const methodRouterRunJson = JSON.parse(methodRouterRun.stdout);
assert.strictEqual(methodRouterRunJson.status, "succeeded");
assert.strictEqual(methodRouterRunJson.methodSelections[0].selected, "first_method");
assert(methodRouterRunJson.results.some((item) => item.id === "second_method" && item.status === "skipped" && item.reason === "method_not_selected"));
assert.strictEqual(fs.readFileSync(path.join(methodRouterRunJson.runDir, "artifacts", "selected.txt"), "utf8"), "first");
assert(!fs.existsSync(path.join(methodRouterRunJson.runDir, "artifacts", "second.txt")));
const methodSelectionRecord = JSON.parse(fs.readFileSync(path.join(methodRouterRunJson.runDir, "method_selection.json"), "utf8"));
assert.strictEqual(methodSelectionRecord.selections[0].selected, "first_method");

fs.writeFileSync(
  path.join(inlineAgentProject, "workflows", "pipefail.aaps"),
  `pipeline "Pipefail Runtime" {
  agent runner {
    role "Local test runner."
    model "local"
    tools "shell"
  }
  task pipe_must_fail {
    uses runner
    exec shell "false | tee runtime/artifacts/pipefail.txt"
    output pipe_file: text = "runtime/artifacts/pipefail.txt"
  }
}
`,
  "utf8"
);
const pipefailRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "run",
    "workflows/pipefail.aaps",
    "--project",
    ".aaps-work/tests/inline-agent-project",
    "--run-root",
    "runtime/test-runs",
    "--run-id",
    "pipefail-runtime",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.notStrictEqual(pipefailRun.status, 0, pipefailRun.stdout);
const pipefailRunJson = JSON.parse(pipefailRun.stdout);
assert.strictEqual(pipefailRunJson.status, "failed");

const promptProject = path.join(__dirname, "..", ".aaps-work", "tests", "prompt-project");
fs.rmSync(promptProject, { recursive: true, force: true });
fs.mkdirSync(promptProject, { recursive: true });
const promptDryRun = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "prompt",
    "Create an AAPS workflow that writes a durable report.",
    "--project",
    ".aaps-work/tests/prompt-project",
    "--backend",
    "print",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(promptDryRun.status, 0, promptDryRun.stderr || promptDryRun.stdout);
const promptPayload = JSON.parse(promptDryRun.stdout);
assert.strictEqual(promptPayload.ok, true);
assert.strictEqual(promptPayload.backend, "print");
assert.strictEqual(promptPayload.executed, false);
assert(fs.existsSync(path.join(promptProject, promptPayload.promptFile)));
const promptText = fs.readFileSync(path.join(promptProject, promptPayload.promptFile), "utf8");
assert(promptText.includes("AAPS Backend Agent Task"));
assert(promptText.includes("Docker-safe AAPS CLI fallback"));
assert(promptText.includes("npx -y @lazyingart/aaps@"));
assert(promptText.includes("host path exists inside the active sandbox"));
assert(promptText.includes("If broad host commands are blocked"));
assert(promptText.includes("`.aaps` files are not YAML"));
assert(promptText.includes("project-local `.venv`"));
assert(promptText.includes("set -o pipefail"));

const fakeBin = path.join(promptProject, "fake-bin");
const fakeArgsFile = path.join(promptProject, "fake-aginti-args.txt");
fs.mkdirSync(fakeBin, { recursive: true });
fs.writeFileSync(
  path.join(fakeBin, "aginti"),
  `#!/bin/sh
printf '%s\\n' "$@" > "$AAPS_FAKE_AGINTI_ARGS"
mkdir -p workflows runtime/artifacts
cat > aaps.project.json <<'EOF'
{
  "schema": "aaps_project/0.1",
  "name": "Prompt Backend Project",
  "activeFile": "workflows/backend_verified.aaps"
}
EOF
cat > workflows/backend_verified.aaps <<'EOF'
pipeline "Backend Verified" {
  output ok_file: text = "runtime/artifacts/backend-ok.txt"
  agent runner {
    role "Local shell runner."
    model "local"
    tools "shell"
  }
  task done {
    uses runner
    output ok_file: text = "runtime/artifacts/backend-ok.txt"
    exec shell "mkdir -p runtime/artifacts && printf ok > runtime/artifacts/backend-ok.txt"
    validate exists "runtime/artifacts/backend-ok.txt"
  }
}
EOF
cat > workflows/unrelated_broken.aaps <<'EOF'
pipeline "Unrelated Broken Workflow" {
  output missing_file: text = "runtime/artifacts/unrelated-missing.txt"
  agent runner {
    role "Local shell runner."
    model "local"
    tools "shell"
  }
  task broken {
    uses runner
    output missing_file: text = "runtime/artifacts/unrelated-missing.txt"
    exec shell "mkdir -p runtime/artifacts && printf unrelated > runtime/artifacts/unrelated-side-effect.txt"
    validate exists "runtime/artifacts/unrelated-missing.txt"
  }
}
EOF
printf ok > runtime/artifacts/backend-ok.txt
exit 0
`,
  { encoding: "utf8", mode: 0o755 }
);
const promptTrustedHost = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "prompt",
    "Use trusted host mode for a project-local AAPS repair.",
    "--project",
    ".aaps-work/tests/prompt-project",
    "--backend",
    "aginti",
    "--sandbox-mode",
    "host",
    "--package-install-policy",
    "allow",
    "--approve-package-installs",
    "--allow-destructive",
    "--aginti-safety",
    "danger",
    "--json",
  ],
  {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
      AAPS_FAKE_AGINTI_ARGS: fakeArgsFile,
    },
  }
);
assert.strictEqual(promptTrustedHost.status, 0, promptTrustedHost.stderr || promptTrustedHost.stdout);
const trustedPayload = JSON.parse(promptTrustedHost.stdout);
assert.strictEqual(trustedPayload.ok, true);
assert.strictEqual(trustedPayload.executed, true);
assert.strictEqual(trustedPayload.status, "succeeded_verified");
assert.strictEqual(trustedPayload.postRunAudit.ok, true);
assert.strictEqual(trustedPayload.postRunAudit.workflowCount, 1);
assert.strictEqual(trustedPayload.postRunAudit.workflows[0].file, "workflows/backend_verified.aaps");
assert(trustedPayload.command.includes("--allow-destructive"));
assert(trustedPayload.command.includes("-s"));
assert(trustedPayload.command.includes("danger"));
assert(trustedPayload.command.includes("--routing"));
assert(trustedPayload.command.includes("complex"));
assert.strictEqual(trustedPayload.handoffMode, "file");
assert(trustedPayload.handoffGoal.includes(trustedPayload.promptFile));
const fakeAgintiArgs = fs.readFileSync(fakeArgsFile, "utf8");
assert(fakeAgintiArgs.includes("--allow-destructive"));
assert(fakeAgintiArgs.includes(trustedPayload.promptFile));
assert(!fakeAgintiArgs.includes("AAPS Syntax Contract"));

const discoveryHome = path.join(promptProject, "fake-home");
const discoveryBin = path.join(discoveryHome, ".local", "bin");
fs.mkdirSync(discoveryBin, { recursive: true });
const discoveryAgintiProject = path.join(__dirname, "..", ".aaps-work", "tests", "prompt-discovery-aginti-project");
fs.rmSync(discoveryAgintiProject, { recursive: true, force: true });
fs.mkdirSync(discoveryAgintiProject, { recursive: true });
const discoveryAgintiArgsFile = path.join(discoveryAgintiProject, "fake-aginti-args.txt");
fs.writeFileSync(
  path.join(discoveryBin, "aginti"),
  `#!/bin/sh
printf '%s\\n' "$@" > "$AAPS_FAKE_AGINTI_ARGS"
mkdir -p workflows runtime/artifacts
cat > aaps.project.json <<'EOF'
{"schema":"aaps_project/0.1","name":"Discovery Aginti Project","activeFile":"workflows/discovered_aginti.aaps"}
EOF
cat > workflows/discovered_aginti.aaps <<'EOF'
pipeline "Discovered Aginti" {
  output ok_file: text = "runtime/artifacts/discovered-aginti-ok.txt"
  agent runner {
    role "Local shell runner."
    model "local"
    tools "shell"
  }
  task done {
    uses runner
    output ok_file: text = "runtime/artifacts/discovered-aginti-ok.txt"
    exec shell "mkdir -p runtime/artifacts && printf ok > runtime/artifacts/discovered-aginti-ok.txt"
    validate exists "runtime/artifacts/discovered-aginti-ok.txt"
  }
}
EOF
printf ok > runtime/artifacts/discovered-aginti-ok.txt
exit 0
`,
  { encoding: "utf8", mode: 0o755 }
);
const promptDiscoveredAginti = childProcess.spawnSync(
  process.execPath,
  [
    "scripts/aaps.js",
    "prompt",
    "Use AgInTiFlow discovered from HOME local bin.",
    "--project",
    ".aaps-work/tests/prompt-discovery-aginti-project",
    "--backend",
    "aginti",
    "--sandbox-mode",
    "host",
    "--json",
  ],
  {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: discoveryHome,
      PATH: "/usr/bin:/bin",
      AAPS_FAKE_AGINTI_ARGS: discoveryAgintiArgsFile,
    },
  }
);
assert.strictEqual(promptDiscoveredAginti.status, 0, promptDiscoveredAginti.stderr || promptDiscoveredAginti.stdout);
const discoveredAgintiPayload = JSON.parse(promptDiscoveredAginti.stdout);
assert.strictEqual(discoveredAgintiPayload.status, "succeeded_verified");
assert.strictEqual(discoveredAgintiPayload.backendCommand.name, "aginti");
assert(discoveredAgintiPayload.backendCommand.command.endsWith(`${path.sep}.local${path.sep}bin${path.sep}aginti`));
assert(fs.readFileSync(discoveryAgintiArgsFile, "utf8").includes(discoveredAgintiPayload.promptFile));

const discoveryCodexProject = path.join(__dirname, "..", ".aaps-work", "tests", "prompt-discovery-codex-project");
fs.rmSync(discoveryCodexProject, { recursive: true, force: true });
fs.mkdirSync(discoveryCodexProject, { recursive: true });
fs.writeFileSync(
  path.join(discoveryBin, "codex"),
  `#!/bin/sh
out=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output-last-message" ]; then
    shift
    out="$1"
  fi
  shift || break
done
cat >/dev/null
mkdir -p workflows runtime/artifacts
if [ -n "$out" ]; then
  mkdir -p "$(dirname "$out")"
  printf 'fake codex complete\\n' > "$out"
fi
cat > aaps.project.json <<'EOF'
{"schema":"aaps_project/0.1","name":"Discovery Codex Project","activeFile":"workflows/discovered_codex.aaps"}
EOF
cat > workflows/discovered_codex.aaps <<'EOF'
pipeline "Discovered Codex" {
  output ok_file: text = "runtime/artifacts/discovered-codex-ok.txt"
  agent runner {
    role "Local shell runner."
    model "local"
    tools "shell"
  }
  task done {
    uses runner
    output ok_file: text = "runtime/artifacts/discovered-codex-ok.txt"
    exec shell "mkdir -p runtime/artifacts && printf ok > runtime/artifacts/discovered-codex-ok.txt"
    validate exists "runtime/artifacts/discovered-codex-ok.txt"
  }
}
EOF
printf ok > runtime/artifacts/discovered-codex-ok.txt
exit 0
`,
  { encoding: "utf8", mode: 0o755 }
);
const promptDiscoveredCodex = childProcess.spawnSync(
  process.execPath,
  [
    "scripts/aaps.js",
    "prompt",
    "Use Codex discovered from HOME local bin.",
    "--project",
    ".aaps-work/tests/prompt-discovery-codex-project",
    "--backend",
    "codex",
    "--json",
  ],
  {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: discoveryHome,
      PATH: "/usr/bin:/bin",
    },
  }
);
assert.strictEqual(promptDiscoveredCodex.status, 0, promptDiscoveredCodex.stderr || promptDiscoveredCodex.stdout);
const discoveredCodexPayload = JSON.parse(promptDiscoveredCodex.stdout);
assert.strictEqual(discoveredCodexPayload.status, "succeeded_verified");
assert.strictEqual(discoveredCodexPayload.backendCommand.name, "codex");
assert(discoveredCodexPayload.backendCommand.command.endsWith(`${path.sep}.local${path.sep}bin${path.sep}codex`));

const manifestOnlyProject = path.join(__dirname, "..", ".aaps-work", "tests", "prompt-manifest-only-project");
fs.rmSync(manifestOnlyProject, { recursive: true, force: true });
fs.mkdirSync(path.join(manifestOnlyProject, "fake-bin"), { recursive: true });
const manifestOnlyArgsFile = path.join(manifestOnlyProject, "fake-aginti-args.txt");
fs.writeFileSync(
  path.join(manifestOnlyProject, "fake-bin", "aginti"),
  `#!/bin/sh
printf '%s\\n' "$@" > "$AAPS_FAKE_AGINTI_ARGS"
mkdir -p workflows runtime/artifacts
cat > aaps.project.json <<'EOF'
{
  "schema": "aaps_project/0.1",
  "name": "Prompt Manifest Only Project",
  "files": {
    "workflows": [
      "workflows/backend_generated.aaps"
    ]
  }
}
EOF
cat > workflows/backend_generated.aaps <<'EOF'
pipeline "Backend Generated" {
  output ok_file: text = "runtime/artifacts/backend-generated-ok.txt"
  agent runner {
    role "Local shell runner."
    model "local"
    tools "shell"
  }
  task done {
    uses runner
    output ok_file: text = "runtime/artifacts/backend-generated-ok.txt"
    exec shell "mkdir -p runtime/artifacts && printf ok > runtime/artifacts/backend-generated-ok.txt"
    validate exists "runtime/artifacts/backend-generated-ok.txt"
  }
}
EOF
printf ok > runtime/artifacts/backend-generated-ok.txt
exit 0
`,
  { encoding: "utf8", mode: 0o755 }
);
const promptManifestOnly = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "prompt",
    "Create the manifest-listed backend workflow.",
    "--project",
    ".aaps-work/tests/prompt-manifest-only-project",
    "--backend",
    "aginti",
    "--sandbox-mode",
    "host",
    "--json",
  ],
  {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${path.join(manifestOnlyProject, "fake-bin")}${path.delimiter}${process.env.PATH || ""}`,
      AAPS_FAKE_AGINTI_ARGS: manifestOnlyArgsFile,
    },
  }
);
assert.strictEqual(promptManifestOnly.status, 0, promptManifestOnly.stderr || promptManifestOnly.stdout);
const manifestOnlyPayload = JSON.parse(promptManifestOnly.stdout);
assert.strictEqual(manifestOnlyPayload.status, "succeeded_verified");
assert.strictEqual(manifestOnlyPayload.postRunAudit.workflowCount, 1);
assert.strictEqual(manifestOnlyPayload.postRunAudit.workflows[0].file, "workflows/backend_generated.aaps");
assert(fs.readFileSync(manifestOnlyArgsFile, "utf8").includes(manifestOnlyPayload.promptFile));

const promptProjectWideAudit = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "audit", "--project", ".aaps-work/tests/prompt-project", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.notStrictEqual(promptProjectWideAudit.status, 0, promptProjectWideAudit.stdout);
const promptProjectWideAuditJson = JSON.parse(promptProjectWideAudit.stdout);
assert.strictEqual(promptProjectWideAuditJson.ok, false);
assert(promptProjectWideAuditJson.workflows.some((item) => item.file === "workflows/unrelated_broken.aaps"));

const promptAudit = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "audit", "workflows/backend_verified.aaps", "--project", ".aaps-work/tests/prompt-project", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(promptAudit.status, 0, promptAudit.stderr || promptAudit.stdout);
assert.strictEqual(JSON.parse(promptAudit.stdout).ok, true);

fs.rmSync(path.join(promptProject, "runtime", "artifacts", "backend-ok.txt"), { force: true });
const promptAuditMissing = childProcess.spawnSync(
  "node",
  ["scripts/aaps.js", "audit", "workflows/backend_verified.aaps", "--project", ".aaps-work/tests/prompt-project", "--json"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.notStrictEqual(promptAuditMissing.status, 0, promptAuditMissing.stdout);
const promptAuditMissingJson = JSON.parse(promptAuditMissing.stdout);
assert.strictEqual(promptAuditMissingJson.ok, false);
assert(promptAuditMissingJson.workflows[0].missingOutputs.some((item) => item.path === "runtime/artifacts/backend-ok.txt"));

const directPrompt = childProcess.spawnSync(
  "node",
  [
    "scripts/aaps.js",
    "Create a tiny project-local workflow from this direct prompt.",
    "--project",
    ".aaps-work/tests/prompt-project",
    "--backend",
    "print",
    "--json",
  ],
  { cwd: path.join(__dirname, ".."), encoding: "utf8" }
);
assert.strictEqual(directPrompt.status, 0, directPrompt.stderr || directPrompt.stdout);
const directPromptPayload = JSON.parse(directPrompt.stdout);
assert.strictEqual(directPromptPayload.ok, true);
assert.strictEqual(directPromptPayload.backend, "print");
assert(fs.existsSync(path.join(promptProject, directPromptPayload.promptFile)));

function httpJson(url, payload) {
  const args = ["-sS", url];
  if (payload) {
    args.splice(1, 0, "-X", "POST", "-H", "content-type: application/json", "--data", JSON.stringify(payload));
  }
  const result = childProcess.spawnSync("curl", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function httpStatus(url) {
  const result = childProcess.spawnSync("curl", ["-sS", "-o", "/tmp/aaps-http-status.out", "-w", "%{http_code}", url], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}

const studioProject = path.join(__dirname, "..", ".aaps-work", "tests", "studio-project");
fs.rmSync(studioProject, { recursive: true, force: true });
fs.mkdirSync(path.join(studioProject, "workflows"), { recursive: true });
fs.mkdirSync(path.join(studioProject, "data"), { recursive: true });
fs.mkdirSync(path.join(studioProject, "outputs", "runs"), { recursive: true });
fs.mkdirSync(path.join(studioProject, ".aginti-sessions"), { recursive: true });
fs.writeFileSync(
  path.join(studioProject, "aaps.project.json"),
  JSON.stringify({ name: "Studio Project", activeFile: "workflows/main.aaps" }, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(studioProject, "workflows", "main.aaps"),
  `pipeline "Studio Project Compile" {
  agent runner {
    role "Local runner."
    model "local"
    tools "shell"
  }
  task done {
    uses runner
    exec shell "mkdir -p artifacts && printf ok > artifacts/ok.txt"
    output ok_file: text = "artifacts/ok.txt"
    validate exists "artifacts/ok.txt"
  }
}
`,
  "utf8"
);
fs.writeFileSync(path.join(studioProject, "data", "secret-ish.json"), '{"raw": true}\n', "utf8");
fs.writeFileSync(path.join(studioProject, "outputs", "runs", "large.json"), '{"generated": true}\n', "utf8");
fs.writeFileSync(path.join(studioProject, "outputs", "runs", "pixel.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"));
fs.writeFileSync(path.join(studioProject, ".aginti-sessions", "session.json"), '{"private": true}\n', "utf8");

const studioPort = "8898";
const studio = childProcess.spawn(
  "node",
  ["scripts/aaps.js", "studio", "--project", ".aaps-work/tests/studio-project", "--host", "127.0.0.1", "--port", studioPort, "--mock-codex"],
  { cwd: path.join(__dirname, ".."), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
);
try {
  const base = `http://127.0.0.1:${studioPort}`;
  let healthy = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const health = httpJson(`${base}/api/health`);
      healthy = health.ok && health.runtime.includes("studio-project");
      if (healthy) break;
    } catch {
      childProcess.spawnSync("sleep", ["0.1"]);
    }
  }
  assert.strictEqual(healthy, true, "studio server should start for requested project");
  const studioProjectPayload = httpJson(`${base}/api/aaps/project`);
  assert.strictEqual(studioProjectPayload.project_path, ".");
  assert.strictEqual(studioProjectPayload.absolute_path, studioProject);
  assert.deepStrictEqual(studioProjectPayload.files, ["workflows/main.aaps"]);
  const studioProjects = httpJson(`${base}/api/aaps/projects`);
  assert.strictEqual(studioProjects.ok, true);
  assert.strictEqual(studioProjects.absolute_project_root, studioProject);
  const currentStudioProject = studioProjects.items.find((item) => item.path === ".");
  assert(currentStudioProject, JSON.stringify(studioProjects));
  assert.strictEqual(currentStudioProject.absolutePath, studioProject);
  assert.strictEqual(currentStudioProject.manifestExists, true);
  assert(!studioProjectPayload.text_files.some((file) => file.startsWith("data/")));
  assert(!studioProjectPayload.text_files.some((file) => file.startsWith("outputs/")));
  assert(!studioProjectPayload.text_files.some((file) => file.startsWith(".aginti")));
  const artifactFileStatus = httpStatus(`${base}/api/aaps/artifact-file?path=.&file=${encodeURIComponent("outputs/runs/pixel.png")}`);
  assert.strictEqual(artifactFileStatus, "200");
  const secretFileStatus = httpStatus(`${base}/api/aaps/artifact-file?path=.&file=${encodeURIComponent("data/secret-ish.json")}`);
  assert.strictEqual(secretFileStatus, "403");
  const agintiSettings = httpJson(`${base}/api/aaps/settings`, {
    agentProvider: "aginti",
    agintiProvider: "deepseek",
    agintiSafety: "normal",
    agintiSessionId: "web-agent-test-session",
    agentContextPack: true,
    autoSaveAgentEdits: true,
    autoCompileAfterChat: true,
  });
  assert.strictEqual(agintiSettings.agentProvider, "aginti");
  assert.strictEqual(agintiSettings.agintiProvider, "deepseek");
  assert.strictEqual(agintiSettings.agintiSafety, "normal");
  assert.strictEqual(agintiSettings.agintiSessionId, "web-agent-test-session");
  assert.strictEqual(agintiSettings.agentContextPack, true);
  assert.strictEqual(agintiSettings.autoSaveAgentEdits, true);
  assert.strictEqual(typeof agintiSettings.agintiflowAvailable, "boolean");
  const originalMainSource = fs.readFileSync(path.join(studioProject, "workflows", "main.aaps"), "utf8");
  const editedMainSource = originalMainSource.replace("Studio Project Compile", "Studio Project Compile Edited");
  const savedMain = httpJson(`${base}/api/aaps/project/file`, {
    path: ".",
    file: "workflows/main.aaps",
    source: editedMainSource,
  });
  assert.strictEqual(savedMain.ok, true);
  assert.strictEqual(fs.readFileSync(path.join(studioProject, "workflows", "main.aaps"), "utf8"), editedMainSource);
  const versions = httpJson(`${base}/api/aaps/versions?path=.&limit=20`);
  const mainSnapshot = versions.items.find((item) => item.file === "workflows/main.aaps");
  assert(mainSnapshot, JSON.stringify(versions));
  const restoredMain = httpJson(`${base}/api/aaps/versions/restore`, {
    path: ".",
    snapshot: mainSnapshot.snapshot,
  });
  assert.strictEqual(restoredMain.restored.file, "workflows/main.aaps");
  assert.strictEqual(fs.readFileSync(path.join(studioProject, "workflows", "main.aaps"), "utf8"), originalMainSource);
  const createdWorkflow = httpJson(`${base}/api/aaps/project/file-action`, {
    path: ".",
    action: "create",
    kind: "workflow",
    file: "workflows/studio_created.aaps",
  });
  assert(createdWorkflow.manifest.files.workflows.includes("workflows/studio_created.aaps"));
  assert.strictEqual(createdWorkflow.manifest.activeFile, "workflows/studio_created.aaps");
  assert(fs.existsSync(path.join(studioProject, "workflows", "studio_created.aaps")));
  const createdBlock = httpJson(`${base}/api/aaps/project/file-action`, {
    path: ".",
    action: "create",
    kind: "block",
    file: "blocks/studio_created_block.aaps",
  });
  assert(createdBlock.manifest.files.blocks.includes("blocks/studio_created_block.aaps"));
  assert(fs.existsSync(path.join(studioProject, "blocks", "studio_created_block.aaps")));
  const duplicatedWorkflow = httpJson(`${base}/api/aaps/project/file-action`, {
    path: ".",
    action: "duplicate",
    kind: "workflow",
    file: "workflows/studio_created.aaps",
    target: "workflows/studio_created_copy.aaps",
  });
  assert(duplicatedWorkflow.manifest.files.workflows.includes("workflows/studio_created_copy.aaps"));
  assert.strictEqual(duplicatedWorkflow.manifest.activeFile, "workflows/studio_created_copy.aaps");
  const renamedWorkflow = httpJson(`${base}/api/aaps/project/file-action`, {
    path: ".",
    action: "rename",
    kind: "workflow",
    file: "workflows/studio_created_copy.aaps",
    target: "workflows/studio_created_renamed.aaps",
  });
  assert(renamedWorkflow.manifest.files.workflows.includes("workflows/studio_created_renamed.aaps"));
  assert(!renamedWorkflow.manifest.files.workflows.includes("workflows/studio_created_copy.aaps"));
  const archivedWorkflow = httpJson(`${base}/api/aaps/project/file-action`, {
    path: ".",
    action: "archive",
    kind: "workflow",
    file: "workflows/studio_created_renamed.aaps",
  });
  assert(!archivedWorkflow.manifest.files.workflows.includes("workflows/studio_created_renamed.aaps"));
  assert(archivedWorkflow.manifest.files.archives.some((file) => file.endsWith("-studio_created_renamed.aaps")));
  const studioCompileStart = httpJson(`${base}/api/aaps/compile`, {
    path: ".",
    file: "workflows/main.aaps",
    mode: "check",
  });
  let studioCompile = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    studioCompile = httpJson(`${base}/api/aaps/compile?id=${studioCompileStart.id}`);
    if (studioCompile.status !== "running") break;
    childProcess.spawnSync("sleep", ["0.1"]);
  }
  assert.strictEqual(studioCompile.status, "succeeded", JSON.stringify(studioCompile));
  assert.strictEqual(studioCompile.result.status, "compiled");
  assert.strictEqual(studioCompile.result.project.projectRoot, studioProject);
  const studioBlockChat = httpJson(`${base}/api/aaps/block/chat`, {
    path: ".",
    blockId: "studio_segment",
    message: "As a biology user, create a reusable segmentation block with a script, durable mask output, and JSON QC artifact.",
    materialize: true,
    blockFile: "blocks/studio_segment.aaps",
  });
  assert.strictEqual(studioBlockChat.ok, true, JSON.stringify(studioBlockChat));
  assert.strictEqual(studioBlockChat.blockFile, "blocks/studio_segment.aaps");
  assert(studioBlockChat.historyPath.includes(".aaps-work/studio-history/block/studio_segment.jsonl"));
  assert(studioBlockChat.artifactPath.includes(".aaps-work/studio-artifacts/block/studio_segment/"));
  assert(fs.existsSync(path.join(studioProject, "blocks", "studio_segment.aaps")));
  assert(fs.existsSync(path.join(studioProject, "scripts", "studio_segment_threshold.py")));
  assert(fs.existsSync(path.join(studioProject, studioBlockChat.historyPath)));
  assert(fs.existsSync(path.join(studioProject, studioBlockChat.artifactPath)));
  const studioHistory = httpJson(`${base}/api/aaps/history?scope=block&id=studio_segment`);
  assert.strictEqual(studioHistory.ok, true);
  assert(studioHistory.events.some((event) => event.message.includes("segmentation block")));
} finally {
  studio.kill("SIGTERM");
  childProcess.spawnSync("pkill", ["-f", `aaps_codex_server.py --host 127.0.0.1 --port ${studioPort}`]);
}

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
