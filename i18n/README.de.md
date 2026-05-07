[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

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
