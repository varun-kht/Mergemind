import { runPRReview } from '../mcp/client/orchestrator.js';
import { recordReview } from "../services/statsService.js";
import { saveReview } from "../services/reviewStore.js";

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

  // 🔁 Background Pipeline — delegated to MCP Orchestrator
  try {
    console.log(`🔍 Reviewing PR #${prNumber} in ${repo} via MCP...`);
    
    // Notify Dashboard: Review Started
    io.emit("review-update", { 
      repo, 
      prNumber, 
      status: "Initializing MCP Analysis", 
      progress: 10 
    });

    io.emit("review-update", { 
      repo, 
      prNumber, 
      status: "Running MCP Orchestrator (Diff → RAG → AI → GitHub)", 
      progress: 30 
    });

    // Delegate entire pipeline to MCP orchestrator
    const result = await runPRReview({ repo, prNumber });

    // Parse reviews for stats + dashboard 
    const allParsed = (result.reviews || []).flatMap(r => {
      try {
        const raw = typeof r === 'string' ? r : JSON.stringify(r);
        const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (!match) return [];
        const arr = JSON.parse(match[0]);
        return Array.isArray(arr) ? arr : [];
      } catch (err) { 
        console.warn("Failed to parse AI review JSON chunk in controller.");
        return []; 
      }
    });

    // Save full review to persistent store
    saveReview({
      repo,
      prNumber,
      diffText: result.diffText,
      issues: allParsed,
      tokenReport: result.tokenReport
    });

    // Emit parsed reviews to dashboard
    io.emit("review-update", {
      repo,
      prNumber,
      status: "AI Review Complete",
      progress: 90,
      newReviews: allParsed,
    });

    // Record stats for CTO dashboard
    recordReview({ repo, prNumber, issues: allParsed, tokenReport: result.tokenReport });

    io.emit("review-update", { 
      repo, 
      prNumber, 
      status: "Review Posted to GitHub", 
      progress: 100 
    });
    console.log(`✅ MCP review posted to ${repo}#${prNumber}`);

  } catch (error) {
    console.error(`❌ MCP review failed for ${repo}#${prNumber}:`, error.message);
    io.emit("review-update", { repo, prNumber, status: `Error: ${error.message}`, progress: 0 });
  }
}