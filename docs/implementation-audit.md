# AAPS Implementation Audit

This audit maps the requested AAPS Studio/workflow scope to the current implementation.

## Implemented

- Three Studio tabs:
  - Block Lab for chat/building skills and reusable blocks.
  - Program for source editing, tree visualization, IR preview, and block inspection.
- Project tab for manifest editing, project file lists, project validation, active workflow loading, and local active-file saving.
- Shared parser in `src/aaps.js`; the Studio uses the same parser directly in the browser.
- `aaps_ir/0.2` grammar support for:
  - workflow metadata: version, author, created, updated, domain, tags, artifact directory, database, log path, required tools, required models, required agents, and environment values
  - typed inputs and outputs, with required/optional status and validation text
  - agents, skills, tasks, stages, actions, methods, guards, handoffs, choose blocks
  - `if`, `else`, and `for_each`
  - project-root relative `include` dependencies
  - `param`, `metric`, `policy`, `artifact`, `exec`, `arg`, `validate`, `verify`, `recover`, `repair`, `fallback`, `review`, `requires_*`, `environment`, `tool`, `compile_agent`, `compile_prompt`, and `test`
- AAPS Project support:
  - `aaps.project.json` manifest format
  - shared manifest normalization and validation helpers
  - file categories for blocks, skills, modules, subworkflows, workflows, drafts, archives, and references
  - project paths for scripts, environments, tools, agents, data, artifacts, runs, reports, and notes
  - local `/api/aaps/project` and `/api/aaps/project/file` APIs
  - example multi-file projects under `examples/projects/`
  - environment, tool, and agent registries in the organoid example project
- Minimal executable runtime:
  - `aaps_plan/0.1` execution plan generation
  - `run` and `exec shell` / `exec python_script` / `exec python_inline` / `exec node_script` / `exec npm_script` / `exec agent` action handling
  - `arg`, `retry`, `repair true`, and `fallback` runtime declarations
  - stdout/stderr logs, `events.jsonl`, `run.json`, execution plan, readiness report, tool resolution report, compile prompts, and Markdown run reports
  - executable `validate exists`, `validate nonempty`, `validate json`, and `validate mask_not_empty` checks
  - fallback command and fallback block recovery
  - block readiness/preflight for inputs, scripts, commands, Python packages, tools, agents, generated runtime artifacts, loop-deferred values, and output directories
  - loop execution over `list_files(...)`
  - local `/api/aaps/run` start/poll API
  - Studio Project tab dry-run/run controls and runtime status panel
  - executable folder segmentation demo that generates images, loops through images, runs QC/segmentation/quantification, and creates batch reports
- Reference source scripts copied under `references/pipeline-scripts/sources/`.
- General converted `.aaps` scripts under `references/pipeline-scripts/converted/`.
- Required named examples:
  - `examples/organoid_segmentation.aaps`
  - `examples/app_development_review.aaps`
  - `examples/book_writing_pipeline.aaps`
  - `examples/general_agentic_workflow.aaps`
- LazyBlog-inspired backend route separation:
  - `/api/aaps/chat` for chat routing
  - `/api/aaps/edit` for bounded source edits
  - `/api/codex/*` for generic Codex jobs
- Tests for:
  - basic workflow
  - blocks/skills
  - if/else
  - for_each
  - tool routing
  - validation/recovery/review
  - project manifests and multi-file example projects
  - executable runtime success, fallback recovery, block readiness, compile prompt generation, and folder segmentation loop execution
  - invalid syntax/missing pipeline
  - every example `.aaps`
  - every converted reference `.aaps`

## Partially Implemented

- Visualization is a structured nested tree with runtime/readiness metadata, not a graph canvas with edges.
- Parser diagnostics currently include line numbers, not columns.
- Chat local fallback supports common edit commands; full natural-language editing depends on the Codex wrapper.
- Prompt-only/model-only steps are recorded or converted into prompt files by the runtime, but they are not API-executed unless they declare supported executable actions or a future adapter.
- Human review checkpoints are represented and logged, but there is not yet a dedicated review queue UI.
- `include` dependencies are parsed and validated as relative paths, but they are not yet resolved into a merged executable module graph.
- Conditional expressions support simple truthy values and `exists <path>` checks; advanced data-dependent expression evaluation is still future runtime work.
- Source references are selective and strongest for AutoAppDev, LazyBlog, OrganoidQuant, and OrganoidCompactnessAnalysis. Broader repos were inspected for relevant files, but not every listed project produced a copied source reference.

## Not Yet Implemented

- Full block execution engine for external model/API/internal tools.
- Run state machine with pause/resume and human approval checkpoints.
- Rich artifact database writer beyond JSONL summaries.
- Broader domain-specific validation runners for plots, screenshots, manuscript outputs, and advanced image metrics beyond the current PGM mask checks.
- Human review UI queue.
- Import/conversion CLI for arbitrary old pipeline scripts.
- Graph layout with explicit dependency edges.

## Next Implementation Step

Build the fuller runtime:

```text
.aaps -> parse -> resolve imports/includes -> preflight blocks -> evaluate branches/loops -> run executable/model blocks -> write artifacts/logs -> validate -> recover/review -> report
```

The next useful version should add richer branch expressions, review pause/resume, and model/tool adapters beyond local shell/Python/Node plus prompt-preparation agents.
