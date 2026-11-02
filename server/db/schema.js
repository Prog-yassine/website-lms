import { sql } from "drizzle-orm";
import { check, customType, foreignKey, index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Preserve the case-insensitive email column in the canonical SQLite schema.
const caseInsensitiveText = customType({ dataType: () => "text COLLATE NOCASE" });

export const users = sqliteTable("users", {
  id: text("id"),
  name: text("name").notNull(),
  email: caseInsensitiveText("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [primaryKey({ columns: [table.id] })]);

export const sessions = sqliteTable("sessions", {
  id: text("id"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  refreshHash: text("refresh_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  revokedAt: integer("revoked_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.id] }),
  index("sessions_user_id").on(table.userId),
  index("sessions_expires_at").on(table.expiresAt),
]);

export const projects = sqliteTable("projects", {
  id: text("id"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  databaseType: text("database_type").notNull().default("SQLite"),
  environment: text("environment").notNull().default("test"),
  seeded: integer("seeded").notNull().default(1),
  createdAt: text("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.id] }),
  index("projects_user_id").on(table.userId),
  check("projects_seeded_check", sql`${table.seeded} IN (0, 1)`),
]);

export const products = sqliteTable("products", {
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  id: integer("id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  stock: integer("stock").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.projectId, table.id] }),
  check("products_price_check", sql`${table.price} >= 0`),
  check("products_stock_check", sql`${table.stock} >= 0`),
]);

export const customers = sqliteTable("customers", {
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  id: integer("id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [primaryKey({ columns: [table.projectId, table.id] })]);

export const orders = sqliteTable("orders", {
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  id: integer("id").notNull(),
  customerId: integer("customer_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  amount: real("amount").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.projectId, table.id] }),
  foreignKey({ columns: [table.projectId, table.customerId], foreignColumns: [customers.projectId, customers.id] }),
  foreignKey({ columns: [table.projectId, table.productId], foreignColumns: [products.projectId, products.id] }),
  check("orders_quantity_check", sql`${table.quantity} > 0`),
  check("orders_amount_check", sql`${table.amount} >= 0`),
]);

export const rateLimits = sqliteTable("rate_limits", {
  bucketKey: text("bucket_key").notNull(),
  windowStart: integer("window_start").notNull(),
  requestCount: integer("request_count").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.bucketKey, table.windowStart] })]);
