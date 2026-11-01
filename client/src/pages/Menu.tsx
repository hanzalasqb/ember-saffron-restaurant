import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES, filterMenu, type Allergen, type Diet } from "../../../shared/menu";
import { orderTotals } from "../../../shared/pricing";
import Nav from "../components/Nav";
import { DietTags, Photo, Spinner } from "../components/ui";
import { useCart } from "../lib/cart";
import { api } from "../lib/client";
import type { MenuItem, OrderType } from "../lib/types";
import { money } from "../lib/util";

const DIETS: Diet[] = ["vegetarian", "vegan", "gluten-free", "spicy"];
const ALLERGENS: Allergen[] = ["dairy", "gluten", "nuts", "egg", "soy", "shellfish", "fish", "sesame"];

export default function Menu() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [diets, setDiets] = useState<Diet[]>([]);
  const [avoid, setAvoid] = useState<Allergen[]>([]);
  const [type, setType] = useState<OrderType>("pickup");
  const [form, setForm] = useState({ customerName: "", phone: "", address: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lines, add, setQty, clear, count } = useCart();
  const navigate = useNavigate();
  useEffect(() => { api.menu().then(setMenu); }, []);
  const visible = useMemo(() => filterMenu(menu, { category: category === "all" ? undefined : (category as never), tags: diets, excludeAllergens: avoid }), [menu, category, diets, avoid]);
  const totals = orderTotals(lines.map((l) => ({ price: l.item.price, quantity: l.quantity })), type);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function placeOrder(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const o = await api.placeOrder({ ...form, type, address: type === "delivery" ? form.address : undefined, items: lines.map((l) => ({ slug: l.item.slug, quantity: l.quantity })) });
      clear(); navigate(`/order/${o.code}`);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <div>
      <Nav />
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="font-serif text-4xl font-semibold">Menu</h1>
          <p className="mt-2 text-cream/60">Filter by diet or allergy — every dish is labelled from our recipes.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[{ slug: "all", name: "All" }, ...CATEGORIES].map((c) => <button key={c.slug} onClick={() => setCategory(c.slug)} className={`rounded-full px-4 py-1.5 text-sm ${category === c.slug ? "bg-saffron-400 text-night" : "bg-white/5 text-cream/80 hover:bg-white/10"}`}>{c.name}</button>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-cream/50">Diet:</span>
            {DIETS.map((d) => <button key={d} onClick={() => setDiets(toggle(diets, d))} className={`chip border ${diets.includes(d) ? "border-saffron-400 bg-saffron-400/15 text-saffron-300" : "border-white/10 text-cream/70"}`}>{d}</button>)}
            <span className="ml-3 text-cream/50">Avoid:</span>
            {ALLERGENS.map((a) => <button key={a} onClick={() => setAvoid(toggle(avoid, a))} className={`chip border ${avoid.includes(a) ? "border-ember-500 bg-ember-500/15 text-ember-500" : "border-white/10 text-cream/70"}`}>{a}</button>)}
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {visible.length === 0 && <p className="text-cream/60">No dishes match these filters — our kitchen can often adapt dishes, just ask.</p>}
            {visible.map((d) => (
              <div key={d.slug} className="card flex gap-4 p-3">
                <Photo src={d.image} alt={d.name} className="h-28 w-28 shrink-0 rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2"><h3 className="font-serif text-lg leading-tight font-semibold">{d.name}</h3><span className="text-saffron-300">{money(d.price)}</span></div>
                  <p className="mt-1 line-clamp-2 text-xs text-cream/60">{d.description}</p>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                    <div><DietTags dish={d} /><div className="mt-1 text-[11px] text-cream/40">{d.calories} kcal{d.allergens.length ? ` · contains ${d.allergens.join(", ")}` : ""}</div></div>
                    <button onClick={() => add(d)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-saffron-400 text-night hover:bg-saffron-300"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold"><ShoppingBag className="h-5 w-5 text-saffron-400" /> Your order {count > 0 && <span className="text-sm text-cream/50">({count})</span>}</h2>
          {lines.length === 0 ? <p className="mt-4 text-sm text-cream/60">Add dishes to start an order.</p> : (
            <form onSubmit={placeOrder} className="mt-4 space-y-4">
              <div className="space-y-3">
                {lines.map((l) => (
                  <div key={l.item.slug} className="flex items-center gap-3 text-sm">
                    <div className="flex-1"><div>{l.item.name}</div><div className="text-cream/50">{money(l.item.price)}</div></div>
                    <div className="flex items-center rounded-full border border-white/10"><button type="button" className="p-1.5" onClick={() => setQty(l.item.slug, l.quantity - 1)}><Minus className="h-3 w-3" /></button><span className="w-5 text-center">{l.quantity}</span><button type="button" className="p-1.5" onClick={() => setQty(l.item.slug, l.quantity + 1)}><Plus className="h-3 w-3" /></button></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-full bg-night p-1 text-xs">
                {([["pickup", "Pickup"], ["delivery", "Delivery"], ["dine_in", "Dine-in"]] as const).map(([v, l]) => <button type="button" key={v} onClick={() => setType(v)} className={`rounded-full py-1.5 ${type === v ? "bg-saffron-400 text-night" : "text-cream/70"}`}>{l}</button>)}
              </div>
              <input className="input" placeholder="Name" required minLength={2} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              <input className="input" placeholder="Phone" required minLength={6} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {type === "delivery" && <input className="input" placeholder="Delivery address" required minLength={5} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />}
              <input className="input" placeholder="Notes (allergies, extra spicy…)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="space-y-1 border-t border-white/10 pt-3 text-sm text-cream/70">
                <div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
                {type === "delivery" && <div className="flex justify-between"><span>Delivery</span><span>{totals.deliveryFee ? money(totals.deliveryFee) : "Free"}</span></div>}
                <div className="flex justify-between"><span>Tax</span><span>{money(totals.tax)}</span></div>
                <div className="flex justify-between pt-1 text-base font-semibold text-cream"><span>Total</span><span>{money(totals.total)}</span></div>
              </div>
              {error && <p className="text-sm text-ember-500">{error}</p>}
              <button disabled={busy} className="btn-primary w-full py-3">{busy ? <Spinner /> : null} Place order · {money(totals.total)}</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
