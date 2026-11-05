import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { handleApi } from './worker.js';
import { createTestD1 } from './test-d1.mjs';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const PASSWORD = 'correct-password-123!';
const TEST_SECRET = 'integration-test-only-secret-at-least-32-characters';
const ORIGIN = 'https://grupedia.test';
let ipSequence = 0;

function fixture(t) {
  const env = { DB: createTestD1(schema), JWT_SECRET: TEST_SECRET };
  t.after(() => env.DB.close());
  let accountSequence = 0;

  async function request(path, options = {}) {
    const headers = new Headers({ 'CF-Connecting-IP': options.ip || `203.0.113.${(++ipSequence % 250) + 1}` });
    const method = options.method || (options.body === undefined ? 'GET' : 'POST');
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    if (options.cookie) headers.set('Cookie', options.cookie);
    if (options.origin !== undefined) headers.set('Origin', options.origin);
    const response = await handleApi(new Request(new URL(path, ORIGIN), {
      method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }), env);
    assert.ok(response instanceof Response, `${path} must return an HTTP response`);
    const text = await response.text();
    return { response, status: response.status, data: text ? JSON.parse(text) : null };
  }

  async function account(email = `learner-${++accountSequence}@example.com`) {
    const registered = await request('/api/auth/register', { body: { name: 'Alex Learner', email, password: PASSWORD } });
    assert.equal(registered.status, 201);
    const signedIn = await request('/api/auth/login', { body: { email, password: PASSWORD } });
    assert.equal(signedIn.status, 200);
    assert.equal(typeof signedIn.data.token, 'string');
    const cookieHeader = signedIn.response.headers.get('Set-Cookie');
    assert.ok(cookieHeader?.startsWith('grupedia_refresh='));
    return { user: registered.data.user, token: signedIn.data.token, cookie: cookieHeader.split(';')[0] };
  }

  async function project(token) {
    const result = await request('/api/projects', { token });
    assert.equal(result.status, 200);
    assert.equal(result.data.projects.length, 1);
    return result.data.projects[0];
  }

  return { env, request, account, project };
}

function tokenClaims(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
}

/** Sign a standard JWT independently with Node crypto, not the worker's signer. */
function signToken(claims) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', TEST_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

test('registration validates identity and UTF-8 password bounds before creating users', async t => {
  const { request, env } = fixture(t);
  const invalid = [
    { name: 'Alex', email: 'not-an-email', password: PASSWORD },
    { name: 'Alex', email: 'short@example.com', password: 'short' },
    { name: 'Alex', email: 'long@example.com', password: 'é'.repeat(37) },
    { name: '', email: 'empty-name@example.com', password: PASSWORD },
  ];
  for (const body of invalid) {
    const result = await request('/api/auth/register', { body });
    assert.equal(result.status, 400);
    assert.equal(result.data.token, undefined);
  }
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first()).count, 0);
});

test('registration normalizes email, rejects duplicates, and creates one starter project', async t => {
  const { request, account, project, env } = fixture(t);
  const alice = await account('  ALICE@EXAMPLE.COM  ');
  assert.equal(alice.user.email, 'alice@example.com');
  assert.deepEqual(Object.keys(alice.user).sort(), ['createdAt', 'email', 'id', 'name']);
  const duplicate = await request('/api/auth/register', { body: { name: 'Another Alice', email: 'alice@example.com', password: PASSWORD } });
  assert.equal(duplicate.status, 409);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first()).count, 1);
  const starter = await project(alice.token);
  assert.equal(starter.name, 'Starter project');
  assert.equal(starter.databaseType, 'SQLite');
  assert.equal(starter.environment, 'test');
  assert.equal(starter.seeded, true);
});

test('wrong passwords and unknown accounts return the same generic failure without a session', async t => {
  const { request, account } = fixture(t);
  await account('alice@example.com');
  const wrong = await request('/api/auth/login', { body: { email: 'alice@example.com', password: 'incorrect-password' } });
  const unknown = await request('/api/auth/login', { body: { email: 'missing@example.com', password: 'incorrect-password' } });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.data, unknown.data);
  assert.equal(wrong.data.token, undefined);
  assert.equal(wrong.response.headers.get('Set-Cookie'), null);
});

test('login issues a short-lived JWT and a secure refresh cookie; bearer me returns safe user data', async t => {
  const { request, account } = fixture(t);
  const alice = await account();
  const signedIn = await request('/api/auth/root', { body: { email: alice.user.email, password: PASSWORD }, origin: ORIGIN });
  assert.equal(signedIn.status, 200);
  assert.equal(signedIn.data.expiresIn, 900);
  const claims = tokenClaims(signedIn.data.token);
  assert.equal(claims.sub, alice.user.id);
  assert.equal(claims.exp - claims.iat, 900);
  assert.equal(typeof claims.sid, 'string');
  const setCookie = signedIn.response.headers.get('Set-Cookie');
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=Strict/i);
  assert.match(setCookie, /Path=\/api\/auth/i);
  const me = await request('/api/auth/me', { token: signedIn.data.token });
  assert.equal(me.status, 200);
  assert.equal(me.data.user.id, alice.user.id);
  assert.deepEqual(Object.keys(me.data.user).sort(), ['createdAt', 'email', 'id', 'name']);
});

test('all account and data endpoints require a valid bearer session', async t => {
  const { request } = fixture(t);
  const id = '00000000-0000-4000-8000-000000000000';
  for (const path of ['/api/auth/me', '/api/projects', `/api/projects/${id}/tables`, `/api/projects/${id}/tables/products/rows`]) {
    assert.equal((await request(path)).status, 401);
    assert.equal((await request(path, { token: 'not-a-jwt' })).status, 401);
  }
});

test('owned projects expose seeded application tables and typed rows without internal ownership columns', async t => {
  const { request, account, project } = fixture(t);
  const alice = await account();
  const starter = await project(alice.token);
  const tables = await request(`/api/projects/${starter.id}/tables`, { token: alice.token });
  assert.equal(tables.status, 200);
  assert.deepEqual(tables.data.tables.map(table => table.id).sort(), ['customers', 'orders', 'products']);
  for (const table of tables.data.tables) {
    assert.equal(table.schema, 'main');
    assert.equal(table.rowCount, 3);
    const result = await request(`/api/projects/${starter.id}/tables/${table.id}/rows`, { token: alice.token });
    assert.equal(result.status, 200);
    assert.equal(result.data.rows.length, 3);
    assert.equal(result.data.rowCount, 3);
    assert.ok(result.data.columns.some(column => column.primaryKey));
    assert.ok(result.data.columns.every(column => !['project_id', 'user_id', 'password_hash', 'refresh_hash'].includes(column.name)));
    assert.ok(result.data.rows.every(row => !Object.hasOwn(row, 'project_id')));
  }
});

test('a second user cannot list or inspect another user’s project, table data, or unknown tables', async t => {
  const { request, account, project } = fixture(t);
  const alice = await account('alice@example.com');
  const bob = await account('bob@example.com');
  const aliceProject = await project(alice.token);
  const bobProject = await project(bob.token);
  assert.notEqual(aliceProject.id, bobProject.id);
  for (const suffix of ['/tables', '/tables/products/rows', '/tables/users/rows', '/tables/unknown/rows', '/unknown-path']) {
    assert.equal((await request(`/api/projects/${aliceProject.id}${suffix}`, { token: bob.token })).status, 404);
  }
  const ownRows = await request(`/api/projects/${bobProject.id}/tables/products/rows`, { token: bob.token });
  assert.equal(ownRows.status, 200);
  const missing = '00000000-0000-4000-8000-000000000000';
  assert.equal((await request(`/api/projects/${missing}/tables`, { token: bob.token })).status, 404);
});

test('table allowlisting blocks internal schema access and SQL-injection identifiers', async t => {
  const { request, account, project } = fixture(t);
  const alice = await account();
  const starter = await project(alice.token);
  for (const table of ['users', 'sessions', 'rate_limits', 'sqlite_master', 'main.products', 'products; DROP TABLE users;--', 'products" OR 1=1--']) {
    const result = await request(`/api/projects/${starter.id}/tables/${encodeURIComponent(table)}/rows`, { token: alice.token });
    assert.equal(result.status, 404, table);
  }
  assert.equal((await request('/api/auth/me', { token: alice.token })).status, 200);
});

test('row search is case insensitive and treats SQL and LIKE wildcard input as literal data', async t => {
  const { request, account, project } = fixture(t);
  const alice = await account();
  const starter = await project(alice.token);
  const base = `/api/projects/${starter.id}/tables/products/rows`;
  const all = await request(base, { token: alice.token });
  const expected = all.data.rows[0];
  const found = await request(`${base}?search=${encodeURIComponent(expected.name.toUpperCase())}`, { token: alice.token });
  assert.equal(found.status, 200);
  assert.ok(found.data.rows.some(row => row.id === expected.id));
  for (const query of ["' OR 1=1 --", '%', '_']) {
    const result = await request(`${base}?search=${encodeURIComponent(query)}`, { token: alice.token });
    assert.equal(result.status, 200);
    assert.equal(result.data.rowCount, 0, query);
    assert.deepEqual(result.data.rows, []);
  }
});

test('pagination returns distinct stable pages and rejects invalid query bounds', async t => {
  const { request, account, project } = fixture(t);
  const alice = await account();
  const starter = await project(alice.token);
  const base = `/api/projects/${starter.id}/tables/products/rows`;
  const first = await request(`${base}?page=1&pageSize=2`, { token: alice.token });
  const second = await request(`${base}?page=2&pageSize=2`, { token: alice.token });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.data.rows.length, 2);
  assert.equal(second.data.rows.length, 1);
  assert.equal(first.data.totalPages, 2);
  assert.equal(first.data.rowCount, 3);
  assert.equal(new Set([...first.data.rows, ...second.data.rows].map(row => row.id)).size, 3);
  for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=Infinity', 'pageSize=0', 'pageSize=101', 'pageSize=1.5', `search=${'a'.repeat(201)}`]) {
    assert.equal((await request(`${base}?${query}`, { token: alice.token })).status, 400, query);
  }
});

test('refresh rotates the HttpOnly cookie and rejects replay of the previous refresh token', async t => {
  const { request, account } = fixture(t);
  const alice = await account();
  const refreshed = await request('/api/auth/refresh', { method: 'POST', cookie: alice.cookie, origin: ORIGIN });
  assert.equal(refreshed.status, 200);
  assert.equal(typeof refreshed.data.token, 'string');
  const newCookie = refreshed.response.headers.get('Set-Cookie')?.split(';')[0];
  assert.ok(newCookie?.startsWith('grupedia_refresh='));
  assert.notEqual(newCookie, alice.cookie);
  assert.equal((await request('/api/auth/me', { token: refreshed.data.token })).status, 200);
  const replay = await request('/api/auth/refresh', { method: 'POST', cookie: alice.cookie, origin: ORIGIN });
  assert.equal(replay.status, 401);
  assert.equal(replay.data.token, undefined);
});

test('logout clears the cookie and revokes both access and refresh credentials', async t => {
  const { request, account } = fixture(t);
  const alice = await account();
  const loggedOut = await request('/api/auth/logout', { method: 'POST', token: alice.token, cookie: alice.cookie, origin: ORIGIN });
  assert.equal(loggedOut.status, 200);
  assert.match(loggedOut.response.headers.get('Set-Cookie'), /Max-Age=0/i);
  assert.equal((await request('/api/auth/me', { token: alice.token })).status, 401);
  assert.equal((await request('/api/auth/refresh', { method: 'POST', cookie: alice.cookie })).status, 401);
});

test('tampered payloads and correctly signed but expired JWTs are rejected', async t => {
  const { request, account } = fixture(t);
  const alice = await account();
  const claims = tokenClaims(alice.token);
  const parts = alice.token.split('.');
  parts[1] = Buffer.from(JSON.stringify({ ...claims, sub: crypto.randomUUID() })).toString('base64url');
  assert.equal((await request('/api/auth/me', { token: parts.join('.') })).status, 401);
  const expired = signToken({ ...claims, iat: Math.floor(Date.now() / 1000) - 1000, exp: Math.floor(Date.now() / 1000) - 100 });
  assert.equal((await request('/api/auth/me', { token: expired })).status, 401);
  assert.equal((await request('/api/auth/me', { token: alice.token })).status, 200);
});

test('foreign origins cannot create sessions or rotate a browser’s existing refresh cookie', async t => {
  const { request, account } = fixture(t);
  const alice = await account();
  const origin = 'https://attacker.example';
  const forbidden = await request('/api/auth/login', { origin, body: { email: alice.user.email, password: PASSWORD } });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.data.token, undefined);
  assert.equal((await request('/api/auth/refresh', { method: 'POST', origin, cookie: alice.cookie })).status, 403);
  assert.equal((await request('/api/auth/logout', { method: 'POST', origin, cookie: alice.cookie, token: alice.token })).status, 403);
  assert.equal((await request('/api/auth/me', { token: alice.token })).status, 200);
  assert.equal((await request('/api/auth/refresh', { method: 'POST', origin: ORIGIN, cookie: alice.cookie })).status, 200);
});

test('login attempts and registrations are rate limited per IP with retry guidance', async t => {
  const { request } = fixture(t);
  const loginIp = '198.51.100.20';
  for (let index = 0; index < 5; index++) {
    const result = await request('/api/auth/login', { ip: loginIp, body: { email: `missing-${index}@example.com`, password: PASSWORD } });
    assert.equal(result.status, 401);
  }
  const blockedLogin = await request('/api/auth/login', { ip: loginIp, body: { email: 'missing-last@example.com', password: PASSWORD } });
  assert.equal(blockedLogin.status, 429);
  assert.ok(Number(blockedLogin.response.headers.get('Retry-After')) > 0);

  const registrationIp = '198.51.100.21';
  for (let index = 0; index < 3; index++) {
    const result = await request('/api/auth/register', { ip: registrationIp, body: { name: 'New Learner', email: `new-${index}@example.com`, password: PASSWORD } });
    assert.equal(result.status, 201);
  }
  const blockedRegistration = await request('/api/auth/register', { ip: registrationIp, body: { name: 'New Learner', email: 'new-last@example.com', password: PASSWORD } });
  assert.equal(blockedRegistration.status, 429);
  assert.ok(Number(blockedRegistration.response.headers.get('Retry-After')) > 0);
});
