import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

let client = null;

export function getQdrantClient() {
  if (client) return client;

  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;

  if (!url) {
    console.warn("[RAG] QDRANT_URL is not set. RAG vector search will be disabled.");
    return null;
  }

  client = new QdrantClient({
    url,
    apiKey
  });

  return client;
}


