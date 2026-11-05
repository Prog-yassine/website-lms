import { sql } from "drizzle-orm";
import { check, customType, foreignKey, index, integer, primaryKey, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

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


export const storageBuckets = sqliteTable("storage_buckets", {
  id: text("id"),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.id] }),
  unique("storage_buckets_project_name_unique").on(table.projectId, table.name),
  unique("storage_buckets_project_id_unique").on(table.projectId, table.id),
  index("storage_buckets_project_id").on(table.projectId),
]);

export const storageObjects = sqliteTable("storage_objects", {
  id: text("id"),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  bucketId: text("bucket_id").notNull(),
  objectKey: text("object_key").notNull().unique(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  contentType: text("content_type").notNull(),
  state: text("state").notNull().default("uploading"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.id] }),
  foreignKey({ columns: [table.projectId, table.bucketId], foreignColumns: [storageBuckets.projectId, storageBuckets.id] }).onDelete("cascade"),
  index("storage_objects_project_bucket").on(table.projectId, table.bucketId),
  index("storage_objects_project_state").on(table.projectId, table.state),
  check("storage_objects_size_check", sql`${table.size} > 0 AND ${table.size} <= 5242880`),
  check("storage_objects_state_check", sql`${table.state} IN ('uploading', 'ready')`),
]);

// Application end-user auth is independent from Grupedia builder auth above.
export const appAuthUsers = sqliteTable("app_auth_users", {
  id: text("id"),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  email: caseInsensitiveText("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
  lastSignInAt: text("last_sign_in_at"),
}, (table) => [
  primaryKey({ columns: [table.id] }),
  unique("app_auth_users_project_email_unique").on(table.projectId, table.email),
  unique("app_auth_users_project_id_unique").on(table.projectId, table.id),
  index("app_auth_users_project_id").on(table.projectId),
]);

export const appAuthSessions = sqliteTable("app_auth_sessions", {
  id: text("id"),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  refreshHash: text("refresh_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  revokedAt: integer("revoked_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.id] }),
  foreignKey({ columns: [table.projectId, table.userId], foreignColumns: [appAuthUsers.projectId, appAuthUsers.id] }).onDelete("cascade"),
  index("app_auth_sessions_project_user").on(table.projectId, table.userId),
  index("app_auth_sessions_expires_at").on(table.expiresAt),
]);

export const appAuthSettings = sqliteTable("app_auth_settings", {
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  allowedOrigins: text("allowed_origins").notNull().default("[]"),
  signupEnabled: integer("signup_enabled").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.projectId] }),
  check("app_auth_settings_signup_enabled_check", sql`${table.signupEnabled} IN (0, 1)`),
]);
