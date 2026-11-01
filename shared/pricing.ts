import { RESTAURANT } from "./menu";

const round = (n: number) => Math.round(n * 100) / 100;
export type OrderType = "pickup" | "delivery" | "dine_in";

export function orderTotals(lines: { price: number; quantity: number }[], type: OrderType) {
  const subtotal = round(lines.reduce((n, l) => n + l.price * l.quantity, 0));
  const deliveryFee = type === "delivery" && subtotal < RESTAURANT.freeDeliveryOver ? RESTAURANT.deliveryFee : 0;
  const tax = round(subtotal * RESTAURANT.taxRate);
  return { subtotal, deliveryFee, tax, total: round(subtotal + deliveryFee + tax) };
}
