[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner — apps and four buddies](https://lazying.art/media/brand/lazyingart-intro.gif)](https://lazying.art)

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

<!-- support:start -->
[![GitHub Sponsors](https://img.shields.io/badge/GitHub-Sponsors-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)
[![LazyingArt Support](https://img.shields.io/badge/LazyingArt-Support-0EA5E9?style=for-the-badge)](https://chat.lazying.art/donate)
[![PayPal Support](https://img.shields.io/badge/PayPal-Support-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen)
[![Stripe Support](https://img.shields.io/badge/Stripe-Support-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400)
<!-- support:end -->
