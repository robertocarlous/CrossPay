import { Router } from "express";
import client from "../lib/claude.js";

const router = Router();

const SYSTEM_PROMPT = `You are a helpful assistant for a crypto payment app.

A user is about to confirm a cross-chain payment. You receive a JSON object
describing the payment route (bridges, fees, estimated time, tokens involved).

Write 2-3 plain English sentences that explain:
1. What path the money takes (which chains/bridges)
2. The total fees involved
3. How long it will take to arrive

Use simple language — assume the user is not a crypto expert.
Do NOT use bullet points. Do NOT use markdown. Just plain sentences.`;

router.post("/", async (req, res) => {
  const { route } = req.body;

  if (!route || typeof route !== "object") {
    return res.status(400).json({ error: "route object is required" });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify(route),
        },
      ],
    });

    const explanation = message.content[0].text.trim();
    return res.json({ success: true, explanation });
  } catch (err) {
    console.error("Explainer error:", err.message);
    // Fallback: user sees the confirm screen without explanation
    return res.json({ success: false, explanation: null });
  }
});

export default router;