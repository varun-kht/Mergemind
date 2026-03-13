import { getPRDiff } from '../../../../services/githubService.js';
import { getPrDiffSchema } from '../../../shared/toolSchema.js';

export const getPrDiffTool = {
  name: "getPrDiff",
  description: "Fetches the diff of a GitHub pull request.",
  schema: getPrDiffSchema,
  handler: async (args) => {
    try {
      const diff = await getPRDiff(args.repo, args.prNumber);
      return {
        content: [{ type: "text", text: String(diff) }]
      };
    } catch (error) {
      console.error("[GitHub MCP] getPrDiff error:", error.message);
      return {
        isError: true,
        content: [{ type: "text", text: `Error fetching PR diff: ${error.message}` }]
      };
    }
  }
};