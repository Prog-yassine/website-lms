import { waitFor } from '@testing-library/react';
import { apiRequest, ApiError, clearSession, setAccessToken } from './api';

const USER = { id: '11111111-1111-4111-8111-111111111111', name: 'Alex Teacher', email: 'alex@example.com' };
const SESSION = { token: 'renewed-access-token', user: USER, expiresIn: 900 };
const originalFetch = global.fetch;

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(payload),
    blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(payload)], { type: 'application/json' })),
  };
}

function blobResponse(blob) {
  return {
    ok: true, status: 200,
    json: jest.fn().mockRejectedValue(new SyntaxError('Not JSON')),
    blob: jest.fn().mockResolvedValue(blob),
  };
}

function pathOf(url) {
  return new URL(String(url), 'https://test.example').pathname;
}

function callsTo(path) {
  return fetch.mock.calls.filter(([url]) => pathOf(url) === path);
}

function header(options, name) {
  if (typeof options.headers?.get === 'function') return options.headers.get(name) || undefined;
  return Object.entries(options.headers || {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearSession();
  global.fetch = jest.fn(() => { throw new Error('Unexpected backend request'); });
});

afterEach(() => { clearSession(); });
afterAll(() => { global.fetch = originalFetch; });

test('JSON requests keep their serialized body, content type, and parsed JSON response', async () => {
  const payload = { name: 'Private assets', public: false };
  const result = { id: 'bucket-one', ...payload };
  const backend = jsonResponse(result, 201);
  fetch.mockResolvedValue(backend);
  setAccessToken('access-token');

  await expect(apiRequest('/api/storage/buckets', { method: 'POST', body: payload })).resolves.toEqual(result);
  const options = fetch.mock.calls[0][1];
  expect(options.body).toBe(JSON.stringify(payload));
  expect(header(options, 'Content-Type')).toBe('application/json');
  expect(header(options, 'Authorization')).toBe('Bearer access-token');
  expect(options.credentials).toBe('include');
  expect(backend.json).toHaveBeenCalledTimes(1);
  expect(backend.blob).not.toHaveBeenCalled();
});

test('a raw File upload sends the original bytes object and preserves its explicit MIME type', async () => {
  const file = new File(['image bytes'], 'diagram.png', { type: 'image/png' });
  fetch.mockResolvedValue(jsonResponse({ id: 'object-one', name: file.name }, 201));
  setAccessToken('access-token');

  await apiRequest('/api/storage/buckets/bucket-one/objects/diagram.png', {
    method: 'PUT', body: file, rawBody: true,
    headers: { 'Content-Type': 'image/png' },
  });

  const options = fetch.mock.calls[0][1];
  expect(options.body).toBe(file);
  expect(header(options, 'Content-Type')).toBe('image/png');
  expect(header(options, 'Authorization')).toBe('Bearer access-token');
  expect(options.rawBody).toBeUndefined();
});

test('a raw upload without an explicit content type never receives an automatic JSON type', async () => {
  const file = new File(['plain bytes'], 'notes.txt', { type: 'text/plain' });
  fetch.mockResolvedValue(jsonResponse({ id: 'object-one' }, 201));

  await apiRequest('/api/storage/buckets/bucket-one/objects/notes.txt', {
    method: 'PUT', body: file, rawBody: true,
  });

  const options = fetch.mock.calls[0][1];
  expect(options.body).toBe(file);
  expect(header(options, 'Content-Type')).toBeUndefined();
});

test('a successful binary download returns its Blob without attempting to parse JSON', async () => {
  const contents = new Blob(['stored object bytes'], { type: 'application/octet-stream' });
  const backend = blobResponse(contents);
  fetch.mockResolvedValue(backend);
  setAccessToken('access-token');

  await expect(apiRequest('/api/storage/buckets/bucket-one/objects/manual.pdf', {
    responseType: 'blob',
  })).resolves.toBe(contents);

  expect(backend.blob).toHaveBeenCalledTimes(1);
  expect(backend.json).not.toHaveBeenCalled();
  const options = fetch.mock.calls[0][1];
  expect(header(options, 'Authorization')).toBe('Bearer access-token');
  expect(options.responseType).toBeUndefined();
});

test('binary request errors remain JSON ApiErrors with their original status and details', async () => {
  const details = { error: 'You do not own this bucket', code: 'BUCKET_FORBIDDEN' };
  const backend = jsonResponse(details, 403);
  fetch.mockResolvedValue(backend);

  const failure = await apiRequest('/api/storage/buckets/another-users-bucket/objects/private.pdf', {
    responseType: 'blob',
  }).catch((error) => error);

  expect(failure).toBeInstanceOf(ApiError);
  expect(failure).toMatchObject({ status: 403, message: details.error, data: details });
  expect(backend.json).toHaveBeenCalledTimes(1);
  expect(backend.blob).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('parallel expired upload and download requests share one refresh and preserve binary options on retry', async () => {
  const uploadPath = '/api/storage/buckets/bucket-one/objects/diagram.png';
  const downloadPath = '/api/storage/buckets/bucket-one/objects/manual.pdf';
  const file = new File(['upload bytes'], 'diagram.png', { type: 'image/png' });
  const downloaded = new Blob(['download bytes'], { type: 'application/pdf' });
  let resolveRefresh;
  setAccessToken('expired-access-token');
  global.fetch = jest.fn((url, options) => {
    const path = pathOf(url);
    if (path === '/api/auth/refresh') return new Promise((resolve) => { resolveRefresh = resolve; });
    if (![uploadPath, downloadPath].includes(path)) throw new Error(`Unexpected request: ${url}`);
    if (header(options, 'Authorization') === 'Bearer expired-access-token') {
      return Promise.resolve(jsonResponse({ error: 'Access token expired' }, 401));
    }
    if (header(options, 'Authorization') !== 'Bearer renewed-access-token') {
      throw new Error('A renewed access token is required');
    }
    return Promise.resolve(path === uploadPath ? jsonResponse({ id: 'object-one' }, 201) : blobResponse(downloaded));
  });

  const upload = apiRequest(uploadPath, { method: 'PUT', body: file, rawBody: true, headers: { 'Content-Type': file.type } });
  const download = apiRequest(downloadPath, { responseType: 'blob' });
  await waitFor(() => expect(callsTo('/api/auth/refresh')).toHaveLength(1));
  resolveRefresh(jsonResponse(SESSION));
  await expect(Promise.all([upload, download])).resolves.toEqual([{ id: 'object-one' }, downloaded]);

  expect(callsTo('/api/auth/refresh')).toHaveLength(1);
  expect(callsTo(uploadPath)).toHaveLength(2);
  expect(callsTo(downloadPath)).toHaveLength(2);
  for (const [, options] of callsTo(uploadPath)) {
    expect(options.body).toBe(file);
    expect(header(options, 'Content-Type')).toBe('image/png');
  }
  expect(header(callsTo(uploadPath)[1][1], 'Authorization')).toBe('Bearer renewed-access-token');
  expect(header(callsTo(downloadPath)[1][1], 'Authorization')).toBe('Bearer renewed-access-token');
  expect(localStorage.getItem('token')).toBeNull();
});

test('a private object still denied after refresh never falls back to a public data endpoint', async () => {
  const path = '/api/storage/buckets/private-bucket/objects/secret.txt';
  const denied = [];
  setAccessToken('expired-access-token');
  global.fetch = jest.fn((url) => {
    if (pathOf(url) === '/api/auth/refresh') return Promise.resolve(jsonResponse(SESSION));
    if (pathOf(url) === path) {
      const backend = jsonResponse({ error: 'Object access denied' }, 401);
      denied.push(backend);
      return Promise.resolve(backend);
    }
    if (pathOf(url) === '/api/probe') return Promise.resolve(jsonResponse({ ok: true }));
    throw new Error(`Unexpected request: ${url}`);
  });

  await expect(apiRequest(path, { responseType: 'blob' })).rejects.toMatchObject({
    name: 'ApiError', status: 401, message: 'Object access denied',
  });
  expect(fetch.mock.calls.map(([url]) => pathOf(url))).toEqual([path, '/api/auth/refresh', path]);
  for (const backend of denied) {
    expect(backend.json).toHaveBeenCalledTimes(1);
    expect(backend.blob).not.toHaveBeenCalled();
  }
  await apiRequest('/api/probe', { retryAuth: false });
  expect(header(callsTo('/api/probe')[0][1], 'Authorization')).toBeUndefined();
});
