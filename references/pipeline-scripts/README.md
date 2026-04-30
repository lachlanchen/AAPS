# Pipeline Script References

This directory keeps source pipeline material copied from neighboring projects and converted AAPS versions.

## Source Copies

- `sources/autoappdev/`: AutoAppDev formatted pipeline examples and autopilot loops copied as `.autoappdev.txt` because they use the older AutoAppDev line format.
- `sources/lazyblog/`: LazyBlog Studio chat/action routing and Codex wrapper philosophy.
- `sources/zhengyu/`: DEO/App80/App81 microscopy segmentation, QC, and quantification scripts.

## Converted AAPS Scripts

- `converted/autoappdev-autopilot-loop.aaps`: generalized plan/work/debug/fix/summary/release loop.
- `converted/lazyblog-chat-action-router.aaps`: chat memory plus bounded edit/action routing.
- `converted/biology-segmentation-qc.aaps`: general microscopy image segmentation, method choice, QC, and quantification.
- `converted/app80-deo-guarded-batch.aaps`: App80 10x guarded droplet/organoid analysis.
- `converted/app81-density-cellpose.aaps`: App81 density analysis with curated Cellpose profiles.
- `converted/bookwriting-chapter-loop.aaps`: reusable book/chapter writing loop.

The converted scripts are intentionally general. They preserve the execution philosophy while replacing project-specific absolute paths with typed inputs and declared artifacts.
