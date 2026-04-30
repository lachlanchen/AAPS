# Pipeline Script References

This directory keeps representative source pipeline material from neighboring projects and clean AAPS conversions. It is intentionally selective: the goal is to preserve patterns that teach AAPS grammar and Studio design, not to mirror every generated artifact.

## Source Index

| Source copy | Original path | Purpose | AAPS concept demonstrated |
| --- | --- | --- | --- |
| `sources/autoappdev/accepted.autoappdev.txt` | `../AutoAppDev/references/autopilot/loop/accepted.aaps` | Default app-development autopilot loop. | Plan/work/debug/fix/summary/release lifecycle. |
| `sources/autoappdev/pipeline_meta_round_numbered_placeholders_v0.autoappdev.txt` | `../AutoAppDev/examples/pipeline_meta_round_numbered_placeholders_v0.aaps` | Meta-round task generation and conditional fix flow. | Loops, placeholders, conditional recovery, run logging. |
| `sources/lazyblog/studio-chat-post-model.md` | `../BLOG/references/studio-chat-post-model.md` | LazyBlog Studio separation between chat memory and controlled actions. | Chat router, bounded source mutation, controlled APIs. |
| `sources/lazyblog/webapp-workflow.md` | `../BLOG/references/webapp-workflow.md` | Codex wrapper endpoints and durable job records. | `/api/codex/*`, schema-bound tool calls, run artifacts. |
| `sources/zhengyu/deo-codex-readme.md` | `../Zhengyu/prompt-tools/deo-codex/README.md` | DEO single-image and batch image-analysis pipeline. | Image QC, priors, segmentation, quantification, databases. |
| `sources/zhengyu/run_app80_10x_guarded_batch.sh` | `../Zhengyu/prompt-tools/deo-codex/scripts/run_app80_10x_guarded_batch.sh` | App80 10x guarded batch runner. | Loops over images, success/fail logging, guard stages. |
| `sources/zhengyu/run_app81_main_density_curated_v1.sh` | `../Zhengyu/analysis-tools/app81_density_custom_cellpose/run_app81_main_density_curated_v1.sh` | App81 curated Cellpose density runner. | Resource policies, GPU environment, profile-driven execution. |

## Converted AAPS Scripts

| Converted script | Purpose |
| --- | --- |
| `converted/autoappdev-autopilot-loop.aaps` | Generalized plan/work/debug/fix/summary/release loop. |
| `converted/lazyblog-chat-action-router.aaps` | Chat memory plus bounded edit/action routing. |
| `converted/biology-segmentation-qc.aaps` | General microscopy image segmentation, method choice, QC, and quantification. |
| `converted/app80-deo-guarded-batch.aaps` | App80 10x guarded droplet/organoid analysis. |
| `converted/app81-density-cellpose.aaps` | App81 density analysis with curated Cellpose profiles. |
| `converted/bookwriting-chapter-loop.aaps` | Reusable book/chapter writing loop. |

The AutoAppDev source files are copied as `.autoappdev.txt` because they use the older AutoAppDev line format. The converted `.aaps` files are the general AAPS equivalents and should parse with `src/aaps.js`.
