# Repository Guidelines

## Project Structure & Module Organization

AAPS is split into a language core, a local Studio app, and a landing website.

- `src/aaps.js` contains the JavaScript `aaps_ir/0.2` parser, serializer, sample scripts, and Markdown/runbook helpers.
- `scripts/aaps-compiler.js` contains the agent-based compile layer for missing blocks, scripts, tools, agents, setup prompts, and generated file provenance.
- `aaps.project.json` describes the current multi-file AAPS project.
- `tests/` contains Node smoke tests for the language core.
- `examples/` contains `.aaps` pipeline examples.
- `examples/projects/` contains complete multi-file AAPS project examples.
- `docs/` contains the language spec, wrapper notes, and roadmap.
- `studio/` contains the standalone AAPS Studio PWA.
- `backend/` contains the local Codex wrapper server used by Studio.
- `website/` contains the landing page deployed to `aaps.lazying.art`.
- `references/pipeline-scripts/` contains copied source workflow material and converted `.aaps` scripts.
- `vendor/AgInTiFlow` is a submodule for the future backend agent candidate.

## Build, Test, and Development Commands

- `npm test`: runs parser and serializer smoke tests.
- `npm run project:validate`: validates `aaps.project.json` and all project `.aaps` files.
- `npm run aaps:run -- --file examples/executable_runtime.aaps`: executes a workflow through the local runtime.
- `node scripts/aaps.js compile workflows/main.aaps --project . --mode check --json`: checks missing AAPS components without editing files.
- `npm run studio`: starts the local Studio plus Codex wrapper at `http://127.0.0.1:8796`.
- `npm run build:website`: copies `src/aaps.js` into Studio and stages Studio under `website/studio/` for static deployment.
- `python3 -m py_compile backend/aaps_codex_server.py`: checks the wrapper server syntax.
- `npm pack --dry-run`: verifies the npm package contents before publishing.

## Coding Style & Naming Conventions

Use two-space indentation for JavaScript, JSON, HTML, and CSS. Use four-space indentation for Python. Keep source files ASCII unless translating documentation. Name AAPS files with `.aaps`, for example `examples/hello.aaps`.

Prefer small, dependency-light code. The landing page and Studio are static assets; do not introduce a framework unless it removes real complexity.

## Testing Guidelines

Add tests under `tests/` when changing parser, compiler, runtime, or serialization behavior. Keep examples parseable and run `npm test` before committing. For wrapper changes, also run `python3 -m py_compile backend/aaps_codex_server.py`.

## Commit & Pull Request Guidelines

Use concise imperative commits such as `Add AAPS Studio` or `Fix parser diagnostics`. Pull requests should summarize language, Studio, wrapper, and deployment changes separately when they cross those boundaries. Include test commands and deployment notes for GitHub Pages changes.

## Release & npm Publishing

The public package is `@lazyingart/aaps`. After any minor or major functional edit to the CLI, parser, runtime, Studio, examples, package metadata, or public docs, keep the npm package valid and publish a new version.

- Choose the version deliberately: patch for fixes/docs/package metadata, minor for compatible features, major for breaking CLI/language/runtime changes.
- Update `package.json` before release; never republish an existing version.
- Run `npm test`, `npm run project:validate`, `node scripts/aaps.js compile workflows/executable_folder_segmentation.aaps --project examples/projects/organoid-analysis --mode check --json`, `python3 -m py_compile backend/aaps_codex_server.py`, and `npm pack --dry-run`.
- If `website/` or `studio/` changed, run `npm run build:website`, commit the main branch, then deploy `website/` to `gh-pages`.
- Push `main`, then publish through GitHub Actions Trusted Publishing using `.github/workflows/npm-publish.yml`. Verify `npm view @lazyingart/aaps version license dist-tags`.
- Record release-relevant npm notes in `references/npm-publication.md` without adding secrets.

## AgInTiFlow Agent Workflow

AAPS uses `AgInTiFlow` as the long-term backend agent candidate. Keep the persistent tmux Codex helper session named `aaps-agent-codexr` available as the main agent workflow for this repo when coordinating AgInTiFlow work.

- The tmux session should start as a shell, then launch Codex through `tmux send-keys` so `Ctrl+C` exits Codex without closing the pane.
- Preferred launch command: `codex -m gpt-5.5 -c model_reasoning_effort="high" -s danger-full-access -a never --cd /home/lachlan/ProjectsLFS/Agent resume 019da8c5-6cd9-7602-bc14-aafa6206fe5d`.
- The session working root is always `/home/lachlan/ProjectsLFS/Agent`.
- The primary implementation repo under that root is `/home/lachlan/ProjectsLFS/Agent/AgInTiFlow`.
- AgInTiFlow should become a web-first agent platform with an `aginti-cli` command.
- AgInTiFlow should learn from Codex, Claude Code, Gemini CLI, Copilot, LazyBlog Studio, AAPS, AutoAppDev, and AutoNovelWriter, but avoid rebuilding working tools when wrappers can orchestrate them.
- Default routing philosophy: DeepSeek v4 flash is the fast base model, DeepSeek v4 pro handles complex reasoning, Codex wrapper with GPT-5.5 medium and GPT-5.4-mini high remains an enhancement/spare tool, and external agents are orchestrated as toolsets rather than treated as the only brain.
- The agent must commit and push AgInTiFlow changes when edits are complete, using the `github-lazyingart` SSH alias if needed.

## Security & Configuration

Do not commit tokens, OTPs, `.env`, `.npmrc`, `.aaps-work/`, npm debug logs, or local runtime data. Use `.env.example` for public configuration shape only. Codex wrapper jobs are written under `runtime/codex-jobs/`, which is ignored. Use `AAPS_MOCK_CODEX=1` for wrapper smoke tests without model calls. Studio backend settings may select Codex or DeepSeek, but API keys stay in the ignored `.env` or the shell.
