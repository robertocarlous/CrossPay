import { Router } from "express";
import axios from "axios";
import client from "../lib/claude.js";

const router = Router();

const SYSTEM_PROMPT = `You are a username matcher for a payment app.

You receive a query (what the user typed) and a list of registered usernames.
Return ONLY a raw JSON object — no markdown, no explanation.

JSON shape:
{ "match": string | null }

Rules:
- Pick the closest username to the query (typos, partial matches, missing spaces).
- If nothing is reasonably close, return { "match": null }.
- Never invent a username that isn't in the list.`;

router.post("/", async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== "string" || query.trim() === "") {
    return res.status(400).json({ error: "query is required" });
  }

  let candidates = [];

  // Step 1: Ask Django for similar usernames
  try {
    const djangoRes = await axios.get(
      `${process.env.DJANGO_BASE_URL}/api/users/search/`,
      { params: { q: query.trim() }, timeout: 3000 }
    );
    candidates = djangoRes.data?.usernames ?? [];
  } catch (err) {
    console.error("Django lookup failed:", err.message);
    // If Django is down, return null gracefully
    return res.json({ success: false, match: null });
  }

  if (candidates.length === 0) {
    return res.json({ success: true, match: null });
  }

  // Step 2: Ask Claude to pick the best match
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 64,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ query: query.trim(), candidates }),
        },
      ],
    });

    const raw = message.content[0].text.trim();
    const parsed = JSON.parse(raw);

    return res.json({ success: true, match: parsed.match ?? null });
  } catch (err) {
    console.error("Resolver error:", err.message);
    return res.json({ success: false, match: null });
  }
});

export default router;