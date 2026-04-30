Part 6 — Make `.aaps` executable with runtime, repair, and self-healing logic

Please make sure `.aaps` is not only a readable script format, parser format, and visualization format. It should also be executable.

AAPS should eventually behave like a real workflow runtime:

`.aaps script → parser → intermediate representation → execution plan → block execution → artifact generation → validation → recovery/repair → report`

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

For example, the grammar may support something like:

```aaps
block qc_image:
  input:
    image_path: file required
  output:
    qc_report: json
    preview_path: image

  action inspect:
    type: python
    entry: scripts/qc_image.py
    args:
      image_path: ${image_path}
      output_json: ${artifacts}/qc_report.json
      preview_path: ${artifacts}/qc_preview.png

  validate:
    exists: ${artifacts}/qc_report.json
    exists: ${artifacts}/qc_preview.png

  on_error:
    retry: 1
    repair: true
    fallback: basic_image_qc