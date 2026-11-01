import { describe, expect, it } from "vitest";
import { concierge, parseBooking } from "../../shared/concierge";
import { MENU, TABLES, filterMenu, itemImage, parseDiet } from "../../shared/menu";
import { menuEngineering } from "../../shared/menuEngineering";
import { orderTotals } from "../../shared/pricing";
import { at, bestTable, slotsFor } from "../../shared/reservations";

const menu = MENU.map((m) => ({ ...m, image: itemImage(m.slug) }));

describe("dietary understanding", () => {
  it("parses diets, allergens and budget", () => {
    expect(parseDiet("something vegan with no sesame under $20")).toMatchObject({ tags: ["vegan"], excludeAllergens: ["sesame"], maxPrice: 20 });
    expect(parseDiet("I'm allergic to nuts and want a dessert")).toMatchObject({ excludeAllergens: ["nuts"], category: "desserts" });
    const safe = filterMenu(menu, parseDiet("gluten-free dinner without dairy"));
    expect(safe.length).toBeGreaterThan(0);
    expect(safe.every((m) => m.tags.includes("gluten-free") && !m.allergens.includes("dairy"))).toBe(true);
  });
});

describe("reservations", () => {
  it("assigns the smallest table that fits and avoids overlaps", () => {
    const start = new Date(2030, 0, 4, 19, 0), end = new Date(2030, 0, 4, 20, 30);
    expect(bestTable(TABLES, [], 2, start, end)?.capacity).toBe(2);
    const busy = [1, 2, 3].map((id) => ({ tableId: id, start, end }));
    expect(bestTable(TABLES, busy, 2, start, end)?.capacity).toBe(4);
  });
  it("generates slots within opening hours", () => {
    const date = "2030-01-04"; // Friday 12:00-23:30
    const slots = slotsFor(date, 2, TABLES, [], new Date(2029, 0, 1));
    expect(slots[0].time).toBe("12:00");
    expect(slots.every((s) => s.available)).toBe(true);
    expect(slotsFor("2030-01-07", 9, TABLES, [], new Date(2029, 0, 1))).toEqual([]); // too large a party
    expect(at(date, "19:30").getHours()).toBe(19);
  });
  it("parses booking requests", () => {
    const today = new Date(2030, 0, 1); // Tuesday
    expect(parseBooking("table for 4 tomorrow at 8pm", today)).toEqual({ date: "2030-01-02", time: "20:00", party: 4 });
    expect(parseBooking("can we book for two on friday at 7:30 pm", today)).toMatchObject({ date: "2030-01-04", time: "19:30", party: 2 });
  });
});

describe("menu engineering & pricing", () => {
  it("classifies items into quadrants", () => {
    const m = menuEngineering([
      { slug: "a", name: "A", price: 20, foodCost: 5, sold: 100 }, { slug: "b", name: "B", price: 10, foodCost: 6, sold: 90 },
      { slug: "c", name: "C", price: 30, foodCost: 8, sold: 5 }, { slug: "d", name: "D", price: 8, foodCost: 6, sold: 4 },
    ]);
    expect(m.items.map((i) => i.quadrant)).toEqual(["Star", "Plowhorse", "Puzzle", "Dog"]);
  });
  it("adds delivery fee below the threshold", () => {
    expect(orderTotals([{ price: 20, quantity: 1 }], "delivery")).toMatchObject({ deliveryFee: 4.99, tax: 1.6, total: 26.59 });
    expect(orderTotals([{ price: 50, quantity: 1 }], "delivery").deliveryFee).toBe(0);
  });
});

describe("rule-based concierge", () => {
  it("recommends safe dishes and checks availability", () => {
    const reply = concierge("vegan dinner, I'm allergic to sesame", menu, () => []);
    expect(reply.dishes.every((d) => d.tags.includes("vegan") && !d.allergens.includes("sesame"))).toBe(true);
    const booking = concierge("book a table for 2 tomorrow at 8pm", menu, () => [{ time: "20:00", available: true }, { time: "20:30", available: true }], new Date(2030, 0, 1));
    expect(booking.booking).toMatchObject({ date: "2030-01-02", time: "20:00", party: 2 });
  });
});
