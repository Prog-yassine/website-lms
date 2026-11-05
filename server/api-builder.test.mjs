import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { handleApi } from './worker.js';
import { createTestD1 } from './test-d1.mjs';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const PASSWORD = 'api-builder-test-password-123!';
const ORIGIN = 'https://grupedia.test';
let ipSequence = 0;

function definition(overrides = {}) {
  return {
    name: 'Product listing', path: '/products', method: 'GET', table: 'products',
    columns: ['id', 'name', 'price', 'stock', 'status'], filters: [],
    orderBy: { column: 'id', direction: 'asc' }, limit: 25,
    access: 'developer', include: [], ...overrides,
  };
}

function fixture(t) {
  const env = { DB: createTestD1(schema), JWT_SECRET: 'api-builder-integration-secret-at-least-32-characters' };
  t.after(() => env.DB.close());

  async function request(path, options = {}) {
    const headers = new Headers({ 'CF-Connecting-IP': `198.51.100.${(++ipSequence % 250) + 1}` });
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    if (options.origin !== undefined) headers.set('Origin', options.origin);
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    for (const [name, value] of Object.entries(options.headers || {})) headers.set(name, value);
    const response = await handleApi(new Request(new URL(path, ORIGIN), {
      method: options.method || (options.body === undefined ? 'GET' : 'POST'),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }), env);
    const text = await response.text();
    return { response, status: response.status, data: text ? JSON.parse(text) : null };
  }

  async function owner(email = 'owner@example.com') {
    const registered = await request('/api/auth/register', { body: { name: 'API Builder', email, password: PASSWORD } });
    assert.equal(registered.status, 201);
    const login = await request('/api/auth/login', { body: { email, password: PASSWORD } });
    assert.equal(login.status, 200);
    const projects = await request('/api/projects', { token: login.data.token });
    assert.equal(projects.status, 200);
    const project = projects.data.projects[0];
    return { user: registered.data.user, token: login.data.token, project, admin: `/api/projects/${project.id}/api-builder`, runtime: `/api/apps/${project.id}/data` };
  }

  async function anotherProject(builder) {
    const project = { id: crypto.randomUUID(), name: 'Second app' };
    await env.DB.prepare('INSERT INTO projects (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
      .bind(project.id, builder.user.id, project.name, new Date().toISOString()).run();
    return { ...builder, project, admin: `/api/projects/${project.id}/api-builder`, runtime: `/api/apps/${project.id}/data` };
  }

  async function appUser(builder, email = 'member@example.com') {
    const base = `/api/apps/${builder.project.id}/auth`;
    assert.equal((await request(`${base}/register`, { body: { email, password: PASSWORD } })).status, 201);
    const login = await request(`${base}/login`, { body: { email, password: PASSWORD } });
    assert.equal(login.status, 200);
    return login.data;
  }

  async function create(builder, value = definition()) {
    const result = await request(`${builder.admin}/endpoints`, { token: builder.token, body: { definition: value } });
    assert.equal(result.status, 201);
    return result.data.endpoint;
  }

  async function publish(builder, endpoint) {
    const result = await request(`${builder.admin}/endpoints/${endpoint.id}/publish`, { token: builder.token, body: { revision: endpoint.revision } });
    assert.equal(result.status, 200);
    return result.data.endpoint;
  }

  async function createPublished(builder, value = definition()) {
    return publish(builder, await create(builder, value));
  }

  return { env, request, owner, anotherProject, appUser, create, publish, createPublished };
}

function assertNoSql(result) {
  assert.equal(Object.hasOwn(result.data, 'sql'), false);
  assert.equal(Object.hasOwn(result.data, 'parameters'), false);
  assert.equal(JSON.stringify(result.data).includes('password_hash'), false);
  assert.equal(JSON.stringify(result.data).includes('refresh_hash'), false);
}

test('API Builder administration is owner-only and its catalog excludes authentication and internal tables', async t => {
  const { request, owner, appUser } = fixture(t);
  const alice = await owner('alice@example.com');
  const bob = await owner('bob@example.com');
  const member = await appUser(alice);
  for (const suffix of ['/catalog', '/endpoints']) {
    assert.equal((await request(`${alice.admin}${suffix}`)).status, 401);
    assert.equal((await request(`${alice.admin}${suffix}`, { token: member.access_token })).status, 401);
    assert.equal((await request(`${alice.admin}${suffix}`, { token: bob.token })).status, 404);
  }
  const catalog = await request(`${alice.admin}/catalog`, { token: alice.token });
  assert.equal(catalog.status, 200);
  assert.deepEqual(catalog.data.tables.map(table => table.id).sort(), ['customers', 'orders', 'products']);
  assert.equal(JSON.stringify(catalog.data).includes('password_hash'), false);
  assert.equal(JSON.stringify(catalog.data).includes('refresh_hash'), false);
  const endpoints = await request(`${alice.admin}/endpoints`, { token: alice.token });
  assert.equal(endpoints.status, 200);
  assert.deepEqual(endpoints.data.endpoints, []);
  assert.equal((await request(`${alice.admin}/endpoints`, { token: bob.token, body: { definition: definition() } })).status, 404);
  assert.equal((await request(`${alice.admin}/test`, { token: member.access_token, body: { definition: definition() } })).status, 401);
});

test('draft edits persist without changing a published route until its new snapshot is published', async t => {
  const { request, owner, create, publish } = fixture(t);
  const builder = await owner();
  let endpoint = await create(builder);
  assert.equal(endpoint.isPublished, false);
  assert.equal(endpoint.publishedDefinition, null);
  assert.ok(Number.isInteger(endpoint.revision));
  const unavailable = await request(`${builder.runtime}/products`, { token: builder.token });
  assert.equal(unavailable.status, 404);
  assert.equal(JSON.stringify(unavailable.data).includes('Product listing'), false);
  endpoint = await publish(builder, endpoint);
  assert.equal(endpoint.isPublished, true);
  assert.equal(endpoint.hasUnpublishedChanges, false);
  const originalSnapshot = structuredClone(endpoint.publishedDefinition);
  const original = await request(`${builder.runtime}/products`, { token: builder.token });
  assert.equal(original.status, 200);
  assert.equal(original.data.data.length, 3);
  assertNoSql(original);
  const editedDefinition = definition({ path: '/filtered-products', columns: ['name'], filters: [{ column: 'price', operator: 'gt', source: 'literal', value: 1000000, required: false }] });
  const edited = await request(`${builder.admin}/endpoints/${endpoint.id}`, { token: builder.token, method: 'PUT', body: { definition: editedDefinition, revision: endpoint.revision } });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.endpoint.revision, endpoint.revision + 1);
  assert.equal(edited.data.endpoint.hasUnpublishedChanges, true);
  assert.deepEqual(edited.data.endpoint.publishedDefinition, originalSnapshot);
  assert.equal(edited.data.endpoint.runtimeUrl, endpoint.runtimeUrl);
  const listing = await request(`${builder.admin}/endpoints`, { token: builder.token });
  assert.deepEqual(listing.data.endpoints.find(item => item.id === endpoint.id).definition, edited.data.endpoint.definition);
  assert.deepEqual((await request(`${builder.runtime}/products`, { token: builder.token })).data, original.data);
  assert.equal((await request(`${builder.runtime}/filtered-products`, { token: builder.token })).status, 404);
  endpoint = await publish(builder, edited.data.endpoint);
  assert.equal((await request(`${builder.runtime}/products`, { token: builder.token })).status, 404);
  const changed = await request(`${builder.runtime}/filtered-products`, { token: builder.token });
  assert.equal(changed.status, 200);
  assert.deepEqual(changed.data.data, []);
  const unpublished = await request(`${builder.admin}/endpoints/${endpoint.id}/unpublish`, { token: builder.token, body: { revision: endpoint.revision } });
  assert.equal(unpublished.status, 200);
  assert.equal(unpublished.data.endpoint.isPublished, false);
  assert.equal((await request(`${builder.runtime}/filtered-products`, { token: builder.token })).status, 404);
});

test('revision compare-and-swap rejects concurrent saves and stale publish, unpublish, and delete requests', async t => {
  const { request, owner, create } = fixture(t);
  const builder = await owner();
  const endpoint = await create(builder);
  const saves = await Promise.all(['First edit', 'Second edit'].map(name => request(`${builder.admin}/endpoints/${endpoint.id}`, {
    token: builder.token, method: 'PUT', body: { definition: definition({ name }), revision: endpoint.revision },
  })));
  assert.deepEqual(saves.map(result => result.status).sort(), [200, 409]);
  const saved = saves.find(result => result.status === 200).data.endpoint;
  assert.equal(saved.revision, endpoint.revision + 1);
  for (const action of ['publish', 'unpublish']) {
    assert.equal((await request(`${builder.admin}/endpoints/${endpoint.id}/${action}`, { token: builder.token, body: { revision: endpoint.revision } })).status, 409);
  }
  assert.equal((await request(`${builder.admin}/endpoints/${endpoint.id}?revision=${endpoint.revision}`, { token: builder.token, method: 'DELETE' })).status, 409);
  const listing = await request(`${builder.admin}/endpoints`, { token: builder.token });
  assert.equal(listing.data.endpoints.length, 1);
  assert.equal(listing.data.endpoints[0].definition.name, saved.definition.name);
  assert.equal(listing.data.endpoints[0].isPublished, false);
});

test('published route collisions are scoped by project and method and unpublishing releases a route', async t => {
  const { request, owner, anotherProject, create, publish, createPublished } = fixture(t);
  const builder = await owner();
  const first = await createPublished(builder);
  const duplicate = await create(builder, definition({ name: 'Competing route' }));
  assert.equal((await request(`${builder.admin}/endpoints/${duplicate.id}/publish`, { token: builder.token, body: { revision: duplicate.revision } })).status, 409);
  const post = definition({ name: 'Create product', method: 'POST', orderBy: null, defaults: { price: 0, stock: 0, status: 'active' } });
  assert.equal((await createPublished(builder, post)).isPublished, true);
  const secondProject = await anotherProject(builder);
  assert.equal((await createPublished(secondProject)).isPublished, true);
  const unpublished = await request(`${builder.admin}/endpoints/${first.id}/unpublish`, { token: builder.token, body: { revision: first.revision } });
  assert.equal(unpublished.status, 200);
  assert.equal((await publish(builder, duplicate)).isPublished, true);
});

test('published CRUD routes and the owner test runner change real project rows while endpoint deletion preserves data', async t => {
  const { request, owner, createPublished } = fixture(t);
  const builder = await owner();
  const columns = ['id', 'name', 'description', 'price', 'stock', 'status', 'created_at'];
  const get = await createPublished(builder, definition({ columns }));
  const postDefinition = definition({ name: 'Create product', method: 'POST', columns, orderBy: null, defaults: { description: null, price: 0, stock: 0, status: 'active' } });
  const post = await createPublished(builder, postDefinition);
  await createPublished(builder, definition({ name: 'Update product', method: 'PATCH', columns, orderBy: null }));
  await createPublished(builder, definition({ name: 'Delete product', method: 'DELETE', columns: ['id'], orderBy: null }));
  const created = await request(`${builder.runtime}/products`, { token: builder.token, body: { name: 'Runtime product', price: 12.5 } });
  assert.equal(created.status, 201);
  assert.equal(created.data.data.name, 'Runtime product');
  const id = created.data.data.id;
  assert.ok(Number.isInteger(id));
  assertNoSql(created);
  const rowPath = `${builder.runtime}/products/${id}`;
  const updated = await request(rowPath, { token: builder.token, method: 'PATCH', body: { price: 19.5, stock: 4 } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.data.price, 19.5);
  assert.equal((await request(rowPath, { token: builder.token })).data.data[0].stock, 4);
  assert.equal((await request(`${builder.runtime}/products`, { token: builder.token, method: 'PATCH', body: { price: 0 } })).status, 400);
  assert.equal((await request(`${builder.runtime}/products`, { token: builder.token, method: 'DELETE' })).status, 400);
  assert.equal((await request(`${builder.runtime}/products`, { token: builder.token, body: { name: 'Override attempt', project_id: crypto.randomUUID() } })).status, 400);
  assert.equal((await request(rowPath, { token: builder.token, method: 'DELETE', body: { project_id: crypto.randomUUID() } })).status, 400);
  assert.equal((await request(rowPath, { token: builder.token })).data.data[0].id, id);
  const removed = await request(rowPath, { token: builder.token, method: 'DELETE' });
  assert.equal(removed.status, 200);
  assert.deepEqual(removed.data.data, { id });
  const tested = await request(`${builder.admin}/test`, { token: builder.token, body: { definition: postDefinition, params: {}, body: { name: 'Created by test runner', price: 7 } } });
  assert.equal(tested.status, 200);
  assert.equal(tested.data.status, 201);
  assert.equal(tested.data.body.data.name, 'Created by test runner');
  assert.equal(typeof tested.data.sql, 'string');
  assert.ok(tested.data.sql.length > 0);
  assert.ok(Array.isArray(tested.data.parameters));
  assert.equal(typeof tested.data.durationMs, 'number');
  assert.equal((await request(`${builder.admin}/endpoints/${post.id}?revision=${post.revision}`, { token: builder.token, method: 'DELETE' })).status, 200);
  assert.equal((await request(`${builder.runtime}/products`, { token: builder.token, body: { name: 'Unpublished writer' } })).status, 404);
  const table = await request(`/api/projects/${builder.project.id}/tables/products/rows?search=Created%20by%20test%20runner`, { token: builder.token });
  assert.equal(table.status, 200);
  assert.equal(table.data.rowCount, 1);
  assert.equal(table.data.rows[0].name, 'Created by test runner');
  assert.equal((await request(`${builder.runtime}/products`, { token: builder.token })).data.data.length, 4);
  assert.equal((await request(`${builder.admin}/endpoints/${get.id}?revision=${get.revision}`, { token: builder.token, method: 'DELETE' })).status, 200);
  assert.equal((await request(`/api/projects/${builder.project.id}/tables/products/rows`, { token: builder.token })).data.rowCount, 4);
});

test('runtime permissions distinguish public reads, project app users, and developer-only access', async t => {
  const { request, owner, anotherProject, appUser, createPublished } = fixture(t);
  const builder = await owner('owner@example.com');
  const outsider = await owner('outsider@example.com');
  const second = await anotherProject(builder);
  const member = await appUser(builder);
  const foreignMember = await appUser(second);
  await createPublished(builder, definition({ name: 'Public products', path: '/public-products', access: 'public' }));
  await createPublished(builder, definition({ name: 'App products', path: '/app-products', access: 'app_user' }));
  await createPublished(builder, definition({ name: 'Developer products', path: '/developer-products' }));
  assert.equal((await request(`${builder.runtime}/public-products`)).status, 200);
  assert.equal((await request(`${builder.runtime}/app-products`)).status, 401);
  assert.equal((await request(`${builder.runtime}/app-products`, { token: foreignMember.access_token })).status, 401);
  assert.equal((await request(`${builder.runtime}/app-products`, { token: member.access_token })).status, 200);
  assert.equal((await request(`${builder.runtime}/developer-products`)).status, 401);
  assert.equal((await request(`${builder.runtime}/developer-products`, { token: member.access_token })).status, 401);
  assert.ok([401, 404].includes((await request(`${builder.runtime}/developer-products`, { token: outsider.token })).status));
  assert.equal((await request(`${builder.runtime}/developer-products`, { token: builder.token })).status, 200);
  assert.equal((await request(`${builder.admin}/endpoints`, { token: member.access_token, body: { definition: definition() } })).status, 401);
  const appWrite = definition({ name: 'Explicit app write', path: '/app-products', method: 'POST', access: 'app_user', orderBy: null, defaults: { price: 0, stock: 0, status: 'active' } });
  await createPublished(builder, appWrite);
  const created = await request(`${builder.runtime}/app-products`, { token: member.access_token, body: { name: 'App-created product' } });
  assert.equal(created.status, 201);
  assert.equal(created.data.data.name, 'App-created product');
  const sid = JSON.parse(Buffer.from(member.access_token.split('.')[1], 'base64url')).sid;
  assert.equal((await request(`/api/projects/${builder.project.id}/auth/sessions/${sid}`, { token: builder.token, method: 'DELETE' })).status, 200);
  assert.equal((await request(`${builder.runtime}/app-products`, { token: member.access_token })).status, 401);
});

test('runtime CORS uses project app origins while API Builder mutations retain same-origin protection', async t => {
  const { request, owner, appUser, createPublished } = fixture(t);
  const builder = await owner();
  const member = await appUser(builder);
  const appOrigin = 'https://my-app.example';
  assert.equal((await request(`/api/projects/${builder.project.id}/auth/settings`, { token: builder.token, method: 'PUT', body: { signupEnabled: true, allowedOrigins: [appOrigin] } })).status, 200);
  await createPublished(builder, definition({ access: 'public' }));
  await createPublished(builder, definition({ name: 'App write', method: 'POST', access: 'app_user', orderBy: null, defaults: { price: 0, stock: 0, status: 'active' } }));
  const preflight = await request(`${builder.runtime}/products`, { method: 'OPTIONS', origin: appOrigin, headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type, Authorization' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.response.headers.get('Access-Control-Allow-Origin'), appOrigin);
  assert.match(preflight.response.headers.get('Access-Control-Allow-Methods'), /PATCH/);
  assert.match(preflight.response.headers.get('Access-Control-Allow-Methods'), /DELETE/);
  assert.equal(preflight.response.headers.get('Access-Control-Allow-Credentials'), null);
  const read = await request(`${builder.runtime}/products`, { origin: appOrigin });
  assert.equal(read.status, 200);
  assert.equal(read.response.headers.get('Access-Control-Allow-Origin'), appOrigin);
  assert.equal(read.response.headers.get('Set-Cookie'), null);
  const write = await request(`${builder.runtime}/products`, { token: member.access_token, origin: appOrigin, body: { name: 'Allowed cross-origin product' } });
  assert.equal(write.status, 201);
  assert.equal(write.response.headers.get('Access-Control-Allow-Origin'), appOrigin);
  const denied = await request(`${builder.runtime}/products`, { token: member.access_token, origin: 'https://blocked.example', body: { name: 'Blocked cross-origin product' } });
  assert.equal(denied.status, 403);
  assert.equal((await request(`${builder.runtime}/products`, { method: 'OPTIONS', origin: 'null' })).status, 403);
  assert.equal((await request(`${builder.admin}/endpoints`, { token: builder.token, origin: appOrigin, body: { definition: definition() } })).status, 403);
  const table = await request(`/api/projects/${builder.project.id}/tables/products/rows?search=Blocked%20cross-origin%20product`, { token: builder.token });
  assert.equal(table.data.rowCount, 0);
});

test('admin validation rejects executable SQL, database connections, auth tables, public writes, and prototype keys', async t => {
  const { request, owner } = fixture(t);
  const builder = await owner();
  const unsafe = [
    definition({ sql: 'DROP TABLE products' }),
    definition({ databaseUrl: 'postgres://example.invalid/app' }),
    definition({ table: 'users' }),
    definition({ table: 'app_auth_users' }),
    definition({ columns: ['project_id'] }),
    definition({ method: 'POST', access: 'public', orderBy: null }),
    definition({ path: '/too/many/path/segments' }),
    definition({ filters: [{ column: 'name', operator: 'eq', source: 'query', parameter: '__proto__', required: false }] }),
    { ...definition(), ...JSON.parse('{"__proto__":{"polluted":true}}') },
  ];
  for (const value of unsafe) {
    const created = await request(`${builder.admin}/endpoints`, { token: builder.token, body: { definition: value } });
    assert.equal(created.status, 400, JSON.stringify(value));
    const tested = await request(`${builder.admin}/test`, { token: builder.token, body: { definition: value, params: {}, body: {} } });
    assert.equal(tested.status, 400);
  }
  assert.equal((await request(`${builder.admin}/endpoints`, { token: builder.token })).data.endpoints.length, 0);
  assert.equal((await request(`/api/projects/${builder.project.id}/tables/products/rows`, { token: builder.token })).data.rowCount, 3);
  assert.equal(Object.prototype.polluted, undefined);
});

test('runtime query filters bind URL values and respect endpoint pagination limits without leaking SQL', async t => {
  const { request, owner, createPublished } = fixture(t);
  const builder = await owner();
  const value = definition({ limit: 2, filters: [{ column: 'name', operator: 'contains', source: 'query', parameter: 'search', required: false }] });
  await createPublished(builder, value);
  const first = await request(`${builder.runtime}/products?page=1&pageSize=2`, { token: builder.token });
  const second = await request(`${builder.runtime}/products?page=2&pageSize=2`, { token: builder.token });
  assert.equal(first.status, 200);
  assert.equal(first.data.data.length, 2);
  assert.equal(second.data.data.length, 1);
  assert.equal(new Set([...first.data.data, ...second.data.data].map(row => row.id)).size, 3);
  assert.equal(first.data.pagination.totalRows, 3);
  assert.equal(first.data.pagination.totalPages, 2);
  assertNoSql(first);
  for (const query of ["' OR 1=1 --", '%', '_']) {
    const result = await request(`${builder.runtime}/products?search=${encodeURIComponent(query)}`, { token: builder.token });
    assert.equal(result.status, 200);
    assert.deepEqual(result.data.data, []);
    assertNoSql(result);
  }
  assert.equal((await request(`${builder.runtime}/products?pageSize=3`, { token: builder.token })).status, 400);
  assert.equal((await request(`${builder.runtime}/products?page=0`, { token: builder.token })).status, 400);
  assert.equal((await request(`${builder.runtime}/products?page=1&page=2`, { token: builder.token })).status, 400);
});

test('the project endpoint cap counts concurrent creations and deletion frees configuration capacity', async t => {
  const { request, owner, anotherProject, create } = fixture(t);
  const builder = await owner();
  const endpoints = [];
  for (let index = 0; index < 24; index++) endpoints.push(await create(builder, definition({ name: `Draft ${index}`, path: `/draft-${index}` })));
  const attempts = await Promise.all([24, 25].map(index => request(`${builder.admin}/endpoints`, { token: builder.token, body: { definition: definition({ name: `Draft ${index}`, path: `/draft-${index}` }) } })));
  assert.deepEqual(attempts.map(result => result.status).sort(), [201, 409]);
  assert.equal((await request(`${builder.admin}/endpoints`, { token: builder.token })).data.endpoints.length, 25);
  const removed = endpoints[0];
  assert.equal((await request(`${builder.admin}/endpoints/${removed.id}?revision=${removed.revision}`, { token: builder.token, method: 'DELETE' })).status, 200);
  await create(builder, definition({ name: 'Replacement draft', path: '/replacement' }));
  const other = await anotherProject(builder);
  assert.equal((await create(other)).isPublished, false);
});
