[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

Prompt is all you need: AAPS は project-oriented かつ prompt-native なプログラミング言語とビジュアル Studio です。プロンプトを構造化され検証可能なパイプラインへ変換し、湿式/乾式実験、ハードウェアとソフトウェア、人間の意図を、タスク、型付き入力、宣言された出力、検証ゲート、復旧ステップ、永続 artifact を通じて実行可能なエージェント作業につなげます。

## 構成

- `src/aaps.js`: パーサー、シリアライザー、Markdown runbook コンパイラー。
- `studio/`: ランディングページとは別の Scratch 風 AAPS Studio Web App。
- `backend/`: Codex wrapper API。`/api/aaps/edit` と `/api/codex/*` を提供。
- `website/`: `https://aaps.lazying.art` に公開するランディングページ。
- `vendor/AgInTiFlow`: 将来のバックエンド候補サブモジュール。
- `references/pipeline-scripts/`: AutoAppDev、LazyBlog、OrganoidQuant、OrganoidCompactnessAnalysis などの元スクリプトと汎用 `.aaps` 変換版。

## クイックスタート

```bash
npm test
npm run studio
```

`http://127.0.0.1:8796` を開きます。
