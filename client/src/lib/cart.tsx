import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MenuItem } from "./types";

interface Line { item: MenuItem; quantity: number }
interface Cart { lines: Line[]; add: (item: MenuItem) => void; setQty: (slug: string, q: number) => void; clear: () => void; count: number; subtotal: number }
const Ctx = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>(() => { try { return JSON.parse(localStorage.getItem("ember.cart") ?? "[]"); } catch { return []; } });
  useEffect(() => { try { localStorage.setItem("ember.cart", JSON.stringify(lines)); } catch { /* ignore */ } }, [lines]);
  const value = useMemo<Cart>(() => ({
    lines,
    add: (item) => setLines((l) => l.some((x) => x.item.slug === item.slug) ? l.map((x) => (x.item.slug === item.slug ? { ...x, quantity: x.quantity + 1 } : x)) : [...l, { item, quantity: 1 }]),
    setQty: (slug, q) => setLines((l) => (q <= 0 ? l.filter((x) => x.item.slug !== slug) : l.map((x) => (x.item.slug === slug ? { ...x, quantity: q } : x)))),
    clear: () => setLines([]),
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.quantity * l.item.price, 0),
  }), [lines]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useCart() { const c = useContext(Ctx); if (!c) throw new Error("no cart"); return c; }
