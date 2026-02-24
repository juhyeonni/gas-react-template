# GAS + React Development Guide

> For developers who build with AI — why this architecture exists and how to use it.

---

## TL;DR

Google Apps Script (GAS) lets you deploy web apps for free on Google's infrastructure. But GAS alone is painful — no modules, no modern JS, no component system. This template gives you **React + TypeScript + Tailwind CSS** on the frontend, **Google Sheets as a database**, and a build pipeline that bundles everything into GAS-compatible files. The entire architecture is designed so that **AI agents (Claude, Cursor, etc.) can develop the app effectively**.

---

## Table of Contents

1. [The Problem: Why Not Just Write HTML?](#1-the-problem-why-not-just-write-html)
2. [Architecture Overview](#2-architecture-overview)
3. [Why This Structure?](#3-why-this-structure)
4. [Why This Is Better for AI Agents](#4-why-this-is-better-for-ai-agents)
5. [Project Structure](#5-project-structure)
6. [How the Build Works](#6-how-the-build-works)
7. [Client-Server Communication](#7-client-server-communication)
8. [Development Workflow](#8-development-workflow)
9. [Adding Features: A Practical Guide](#9-adding-features-a-practical-guide)
10. [Deployment](#10-deployment)
11. [Gotchas & Limitations](#11-gotchas--limitations)

---

## 1. The Problem: Why Not Just Write HTML?

### The "AI writes HTML" approach

You might be used to this workflow:

1. Tell AI: "Make me a todo app"
2. AI generates a single HTML file with inline CSS and JS
3. Open it in a browser — done

This works for **static prototypes**, but falls apart when you need:

- **Persistent data** — Where do you save tasks? LocalStorage dies when the browser clears.
- **Multi-user access** — You can't share a local HTML file as a live app.
- **Backend logic** — Authentication, data validation, scheduled jobs.
- **Deployment** — How do you host it? GitHub Pages is static-only.

### The GAS solution

Google Apps Script gives you all of this for free:

| Need | GAS Solution |
|------|-------------|
| Hosting | Google serves your app at a URL |
| Database | Google Sheets (read/write via `SpreadsheetApp`) |
| Auth | Google OAuth built-in |
| Cron jobs | Time-driven triggers |
| Email | `GmailApp.sendEmail()` |
| Cost | **Free** (within Google quotas) |

### The problem with GAS alone

But writing a web app directly in GAS is painful:

- **No modules** — Everything is global. No `import`/`export`.
- **No npm** — Can't use React, Tailwind, or any library.
- **No hot reload** — Edit → Push → Wait → Refresh.
- **Primitive templating** — GAS HtmlService is basic server-side templating.
- **No TypeScript** — No type safety, no autocomplete.
- **File size limits** — GAS has a 50MB total project limit.

### This template bridges the gap

You write modern React + TypeScript locally, and the build pipeline converts it into GAS-compatible files:

```
Modern Code (React/TS/Tailwind)  →  Build  →  GAS-Compatible Files  →  Deploy
```

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Google Apps Script                  │
│                                                       │
│  ┌──────────────────┐    ┌──────────────────────┐    │
│  │   index.html     │    │      Code.gs          │    │
│  │  ┌────────────┐  │    │                        │    │
│  │  │ React App  │──│────│→ google.script.run     │    │
│  │  │ (IIFE)     │  │    │                        │    │
│  │  │ + Tailwind │  │    │  doGet()               │    │
│  │  └────────────┘  │    │  apiGet(action, params) │    │
│  │                  │    │  apiPost(action, data)  │    │
│  └──────────────────┘    │                        │    │
│       Browser             │  → Google Sheets       │    │
│       (iframe)            │  → Gmail               │    │
│                          │  → Drive, etc.          │    │
│                          └──────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Two sides, one deployment:**

| Side | What | Where it runs | Language |
|------|------|--------------|----------|
| **Client** (`src/client/`) | React UI | Browser (GAS iframe) | TypeScript + JSX |
| **Server** (`src/server/`) | API + DB access | GAS V8 runtime | TypeScript → GAS |

---

## 3. Why This Structure?

### 3.1 Separation of Concerns

The `src/client/` and `src/server/` split isn't arbitrary. It mirrors a real client-server architecture:

```
src/
├── client/          # Runs in browser
│   ├── main.tsx     # Entry point
│   ├── App.tsx      # Root component + routing
│   ├── api/         # Communication layer
│   │   └── base.ts  # google.script.run wrapper
│   ├── pages/       # Page components
│   └── styles/      # Tailwind CSS
│
└── server/          # Runs on Google servers
    └── index.ts     # API routes + GAS entry points
```

**Why this matters:**

- **Client code** never touches Google Sheets directly. It calls the server.
- **Server code** never renders UI. It returns data.
- The **API layer** (`api/base.ts`) is the only bridge between them.

This means you can change the UI without touching backend logic, and vice versa.

### 3.2 Type Safety Across the Stack

Both sides use TypeScript. When you define an API response type, both the server (which creates it) and the client (which consumes it) share the same type contract:

```typescript
// server/index.ts
case 'tasks':
  return { tasks: getAllTasks() }  // Return type is inferred

// client/pages/TaskPage.tsx
const { tasks } = await apiGet<{ tasks: Task[] }>('tasks')
// TypeScript knows `tasks` is Task[]
```

### 3.3 Single Build, Single Deploy

Despite being two separate codebases, everything compiles down to just **4 files**:

```
build/
├── index.html       # HTML shell (CSS inlined)
├── app.html         # React bundle (single <script> tag)
├── Code.gs          # All server code
└── appsscript.json  # GAS manifest
```

One `pnpm run push` uploads everything. No separate frontend/backend deployments.

---

## 4. Why This Is Better for AI Agents

This is the key section. If you're using AI (Claude Code, Cursor, Copilot, etc.) to develop your app, this architecture gives the AI **massive advantages** over raw HTML or raw GAS.

### 4.1 Clear File Boundaries = Better AI Context

AI agents work best when they can **focus on one file at a time** with a clear purpose.

| File | Purpose | AI knows exactly what to do |
|------|---------|----------------------------|
| `src/server/index.ts` | Add API routes | "Add a `case 'users'` to `apiGet`" |
| `src/client/pages/UserPage.tsx` | Build UI | "Create a table that shows users" |
| `src/client/api/base.ts` | API calls | Rarely needs changes |

Compare this to a single HTML file where HTML, CSS, JS, and "backend" logic are all interleaved. The AI has to parse thousands of lines to find where to add a feature.

### 4.2 Predictable Patterns = Fewer Mistakes

The template establishes **conventions** that AI agents learn quickly:

**Adding a new API endpoint (server):**
```typescript
// Always the same pattern in src/server/index.ts
case 'newAction':
  return { result: doSomething(params) }
```

**Calling it from the client:**
```typescript
// Always the same pattern
const data = await apiGet<ResponseType>('newAction', { key: 'value' })
```

**Creating a new page:**
```typescript
// Always: export function + Tailwind classes
export function NewPage() {
  return <div className="max-w-2xl mx-auto py-12 px-4">...</div>
}
```

AI agents excel at **repeating patterns**. When every feature follows the same structure, the AI makes fewer errors and needs less correction.

### 4.3 Component-Based UI = Composable by AI

With React components, AI can:

- **Create** a new component in isolation
- **Compose** components together
- **Modify** one component without breaking others
- **Delete** a component cleanly

With a monolithic HTML file, adding a feature means carefully inserting HTML in the right place, CSS that might conflict, and JS that shares the global scope. AI agents frequently break things in this scenario.

### 4.4 TypeScript = Self-Documenting Code

TypeScript gives AI agents **context about what's expected**:

```typescript
// AI reads this and immediately knows the shape of data
interface Task {
  id: string
  title: string
  status: 'todo' | 'doing' | 'done'
  assignee?: string
}

// AI can generate correct API calls without guessing
function apiGet<{ tasks: Task[] }>('tasks')
```

Without types, AI has to guess what data looks like, leading to runtime errors.

### 4.5 Small, Focused Files = Fits in Context Window

AI models have limited context windows. This architecture keeps files small:

- `src/server/index.ts` — ~60 lines (add routes here)
- `src/client/pages/HomePage.tsx` — ~20 lines (one page per file)
- `src/client/api/base.ts` — ~50 lines (rarely changes)

Each file fits easily in an AI's context window, so the AI can see the **entire file** and make precise edits. Compare this to a 3000-line HTML file where the AI loses track of the structure.

### 4.6 Build Pipeline Handles GAS Quirks

GAS has many quirks that trip up AI agents:

| GAS Quirk | Build pipeline handles it |
|-----------|--------------------------|
| No `import`/`export` | Stripped by build script |
| Template literals break in HtmlService | Babel transforms to string concat |
| `</script>` in code breaks HTML | Escaped to `<\/script>` |
| `://` breaks GAS parsing | Escaped to `:\u002F\u002F` |
| No npm modules | esbuild bundles everything inline |

Without this pipeline, AI would need to know all these GAS-specific escape rules and apply them manually — which it frequently forgets or gets wrong.

### 4.7 Prompt Examples for AI Development

Here are effective prompts you can give to AI when using this template:

**Adding a feature:**
> "Add a `/tasks` page that shows all tasks from Google Sheets. Create the API route in `src/server/index.ts` and the page component in `src/client/pages/TasksPage.tsx`. Add routing in `App.tsx`."

**Backend only:**
> "Add an `apiPost` action called 'createTask' in `src/server/index.ts` that writes a new row to the 'Tasks' sheet."

**Frontend only:**
> "Create a form component in `src/client/components/TaskForm.tsx` that calls `apiPost('createTask', { title, status })` on submit."

**Debugging:**
> "The `apiGet('tasks')` call returns an empty array. Read `src/server/index.ts` and check the Sheets API call."

Each prompt targets a **specific file** with a **specific purpose**. This is how you get the most out of AI development.

---

## 5. Project Structure

```
gas-react-template/
│
├── src/
│   ├── client/                  # React Frontend
│   │   ├── main.tsx             # Entry: renders <App /> into #root
│   │   ├── App.tsx              # Root component + HashRouter routes
│   │   ├── api/
│   │   │   └── base.ts          # google.script.run Promise wrapper
│   │   ├── pages/
│   │   │   ├── HomePage.tsx     # Home page
│   │   │   └── AboutPage.tsx    # About page
│   │   └── styles/
│   │       └── index.css        # Tailwind directives (@tailwind base/components/utilities)
│   │
│   └── server/                  # GAS Backend
│       └── index.ts             # doGet, include, apiGet, apiPost
│
├── scripts/
│   ├── build.mjs                # esbuild + Babel + HTML generation
│   └── deploy.mjs               # Build + push + clasp deploy
│
├── build/                       # Output (pushed to GAS)
│   ├── index.html               # HTML shell with inlined CSS
│   ├── app.html                 # React bundle in <script> tag
│   ├── Code.gs                  # Server code
│   └── appsscript.json          # GAS manifest
│
├── .clasp.json                  # clasp config (script ID, deployment IDs)
├── appsscript.json              # GAS manifest (scopes, webapp config)
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript config
└── tailwind.config.js           # Tailwind config
```

---

## 6. How the Build Works

The build pipeline (`scripts/build.mjs`) does 5 things:

### Step 1: Bundle React → IIFE

```
src/client/main.tsx  →  esbuild  →  dist/app.js (single file, minified)
```

- All React components, libraries, and code bundled into one file
- Format: IIFE (Immediately Invoked Function Expression) — no modules needed
- All `import` statements resolved at build time

### Step 2: Compile Tailwind CSS

```
src/client/styles/index.css  →  Tailwind CLI  →  dist/app.css (minified)
```

- Scans all `.tsx` files for class names
- Only includes CSS for classes actually used (tree-shaking)

### Step 3: Transpile Server Code → .gs

```
src/server/index.ts  →  esbuild  →  dist/Code.js  →  strip exports  →  build/Code.gs
```

- TypeScript → JavaScript
- `export` keywords removed (GAS uses global functions)
- `import` statements removed

### Step 4: Generate HTML Template

```
dist/app.css + dist/app.js  →  build/index.html + build/app.html
```

- CSS inlined into `<style>` tag in `index.html`
- JS wrapped in `<script>` tag as `app.html`
- `index.html` uses GAS `<?!= include('app') ?>` to load the JS
- Special escaping applied for GAS compatibility:
  - Template literals (`\``) → string concatenation
  - `</script>` → `<\/script>`
  - `://` → `:\u002F\u002F`

### Step 5: Copy Manifest

```
appsscript.json  →  build/appsscript.json
```

### Build flow diagram

```
src/client/main.tsx ──→ esbuild ──→ dist/app.js ──→ escape + babel ──→ build/app.html
src/client/styles/  ──→ tailwind ─→ dist/app.css ──→ inline ─────────→ build/index.html
src/server/index.ts ──→ esbuild ──→ dist/Code.js ─→ strip exports ──→ build/Code.gs
appsscript.json ─────────────────────────────────────→ copy ─────────→ build/appsscript.json
```

---

## 7. Client-Server Communication

### The Bridge: `google.script.run`

GAS provides `google.script.run` — a mechanism for browser-side code to call server-side GAS functions. This template wraps it in Promises for modern async/await usage.

### Client Side (`src/client/api/base.ts`)

```typescript
// Wrap google.script.run in a Promise
export function gasCall<T>(
  action: string,
  method: 'get' | 'post',
  data?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = google.script.run
      .withSuccessHandler((result: T) => {
        if (result && typeof result === 'object' && 'error' in result) {
          reject(new Error((result as { error: string }).error))
        } else {
          resolve(result)
        }
      })
      .withFailureHandler((error: Error) => reject(error))

    if (method === 'get') {
      handler.apiGet(action, data as Record<string, string>)
    } else {
      handler.apiPost(action, data)
    }
  })
}

// Convenience helpers
export function apiGet<T>(action: string, params?: Record<string, string>): Promise<T>
export function apiPost<T>(action: string, data?: Record<string, unknown>): Promise<T>
```

### Server Side (`src/server/index.ts`)

```typescript
// GET dispatcher — for reading data
export function apiGet(action: string, params: Record<string, string> = {}): unknown {
  switch (action) {
    case 'ping':
      return { message: 'pong', timestamp: new Date().toISOString() }
    case 'hello':
      return { message: `Hello, ${params.name || 'World'}!` }
    default:
      throw new Error(`Unknown GET action: ${action}`)
  }
}

// POST dispatcher — for writing data
export function apiPost(action: string, data: Record<string, unknown> = {}): unknown {
  switch (action) {
    case 'echo':
      return { echo: data }
    default:
      throw new Error(`Unknown POST action: ${action}`)
  }
}
```

### Communication Flow

```
React Component
    │
    ├─ await apiGet('tasks')
    │
    ▼
gasCall('tasks', 'get')
    │
    ├─ google.script.run.apiGet('tasks', {})
    │
    ▼
GAS Server (Code.gs)
    │
    ├─ apiGet('tasks', {})
    ├─ switch → case 'tasks' → SpreadsheetApp...
    │
    ▼
Returns data → Promise resolves → React re-renders
```

---

## 8. Development Workflow

### Initial Setup

```bash
# 1. Clone the template
git clone <repo-url> my-app
cd my-app

# 2. Install dependencies
pnpm install

# 3. Create a GAS project at script.google.com
#    Copy the Script ID from Project Settings

# 4. Configure clasp
#    Edit .clasp.json → set "scriptId": "YOUR_SCRIPT_ID"

# 5. Login to clasp
pnpm exec clasp login

# 6. Build and push
pnpm run push
```

### Development Cycle

There's no hot reload with GAS. The development cycle is:

```
Edit code → Build → Push → Refresh browser
```

```bash
# Build + push in one command
pnpm run push

# Or just build (to inspect output)
pnpm run build
```

### Commands Reference

| Command | What it does |
|---------|-------------|
| `pnpm run build` | Build client + server + HTML |
| `pnpm run push` | Build + push to GAS |
| `pnpm run deploy` | Build + push + deploy (dev) |
| `pnpm run deploy:production` | Build + push + deploy (production) |

---

## 9. Adding Features: A Practical Guide

### Example: Add a "Tasks" feature backed by Google Sheets

#### Step 1: Add the API route (server)

Edit `src/server/index.ts`:

```typescript
// Add to apiGet switch
case 'tasks': {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tasks')
  if (!sheet) return { tasks: [] }
  const data = sheet.getDataRange().getValues()
  const headers = data[0]
  const tasks = data.slice(1).map(row => ({
    id: row[0],
    title: row[1],
    status: row[2],
  }))
  return { tasks }
}

// Add to apiPost switch
case 'createTask': {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tasks')
  if (!sheet) throw new Error('Tasks sheet not found')
  const id = Utilities.getUuid()
  sheet.appendRow([id, data.title, data.status || 'todo'])
  return { id }
}
```

#### Step 2: Create the page component (client)

Create `src/client/pages/TasksPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '@/api/base'

interface Task {
  id: string
  title: string
  status: string
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')

  useEffect(() => {
    apiGet<{ tasks: Task[] }>('tasks').then(res => setTasks(res.tasks))
  }, [])

  const addTask = async () => {
    if (!title.trim()) return
    await apiPost('createTask', { title, status: 'todo' })
    setTitle('')
    const res = await apiGet<{ tasks: Task[] }>('tasks')
    setTasks(res.tasks)
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      <div className="flex gap-2 mb-6">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
          placeholder="New task..."
        />
        <button onClick={addTask} className="bg-blue-500 text-white px-4 py-2 rounded">
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {tasks.map(task => (
          <li key={task.id} className="bg-white border rounded p-3">
            {task.title} — <span className="text-gray-500">{task.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

#### Step 3: Add the route (client)

Edit `src/client/App.tsx`:

```tsx
import { TasksPage } from './pages/TasksPage'

// Add inside <Routes>:
<Route path="/tasks" element={<TasksPage />} />

// Add navigation link:
<Link to="/tasks">Tasks</Link>
```

#### Step 4: Build and deploy

```bash
pnpm run push
```

That's it. Three files touched, one command to deploy.

---

## 10. Deployment

### Dev Deployment

```bash
pnpm run deploy
# or
pnpm run deploy:dev
```

- First run: creates a new deployment and saves the ID to `.clasp.json`
- Subsequent runs: updates the same deployment

### Production Deployment

```bash
pnpm run deploy:production
```

- Prompts for a description (e.g., "v1.0.0 - Initial release")
- Creates a new versioned deployment
- Saves deployment ID to `.clasp.json`

### Accessing Your App

After deployment, your app is available at:

```
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```

### OAuth Scopes

Edit `appsscript.json` to add/remove permissions:

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

Common scopes:
- `spreadsheets` — Read/write Google Sheets
- `userinfo.email` — Get user's email
- `gmail.send` — Send emails
- `drive` — Access Google Drive
- `calendar` — Access Google Calendar

---

## 11. Gotchas & Limitations

### GAS Limitations

| Limitation | Detail |
|-----------|--------|
| Execution time | 6 minutes max per call |
| Daily quotas | Email, URL fetch, etc. have daily limits |
| No WebSocket | `google.script.run` is request-response only |
| No SSR | React runs client-side only |
| Payload size | ~50KB max per `google.script.run` call |
| Cold starts | First load can be slow (~2-5 seconds) |

### Routing

Use **HashRouter** (`/#/path`), not BrowserRouter. GAS doesn't support HTML5 History API — all URLs hit the same `doGet()` endpoint. HashRouter keeps routing client-side.

### No Dev Server

There's no `localhost` dev server. You must push to GAS to test:

```
Edit → pnpm run push → Refresh browser
```

For faster iteration on UI-only changes, you can temporarily render components in a local Vite dev server with mock data, but the full integration always requires GAS.

### Template Literals in Build Output

GAS's `HtmlService` can break on backticks in embedded JavaScript. The build pipeline uses Babel to convert template literals to string concatenation. If you see rendering errors, check the build output for stray backticks.

### The `<base target="_top">` Tag

The `index.html` includes `<base target="_top">`. This is required because GAS serves your app inside an iframe. Without this tag, links would navigate inside the iframe instead of the full page.

---

## Summary

| Aspect | Raw HTML | Raw GAS | This Template |
|--------|----------|---------|---------------|
| Database | None / LocalStorage | Google Sheets | Google Sheets |
| Hosting | Manual | Google (free) | Google (free) |
| UI Framework | None | None | React + Tailwind |
| Type Safety | No | No | TypeScript |
| Modules | No | No | Full (esbuild) |
| AI-Friendly | Poor (monolithic) | Poor (global scope) | Excellent (modular) |
| Deploy | Manual | clasp push | One command |
| Scalability | None | Limited | Component-based |

**Bottom line:** If you're building apps with AI assistance, give the AI **structure to work with**. This template provides that structure — clear file boundaries, predictable patterns, type safety, and a build pipeline that handles all the GAS quirks. The AI writes better code, makes fewer mistakes, and you ship faster.
