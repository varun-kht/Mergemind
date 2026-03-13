import { indexPrChunk } from "../rag/indexer.js";
import { retrieveSimilarChunks } from "../rag/retriever.js";

export async function getRagContextForChunk({ repo, prNumber, chunkIndex, text }) {
  const similar = await retrieveSimilarChunks({ repo, text, topK: 5 });

  if (!similar.length) return "";

  const formatted = similar
    .map(
      (item, idx) =>
        `# Context Match ${idx + 1}\n` +
        `Repo: ${repo}\n` +
        `PR: ${item.prNumber ?? "unknown"}, Chunk: ${item.chunkIndex ?? "unknown"}\n` +
        `Score: ${item.score?.toFixed ? item.score.toFixed(3) : item.score}\n` +
        `Text:\n${item.text}\n`
    )
    .join("\n----------------\n\n");

  return formatted;
}

export async function storeChunkInRag({ repo, prNumber, chunkIndex, text }) {
  await indexPrChunk({ repo, prNumber, chunkIndex, text });
}


