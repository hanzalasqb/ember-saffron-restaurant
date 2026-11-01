import { Router, type Response } from "express";
import { z } from "zod";
import { concierge, parseBooking } from "../../../shared/concierge";
import { RESTAURANT, filterMenu } from "../../../shared/menu";
import type { DB } from "../db/client";
import type { LLM } from "../lib/llm";
import { loadMenu } from "../services/menu";
import { availability, createReservation } from "../services/reservations";

const Body = z.object({ message: z.string().min(1).max(2000), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(16).default([]) });
const TOOLS = [
  { type: "function", function: { name: "search_menu", description: "Find dishes by dietary needs, allergens to avoid, category, max price or keywords.", parameters: { type: "object", properties: { query: { type: "string" }, tags: { type: "array", items: { type: "string", enum: ["vegetarian", "vegan", "gluten-free", "spicy", "halal", "chef-special"] } }, exclude_allergens: { type: "array", items: { type: "string", enum: ["dairy", "gluten", "nuts", "egg", "soy", "shellfish", "fish", "sesame"] } }, category: { type: "string", enum: ["starters", "mains", "desserts", "drinks"] }, max_price: { type: "number" } } } } },
  { type: "function", function: { name: "check_availability", description: "Free reservation times for a date (YYYY-MM-DD) and party size.", parameters: { type: "object", properties: { date: { type: "string" }, party_size: { type: "integer" } }, required: ["date", "party_size"] } } },
  { type: "function", function: { name: "create_reservation", description: "Book a table. Only call after the guest confirmed name, phone, date, time and party size.", parameters: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" }, date: { type: "string" }, time: { type: "string", description: "HH:MM" }, party_size: { type: "integer" }, notes: { type: "string" } }, required: ["name", "phone", "date", "time", "party_size"] } } },
  { type: "function", function: { name: "get_restaurant_info", description: "Opening hours, address and phone.", parameters: { type: "object", properties: {} } } },
];

export function conciergeRoutes(db: DB, llm: LLM) {
  const r = Router();
  r.post("/stream", async (req, res: Response) => {
    const body = Body.parse(req.body);
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    const menu = await loadMenu(db);
    try {
      if (!llm.enabled) {
        // pre-compute availability for the date the guest mentioned, then answer with the rule engine
        const wanted = parseBooking(body.message, new Date());
        const cache = new Map([[`${wanted.date}:${wanted.party ?? 2}`, await availability(db, wanted.date, wanted.party ?? 2)]]);
        const reply = concierge(body.message, menu, (date, party) => cache.get(`${date}:${party}`) ?? [], new Date());
        send("tool_call", { name: reply.tool.name, args: reply.tool.args });
        send("tool_result", { name: reply.tool.name, summary: reply.tool.summary });
        if (reply.dishes.length) send("dishes", { dishes: reply.dishes });
        if (reply.booking) send("booking", reply.booking);
        send("token", { text: reply.text });
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const messages: unknown[] = [{ role: "system", content: `You are the friendly concierge of ${RESTAURANT.name}. Today is ${today}. Recommend dishes using search_menu (always respect allergies and say staff should be told about severe allergies), check availability and make reservations. Confirm all booking details with the guest before calling create_reservation. Never invent dishes or times.` }, ...body.history, { role: "user", content: body.message }];
        for (let round = 0; round < 4; round++) {
          let calls: { id: string; name: string; arguments: string }[] = [];
          for await (const ev of llm.stream(messages, round < 3 ? TOOLS : undefined)) {
            if (ev.type === "token") send("token", { text: ev.text }); else calls = ev.calls;
          }
          if (!calls.length) break;
          messages.push({ role: "assistant", content: "", tool_calls: calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.arguments || "{}" } })) });
          for (const call of calls) {
            let args: Record<string, unknown> = {};
            try { args = JSON.parse(call.arguments || "{}"); } catch { /* ignore */ }
            send("tool_call", { name: call.name, args });
            let result: unknown;
            try {
              if (call.name === "search_menu") {
                const dishes = filterMenu(menu, { query: args.query as string, tags: args.tags as never, excludeAllergens: args.exclude_allergens as never, category: args.category as never, maxPrice: args.max_price as number }).slice(0, 6);
                send("dishes", { dishes });
                result = dishes.map(({ name, price, tags, allergens, description }) => ({ name, price, tags, allergens, description }));
              } else if (call.name === "check_availability") {
                const slots = (await availability(db, String(args.date), Number(args.party_size))).filter((s) => s.available).map((s) => s.time);
                send("booking", { date: args.date, party: args.party_size, slots: slots.slice(0, 6) });
                result = { date: args.date, free: slots };
              } else if (call.name === "create_reservation") {
                const booking = await createReservation(db, { name: String(args.name), phone: String(args.phone), date: String(args.date), time: String(args.time), partySize: Number(args.party_size), notes: args.notes as string | undefined });
                send("reservation", { code: booking.code, table: booking.table.label });
                result = { confirmed: true, code: booking.code, table: booking.table.label };
              } else result = { ...RESTAURANT };
            } catch (err) { result = { error: (err as Error).message }; }
            send("tool_result", { name: call.name, summary: JSON.stringify(result).slice(0, 120) });
            messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result).slice(0, 6000) });
          }
        }
      }
    } catch (err) {
      console.error(err);
      send("error", { message: "The concierge is unavailable right now." });
    }
    send("done", {});
    res.end();
  });
  return r;
}
