# AAPS Report Recap Paradigm

AAPS report blocks should reconstruct the whole task from evidence. They are not
only final summaries. A good report block consumes source inputs, workflow and
project metadata, manifest/compile reports, execution logs, method comparisons,
QC decisions, agent handoff packets, validation summaries, checkpoints, final
artifacts, and known limitations.

## Required Evidence

- original user goal, workflow name, project root, active `.aaps`, and input files
- parsed workflow, manifest/compile report, readiness report, and run manifest
- method candidates, method parameters, fallback rules, and selected route
- QC metrics, agent decisions, rejected outputs, and reasons
- downstream-agent prompts, handoff packets, output schemas, and verifier reports
- final masks, overlays, tables, figures, PDFs, logs, and artifact indexes
- git/AAPS checkpoint IDs and snapshot paths when available

## Agent Handoff Reporting

When a Codex, AgInTiFlow, image-generation, vision, or verifier agent appears in
a workflow, the report should say exactly what happened. If the agent was called,
cite its prompt, input artifacts, output artifacts, schema, and verifier result.
If the agent was not called because deterministic outputs passed QC, record the
prepared prompt/template as `prepared`, `template`, or `not_needed`; do not claim
generated outputs.

For image-generation or mask-refinement handoffs, report the reference-image
policy and visual-output contract. Generated image grids should stay clean:
avoid baked-in labels, arrows, legends, table text, or captions inside the image
panel unless the task is explicitly an annotation figure. Put explanatory text
in TeX/Markdown captions, tables, or artifact notes.

## Prompt Quality

Prompts written by AAPS are executable artifacts. A downstream prompt should
include the task goal, source artifact paths, domain priors, observed defects,
failure reason, upstream visual conclusions when images are involved, method
history, expected output schema, color or format constraints, integration
policy, safety constraints, and a verifier checklist.

## CLI

```bash
aaps guide report
aaps guide report --json
```
