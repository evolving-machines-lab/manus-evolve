<p align="center">
  <h1 align="center">Manus Evolve</h1>
</p>

<p align="center">
  AI agent workspace for running Claude, Codex, Gemini, and Qwen in secure sandboxes.
</p>

<p align="center">
  <b>Experimental</b> — Expect bugs, breaking changes, and incomplete features. Contributions welcome!
</p>

<br>

<p align="center">
  Built with <a href="https://github.com/evolving-machines-lab/evolve"><b>Evolve SDK</b></a> — the open-source framework for orchestrating AI agents at scale.
</p>

```bash
npm install @evolvingmachines/sdk
```

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EVOLVE_API_KEY` | Yes | API key for running agents via Evolve SDK |
| `COMPOSIO_API_KEY` | No | API key for third-party integrations (GitHub, Gmail, Slack, etc.) |
| `DATABASE_PATH` | No | Custom SQLite database path (defaults to `data/manus.db`) |

## Features

- **Agents**: Claude, Codex, Gemini, Qwen
- **Skills**: PDF, DOCX, PPTX, XLSX, browser automation, research tools
- **Integrations**: GitHub, Gmail, Slack, Notion, and 1000+ via Composio

## Usage

1. Select an agent and model
2. Add skills and integrations as needed
3. Send a prompt - the agent runs in a secure sandbox
4. View streaming output, artifacts, and browser sessions
