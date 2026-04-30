[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

AAPS là Autonomous Agentic Pipeline Script, một ngôn ngữ lập trình lấy prompt làm trung tâm để mô tả pipeline tác vụ tự trị, có thể tiếp tục và kiểm chứng.

Phiên bản hiện tại thêm `skill`, `stage`, `action`, `method`, `guard`, `if`, `for_each`, input/output có kiểu, manifest dự án và AAPS Studio ba tab.

## Nội dung

- `src/aaps.js`: parser, serializer và trình biên dịch Markdown runbook.
- `studio/`: AAPS Studio, Web App kiểu Scratch tách biệt với landing page.
- `backend/`: Codex wrapper với `/api/aaps/edit` và `/api/codex/*`.
- `website/`: trang giới thiệu tại `https://aaps.lazying.art`.
- `vendor/AgInTiFlow`: submodule cho backend agent tương lai.
- `references/pipeline-scripts/`: script nguồn và bản chuyển đổi `.aaps` tổng quát từ AutoAppDev, LazyBlog, OrganoidQuant và OrganoidCompactnessAnalysis.

## Bắt đầu nhanh

```bash
npm test
npm run studio
```

Mở `http://127.0.0.1:8796`.
