Please upgrade AAPS into a practical structured workflow language, project system, studio, and executable runtime.

We already have a general AAPS Studio and a general parser. Now I want AAPS to become a real harness around AI agents: a system where workflows are written as readable `.aaps` scripts with typed inputs/outputs, blocks, small actions, tool routing, if/else logic, loops, validation, recovery, artifact tracking, human review checkpoints, project management, and real execution.

AAPS should not only parse and visualize `.aaps`. It should also be able to execute `.aaps` workflows and repair execution failures when possible.

The complete flow should be:

`.aaps script -> parser -> intermediate representation -> execution plan -> block execution -> artifact generation -> validation -> recovery/repair -> report`

Please inspect the current repo first. Then update the grammar, parser, project logic, web app, executable runtime, examples, tests, README, and website.

Important:
Please implement real functionality. Do not only write TODOs or placeholder code. If a feature is too large, implement a minimal working version and clearly mark what remains.

Core philosophy:
AAPS is a structured, auditable harness around AI agents. Pure AI-agent behavior is powerful but hard to control. AAPS should make agent behavior inspectable, editable, reproducible, executable, recoverable, and reliable.

AAPS should manage:

- data inputs
- text/image/code/document quality control
- task routing
- method selection
- tool/model selection
- executable actions
- artifact generation
- database/logging
- validation
- failure recovery
- self-healing repair
- visualization
- human review
- final reports
- project-level organization
- reusable workflow blocks

The design should be useful for at least these domains:

- biology image analysis
- organoid image QC, segmentation, and quantification
- app development automation
- PWA/Android/iOS project checking
- book writing
- novel writing
- script writing
- agentic report generation
- database/artifact logging workflows

Nearby repos/directories to learn from where accessible:

- `../AutoAppDev`
- `../HeyCyan`
- `../lightmind-rokit`
- `~/Documents/VoicAbyss/`
- `../Zhengyu`
- `../OrganoidCompactAnalysis`
- `../leonardsusskind`
- `../LazyEarn`
- `../LazyLearn`
- `../OrganoidAgent`
- `../EchoMind`
- `../BLOG`

Please especially inspect `../BLOG` and the lazyblog studio to learn how it wraps Codex/tools in a web interface. Use similar ideas where suitable, but keep AAPS focused on structured workflow scripts, project management, visual editing, execution, and repair.

============================================================
PART 1 — Improve the AAPS language philosophy, grammar, and parser
============================================================

Please inspect the current grammar/parser implementation first.

Then extend the `.aaps` grammar so it can elegantly describe real workflows, not only simple linear pipelines.

The grammar should support at least:

1. Workflow metadata

Each workflow should be able to declare:

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
- default execution mode
- safety settings
- notes

2. Typed inputs and outputs

Every block should explicitly declare:

- input names
- input types
- optional/required status
- default values
- output names
- output types
- artifact paths
- validation rules

For example, a segmentation block might receive:

- `image_path`
- `image_metadata`
- `qc_report`

And produce:

- `mask_path`
- `overlay_path`
- `segmentation_report`
- `object_table`

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
- executable status
- source file, if imported from another `.aaps`

4. Small actions inside each block

A block should not be a black box. It should support small action steps such as:

- inspect input
- run quality control
- choose method
- call tool/model
- run Python
- run shell
- run internal function
- postprocess output
- validate output
- save artifact
- summarize result
- request human review
- repair failure

For example, a biology segmentation block may contain:

- inspect microscopy image
- evaluate brightness, contrast, blur, density, and organoid size
- choose segmentation route
- use thresholding, Cellpose, SAM/SAM2, ChatGPT vision, ChatGPT Image, Nanobanana/Gemini image model, OpenCV, scikit-image, or a Codex-generated custom Python method depending on the image and task
- generate mask
- clean mask
- compute object properties
- validate mask quality
- export overlay and table
- request human review if confidence is low

5. Conditional routing

The grammar should support if/else logic.

Examples:

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
- imported block groups

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
- SAM/SAM2
- classical OpenCV
- scikit-image
- ChatGPT vision
- ChatGPT Image mask generation
- Nanobanana/Gemini image model
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
- shell return code must be zero
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
- prepare Codex repair prompt
- rerun failed block after repair

10. Artifacts and database/logging

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
- generated scripts
- generated book chapters
- logs
- execution traces
- repair prompts
- validation summaries

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
- approve execution of risky shell command
- approve installation of missing dependency

12. Comments and documentation

The script should support comments and readable descriptions so `.aaps` files are understandable as standalone documents.

Keep the syntax elegant, readable, and robust. Do not overcomplicate it, but make sure it can express real workflows.

============================================================
PART 2 — Add AAPS project management logic
============================================================

Please design and implement project-level management logic.

AAPS should not assume there is only one script. In real use, one project may contain many `.aaps` files:

- small reusable block `.aaps` files
- skill `.aaps` files
- domain-specific module `.aaps` files
- subworkflow `.aaps` files
- many main program `.aaps` files
- draft/experimental `.aaps` files
- archived versions

Please introduce the concept of an AAPS Project.

An AAPS project should have:

1. Project metadata

A project should include:

- project name
- project path
- description
- domain
- tags
- default main `.aaps`
- active working `.aaps`
- created/updated time
- related data folders
- artifact root
- run/log database path
- project-level variables
- available tools/models
- project notes
- safety settings
- execution settings

A possible file could be:

    aaps.project.json

or another clean project manifest format if better.

2. Project file organization

Please design a clean recommended structure such as:

    my-aaps-project/
      aaps.project.json
      blocks/
        qc_image.aaps
        segment_organoid.aaps
        quantify_growth.aaps
      skills/
        microscopy_qc.aaps
        report_generation.aaps
      workflows/
        main.aaps
        batch_analysis.aaps
        compare_methods.aaps
      scripts/
        qc_image.py
        segment_threshold.py
      data/
      artifacts/
      runs/
      reports/
      notes/
      archive/

The exact structure can be adjusted, but it should be clear and practical.

3. Project selection in the web app

The AAPS Studio should allow the user to:

- create a new project
- open/select an existing project
- view the current project
- switch between projects
- edit project metadata
- set project artifact directory
- set project data directory
- set project run/log directory
- see all `.aaps` files inside the project
- see all scripts inside the project
- see all run logs/artifacts inside the project

4. Working `.aaps` selection

Within a selected project, the studio should allow the user to select the current working `.aaps`.

The UI should clearly distinguish:

- project
- current working `.aaps`
- default main `.aaps`
- imported/referenced block `.aaps`
- script files used by blocks
- unsaved changes

The user should be able to:

- select a `.aaps` file from the project tree
- create a new `.aaps`
- duplicate an existing `.aaps`
- rename a `.aaps`
- delete/archive a `.aaps`
- set one `.aaps` as the main workflow
- set one `.aaps` as the active working script
- save changes
- reload from disk
- export selected `.aaps`

5. Importing and referencing block `.aaps` files

The grammar/parser should support importing or referencing smaller `.aaps` blocks from other files.

Example syntax:

    import block "blocks/qc_image.aaps" as qc_image
    import block "blocks/segment_organoid.aaps" as segment_organoid
    import workflow "workflows/common_report.aaps" as common_report

Or use another elegant syntax if the current grammar style suggests a better design.

The parser should resolve project-relative paths and produce useful errors if imported files are missing, duplicated, circular, or invalid.

6. Project-aware parser

The parser should become project-aware.

When parsing the active working `.aaps`, it should know:

- current project root
- current file path
- imported block files
- project variables
- artifact root
- data root
- run/log paths
- available tools/models from the project manifest
- script paths
- environment settings

The parsed intermediate representation should include:

- source file for each block
- import graph
- unresolved imports
- circular dependency warnings
- project-level variables
- active main workflow
- active working workflow
- executable action metadata

7. Project tree and visual graph

The web app should show a project tree/sidebar.

The tree should show:

- project manifest
- blocks
- skills
- workflows
- scripts
- examples
- data
- artifacts
- runs
- reports
- notes
- archive

Clicking a `.aaps` file should load it into the editor.

Clicking a Python/shell/script file should load it in a code editor.

The visual graph should clearly show whether a block is:

- defined in the current file
- imported from another `.aaps`
- project-level shared block
- unresolved/missing
- external tool/model call
- executable
- manual-only
- failed in last run
- repaired in last run

8. Chat should understand project context

The Chat / Builder tab should be project-aware.

The chat should know:

- selected project
- active working `.aaps`
- default main `.aaps`
- imported blocks
- available scripts
- run history
- latest parser errors
- latest execution errors

The chat should support actions like:

- create a new block file
- create a new workflow file
- add a block to the current workflow
- move a block into a separate reusable `.aaps`
- import an existing block into the current workflow
- summarize the project
- list available blocks
- find reusable blocks
- explain the current workflow
- suggest missing blocks
- convert a script into project-level reusable blocks
- set this workflow as the main workflow
- switch active working `.aaps`
- reparse the whole project
- visualize the import graph
- clean unused blocks
- create or edit scripts used by blocks
- prepare execution plan
- explain execution failure
- repair Python/shell code used by a block

============================================================
PART 3 — Make `.aaps` executable with runtime and repair logic
============================================================

Please make sure `.aaps` is not only a readable script format, parser format, and visualization format. It should also be executable.

AAPS should behave like a real workflow runtime:

`.aaps script -> parser -> intermediate representation -> execution plan -> block execution -> artifact generation -> validation -> recovery/repair -> report`

The goal is that a user can select a project, select a working `.aaps`, click run, and AAPS will execute the workflow as much as possible.

1. Execution model

Please design and implement a minimal but real execution model.

Each block should be executable if it defines executable actions.

A block may contain actions such as:

- run Python code
- run a Python script
- run shell command
- call an internal tool
- call an external CLI
- call a model/API wrapper
- read/write files
- transform data
- generate artifacts
- validate outputs
- produce logs and reports

The grammar should support executable action declarations.

Example style:

    block qc_image:
      input:
        image_path: file required
    
      output:
        qc_report: json
        preview_path: image
    
      action inspect:
        type: python_script
        entry: scripts/qc_image.py
        args:
          image_path: ${input.image_path}
          output_json: ${run.artifacts}/qc_report.json
          preview_path: ${run.artifacts}/qc_preview.png
    
      validate:
        exists: ${run.artifacts}/qc_report.json
        exists: ${run.artifacts}/qc_preview.png
    
      on_error:
        retry: 1
        repair: true
        fallback: basic_image_qc

Or use a cleaner syntax if it fits the existing grammar better.

2. Supported executable action types

Please support a practical minimal set first:

- `python_script`: run a Python file with arguments
- `python_inline`: run inline Python code if safe and useful
- `shell`: run shell commands
- `node_script` or `npm_script` if the repo/web app needs it
- `internal`: call an internal AAPS function
- `manual`: create a human-review task/checkpoint
- `noop`: useful for placeholder/documentation blocks that still parse

The runtime should clearly distinguish:

- parse-only blocks
- visual-only/documentation blocks
- executable blocks
- manual-review blocks
- failed blocks
- skipped blocks
- repaired blocks

3. Execution plan

After parsing, AAPS should build an execution plan.

The execution plan should include:

- block order
- dependencies
- inputs and resolved values
- output artifact paths
- conditions
- loops
- imported blocks
- environment requirements
- commands to run
- validation checks
- recovery rules
- repair settings
- safety settings

The web app should be able to show this execution plan before running.

4. Project-aware execution

Execution should be project-aware.

When running a `.aaps`, the runtime should know:

- project root
- active `.aaps` file
- main workflow file
- data root
- artifact root
- run directory
- logs directory
- environment variables
- project variables
- imported block files
- relative paths
- script paths

Every run should create a run directory such as:

    runs/
      2026-04-30_153000_main_organoid_analysis/
        resolved_workflow.json
        execution_plan.json
        run.log
        block_logs/
        artifacts/
        reports/
        errors/
        repair_prompts/

5. Runtime variables and interpolation

Please support variable interpolation in executable actions.

Examples:

    ${project.root}
    ${project.data}
    ${project.artifacts}
    ${project.scripts}
    ${run.dir}
    ${run.artifacts}
    ${run.logs}
    ${block.name}
    ${input.image_path}
    ${output.mask_path}
    ${env.PYTHON}

The parser/runtime should detect unresolved variables and report them clearly.

6. Python and shell execution

For Python execution:

- detect the Python interpreter
- prefer project virtual environment if available
- support project-level Python path
- support requirements checking
- capture stdout/stderr
- capture return code
- save logs
- report exceptions clearly
- validate expected output files

For shell execution:

- run from the correct working directory
- capture stdout/stderr
- capture return code
- avoid destructive commands unless explicitly allowed
- show command before execution
- log all commands
- support timeout

7. Dependency and environment checking

Before execution, AAPS should check whether required runtime dependencies exist.

For example:

- Python script exists
- shell command exists
- required input files exist
- output directory is writable
- required Python packages are installed
- required Node packages are installed
- model/API credentials are configured if needed
- external tool path exists

The `.aaps` grammar should allow declaring requirements:

    requires:
      python:
        packages:
          - numpy
          - opencv-python
          - scikit-image
      system:
        commands:
          - python
          - git
      files:
        - scripts/qc_image.py

The runtime should show missing requirements clearly.

8. Repair and self-healing execution

Please implement a minimal repair loop for execution failures.

When a block fails, AAPS should:

1. capture the error
2. classify the failure type
3. decide whether it is repairable
4. attempt a safe repair if allowed
5. rerun the failed block
6. log the repair attempt
7. stop or fallback if repair fails

Failure categories may include:

- missing input file
- missing output file
- Python exception
- missing Python package
- missing shell command
- syntax error in generated script
- bad arguments
- invalid path
- permission error
- validation failure
- empty segmentation mask
- failed UI test
- missing artifact
- timeout

Repair actions may include:

- create missing output directory
- fix relative paths
- install missing Python package only if explicitly allowed by project settings
- regenerate a small helper Python script
- adjust command arguments
- rerun with fallback method
- switch from one segmentation method to another
- lower/raise threshold if validation fails
- call a simpler fallback block
- ask for human review
- mark block as skipped with reason

Do not make dangerous repairs silently.

Do not:

- delete user files unless explicitly allowed
- overwrite important files without backup
- install packages globally without permission
- run destructive shell commands
- expose secrets in logs

9. Codex / agent-assisted repair

If the runtime error is caused by a script or code issue, AAPS should be able to prepare a structured repair prompt for Codex or another coding agent.

For example, when `scripts/qc_image.py` fails, AAPS should generate a repair context containing:

- failing block name
- action type
- command run
- stdout/stderr
- traceback
- expected inputs
- expected outputs
- validation rules
- relevant source file path
- suggested repair target

The web app should show a “Repair with Codex” or “Prepare repair prompt” action.

The first implementation can generate the repair prompt as text. Later it can call Codex/tooling directly.

============================================================
PART 4 — Add block-level chat and code-authoring support
============================================================

Please add a block-level chat/code authoring area.

This is very important.

Each block in the AAPS Studio should have its own chat message area where the user can describe, generate, edit, test, and repair the code used by that block.

The block chat should be able to write Python, shell, or other executable code for the selected block.

1. Block chat panel

When the user selects a block in the visual graph or block list, the UI should show a block detail panel with:

- block summary
- inputs
- outputs
- actions
- validation
- recovery
- artifacts
- current execution status
- block-level chat
- block-level code editor
- generated scripts
- stdout/stderr logs
- repair suggestions

The block chat should know the selected block context.

It should understand:

- block name
- block purpose
- block inputs
- block outputs
- current `.aaps` code
- imported block source
- project root
- script directory
- artifact directory
- latest execution logs
- latest errors
- validation rules

2. Code writing from block chat

The user should be able to type messages such as:

- “write Python code for this block”
- “create a threshold segmentation script”
- “write a shell command to run this tool”
- “change this block to use Cellpose”
- “add validation that mask is not empty”
- “fix the Python error”
- “convert this inline code into a script file”
- “make this block generate a CSV report”
- “add a fallback shell command”
- “write a small test for this block”

The chat should respond by updating the block and/or writing script files.

3. Inline code and external script support

AAPS should support both:

- inline executable code inside the `.aaps` block
- external project script files, such as `scripts/qc_image.py`

For example, `.aaps` should allow:

    action segment:
      type: python_inline
      code:
        import cv2
        import numpy as np
        image = cv2.imread(input_image, 0)
        _, mask = cv2.threshold(image, 0, 255, cv2.THRESH_OTSU)
        cv2.imwrite(output_mask, mask)

And also:

    action segment:
      type: python_script
      entry: scripts/threshold_segment.py
      args:
        input_image: ${input.image_path}
        output_mask: ${output.mask_path}

Use a syntax that is compatible with the final parser design.

4. Code editor inside block panel

The block detail panel should include a code editor for the selected action.

The code editor should support:

- Python code
- shell code
- JSON/YAML-like parameters
- script path editing
- inline code editing
- save to external script file
- convert inline code to external script
- convert script reference to inline preview
- syntax highlighting if feasible
- dirty/unsaved state
- validation before save

5. Chat-to-script workflow

The block chat should support this workflow:

1. User describes desired block behavior.
2. Chat proposes an action definition.
3. Chat writes or updates inline Python/shell code.
4. Chat optionally saves the code into `scripts/`.
5. Parser reparses the `.aaps`.
6. Runtime builds an execution plan.
7. User can dry run or run the selected block.
8. If execution fails, chat reads logs and proposes a repair.
9. User can apply repair.
10. AAPS reruns the block and updates graph status.

6. Code generation safety

Generated code should be safe by default.

The system should:

- show generated shell commands before running
- avoid destructive commands
- avoid deleting files
- avoid overwriting important files without backup
- avoid exposing secrets
- ask for human approval for risky commands
- save repair history
- log generated code changes

7. Code provenance

AAPS should track code provenance.

For generated or edited code, record:

- which block created it
- which chat message generated it
- timestamp
- target file path
- old/new diff if possible
- execution result
- repair attempts

8. Block code tests

Please add tests for:

- creating inline Python action from block chat
- creating shell action from block chat
- saving generated code to `scripts/`
- updating `.aaps` action definition
- parsing inline code blocks
- building execution plan with inline code
- running generated Python code
- capturing failure logs
- repairing generated code
- converting inline code to script file
- validating generated artifacts

============================================================
PART 5 — Update the web app into a real AAPS Studio
============================================================

Please update the web app at:

    http://127.0.0.1:8796/

The studio should support at least these main areas:

1. Project sidebar
2. Chat / Builder tab
3. Script / Visual Studio tab
4. Block Detail / Block Chat panel
5. Runtime / Runs panel

1. Project sidebar

The project sidebar should allow:

- create/open/switch project
- view current project
- view project file tree
- choose active working `.aaps`
- set default main `.aaps`
- view blocks/skills/workflows/scripts/data/artifacts/runs/reports/notes
- create/duplicate/rename/archive/delete `.aaps` files
- open Python/shell script files
- view run artifacts

2. Chat / Builder tab

This area should allow the user to chat with the system to create and edit AAPS workflows.

The chat should support actions such as:

- create a new project
- create a new block
- create a new workflow
- edit an existing block
- add input/output definitions
- add QC logic
- add segmentation method routing
- add if/else condition
- add loop
- add validation
- add recovery policy
- add executable action
- write Python code for a block
- write shell command for a block
- save generated code into `scripts/`
- explain a block
- simplify a block
- convert a natural-language pipeline into `.aaps`
- reparse and rerender the workflow
- build execution plan
- run current workflow if safe
- run selected block if safe
- explain execution failure
- prepare repair prompt
- repair failed code if safe

The chat should not only answer textually. It should route actions to update the current script, write files when appropriate, trigger parser updates, build execution plans, run selected blocks, and refresh visualization.

3. Script / Visual Studio tab

This area should include:

- full `.aaps` script editor
- live parser status
- parser errors with line/column if possible
- parsed block list
- visual graph of the workflow
- import graph
- execution plan viewer
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

The visualization should be clear and useful, not decorative.

For loops should be shown as loop containers or repeated-flow structures.

If/else branches should be shown as branching paths.

Blocks should show:

- name
- purpose
- key inputs
- key outputs
- selected method/tool
- executable action type
- validation state if available
- runtime status if available

4. Block Detail / Block Chat panel

When a block is selected, show:

- editable block metadata
- inputs/outputs
- actions
- parameters
- executable code
- generated script files
- validations
- recovery policies
- artifacts
- latest logs
- block-level chat
- run selected block button
- dry-run selected block button
- retry failed block button
- repair prompt button

5. Runtime / Runs panel

The UI should support:

- Run current `.aaps`
- Dry run / build execution plan only
- Run selected block
- Run from selected block
- Stop run
- Retry failed block
- Mark block as manually completed
- Open run logs
- Open artifacts
- View stdout/stderr
- View validation result
- View repair suggestions
- Prepare repair prompt
- Show run history

The visual graph should update block status:

- pending
- running
- success
- failed
- skipped
- waiting for human review
- repaired
- fallback used

============================================================
PART 6 — Parser, intermediate representation, and visualization integration
============================================================

Please make sure the parser produces a structured intermediate representation that the UI and runtime can use.

The parsed representation should include:

- workflow metadata
- project metadata
- global inputs/outputs
- block definitions
- imported block definitions
- source file for each block
- action steps
- executable actions
- inline code
- external script paths
- control flow
- loops
- conditions
- tool routes
- validations
- recovery rules
- artifacts
- human review checkpoints
- requirements
- errors and warnings
- import graph
- unresolved imports
- circular imports
- executable status

The web app should not parse by fragile string matching. It should use the actual parser or a shared parser API.

Please add tests for:

- simple workflow
- workflow with blocks
- workflow with if/else
- workflow with for loop
- workflow with tool routing
- workflow with validation and recovery
- workflow with executable Python action
- workflow with executable shell action
- workflow with inline code
- workflow with external script reference
- invalid syntax
- missing required fields
- missing import
- circular import
- example `.aaps` files
- full example projects

============================================================
PART 7 — Copy and organize representative pipeline scripts
============================================================

Please inspect useful pipeline scripts in the related repos/directories listed above.

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

For each copied script, preserve the original context as much as possible.

Add a short README or index in:

    references/pipeline-scripts/

The index should explain:

- source path
- purpose
- why it is relevant to AAPS
- what AAPS concept it demonstrates
- whether it has been converted into `.aaps`
- related example `.aaps` file

============================================================
PART 8 — Convert representative pipelines into `.aaps` examples
============================================================

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
- executable Python or shell action where practical

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
- executable action

Please make the examples actually parse with the updated parser.

============================================================
PART 9 — Add full example AAPS projects
============================================================

Please add example projects, not only single `.aaps` examples.

For example:

    examples/projects/organoid-analysis/
      aaps.project.json
      blocks/
        qc_image.aaps
        segment_organoid.aaps
        quantify_organoid.aaps
        generate_report.aaps
      workflows/
        main.aaps
        compare_segmentation_methods.aaps
        executable_organoid_demo.aaps
      scripts/
        generate_synthetic_image.py
        qc_image.py
        threshold_segment.py
        quantify_mask.py
      data/
      artifacts/
      runs/
      reports/
    
    examples/projects/app-development/
      aaps.project.json
      blocks/
        scan_pages.aaps
        test_page.aaps
        fix_bug.aaps
        run_browser_check.aaps
      workflows/
        main_app_review.aaps
        executable_static_check.aaps
      scripts/
        static_project_check.py
    
    examples/projects/book-writing/
      aaps.project.json
      blocks/
        outline_chapter.aaps
        draft_chapter.aaps
        check_consistency.aaps
        revise_style.aaps
      workflows/
        main_book_pipeline.aaps

Make sure these example projects can be opened by the web app and parsed by the project-aware parser.

============================================================
PART 10 — Add at least one executable local demo
============================================================

Please add at least one executable example that runs locally without external APIs.

For example:

    examples/projects/organoid-analysis/
      scripts/
        generate_synthetic_image.py
        qc_image.py
        threshold_segment.py
        quantify_mask.py
      workflows/
        executable_organoid_demo.aaps

This demo should:

- generate or load an example image
- run QC
- run threshold segmentation
- save mask
- quantify simple metrics
- generate a CSV/JSON report
- validate output files
- create a run folder
- write logs
- show artifacts in the web app

Another executable example could be:

    examples/projects/app-development/
      workflows/
        executable_static_check.aaps

This demo can:

- scan a small folder
- count files
- check for README/package files
- produce a JSON report
- validate output

============================================================
PART 11 — CLI execution
============================================================

If possible, add or update a CLI so `.aaps` can run outside the web app.

Example commands:

    aaps parse workflows/main.aaps
    aaps plan workflows/main.aaps --project .
    aaps run workflows/main.aaps --project .
    aaps run-block workflows/main.aaps --block qc_image --project .
    aaps validate workflows/main.aaps --project .

If the project currently has no CLI, implement a minimal one or document the closest available command.

The CLI should support:

- parsing a file
- parsing a whole project
- building an execution plan
- running a workflow
- running a selected block
- validating examples
- printing useful errors
- saving run logs

============================================================
PART 12 — Tests
============================================================

Please add or update tests for the following:

Grammar/parser tests:

- simple workflow
- metadata
- typed inputs/outputs
- blocks
- nested block actions
- if/else condition
- for loop
- tool routing
- validation
- recovery
- human review
- inline Python code
- shell action
- import block
- invalid syntax
- missing required fields

Project tests:

- creating/loading a project manifest
- listing `.aaps` files in a project
- selecting active working `.aaps`
- setting default main `.aaps`
- resolving imports
- missing import error
- circular import detection
- parsing a full project
- visual graph generation with imported blocks
- example projects opening successfully

Runtime tests:

- building execution plan
- running a simple Python action
- running a simple shell action
- variable interpolation
- missing input detection
- missing script detection
- output validation
- retry logic
- fallback logic
- repair prompt generation
- run directory creation
- logging stdout/stderr
- executable example project

Block chat/code tests:

- creating inline Python action from block chat
- creating shell action from block chat
- saving generated code to `scripts/`
- updating `.aaps` action definition
- parsing inline code blocks
- building execution plan with inline code
- running generated Python code
- capturing failure logs
- repairing generated code
- converting inline code to script file
- validating generated artifacts

Web app tests where practical:

- project selection
- active `.aaps` selection
- file tree rendering
- script editor parse/reparse
- graph rendering
- block selection
- block detail panel
- block chat action
- run selected block
- run workflow
- show logs/artifacts
- prepare repair prompt

============================================================
PART 13 — Documentation
============================================================

Update the README and website accordingly.

The README should explain:

- what AAPS is
- why AAPS exists
- the design philosophy
- how AAPS differs from uncontrolled AI agents
- what the AAPS harness manages
- project structure
- `aaps.project.json`
- `.aaps` language basics
- imports and reusable blocks
- how to run the web app
- how to use the project sidebar
- how to use the Chat / Builder tab
- how to use the Script / Visual Studio tab
- how to use the Block Detail / Block Chat panel
- how to create a block
- how to add inputs/outputs
- how to add conditions and loops
- how to define tool routing
- how to define executable actions
- how to write Python/shell inside a block
- how to save generated code into scripts
- how to define validation and recovery
- how to track artifacts
- how to use human review checkpoints
- how execution works
- how repair prompts work
- how to run workflows from CLI
- examples for biology image analysis, app development, and writing

The website should be updated with a clear product/research narrative:

AAPS is a structured harness for agentic workflows. It turns vague agent behavior into readable, editable, auditable, executable programs. It is especially useful for biomedical image analysis, app development automation, and long-form writing workflows.

============================================================
PART 14 — Quality requirements
============================================================

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
- verify that imports resolve correctly
- verify that executable examples run
- verify that run logs and artifacts are created
- verify that block editing works
- verify that block chat can update Python/shell actions
- verify that chat actions can update/reparse/rerender the script
- verify that dry-run/execution-plan works
- verify that repair prompt generation works

Final summary should include:

- files changed
- grammar changes
- parser changes
- project system changes
- runtime/execution changes
- Python/shell/block-code changes
- UI changes
- example scripts added
- example projects added
- reference scripts copied
- tests added
- commands run
- known limitations
- recommended next steps

Important implementation style:

- Implement real functionality.
- Avoid placeholder-only features.
- Avoid vague TODO-only code.
- Prefer a minimal working implementation over an ambitious non-working design.
- Keep `.aaps` syntax readable.
- Keep the parser robust.
- Keep the runtime safe.
- Keep project logic clear.
- Make the studio genuinely useful for daily work.