import type { Dish } from "../../../shared/concierge";
import type { Engineered } from "../../../shared/menuEngineering";
import type { Slot } from "../../../shared/reservations";

export type { Dish, Slot };
export type MenuItem = Dish & { id: number; available: boolean };
export type OrderType = "pickup" | "delivery" | "dine_in";
export type OrderStatus = "received" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
export interface Order {
  id: number; code: string; customerName: string; phone: string; type: OrderType; address?: string | null; status: OrderStatus; notes?: string | null;
  subtotal: number; deliveryFee: number; tax: number; total: number; createdAt: string; items: { name: string; unitPrice: number; quantity: number }[];
}
export interface OrderInput { customerName: string; phone: string; type: OrderType; address?: string; notes?: string; items: { slug: string; quantity: number }[] }
export interface Reservation { id: number; code: string; name: string; phone: string; partySize: number; startsAt: string; endsAt: string; tableId: number; status: string; notes?: string | null; table?: { label: string; zone: string; capacity: number } }
export interface ReservationInput { name: string; phone: string; email?: string; date: string; time: string; partySize: number; notes?: string }
export interface Analytics {
  kpis: { revenue: number; orders: number; avgTicket: number; upcomingCovers: number; upcomingBookings: number };
  daily: { day: string; revenue: number; orders: number }[];
  byType: { type: string; orders: number; revenue: number }[];
  top: Engineered[];
  matrix: { items: Engineered[]; popularityThreshold: number; averageMargin: number };
  insights: string[]; insightsEngine: string;
}
export type ConciergeEvent =
  | { type: "token"; text: string } | { type: "tool_call"; name: string; args: Record<string, unknown> } | { type: "tool_result"; name: string; summary: string }
  | { type: "dishes"; dishes: Dish[] } | { type: "booking"; date: string; time?: string; party: number; slots: string[] }
  | { type: "reservation"; code: string; table: string } | { type: "error"; message: string } | { type: "done" };
