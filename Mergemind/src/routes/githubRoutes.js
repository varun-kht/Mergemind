import express from "express";
import { handlePRWebhook } from "../controllers/githubController.js";

const router = express.Router();

router.post("/github", handlePRWebhook);

export default router;