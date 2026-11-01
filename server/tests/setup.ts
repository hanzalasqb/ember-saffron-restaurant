import { createApp } from "../src/app";
import { createDatabase } from "../src/db/client";
import type { LLM, LLMEvent } from "../src/lib/llm";
import { seed } from "../src/services/seed";

export const noLLM: LLM = { enabled: false, json: async () => ({}), async *stream() {} };

export function fakeLLM(date: string): LLM {
  return {
    enabled: true,
    json: async () => ({ insights: ["Raise the burger price by $1.", "Promote the salmon."] }),
    async *stream(messages): AsyncIterable<LLMEvent> {
      const tools = messages.filter((m) => (m as { role: string }).role === "tool").length;
      if (tools === 0) yield { type: "tool_calls", calls: [{ id: "a", name: "search_menu", arguments: '{"tags":["vegan"],"exclude_allergens":["sesame"]}' }] };
      else if (tools === 1) yield { type: "tool_calls", calls: [{ id: "b", name: "create_reservation", arguments: JSON.stringify({ name: "Ayesha", phone: "+1 555 0199", date, time: "19:00", party_size: 4 }) }] };
      else yield { type: "token", text: "Booked!" };
    },
  };
}

export async function makeApp(llm: LLM = noLLM) {
  const { db, close } = await createDatabase("memory://");
  await seed(db);
  return { app: createApp(db, llm), db, close };
}

export const futureDate = (days = 10) => { const d = new Date(); d.setDate(d.getDate() + days); while (d.getDay() === 1) d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
