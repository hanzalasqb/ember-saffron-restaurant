import type { Analytics, ConciergeEvent, MenuItem, Order, OrderInput, OrderStatus, OrderType, Reservation, ReservationInput, Slot } from "./types";

export interface Api {
  demo: boolean;
  menu(): Promise<MenuItem[]>;
  quote(type: OrderType, items: { slug: string; quantity: number }[]): Promise<{ subtotal: number; deliveryFee: number; tax: number; total: number }>;
  placeOrder(input: OrderInput): Promise<Order>;
  order(code: string): Promise<Order>;
  watchOrder(code: string, onStatus: (s: OrderStatus) => void): () => void;
  availability(date: string, party: number): Promise<Slot[]>;
  reserve(input: ReservationInput): Promise<Reservation>;
  login(email: string, password: string): Promise<{ token: string }>;
  kitchen(): Promise<Order[]>;
  watchKitchen(onOrder: (o: Order) => void): () => void;
  setOrderStatus(code: string, status: OrderStatus): Promise<Order>;
  reservations(date: string): Promise<Reservation[]>;
  setReservationStatus(id: number, status: string): Promise<Reservation>;
  analytics(): Promise<Analytics>;
  concierge(message: string, history: { role: string; content: string }[], onEvent: (e: ConciergeEvent) => void): Promise<void>;
}

const BASE = import.meta.env.VITE_API_URL ?? "";
const KEY = "ember.token";
export const token = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (t: string | null) => { try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* ignore */ } },
};

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const t = token.get();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Request failed"), { status: res.status });
  return data as T;
}

function listen<T>(path: string, event: string, fn: (data: T) => void) {
  const es = new EventSource(`${BASE}${path}`);
  es.addEventListener(event, (e) => fn(JSON.parse((e as MessageEvent).data) as T));
  return () => es.close();
}

export const httpApi: Api = {
  demo: false,
  menu: () => req("/api/menu"),
  quote: (type, items) => req("/api/orders/quote", { method: "POST", body: JSON.stringify({ type, items }) }),
  placeOrder: (input) => req("/api/orders", { method: "POST", body: JSON.stringify(input) }),
  order: (code) => req(`/api/orders/${code}`),
  watchOrder: (code, onStatus) => listen<{ status: OrderStatus }>(`/api/orders/${code}/stream`, "status", (d) => onStatus(d.status)),
  availability: (date, party) => req(`/api/availability?date=${date}&party=${party}`),
  reserve: (input) => req("/api/reservations", { method: "POST", body: JSON.stringify(input) }),
  login: (email, password) => req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  kitchen: () => req("/api/admin/kitchen"),
  watchKitchen: (onOrder) => listen<Order>(`/api/admin/kitchen/stream?token=${encodeURIComponent(token.get() ?? "")}`, "order", onOrder),
  setOrderStatus: (code, status) => req(`/api/admin/orders/${code}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  reservations: (date) => req(`/api/admin/reservations?date=${date}`),
  setReservationStatus: (id, status) => req(`/api/admin/reservations/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  analytics: () => req("/api/admin/analytics"),
  async concierge(message, history, onEvent) {
    const res = await fetch(`${BASE}/api/concierge/stream`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history }) });
    if (!res.ok || !res.body) throw new Error("Concierge unavailable");
    const reader = res.body.getReader(), decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      for (const b of blocks) {
        const type = b.match(/^event: (.+)$/m)?.[1], data = b.match(/^data: (.*)$/m)?.[1];
        if (type && data) onEvent({ ...JSON.parse(data), type } as ConciergeEvent);
      }
    }
  },
};
