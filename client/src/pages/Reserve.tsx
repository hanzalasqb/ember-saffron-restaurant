import { CalendarCheck, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import Nav from "../components/Nav";
import { Spinner } from "../components/ui";
import { api } from "../lib/client";
import type { Reservation, Slot } from "../lib/types";
import { isoDate, to12h } from "../lib/util";

export default function Reserve() {
  const [params] = useSearchParams();
  const days = Array.from({ length: 10 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });
  const [date, setDate] = useState(params.get("date") ?? isoDate(days[0]));
  const [party, setParty] = useState(Number(params.get("party") ?? 2));
  const [time, setTime] = useState<string | null>(params.get("time"));
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [done, setDone] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setSlots(null); api.availability(date, party).then(setSlots); }, [date, party]);

  async function submit(e: FormEvent) {
    e.preventDefault(); if (!time) return;
    setBusy(true); setError(null);
    try { setDone(await api.reserve({ name: form.name, phone: form.phone, email: form.email || undefined, notes: form.notes || undefined, date, time, partySize: party })); }
    catch (err) { setError((err as Error).message); api.availability(date, party).then(setSlots); } finally { setBusy(false); }
  }

  if (done) return (
    <div><Nav /><div className="mx-auto max-w-lg px-5 py-20 text-center">
      <CalendarCheck className="mx-auto h-14 w-14 text-saffron-400" />
      <h1 className="mt-4 font-serif text-4xl font-semibold">See you soon, {done.name.split(" ")[0]}!</h1>
      <div className="card mt-8 space-y-2 p-6 text-left text-sm">
        <div className="flex justify-between"><span className="text-cream/60">Booking code</span><span className="font-mono text-saffron-300">{done.code}</span></div>
        <div className="flex justify-between"><span className="text-cream/60">When</span><span>{new Date(done.startsAt).toLocaleString([], { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></div>
        <div className="flex justify-between"><span className="text-cream/60">Guests</span><span>{done.partySize}</span></div>
        {done.table && <div className="flex justify-between"><span className="text-cream/60">Table</span><span>{done.table.label} · {done.table.zone}</span></div>}
      </div>
    </div></div>
  );

  return (
    <div>
      <Nav />
      <div className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="font-serif text-4xl font-semibold">Reserve a table</h1>
        <p className="mt-2 text-cream/60">Live availability — we assign the best table for your party automatically.</p>
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => { const v = isoDate(d); return (
            <button key={v} onClick={() => { setDate(v); setTime(null); }} className={`min-w-[74px] rounded-2xl border px-3 py-2.5 text-center ${date === v ? "border-saffron-400 bg-saffron-400 text-night" : "border-white/10 hover:border-white/30"}`}>
              <div className="text-[11px] uppercase">{d.toLocaleDateString([], { weekday: "short" })}</div><div className="font-serif text-xl font-semibold">{d.getDate()}</div><div className="text-[11px]">{d.toLocaleDateString([], { month: "short" })}</div>
            </button>); })}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Users className="h-4 w-4 text-cream/60" />{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <button key={n} onClick={() => { setParty(n); setTime(null); }} className={`h-9 w-9 rounded-full text-sm ${party === n ? "bg-saffron-400 text-night" : "bg-white/5 hover:bg-white/10"}`}>{n}</button>)}
          <span className="text-sm text-cream/50">guests</span>
        </div>
        <div className="mt-6">
          {!slots ? <Spinner /> : slots.length === 0 ? <p className="text-cream/60">We're closed on this day. Please choose another date.</p> : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {slots.map((s) => <button key={s.time} disabled={!s.available} onClick={() => setTime(s.time)} className={`rounded-xl border py-2.5 text-sm ${time === s.time ? "border-saffron-400 bg-saffron-400 text-night" : s.available ? "border-white/15 hover:border-saffron-400" : "cursor-not-allowed border-white/5 text-cream/25 line-through"}`}>{to12h(s.time)}</button>)}
            </div>
          )}
        </div>
        {time && (
          <form onSubmit={submit} className="card mt-8 grid gap-3 p-6 sm:grid-cols-2">
            <div className="text-sm text-cream/70 sm:col-span-2">Booking for <strong className="text-saffron-300">{party} {party === 1 ? "guest" : "guests"}</strong> on <strong className="text-saffron-300">{new Date(`${date}T12:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} at {to12h(time)}</strong></div>
            <input className="input" placeholder="Full name" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Phone" required minLength={6} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="input" type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input" placeholder="Occasion or requests (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            {error && <p className="text-sm text-ember-500 sm:col-span-2">{error}</p>}
            <button disabled={busy} className="btn-primary py-3 sm:col-span-2">{busy ? <Spinner /> : <CalendarCheck className="h-4 w-4" />} Confirm reservation</button>
          </form>
        )}
      </div>
    </div>
  );
}
