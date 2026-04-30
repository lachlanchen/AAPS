# Repository Guidelines

## Project Structure & Module Organization

AAPS is split into a language core, a local Studio app, and a landing website.

- `src/aaps.js` contains the JavaScript `aaps_ir/0.2` parser, serializer, sample scripts, and Markdown compiler.
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
- `npm run studio`: starts the local Studio plus Codex wrapper at `http://127.0.0.1:8796`.
- `npm run build:website`: copies `src/aaps.js` into Studio and stages Studio under `website/studio/` for static deployment.
- `python3 -m py_compile backend/aaps_codex_server.py`: checks the wrapper server syntax.

## Coding Style & Naming Conventions

Use two-space indentation for JavaScript, JSON, HTML, and CSS. Use four-space indentation for Python. Keep source files ASCII unless translating documentation. Name AAPS files with `.aaps`, for example `examples/hello.aaps`.

Prefer small, dependency-light code. The landing page and Studio are static assets; do not introduce a framework unless it removes real complexity.

## Testing Guidelines

Add tests under `tests/` when changing parser behavior or serialization. Keep examples parseable and run `npm test` before committing. For wrapper changes, also run `python3 -m py_compile backend/aaps_codex_server.py`.

## Commit & Pull Request Guidelines

Use concise imperative commits such as `Add AAPS Studio` or `Fix parser diagnostics`. Pull requests should summarize language, Studio, wrapper, and deployment changes separately when they cross those boundaries. Include test commands and deployment notes for GitHub Pages changes.

## Security & Configuration

Do not commit tokens or local runtime data. Codex wrapper jobs are written under `runtime/codex-jobs/`, which is ignored. Use `AAPS_MOCK_CODEX=1` for wrapper smoke tests without model calls.
