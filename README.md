## MergeMind – Elite AI PR Reviewer

MergeMind is a full‑stack tool that connects to GitHub, listens to pull‑request webhooks, runs deep AI‑powered code reviews (with optional RAG context over past PRs), and streams live progress and findings to a React dashboard.

### High‑Level Architecture
- **Frontend (`frontend/`)**: React + Vite single‑page app with:
  - `LandingPage` marketing view explaining capabilities.
  - `Dashboard` for selecting repositories/PRs, triggering reviews, and watching real‑time analysis.
- **Backend (`Mergemind/`)**: Node.js/Express server with:
  - GitHub OAuth authentication.
  - Secure REST APIs for listing repos/PRs and triggering reviews.
  - GitHub webhook endpoint for automatic PR review.
  - WebSocket (Socket.io) channel to stream review progress and issues.
  - AI review pipeline powered by Groq (LLaMA 3.3‑70B) and optional RAG context (Qdrant/Chroma).

---

## Backend APIs

Base URL (local dev): `http://localhost:3000`

### 1. Health Check
- **Method**: `GET /`
- **Auth**: None
- **Description**: Simple liveness probe.
- **Response**: `"MergeMind AI PR Reviewer Running"`

---

## GitHub Webhook Endpoints

### 2. Primary Webhook (aliased)
- **Method**: `POST /webhook`
- **Body**: Raw GitHub webhook JSON (must include `action`, `repository`, `pull_request`).
- **Headers**:
  - `X-GitHub-Event: pull_request`
  - (Optionally) signature headers if you add verification later.
- **Description**:
  - Entry point for GitHub pull‑request events (e.g. `opened`, `synchronize`).
  - Immediately acknowledges GitHub with `200` and starts an async AI review pipeline.
  - Internally handled by `handlePRWebhook`.

### 3. Namespaced Webhook
- **Method**: `POST /webhooks/github`
- **Body/Headers**: Same as `/webhook`.
- **Description**: Equivalent webhook route under `/webhooks` namespace, useful if you want multiple providers later.

#### Webhook Behaviour (`handlePRWebhook`)
- **Supported events**: `pull_request` with actions:
  - `opened`
  - `synchronize`
- **Pipeline steps**:
  1. **Fetch diff** for `repo` + `prNumber` via GitHub API.
  2. **Chunk diff** into manageable pieces.
  3. For each chunk:
     - Optionally fetch **RAG context** (similar past review chunks).
     - Call Groq LLaMA‑3.3‑70B with a strict JSON schema to produce structured issues.
     - Emit progress + per‑chunk details over Socket.io (`review-update` events).
  4. **Aggregate all issues** into a rich markdown report, including:
     - Health score.
     - Counts by severity and category.
     - Per‑chunk summary and collapsible raw JSON.
  5. **Post review comment back to GitHub** on the PR via GitHub Issues API.
- **Socket.io events** (`review-update`):
  - `status`: Human‑readable status (e.g. “Initializing Analysis”, “Reviewing Chunk 1/3”).
  - `progress`: Integer 0–100.
  - `log`: Optional short log message.
  - `currentChunk`: Raw diff text currently being analyzed.
  - `newReviews`: Parsed JSON issues for the processed chunk.
  - `chunkDiff`: Diff text for the processed chunk.

---

## Authentication APIs (GitHub OAuth)

Base path: `/auth/github`

### 4. Start OAuth Login
- **Method**: `GET /auth/github/login`
- **Auth**: None
- **Description**:
  - Redirects the browser to GitHub’s OAuth consent page.
  - Uses `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to request `repo` scope.
- **Redirect URI** (on GitHub app config):
  - `http://localhost:3000/auth/github/callback`

### 5. OAuth Callback
- **Method**: `GET /auth/github/callback?code=...`
- **Auth**: None (GitHub server‑to‑server).
- **Description**:
  1. Exchanges `code` for a GitHub **access token**.
  2. Fetches the authenticated GitHub user profile.
  3. Issues a signed **JWT** containing:
     - `id`, `username`, `avatar_url`
     - `githubToken` (used by backend to call GitHub on behalf of the user).
  4. Redirects the user to the frontend dashboard:
     - `http://localhost:5173/dashboard#token=<JWT>`

### 6. JWT Format
- **Payload fields**:
  - `id`: GitHub user id.
  - `username`: GitHub login.
  - `avatar_url`: Profile avatar.
  - `githubToken`: OAuth token with `repo` scope.
- **Signing**:
  - Secret: `JWT_SECRET` (from `.env`, fallback: `mergemind-super-secret-key-123`).
  - Expiry: 24 hours.

---

## Protected API Routes

Base path: `/api` (uses the `requireAuth` middleware).

### Authentication Middleware
- **Location**: `src/routes/apiRoutes.js`
- **Logic**:
  - Reads `Authorization: Bearer <JWT>` header.
  - Verifies JWT with `JWT_SECRET`.
  - If valid, attaches `req.user` with:
    - `id`, `username`, `avatar_url`, `githubToken`.
  - If missing/invalid, responds with `401 Unauthorized`.

All endpoints below require a valid JWT.

### 7. List User Repositories
- **Method**: `GET /api/repos`
- **Auth**: `Authorization: Bearer <JWT>`
- **Description**:
  - Calls GitHub API `GET /user/repos` using the stored `githubToken`.
  - Returns a simplified list of repositories.
- **Response shape (array)**:
  - `id`
  - `name`
  - `full_name`
  - `private`
  - `owner`:
    - `login`
    - `avatar_url`

### 8. List Open Pull Requests for a Repo
- **Method**: `GET /api/repos/:owner/:repo/pulls`
- **Auth**: `Authorization: Bearer <JWT>`
- **Description**:
  - Calls GitHub API `GET /repos/:owner/:repo/pulls` (open, sorted by updated).
  - Used by the dashboard to let users pick which PR to analyze.
- **Response shape (array)**:
  - `id`
  - `number`
  - `title`
  - `state`
  - `user`:
    - `login`
    - `avatar_url`
  - `created_at`

### 9. Manually Trigger a Review for a PR
- **Method**: `POST /api/trigger-review`
- **Auth**: `Authorization: Bearer <JWT>`
- **Body**:
  ```json
  {
    "repository": { "full_name": "owner/repo" },
    "pull_request": { "number": 123 }
  }
  ```
- **Description**:
  - Allows the dashboard to trigger the same review flow as a webhook, on demand.
  - Internally builds a mock GitHub webhook request and calls `handlePRWebhook`.
  - Response is proxied from the mock handler; progress is streamed over Socket.io as usual.

---

## AI & RAG Services

### 10. GitHub Service
- **File**: `src/services/githubService.js`
- **Responsibilities**:
  - `getPRDiff(repo, prNumber)`: Fetches a PR diff from GitHub (`Accept: application/vnd.github.v3.diff`).
  - `postPRComment(repo, prNumber, body)`: Posts the final AI review as a PR comment.
  - `formatReviewComment(reviews, meta)`: Aggregates per‑chunk JSON issues into a rich markdown report (health score, severity tables, per‑chunk breakdown, raw JSON section).

### 11. Diff Processing
- **File**: `src/services/diffService.js`
- **Responsibilities**:
  - `processDiff(diff)`: Splits a large PR diff into manageable **chunks** using `chunkDiff(diff, 2000)` for more stable model calls and better progress feedback.

### 12. AI Review Engine
- **File**: `src/services/aiReviewService.js`
- **Model**: Groq `llama-3.3-70b-versatile`.
- **Responsibilities**:
  - Build a detailed **prompt** with:
    - RAG context (if available).
    - The diff chunk being reviewed.
    - A strict JSON schema for findings.
  - Call Groq Chat Completions with:
    - `system`: “You are a senior code reviewer.”
    - `user`: full review instructions.
  - Return **raw model output** (expected to be a JSON array string).
  - Fire‑and‑forget: calls `storeChunkInRag` to index the diff chunk for future similarity search.
- **Issue schema per finding**:
  - `severity`: `critical | high | medium | low | suggestion`
  - `category`: `bug | security | performance | quality | testing | best-practice`
  - `line`: number or `null`
  - `title`: short human‑readable summary
  - `description`: detailed explanation
  - `suggestion`: concrete fix with hints/snippets
  - `confidence`: `0.0–1.0`

### 13. RAG Service
- **File**: `src/services/ragService.js`
- **Responsibilities**:
  - `getRagContextForChunk({ repo, prNumber, chunkIndex, text })`:
    - Uses `retrieveSimilarChunks` to pull top‑K past chunks for the repo.
    - Formats them into a textual context block (matches with scores, PR numbers, and stored text).
  - `storeChunkInRag({ repo, prNumber, chunkIndex, text })`:
    - Delegates to `indexPrChunk` for vector indexing (e.g., in Qdrant/Chroma).

---

## Frontend Features

Base URL (local dev): `http://localhost:5173`

### 14. Landing Page (`/`)
- **File**: `frontend/src/pages/LandingPage.jsx`
- **Features**:
  - Hero section describing MergeMind as an “elite AI reviewer”.
  - Highlight cards for **Logic & Bugs**, **Security**, **Performance**, **Test Coverage**.
  - CTA button **“Start Reviewing”** linking to `/dashboard`.
  - Smooth, animated UI using `framer-motion`.

### 15. Dashboard (`/dashboard`)
- **File**: `frontend/src/pages/Dashboard.jsx`
- **Key capabilities**:
  - **GitHub Sign‑in**:
    - Button linking to `http://localhost:3000/auth/github/login`.
    - Stores returned JWT in `localStorage` as `mergemind_token`.
  - **Repository picker**:
    - Calls `GET /api/repos` with `Authorization: Bearer <token>`.
    - Populates a dropdown of recent repos.
  - **Pull‑request picker**:
    - For selected repo, calls `GET /api/repos/:owner/:repo/pulls`.
    - Shows open PRs, auto‑selects the first when available.
  - **Trigger Analysis button**:
    - Calls `POST /api/trigger-review` with repo and PR number.
    - Resets progress/logs and shows “Reviewing…” state.
  - **Live Analysis Stream**:
    - Connects to Socket.io at `http://localhost:3000`.
    - Listens for `review-update` events and:
      - Updates progress bar.
      - Displays status messages and log lines.
      - Shows extracted diff chunks (truncated) as they are analyzed.
      - Renders each issue with severity‑colored cards and suggestions.
  - **Webhook helper**:
    - Surface the public webhook URL (ngrok) and copy‑to‑clipboard button so users can configure GitHub webhooks easily.

---

## Environment & Configuration

### Backend (`Mergemind/.env`)
Required environment variables (see `.env.example` for exact names):
- **GitHub / Auth**:
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `GITHUB_TOKEN` (bot token for fetching diffs and posting comments if not using user token).
  - `JWT_SECRET`
- **AI / RAG**:
  - `GROQ_API_KEY`
  - Any Qdrant/Chroma connection variables (host, port, API key), if used in `rag/vectorDb` layer.
- **Server**:
  - `PORT` (default `3000`).

### Frontend
- Vite config expects the backend on `http://localhost:3000`.
- For production, update URLs in:
  - OAuth redirect (`/auth/github/callback` → your domain).
  - Dashboard API calls (`/api/...`).
  - WebSocket URL passed to `socket.io-client`.

---

## Running Locally

### 1. Backend
```bash
cd Mergemind
npm install
cp .env.example .env   # then edit with your secrets
npm start              # or: node src/server.js
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## Summary of Key Features

- **GitHub‑integrated AI PR reviews** with automatic webhook triggers and manual dashboard triggers.
- **Secure GitHub OAuth + JWT** for per‑user repository and PR access.
- **Structured, severity‑aware findings** rendered both in GitHub comments and a rich real‑time dashboard.
- **RAG‑enhanced analysis** that can leverage historical PR chunks for consistency and deeper insight.
