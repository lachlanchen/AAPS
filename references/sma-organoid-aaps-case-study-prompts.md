# SMA Organoid Grid AAPS Case Study Prompts

This reference records a real user expectation trace for AAPS as an executable
agentic workflow harness. Absolute local paths are generalized as placeholders
so the case study can be shared without exposing machine-specific layout.

## Context

- Project: `<SMA_PROJECT>`
- Input image: `<SMA_PROJECT>/organoids-grid.png`
- Desired system: AAPS should own the task through `.aaps` scripts, project
  scripts, compile/runtime artifacts, logs, agent decisions, and reports.
- AAPS command used during this run: source checkout, not global install:
  `node <AAPS_REPO>/scripts/aaps.js`
- Preferred local image-analysis environment: conda environment named
  `organoid`.

## Prompt 1: Use AAPS, Not Manual Work

The user provided an organoid grid image and asked AAPS to perform the
segmentation task end to end. The key requirements were:

- Finish the task through AAPS CLI or webapp, not by manual one-off scripts.
- Write the final workflow as `.aaps` inside the SMA project.
- Split the image grid into individual tile images first.
- Loop over all tiles in AAPS.
- Try multiple segmentation routes:
  - Cellpose
  - thresholding
  - multiscale Cellpose
  - AgInTi image-generation or image-mask workflow
- Have an agent block use Codex GPT-5.5 medium in non-interactive exec mode to
  sample tiles, estimate approximate single-organoid size, inspect outputs, and
  select or route methods.
- Let AAPS compile missing scripts, tools, and artifacts underneath the `.aaps`
  workflow.
- Record all outputs inside the SMA project.

This prompt defines the benchmark behavior: AAPS is not just a parser or UI; it
is expected to be a supervisory harness that can create the program, compile the
needed code, run the workflow, inspect the outputs, and preserve logs.

## Prompt 2: Report Generation and Cellpose Repair

After the first workflow produced threshold and fallback artifacts, the user
asked for a stronger second workflow:

- Let AAPS write a TeX report in `<SMA_PROJECT>/publications`.
- Compile the TeX to PDF.
- Include figures and the full run summary.
- Fix Cellpose and use it, learning from existing organoid-analysis references.
- Treat Cellpose tool repair as AAPS responsibility.
- Allow AAPS to dynamically use Codex GPT-5.5 high or xhigh as an agent block
  when needed.
- Implement AAPS project-level version control for source workflows, compiled
  code, scripts, and generated code so changes remain reversible.
- Confirm whether the webapp can parse the `.aaps`.
- Make AgInTi integration work where possible.
- Output individual organoid/tile subfigures from the grid.
- Use a robust AgInTi prompt for annotation, with clean single-color organoid
  outlines and restrained details.
- Write a second `.aaps` workflow where Cellpose is the default method, the
  agent checks Cellpose results, and AgInTi image generation is used or prepared
  when Cellpose is not good enough.
- Record logs, decisions, intermediate files, and debugging artifacts.
- Show threshold results by default while running Cellpose as reference.
- Include rough size estimation as an explicit step.

This prompt is the acceptance test for AAPS as a recoverable scientific
workflow system. The expected result is not only masks, but a complete audit
trail: `.aaps`, scripts, compile records, run records, Cellpose smoke tests,
agent decisions, fallback records, TeX, PDF, and figures.

## Prompt 3: Iterative AAPS Chat

The user clarified the desired interaction style:

- AAPS can be prompted repeatedly in the same session, like Codex or AgInTi.
- If one AAPS output is incomplete, send another corrective prompt rather than
  abandoning the AAPS route.
- The AAPS session should preserve context across prompts.
- The source checkout may be used for development runs, but global install and
  npm publishing should happen after source changes are committed and verified.
- This SMA prompt sequence should be documented as a classic example of how the
  user expects AAPS to work.

This defines AAPS as an iterative compiler/runtime conversation, not a single
fire-and-forget prompt.

## Prompt 4: AAPS-First, Parser-Strict, Git-Versioned Execution

The user then clarified the architectural rule that should guide future AAPS
development:

- AAPS must generate a `.aaps` program first.
- AAPS should not jump directly into ad hoc scripts before the workflow exists.
- The `.aaps` file must follow the AAPS grammar and pass the dedicated parser.
- If the parser cannot express the needed workflow, improve the parser instead
  of bypassing the language.
- Manifestation should fill missing blocks, scripts, tools, binaries,
  prompts, and code underneath the already-parseable `.aaps` workflow.
- AAPS CLI and webapp chat should share the same session model, so repeated
  prompts can refine one AAPS project/session from either interface.
- Git should be the primary version-control layer for workflow and generated
  code changes made during chat/compile sessions.
- For each chat/manifest pass that changes workflows, blocks, scripts, tools, or
  report source, AAPS should make a project-local git commit. Snapshot archives
  may remain as a non-git fallback, but git commits are the preferred audit
  trail.
- GPU/tool requirements should be first-class AAPS requirements. For example,
  a Cellpose block should be able to declare GPU preference/requirement, and the
  compiler should detect availability, prepare environment/setup instructions,
  or route to a suitable fallback.

This is the stricter harness rule: natural language asks for the goal, AAPS
writes a parseable program, the manifest engine fills the implementation, the runtime
executes and validates it, and git records every meaningful source change.

## Prompt 5: Force Real AgInTi Image Refinement on Borderline Outputs

After the Cellpose-first report was almost good, the user asked AAPS to make
sure the AgInTi image-generation branch was actually exercised rather than only
prepared as a not-needed handoff. The updated requirement was:

- Select one or more weak, borderline, or stress-test tiles from the prior
  Cellpose/threshold/multiscale QC evidence.
- Add or update an AAPS block that explicitly performs:
  `Codex image-view QC -> image-aware handoff packet -> AgInTi image generation
  or refinement -> integration manifest -> Codex verifier -> final report`.
- Use `aginti image generate` with reference images where available, not only a
  dry-run prompt.
- Generate a high-quality downstream prompt from AAPS context: source tile,
  candidate overlays, observed defects, desired annotation/mask style,
  truthfulness constraints, output schema, and verifier checklist.
- Save the command, prompt, stdout/stderr, request metadata, generated image
  path, redacted logs, integration manifest, and verifier report.
- If credentials/provider/runtime are unavailable, record the failed attempt
  truthfully and keep the workflow parseable/executable. If generation succeeds,
  integrate the generated/refined artifact into the main pipeline only through a
  verifier-accepted manifest.
- The final TeX/PDF report should be written by the final report block after
  the loop, and should recap the original input, candidate methods, selected
  stress-test tiles, AgInTi attempt/result, verifier decision, limitations, and
  final outputs.

## Prompt 6: Version Workflow and Manifested Implementation

The user then made the versioning expectation explicit:

- AAPS should git-version the `.aaps` workflow contract.
- AAPS should also git-version manifested scripts, code, prompts, registry
  entries, integration manifests, report builders, and other implementation
  files created under the workflow.
- AgInTi image-generation prompts should themselves be generated by AAPS/agent
  context, not hand-written as disconnected prose.
- Codex image-view feedback should be represented as upstream conclusions in
  the handoff packet and passed to the AgInTi image-generation prompt.
- Codex image-view should identify concrete segmentation defects such as missed
  organoids, merged organoids, spurious background labels, or ambiguous
  boundaries before handoff.
- A Codex GPT-5.5 high/xhigh verifier should check the AgInTi image-generation
  result. If the result is not reasonable or separable enough for instance
  segmentation, the verifier feedback should be fed back into the next AgInTi
  prompt and the image-generation step should retry within a bounded policy.
- The final AAPS result should prove that adjacent agent handoff works through
  files and parser-checked workflow structure, not just through chat text.

## Prompt 7: Finish Task First, Then Generalize Session Semantics

During the AgInTi stress-test refinement, the user emphasized execution order
and separation of concerns:

- First finish the SMA segmentation/report task through AAPS.
- Then generalize the AAPS runtime/session behavior.
- Resume should use the same AAPS workflow/chat session where possible, similar
  to AgInTiFlow session logic.
- AAPS should distinguish chat-session continuity from runtime-run continuity.
  Chat sessions preserve prompts, cwd, backend settings, and selected project.
  Runtime runs preserve block status, artifacts, logs, validation, and repair
  state.
- A long AAPS task should be stoppable in the middle, resumable later, and
  restartable at different levels.

## Prompt 8: Runtime Resume, No-Override, And Selective Rerun

After the report and AgInTi artifacts were verified, the user asked to check
what was still missing and specifically named workflow resume:

- Document all recent messages and save the original prompts as references.
- Check missing AAPS behavior, especially session management.
- Add support for stopping a workflow mid-run and resuming it.
- Support full rerun, current-run resume, and focused rerun of later stages.
- Support no-overwrite/no-override behavior for completed artifacts.
- Skip blocks that already finished successfully. In the SMA case this means:
  - split the grid into tiles once and skip it later;
  - skip expensive Cellpose/threshold steps if their masks/overlays/metrics are
    already valid;
  - rerun only Codex image-view QC, AgInTi image generation/refinement,
    verifier, or report blocks when needed.

This led to the runtime resume mode:

```bash
aaps run workflows/main.aaps --project . --resume-run <run-id> --skip-completed
aaps run workflows/main.aaps --project . --resume-run <run-id> --from-step codex_refinement_verifier
aaps run-block workflows/main.aaps --project . --block build_publication_report
```

The intended behavior is conservative: AAPS should skip based on a prior
`run.json`, record `skipped_completed` steps in the new run summary, preserve
previous artifacts unless explicitly rerun, and write `resume_state.json` so the
decision is auditable.

## Harness Principles Captured

1. Natural language is the top-level programming surface.
2. The `.aaps` program is the inspectable harness around the natural language
   request.
3. Blocks provide divide-and-conquer contracts: inputs, outputs, environment,
   tools, agent, execution, validation, and recovery.
4. Compilation fills missing scripts, tools, setup prompts, and agent prompts.
5. Runtime executes blocks, validates artifacts, records logs, and routes
   fallback decisions.
6. Agent blocks are first-class workflow components, not hidden side effects.
7. Scientific outputs must be reproducible: masks, overlays, metrics, TeX/PDF
   report, and decision records are all artifacts.
8. Project versioning is part of the harness, so generated code and workflows
   can be audited and rolled back. Git commits are the preferred project-level
   audit mechanism, with `.aaps-work/versions` snapshots as a fallback.
9. Parser strictness matters: if the webapp cannot parse the workflow, the
   workflow is not considered complete.
10. Hardware and environment intent, including GPU preference for tools such as
    Cellpose, belongs in the AAPS block contract.
11. Runtime resume is part of the harness. AAPS should preserve and expose
    which steps were rerun, skipped, resumed, repaired, or accepted as existing
    evidence.

## Expected Acceptance Checks

For this case study, a correct AAPS result should pass:

```bash
node <AAPS_REPO>/scripts/aaps.js validate workflows/organoid_grid_cellpose_agent_report.aaps --project <SMA_PROJECT> --json
node <AAPS_REPO>/scripts/aaps.js parse workflows/organoid_grid_cellpose_agent_report.aaps --project <SMA_PROJECT> --json
node <AAPS_REPO>/scripts/aaps.js manifest workflows/organoid_grid_cellpose_agent_report.aaps --project <SMA_PROJECT> --mode check --json
node <AAPS_REPO>/scripts/aaps.js run workflows/organoid_grid_cellpose_agent_report.aaps --project <SMA_PROJECT> --run-root runs --run-id organoid-grid-cellpose-agent-report --json
```

It should also create nonempty publication artifacts:

```text
<SMA_PROJECT>/publications/organoid_grid_cellpose_agent_report.tex
<SMA_PROJECT>/publications/organoid_grid_cellpose_agent_report.pdf
```

## Notes for Future AAPS Development

- Cellpose v4 exposes `models.CellposeModel`, while older examples may use
  `models.Cellpose`. AAPS tool repair should detect this API difference.
- For slow microscopy model inference, prefer a batch script that loads the
  model once instead of launching a fresh process per tile.
- If AgInTi image generation or image input is unavailable, AAPS must mark the
  result as `handoff_prepared` or `generation_failed`, not as completed image
  segmentation.
- A report block should be a normal executable block, not an afterthought.
- AAPS should surface project snapshots, manifest reports, run logs, and
  fallback decisions in Studio and CLI.
- Runtime resume is now minimally supported through `--resume-run`,
  `--skip-completed`, and `--from-step`. Future work should add richer pause,
  stop, human-review checkpoints, and artifact revalidation policies for skipped
  steps.
