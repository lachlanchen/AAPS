[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner — apps and four buddies](https://github.com/lachlanchen/LazyingArtWebsite/raw/main/media/brand/lazyingart-intro.gif)](https://lazying.art)

# AAPS

**Prompt Is All You Need**

Prompt is all you need: AAPS هو لغة برمجة وStudio مرئية project-oriented وprompt-native لتحويل التعليمات النصية إلى pipelines منظمة وقابلة للتحقق. يربط التجارب wet/dry والعتاد والبرمجيات ونية الإنسان بعمل agentic قابل للتنفيذ عبر المهام، والمدخلات typed، والمخرجات المعلنة، وبوابات التحقق، وخطوات التعافي، وartifacts دائمة.

## المحتويات

- `src/aaps.js`: محلل اللغة والمحول ومولد Markdown runbook.
- `studio/`: تطبيق AAPS Studio بأسلوب Scratch، منفصل عن صفحة التعريف.
- `backend/`: Codex wrapper يوفر `/api/aaps/edit` و `/api/codex/*`.
- `website/`: صفحة المنتج على `https://aaps.lazying.art`.
- `vendor/AgInTiFlow`: submodule لمرشح backend agent المستقبلي.
- `references/pipeline-scripts/`: سكربتات مصدرية وتحويلات `.aaps` عامة من AutoAppDev و LazyBlog و OrganoidQuant و OrganoidCompactnessAnalysis.

## البدء السريع

```bash
npm test
npm run studio
```

افتح `http://127.0.0.1:8796`.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |
