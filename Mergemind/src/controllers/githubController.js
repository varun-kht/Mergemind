import { getPRDiff, postPRComment, formatReviewComment } from "../services/githubService.js";
import { processDiff } from "../services/diffService.js";
import { reviewCode } from "../services/aiReviewService.js";

export async function handlePRWebhook(req, res) {
  const event = req.headers["x-github-event"];
  const io = req.app.get("io"); // Access Socket.io instance

  if (event !== "pull_request") {
    return res.status(200).send("Event ignored");
  }

  const { action, pull_request, repository } = req.body;

  if (action !== "opened" && action !== "synchronize") {
    return res.status(200).send("Event ignored");
  }

  const repo = repository.full_name;
  const prNumber = pull_request.number;

  // ✅ Respond to GitHub immediately
  res.status(200).json({ message: "Review started", repo, prNumber });

  // 🔁 Background Pipeline
  try {
    console.log(`🔍 Reviewing PR #${prNumber} in ${repo}...`);
    
    // Notify Dashboard: Review Started
    io.emit("review-update", { 
      repo, 
      prNumber, 
      status: "Initializing Analysis", 
      progress: 10 
    });

    const diff = await getPRDiff(repo, prNumber);
    const chunks = processDiff(diff);
    console.log(`📦 ${chunks.length} chunk(s) to review`);

    const reviews = [];
    for (let index = 0; index < chunks.length; index++) {
      console.log(`  → Chunk ${index + 1}/${chunks.length}`);
      
      // Notify Dashboard: Processing specific chunk with its contents
      io.emit("review-update", { 
        repo, 
        prNumber, 
        status: `Reviewing Chunk ${index + 1}/${chunks.length}`, 
        progress: Math.round(10 + ((index + 1) / chunks.length) * 80),
        log: `Analyzing chunk ${index + 1}...`,
        currentChunk: chunks[index]
      });

      const result = await reviewCode(chunks[index], { repo, prNumber, chunkIndex: index });
      reviews.push(result);
      
      // Notify Dashboard: Finished chunk review
      let parsedReview = [];
      try {
         const cleaned = result.trim().startsWith("```json")
          ? result.replace(/^```json\s*/, "").replace(/\s*```$/, "")
          : result;
         parsedReview = JSON.parse(cleaned);
      } catch (e) {
         parsedReview = [];
      }

      io.emit("review-update", {
        repo,
        prNumber,
        status: `Finished Chunk ${index + 1}`,
        progress: Math.round(10 + ((index + 1) / chunks.length) * 80),
        newReviews: parsedReview,
        chunkDiff: chunks[index]
      });
    }

    const comment = formatReviewComment(reviews, {
      repo,
      prNumber,
      reviewedAt: new Date().toISOString(),
    });

    try {
      await postPRComment(repo, prNumber, comment);
      io.emit("review-update", { 
        repo, 
        prNumber, 
        status: "Review Posted to GitHub", 
        progress: 100 
      });
      console.log(`✅ Review posted to ${repo}#${prNumber}`);
    } catch (e) {
       io.emit("review-update", { 
        repo, 
        prNumber, 
        status: "Finished AI Review, but GitHub Comment Failed (Check Server Logs)", 
        progress: 100 
      });
    }

  } catch (error) {
    console.error(`❌ Review failed for ${repo}#${prNumber}:`, error.message);
    io.emit("review-update", { repo, prNumber, status: `Error: ${error.message}`, progress: 0 });
  }
}