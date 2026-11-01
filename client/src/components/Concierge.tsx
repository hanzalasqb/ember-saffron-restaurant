import { CalendarCheck, ChefHat, MessageCircle, Plus, SendHorizontal, Wrench, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../lib/cart";
import { api } from "../lib/client";
import type { Dish, MenuItem } from "../lib/types";
import { money, to12h } from "../lib/util";
import Markdown from "./Markdown";
import { Photo, Spinner } from "./ui";

interface Msg { role: "user" | "assistant"; content: string; tools?: string[]; dishes?: Dish[]; booking?: { date: string; party: number; slots: string[] }; reservation?: { code: string; table: string } }
const SUGGESTIONS = ["Vegan dinner ideas, I'm allergic to sesame", "Table for 4 tomorrow at 8pm", "Something not spicy for kids", "What are your opening hours?"];

export default function Concierge() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const { add } = useCart();
  const navigate = useNavigate();
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "", tools: [] }]);
    setInput(""); setBusy(true);
    const patch = (fn: (m: Msg) => Msg) => setMessages((all) => [...all.slice(0, -1), fn(all[all.length - 1])]);
    try {
      await api.concierge(text, history, (e) => {
        if (e.type === "token") patch((m) => ({ ...m, content: m.content + e.text }));
        else if (e.type === "tool_call") patch((m) => ({ ...m, tools: [...(m.tools ?? []), e.name] }));
        else if (e.type === "dishes") patch((m) => ({ ...m, dishes: e.dishes }));
        else if (e.type === "booking") patch((m) => ({ ...m, booking: { date: e.date, party: e.party, slots: e.slots } }));
        else if (e.type === "reservation") patch((m) => ({ ...m, reservation: { code: e.code, table: e.table } }));
        else if (e.type === "error") patch((m) => ({ ...m, content: e.message }));
      });
    } catch (err) { patch((m) => ({ ...m, content: (err as Error).message })); } finally { setBusy(false); }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-saffron-400 to-ember-500 px-5 py-3.5 font-semibold text-night shadow-2xl shadow-ember-500/30 transition hover:scale-105">
      <MessageCircle className="h-5 w-5" /> AI Concierge
    </button>
  );
  return (
    <div className="fixed right-6 bottom-6 z-40 flex h-[600px] max-h-[calc(100vh-3rem)] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-coal shadow-2xl">
      <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-saffron-400/20 to-ember-500/10 px-5 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-saffron-400 text-night"><ChefHat className="h-5 w-5" /></div>
        <div className="flex-1"><div className="font-serif font-semibold">Concierge</div><div className="text-xs text-cream/60">Dietary advice · reservations · questions</div></div>
        <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-cream/70">Welcome! I can suggest dishes for any diet or allergy and check table availability for you.</p>
            {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="w-full rounded-xl border border-white/10 px-3 py-2 text-left text-sm text-cream/85 hover:border-saffron-400/60">{s}</button>)}
          </div>
        )}
        {messages.map((m, i) => m.role === "user" ? (
          <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-saffron-400 px-3.5 py-2 text-sm text-night">{m.content}</div>
        ) : (
          <div key={i} className="space-y-2">
            {m.tools?.map((t, j) => <span key={j} className="mr-1 inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-saffron-300"><Wrench className="h-3 w-3" />{t}</span>)}
            {m.dishes && m.dishes.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {m.dishes.map((d) => (
                  <div key={d.slug} className="w-36 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-night">
                    <Photo src={d.image} alt={d.name} className="h-20 w-full" />
                    <div className="p-2"><div className="line-clamp-1 text-xs font-medium">{d.name}</div>
                      <div className="mt-1 flex items-center justify-between"><span className="text-sm text-saffron-300">{money(d.price)}</span><button onClick={() => add(d as MenuItem)} className="grid h-6 w-6 place-items-center rounded-full bg-saffron-400 text-night"><Plus className="h-3.5 w-3.5" /></button></div></div>
                  </div>
                ))}
              </div>
            )}
            {m.content ? <div className="rounded-2xl rounded-bl-sm bg-white/[0.04] px-3.5 py-2"><Markdown>{m.content}</Markdown></div> : busy && i === messages.length - 1 && <Spinner className="h-4 w-4 text-cream/50" />}
            {m.booking && m.booking.slots.length > 0 && (
              <div className="flex flex-wrap gap-1.5">{m.booking.slots.map((t) => <button key={t} onClick={() => { setOpen(false); navigate(`/reserve?date=${m.booking!.date}&party=${m.booking!.party}&time=${t}`); }} className="chip border border-saffron-400/50 text-saffron-300 hover:bg-saffron-400 hover:text-night"><CalendarCheck className="h-3 w-3" />{to12h(t)}</button>)}</div>
            )}
            {m.reservation && <div className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">Booked ✓ code <strong className="font-mono">{m.reservation.code}</strong> · table {m.reservation.table}</div>}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-white/10 p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} className="input rounded-full" placeholder="Ask the concierge…" />
        <button disabled={busy || !input.trim()} className="btn-primary h-10 w-10 shrink-0 p-0"><SendHorizontal className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
