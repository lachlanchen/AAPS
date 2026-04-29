[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

AAPS 是 Autonomous Agentic Pipeline Script，一个以提示词为核心的编程语言，用来描述可规划、可恢复、可验证的自主智能体任务流水线。

## 内容

- `src/aaps.js`：AAPS 解析器、序列化器和 Markdown runbook 编译器。
- `studio/`：AAPS Studio，独立于官网的 Scratch 风格 Web App，支持积木、源码、IR 和聊天编辑。
- `backend/`：Codex wrapper，提供 `/api/aaps/edit` 和 `/api/codex/*`。
- `website/`：部署到 `https://aaps.lazying.art` 的产品官网。
- `vendor/AgInTiFlow`：未来后端智能体候选方案子模块。

## 快速开始

```bash
npm test
npm run studio
```

打开 `http://127.0.0.1:8766`。无模型烟测可用：

```bash
AAPS_MOCK_CODEX=1 npm run studio
```

