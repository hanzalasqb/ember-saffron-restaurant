import { CalendarDays, Clock, MapPin, Phone, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RESTAURANT } from "../../../shared/menu";
import Nav from "../components/Nav";
import { DietTags, Photo } from "../components/ui";
import { useCart } from "../lib/cart";
import { api } from "../lib/client";
import type { MenuItem } from "../lib/types";
import { money } from "../lib/util";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Home() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const { add } = useCart();
  useEffect(() => { api.menu().then(setMenu); }, []);
  const signature = menu.filter((m) => m.popular && m.category !== "drinks").slice(0, 6);

  return (
    <div>
      <section className="relative h-[92vh] min-h-[620px] overflow-hidden">
        <Photo src="images/ambience/hero.jpg" alt="Ember & Saffron dining room" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-night/70 via-night/55 to-night" />
        <Nav transparent />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-5">
          <p className="text-sm uppercase tracking-[0.35em] text-saffron-300">Modern grill & spice kitchen</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-tight font-semibold md:text-7xl">Fire-kissed flavours, <em className="text-saffron-400">saffron</em> soul.</h1>
          <p className="mt-6 max-w-xl text-lg text-cream/80">Charcoal grills, wood-fired breads and slow-cooked biryanis — made fresh every evening. Order online, book a table, or ask our AI concierge what suits your diet.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/reserve" className="btn-primary px-7 py-3.5 text-base"><CalendarDays className="h-5 w-5" /> Reserve a table</Link>
            <Link to="/menu" className="btn-outline px-7 py-3.5 text-base"><ShoppingBag className="h-5 w-5" /> Order online</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div><p className="text-sm uppercase tracking-[0.3em] text-saffron-400">Signature dishes</p><h2 className="mt-2 font-serif text-4xl font-semibold">Guest favourites</h2></div>
          <Link to="/menu" className="text-sm text-saffron-300 hover:underline">Full menu →</Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {signature.map((d) => (
            <div key={d.slug} className="group card overflow-hidden">
              <div className="overflow-hidden"><Photo src={d.image} alt={d.name} className="h-56 w-full transition duration-700 group-hover:scale-105" /></div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3"><h3 className="font-serif text-xl font-semibold">{d.name}</h3><span className="text-lg text-saffron-300">{money(d.price)}</span></div>
                <p className="mt-2 text-sm text-cream/65">{d.description}</p>
                <div className="mt-4 flex items-center justify-between"><DietTags dish={d} /><button onClick={() => add(d)} className="btn-outline px-3 py-1.5 text-xs">Add to order</button></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-coal">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2">
          <Photo src="images/ambience/grill.jpg" alt="Food cooking over glowing charcoal" className="h-[460px] w-full rounded-3xl" />
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-saffron-400">Our story</p>
            <h2 className="mt-2 font-serif text-4xl font-semibold">Where the grill meets the spice route</h2>
            <p className="mt-5 leading-relaxed text-cream/75">We cook over charcoal and wood, grind our spice blends in-house and bake breads to order in a 450 °C oven. The menu travels from Lahore's biryani houses to Neapolitan pizzerias — honest food with big flavour.</p>
            <p className="mt-4 leading-relaxed text-cream/75">Every dish is labelled for diets and allergens, and our AI concierge can help you find something that fits your needs in seconds.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[["18", "dishes on the menu"], ["450°", "wood-fired oven"], ["8", "tables · 32 seats"]].map(([n, l]) => <div key={l}><div className="font-serif text-3xl text-saffron-300">{n}</div><div className="text-sm text-cream/60">{l}</div></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-20 md:grid-cols-3">
        <div className="card p-6"><Clock className="h-6 w-6 text-saffron-400" /><h3 className="mt-3 font-serif text-xl font-semibold">Opening hours</h3>
          <ul className="mt-3 space-y-1 text-sm text-cream/70">{DAYS.map((d, i) => <li key={d} className="flex justify-between"><span>{d}</span><span>{RESTAURANT.hours[i]?.join(" – ") ?? "Closed"}</span></li>)}</ul></div>
        <div className="card p-6"><MapPin className="h-6 w-6 text-saffron-400" /><h3 className="mt-3 font-serif text-xl font-semibold">Find us</h3><p className="mt-3 text-sm text-cream/70">{RESTAURANT.address}</p><p className="mt-2 text-sm text-cream/70">Free street parking after 6 pm.</p></div>
        <div className="card p-6"><Phone className="h-6 w-6 text-saffron-400" /><h3 className="mt-3 font-serif text-xl font-semibold">Get in touch</h3><p className="mt-3 text-sm text-cream/70">{RESTAURANT.phone}</p><p className="text-sm text-cream/70">{RESTAURANT.email}</p><Link to="/reserve" className="btn-primary mt-5">Reserve now</Link></div>
      </section>
    </div>
  );
}
