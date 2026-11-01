// Browser-only restaurant for the GitHub Pages demo. Uses the same shared logic as the API:
// menu filters, slot generation + table assignment, pricing, menu engineering and the concierge rules.
import { concierge } from "../../../shared/concierge";
import { MENU, TABLES, itemImage } from "../../../shared/menu";
import { insightsFromMatrix, menuEngineering } from "../../../shared/menuEngineering";
import { orderTotals } from "../../../shared/pricing";
import { at, bestTable, diningMinutes, slotsFor, type Booking } from "../../../shared/reservations";
import type { Api } from "../lib/api";
import type { MenuItem, Order, OrderStatus, Reservation } from "../lib/types";

function prng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = prng(7);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const code = () => Math.random().toString(16).slice(2, 8).toUpperCase();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const menu: MenuItem[] = MENU.map((m, i) => ({ id: i + 1, slug: m.slug, name: m.name, category: m.category, price: m.price, description: m.description, tags: m.tags, allergens: m.allergens, spice: m.spice, calories: m.calories, image: itemImage(m.slug), popular: m.popular, available: true }));
const cost = Object.fromEntries(MENU.map((m) => [m.slug, m.foodCost]));
const WEIGHT: Record<string, number> = { "saffron-chicken-biryani": 10, "smash-burger": 9, "wood-fired-margherita": 8, "chicken-tikka-masala": 7, "mint-lime-cooler": 9, "burrata-caprese": 6, "lamb-samosas": 7, "molten-chocolate-cake": 6, "ember-ribeye": 3, "charred-salmon": 2.5, "truffle-risotto": 2, "falafel-mezze": 3, "crispy-calamari": 4, "wild-mushroom-soup": 1.5, "classic-tiramisu": 3, "strawberry-panna-cotta": 1.2, "citrus-spritz": 3, "iced-spanish-latte": 4 };
const pick = () => { let r = rand() * menu.reduce((n, m) => n + WEIGHT[m.slug], 0); for (const m of menu) { r -= WEIGHT[m.slug]; if (r <= 0) return m; } return menu[0]; };

let nextId = 1;
const orders: Order[] = [];
function makeOrder(created: Date, status: OrderStatus, name = "Demo Guest"): Order {
  const dishes = [...new Map(Array.from({ length: 1 + Math.floor(rand() * 4) }, pick).map((m) => [m.slug, m])).values()]; // one line per dish
  const lines = dishes.map((m) => ({ name: m.name, unitPrice: m.price, quantity: 1 + (rand() < 0.2 ? 1 : 0), slug: m.slug }));
  const type = (["pickup", "delivery", "dine_in"] as const)[Math.floor(rand() * 3)];
  return { id: nextId++, code: code(), customerName: name, phone: "+1 555 0100", type, address: type === "delivery" ? "Riverside District" : null, status, ...orderTotals(lines.map((l) => ({ price: l.unitPrice, quantity: l.quantity })), type), createdAt: created.toISOString(), items: lines };
}
for (let day = 14; day >= 1; day--) for (let k = 0, n = 14 + Math.floor(rand() * 12); k < n; k++) {
  const d = new Date(); d.setDate(d.getDate() - day); d.setHours(12 + Math.floor(rand() * 10), Math.floor(rand() * 60));
  orders.push(makeOrder(d, "completed"));
}
const GUESTS = ["Aisha", "Omar", "Lena", "Marco", "Priya", "Daniel", "Sofia", "Hamza", "Noor", "Ethan"];
const statuses: OrderStatus[] = ["received", "received", "preparing", "preparing", "ready", "out_for_delivery"];
statuses.forEach((s, i) => orders.push(makeOrder(new Date(Date.now() - (i + 1) * 4 * 60_000), s, GUESTS[i])));

const reservations: Reservation[] = [];
const bookings = (): Booking[] => reservations.filter((r) => ["confirmed", "seated"].includes(r.status)).map((r) => ({ tableId: r.tableId, start: new Date(r.startsAt), end: new Date(r.endsAt) }));
for (let d = 0; d < 7; d++) {
  const day = new Date(); day.setDate(day.getDate() + d);
  for (let k = 0; k < 7 + Math.floor(rand() * 5); k++) {
    const party = [2, 2, 2, 3, 4, 4, 5, 6][Math.floor(rand() * 8)];
    const free = slotsFor(iso(day), party, TABLES, bookings(), new Date(0)).filter((s) => s.available && s.time >= "18:00");
    if (!free.length) continue;
    const slot = free[Math.floor(rand() * free.length)], start = at(iso(day), slot.time), end = new Date(start.getTime() + diningMinutes(party) * 60_000);
    const table = bestTable(TABLES, bookings(), party, start, end)!;
    reservations.push({ id: reservations.length + 1, code: code(), name: `${GUESTS[k % GUESTS.length]} ${String.fromCharCode(65 + k)}.`, phone: "+1 555 0101", partySize: party, startsAt: start.toISOString(), endsAt: end.toISOString(), tableId: table.id, status: d === 0 && slot.time < "19:00" ? "seated" : "confirmed", table });
  }
}

const kitchenListeners = new Set<(o: Order) => void>();
const orderListeners = new Map<string, Set<(s: OrderStatus) => void>>();
function publish(o: Order) {
  kitchenListeners.forEach((l) => l(o));
  orderListeners.get(o.code)?.forEach((l) => l(o.status));
}
// a new online order arrives every ~25 s so the kitchen display feels alive
setInterval(() => { const o = makeOrder(new Date(), "received", GUESTS[Math.floor(rand() * GUESTS.length)]); orders.push(o); publish(o); }, 25_000);

const availability = (date: string, party: number) => slotsFor(date, party, TABLES, bookings());

export const demoApi: Api = {
  demo: true,
  menu: async () => menu.filter((m) => m.available),
  quote: async (type, items) => orderTotals(items.map((i) => ({ price: menu.find((m) => m.slug === i.slug)?.price ?? 0, quantity: i.quantity })), type),
  placeOrder: async (input) => {
    await wait(600);
    if (input.type === "delivery" && (input.address?.length ?? 0) < 5) throw new Error("Delivery address is required");
    const items = input.items.map((i) => { const m = menu.find((x) => x.slug === i.slug)!; return { name: m.name, unitPrice: m.price, quantity: i.quantity }; });
    const o: Order = { id: nextId++, code: code(), customerName: input.customerName, phone: input.phone, type: input.type, address: input.address, notes: input.notes, status: "received", ...orderTotals(items.map((i) => ({ price: i.unitPrice, quantity: i.quantity })), input.type), createdAt: new Date().toISOString(), items };
    orders.push(o);
    publish(o);
    // simulate the kitchen working on the guest's order
    const flow: OrderStatus[] = input.type === "delivery" ? ["preparing", "ready", "out_for_delivery", "completed"] : ["preparing", "ready", "completed"];
    flow.forEach((s, i) => setTimeout(() => { o.status = s; publish(o); }, (i + 1) * 9000));
    return o;
  },
  order: async (c) => { const o = orders.find((x) => x.code === c.toUpperCase()); if (!o) throw new Error("Order not found"); return o; },
  watchOrder: (c, fn) => { const set = orderListeners.get(c) ?? new Set(); set.add(fn); orderListeners.set(c, set); return () => set.delete(fn); },
  availability: async (date, party) => availability(date, party),
  reserve: async (input) => {
    await wait(600);
    const start = at(input.date, input.time), end = new Date(start.getTime() + diningMinutes(input.partySize) * 60_000);
    const table = bestTable(TABLES, bookings(), input.partySize, start, end);
    if (!table) throw new Error("Sorry, that time was just booked. Please pick another slot.");
    const r: Reservation = { id: reservations.length + 1, code: code(), name: input.name, phone: input.phone, partySize: input.partySize, startsAt: start.toISOString(), endsAt: end.toISOString(), tableId: table.id, status: "confirmed", notes: input.notes, table };
    reservations.push(r);
    return r;
  },
  login: async () => ({ token: "demo" }),
  kitchen: async () => orders.filter((o) => ["received", "preparing", "ready", "out_for_delivery"].includes(o.status)).reverse(),
  watchKitchen: (fn) => { kitchenListeners.add(fn); return () => kitchenListeners.delete(fn); },
  setOrderStatus: async (c, status) => { const o = orders.find((x) => x.code === c)!; o.status = status; publish(o); return o; },
  reservations: async (date) => reservations.filter((r) => iso(new Date(r.startsAt)) === date).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  setReservationStatus: async (id, status) => { const r = reservations.find((x) => x.id === id)!; r.status = status; return r; },
  analytics: async () => {
    const since = Date.now() - 14 * 86_400_000, recent = orders.filter((o) => +new Date(o.createdAt) >= since);
    const daily = new Map<string, { revenue: number; orders: number }>(), byType = new Map<string, { orders: number; revenue: number }>(), sold = new Map<string, number>();
    for (const o of recent) {
      const d = iso(new Date(o.createdAt)), v = daily.get(d) ?? { revenue: 0, orders: 0 }; v.revenue += o.total; v.orders++; daily.set(d, v);
      const t = byType.get(o.type) ?? { orders: 0, revenue: 0 }; t.orders++; t.revenue += o.total; byType.set(o.type, t);
      o.items.forEach((i) => sold.set(i.name, (sold.get(i.name) ?? 0) + i.quantity));
    }
    const matrix = menuEngineering(menu.filter((m) => m.category !== "drinks").map((m) => ({ slug: m.slug, name: m.name, price: m.price, foodCost: cost[m.slug], sold: sold.get(m.name) ?? 0 })));
    const revenue = recent.reduce((n, o) => n + o.total, 0), upcoming = reservations.filter((r) => new Date(r.startsAt) > new Date());
    return {
      kpis: { revenue: Math.round(revenue), orders: recent.length, avgTicket: Math.round((revenue / recent.length) * 100) / 100, upcomingCovers: upcoming.reduce((n, r) => n + r.partySize, 0), upcomingBookings: upcoming.length },
      daily: [...daily.entries()].sort().map(([day, v]) => ({ day, revenue: Math.round(v.revenue), orders: v.orders })),
      byType: [...byType.entries()].map(([type, v]) => ({ type, orders: v.orders, revenue: Math.round(v.revenue) })),
      top: [...matrix.items].sort((a, b) => b.sold - a.sold).slice(0, 5), matrix, insights: insightsFromMatrix(matrix), insightsEngine: "rules",
    };
  },
  async concierge(message, _history, onEvent) {
    const reply = concierge(message, menu, availability, new Date());
    onEvent({ type: "tool_call", name: reply.tool.name, args: reply.tool.args });
    await wait(500);
    onEvent({ type: "tool_result", name: reply.tool.name, summary: reply.tool.summary });
    if (reply.dishes.length) onEvent({ type: "dishes", dishes: reply.dishes });
    if (reply.booking) onEvent({ type: "booking", ...reply.booking });
    for (const chunk of reply.text.match(/\S+\s*|\s+/g) ?? []) { onEvent({ type: "token", text: chunk }); await wait(12); }
    onEvent({ type: "done" });
  },
};
