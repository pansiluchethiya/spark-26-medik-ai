# Medik Triage — AI Diagnostic Assistant

Fast, focused AI triage/diagnostic PWA. Describe symptoms → receive evidence-informed assessment, red flags, self-care guidance, and citations — all in a streaming response with web search grounding.

![Medik Triage](public/icons/icon-512.svg)

## Features

- **AI Triage**: Groq (GPT-OSS 120B) or Gemini streaming response with structured sections
- **Web Search Grounded**: Live web search (Tavily or DuckDuckGo) for current medical guidance
- **Structured Output**: `[SECTION:assessment]` / `[SECTION:urgent]` / `[SECTION:selfcare]` / `[SECTION:sources]` cards
- **Voice Input**: Microphone-to-text for symptom description
- **TTS Playback**: Read responses aloud (browser speech synthesis)
- **Chat History**: Hamburger drawer with past conversations, local-only storage
- **Settings**: Theme (light/dark), voice selection, auto-read toggle
- **PWA**: Installable on mobile/desktop with offline support
- **Cloudflare Pages**: Zero-config deployable serverless architecture
- **Fully Responsive**: Mobile-first design with safe-area support

## Architecture

```
server.ts                    # Node.js HTTP server (dev/local)
├── routes/
│   └── chat.ts              # POST /api/v1/ai/chat handler
├── ai/
│   ├── stream.ts            # SSE streaming to client
│   └── providers_groq.ts    # Groq agent (2 rounds, 1 web_search max)
├── tools/
│   ├── prompt.ts            # Triage system prompt
│   ├── schemas.ts           # Web-search-only schema
│   ├── research.ts          # web_search, fetch_web_page, searchPubMed
│   └── executor.ts          # Tool execution dispatcher
└── functions/               # Cloudflare Pages edge functions
    └── api/v1/ai/chat.ts    # Edge-compatible handler
```

## Quick Start

### Prerequisites

- **Node.js** 20+ ([nvm](https://github.com/nvm-sh/nvm) recommended)
- **npm** 10+
- **API Keys** (see [API Keys](#api-keys))

### Installation

```bash
# Clone or enter the project directory
cd /path/to/medik-demo

# Install dependencies
source ~/.nvm/nvm.sh && nvm use 24
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```bash
# --- Required ---
GROQ_API_KEY=gsk_your_groq_api_key_here
# Get from: https://console.groq.com/keys
# Free tier: ~30 prompts/minute on gpt-oss-120b

# --- Optional (improves web search quality) ---
TAVILY_API_KEY=your_tavily_api_key_here
# Get from: https://tavily.com/
# Falls back to DuckDuckGo HTML search if not set

GEMINI_API_KEY=your_gemini_api_key_here
# Fallback provider if Groq is unavailable

# --- Configuration ---
DEMO_API_PORT=4100
# Port for the local development server (default: 4100)
```

### Environment Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | **Yes** | — | Groq API key for AI inference |
| `GROQ_MODEL` | No | `openai/gpt-oss-120b` | Groq model to use |
| `TAVILY_API_KEY` | No | DuckDuckGo | Tavily search API for medical queries |
| `GEMINI_API_KEY` | No | — | Gemini fallback model |
| `DEMO_API_PORT` | No | `4100` | Local dev server port |

### Development

```bash
# Terminal 1: Start the Node.js server
source ~/.nvm/nvm.sh && nvm use 24
npm run server

# Terminal 2: Start the Vite dev server with hot-reload
source ~/.nvm/nvm.sh && nvm use 24
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the Vite proxy routes `/api/*` to `localhost:4100`.

### Build for Production

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm run build
```

This compiles TypeScript, builds the Vite bundle, and copies `functions/` → `dist/functions/`.

### Run the Production Server

```bash
source ~/.nvm/nvm.sh && nvm use 24
npm start
```

Serves `dist/` on port 4100 with the API and SPA fallback.

## Cloudflare Pages Deployment

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/)
- [wrangler CLI](https://developers.cloudflare.com/workers/cli-install/)
- GitHub repository (recommended)

### Deploy via GitHub (Recommended)

1. Push your repo to GitHub
2. Go to [Cloudflare Pages > Create a project](https://dash.cloudflare.com/?to=/:account/pages)
3. Set:
    - **Build command**: `npm run build`
    - **Build output directory**: `dist`
    - **Environment variables**: `GROQ_API_KEY`, `TAVILY_API_KEY`, `GEMINI_API_KEY`
      (set these in the Pages dashboard under **Settings → Environment variables** — do NOT commit secrets to the repo; use `.env.example` as a template)
4. Click **Save and Deploy**

**Auto-redeploy**: Cloudflare Pages automatically rebuilds and redeploys on every push to `main`. After adding environment variables in the dashboard, simply commit any change and push — the site updates automatically.

### Deploy via wrangler CLI

```bash
npx install wrangler

# Login to Cloudflare
npx wrangler login

# Deploy the Pages project
npx wrangler pages deploy dist --project-name=medik-triage

# Or deploy with preview
npx wrangler pages dev dist
```

The `functions/api/v1/ai/chat.ts` file becomes the serverless API endpoint. The `dist/` directory serves the static SPA. The `wrangler.toml` configures Pages with `dist` as the build output.

### Local Pages Preview

```bash
npx wrangler pages dev dist
# Open http://localhost:8765
```

## PWA Setup

The app is configured as a Progressive Web App:

- **Manifest**: `public/manifest.webmanifest` defines app metadata, icons, and display mode
- **Service Worker**: `public/service-worker.js` provides offline caching and API fallback
- **Icons**: `public/icons/icon-192.svg` and `public/icons/icon-512.svg` (SVG format)
- **Theme**: Auto-switches between light/dark based on system preference and user settings

### Generating PNG Icons

SVG icons work for modern browsers, but some platforms require PNGs. To generate:

```bash
# Using ImageMagick (if available)
convert public/icons/icon-512.svg -resize 192x192 public/icons/icon-192.png
convert public/icons/icon-512.svg -resize 512x512 public/icons/icon-512.png

# Or use an online converter: https://realfavicongenerator.net/
```

## Project Structure

```
medik-demo/
├── functions/                    # Cloudflare Pages edge functions
│   └── api/v1/ai/chat.ts        # Edge-compatible chat handler
├── public/                       # Static assets served as-is
│   ├── _routes.json             # Cloudflare Pages routing rules
│   ├── manifest.webmanifest       # PWA manifest
│   ├── favicon.svg              # Favicon
│   ├── icons/                   # App icons (SVG)
│   │   ├── icon-192.svg
│   │   └── icon-512.svg
│   └── service-worker.js        # PWA service worker
├── scripts/
│   └── copy-functions.mjs       # Post-build: copies functions/ → dist/functions/
├── server/                      # Node.js server source
│   ├── server.ts                # Main server entry
│   ├── routes/
│   │   └── chat.ts              # Chat route handler
│   ├── ai/
│   │   ├── stream.ts            # SSE streaming
│   │   └── providers_groq.ts    # Groq agent
│   └── tools/
│       ├── prompt.ts            # System prompt
│       ├── schemas.ts           # Tool schemas
│       ├── research.ts          # Web search & fetch
│       └── executor.ts          # Tool executor
├── src/                         # React client source
│   ├── App.tsx                  # Main application component
│   ├── main.tsx                 # Entry point
│   ├── types/app.ts             # TypeScript types
│   ├── lib/
│   │   ├── stream.ts            # SSE parser
│   │   ├── tts.ts               # Text-to-speech
│   │   └── store/               # LocalStorage management
│   └── components/
│       ├── ChatMessages.tsx     # Message rendering
│       ├── MarkdownResponse.tsx # Section-based markdown
│       ├── ChatComposer.tsx     # Text + mic input
│       ├── ChatHistoryDrawer.tsx # Hamburger history
│       ├── SettingsModal.tsx    # Theme/voice/settings
│       └── VoiceInput.tsx       # Speech-to-text
├── index.html                   # HTML entry point (PWA links)
├── vite.config.ts               # Vite + Tailwind config
├── wrangler.toml                # Cloudflare Pages config
├── .env.example                 # Environment variable template
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript config
└── README.md                    # This file
```

## API Reference

### POST /api/v1/ai/chat

```json
{
  "messages": [
    { "role": "user", "content": "I have a fever and sore throat" }
  ],
  "stream": true
}
```

**Response** (SSE stream when `stream: true`):
- `data: {"token": "..."}` — Streaming text chunks
- `data: {"tool": {...}}` — Tool execution events
- `data: {"sources": [...]}` — Verified source citations
- `data: {"done": true}` — Stream end

**Response** (JSON when `stream: false`):
```json
{ "message": { "role": "assistant", "content": "..." } }
```

**Error responses**: `VALIDATION_ERROR`, `UNAUTHORIZED`, `INTERNAL_ERROR`

### GET /health

```json
{ "ok": true }
```

## License

MIT
# spark-26-medik-ai
# spark-26-medik-ai
