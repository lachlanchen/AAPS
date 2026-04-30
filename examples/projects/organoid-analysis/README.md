# Organoid Analysis AAPS Project

This example shows the recommended multi-file AAPS project layout. It separates small reusable blocks from broader skills and main workflows.

```text
organoid-analysis/
  aaps.project.json
  blocks/
  skills/
  workflows/
  data/
  artifacts/
  runs/
  reports/
  notes/
```

All paths in the manifest are project-root relative. The files are intentionally small so they can be edited, reused, and tested independently.
