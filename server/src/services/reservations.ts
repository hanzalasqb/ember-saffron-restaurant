import { randomBytes } from "node:crypto";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { at, bestTable, diningMinutes, slotsFor, type Booking } from "../../../shared/reservations";
import type { DB } from "../db/client";
import { diningTables, reservations } from "../db/schema";
import { HttpError } from "../lib/errors";

const ACTIVE = ["confirmed", "seated"];
export const ReservationInput = z.object({
  name: z.string().min(2).max(120), phone: z.string().min(6).max(40), email: z.string().email().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/), partySize: z.number().int().min(1).max(8),
  notes: z.string().max(400).optional(),
});

async function bookingsBetween(db: DB, from: Date, to: Date): Promise<Booking[]> {
  const rows = await db.select().from(reservations).where(and(inArray(reservations.status, ACTIVE), lt(reservations.startsAt, to), gt(reservations.endsAt, from)));
  return rows.map((r) => ({ tableId: r.tableId, start: r.startsAt, end: r.endsAt }));
}

export async function availability(db: DB, date: string, party: number) {
  const tables = await db.select().from(diningTables);
  const bookings = await bookingsBetween(db, at(date, "00:00"), at(date, "23:59"));
  return slotsFor(date, party, tables, bookings);
}

export async function createReservation(db: DB, input: z.infer<typeof ReservationInput>) {
  const start = at(input.date, input.time), end = new Date(start.getTime() + diningMinutes(input.partySize) * 60_000);
  const slot = (await availability(db, input.date, input.partySize)).find((s) => s.time === input.time);
  if (!slot) throw new HttpError(400, "We don't take bookings at that time");
  return db.transaction(async (tx) => {
    // serialise bookings for the evening so two guests can't grab the same table
    await tx.execute(sql`select pg_advisory_xact_lock(${Number(input.date.replace(/-/g, ""))})`);
    const tables = await tx.select().from(diningTables);
    const table = bestTable(tables, await bookingsBetween(tx as unknown as DB, start, end), input.partySize, start, end);
    if (!table) throw new HttpError(409, "Sorry, that time was just booked. Please pick another slot.");
    const [row] = await tx.insert(reservations).values({
      code: randomBytes(3).toString("hex").toUpperCase(), name: input.name, phone: input.phone, email: input.email, partySize: input.partySize,
      startsAt: start, endsAt: end, tableId: table.id, notes: input.notes,
    }).returning();
    return { ...row, table };
  });
}

export async function reservationsForDay(db: DB, date: string) {
  return db.select().from(reservations).where(and(gt(reservations.endsAt, at(date, "00:00")), lt(reservations.startsAt, at(date, "23:59")))).orderBy(reservations.startsAt);
}

export async function setReservationStatus(db: DB, id: number, status: string) {
  const [row] = await db.update(reservations).set({ status }).where(eq(reservations.id, id)).returning();
  if (!row) throw new HttpError(404, "Reservation not found");
  return row;
}
