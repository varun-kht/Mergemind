import axios from "axios";
import dotenv from "dotenv";
import { getPrMetadataSchema } from '../../../shared/toolSchema.js';

dotenv.config();

export const getPrMetadataTool = {
  name: "getPrMetadata",
  description: "Fetches metadata for a GitHub pull request.",
  schema: getPrMetadataSchema,
  handler: async (args) => {
    try {
      const url = `https://api.github.com/repos/${args.repo}/pulls/${args.prNumber}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json"
        }
      });
      
      const detailsStr = JSON.stringify({
        title: response.data.title,
        body: response.data.body,
        state: response.data.state,
        author: response.data.user?.login,
        baseBranch: response.data.base?.ref,
      });

      return {
        content: [{ type: "text", text: detailsStr }]
      };
    } catch (error) {
      console.error("[GitHub MCP] getPrMetadata error:", error.message);
      return {
        isError: true,
        content: [{ type: "text", text: `Error fetching PR metadata: ${error.message}` }]
      };
    }
  }
};