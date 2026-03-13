// In-memory review stats store — accumulates data from real PR reviews.

const reviewHistory = [];

// ─── Public API ──────────────────────────────────────────────────────────────

export function recordReview({ repo, prNumber, issues, reviewedAt, tokenReport }) {
  reviewHistory.push({
    repo,
    prNumber,
    issues: Array.isArray(issues) ? issues : [],
    reviewedAt: reviewedAt || new Date().toISOString(),
    tokenReport: tokenReport || null
  });
}

export function getStats() {
  const totalPRs = reviewHistory.length;
  const allIssues = reviewHistory.flatMap((r) => r.issues);
  const totalIssues = allIssues.length;

  // Severity breakdown
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, suggestion: 0 };
  allIssues.forEach((i) => {
    if (i.severity in bySeverity) bySeverity[i.severity]++;
  });

  // Category breakdown
  const byCategory = {};
  allIssues.forEach((i) => {
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
  });

  // Most common vulnerability
  const securityIssues = allIssues.filter((i) => i.category === "security");
  const vulnCounts = {};
  securityIssues.forEach((i) => {
    vulnCounts[i.title] = (vulnCounts[i.title] || 0) + 1;
  });
  const topVuln = Object.entries(vulnCounts).sort((a, b) => b[1] - a[1])[0];

  // Hours saved estimate: ~0.5 hr per PR reviewed
  const hoursSaved = parseFloat((totalPRs * 0.5).toFixed(1));

  // Token usage aggregation
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;

  reviewHistory.forEach(r => {
    if (r.tokenReport) {
      totalInputTokens += r.tokenReport.total?.input || 0;
      totalOutputTokens += r.tokenReport.total?.output || 0;
      totalCost += parseFloat(r.tokenReport.total?.cost?.replace('$', '') || 0);
    }
  });

  // Daily breakdown (last 7 days)
  const now = Date.now();
  const DAY = 86400000;
  const daily = [];
  for (let d = 6; d >= 0; d--) {
    const dayStart = new Date(now - d * DAY);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + DAY);

    const dayReviews = reviewHistory.filter((r) => {
      const t = new Date(r.reviewedAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });

    const dayIssues = dayReviews.flatMap((r) => r.issues);
    daily.push({
      date: dayStart.toISOString().slice(0, 10),
      prs: dayReviews.length,
      issues: dayIssues.length,
      critical: dayIssues.filter((i) => i.severity === "critical").length,
      high: dayIssues.filter((i) => i.severity === "high").length,
    });
  }

  // Repo leaderboard
  const repoMap = {};
  reviewHistory.forEach((r) => {
    if (!repoMap[r.repo]) repoMap[r.repo] = { repo: r.repo, prs: 0, issues: 0, critical: 0, high: 0 };
    repoMap[r.repo].prs++;
    r.issues.forEach((i) => {
      repoMap[r.repo].issues++;
      if (i.severity === "critical") repoMap[r.repo].critical++;
      if (i.severity === "high") repoMap[r.repo].high++;
    });
  });
  const leaderboard = Object.values(repoMap).sort((a, b) => b.issues - a.issues);

  // Today's stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayReviews = reviewHistory.filter((r) => new Date(r.reviewedAt) >= todayStart);
  const todayHoursSaved = parseFloat((todayReviews.length * 0.5).toFixed(1));
  const todayIssues = todayReviews.flatMap((r) => r.issues).length;

  return {
    totalPRs,
    totalIssues,
    bySeverity,
    byCategory,
    topVulnerability: topVuln ? { title: topVuln[0], count: topVuln[1] } : null,
    hoursSaved,
    tokenUsage: {
      totalInput: totalInputTokens,
      totalOutput: totalOutputTokens,
      totalGrand: totalInputTokens + totalOutputTokens,
      totalCost: `$${totalCost.toFixed(4)}`
    },
    daily,
    leaderboard,
    today: {
      prs: todayReviews.length,
      issues: todayIssues,
      hoursSaved: todayHoursSaved,
      tokens: todayReviews.reduce((sum, r) => sum + (r.tokenReport?.total?.grand || 0), 0),
      cost: `$${todayReviews.reduce((sum, r) => sum + parseFloat(r.tokenReport?.total?.cost?.replace('$', '') || 0), 0).toFixed(4)}`
    },
  };
}
