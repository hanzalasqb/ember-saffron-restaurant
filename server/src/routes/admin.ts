import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db/client";
import { requireAuth } from "../lib/auth";
import { bus, sse } from "../lib/events";
import type { LLM } from "../lib/llm";
import { analytics, insightsFromMatrix } from "../services/analytics";
import { loadMenu, setAvailability } from "../services/menu";
import { STATUSES, activeOrders, updateStatus } from "../services/orders";
import { reservationsForDay, setReservationStatus } from "../services/reservations";

export function adminRoutes(db: DB, llm: LLM) {
  const r = Router();
  r.use(requireAuth);

  r.get("/kitchen", async (_req, res) => { res.json(await activeOrders(db)); });
  r.get("/kitchen/stream", (req, res) => {
    const send = sse(res);
    const listener = (order: unknown) => send("order", order);
    bus.on("order", listener);
    req.on("close", () => bus.off("order", listener));
  });
  r.patch("/orders/:code", async (req, res) => {
    const { status } = z.object({ status: z.enum(STATUSES) }).parse(req.body);
    res.json(await updateStatus(db, req.params.code.toUpperCase(), status));
  });

  r.get("/reservations", async (req, res) => {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
    res.json(await reservationsForDay(db, date));
  });
  r.patch("/reservations/:id", async (req, res) => {
    const { status } = z.object({ status: z.enum(["confirmed", "seated", "completed", "cancelled", "no_show"]) }).parse(req.body);
    res.json(await setReservationStatus(db, Number(req.params.id), status));
  });

  r.get("/analytics", async (_req, res) => {
    const data = await analytics(db);
    let insights = insightsFromMatrix(data.matrix), engine = "rules";
    if (llm.enabled) {
      try {
        const out = z.object({ insights: z.array(z.string()).min(2).max(5) }).parse(await llm.json(
          "You are a restaurant revenue consultant. Using the menu-engineering data (quadrant, sold, margin), give 3-4 specific, numeric recommendations. JSON: {insights: string[]}",
          JSON.stringify({ kpis: data.kpis, items: data.matrix.items.map(({ name, sold, margin, quadrant }) => ({ name, sold, margin, quadrant })) })));
        insights = out.insights; engine = "llm";
      } catch { /* keep rule-based insights */ }
    }
    res.json({ ...data, insights, insightsEngine: engine });
  });

  r.get("/menu", async (_req, res) => { res.json(await loadMenu(db, true)); });
  r.patch("/menu/:slug", async (req, res) => {
    const { available } = z.object({ available: z.boolean() }).parse(req.body);
    res.json((await setAvailability(db, req.params.slug, available))[0]);
  });
  return r;
}
