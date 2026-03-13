import dotenv from "dotenv";
import { storeChunkInRag, getRagContextForChunk } from "./services/ragService.js";

dotenv.config();

const repo = "test/repo";
const prNumber = 1;

async function main() {
  const text1 = "function add(a, b) { return a + b; }";
  const text2 = "function sum(a, b) { return a + b; }";

  console.log("Indexing first chunk...");
  await storeChunkInRag({ repo, prNumber, chunkIndex: 0, text: text1 });

  console.log("Retrieving similar chunks for second text...");
  const ctx = await getRagContextForChunk({
    repo,
    prNumber,
    chunkIndex: 1,
    text: text2
  });

  console.log("RAG context:\n", ctx || "<empty>");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});