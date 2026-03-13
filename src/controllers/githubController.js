import { getPRDiff } from "../services/githubService.js";
import { processDiff } from "../services/diffService.js";
import { reviewCode } from "../services/aiReviewService.js";

export async function handlePRWebhook(req, res) {
  try {
    const action = req.body.action;

    if (action !== "opened" && action !== "synchronize") {
      return res.status(200).send("Event ignored");
    }

    const repo = req.body.repository.full_name;
    const prNumber = req.body.pull_request.number;

    console.log(`Processing PR #${prNumber}`);

    const diff = await getPRDiff(repo, prNumber);

  const chunks = processDiff(diff);

  const reviews = [];

  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    const result = await reviewCode(chunk, {
      repo,
      prNumber,
      chunkIndex: index
    });
    reviews.push(result);
  }

    console.log("AI Reviews:", reviews);

    res.status(200).json({
      message: "PR processed",
      reviews
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing PR");
  }
}