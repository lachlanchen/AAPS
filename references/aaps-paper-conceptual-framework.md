# AAPS Paper Conceptual Framework

This reference captures a Nature-style writing prompt and a draft conceptual
description for introducing AAPS as a scientific workflow language and agentic
harness.

## Manuscript Writing Prompt

Use the following prompt to draft or revise a paper section about AAPS.

```text
You are helping write a high-impact scientific manuscript introducing AAPS,
the Autonomous Agentic Pipeline Script language and studio. Write in a clear
Nature-style tone: precise, conceptual, technically grounded, and restrained.

Core thesis:
AAPS is a structured harness around AI agents. It turns natural-language
scientific intent into readable, editable, auditable, compilable, and
executable workflow programs. Unlike loose prompting, AAPS separates intent,
block contracts, parsing, compilation, execution, validation, recovery, and
reporting.

Emphasize these ideas:
1. The main programming interface is natural language through a GUI and
   agent-based writing interface.
2. AAPS supports top-down scientific workflow design: scientists describe
   experiments and analysis logic at the level they naturally think, then
   refine them into reusable task blocks.
3. Each block has typed inputs, outputs, tools, agents, validation, artifacts,
   and recovery policies.
4. The parser is one facet of the harness: it converts readable `.aaps`
   scripts into structured intermediate representations.
5. The compiler is another facet of the harness: it resolves missing blocks,
   scripts, binaries, tools, dependencies, and agents; it can generate code or
   prepare repair/setup prompts.
6. The runtime executes blocks, logs artifacts, validates results, routes
   failures, and supports human review.
7. Agentic behavior appears in three places: writing the workflow, compiling
   blocks into runnable code/tools, and executing dynamic steps inside the
   pipeline such as QC, metadata interpretation, method routing, and repair.
8. The system is especially useful for biomedical image analysis, organoid
   segmentation/quantification, app automation, and long-form scientific or
   creative writing pipelines.

Write sections:
- Summary paragraph
- Design motivation
- AAPS language model
- Harness layers
- Natural-language-first programming
- Top-down workflow design
- Block contracts
- Agent-based compilation
- Dynamic execution and routing
- Human-in-the-loop safety
- Why this is a contribution beyond prompts, notebooks, and workflow managers
- Example biomedical use case
- Limitations and future work

Avoid hype. Present AAPS as a practical research system and language
abstraction, not as a finished universal automation solution.
```

## Draft Paper Section

### AAPS: A Natural-Language Harness for Agentic Scientific Workflows

AAPS, short for Autonomous Agentic Pipeline Script, is a structured workflow
language and studio for converting scientific intent into inspectable,
editable, executable agentic programs. Its central premise is that prompting
alone is not a sufficient programming model for reliable scientific
automation. Modern AI agents are powerful, but their behavior is often
implicit, difficult to audit, and hard to reproduce. AAPS addresses this by
placing agents inside a typed, structured, and recoverable workflow harness.

The primary contribution of AAPS is a programming abstraction in which natural
language becomes the main authoring interface while the resulting program
remains explicit and machine-readable. Instead of asking an AI agent to
"analyze these images" or "write this pipeline" as a single opaque request,
AAPS represents the workflow as a hierarchy of workflows, blocks, actions,
routing rules, validations, artifacts, and recovery policies. This creates a
middle layer between free-form prompting and conventional programming:

```text
scientific intent
-> natural-language workflow design
-> .aaps script
-> parser
-> intermediate representation
-> agent/compiler resolution
-> execution plan
-> block execution
-> validation and recovery
-> report and artifacts
```

The important shift is that the agent is no longer the whole system. The agent
becomes one component inside a larger harness.

### Natural-Language-First Programming

AAPS is designed around a graphical studio and an agent-based writing
interface. The user can describe an experiment, analysis plan, software task,
or writing workflow in natural language. The system then helps turn that
description into structured `.aaps` code.

This design is especially relevant for biology and biomedical image analysis,
where domain experts often reason top-down:

```text
experiment goal
-> sample groups
-> imaging protocol
-> quality control
-> segmentation method
-> quantification metrics
-> statistical comparison
-> biological conclusion
```

AAPS preserves this natural style of scientific reasoning. The scientist begins
with the overview and progressively refines the workflow into executable
blocks.

### Top-Down Experimental Design

In AAPS, a workflow starts from the conceptual level familiar to domain
experts. For example, an organoid image analysis workflow may begin as:

```text
Analyze organoid growth from microscopy images.
Check image quality.
Segment organoids.
Measure area, count, compactness, and intensity.
Export masks, overlays, tables, and summary reports.
Ask for human review when confidence is low.
```

AAPS converts this into a structured program with explicit components:

```aaps
workflow organoid_growth_analysis:
  input:
    image_folder: folder required

  output:
    summary_report: markdown
    object_table: csv
    overlays: folder

  for image_path in list_files(${input.image_folder}, pattern="*.png"):
    run qc_image(image_path)

    if qc_image.blur_score > threshold:
      run enhance_image(image_path)
    else:
      run segment_organoid(image_path)

    run quantify_organoid(mask_path)
    run validate_measurements(object_table)

  run summarize_batch
  review approve_summary
```

The resulting `.aaps` file is both readable by humans and usable by machines.

### The Harness Concept

AAPS treats reliable agentic automation as a harnessing problem. The harness
has several facets.

First, the script language captures intent, structure, constraints, and
provenance. It records what should happen, what each block consumes and
produces, and how success is judged.

Second, the parser converts the script into a structured intermediate
representation. This prevents the workflow from remaining a loose prompt.
Blocks, inputs, outputs, actions, conditions, loops, validations, artifacts,
and human checkpoints become explicit objects.

Third, the compiler converts block intent into runnable implementation. It
resolves missing scripts, dependencies, tools, models, and agents. Where safe,
it can generate local scripts or reusable `.aaps` blocks. Where unsafe or
underspecified, it prepares setup prompts or asks for human approval.

Fourth, the runtime executes the resolved workflow, captures logs, writes
artifacts, validates outputs, handles failure, and records repair attempts.

Together, these layers make agent behavior inspectable, reproducible, and
recoverable.

### Block Contracts

The fundamental unit of AAPS is the block. A block is not merely a prompt. It
is a functional contract:

```text
block = inputs + outputs + parameters + tools + agents + environment
        + actions + validation + recovery + artifacts
```

For example, an image segmentation block may declare:

```aaps
block segment_organoid:
  purpose: segment organoids from microscopy images

  input:
    image_path: file required
    qc_report: json optional

  output:
    mask_path: image
    overlay_path: image
    object_table: csv

  tools:
    primary: threshold_segmentation
    fallback: cellpose_or_manual_review

  action segment:
    type: python_script
    entry: scripts/threshold_segment.py
    args:
      input_image: ${input.image_path}
      output_mask: ${output.mask_path}
      output_overlay: ${output.overlay_path}
      output_table: ${output.object_table}

  validate:
    exists: ${output.mask_path}
    mask_not_empty: ${output.mask_path}
    exists: ${output.object_table}

  on_error:
    retry: 1
    fallback: manual_review
    repair_prompt: true
```

This makes each unit independently understandable, testable, and replaceable.

### Agent-Based Compilation

AAPS introduces agentic compilation as a central idea. The compiler does not
only translate syntax. It resolves a partially specified workflow into a
runnable system.

If a block references `segment_organoid` but no script exists, the compiler
can:

- search existing project blocks,
- inspect imported workflows,
- check the tool registry,
- check the agent registry,
- generate a minimal local script,
- update requirements,
- prepare a setup prompt,
- or ask the user for approval.

This turns divide-and-conquer into a formal part of the programming model. The
user describes the workflow at the scientific level; the compiler decomposes
missing implementation into smaller actionable tasks.

### Dynamic Agent Use Inside Pipelines

Agents also appear inside the pipeline itself. Some tasks are irregular,
context-dependent, or not well captured by fixed scripts. Examples include:

- interpreting heterogeneous metadata,
- deciding whether an image is too blurry,
- selecting between thresholding, Cellpose, SAM, or manual review,
- detecting failed segmentation,
- generating a repair prompt,
- summarizing biological conclusions.

AAPS supports these cases by allowing blocks to route between deterministic
tools and agentic decisions. The key difference from free-form prompting is
that the agent's role, inputs, outputs, and validation criteria remain
explicit.

### Human-in-the-Loop Control

AAPS does not assume full automation is always desirable. Scientific workflows
often require expert judgment. The language therefore supports human review
checkpoints, such as:

```aaps
review approve_segmentation:
  artifact: ${output.overlay_path}
  question: approve mask quality before quantification
```

This allows automation to accelerate routine work while preserving expert
control at critical points.

### Relation to Existing Workflow Forms

AAPS differs from notebooks, workflow managers, and loose agent prompts.

Compared with notebooks, AAPS separates workflow structure from exploratory
execution and makes block contracts explicit.

Compared with traditional workflow engines, AAPS treats natural-language
intent, agentic compilation, dynamic method routing, and repair as first-class
concepts.

Compared with prompting, AAPS makes the program visible. The user can inspect
the workflow, edit blocks, validate outputs, rerun steps, and review
artifacts.

The contribution is therefore not simply another automation tool. It is a
language-level harness for agentic computation.

### Biomedical Example

In organoid image analysis, AAPS can express the full experimental logic:

```text
generate or load image data
-> perform image QC
-> choose segmentation method
-> generate masks and overlays
-> quantify objects
-> validate measurements
-> route failures to fallback or human review
-> summarize results
-> export reports and artifacts
```

This is useful because segmentation is rarely a single universal operation.
Image blur, brightness, density, morphology, and staining conditions can change
which method is appropriate. AAPS makes this decision process explicit and
auditable.

### Future Direction

AAPS can be extended into a broader scientific programming environment where
reusable domain blocks are shared across projects. Future work includes
stronger formal type checking, richer execution backends, benchmarked repair
strategies, provenance-aware databases, validated biomedical block libraries,
and tighter integration with laboratory data systems.

The long-term goal is to make agentic workflows programmable without hiding
their behavior. In AAPS, natural language expresses intent, but the harness
turns that intent into structured, testable, and recoverable scientific
computation.
