[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# AAPS

**Prompt Is All You Need**

Prompt is all you need: AAPS là một ngôn ngữ lập trình và Studio trực quan project-oriented, prompt-native để biến prompt thành pipeline có cấu trúc và kiểm chứng được. Nó kết nối thí nghiệm wet/dry, phần cứng và phần mềm, cùng ý định con người với công việc agentic có thể thực thi qua task, typed input, declared output, validation gate, recovery step và durable artifact.

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

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |
