[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

Prompt is all you need：AAPS 是一個 project oriented 且 prompt-native 的程式語言與視覺化 Studio，用來把提示詞轉成結構化、可驗證的 pipeline。它把乾濕實驗、硬體與軟體，以及人的意圖連接到可執行的智能體工作中，透過任務、型別化輸入、宣告式輸出、驗證關卡、恢復步驟與持久 artifact 來完成。

## 內容

- `src/aaps.js`：AAPS 解析器、序列化器與 Markdown runbook 編譯器。
- `studio/`：AAPS Studio，獨立於官網的 Scratch 風格 Web App，支援積木、原始碼、IR 與聊天編輯。
- `backend/`：Codex wrapper，提供 `/api/aaps/edit` 與 `/api/codex/*`。
- `website/`：部署到 `https://aaps.lazying.art` 的產品官網。
- `vendor/AgInTiFlow`：未來後端智能體候選方案子模組。
- `references/pipeline-scripts/`：來自 AutoAppDev、LazyBlog、OrganoidQuant、OrganoidCompactnessAnalysis 等專案的來源腳本與通用 `.aaps` 轉換版本。

## 快速開始

```bash
npm test
npm run studio
```

開啟 `http://127.0.0.1:8796`。無模型煙測可用：

```bash
AAPS_MOCK_CODEX=1 npm run studio
```
