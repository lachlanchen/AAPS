[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

AAPS steht für Autonomous Agentic Pipeline Script. Es ist eine prompt-native Programmiersprache für autonome Workflows, die planbar, fortsetzbar und überprüfbar bleiben.

Die aktuelle Version ergänzt `skill`, `stage`, `action`, `method`, `guard`, `if`, `for_each`, typisierte Ein- und Ausgaben sowie AAPS Studio mit zwei Tabs.

## Inhalt

- `src/aaps.js`: Parser, Serializer und Markdown-Runbook-Compiler.
- `studio/`: AAPS Studio, eine Scratch-ähnliche Web App getrennt von der Landingpage.
- `backend/`: Codex-Wrapper mit `/api/aaps/edit` und `/api/codex/*`.
- `website/`: Produktseite für `https://aaps.lazying.art`.
- `vendor/AgInTiFlow`: Submodul für den zukünftigen Backend-Agenten.
- `references/pipeline-scripts/`: Quellskripte und allgemeine `.aaps`-Konvertierungen aus AutoAppDev, LazyBlog und Zhengyu-Biologieanalysen.

## Schnellstart

```bash
npm test
npm run studio
```

Öffnen Sie `http://127.0.0.1:8796`.
