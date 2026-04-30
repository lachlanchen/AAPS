# AAPS Runtime

AAPS now includes a minimal real runtime:

```text
.aaps -> project-aware parser -> IR -> execution plan -> readiness/tool/agent checks -> actions -> logs/artifacts -> validation -> recovery/repair -> report
```

The runtime is intentionally conservative. It executes deterministic local actions and records prompt/model-only steps as planned work until a model adapter is attached.

## Executable Statements

Existing `run` statements execute as shell actions:

```aaps
task test {
  run "npm test"
}
```

Explicit executable actions use `exec`:

```aaps
task qc_image {
  retry 1
  repair true
  exec shell "python3 scripts/qc_image.py --image data/raw/example.tif --out artifacts/qc.json"
  validate exists "artifacts/qc.json"
  validate json "artifacts/qc.json"
}
```

Python script entries can declare args:

```aaps
action inspect {
  exec python "scripts/qc_image.py"
  arg image_path = "data/raw/example.tif"
  arg output_json = "artifacts/qc.json"
}
```

Supported runtime adapters:

- `shell`, `sh`, `bash`: executed through the local shell.
- `python` and `python_script`: executed as `python3 entry --arg value`.
- `python_inline`: writes the inline `code """..."""` block into the run directory and executes it.
- `node_script`: executes a Node.js file with mapped arguments.
- `npm_script`: executes `npm run <script>`.
- `agent`: prepares a prompt file for a registered or prompt-only agent.
- `manual`: records a human-review checkpoint.
- `noop`: succeeds without side effects, useful for scaffolds and documentation blocks.
- `internal`: recorded as skipped until an internal adapter is registered.

Inline Python:

```aaps
task write_json {
  output report: json = "${run.artifacts}/report.json"
  exec python_inline
  code """
from pathlib import Path
Path("${output.report}").write_text('{"ok": true}\\n', encoding="utf-8")
"""
  validate json "${output.report}"
}
```

## Project-Aware Execution

When `--project` points at a folder with `aaps.project.json`, the runtime resolves `include` and `import` dependencies with the same project parser used by Studio. The execution plan records:

- imported blocks and their source files
- import graph
- unresolved imports
- circular imports
- project variables, paths, tools, agents, environments, and models
- executable action metadata

Common runtime variables:

```text
${project.root}
${project.data}
${project.artifacts}
${project.scripts}
${project.environments}
${project.tools}
${project.agents}
${project.runs}
${run.id}
${run.dir}
${run.artifacts}
${run.logs}
${block.name}
${input.name}
${output.name}
${artifact.name}
${env.PYTHON}
${tool.name.path}
${agent.name.name}
```

## Readiness, Tools, Agents, And Compile Prompts

`aaps check` and every run build a block readiness report before execution. Each block is classified as `ready`, `ready_with_warning`, `missing_input`, `missing_script`, `missing_python_package`, `missing_system_command`, `missing_tool`, `missing_agent`, `invalid_output_path`, or `waiting_for_human_review`.

Readiness checks include required inputs, generated runtime artifacts, loop-deferred variables, script files, Python interpreters, Python packages, system commands, tool registry entries, agent registry entries, and writable output directories. Missing scripts, tools, packages, commands, agents, or inputs are converted into an `agent_compile_plan.json` entry when a block declares `compile_agent` or uses an agent. The generated prompt is intentionally conservative: it asks for project-local code/setup, avoids global installs, and asks before risky changes.

## Validation

Executable validation rules:

```aaps
validate exists "artifacts/qc.json"
validate nonempty "artifacts/preview.png"
validate json "artifacts/qc.json"
```

Natural-language validation and `verify` statements are preserved as manual checks in the run log.

## Recovery And Repair

```aaps
retry 1
fallback "run: python3 scripts/basic_qc.py --out artifacts/qc.json"
repair true
recover "Retry once, then create a repair request with stdout and stderr."
```

Runtime behavior:

- retries failed actions up to `retry`
- runs fallback commands or fallback block IDs when declared
- writes repair request Markdown files when `repair true` and the step still fails
- writes setup/compile prompts for missing scripts, tools, agents, commands, or packages
- records all events in `events.jsonl`

## Run Outputs

Each run writes:

```text
runtime/aaps-runs/<run-id>/
  run.json
  resolved_workflow.json
  execution_plan.json
  block_readiness.json
  tool_resolution.json
  agent_compile_plan.json
  report.md
  events.jsonl
  block_logs/
  artifacts/
  reports/
  errors/
  repair_prompts/
  setup_prompts/
```

The pipeline `database` path also receives one JSONL summary per run.

## Commands

```bash
node scripts/aaps.js parse examples/executable_runtime.aaps --project . --json
node scripts/aaps.js plan examples/executable_runtime.aaps --project . --json
node scripts/aaps.js check examples/executable_runtime.aaps --project . --json
node scripts/aaps.js check-block workflows/executable_folder_segmentation.aaps --project examples/projects/organoid-analysis --block segment_image --json
node scripts/aaps.js run examples/executable_runtime.aaps --project . --json
node scripts/aaps.js run-block workflows/executable_organoid_demo.aaps --project examples/projects/organoid-analysis --block qc_image --json
node scripts/aaps.js validate --project examples/projects/organoid-analysis --json
node scripts/aaps-runner.js plan --source examples/executable_runtime.aaps --project . --json
node scripts/aaps-runner.js run --source examples/executable_runtime.aaps --project . --json
npm run aaps:run -- --file examples/executable_runtime.aaps
```

Executable demos:

```bash
node scripts/aaps.js run workflows/executable_organoid_demo.aaps --project examples/projects/organoid-analysis --json
node scripts/aaps.js run workflows/executable_folder_segmentation.aaps --project examples/projects/organoid-analysis --json
node scripts/aaps.js run workflows/executable_static_check.aaps --project examples/projects/app-development --json
```

The folder segmentation demo is the end-to-end smoke test. It generates demo PGM images if the folder is empty, evaluates `list_files(data/demo_images, pattern="*.pgm")`, runs QC, threshold segmentation, mask quantification, and batch summary once per image, then validates per-image masks and combined CSV/JSON/Markdown artifacts.

## Studio

The Studio Project tab can start a dry run or real run for the active `.aaps` file. Local Studio uses:

```text
POST /api/aaps/run
GET  /api/aaps/run?id=<run-id>
```

## Current Limits

- Prompt-only and model/API-only steps are recorded or converted into agent prompt files unless they also declare supported executable actions.
- Conditional expressions currently support simple truthy values and `exists <path>` checks; richer expression evaluation is still future work.
- Repair currently creates structured prompts and safe local fallbacks; automatic Codex patch application is intentionally not silent.
