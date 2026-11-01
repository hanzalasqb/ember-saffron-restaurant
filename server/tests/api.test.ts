import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";
import { bus } from "../src/lib/events";
import { fakeLLM, futureDate, makeApp } from "./setup";

let ctx: Awaited<ReturnType<typeof makeApp>>;
let token = "";
beforeAll(async () => {
  ctx = await makeApp();
  await ctx.db.update(users).set({ passwordHash: await hashPassword("manager-pass-1") }).where(eq(users.role, "admin"));
  token = (await request(ctx.app).post("/api/auth/login").send({ email: "manager@ember-saffron.local", password: "manager-pass-1" })).body.token;
});
afterAll(async () => { await ctx.close(); });
const sse = (t: string) => t.trim().split("\n\n").map((b) => ({ event: b.split("\n")[0].slice(7), data: JSON.parse(b.split("\n")[1].slice(6)) }));

describe("menu & ordering", () => {
  it("serves the menu", async () => {
    const res = await request(ctx.app).get("/api/menu").expect(200);
    expect(res.body).toHaveLength(18);
  });
  it("places an order with server-side totals and notifies the kitchen", async () => {
    const events: unknown[] = [];
    const listener = (o: unknown) => events.push(o);
    bus.on("order", listener);
    const res = await request(ctx.app).post("/api/orders").send({ customerName: "Sara", phone: "+1 555 0123", type: "delivery", address: "5 River Road", items: [{ slug: "saffron-chicken-biryani", quantity: 1, price: 0.01 }] }).expect(201);
    bus.off("order", listener);
    expect(res.body).toMatchObject({ subtotal: 22, deliveryFee: 4.99, status: "received" });
    expect(events).toHaveLength(1);
    await request(ctx.app).patch(`/api/admin/orders/${res.body.code}`).set("Authorization", `Bearer ${token}`).send({ status: "preparing" }).expect(200);
    expect((await request(ctx.app).get(`/api/orders/${res.body.code}`).expect(200)).body.status).toBe("preparing");
    const kitchen = await request(ctx.app).get("/api/admin/kitchen").set("Authorization", `Bearer ${token}`).expect(200);
    expect(kitchen.body.some((o: { code: string }) => o.code === res.body.code)).toBe(true);
  });
  it("rejects delivery without address and unavailable dishes", async () => {
    await request(ctx.app).post("/api/orders").send({ customerName: "Sara", phone: "+1 555 0123", type: "delivery", items: [{ slug: "smash-burger", quantity: 1 }] }).expect(400);
    await request(ctx.app).patch("/api/admin/menu/smash-burger").set("Authorization", `Bearer ${token}`).send({ available: false }).expect(200);
    await request(ctx.app).post("/api/orders").send({ customerName: "Sara", phone: "+1 555 0123", type: "pickup", items: [{ slug: "smash-burger", quantity: 1 }] }).expect(409);
  });
});

describe("reservations", () => {
  it("books tables without double-booking", async () => {
    const date = futureDate();
    const slots = (await request(ctx.app).get("/api/availability").query({ date, party: 8 }).expect(200)).body;
    const free = slots.find((s: { available: boolean }) => s.available);
    const first = await request(ctx.app).post("/api/reservations").send({ name: "Big Party", phone: "+1 555 0177", date, time: free.time, partySize: 8 }).expect(201);
    expect(first.body.table.capacity).toBe(8);
    // the only 8-seat table is now taken at that time
    await request(ctx.app).post("/api/reservations").send({ name: "Another Party", phone: "+1 555 0178", date, time: free.time, partySize: 8 }).expect(409);
    const board = await request(ctx.app).get("/api/admin/reservations").query({ date }).set("Authorization", `Bearer ${token}`).expect(200);
    expect(board.body.some((r: { code: string }) => r.code === first.body.code)).toBe(true);
  });
});

describe("admin", () => {
  it("requires auth and returns menu engineering analytics", async () => {
    await request(ctx.app).get("/api/admin/analytics").expect(401);
    const res = await request(ctx.app).get("/api/admin/analytics").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.kpis.orders).toBeGreaterThan(100);
    expect(new Set(res.body.matrix.items.map((i: { quadrant: string }) => i.quadrant)).size).toBeGreaterThanOrEqual(3);
    expect(res.body.insights.length).toBeGreaterThan(1);
  });
});

describe("AI concierge", () => {
  it("answers with the rule engine without an API key", async () => {
    const res = await request(ctx.app).post("/api/concierge/stream").send({ message: "What vegan options do you have?" }).expect(200);
    const dishes = sse(res.text).find((e) => e.event === "dishes")!.data.dishes;
    expect(dishes.every((d: { tags: string[] }) => d.tags.includes("vegan"))).toBe(true);
  });
  it("runs the LLM tool loop and books a table", async () => {
    const date = futureDate(12);
    const withLLM = await makeApp(fakeLLM(date));
    const res = await request(withLLM.app).post("/api/concierge/stream").send({ message: "Vegan dinner for 4, no sesame, book 7pm" }).expect(200);
    const events = sse(res.text);
    expect(events.filter((e) => e.event === "tool_call").map((e) => e.data.name)).toEqual(["search_menu", "create_reservation"]);
    expect(events.find((e) => e.event === "dishes")!.data.dishes.every((d: { allergens: string[] }) => !d.allergens.includes("sesame"))).toBe(true);
    expect(events.find((e) => e.event === "reservation")!.data.code).toMatch(/^[0-9A-F]{6}$/);
    await withLLM.close();
  });
});
