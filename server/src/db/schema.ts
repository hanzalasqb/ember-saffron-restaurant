import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, numeric, pgTable, serial, smallint, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

const money = (name: string) => numeric(name, { precision: 10, scale: 2, mode: "number" });
const ts = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("staff"),
}, (t) => [uniqueIndex("users_email_idx").on(t.email)]);

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  description: text("description").notNull(),
  price: money("price").notNull(),
  foodCost: money("food_cost").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  allergens: jsonb("allergens").$type<string[]>().notNull().default([]),
  calories: integer("calories").notNull(),
  spice: smallint("spice").notNull().default(0),
  image: text("image").notNull(),
  popular: boolean("popular").notNull().default(false),
  available: boolean("available").notNull().default(true),
});

export const diningTables = pgTable("dining_tables", {
  id: integer("id").primaryKey(),
  label: varchar("label", { length: 10 }).notNull(),
  capacity: smallint("capacity").notNull(),
  zone: varchar("zone", { length: 40 }).notNull(),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 12 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  email: varchar("email", { length: 255 }),
  partySize: smallint("party_size").notNull(),
  startsAt: ts("starts_at").notNull(),
  endsAt: ts("ends_at").notNull(),
  tableId: integer("table_id").notNull().references(() => diningTables.id),
  status: varchar("status", { length: 20 }).notNull().default("confirmed"),
  notes: text("notes"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [index("reservations_time_idx").on(t.startsAt), index("reservations_table_idx").on(t.tableId)]);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 12 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  address: text("address"),
  status: varchar("status", { length: 24 }).notNull().default("received"),
  notes: text("notes"),
  subtotal: money("subtotal").notNull(),
  deliveryFee: money("delivery_fee").notNull(),
  tax: money("tax").notNull(),
  total: money("total").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [index("orders_created_idx").on(t.createdAt), index("orders_status_idx").on(t.status)]);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id),
  name: varchar("name", { length: 120 }).notNull(),
  unitPrice: money("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
}, (t) => [index("order_items_order_idx").on(t.orderId)]);

export const orderRelations = relations(orders, ({ many }) => ({ items: many(orderItems) }));
export const orderItemRelations = relations(orderItems, ({ one }) => ({ order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }) }));
