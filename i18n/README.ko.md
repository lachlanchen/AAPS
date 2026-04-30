[English](../README.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [العربية](README.ar.md)

# AAPS

**Prompt Is All You Need**

AAPS는 Autonomous Agentic Pipeline Script입니다. 프롬프트를 실행 가능한 코드 단위로 다루고, 자율 에이전트 작업을 계획, 재개, 검증 가능한 파이프라인으로 표현합니다.

현재 버전은 `skill`, `stage`, `action`, `method`, `guard`, `if`, `for_each`, 타입 입력/출력, 두 탭 구조의 AAPS Studio를 포함합니다.

## 구성

- `src/aaps.js`: 파서, 직렬화기, Markdown runbook 컴파일러.
- `studio/`: 랜딩 페이지와 분리된 Scratch 스타일 AAPS Studio Web App.
- `backend/`: Codex wrapper API. `/api/aaps/edit` 및 `/api/codex/*` 제공.
- `website/`: `https://aaps.lazying.art` 제품 사이트.
- `vendor/AgInTiFlow`: 미래 백엔드 에이전트 후보 서브모듈.
- `references/pipeline-scripts/`: AutoAppDev, LazyBlog, Zhengyu 생물 분석 등의 원본 스크립트와 일반화된 `.aaps` 변환본.

## 시작

```bash
npm test
npm run studio
```

브라우저에서 `http://127.0.0.1:8796` 을 여세요.
