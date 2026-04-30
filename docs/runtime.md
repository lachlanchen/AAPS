# AAPS Runtime

AAPS now includes a minimal real runtime:

```text
.aaps -> parser -> IR -> execution plan -> actions -> logs/artifacts -> validation -> recovery/repair -> report
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
- `python`: executed as `python3 entry --arg value`.
- other `exec` types are recorded as skipped until adapters are added.

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
- records all events in `events.jsonl`

## Run Outputs

Each run writes:

```text
runtime/aaps-runs/<run-id>/
  run.json
  report.md
  events.jsonl
  *.stdout.log
  *.stderr.log
```

The pipeline `database` path also receives one JSONL summary per run.

## Commands

```bash
node scripts/aaps-runner.js plan --source examples/executable_runtime.aaps --project . --json
node scripts/aaps-runner.js run --source examples/executable_runtime.aaps --project . --json
npm run aaps:run -- --file examples/executable_runtime.aaps
```

## Studio

The Studio Project tab can start a dry run or real run for the active `.aaps` file. Local Studio uses:

```text
POST /api/aaps/run
GET  /api/aaps/run?id=<run-id>
```

## Current Limits

- Prompt-only and model/API-only steps are recorded but not executed unless they also declare `run` or supported `exec` actions.
- Conditional expressions are preserved in the plan, but advanced data-dependent branch evaluation is still future runtime work.
- `include` files are visible in the project and plan, but the runtime does not yet merge modules into one resolved dependency graph.
