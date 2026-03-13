import Groq from "groq-sdk";
import dotenv from "dotenv";
import { getRagContextForChunk, storeChunkInRag } from "./ragService.js";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Review a diff chunk with optional RAG context.
 *
 * @param {string} diffChunk - The diff text to review.
 * @param {object} [options] - Optional metadata for RAG.
 * @param {string} [options.repo] - Full repo name (e.g. "owner/name").
 * @param {number} [options.prNumber] - Pull request number.
 * @param {number} [options.chunkIndex] - Index of this chunk within the PR.
 */
export async function reviewCode(diffChunk, options = {}) {
  const { repo, prNumber, chunkIndex } = options;

  let ragContext = "";

  if (repo && typeof prNumber !== "undefined") {
    ragContext = await getRagContextForChunk({
      repo,
      prNumber,
      chunkIndex: typeof chunkIndex === "number" ? chunkIndex : 0,
      text: diffChunk
    });
  }

const severityIcons = { critical: "🔴", high: "🟠", medium: "🟡", low: "🔵", suggestion: "💡" };

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

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
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

  if (repo && typeof prNumber !== "undefined") {
    // Fire-and-forget indexing; do not block response on RAG storage.
    storeChunkInRag({
      repo,
      prNumber,
      chunkIndex: typeof chunkIndex === "number" ? chunkIndex : 0,
      text: diffChunk
    }).catch(err => {
      console.warn("[RAG] Failed to index PR chunk:", err.message);
    });
  }

  return content;
}