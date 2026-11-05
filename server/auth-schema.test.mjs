import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { handleApi } from './worker.js';
import { createTestD1 } from './test-d1.mjs';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const PASSWORD = 'schema-test-password-123!';
const ORIGIN = 'https://grupedia.test';
const USER_COLUMNS = ['id', 'name', 'email', 'created_at'];
const SESSION_COLUMNS = ['id', 'user_id', 'created_at', 'updated_at', 'expires_at', 'revoked_at'];
const MISSING_ID = '00000000-0000-4000-8000-000000000000';
let ipSequence = 0;

function sessionId(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sid;
}

function fixture(t) {
  const env = {
    DB: createTestD1(schema),
    JWT_SECRET: 'auth-schema-integration-test-secret-at-least-32-characters',
  };
  t.after(() => env.DB.close());

  async function request(path, options = {}) {
    const headers = new Headers({ 'CF-Connecting-IP': `192.0.2.${(++ipSequence % 250) + 1}` });
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    const response = await handleApi(new Request(new URL(path, ORIGIN), {
      method: options.method || (options.body === undefined ? 'GET' : 'POST'),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }), env);
    assert.ok(response instanceof Response);
    return { status: response.status, data: await response.json() };
  }

  async function login(email) {
    const result = await request('/api/auth/login', { body: { email, password: PASSWORD } });
    assert.equal(result.status, 200);
    return result.data.token;
  }

  async function account(email = 'owner@example.com') {
    const registered = await request('/api/auth/register', { body: { name: 'Schema Owner', email, password: PASSWORD } });
    assert.equal(registered.status, 201);
    const token = await login(email);
    const projects = await request('/api/projects', { token });
    assert.equal(projects.status, 200);
    return { token, user: registered.data.user, project: projects.data.projects[0] };
  }

  return { request, account, login };
}

function assertProjection(result, table, expectedColumns) {
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.table, { id: table, name: table, schema: 'auth' });
  assert.deepEqual(result.data.columns.map(column => column.name), expectedColumns);
  for (const row of result.data.rows) assert.deepEqual(Object.keys(row).sort(), [...expectedColumns].sort());
  const serialized = JSON.stringify(result.data);
  for (const forbidden of ['"password_hash"', '"refresh_hash"', '"password"', '"token"', PASSWORD]) {
    assert.equal(serialized.includes(forbidden), false, `Response must exclude ${forbidden}`);
  }
  assert.doesNotMatch(serialized, /\$2[aby]\$\d{2}\$/);
}

test('main and auth table namespaces are distinct and auth counts include only the current owner', async t => {
  const { request, account } = fixture(t);
  const alice = await account('alice@example.com');
  await account('bob@example.com');
  const base = `/api/projects/${alice.project.id}/tables`;
  const main = await request(base, { token: alice.token });
  const explicitMain = await request(`${base}?schema=main`, { token: alice.token });
  assert.equal(main.status, 200);
  assert.deepEqual(explicitMain, main);
  assert.deepEqual(main.data.tables.map(table => table.id).sort(), ['customers', 'orders', 'products']);
  assert.ok(main.data.tables.every(table => table.schema === 'main' && table.rowCount === 3));
  const auth = await request(`${base}?schema=auth`, { token: alice.token });
  assert.equal(auth.status, 200);
  assert.deepEqual(auth.data.tables.map(table => table.id).sort(), ['sessions', 'users']);
  assert.ok(auth.data.tables.every(table => table.schema === 'auth' && table.rowCount === 1));
  assert.equal((await request(`${base}/users/rows`, { token: alice.token })).status, 404);
  assert.equal((await request(`${base}/sessions/rows?schema=main`, { token: alice.token })).status, 404);
  assert.equal((await request(`${base}/products/rows?schema=auth`, { token: alice.token })).status, 404);
  const product = await request(`${base}/products/rows`, { token: alice.token });
  assert.equal(product.status, 200);
  assert.equal(product.data.table.schema, 'main');
  assert.equal(product.data.rowCount, 3);
});

test('auth rows expose safe owner projections without another account or credential hashes', async t => {
  const { request, account, login } = fixture(t);
  const alice = await account('alice@example.com');
  const secondAliceToken = await login(alice.user.email);
  const bob = await account('bob@example.com');
  const base = `/api/projects/${alice.project.id}/tables`;
  const users = await request(`${base}/users/rows?schema=auth`, { token: alice.token });
  assertProjection(users, 'users', USER_COLUMNS);
  assert.deepEqual(users.data.rows, [{ id: alice.user.id, name: alice.user.name, email: alice.user.email, created_at: alice.user.createdAt }]);
  assert.equal(users.data.rowCount, 1);
  const sessions = await request(`${base}/sessions/rows?schema=auth`, { token: alice.token });
  assertProjection(sessions, 'sessions', SESSION_COLUMNS);
  assert.equal(sessions.data.rowCount, 2);
  assert.deepEqual(sessions.data.rows.map(row => row.id).sort(), [sessionId(alice.token), sessionId(secondAliceToken)].sort());
  for (const row of sessions.data.rows) {
    assert.equal(row.user_id, alice.user.id);
    assert.equal(Number.isInteger(row.expires_at), true);
    assert.equal(row.revoked_at, null);
  }
  const bobSessions = await request(`/api/projects/${bob.project.id}/tables/sessions/rows?schema=auth`, { token: bob.token });
  assertProjection(bobSessions, 'sessions', SESSION_COLUMNS);
  assert.deepEqual(bobSessions.data.rows.map(row => row.id), [sessionId(bob.token)]);
  assert.equal(JSON.stringify(users.data).includes(bob.user.email), false);
  assert.equal(JSON.stringify(sessions.data).includes(bob.user.id), false);
  for (const suffix of ['?schema=auth', '/users/rows?schema=auth', '/sessions/rows?schema=auth', '?schema=invalid']) {
    assert.equal((await request(`${base}${suffix}`, { token: bob.token })).status, 404);
  }
  assert.equal((await request(`/api/projects/${MISSING_ID}/tables?schema=auth`, { token: alice.token })).status, 404);
});

test('auth session pages include revoked history with stable pagination and safe integer timestamps', async t => {
  const { request, account, login } = fixture(t);
  const alice = await account();
  const revokedToken = await login(alice.user.email);
  const thirdToken = await login(alice.user.email);
  const revoke = await request(`/api/projects/${alice.project.id}/auth/sessions/${sessionId(revokedToken)}`, { token: alice.token, method: 'DELETE' });
  assert.equal(revoke.status, 200);
  assert.equal((await request('/api/auth/me', { token: revokedToken })).status, 401);
  const base = `/api/projects/${alice.project.id}/tables/sessions/rows?schema=auth`;
  const rows = [];
  for (let page = 1; page <= 3; page++) {
    const result = await request(`${base}&page=${page}&pageSize=1`, { token: alice.token });
    assertProjection(result, 'sessions', SESSION_COLUMNS);
    assert.equal(result.data.page, page);
    assert.equal(result.data.pageSize, 1);
    assert.equal(result.data.rowCount, 3);
    assert.equal(result.data.totalPages, 3);
    assert.equal(result.data.rows.length, 1);
    rows.push(result.data.rows[0]);
  }
  assert.deepEqual(rows.map(row => row.id), [sessionId(alice.token), sessionId(revokedToken), sessionId(thirdToken)].sort());
  assert.equal(Number.isInteger(rows.find(row => row.id === sessionId(revokedToken)).revoked_at), true);
  assert.ok(rows.filter(row => row.id !== sessionId(revokedToken)).every(row => row.revoked_at === null));
  const beyond = await request(`${base}&page=4&pageSize=1`, { token: alice.token });
  assert.equal(beyond.status, 200);
  assert.deepEqual(beyond.data.rows, []);
  const tables = await request(`/api/projects/${alice.project.id}/tables?schema=auth`, { token: alice.token });
  assert.equal(tables.data.tables.find(table => table.id === 'sessions').rowCount, 3);
});

test('auth search uses visible fields, matches case insensitively, and escapes SQL and LIKE syntax', async t => {
  const { request, account } = fixture(t);
  const alice = await account('alice@example.com');
  const bob = await account('bob@example.com');
  const base = `/api/projects/${alice.project.id}/tables`;
  const found = await request(`${base}/users/rows?schema=auth&search=ALICE%40EXAMPLE.COM`, { token: alice.token });
  assertProjection(found, 'users', USER_COLUMNS);
  assert.equal(found.data.rows[0].id, alice.user.id);
  const session = await request(`${base}/sessions/rows?schema=auth&search=${sessionId(alice.token)}`, { token: alice.token });
  assertProjection(session, 'sessions', SESSION_COLUMNS);
  assert.equal(session.data.rowCount, 1);
  for (const table of ['users', 'sessions']) {
    for (const search of ['%', '_', "' OR 1=1 --", bob.user.id, PASSWORD]) {
      const result = await request(`${base}/${table}/rows?schema=auth&search=${encodeURIComponent(search)}`, { token: alice.token });
      assert.equal(result.status, 200);
      assert.equal(result.data.rowCount, 0, `${table}: ${search}`);
      assert.deepEqual(result.data.rows, []);
    }
  }
  for (const query of ['page=0', 'page=1.5', 'pageSize=101', `search=${'x'.repeat(201)}`]) {
    assert.equal((await request(`${base}/sessions/rows?schema=auth&${query}`, { token: alice.token })).status, 400, query);
  }
});

test('auth namespace endpoints require a valid bearer session', async t => {
  const { request } = fixture(t);
  const base = `/api/projects/${MISSING_ID}/tables`;
  for (const suffix of ['?schema=auth', '/users/rows?schema=auth', '/sessions/rows?schema=auth']) {
    assert.equal((await request(`${base}${suffix}`)).status, 401);
    assert.equal((await request(`${base}${suffix}`, { token: 'invalid-token' })).status, 401);
  }
});

test('schema and table allowlists reject unexpected identifiers without exposing internal auth storage', async t => {
  const { request, account } = fixture(t);
  const alice = await account();
  const base = `/api/projects/${alice.project.id}/tables`;
  for (const name of ['public', 'AUTH', 'sqlite_master', 'auth.users', 'auth; DROP TABLE users;--', "main' OR 1=1 --", 'auth\0']) {
    const query = `schema=${encodeURIComponent(name)}`;
    assert.equal((await request(`${base}?${query}`, { token: alice.token })).status, 400, name);
    assert.equal((await request(`${base}/users/rows?${query}`, { token: alice.token })).status, 400, name);
  }
  for (const table of ['password_hash', 'refresh_hash', 'rate_limits', 'storage_objects', 'sqlite_master', 'main.users', 'users; DROP TABLE users;--', 'users" OR 1=1 --']) {
    assert.equal((await request(`${base}/${encodeURIComponent(table)}/rows?schema=auth`, { token: alice.token })).status, 404, table);
  }
  assert.equal((await request('/api/auth/me', { token: alice.token })).status, 200);
  const users = await request(`${base}/users/rows?schema=auth`, { token: alice.token });
  assertProjection(users, 'users', USER_COLUMNS);
  assert.equal(users.data.rowCount, 1);
});
