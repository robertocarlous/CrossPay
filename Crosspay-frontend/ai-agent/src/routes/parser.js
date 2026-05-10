import { Router } from "express";
import client from "../lib/claude.js";

const router = Router();

const SYSTEM_PROMPT = `You are a payment parser for a cross-chain crypto payment app.

Extract payment details from the user's natural language input.
Always respond with ONLY a raw JSON object — no markdown, no explanation.

JSON shape:
{
  "amount": number | null,
  "recipient": string | null,   // username, @handle, or phone number
  "currency": string | null,    // e.g. "USDC", "SOL", "ETH" — uppercase
  "note": string | null         // reason/memo if mentioned
}

Rules:
- If a value is not mentioned, set it to null.
- Convert written numbers to digits: "twenty" → 20
- Strip @ prefix from handles but keep phone numbers as-is
- Currency defaults to null if not specified (don't guess)`;

router.post("/", async (req, res) => {
  const { text } = req.body;

  // Guard: don't send empty strings
  if (!text || typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text.trim() }],
    });

    const raw = message.content[0].text.trim();
    const parsed = JSON.parse(raw);

    return res.json({ success: true, data: parsed });
  } catch (err) {
    console.error("Parser error:", err.message);
    // Graceful fallback — user can still fill the form manually
    return res.json({
      success: false,
      data: { amount: null, recipient: null, currency: null, note: null },
    });
  }
});

export default router;