import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'mergemind-super-secret-key-123';

// Step 1: Redirect user to GitHub OAuth login
router.get('/login', (req, res) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.error('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET in .env');
    return res.status(500).send('OAuth not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to Mergemind/.env');
  }
  const redirectUri = `http://localhost:3000/auth/github/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;

  res.redirect(githubAuthUrl);
});

// Step 2: GitHub redirects back here with a code
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('No code provided by GitHub');
  }

  try {
    // Exchange the code for an access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      return res.status(400).send('Failed to obtain access token');
    }

    // Fetch user details from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const user = userResponse.data;

    // Create a JWT session containing the user info and GitHub access token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.login,
        avatar_url: user.avatar_url,
        githubToken: accessToken, // We store this to make API calls on their behalf
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Redirect back to the frontend dashboard with the JWT token in the URL hash
    res.redirect(`http://localhost:5173/dashboard#token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth callback error:', error.message);
    res.status(500).send('Authentication failed');
  }
});

export default router;
