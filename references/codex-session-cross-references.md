# Codex Session Cross-References

Date: 2026-05-20

Purpose: keep a durable, redacted index of Codex sessions that explain recent
AAPS and AAPS Studio development context. This file is for future supervisors who
need to connect session IDs, repository state, and product-hardening decisions
without re-reading the full Codex history first.

## Sessions

### AAPS Studio Recent Commits Session

- Session: `019dd6ee-7f77-7361-ae9a-8f25a4036525`
- Status context shown by Codex: `~/ProjectsLFS/AAPS`
- Primary repo involved: `/home/lachlan/ProjectsLFS/AAPS`
- User-visible prompt shown in status: `Summarize recent commits`
- Role: AAPS Studio recent-commit summary and continuity anchor.

Current verified repository anchor when this note was created:

- Branch: `main`
- Head: `63df3cd` - Deepen Studio chat planning for blocks and writing programs
- Remote: `origin/main`
- Package/runtime context: AAPS Studio and CLI product-hardening work.

Recent commit chain at this anchor:

- `63df3cd` - Deepen Studio chat planning for blocks and writing programs
- `51ec880` - Harden AAPS webapp startup and program chat planning
- `69170be` - Add persistent AAPS Studio webapp preference controls
- `1abd8a3` - Add AAPS Studio webapp stop and restart controls
- `e44e807` - Improve AAPS backend discovery and multiline input
- `843ba3c` - Improve AAPS CLI composer and update restart
- `d63868c` - Upgrade AAPS interactive CLI
- `b8e50b7` - Add AAPS webapp autostart and chat CLI

## Why This Session Matters

This session should be remembered as the AAPS-side continuity point for the
recent Studio usability and CLI work:

- webapp autostart, stop, restart, and preference controls
- CLI interaction improvements
- backend discovery and multiline input
- project/program/block chat planning improvements
- early separation between writing-program workflows and scientific/block
  workflows

Future AAPS Studio TDV sessions should treat this as the baseline before deeper
browser/UI validation of program planning, block creation, artifact rendering,
and backend-agent switching.

## Related Cross-Project Sessions

AgInTiFlow has a companion cross-reference note at:

- `/home/lachlan/ProjectsLFS/Agent/AgInTiFlow/references/codex-session-cross-references.md`

The AgInTiFlow note tracks:

- `019dc795-e538-75b2-8a03-bc103b32985d` - LALACHAN browser and AgInTi supervision source session.
- `019e1f99-289e-7711-986a-d41047f5ed21` - ZhJpBook and AgInTiFlow implementation session.

Together, these three sessions form the current cross-project context:

- AAPS Studio should become the project/workflow/block/program front end.
- AgInTiFlow should be a backend agent option with evidence-gated completion.
- Backend agent improvements should not change AAPS semantics or selected
  project/workflow/program/block state.

## Preferred Follow-Up Checks

Use these after AAPS Studio patches:

```bash
cd /home/lachlan/ProjectsLFS/AAPS
python3 -m py_compile backend/aaps_codex_server.py
node --check src/aaps.js
node --check studio/aaps.js
node --check studio/app.js
node --check scripts/aaps.js
node --check scripts/aaps-runner.js
node --check tests/aaps.test.js
npm test
npm pack --dry-run
```

Browser TDV should be run from:

```bash
cd /home/lachlan/ProjectsLFS/AAPS-Through-Test-Debug-Validation
node supervision-ledger/browser-tdv/aaps-studio-browser-tdv.mjs
node supervision-ledger/browser-tdv/aaps-studio-agent-backends-tdv.mjs
node supervision-ledger/browser-tdv/aaps-studio-run-summary-tdv.mjs
node supervision-ledger/browser-tdv/aaps-studio-structure-editor-tdv.mjs
```
