[English](README.md) · [العربية](i18n/README.ar.md) · [Español](i18n/README.es.md) · [Français](i18n/README.fr.md) · [日本語](i18n/README.ja.md) · [한국어](i18n/README.ko.md) · [Tiếng Việt](i18n/README.vi.md) · [中文 (简体)](i18n/README.zh-Hans.md) · [中文（繁體）](i18n/README.zh-Hant.md) · [Deutsch](i18n/README.de.md) · [Русский](i18n/README.ru.md)

<p align="center">
  <img src="https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png" alt="LazyingArt banner" width="960" />
</p>

<div align="center">
  <h1>AAPS</h1>
  <p><strong>Prompt Is All You Need</strong></p>
  <p>Autonomous Agentic Pipeline Script: a prompt-native programming language and Studio for autonomous task pipelines.</p>
  <p>
    <img alt="Language" src="https://img.shields.io/badge/language-AAPS-ff4f8b" />
    <img alt="Studio" src="https://img.shields.io/badge/studio-static%20PWA-00bcd4" />
    <img alt="Wrapper" src="https://img.shields.io/badge/wrapper-Codex-7c3aed" />
    <img alt="Website" src="https://img.shields.io/badge/site-aaps.lazying.art-28c76f" />
  </p>
</div>

## Overview

AAPS turns prompts into explicit, resumable, verifiable agent workflows. It abstracts the practical loop used across public project patterns such as AutoAppDev, AutoNovelWriter, LazyBlog, OrganoidQuant, OrganoidCompactnessAnalysis, OrganoidAgent, and future AgInTiFlow-backed agents: inspect, route, act, verify, summarize, and publish.

The public product site is `https://aaps.lazying.art`. The broader agent portal is `https://agent.lazying.art`.

## What This Repo Contains

- `aaps.project.json`: project manifest for this repository.
- `src/aaps.js`: `aaps_ir/0.2` and `aaps_project/0.1` helpers for deterministic parsing, import diagnostics, execution-plan building, and project validation.
- `scripts/aaps-compiler.js`: agent-aware compile layer that turns unresolved IR into a resolved workflow report, generated local assets, setup prompts, and Codex prompts.
- `studio/`: AAPS Studio, a three-tab PWA with Block Lab chat, project management, block inspector, block-level code chat, source editing, tree visualization, runtime controls, and IR preview.
- `backend/`: local Codex wrapper and project filesystem server for `/api/aaps/project`, `/api/aaps/block/chat`, `/api/aaps/run`, `/api/aaps/edit`, and `/api/codex/*`.
- `website/`: bright landing page deployed by GitHub Pages.
- `docs/`: language spec, project management guide, Codex wrapper guide, and roadmap.
- `references/pipeline-scripts/`: copied source pipeline materials plus converted general `.aaps` scripts.
- `vendor/AgInTiFlow`: submodule for the future browser/tool-use backend candidate.

## AAPS Language

```aaps
pipeline "Ship AAPS Studio" {
  subtitle "Prompt Is All You Need"
  domain "software"
  goal "Build, verify, and publish a web studio."
  input repo: path = "./"

  agent builder {
    role "Senior engineer for autonomous product work."
    model "gpt-5"
    tools "shell, git, browser"
  }

  skill bounded_change {
    input task: text
    output diff: patch
    stage plan {
      prompt "Plan a small verified change."
    }
    stage implement {
      prompt "Make the focused change."
    }
    stage verify {
      run "npm test"
      verify "All tests pass."
    }
  }

  task implement {
    uses builder
    call bounded_change
  }
}
```

See [docs/language-spec.md](docs/language-spec.md) and [examples/hello.aaps](examples/hello.aaps).
Current implementation coverage and known gaps are tracked in [docs/implementation-audit.md](docs/implementation-audit.md).

## AAPS Projects

AAPS projects use `aaps.project.json` to manage many `.aaps` files:

```text
my-aaps-project/
  aaps.project.json
  blocks/
  skills/
  modules/
  subworkflows/
  workflows/
  scripts/
  environments/
  tools/
  agents/
  drafts/
  archive/
  data/
  artifacts/
  runs/
  reports/
  notes/
```

The manifest records project metadata, default and active `.aaps` files, data folders, artifact root, run database, variables, tools, models, agents, environment settings, notes, and file categories. Treat a project as one topic workspace, such as a lecture-notes project, a novel, a research analysis, or an app. Each project can own several workflows and run one active workflow from Studio, CLI, or a tmux session while sharing the same tools, agents, scripts, and artifacts.

Workflows can declare dependencies with project-root relative imports/includes:

```aaps
import block "blocks/qc_image.aaps" as qc_image
include "skills/microscopy_qc.aaps"
```

The project-aware parser resolves these files, records source files, builds an import graph, and reports missing or circular imports. See [docs/project-management.md](docs/project-management.md), [examples/projects/organoid-analysis](examples/projects/organoid-analysis), [examples/projects/app-development](examples/projects/app-development), and [examples/projects/book-writing](examples/projects/book-writing).

## Design Philosophy

AAPS keeps a clean boundary between intent and execution:

- Prompts can inspect, decide, and synthesize.
- Blocks must declare typed inputs, outputs, commands, checks, and artifacts.
- Functional block contracts can also declare environment requirements, tool/agent dependencies, executable actions, tests, validation, recovery, and compile-agent repair prompts.
- Method selection belongs in `choose`, `if`, `else`, `method`, and `guard` blocks.
- Failure handling belongs in `validate`, `recover`, and `review` statements.
- Chat follows the LazyBlog pattern: it can reply and route, but source mutation happens through bounded edit actions that reparse and redraw the program.

For biology, this means segmentation is modeled as inspect image -> build priors -> choose Cellpose/threshold/vision-mask -> QC gate -> quantify. See [docs/design-philosophy.md](docs/design-philosophy.md).

## Examples

- [examples/organoid_segmentation.aaps](examples/organoid_segmentation.aaps): microscopy QC, method routing, segmentation, quantification, overlays, report, and human review.
- [examples/app_development_review.aaps](examples/app_development_review.aaps): app page scanning, screenshots, bug detection, patching, and reruns.
- [examples/book_writing_pipeline.aaps](examples/book_writing_pipeline.aaps): outline, chapter drafting, consistency/style checks, revision, and export.
- [examples/general_agentic_workflow.aaps](examples/general_agentic_workflow.aaps): domain-neutral loops, routing, validation, recovery, artifacts, and review.
- [examples/projects/organoid-analysis/workflows/executable_organoid_demo.aaps](examples/projects/organoid-analysis/workflows/executable_organoid_demo.aaps): local standard-library Python demo that generates an image, runs QC, thresholds a mask, quantifies objects, and writes a report.
- [examples/projects/organoid-analysis/workflows/executable_folder_segmentation.aaps](examples/projects/organoid-analysis/workflows/executable_folder_segmentation.aaps): local folder demo that generates demo images, loops over every PGM image, runs QC/segmentation/quantification, and writes a combined report.
- [examples/projects/app-development/workflows/executable_static_check.aaps](examples/projects/app-development/workflows/executable_static_check.aaps): local static app-project checker.

## Quick Start

```bash
npm test
npm run project:validate
npm run studio
```

Open `http://127.0.0.1:8796`.

npm install:

```bash
npm install -g @lazyingart/aaps
aaps studio --host 127.0.0.1 --port 8796
aaps parse examples/hello.aaps --project .
```

The package is published as `@lazyingart/aaps`. Future releases use GitHub Actions Trusted Publishing in `.github/workflows/npm-publish.yml`, with npm trust configured for GitHub owner `lachlanchen`, repository `AAPS`, workflow filename `npm-publish.yml`.

Studio tabs:

- **Bottom Chat Dock**: available on every tab. It routes messages through the Codex wrapper when available and keeps the transcript behind the History button.
- **Block Lab**: create blocks, select a block, edit typed ports/actions/validations, and use block chat to generate Python or shell actions.
- **Program**: edit full `.aaps`, view parser diagnostics, inspect the graph, and review the JSON IR.
- **Project**: load a project, edit `aaps.project.json`, browse `.aaps` and script files, create/duplicate/archive workflow files, dry-run or run workflows.
- **Project**: load a topic workspace, see workflows/blocks/scripts/tools/agents/env counts, view the active and main `.aaps`, run compile checks, apply safe generated files, copy a tmux command, and dry-run or run the current workflow.

For wrapper smoke tests without model calls:

```bash
AAPS_MOCK_CODEX=1 npm run studio
```

## Executable Runtime

AAPS separates parse, compile, plan, and execute:

```text
.aaps -> parser -> unresolved IR -> AAPSCompiler -> resolved IR -> execution plan -> readiness check -> runtime -> validation/recovery/report
```

The parser is deterministic and does not invent missing code. The compiler can run in `check`, `suggest`, `apply`, `interactive`, or `force` mode. It detects missing imports, blocks, scripts, tools, agents, binaries, Python packages, and inputs. In safe apply mode it can create missing local block files, Python scripts, requirements entries, compile artifacts, setup prompts, and Codex prompts without installing packages or deleting user files.

CLI examples:

```bash
node scripts/aaps.js compile workflows/main.aaps --project . --mode check --json
node scripts/aaps.js compile workflows/main.aaps --project . --mode suggest --json
node scripts/aaps.js compile workflows/main.aaps --project . --mode apply --json
node scripts/aaps.js missing workflows/main.aaps --project . --json
node scripts/aaps.js generate-block segment_image --project . --mode apply
node scripts/aaps.js generate-script scripts/threshold_segment.py --project . --mode apply
node scripts/aaps.js prepare-setup workflows/main.aaps --project . --json
```

Compile artifacts are written under `runs/<timestamp>_compile/` with `parsed_ir.json`, `unresolved_ir.json`, `resolved_ir.json`, `execution_plan.json`, `block_readiness.json`, `compile_report.json`, `missing_components.json`, generated/modified file records, setup prompts, agent prompts, diffs, and logs.

AAPS can execute deterministic actions today. Use `run` for shell commands or `exec` for typed actions:

```aaps
task qc_image {
  retry 1
  repair true
  exec shell "python3 scripts/qc_image.py --image data/raw/example.tif --out artifacts/qc.json"
  validate exists "artifacts/qc.json"
  validate json "artifacts/qc.json"
  fallback "run: python3 scripts/basic_qc.py --out artifacts/qc.json"
}
```

Supported adapters include `shell`, `python_script`, `python_inline`, `node_script`, `npm_script`, `manual`, and `noop`. Runtime variables include `${project.root}`, `${project.data}`, `${run.dir}`, `${run.artifacts}`, `${block.name}`, `${input.name}`, and `${output.name}`.

Run locally:

```bash
node scripts/aaps.js parse examples/executable_runtime.aaps --project . --json
node scripts/aaps.js compile workflows/executable_folder_segmentation.aaps --project examples/projects/organoid-analysis --mode check --json
node scripts/aaps.js plan examples/executable_runtime.aaps --project . --json
node scripts/aaps.js check workflows/executable_folder_segmentation.aaps --project examples/projects/organoid-analysis --json
node scripts/aaps.js run examples/executable_runtime.aaps --project . --json
node scripts/aaps.js run-block workflows/executable_organoid_demo.aaps --project examples/projects/organoid-analysis --block qc_image --json
node scripts/aaps.js run workflows/executable_folder_segmentation.aaps --project examples/projects/organoid-analysis --json
node scripts/aaps.js validate --project examples/projects/organoid-analysis --json
node scripts/aaps.js run workflows/executable_static_check.aaps --project examples/projects/app-development --json
```

Runs write `run.json`, `events.jsonl`, `execution_plan.json`, `block_readiness.json`, `tool_resolution.json`, `agent_compile_plan.json`, stdout/stderr logs, repair/setup prompts, artifacts, and `report.md` under the run directory. Readiness checks classify missing inputs, scripts, commands, Python packages, tools, agents, generated runtime artifacts, and loop-deferred values before execution. See [docs/runtime.md](docs/runtime.md).

## Codex Wrapper

AAPS currently uses Codex as the primary local agent executor. The wrapper exposes:

```text
GET  /api/health
POST /api/aaps/chat
POST /api/aaps/edit
GET  /api/aaps/project
POST /api/aaps/project
GET  /api/aaps/project/file
POST /api/aaps/project/file
GET  /api/aaps/project/text-file
POST /api/aaps/project/text-file
POST /api/aaps/project/file-action
POST /api/aaps/block/chat
POST /api/aaps/compile
GET  /api/aaps/compile?id=<compile-id>
POST /api/aaps/run
GET  /api/aaps/run?id=<run-id>
POST /api/codex/respond
POST /api/codex/jobs
GET  /api/codex/job?id=<job-id>
GET  /api/codex/result?id=<job-id>
```

AgInTiFlow is included as a submodule because it is the planned backend candidate for browser automation, tool use, and resumable agent sessions.

## Reference Pipelines

Converted general AAPS scripts live in [references/pipeline-scripts/converted](references/pipeline-scripts/converted):

- app development autopilot loop
- LazyBlog-style chat action router
- biology segmentation/QC/quantification
- App80 guarded DEO droplet analysis
- App81 curated Cellpose density analysis
- book/chapter writing loop

## Website Deployment

GitHub Pages deploys `website/` and copies `studio/` to `/studio/`. The custom domain is configured by `website/CNAME` as:

```text
aaps.lazying.art
```

## License

AAPS is released under the Apache License 2.0. This keeps the project open source while preserving attribution and providing a patent grant suitable for research, commercial use, and future company-backed development.

## Development Commands

```bash
npm test
python3 -m py_compile backend/aaps_codex_server.py
npm run project:validate
node scripts/aaps-runner.js run --source examples/executable_runtime.aaps --project . --json
node scripts/aaps.js validate --project examples/projects/book-writing --json
npm run build:website
```

## Support

Funding links are configured in [.github/FUNDING.yml](.github/FUNDING.yml).
