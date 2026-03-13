import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { getPRDiff } from '../services/githubService.js';
import { getStats } from '../services/statsService.js';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mergemind-super-secret-key-123';

// ── Public routes (no auth required) ───────────────────────────────────────
router.get('/stats', (_req, res) => {
  res.json(getStats());
});

import { getAllReviews, getReviewById } from '../services/reviewStore.js';

router.get('/reviews', (_req, res) => {
  res.json(getAllReviews());
});

router.get('/reviews/:id', (req, res) => {
  const review = getReviewById(req.params.id);
  if (!review) return res.status(404).json({ error: "Review not found" });
  res.json(review);
});

// Middleware to verify JWT and extract the internal GitHub token
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id, username, avatar_url, githubToken
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
  }
};

// Protect all routes below this line
router.use(requireAuth);

// Fetch user's repositories
router.get('/repos', async (req, res) => {
  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${req.user.githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
      params: {
        sort: 'updated',
        per_page: 50
      }
    });

    const repos = response.data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      owner: {
         login: repo.owner.login,
         avatar_url: repo.owner.avatar_url
      }
    }));

    res.json(repos);
  } catch (error) {
    console.error('Error fetching user repos:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Fetch Pull Requests for a specific repository
router.get('/repos/:owner/:repo/pulls', async (req, res) => {
   const { owner, repo } = req.params;
   
   try {
     const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
       headers: {
         Authorization: `Bearer ${req.user.githubToken}`,
         Accept: 'application/vnd.github.v3+json',
       },
       params: {
         state: 'open',
         sort: 'updated',
         direction: 'desc'
       }
     });
 
     const pulls = response.data.map((pr) => ({
       id: pr.id,
       number: pr.number,
       title: pr.title,
       state: pr.state,
       user: {
          login: pr.user.login,
          avatar_url: pr.user.avatar_url
       },
       created_at: pr.created_at
     }));
 
     res.json(pulls);
   } catch (error) {
     console.error(`Error fetching PRs for ${owner}/${repo}:`, error.response?.data || error.message);
     res.status(500).json({ error: 'Failed to fetch pull requests' });
   }
});

// Trigger a manual review
router.post('/trigger-review', async (req, res) => {
    const { repository, pull_request } = req.body;
    
    // We can reuse the webhook controller logic here!
    // But since `handlePRWebhook` uses req.body, we format it to match GitHub's payload
    const mockRequest = {
       headers: { 'x-github-event': 'pull_request' },
       body: {
          action: 'opened',
          repository,
          pull_request
       },
       app: req.app // Pass the app downwards so it can access io
    };
    
    // We attach a mock response object
    const mockResponse = {
       status: (code) => ({
           send: (msg) => {},
           json: (data) => res.json(data) // Actually respond to the frontend
       })
    };
    
    import('../controllers/githubController.js').then(({ handlePRWebhook }) => {
       handlePRWebhook(mockRequest, mockResponse);
    });
});

export default router;
