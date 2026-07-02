# AAPS Block Design Guide

AAPS blocks are reusable contracts around prompts, tools, code, agents,
validation, recovery, and artifacts. They are not free-form prompt notes.

## Principles

1. Respect AAPS grammar first: use `pipeline`, `agent`, `block`, `skill`,
   `task`, `stage`, `method`, `action`, `guard`, `choose`, `if`, `else`,
   `for_each`, typed `input`/`output`, `exec`, `validate`, `retry`,
   `fallback`, `repair`, `recover`, `review`, and artifact declarations.
2. Treat every reusable block as a contract: purpose, typed inputs, typed
   outputs, parameters, environment, tools, agents, scripts, executable
   actions, validations, recovery policy, artifacts, and review expectations.
3. Keep prompt context deliberately redundant: include domain assumptions, data
   shape, quality criteria, method choices, expected files, failure modes, and
   what evidence proves success.
4. Keep blocks small enough to test independently, but not so small that the
   workflow becomes unreadable.
5. Prefer deterministic scripts/tools for repeatable work and explicit agent
   blocks for interpretation, repair, method choice, or irregular data.
6. Represent routing in AAPS structure, not prose: use `choose`, `if/else`,
   `for_each`, `fallback`, `recover`, and `review` nodes where decisions
   matter.
7. When agents hand work to other agents or image generators, pass a structured
   handoff packet with source images/artifacts, QC findings, upstream
   conclusions, failure reason, high-quality prompt, expected output schema,
   integration policy, and verification criteria.
8. When parser or manifest diagnostics exist, feed the exact line/message
   evidence back into the agent and keep repairing until the same parser is
   clean, or record a precise blocker.
9. When a failure is in AAPS source parsing, parser diagnostics,
   manifest/compile readiness, runtime execution, or generated manifestation
   scripts, repair through AAPS chat/session -> parse -> manifest -> check ->
   run -> QC -> repair before any task-level success claim.
10. Manifest/compile missing implementation beneath the block contract. Do not weaken
   required inputs, outputs, GPU/tool/agent requirements, or validations just to
   pass readiness.
11. For chat-driven refinements, edit the existing manifested `.aaps`, scripts,
    prompts, registries, and report builders. Create a brand-new file only when
    a block/script/tool is genuinely missing or the user explicitly asks for a
    new artifact.
12. Every block that writes artifacts should also declare how those artifacts are
   validated and where a human or agent can inspect them.
13. Treat downstream prompts as artifacts. If a block asks Codex, AgInTiFlow, an
    image generator, or a verifier agent to continue the work, the prompt should
    include evidence paths, domain priors, QC findings, failure reason, expected
    schema, constraints, and a verifier checklist.
14. For image-generation or mask-refinement blocks, state the reference-image
    policy and visual-output contract explicitly: no embedded text, labels,
    arrows, numbers, captions, legends, or decorative repainting unless the
    task specifically requires annotation.

## Default Archetypes

- **Intent and context**: converts a user goal or experiment design into an
  auditable brief and context pack.
- **Input discovery and data curation**: scans files, metadata, chapters, app
  pages, or samples and writes manifests/tables.
- **Quality-control guard**: measures whether inputs or outputs are usable
  before expensive downstream work.
- **Method/tool/agent router**: makes choices between deterministic tools,
  models, agents, and fallbacks inspectable.
- **Loop or batch**: iterates over images, samples, documents, pages, chapters,
  or stages with per-item artifacts.
- **Code/script action**: runs project-local Python, shell, Node, or inline code
  with explicit arguments and declared outputs.
- **Agent action**: calls or prepares Codex, AgInTiFlow, DeepSeek, vision
  agents, writing agents, or repair agents for tasks that need judgment.
- **Agent handoff chain**: carries evidence, QC decisions, high-quality prompts,
  expected schemas, generated/refined outputs, and verifier reports across
  Codex, AgInTiFlow, image-generation agents, or other backend agents.
- **Image mask refinement**: asks an image-capable agent to produce a clean
  source-aligned colored instance mask with one flat color per visible instance,
  explicit reference-image policy, a plain mask background instead of a
  microscopy underlay unless the block asks for an overlay, no embedded image
  text, and verifier-gated integration.
- **Validation and recovery**: proves outputs exist and are meaningful, then
  retries, falls back, repairs, skips, or asks for review.
- **Report recap and artifact**: reconstructs the full run from original input,
  method candidates, QC decisions, agent handoffs, logs, validation summaries,
  checkpoints, final artifacts, limitations, and publication outputs.

Run `aaps guide blocks` to print the full guide with example `.aaps` snippets.
Run `aaps guide handoff` to print the image-aware adjacent-agent handoff packet
and parser-feedback gate.
Run `aaps guide report` to print the default report-recap paradigm and prompt.
