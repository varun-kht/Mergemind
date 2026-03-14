import axios from "axios";
import dotenv from "dotenv";
import { getPrCommitsSchema } from "../../../shared/toolSchema.js";

dotenv.config();

export const getPrCommitsTool = {
  name: "getPrCommits",
  description:
    "Lists all commits in a pull request. Shows commit SHA, message, author, and date for each commit. Use this to see what changes were made in a PR.",
  schema: getPrCommitsSchema,
  handler: async (args) => {
    try {
      const url = `https://api.github.com/repos/${args.repo}/pulls/${args.prNumber}/commits`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json"
        }
      });

      const commits = response.data.map((c) => ({
        sha: c.sha?.slice(0, 7),
        message: c.commit?.message?.split("\n")[0] || "(no message)",
        author: c.commit?.author?.name || c.author?.login || "unknown",
        date: c.commit?.author?.date?.slice(0, 19)
      }));

      const text =
        commits.length > 0
          ? commits
              .map(
                (c, i) =>
                  `${i + 1}. ${c.sha} · ${c.message} — ${c.author} (${c.date})`
              )
              .join("\n")
          : `No commits found for PR #${args.prNumber} in ${args.repo}`;

      return {
        content: [{ type: "text", text }]
      };
    } catch (error) {
      console.error("[GitHub MCP] getPrCommits error:", error.message);
      return {
        isError: true,
        content: [{ type: "text", text: `Error fetching PR commits: ${error.message}` }]
      };
    }
  }
};
