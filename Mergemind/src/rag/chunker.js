// Basic text chunker used for RAG indexing.
// Here we keep it simple: split by characters with overlap.

export function chunkText(text, chunkSize = 2000, overlap = 200) {
  const chunks = [];

  if (!text || chunkSize <= 0) return chunks;

  let start = 0;
  const len = text.length;

  while (start < len) {
    const end = Math.min(len, start + chunkSize);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    if (end === len) break;
    start = end - overlap;
  }

  return chunks;
}


