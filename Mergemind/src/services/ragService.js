import { indexPrChunk } from "../rag/indexer.js";
import { retrieveSimilarChunks } from "../rag/retriever.js";

function formatProvenance(item) {
  const lines = [
    `Source: ${item.repo ?? "?"} · PR #${item.prNumber ?? "?"} · Chunk ${item.chunkIndex ?? "?"}`,
    item.sourceUrl ? `URL: ${item.sourceUrl}` : null,
    item.filePaths?.length ? `Files: ${item.filePaths.join(", ")}` : null,
    item.createdAt ? `Indexed: ${item.createdAt.slice(0, 10)}` : null,
    `Similarity: ${item.score?.toFixed ? item.score.toFixed(3) : item.score}`
  ].filter(Boolean);
  return lines.join(" | ");
}

export async function getRagContextForChunk({ repo, prNumber, chunkIndex, text }) {
  const similar = await retrieveSimilarChunks({ repo, text, topK: 5 });

  if (!similar.length) return "";

  const formatted = similar
    .map(
      (item, idx) =>
        `# Context Match ${idx + 1}\n` +
        `**Provenance:** ${formatProvenance(item)}\n\n` +
        (item.reviewOutcome?.length
          ? `**Past review findings:** ${item.reviewOutcome.map((r) => `${r.severity}: ${r.title}`).join("; ")}\n\n`
          : "") +
        `**Code:\n${item.text}\n**`
    )
    .join("\n----------------\n\n");

  return formatted;
}

export async function storeChunkInRag({ repo, prNumber, chunkIndex, text, reviewOutcome }) {
  await indexPrChunk({ repo, prNumber, chunkIndex, text, reviewOutcome });
}

// Terms that are model/framework/estimator-specific; normalize to placeholder so e.g. "callbacks in cnn" and "callbacks in rnn" dedupe, and sktime-style "FCN layers" / "FCNClassifier" issues group
const NORMALIZE_TERMS = [
  // DL / ML models
  "cnn", "rnn", "lstm", "gru", "fcn", "mlp", "transformer", "bert", "gpt", "resnet", "vgg", "vit",
  // Frameworks
  "keras", "tensorflow", "pytorch", "torch", "tf", "onnx", "sklearn", "sktime",
  // Estimators / components (sktime, sklearn style)
  "classifier", "regressor", "estimator", "network", "layers",
  // Web / backend
  "react", "vue", "angular", "express", "django", "flask",
  "api", "url", "endpoint", "service", "handler", "utils"
];

function normalizeTitleForDedup(title) {
  if (!title || typeof title !== "string") return "";
  let t = title.toLowerCase().trim().replace(/\s+/g, " ");
  for (const term of NORMALIZE_TERMS) {
    const re = new RegExp(`\\b${term}\\b`, "gi");
    t = t.replace(re, "*");
  }
  // Collapse any run of * and spaces to a single * so "add X in * *" and "add X in *" match
  t = t.replace(/(\*\s*)+/g, "*").replace(/\s+/g, " ").trim();
  return t;
}

function fingerprint(issue) {
  const norm = normalizeTitleForDedup(issue.title);
  return `${(issue.severity || "").toLowerCase()}|${(issue.category || "").toLowerCase()}|${norm}`;
}

/**
 * Fetch similar chunks from RAG, extract reviewOutcome, dedupe by (severity, category, normalized title).
 * Titles that differ only by model/framework name (e.g. "add callbacks in cnn" vs "add callbacks in rnn") are treated as the same issue.
 * Returns list of { severity, category, title, description, sourceRefs } for "Similar issue: ..." in review output.
 */
export async function getDedupedSimilarIssues({ repo, diffText, topK = 10 }) {
  const chunk = typeof diffText === "string" ? diffText.slice(0, 4000) : "";
  if (!chunk) return [];
  const similar = await retrieveSimilarChunks({ repo, text: chunk, topK });
  const seen = new Map();
  for (const item of similar) {
    const outcomes = item.reviewOutcome || [];
    for (const o of outcomes) {
      const fp = fingerprint(o);
      if (!seen.has(fp)) {
        seen.set(fp, {
          severity: o.severity,
          category: o.category,
          title: o.title,
          description: (o.description || "").slice(0, 200),
          sourceRefs: []
        });
      }
      const ref = item.prNumber != null ? `PR #${item.prNumber}` : null;
      if (ref && !seen.get(fp).sourceRefs.includes(ref)) {
        seen.get(fp).sourceRefs.push(ref);
      }
    }
  }
  return Array.from(seen.values());
}


