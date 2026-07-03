# Codex Wrapper And Agent Settings

AAPS Studio can run as a static app, but the local backend gives it an agent-backed edit API. Codex is the default backend, DeepSeek can be used through its OpenAI-compatible API, and AgInTiFlow can be selected as a persistent project-aware backend session.

## Start

```bash
npm run studio
```

Open:

```text
http://127.0.0.1:8797
```

Detached/local startup:

```bash
aaps webapp --project .
aaps webapp disable
aaps webapp enable
aaps webapp stop --project .
aaps webapp restart --project .
aaps chat --project .
```

`aaps webapp` starts or reuses the local Studio process, trying port `8797` first and then later ports if needed. `aaps webapp disable` persistently disables automatic Studio startup; `aaps webapp enable` restores it. `aaps webapp stop` stops the selected local Studio process; `aaps webapp restart` stops and relaunches it. `aaps chat` shows the active Studio URL below the CLI header and supports an AAPS-focused shell: Ctrl-J multiline prompts, Up/Down history, `/files`, `/status`, `/session <id>`, `/sessions`, `/history`, `/webapp start|stop|restart|reuse|enable|disable|status`, `/parse`, `/compile`, `/check`, `/run`, `/update`, and `/backend codex|aginti|print` against the same project. When Studio is running, plain terminal messages call `/api/aaps/chat` with the selected session id, so the browser transcript and terminal transcript stay in sync. Studio keeps the Projects list stable, shows each project’s `.aaps` files in a default-open foldable list, and uses a separate `+ New Project` dialog. The Studio session dropdown includes a `+ New` button for naming a session and choosing a working path with autocomplete. The project-local session registry lives in `.aaps-work/aaps-sessions.sqlite` and records session id, friendly name, project root, command cwd, active file, backend, provider, agent session id, timestamps, and the history file. Backend calls launch AgInTi/Codex with the selected session cwd.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `AAPS_CODEX_MODEL` | `gpt-5.3-codex` | Model passed to `codex exec`. |
| `AAPS_CODEX_REASONING` | `medium` | Reasoning effort config. |
| `AAPS_CODEX_TIMEOUT` | `240` | Synchronous wrapper timeout in seconds. |
| `AAPS_CODEX_TIMEOUT_MS` | `900000` | Direct `aaps prompt --backend codex` timeout in milliseconds. |
| `AAPS_CODEX_SANDBOX` | `danger-full-access` | Codex exec sandbox for local Studio backend jobs. Use `read-only` or `workspace-write` only when the host supports Codex sandboxing cleanly. |
| `AAPS_ALLOW_EXTERNAL_PROJECTS` | `1` | Allow the local Studio backend to open explicit project paths under the current user's home directory. Set `0` to restrict paths to `AAPS_STUDIO_PROJECT`. |
| `AAPS_AGENT_PROVIDER` | `codex` | Default backend provider. Supported values: `codex`, `deepseek`, `aginti`. |
| `AAPS_DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | DeepSeek OpenAI-compatible base URL. |
| `AAPS_DEEPSEEK_MODEL` | `deepseek-v4-pro` | Preferred DeepSeek model for the current stage. |
| `AAPS_DEEPSEEK_API_KEY` | unset | Local DeepSeek API key. Never commit it. |
| `AAPS_AGINTI_PROVIDER` | `deepseek` | Provider passed to `aginti` when AgInTiFlow is selected. |
| `AAPS_AGINTI_SAFETY` | `normal` | AgInTiFlow safety mode: `safe`, `normal`, or `danger`. |
| `AAPS_AGINTI_SESSION_ID` | unset | Optional persistent AgInTiFlow session id to resume. |
| `AAPS_AGINTI_TIMEOUT` | `900` | Synchronous AgInTiFlow wrapper timeout in seconds. |
| `AAPS_MOCK_CODEX` | unset | Set to `1` for wrapper smoke tests without model calls. |
| `AAPS_CODEX_BYPASS_SANDBOX` | unset | Set to `1` only for trusted local automation. |

Copy `.env.example` to `.env` for local configuration. The Studio Project tab has a Backend Agent Settings panel that persists non-secret choices in `.aaps-work/aaps-settings.json`. Backend selection is an adapter choice, not an AAPS semantics change: the selected workflow, selected block, selected program, and current source remain stable when switching between Codex, DeepSeek, and AgInTiFlow.

When `Send full AAPS grammar/project context to backend agents` is enabled, Studio sends a compact context pack with language/compiler/runtime excerpts, project manifest, selected source, selected workflow/program/block, diagnostics, recent history, and current artifacts. When `Version and save agent edits automatically` is enabled, accepted backend edits are written back to the selected `.aaps` file through the versioned project-file save path.

## API

```text
GET  /api/health
GET  /api/aaps/settings
POST /api/aaps/settings
POST /api/aaps/edit
POST /api/aaps/chat
GET  /api/aaps/artifacts
GET  /api/aaps/artifact-file?path=<project>&file=<artifact>
GET  /api/aaps/versions
POST /api/aaps/versions/restore
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

Codex and AgInTiFlow are both backend adapters. AAPS remains the language, project, block, and program layer. The backend receives the selected AAPS scope and returns schema-shaped JSON such as an updated `.aaps` source or a bounded reply.

For AgInTiFlow, Studio writes the full context into `.aaps-work/studio-codex-jobs/<job>/aginti-handoff.md`, invokes `aginti` with a short prompt that points to the handoff, and expects output JSON at `.aaps-work/studio-codex-jobs/<job>/output.json`. This avoids huge command-line prompts and lets AgInTiFlow keep a persistent session while AAPS keeps its backend boundary explicit.
