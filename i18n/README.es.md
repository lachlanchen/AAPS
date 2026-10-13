[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# AAPS

**Prompt Is All You Need**

Prompt is all you need: AAPS es un lenguaje de programación y un Studio visual project-oriented y prompt-native para convertir prompts en pipelines estructurados y verificables. Conecta experimentos wet/dry, hardware y software, e intención humana con trabajo agentic ejecutable mediante tareas, entradas tipadas, salidas declaradas, puertas de validación, pasos de recuperación y artefactos duraderos.

## Contenido

- `src/aaps.js`: parser, serializador y compilador a runbooks Markdown.
- `studio/`: AAPS Studio, una Web App estilo Scratch separada del sitio web.
- `backend/`: wrapper de Codex con `/api/aaps/edit` y `/api/codex/*`.
- `website/`: landing page publicada en `https://aaps.lazying.art`.
- `vendor/AgInTiFlow`: submódulo candidato para el backend futuro.
- `references/pipeline-scripts/`: scripts fuente y conversiones `.aaps` generales desde AutoAppDev, LazyBlog, OrganoidQuant y OrganoidCompactnessAnalysis.

## Inicio rápido

```bash
npm test
npm run studio
```

Abre `http://127.0.0.1:8796`.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |
