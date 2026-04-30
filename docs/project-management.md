# AAPS Project Management

AAPS projects organize many `.aaps` files under one manifest. A project can contain reusable blocks, skills, modules, subworkflows, main workflows, drafts, archived versions, data folders, artifacts, run logs, reports, and notes.

## Manifest

Each project should have an `aaps.project.json` at its root:

```json
{
  "schema": "aaps_project/0.1",
  "name": "Organoid Analysis Project",
  "path": ".",
  "description": "Microscopy QC, segmentation, quantification, and reporting.",
  "domain": "biology",
  "tags": ["organoid", "microscopy"],
  "defaultMain": "workflows/main.aaps",
  "activeFile": "workflows/main.aaps",
  "dataFolders": ["data/raw", "data/processed"],
  "artifactRoot": "artifacts",
  "runDatabase": "runs/organoid-aaps-runs.jsonl",
  "variables": {
    "image_glob": "data/raw/**/*.tif"
  },
  "tools": ["python3", "threshold_segmentation", "cellpose", "codex"],
  "models": ["gpt-5", "cellpose"],
  "agents": ["codex_repair_agent", "segmentation_method_selector"],
  "environment": {
    "python": "python3",
    "commands": ["python3"],
    "setup": ["python3 -m venv .venv"]
  },
  "files": {
    "blocks": ["blocks/qc_image.aaps"],
    "skills": ["skills/microscopy_qc.aaps"],
    "modules": [],
    "subworkflows": [],
    "workflows": ["workflows/main.aaps"],
    "drafts": [],
    "archives": [],
    "references": []
  }
}
```

All paths must be project-root relative. Avoid absolute paths, home-directory paths, and `..` traversal. This keeps projects portable and safe to publish.

## Recommended Layout

```text
my-aaps-project/
  aaps.project.json
  blocks/
    qc_image.aaps
    segment_organoid.aaps
    quantify_growth.aaps
  skills/
    microscopy_qc.aaps
    report_generation.aaps
  modules/
  subworkflows/
  workflows/
    main.aaps
    batch_analysis.aaps
    compare_methods.aaps
  scripts/
    qc_image.py
    threshold_segment.py
  environments/
    requirements.txt
    aaps_environment.json
  tools/
    tool_registry.json
  agents/
    agent_registry.json
  drafts/
  archive/
  data/
  artifacts/
  runs/
  reports/
  notes/
```

## Multi-File Workflows

Use `include` or `import` statements in `.aaps` files to declare project-root relative dependencies:

```aaps
pipeline "Main Organoid Analysis" {
  import block "blocks/qc_image.aaps" as qc_image
  import block "blocks/segment_organoid.aaps" as segment_organoid
  include "skills/report_generation.aaps"
}
```

The project-aware parser resolves imports, records each imported block source file, and reports missing or circular imports. Imported blocks are available to `call` statements and to the visual graph.

## Registries

Executable projects can declare registries next to the manifest:

```text
tools/tool_registry.json
agents/agent_registry.json
environments/aaps_environment.json
environments/requirements.txt
```

Tool entries describe commands or script paths, optional setup commands, supported block types, and notes. Agent entries describe prompt-based or future API-backed agents such as `codex_repair_agent`. Environment files define the default Python interpreter, required commands, local setup commands, and optional package lists. The runtime resolves these registries before execution and writes `tool_resolution.json`, `block_readiness.json`, and `agent_compile_plan.json` into each run folder.

## Commands

```bash
npm run project:validate
node scripts/aaps-project.js validate examples/projects/organoid-analysis
node scripts/aaps-project.js init my-aaps-project "My AAPS Project" biology
node scripts/aaps.js validate --project examples/projects/organoid-analysis --json
node scripts/aaps.js check workflows/executable_folder_segmentation.aaps --project examples/projects/organoid-analysis --json
node scripts/aaps.js run workflows/executable_organoid_demo.aaps --project examples/projects/organoid-analysis --json
node scripts/aaps.js run workflows/executable_folder_segmentation.aaps --project examples/projects/organoid-analysis --json
```

Validation checks manifest shape, relative paths, declared `.aaps` files, and parser diagnostics for project files. `compile` detects missing blocks, scripts, tools, agents, binaries, packages, and inputs before runtime. `check` builds a project-aware execution plan and block readiness report without running the workflow.

## Studio Behavior

AAPS Studio has a Project tab for one topic workspace. A project can be a lecture-notes corpus, novel, research analysis, app, or operations workflow. It may contain many runnable `.aaps` workflows plus reusable blocks, scripts, tools, agents, and environments.

The tab supports:

- creating a starter project with basic blocks, tool/agent/environment registries, a main workflow, and a minimal executable script
- editing `aaps.project.json`
- validating manifest fields
- viewing workflow/block/script/tool/agent/environment counts
- distinguishing active working `.aaps` and default main `.aaps`
- viewing blocks, skills, modules, workflows, drafts, archives, and references
- viewing script, environment, tool registry, and agent registry files
- loading a project file into the script editor
- saving the active file through the local server
- compiling the active workflow in check/suggest/apply modes
- seeing missing component reports, generated files, setup prompts, and Codex prompts
- copying a tmux command for running the active workflow in a project session
- creating, duplicating, and archiving `.aaps` files
- running or dry-running the active workflow
- checking readiness, running, or dry-running the selected block from the block inspector
- configuring the local backend agent provider. Codex is the default; DeepSeek v4 pro is available when `AAPS_DEEPSEEK_API_KEY` is present in the ignored `.env` or shell.

Static deployment can edit and export manifests in the browser. Local Studio adds filesystem-backed load/save APIs.
