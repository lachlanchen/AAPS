# Organoid Analysis AAPS Project

This example shows the recommended multi-file AAPS project layout. It separates small reusable blocks from broader skills and main workflows.

```text
organoid-analysis/
  aaps.project.json
  blocks/
  skills/
  workflows/
  scripts/
  environments/
  tools/
  agents/
  data/
  artifacts/
  runs/
  reports/
  notes/
```

All paths in the manifest are project-root relative. The files are intentionally small so they can be edited, reused, and tested independently.

## Executable Folder Segmentation Demo

Run the local standard-library smoke test:

```bash
node ../../../scripts/aaps.js check workflows/executable_folder_segmentation.aaps --project . --json
node ../../../scripts/aaps.js run workflows/executable_folder_segmentation.aaps --project . --json
```

The workflow generates demo PGM images when `data/demo_images/` is empty, loops over every image, runs QC, threshold segmentation, mask quantification, and a batch summary. Each run writes `block_readiness.json`, `tool_resolution.json`, `agent_compile_plan.json`, block logs, masks, overlays, per-image CSV/JSON metrics, and a combined report.
