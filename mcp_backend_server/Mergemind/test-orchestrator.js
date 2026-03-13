import dotenv from "dotenv";
dotenv.config();

import { runPRReview } from './src/mcp/client/orchestrator.js';

async function main() {
  const repo = process.argv[2];
  const prNumber = parseInt(process.argv[3], 10);

  if (!repo || isNaN(prNumber)) {
    console.error("Usage: node test-orchestrator.js <owner/repo> <pr_number>");
    process.exit(1);
  }

  console.log(`Starting PR review via MCP for ${repo} PR #${prNumber}`);

  try {
    const result = await runPRReview({ repo, prNumber });
    console.log("Review completed successfully!");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Failed to run PR review:", error);
  } finally {
    process.exit(0);
  }
}

main();
