import { Flame, ShoppingBag } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useCart } from "../lib/cart";
import { api } from "../lib/client";

export default function Nav({ transparent = false }: { transparent?: boolean }) {
  const { count } = useCart();
  const link = ({ isActive }: { isActive: boolean }) => `text-sm tracking-wide transition ${isActive ? "text-saffron-300" : "text-cream/75 hover:text-cream"}`;
  return (
    <header className={`${transparent ? "absolute inset-x-0 top-0 z-30" : "sticky top-0 z-30 border-b border-white/[0.06] bg-night/90 backdrop-blur"}`}>
      {api.demo && <div className="bg-saffron-400 px-4 py-1 text-center text-[11px] font-medium text-night">Live demo of a fictional restaurant — orders, bookings and the AI concierge run in your browser.</div>}
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-saffron-400 to-ember-500 text-night"><Flame className="h-5 w-5" /></span>
          <span className="font-serif text-xl font-semibold">Ember <span className="text-saffron-400">&</span> Saffron</span>
        </Link>
        <nav className="ml-auto hidden items-center gap-7 md:flex">
          <NavLink to="/menu" className={link}>Menu & Order</NavLink>
          <NavLink to="/reserve" className={link}>Reservations</NavLink>
          <NavLink to="/admin" className={link}>Staff</NavLink>
        </nav>
        <Link to="/menu" className="relative grid h-10 w-10 place-items-center rounded-full border border-cream/20 md:ml-0 ml-auto">
          <ShoppingBag className="h-4.5 w-4.5" />
          {count > 0 && <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-saffron-400 px-1 text-[11px] font-bold text-night">{count}</span>}
        </Link>
        <Link to="/reserve" className="btn-primary hidden sm:inline-flex">Book a table</Link>
      </div>
    </header>
  );
}
