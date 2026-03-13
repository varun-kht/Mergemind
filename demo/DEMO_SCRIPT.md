# 🎬 MergeMind — Live Hack Demo Script

> **Total demo time: ~4 minutes.** Choreographed for maximum impact.

---

## 🔧 Pre-Show Setup (Before Judges Arrive)

1. **Start the backend:** `cd Mergemind && node src/server.js`
2. **Start the frontend:** `cd frontend && npm run dev`
3. **Start ngrok** (if not already running): `ngrok http 3000`
4. **Open two browser windows side by side:**
   - **Left:** GitHub — your test repo, PR tab open
   - **Right:** `http://localhost:5173/team` — the Team Health dashboard
5. **Create a branch & PR** with `demo/demo_bad_code.js` already committed:
   ```bash
   git checkout -b demo/bad-code
   cp demo/demo_bad_code.js src/demo_bad_code.js
   git add . && git commit -m "feat: add user registration module"
   git push origin demo/bad-code
   ```
6. Open the PR on GitHub but **DO NOT trigger the review yet**.

---

## 🎥 The Demo (With Judges Watching)

### Act 1 — The Hook (30 seconds)

> **Say:** "Every engineering team reviews pull requests manually. It takes 30–45 minutes per PR, and humans miss security flaws 60% of the time. MergeMind is an AI code reviewer that catches what humans miss — and it learns your team's specific coding standards over time."

### Act 2 — The Live Hack (90 seconds)

1. **Switch to the MergeMind dashboard** (`/dashboard`)
2. **Point at the green "Connected to Backend" dot** — "Our system is live and listening."
3. **Select the repo and PR** from the dropdowns, then click **"Trigger Analysis"**
4. > **Say:** "Watch the live analysis stream. MergeMind is splitting this PR into chunks and analyzing each one in real-time."
5. **Narrate as results stream in:**
   - "There's the first finding — a **critical** severity: hardcoded AWS credentials."
   - "And an SQL injection vulnerability — this would have gone to production."
   - "Notice it caught an N+1 query performance issue too."

### Act 3 — The GitHub Comment (30 seconds)

1. **Switch to GitHub** (left window) — refresh the PR page
2. **Scroll to the MergeMind comment** — the beautifully formatted markdown table
3. > **Say:** "This isn't just a notification. Look at the health score, the severity breakdown, and each issue has a concrete code fix that a developer can copy-paste directly."

### Act 4 — The CTO View (60 seconds)

1. **Switch to the Team Health tab** (`/team`) on the right window
2. > **Say:** "MergeMind doesn't just help individual developers — it gives engineering managers real-time insights into their team's code quality and security blind spots."
3. **Point out:**
   - The animated counter: "MergeMind saved **14 hours** of manual review time today"
   - The leaderboard: "We can see which repos have the most issues"
   - The most common vulnerability: "Hardcoded secrets — that's an org-wide training gap"
   - The 7-day trend: "Issues are trending down — which means the team is learning"

### Act 5 — The RAG Flex (30 seconds)

> **Say:** "Here's what makes MergeMind different from ChatGPT. We have a Qdrant vector database that stores every past review. When it sees MD5 hashing, it doesn't just flag it — it says: *'In PR #42, your team agreed to migrate to Argon2. Please update this.'* It learns your team's specific decisions and enforces them automatically."

---

## 🎯 Key Talking Points (If Judges Ask Questions)

| Question | Answer |
|----------|--------|
| "Is this just a ChatGPT wrapper?" | "No. We use RAG with Qdrant to store and retrieve past review context. The AI learns your team's specific patterns." |
| "What model do you use?" | "Llama 3.3 70B via Groq for fast inference. The prompt engineering is where the magic is." |
| "How does it integrate?" | "GitHub webhook — zero config. Set the webhook URL and every PR gets reviewed automatically." |
| "What about false positives?" | "Each finding has a confidence score. We order by severity and confidence so developers focus on what matters." |
| "Can it fix the code?" | "Yes — each issue comes with a concrete code suggestion that developers can copy-paste." |
