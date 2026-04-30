# AAPS Language Specification

**AAPS** means **Autonomous Agentic Pipeline Script**. It is a prompt-native programming language for autonomous workflows that need explicit artifacts, method routing, verification, and resumable execution.

Subtitle: **Prompt Is All You Need**.

Current parser target: `aaps_ir/0.2`.

Project manifest target: `aaps_project/0.1`. Multi-file projects use `aaps.project.json` plus project-root relative `.aaps` files. See [project-management.md](project-management.md).

Compile target: `aaps_compile_report/0.1`. The compiler is a separate phase after parsing and before planning/execution. It resolves missing project-local blocks, scripts, tools, agents, dependencies, setup prompts, and provenance without making parsing nondeterministic. See [compiler.md](compiler.md).

## Design Goals

- Treat prompts as first-class code while making inputs and outputs explicit.
- Represent reusable work as `skill` blocks and orchestration as `task` blocks.
- Support nested `stage`, `action`, `method`, `choose`, `guard`, `if`, `else`, and `for_each` blocks.
- Preserve enough structure for Codex, agent wrappers, and future AgInTiFlow runners to preflight, compile missing code/setup, execute, recover, pause, resume, audit, and visualize work.

## Core Blocks

| Block | Purpose |
| --- | --- |
| `pipeline` | One workflow with domain, tags, inputs, outputs, agents, skills, and tasks. |
| `agent` | Role, model, and tools that can execute or review work. |
| `block` | Small reusable capability that can live in its own `.aaps` file. |
| `skill` | Reusable function-like block with typed ports and internal stages/actions. |
| `task` | Top-level orchestration step; may `call` skills and depend on other tasks. |
| `stage` | Human-readable phase inside a skill or task. |
| `action` | Small executable unit, usually with `run`, `prompt`, or `verify`. |
| `method` | Alternative implementation path, such as `cellpose` or `thresholding`. |
| `choose` | Prompt or rule-based router that records a selected method/action. |
| `guard` | QC gate with metrics and verification requirements. |
| `if` / `else` | Conditional branch. |
| `for_each` | Loop over a collection. |

## Statements

| Statement | Example |
| --- | --- |
| `input` | `input image: image required = "sample.png"` |
| `output` | `output mask: image = "runtime/mask.png"` |
| `artifact` | `artifact overlay: image = "runtime/overlay.png"` |
| `prompt` | `prompt "Inspect the image and choose a method."` |
| `run` | `run "npm test"` |
| `exec` | `exec shell "python3 scripts/qc.py --out artifacts/qc.json"` |
| `arg` | `arg image_path = "data/raw/example.tif"` |
| `validate` | `validate "mask is non-empty"` |
| `verify` | `verify "Mask boundaries match visible objects."` |
| `recover` | `recover "fallback to thresholding"` |
| `repair` | `repair true` |
| `fallback` | `fallback "run: python3 scripts/basic_qc.py"` |
| `review` | `review "human approves low-confidence overlay"` |
| `call` | `call segment_image as segmentation` |
| `param` | `param diameter = "auto"` |
| `metric` | `metric boundary_overlap = "required"` |
| `policy` | `policy destructive_actions = "disabled"` |
| `include` | `include "blocks/qc_image.aaps"` |
| `import` | `import block "blocks/qc_image.aaps" as qc_image` |
| `requires_commands` | `requires_commands "python3, git"` |
| `requires_files` | `requires_files "scripts/qc_image.py"` |
| `requires_python_packages` | `requires_python_packages "numpy, scikit-image"` |
| `requires_agents` | `requires_agents "codex_repair_agent"` |
| `requires_tools` | `requires_tools "threshold_segmentation"` |
| `environment` | `environment python = "python3"` |
| `compile_agent` | `compile_agent "codex_repair_agent"` |
| `compile_prompt` | `compile_prompt "Create missing project-local scripts safely."` |
| `tool` | `tool "threshold_segmentation"` |
| `test` | `test sample_input = "data/demo/example.pgm"` |
| `execution_mode` | `execution_mode "local_deterministic"` |
| `safety` | `safety allow_destructive_shell = "false"` |

Multiline prompts and inline executable code use triple quotes:

```aaps
action write_report {
  output report: json = "${run.artifacts}/report.json"
  exec python_inline
  code """
from pathlib import Path
Path("runtime/report.json").write_text('{"ok": true}\\n', encoding="utf-8")
"""
  validate json "${output.report}"
}
```

Supported executable action types in the current runtime are `shell`, `sh`, `bash`, `python_script`, `python`, `python_inline`, `node_script`, `npm_script`, `agent`, `manual`, `noop`, and `internal` (recorded unless an adapter is registered).

## Functional Block Contract

A reusable block is executable when its contract is complete:

```aaps
block segment_image {
  purpose "Segment one microscopy image."
  input image_path: image required
  output mask_path: image = "${run.artifacts}/${item.stem}.mask.pgm"
  environment python = "python3"
  requires_commands "python3"
  requires_tools "threshold_segmentation"
  requires_files "scripts/threshold_segment.py"
  compile_agent "codex_repair_agent"
  exec python_script "scripts/threshold_segment.py"
  arg image_path = "${input.image_path}"
  arg mask_path = "${output.mask_path}"
  validate exists "${output.mask_path}"
  validate mask_not_empty "${output.mask_path}"
  repair true
}
```

The plan records inputs, outputs, parameters, environment, tools, agents, scripts, executable actions, validation rules, recovery, tests, and source file for each block.

## Example

```aaps
pipeline "Biology Image Segmentation QC" {
  subtitle "Prompt Is All You Need"
  version "0.2"
  artifact_dir "runtime/artifacts/segmentation"
  database "runtime/aaps-runs.jsonl"
  log_path "runtime/logs/segmentation.log"
  domain "biology"
  import block "blocks/qc_image.aaps" as qc_image
  requires_commands "python3"
  input image_batch: collection required = "data/images"
  output metrics: table = "runtime/metrics.csv"

  agent vision_scientist {
    role "Route between deterministic tools and vision models."
    model "gpt-5"
    tools "image_viewer, cellpose, thresholding, vision_mask"
  }

  skill segment_image {
    input image: image
    output mask: image
    stage inspect {
      prompt "Describe modality, contrast, artifacts, and segmentation risks."
    }
    choose method_router {
      prompt "Choose cellpose, thresholding, or vision_mask."
      output selected_method: json
    }
    if "selected_method.method == 'cellpose'" {
      method cellpose {
        run "python tools/run_cellpose.py --image {{image}} --out {{mask}}"
        verify "Mask boundaries match visible objects."
      }
    }
    else {
      method threshold_or_vision {
        prompt "Try thresholding; escalate to a vision mask model if confidence is low."
      }
    }
    guard qc_gate {
      metric boundary_overlap = "required"
      validate "Mask is non-empty."
      verify "Object count, area, and artifact checks pass."
      recover "Fallback to another method if QC fails."
      review "Human approves low-confidence overlays."
    }
  }

  task analyze_batch {
    uses vision_scientist
    for_each image in "image_batch" {
      action analyze_one {
        call segment_image
      }
    }
  }
}
```

## Runtime Contract

An AAPS runtime should:

1. Parse `.aaps` into `aaps_ir/0.2`.
2. Validate ports, dependencies, calls, and branch structure.
3. Resolve project `include` dependencies, task dependencies, loop iterators, registries, and runtime variables.
4. Preflight block readiness for inputs, scripts, commands, packages, tools, agents, and output paths.
5. Execute prompts and commands through bounded adapters.
6. Persist every block state, selected method, output artifact, and QC result.
7. Require `validate`, `verify`, and `guard` checks before advancing.
8. Apply `recover` policies or `review` checkpoints when confidence is low or validation fails.

The current runtime implements project-aware imports, loop execution over `list_files(...)`, shell/Python/Node/noop/manual/agent-prompt adapters, run logs, artifact checks, `exists` / `nonempty` / `json` / `mask_not_empty` validation, retry, fallback commands or fallback block IDs, readiness reports, setup prompts, and repair request files. See [runtime.md](runtime.md).

The current compiler implements `check`, `suggest`, `apply`, `interactive`, and `force` modes. It reads parser diagnostics and readiness checks, reports missing blocks/scripts/tools/agents/binaries/packages/inputs, generates safe local `.aaps` blocks and Python scripts when requested, writes setup and Codex prompts, and stores compile provenance under `runs/<timestamp>_compile/`.
