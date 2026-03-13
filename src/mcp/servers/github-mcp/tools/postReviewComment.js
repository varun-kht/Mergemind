import { postPRComment } from '../../../../services/githubService.js';
import { postReviewCommentSchema } from '../../../shared/toolSchema.js';

export const postReviewCommentTool = {
  name: "postReviewComment",
  description: "Posts a review comment to a GitHub pull request.",
  schema: postReviewCommentSchema,
  handler: async (args) => {
    try {
      await postPRComment(args.repo, args.prNumber, args.body);
      return {
        content: [{ type: "text", text: "Successfully posted comment" }]
      };
    } catch (error) {
      console.error("[GitHub MCP] postReviewComment error:", error.message);
      return {
        isError: true,
        content: [{ type: "text", text: `Error posting comment: ${error.message}` }]
      };
    }
  }
};