# AAPS Runtime

AAPS now includes a minimal real runtime:

```text
.aaps -> project-aware parser -> unresolved IR -> agent-based manifest engine -> resolved IR -> execution plan -> readiness/tool/agent checks -> actions -> logs/artifacts -> validation -> recovery/repair -> report
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

## Agent-Based Manifest Before Execution

Use `aaps manifest` before a run when the workflow may reference missing blocks, scripts, tools, agents, binaries, or dependencies. `aaps compile` remains a compatibility alias:

```bash
node scripts/aaps.js manifest workflows/executable_folder_segmentation.aaps --project examples/projects/organoid-analysis --mode check --json
node scripts/aaps.js manifest workflows/main.aaps --project . --mode suggest --json
node scripts/aaps.js manifest workflows/main.aaps --project . --mode apply --json
node scripts/aaps.js compile workflows/main.aaps --project . --mode check --json  # legacy alias
```

Manifest modes:

- `check`: detect unresolved components and write manifest artifacts.
- `suggest`: produce setup and agent prompts without editing project files.
- `apply`: create safe local block/script/requirements files and record provenance.
- `interactive`: prepare approval-oriented prompts.
- `force`: overwrite generated targets with backups.

Every manifest writes `runs/<timestamp>_compile/` with `parsed_ir.json`, `unresolved_ir.json`, `resolved_ir.json`, `execution_plan.json`, `block_readiness.json`, `compile_report.json`, `missing_components.json`, generated/modified file records, setup prompts, agent prompts, diffs, and logs. The directory/report names retain `compile` for compatibility.

Real execution performs a manifest/readiness check first and blocks side effects when required components are unresolved.

## Readiness, Tools, Agents, And Manifest Prompts

`aaps check` and every run build a block readiness report before execution. Each block is classified as `ready`, `ready_with_warning`, `missing_input`, `missing_script`, `missing_python_package`, `missing_system_command`, `missing_tool`, `missing_agent`, `invalid_output_path`, or `waiting_for_human_review`.

Readiness checks include required inputs, generated runtime artifacts, loop-deferred variables, script files, Python interpreters, Python packages, system commands, tool registry entries, agent registry entries, and writable output directories. Missing scripts, tools, packages, commands, agents, or inputs are converted into an agent manifest plan (`agent_compile_plan.json` for compatibility) when a block declares `compile_agent` or uses an agent. The generated prompt is intentionally conservative: it asks for project-local code/setup, avoids global installs, and asks before risky changes.

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
- writes repair request Markdown and JSON packets when `repair true` and the step still fails
- writes setup/manifest prompts for missing scripts, tools, agents, commands, or packages
- records all events in `events.jsonl`

Repair packets are dormant-agent contracts. They include the failed block path,
actions, validations, stdout/stderr log paths, rerun commands, recovery rules,
and a report-block hint when a TeX/PDF/report generator appears to be the
failing surface. AAPS does not silently patch code from these packets; Codex,
AgInTiFlow, or another backend can consume them and then rerun the same parser,
manifest/check, and focused `run-block` commands.

## Runtime Watchdog

Every non-dry run starts a lightweight watchdog process unless
`AAPS_DISABLE_RUNTIME_WATCHDOG=1` is set. The watchdog writes:

- `runtime_watchdog.json`: monitor configuration and status path
- `watchdog/status.json`: latest heartbeat with active step/action
- `watchdog/alerts.jsonl`: stale-heartbeat alerts
- `repair_prompts/watchdog-stall-*.md`: dormant repair prompt for stalled runs

The watchdog is conservative. It does not kill processes or edit files by
itself. It creates evidence for a repair agent to inspect block logs, events,
artifacts, and process state, then make the smallest safe project-local fix.

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
  artifact_freshness.json
  human_review_queue.json
  pause_state.json
  report.md
  events.jsonl
  runtime_watchdog.json
  block_logs/
  artifacts/
  reports/
  errors/
  repair_prompts/
  setup_prompts/
  watchdog/
```

The pipeline `database` path also receives one JSONL summary per run.

## Commands

```bash
aaps prompt "Create an executable workflow that writes a durable report." --project .
aaps "Create an executable workflow that writes a durable report." --project .
aaps prompt "Prepare the backend prompt only." --backend print --project .
node scripts/aaps.js parse examples/executable_runtime.aaps --project . --json
node scripts/aaps.js manifest workflows/executable_folder_segmentation.aaps --project examples/projects/organoid-analysis --mode check --json
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

Direct prompt mode writes a durable backend-agent handoff under `.aaps-work/prompts/`. With the default `aginti` backend, AAPS invokes AgInTiFlow as the implementation agent. With `--backend print` or `--print-prompt`, AAPS only prepares and prints the prompt. With `--backend codex --image <file>`, AAPS passes the image to Codex image-view mode and requires visual conclusions to be recorded in image-aware handoff packets before downstream agent/image-generation blocks run. This is the current bridge for prompt-level tasks; deterministic `.aaps` actions still run through the local runtime adapters above.

The generated handoff is sandbox-aware. It tells the backend to prefer `aaps` when available, use `npx -y @lazyingart/aaps@<version>` as the Docker-safe fallback when package installs/network are approved, and use the source checkout `node scripts/aaps.js` path only when that host path is actually mounted into the active sandbox.

Executable demos:

```bash
node scripts/aaps.js run workflows/executable_organoid_demo.aaps --project examples/projects/organoid-analysis --json
node scripts/aaps.js run workflows/executable_folder_segmentation.aaps --project examples/projects/organoid-analysis --json
node scripts/aaps.js run workflows/executable_static_check.aaps --project examples/projects/app-development --json
```

The folder segmentation demo is the end-to-end smoke test. It generates demo PGM images if the folder is empty, evaluates `list_files(data/demo_images, pattern="*.pgm")`, runs QC, threshold segmentation, mask quantification, and batch summary once per image, then validates per-image masks and combined CSV/JSON/Markdown artifacts.

## Resume And Rerun Modes

AAPS runtime resume is separate from chat/session resume. Chat sessions preserve
messages, cwd, backend settings, and active files. Runtime resume controls
workflow execution and artifact overwrite behavior.

Default execution is a full rerun:

```bash
aaps run workflows/main.aaps --project . --run-id main-full
```

To resume an existing run directory and skip steps that previously succeeded or
recovered:

```bash
aaps run workflows/main.aaps --project . \
  --resume-run main-full \
  --skip-completed
```

`--resume-mode no-override` uses the same checked skip policy but makes the
intent explicit: preserve completed outputs when they are still fresh, and rerun
only missing or stale work.

```bash
aaps run workflows/main.aaps --project . \
  --resume-run main-full \
  --resume-mode no-override
```

The resumed run writes `resume_state.json` and archives the previous `run.json`
under `resume/` before replacing the active summary. It also writes
`artifact_freshness.json`, which records every resume decision as `skip` or
`rerun`.

Skipped steps are recorded as `skipped_completed`, keyed by step path, loop
index, and loop item. A step is skipped only when its declared outputs,
artifacts, and validation targets still exist and are not older than the current
workflow source, project manifest/registries, script entries, required files, or
path-like inputs. If a script, source file, input file/folder, project manifest,
tool registry, agent registry, or environment registry changes, the runtime
records a dependency-aware invalidation and reruns the affected step. This lets
large workflows split image grids once, skip finished Cellpose or threshold
steps, and rerun only later agent QC, AgInTi refinement, verifier, or report
blocks without trusting stale evidence.

Focused rerun levels:

```bash
# Full workflow rerun with a new run id.
aaps run workflows/main.aaps --project . --run-id fresh-run

# Rerun one block and its ancestors through the existing run-block filter.
aaps run-block workflows/main.aaps --project . --block build_publication_report

# Resume from the first matching step id/path and skip earlier plan steps.
aaps run workflows/main.aaps --project . --resume-run main-full --from-step codex_refinement_verifier

# Resume into a new run directory while reusing completed evidence from another run.
aaps run workflows/main.aaps --project . --resume-run main-full --run-id report-only-rerun --skip-completed
```

Pause and continue:

```bash
# Stop cleanly before or after a named step.
aaps run workflows/main.aaps --project . --run-id paused-run --pause-before segment_image
aaps run workflows/main.aaps --project . --run-id paused-run --pause-after segment_image

# Continue a paused run in the same run directory.
aaps run workflows/main.aaps --project . --continue-run paused-run --resume-mode skip-completed
```

When paused, the runtime writes `pause_state.json`, returns status `paused`, and
stops walking later root steps, child steps, and loop items. `pause_state.json`
contains the paused step, reason, timestamp, and a suggested continue command.

Human review:

```bash
aaps run workflows/main.aaps --project . --run-id review-run --pause-on-human-review
aaps run workflows/main.aaps --project . --continue-run review-run --approve-human-review
```

`exec manual` creates a pending item in `human_review_queue.json`. Without
`--approve-human-review`, a previous `manual_review` result is not treated as
complete during resume. With explicit approval, the checkpoint can be skipped and
the run continues downstream.

Studio exposes the same controls in the Runtime panel: resume run id, resume
mode, from-step, pause before/after, pause on human review, approve queued
review, and Continue Run. The simple Studio includes a compact Run / Resume
panel with the same backend contract.

## Studio

The Studio Project tab can start a dry run or real run for the active `.aaps` file. Local Studio uses:

```text
POST /api/aaps/run
GET  /api/aaps/run?id=<run-id>
POST /api/aaps/compile
GET  /api/aaps/compile?id=<compile-id>
```

## Current Limits

- Prompt-only and model/API-only steps are recorded or converted into agent prompt files unless they also declare supported executable actions.
- Conditional expressions currently support simple truthy values and `exists <path>` checks; richer expression evaluation is still future work.
- Repair currently creates structured prompts, watchdog alerts, and safe local fallbacks; automatic Codex patch application is intentionally not silent.
