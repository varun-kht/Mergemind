import { getQdrantClient } from '../../../../rag/vectorDb/qdrantClient.js';
import { searchByRepoSchema } from '../../../shared/toolSchema.js';

export const searchByRepoTool = {
  name: "searchByRepo",
  description: "Finds indexed chunks filtered by repo name.",
  schema: searchByRepoSchema,
  handler: async (args) => {
    try {
      const client = getQdrantClient();
      if (!client) {
        throw new Error("Qdrant client not initialized");
      }

      const limit = args.limit || 10;
      
      const result = await client.scroll("pr-history", {
        filter: {
          must: [
            {
              key: "repo",
              match: {
                value: args.repo
              }
            }
          ]
        },
        limit
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result.points.map(p => p.payload)) }]
      };
    } catch (error) {
      console.error("[Qdrant MCP] searchByRepo error:", error.message);
      return {
        isError: true,
        content: [{ type: "text", text: `Error searching by repo: ${error.message}` }]
      };
    }
  }
};