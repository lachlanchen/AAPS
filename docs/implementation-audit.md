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
  - `param`, `metric`, `policy`, `artifact`, `validate`, `verify`, `recover`, and `review`
- AAPS Project support:
  - `aaps.project.json` manifest format
  - shared manifest normalization and validation helpers
  - file categories for blocks, skills, modules, subworkflows, workflows, drafts, archives, and references
  - local `/api/aaps/project` and `/api/aaps/project/file` APIs
  - example multi-file project under `examples/projects/organoid-analysis`
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
  - invalid syntax/missing pipeline
  - every example `.aaps`
  - every converted reference `.aaps`

## Partially Implemented

- Visualization is a structured nested tree, not a graph canvas with edges.
- Parser diagnostics currently include line numbers, not columns.
- Chat local fallback supports common edit commands; full natural-language editing depends on the Codex wrapper.
- Human review, recovery, artifact tracking, database paths, and execution logs are represented in grammar/IR but are not yet executed by a runtime.
- `include` dependencies are parsed and validated as relative paths, but they are not yet resolved into a merged executable module graph.
- Source references are selective and strongest for AutoAppDev, LazyBlog, OrganoidQuant, and OrganoidCompactnessAnalysis. Broader repos were inspected for relevant files, but not every listed project produced a copied source reference.

## Not Yet Implemented

- Real block execution engine.
- Run state machine with pause/resume/repair.
- Artifact database writer.
- Validation runner that checks files, masks, plots, screenshots, or manuscript outputs.
- Human review UI queue.
- Import/conversion CLI for arbitrary old pipeline scripts.
- Graph layout with explicit dependency edges.

## Next Implementation Step

Build the minimal runtime:

```text
.aaps -> parse -> execution plan -> run executable blocks -> write artifacts/logs -> validate -> recover/review -> report
```

The smallest useful version should execute `run` commands, record per-block status in `runtime/runs/*.jsonl`, check declared artifacts, and stop or recover according to `validate`, `recover`, and `review` statements.
