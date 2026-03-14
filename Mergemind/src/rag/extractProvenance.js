/**
 * Extract provenance metadata from diff text (file paths) and optional review content.
 */
export function extractFilePathsFromDiff(diffText) {
  if (!diffText || typeof diffText !== "string") return [];

  const paths = new Set();

  // diff --git a/path b/path
  const gitMatch = diffText.matchAll(/diff --git a\/(.+?) b\/\1/g);
  for (const m of gitMatch) {
    if (m[1]) paths.add(m[1].trim());
  }

  // +++ b/path or --- a/path
  const plusMatch = diffText.matchAll(/^\+\+\+ b\/(.+)$/gm);
  for (const m of plusMatch) {
    if (m[1]) paths.add(m[1].trim());
  }

  const minusMatch = diffText.matchAll(/^--- a\/(.+)$/gm);
  for (const m of minusMatch) {
    if (m[1]) paths.add(m[1].trim());
  }

  return [...paths];
}

export function parseReviewContentToOutcome(content) {
  if (!content || typeof content !== "string") return null;

  try {
    const match = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;

    return parsed.map((issue) => ({
      severity: issue.severity,
      category: issue.category,
      title: issue.title,
      description: issue.description?.slice(0, 200) ?? ""
    }));
  } catch {
    return null;
  }
}
