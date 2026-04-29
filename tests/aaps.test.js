const assert = require("assert");
const AAPS = require("../src/aaps");

const ir = AAPS.parseAAPS(AAPS.sample);

assert.strictEqual(ir.pipeline.name, "Ship AAPS Studio");
assert.strictEqual(ir.pipeline.subtitle, "Prompt Is All You Need");
assert.strictEqual(ir.pipeline.inputs.repo, "./");
assert.strictEqual(ir.pipeline.agents.length, 1);
assert.strictEqual(ir.pipeline.tasks.length, 3);
assert.strictEqual(ir.pipeline.tasks[1].id, "implement");
assert.deepStrictEqual(ir.pipeline.tasks[1].after, ["discover"]);
assert.strictEqual(ir.pipeline.tasks[1].run[0], "npm test");
assert.strictEqual(ir.diagnostics.length, 0, JSON.stringify(ir.diagnostics));

const serialized = AAPS.serializeAAPS(ir);
const reparsed = AAPS.parseAAPS(serialized);
assert.strictEqual(reparsed.pipeline.tasks[2].id, "publish");
assert.strictEqual(reparsed.diagnostics.length, 0, JSON.stringify(reparsed.diagnostics));

const markdown = AAPS.toMarkdown(ir);
assert(markdown.includes("# Ship AAPS Studio"));
assert(markdown.includes("Prompt Is All You Need"));

console.log("AAPS parser smoke tests passed.");

