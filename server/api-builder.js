import { AppAuthError, appCors, authenticateApplicationUser } from './application-auth.js';
import { EngineError, executeDefinition, getCatalog, normalizeDefinition } from './api-engine.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 16 * 1024;
const LIMITS = Object.freeze({ maxEndpoints: 25, maxPageSize: 100 });
const RUNTIME_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'];
const encoder = new TextEncoder();

class BuilderError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...headers,
  } });
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function readJson(request, optional = false) {
  const declared = request.headers.get('Content-Length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
    throw new BuilderError(413, 'Request body is too large');
  }
  const reader = request.body?.getReader();
  const chunks = [];
  let length = 0;
  if (reader) {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_BODY_BYTES) {
          await reader.cancel();
          throw new BuilderError(413, 'Request body is too large');
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  if (optional && length === 0) return {};
  if ((request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new BuilderError(415, 'Content-Type must be application/json');
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new BuilderError(400, 'Provide a valid JSON object'); }
  if (!plainObject(value)) throw new BuilderError(400, 'Provide a valid JSON object');
  return value;
}

function assertKeys(value, keys) {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new BuilderError(400, 'Unsupported request field');
}

function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new BuilderError(400, 'Provide a valid positive revision');
  return value;
}

function uuid(value, label) {
  let id;
  try { id = decodeURIComponent(value); }
  catch { throw new BuilderError(404, `${label} not found`); }
  if (!UUID.test(id)) throw new BuilderError(404, `${label} not found`);
  return id;
}

function storedDefinition(value) {
  try { return normalizeDefinition(JSON.parse(value)); }
  catch { throw new BuilderError(503, 'This API configuration is temporarily unavailable'); }
}

function endpointView(record, request) {
  const definition = storedDefinition(record.definition);
  const publishedDefinition = record.published_definition === null ? null : storedDefinition(record.published_definition);
  const path = record.published_path || definition.path;
  return {
    id: record.id, definition, publishedDefinition, isPublished: publishedDefinition !== null,
    hasUnpublishedChanges: publishedDefinition === null || JSON.stringify(definition) !== JSON.stringify(publishedDefinition),
    revision: record.revision, createdAt: record.created_at, updatedAt: record.updated_at,
    publishedAt: record.published_at,
    runtimeUrl: `${new URL(request.url).origin}/api/apps/${record.project_id}/data${path}`,
  };
}

async function endpointRecord(env, projectId, endpointId) {
  const record = await env.DB.prepare('SELECT * FROM api_endpoints WHERE id = ? AND project_id = ?').bind(endpointId, projectId).first();
  if (!record) throw new BuilderError(404, 'API endpoint not found');
  return record;
}

function changed(result) {
  if (result.meta.changes !== 1) throw new BuilderError(409, 'This endpoint changed. Reload it before saving');
}

function routeCollision(error) {
  return /UNIQUE constraint failed: api_endpoints\.project_id, api_endpoints\.published_method, api_endpoints\.published_path/i.test(error?.message || '');
}

async function createEndpoint(request, env, projectId) {
  const body = await readJson(request);
  assertKeys(body, ['definition']);
  const definition = normalizeDefinition(body.definition);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`
    INSERT INTO api_endpoints (id, project_id, definition, revision, created_at, updated_at)
    SELECT ?, ?, ?, 1, ?, ? WHERE (SELECT COUNT(*) FROM api_endpoints WHERE project_id = ?) < ?
  `).bind(id, projectId, JSON.stringify(definition), now, now, projectId, LIMITS.maxEndpoints).run();
  if (result.meta.changes !== 1) throw new BuilderError(409, 'This project has reached its 25-endpoint limit');
  return json({ endpoint: endpointView(await endpointRecord(env, projectId, id), request) }, 201);
}

async function updateEndpoint(request, env, projectId, endpointId) {
  const body = await readJson(request);
  assertKeys(body, ['definition', 'revision']);
  const expected = revision(body.revision);
  const definition = normalizeDefinition(body.definition);
  await endpointRecord(env, projectId, endpointId);
  const result = await env.DB.prepare(`
    UPDATE api_endpoints SET definition = ?, revision = revision + 1, updated_at = ?
    WHERE id = ? AND project_id = ? AND revision = ?
  `).bind(JSON.stringify(definition), new Date().toISOString(), endpointId, projectId, expected).run();
  changed(result);
  return json({ endpoint: endpointView(await endpointRecord(env, projectId, endpointId), request) });
}

async function publishEndpoint(request, env, projectId, endpointId, publish) {
  const body = await readJson(request);
  assertKeys(body, ['revision']);
  const expected = revision(body.revision);
  const record = await endpointRecord(env, projectId, endpointId);
  if (record.revision !== expected) throw new BuilderError(409, 'This endpoint changed. Reload it before saving');
  const definition = publish ? storedDefinition(record.definition) : null;
  const now = new Date().toISOString();
  let result;
  try {
    result = await env.DB.prepare(`
      UPDATE api_endpoints SET published_definition = ?, published_method = ?, published_path = ?,
        published_at = ?, updated_at = ?, revision = revision + 1
      WHERE id = ? AND project_id = ? AND revision = ?
    `).bind(definition ? JSON.stringify(definition) : null, definition?.method ?? null, definition?.path ?? null,
      publish ? now : null, now, endpointId, projectId, expected).run();
  } catch (error) {
    if (routeCollision(error)) throw new BuilderError(409, 'An endpoint with this method and path is already published');
    throw error;
  }
  changed(result);
  return json({ endpoint: endpointView(await endpointRecord(env, projectId, endpointId), request) });
}

async function deleteEndpoint(request, env, projectId, endpointId) {
  const values = new URL(request.url).searchParams.getAll('revision');
  if (values.length !== 1 || !/^[1-9]\d*$/.test(values[0])) throw new BuilderError(400, 'Provide a valid positive revision');
  const expected = revision(Number(values[0]));
  await endpointRecord(env, projectId, endpointId);
  changed(await env.DB.prepare('DELETE FROM api_endpoints WHERE id = ? AND project_id = ? AND revision = ?').bind(endpointId, projectId, expected).run());
  return json({ message: 'API endpoint deleted' });
}

async function testEndpoint(request, env, projectId, user) {
  const payload = await readJson(request);
  assertKeys(payload, ['definition', 'params', 'body', 'id']);
  const definition = normalizeDefinition(payload.definition);
  if (payload.params !== undefined && !plainObject(payload.params)) throw new BuilderError(400, 'params must be an object');
  if (payload.body !== undefined && !plainObject(payload.body)) throw new BuilderError(400, 'body must be an object');
  const started = performance.now();
  const result = await executeDefinition(env, {
    projectId, definition, params: payload.params || {}, body: payload.body || {}, id: payload.id,
    actor: { type: 'developer', user },
  });
  return json({ status: result.status, body: result.body, durationMs: Math.round((performance.now() - started) * 100) / 100,
    sql: result.sql, parameters: result.parameters });
}

async function admin(request, env, route, context) {
  const { assertOrigin, authenticateBuilder, requireProject } = context;
  if (['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(request.method)) assertOrigin(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': new URL(request.url).origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', Vary: 'Origin', 'Cache-Control': 'no-store',
  } });
  const { user } = await authenticateBuilder(request, env);
  const projectId = uuid(route[1], 'Project');
  await requireProject(env, projectId, user.id);
  const action = route[2] || '';
  if (action !== 'endpoints' && (route[3] || route[4])) throw new BuilderError(404, 'API builder route not found');
  if (action === 'catalog' && request.method === 'GET') return json({ ...getCatalog(), limits: LIMITS });
  if (action === 'test' && request.method === 'POST') return testEndpoint(request, env, projectId, user);
  if (action !== 'endpoints') throw new BuilderError(404, 'API builder route not found');
  const endpointId = route[3] ? uuid(route[3], 'API endpoint') : null;
  const operation = route[4] || '';
  if (!endpointId && !operation && request.method === 'GET') {
    const result = await env.DB.prepare('SELECT * FROM api_endpoints WHERE project_id = ? ORDER BY created_at ASC, id ASC').bind(projectId).all();
    return json({ endpoints: result.results.map(record => endpointView(record, request)), limits: LIMITS });
  }
  if (!endpointId && !operation && request.method === 'POST') return createEndpoint(request, env, projectId);
  if (endpointId && !operation && request.method === 'GET') return json({ endpoint: endpointView(await endpointRecord(env, projectId, endpointId), request) });
  if (endpointId && !operation && request.method === 'PUT') return updateEndpoint(request, env, projectId, endpointId);
  if (endpointId && !operation && request.method === 'DELETE') return deleteEndpoint(request, env, projectId, endpointId);
  if (endpointId && operation === 'publish' && request.method === 'POST') return publishEndpoint(request, env, projectId, endpointId, true);
  if (endpointId && operation === 'unpublish' && request.method === 'POST') return publishEndpoint(request, env, projectId, endpointId, false);
  throw new BuilderError(404, 'API builder route not found');
}

function queryParams(url) {
  const params = Object.create(null);
  for (const [key, value] of url.searchParams) {
    if (Object.hasOwn(params, key)) throw new BuilderError(400, 'Duplicate query parameters are not supported');
    if (key.length > 100 || encoder.encode(value).length > 2048) throw new BuilderError(400, 'Query parameter is too large');
    params[key] = value;
  }
  return params;
}

async function runtime(request, env, route, context, setCors) {
  const projectId = uuid(route[1], 'Application project');
  const cors = await appCors(request, env, projectId);
  setCors(cors);
  if (request.method === 'OPTIONS') {
    const method = request.headers.get('Access-Control-Request-Method');
    if (method && !RUNTIME_METHODS.includes(method)) throw new BuilderError(405, 'API method not allowed', { Allow: `${RUNTIME_METHODS.join(', ')}, OPTIONS` });
    const headers = (request.headers.get('Access-Control-Request-Headers') || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    if (headers.some(value => !['content-type', 'authorization'].includes(value))) throw new BuilderError(400, 'Unsupported API request headers');
    return new Response(null, { status: 204, headers: {
      ...cors, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  }
  if (!RUNTIME_METHODS.includes(request.method)) throw new BuilderError(405, 'API method not allowed', { Allow: `${RUNTIME_METHODS.join(', ')}, OPTIONS` });
  const parts = (route[2] || '').split('/');
  let id;
  if (parts.length > 1 && /^\d+$/.test(parts.at(-1))) {
    id = parts.pop();
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new BuilderError(400, 'Provide a valid positive row id');
  }
  if (parts.length < 1 || parts.length > 3 || parts.some(part => !/^[a-z][a-z0-9-]*$/.test(part))) throw new BuilderError(404, 'Published API endpoint not found');
  const path = `/${parts.join('/')}`;
  if (path.length > 120) throw new BuilderError(404, 'Published API endpoint not found');
  const record = await env.DB.prepare(`
    SELECT published_definition FROM api_endpoints
    WHERE project_id = ? AND published_method = ? AND published_path = ? AND published_definition IS NOT NULL
  `).bind(projectId, request.method, path).first();
  if (!record) throw new BuilderError(404, 'Published API endpoint not found');
  const definition = storedDefinition(record.published_definition);
  // Access is attached to the published snapshot. An unfinished draft cannot
  // downgrade the permissions of the live API.
  let actor;
  if (definition.access === 'developer') {
    const { user } = await context.authenticateBuilder(request, env);
    await context.requireProject(env, projectId, user.id);
    actor = { type: 'developer', user };
  } else if (definition.access === 'app_user') {
    actor = { type: 'app_user', user: await authenticateApplicationUser(request, env, projectId) };
  } else if (definition.access === 'public' && definition.method === 'GET') {
    actor = { type: 'public' };
  } else throw new BuilderError(403, 'This API access policy is not supported');
  const params = queryParams(new URL(request.url));
  let body = {};
  if (['POST', 'PATCH'].includes(request.method)) body = await readJson(request);
  else if (request.method === 'DELETE') body = await readJson(request, true);
  const result = await executeDefinition(env, { projectId, definition, params, body, id, actor });
  return json(result.body, result.status, cors);
}

/** Handle only builder configuration and published project data APIs. */
export async function handleApiBuilder(request, env, context) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  const adminRoute = /^\/api\/projects\/([^/]+)\/api-builder(?:\/(catalog|test|endpoints)(?:\/([^/]+)(?:\/(publish|unpublish))?)?)?$/.exec(path);
  const runtimeRoute = /^\/api\/apps\/([^/]+)\/data(?:\/(.*))?$/.exec(path);
  if (!adminRoute && !runtimeRoute) return null;
  let cors = runtimeRoute ? { Vary: 'Origin' } : {};
  try {
    if (!env.DB) throw new BuilderError(503, 'API service is temporarily unavailable');
    return adminRoute ? await admin(request, env, adminRoute, context) : await runtime(request, env, runtimeRoute, context, value => { cors = value; });
  } catch (error) {
    // Context callbacks throw the owner's existing safe HTTP errors. Keep their
    // status while preserving runtime CORS, without exposing database failures.
    if (error instanceof BuilderError || error instanceof EngineError || error instanceof AppAuthError ||
      (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500)) {
      return json({ error: error.message }, error.status, { ...cors, ...error.headers });
    }
    console.error('Grupedia API builder failed', { errorType: error?.name || 'Error' });
    return json({ error: 'API request failed. Please try again' }, 500, cors);
  }
}
