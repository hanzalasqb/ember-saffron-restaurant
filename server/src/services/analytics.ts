import { gte, sql, eq } from "drizzle-orm";
import { menuEngineering } from "../../../shared/menuEngineering";
import type { DB } from "../db/client";
import { menuItems, orderItems, orders, reservations } from "../db/schema";

export async function analytics(db: DB, days = 14) {
  const since = new Date(Date.now() - days * 86_400_000);
  const daily = await db.select({ day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`, revenue: sql<number>`sum(${orders.total})::float`, orders: sql<number>`count(*)::int` })
    .from(orders).where(gte(orders.createdAt, since)).groupBy(sql`1`).orderBy(sql`1`);
  const byType = await db.select({ type: orders.type, orders: sql<number>`count(*)::int`, revenue: sql<number>`sum(${orders.total})::float` }).from(orders).where(gte(orders.createdAt, since)).groupBy(orders.type);
  const sold = await db.select({ menuItemId: orderItems.menuItemId, qty: sql<number>`sum(${orderItems.quantity})::int` }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(gte(orders.createdAt, since)).groupBy(orderItems.menuItemId);
  const menu = await db.select().from(menuItems);
  const matrix = menuEngineering(menu.filter((m) => m.category !== "drinks").map((m) => ({ slug: m.slug, name: m.name, price: m.price, foodCost: m.foodCost, sold: sold.find((s) => s.menuItemId === m.id)?.qty ?? 0 })));
  const upcoming = await db.select({ covers: sql<number>`coalesce(sum(${reservations.partySize}), 0)::int`, count: sql<number>`count(*)::int` }).from(reservations).where(gte(reservations.startsAt, new Date()));
  const revenue = daily.reduce((n, d) => n + d.revenue, 0), count = daily.reduce((n, d) => n + d.orders, 0);
  const top = [...matrix.items].sort((a, b) => b.sold - a.sold).slice(0, 5);
  return {
    kpis: { revenue: Math.round(revenue), orders: count, avgTicket: count ? Math.round((revenue / count) * 100) / 100 : 0, upcomingCovers: upcoming[0].covers, upcomingBookings: upcoming[0].count },
    daily, byType, top, matrix,
  };
}

export { insightsFromMatrix } from "../../../shared/menuEngineering";
