import { initMcpClients, callMcpTool } from "./mcpClient.js";
import { chunkDiff } from "../../utils/chunkDiff.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import { formatReviewComment, postSummaryComment } from "../../services/githubService.js";
import { createTokenTracker } from "../../utils/tokenCounter.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

let isInitialized = false;

export async function runPRReview({ repo, prNumber }) {
  const tokens = createTokenTracker();

  if (!isInitialized) {
    await initMcpClients();
    isInitialized = true;
  }

  console.log(`[Orchestrator] Fetching metadata for ${repo}#${prNumber}...`);
  const metadata = await callMcpTool("getPrMetadata", { repo, prNumber });
  
  console.log(`[Orchestrator] Fetching diff for ${repo}#${prNumber}...`);
  const diffResponse = await callMcpTool("getPrDiff", { repo, prNumber });
  const diffText = diffResponse.content[0].text;

  if (!diffText || diffText.trim() === "") {
    return { reviews: [], diffText: "", prSummary: [], tokenReport: tokens.getReport() };
  }

  // --- Generate PR summary comment ---
  console.log(`[Orchestrator] Generating PR summary for ${repo}#${prNumber}...`);
  const prSummary = await generatePRSummary(diffText);
  tokens.trackSummary(diffText, prSummary);

  if (prSummary.length > 0) {
    console.log(`[Orchestrator] Posting PR summary comment...`);
    await postSummaryComment(repo, prNumber, prSummary);
  }

  const chunks = chunkDiff(diffText, 3000);
  console.log(`[Orchestrator] Split diff into ${chunks.length} chunks.`);

  const allReviews = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // 1. Retrieve RAG context via Qdrant MCP Tool
    console.log(`[Orchestrator] Fetching RAG context for chunk ${i + 1}/${chunks.length}...`);
    const similarResponse = await callMcpTool("retrieveSimilar", {
      repo,
      text: chunk,
      topK: 3
    });
    const ragContext = similarResponse.content[0].text;

    // 2. Perform AI Review with enhanced prompt
    console.log(`[Orchestrator] Sent chunk ${i + 1} to LLM...`);
    const reviewJsonRaw = await reviewCodeWithLLM(chunk, ragContext);
    tokens.trackChunk(i, chunk, reviewJsonRaw);
    allReviews.push(reviewJsonRaw);

    // 3. Store the chunk back into Qdrant asynchronously via Qdrant MCP Tool
    callMcpTool("storeChunk", {
      repo,
      prNumber,
      chunkIndex: i,
      text: chunk
    }).catch(err => {
      console.error(`[Orchestrator] Error storing chunk ${i}:`, err.message);
    });
  }

  // 4. Format the final PR comment using the enhanced formatter (with suggestion blocks)
  console.log(`[Orchestrator] Formatting final review comment...`);
  const tokenReport = tokens.getReport();
  console.log(tokens.formatReport());

  const finalCommentBody = formatReviewComment(allReviews, {
    repo,
    prNumber,
    reviewedAt: new Date().toISOString(),
    prSummary,
    tokenReport
  });

  // 5. Post the comment back to GitHub via GitHub MCP Tool
  console.log(`[Orchestrator] Posting comment to GitHub...`);
  await callMcpTool("postReviewComment", {
    repo,
    prNumber,
    body: finalCommentBody
  });

  return { reviews: allReviews, diffText, prSummary, tokenReport };
}

async function generatePRSummary(fullDiff) {
  const truncated = fullDiff.slice(0, 12000);
  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a senior engineer summarizing a pull request for a code reviewer. Return only a JSON array of 5 strings. No markdown, no prose."
      },
      {
        role: "user",
        content: `Summarize this PR diff in exactly 5 bullet points.
Return ONLY a raw JSON array of 5 strings like:
["point 1", "point 2", "point 3", "point 4", "point 5"]

No markdown fences. No explanation. No preamble. Just the array.

Diff:
${truncated}`
      }
    ]
  });

  const raw = response.choices[0].message.content.trim();
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn("[Orchestrator] Failed to parse PR summary JSON:", raw);
    return [];
  }
}

async function reviewCodeWithLLM(diffChunk, ragContext) {
  const prompt = `You are MergeMind, an autonomous AI code intelligence system purpose-built for elite engineering teams.

You are not a generic LLM. You are a specialized reviewer trained to think like a principal engineer at a high-stakes organization — someone who has shipped critical infrastructure at scale, survived production incidents, and knows exactly where code goes wrong before it does.

Your review must be:
- **Surgical**: Every issue you raise must be grounded in the exact diff. No vague generalizations.
- **Prioritized**: Engineers are busy. A wall of low-severity suggestions is noise. Elevate what genuinely matters.
- **Actionable**: Every finding must include a concrete, runnable fix. Not theory — code.
- **Consistent**: You have access to this repo's review history. Honor past patterns. Flag regressions. Build institutional memory.

${ragContext ? `## 🧠 Institutional Memory (RAG Context)
The following are real findings from previous reviews on this repository. Use them to:
- Stay consistent with the team's established patterns and standards
- Detect regressions (issues that were previously flagged and appear to have resurfaced)
- Reference recurring anti-patterns the team has agreed to avoid
- Avoid re-raising issues that were already discussed and intentionally accepted

${ragContext}
---
` : ""}

## 🔬 Diff Under Review
\`\`\`diff
${diffChunk}
\`\`\`

---

## 🎯 Review Dimensions

Analyze across ALL of the following. Do not skip any dimension even if findings are empty:

### 1. 🐛 Bugs & Logic Errors
- Off-by-one errors, boundary conditions, null/undefined dereferences
- Async/await misuse, unhandled promise rejections, race conditions
- Wrong conditionals, inverted boolean logic, unreachable branches
- State mutation bugs, incorrect data transformations

### 2. 🔐 Security Vulnerabilities
- OWASP Top 10: injection, broken auth, XSS, IDOR, SSRF, insecure deserialization
- Secrets, tokens, or credentials hardcoded or logged
- Missing input validation, overly permissive CORS, unsafe regex (ReDoS)
- Insecure defaults, missing rate limiting on sensitive endpoints
- GitHub-specific: webhook signature bypass, token scope leakage

### 3. ⚡ Performance & Scalability
- N+1 queries, missing database indexes implied by query patterns
- Blocking synchronous I/O in async contexts
- Memory leaks: event listeners not cleaned up, closures holding large refs
- Unnecessary re-computation, missing memoization, redundant API calls
- Large diff chunks that could block the Node.js event loop

### 4. 🏗️ Architecture & Design
- SOLID violations, god functions/classes, inappropriate coupling
- Abstraction leaks: implementation details bleeding across layers
- Missing separation of concerns (e.g., business logic in route handlers)
- Patterns inconsistent with the rest of the codebase (based on RAG context)

### 5. 🧪 Testability & Observability  
- Code paths with no error handling that will fail silently in production
- Missing structured logging on critical operations (review pipeline steps, webhook receipt, AI calls)
- Untestable code: hard-coded dependencies, no dependency injection
- Missing edge case coverage: empty diffs, malformed payloads, API rate limits

### 6. 📘 Code Quality & Maintainability
- Misleading naming, magic numbers/strings, unclear intent
- Dead code, commented-out blocks, TODO bombs
- Overly complex functions (cyclomatic complexity)
- Missing or incorrect documentation on public-facing functions

---

## 📤 Output Contract

Return ONLY a valid JSON array. Zero prose outside the array. No markdown fences. No preamble.

If the diff is clean, return exactly: []

Each finding must conform to this schema:
{
  "severity": "critical" | "high" | "medium" | "low" | "suggestion",
  "category": "bug" | "security" | "performance" | "architecture" | "testing" | "quality",
  "line": <REQUIRED integer — extract from the diff hunk header @@ +N lines. Look at the +N number in the @@ header and count down to the affected line. NEVER return null.>,
  "title": "<max 60 chars — specific, not generic>",
  "description": "<why this is a problem, what could go wrong, real-world impact>",
  "suggestion": "<concrete fix — include a corrected code snippet whenever possible>",
  "fix": "<the exact corrected code that should replace the problematic code. This must be runnable code, not a description. If the issue is about a specific line, provide the corrected version of that line or block. MUST BE INCLUDED FOR THE FRONTEND ONE-CLICK FIX UI.>",
  "confidence": <0.0–1.0>,
  "regression": <true if this matches a past issue from RAG context, false otherwise>,
  "score": {
    "overall": <integer 0–100 for this specific chunk>,
    "breakdown": {
      "security":      <integer 0–100>,
      "bugs":          <integer 0–100>,
      "performance":   <integer 0–100>,
      "architecture":  <integer 0–100>,
      "testability":   <integer 0–100>,
      "quality":       <integer 0–100>
    },
    "rationale": "<2 sentence explanation of what drove the score up or down>"
  }
}

---

## ⚖️ Severity Guide

| Severity | Meaning |
|---|---|
| critical | Will cause data loss, security breach, or production outage |
| high | Likely to cause bugs or vulnerabilities under real-world conditions |
| medium | Degrades reliability, performance, or maintainability significantly |
| low | Minor issue worth fixing but not urgent |
| suggestion | Stylistic or optional improvement |

---

## 📊 Scoring Guide

Scores reflect the quality of the code IN THIS CHUNK ONLY, not the whole PR.
- **90–100**: Production-ready, no meaningful issues
- **70–89**: Minor issues, safe to merge with small fixes
- **50–69**: Notable problems that should be addressed before merge
- **30–49**: Significant issues, high risk if merged as-is
- **0–29**: Critical failures, do not merge

Score each dimension independently. A chunk can score 100 on quality but 0 on security.

---

## 🎨 Code Highlight Guide

- Your \`fix\` code block must be a drop-in replacement — same scope, same context, just corrected.
- It must be precise and directly applicable to the identified line.

---

## 🚫 Anti-Patterns to Avoid

- Do NOT raise issues not evidenced in the diff
- Do NOT suggest refactors that are out of scope for a PR review
- Do NOT repeat the same issue multiple times with different wording  
- Do NOT give a high severity to a cosmetic issue to appear thorough
- Do NOT skip the \`regression\` field — it powers MergeMind's institutional memory feature
- Do NOT skip the \`score\` field — every finding must be scored
- Do NOT skip the \`fix\` field — it is REQUIRED for the one-click fix dashboard
- Do NOT hallucinate issues that aren't clearly present in the diff`;

  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a senior code reviewer."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = response.choices[0].message.content;
  console.log(`\n[Orchestrator] Raw model output for chunk:\n${content}\n`);
  return content;
}