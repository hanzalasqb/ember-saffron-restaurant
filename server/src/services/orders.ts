import { randomBytes } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { orderTotals } from "../../../shared/pricing";
import type { DB } from "../db/client";
import { menuItems, orderItems, orders } from "../db/schema";
import { HttpError } from "../lib/errors";
import { bus } from "../lib/events";

export const STATUSES = ["received", "preparing", "ready", "out_for_delivery", "completed", "cancelled"] as const;
export const OrderInput = z.object({
  customerName: z.string().min(2).max(120), phone: z.string().min(6).max(40), type: z.enum(["pickup", "delivery", "dine_in"]),
  address: z.string().max(300).optional(), notes: z.string().max(400).optional(),
  items: z.array(z.object({ slug: z.string(), quantity: z.number().int().min(1).max(20) })).min(1).max(40),
}).refine((o) => o.type !== "delivery" || (o.address?.length ?? 0) >= 5, { message: "Delivery address is required", path: ["address"] });

export async function withItems(db: DB, order: typeof orders.$inferSelect) {
  return { ...order, items: await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)) };
}

export async function placeOrder(db: DB, input: z.infer<typeof OrderInput>) {
  const menu = await db.select().from(menuItems).where(inArray(menuItems.slug, input.items.map((i) => i.slug)));
  const lines = input.items.map((i) => {
    const m = menu.find((x) => x.slug === i.slug);
    if (!m || !m.available) throw new HttpError(409, `${m?.name ?? i.slug} is not available right now`);
    return { menu: m, quantity: i.quantity, price: m.price };
  });
  const totals = orderTotals(lines, input.type);
  const order = await db.transaction(async (tx) => {
    const [o] = await tx.insert(orders).values({ code: randomBytes(3).toString("hex").toUpperCase(), customerName: input.customerName, phone: input.phone, type: input.type, address: input.address, notes: input.notes, ...totals }).returning();
    await tx.insert(orderItems).values(lines.map((l) => ({ orderId: o.id, menuItemId: l.menu.id, name: l.menu.name, unitPrice: l.price, quantity: l.quantity })));
    return o;
  });
  const full = await withItems(db, order);
  bus.emit("order", full);
  return full;
}

export async function updateStatus(db: DB, code: string, status: (typeof STATUSES)[number]) {
  const [o] = await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.code, code)).returning();
  if (!o) throw new HttpError(404, "Order not found");
  const full = await withItems(db, o);
  bus.emit("order", full);
  return full;
}

export async function activeOrders(db: DB) {
  const rows = await db.select().from(orders).where(inArray(orders.status, ["received", "preparing", "ready", "out_for_delivery"])).orderBy(desc(orders.createdAt)).limit(60);
  return Promise.all(rows.map((r) => withItems(db, r)));
}
