[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

Prompt is all you need: AAPS는 project-oriented이자 prompt-native인 프로그래밍 언어와 비주얼 Studio입니다. 프롬프트를 구조화되고 검증 가능한 pipeline으로 바꾸며, wet/dry 실험, 하드웨어와 소프트웨어, 사람의 의도를 task, typed input, declared output, validation gate, recovery step, durable artifact를 통해 실행 가능한 에이전트 작업으로 연결합니다.

## 구성

- `src/aaps.js`: 파서, 직렬화기, Markdown runbook 컴파일러.
- `studio/`: 랜딩 페이지와 분리된 Scratch 스타일 AAPS Studio Web App.
- `backend/`: Codex wrapper API. `/api/aaps/edit` 및 `/api/codex/*` 제공.
- `website/`: `https://aaps.lazying.art` 제품 사이트.
- `vendor/AgInTiFlow`: 미래 백엔드 에이전트 후보 서브모듈.
- `references/pipeline-scripts/`: AutoAppDev, LazyBlog, OrganoidQuant, OrganoidCompactnessAnalysis 등의 원본 스크립트와 일반화된 `.aaps` 변환본.

## 시작

```bash
npm test
npm run studio
```

브라우저에서 `http://127.0.0.1:8796` 을 여세요.
