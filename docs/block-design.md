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
7. Compile missing implementation beneath the block contract. Do not weaken
   required inputs, outputs, GPU/tool/agent requirements, or validations just to
   pass readiness.
8. Every block that writes artifacts should also declare how those artifacts are
   validated and where a human or agent can inspect them.

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
- **Validation and recovery**: proves outputs exist and are meaningful, then
  retries, falls back, repairs, skips, or asks for review.
- **Report and artifact**: collects figures, tables, logs, decisions,
  limitations, and final reports into durable outputs.

Run `aaps guide blocks` to print the full guide with example `.aaps` snippets.
