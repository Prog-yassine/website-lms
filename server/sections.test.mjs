import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { handleApi } from './worker.js';
import { createTestD1 } from './test-d1.mjs';
import { createTestR2 } from './test-r2.mjs';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const PASSWORD = 'correct-password-123!';
const ORIGIN = 'https://grupedia.test';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PROJECT_BYTES = 25 * 1024 * 1024;
const MISSING_ID = '00000000-0000-4000-8000-000000000000';
let ipSequence = 0;

function sessionId(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sid;
}

function fixture(t) {
  const bucket = createTestR2();
  const env = {
    DB: createTestD1(schema),
    BUCKET: bucket,
    JWT_SECRET: 'sections-integration-only-secret-at-least-32-characters',
  };
  t.after(() => env.DB.close());
  let accountSequence = 0;

  async function request(path, options = {}) {
    const headers = new Headers({ 'CF-Connecting-IP': `198.51.100.${(++ipSequence % 250) + 1}` });
    const method = options.method || (options.json !== undefined || options.bytes !== undefined ? 'POST' : 'GET');
    let body;
    if (options.json !== undefined) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(options.json);
    } else if (options.bytes !== undefined) {
      if (options.contentType !== null) headers.set('Content-Type', options.contentType || 'application/octet-stream');
      body = options.bytes;
      if (options.stream) {
        const bytes = options.bytes;
        let offset = 0;
        body = new ReadableStream({
          pull(controller) {
            if (offset === bytes.byteLength) return controller.close();
            const end = Math.min(offset + 65536, bytes.byteLength);
            controller.enqueue(bytes.subarray(offset, end));
            offset = end;
          },
        });
      }
    }
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    if (options.cookie) headers.set('Cookie', options.cookie);
    if (options.origin !== undefined) headers.set('Origin', options.origin);
    if (options.contentLength !== undefined) headers.set('Content-Length', String(options.contentLength));
    const response = await handleApi(new Request(new URL(path, ORIGIN), {
      method, headers, body, ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
    }), env);
    assert.ok(response instanceof Response);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const data = response.headers.get('Content-Type')?.includes('application/json')
      ? JSON.parse(new TextDecoder().decode(bytes)) : null;
    return { response, status: response.status, data, bytes };
  }

  async function login(email) {
    const result = await request('/api/auth/login', { json: { email, password: PASSWORD } });
    assert.equal(result.status, 200);
    return { token: result.data.token, cookie: result.response.headers.get('Set-Cookie').split(';')[0] };
  }

  async function account(email = `owner-${++accountSequence}@example.com`) {
    const result = await request('/api/auth/register', { json: { name: 'Project Owner', email, password: PASSWORD } });
    assert.equal(result.status, 201);
    const credentials = await login(email);
    const projects = await request('/api/projects', { token: credentials.token });
    assert.equal(projects.status, 200);
    return { user: result.data.user, ...credentials, project: projects.data.projects[0] };
  }

  async function createBucket(owner, name = 'documents') {
    const result = await request(`/api/projects/${owner.project.id}/storage/buckets`, {
      token: owner.token, json: { name }, origin: ORIGIN,
    });
    assert.equal(result.status, 201);
    return { ...result.data.bucket, path: `/api/projects/${owner.project.id}/storage/buckets/${result.data.bucket.id}` };
  }

  async function upload(owner, container, name = 'sample.txt', bytes = new TextEncoder().encode('Sample file'), options = {}) {
    return request(`${container.path}/objects?filename=${encodeURIComponent(name)}`, {
      token: owner.token, bytes, origin: ORIGIN, ...options,
    });
  }

  return { env, bucket, request, login, account, createBucket, upload };
}

test('authentication overview exposes only the owner and safe active session information', async t => {
  const { request, account, login } = fixture(t);
  const alice = await account('alice@example.com');
  const secondSession = await login(alice.user.email);
  const bob = await account('bob@example.com');
  const path = `/api/projects/${alice.project.id}/auth`;
  const result = await request(path, { token: alice.token });
  assert.equal(result.status, 200);
  assert.equal(result.data.users.length, 1);
  assert.deepEqual(result.data.users[0], {
    ...alice.user, role: 'owner', provider: 'email', lastSignInAt: result.data.users[0].lastSignInAt,
  });
  assert.ok(Number.isFinite(Date.parse(result.data.users[0].lastSignInAt)));
  assert.equal(result.data.sessions.length, 2);
  assert.equal(result.data.sessions.find(session => session.id === sessionId(alice.token)).current, true);
  assert.equal(result.data.sessions.find(session => session.id === sessionId(secondSession.token)).current, false);
  for (const session of result.data.sessions) {
    assert.deepEqual(Object.keys(session).sort(), ['createdAt', 'current', 'expiresAt', 'id', 'lastUsedAt']);
    assert.ok(Number.isFinite(Date.parse(session.expiresAt)));
  }
  assert.deepEqual(result.data.providers.map(({ id, enabled }) => ({ id, enabled })), [
    { id: 'email', enabled: true }, { id: 'google', enabled: false }, { id: 'github', enabled: false },
  ]);
  assert.deepEqual(result.data.settings, { accessTokenSeconds: 900, refreshTokenSeconds: 604800, passwordMinLength: 8 });
  assert.equal(JSON.stringify(result.data).includes(bob.user.id), false);
  assert.equal(JSON.stringify(result.data).includes('hash'), false);
  assert.equal((await request(path, { token: bob.token })).status, 404);
});

test('revoking another own session invalidates its bearer and refresh credentials without ending the current session', async t => {
  const { request, account, login } = fixture(t);
  const alice = await account('alice@example.com');
  const secondSession = await login(alice.user.email);
  const bob = await account('bob@example.com');
  const base = `/api/projects/${alice.project.id}/auth/sessions`;
  const remove = id => request(`${base}/${id}`, { token: alice.token, method: 'DELETE', origin: ORIGIN });
  assert.equal((await remove(sessionId(alice.token))).status, 409);
  assert.equal((await remove(sessionId(bob.token))).status, 404);
  assert.equal((await remove(MISSING_ID)).status, 404);
  assert.equal((await remove(sessionId(secondSession.token))).status, 200);
  assert.equal((await request('/api/auth/me', { token: secondSession.token })).status, 401);
  assert.equal((await request('/api/auth/refresh', { method: 'POST', cookie: secondSession.cookie })).status, 401);
  assert.equal((await request('/api/auth/me', { token: alice.token })).status, 200);
  assert.equal((await request('/api/auth/me', { token: bob.token })).status, 200);
  const overview = await request(`/api/projects/${alice.project.id}/auth`, { token: alice.token });
  assert.deepEqual(overview.data.sessions.map(session => session.id), [sessionId(alice.token)]);
});

test('auth and storage routes require authentication and reject cross-origin mutations', async t => {
  const { request, account, login, createBucket } = fixture(t);
  const alice = await account();
  const otherSession = await login(alice.user.email);
  const container = await createBucket(alice);
  const base = `/api/projects/${alice.project.id}`;
  for (const path of [`${base}/auth`, `${base}/storage/buckets`, `${container.path}/objects`, `${container.path}/objects/${MISSING_ID}/content`]) {
    assert.equal((await request(path)).status, 401);
  }
  assert.equal((await request(`${base}/storage/buckets`, { json: { name: 'anonymous' } })).status, 401);
  assert.equal((await request(container.path, { method: 'DELETE' })).status, 401);
  const alienOrigin = 'https://untrusted.example';
  assert.equal((await request(`${base}/storage/buckets`, { token: alice.token, json: { name: 'blocked' }, origin: alienOrigin })).status, 403);
  assert.equal((await request(container.path, { token: alice.token, method: 'DELETE', origin: alienOrigin })).status, 403);
  assert.equal((await request(`${base}/auth/sessions/${sessionId(otherSession.token)}`, { token: alice.token, method: 'DELETE', origin: alienOrigin })).status, 403);
  assert.equal((await request('/api/auth/me', { token: otherSession.token })).status, 200);
});

test('missing R2 binding reports unavailable storage while preserving readable owned metadata', async t => {
  const { request, account, createBucket, upload, env } = fixture(t);
  const alice = await account();
  const container = await createBucket(alice);
  const uploaded = await upload(alice, container);
  assert.equal(uploaded.status, 201);
  delete env.BUCKET;
  const buckets = await request(`/api/projects/${alice.project.id}/storage/buckets`, { token: alice.token });
  assert.equal(buckets.status, 200);
  assert.equal(buckets.data.configured, false);
  assert.equal(buckets.data.buckets.length, 1);
  const listing = await request(`${container.path}/objects`, { token: alice.token });
  assert.equal(listing.status, 200);
  assert.equal(listing.data.configured, false);
  assert.equal(listing.data.objects.length, 1);
  assert.equal((await request(`/api/projects/${alice.project.id}/storage/buckets`, { token: alice.token, json: { name: 'new-bucket' } })).status, 503);
  assert.equal((await upload(alice, container)).status, 503);
  assert.equal((await request(`${container.path}/objects/${uploaded.data.object.id}/content`, { token: alice.token })).status, 503);
  assert.equal((await request(`${container.path}/objects/${uploaded.data.object.id}`, { token: alice.token, method: 'DELETE' })).status, 503);
  assert.equal((await request(container.path, { token: alice.token, method: 'DELETE' })).status, 503);
});

test('buckets validate DNS names, reject duplicates and the sixth bucket, and allow empty deletion', async t => {
  const { request, account, createBucket } = fixture(t);
  const alice = await account();
  const base = `/api/projects/${alice.project.id}/storage/buckets`;
  for (const name of ['', 'Upper', 'two words', '-edge', 'edge-', 'has.dot', 'a'.repeat(64)]) {
    assert.equal((await request(base, { token: alice.token, json: { name } })).status, 400, name);
  }
  const first = await createBucket(alice, 'a');
  assert.equal((await request(base, { token: alice.token, json: { name: 'a' } })).status, 409);
  for (let index = 2; index <= 5; index++) await createBucket(alice, `bucket-${index}`);
  assert.equal((await request(base, { token: alice.token, json: { name: 'bucket-6' } })).status, 409);
  const listing = await request(base, { token: alice.token });
  assert.equal(listing.data.buckets.length, 5);
  assert.deepEqual(listing.data.limits, { maxFileBytes: MAX_FILE_BYTES, maxBuckets: 5, maxFilesPerBucket: 50 });
  assert.deepEqual(listing.data.usage, { totalBytes: 0, maxTotalBytes: MAX_PROJECT_BYTES });
  assert.equal((await request(first.path, { token: alice.token, method: 'DELETE' })).status, 200);
  assert.equal((await request(`${first.path}/objects`, { token: alice.token })).status, 404);
  await createBucket(alice, 'replacement');
});

test('binary uploads persist across requests and download only as a private attachment', async t => {
  const { request, account, createBucket, upload, bucket } = fixture(t);
  const alice = await account();
  const container = await createBucket(alice);
  const bytes = new Uint8Array([0, 255, 128, 1, 13, 10, 60, 62]);
  const uploaded = await upload(alice, container, 'photo.bin', bytes, { contentType: 'application/octet-stream', stream: true });
  assert.equal(uploaded.status, 201);
  const object = uploaded.data.object;
  assert.deepEqual(Object.keys(object).sort(), ['contentType', 'createdAt', 'id', 'name', 'size']);
  assert.equal(object.name, 'photo.bin');
  assert.equal(object.size, bytes.byteLength);
  const listing = await request(`${container.path}/objects`, { token: alice.token });
  assert.deepEqual(listing.data.objects, [object]);
  assert.equal(listing.data.usage.totalBytes, bytes.byteLength);
  const buckets = await request(`/api/projects/${alice.project.id}/storage/buckets`, { token: alice.token });
  assert.equal(buckets.data.buckets[0].fileCount, 1);
  assert.equal(buckets.data.buckets[0].totalBytes, bytes.byteLength);
  const download = await request(`${container.path}/objects/${object.id}/content`, { token: alice.token });
  assert.equal(download.status, 200);
  assert.deepEqual(download.bytes, bytes);
  assert.match(download.response.headers.get('Content-Disposition'), /^attachment;/i);
  assert.match(download.response.headers.get('Content-Disposition'), /photo\.bin/);
  assert.equal(download.response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.match(download.response.headers.get('Cache-Control'), /no-store/);
  assert.equal(download.response.headers.get('Content-Type'), 'application/octet-stream');
  assert.equal(bucket.keys().length, 1);
  assert.equal(bucket.keys()[0].includes('photo.bin'), false);
  bucket.failNext('get', { message: 'Private provider read details' });
  const unavailable = await request(`${container.path}/objects/${object.id}/content`, { token: alice.token });
  assert.equal(unavailable.status, 503);
  assert.equal(JSON.stringify(unavailable.data).includes('Private provider'), false);
  assert.equal((await request(`${container.path}/objects/${object.id}/content`, { token: alice.token })).status, 200);
  const html = await upload(alice, container, 'Résumé "invoice".html', new TextEncoder().encode('<script>alert(1)</script>'), { contentType: 'text/html' });
  assert.equal(html.status, 201);
  const htmlDownload = await request(`${container.path}/objects/${html.data.object.id}/content`, { token: alice.token });
  assert.equal(htmlDownload.status, 200);
  assert.match(htmlDownload.response.headers.get('Content-Disposition'), /^attachment;/i);
  assert.match(htmlDownload.response.headers.get('Content-Disposition'), /filename\*=UTF-8''R%C3%A9sum%C3%A9%20%22invoice%22\.html/);
  assert.match(htmlDownload.response.headers.get('Content-Security-Policy'), /sandbox/);
});

test('object search is case insensitive and treats SQL and LIKE syntax literally', async t => {
  const { request, account, createBucket, upload } = fixture(t);
  const alice = await account();
  const container = await createBucket(alice);
  for (const name of ['REPORT.txt', '100%_complete.txt', 'ordinary.txt']) assert.equal((await upload(alice, container, name)).status, 201);
  const report = await request(`${container.path}/objects?search=report`, { token: alice.token });
  assert.deepEqual(report.data.objects.map(object => object.name), ['REPORT.txt']);
  const literal = await request(`${container.path}/objects?search=${encodeURIComponent('%_')}`, { token: alice.token });
  assert.deepEqual(literal.data.objects.map(object => object.name), ['100%_complete.txt']);
  const injection = await request(`${container.path}/objects?search=${encodeURIComponent("' OR 1=1 --")}`, { token: alice.token });
  assert.deepEqual(injection.data.objects, []);
  assert.equal((await request(`${container.path}/objects?search=${'x'.repeat(201)}`, { token: alice.token })).status, 400);
});

test('another owner cannot inspect or mutate private bucket metadata or file contents', async t => {
  const { request, account, createBucket, upload, env } = fixture(t);
  const alice = await account('alice@example.com');
  const bob = await account('bob@example.com');
  const container = await createBucket(alice);
  const uploaded = await upload(alice, container);
  assert.equal(uploaded.status, 201);
  const objectPath = `${container.path}/objects/${uploaded.data.object.id}`;
  for (const path of [`/api/projects/${alice.project.id}/storage/buckets`, `${container.path}/objects`, `${objectPath}/content`]) {
    assert.equal((await request(path, { token: bob.token })).status, 404);
  }
  assert.equal((await upload({ ...alice, token: bob.token }, container)).status, 404);
  assert.equal((await request(objectPath, { token: bob.token, method: 'DELETE' })).status, 404);
  assert.equal((await request(container.path, { token: bob.token, method: 'DELETE' })).status, 404);
  assert.equal((await request(`/api/projects/${alice.project.id}/storage/buckets`, { token: bob.token, json: { name: 'foreign' } })).status, 404);
  const forgedBucket = `/api/projects/${bob.project.id}/storage/buckets/${container.id}`;
  assert.equal((await request(`${forgedBucket}/objects`, { token: bob.token })).status, 404);
  assert.equal((await request(`${forgedBucket}/objects/${uploaded.data.object.id}/content`, { token: bob.token })).status, 404);
  const savedBinding = env.BUCKET;
  delete env.BUCKET;
  assert.equal((await request(objectPath, { token: bob.token, method: 'DELETE' })).status, 404);
  env.BUCKET = savedBinding;
  assert.equal((await request(`${objectPath}/content`, { token: alice.token })).status, 200);
});

test('filenames and content types are validated before any storage reservation or provider call', async t => {
  const { request, account, createBucket, upload, bucket } = fixture(t);
  const alice = await account();
  const container = await createBucket(alice);
  for (const name of ['', '.', '..', '../secret.txt', 'folder/file.txt', 'folder\\file.txt', 'line\nbreak.txt', 'a'.repeat(121)]) {
    assert.equal((await upload(alice, container, name)).status, 400, JSON.stringify(name));
  }
  assert.equal((await upload(alice, container, 'sample.txt', new Uint8Array([1]), { contentType: 'invalid mime' })).status, 400);
  assert.equal(bucket.calls.length, 0);
  const listing = await request(`${container.path}/objects`, { token: alice.token });
  assert.deepEqual(listing.data.objects, []);
  assert.equal(listing.data.usage.totalBytes, 0);
  const noMime = await upload(alice, container, 'safe.txt', new Uint8Array([1]), { contentType: null });
  assert.equal(noMime.status, 201);
  assert.equal(noMime.data.object.contentType, 'application/octet-stream');
});

test('empty and oversized actual upload streams never create an object or consume quota', async t => {
  const { request, account, createBucket, upload, bucket } = fixture(t);
  const alice = await account();
  const container = await createBucket(alice);
  assert.equal((await upload(alice, container, 'empty.bin', new Uint8Array(), { stream: true })).status, 400);
  assert.equal((await upload(alice, container, 'too-big.bin', new Uint8Array(MAX_FILE_BYTES + 1), { stream: true })).status, 413);
  assert.equal((await upload(alice, container, 'declared-big.bin', new Uint8Array([1]), { contentLength: MAX_FILE_BYTES + 1 })).status, 413);
  assert.deepEqual(bucket.keys(), []);
  const listing = await request(`${container.path}/objects`, { token: alice.token });
  assert.deepEqual(listing.data.objects, []);
  assert.equal(listing.data.usage.totalBytes, 0);
});

test('a failed R2 upload cleans up a partially written key and releases its SQL quota reservation', async t => {
  const { request, account, createBucket, upload, bucket } = fixture(t);
  const alice = await account();
  const container = await createBucket(alice);
  bucket.failNext('put', { afterWrite: true, message: 'Private provider credential must never escape' });
  const failed = await upload(alice, container, 'retry.txt', new Uint8Array([1, 2, 3]));
  assert.ok(failed.status >= 500 && failed.status <= 503);
  assert.equal(JSON.stringify(failed.data).includes('Private provider'), false);
  assert.deepEqual(bucket.keys(), []);
  const listing = await request(`${container.path}/objects`, { token: alice.token });
  assert.deepEqual(listing.data.objects, []);
  assert.equal(listing.data.usage.totalBytes, 0);
  assert.equal((await upload(alice, container, 'retry.txt', new Uint8Array([1, 2, 3]))).status, 201);
});

test('failed upload cleanup keeps its reservation hidden and prevents deleting a bucket with an in-flight object', async t => {
  const { request, account, createBucket, upload, bucket } = fixture(t);
  const alice = await account();
  const container = await createBucket(alice);
  bucket.failNext('put', { afterWrite: true });
  bucket.failNext('delete');
  const failed = await upload(alice, container, 'unfinished.bin', new Uint8Array([1, 2, 3]));
  assert.equal(failed.status, 503);
  assert.equal(bucket.keys().length, 1);
  const listing = await request(`${container.path}/objects`, { token: alice.token });
  assert.deepEqual(listing.data.objects, []);
  assert.equal(listing.data.usage.totalBytes, 3);
  assert.equal((await request(container.path, { token: alice.token, method: 'DELETE' })).status, 409);
});

test('failed object deletion remains retryable and non-empty buckets cannot be deleted', async t => {
  const { request, account, createBucket, upload, bucket } = fixture(t);
  const alice = await account();
  const container = await createBucket(alice);
  const uploaded = await upload(alice, container);
  assert.equal(uploaded.status, 201);
  const path = `${container.path}/objects/${uploaded.data.object.id}`;
  assert.equal((await request(container.path, { token: alice.token, method: 'DELETE' })).status, 409);
  bucket.failNext('delete');
  assert.equal((await request(path, { token: alice.token, method: 'DELETE' })).status, 503);
  assert.equal((await request(`${path}/content`, { token: alice.token })).status, 200);
  assert.equal((await request(`${container.path}/objects`, { token: alice.token })).data.objects.length, 1);
  assert.equal((await request(path, { token: alice.token, method: 'DELETE' })).status, 200);
  assert.equal((await request(`${path}/content`, { token: alice.token })).status, 404);
  assert.deepEqual(bucket.keys(), []);
  assert.equal((await request(`${container.path}/objects`, { token: alice.token })).data.usage.totalBytes, 0);
  assert.equal((await request(container.path, { token: alice.token, method: 'DELETE' })).status, 200);
});

test('project byte quota includes concurrent reservations across buckets and is released by deletion', { timeout: 30000 }, async t => {
  const { request, account, createBucket, upload, bucket } = fixture(t);
  const alice = await account();
  const first = await createBucket(alice, 'first');
  const second = await createBucket(alice, 'second');
  const bytes = new Uint8Array(MAX_FILE_BYTES);
  for (let index = 0; index < 4; index++) assert.equal((await upload(alice, first, `large-${index}.bin`, bytes)).status, 201);
  const hold = bucket.holdNext('put');
  t.after(hold.release);
  const pending = upload(alice, second, 'last-large.bin', bytes);
  await hold.entered;
  try {
    assert.equal((await upload(alice, first, 'overflow.bin', new Uint8Array([1]))).status, 507);
    assert.equal((await request(second.path, { token: alice.token, method: 'DELETE' })).status, 409);
  } finally {
    hold.release();
  }
  const completed = await pending;
  assert.equal(completed.status, 201);
  const full = await request(`${second.path}/objects`, { token: alice.token });
  assert.equal(full.data.usage.totalBytes, MAX_PROJECT_BYTES);
  assert.equal((await request(`${second.path}/objects/${completed.data.object.id}`, { token: alice.token, method: 'DELETE' })).status, 200);
  assert.equal((await upload(alice, second, 'fits-again.bin', bytes)).status, 201);
});

test('the per-bucket file quota counts an upload reservation before the provider finishes', { timeout: 30000 }, async t => {
  const { request, account, createBucket, upload, bucket } = fixture(t);
  const alice = await account();
  const container = await createBucket(alice);
  for (let index = 0; index < 49; index++) assert.equal((await upload(alice, container, `tiny-${index}.bin`, new Uint8Array([1]))).status, 201);
  const hold = bucket.holdNext('put');
  t.after(hold.release);
  const pending = upload(alice, container, 'fiftieth.bin', new Uint8Array([1]));
  await hold.entered;
  try {
    assert.equal((await upload(alice, container, 'fifty-first.bin', new Uint8Array([1]))).status, 409);
  } finally {
    hold.release();
  }
  const completed = await pending;
  assert.equal(completed.status, 201);
  const listing = await request(`${container.path}/objects`, { token: alice.token });
  assert.equal(listing.data.objects.length, 50);
  assert.equal(listing.data.usage.totalBytes, 50);
  assert.equal((await request(`${container.path}/objects/${completed.data.object.id}`, { token: alice.token, method: 'DELETE' })).status, 200);
  assert.equal((await upload(alice, container, 'replacement.bin', new Uint8Array([1]))).status, 201);
});
