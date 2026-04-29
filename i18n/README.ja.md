[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

AAPS は Autonomous Agentic Pipeline Script です。プロンプトを第一級のコードとして扱い、自律エージェントの作業を計画、再開、検証できるパイプラインとして記述します。

## 構成

- `src/aaps.js`: パーサー、シリアライザー、Markdown runbook コンパイラー。
- `studio/`: ランディングページとは別の Scratch 風 AAPS Studio Web App。
- `backend/`: Codex wrapper API。`/api/aaps/edit` と `/api/codex/*` を提供。
- `website/`: `https://aaps.lazying.art` に公開するランディングページ。
- `vendor/AgInTiFlow`: 将来のバックエンド候補サブモジュール。

## クイックスタート

```bash
npm test
npm run studio
```

`http://127.0.0.1:8766` を開きます。

