We now have a general AAPS Studio and a general parser. I want to make AAPS genuinely usable as a structured harness for building, editing, parsing, visualizing, and executing agentic workflows.

Please work deeply and one by one. Do not only make superficial UI changes. The goal is to turn AAPS into a practical workflow language and studio.

Context:
The local web app runs at:

http://127.0.0.1:8796/

I am thinking the web app should have at least two main tabs:

1. Chat / Builder tab
2. Script / Visual Studio tab

The Chat / Builder tab should be used to prepare blocks, skills, and small reusable functions. These blocks may be used for biology image analysis, app development, book writing, novel writing, and other agentic workflows.

Example source projects and public project patterns to learn from:

- AutoAppDev
- HeyCyan
- lightmind-rokit
- VoicAbyss
- OrganoidQuant
- OrganoidCompactnessAnalysis
- leonardsusskind
- LazyEarn
- LazyLearn
- OrganoidAgent
- EchoMind
- LazyBlog Studio

Some of these contain pipeline scripts, book/script workflows, app generation workflows, and agentic analysis logic. Please inspect them carefully where accessible and learn their pipeline philosophy.

Main goal:
Design and implement AAPS as a general-purpose, structured, auditable agentic workflow system.

AAPS should not be a loose prompt collection. It should be a clear workflow language where each block has inputs, outputs, actions, routing rules, conditions, loops, tool choices, validation, and artifacts.

The core design philosophy should be:

AAPS = structured harness around AI agents.

Pure AI-agent behavior is powerful but difficult to control. AAPS should provide the harness that makes agent behavior inspectable, editable, reproducible, and safe. The harness should manage:

- data inputs
- image/text/code/document quality control
- task routing
- method selection
- segmentation or processing choices
- quantification and metrics
- artifact storage
- database/logging
- visualization
- conclusions and reports
- human review
- retry and recovery logic
- versioning of blocks and workflows

Please abstract this philosophy clearly from the existing scripts and encode it into the grammar, parser, web app, README, and website.

Part 1 — Improve the AAPS language philosophy, grammar, and parser

Please inspect the current grammar/parser implementation first.

Then extend the AAPS grammar so that it can elegantly describe real workflows, not only simple linear pipelines.

The grammar should support at least:

1. Workflow metadata

Example concepts:

- workflow name
- description
- domain
- version
- author
- created/updated time
- tags
- expected inputs
- expected outputs
- required tools/models
- artifact directory
- database/log path

2. Typed inputs and outputs for every block

Each block should explicitly declare:

- input names
- input types
- optional/required status
- output names
- output types
- artifact paths
- validation rules

For example, a segmentation block might receive:

- image_path
- image_metadata
- qc_report

And produce:

- mask_path
- overlay_path
- segmentation_report
- object_table

3. Blocks / skills / functions

A block should represent a small reusable capability.

Each block should include:

- name
- purpose
- inputs
- outputs
- actions
- tool/model choices
- parameters
- validation
- failure handling
- notes
- human review requirement, if needed

4. Small actions inside each block

A block should not be a black box. It should support small action steps such as:

- inspect input
- run quality control
- choose method
- call tool/model
- postprocess output
- validate output
- save artifact
- summarize result

For example, a biology segmentation block may contain:

- inspect microscopy image
- evaluate brightness, contrast, blur, density, and organoid size
- choose segmentation route
- use thresholding, Cellpose, SAM, ChatGPT Image, Nanobanana, or another vision model depending on the image and task
- generate mask
- clean mask
- compute object properties
- validate mask quality
- export overlay and table
- request human review if confidence is low

5. Conditional routing

The grammar should support if/else logic.

Example:

if qc.blur_score > threshold:
    route to image_enhancement
else:
    route to segmentation

if organoid_density == high:
    use watershed_or_instance_segmentation
else:
    use simple_thresholding

6. Loops

The grammar should support loops over:

- images
- folders
- samples
- experiments
- dates
- app pages
- tabs
- book chapters
- pipeline stages

Examples:

for image in input_images:
    run qc
    run segmentation
    run quantification

for page in app_pages:
    inspect UI
    test functionality
    fix bugs
    rerender report

7. Tool/model routing

AAPS should be able to describe candidate tools and routing logic.

For segmentation, the workflow may choose between:

- thresholding
- Cellpose
- SAM / SAM2
- classical OpenCV
- scikit-image
- ChatGPT vision
- ChatGPT Image 2.0 mask generation
- Nanobanana / Gemini image model
- Codex-generated custom Python method

For app development, the workflow may choose between:

- static inspection
- browser testing
- Playwright
- unit tests
- screenshot comparison
- Codex code patching
- manual review

For writing, the workflow may choose between:

- outline generation
- consistency check
- chapter expansion
- style rewrite
- citation check
- export

The grammar should make this routing inspectable and editable.

8. Validation and guardrails

Each block should be able to define validation conditions.

Examples:

- mask must not be empty
- object count must be within expected range
- output file must exist
- plot must be generated
- no Python exception
- page must load successfully
- test suite must pass
- writing output must preserve character names
- report must include required sections

9. Recovery / retry logic

AAPS should support recovery policies.

Examples:

- retry with different threshold
- fallback from Cellpose to thresholding
- ask human for review
- skip bad image but log reason
- call another model
- regenerate output
- stop pipeline with clear error

10. Artifacts and database

The grammar should support artifact tracking.

Examples:

- image outputs
- masks
- overlays
- CSV tables
- JSON reports
- plots
- screenshots
- generated app files
- book chapters
- logs
- execution traces

It should also support a lightweight database/log concept for workflow runs.

11. Human-in-the-loop checkpoints

AAPS should support human review points.

Examples:

- approve segmentation overlay
- select best method
- confirm app UI direction
- approve generated chapter
- reject low-confidence output
- add correction

12. Comments and documentation

The script should support comments and readable descriptions so the `.aaps` files are understandable as standalone documents.

Please keep the syntax elegant, readable, and robust. Do not overcomplicate it, but make sure it can express real workflows.

Part 2 — Convert existing pipeline scripts into references

Please inspect the pipeline scripts in the related repos/directories listed above.

Copy useful representative scripts into:

AAPS/references/pipeline-scripts/

Do not blindly dump everything. Select meaningful examples that represent different domains:

- organoid image analysis
- general biomedical image QC
- segmentation / quantification
- app development workflows
- PWA / Android / iOS development workflows
- book writing / script writing workflows
- agentic report generation workflows
- database / artifact logging workflows

For each copied script, preserve the original context as much as possible. Add a short README or index in `references/pipeline-scripts/` explaining:

- source path
- purpose
- why it is relevant to AAPS
- what AAPS concept it demonstrates

Part 3 — Convert representative pipelines into `.aaps` examples

For each major workflow type, create a clean `.aaps` version.

Create examples such as:

1. `examples/organoid_segmentation.aaps`

A workflow for microscopy image QC, segmentation, quantification, overlay generation, and report export.

It should include:

- input image/folder
- QC block
- method selection block
- segmentation block
- postprocessing block
- quantification block
- validation block
- visualization block
- report block
- human review checkpoint

2. `examples/app_development_review.aaps`

A workflow for app development across pages/tabs/subpages.

It should include:

- scan app structure
- loop through pages/tabs/subpages
- inspect UI
- test function
- capture screenshot
- detect bugs
- patch code
- rerun tests
- summarize changes

3. `examples/book_writing_pipeline.aaps`

A workflow for long-form writing.

It should include:

- outline
- chapter generation
- consistency check
- style check
- revision
- export

4. `examples/general_agentic_workflow.aaps`

A domain-neutral example showing:

- inputs
- blocks
- conditions
- loops
- tool routing
- validation
- artifacts
- human review
- recovery

Please make the examples actually parse with the updated parser.

Part 4 — Update the web app

Please update the web app at `http://127.0.0.1:8796/` so it becomes a real AAPS Studio.

The studio should support at least two main areas/tabs:

Tab 1: Chat / Builder

This area should allow the user to chat with the system to create and edit AAPS workflows.

The chat should support actions such as:

- create a new block
- edit an existing block
- add input/output definitions
- add QC logic
- add segmentation method routing
- add if/else condition
- add loop
- add validation
- add recovery policy
- explain a block
- simplify a block
- convert a natural language pipeline into AAPS script
- reparse and rerender the workflow

The chat should not only answer textually. It should route actions to update the current script, trigger parser updates, and refresh the visualization.

Please inspect LazyBlog Studio, especially how it wraps Codex/tools in a web tool interface. Learn from its API and interaction philosophy. Use similar ideas where suitable, but keep AAPS focused on workflow scripts and structured visual editing.

Tab 2: Script / Visual Studio

This area should include:

- full `.aaps` script editor
- live parser status
- error messages with line/column if possible
- parsed block list
- visual graph of the workflow
- loops shown clearly
- if/else branches shown clearly
- functional blocks shown as modules
- inputs and outputs shown on blocks
- artifacts shown where relevant
- validation/recovery/human-review markers
- ability to click a block and edit it
- ability to customize block parameters
- ability to edit the full program
- ability to reparse manually
- ability to auto-parse while editing
- ability to load example `.aaps` files
- ability to save/export current `.aaps`

The visualization should be clear and useful, not decorative. It should make the program structure obvious.

For loops should be shown as loop containers or repeated-flow structures.

If/else branches should be shown as branching paths.

Blocks should show:

- name
- purpose
- key inputs
- key outputs
- selected method/tool
- validation state if available

Part 5 — Parser and visualization integration

Please make sure the parser produces a structured intermediate representation that the UI can use.

The parsed representation should include:

- workflow metadata
- global inputs/outputs
- block definitions
- action steps
- control flow
- loops
- conditions
- tool routes
- validations
- recovery rules
- artifacts
- human review checkpoints
- errors and warnings

The web app should not parse by fragile string matching. It should use the actual parser or a shared parser API.

Please add tests for:

- simple workflow
- workflow with blocks
- workflow with if/else
- workflow with for loop
- workflow with tool routing
- workflow with validation and recovery
- invalid syntax
- missing required fields
- example `.aaps` files

Part 6 — Documentation

Update the README and website accordingly.

The README should explain:

- what AAPS is
- why AAPS exists
- the design philosophy
- how AAPS differs from uncontrolled AI agents
- what the AAPS harness manages
- the `.aaps` language basics
- how to run the web app
- how to use the Chat / Builder tab
- how to use the Script / Visual Studio tab
- how to create a block
- how to add inputs/outputs
- how to add conditions and loops
- how to define tool routing
- how to define validation and recovery
- how to track artifacts
- how to use human review checkpoints
- examples for biology image analysis, app development, and writing

The website should be updated with a clear product/research narrative:

AAPS is a structured harness for agentic workflows. It turns vague agent behavior into readable, editable, auditable programs. It is especially useful for biomedical image analysis, app development automation, and long-form writing workflows.

Part 7 — Quality requirements

Please do all work carefully and verify it.

Required checks:

- inspect current repo structure before editing
- preserve existing working features
- avoid breaking current parser behavior unless intentionally migrated
- add or update tests
- run available tests
- run lint/build if available
- run the web app if possible
- test the example `.aaps` files
- verify that examples parse correctly
- verify that loops and conditions visualize correctly
- verify that block editing works
- verify that chat actions can update/reparse/rerender the script

Please provide a final summary with:

- files changed
- grammar changes
- parser changes
- UI changes
- example scripts added
- reference scripts copied
- tests added
- commands run
- known limitations
- recommended next steps

Important style:
Please implement real functionality. Do not only write TODOs or placeholder code. When a feature is too large, implement a minimal working version and clearly mark what remains.
