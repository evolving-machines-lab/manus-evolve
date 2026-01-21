# SwarmKit - Evolve SDK Integration Plan

## Overview

This document outlines all Evolve SDK features to be integrated into SwarmKit for the "brain" functionality.

---

## 1. Agent Configuration

### UI Component
- `components/model-selector.tsx` - Agent/model dropdown

### SDK Features
```ts
import { Evolve } from "@evolvingmachines/sdk";

const evolve = new Evolve()
  .withAgent({
    type: "claude" | "codex" | "gemini" | "qwen",
    model: string,  // e.g., "opus", "gpt-5.2", "gemini-3-flash-preview"
  });
```

### Agent Types & Models

| Type | Models | Default |
|------|--------|---------|
| `claude` | `opus`, `sonnet`, `haiku` | `opus` |
| `codex` | `gpt-5.2`, `gpt-5.2-codex`, `gpt-5.1-codex-max`, `gpt-5.1-mini` | `gpt-5.2` |
| `gemini` | `gemini-3-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` | `gemini-3-flash-preview` |
| `qwen` | `qwen3-coder-plus`, `qwen3-vl-plus` | `qwen3-coder-plus` |

---

## 2. Task Execution

### UI Components
- `components/task/task-view.tsx` - Chat interface & progress tracker
- `app/page.tsx` - Standalone task creation
- `app/[workspaceId]/page.tsx` - Project task creation

### SDK Features

#### Initial Task Run
```ts
const evolve = new Evolve()
  .withAgent({ type: task.agent, model: task.model })
  .withContext(projectFiles)           // Upload files on first run
  .withSkills(task.skills)
  .withComposio(userId, { toolkits: task.integrations })
  .withSystemPrompt("You are Manus Evolve...");

const result = await evolve.run({ prompt: userMessage });
```

#### Continue Conversation
```ts
// Same evolve instance - history preserved
if (newFiles) {
  await evolve.uploadContext(newFiles);  // Immediate upload
}
await evolve.run({ prompt: followUpMessage });
```

---

## 3. Real-Time Streaming Events

### UI Components
- Chat messages display
- Progress tracker (`task.progress`)
- Tool call indicators

### SDK Features
```ts
import type { OutputEvent } from "@evolvingmachines/sdk";

evolve.on("content", (event: OutputEvent) => {
  const { update } = event;

  switch (update.sessionUpdate) {
    case "agent_message_chunk":
      // Append to chat - text or image
      if (update.content.type === "text") {
        appendMessage(update.content.text);
      } else {
        appendImage(update.content.data, update.content.mimeType);
      }
      break;

    case "agent_thought_chunk":
      // Show thinking/reasoning (optional)
      appendThought(update.content);
      break;

    case "tool_call":
      // Tool started
      addToolCall({
        id: update.toolCallId,
        title: update.title,
        kind: update.kind,      // read, edit, execute, fetch, etc.
        status: update.status,  // pending, in_progress
      });
      break;

    case "tool_call_update":
      // Tool completed
      updateToolCall(update.toolCallId, {
        status: update.status,  // completed, failed
        content: update.content,
      });

      // Extract browser URLs if present
      for (const c of update.content ?? []) {
        if (c.type === "content" && c.content?.type === "text") {
          const urls = extractBrowserUseUrls(c.content.text);
          if (urls.liveUrl) showBrowserLiveView(urls.liveUrl);
          if (urls.screenshotUrl) showScreenshot(urls.screenshotUrl);
        }
      }
      break;

    case "plan":
      // Progress tracker - replaces entire list
      updateProgress(update.entries);
      // entries: [{ content, status: "pending"|"in_progress"|"completed", priority }]
      break;
  }
});
```

### Event Types Reference

| Event | Description | UI Update |
|-------|-------------|-----------|
| `agent_message_chunk` | Text/image from agent | Append to chat |
| `agent_thought_chunk` | Reasoning/thinking | Show in thinking panel |
| `user_message_chunk` | User message echo (Gemini) | Show user message |
| `tool_call` | Tool started | Add to tool list |
| `tool_call_update` | Tool completed | Update tool status |
| `plan` | Progress items | Update progress tracker |

### Tool Kind Values

| Kind | Tools | Description |
|------|-------|-------------|
| `read` | Read, NotebookRead | Reading files |
| `edit` | Edit, Write, NotebookEdit | Modifying files |
| `search` | Glob, Grep, LS | Searching files |
| `execute` | Bash, BashOutput, KillShell | Running commands |
| `think` | Task (subagent) | Agent thinking |
| `fetch` | WebFetch, WebSearch | Web requests |
| `switch_mode` | ExitPlanMode | Mode changes |
| `other` | MCP tools, unknown | Everything else |

---

## 4. File Upload

### UI Components
- `components/workspace/files-tab.tsx` - Project files list
- File upload in project creation (`app/new/page.tsx`)
- Attach button in chat input

### SDK Features

#### Read Local Directory
```ts
import { readLocalDir } from "@evolvingmachines/sdk";

// Read entire folder recursively
const files = readLocalDir("./project-folder", true);
// Returns: FileMap { "path/file.txt": content, ... }
```

#### Initial Upload (with setup)
```ts
// Files upload to /home/user/workspace/context/ on first run()
evolve.withContext({
  "document.pdf": pdfBuffer,
  "data.json": jsonString,
  "folder/file.txt": textContent,
});
```

#### Mid-Conversation Upload
```ts
// Immediate upload to /home/user/workspace/context/
await evolve.uploadContext({
  "new-file.pdf": newPdfBuffer,
});
```

### FileMap Type
```ts
type FileMap = Record<string, string | Uint8Array>;

// Directories auto-created from paths
const files: FileMap = {
  "reports/q1.pdf": pdfBuffer,
  "reports/q2.pdf": pdfBuffer,
  "config.json": '{"key": "value"}',
};
```

### Sandbox Filesystem Structure
```
/home/user/workspace/
├── context/     # Input files (withContext/uploadContext) - user uploads
├── scripts/     # Agent code
├── temp/        # Scratch space
├── output/      # Final deliverables (downloaded via getOutputFiles)
└── CLAUDE.md    # System prompt (auto-generated from withSystemPrompt)
```

---

## 5. File Download (Artifacts)

### UI Components
- `components/workspace/artifacts-tab.tsx` - Output files list
- Download buttons per artifact

### SDK Features

#### Get Output Files
```ts
const output = await evolve.getOutputFiles(true);  // recursive = true

// Returns:
interface OutputResult<T> {
  files: FileMap;       // All files from output/ folder
  data: T | null;       // Parsed result.json (if schema provided)
  error?: string;       // Validation error
  rawData?: string;     // Raw result.json for debugging
}
```

#### Save to Local Directory
```ts
import { saveLocalDir } from "@evolvingmachines/sdk";

const output = await evolve.getOutputFiles(true);
saveLocalDir("./downloads", output.files);
```

### Sandbox Filesystem
```
/home/user/workspace/
├── context/     # Input files (uploaded via withContext/uploadContext)
├── scripts/     # Agent code
├── temp/        # Scratch space
└── output/      # Final deliverables (downloaded via getOutputFiles)
```

---

## 6. Browser Automation

### UI Components
- `components/workspace/browser-tab.tsx` - Live browser view / screenshots

### SDK Features

Browser-use is included by default with `EVOLVE_API_KEY`. Extract URLs from tool_call_update events:

```ts
interface BrowserUseResponse {
  live_url?: string;           // VNC live view URL (real-time browser)
  screenshot_url?: string;     // Final screenshot URL
  steps?: Array<{ screenshot_url?: string }>;  // Per-step screenshots
}

// Extraction helper
function extractBrowserUseUrls(text: string): { liveUrl?: string; screenshotUrl?: string } {
  let liveUrl: string | undefined;
  let screenshotUrl: string | undefined;

  // 1. Regex extraction (fast, handles malformed JSON)
  const liveMatch = text.match(/"live_url"\s*:\s*"([^"]+)"/);
  if (liveMatch) liveUrl = liveMatch[1];

  const screenshotMatch = text.match(/"screenshot_url"\s*:\s*"([^"]+)"/);
  if (screenshotMatch) screenshotUrl = screenshotMatch[1];

  // 2. JSON.parse fallback (for steps[].screenshot_url)
  if (!liveUrl || !screenshotUrl) {
    try {
      const parsed = JSON.parse(text) as BrowserUseResponse;
      if (!liveUrl) liveUrl = parsed.live_url;
      if (!screenshotUrl) screenshotUrl = parsed.screenshot_url ?? parsed.steps?.[0]?.screenshot_url;
    } catch {}
  }

  return { liveUrl, screenshotUrl };
}
```

### UI Integration
```ts
// In tool_call_update handler
const urls = extractBrowserUseUrls(toolContent);

if (urls.liveUrl) {
  // Show live browser iframe - real-time VNC view
  setBrowserLiveUrl(urls.liveUrl);
  // Save to task for reconnection
  updateTask({ browser_live_url: urls.liveUrl });
}

if (urls.screenshotUrl) {
  // Show screenshot image
  setBrowserScreenshotUrl(urls.screenshotUrl);
  // Save latest screenshot to task
  updateTask({ browser_screenshot_url: urls.screenshotUrl });
}
```

### Database Fields
```sql
-- In tasks table
browser_live_url TEXT,       -- VNC live view URL
browser_screenshot_url TEXT  -- Latest screenshot URL
```

---

## 7. Skills

### UI Components
- `components/selection-modal.tsx` - Skills selection
- `lib/skills.ts` - Available skills list

### SDK Features
```ts
evolve.withSkills(["pdf", "docx", "pptx", "xlsx"]);
// browser-use included by default
```

### Available Skills

| Category | Skills |
|----------|--------|
| **Documents** | `pdf`, `docx`, `pptx`, `xlsx` |
| **Browser** | `agent-browser`, `dev-browser`, `webapp-testing` |
| **Research** | `content-research-writer`, `lead-research-assistant` |
| **Design** | `canvas-design`, `image-enhancer`, `theme-factory` |
| **Business** | `file-organizer`, `invoice-organizer`, `brand-guidelines` |
| **Development** | `mcp-builder`, `skill-creator`, `changelog-generator` |

---

## 8. Integrations (Composio)

### UI Components
- `app/settings/page.tsx` - Integration management
- `components/selection-modal.tsx` - Integration selection for tasks

### SDK Features

#### Get OAuth URL (Settings page)
```ts
const { url } = await Evolve.composio.auth("user_123", "github");
// Render: <a href={url}>Connect GitHub</a>
```

#### Check Connection Status
```ts
// Simple status check
const status = await Evolve.composio.status("user_123");
// { github: true, gmail: false, slack: true }

// Single toolkit check
const isConnected = await Evolve.composio.status("user_123", "github");
// true | false

// Detailed connection info
const connections = await Evolve.composio.connections("user_123");
// [{ toolkit: "github", connected: true, accountId: "ca_..." }, ...]
```

#### Use in Task
```ts
evolve.withComposio("user_123", {
  toolkits: ["github", "gmail", "slack"],
  tools: {
    github: ["github_create_issue", "github_list_repos"],  // Enable specific
    gmail: { disable: ["gmail_delete_email"] },            // Disable dangerous
  },
});
```

#### API Key Auth (bypass OAuth)
```ts
evolve.withComposio("user_123", {
  toolkits: ["stripe", "sendgrid"],
  keys: {
    stripe: process.env.STRIPE_API_KEY,
    sendgrid: process.env.SENDGRID_API_KEY,
  },
});
```

---

## 9. Session Management

### UI Components
- Task persistence across page refreshes
- Pause/resume task functionality

### SDK Features

#### Get Session ID
```ts
const sessionId = evolve.getSession();  // Returns sandbox ID or null
// Save to database/localStorage for reconnection
```

#### Reconnect to Session
```ts
const evolve = new Evolve()
  .withAgent({ type: "claude" })
  .withSession(savedSessionId);  // Reconnect to existing sandbox

await evolve.run({ prompt: "Continue where we left off" });
```

#### Pause/Resume (billing control)
```ts
await evolve.pause();   // Suspend sandbox (stops billing, preserves state)
// ... later ...
await evolve.resume();  // Reactivate same sandbox
await evolve.run({ prompt: "Continue" });  // Session intact
```

#### Kill Session
```ts
await evolve.kill();  // Destroy sandbox; next run() creates new one
```

#### Switch Between Sandboxes
```ts
// Save current session
const sessionA = evolve.getSession();

// Switch to different sandbox
await evolve.setSession('existing-sandbox-b-id');
await evolve.run({ prompt: 'Work in sandbox B' });

// Switch back
await evolve.setSession(sessionA);
await evolve.run({ prompt: 'Continue in sandbox A' });
```

### Task Session Store
```ts
// Server-side session management
interface TaskSession {
  taskId: string;
  sessionId: string;
  agent: string;
  model: string;
  status: "running" | "paused" | "completed";
  createdAt: Date;
}

// Store mapping
const sessions = new Map<string, Evolve>();

// Create
sessions.set(taskId, evolve);

// Retrieve
const evolve = sessions.get(taskId);

// Reconnect after server restart
const evolve = new Evolve()
  .withAgent({ type: task.agent, model: task.model })
  .withSession(task.sessionId);
```

---

## 10. System Prompt

### SDK Features
```ts
evolve.withSystemPrompt(`
You are Manus Evolve, a powerful AI agent.
You can execute code, browse the web, manage files, and solve complex tasks.

Current project: ${project.name}
Project description: ${project.description}
`);
```

---

## 11. Observability

### SDK Features
```ts
evolve.withSessionTagPrefix("swarmkit-task");

// Access observability data
console.log(evolve.getSessionTag());        // "swarmkit-task-ab12cd34"
console.log(evolve.getSessionTimestamp());  // Timestamp for log file
```

### Dashboard
- Full traces at https://dashboard.evolvingmachines.ai/traces
- Tool calls, file operations, responses, reasoning

---

## 12. Direct Shell Commands

### SDK Features
```ts
// Execute command directly in sandbox (bypasses agent)
const result = await evolve.executeCommand("pytest", {
  timeoutMs: 10 * 60 * 1000,  // Optional, default 1 hour
  background: false,          // Optional
});

console.log(result.exitCode);
console.log(result.stdout);
console.log(result.stderr);
```

### Response Type
```ts
type AgentResponse = {
  sandboxId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
};
```

---

## 13. Port Forwarding

### SDK Features
```ts
// Get public URL for a port running in sandbox
const url = await evolve.getHost(8000);
console.log(`Service available at ${url}`);
```

Useful for:
- Previewing web apps built by agent
- Accessing services started in sandbox

---

## 14. Secrets Injection

### SDK Features
```ts
// Inject environment variables into sandbox
evolve.withSecrets({
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  DATABASE_URL: process.env.DATABASE_URL,
});
```

Secrets are available as environment variables inside the sandbox.

---

## Implementation Phases

### Phase 1: Core Execution
- [ ] Agent configuration from model selector
- [ ] `evolve.run()` for task execution
- [ ] Event streaming to UI (messages, tool calls, progress)
- [ ] Basic error handling

### Phase 2: File Handling
- [ ] `withContext()` for initial project files
- [ ] `uploadContext()` for mid-task uploads
- [ ] `getOutputFiles()` for artifacts
- [ ] `readLocalDir()` / `saveLocalDir()` helpers

### Phase 3: Browser Automation
- [ ] Extract `live_url` from tool_call_update
- [ ] Extract `screenshot_url` from tool_call_update
- [ ] Live browser iframe display
- [ ] Screenshot gallery

### Phase 4: Integrations
- [ ] `Evolve.composio.auth()` for OAuth
- [ ] `Evolve.composio.status()` for connection status
- [ ] `Evolve.composio.connections()` for detailed info
- [ ] `withComposio()` for task integrations

### Phase 5: Session Management
- [ ] Save session ID to database
- [ ] `withSession()` for reconnection
- [ ] `setSession()` for switching sandboxes
- [ ] `pause()` / `resume()` / `kill()`

### Phase 6: Advanced Features
- [ ] System prompts per project (`withSystemPrompt`)
- [ ] Skills configuration (`withSkills`)
- [ ] Observability tags (`withSessionTagPrefix`)
- [ ] Secrets injection (`withSecrets`)
- [ ] Direct shell commands (`executeCommand`)
- [ ] Port forwarding (`getHost`)

---

## API Routes to Create

```
# Tasks
POST   /api/tasks              # Create new task
GET    /api/tasks/:id          # Get task with messages/progress
POST   /api/tasks/:id/run      # Run/continue task (streaming SSE)
POST   /api/tasks/:id/upload   # Upload files mid-task
GET    /api/tasks/:id/output   # Get output files/artifacts
POST   /api/tasks/:id/pause    # Pause task sandbox
POST   /api/tasks/:id/resume   # Resume task sandbox
DELETE /api/tasks/:id          # Kill task sandbox

# Projects
GET    /api/projects           # List user's projects
POST   /api/projects           # Create project
GET    /api/projects/:id       # Get project with files
GET    /api/projects/:id/tasks # List tasks in project

# Integrations (Composio)
GET    /api/integrations/status           # Check all connection statuses
POST   /api/integrations/:toolkit/connect # Get OAuth URL
DELETE /api/integrations/:toolkit         # Disconnect integration

# Files
POST   /api/files/upload       # Upload file (returns path)
GET    /api/files/:id          # Download file by ID
```

---

## Environment Variables

```bash
# .env.local
EVOLVE_API_KEY=sk-...           # Evolve gateway key
COMPOSIO_API_KEY=...            # Composio integrations
```

---

## Dependencies

```bash
npm install @evolvingmachines/sdk zod
```
