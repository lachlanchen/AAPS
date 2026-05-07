[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

Prompt is all you need : AAPS est un langage de programmation et un Studio visuel project-oriented et prompt-native pour transformer des prompts en pipelines structurés et vérifiables. Il relie expériences wet/dry, matériel et logiciel, et intention humaine à un travail agentique exécutable via des tâches, des entrées typées, des sorties déclarées, des portes de validation, des étapes de récupération et des artefacts durables.

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
