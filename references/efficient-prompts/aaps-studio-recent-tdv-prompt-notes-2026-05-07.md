# AAPS Studio Recent TDV Prompt Notes

Date: 2026-05-07

Purpose: preserve the recent AAPS-focused prompts from the AgInTiFlow/AAPS development conversation as reusable prompt patterns. These prompts drove the latest AAPS Studio work around web-first TDV, block/program/workflow scope, Codex and AgInTiFlow backend adapters, versioned edits, artifact canvas, and biology image-analysis workflows.

Use these prompts when supervising future AAPS development, especially when the goal is not just to inspect code but to make AAPS Studio usable by a non-programming domain expert.

## Prompt 01: Full AAPS Studio TDV For Biology Data

```text
Do a very deep test-debug-validation on AAPS Studio.

Use /home/lachlan/ProjectsLFS/AAPS-Through-Test-Debug-Validation as the campaign repository. There is a data folder in this repo. Initialize git if needed and use AAPS Studio, API, and CLI to build real AAPS workflows that analyze the data and write outputs under outputs/.

The goal is not for Codex to manually solve the image-analysis task. The goal is to make AAPS capable of finishing it: create correct .aaps files, parse them, compile them, generate missing blocks/scripts/tools/env, run them, and verify meaningful segmentation, quantification, plots, JSON, CSV, reports, and artifacts.

Create separate workflows for APP80, APP65, and APP81. Use ../Zhengyu only as reference/ground truth, not as code to steal. Read references/ for experiment intent. Guide AAPS itself to write blocks and programs, then fix AAPS when it cannot.

Use the persistent tmux session aaps-thorough-test-debug-validation. Maintain a SQLite/Markdown TDV database with every capability, failure, fix, evidence path, and remaining gap.
```

## Prompt 02: Studio Must Be Usable By A Biology User

```text
Imagine a biology student who knows biology and experiments but does not know programming.

They open AAPS Studio, point the project to a data folder, create or open an AAPS workflow, then work by creating blocks, refining blocks through chat, assembling programs, running tests, and inspecting artifacts.

Validate the app as that user:
- Can they create a project?
- Can they upload or point to data?
- Can they open or download an existing .aaps?
- Can they create blocks from chat?
- Can they select one workflow, one block, or one program and keep working on that object until they switch?
- Can they edit block names, prompts, inputs, outputs, scripts, tools, and expectations?
- Can they assemble blocks into a program?
- Can they compile missing pieces later?
- Can they run a test workflow and inspect masks, overlays, metrics, plots, reports, and logs?
- Can they revert a damaging edit through version history?

Do not be shallow. Use the webapp directly. Check buttons, dropdowns, cards, popups, panels, tabs, edits, saves, restores, compile controls, run controls, and artifact display.
```

## Prompt 03: Blocks Are Main Working Units

```text
Treat blocks as the main working parts of AAPS.

For each dataset and task, create or refine reusable blocks:
- segmentation blocks
- quantification blocks
- visualization blocks
- report blocks
- QC/review blocks

The blocks must be editable and organized. A program should use these blocks. A block can start as a placeholder, but compilation must later materialize it into scripts/tools/env. Every block used by a program must be discoverable and editable in the Blocks view.

The prompt in a .aaps block must be complete enough for later compilation. It must include biological purpose, data roots, typed inputs, declared outputs, expected artifacts, method choices, validation gates, recovery rules, review expectations, and self-debug instructions for generated scripts.
```

## Prompt 04: Block Chat Must Produce Artifacts

```text
Test block chat deeply.

Select a block, chat with AAPS, and ask it to design or refine a segmentation tool. The backend test must really write the block and run a small preview if possible. The test result should appear in the block artifact canvas: masks, overlays, metric tables, summary JSON, figures, logs, and report previews.

Learn from LazyBlog Studio and AgInTiFlow canvas artifact pipes. AAPS Studio should share artifacts from backend to frontend so the user can see whether a segmentation or quantification block is performing well.

Do not only record chat text. Persist chat history, artifact JSON, preview outputs, and version snapshots.
```

## Prompt 05: Webapp First, API/CLI As Support

```text
Prefer using the AAPS Studio webapp directly for TDV.

You may use the API and CLI for supervisor-side verification, but the product goal is that the webapp itself is workable. If the webapp is frictional, hard to edit, or cannot create/edit/run blocks and programs, fix the webapp.

Validate both:
- direct web UI behavior with Playwright/browser automation
- backend APIs that the UI calls
- CLI parser/compiler/runtime behavior

The UI must show project files, workflows, blocks, scripts, artifacts, versions, compile records, run records, and chat artifacts in a way a non-CS user can understand.
```

## Prompt 06: Codex And AgInTiFlow Backend Adapters

```text
Try both Codex and AgInTiFlow as backend chat/agent providers.

AAPS should be independent from the backend. Changing backend must not change the selected AAPS workflow, block, program, or project. Codex and AgInTiFlow are adapters; AAPS remains the language/project/block/program layer.

Test:
- Select one workflow.
- Select one block under that workflow.
- Chat with Codex to refine the block.
- Switch backend to AgInTiFlow in settings.
- Continue chatting on the same selected block.
- Verify both edits are saved to the same file with version snapshots.
- Verify the selected workflow/program/block context is preserved in the saved chat artifact.
- Verify the resulting .aaps parses and compile-checks.
```

## Prompt 07: Backend Context Pack For A New Language

```text
The backend agent cannot write high-quality AAPS unless it receives enough AAPS background.

When AAPS calls Codex or AgInTiFlow, pass a complete but bounded context pack:
- AAPS product contract
- language grammar excerpt
- compiler/runtime excerpts
- current project manifest
- selected workflow/program/block/working file
- current source
- recent chat history for that scope
- current artifacts
- diagnostics
- backend settings
- expected output schema

The backend agent should return schema-shaped JSON, not vague prose. If editing source, it must return the complete updated .aaps source. It must preserve valid AAPS syntax and produce compile-ready blocks/programs.
```

## Prompt 08: Persistent AgInTiFlow Backend Session

```text
When using AgInTiFlow as AAPS backend, prefer a persistent session.

AAPS should write the full backend handoff/context into a durable project-local file. Then invoke aginti with a short prompt that says:
- read this handoff file
- follow it exactly
- write required JSON output to this output file
- do not print secrets
- do not modify unrelated files

If a session id exists, resume it. If not, start a new AgInTiFlow session and store the discovered session id in AAPS settings. This keeps AgInTiFlow memory consistent while AAPS keeps its backend adapter boundary explicit.
```

## Prompt 09: Agent Compile Must Self-Debug

```text
When using an agent to compile or manifest AAPS, it must self-debug generated blocks and scripts.

Do not accept a generated script just because it was written. The compiler/backend agent must:
- run a small representative preview
- inspect stdout and stderr logs
- verify declared outputs exist
- parse JSON outputs
- check CSV columns and row counts when expected
- ensure masks/overlays are non-empty and visually meaningful
- write a manifest of produced outputs
- refine the script until the test run passes or report a truthful blocker

The final output must be a compiled script/tool/env plus durable outputs, not just a good-looking .aaps file.
```

## Prompt 10: Workflow, Block, Program Selection Rules

```text
AAPS Studio must preserve explicit selection state.

The user first selects a workflow. Then under that workflow, the user selects or creates a block and works on it until switching blocks. Same for programs. Chat should operate on the selected object, not guess another one.

The backend request must include:
- selected workflow file
- selected program file
- selected block file
- current working file
- working role
- selected graph node if any

Backend changes between Codex, DeepSeek, and AgInTiFlow must preserve this scope. If the user wants to create a new block, AAPS may create and select it, but this must be explicit and recorded in history.
```

## Prompt 11: AAPS Does Not Stop At Handoff

```text
If AAPS does not finish the task, do not stop.

A prompt handoff is not execution. A compiler report is not success. A run is not success unless declared outputs exist and validations pass.

AAPS should keep going through the loop:
- write or edit the correct .aaps
- parse it
- compile/check it
- generate missing blocks/scripts/tools/env
- run a small preview
- verify artifacts
- repair failures
- rerun
- only then mark success

If blocked, record the exact blocker, missing component, future command, and evidence path.
```

## Prompt 12: Non-Mock, Evidence-First TDV

```text
Never mark success based on assistant claims.

Use real provider/backend calls when credentials exist. We are allowed to spend tokens on real validation. Mock tests are only acceptable for explicit smoke tests.

Every pass needs host-side evidence:
- browser transcript or API request
- saved .aaps file
- parse JSON
- compile/check JSON
- run directory
- events/logs
- generated artifacts
- file sizes and hashes
- screenshots where UI behavior matters
- SQLite/Markdown ledger records

If the product lies, patch the product and retest.
```

## Prompt 13: Data Organization And Artifacts

```text
Make data and artifacts well organized.

Projects may contain several workflows. Workflows may contain several programs and blocks. Blocks and program runs should have their own artifacts. Compilation records, run records, block-chat artifacts, histories, and version snapshots should be visible from the frontend.

The frontend should show artifacts for:
- block preview runs
- program runs
- compilation
- chat-created blocks
- version history

The user should be able to understand what data was used, what method was selected, what outputs were produced, and what still needs review.
```

## Prompt 14: AAPS As Project-Oriented Programming

```text
AAPS is not just a prompt wrapper.

AAPS is project-oriented and prompt-native programming for agents. It turns prompts into structured, verifiable pipelines with agents, tasks, typed inputs, declared outputs, executable actions, validation gates, recovery steps, and durable artifacts.

Codex or AgInTiFlow can be the backend, but AAPS is the source of truth for project structure, blocks, programs, workflows, data roots, declared outputs, and verification logic.
```

## Current Next Prompt To Use

Use this if continuing from the latest TDV state:

```text
Continue the AAPS Studio TDV campaign from /home/lachlan/ProjectsLFS/AAPS-Through-Test-Debug-Validation.

The current strongest next target is compile-apply manifestation:
- Use blocks/app81_backend_agent_tdv_20260506-235218.aaps.
- It parses cleanly.
- Compile-check truthfully reports missing script scripts/app81_backend_agent_tdv_20260506_235218.py.
- Now make AAPS compile/apply or backend-agent manifestation generate that script.
- The generated script must self-debug a small App81 preview run.
- Verify masks, overlays, per-image CSV/JSON metrics, summary JSON/CSV, figure, report, manifest, logs, and artifact canvas visibility.
- Do this through AAPS Studio when possible, using CLI/API only for external verification.

Patch AAPS if compile/apply cannot generate the missing implementation, if Studio cannot show artifacts, or if the backend agent cannot receive enough context to write correct AAPS/script outputs.
```
