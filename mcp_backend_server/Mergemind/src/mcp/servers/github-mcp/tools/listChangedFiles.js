import axios from "axios";
import dotenv from "dotenv";
import { listChangedFilesSchema } from '../../../shared/toolSchema.js';

dotenv.config();

export const listChangedFilesTool = {
  name: "listChangedFiles",
  description: "Lists files changed in a GitHub pull request.",
  schema: listChangedFilesSchema,
  handler: async (args) => {
    try {
      const url = `https://api.github.com/repos/${args.repo}/pulls/${args.prNumber}/files`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json"
        }
      });
      
      const files = response.data.map(file => ({
        filename: file.filename,
        status: file.status,
        changes: file.changes
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(files) }]
      };
    } catch (error) {
      console.error("[GitHub MCP] listChangedFiles error:", error.message);
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing changed files: ${error.message}` }]
      };
    }
  }
};