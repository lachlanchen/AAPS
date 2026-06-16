# AAPS Agent-Based Manifest Compiler

The manifest compiler is the bridge between deterministic parsing and execution. Parsing reads `.aaps` and reports unresolved facts. Manifestation decides what is missing, what can be generated safely, what needs setup, and what should be handed to Codex or another agent. The CLI keeps `compile` as a compatibility alias, but user-facing docs and Studio prefer `manifest`.

## Phases

```text
.aaps script
-> parse phase: deterministic IR, diagnostics, imports, unresolved references
-> manifest/compile phase: missing component report, generated assets, prompts, resolved IR
-> plan phase: execution order, loops, conditions, actions, validations
-> execute phase: readiness, block execution, artifacts, recovery, report
```

The parse phase never silently invents code. The manifest/compile phase may generate safe project-local files only when the mode allows it.

## Manifest Modes

- `check`: report missing blocks, scripts, tools, agents, commands, packages, and inputs. No project files are changed.
- `suggest`: write compile artifacts and prompts, but do not modify the project.
- `apply`: create safe missing project-local assets such as `.aaps` blocks, Python scripts, and requirements entries. Existing scripts are not overwritten.
- `interactive`: currently behaves like suggest mode and marks risky work for approval.
- `force`: overwrite generated targets with backups. Use deliberately.

## Artifacts

Each manifest creates `runs/<timestamp>_compile/` with:

- `parsed_ir.json`, `unresolved_ir.json`, `resolved_ir.json`
- `execution_plan.json`, `block_readiness.json`
- `compile_report.json`, `missing_components.json`
- `generated_files.json`, `modified_files.json`
- `agent_prompts/`, `setup_prompts/`, `diffs/`, `logs/`

Generated file records include timestamp, reason, target path, hash before/after, backup path when used, and validation results.

## CLI

```bash
aaps compile workflows/main.aaps --project . --mode check --json
aaps manifest workflows/main.aaps --project . --mode check --json
aaps compile workflows/main.aaps --project . --mode suggest --json
aaps manifest workflows/main.aaps --project . --mode apply --json
aaps compile workflows/main.aaps --project . --mode apply --json
aaps compile-project --project . --mode check
aaps manifest-project --project . --mode check
aaps missing workflows/main.aaps --project . --json
aaps generate-block segment_image --project . --mode apply
aaps generate-script scripts/threshold_segment.py --project . --mode apply
aaps prepare-setup workflows/main.aaps --project . --json
```

The Studio Project tab calls the same compiler through `/api/aaps/compile`.
