import bcrypt from 'bcryptjs';

// Application users are deliberately separate from the platform's builder users.
const ISSUER = 'grupedia-app';
const ACCESS_SECONDS = 900;
const REFRESH_SECONDS = 604800;
const MAX_BODY_BYTES = 16 * 1024;
const MAX_PROJECT_USERS = 1000;
const MAX_USER_SESSIONS = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFRESH_TOKEN = /^[A-Za-z0-9_-]{43}$/;
// A public timing placeholder, never a usable account credential.
const DUMMY_PASSWORD_HASH = '$2b$12$ButSQ.cKjNWl50Q93RL8e.x0YuNlifQPV6vEd9M7zZInbe.1gjGRG';
const encoder = new TextEncoder();
let cachedKey;

export class AppAuthError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.name = 'AppAuthError';
    this.status = status;
    this.headers = headers;
  }
}

const nowSeconds = () => Math.floor(Date.now() / 1000);
const audience = (projectId) => `${ISSUER}:${projectId}`;

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin',
      ...headers,
    },
  });
}

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function unbase64url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function digest(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function signingKey(env) {
  if (typeof env.JWT_SECRET !== 'string' || encoder.encode(env.JWT_SECRET).length < 32) {
    throw new AppAuthError(503, 'Application authentication is temporarily unavailable');
  }
  if (!cachedKey || cachedKey.secret !== env.JWT_SECRET) {
    cachedKey = {
      secret: env.JWT_SECRET,
      key: await crypto.subtle.importKey('raw', encoder.encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']),
    };
  }
  return cachedKey.key;
}

async function createAccessToken(env, projectId, userId, sessionId) {
  const issued = nowSeconds();
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64url(encoder.encode(JSON.stringify({
    sub: userId, sid: sessionId, project_id: projectId,
    iss: ISSUER, aud: audience(projectId), iat: issued, exp: issued + ACCESS_SECONDS,
  })));
  const contents = `${header}.${payload}`;
  const signature = await crypto.subtle.sign('HMAC', await signingKey(env), encoder.encode(contents));
  return `${contents}.${base64url(new Uint8Array(signature))}`;
}

async function readAccessToken(request, env, projectId, { allowExpired = false } = {}) {
  const authorization = request.headers.get('Authorization') || '';
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(authorization);
  if (!match || match[1].length > 4096) throw new AppAuthError(401, 'Application authentication required');
  const key = await signingKey(env);
  try {
    const [headerPart, payloadPart, signaturePart] = match[1].split('.');
    const header = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(unbase64url(headerPart)));
    if (header.alg !== 'HS256' || header.typ !== 'JWT' || header.crit !== undefined) throw new Error('Invalid JWT header');
    const valid = await crypto.subtle.verify('HMAC', key, unbase64url(signaturePart), encoder.encode(`${headerPart}.${payloadPart}`));
    if (!valid) throw new Error('Invalid JWT signature');
    const claims = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(unbase64url(payloadPart)));
    const now = nowSeconds();
    if (!claims || Array.isArray(claims) || claims.iss !== ISSUER || claims.aud !== audience(projectId) || claims.project_id !== projectId ||
      !UUID.test(claims.sub || '') || !UUID.test(claims.sid || '') || !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
      claims.iat <= 0 || claims.iat > now + 30 || claims.exp - claims.iat !== ACCESS_SECONDS || (!allowExpired && claims.exp <= now)) {
      throw new Error('Invalid JWT claims');
    }
    return claims;
  } catch {
    throw new AppAuthError(401, 'Invalid or expired application access token');
  }
}

function publicUser(record) {
  return {
    id: record.id, name: record.name || '', email: record.email,
    createdAt: record.created_at, lastSignInAt: record.last_sign_in_at || null,
    provider: 'email', role: 'authenticated',
  };
}

function originValue(value) {
  if (typeof value !== 'string' || value.length > 2048 || value.includes('*')) return null;
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))) return null;
    return url.origin;
  } catch { return null; }
}

/** Read an existing settings row without applying DDL or creating defaults in the DB. */
export async function readAppSettings(env, projectId) {
  const row = await env.DB.prepare('SELECT allowed_origins, signup_enabled FROM app_auth_settings WHERE project_id = ?').bind(projectId).first();
  let origins = [];
  if (row) {
    try {
      const parsed = JSON.parse(row.allowed_origins);
      if (Array.isArray(parsed) && parsed.length <= 10) origins = [...new Set(parsed.map(originValue).filter(Boolean))];
    } catch { /* Invalid persisted configuration grants no extra origins. */ }
  }
  return {
    accessTokenSeconds: ACCESS_SECONDS, refreshTokenSeconds: REFRESH_SECONDS,
    passwordMinLength: 8, signupEnabled: row ? row.signup_enabled === 1 : true, allowedOrigins: origins,
  };
}

async function requireProject(env, projectId) {
  if (!UUID.test(projectId)) throw new AppAuthError(404, 'Application project not found');
  const record = await env.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(projectId).first();
  if (!record) throw new AppAuthError(404, 'Application project not found');
}

function corsHeaders(request, settings) {
  const origin = request.headers.get('Origin');
  if (origin === null) return { Vary: 'Origin' }; // Server SDKs do not send Origin.
  if (origin === 'null' || (origin !== new URL(request.url).origin && !settings.allowedOrigins.includes(origin))) {
    throw new AppAuthError(403, 'This origin is not allowed for application authentication');
  }
  return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
}

async function readJson(request, optional = false) {
  const declared = request.headers.get('Content-Length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) throw new AppAuthError(413, 'Request body is too large');
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
          throw new AppAuthError(413, 'Request body is too large');
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  if (optional && bytes === 0) return {};
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new AppAuthError(415, 'Content-Type must be application/json');
  try {
    const contents = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { contents.set(chunk, offset); offset += chunk.byteLength; }
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(contents));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid JSON object');
    return value;
  } catch { throw new AppAuthError(400, 'Provide a valid JSON object'); }
}

function credentials(body, registration = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppAuthError(400, 'Provide a valid user object');
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    Array.from(email).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new AppAuthError(400, 'Provide a valid email address');
  const password = body.password;
  if (typeof password !== 'string' || password.length < 8 || encoder.encode(password).length > 72) {
    throw new AppAuthError(400, 'Password must contain at least 8 characters and at most 72 UTF-8 bytes');
  }
  const result = { email, password };
  if (registration) {
    if (body.name !== undefined && typeof body.name !== 'string') throw new AppAuthError(400, 'Name must be a string of at most 80 characters');
    const rawName = body.name || '';
    const name = rawName.trim();
    if (name.length > 80 || Array.from(rawName).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
      throw new AppAuthError(400, 'Name must contain at most 80 characters and no control characters');
    }
    result.name = name;
  }
  return result;
}

async function rateLimit(request, env, projectId, action, email = '') {
  const limit = action === 'register' ? 3 : action === 'login' ? 5 : 30;
  const now = nowSeconds();
  const window = Math.floor(now / 60) * 60;
  const identities = [`ip:${await digest(request.headers.get('CF-Connecting-IP') || 'unknown')}`];
  if (email) identities.push(`email:${await digest(email)}`);
  for (const identity of identities) {
    const result = await env.DB.prepare(`
      INSERT INTO rate_limits (bucket_key, window_start, request_count) VALUES (?, ?, 1)
      ON CONFLICT (bucket_key, window_start) DO UPDATE SET request_count = request_count + 1
      RETURNING request_count
    `).bind(`app:${projectId}:${action}:${identity}`, window).first();
    if (result.request_count > limit) throw new AppAuthError(429, 'Too many attempts. Please try again shortly', { 'Retry-After': String(60 - now % 60) });
  }
}

/** Caller owns project authorization. `admin` only bypasses the project's signup switch. */
export async function createApplicationUser(env, projectId, payload, { admin = false } = {}) {
  const data = credentials(payload, true);
  await requireProject(env, projectId);
  if (admin !== true && !(await readAppSettings(env, projectId)).signupEnabled) throw new AppAuthError(403, 'Public signups are disabled for this application');
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const passwordHash = await bcrypt.hash(data.password, 12);
  let result;
  try {
    // A single conditional statement makes the project quota safe under concurrent signups.
    result = await env.DB.prepare(`
      INSERT INTO app_auth_users (id, project_id, name, email, password_hash, created_at, last_sign_in_at)
      SELECT ?, ?, ?, ?, ?, ?, NULL
      WHERE (SELECT COUNT(*) FROM app_auth_users WHERE project_id = ?) < ?
    `).bind(id, projectId, data.name, data.email, passwordHash, createdAt, projectId, MAX_PROJECT_USERS).run();
  } catch (error) {
    if (/UNIQUE constraint failed: app_auth_users\./i.test(error?.message || '')) throw new AppAuthError(409, 'An application account with this email already exists');
    throw error;
  }
  if (result.meta.changes !== 1) throw new AppAuthError(409, 'This application has reached its 1,000-user limit');
  return publicUser({ id, name: data.name, email: data.email, created_at: createdAt, last_sign_in_at: null });
}

async function authenticate(request, env, projectId) {
  const claims = await readAccessToken(request, env, projectId);
  const now = nowSeconds();
  const record = await env.DB.prepare(`
    SELECT u.id, u.name, u.email, u.created_at, u.last_sign_in_at
    FROM app_auth_sessions s JOIN app_auth_users u ON u.id = s.user_id AND u.project_id = s.project_id
    WHERE s.id = ? AND s.project_id = ? AND s.user_id = ? AND s.revoked_at IS NULL AND s.expires_at > ?
  `).bind(claims.sid, projectId, claims.sub, now).first();
  if (!record) throw new AppAuthError(401, 'Application session expired. Please sign in again');
  // Check expiry again in the write so revocation can never be undone by a concurrent /me.
  const updated = await env.DB.prepare(`
    UPDATE app_auth_sessions SET updated_at = ?
    WHERE id = ? AND project_id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > ?
  `).bind(new Date().toISOString(), claims.sid, projectId, claims.sub, nowSeconds()).run();
  if (updated.meta.changes !== 1) throw new AppAuthError(401, 'Application session expired. Please sign in again');
  return publicUser(record);
}

async function login(request, env, projectId) {
  const data = credentials(await readJson(request));
  await rateLimit(request, env, projectId, 'login', data.email);
  const record = await env.DB.prepare('SELECT id, name, email, password_hash, created_at, last_sign_in_at FROM app_auth_users WHERE project_id = ? AND email = ?').bind(projectId, data.email).first();
  // Both a missing user and an incorrect password perform the same bcrypt work factor.
  const valid = await bcrypt.compare(data.password, record?.password_hash || DUMMY_PASSWORD_HASH);
  if (!record || !valid) throw new AppAuthError(401, 'Invalid email or password');
  const sessionId = crypto.randomUUID();
  const refresh = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const now = nowSeconds();
  const signedInAt = new Date().toISOString();
  const token = await createAccessToken(env, projectId, record.id, sessionId);
  const results = await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO app_auth_sessions (id, project_id, user_id, refresh_hash, expires_at, revoked_at, created_at, updated_at)
      SELECT ?, ?, ?, ?, ?, NULL, ?, ?
      WHERE (SELECT COUNT(*) FROM app_auth_sessions WHERE project_id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > ?) < ?
        AND EXISTS (SELECT 1 FROM app_auth_users WHERE project_id = ? AND id = ?)
    `).bind(sessionId, projectId, record.id, await digest(refresh), now + REFRESH_SECONDS, signedInAt, signedInAt, projectId, record.id, now, MAX_USER_SESSIONS, projectId, record.id),
    env.DB.prepare(`
      UPDATE app_auth_users SET last_sign_in_at = ? WHERE id = ? AND project_id = ?
        AND EXISTS (SELECT 1 FROM app_auth_sessions WHERE id = ? AND project_id = ? AND user_id = ?)
    `).bind(signedInAt, record.id, projectId, sessionId, projectId, record.id),
  ]);
  if (results[0].meta.changes !== 1) {
    const stillExists = await env.DB.prepare('SELECT id FROM app_auth_users WHERE id = ? AND project_id = ?').bind(record.id, projectId).first();
    if (!stillExists) throw new AppAuthError(401, 'Invalid email or password');
    throw new AppAuthError(429, 'Too many active application sessions. Sign out on another device or ask your application administrator to revoke a session');
  }
  return {
    access_token: token, refresh_token: refresh, token_type: 'bearer', expires_in: ACCESS_SECONDS,
    user: publicUser({ ...record, last_sign_in_at: signedInAt }),
  };
}

function refreshValue(body) {
  if (typeof body.refresh_token !== 'string' || !REFRESH_TOKEN.test(body.refresh_token)) throw new AppAuthError(401, 'A valid application refresh token is required');
  return body.refresh_token;
}

async function refresh(request, env, projectId) {
  const body = await readJson(request);
  await rateLimit(request, env, projectId, 'refresh');
  const hash = await digest(refreshValue(body));
  const record = await env.DB.prepare(`
    SELECT s.id AS session_id, s.expires_at, u.id, u.name, u.email, u.created_at, u.last_sign_in_at
    FROM app_auth_sessions s JOIN app_auth_users u ON u.id = s.user_id AND u.project_id = s.project_id
    WHERE s.project_id = ? AND s.refresh_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
  `).bind(projectId, hash, nowSeconds()).first();
  if (!record) throw new AppAuthError(401, 'Invalid or expired application refresh token');
  const replacement = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const token = await createAccessToken(env, projectId, record.id, record.session_id);
  // CAS prevents two concurrent requests from redeeming the same refresh credential.
  const updated = await env.DB.prepare(`
    UPDATE app_auth_sessions SET refresh_hash = ?, updated_at = ?
    WHERE id = ? AND project_id = ? AND user_id = ? AND refresh_hash = ? AND revoked_at IS NULL AND expires_at > ?
  `).bind(await digest(replacement), new Date().toISOString(), record.session_id, projectId, record.id, hash, nowSeconds()).run();
  if (updated.meta.changes !== 1) throw new AppAuthError(401, 'Application refresh token has already been used');
  return { access_token: token, refresh_token: replacement, token_type: 'bearer', expires_in: ACCESS_SECONDS, user: publicUser(record) };
}

async function logout(request, env, projectId) {
  const body = await readJson(request, true);
  let refreshSession = null;
  if (body.refresh_token !== undefined) {
    refreshSession = await env.DB.prepare('SELECT id, user_id FROM app_auth_sessions WHERE project_id = ? AND refresh_hash = ?')
      .bind(projectId, await digest(refreshValue(body))).first();
    if (!refreshSession) throw new AppAuthError(401, 'Invalid application refresh token');
  }
  let claims = null;
  if (request.headers.has('Authorization')) {
    // An authentic but expired access token adds no authority when refresh proof is present.
    const token = await readAccessToken(request, env, projectId, { allowExpired: Boolean(refreshSession) });
    if (token.exp > nowSeconds()) claims = token;
  }
  if (!refreshSession && !claims) throw new AppAuthError(401, 'Application authentication required');
  if (refreshSession && claims && (refreshSession.id !== claims.sid || refreshSession.user_id !== claims.sub)) {
    throw new AppAuthError(401, 'Application credentials refer to different sessions');
  }
  const target = refreshSession || { id: claims.sid, user_id: claims.sub };
  await env.DB.prepare(`
    UPDATE app_auth_sessions SET revoked_at = ?, updated_at = ?
    WHERE id = ? AND project_id = ? AND user_id = ? AND revoked_at IS NULL
  `).bind(nowSeconds(), new Date().toISOString(), target.id, projectId, target.user_id).run();
  return { message: 'Signed out of the application' };
}

/** Returns null for routes outside application auth. Never reads or writes platform cookies. */
export async function handleApplicationAuth(request, env) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  const route = /^\/api\/apps\/([^/]+)\/auth(?:\/(.*))?$/.exec(path);
  if (!route) return null;
  let cors = { Vary: 'Origin' };
  try {
    if (!env.DB) throw new AppAuthError(503, 'Application authentication is temporarily unavailable');
    let projectId;
    try { projectId = decodeURIComponent(route[1]); }
    catch { throw new AppAuthError(404, 'Application project not found'); }
    await requireProject(env, projectId);
    const settings = await readAppSettings(env, projectId);
    cors = corsHeaders(request, settings);
    const action = route[2] || '';
    if (action && !['register', 'login', 'refresh', 'me', 'logout'].includes(action)) throw new AppAuthError(404, 'Application authentication route not found');
    if (request.method === 'OPTIONS') {
      const method = request.headers.get('Access-Control-Request-Method');
      if (method && !['GET', 'POST'].includes(method)) throw new AppAuthError(405, 'Application authentication method not allowed', { Allow: 'GET, POST, OPTIONS' });
      const headers = (request.headers.get('Access-Control-Request-Headers') || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
      if (headers.some(value => !['content-type', 'authorization'].includes(value))) throw new AppAuthError(400, 'Unsupported application authentication request headers');
      return new Response(null, { status: 204, headers: {
        ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      } });
    }
    if (!action) throw new AppAuthError(404, 'Application authentication route not found');
    const expectedMethod = action === 'me' ? 'GET' : 'POST';
    if (request.method !== expectedMethod) throw new AppAuthError(405, 'Application authentication method not allowed', { Allow: `${expectedMethod}, OPTIONS` });
    let data;
    let status = 200;
    if (action === 'register') {
      const payload = credentials(await readJson(request), true);
      await rateLimit(request, env, projectId, 'register', payload.email);
      if (!settings.signupEnabled) throw new AppAuthError(403, 'Public signups are disabled for this application');
      await signingKey(env); // Fail before creating an account if auth cannot issue tokens.
      data = { user: await createApplicationUser(env, projectId, payload) };
      status = 201;
    } else if (action === 'login') data = await login(request, env, projectId);
    else if (action === 'refresh') data = await refresh(request, env, projectId);
    else if (action === 'me') data = { user: await authenticate(request, env, projectId) };
    else data = await logout(request, env, projectId);
    return json(data, status, cors);
  } catch (error) {
    if (error instanceof AppAuthError) return json({ error: error.message }, error.status, { ...cors, ...error.headers });
    // Safe tags only: never log the request, SQL, credentials, JWTs, or provider messages.
    console.error('Grupedia application authentication failed', { errorType: error?.name || 'Error' });
    return json({ error: 'Application authentication failed. Please try again' }, 500, cors);
  }
}
