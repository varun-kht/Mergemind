import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export async function getPRDiff(repo, prNumber) {

  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3.diff"
    }
  });

  return response.data;
}

export async function postPRComment(repo, prNumber, body) {
  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
  await axios.post(
    url,
    { body },
    { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
  );
}

// services/githubService.js (or in your handler file)
export function formatReviewComment(reviews) {
  const severityIcons = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🔵",
    suggestion: "💡"
  };

  return reviews
    .map((chunkReviewStr, i) => {
      let chunkReview;
      try {
        // Remove the ```json wrapper if present and parse
        const cleaned = chunkReviewStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        chunkReview = JSON.parse(cleaned);
      } catch (err) {
        console.warn(`Failed to parse chunk ${i} JSON:`, err);
        chunkReview = [];
      }

      if (!chunkReview || chunkReview.length === 0) {
        return `### Chunk ${i + 1}\n✅ No issues found in this chunk.`;
      }

      const issuesList = chunkReview
        .map(
          (issue, idx) => 
            `- ${severityIcons[issue.severity] || ""} **${issue.title}** (Category: ${issue.category})\n` +
            `  - Line: ${issue.line ?? "N/A"}\n` +
            `  - Description: ${issue.description}\n` +
            `  - Suggestion: ${issue.suggestion}\n` +
            `  - Confidence: ${(issue.confidence * 100).toFixed(0)}%`
        )
        .join("\n");

      const jsonBlock = `<details><summary>Full JSON</summary>\n\n\`\`\`json\n${JSON.stringify(chunkReview, null, 2)}\n\`\`\`\n</details>`;

      return `### Chunk ${i + 1}\n${issuesList}\n\n${jsonBlock}`;
    })
    .join("\n\n---\n\n");
}