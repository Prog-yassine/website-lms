import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { EngineError, executeDefinition, normalizeDefinition } from './api-engine.js';
import { createTestD1 } from './test-d1.mjs';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const PRODUCT_COLUMNS = ['id', 'name', 'description', 'price', 'stock', 'status', 'created_at'];

function definition(overrides = {}) {
  return {
    name: 'Product endpoint', path: '/products', method: 'GET', table: 'products',
    columns: PRODUCT_COLUMNS, filters: [], orderBy: { column: 'id', direction: 'asc' },
    limit: 25, access: 'developer', include: [], defaults: {}, ...overrides,
  };
}

async function fixture(t) {
  const env = { DB: createTestD1(schema) };
  t.after(() => env.DB.close());
  const ownerId = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  const foreignProjectId = crypto.randomUUID();
  const createdAt = '2026-11-05T10:00:00.000Z';
  const statements = [
    env.DB.prepare('INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(ownerId, 'Engine fixture owner', 'engine@example.com', 'unused-fixture-password-hash', createdAt),
    ...[projectId, foreignProjectId].map((id, index) => env.DB.prepare('INSERT INTO projects (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, ownerId, `Application ${index + 1}`, createdAt)),
  ];
  for (const [project, id, name, price, stock, status] of [
    [projectId, 1, 'Starter kit', 10, 5, 'active'],
    [projectId, 2, '100%_ bonus', 20, 0, 'active'],
    [projectId, 3, 'Archive box', 30, 8, 'archived'],
    [foreignProjectId, 1, 'PRIVATE other catalog', 999, 50, 'active'],
    [foreignProjectId, 99, 'Foreign-only product', 5, 9, 'active'],
  ]) statements.push(env.DB.prepare('INSERT INTO products (project_id, id, name, description, price, stock, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(project, id, name, null, price, stock, status, createdAt));
  for (const [project, id, name, email] of [
    [projectId, 1, 'Own buyer', 'own@example.com'],
    [foreignProjectId, 1, 'Private other buyer', 'private@example.com'],
    [foreignProjectId, 99, 'Foreign-only buyer', 'foreign@example.com'],
  ]) statements.push(env.DB.prepare('INSERT INTO customers (project_id, id, name, email, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(project, id, name, email, 'active', createdAt));
  for (const [project, amount] of [[projectId, 20], [foreignProjectId, 999]]) {
    statements.push(env.DB.prepare('INSERT INTO orders (project_id, id, customer_id, product_id, quantity, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(project, 1, 1, 1, 2, amount, 'paid', createdAt));
  }
  await env.DB.batch(statements);

  async function execute(overrides = {}, options = {}) {
    return executeDefinition(env, { projectId, definition: normalizeDefinition(definition(overrides)), ...options });
  }
  const count = async (table, project = projectId) => (await env.DB.prepare(`SELECT COUNT(*) AS total FROM "${table}" WHERE project_id = ?`).bind(project).first()).total;
  return { env, projectId, foreignProjectId, execute, count };
}

async function rejectsStatus(operation, status = 400) {
  await assert.rejects(operation, error => error instanceof EngineError && error.status === status);
}

test('definition validation rejects raw SQL, private tables, project ownership fields, and prototype keys', () => {
  const invalid = [
    { sql: 'SELECT * FROM users' },
    { databaseUrl: 'postgres://example.invalid/private' },
    { table: 'users' }, { table: 'app_auth_users' }, { table: 'sqlite_master' },
    { table: 'products; DROP TABLE users;--' },
    { columns: ['id', 'project_id'] },
    { filters: [{ column: 'project_id', operator: 'eq', source: 'literal', value: crypto.randomUUID() }] },
    { filters: [{ column: 'name', operator: 'raw', source: 'literal', value: '1=1' }] },
    { orderBy: { column: 'password_hash', direction: 'asc' } },
    { include: ['product'] },
    { method: 'POST', access: 'public' },
    { defaults: { project_id: crypto.randomUUID() } },
    { method: 'PATCH', defaults: { name: 'Unexpected' } },
    { limit: 101 },
    { filters: null }, { include: null }, { defaults: null }, { access: null }, { limit: null },
    JSON.parse('{"__proto__":{"polluted":true}}'),
    { method: 'POST', defaults: JSON.parse('{"constructor":{"prototype":{"polluted":true}}}') },
  ];
  for (const overrides of invalid) {
    assert.throws(() => normalizeDefinition(definition(overrides)), error => error instanceof EngineError && error.status === 400);
  }
  assert.equal({}.polluted, undefined);
});

test('GET returns only the selected project with stable pagination and no internal ownership column', async t => {
  const { execute } = await fixture(t);
  const first = await execute({ limit: 2 }, { params: { page: '1', pageSize: '2' } });
  const second = await execute({ limit: 2 }, { params: { page: '2', pageSize: '2' } });
  assert.equal(first.status, 200);
  assert.deepEqual(first.body.data.map(row => row.id), [1, 2]);
  assert.deepEqual(second.body.data.map(row => row.id), [3]);
  assert.deepEqual(first.body.pagination, { page: 1, pageSize: 2, totalRows: 3, totalPages: 2 });
  for (const row of [...first.body.data, ...second.body.data]) {
    assert.deepEqual(Object.keys(row).sort(), [...PRODUCT_COLUMNS].sort());
    assert.equal(Object.hasOwn(row, 'project_id'), false);
    assert.equal(row.name.includes('PRIVATE'), false);
  }
  const descending = await execute({ orderBy: { column: 'price', direction: 'desc' }, columns: ['id', 'price'] });
  assert.deepEqual(descending.body.data.map(row => row.id), [3, 2, 1]);
  const missing = await execute({}, { id: 99 });
  assert.deepEqual(missing.body.data, []);
});

test('literal and query filters are typed, combined, and bound instead of interpolated into SQL', async t => {
  const { execute, projectId } = await fixture(t);
  const filtered = await execute({ filters: [
    { column: 'price', operator: 'gte', source: 'query', parameter: 'minimum', required: true },
    { column: 'status', operator: 'eq', source: 'literal', value: 'active' },
  ] }, { params: { minimum: '15' } });
  assert.deepEqual(filtered.body.data.map(row => row.id), [2]);
  assert.ok(filtered.parameters.includes(projectId));
  const malicious = "' OR 1=1; DROP TABLE products;--";
  const safe = await execute({ filters: [{ column: 'name', operator: 'eq', source: 'query', parameter: 'name' }] }, { params: { name: malicious } });
  assert.deepEqual(safe.body.data, []);
  assert.equal(safe.sql.includes(malicious), false);
  assert.ok(safe.parameters.includes(malicious));
  assert.equal((await execute()).body.pagination.totalRows, 3);
  await rejectsStatus(() => execute({ filters: [{ column: 'price', operator: 'gte', source: 'query', parameter: 'minimum', required: true }] }));
  await rejectsStatus(() => execute({ filters: [{ column: 'price', operator: 'gte', source: 'query', parameter: 'minimum' }] }, { params: { minimum: '1 OR 1=1' } }));
});

test('contains escapes LIKE wildcards and in/is_null filters preserve their declared types', async t => {
  const { execute } = await fixture(t);
  for (const search of ['%_', '100%_']) {
    const result = await execute({ filters: [{ column: 'name', operator: 'contains', source: 'query', parameter: 'search' }] }, { params: { search } });
    assert.deepEqual(result.body.data.map(row => row.id), [2]);
  }
  const literalIn = await execute({ filters: [{ column: 'id', operator: 'in', source: 'literal', value: [1, 3] }] });
  assert.deepEqual(literalIn.body.data.map(row => row.id), [1, 3]);
  const queryIn = await execute({ filters: [{ column: 'id', operator: 'in', source: 'query', parameter: 'ids' }] }, { params: { ids: '1,3' } });
  assert.deepEqual(queryIn.body.data.map(row => row.id), [1, 3]);
  const nulls = await execute({ filters: [{ column: 'description', operator: 'is_null', source: 'query', parameter: 'empty' }] }, { params: { empty: 'true' } });
  assert.equal(nulls.body.pagination.totalRows, 3);
  const nonNulls = await execute({ filters: [{ column: 'description', operator: 'is_null', source: 'literal', value: false }] });
  assert.deepEqual(nonNulls.body.data, []);
  await rejectsStatus(() => execute({ filters: [{ column: 'id', operator: 'in', source: 'query', parameter: 'ids' }] }, { params: { ids: '1,not-a-number' } }));
  await rejectsStatus(() => execute({ filters: [{ column: 'description', operator: 'is_null', source: 'query', parameter: 'empty' }] }, { params: { empty: 'maybe' } }));
  assert.throws(() => normalizeDefinition(definition({ filters: [{ column: 'id', operator: 'in', source: 'literal', value: Array.from({ length: 21 }, (_, index) => index + 1) }] })), error => error instanceof EngineError && error.status === 400);
});

test('pagination and IDs reject invalid bounds and callers cannot override the project through query parameters', async t => {
  const { execute, foreignProjectId } = await fixture(t);
  for (const params of [
    { page: '0' }, { page: '-1' }, { page: '1.5' }, { pageSize: '0' },
    { pageSize: '101' }, { pageSize: '26' }, { id: '1 OR 1=1' },
    { project_id: foreignProjectId },
  ]) await rejectsStatus(() => execute({}, { params }));
  await rejectsStatus(() => execute({}, { id: null }));
  const single = await execute({}, { params: { id: '2' } });
  assert.deepEqual(single.body.data.map(row => row.id), [2]);
});

test('POST applies typed defaults and allocates new IDs atomically within one project', async t => {
  const { execute, env, projectId, foreignProjectId } = await fixture(t);
  const config = { method: 'POST', defaults: { price: 5, stock: 0, status: 'active' } };
  const results = await Promise.all([
    execute(config, { body: { name: 'Created A', price: 12.5 } }),
    execute(config, { body: { name: 'Created B' } }),
  ]);
  assert.ok(results.every(result => result.status === 201));
  assert.deepEqual(results.map(result => result.body.data.id).sort(), [4, 5]);
  assert.equal(results[0].body.data.price, 12.5);
  assert.equal(results[1].body.data.price, 5);
  assert.equal(results[0].body.data.stock, 0);
  const actual = await env.DB.prepare('SELECT name, price, stock, status FROM products WHERE project_id = ? AND id = ?').bind(projectId, results[0].body.data.id).first();
  assert.deepEqual(actual, { name: 'Created A', price: 12.5, stock: 0, status: 'active' });
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS total FROM products WHERE project_id = ?').bind(foreignProjectId).first()).total, 2);
});

test('POST and PATCH reject internal fields, unknown keys, malformed values, and mass updates', async t => {
  const { execute, count, foreignProjectId } = await fixture(t);
  const before = await count('products');
  for (const body of [
    { name: 'Bad', price: 1, stock: 1, status: 'active', project_id: foreignProjectId },
    { name: 'Bad', price: 1, stock: 1, status: 'active', id: 100 },
    { name: 'Bad', price: 1, stock: 1, status: 'active', created_at: '2020-01-01' },
    { name: 'Bad', price: -1, stock: 1, status: 'active' },
    { name: 'Bad', price: 1, stock: 1.5, status: 'active' },
    { name: 'Bad', price: 1, stock: 1, status: 'active', password_hash: 'unexpected' },
    JSON.parse('{"name":"Bad","price":1,"stock":1,"status":"active","__proto__":{"polluted":true}}'),
  ]) await rejectsStatus(() => execute({ method: 'POST' }, { body }));
  await rejectsStatus(() => execute({ method: 'POST' }, { id: 1, body: { name: 'Bad', price: 1, stock: 1, status: 'active' } }));
  await rejectsStatus(() => execute({ method: 'PATCH' }, { body: { price: 1 } }));
  await rejectsStatus(() => execute({ method: 'PATCH' }, { id: 1, body: { project_id: foreignProjectId } }));
  await rejectsStatus(() => execute({ method: 'PATCH' }, { id: 1, body: {} }));
  assert.equal(await count('products'), before);
  assert.equal({}.polluted, undefined);
});

test('PATCH changes only the addressed project row and DELETE requires an ID without deleting another project', async t => {
  const { execute, env, projectId, foreignProjectId, count } = await fixture(t);
  await rejectsStatus(() => execute({ method: 'PATCH', filters: [{ column: 'status', operator: 'eq', source: 'literal', value: 'archived' }] }, { id: 1, body: { price: 0 } }), 404);
  await rejectsStatus(() => execute({ method: 'DELETE', filters: [{ column: 'status', operator: 'eq', source: 'literal', value: 'active' }] }, { id: 3 }), 404);
  assert.equal((await env.DB.prepare('SELECT price FROM products WHERE project_id = ? AND id = 1').bind(projectId).first()).price, 10);
  const changed = await execute({ method: 'PATCH' }, { id: '2', body: { name: 'Updated safely', price: 22 } });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.data.name, 'Updated safely');
  assert.equal(changed.body.data.price, 22);
  assert.equal((await env.DB.prepare('SELECT name FROM products WHERE project_id = ? AND id = 1').bind(projectId).first()).name, 'Starter kit');
  assert.equal((await env.DB.prepare('SELECT price FROM products WHERE project_id = ? AND id = 1').bind(foreignProjectId).first()).price, 999);
  await rejectsStatus(() => execute({ method: 'PATCH' }, { id: 99, body: { price: 1 } }), 404);
  await rejectsStatus(() => execute({ method: 'DELETE' }), 400);
  await rejectsStatus(() => execute({ method: 'DELETE' }, { id: 2, body: { project_id: foreignProjectId } }), 400);
  const deleted = await execute({ method: 'DELETE' }, { id: 2 });
  assert.equal(deleted.status, 200);
  assert.deepEqual(deleted.body.data, { id: 2 });
  assert.equal(await count('products'), 2);
  assert.equal(await count('products', foreignProjectId), 2);
  await assert.rejects(() => execute({ method: 'DELETE' }, { id: 1 }), error => {
    assert.ok(error instanceof EngineError);
    assert.equal(error.status, 409);
    assert.doesNotMatch(error.message, /FOREIGN KEY constraint failed|DELETE FROM|SQLITE_CONSTRAINT/i);
    return true;
  });
  assert.equal(await count('products'), 2);
  await rejectsStatus(() => execute({ method: 'DELETE' }, { id: 99 }), 404);
});

test('order joins remain inside the selected project even when another project uses identical IDs', async t => {
  const { execute } = await fixture(t);
  const result = await execute({
    table: 'orders', path: '/orders', columns: ['id', 'product_id', 'customer_id', 'quantity', 'amount', 'status'],
    include: ['product', 'customer'],
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.length, 1);
  const row = result.body.data[0];
  assert.deepEqual(row.product, { id: 1, name: 'Starter kit', price: 10 });
  assert.deepEqual(row.customer, { id: 1, name: 'Own buyer', email: 'own@example.com' });
  assert.equal(JSON.stringify(row).includes('PRIVATE'), false);
  assert.equal(JSON.stringify(row).includes('private@example.com'), false);
  assert.equal(Object.hasOwn(row, 'project_id'), false);
});

test('order writes cannot reference a product or customer belonging only to another project', async t => {
  const { execute, count } = await fixture(t);
  const config = { table: 'orders', path: '/orders', method: 'POST', columns: ['id', 'customer_id', 'product_id', 'quantity', 'amount', 'status', 'created_at'] };
  for (const body of [
    { customer_id: 1, product_id: 99, quantity: 1, amount: 5, status: 'pending' },
    { customer_id: 99, product_id: 1, quantity: 1, amount: 5, status: 'pending' },
  ]) await assert.rejects(() => execute(config, { body }), error => {
    assert.ok(error instanceof EngineError);
    assert.equal(error.status, 409);
    assert.doesNotMatch(error.message, /FOREIGN KEY constraint failed|INSERT INTO|SQLITE_CONSTRAINT/i);
    return true;
  });
  assert.equal(await count('orders'), 1);
  const created = await execute(config, { body: { customer_id: 1, product_id: 1, quantity: 1, amount: 10, status: 'pending' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.id, 2);
  const read = await execute({ ...config, method: 'GET', include: ['product', 'customer'] }, { id: 2 });
  assert.equal(read.body.data[0].product.name, 'Starter kit');
  assert.equal(read.body.data[0].customer.email, 'own@example.com');
});
