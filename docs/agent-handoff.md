# AAPS Agent Handoff Guide

AAPS treats adjacent agent blocks as typed workflow edges. A Codex block that
inspects images, an AgInTiFlow image-generation block, and a verifier block
should not rely on transient chat memory. They should exchange durable
project-local artifacts.

## Required Handoff Packet

Write a JSON handoff packet before calling the downstream agent:

- task goal and active workflow/block
- source image, crop, overlay, table, report, and log paths
- upstream visual conclusions and QC defects
- reason the downstream agent is needed
- method history and rejected candidates
- exact downstream prompt path
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

## CLI

```bash
aaps guide handoff
aaps prompt "Inspect these images and build a handoff chain" --image data/example.png --project .
```
