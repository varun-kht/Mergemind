import { getPRDiff, postPRComment , formatReviewComment} from "../services/githubService.js";
import { processDiff } from "../services/diffService.js";
import { reviewCode } from "../services/aiReviewService.js";

export async function handlePRWebhook(req, res) {
  const event = req.headers["x-github-event"];

  if (event !== "pull_request") {
    return res.status(200).send("Event ignored");
  }

  const { action, pull_request, repository } = req.body;

  if (action !== "opened" && action !== "synchronize") {
    return res.status(200).send("Event ignored");
  }

  const repo = repository.full_name;
  const prNumber = pull_request.number;

  // ✅ Respond to GitHub immediately so it doesn't timeout or retry
  res.status(200).json({ message: "Review started", repo, prNumber });

  // 🔁 Run the full pipeline in the background
  try {
    console.log(`🔍 Reviewing PR #${prNumber} in ${repo}...`);

    const diff = await getPRDiff(repo, prNumber);
    const chunks = processDiff(diff);
    console.log(`📦 ${chunks.length} chunk(s) to review`);

    const reviews = [];
    for (let index = 0; index < chunks.length; index++) {
      console.log(`  → Chunk ${index + 1}/${chunks.length}`);
      const result = await reviewCode(chunks[index], { repo, prNumber, chunkIndex: index });
      reviews.push(result);
    }

    const comment = formatReviewComment(reviews, {
      repo,
      prNumber,
      reviewedAt: new Date().toISOString(),
    });

    await postPRComment(repo, prNumber, comment);
    console.log(`✅ Review posted to ${repo}#${prNumber}`);

  } catch (error) {
    console.error(`❌ Review failed for ${repo}#${prNumber}:`, error.message);
  }
}