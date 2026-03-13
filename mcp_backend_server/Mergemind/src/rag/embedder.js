// Simple local embedder to avoid extra external API dependencies.
// Produces a fixed-size numeric vector from text that can be stored in Qdrant.

const DIMENSION = 128;

export const EMBEDDING_DIMENSION = DIMENSION;

export function embedText(text) {
  const vector = new Array(DIMENSION).fill(0);
  if (!text) return vector;

  const normalized = text.toString();

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const idx = i % DIMENSION;
    vector[idx] += code / 255;
  }

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;

  return vector.map(v => v / norm);
}


