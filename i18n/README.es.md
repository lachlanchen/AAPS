[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

AAPS significa Autonomous Agentic Pipeline Script. Es un lenguaje de programación centrado en prompts para describir flujos autónomos con planificación, reanudación y verificación.

## Contenido

- `src/aaps.js`: parser, serializador y compilador a runbooks Markdown.
- `studio/`: AAPS Studio, una Web App estilo Scratch separada del sitio web.
- `backend/`: wrapper de Codex con `/api/aaps/edit` y `/api/codex/*`.
- `website/`: landing page publicada en `https://aaps.lazying.art`.
- `vendor/AgInTiFlow`: submódulo candidato para el backend futuro.

## Inicio rápido

```bash
npm test
npm run studio
```

Abre `http://127.0.0.1:8766`.

