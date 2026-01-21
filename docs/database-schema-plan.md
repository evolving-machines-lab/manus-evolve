# Manus Evolve - Database Schema Plan

## Overview

This document outlines the complete database schema required for Manus Evolve, based on the current UI components and data flows.

---

## Tables

### 1. Users

For multi-user support and authentication.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2. Projects

Container for organizing tasks and resources.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
```

**Currently persists in:** `localStorage['swarmkit-projects']`

---

### 3. Tasks

Individual task/conversation with an agent.

```sql
CREATE TYPE task_status AS ENUM ('pending', 'running', 'paused', 'completed', 'failed');
CREATE TYPE agent_type AS ENUM ('claude', 'codex', 'gemini', 'qwen');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,  -- nullable for standalone tasks
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  prompt TEXT NOT NULL,
  status task_status DEFAULT 'pending',
  agent agent_type NOT NULL,
  model VARCHAR(50) NOT NULL,  -- e.g., 'opus', 'sonnet', 'gpt-5.2'
  session_id VARCHAR(255),  -- Evolve session ID for reconnection
  browser_live_url TEXT,  -- VNC live view URL (from browser-use)
  browser_screenshot_url TEXT,  -- Latest screenshot URL (from browser-use)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
```

**Currently persists in:** `localStorage['swarmkit-tasks-{projectId}']` or `localStorage['swarmkit-tasks-standalone']`

---

### 4. Messages

Chat messages within a task.

```sql
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE content_type AS ENUM ('text', 'image');

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content_type content_type DEFAULT 'text',
  content TEXT NOT NULL,  -- Text content or base64 image data
  mime_type VARCHAR(50),  -- For images: 'image/png', 'image/jpeg'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_task_id ON messages(task_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

---

### 5. Tool Calls

External tool/API calls made during task execution.

```sql
CREATE TYPE tool_call_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');
CREATE TYPE tool_kind AS ENUM ('read', 'edit', 'delete', 'move', 'search', 'execute', 'think', 'fetch', 'switch_mode', 'other');

CREATE TABLE tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  tool_call_id VARCHAR(255) NOT NULL,  -- Evolve's toolCallId for updates
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),  -- Human-readable title
  kind tool_kind DEFAULT 'other',
  status tool_call_status DEFAULT 'pending',
  input JSONB,
  output JSONB,
  locations JSONB,  -- Array of {path, line} for file references
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tool_calls_message_id ON tool_calls(message_id);
CREATE INDEX idx_tool_calls_tool_call_id ON tool_calls(tool_call_id);
```

---

### 6. Progress Items

Step-by-step progress tracking for task execution.

```sql
CREATE TYPE progress_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE progress_priority AS ENUM ('high', 'medium', 'low');

CREATE TABLE progress_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status progress_status DEFAULT 'pending',
  priority progress_priority DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_progress_items_task_id ON progress_items(task_id);
```

---

### 7. Artifacts

Generated files/outputs from task execution.

```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,  -- Storage path (S3/local)
  type VARCHAR(100) NOT NULL,  -- MIME type
  size BIGINT NOT NULL,  -- Bytes
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_artifacts_task_id ON artifacts(task_id);
```

**Note:** File content stored in blob storage (S3/GCS), path references stored here.

---

### 8. Project Files

Context files uploaded for a project.

```sql
CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,  -- Storage path (S3/local)
  type VARCHAR(100) NOT NULL,  -- MIME type
  size BIGINT NOT NULL,  -- Bytes
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_project_files_project_id ON project_files(project_id);
```

---

### 9. Integrations (Reference/Catalog)

Available integrations catalog - seeded from static data.

```sql
CREATE TABLE integrations (
  id VARCHAR(50) PRIMARY KEY,  -- e.g., 'gmail', 'slack', 'github'
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  category VARCHAR(50) NOT NULL
);
```

**Seeded from:** `lib/integrations.ts` AVAILABLE_INTEGRATIONS

---

### 10. Skills (Reference/Catalog)

Available skills catalog - seeded from static data.

```sql
CREATE TYPE skill_category AS ENUM ('documents', 'research', 'design', 'business', 'development', 'media');

CREATE TABLE skills (
  id VARCHAR(50) PRIMARY KEY,  -- e.g., 'pdf', 'frontend-design'
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  category skill_category NOT NULL
);
```

**Seeded from:** `lib/skills.ts` AVAILABLE_SKILLS

---

### 11. User Integrations

Track which integrations a user has connected (Composio).

```sql
CREATE TABLE user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_id VARCHAR(50) NOT NULL REFERENCES integrations(id),
  connected BOOLEAN DEFAULT FALSE,
  account_id VARCHAR(255),  -- Composio account ID
  connected_at TIMESTAMP,
  expires_at TIMESTAMP,  -- For OAuth token expiry
  UNIQUE(user_id, integration_id)
);

CREATE INDEX idx_user_integrations_user_id ON user_integrations(user_id);
```

**Currently persists in:** `localStorage['swarmkit-integrations']`

---

### 12. Project Integrations (Junction)

Which integrations are enabled for a specific project.

```sql
CREATE TABLE project_integrations (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  integration_id VARCHAR(50) NOT NULL REFERENCES integrations(id),
  enabled_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, integration_id)
);
```

---

### 13. Task Integrations (Junction)

Which integrations are used/available for a specific task.

```sql
CREATE TABLE task_integrations (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  integration_id VARCHAR(50) NOT NULL REFERENCES integrations(id),
  used_at TIMESTAMP,
  PRIMARY KEY (task_id, integration_id)
);
```

---

### 14. Project Skills (Junction)

Which skills are enabled for a specific project.

```sql
CREATE TABLE project_skills (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  skill_id VARCHAR(50) NOT NULL REFERENCES skills(id),
  enabled_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, skill_id)
);
```

---

### 15. Task Skills (Junction)

Which skills are used/available for a specific task.

```sql
CREATE TABLE task_skills (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  skill_id VARCHAR(50) NOT NULL REFERENCES skills(id),
  used_at TIMESTAMP,
  PRIMARY KEY (task_id, skill_id)
);
```

---

## Enums Summary

| Enum | Values |
|------|--------|
| task_status | `pending`, `running`, `paused`, `completed`, `failed` |
| agent_type | `claude`, `codex`, `gemini`, `qwen` |
| message_role | `user`, `assistant`, `system` |
| content_type | `text`, `image` |
| tool_call_status | `pending`, `in_progress`, `completed`, `failed` |
| tool_kind | `read`, `edit`, `delete`, `move`, `search`, `execute`, `think`, `fetch`, `switch_mode`, `other` |
| progress_status | `pending`, `in_progress`, `completed` |
| progress_priority | `high`, `medium`, `low` |
| skill_category | `documents`, `research`, `design`, `business`, `development`, `media` |

---

## Relationships Diagram

```
USERS (1)
  │
  ├──→ (1..n) PROJECTS
  │      │
  │      ├──→ (1..n) TASKS
  │      │      │
  │      │      ├──→ (1..n) MESSAGES
  │      │      │      └──→ (1..n) TOOL_CALLS
  │      │      │
  │      │      ├──→ (1..n) PROGRESS_ITEMS
  │      │      ├──→ (1..n) ARTIFACTS
  │      │      ├──→ (m..n) TASK_INTEGRATIONS
  │      │      └──→ (m..n) TASK_SKILLS
  │      │
  │      ├──→ (1..n) PROJECT_FILES
  │      ├──→ (m..n) PROJECT_INTEGRATIONS
  │      └──→ (m..n) PROJECT_SKILLS
  │
  ├──→ (1..n) STANDALONE TASKS (project_id = NULL)
  │
  └──→ (m..n) USER_INTEGRATIONS
              │
              └──→ INTEGRATIONS (catalog)

SKILLS (catalog)
  └──→ Referenced by PROJECT_SKILLS, TASK_SKILLS
```

---

## Common Queries

### Get all projects for a user
```sql
SELECT * FROM projects
WHERE user_id = $1
ORDER BY updated_at DESC;
```

### Get all tasks for a project
```sql
SELECT * FROM tasks
WHERE project_id = $1
ORDER BY created_at DESC;
```

### Get standalone tasks for a user
```sql
SELECT * FROM tasks
WHERE user_id = $1 AND project_id IS NULL
ORDER BY created_at DESC;
```

### Get task with messages and progress
```sql
SELECT t.*,
  json_agg(DISTINCT m.*) as messages,
  json_agg(DISTINCT p.*) as progress
FROM tasks t
LEFT JOIN messages m ON m.task_id = t.id
LEFT JOIN progress_items p ON p.task_id = t.id
WHERE t.id = $1
GROUP BY t.id;
```

### Get user's connected integrations
```sql
SELECT i.*, ui.connected, ui.connected_at
FROM integrations i
LEFT JOIN user_integrations ui ON ui.integration_id = i.id AND ui.user_id = $1
ORDER BY i.category, i.name;
```

### Get task count per project
```sql
SELECT p.id, p.name, COUNT(t.id) as task_count
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
WHERE p.user_id = $1
GROUP BY p.id;
```

---

## Evolve SDK Event → Database Mapping

| SDK Event | Database Operation |
|-----------|-------------------|
| `evolve.run()` called | Create task with `status: 'running'` |
| `agent_message_chunk` | Append to messages (role: 'assistant', content_type: 'text') |
| `agent_message_chunk` (image) | Insert message (role: 'assistant', content_type: 'image', mime_type) |
| `user_message_chunk` | Insert message (role: 'user') |
| `tool_call` | Insert tool_call with tool_call_id, name, kind, status: 'in_progress' |
| `tool_call_update` | Update tool_call by tool_call_id (status, output, locations) |
| `tool_call_update` (browser) | Update task.browser_live_url, task.browser_screenshot_url |
| `plan` | Replace all progress_items for task |
| `evolve.getSession()` | Save to task.session_id |
| `evolve.pause()` | Update task.status = 'paused' |
| `evolve.resume()` | Update task.status = 'running' |
| `evolve.kill()` | Update task.status = 'completed' |
| `evolve.getOutputFiles()` | Insert artifacts for each file |
| Error thrown | Update task.status = 'failed' |

---

## Migration from localStorage

Current localStorage keys to migrate:

| localStorage Key | Target Table(s) |
|-----------------|-----------------|
| `swarmkit-projects` | projects, project_integrations, project_skills, project_files |
| `swarmkit-tasks-{projectId}` | tasks, messages, tool_calls, progress_items, artifacts |
| `swarmkit-tasks-standalone` | tasks (with project_id = NULL) |
| `swarmkit-integrations` | user_integrations |

---

## Implementation Notes

### Database Choice
- **Recommended:** PostgreSQL (supports JSONB, ENUMs, UUIDs natively)
- **ORM:** Prisma or Drizzle for TypeScript integration

### File Storage
- Artifacts and ProjectFiles store path references
- Actual files stored in blob storage (S3, GCS, or local for dev)

### Session Management
- `session_id` in tasks table stores Evolve session ID
- Used for reconnection via `Evolve.withSession(sessionId)`

### Soft Deletes (Optional)
Consider adding `deleted_at` columns for soft deletes if needed:
```sql
ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP;
```

---

## API Routes Needed

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/tasks` | List tasks in project |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task with messages |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/tasks/standalone` | List standalone tasks |
| POST | `/api/tasks/:id/messages` | Add message to task |
| GET | `/api/integrations` | List all integrations with user status |
| POST | `/api/integrations/:id/connect` | Connect integration |
| DELETE | `/api/integrations/:id/disconnect` | Disconnect integration |
| POST | `/api/files/upload` | Upload file (project or artifact) |
| GET | `/api/files/:id` | Download file |
