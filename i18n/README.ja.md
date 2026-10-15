[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner — apps and four buddies](https://lazying.art/media/brand/lazyingart-intro.gif)](https://lazying.art)

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

<!-- support:start -->
[![GitHub Sponsors](https://img.shields.io/badge/GitHub-Sponsors-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)
[![LazyingArt Support](https://img.shields.io/badge/LazyingArt-Support-0EA5E9?style=for-the-badge)](https://chat.lazying.art/donate)
[![PayPal Support](https://img.shields.io/badge/PayPal-Support-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen)
[![Stripe Support](https://img.shields.io/badge/Stripe-Support-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400)
<!-- support:end -->
