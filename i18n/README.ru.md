[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

AAPS означает Autonomous Agentic Pipeline Script. Это язык, где prompt является основным программным артефактом для автономных, возобновляемых и проверяемых пайплайнов.

Текущая версия добавляет `skill`, `stage`, `action`, `method`, `guard`, `if`, `for_each`, типизированные входы/выходы и AAPS Studio с двумя вкладками.

## Состав

- `src/aaps.js`: парсер, сериализатор и компилятор Markdown runbook.
- `studio/`: AAPS Studio, отдельное Web App в стиле Scratch.
- `backend/`: Codex wrapper с `/api/aaps/edit` и `/api/codex/*`.
- `website/`: лендинг на `https://aaps.lazying.art`.
- `vendor/AgInTiFlow`: submodule для будущего backend agent.
- `references/pipeline-scripts/`: исходные скрипты и общие `.aaps`-конверсии из AutoAppDev, LazyBlog и биологических анализов Zhengyu.

## Быстрый старт

```bash
npm test
npm run studio
```

Откройте `http://127.0.0.1:8796`.
