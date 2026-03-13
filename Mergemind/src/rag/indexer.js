import { getQdrantClient } from "./vectorDb/qdrantClient.js";
import { embedText, EMBEDDING_DIMENSION } from "./embedder.js";

const COLLECTION_NAME = "pr-history";

async function ensureCollection(client) {
  if (!client) return;

  try {
    await client.getCollection(COLLECTION_NAME);
  } catch {
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: EMBEDDING_DIMENSION,
        distance: "Cosine"
      }
    });
  }
}

export async function indexPrChunk({ repo, prNumber, chunkIndex, text }) {
  const client = getQdrantClient();
  if (!client) return;

  await ensureCollection(client);

  const vector = embedText(text);

  await client.upsert(COLLECTION_NAME, {
    points: [
      {
        // Qdrant requires either an unsigned integer or UUID for id.
        // We use a numeric timestamp to keep it simple.
        id: Date.now(),
        vector,
        payload: {
          repo,
          prNumber,
          chunkIndex,
          text,
          createdAt: new Date().toISOString()
        }
      }
    ]
  });
}


