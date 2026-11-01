// Rule-based AI concierge used without an LLM key (server) and in the browser demo.
import { RESTAURANT, filterMenu, parseDiet, type MenuItemDef } from "./menu";
import type { Slot } from "./reservations";

export type Dish = Pick<MenuItemDef, "slug" | "name" | "category" | "price" | "description" | "tags" | "allergens" | "spice" | "calories"> & { image: string; popular?: boolean };
export interface ConciergeReply {
  text: string; dishes: Dish[];
  tool: { name: string; args: Record<string, unknown>; summary: string };
  booking?: { date: string; time?: string; party: number; slots: string[] };
}

const NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function parseBooking(text: string, today: Date): { date: string; time?: string; party?: number } {
  const t = text.toLowerCase();
  const d = new Date(today);
  const dayIdx = DAYS.findIndex((day) => t.includes(day));
  if (/tomorrow/.test(t)) d.setDate(d.getDate() + 1);
  else if (dayIdx >= 0) d.setDate(d.getDate() + ((dayIdx - d.getDay() + 7) % 7 || 7));
  const explicit = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  const date = explicit ? explicit[0] : iso(d);
  const tm = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) ?? t.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/) ?? t.match(/\b(\d{1,2}):(\d{2})\b/);
  let time: string | undefined;
  if (tm) {
    let h = Number(tm[1]);
    const m = tm[2] ?? "00";
    if (tm[3] === "pm" && h < 12) h += 12;
    else if (!tm[3] && h >= 1 && h <= 11) h += 12; // "at 8" means dinner time
    time = `${String(h).padStart(2, "0")}:${m === "00" || m === "30" ? m : "00"}`;
  }
  const pm = t.match(/(?:for|party of|table for)\s+(\d+|one|two|three|four|five|six|seven|eight)\b/) ?? t.match(/\b(\d+)\s*(?:people|persons|guests|pax)/);
  const party = pm ? Number(NUMBERS[pm[1]] ?? pm[1]) : undefined;
  return { date, time, party };
}

const fmt = (d: Dish) => `- **${d.name}** — $${d.price}${d.tags.includes("vegan") ? " · vegan" : d.tags.includes("vegetarian") ? " · vegetarian" : ""}${d.allergens.length ? ` · contains ${d.allergens.join(", ")}` : " · no major allergens"}`;

export function concierge(message: string, menu: Dish[], availability: (date: string, party: number) => Slot[], today = new Date()): ConciergeReply {
  const t = message.toLowerCase();

  if (/\b(book|reserve|reservation|table)\b/.test(t)) {
    const req = parseBooking(message, today);
    const party = req.party ?? 2;
    const slots = availability(req.date, party).filter((s) => s.available).map((s) => s.time);
    const near = req.time ? [...slots].sort((a, b) => Math.abs(+a.replace(":", "") - +req.time!.replace(":", "")) - Math.abs(+b.replace(":", "") - +req.time!.replace(":", ""))).slice(0, 4).sort() : slots.slice(0, 6);
    const exact = req.time && slots.includes(req.time);
    const dateLabel = new Date(`${req.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    return {
      tool: { name: "check_availability", args: { date: req.date, time: req.time, party_size: party }, summary: `${slots.length} free slots` },
      dishes: [],
      booking: { date: req.date, time: exact ? req.time : near[0], party, slots: near },
      text: !slots.length
        ? `Sorry, we're fully booked for ${party} on ${dateLabel}. Would another day work?`
        : exact
          ? `Good news — a table for **${party}** is available on **${dateLabel} at ${req.time}**. Tap the slot below to confirm your details.`
          : `For **${party}** on **${dateLabel}**${req.time ? ` around ${req.time}` : ""}, I can offer: **${near.join(", ")}**. Pick a time below to reserve.`,
    };
  }

  if (/\b(open|hours|close|closing|timing|when are you)\b/.test(t)) {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const lines = names.map((n, i) => `- **${n}**: ${RESTAURANT.hours[i] ? RESTAURANT.hours[i]!.join(" – ") : "closed"}`).join("\n");
    return { tool: { name: "get_restaurant_info", args: {}, summary: "opening hours" }, dishes: [], text: `Our opening hours:\n\n${lines}\n\nThe kitchen takes last orders 30 minutes before closing.` };
  }
  if (/\b(where|address|location|parking|directions)\b/.test(t)) {
    return { tool: { name: "get_restaurant_info", args: {}, summary: "location" }, dishes: [], text: `We're at **${RESTAURANT.address}**. Call us on ${RESTAURANT.phone}. Street parking is free after 6 pm.` };
  }

  const diet = parseDiet(message);
  let dishes = filterMenu(menu, diet);
  if (!dishes.length && diet.category) dishes = filterMenu(menu, { ...diet, category: undefined });
  dishes = [...dishes].sort((a, b) => Number(b.popular ?? false) - Number(a.popular ?? false) || b.price - a.price).slice(0, 4);
  const needs = [...(diet.tags ?? []), ...(diet.excludeAllergens ?? []).map((a) => `no ${a}`), diet.maxPrice ? `under $${diet.maxPrice}` : "", diet.mild ? "mild" : ""].filter(Boolean);
  const drink = menu.find((d) => d.category === "drinks" && (diet.tags ?? []).every((tag) => d.tags.includes(tag) || tag === "spicy"));
  return {
    tool: { name: "search_menu", args: { ...diet }, summary: `${dishes.length} dishes` },
    dishes,
    text: dishes.length
      ? `Here ${dishes.length === 1 ? "is a dish" : "are dishes"} I'd recommend${needs.length ? ` (${needs.join(", ")})` : ""}:\n\n${dishes.map(fmt).join("\n")}${drink && diet.category !== "drinks" ? `\n\nPair it with our **${drink.name}** ($${drink.price}).` : ""}\n\nAllergen info comes from our recipes, but please tell your server about severe allergies.`
      : "I couldn't find a dish matching all of those requirements. Our team can often adapt dishes — please mention it when you order.",
  };
}
