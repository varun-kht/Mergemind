import { retrieveSimilarChunks } from '../../../../rag/retriever.js';
import { retrieveSimilarSchema } from '../../../shared/toolSchema.js';

export const retrieveSimilarTool = {
  name: "retrieveSimilar",
  description: "Retrieves similar historical PR chunks from Qdrant.",
  schema: retrieveSimilarSchema,
  handler: async (args) => {
    try {
      const topK = args.topK || 5;
      const similar = await retrieveSimilarChunks({ repo: args.repo, text: args.text, topK });
      
      let formatted = "";
      if (similar.length) {
        formatted = similar.map((item, idx) =>
          `# Context Match ${idx + 1}\n` +
          `Repo: ${args.repo}\n` +
          `PR: ${item.prNumber ?? "unknown"}, Chunk: ${item.chunkIndex ?? "unknown"}\n` +
          `Score: ${item.score?.toFixed ? item.score.toFixed(3) : item.score}\n` +
          `Text:\n${item.text}\n`
        ).join("\n----------------\n\n");
      }

      return {
        content: [{ type: "text", text: formatted }]
      };
    } catch (error) {
      console.error("[Qdrant MCP] retrieveSimilar error:", error.message);
      return {
        isError: true,
        content: [{ type: "text", text: `Error retrieving similar chunks: ${error.message}` }]
      };
    }
  }
};