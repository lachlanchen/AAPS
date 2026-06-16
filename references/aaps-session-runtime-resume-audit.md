# AAPS Session And Runtime Resume Audit

This audit was written after the SMA organoid-grid case study to clarify what
AAPS already supports and what was missing.

## Implemented Session Layer

AAPS already has a project-scoped chat/session layer:

- CLI entry: `aaps chat --project . --session <id>`
- Studio entry: session dropdown and `+ New` session dialog
- backend storage: `.aaps-work/aaps-sessions.sqlite`
- history storage: `.aaps-work/studio-history/session/<session>.jsonl`
- stored metadata: session id, friendly name, project root, command cwd, active
  `.aaps` file, backend, provider, agent session id, status, timestamps, and
  history path
- backend routing: Codex, AgInTiFlow, DeepSeek-compatible settings, or print
  backend
- shared CLI/Studio transcript: a terminal session and browser session can point
  at the same project/session id

This solves conversational continuity: repeated user prompts can keep refining
the same AAPS project and selected `.aaps` workflow.

## Missing Runtime Layer Before This Audit

Before the runtime resume update, AAPS did not have a first-class way to:

- stop a long workflow mid-run and resume it later;
- rerun only downstream stages inside the same run;
- skip blocks that had already succeeded;
- preserve previous artifacts under a no-overwrite/no-override policy;
- rerun just image-view QC, AgInTi refinement, verifier, or report blocks after
  expensive split/Cellpose stages already completed;
- expose resume decisions as explicit artifacts.

`run-block` existed, but that is focused block execution, not a whole-workflow
resume policy.

## Runtime Resume Implemented

The runtime now supports:

```bash
# Full rerun.
aaps run workflows/main.aaps --project . --run-id fresh-run

# Focused block rerun.
aaps run-block workflows/main.aaps --project . --block build_publication_report

# Resume the same run directory and skip already completed steps.
aaps run workflows/main.aaps --project . --resume-run fresh-run --skip-completed

# Resume from a named step.
aaps run workflows/main.aaps --project . --resume-run fresh-run --from-step codex_refinement_verifier

# Resume into a new run directory while reusing prior completion records.
aaps run workflows/main.aaps --project . --resume-run fresh-run --run-id report-rerun --skip-completed
```

Resume writes:

- `resume_state.json`
- archived previous `run.json` under `resume/` when reusing the same run id
- `artifact_freshness.json` with skip/rerun freshness decisions
- `human_review_queue.json` for pending manual checkpoints
- `pause_state.json` for clean pause/continue state
- `skipped_completed` result records for reused steps

The skip key is step path plus loop index plus loop item. This is important for
folder/image loops: one tile can be rerun while other completed tiles remain
skipped.

## Added After The Audit

AAPS now has first-class runtime controls for the missing items identified
above:

- Studio classic Runtime panel includes resume run id, resume mode,
  `no-override`, from-step, pause before/after, pause on human review, approve
  queued review, and Continue Run.
- Studio simple has a compact Run / Resume panel backed by the same
  `/api/aaps/run` payload.
- CLI supports `--continue-run`, `--resume-mode no-override`,
  `--pause-before`, `--pause-after`, `--pause-on-human-review`, and
  `--approve-human-review`.
- Pause state is explicit: `run.json` returns status `paused`, and
  `pause_state.json` records the step, reason, timestamp, and continue command.
- Human review is explicit: `exec manual` queues a pending item in
  `human_review_queue.json`, and a previous `manual_review` result is not
  skipped until a resume uses `--approve-human-review`.
- Resume skip is now freshness-checked. A step is skipped only if declared
  outputs/artifacts/validation targets still exist and are not older than the
  current workflow source, project manifest/registries, script entries, required
  files, or path-like inputs.
- Dependency-aware invalidation records `rerun` decisions in
  `artifact_freshness.json` when scripts, inputs, source files, or registries
  change.

Remaining future refinement: a richer interactive approval UI can mark
individual queue items approved with reviewer notes. The current implementation
uses the safe CLI/API approval flag for the whole resume request.
