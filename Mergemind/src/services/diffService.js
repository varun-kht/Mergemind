import { chunkDiff } from "../utils/chunkDiff.js";

export function processDiff(diff) {

  const chunks = chunkDiff(diff, 2000);

  return chunks;
}