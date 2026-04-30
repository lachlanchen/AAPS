# Codex Wrapper And Agent Settings

AAPS Studio can run as a static app, but the local backend gives it a Codex-first edit API plus an optional DeepSeek OpenAI-compatible provider.

## Start

```bash
npm run studio
```

Open:

```text
http://127.0.0.1:8796
```

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `AAPS_CODEX_MODEL` | `gpt-5.3-codex` | Model passed to `codex exec`. |
| `AAPS_CODEX_REASONING` | `medium` | Reasoning effort config. |
| `AAPS_CODEX_TIMEOUT` | `240` | Synchronous wrapper timeout in seconds. |
| `AAPS_AGENT_PROVIDER` | `codex` | Default backend provider. Use `deepseek` only when explicitly selected. |
| `AAPS_DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | DeepSeek OpenAI-compatible base URL. |
| `AAPS_DEEPSEEK_MODEL` | `deepseek-v4-pro` | Preferred DeepSeek model for the current stage. |
| `AAPS_DEEPSEEK_API_KEY` | unset | Local DeepSeek API key. Never commit it. |
| `AAPS_MOCK_CODEX` | unset | Set to `1` for wrapper smoke tests without model calls. |
| `AAPS_CODEX_BYPASS_SANDBOX` | unset | Set to `1` only for trusted local automation. |

Copy `.env.example` to `.env` for local configuration. The Studio Project tab has a Backend Agent Settings panel that persists non-secret choices in `.aaps-work/aaps-settings.json`. Codex remains the default because it is the stronger agentic backend today; DeepSeek v4 pro is available for prompt-compatible routing when configured.

## API

```text
GET  /api/health
GET  /api/aaps/settings
POST /api/aaps/settings
POST /api/aaps/edit
POST /api/aaps/project/create
POST /api/codex/respond
POST /api/codex/jobs
GET  /api/codex/job?id=<job-id>
GET  /api/codex/result?id=<job-id>
```

`POST /api/aaps/chat` routes Studio chat messages using the LazyBlog pattern:
chat may reply, classify, or request a bounded source edit; source mutation returns a
complete updated `.aaps` program that the Studio reparses and redraws.

`POST /api/aaps/edit` accepts:

```json
{
  "source": "pipeline \"Example\" { ... }",
  "instruction": "add task deploy after verify"
}
```

The response matches `schemas/aaps_edit.schema.json`.

`POST /api/aaps/chat` returns `schemas/aaps_chat.schema.json`.

## Backend Direction

`vendor/AgInTiFlow` is included as the future browser and tool-use backend candidate. The current wrapper stays Codex-first so AAPS Studio has a simple local path today while the AgInTiFlow integration matures.
