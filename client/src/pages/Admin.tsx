import { BarChart3, CalendarDays, ChefHat, DollarSign, Lightbulb, Receipt, Users } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { TABLES } from "../../../shared/menu";
import Nav from "../components/Nav";
import { Spinner } from "../components/ui";
import { api, token } from "../lib/client";
import type { Analytics, Order, OrderStatus, Reservation } from "../lib/types";
import { isoDate, money } from "../lib/util";

const COLUMNS: { status: OrderStatus; title: string; next?: OrderStatus; action?: string }[] = [
  { status: "received", title: "New", next: "preparing", action: "Start cooking" },
  { status: "preparing", title: "Cooking", next: "ready", action: "Mark ready" },
  { status: "ready", title: "Ready", next: "completed", action: "Hand over" },
  { status: "out_for_delivery", title: "Out for delivery", next: "completed", action: "Delivered" },
];
const QUAD_COLOR: Record<string, string> = { Star: "#f7b955", Plowhorse: "#60a5fa", Puzzle: "#a78bfa", Dog: "#f87171" };
const age = (iso: string) => `${Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))} min`;

function Kitchen() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    api.kitchen().then(setOrders);
    return api.watchKitchen((o) => setOrders((list) => {
      const rest = list.filter((x) => x.code !== o.code);
      return ["completed", "cancelled"].includes(o.status) ? rest : [o, ...rest];
    }));
  }, []);
  const advance = async (o: Order, next: OrderStatus) => { const u = await api.setOrderStatus(o.code, o.type !== "delivery" && next === "completed" ? "completed" : o.type === "delivery" && o.status === "ready" ? "out_for_delivery" : next); setOrders((l) => (["completed"].includes(u.status) ? l.filter((x) => x.code !== u.code) : l.map((x) => (x.code === u.code ? u : x)))); };
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((c) => {
        const list = orders.filter((o) => o.status === c.status);
        return (
          <div key={c.status} className="rounded-2xl bg-coal/60 p-3">
            <div className="mb-3 flex items-center justify-between px-1"><h3 className="font-semibold">{c.title}</h3><span className="chip bg-white/5">{list.length}</span></div>
            <div className="space-y-3">
              {list.map((o) => (
                <div key={o.code} className={`card p-4 ${c.status === "received" ? "border-saffron-400/40" : ""}`}>
                  <div className="flex items-center justify-between text-sm"><span className="font-mono font-semibold text-saffron-300">#{o.code}</span><span className="text-cream/50">{age(o.createdAt)}</span></div>
                  <div className="mt-1 text-xs text-cream/60">{o.customerName} · <span className="capitalize">{o.type.replace("_", " ")}</span></div>
                  <ul className="mt-2 space-y-0.5 text-sm">{o.items.map((i) => <li key={i.name}><strong>{i.quantity}×</strong> {i.name}</li>)}</ul>
                  {o.notes && <p className="mt-2 rounded-lg bg-ember-500/10 px-2 py-1 text-xs text-ember-500">⚠ {o.notes}</p>}
                  {c.next && <button onClick={() => advance(o, c.next!)} className="btn-primary mt-3 w-full py-1.5 text-xs">{c.action}</button>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Reservations() {
  const [date, setDate] = useState(isoDate(new Date()));
  const [list, setList] = useState<Reservation[]>([]);
  useEffect(() => { api.reservations(date).then(setList); }, [date]);
  const startHour = 12, endHour = 24, span = (endHour - startHour) * 60;
  const pos = (iso: string) => { const d = new Date(iso); return ((d.getHours() * 60 + d.getMinutes() - startHour * 60) / span) * 100; };
  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3"><input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} /><span className="text-sm text-cream/60">{list.length} bookings · {list.reduce((n, r) => n + r.partySize, 0)} covers</span></div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="ml-24 flex justify-between text-[11px] text-cream/40">{Array.from({ length: endHour - startHour + 1 }, (_, i) => <span key={i}>{(startHour + i) % 24}:00</span>)}</div>
          {TABLES.map((t) => (
            <div key={t.id} className="mt-2 flex items-center">
              <div className="w-24 shrink-0 text-xs text-cream/70"><strong>{t.label}</strong> · {t.capacity} seats<div className="text-[10px] text-cream/40">{t.zone}</div></div>
              <div className="relative h-10 flex-1 rounded-lg bg-white/[0.03]">
                {list.filter((r) => r.tableId === t.id && r.status !== "cancelled").map((r) => (
                  <div key={r.id} title={`${r.name} · ${r.partySize} guests`} className={`absolute top-1 bottom-1 overflow-hidden rounded-md px-2 py-0.5 text-[11px] leading-tight ${r.status === "seated" ? "bg-emerald-500/30 text-emerald-100" : "bg-saffron-400/30 text-saffron-100"}`} style={{ left: `${pos(r.startsAt)}%`, width: `${pos(r.endsAt) - pos(r.startsAt)}%` }}>
                    <div className="truncate font-semibold">{r.name}</div><div className="truncate opacity-80">{r.partySize}p · {new Date(r.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex gap-4 text-xs text-cream/60"><span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-saffron-400/40" />Confirmed</span><span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500/40" />Seated</span></div>
    </div>
  );
}

function Insights() {
  const [data, setData] = useState<Analytics | null>(null);
  useEffect(() => { api.analytics().then(setData); }, []);
  if (!data) return <Spinner className="h-6 w-6" />;
  const k = data.kpis;
  const points = data.matrix.items.map((i) => ({ ...i, pop: Math.round(i.popularity * 1000) / 10 }));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[[DollarSign, "Revenue (14d)", money(k.revenue)], [Receipt, "Orders", k.orders], [BarChart3, "Avg. ticket", money(k.avgTicket)], [Users, "Upcoming covers", `${k.upcomingCovers} · ${k.upcomingBookings} bookings`]].map(([I, l, v]) => {
          const Icon = I as typeof DollarSign;
          return <div key={l as string} className="card flex items-center gap-4 p-5"><div className="grid h-11 w-11 place-items-center rounded-xl bg-saffron-400/15 text-saffron-300"><Icon className="h-5 w-5" /></div><div><div className="text-xs uppercase tracking-wider text-cream/50">{l as string}</div><div className="text-xl font-semibold">{v as string}</div></div></div>;
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h3 className="font-semibold">Menu engineering matrix</h3>
          <p className="mb-3 text-xs text-cream/50">Popularity (share of dishes sold) vs. contribution margin per plate — Kasavana & Smith method</p>
          <div className="h-80"><ResponsiveContainer>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke="#2a241f" />
              <XAxis type="number" dataKey="pop" name="Popularity" unit="%" tick={{ fill: "#a8a29e", fontSize: 11 }} />
              <YAxis type="number" dataKey="margin" name="Margin" unit="$" tick={{ fill: "#a8a29e", fontSize: 11 }} width={45} />
              <ZAxis range={[90, 90]} />
              <ReferenceLine x={Math.round(data.matrix.popularityThreshold * 1000) / 10} stroke="#57534e" strokeDasharray="4 4" />
              <ReferenceLine y={Math.round(data.matrix.averageMargin * 100) / 100} stroke="#57534e" strokeDasharray="4 4" />
              <Tooltip contentStyle={{ background: "#1a1613", border: "1px solid #2a241f", borderRadius: 12, fontSize: 12 }} formatter={(v, n) => [v, n]} labelFormatter={() => ""} />
              <Scatter data={points}>
                {points.map((p) => <Cell key={p.slug} fill={QUAD_COLOR[p.quadrant]} />)}
                <LabelList dataKey="name" position="top" style={{ fill: "#d6d3d1", fontSize: 9 }} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer></div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">{Object.entries(QUAD_COLOR).map(([q, c]) => <span key={q} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{q}</span>)}</div>
        </div>
        <div className="card space-y-3 p-5 lg:col-span-2">
          <h3 className="flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-saffron-400" /> AI menu insights <span className="text-[10px] font-normal text-cream/40">{data.insightsEngine === "llm" ? "LLM" : "rule engine"}</span></h3>
          {data.insights.map((i) => <p key={i} className="rounded-xl bg-white/[0.04] p-3 text-sm leading-relaxed text-cream/85">{i}</p>)}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5"><h3 className="mb-3 font-semibold">Daily revenue</h3><div className="h-56"><ResponsiveContainer><BarChart data={data.daily}><CartesianGrid stroke="#2a241f" vertical={false} /><XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={{ fill: "#a8a29e", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#a8a29e", fontSize: 10 }} axisLine={false} tickLine={false} width={40} /><Tooltip contentStyle={{ background: "#1a1613", border: "1px solid #2a241f", borderRadius: 12 }} formatter={(v) => money(Number(v))} /><Bar dataKey="revenue" fill="#f7b955" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card p-5"><h3 className="mb-3 font-semibold">Best sellers</h3>{data.top.map((t, i) => <div key={t.slug} className="flex items-center gap-3 border-b border-white/5 py-2 text-sm last:border-0"><span className="w-5 text-cream/40">{i + 1}</span><span className="flex-1">{t.name}</span><span className="chip" style={{ background: `${QUAD_COLOR[t.quadrant]}26`, color: QUAD_COLOR[t.quadrant] }}>{t.quadrant}</span><span className="w-16 text-right text-cream/60">{t.sold} sold</span></div>)}</div>
      </div>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(api.demo || !!token.get());
  const [tab, setTab] = useState<"kitchen" | "reservations" | "insights">("kitchen");
  const [form, setForm] = useState({ email: "manager@ember-saffron.local", password: "" });
  const [error, setError] = useState<string | null>(null);
  const login = useCallback(async (e: FormEvent) => { e.preventDefault(); try { token.set((await api.login(form.email, form.password)).token); setAuthed(true); } catch (err) { setError((err as Error).message); } }, [form]);
  return (
    <div>
      <Nav />
      {!authed ? (
        <form onSubmit={login} className="card mx-auto mt-20 max-w-sm space-y-3 p-8">
          <h1 className="font-serif text-2xl font-semibold">Staff sign in</h1>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p className="text-sm text-ember-500">{error}</p>}
          <button className="btn-primary w-full">Sign in</button>
        </form>
      ) : (
        <div className="mx-auto max-w-7xl px-5 py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-serif text-3xl font-semibold">Restaurant operations</h1>
            <div className="flex rounded-full bg-coal p-1 text-sm">
              {([["kitchen", "Kitchen display", ChefHat], ["reservations", "Reservations", CalendarDays], ["insights", "AI insights", Lightbulb]] as const).map(([k, l, I]) => <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 ${tab === k ? "bg-saffron-400 text-night" : "text-cream/70"}`}><I className="h-4 w-4" />{l}</button>)}
            </div>
          </div>
          {tab === "kitchen" ? <Kitchen /> : tab === "reservations" ? <Reservations /> : <Insights />}
        </div>
      )}
    </div>
  );
}
