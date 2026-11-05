/** A deliberately small query engine. Every identifier comes from this static catalog. */
export class EngineError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'EngineError';
    this.status = status;
  }
}

const MAX_PAGE_SIZE = 100;
const MAX_FILTERS = 20;
const MAX_TEXT_LENGTH = 2000;
const METHODS = ['GET', 'POST', 'PATCH', 'DELETE'];
const ACCESS = ['app_user', 'developer', 'public'];
const DEFINITION_KEYS = ['name', 'path', 'method', 'table', 'columns', 'filters', 'orderBy', 'limit', 'access', 'include', 'defaults'];
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const field = (name, type, options = {}) => ({ name, type, nullable: false, primaryKey: false, writable: true, required: true, ...options });
const idColumn = () => field('id', 'INTEGER', { primaryKey: true, writable: false, required: false });
const createdColumn = () => field('created_at', 'TEXT', { writable: false, required: false });

const TABLES = Object.freeze({
  products: {
    columns: [idColumn(), field('name', 'TEXT'), field('description', 'TEXT', { nullable: true, required: false }), field('price', 'REAL'), field('stock', 'INTEGER'), field('status', 'TEXT'), createdColumn()],
    relationships: [],
    exampleBody: { name: 'Canvas tote bag', description: 'A reusable everyday bag.', price: 18, stock: 42, status: 'active' },
  },
  customers: {
    columns: [idColumn(), field('name', 'TEXT'), field('email', 'TEXT'), field('status', 'TEXT'), createdColumn()],
    relationships: [],
    exampleBody: { name: 'Alex Morgan', email: 'alex@example.com', status: 'active' },
  },
  orders: {
    columns: [idColumn(), field('customer_id', 'INTEGER'), field('product_id', 'INTEGER'), field('quantity', 'INTEGER'), field('amount', 'REAL'), field('status', 'TEXT'), createdColumn()],
    relationships: [
      { id: 'product', label: 'Product', table: 'products', foreignKey: 'product_id' },
      { id: 'customer', label: 'Customer', table: 'customers', foreignKey: 'customer_id' },
    ],
    exampleBody: { customer_id: 1, product_id: 1, quantity: 2, amount: 36, status: 'pending' },
  },
});

const OPERATORS = Object.freeze([
  { id: 'eq', label: 'equals' }, { id: 'neq', label: 'does not equal' },
  { id: 'gt', label: 'greater than' }, { id: 'gte', label: 'greater than or equal' },
  { id: 'lt', label: 'less than' }, { id: 'lte', label: 'less than or equal' },
  { id: 'contains', label: 'contains' }, { id: 'in', label: 'is in a list' },
  { id: 'is_null', label: 'is null' },
]);
const OPERATOR_IDS = new Set(OPERATORS.map(operator => operator.id));
const COMPARISONS = Object.freeze({ eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' });
const JOIN_FIELDS = Object.freeze({ product: ['id', 'name', 'price'], customer: ['id', 'name', 'email'] });

export function getCatalog() {
  return {
    tables: Object.entries(TABLES).map(([id, table]) => ({
      id, name: id, schema: 'main', columns: table.columns.map(column => ({ ...column })),
      relationships: table.relationships.map(relationship => ({ ...relationship })), exampleBody: { ...table.exampleBody },
    })),
    operators: OPERATORS.map(operator => ({ ...operator })),
    limits: { maxPageSize: MAX_PAGE_SIZE, maxEndpoints: 25 },
  };
}

// A fresh snapshot is also exported for consumers that need declarative metadata.
export const catalog = getCatalog();

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new EngineError(400, `${label} must be an object`);
  return value;
}

function keys(value, permitted, label) {
  for (const key of Object.keys(value)) {
    if (!permitted.includes(key)) throw new EngineError(400, `${label} contains an unsupported field: ${key.slice(0, 80)}`);
  }
}

function safeText(value, label, { min = 0, max = MAX_TEXT_LENGTH, trim = false, controls = false } = {}) {
  if (typeof value !== 'string') throw new EngineError(400, `${label} must be text`);
  const result = trim ? value.trim() : value;
  if (result.length < min || result.length > max || (controls && Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))) {
    throw new EngineError(400, `${label} must contain ${min} to ${max} characters${controls ? ' without control characters' : ''}`);
  }
  return result;
}

function columnFor(table, name) {
  if (typeof name !== 'string') throw new EngineError(400, 'Choose a supported column');
  const column = TABLES[table].columns.find(item => item.name === name);
  if (!column) throw new EngineError(400, `Unsupported column for ${table}`);
  return column;
}

function numeric(value, label, integer, query = false) {
  let number = value;
  if (query && typeof value === 'string') {
    const text = value.trim();
    if (!(integer ? /^[+-]?\d+$/ : /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i).test(text)) throw new EngineError(400, `${label} must be ${integer ? 'an integer' : 'a finite number'}`);
    number = Number(text);
  }
  if (typeof number !== 'number' || !Number.isFinite(number) || (integer && !Number.isSafeInteger(number))) throw new EngineError(400, `${label} must be ${integer ? 'a safe integer' : 'a finite number'}`);
  return number;
}

function columnValue(table, name, value, { query = false, write = false } = {}) {
  const column = columnFor(table, name);
  if (value === null) {
    if (!column.nullable) throw new EngineError(400, `${name} cannot be null`);
    return null;
  }
  if (column.type === 'INTEGER' || column.type === 'REAL') {
    const number = numeric(value, name, column.type === 'INTEGER', query);
    if (write) {
      const positive = ['customer_id', 'product_id', 'quantity'].includes(name);
      if (number < (positive ? 1 : 0)) throw new EngineError(400, `${name} must be ${positive ? 'positive' : 'zero or greater'}`);
    }
    return number;
  }
  const text = safeText(value, name, { min: write && !column.nullable ? 1 : 0, trim: write && name !== 'description' });
  if (write && name === 'email' && (text.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) || Array.from(text).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))) {
    throw new EngineError(400, 'Provide a valid customer email address');
  }
  return write && name === 'email' ? text.toLowerCase() : text;
}

function boolean(value, label, query = false) {
  if (query && value === 'true') return true;
  if (query && value === 'false') return false;
  if (typeof value !== 'boolean') throw new EngineError(400, `${label} must be true or false`);
  return value;
}

function filterValue(table, filter, value, query = false) {
  const column = columnFor(table, filter.column);
  if (filter.operator === 'is_null') return boolean(value, 'The is_null value', query);
  if (filter.operator === 'in') {
    let values = value;
    if (query && typeof value === 'string') {
      if (value.trim().startsWith('[')) {
        try { values = JSON.parse(value); } catch { throw new EngineError(400, 'The in filter requires a list of values'); }
      } else values = value.split(',').map(item => item.trim());
    }
    if (!Array.isArray(values) || values.length < 1 || values.length > 20) throw new EngineError(400, 'The in filter requires 1 to 20 values');
    return values.map(item => columnValue(table, filter.column, item, { query }));
  }
  if (filter.operator === 'contains') {
    if (column.type !== 'TEXT') throw new EngineError(400, 'The contains operator requires a text column');
    return safeText(value, 'The contains value');
  }
  if (value === null && !['eq', 'neq'].includes(filter.operator)) throw new EngineError(400, 'Null comparisons require equals, does not equal, or is_null');
  return columnValue(table, filter.column, value, { query });
}

function normalizeFilter(table, value) {
  const input = object(value, 'Filter');
  keys(input, ['column', 'operator', 'source', 'value', 'parameter', 'required'], 'Filter');
  columnFor(table, input.column);
  if (!OPERATOR_IDS.has(input.operator)) throw new EngineError(400, 'Choose a supported filter operator');
  if (input.operator === 'contains' && columnFor(table, input.column).type !== 'TEXT') throw new EngineError(400, 'The contains operator requires a text column');
  if (!['literal', 'query'].includes(input.source)) throw new EngineError(400, 'Filter source must be literal or query');
  if (input.required !== undefined && typeof input.required !== 'boolean') throw new EngineError(400, 'Filter required must be true or false');
  const result = { column: input.column, operator: input.operator, source: input.source, required: input.required ?? false };
  if (input.source === 'literal') {
    if (!own(input, 'value') || own(input, 'parameter')) throw new EngineError(400, 'Literal filters require a value and no query parameter');
    result.value = filterValue(table, result, input.value);
  } else {
    if (own(input, 'value') || typeof input.parameter !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(input.parameter) || ['project_id', 'projectId', '__proto__', 'constructor', 'prototype'].includes(input.parameter)) {
      throw new EngineError(400, 'Query filters require a safe parameter name and no literal value');
    }
    result.parameter = input.parameter;
  }
  return result;
}

function writableValues(table, value, label, { complete = false } = {}) {
  const input = object(value, label);
  const permitted = TABLES[table].columns.filter(column => column.writable).map(column => column.name);
  keys(input, permitted, label);
  const result = {};
  for (const key of Object.keys(input)) result[key] = columnValue(table, key, input[key], { write: true });
  if (complete) {
    for (const column of TABLES[table].columns) {
      if (column.writable && !own(result, column.name)) {
        if (column.required) throw new EngineError(400, `${column.name} is required`);
        if (column.nullable) result[column.name] = null;
      }
    }
  }
  return result;
}

export function normalizeDefinition(value) {
  const input = object(value, 'Endpoint definition');
  keys(input, DEFINITION_KEYS, 'Endpoint definition');
  const name = safeText(input.name, 'Endpoint name', { min: 1, max: 80, trim: true, controls: true });
  const path = safeText(input.path, 'Endpoint path', { min: 2, max: 120, trim: true, controls: true });
  if (!/^\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*){0,2}$/.test(path)) throw new EngineError(400, 'Path must contain 1 to 3 lowercase slug segments beginning with a letter');
  if (typeof input.table !== 'string' || !own(TABLES, input.table)) throw new EngineError(400, 'Choose products, customers, or orders');
  const table = input.table;
  const method = input.method === undefined ? 'GET' : typeof input.method === 'string' ? input.method.toUpperCase() : '';
  if (!METHODS.includes(method)) throw new EngineError(400, 'Method must be GET, POST, PATCH, or DELETE');
  const access = input.access === undefined ? (method === 'GET' ? 'app_user' : 'developer') : input.access;
  if (!ACCESS.includes(access) || (access === 'public' && method !== 'GET')) throw new EngineError(400, 'Public access is available only for GET endpoints');
  const columns = input.columns === undefined ? TABLES[table].columns.map(column => column.name) : input.columns;
  if (!Array.isArray(columns) || !columns.length || columns.length > TABLES[table].columns.length || new Set(columns).size !== columns.length) throw new EngineError(400, 'Choose a non-empty list of unique visible columns');
  columns.forEach(column => columnFor(table, column));
  const filters = input.filters === undefined ? [] : input.filters;
  if (!Array.isArray(filters) || filters.length > MAX_FILTERS) throw new EngineError(400, `Use at most ${MAX_FILTERS} filters`);
  if (method === 'POST' && filters.length) throw new EngineError(400, 'POST endpoints do not support row filters');
  const normalizedFilters = filters.map(filter => normalizeFilter(table, filter));
  let orderBy = input.orderBy === undefined ? { column: 'id', direction: 'asc' } : input.orderBy;
  if (orderBy !== null) {
    object(orderBy, 'Sort order');
    keys(orderBy, ['column', 'direction'], 'Sort order');
    columnFor(table, orderBy.column);
    if (!['asc', 'desc'].includes(orderBy.direction)) throw new EngineError(400, 'Sort direction must be asc or desc');
    orderBy = { column: orderBy.column, direction: orderBy.direction };
  }
  const limit = input.limit === undefined ? 25 : input.limit;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) throw new EngineError(400, 'Row limit must be an integer from 1 to 100');
  const include = input.include === undefined ? [] : input.include;
  if (!Array.isArray(include) || new Set(include).size !== include.length || include.length > 2 || include.some(item => !['product', 'customer'].includes(item)) || (include.length && (table !== 'orders' || method !== 'GET'))) throw new EngineError(400, 'Only GET orders endpoints can include product or customer relationships');
  const defaults = writableValues(table, input.defaults === undefined ? {} : input.defaults, 'Default values');
  if (method !== 'POST' && Object.keys(defaults).length) throw new EngineError(400, 'Default values are supported only for POST endpoints');
  return { name, path, method, table, columns: [...columns], filters: normalizedFilters, orderBy: method === 'GET' ? orderBy : null, limit, access, include: [...include], defaults };
}

function positiveInteger(value, label, max = Number.MAX_SAFE_INTEGER) {
  let number = value;
  if (typeof value === 'string') {
    if (!/^[1-9]\d*$/.test(value)) throw new EngineError(400, `${label} must be a positive integer`);
    number = Number(value);
  }
  if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new EngineError(400, `${label} must be an integer from 1 to ${max}`);
  return number;
}

function requestedId(id, params, method) {
  const explicit = id !== undefined;
  const inParams = own(params, 'id');
  if (method === 'POST' && (explicit || inParams)) throw new EngineError(400, 'POST allocates a record ID; do not supply an ID');
  const first = explicit ? positiveInteger(id, 'Record ID') : undefined;
  const second = inParams ? positiveInteger(params.id, 'Record ID') : undefined;
  if (first !== undefined && second !== undefined && first !== second) throw new EngineError(400, 'The path and query record IDs must match');
  const result = first ?? second;
  if (['PATCH', 'DELETE'].includes(method) && result === undefined) throw new EngineError(400, 'A record ID is required for this mutation');
  return result;
}

function whereClause(definition, projectId, params, id) {
  const clauses = ['t."project_id" = ?'];
  const values = [projectId];
  if (id !== undefined) { clauses.push('t."id" = ?'); values.push(id); }
  for (const filter of definition.filters) {
    let value = filter.value;
    if (filter.source === 'query') {
      const present = own(params, filter.parameter) && params[filter.parameter] !== undefined && params[filter.parameter] !== null && params[filter.parameter] !== '';
      if (!present) {
        if (filter.required) throw new EngineError(400, `Query parameter ${filter.parameter} is required`);
        continue;
      }
      value = filterValue(definition.table, filter, params[filter.parameter], true);
    }
    const column = `t."${filter.column}"`;
    if (filter.operator === 'is_null') clauses.push(`${column} IS ${value ? '' : 'NOT '}NULL`);
    else if (filter.operator === 'contains') {
      clauses.push(`${column} LIKE ? ESCAPE '\\'`);
      values.push(`%${value.replace(/[\\%_]/g, '\\$&')}%`);
    } else if (filter.operator === 'in') {
      const nonNull = value.filter(item => item !== null);
      const expressions = [];
      if (nonNull.length) { expressions.push(`${column} IN (${nonNull.map(() => '?').join(', ')})`); values.push(...nonNull); }
      if (nonNull.length !== value.length) expressions.push(`${column} IS NULL`);
      clauses.push(`(${expressions.join(' OR ')})`);
    } else if (value === null) clauses.push(`${column} IS ${filter.operator === 'neq' ? 'NOT ' : ''}NULL`);
    else { clauses.push(`${column} ${COMPARISONS[filter.operator]} ?`); values.push(value); }
  }
  return { sql: clauses.join(' AND '), parameters: values };
}

function selectParts(definition) {
  const selected = definition.columns.map(column => `t."${column}"`);
  const joins = [];
  for (const relationship of definition.include) {
    const table = relationship === 'product' ? 'products' : 'customers';
    joins.push(`LEFT JOIN "${table}" AS "${relationship}" ON "${relationship}"."id" = t."${relationship}_id" AND "${relationship}"."project_id" = t."project_id"`);
    for (const column of JOIN_FIELDS[relationship]) selected.push(`"${relationship}"."${column}" AS "__${relationship}_${column}"`);
  }
  return { selected: selected.join(', '), joins: joins.join(' ') };
}

function nestedRow(record, definition) {
  const row = {};
  for (const column of definition.columns) row[column] = record[column];
  for (const relationship of definition.include) {
    row[relationship] = record[`__${relationship}_id`] === null ? null : Object.fromEntries(JOIN_FIELDS[relationship].map(column => [column, record[`__${relationship}_${column}`]]));
  }
  return row;
}

function databaseFailure(error) {
  const message = error?.message || '';
  if (/FOREIGN KEY constraint failed/i.test(message)) throw new EngineError(409, 'A related record does not exist in this project, or this record is still referenced');
  if (/UNIQUE constraint failed|CHECK constraint failed/i.test(message)) throw new EngineError(409, 'The request conflicts with the current records');
  if (/NOT NULL constraint failed/i.test(message)) throw new EngineError(400, 'Some required record fields are missing');
  throw error;
}

/** Caller verifies project ownership / endpoint access. This engine never accepts an editable project predicate. */
export async function executeDefinition(env, { projectId, definition: value, params: query = {}, body: suppliedBody = {}, id } = {}) {
  const definition = normalizeDefinition(value);
  if (typeof projectId !== 'string' || !projectId || projectId.length > 128) throw new EngineError(400, 'A valid project ID is required');
  const params = object(query, 'Query parameters');
  if (own(params, 'project_id') || own(params, 'projectId')) throw new EngineError(400, 'Project ownership is managed by the server');
  const body = object(suppliedBody, 'Request body');
  const recordId = requestedId(id, params, definition.method);
  const table = `"${definition.table}"`;
  const returning = definition.columns.map(column => `"${column}"`).join(', ');
  try {
    if (definition.method === 'GET') {
      if (Object.keys(body).length) throw new EngineError(400, 'GET endpoints do not accept a request body');
      const page = params.page === undefined ? 1 : positiveInteger(params.page, 'Page');
      const pageSize = params.pageSize === undefined ? definition.limit : positiveInteger(params.pageSize, 'Page size', definition.limit);
      const offset = (page - 1) * pageSize;
      if (!Number.isSafeInteger(offset)) throw new EngineError(400, 'The requested page is too large');
      const where = whereClause(definition, projectId, params, recordId);
      const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${table} AS t WHERE ${where.sql}`).bind(...where.parameters).first();
      const parts = selectParts(definition);
      const sort = definition.orderBy || { column: 'id', direction: 'asc' };
      const order = `t."${sort.column}" ${sort.direction.toUpperCase()}${sort.column !== 'id' ? ', t."id" ASC' : ''}`;
      const sql = `SELECT ${parts.selected} FROM ${table} AS t ${parts.joins} WHERE ${where.sql} ORDER BY ${order} LIMIT ? OFFSET ?`;
      const parameters = [...where.parameters, pageSize, offset];
      const result = await env.DB.prepare(sql).bind(...parameters).all();
      const totalRows = Number(count?.total || 0);
      return { status: 200, body: {
        data: result.results.map(record => nestedRow(record, definition)),
        pagination: { page, pageSize, totalRows, totalPages: Math.max(1, Math.ceil(totalRows / pageSize)) },
        meta: { table: definition.table, method: definition.method },
      }, sql, parameters };
    }
    if (definition.method === 'POST') {
      const incoming = writableValues(definition.table, body, 'Request body');
      const values = writableValues(definition.table, { ...definition.defaults, ...incoming }, 'Record', { complete: true });
      const names = Object.keys(values);
      const sql = `INSERT INTO ${table} ("project_id", "id", ${names.map(name => `"${name}"`).join(', ')}, "created_at") SELECT ?, COALESCE(MAX("id"), 0) + 1, ${names.map(() => '?').join(', ')}, ? FROM ${table} WHERE "project_id" = ? HAVING COALESCE(MAX("id"), 0) < ? RETURNING ${returning}`;
      const parameters = [projectId, ...names.map(name => values[name]), new Date().toISOString(), projectId, Number.MAX_SAFE_INTEGER];
      const record = await env.DB.prepare(sql).bind(...parameters).first();
      if (!record) throw new EngineError(409, 'This project cannot allocate another record ID');
      return { status: 201, body: { data: record, meta: { table: definition.table, method: definition.method, affectedRows: 1 } }, sql, parameters };
    }
    const where = whereClause(definition, projectId, params, recordId);
    if (definition.method === 'PATCH') {
      const values = writableValues(definition.table, body, 'Request body');
      const names = Object.keys(values);
      if (!names.length) throw new EngineError(400, 'Provide at least one writable field to update');
      const sql = `UPDATE ${table} AS t SET ${names.map(name => `"${name}" = ?`).join(', ')} WHERE ${where.sql} RETURNING ${returning}`;
      const parameters = [...names.map(name => values[name]), ...where.parameters];
      const record = await env.DB.prepare(sql).bind(...parameters).first();
      if (!record) throw new EngineError(404, 'Record not found in this project or it did not match the endpoint filters');
      return { status: 200, body: { data: record, meta: { table: definition.table, method: definition.method, affectedRows: 1 } }, sql, parameters };
    }
    if (Object.keys(body).length) throw new EngineError(400, 'DELETE endpoints require an empty request body');
    const sql = `DELETE FROM ${table} AS t WHERE ${where.sql} RETURNING "id"`;
    const parameters = where.parameters;
    const deleted = await env.DB.prepare(sql).bind(...parameters).first();
    if (!deleted) throw new EngineError(404, 'Record not found in this project or it did not match the endpoint filters');
    return { status: 200, body: { data: { id: deleted.id }, meta: { affectedRows: 1 } }, sql, parameters };
  } catch (error) {
    if (error instanceof EngineError) throw error;
    return databaseFailure(error);
  }
}
