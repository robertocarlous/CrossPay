import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import parserRouter from "./routes/parser.js";
import explainerRouter from "./routes/explainer.js";
import resolverRouter from "./routes/resolver.js";

const app = express();

app.use(cors());
app.use(express.json());

// Rate limiting — 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests, slow down." },
});
app.use(limiter);

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Routes
app.use("/api/parse-payment", parserRouter);
app.use("/api/explain-route", explainerRouter);
app.use("/api/resolve-recipient", resolverRouter);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => console.log(`CrossPay AI running on port ${PORT}`));