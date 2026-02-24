# LangSmith Studio React

React app for LangGraph runtime operations in this repo:

- Browse threads and execution history from `/init`
- Inspect serialized states/checkpoints
- Trigger `/api/langgraph/resume`
- Trigger `/api/langgraph/rerun`
- Load form defaults from `/api/langgraph/execution-context`

## Run

1. Start backend (`ai-worker`) on `http://localhost:8083`
2. Install deps

```bash
cd langsmith-studio-react
npm install
```

3. Start app

```bash
npm run dev
```

App runs at `http://localhost:5174` and proxies API calls to `http://localhost:8083`.

## Build

```bash
npm run build
npm run preview
```
