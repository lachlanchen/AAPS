[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# AAPS

**Prompt Is All You Need**

Prompt is all you need: AAPS ist eine project-oriented und prompt-native Programmiersprache mit visuellem Studio, die Prompts in strukturierte, überprüfbare Pipelines verwandelt. Es verbindet Wet-/Dry-Experimente, Hardware und Software sowie menschliche Absicht mit ausführbarer agentischer Arbeit über Tasks, typisierte Eingaben, deklarierte Outputs, Validierungsgates, Recovery-Schritte und dauerhafte Artefakte.

## Inhalt

- `src/aaps.js`: Parser, Serializer und Markdown-Runbook-Compiler.
- `studio/`: AAPS Studio, eine Scratch-ähnliche Web App getrennt von der Landingpage.
- `backend/`: Codex-Wrapper mit `/api/aaps/edit` und `/api/codex/*`.
- `website/`: Produktseite für `https://aaps.lazying.art`.
- `vendor/AgInTiFlow`: Submodul für den zukünftigen Backend-Agenten.
- `references/pipeline-scripts/`: Quellskripte und allgemeine `.aaps`-Konvertierungen aus AutoAppDev, LazyBlog, OrganoidQuant und OrganoidCompactnessAnalysis.

## Schnellstart

```bash
npm test
npm run studio
```

Öffnen Sie `http://127.0.0.1:8796`.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |
