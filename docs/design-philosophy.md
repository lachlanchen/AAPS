# AAPS Design Philosophy

AAPS treats prompts as executable design intent, but it does not let intent blur execution. Every useful autonomous workflow is represented as named blocks with explicit inputs, outputs, routing rules, verification, and artifacts.

## Core Philosophy

1. **Prompt is code, artifact is truth.** A prompt can decide, inspect, or synthesize, but each block must declare what it consumes and what it produces.
2. **Blocks are small operators.** A `skill` is a reusable function. A `task` orchestrates skills. `stage`, `method`, and `action` blocks describe the small work inside a skill.
3. **Routing is explicit.** When a workflow can choose Cellpose, thresholding, a vision-mask model, or a human review path, that choice belongs in `choose`, `if`, `else`, and `guard` blocks.
4. **Vision-first does not mean model-only.** For biology, an agent may inspect an image, build priors, route to Cellpose or thresholding, then use a prompt model for QC and exception handling.
5. **Chat is memory; actions are API calls.** Following the LazyBlog pattern, chat can propose, explain, and route. Source mutation happens through bounded edit actions that reparse and render the program.
6. **Every block owns its boundary.** Inputs, outputs, metrics, run commands, and checks are declared near the block that owns them.
7. **Runtimes must be resumable.** AAPS IR preserves IDs and dependency edges so future Codex or AgInTiFlow runtimes can pause, resume, and audit work.
8. **Failure is a first-class path.** `validate`, `recover`, and `review` statements make fallback routes, skipped inputs, retries, and human approval visible in the script.

## Segmentation Example

A segmentation skill should not be one vague command. It should be a small pipeline:

```aaps
skill segment_image {
  input image: image
  output mask: image
  stage inspect {
    prompt "Describe modality, contrast, objects, and risks."
  }
  choose method_router {
    prompt "Choose cellpose, thresholding, or vision_mask."
  }
  if "selected_method == 'cellpose'" {
    method cellpose {
      run "python tools/run_cellpose.py --image {{image}} --out {{mask}}"
    }
  }
  else {
    method threshold_or_vision {
      prompt "Try thresholding; escalate to a vision mask model if needed."
    }
  }
  stage qc {
    validate "Mask is non-empty and object count is plausible."
    recover "Fallback to another method when QC fails."
    review "Human approves low-confidence overlay."
  }
}
```

The important abstraction is not the specific model. It is the handoff contract: image in, mask and QC report out, with method selection recorded as data.
