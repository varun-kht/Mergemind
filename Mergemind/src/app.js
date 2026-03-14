// src/app.js
import express from "express";
import cors from "cors";
import githubRouter from "./routes/githubRoutes.js";
import authRouter from "./routes/authRoutes.js";
import apiRouter from "./routes/apiRoutes.js";
import { handlePRWebhook } from "./controllers/githubController.js";

const app = express();

// ----------------------------
// Middleware
// ----------------------------

app.use(cors());

// Parse JSON and save raw body for signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ----------------------------
// Routes
// ----------------------------

// Simple health check
app.get("/", (req, res) => {
  res.send("MergeMind AI PR Reviewer Running");
});

// Use GitHub router for webhook events
app.use("/webhooks", githubRouter);

// New OAuth Authentication
app.use("/auth/github", authRouter);

// Protected API routes
app.use("/api", apiRouter);

// Alias for the webhook
app.post("/webhook", handlePRWebhook);


export default app;