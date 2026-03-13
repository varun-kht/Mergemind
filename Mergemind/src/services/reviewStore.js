import crypto from "crypto";

// In-memory store for full review analysis results
// Structure: { id: string, repo: string, prNumber: number, diffText: string, issues: array, reviewedAt: string }
const reviews = [];

export function saveReview(data) {
  const reviewData = {
    id: crypto.randomUUID(),
    ...data,
    reviewedAt: new Date().toISOString(),
  };
  reviews.push(reviewData);
  return reviewData;
}

export function getAllReviews() {
  // Return list with minimal data (no full diff string)
  return reviews.map(r => ({
    id: r.id,
    repo: r.repo,
    prNumber: r.prNumber,
    issueCount: r.issues?.length || 0,
    reviewedAt: r.reviewedAt
  })).sort((a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt));
}

export function getReviewById(id) {
  return reviews.find(r => r.id === id);
}
