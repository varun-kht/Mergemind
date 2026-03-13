import { z } from "zod";

// GitHub MCP Tool Schemas
export const getPrDiffSchema = z.object({
  repo: z.string().describe("The full name of the repository (e.g. 'owner/repo')"),
  prNumber: z.number().describe("The pull request number")
});

export const getPrMetadataSchema = z.object({
  repo: z.string().describe("The full name of the repository"),
  prNumber: z.number().describe("The pull request number")
});

export const listChangedFilesSchema = z.object({
  repo: z.string().describe("The full name of the repository"),
  prNumber: z.number().describe("The pull request number")
});

export const postReviewCommentSchema = z.object({
  repo: z.string().describe("The full name of the repository"),
  prNumber: z.number().describe("The pull request number"),
  body: z.string().describe("The markdown formatted review comment body")
});

// Qdrant MCP Tool Schemas
export const retrieveSimilarSchema = z.object({
  repo: z.string().describe("The full name of the repository"),
  text: z.string().describe("The diff chunk text to find similar previous reviews for"),
  topK: z.number().optional().describe("Number of similar chunks to retrieve")
});

export const storeChunkSchema = z.object({
  repo: z.string().describe("The full name of the repository"),
  prNumber: z.number().describe("The pull request number"),
  chunkIndex: z.number().describe("The chunk positional index in the PR"),
  text: z.string().describe("The code diff chunk text")
});

export const searchByRepoSchema = z.object({
  repo: z.string().describe("The full name of the repository"),
  limit: z.number().optional().describe("Number of results to return")
});