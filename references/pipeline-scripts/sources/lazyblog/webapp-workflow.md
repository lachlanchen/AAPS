# LazyBlog Studio Webapp

LazyBlog Studio is the local chat-to-post PWA for `BLOG`.

It belongs in this repo because it is an operating tool. It does not modify the pure WordPress code repo in `../myblog`.

## Start

```bash
./blogctl webapp --host 127.0.0.1 --port 8765 --reasoning medium
```

Open:

```text
http://127.0.0.1:8765
```

For UI testing without model calls:

```bash
./blogctl webapp --mock-codex
```

## PWA

The app serves its own manifest, service worker, and icon endpoints:

```text
/manifest.webmanifest
/service-worker.js
/icons/lazyblog.svg
/icons/lazyblog-192.png
/icons/lazyblog-512.png
```

Browsers can install it as `LazyBlog Studio`. The service worker caches only the app shell and does not intercept API writes, so chat, draft, and publish operations still go directly to the local server.

## Storage

Chat sessions are Markdown-first:

```text
content/chat/<session-id>/session.json
content/chat/<session-id>/messages/*.md
content/chat/<session-id>/tool-runs/*/
content/drafts/<session-id>/*.md
content/drafts/<session-id>/*.json
```

Each user and assistant message is stored as a Markdown file with front matter. Each Codex prompt-tool run stores its input, prompt, logs, and schema-bound JSON output.

## Prompt Tools And Wrapper Profiles

The webapp wraps `codex exec` as two function-like tools:

- `reply`: fast conversational response, using `prompts/web-chat-reply.txt` and `schemas/lazyblog_chat_reply.schema.json`
- `task`: heavier drafting/research/publish-prep step, using `prompts/web-draft-task.txt` and `schemas/lazyblog_chat_task.schema.json`
- `action`: bounded route classification and clarification, using `prompts/web-action-router.txt` and `schemas/lazyblog_action.schema.json`
- `response` / `assistant`: generic API prompt execution, using `prompts/web-codex-response.txt` and `schemas/lazyblog_codex_response.schema.json`

Both tools use:

```bash
codex exec --ephemeral --model <model> -c 'model_reasoning_effort="<reasoning>"' \
  --dangerously-bypass-approvals-and-sandbox \
  --cd BLOG \
  --output-schema schemas/<schema>.json \
  --output-last-message content/chat/<session>/tool-runs/<run>/output.json -
```

The schema output is treated as the tool return value.

The webapp now keeps separate model/reasoning profiles for each wrapper workload:

- `reply`: default `gpt-5.5 / medium`
- `task`: default `gpt-5.5 / high`
- `action`: default `gpt-5.4 / medium`
- `response`: default `gpt-5.4 / medium`
- `translation`: default `gpt-5.4 / medium`

These profiles are no longer just startup flags. They are resolved inside the wrapper before each job runs.

Persistent settings file:

```text
content/studio-settings.json
```

The Settings gear in the Studio header reads and writes this file through `/api/settings`.

## Codex API

Start a background Codex job:

```bash
curl -sS http://127.0.0.1:8765/api/codex/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "assistant",
    "prompt": "Turn this outline into a concise Markdown section.",
    "input": {"outline": ["claim", "evidence", "next step"]},
    "schema": "response"
  }'
```

Poll a job:

```bash
curl -sS 'http://127.0.0.1:8765/api/codex/job?id=<job-id>'
```

List recent jobs:

```bash
curl -sS 'http://127.0.0.1:8765/api/codex/jobs?limit=20'
```

Run a definite prompt response and wait for completion:

```bash
curl -sS http://127.0.0.1:8765/api/codex/respond \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Answer this as a clear API result: what should the next post be about?",
    "wait": true
  }'
```

Job records are stored under:

```text
content/codex-jobs/<job-id>/
```

Each job folder contains `input.json`, `prompt.txt`, `job.json`, `stdout.log`, `stderr.log`, and `output.json` when finished.

## Wrapper Endpoints

The generic wrapper API exposed by LazyBlog Studio is:

```text
POST /api/codex/jobs
POST /api/codex/respond
GET  /api/codex/job?id=<job-id>
GET  /api/codex/result?id=<job-id>
```

Use `POST /api/codex/jobs` when you want a durable background job and explicit polling.

Use `POST /api/codex/respond` when you want the same wrapper but with an optional wait path that can return the completed result directly.

### Response Wrapper

Typical synchronous request:

```bash
curl -sS http://127.0.0.1:8765/api/codex/respond \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "response",
    "schema": "response",
    "prompt": "Answer this as a definite API result.",
    "input": {},
    "wait": true
  }'
```

### Task Wrapper

Typical synchronous request:

```bash
curl -sS http://127.0.0.1:8765/api/codex/respond \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "task",
    "schema": "task",
    "session_id": "20260425-152731-20783ef7",
    "prompt": "Draft a new post from this session.",
    "input": {
      "requested_status": "draft"
    },
    "wait": true
  }'
```

Typical asynchronous request:

```bash
curl -sS http://127.0.0.1:8765/api/codex/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "task",
    "schema": "task",
    "session_id": "20260425-152731-20783ef7",
    "prompt": "Draft a new post from this session.",
    "input": {
      "requested_status": "draft"
    }
  }'
```

### Result Polling

```bash
curl -sS 'http://127.0.0.1:8765/api/codex/job?id=<job-id>'
curl -sS 'http://127.0.0.1:8765/api/codex/result?id=<job-id>'
```

`job` returns the durable job record and log tails. `result` is the same job family but meant for direct result fetches once the caller already knows the job id.

## Studio Settings UI

The chat header now includes a Settings gear button.

It opens a responsive modal on desktop and mobile and edits:

- chat reply model/reasoning
- write assistant model/reasoning
- router / clarification model/reasoning
- general response API model/reasoning
- translation model/reasoning

Endpoints:

```text
GET  /api/settings
POST /api/settings
```

This is intentionally a Studio-level control surface rather than a shell-only env tweak, because the actual wrapper behavior should be inspectable from the same webapp that uses it.

## Runtime Session

The current local runtime shape is:

- tmux session: `lazyblog-studio`
- pane `0`: Python Studio API on port `8765`
- pane `1`: `ngrok`

Local endpoint:

```text
http://127.0.0.1:8765
```

Typical public tunnel:

```text
https://interceptive-gnomonic-enid.ngrok-free.app
```

Treat the ngrok URL as runtime state, not as a stable identifier. The tmux session and local port are the real operating anchors.

## On-Demand WordPress Translation

`wordpress-plugins/lazyblog-translations` can request a missing translation from LazyBlog Studio when a visitor clicks an unavailable language.

Flow:

1. The plugin renders missing languages as signed, scoped links for one post and one target language.
2. Browser JavaScript calls WordPress REST, not the LazyBlog Studio API directly.
3. WordPress validates the signature, expiry, and IP rate limit.
4. WordPress calls LazyBlog Studio with a server-side bearer token.
5. LazyBlog Studio starts or reuses one translation job for the same site/post/language.
6. The browser polls WordPress until the translation is saved in post meta.
7. The page redirects to the requested language URL.

The LazyBlog Studio endpoint is:

```text
POST /api/translate/jobs
GET  /api/translate/job?id=<job-id>
```

It reuses the generic Codex response job API with the translation schema:

```text
schemas/lazyblog_web_translation.schema.json
```

For Docker WordPress, run the Studio server on a host address reachable from the container:

```bash
LAZYBLOG_WEBAPP_HOST=0.0.0.0
LAZYBLOG_API_TOKEN=<long random secret>
./blogctl webapp --reasoning medium
```

Configure WordPress:

```bash
docker compose run --rm wpcli wp option update lazyblog_translation_api_endpoint 'http://host.docker.internal:8765/api/translate/jobs' --allow-root
docker compose run --rm wpcli wp option update lazyblog_translation_api_token '<same secret>' --allow-root
docker compose run --rm wpcli wp option update lazyblog_translation_api_mock 0 --allow-root
```

The browser never receives the bearer token. It receives only a short-lived HMAC signature for one post/language.

## Publish

When the user clicks publish, the app:

1. Uses the latest draft, or runs the `task` tool to create one.
2. Writes the draft Markdown into `content/drafts/<session-id>/`.
3. Converts Markdown to WordPress HTML through the existing LazyBlog converter.
4. Creates or reuses WordPress categories and tags by name.
5. Creates a WordPress post through REST auth from `.env`.
6. Sets the LazyBlog source-language field when the site plugin is active.
7. Stores the publish result as `<draft>.published.json`.
8. Commits and pushes the session/draft folder by default.

The final WordPress status is controlled by the UI selector: `draft`, `publish`, or `private`.

## Concurrency Model

LazyBlog Studio deliberately uses mixed concurrency:

- Chat queue processing is sequential.
- Durable Codex API jobs are threaded background jobs.
- Translation jobs are durable and may overlap with other independent jobs.
- UI polling is asynchronous but does not mutate state by itself.

This split is intentional.

The chat queue should stay ordered because reply generation, action routing, clarification, and post-selection logic depend on recent state and should not race each other.

Independent long-running work is allowed to overlap:

- direct wrapper jobs through `/api/codex/jobs`
- translation jobs through `/api/translate/jobs`
- browser polling of job status

This means the app already supports parallel background work where independence is real, but does not parallelize the main chat stream where ordering matters.

## Configuration

The webapp reads existing WordPress credentials:

```text
WP_SITE_URL
WP_USERNAME
WP_APP_PASSWORD
```

Optional webapp settings:

```text
LAZYBLOG_WEBAPP_HOST=127.0.0.1
LAZYBLOG_WEBAPP_PORT=8765
LAZYBLOG_WEBAPP_MODEL=gpt-5.4
LAZYBLOG_WEBAPP_REASONING=low
LAZYBLOG_WEBAPP_CODEX_TIMEOUT=1800
LAZYBLOG_WEBAPP_COMMIT_PUSH=true
```
