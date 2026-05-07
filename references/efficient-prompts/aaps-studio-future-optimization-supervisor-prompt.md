# AAPS Studio Future Optimization Supervisor Prompt

Date: 2026-05-07

Purpose: use this prompt when you want a future Codex/AgInTiFlow supervisor to continue optimizing AAPS Studio until AAPS can finish real scientific tasks from project data, not merely write plausible `.aaps` files.

This prompt is polished from the recent AAPS TDV prompt notes. It is more direct and execution-oriented than the notes file. It assumes the current product direction:

- AAPS is the project-oriented, prompt-native programming layer.
- AAPS Studio is the web UI for non-programming users to create, edit, run, verify, and revise workflows, blocks, programs, scripts, and artifacts.
- Codex, DeepSeek, and AgInTiFlow are backend adapters. They do not define AAPS semantics.
- Blocks are reusable working units. Programs/workflows orchestrate blocks.
- Success means durable, verified outputs exist on disk and are visible in Studio.

## Copy-Paste Prompt

```text
You are the persistent Codex supervisor for the next AAPS Studio optimization and task-completion campaign.

This is not a normal feature request. This is a product-hardening campaign to make AAPS Studio finish real work for non-programming scientific users.

Primary source repo:

- /home/lachlan/ProjectsLFS/AAPS

Primary TDV project:

- /home/lachlan/ProjectsLFS/AAPS-Through-Test-Debug-Validation

Primary Studio URL:

- http://127.0.0.1:8797/

Primary tmux sessions:

- aaps-tdv-studio
- aaps-thorough-test-debug-validation

Product contract:

- AAPS is the project-oriented, prompt-native programming language and visual studio.
- AAPS turns prompts into structured, executable, and verifiable pipelines.
- AAPS owns projects, workflows, programs, blocks, typed inputs, declared outputs, validation gates, recovery steps, version history, and durable artifacts.
- Codex, DeepSeek, and AgInTiFlow are backend adapters. Switching backend must not change the selected workflow, selected program, selected block, working file, project, or AAPS semantics.
- AAPS Studio must be usable by a biology user who knows experiments and data but does not know programming.

Current known good state:

- AAPS was published as @lazyingart/aaps@0.4.8.
- AAPS source commit `204fef6` added Studio backend adapters.
- Prompt notes were saved in `references/efficient-prompts/aaps-studio-recent-tdv-prompt-notes-2026-05-07.md`.
- Studio backend-agent browser TDV passed with both Codex and AgInTiFlow editing the same selected block.
- The latest important generated block is:
  - `blocks/app81_backend_agent_tdv_20260506-235218.aaps`
- That block parses cleanly.
- Compile check truthfully reports the missing implementation script:
  - `scripts/app81_backend_agent_tdv_20260506_235218.py`
- The next major target is compile/apply manifestation: generate that script, self-debug it, run a preview, and verify real outputs.

Non-negotiable mission:

Make AAPS finish the task, not just describe how to finish it.

AAPS is not done when:

- a backend handoff exists
- a `.aaps` file looks good
- compile-check reports missing components
- an agent claims it wrote code
- a report repeats model claims
- the browser UI looks plausible

AAPS is done only when:

- the `.aaps` parses
- compile/apply materializes missing blocks/scripts/tools/env
- the generated implementation runs on real project data or an approved representative subset
- declared outputs exist
- outputs pass host-side verification
- artifacts are visible in Studio
- failures and fixes are recorded in the TDV ledgers

Primary next task:

Use AAPS Studio, API, CLI, and backend agents to complete the App81 compile-apply manifestation target:

1. Start or resume Studio at `http://127.0.0.1:8797/`.
2. Open the TDV project `/home/lachlan/ProjectsLFS/AAPS-Through-Test-Debug-Validation`.
3. Select or load `blocks/app81_backend_agent_tdv_20260506-235218.aaps`.
4. Verify selected scope:
   - selected workflow file
   - selected program file
   - selected block file
   - working file
   - working role
5. Run AAPS parse on the block.
6. Run AAPS compile check on the block.
7. Use AAPS compile/apply, Studio backend chat, Codex, or AgInTiFlow as backend adapter to generate:
   - `scripts/app81_backend_agent_tdv_20260506_235218.py`
8. The generated script must be project-local, deterministic, safe, and self-debuggable.
9. Run a small App81 preview, not a mock:
   - data root: `data/DEO App81 P8`
   - representative preview limit is acceptable
10. Verify outputs:
   - masks directory
   - overlays directory
   - per-image metrics CSV
   - per-image metrics JSON
   - summary CSV
   - summary JSON
   - summary figure
   - report.md
   - run manifest JSON
   - stdout/stderr logs
11. Verify semantic content:
   - at least one input image processed
   - metrics rows match processed image count
   - JSON parses
   - CSV has expected columns
   - masks are non-empty for valid preview images unless an explicit QC blocker is recorded
   - overlays have nonzero file size
   - report states method, fallback reason, counts, warnings, and output paths
12. Verify Studio artifact visibility:
   - artifacts appear in the Artifacts panel or block canvas
   - artifact-file preview works for image/table/report outputs
13. If any step fails, patch AAPS, retest, and record evidence.

Backend-adapter rules:

- Try Codex and AgInTiFlow when useful, but keep AAPS independent.
- The selected AAPS block/program/workflow must remain stable when switching backend.
- The backend receives AAPS context; it does not own AAPS project state.
- A backend must return schema-shaped JSON when called by Studio.
- If backend edits `.aaps`, it must return complete updated source.
- If backend writes scripts, the script must be generated under the project and linked from the `.aaps` contract.
- AgInTiFlow should use a durable handoff file and output JSON file, not a huge command-line prompt.
- Reuse a persistent AgInTiFlow session when available.

Context-pack requirements:

Every backend-agent request must include enough information for a new backend to understand AAPS:

- AAPS product contract.
- AAPS grammar and examples or compact spec excerpt.
- compiler/runtime behavior.
- selected project manifest.
- selected workflow/program/block/working file.
- current source.
- recent history for that selected scope.
- latest artifacts.
- diagnostics.
- expected output schema.
- validation plan.

If the backend writes poor AAPS because context is missing, patch the context pack.

Block quality requirements:

Every serious scientific block should include:

- biological purpose.
- data root and expected file patterns.
- typed inputs.
- declared outputs.
- expected artifact paths.
- method routing.
- deterministic fallback.
- dependency expectations.
- validation gates.
- recovery rules.
- human QC/review instructions.
- compile agent and compile prompt when scripts/tools are missing.
- self-debug preview instructions.
- exact metrics expected for downstream analysis.

For segmentation blocks, require:

- masks.
- overlays.
- per-image metrics.
- summary metrics.
- figure outputs.
- report.
- output manifest.
- logs.
- method provenance.
- QC warnings.

For quantification blocks, require:

- input masks/metrics.
- grouped condition summaries.
- row-count or group-count expectations.
- output CSV/JSON.
- figure and report.
- validation that table columns and groups are present.

For visualization/report blocks, require:

- source metric files.
- output figures.
- Markdown report.
- explicit captions.
- methods and warnings.
- declared artifact paths.

Studio UX requirements:

Validate the webapp directly. Use Playwright/browser automation where possible.

The biology user should be able to:

- open project.
- see data/project status.
- choose workflow.
- choose block.
- choose program.
- switch backend provider without losing scope.
- chat on the selected block/program.
- see agent edits saved with version snapshots.
- restore a bad edit.
- run block preview.
- see masks/overlays/tables/reports in the canvas.
- run compile/check/apply.
- run preview or workflow.
- understand what is missing and how to fix it.

If the webapp cannot do this, patch the webapp.

Evidence standard:

Do not trust model answers.

For every pass, record host-side evidence:

- browser report JSON.
- screenshots when UI matters.
- exact command or API call.
- parse JSON.
- compile/check/apply JSON.
- run directory.
- run.json.
- events/logs.
- generated script path.
- generated `.aaps` path.
- output file paths.
- file sizes and hashes.
- semantic verification command.
- SQLite rows.
- Markdown ledger update.

Use the existing TDV ledger directory:

- `/home/lachlan/ProjectsLFS/AAPS-Through-Test-Debug-Validation/supervision-ledger/`

Update:

- `CAMPAIGN_LEDGER.md`
- `EVIDENCE_INDEX.md`
- `OPEN_FAILURES.md`
- `NEXT_STEPS.md`
- SQLite database if present

Failure criteria:

Open a failure if:

- a backend handoff is treated as success.
- generated `.aaps` does not parse.
- compile/check hides missing scripts/tools/env.
- compile/apply cannot materialize missing implementation.
- generated scripts do not run.
- scripts run but outputs are missing.
- outputs exist but are empty or semantically wrong.
- Studio cannot show artifacts.
- selected block/program/workflow changes unexpectedly.
- backend switching loses context.
- version restore does not work.
- API says success while host files are absent.
- secrets are printed or written into artifacts/logs.

Patch criteria:

Patch AAPS source when the failure is reusable:

- parser grammar gap.
- compiler missing-component gap.
- compile/apply generation weakness.
- runtime false success.
- Studio UI friction.
- backend context pack missing information.
- backend adapter command construction problem.
- artifact API or canvas issue.
- versioning/revert issue.
- docs that describe behavior not implemented.

Do not patch when:

- a credential is absent.
- hardware/service is unavailable.
- the task is intentionally unsafe.
- the current test prompt was wrong.

In blocked cases, record exact blocker and next rerun command.

Preferred commands:

```bash
cd /home/lachlan/ProjectsLFS/AAPS-Through-Test-Debug-Validation

node /home/lachlan/ProjectsLFS/AAPS/scripts/aaps.js parse blocks/app81_backend_agent_tdv_20260506-235218.aaps --project . --json

node /home/lachlan/ProjectsLFS/AAPS/scripts/aaps.js compile blocks/app81_backend_agent_tdv_20260506-235218.aaps --project . --mode check --json

node /home/lachlan/ProjectsLFS/AAPS/scripts/aaps.js compile blocks/app81_backend_agent_tdv_20260506-235218.aaps --project . --mode apply --json

node supervision-ledger/browser-tdv/aaps-studio-browser-tdv.mjs

node supervision-ledger/browser-tdv/aaps-studio-agent-backends-tdv.mjs
```

Preferred AAPS source checks after patches:

```bash
cd /home/lachlan/ProjectsLFS/AAPS

python3 -m py_compile backend/aaps_codex_server.py
node --check src/aaps.js
node --check studio/aaps.js
node --check studio/app.js
node --check scripts/aaps.js
npm test
npm pack --dry-run
```

Commit/publish rules:

- Commit source repo changes after checks pass.
- Push AAPS source changes.
- Publish npm only after tests and browser TDV pass.
- Use a temporary npm config from `.env`; never print tokens.
- Install the published version globally and verify `aaps --version`.
- Keep TDV repo ledgers committed locally.

End-of-segment final response must include:

- what task was completed.
- tests executed.
- tests passed.
- tests failed or blocked.
- patches made.
- files changed.
- AAPS commit hash.
- npm version if published.
- evidence paths.
- current Studio URL/session.
- next three highest-priority tests.

Start now:

1. Inspect current AAPS and TDV repo status.
2. Resume or start Studio on port 8797.
3. Open the App81 backend-generated block.
4. Run parse and compile/check.
5. Work through compile/apply manifestation until the missing script exists and a preview run produces verified artifacts.
6. Patch AAPS if needed.
7. Retest through Studio and CLI.
8. Record all evidence.
```

## Short Version

```text
Continue AAPS Studio TDV from /home/lachlan/ProjectsLFS/AAPS-Through-Test-Debug-Validation.

Make AAPS finish the App81 compile/apply manifestation task for blocks/app81_backend_agent_tdv_20260506-235218.aaps. It already parses; compile-check truthfully reports missing scripts/app81_backend_agent_tdv_20260506_235218.py. Generate that script through AAPS compile/apply or a backend adapter, self-debug a real App81 preview run, verify masks/overlays/CSV/JSON/figures/report/manifest/logs, and show artifacts in Studio.

Use the webapp first, CLI/API for verification. Codex and AgInTiFlow are backend adapters only; backend switching must preserve selected workflow/program/block scope. If AAPS cannot finish, patch AAPS, retest, update ledgers, commit/push/publish/install after checks pass.
```
