# AAPS Language Specification

**AAPS** means **Autonomous Agentic Pipeline Script**. It is a prompt-native programming language for autonomous workflows that need explicit artifacts, method routing, verification, and resumable execution.

Subtitle: **Prompt Is All You Need**.

Current parser target: `aaps_ir/0.2`.

Project manifest target: `aaps_project/0.1`. Multi-file projects use `aaps.project.json` plus project-root relative `.aaps` files. See [project-management.md](project-management.md).

## Design Goals

- Treat prompts as first-class code while making inputs and outputs explicit.
- Represent reusable work as `skill` blocks and orchestration as `task` blocks.
- Support nested `stage`, `action`, `method`, `choose`, `guard`, `if`, `else`, and `for_each` blocks.
- Preserve enough structure for future Codex and AgInTiFlow runners to pause, resume, audit, and visualize work.

## Core Blocks

| Block | Purpose |
| --- | --- |
| `pipeline` | One workflow with domain, tags, inputs, outputs, agents, skills, and tasks. |
| `agent` | Role, model, and tools that can execute or review work. |
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
| `validate` | `validate "mask is non-empty"` |
| `verify` | `verify "Mask boundaries match visible objects."` |
| `recover` | `recover "fallback to thresholding"` |
| `review` | `review "human approves low-confidence overlay"` |
| `call` | `call segment_image as segmentation` |
| `param` | `param diameter = "auto"` |
| `metric` | `metric boundary_overlap = "required"` |
| `policy` | `policy destructive_actions = "disabled"` |
| `include` | `include "blocks/qc_image.aaps"` |

Multiline prompts use triple quotes.

## Example

```aaps
pipeline "Biology Image Segmentation QC" {
  subtitle "Prompt Is All You Need"
  version "0.2"
  artifact_dir "runtime/artifacts/segmentation"
  database "runtime/aaps-runs.jsonl"
  log_path "runtime/logs/segmentation.log"
  domain "biology"
  include "blocks/qc_image.aaps"
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
3. Resolve project `include` dependencies, task dependencies, and loop expansion.
4. Execute prompts and commands through bounded adapters.
5. Persist every block state, selected method, output artifact, and QC result.
6. Require `validate`, `verify`, and `guard` checks before advancing.
7. Apply `recover` policies or `review` checkpoints when confidence is low or validation fails.
