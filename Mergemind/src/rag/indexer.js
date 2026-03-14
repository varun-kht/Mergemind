import { getQdrantClient } from "./vectorDb/qdrantClient.js";
import { embedText, EMBEDDING_DIMENSION } from "./embedder.js";
import { extractFilePathsFromDiff } from "./extractProvenance.js";

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

/**
 * Index a PR chunk with full provenance metadata.
 * @param {object} params
 * @param {string} params.repo - Full repo name (owner/name)
 * @param {number} params.prNumber - PR number
 * @param {number} params.chunkIndex - Chunk index within the PR
 * @param {string} params.text - Diff chunk text
 * @param {Array} [params.reviewOutcome] - Optional AI review findings [{severity, category, title, description}]
 */
export async function indexPrChunk({ repo, prNumber, chunkIndex, text, reviewOutcome }) {
  const client = getQdrantClient();
  if (!client) return;

  await ensureCollection(client);

  const filePaths = extractFilePathsFromDiff(text);
  const createdAt = new Date().toISOString();
  const sourceUrl = `https://github.com/${repo}/pull/${prNumber}`;

  const payload = {
    repo,
    prNumber,
    chunkIndex,
    text,
    createdAt,
    sourceUrl,
    filePaths: filePaths.length ? filePaths : []
  };

  if (reviewOutcome && Array.isArray(reviewOutcome) && reviewOutcome.length > 0) {
    payload.reviewOutcome = reviewOutcome;
  }

  const vector = embedText(text);

  await client.upsert(COLLECTION_NAME, {
    points: [
      {
        id: Date.now(),
        vector,
        payload
      }
    ]
  });
}


