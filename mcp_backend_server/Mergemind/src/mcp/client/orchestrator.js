import { initMcpClients, callMcpTool } from "./mcpClient.js";
import { chunkDiff } from "../../utils/chunkDiff.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import { formatReviewComment } from "../../services/githubService.js";
import { generatePRSummary } from "../../services/aiReviewService.js";
import { getPRDiff, postSummaryComment } from "../../services/githubService.js";

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
  // Tools return content array, we parse text
  const diffResponse = await callMcpTool("getPrDiff", { repo, prNumber });
  const diffText = diffResponse.content[0].text;

  if (!diffText || diffText.trim() === "") {
    return { reviews: [] };
  }

  // --- Generate and post a high-level PR summary comment ---
  try {
    console.log(`[Orchestrator] Generating PR summary for ${repo}#${prNumber}...`);
    const summary = await generatePRSummary(diffText);
    console.log(`[Orchestrator] Posting PR summary comment...`);
    await postSummaryComment(repo, prNumber, summary);
  } catch (err) {
    console.warn(`[Orchestrator] Failed to generate or post PR summary: ${err.message}`);
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

    // 2. Perform AI Review
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

  // 4. Format the final PR comment
  console.log(`[Orchestrator] Formatting final review comment...`);
  const finalCommentBody = formatReviewComment(allReviews);

  // 5. Post the comment back to GitHub via GitHub MCP Tool
  console.log(`[Orchestrator] Posting comment to GitHub...`);
  await callMcpTool("postReviewComment", {
    repo,
    prNumber,
    body: finalCommentBody
  });

  return { reviews: allReviews };
}

async function reviewCodeWithLLM(diffChunk, ragContext) {
  const prompt = `You are MergeMind — an elite AI code reviewer trained on millions of pull requests across top-tier engineering organizations (Google, Netflix, Stripe, Airbnb).

Your goal is to produce a structured, actionable, and deeply insightful review of the provided diff chunk. Go beyond surface-level feedback: reason about intent, architecture, long-term maintainability, and security posture.

${ragContext ? `## 📚 Historical Context (Similar PRs from this repo)\n${ragContext}\n\nUse the above to stay consistent with prior review patterns, flag regressions, and reference recurring issues.\n` : ""}

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
  "line": <line number or null>,
  "title": "<concise issue title, max 60 chars>",
  "description": "<detailed explanation of the problem and why it matters>",
  "suggestion": "<concrete fix with example code snippet if applicable>",
  "confidence": <0.0–1.0 float representing certainty>
}

Rules:
- If the diff chunk looks clean and has no issues, return an empty array: []
- Order results by severity (critical → suggestion)
- Be precise: reference specific variable names, function names, or line content
- Provide runnable code snippets in suggestions where possible
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