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

AAPS turns prompts into explicit, resumable, verifiable agent workflows. It abstracts the practical loop used across AutoAppDev, AutoNovelWriter, LazyBlog, OrganoidAgent, Zhengyu/App80/App81 biology analysis, and future AgInTiFlow-backed agents: inspect, route, act, verify, summarize, and publish.

The public product site is `https://aaps.lazying.art`. The broader agent portal is `https://agent.lazying.art`.

## What This Repo Contains

- `src/aaps.js`: `aaps_ir/0.2` parser, serializer, sample scripts, and Markdown runbook compiler.
- `studio/`: AAPS Studio, a two-tab Scratch-like PWA with Block Lab chat, reusable skills, block inspector, source editing, tree visualization, and IR preview.
- `backend/`: local Codex wrapper server for `/api/aaps/edit` and `/api/codex/*`.
- `website/`: bright landing page deployed by GitHub Pages.
- `docs/`: language spec, Codex wrapper guide, and roadmap.
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

## Design Philosophy

AAPS keeps a clean boundary between intent and execution:

- Prompts can inspect, decide, and synthesize.
- Blocks must declare typed inputs, outputs, commands, checks, and artifacts.
- Method selection belongs in `choose`, `if`, `else`, `method`, and `guard` blocks.
- Chat follows the LazyBlog pattern: it can reply and route, but source mutation happens through bounded edit actions that reparse and redraw the program.

For biology, this means segmentation is modeled as inspect image -> build priors -> choose Cellpose/threshold/vision-mask -> QC gate -> quantify. See [docs/design-philosophy.md](docs/design-philosophy.md).

## Quick Start

```bash
npm test
npm run studio
```

Open `http://127.0.0.1:8796`.

For wrapper smoke tests without model calls:

```bash
AAPS_MOCK_CODEX=1 npm run studio
```

## Codex Wrapper

AAPS currently uses Codex as the primary local agent executor. The wrapper exposes:

```text
GET  /api/health
POST /api/aaps/chat
POST /api/aaps/edit
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

## Development Commands

```bash
npm test
python3 -m py_compile backend/aaps_codex_server.py
npm run build:website
```

## Support

Funding links are configured in [.github/FUNDING.yml](.github/FUNDING.yml).
