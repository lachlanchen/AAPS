# AAPS Implementation Audit

This audit maps the requested AAPS Studio/workflow scope to the current implementation.

## Implemented

- Three Studio tabs:
  - Block Lab for chat/building skills and reusable blocks.
  - Program for source editing, tree visualization, IR preview, and block inspection.
- Project tab for manifest editing, project file lists, project validation, active workflow loading, and local active-file saving.
- Shared parser in `src/aaps.js`; the Studio uses the same parser directly in the browser.
- `aaps_ir/0.2` grammar support for:
  - workflow metadata: version, author, created, updated, domain, tags, artifact directory, database, log path, required tools, required models
  - typed inputs and outputs, with required/optional status and validation text
  - agents, skills, tasks, stages, actions, methods, guards, handoffs, choose blocks
  - `if`, `else`, and `for_each`
  - project-root relative `include` dependencies
  - `param`, `metric`, `policy`, `artifact`, `exec`, `arg`, `validate`, `verify`, `recover`, `repair`, `fallback`, and `review`
- AAPS Project support:
  - `aaps.project.json` manifest format
  - shared manifest normalization and validation helpers
  - file categories for blocks, skills, modules, subworkflows, workflows, drafts, archives, and references
  - local `/api/aaps/project` and `/api/aaps/project/file` APIs
  - example multi-file project under `examples/projects/organoid-analysis`
- Minimal executable runtime:
  - `aaps_plan/0.1` execution plan generation
  - `run` and `exec shell` / `exec python` action execution
  - `arg`, `retry`, `repair true`, and `fallback` runtime declarations
  - stdout/stderr logs, `events.jsonl`, `run.json`, and Markdown run reports
  - executable `validate exists`, `validate nonempty`, and `validate json` checks
  - fallback command and fallback block recovery
  - local `/api/aaps/run` start/poll API
  - Studio Project tab dry-run/run controls and runtime status panel
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
  - executable runtime success and fallback recovery
  - invalid syntax/missing pipeline
  - every example `.aaps`
  - every converted reference `.aaps`

## Partially Implemented

- Visualization is a structured nested tree, not a graph canvas with edges.
- Parser diagnostics currently include line numbers, not columns.
- Chat local fallback supports common edit commands; full natural-language editing depends on the Codex wrapper.
- Prompt-only/model-only steps are recorded by the runtime but not executed unless they declare supported executable actions.
- Human review checkpoints are represented and logged, but there is not yet a dedicated review queue UI.
- `include` dependencies are parsed and validated as relative paths, but they are not yet resolved into a merged executable module graph.
- Conditional expressions are preserved in execution plans, but advanced data-dependent branch evaluation is still future runtime work.
- Source references are selective and strongest for AutoAppDev, LazyBlog, OrganoidQuant, and OrganoidCompactnessAnalysis. Broader repos were inspected for relevant files, but not every listed project produced a copied source reference.

## Not Yet Implemented

- Full block execution engine for model/API/internal tools.
- Run state machine with pause/resume and human approval checkpoints.
- Rich artifact database writer beyond JSONL summaries.
- Domain-specific validation runner for masks, plots, screenshots, or manuscript outputs.
- Human review UI queue.
- Import/conversion CLI for arbitrary old pipeline scripts.
- Graph layout with explicit dependency edges.

## Next Implementation Step

Build the fuller runtime:

```text
.aaps -> parse -> resolve includes -> evaluate branches/loops -> run executable/model blocks -> write artifacts/logs -> validate -> recover/review -> report
```

The next useful version should resolve multi-file includes into a module graph, evaluate branch conditions from runtime state, add review pause/resume, and attach model/tool adapters beyond shell and Python.
