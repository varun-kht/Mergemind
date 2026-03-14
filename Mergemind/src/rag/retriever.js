import { getQdrantClient } from "./vectorDb/qdrantClient.js";
import { embedText } from "./embedder.js";

const COLLECTION_NAME = "pr-history";

export async function retrieveSimilarChunks({ repo, text, topK = 5 }) {
  const client = getQdrantClient();
  if (!client) return [];

  const vector = embedText(text);

  try {
    const result = await client.search(COLLECTION_NAME, {
      vector,
      limit: topK
      // NOTE: we omit filters here to avoid issues with Qdrant Cloud
      // filter API differences and just retrieve by similarity.
    });

    return (result || []).map((point) => ({
      score: point.score,
      text: point.payload?.text,
      repo: point.payload?.repo,
      prNumber: point.payload?.prNumber,
      chunkIndex: point.payload?.chunkIndex,
      sourceUrl: point.payload?.sourceUrl,
      filePaths: point.payload?.filePaths || [],
      createdAt: point.payload?.createdAt,
      reviewOutcome: point.payload?.reviewOutcome || []
    }));
  } catch (err) {
    console.warn("[RAG] Retrieval failed:", err.message);
    return [];
  }
}


