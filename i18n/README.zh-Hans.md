[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# AAPS

**Prompt Is All You Need**

Prompt is all you need：AAPS 是一个 project oriented 且 prompt-native 的编程语言与可视化 Studio，用来把提示词转成结构化、可验证的 pipeline。它把干湿实验、硬件与软件、以及人的意图连接到可执行的智能体工作中，通过任务、类型化输入、声明式输出、验证门、恢复步骤和持久 artifact 来完成。

## 内容

- `src/aaps.js`：AAPS 解析器、序列化器和 Markdown runbook 编译器。
- `studio/`：AAPS Studio，独立于官网的 Scratch 风格 Web App，支持积木、源码、IR 和聊天编辑。
- `backend/`：Codex wrapper，提供 `/api/aaps/edit` 和 `/api/codex/*`。
- `website/`：部署到 `https://aaps.lazying.art` 的产品官网。
- `vendor/AgInTiFlow`：未来后端智能体候选方案子模块。
- `references/pipeline-scripts/`：来自 AutoAppDev、LazyBlog、OrganoidQuant、OrganoidCompactnessAnalysis 等项目的源脚本与通用 `.aaps` 转换版本。

## 快速开始

```bash
npm test
npm run studio
```

打开 `http://127.0.0.1:8796`。无模型烟测可用：

```bash
AAPS_MOCK_CODEX=1 npm run studio
```

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |
