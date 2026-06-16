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

## Minimal Runtime Resume Added

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
- `skipped_completed` result records for reused steps

The skip key is step path plus loop index plus loop item. This is important for
folder/image loops: one tile can be rerun while other completed tiles remain
skipped.

## Remaining Work

- Add Studio controls for resume mode, from-step, and no-overwrite policy.
- Add explicit stop/pause commands that mark `run.json` as paused instead of
  relying on external process termination.
- Add human-review checkpoints that pause a run and can continue after approval.
- Add artifact freshness checks before skipping a completed block.
- Add dependency-aware downstream invalidation: if a script or input changed,
  AAPS should suggest rerunning affected blocks even if a previous run says they
  completed.
- Add UI visualization for `skipped_completed`, `skipped_before_from_step`,
  resumed, repaired, and stale-artifact states.
