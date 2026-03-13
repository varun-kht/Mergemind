import { initMcpClients, callMcpTool } from "./mcpClient.js";
import { chunkDiff } from "../../utils/chunkDiff.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import { formatReviewComment } from "../../services/githubService.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

let isInitialized = false;

export async function runPRReview({ repo, prNumber }) {
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
    return { reviews: [], diffText: "" };
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
  const finalCommentBody = formatReviewComment(allReviews, {
    repo,
    prNumber,
    reviewedAt: new Date().toISOString(),
  });

  // 5. Post the comment back to GitHub via GitHub MCP Tool
  console.log(`[Orchestrator] Posting comment to GitHub...`);
  await callMcpTool("postReviewComment", {
    repo,
    prNumber,
    body: finalCommentBody
  });

  return { reviews: allReviews, diffText };
}

async function reviewCodeWithLLM(diffChunk, ragContext) {
  const prompt = `You are MergeMind — an elite AI code reviewer trained on millions of pull requests across top-tier engineering organizations (Google, Netflix, Stripe, Airbnb).

Your goal is to produce a structured, actionable, and deeply insightful review of the provided diff chunk. Go beyond surface-level feedback: reason about intent, architecture, long-term maintainability, and security posture.

${ragContext ? `## 📚 Historical Context (Similar PRs from this repo)
${ragContext}

Use the above to stay consistent with prior review patterns, flag regressions, and reference recurring issues.
**Important:** When the historical context is relevant, explicitly cite it in your review. For example: "In PR #42, the team agreed to migrate from MD5 to Argon2 — this change reverts that decision." This makes MergeMind feel like a team member with institutional memory.
` : ""}

## 🔍 Diff Chunk to Review
\`\`\`diff
${diffChunk}
\`\`\`

## 📋 Review Instructions

Analyze the diff across these dimensions:
1. **Bugs & Logic Errors** — off-by-ones, null dereferences, async pitfalls, wrong conditions
2. **Security Vulnerabilities** — injections, broken auth, secrets in code, insecure defaults, OWASP Top 10
3. **Performance** — N+1 queries, unnecessary re-renders, blocking I/O, memory leaks
4. **Code Quality** — naming, duplication, complexity, SOLID violations, dead code
5. **Test Coverage** — missing edge case tests, untested error paths
6. **Best Practices** — language idioms, framework conventions, dependency hygiene

## 📤 Output Format

Return ONLY a valid JSON array. No markdown, no explanation outside the array.

Each item must follow this exact schema:
{
  "severity": "critical" | "high" | "medium" | "low" | "suggestion",
  "category": "bug" | "security" | "performance" | "quality" | "testing" | "best-practice",
  "line": <REQUIRED integer — extract from the diff hunk header @@ +N lines. Look at the +N number in the @@ header and count down to the affected line. NEVER return null.>,
  "title": "<concise issue title, max 60 chars>",
  "description": "<detailed explanation of the problem and why it matters>",
  "suggestion": "<concrete fix with example code snippet if applicable>",
  "fix": "<the exact corrected code that should replace the problematic code. This must be runnable code, not a description. If the issue is about a specific line, provide the corrected version of that line or block.>",
  "confidence": <0.0–1.0 float representing certainty>
}

Rules:
- If the diff chunk looks clean and has no issues, return an empty array: []
- Order results by severity (critical → suggestion)
- Be precise: reference specific variable names, function names, or line content
- Provide runnable code snippets in suggestions where possible
- The "fix" field is critical: it must contain the exact corrected code that a developer can copy-paste to replace the problematic code
- The "line" field MUST be an integer. Extract it from the diff hunk headers (@@ -a,b +c,d @@). The +c number is the starting line of the new file. Count from there to the problematic line. If truly unable to determine, use the starting line of the hunk.
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

  return response.choices[0].message.content;
}