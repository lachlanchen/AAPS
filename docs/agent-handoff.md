# AAPS Agent Handoff Guide

AAPS treats adjacent agent blocks as typed workflow edges. A Codex block that
inspects images, an AgInTiFlow image-generation block, and a verifier block
should not rely on transient chat memory. They should exchange durable
project-local artifacts.

When the handoff changes a project, AAPS should version both the `.aaps`
workflow contract and the manifested implementation underneath it: generated
Python/shell scripts, prompts, registry entries, integration manifests, run
logs, and report builders. Use project-local git checkpoints or AAPS snapshots
before and after agent-backed manifestation so a user can diff the workflow and
the code it produced.

## Required Handoff Packet

Write a JSON handoff packet before calling the downstream agent:

- task goal and active workflow/block
- source image, crop, overlay, table, report, and log paths
- upstream visual conclusions and QC defects
- reason the downstream agent is needed
- method history and rejected candidates
- exact downstream prompt path
- reference-image policy: which images are visual references and which masks or
  overlays are text-only QC context
- visual-output contract, including color/format rules and whether embedded
  labels, arrows, captions, legends, or text are forbidden
- expected output schema and artifact paths
- integration policy for accepted generated outputs
- verifier checklist and acceptance threshold

If the downstream image generator or agent is unavailable, record the handoff
status as `prepared`, `template`, or `blocked`. Do not claim regenerated results
unless the output artifacts and verifier report exist.

## Image-Aware Chain

A typical image workflow should be:

```text
Codex/vision QC -> handoff_packet.json -> AgInTi/image generation or refinement
-> integration_manifest.json -> Codex/verifier -> accepted pipeline outputs
```

The verifier must compare generated/refined artifacts with the source images and
candidate outputs. Accepted artifacts should be copied or referenced through the
main workflow outputs so final reports and Studio artifact views can find them.
If the verifier rejects the generated result, AAPS should feed the verifier's
concrete visual defects and failed artifact checks back into the next AgInTi
prompt, regenerate within the declared retry limit, and record every attempt.

For colored instance-mask generation, the default policy is strict: use the
original source image as the visual reference, describe prior masks/overlays as
textual QC context unless a verifier asks for extra visual references, and
request one flat distinct color per visible instance with no embedded text,
numbers, labels, arrows, captions, legends, table labels, or whole-cluster
single-object annotation inside the image. If the requested artifact is a mask
rather than an overlay, use a plain black, white, or transparent background and
do not keep grayscale microscopy texture under the colors.

## Parser Feedback Gate

Agent-written `.aaps` is not complete until the deterministic parser accepts it.
If `aaps parse` or Studio diagnostics report errors, the next agent prompt must
include the exact line/message diagnostics, repair the source, and rerun:

```bash
aaps parse workflows/main.aaps --project . --json
aaps validate workflows/main.aaps --project . --json
aaps manifest workflows/main.aaps --project . --mode check --json
```

Finish only when diagnostics are empty, or record the precise blocker and
affected file.

When the failure is in AAPS source parsing, parser diagnostics,
manifest/compile readiness, runtime execution, or generated manifestation
scripts, the agent path must continue through AAPS chat/session -> parse ->
manifest -> check -> run -> QC -> repair before any task-level success claim.

## CLI

```bash
aaps guide handoff
aaps prompt "Inspect these images and build a handoff chain" --image data/example.png --project .
```
