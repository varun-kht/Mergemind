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

  const prompt = `You are a senior software engineer.\n\nReview this pull request diff and identify:\n- Bugs\n- Security issues\n- Bad practices\n\nUse the provided historical context (if any) to be more consistent with previous reviews and patterns.\n\nReturn a JSON array with suggestions.\n\n${
    ragContext
      ? `Historical Context from Similar PR Chunks:\n${ragContext}\n\n`
      : ""
  }Diff to review:\n${diffChunk}\n`;

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