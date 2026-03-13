// src/app.js
import express from "express";
import githubRouter from "./routes/githubRoutes.js";

const app = express();

// ----------------------------
// Middleware
// ----------------------------

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

// ----------------------------
// Standalone test webhook route
// ----------------------------
app.post("/webhook", (req, res) => {
  const event = req.headers['x-github-event']; // the GitHub event type
  console.log(`Event received: ${event}`);
  console.log("Parsed payload:", req.body);

  switch(event) {
    case "push":
      console.log(`Push to branch: ${req.body.ref.split("/").pop()}`);
      break;
    case "pull_request":
      console.log(`PR #${req.body.pull_request.number} action: ${req.body.action}`);
      break;
    case "create":
      console.log(`Created: ${req.body.ref_type} ${req.body.ref}`);
      break;
    case "ping":
      console.log("Ping received from GitHub");
      break;
    default:
      console.log("Other event received");
  }

  res.status(200).send("Webhook processed");
});


export default app;