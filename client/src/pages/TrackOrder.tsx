import { Bike, Check, ChefHat, CookingPot, PackageCheck, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Nav from "../components/Nav";
import { Spinner } from "../components/ui";
import { api } from "../lib/client";
import type { Order, OrderStatus } from "../lib/types";
import { money } from "../lib/util";

export default function TrackOrder() {
  const { code = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.order(code).then(setOrder).catch((e) => setError(e.message));
    return api.watchOrder(code, (status: OrderStatus) => setOrder((o) => (o ? { ...o, status } : o)));
  }, [code]);
  const steps = [["received", "Order received", Receipt], ["preparing", "In the kitchen", CookingPot], ["ready", order?.type === "delivery" ? "Packed" : "Ready for pickup", ChefHat],
    ...(order?.type === "delivery" ? [["out_for_delivery", "On the way", Bike]] : []), ["completed", "Enjoy your meal", PackageCheck]] as [OrderStatus, string, typeof Receipt][];
  const current = order ? steps.findIndex(([s]) => s === order.status) : -1;

  return (
    <div>
      <Nav />
      <div className="mx-auto max-w-2xl px-5 py-14">
        {error && <p className="text-center text-ember-500">{error}</p>}
        {!order && !error && <div className="grid place-items-center"><Spinner className="h-6 w-6" /></div>}
        {order && (
          <>
            <p className="text-center text-sm uppercase tracking-[0.3em] text-saffron-400">Order {order.code}</p>
            <h1 className="mt-2 text-center font-serif text-4xl font-semibold">Thank you, {order.customerName.split(" ")[0]}!</h1>
            <p className="mt-2 text-center text-cream/60">This page updates live as the kitchen works on your order.</p>
            <div className="card mt-10 p-6">
              {steps.map(([s, label, Icon], i) => (
                <div key={s} className="flex items-center gap-4 py-2.5">
                  <div className={`grid h-10 w-10 place-items-center rounded-full ${i < current ? "bg-emerald-500/20 text-emerald-300" : i === current ? "bg-saffron-400 text-night ring-4 ring-saffron-400/20" : "bg-white/5 text-cream/30"}`}>{i < current ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</div>
                  <div className={i <= current ? "text-cream" : "text-cream/40"}>{label}{i === current && <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-saffron-400" />}</div>
                </div>
              ))}
            </div>
            <div className="card mt-6 p-6 text-sm">
              {order.items.map((i) => <div key={i.name} className="flex justify-between py-1"><span>{i.quantity} × {i.name}</span><span>{money(i.unitPrice * i.quantity)}</span></div>)}
              <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-base font-semibold"><span>Total</span><span>{money(order.total)}</span></div>
            </div>
            <div className="mt-8 text-center"><Link to="/menu" className="btn-outline">Back to menu</Link></div>
          </>
        )}
      </div>
    </div>
  );
}
