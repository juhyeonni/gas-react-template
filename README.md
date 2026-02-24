# GAS + React Template

Minimal template for building web apps on Google Apps Script with React.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Google Apps Script
- **Build**: esbuild + Babel (template-literals transform)
- **Deploy**: clasp

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Login to clasp

```bash
pnpm exec clasp login
```

This opens a browser window for Google OAuth. After authorization, credentials are saved to `~/.clasprc.json`.

> If you're on a remote/headless server, use `clasp login --no-localhost` and paste the auth code manually.

### 3. Create a new GAS project

**Option A: Create a standalone script**

```bash
pnpm exec clasp create --type webapp --title "My App" --rootDir build
```

This generates `.clasp.json` with the new script ID automatically.

**Option B: Create a script bound to a Google Sheet**

```bash
# Create a new spreadsheet-bound script
pnpm exec clasp create --type sheets --title "My App" --rootDir build
```

**Option C: Use an existing GAS project**

1. Open your project at [script.google.com](https://script.google.com)
2. Copy the script ID from **Project Settings > IDs**
3. Create `.clasp.json` manually:

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "build"
}
```

### 4. Configure as web app (if created via clasp)

After creating, open the Apps Script editor to verify web app settings:

```bash
pnpm exec clasp open
```

In the editor: **Deploy > New deployment > Web app** — set access to "Anyone" or your preferred scope.

### 5. Build and deploy

```bash
pnpm run build   # Build only
pnpm run push    # Build + push to GAS
pnpm run deploy  # Build + push + deploy (dev)
```

## Commands

```bash
pnpm run build              # Build for production
pnpm run push               # Build + push to GAS
pnpm run deploy             # Build + push + deploy (dev)
pnpm run deploy:production  # Build + push + deploy (production)
```

## Project Structure

```
src/
├── client/           # React frontend
│   ├── main.tsx      # Entry point
│   ├── App.tsx       # Root component (HashRouter)
│   ├── pages/        # Page components
│   ├── api/          # GAS API wrapper (gasCall)
│   └── styles/       # Tailwind CSS
└── server/           # GAS backend
    └── index.ts      # doGet, apiGet, apiPost, include
```

## How It Works

- **HashRouter** is used because GAS doesn't support HTML5 History API
- **esbuild** bundles the React app into a single IIFE, then Babel transforms template literals for GAS compatibility
- **CSS is inlined** into `index.html`, JS is loaded via GAS `include()` pattern
- **`escapeJsForGas`** escapes `</script>` and `://` patterns that break GAS HTML embedding
- Server code is bundled as ESM then stripped of `import`/`export` for GAS `.gs` format
