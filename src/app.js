import express from "express";
import githubRouter from './routes/githubRoutes.js';

const app = express();

// Needed for GitHub webhook signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);

app.get("/", (req, res) => {
  res.send("MergeMind AI PR Reviewer Running");
});

app.use("/webhooks", githubRouter);

export default app;