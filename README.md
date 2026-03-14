# MergeMind – Elite AI PR Reviewer

MergeMind is a full-stack tool that connects to GitHub, listens to pull-request webhooks, runs deep AI-powered code reviews (with optional RAG context over past PRs), and streams live progress and findings to a React dashboard.

---

## Project Structure

```
final-merge/
├── README.md
│
├── demo/                          # Hackathon demo assets
│   ├── demo_bad_code.js           # Sample vulnerable code for demo PRs
│   └── DEMO_SCRIPT.md             # Step-by-step live demo script (~4 min)
│
├── frontend/                      # React + Vite SPA
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── assets/                # hero.png, react.svg, vite.svg
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx    # Marketing / hero at /
│   │   │   ├── Dashboard.jsx      # Repo/PR picker, trigger reviews, live stream at /dashboard
│   │   │   ├── TeamHealth.jsx     # CTO view, leaderboard, trends at /team
│   │   │   └── ReviewHistory.jsx  # Past reviews at /history
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
│
└── Mergemind/                     # Node.js / Express backend
    ├── src/
    │   ├── controllers/
    │   │   └── githubController.js # Webhook + trigger-review handlers
    │   ├── mcp/                   # Model Context Protocol layer
    │   │   ├── client/
    │   │   │   ├── mcpClient.js
    │   │   │   ├── orchestrator.js
    │   │   │   ├── toolRegistry.js
    │   │   │   └── tool_registry.py
    │   │   ├── servers/
    │   │   │   ├── github-mcp/    # getPrDiff, getPrMetadata, listChangedFiles, postReviewComment
    │   │   │   └── qdrant-mcp/    # storeChunk, retrieveSimilar, searchByRepo
    │   │   └── shared/
    │   │       ├── toolSchema.js
    │   │       └── mcpError.js
    │   ├── rag/                   # RAG pipeline
    │   │   ├── vectorDb/          # Qdrant client
    │   │   ├── chunker.js
    │   │   ├── embedder.js
    │   │   ├── indexer.js
    │   │   └── retriever.js
    │   ├── routes/
    │   │   ├── authRoutes.js      # GitHub OAuth /auth/github
    │   │   ├── apiRoutes.js       # Protected /api/repos, /api/trigger-review
    │   │   └── githubRoutes.js
    │   ├── services/
    │   │   ├── aiReviewService.js # Groq LLaMA 3.3 70B review engine
    │   │   ├── diffService.js     # Chunk PR diffs
    │   │   ├── githubService.js   # Fetch diff, post comment
    │   │   ├── ragService.js      # RAG context retrieval & storage
    │   │   ├── reviewStore.js
    │   │   └── statsService.js
    │   ├── utils/
    │   │   └── chunkDiff.js
    │   ├── app.js
    │   ├── server.js
    │   └── testRag.js
    ├── .env.example
    └── package.json
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 19, Vite 8, Tailwind CSS, Framer Motion, React Router, Socket.io client |
| **Backend** | Node.js, Express 5, Socket.io |
| **Auth** | GitHub OAuth, JWT |
| **AI** | Groq (LLaMA 3.3 70B), OpenAI SDK (embeddings) |
| **RAG** | Qdrant (vector DB), ChromaDB |
| **Queue** | BullMQ, Redis (ioredis) |
| **MCP** | Model Context Protocol (github-mcp, qdrant-mcp servers) |

---

## Quick Start

### Prerequisites

- Node.js (v18+)
- Redis (for BullMQ)
- GitHub OAuth App (for dashboard login)

### 1. Backend

```bash
cd Mergemind
npm install
cp .env.example .env   # Edit with GITHUB_TOKEN, GROQ_API_KEY, etc.
node src/server.js
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Open

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

---

## Environment Variables

Configure `Mergemind/.env` (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `GITHUB_TOKEN` | GitHub PAT for API calls (or use OAuth for user-level) |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `JWT_SECRET` | Secret for signing JWTs |
| `GROQ_API_KEY` | Groq API key for LLaMA 3.3 70B |
| Qdrant/Chroma | RAG vector DB connection (host, port, API key) |

---

## Frontend Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero, feature cards, CTA to dashboard |
| `/dashboard` | Dashboard | GitHub sign-in, repo/PR picker, trigger reviews, live analysis stream |
| `/team` | Team Health | Leaderboard, trends, saved hours, common issues |
| `/history` | Review History | Past reviews |

---

## Key Features

- **GitHub-integrated AI PR reviews** — Webhook triggers and manual triggers from the dashboard
- **Real-time streaming** — Live progress and findings via Socket.io
- **Structured findings** — Severity, category, code suggestions, confidence scores
- **RAG-enhanced analysis** — Uses past PR context (Qdrant) for team-specific decisions
- **GitHub OAuth + JWT** — Secure per-user repo/PR access

---

## MCP Servers (Cursor IDE)

MergeMind includes two MCP servers that you can connect to Cursor so the AI can use GitHub and RAG tools directly.

### Configuration

Project config: `.cursor/mcp.json` — Cursor will pick this up when you open the workspace.

```json
{
  "mcpServers": {
    "github-mcp": { "command": "node", "args": ["src/mcp/servers/github-mcp/index.js"], "cwd": "Mergemind" },
    "qdrant-mcp": { "command": "node", "args": ["src/mcp/servers/qdrant-mcp/index.js"], "cwd": "Mergemind" }
  }
}
```

### Enabling in Cursor

1. Ensure `Mergemind/.env` has:
   - `GITHUB_TOKEN` — for `github-mcp`
   - `QDRANT_URL` and `QDRANT_API_KEY` — for `qdrant-mcp` (optional; tools degrade gracefully if unset)

2. Restart Cursor or reload the window (Ctrl+Shift+P → “Developer: Reload Window”).

3. The servers will appear under MCP in Cursor. You can verify in **Settings → MCP** or by asking the AI to use tools like `getPrDiff`, `retrieveSimilar`, etc.

### Tools

| Server        | Tools                                                                 |
|---------------|-----------------------------------------------------------------------|
| **github-mcp** | `listPullRequests`, `getPrDiff`, `getPrMetadata`, `getPrCommits`, `listChangedFiles`, `postReviewComment` |
| **qdrant-mcp** | `retrieveSimilar`, `storeChunk`, `searchByRepo`                       |

### Run manually (for debugging)

```bash
cd Mergemind
npm run mcp:github   # or: npm run mcp:qdrant
```

---

## Demo

For a ~4-minute live hack demo, see [demo/DEMO_SCRIPT.md](demo/DEMO_SCRIPT.md). It covers:

1. Triggering a review on a PR with `demo_bad_code.js`
2. Watching live analysis stream
3. Review comment posted to GitHub
4. Team Health dashboard
5. RAG context (learning from past PRs)

---

## Backend APIs (Summary)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| POST | `/webhook` | GitHub PR webhook (opens/sync) |
| POST | `/webhooks/github` | Same webhook, namespaced |
| GET | `/auth/github/login` | Start GitHub OAuth |
| GET | `/auth/github/callback` | OAuth callback |
| GET | `/api/repos` | List user repos (JWT) |
| GET | `/api/repos/:owner/:repo/pulls` | List open PRs (JWT) |
| POST | `/api/trigger-review` | Manually trigger review (JWT) |

---

## RAG Provenance

Chunks in Qdrant store and expose provenance metadata:

| Field | Description |
|-------|-------------|
| `repo`, `prNumber`, `chunkIndex` | Source location |
| `sourceUrl` | GitHub PR link |
| `filePaths` | Files touched in the diff (parsed from `diff --git`, `+++` lines) |
| `createdAt` | Index time |
| `reviewOutcome` | Past AI findings (severity, category, title) for that chunk |

When similar chunks are retrieved, provenance is returned so the AI can cite sources (e.g. "In PR #42, file `auth.js`, we previously flagged…").

---

## Similar past issues (deduplication)

The review comment includes a **Similar past issues** section: past findings from RAG are deduped so that issues that differ only by model/framework name (e.g. "add callbacks in CNN" vs "add callbacks in RNN") are shown once with all source PRs.

Deduplication uses a **normalized title**: the following terms are replaced by a placeholder so they group together. Edit `Mergemind/src/services/ragService.js` → `NORMALIZE_TERMS` to add or remove terms.

| Group | Terms |
|-------|--------|
| **DL / ML models** | `cnn`, `rnn`, `lstm`, `gru`, `fcn`, `mlp`, `transformer`, `bert`, `gpt`, `resnet`, `vgg`, `vit` |
| **Frameworks** | `keras`, `tensorflow`, `pytorch`, `torch`, `tf`, `onnx`, `sklearn`, `sktime` |
| **Estimators / components** | `classifier`, `regressor`, `estimator`, `network`, `layers` |
| **Web / backend** | `react`, `vue`, `angular`, `express`, `django`, `flask` |
| **Generic** | `api`, `url`, `endpoint`, `service`, `handler`, `utils` |

---

## AI Review Pipeline

1. **Fetch PR diff** via GitHub API
2. **Chunk diff** (~2000 chars) for stable model calls
3. **Per chunk:** optionally fetch RAG context, call Groq LLaMA 3.3 70B with JSON schema
4. **Emit** progress and issues over Socket.io (`review-update`)
5. **Aggregate** into markdown report (health score, severity table)
6. **Post** review comment to PR via GitHub Issues API

---

## License

ISC
