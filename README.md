# LangSmith Studio React

React app for LangGraph runtime operations in this repo:

- Browse threads and execution history from `/init`
- Inspect serialized states/checkpoints
- Trigger `/api/langgraph/resume`
- Trigger `/api/langgraph/rerun`
- Load form defaults from `/api/langgraph/execution-context`

## Environment

Copy `.env.example` to `.env.local` and adjust values as needed.

- `VITE_API_BASE_URL`: API base URL used by the frontend API client.
- `VITE_DEV_PORT`: optional Vite dev server port.
- `VITE_DEV_PROXY_TARGET`: optional backend target for Vite dev proxy (`/api`, `/init`, `/stream`).

## Run

1. Start backend (`ai-worker`) on your configured host/port (for example `http://localhost:8087`)
2. Install deps

```bash
cd langsmith-studio-react
npm install
```

3. Start app

```bash
npm run dev
```

App runs on `VITE_DEV_PORT` (or Vite default if not set). Proxying uses `VITE_DEV_PROXY_TARGET` when configured.

## Build

```bash
npm run build
npm run preview
```
