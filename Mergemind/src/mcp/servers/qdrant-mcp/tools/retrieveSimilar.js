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
        formatted = similar
          .map((item, idx) => {
            const provenance = [
              `Source: ${item.repo ?? args.repo} · PR #${item.prNumber ?? "?"} · Chunk ${item.chunkIndex ?? "?"}`,
              item.sourceUrl ? `URL: ${item.sourceUrl}` : null,
              item.filePaths?.length ? `Files: ${item.filePaths.join(", ")}` : null,
              item.createdAt ? `Indexed: ${item.createdAt.slice(0, 10)}` : null,
              `Score: ${item.score?.toFixed ? item.score.toFixed(3) : item.score}`
            ]
              .filter(Boolean)
              .join(" | ");
            const pastFindings =
              item.reviewOutcome?.length
                ? `\n**Past review findings:** ${item.reviewOutcome.map((r) => `${r.severity}: ${r.title}`).join("; ")}\n`
                : "";
            return `# Context Match ${idx + 1}\n**Provenance:** ${provenance}${pastFindings}\n**Text:\n**${item.text}\n`;
          })
          .join("\n----------------\n\n");
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