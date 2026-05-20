# AAPS Nature-Style Figure Prompt For DEO Manuscript

Reference screenshot:

- `references/figure-prompts/aaps-ui-reference-20260520.png`

Use the screenshot only as a layout heuristic. Do not copy the UI literally. Abstract its backbone into a clean scientific figure: left project/workflow context, center program structure, right reusable skills, and bottom/back-end agent compiler/runtime layer.

## Manuscript Context

The figure should support the manuscript story: AAPS is a structured, human-guided agentic workflow harness for heterogeneous droplet-engineered organoid (DEO) brightfield image analysis. It links experimental design, metadata organization, image quality control, segmentation routing, metric calculation, visualization, and reporting through explicit artifacts, validation checkpoints, and human review.

Key manuscript logic:

- DEO images vary in brightness, magnification, object size, density, fusion state, and quality.
- A single fixed image-processing method is insufficient, while unconstrained AI-agent behavior is hard to audit.
- AAPS follows a register-inspect-route-segment-verify-quantify pattern.
- The workflow preserves source image paths, metadata, masks, overlays, metric JSON, summary CSV files, database tables, figures, and manifests.
- Agentic behavior is controlled by the `.aaps` program, typed block contracts, parser, compiler, runtime, validation, and human review.

## Figure Design Prompt

Create a polished multi-panel scientific figure suitable for a Nature-family manuscript. Use a light background, restrained vivid accents, thin vector lines, rounded but not overly decorative panels, and precise typography. The figure should explain the AAPS concept rather than reproduce a software screenshot. Use a clean white/very-light-gray canvas with teal, cyan, soft blue, and warm amber accents. Make the figure readable at journal scale.

Overall title: **AAPS: a structured harness for agentic organoid image analysis**

Make five labeled panels, with lowercase panel letters **a-e** in bold at the top-left of each panel.

### Panel a: Project-aware AAPS workspace

Show a simplified left-side workspace inspired by the AAPS Studio UI. Represent one project as a topic workspace containing many `.aaps` files, not one project equals one file.

Visual elements:

- A project card labeled **DEO organoid analysis project**.
- A small stack/list of `.aaps` files: `dataset_registration.aaps`, `image_qc.aaps`, `segmentation_routing.aaps`, `metric_quantification.aaps`, `report_generation.aaps`.
- Small icons for data folders, artifacts, run logs, and reports.
- A thin arrow from project context to the program panel.

Message: AAPS organizes a scientific project as many reusable workflow scripts, blocks, data folders, artifacts, and run histories.

### Panel b: Top-down GUI program design

Use the central Studio Program column as inspiration, but draw an abstract program tree rather than a screenshot. Show a vertical/nested workflow:

1. Register raw images and metadata
2. Inspect image quality and experimental context
3. Route segmentation method
4. Segment organoids
5. Verify mask and overlay
6. Quantify growth, differentiation, and fusion metrics
7. Summarize biological conclusions

Show nested indentation and branching:

- A loop container: **for each image**
- A condition branch: **if low confidence -> human review / correction**
- A route branch: **Cellpose / thresholding / signal recovery / prompt-guided correction**

Message: Scientists design from the biological experiment downward; AAPS turns this into an editable, structured program.

### Panel c: Reusable blocks and skills

Use the right Studio Blocks & Skills column as inspiration. Draw small modular block cards with typed ports:

- `image_qc`: inputs `image`, `metadata`; outputs `qc_report`, `preview`
- `segment_organoid`: inputs `image`, `qc_report`; outputs `mask`, `overlay`, `instances`
- `quantify_metrics`: inputs `mask`, `image`; outputs `area`, `darkness_P90`, `fusion_score`
- `review_overlay`: inputs `overlay`, `confidence`; outputs `approval`, `correction`

Each block should show small port dots or mini input/output labels. Add a callout:

**Block contract = inputs + outputs + tools + agent + validation + artifacts**

Message: Blocks are small auditable units, not opaque prompts.

### Panel d: Parser, grammar, and agent-based compiler

Draw this as the backend harness below or behind panels b-c. Use a pipeline diagram:

`.aaps script -> parser -> structured IR -> compiler -> resolved workflow -> execution plan`

Add a small recursive fill-in motif: empty block outlines become filled with code/script/tool cards through agent-based compilation. Show a top-down arrow labeled **recursive module filling** from high-level program nodes into concrete implementations:

- Missing block -> generate reusable `.aaps` block
- Missing script -> write Python/shell script
- Missing tool -> report setup or select fallback
- Missing dependency -> prepare safe setup prompt
- Ambiguous result -> ask human review

Message: The parser is deterministic; the compiler resolves missing code, scripts, tools, dependencies, and agents while preserving provenance.

### Panel e: Controlled execution and biological outputs

Show the DEO application output layer. Draw a concise flow from brightfield image tiles to masks/overlays to quantified plots and a report:

- Input: heterogeneous DEO brightfield images
- QC: brightness, blur, density, object scale
- Segmentation: instance masks and overlays
- Metrics: growth area, darkness P90, fusion score
- Outputs: database tables, summary CSV, plots, figure panels, report
- Checkpoints: validation, retry/fallback, human approval

Message: AAPS converts heterogeneous organoid images into reproducible quantitative phenotypes and auditable biological conclusions.

## Composition

Recommended layout:

- Wide landscape figure, approximately 16:9 or journal double-column width.
- Top row: panel a at left, panel b large in center, panel c at right.
- Bottom row: panel d as a horizontal compiler/harness layer under a-c, panel e as the execution/output layer connected to d.
- Use arrows to show flow: project -> program -> blocks -> compiler -> execution -> artifacts.
- Use dashed arrows for agent-assisted generation/repair and solid arrows for deterministic parse/execute steps.
- Use small lock/check icons for validation and human review checkpoints.

## Text Labels To Include

Use these exact short labels if possible:

- Project context
- Many `.aaps` workflows
- Top-down program
- Typed block contracts
- Parser
- Structured IR
- Agent compiler
- Execution plan
- QC and method routing
- Segmentation and metrics
- Validation and human review
- Artifacts and report

## Visual Style

- Nature-style clean vector illustration.
- Light background; no black or dark theme.
- Minimal gradients; if used, very subtle.
- Use readable sans-serif typography.
- Avoid excessive UI chrome, shadows, or decorative effects.
- Avoid photorealistic software screenshots.
- Do not show real file paths, usernames, emails, secret keys, or local directory names.
- Do not overemphasize "AI magic"; emphasize structured control, auditability, and reproducibility.

## Optional Caption Draft

**Figure X | AAPS as a structured harness for agentic DEO image analysis.**  
**a,** AAPS organizes a scientific project as a workspace containing multiple `.aaps` workflows, reusable blocks, data folders, artifacts, run logs, and reports. **b,** A top-down GUI program represents the biological analysis plan as an editable workflow with loops, branches, method routing, validation, and human-review checkpoints. **c,** Reusable blocks define typed contracts for image quality control, organoid segmentation, metric quantification, and overlay review. **d,** The deterministic parser converts `.aaps` into structured intermediate representations, while the agent-based compiler recursively fills unresolved modules by generating or resolving blocks, scripts, tools, dependencies, setup prompts, and repair prompts. **e,** During execution, heterogeneous DEO brightfield images are routed through QC, segmentation, verification, quantification, and reporting to produce masks, overlays, metrics, database tables, plots, and auditable biological conclusions.

## Negative Prompt / Things To Avoid

Do not create a literal screenshot replica. Do not use dark backgrounds. Do not include cluttered UI lists, unreadable tiny text, or fake scientific plots with precise numerical claims. Do not imply that the AI agent acts unconstrained. Do not omit validation, human review, artifacts, or provenance.
