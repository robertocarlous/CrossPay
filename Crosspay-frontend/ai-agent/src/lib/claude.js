import Anthropic from "@anthropic-ai/sdk/index.js";
import "dotenv/config";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default client;