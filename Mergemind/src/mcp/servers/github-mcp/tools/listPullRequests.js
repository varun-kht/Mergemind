import axios from "axios";
import dotenv from "dotenv";
import { listPullRequestsSchema } from "../../../shared/toolSchema.js";

dotenv.config();

export const listPullRequestsTool = {
  name: "listPullRequests",
  description: "Lists pull requests in a repository. Use this to discover which PRs exist so you can ask about any specific PR.",
  schema: listPullRequestsSchema,
  handler: async (args) => {
    try {
      const state = args.state || "open";
      const url = `https://api.github.com/repos/${args.repo}/pulls?state=${state}&per_page=30&sort=updated`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json"
        }
      });

      const prs = response.data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user?.login,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        url: pr.html_url
      }));

      const text = prs.length
        ? prs
            .map(
              (p) =>
                `#${p.number} - ${p.title} (${p.state}) by @${p.author} · updated ${p.updatedAt?.slice(0, 10)}`
            )
            .join("\n")
        : `No ${state} pull requests found in ${args.repo}`;

      return {
        content: [{ type: "text", text }]
      };
    } catch (error) {
      console.error("[GitHub MCP] listPullRequests error:", error.message);
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing PRs: ${error.message}` }]
      };
    }
  }
};
