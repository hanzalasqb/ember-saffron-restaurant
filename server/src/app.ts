import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { DB } from "./db/client";
import { errorHandler } from "./lib/errors";
import type { LLM } from "./lib/llm";
import { adminRoutes } from "./routes/admin";
import { conciergeRoutes } from "./routes/concierge";
import { publicRoutes } from "./routes/public";

export function createApp(db: DB, llm: LLM, opts: { corsOrigin: string } = { corsOrigin: "*" }) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: opts.corsOrigin }));
  app.use(express.json({ limit: "100kb" }));
  app.use("/api/", rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));
  app.use(["/api/concierge", "/api/reservations", "/api/orders"], rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));
  app.get("/api/health", (_req, res) => { res.json({ status: "ok", ai: llm.enabled ? "llm" : "rules" }); });
  app.use("/api", publicRoutes(db));
  app.use("/api/concierge", conciergeRoutes(db, llm));
  app.use("/api/admin", adminRoutes(db, llm));
  app.use(errorHandler);
  return app;
}
