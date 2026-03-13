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
export function formatReviewComment(reviews, meta = {}) {
  const { repo = "unknown/repo", prNumber = "?", reviewedAt = new Date().toISOString() } = meta;

  const severityIcons = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🔵",
    suggestion: "💡",
  };

  const categoryLabels = {
    bug: "🐛 Bug",
    security: "🔐 Security",
    performance: "⚡ Performance",
    quality: "✨ Quality",
    testing: "🧪 Testing",
    "best-practice": "📘 Best Practice",
  };

  const parseChunk = (chunk) => {
    try {
      const cleaned = chunk.trim().startsWith("```json")
        ? chunk.replace(/^```json\s*/, "").replace(/\s*```$/, "")
        : chunk;
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const allIssues = reviews.flatMap(parseChunk);

  // ── Summary counts ────────────────────────────────────────────────────────
  const counts = { critical: 0, high: 0, medium: 0, low: 0, suggestion: 0 };
  allIssues.forEach((i) => { if (i.severity in counts) counts[i.severity]++; });
  const totalIssues = allIssues.length;

  const healthScore = totalIssues === 0 ? 100 : Math.max(0, Math.round(
    100 - (counts.critical * 25 + counts.high * 15 + counts.medium * 8 + counts.low * 3 + counts.suggestion * 1)
  ));

  const healthBar = (() => {
    const filled = Math.round(healthScore / 10);
    return "█".repeat(filled) + "░".repeat(10 - filled);
  })();

  const healthLabel =
    healthScore >= 90 ? "🟢 Excellent" :
    healthScore >= 70 ? "🟡 Needs Work" :
    healthScore >= 50 ? "🟠 Risky" :
                        "🔴 Critical";

  // ── Header ────────────────────────────────────────────────────────────────
  const header = `# 🧠 MergeMind Review — \`${repo}#${prNumber}\`

> Reviewed ${reviews.length} chunk${reviews.length !== 1 ? "s" : ""} · ${allIssues.length} issue${allIssues.length !== 1 ? "s" : ""} found · ${reviewedAt.slice(0, 10)}

---

## 📊 Health Score

\`${healthBar}\` **${healthScore}/100** — ${healthLabel}

| 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low | 💡 Suggestions |
|:-----------:|:-------:|:---------:|:------:|:--------------:|
| ${counts.critical} | ${counts.high} | ${counts.medium} | ${counts.low} | ${counts.suggestion} |

---`;

  // ── Early exit if clean ───────────────────────────────────────────────────
  if (totalIssues === 0) {
    return `${header}

## ✅ No Issues Found

This diff looks clean across all ${reviews.length} chunk${reviews.length !== 1 ? "s" : ""}. Great work!`;
  }

  // ── Issues grouped by severity ────────────────────────────────────────────
  const bySeverity = ["critical", "high", "medium", "low", "suggestion"].reduce((acc, sev) => {
    acc[sev] = allIssues.filter((i) => i.severity === sev);
    return acc;
  }, {});

  const severityBlocks = Object.entries(bySeverity)
    .filter(([, issues]) => issues.length > 0)
    .map(([severity, issues]) => {
      const icon = severityIcons[severity];
      const heading = `## ${icon} ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${issues.length})`;

      const issueItems = issues.map((issue, idx) => {
        const catLabel = categoryLabels[issue.category] || issue.category;
        const confidencePct = issue.confidence != null
          ? `${(issue.confidence * 100).toFixed(0)}%`
          : "N/A";
        const lineRef = issue.line != null ? `Line ${issue.line}` : "General";

        return `### ${idx + 1}. ${issue.title}

| Field | Detail |
|-------|--------|
| **Category** | ${catLabel} |
| **Location** | \`${lineRef}\` |
| **Confidence** | ${confidencePct} |

**Problem**
${issue.description}

**Suggested Fix**
${issue.suggestion}`;
      }).join("\n\n---\n\n");

      return `${heading}\n\n${issueItems}`;
    })
    .join("\n\n---\n\n");

  // ── Per-chunk breakdown ───────────────────────────────────────────────────
  const chunkBreakdown = reviews.map((chunk, i) => {
    const issues = parseChunk(chunk);
    if (issues.length === 0) return `- **Chunk ${i + 1}** — ✅ Clean`;

    const pills = ["critical","high","medium","low","suggestion"]
      .filter((s) => issues.some((iss) => iss.severity === s))
      .map((s) => `${severityIcons[s]} ${issues.filter((iss) => iss.severity === s).length} ${s}`)
      .join(" · ");

    return `- **Chunk ${i + 1}** — ${pills}`;
  }).join("\n");

  // ── Full JSON collapsible ─────────────────────────────────────────────────
  const fullJson = `<details>
<summary>📦 Raw JSON Output</summary>

\`\`\`json
${JSON.stringify(allIssues, null, 2)}
\`\`\`

</details>`;

  return [
    header,
    "## 🔍 Issues by Severity",
    severityBlocks,
    "---",
    "## 📁 Chunk Breakdown",
    chunkBreakdown,
    "---",
    fullJson,
    `\n*Generated by [MergeMind](https://github.com) · Model: llama-3.3-70b-versatile*`,
  ].join("\n\n");
}