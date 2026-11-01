import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { CATEGORIES, RESTAURANT } from "../../../shared/menu";
import { orderTotals } from "../../../shared/pricing";
import type { DB } from "../db/client";
import { orders, users } from "../db/schema";
import { signToken, verifyPassword } from "../lib/auth";
import { HttpError } from "../lib/errors";
import { bus, sse } from "../lib/events";
import { loadMenu } from "../services/menu";
import { OrderInput, placeOrder, withItems } from "../services/orders";
import { ReservationInput, availability, createReservation } from "../services/reservations";

export function publicRoutes(db: DB) {
  const r = Router();
  r.get("/restaurant", (_req, res) => { res.json({ ...RESTAURANT, categories: CATEGORIES }); });
  r.get("/menu", async (_req, res) => { res.json(await loadMenu(db)); });

  r.post("/orders/quote", async (req, res) => {
    const body = z.object({ type: z.enum(["pickup", "delivery", "dine_in"]), items: z.array(z.object({ slug: z.string(), quantity: z.number().int().min(1) })) }).parse(req.body);
    const menu = await loadMenu(db);
    res.json(orderTotals(body.items.map((i) => ({ price: menu.find((m) => m.slug === i.slug)?.price ?? 0, quantity: i.quantity })), body.type));
  });
  r.post("/orders", async (req, res) => { res.status(201).json(await placeOrder(db, OrderInput.parse(req.body))); });
  r.get("/orders/:code", async (req, res) => {
    const [o] = await db.select().from(orders).where(eq(orders.code, req.params.code.toUpperCase()));
    if (!o) throw new HttpError(404, "Order not found");
    res.json(await withItems(db, o));
  });
  // live order tracking for the guest (order codes are random and unguessable)
  r.get("/orders/:code/stream", (req, res) => {
    const send = sse(res);
    const code = req.params.code.toUpperCase();
    const listener = (o: { code: string; status: string }) => { if (o.code === code) send("status", { status: o.status }); };
    bus.on("order", listener);
    req.on("close", () => bus.off("order", listener));
  });

  r.get("/availability", async (req, res) => {
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), party: z.coerce.number().int().min(1).max(8) }).parse(req.query);
    res.json(await availability(db, q.date, q.party));
  });
  r.post("/reservations", async (req, res) => { res.status(201).json(await createReservation(db, ReservationInput.parse(req.body))); });

  r.post("/auth/login", async (req, res) => {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const [u] = await db.select().from(users).where(eq(users.email, body.email.toLowerCase()));
    if (!u || !(await verifyPassword(body.password, u.passwordHash))) throw new HttpError(401, "Invalid email or password");
    const user = { id: u.id, email: u.email, name: u.name, role: u.role === "admin" ? ("admin" as const) : ("staff" as const) };
    res.json({ token: await signToken(user), user });
  });
  return r;
}
