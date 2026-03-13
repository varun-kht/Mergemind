import { indexPrChunk } from '../../../../rag/indexer.js';
import { storeChunkSchema } from '../../../shared/toolSchema.js';

export const storeChunkTool = {
  name: "storeChunk",
  description: "Stores a reviewed PR chunk into Qdrant.",
  schema: storeChunkSchema,
  handler: async (args) => {
    try {
      await indexPrChunk({
        repo: args.repo,
        prNumber: args.prNumber,
        chunkIndex: args.chunkIndex,
        text: args.text
      });
      return {
        content: [{ type: "text", text: "Successfully indexed chunk" }]
      };
    } catch (error) {
      console.error("[Qdrant MCP] storeChunk error:", error.message);
      return {
        isError: true,
        content: [{ type: "text", text: `Error indexing chunk: ${error.message}` }]
      };
    }
  }
};