# AAPS Language Specification

**AAPS** means **Autonomous Agentic Pipeline Script**. It is a small, prompt-native programming language for describing autonomous work as explicit agents, tasks, dependencies, commands, checks, and outputs.

The guiding subtitle is: **Prompt Is All You Need**.

## Design Goals

- Keep prompts as first-class executable artifacts.
- Make autonomous work resumable by naming every task.
- Preserve human review points through `verify`, `output`, and dependency edges.
- Compile cleanly to JSON IR, Markdown runbooks, CI jobs, or agent runtime calls.

## Core Concepts

| Concept | Purpose |
| --- | --- |
| `pipeline` | Names one autonomous workflow. |
| `input` | Declares runtime variables such as repo paths, URLs, or goals. |
| `agent` | Defines a role, model, and tools for execution. |
| `task` | Defines one prompt-driven unit of work. |
| `after` | Declares dependency ordering between tasks. |
| `run` | Adds deterministic commands to execute. |
| `verify` | States acceptance checks before a task is complete. |
| `output` | Names artifacts the task should produce. |

## Example

```aaps
pipeline "Ship AAPS Studio" {
  subtitle "Prompt Is All You Need"
  goal "Build, verify, and publish a web studio."
  input repo = "./"

  agent builder {
    role "Senior engineer for autonomous product work."
    model "gpt-5"
    tools "shell, git, browser"
  }

  task discover {
    uses builder
    prompt """
Read the repository and produce a concise implementation plan.
"""
    output "docs/plan.md"
  }

  task implement after discover {
    uses builder
    prompt "Create the product surface, language examples, and tests."
    run "npm test"
    verify "All tests pass and the website renders."
    retry 1
  }
}
```

## Syntax Notes

- Comments start with `#` or `//`.
- Strings can be quoted with single or double quotes.
- Multiline prompts use triple quotes: `prompt """ ... """`.
- Task dependencies use comma-separated names: `task deploy after test, build {`.
- Parsers should preserve unknown statements as diagnostics rather than silently ignoring them.

## Runtime Contract

An AAPS runtime should:

1. Parse `.aaps` into `aaps_ir/0.1`.
2. Resolve task dependencies into an execution graph.
3. Execute each task prompt with the selected agent.
4. Run deterministic `run` commands where present.
5. Require `verify` checks before advancing.
6. Persist task state so the pipeline can pause and resume.

