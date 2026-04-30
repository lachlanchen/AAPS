Part 5 — Add project management logic for AAPS projects

Please also design and implement project-level management logic.

AAPS should not assume there is only one script. In real use, one project may contain many `.aaps` files:

- small reusable block `.aaps` files
- skill `.aaps` files
- domain-specific module `.aaps` files
- subworkflow `.aaps` files
- many main program `.aaps` files
- draft/experimental `.aaps` files
- archived versions

For example, one biology project may contain:

- `blocks/qc_image.aaps`
- `blocks/segment_organoid.aaps`
- `blocks/quantify_growth.aaps`
- `blocks/generate_report.aaps`
- `workflows/main_organoid_analysis.aaps`
- `workflows/batch_organoid_analysis.aaps`
- `workflows/test_segmentation_methods.aaps`

One app development project may contain:

- `blocks/scan_pages.aaps`
- `blocks/test_ui.aaps`
- `blocks/fix_bug.aaps`
- `blocks/run_playwright.aaps`
- `workflows/main_app_review.aaps`
- `workflows/android_debug.aaps`
- `workflows/pwa_release_check.aaps`

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

A possible file could be:

`aaps.project.json`

or another clean project manifest format if better.

2. Project file organization

Please design a clean recommended structure such as:

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
  workflows/
    main.aaps
    batch_analysis.aaps
    compare_methods.aaps
  data/
  artifacts/
  runs/
  reports/
  notes/