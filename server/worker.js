import bcrypt from "bcryptjs";

const ACCESS_SECONDS = 15 * 60;
const REFRESH_SECONDS = 7 * 24 * 60 * 60;
const MAX_BODY_BYTES = 16 * 1024;
const REFRESH_COOKIE = "grupedia_refresh";
const ISSUER = "grupedia";
const AUDIENCE = "grupedia-dashboard";
const encoder = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let cachedSigningKey;

class ApiError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

const column = (name, type, nullable = false, primaryKey = false) => ({ name, type, nullable, primaryKey });
const TABLES = Object.freeze({
  products: {
    name: "products",
    description: "Sample product catalog for your test project.",
    columns: [column("id", "INTEGER", false, true), column("name", "TEXT"), column("description", "TEXT", true), column("price", "REAL"), column("stock", "INTEGER"), column("status", "TEXT"), column("created_at", "TEXT")],
  },
  customers: {
    name: "customers",
    description: "Fictional customers included with your test project.",
    columns: [column("id", "INTEGER", false, true), column("name", "TEXT"), column("email", "TEXT"), column("status", "TEXT"), column("created_at", "TEXT")],
  },
  orders: {
    name: "orders",
    description: "Sample orders linked to the test products and customers.",
    columns: [column("id", "INTEGER", false, true), column("customer_id", "INTEGER"), column("product_id", "INTEGER"), column("quantity", "INTEGER"), column("amount", "REAL"), column("status", "TEXT"), column("created_at", "TEXT")],
  },
});

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function unbase64url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid encoding");
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signingKey(env) {
  if (typeof env.JWT_SECRET !== "string" || encoder.encode(env.JWT_SECRET).length < 32) {
    throw new ApiError(503, "Authentication is temporarily unavailable");
  }
  if (!cachedSigningKey || cachedSigningKey.secret !== env.JWT_SECRET) {
    cachedSigningKey = {
      secret: env.JWT_SECRET,
      key: await crypto.subtle.importKey("raw", encoder.encode(env.JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]),
    };
  }
  return cachedSigningKey.key;
}

async function createAccessToken(env, userId, sessionId) {
  const issued = nowSeconds();
  const header = base64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = base64url(encoder.encode(JSON.stringify({ sub: userId, sid: sessionId, iss: ISSUER, aud: AUDIENCE, iat: issued, exp: issued + ACCESS_SECONDS })));
  const data = `${header}.${payload}`;
  const signature = await crypto.subtle.sign("HMAC", await signingKey(env), encoder.encode(data));
  return `${data}.${base64url(new Uint8Array(signature))}`;
}

async function readAccessToken(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(authorization);
  if (!match || match[1].length > 4096) throw new ApiError(401, "Authentication required");
  const key = await signingKey(env);
  try {
    const [headerPart, payloadPart, signaturePart] = match[1].split(".");
    const header = JSON.parse(new TextDecoder().decode(unbase64url(headerPart)));
    if (header.alg !== "HS256" || header.typ !== "JWT") throw new Error("Invalid header");
    const valid = await crypto.subtle.verify("HMAC", key, unbase64url(signaturePart), encoder.encode(`${headerPart}.${payloadPart}`));
    if (!valid) throw new Error("Invalid signature");
    const payload = JSON.parse(new TextDecoder().decode(unbase64url(payloadPart)));
    const now = nowSeconds();
    if (payload.iss !== ISSUER || payload.aud !== AUDIENCE || !UUID.test(payload.sub || "") || !UUID.test(payload.sid || "") || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.iat <= 0 || payload.iat > now + 30 || payload.exp <= now || payload.exp - payload.iat !== ACCESS_SECONDS) {
      throw new Error("Invalid claims");
    }
    return payload;
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }
}

function publicUser(record) {
  return { id: record.id, name: record.name, email: record.email, createdAt: record.created_at };
}

async function authenticate(request, env) {
  const token = await readAccessToken(request, env);
  const record = await env.DB.prepare(`
    SELECT users.id, users.name, users.email, users.created_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ? AND sessions.user_id = ?
      AND sessions.revoked_at IS NULL AND sessions.expires_at > ?
  `).bind(token.sid, token.sub, nowSeconds()).first();
  if (!record) throw new ApiError(401, "Session expired. Please sign in again");
  return { user: publicUser(record), sessionId: token.sid };
}

function assertOrigin(request) {
  const origin = request.headers.get("Origin");
  if (origin !== null && origin !== new URL(request.url).origin) {
    throw new ApiError(403, "Cross-origin requests are not permitted");
  }
}

async function readJson(request, optional = false) {
  const declared = request.headers.get("Content-Length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
    throw new ApiError(413, "Request body is too large");
  }
  const reader = request.body?.getReader();
  const chunks = [];
  let bytes = 0;
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BODY_BYTES) {
          await reader.cancel();
          throw new ApiError(413, "Request body is too large");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  if (optional && bytes === 0) return {};
  const type = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") throw new ApiError(415, "Content-Type must be application/json");
  try {
    const body = new Uint8Array(bytes);
    let position = 0;
    for (const chunk of chunks) {
      body.set(chunk, position);
      position += chunk.byteLength;
    }
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid object");
    return value;
  } catch {
    throw new ApiError(400, "Provide a valid JSON object");
  }
}

function credentials(body, registration = false) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Provide a valid email address");
  const password = body.password;
  if (typeof password !== "string" || password.length < 8 || encoder.encode(password).length > 72) throw new ApiError(400, "Password must contain at least 8 characters and at most 72 UTF-8 bytes");
  const result = { email, password };
  if (registration) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80 || /[\x00-\x1f\x7f]/.test(name)) throw new ApiError(400, "Name must contain 2 to 80 characters");
    result.name = name;
  }
  return result;
}

async function rateLimit(request, env, action, email = "") {
  const limit = action === "register" ? 3 : action === "login" ? 5 : 30;
  const windowStart = Math.floor(nowSeconds() / 60) * 60;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const identities = [`ip:${await sha256(ip)}`];
  if (email) identities.push(`email:${await sha256(email)}`);
  for (const identity of identities) {
    const result = await env.DB.prepare(`
      INSERT INTO rate_limits (bucket_key, window_start, request_count) VALUES (?, ?, 1)
      ON CONFLICT (bucket_key, window_start) DO UPDATE SET request_count = request_count + 1
      RETURNING request_count
    `).bind(`${action}:${identity}`, windowStart).first();
    if (result.request_count > limit) {
      throw new ApiError(429, "Too many attempts. Please try again shortly", { "Retry-After": String(60 - nowSeconds() % 60) });
    }
  }
}

function cookieToken(request) {
  const cookies = (request.headers.get("Cookie") || "").split(";");
  const entry = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${REFRESH_COOKIE}=`));
  const value = entry?.slice(REFRESH_COOKIE.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

function refreshCookie(request, token, expiresAt) {
  const url = new URL(request.url);
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const maxAge = token ? Math.max(0, expiresAt - nowSeconds()) : 0;
  return `${REFRESH_COOKIE}=${token || ""}; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=${maxAge}; Expires=${new Date((token ? expiresAt : 0) * 1000).toUTCString()}${localHttp ? "" : "; Secure"}`;
}

function newRefreshToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

function seedStatements(db, userId, projectId, name, email, passwordHash, createdAt) {
  const statements = [
    db.prepare("INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").bind(userId, name, email, passwordHash, createdAt),
    db.prepare("INSERT INTO projects (id, user_id, name, database_type, environment, seeded, created_at) VALUES (?, ?, ?, 'SQLite', 'test', 1, ?)").bind(projectId, userId, "Starter project", createdAt),
  ];
  const products = [
    [1, "Canvas tote bag", "A reusable canvas bag for everyday essentials.", 18, 42, "active"],
    [2, "Ceramic coffee mug", "A stoneware mug with a matte finish.", 24, 18, "active"],
    [3, "Grid notebook", "A hardcover notebook for your next idea.", 12, 0, "draft"],
  ];
  const customers = [
    [1, "Alex Morgan", "alex@example.test", "active"],
    [2, "Sam Rivera", "sam@example.test", "active"],
    [3, "Jordan Lee", "jordan@example.test", "inactive"],
  ];
  const orders = [
    [1, 1, 1, 2, 36, "paid"],
    [2, 2, 2, 1, 24, "pending"],
    [3, 3, 3, 1, 12, "cancelled"],
  ];
  for (const row of products) statements.push(db.prepare("INSERT INTO products (project_id, id, name, description, price, stock, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(projectId, ...row, createdAt));
  for (const row of customers) statements.push(db.prepare("INSERT INTO customers (project_id, id, name, email, status, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(projectId, ...row, createdAt));
  for (const row of orders) statements.push(db.prepare("INSERT INTO orders (project_id, id, customer_id, product_id, quantity, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(projectId, ...row, createdAt));
  return statements;
}

async function register(request, env) {
  const data = credentials(await readJson(request), true);
  await rateLimit(request, env, "register", data.email);
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(data.email).first();
  if (existing) throw new ApiError(409, "An account with this email already exists");
  const id = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const passwordHash = await bcrypt.hash(data.password, 12);
  try {
    // D1 batch executes atomically: no account is left with a partially seeded project.
    await env.DB.batch(seedStatements(env.DB, id, projectId, data.name, data.email, passwordHash, createdAt));
  } catch (error) {
    if (/UNIQUE constraint failed: users\.email/i.test(error.message || "")) throw new ApiError(409, "An account with this email already exists");
    throw error;
  }
  return json({ message: "Account created. You can now sign in", user: { id, name: data.name, email: data.email, createdAt } }, 201);
}

async function login(request, env) {
  const data = credentials(await readJson(request));
  await rateLimit(request, env, "login", data.email);
  const record = await env.DB.prepare("SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?").bind(data.email).first();
  // Missing accounts still incur the bcrypt work factor to reduce account timing disclosure.
  const valid = record ? await bcrypt.compare(data.password, record.password_hash) : (await bcrypt.hash(data.password, 12), false);
  if (!valid) throw new ApiError(401, "Invalid email or password");
  const sessionId = crypto.randomUUID();
  const refresh = newRefreshToken();
  const expiresAt = nowSeconds() + REFRESH_SECONDS;
  const createdAt = new Date().toISOString();
  const token = await createAccessToken(env, record.id, sessionId);
  await env.DB.prepare("INSERT INTO sessions (id, user_id, refresh_hash, expires_at, revoked_at, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)").bind(sessionId, record.id, await sha256(refresh), expiresAt, createdAt, createdAt).run();
  return json({ token, expiresIn: ACCESS_SECONDS, user: publicUser(record) }, 200, { "Set-Cookie": refreshCookie(request, refresh, expiresAt) });
}

async function refreshSession(request, env) {
  await readJson(request, true);
  await rateLimit(request, env, "refresh");
  const refresh = cookieToken(request);
  if (!refresh) throw new ApiError(401, "Please sign in again", { "Set-Cookie": refreshCookie(request, null, 0) });
  const hash = await sha256(refresh);
  const record = await env.DB.prepare(`
    SELECT sessions.id AS session_id, sessions.expires_at, users.id, users.name, users.email, users.created_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.refresh_hash = ? AND sessions.revoked_at IS NULL AND sessions.expires_at > ?
  `).bind(hash, nowSeconds()).first();
  if (!record) throw new ApiError(401, "Please sign in again", { "Set-Cookie": refreshCookie(request, null, 0) });
  const replacement = newRefreshToken();
  const token = await createAccessToken(env, record.id, record.session_id);
  const result = await env.DB.prepare(`
    UPDATE sessions SET refresh_hash = ?, updated_at = ?
    WHERE id = ? AND refresh_hash = ? AND revoked_at IS NULL AND expires_at > ?
  `).bind(await sha256(replacement), new Date().toISOString(), record.session_id, hash, nowSeconds()).run();
  if (result.meta.changes !== 1) throw new ApiError(401, "Refresh token has already been used");
  return json({ token, expiresIn: ACCESS_SECONDS, user: publicUser(record) }, 200, { "Set-Cookie": refreshCookie(request, replacement, record.expires_at) });
}

async function logout(request, env) {
  await readJson(request, true);
  const refresh = cookieToken(request);
  if (refresh) await env.DB.prepare("UPDATE sessions SET revoked_at = ?, updated_at = ? WHERE refresh_hash = ? AND revoked_at IS NULL").bind(nowSeconds(), new Date().toISOString(), await sha256(refresh)).run();
  if (request.headers.has("Authorization")) {
    try {
      const claims = await readAccessToken(request, env);
      await env.DB.prepare("UPDATE sessions SET revoked_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL").bind(nowSeconds(), new Date().toISOString(), claims.sid, claims.sub).run();
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    }
  }
  return json({ message: "Signed out" }, 200, { "Set-Cookie": refreshCookie(request, null, 0) });
}

async function requireProject(env, projectId, userId) {
  if (!UUID.test(projectId)) throw new ApiError(404, "Project not found");
  const project = await env.DB.prepare("SELECT id, name, database_type, environment, seeded FROM projects WHERE id = ? AND user_id = ?").bind(projectId, userId).first();
  if (!project) throw new ApiError(404, "Project not found");
  return project;
}

function publicProject(project) {
  return { id: project.id, name: project.name, databaseType: project.database_type, environment: project.environment, seeded: Boolean(project.seeded) };
}

async function listProjects(env, userId) {
  const result = await env.DB.prepare("SELECT id, name, database_type, environment, seeded FROM projects WHERE user_id = ? ORDER BY created_at ASC, id ASC").bind(userId).all();
  return json({ projects: result.results.map(publicProject) });
}

async function listTables(env, projectId, userId) {
  await requireProject(env, projectId, userId);
  const entries = Object.entries(TABLES);
  const results = await env.DB.batch(entries.map(([id]) => env.DB.prepare(`SELECT COUNT(*) AS row_count FROM "${id}" WHERE project_id = ?`).bind(projectId)));
  return json({ tables: entries.map(([id, definition], index) => ({ id, name: definition.name, schema: "main", rowCount: results[index].results[0].row_count, description: definition.description })) });
}

function positiveInteger(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new ApiError(400, "Pagination parameters must be positive integers");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > max) throw new ApiError(400, "Pagination value exceeds the supported limit");
  return number;
}

async function listRows(request, env, projectId, tableId, userId) {
  // Ownership is checked before exposing the allowlisted table metadata or executing data queries.
  await requireProject(env, projectId, userId);
  if (!Object.hasOwn(TABLES, tableId)) throw new ApiError(404, "Table not found");
  const definition = TABLES[tableId];
  const params = new URL(request.url).searchParams;
  const page = positiveInteger(params.get("page"), 1, 1000000);
  const pageSize = positiveInteger(params.get("pageSize"), 25, 100);
  const search = (params.get("search") || "").trim();
  if (search.length > 200) throw new ApiError(400, "Search must contain at most 200 characters");
  const values = [projectId];
  let where = "project_id = ?";
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    where += ` AND (${definition.columns.map(({ name }) => `CAST("${name}" AS TEXT) LIKE ? ESCAPE '\\' COLLATE NOCASE`).join(" OR ")})`;
    for (const _column of definition.columns) values.push(pattern);
  }
  // Identifiers originate exclusively from the static allowlist; all request values are bound.
  const select = definition.columns.map(({ name }) => `"${name}"`).join(", ");
  const results = await env.DB.batch([
    env.DB.prepare(`SELECT COUNT(*) AS row_count FROM "${tableId}" WHERE ${where}`).bind(...values),
    env.DB.prepare(`SELECT ${select} FROM "${tableId}" WHERE ${where} ORDER BY id ASC LIMIT ? OFFSET ?`).bind(...values, pageSize, (page - 1) * pageSize),
  ]);
  const rowCount = results[0].results[0].row_count;
  return json({ table: { id: tableId, name: definition.name, schema: "main" }, columns: definition.columns, rows: results[1].results, page, pageSize, rowCount, totalPages: Math.ceil(rowCount / pageSize) });
}

export async function handleApi(request, env) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (!path.startsWith("/api/")) throw new ApiError(404, "API route not found");
    if (!env.DB) throw new ApiError(503, "Service is temporarily unavailable");
    if (request.method === "OPTIONS") {
      assertOrigin(request);
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": url.origin, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Vary": "Origin", "Cache-Control": "no-store" } });
    }
    if (request.method === "POST") {
      assertOrigin(request);
      if (path === "/api/auth/register") return await register(request, env);
      if (path === "/api/auth/login" || path === "/api/auth/root") return await login(request, env);
      if (path === "/api/auth/refresh") return await refreshSession(request, env);
      if (path === "/api/auth/logout") return await logout(request, env);
      throw new ApiError(404, "API route not found");
    }
    if (request.method === "GET") {
      if (path === "/api/auth/me") {
        const { user } = await authenticate(request, env);
        return json({ user });
      }
      if (path === "/api/projects") {
        const { user } = await authenticate(request, env);
        return await listProjects(env, user.id);
      }
      const route = /^\/api\/projects\/([^/]+)\/tables(?:\/([^/]+)\/rows)?$/.exec(path);
      if (route) {
        const { user } = await authenticate(request, env);
        let projectId;
        let tableId;
        try {
          projectId = decodeURIComponent(route[1]);
          if (route[2]) tableId = decodeURIComponent(route[2]);
        } catch {
          throw new ApiError(404, "Table or project not found");
        }
        return tableId ? await listRows(request, env, projectId, tableId, user.id) : await listTables(env, projectId, user.id);
      }
    }
    throw new ApiError(404, "API route not found");
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status, error.headers);
    // Do not return SQL, credentials, provider errors, or stack traces to clients.
    console.error("Grupedia API request failed", { errorType: error?.name || "Error" });
    return json({ error: "Something went wrong. Please try again" }, 500);
  }
}

export default { fetch: handleApi };
