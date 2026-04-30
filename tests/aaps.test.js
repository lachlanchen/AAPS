const assert = require("assert");
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

const markdown = AAPS.toMarkdown(biology);
assert(markdown.includes("# Organoid Segmentation QC"));
assert(markdown.includes("for_each"));
assert(markdown.includes("cellpose"));
assert(markdown.includes("Human review"));

console.log("AAPS parser smoke tests passed.");
