import { asc, eq } from "drizzle-orm";
import type { Dish } from "../../../shared/concierge";
import type { DB } from "../db/client";
import { menuItems } from "../db/schema";

export type MenuRow = typeof menuItems.$inferSelect;
export const toDish = (m: MenuRow): Dish & { id: number; available: boolean } => ({
  id: m.id, slug: m.slug, name: m.name, category: m.category as Dish["category"], price: m.price, description: m.description,
  tags: m.tags as Dish["tags"], allergens: m.allergens as Dish["allergens"], spice: m.spice as Dish["spice"], calories: m.calories,
  image: m.image, popular: m.popular, available: m.available,
});

export async function loadMenu(db: DB, includeUnavailable = false) {
  const rows = await db.select().from(menuItems).orderBy(asc(menuItems.id));
  return rows.filter((r) => includeUnavailable || r.available).map(toDish);
}

export async function setAvailability(db: DB, slug: string, available: boolean) {
  return db.update(menuItems).set({ available }).where(eq(menuItems.slug, slug)).returning();
}
