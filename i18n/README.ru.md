[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner — apps and four buddies](https://lazying.art/media/brand/lazyingart-intro.gif)](https://lazying.art)

# AAPS

**Prompt Is All You Need**

Prompt is all you need: AAPS — project-oriented и prompt-native язык программирования с визуальной Studio для превращения prompt'ов в структурированные и проверяемые pipeline'ы. Он связывает wet/dry-эксперименты, hardware и software, а также человеческое намерение с исполняемой агентной работой через задачи, типизированные входы, объявленные выходы, validation gates, recovery steps и долговечные артефакты.

## Состав

- `src/aaps.js`: парсер, сериализатор и компилятор Markdown runbook.
- `studio/`: AAPS Studio, отдельное Web App в стиле Scratch.
- `backend/`: Codex wrapper с `/api/aaps/edit` и `/api/codex/*`.
- `website/`: лендинг на `https://aaps.lazying.art`.
- `vendor/AgInTiFlow`: submodule для будущего backend agent.
- `references/pipeline-scripts/`: исходные скрипты и общие `.aaps`-конверсии из AutoAppDev, LazyBlog, OrganoidQuant и OrganoidCompactnessAnalysis.

## Быстрый старт

```bash
npm test
npm run studio
```

Откройте `http://127.0.0.1:8796`.

<!-- support:start -->
[![GitHub Sponsors](https://img.shields.io/badge/GitHub-Sponsors-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)
[![LazyingArt Support](https://img.shields.io/badge/LazyingArt-Support-0EA5E9?style=for-the-badge)](https://chat.lazying.art/donate)
[![PayPal Support](https://img.shields.io/badge/PayPal-Support-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen)
[![Stripe Support](https://img.shields.io/badge/Stripe-Support-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400)
<!-- support:end -->
