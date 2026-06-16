# AAPS Agent-Based Manifest Engine (Compiler)

The manifest engine (legacy compiler module) is the bridge between deterministic parsing and execution. Parsing reads `.aaps` and reports unresolved facts. Manifestation decides what is missing, what can be generated safely, what needs setup, and what should be handed to Codex or another agent. The CLI keeps `compile` as a compatibility alias, but user-facing docs and Studio prefer `manifest`.

## Phases

```text
.aaps script
-> parse phase: deterministic IR, diagnostics, imports, unresolved references
-> manifest phase (compile compatibility layer): missing component report, generated assets, prompts, resolved IR
-> plan phase: execution order, loops, conditions, actions, validations
-> execute phase: readiness, block execution, artifacts, recovery, report
```

The parse phase never silently invents code. The manifest phase may generate safe project-local files only when the mode allows it.

## Manifest Modes

- `check`: report missing blocks, scripts, tools, agents, commands, packages, and inputs. No project files are changed.
- `suggest`: write manifest artifacts and prompts, but do not modify the project.
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
aaps manifest workflows/main.aaps --project . --mode check --json
aaps manifest workflows/main.aaps --project . --mode suggest --json
aaps manifest workflows/main.aaps --project . --mode apply --json
aaps manifest-project --project . --mode check
aaps compile workflows/main.aaps --project . --mode check --json  # legacy alias
aaps compile-project --project . --mode check                    # legacy alias
aaps missing workflows/main.aaps --project . --json
aaps generate-block segment_image --project . --mode apply
aaps generate-script scripts/threshold_segment.py --project . --mode apply
aaps prepare-setup workflows/main.aaps --project . --json
```

The Studio Project tab calls the same manifest engine through `/api/aaps/compile`; the API path keeps the original `compile` name for compatibility.
