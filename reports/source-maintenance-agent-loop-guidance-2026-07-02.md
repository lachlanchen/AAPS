# AAPS Source Maintenance Guidance Report

Date: 2026-07-02

## Goal

Make reusable AAPS product guidance explicitly require the AAPS agent path to
repair source/parser/manifest/readiness/runtime/generated-script failures through
AAPS chat/session -> parse -> manifest -> check -> run -> QC -> repair before
task-level success claims.

## Changes

- Added the repair-loop rule to exported block-design and agent-handoff guide
  constants.
- Added the same rule to Studio/backend reusable prompts and the wrapper prompt.
- Added a focused smoke assertion that the exported block and handoff guides
  include the required loop text.

## Verification

- `node --check src/aaps.js`
- `node --check studio/aaps.js`
- `node --check tests/aaps.test.js`
- `python3 -m py_compile backend/aaps_codex_server.py`
- `npm test`
- `npm run project:validate`
- `node scripts/aaps.js guide blocks --json | rg "chat/session -> parse -> manifest -> check -> run -> QC -> repair"`
- `node scripts/aaps.js guide handoff --json | rg "chat/session -> parse -> manifest -> check -> run -> QC -> repair"`

## Workflow Outputs

No `.aaps` workflow or TDV task output was changed. This was a source guidance
edit, so no compile/run log or workflow output artifact was produced.
