import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { handleApi } from './worker.js';
import { createTestD1 } from './test-d1.mjs';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const PASSWORD = 'application-test-password-123!';
const SECRET = 'application-auth-integration-secret-at-least-32-characters';
const ORIGIN = 'https://grupedia.test';
let ipSequence = 0;

function claims(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
}

/** Independently sign an HS256 JWT to test expiry validation, not the worker signer. */
function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function assertPublicResponse(result) {
  assert.equal(result.response.headers.get('Set-Cookie'), null);
  assert.equal(result.response.headers.get('Access-Control-Allow-Credentials'), null);
  assert.match(result.response.headers.get('Cache-Control'), /no-store/);
  assert.match(result.response.headers.get('Vary'), /Origin/i);
}

function assertSafeUser(user) {
  assert.equal(typeof user.id, 'string');
  assert.equal(typeof user.email, 'string');
  const value = JSON.stringify(user);
  assert.doesNotMatch(value, /password|refresh_hash|\$2[aby]\$/i);
}

function fixture(t) {
  const env = { DB: createTestD1(schema), JWT_SECRET: SECRET };
  t.after(() => env.DB.close());

  async function request(path, options = {}) {
    const headers = new Headers({ 'CF-Connecting-IP': options.ip || `203.0.113.${(++ipSequence % 250) + 1}` });
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    if (options.origin !== undefined) headers.set('Origin', options.origin);
    if (options.body !== undefined) headers.set('Content-Type', options.contentType || 'application/json');
    for (const [name, value] of Object.entries(options.headers || {})) headers.set(name, value);
    const response = await handleApi(new Request(new URL(path, ORIGIN), {
      method: options.method || (options.body === undefined ? 'GET' : 'POST'),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }), env);
    const text = await response.text();
    return { response, status: response.status, data: text ? JSON.parse(text) : null };
  }

  async function builder(email = 'owner@example.com') {
    const registered = await request('/api/auth/register', { body: { name: 'App Builder', email, password: PASSWORD } });
    assert.equal(registered.status, 201);
    const signedIn = await request('/api/auth/login', { body: { email, password: PASSWORD } });
    assert.equal(signedIn.status, 200);
    const projects = await request('/api/projects', { token: signedIn.data.token });
    assert.equal(projects.status, 200);
    return { user: registered.data.user, token: signedIn.data.token, project: projects.data.projects[0] };
  }

  async function anotherProject(owner) {
    const project = { id: crypto.randomUUID(), name: 'Second application' };
    // There is no public project-creation API. This fixture creates a second owned
    // project in the actual database so tests can distinguish project from owner scope.
    await env.DB.prepare('INSERT INTO projects (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
      .bind(project.id, owner.user.id, project.name, new Date().toISOString()).run();
    return project;
  }

  const base = project => `/api/apps/${project.id}/auth`;
  const register = (project, body, options = {}) => request(`${base(project)}/register`, { body, ...options });
  const login = (project, email, password = PASSWORD, options = {}) => request(`${base(project)}/login`, { body: { email, password }, ...options });

  async function appUser(project, email = 'member@example.com', options = {}) {
    const registered = await register(project, { name: 'Application Member', email, password: PASSWORD }, options);
    assert.equal(registered.status, 201);
    const signedIn = await login(project, email, PASSWORD, options);
    assert.equal(signedIn.status, 200);
    return { ...signedIn.data, user: signedIn.data.user, base: base(project) };
  }

  return { env, request, builder, anotherProject, base, register, login, appUser };
}

test('the same email creates independent builder and app identities in two projects owned by one builder', async t => {
  const { request, builder, anotherProject, appUser } = fixture(t);
  const owner = await builder('same@example.com');
  const second = await anotherProject(owner);
  for (const project of [owner.project, second]) {
    const empty = await request(`/api/projects/${project.id}/auth`, { token: owner.token });
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.data.users, []);
    assert.deepEqual(empty.data.sessions, []);
  }
  const firstUser = await appUser(owner.project, owner.user.email);
  const secondUser = await appUser(second, owner.user.email);
  assert.equal(new Set([owner.user.id, firstUser.user.id, secondUser.user.id]).size, 3);
  assert.notEqual(firstUser.access_token, secondUser.access_token);
  for (const [project, member] of [[owner.project, firstUser], [second, secondUser]]) {
    const overview = await request(`/api/projects/${project.id}/auth`, { token: owner.token });
    assert.deepEqual(overview.data.users.map(user => user.id), [member.user.id]);
    const directory = await request(`/api/projects/${project.id}/tables/users/rows?schema=auth`, { token: owner.token });
    assert.equal(directory.status, 200);
    assert.deepEqual(directory.data.rows.map(user => user.id), [member.user.id]);
    assertSafeUser(member.user);
  }
});

test('public registration validates input, normalizes email, rejects project duplicates, and issues no tokens or cookies', async t => {
  const { builder, register, base, request } = fixture(t);
  const owner = await builder();
  for (const body of [
    { email: 'invalid', password: PASSWORD },
    { email: 'short@example.com', password: 'short' },
    { email: 'long@example.com', password: 'é'.repeat(37) },
    { email: 'name@example.com', password: PASSWORD, name: 'x'.repeat(81) },
    { email: 'control@example.com', password: PASSWORD, name: 'bad\nname' },
  ]) assert.equal((await register(owner.project, body)).status, 400);
  const result = await register(owner.project, { email: '  MEMBER@EXAMPLE.COM  ', password: PASSWORD });
  assert.equal(result.status, 201);
  assert.deepEqual(Object.keys(result.data), ['user']);
  assert.equal(result.data.user.email, 'member@example.com');
  assertSafeUser(result.data.user);
  assertPublicResponse(result);
  assert.equal((await register(owner.project, { email: 'member@example.com', password: PASSWORD })).status, 409);
  assert.equal((await request(`${base(owner.project)}/register`, { body: { email: 'type@example.com', password: PASSWORD }, contentType: 'text/plain' })).status, 415);
  assert.equal((await register(owner.project, { email: 'large@example.com', password: PASSWORD, name: 'x'.repeat(17000) })).status, 413);
});

test('wrong passwords and unknown app accounts return the same failure and create no app sessions', async t => {
  const { builder, register, login, request } = fixture(t);
  const owner = await builder();
  assert.equal((await register(owner.project, { email: 'member@example.com', password: PASSWORD })).status, 201);
  const wrong = await login(owner.project, 'member@example.com', 'incorrect-password');
  const unknown = await login(owner.project, 'missing@example.com', 'incorrect-password');
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.data, unknown.data);
  assert.equal(wrong.data.access_token, undefined);
  assertPublicResponse(wrong);
  const overview = await request(`/api/projects/${owner.project.id}/auth`, { token: owner.token });
  assert.deepEqual(overview.data.sessions, []);
});

test('builder and app JWTs cannot cross API boundaries or authenticate to another project', async t => {
  const { builder, anotherProject, appUser, request, base } = fixture(t);
  const owner = await builder();
  const second = await anotherProject(owner);
  const member = await appUser(owner.project);
  assert.equal(member.token_type, 'bearer');
  assert.equal(member.expires_in, 900);
  const payload = claims(member.access_token);
  assert.equal(payload.iss, 'grupedia-app');
  assert.equal(payload.aud, `grupedia-app:${owner.project.id}`);
  assert.equal(payload.project_id, owner.project.id);
  assert.equal(payload.sub, member.user.id);
  assert.equal(payload.exp - payload.iat, 900);
  for (const path of ['/api/projects', '/api/auth/me', `/api/projects/${owner.project.id}/auth`, `/api/projects/${owner.project.id}/tables?schema=auth`, `/api/projects/${owner.project.id}/storage/buckets`]) {
    assert.equal((await request(path, { token: member.access_token })).status, 401, path);
  }
  assert.equal((await request(`${member.base}/me`, { token: owner.token })).status, 401);
  assert.equal((await request(`${base(second)}/me`, { token: member.access_token })).status, 401);
  assert.equal((await request(`${base(second)}/refresh`, { body: { refresh_token: member.refresh_token } })).status, 401);
  const valid = await request(`${member.base}/me`, { token: member.access_token });
  assert.equal(valid.status, 200);
  assert.equal(valid.data.user.id, member.user.id);
  assertPublicResponse(valid);
  assert.equal((await request(`${member.base}/refresh`, { body: { refresh_token: member.refresh_token } })).status, 200);
});

test('refresh tokens rotate atomically, reject replay, and preserve the original absolute session expiry', async t => {
  const { env, builder, appUser, request } = fixture(t);
  const owner = await builder();
  const member = await appUser(owner.project);
  const sid = claims(member.access_token).sid;
  const original = await env.DB.prepare('SELECT expires_at FROM app_auth_sessions WHERE id = ?').bind(sid).first();
  const results = await Promise.all([
    request(`${member.base}/refresh`, { body: { refresh_token: member.refresh_token } }),
    request(`${member.base}/refresh`, { body: { refresh_token: member.refresh_token } }),
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 401]);
  const rotated = results.find(result => result.status === 200);
  assert.notEqual(rotated.data.refresh_token, member.refresh_token);
  assert.equal(claims(rotated.data.access_token).sid, sid);
  assertPublicResponse(rotated);
  assert.equal((await request(`${member.base}/refresh`, { body: { refresh_token: member.refresh_token } })).status, 401);
  const persisted = await env.DB.prepare('SELECT expires_at FROM app_auth_sessions WHERE id = ?').bind(sid).first();
  assert.equal(persisted.expires_at, original.expires_at);
  assert.equal((await request(`${member.base}/me`, { token: rotated.data.access_token })).status, 200);
  await env.DB.prepare('UPDATE app_auth_sessions SET expires_at = ? WHERE id = ?').bind(Math.floor(Date.now() / 1000) - 1, sid).run();
  assert.equal((await request(`${member.base}/refresh`, { body: { refresh_token: rotated.data.refresh_token } })).status, 401);
  assert.equal((await request(`${member.base}/me`, { token: rotated.data.access_token })).status, 401);
});

test('logout requires matching app credentials and revokes only their session without affecting the builder', async t => {
  const { builder, appUser, login, request } = fixture(t);
  const owner = await builder();
  const member = await appUser(owner.project);
  const other = await login(owner.project, member.user.email);
  assert.equal(other.status, 200);
  assert.equal((await request(`${member.base}/logout`, { method: 'POST' })).status, 401);
  assert.equal((await request(`${member.base}/logout`, { token: member.access_token, body: { refresh_token: other.data.refresh_token } })).status, 401);
  assert.equal((await request(`${member.base}/me`, { token: member.access_token })).status, 200);
  const signedOut = await request(`${member.base}/logout`, { token: member.access_token, body: { refresh_token: member.refresh_token } });
  assert.equal(signedOut.status, 200);
  assertPublicResponse(signedOut);
  assert.equal((await request(`${member.base}/me`, { token: member.access_token })).status, 401);
  assert.equal((await request(`${member.base}/refresh`, { body: { refresh_token: member.refresh_token } })).status, 401);
  assert.equal((await request(`${member.base}/me`, { token: other.data.access_token })).status, 200);
  assert.equal((await request(`${member.base}/logout`, { body: { refresh_token: other.data.refresh_token } })).status, 200);
  assert.equal((await request(`${member.base}/me`, { token: other.data.access_token })).status, 401);
  assert.equal((await request('/api/auth/me', { token: owner.token })).status, 200);
});

test('tampered, expired, and wrongly scoped app JWTs are rejected by the public me endpoint', async t => {
  const { builder, appUser, request } = fixture(t);
  const owner = await builder();
  const member = await appUser(owner.project);
  const payload = claims(member.access_token);
  const parts = member.access_token.split('.');
  const tampered = `${parts[0]}.${Buffer.from(JSON.stringify({ ...payload, sub: crypto.randomUUID() })).toString('base64url')}.${parts[2]}`;
  const now = Math.floor(Date.now() / 1000);
  for (const token of [tampered, signToken({ ...payload, iat: now - 1000, exp: now - 100 }), signToken({ ...payload, aud: 'grupedia-dashboard' })]) {
    assert.equal((await request(`${member.base}/me`, { token })).status, 401);
  }
  const expired = signToken({ ...payload, iat: now - 1000, exp: now - 100 });
  assert.equal((await request(`${member.base}/logout`, { token: tampered, body: { refresh_token: member.refresh_token } })).status, 401);
  assert.equal((await request(`${member.base}/logout`, { token: expired, body: { refresh_token: member.refresh_token } })).status, 200);
});

test('configured external app origins support register, login, me, refresh, logout, and credential-free preflight', async t => {
  const { builder, request, register, login, base } = fixture(t);
  const owner = await builder();
  const appOrigin = 'https://my-application.example';
  const configured = await request(`/api/projects/${owner.project.id}/auth/settings`, {
    token: owner.token, method: 'PUT', body: { allowedOrigins: [appOrigin], signupEnabled: true },
  });
  assert.equal(configured.status, 200);
  const preflight = await request(`${base(owner.project)}/login`, { method: 'OPTIONS', origin: appOrigin, headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type, Authorization' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.response.headers.get('Access-Control-Allow-Origin'), appOrigin);
  assert.match(preflight.response.headers.get('Access-Control-Allow-Methods'), /POST/);
  assert.match(preflight.response.headers.get('Access-Control-Allow-Headers'), /Authorization/i);
  assertPublicResponse(preflight);
  const created = await register(owner.project, { email: 'external@example.com', password: PASSWORD }, { origin: appOrigin });
  assert.equal(created.status, 201);
  const signedIn = await login(owner.project, 'external@example.com', PASSWORD, { origin: appOrigin });
  assert.equal(signedIn.status, 200);
  const me = await request(`${base(owner.project)}/me`, { token: signedIn.data.access_token, origin: appOrigin });
  assert.equal(me.status, 200);
  const refreshed = await request(`${base(owner.project)}/refresh`, { body: { refresh_token: signedIn.data.refresh_token }, origin: appOrigin });
  assert.equal(refreshed.status, 200);
  const signedOut = await request(`${base(owner.project)}/logout`, { token: refreshed.data.access_token, origin: appOrigin, method: 'POST' });
  assert.equal(signedOut.status, 200);
  for (const result of [created, signedIn, me, refreshed, signedOut]) {
    assert.equal(result.response.headers.get('Access-Control-Allow-Origin'), appOrigin);
    assertPublicResponse(result);
  }
  for (const origin of ['https://unlisted.example', 'null']) {
    const denied = await register(owner.project, { email: 'blocked@example.com', password: PASSWORD }, { origin });
    assert.equal(denied.status, 403);
    assert.equal(denied.response.headers.get('Access-Control-Allow-Origin'), null);
    assert.equal((await request(`${base(owner.project)}/me`, { token: signedIn.data.access_token, origin })).status, 403);
    assert.equal((await request(`${base(owner.project)}/login`, { method: 'OPTIONS', origin })).status, 403);
  }
  const directory = await request(`/api/projects/${owner.project.id}/tables/users/rows?schema=auth`, { token: owner.token });
  assert.equal(directory.data.rowCount, 1);
  assert.equal((await request(`/api/projects/${owner.project.id}/auth/settings`, { token: owner.token, method: 'PUT', body: { allowedOrigins: [], signupEnabled: true }, origin: appOrigin })).status, 403);
});

test('origin settings reject wildcards and unsafe URLs, canonicalize allowed origins, and can remove access', async t => {
  const { builder, request, base } = fixture(t);
  const owner = await builder();
  const settingsPath = `/api/projects/${owner.project.id}/auth/settings`;
  for (const origin of ['*', 'http://outside.example', 'https://user:secret@example.com', 'https://example.com/path', 'https://example.com?query=1', 'https://example.com#fragment', 'http://localhost', 'https://*.example.com', 'null']) {
    assert.equal((await request(settingsPath, { token: owner.token, method: 'PUT', body: { allowedOrigins: [origin], signupEnabled: true } })).status, 400, origin);
  }
  assert.equal((await request(settingsPath, { token: owner.token, method: 'PUT', body: { allowedOrigins: Array.from({ length: 11 }, (_, index) => `https://app-${index}.example`), signupEnabled: true } })).status, 400);
  assert.equal((await request(settingsPath, { token: owner.token, method: 'PUT', body: { allowedOrigins: [], signupEnabled: 'false' } })).status, 400);
  const valid = await request(settingsPath, { token: owner.token, method: 'PUT', body: { allowedOrigins: ['https://EXAMPLE.com/', 'https://example.com', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://[::1]:8787'], signupEnabled: true } });
  assert.equal(valid.status, 200);
  assert.deepEqual(valid.data.settings.allowedOrigins, ['https://example.com', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://[::1]:8787']);
  assert.equal((await request(`${base(owner.project)}/login`, { method: 'OPTIONS', origin: 'https://example.com' })).status, 204);
  assert.equal((await request(settingsPath, { token: owner.token, method: 'PUT', body: { allowedOrigins: [], signupEnabled: true } })).status, 200);
  assert.equal((await request(`${base(owner.project)}/login`, { method: 'OPTIONS', origin: 'https://example.com' })).status, 403);
});

test('disabled public signup still allows owner-created app users to sign in and rejects non-owner administration', async t => {
  const { builder, request, register, login } = fixture(t);
  const owner = await builder('owner@example.com');
  const outsider = await builder('outsider@example.com');
  const admin = `/api/projects/${owner.project.id}/auth`;
  assert.equal((await request(`${admin}/settings`, { token: owner.token, method: 'PUT', body: { allowedOrigins: [], signupEnabled: false } })).status, 200);
  assert.equal((await register(owner.project, { email: 'public@example.com', password: PASSWORD })).status, 403);
  const body = { name: 'Invited Member', email: 'invited@example.com', password: PASSWORD };
  assert.equal((await request(`${admin}/users`, { token: outsider.token, body })).status, 404);
  assert.equal((await request(`${admin}/settings`, { token: outsider.token, method: 'PUT', body: { allowedOrigins: [], signupEnabled: true } })).status, 404);
  const created = await request(`${admin}/users`, { token: owner.token, body });
  assert.equal(created.status, 201);
  assertSafeUser(created.data.user);
  assert.notEqual(created.data.user.id, owner.user.id);
  const signedIn = await login(owner.project, body.email);
  assert.equal(signedIn.status, 200);
  assert.equal(signedIn.data.user.id, created.data.user.id);
  const overview = await request(admin, { token: owner.token });
  assert.equal(overview.data.settings.signupEnabled, false);
  assert.deepEqual(overview.data.users.map(user => user.id), [created.data.user.id]);
});

test('app registration and login rate limits return retry guidance without creating extra sessions', async t => {
  const { builder, register, login, request } = fixture(t);
  const owner = await builder();
  const email = 'limited@example.com';
  assert.equal((await register(owner.project, { email, password: PASSWORD })).status, 201);
  assert.equal((await register(owner.project, { email, password: PASSWORD })).status, 409);
  assert.equal((await register(owner.project, { email, password: PASSWORD })).status, 409);
  const blockedRegistration = await register(owner.project, { email, password: PASSWORD });
  assert.equal(blockedRegistration.status, 429);
  assert.ok(Number(blockedRegistration.response.headers.get('Retry-After')) > 0);
  for (let index = 0; index < 5; index++) assert.equal((await login(owner.project, email, 'incorrect-password')).status, 401);
  const blockedLogin = await login(owner.project, email, 'incorrect-password');
  assert.equal(blockedLogin.status, 429);
  assert.ok(Number(blockedLogin.response.headers.get('Retry-After')) > 0);
  const overview = await request(`/api/projects/${owner.project.id}/auth`, { token: owner.token });
  assert.deepEqual(overview.data.sessions, []);
});

test('project user and per-user active-session caps are enforced atomically without affecting another project', async t => {
  const { env, builder, anotherProject, appUser, register, login } = fixture(t);
  const owner = await builder();
  const member = await appUser(owner.project);
  const createdAt = new Date().toISOString();
  // Fixture rows establish a quota boundary without hashing 999 unused passwords.
  const users = Array.from({ length: 999 }, (_, index) => env.DB.prepare('INSERT INTO app_auth_users (id, project_id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), owner.project.id, 'Quota fixture', `fixture-${index}@example.com`, 'unusable-fixture-password-hash', createdAt));
  await env.DB.batch(users);
  assert.equal((await register(owner.project, { email: 'over-cap@example.com', password: PASSWORD })).status, 409);
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const sessions = Array.from({ length: 18 }, () => env.DB.prepare('INSERT INTO app_auth_sessions (id, project_id, user_id, refresh_hash, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), owner.project.id, member.user.id, crypto.randomUUID().replaceAll('-', '').repeat(2), expiresAt, createdAt, createdAt));
  await env.DB.batch(sessions);
  const attempts = await Promise.all([login(owner.project, member.user.email), login(owner.project, member.user.email)]);
  assert.deepEqual(attempts.map(result => result.status).sort(), [200, 429]);
  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM app_auth_sessions WHERE project_id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > ?').bind(owner.project.id, member.user.id, Math.floor(Date.now() / 1000)).first();
  assert.equal(count.total, 20);
  const second = await anotherProject(owner);
  assert.equal((await register(second, { email: member.user.email, password: PASSWORD })).status, 201);
});
