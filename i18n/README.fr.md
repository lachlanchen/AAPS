[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

AAPS signifie Autonomous Agentic Pipeline Script. C'est un langage centré sur les prompts pour décrire des pipelines autonomes planifiables, reprenables et vérifiables.

La version actuelle ajoute `skill`, `stage`, `action`, `method`, `guard`, `if`, `for_each`, des entrées/sorties typées, des manifestes de projet et AAPS Studio avec trois onglets.

## Contenu

- `src/aaps.js` : parseur, sérialiseur et compilateur Markdown.
- `studio/` : AAPS Studio, une Web App style Scratch séparée du site.
- `backend/` : wrapper Codex avec `/api/aaps/edit` et `/api/codex/*`.
- `website/` : page de présentation publiée sur `https://aaps.lazying.art`.
- `vendor/AgInTiFlow` : sous-module candidat pour le futur backend.
- `references/pipeline-scripts/` : scripts sources et conversions `.aaps` générales depuis AutoAppDev, LazyBlog, OrganoidQuant et OrganoidCompactnessAnalysis.

## Démarrage

```bash
npm test
npm run studio
```

Ouvrez `http://127.0.0.1:8796`.
