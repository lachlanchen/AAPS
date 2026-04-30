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
  "tools": ["python", "cellpose", "codex"],
  "models": ["gpt-5", "cellpose"],
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

## Commands

```bash
npm run project:validate
node scripts/aaps-project.js validate examples/projects/organoid-analysis
node scripts/aaps-project.js init my-aaps-project "My AAPS Project" biology
node scripts/aaps.js validate --project examples/projects/organoid-analysis --json
node scripts/aaps.js run workflows/executable_organoid_demo.aaps --project examples/projects/organoid-analysis --json
```

Validation checks manifest shape, relative paths, declared `.aaps` files, and parser diagnostics for project files.

## Studio Behavior

AAPS Studio has a Project tab for:

- editing `aaps.project.json`
- validating manifest fields
- viewing blocks, skills, modules, workflows, drafts, archives, and references
- viewing script files used by executable blocks
- loading a project file into the script editor
- saving the active file through the local server
- creating, duplicating, and archiving `.aaps` files
- running or dry-running the active workflow
- running or dry-running the selected block from the block inspector

Static deployment can edit and export manifests in the browser. Local Studio adds filesystem-backed load/save APIs.
