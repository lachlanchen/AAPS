[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

AAPS 是 Autonomous Agentic Pipeline Script，一種以提示詞為核心的程式語言，用來描述可規劃、可恢復、可驗證的自主智能體任務流水線。

目前版本加入了 `skill`、`stage`、`action`、`method`、`guard`、`if`、`for_each`、型別化輸入輸出，以及雙分頁 AAPS Studio。

## 內容

- `src/aaps.js`：AAPS 解析器、序列化器與 Markdown runbook 編譯器。
- `studio/`：AAPS Studio，獨立於官網的 Scratch 風格 Web App，支援積木、原始碼、IR 與聊天編輯。
- `backend/`：Codex wrapper，提供 `/api/aaps/edit` 與 `/api/codex/*`。
- `website/`：部署到 `https://aaps.lazying.art` 的產品官網。
- `vendor/AgInTiFlow`：未來後端智能體候選方案子模組。
- `references/pipeline-scripts/`：來自 AutoAppDev、LazyBlog、Zhengyu 生物分析等專案的來源腳本與通用 `.aaps` 轉換版本。

## 快速開始

```bash
npm test
npm run studio
```

開啟 `http://127.0.0.1:8796`。無模型煙測可用：

```bash
AAPS_MOCK_CODEX=1 npm run studio
```
