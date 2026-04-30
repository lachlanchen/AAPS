const assert = require("assert");
const AAPS = require("../src/aaps");

const ir = AAPS.parseAAPS(AAPS.sample);

assert.strictEqual(ir.version, "aaps_ir/0.2");
assert.strictEqual(ir.pipeline.name, "Ship AAPS Studio");
assert.strictEqual(ir.pipeline.subtitle, "Prompt Is All You Need");
assert.strictEqual(ir.pipeline.domain, "software");
assert.strictEqual(ir.pipeline.inputs.repo, "./");
assert.strictEqual(ir.pipeline.agents.length, 1);
assert.strictEqual(ir.pipeline.skills.length, 1);
assert.strictEqual(ir.pipeline.tasks.length, 2);
assert.strictEqual(ir.pipeline.skills[0].children.length, 3);
assert.strictEqual(ir.pipeline.tasks[0].calls[0].skill, "bounded_change");
assert.strictEqual(ir.diagnostics.length, 0, JSON.stringify(ir.diagnostics));

const biology = AAPS.parseAAPS(AAPS.samples.biology);
assert.strictEqual(biology.pipeline.domain, "biology");
assert.strictEqual(biology.pipeline.skills[0].children.some((child) => child.kind === "if"), true);
assert.strictEqual(
  biology.pipeline.tasks[0].children.some((child) => child.kind === "for_each"),
  true
);
assert.strictEqual(biology.diagnostics.length, 0, JSON.stringify(biology.diagnostics));

const serialized = AAPS.serializeAAPS(biology);
const reparsed = AAPS.parseAAPS(serialized);
assert.strictEqual(reparsed.pipeline.skills[0].id, "segment_image");
assert.strictEqual(reparsed.pipeline.tasks[0].children[0].kind, "for_each");
assert.strictEqual(reparsed.diagnostics.length, 0, JSON.stringify(reparsed.diagnostics));

const markdown = AAPS.toMarkdown(biology);
assert(markdown.includes("# Organoid Segmentation QC"));
assert(markdown.includes("for_each"));
assert(markdown.includes("cellpose"));

console.log("AAPS parser smoke tests passed.");
