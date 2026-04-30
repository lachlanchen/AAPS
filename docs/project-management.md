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
  drafts/
  archive/
  data/
  artifacts/
  runs/
  reports/
  notes/
```

## Multi-File Workflows

Use `include` statements in `.aaps` files to declare project-root relative dependencies:

```aaps
pipeline "Main Organoid Analysis" {
  include "blocks/qc_image.aaps"
  include "blocks/segment_organoid.aaps"
  include "blocks/quantify_growth.aaps"
}
```

`include` is declarative. The parser records dependencies in IR; the runtime can later resolve, cache, execute, and version them.

## Commands

```bash
npm run project:validate
node scripts/aaps-project.js validate examples/projects/organoid-analysis
node scripts/aaps-project.js init my-aaps-project "My AAPS Project" biology
```

Validation checks manifest shape, relative paths, declared `.aaps` files, and parser diagnostics for project files.

## Studio Behavior

AAPS Studio has a Project tab for:

- editing `aaps.project.json`
- validating manifest fields
- viewing blocks, skills, modules, workflows, drafts, archives, and references
- loading a project file into the script editor
- saving the active file through the local server

Static deployment can edit and export manifests in the browser. Local Studio adds filesystem-backed load/save APIs.
