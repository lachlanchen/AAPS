# Codex Wrapper

AAPS Studio can run as a static app, but the local backend gives it a Codex-powered edit API.

## Start

```bash
npm run studio
```

Open:

```text
http://127.0.0.1:8766
```

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `AAPS_CODEX_MODEL` | `gpt-5.3-codex` | Model passed to `codex exec`. |
| `AAPS_CODEX_REASONING` | `medium` | Reasoning effort config. |
| `AAPS_CODEX_TIMEOUT` | `240` | Synchronous wrapper timeout in seconds. |
| `AAPS_MOCK_CODEX` | unset | Set to `1` for wrapper smoke tests without model calls. |
| `AAPS_CODEX_BYPASS_SANDBOX` | unset | Set to `1` only for trusted local automation. |

## API

```text
GET  /api/health
POST /api/aaps/edit
POST /api/codex/respond
POST /api/codex/jobs
GET  /api/codex/job?id=<job-id>
GET  /api/codex/result?id=<job-id>
```

`POST /api/aaps/edit` accepts:

```json
{
  "source": "pipeline \"Example\" { ... }",
  "instruction": "add task deploy after verify"
}
```

The response matches `schemas/aaps_edit.schema.json`.

## Backend Direction

`vendor/AgInTiFlow` is included as the future browser and tool-use backend candidate. The current wrapper stays Codex-first so AAPS Studio has a simple local path today while the AgInTiFlow integration matures.

