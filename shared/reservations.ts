// Slot generation and best-fit table assignment. Pure functions shared by the API and the browser demo.
import { RESTAURANT } from "./menu";

export interface TableDef { id: number; label: string; capacity: number; zone: string }
export interface Booking { tableId: number; start: Date; end: Date }
export interface Slot { time: string; available: boolean; tableId?: number; tableLabel?: string }

export const SLOT_MINUTES = 30;
export const diningMinutes = (party: number) => (party >= 5 ? 120 : 90);
const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const pad = (n: number) => String(n).padStart(2, "0");

/** Local wall-clock Date for a YYYY-MM-DD + HH:MM in the restaurant's (process) time zone. */
export function at(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

export function bestTable(tables: TableDef[], bookings: Booking[], party: number, start: Date, end: Date): TableDef | undefined {
  return tables
    .filter((t) => t.capacity >= party)
    .sort((a, b) => a.capacity - b.capacity || a.id - b.id) // smallest table that fits -> keeps big tables for big groups
    .find((t) => !bookings.some((b) => b.tableId === t.id && b.start < end && b.end > start));
}

export function slotsFor(date: string, party: number, tables: TableDef[], bookings: Booking[], now = new Date()): Slot[] {
  const day = at(date, "00:00").getDay();
  const hours = RESTAURANT.hours[day];
  if (!hours || party < 1 || party > Math.max(...tables.map((t) => t.capacity))) return [];
  const open = toMinutes(hours[0]), close = toMinutes(hours[1]), duration = diningMinutes(party);
  const slots: Slot[] = [];
  for (let m = open; m + duration <= close + 30; m += SLOT_MINUTES) { // last seating 30 min before kitchen close
    const time = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    const start = at(date, time), end = new Date(start.getTime() + duration * 60_000);
    const table = start.getTime() > now.getTime() + 30 * 60_000 ? bestTable(tables, bookings, party, start, end) : undefined;
    slots.push({ time, available: Boolean(table), tableId: table?.id, tableLabel: table?.label });
  }
  return slots;
}
