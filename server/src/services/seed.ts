import { randomBytes } from "node:crypto";
import { MENU, TABLES, itemImage } from "../../../shared/menu";
import { orderTotals } from "../../../shared/pricing";
import { at, bestTable, diningMinutes, slotsFor, type Booking } from "../../../shared/reservations";
import { config } from "../config";
import type { DB } from "../db/client";
import { diningTables, menuItems, orderItems, orders, reservations, users } from "../db/schema";
import { hashPassword } from "../lib/auth";

function prng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// popularity weights make the menu-engineering matrix interesting (stars, plowhorses, puzzles, dogs)
const WEIGHT: Record<string, number> = { "saffron-chicken-biryani": 10, "smash-burger": 9, "wood-fired-margherita": 8, "chicken-tikka-masala": 7, "mint-lime-cooler": 9, "burrata-caprese": 6, "lamb-samosas": 7, "molten-chocolate-cake": 6, "ember-ribeye": 3, "charred-salmon": 2.5, "truffle-risotto": 2, "falafel-mezze": 3, "crispy-calamari": 4, "wild-mushroom-soup": 1.5, "classic-tiramisu": 3, "strawberry-panna-cotta": 1.2, "citrus-spritz": 3, "iced-spanish-latte": 4 };

export async function seed(db: DB) {
  if ((await db.select({ id: menuItems.id }).from(menuItems).limit(1)).length) return;
  const items = await db.insert(menuItems).values(MENU.map((m) => ({ slug: m.slug, name: m.name, category: m.category, description: m.description, price: m.price, foodCost: m.foodCost, tags: m.tags, allergens: m.allergens, calories: m.calories, spice: m.spice, image: itemImage(m.slug), popular: Boolean(m.popular) }))).returning();
  await db.insert(diningTables).values(TABLES);
  const password = config.ADMIN_PASSWORD || randomBytes(9).toString("base64url");
  await db.insert(users).values({ email: config.ADMIN_EMAIL, name: "Restaurant Manager", role: "admin", passwordHash: await hashPassword(password) });
  if (!config.ADMIN_PASSWORD) console.log(`[seed] Manager login ${config.ADMIN_EMAIL} / ${password}`);

  const rand = prng(7);
  const pick = () => { const total = items.reduce((n, i) => n + (WEIGHT[i.slug] ?? 1), 0); let r = rand() * total; for (const i of items) { r -= WEIGHT[i.slug] ?? 1; if (r <= 0) return i; } return items[0]; };
  for (let day = 14; day >= 1; day--) {
    for (let k = 0, n = 14 + Math.floor(rand() * 12); k < n; k++) {
      const lines = Array.from({ length: 1 + Math.floor(rand() * 4) }, pick).map((m) => ({ m, quantity: 1 + (rand() < 0.2 ? 1 : 0), price: m.price }));
      const type = (["pickup", "delivery", "dine_in"] as const)[Math.floor(rand() * 3)];
      const created = new Date(); created.setDate(created.getDate() - day); created.setHours(12 + Math.floor(rand() * 10), Math.floor(rand() * 60));
      const [o] = await db.insert(orders).values({ code: randomBytes(3).toString("hex").toUpperCase(), customerName: "Demo Guest", phone: "+1 555 0100", type, address: type === "delivery" ? "Riverside District" : null, status: "completed", ...orderTotals(lines, type), createdAt: created, updatedAt: created }).returning();
      await db.insert(orderItems).values(lines.map((l) => ({ orderId: o.id, menuItemId: l.m.id, name: l.m.name, unitPrice: l.price, quantity: l.quantity })));
    }
  }
  // upcoming bookings so the reservation board and availability look realistic
  const bookings: Booking[] = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(); date.setDate(date.getDate() + d);
    const day = iso(date);
    for (let k = 0; k < 6 + Math.floor(rand() * 6); k++) {
      const party = [2, 2, 2, 3, 4, 4, 5, 6][Math.floor(rand() * 8)];
      const free = slotsFor(day, party, TABLES, bookings, new Date(0)).filter((s) => s.available && s.time >= "18:00");
      if (!free.length) continue;
      const slot = free[Math.floor(rand() * free.length)];
      const start = at(day, slot.time), end = new Date(start.getTime() + diningMinutes(party) * 60_000);
      const table = bestTable(TABLES, bookings, party, start, end)!;
      bookings.push({ tableId: table.id, start, end });
      await db.insert(reservations).values({ code: randomBytes(3).toString("hex").toUpperCase(), name: `Guest ${k + 1}`, phone: "+1 555 0101", partySize: party, startsAt: start, endsAt: end, tableId: table.id });
    }
  }
  console.log(`[seed] ${items.length} menu items, ${TABLES.length} tables, demo orders and reservations created`);
}
