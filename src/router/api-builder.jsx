import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LuArrowUpRight, LuBraces, LuCheck, LuChevronRight, LuCode, LuCopy, LuDownload, LuGlobe, LuInfo, LuLoaderCircle, LuLockKeyhole, LuPlay, LuPlus, LuRefreshCw, LuSave, LuSearch, LuSend, LuTrash2, LuTriangleAlert, LuUnplug, LuX } from 'react-icons/lu';
import { useWorkspace, WorkspaceNavigation } from '../components/dashboard/DashboardLayout';
import { apiRequest } from '../lib/api';
import './api-builder.css';

const METHODS = ['GET', 'POST', 'PATCH', 'DELETE'];
const TABS = ['Builder', 'Test', 'Code'];
const FALLBACK_OPERATORS = [{ id: 'eq', label: 'Equals' }, { id: 'neq', label: 'Does not equal' }, { id: 'gt', label: 'Greater than' }, { id: 'gte', label: 'Greater than or equal' }, { id: 'lt', label: 'Less than' }, { id: 'lte', label: 'Less than or equal' }, { id: 'contains', label: 'Contains' }, { id: 'in', label: 'In list' }, { id: 'is_null', label: 'Is null' }];
const pretty = (value) => JSON.stringify(value, null, 2);
const pathId = (value) => encodeURIComponent(String(value));

function parseObject(text, label) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error(`${label} must contain valid JSON.`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a JSON object.`);
  return value;
}

function readDefinition(text) {
  const value = parseObject(text, 'Endpoint definition');
  if (!METHODS.includes(value.method) || typeof value.name !== 'string' || typeof value.path !== 'string' || typeof value.table !== 'string') throw new Error('The definition needs a name, path, supported method, and source table.');
  if (!Array.isArray(value.columns) || !Array.isArray(value.filters) || !Array.isArray(value.include)) throw new Error('Definition columns, filters, and include must be arrays.');
  if (!value.columns.every((column) => typeof column === 'string') || !value.include.every((name) => typeof name === 'string')) throw new Error('Column and relationship names must be strings.');
  if (value.filters.some((filter) => !filter || typeof filter !== 'object' || Array.isArray(filter) || typeof filter.column !== 'string' || typeof filter.operator !== 'string' || !['literal', 'query'].includes(filter.source) || (filter.parameter !== undefined && typeof filter.parameter !== 'string'))) throw new Error('Every filter needs a column, operator, and literal or query source.');
  if (value.orderBy !== null && (!value.orderBy || typeof value.orderBy !== 'object' || Array.isArray(value.orderBy) || typeof value.orderBy.column !== 'string' || !['asc', 'desc'].includes(value.orderBy.direction))) throw new Error('Definition orderBy must be an object or null.');
  if (!value.defaults || typeof value.defaults !== 'object' || Array.isArray(value.defaults)) throw new Error('Definition defaults must be an object.');
  if (!['app_user', 'developer', 'public'].includes(value.access)) throw new Error('Choose app_user, developer, or public access.');
  if (value.method !== 'GET' && value.access === 'public') throw new Error('Public access is available only for GET endpoints.');
  return value;
}

function makeTemplate(catalog, kind = 'products', sourceTable) {
  const id = sourceTable || (kind === 'customer' ? 'customers' : kind === 'orders' ? 'orders' : 'products');
  const table = catalog.tables.find((item) => item.id === id) || catalog.tables[0];
  const method = kind === 'customer' ? 'POST' : 'GET';
  return {
    name: sourceTable ? `List ${table.name}` : kind === 'customer' ? 'Create customer' : kind === 'orders' ? 'Orders with details' : 'List products',
    path: `/${table.id}`, method, table: table.id,
    columns: table.columns.map((column) => column.name), filters: [], orderBy: null, limit: 25,
    access: method === 'GET' ? 'app_user' : 'developer',
    include: kind === 'orders' ? (table.relationships || []).map((item) => item.id) : [], defaults: {},
  };
}

function Message({ kind = 'empty', title, children, onRetry }) {
  const Icon = kind === 'loading' ? LuLoaderCircle : kind === 'error' ? LuTriangleAlert : LuBraces;
  return <div className={`db-editor-message apib-message${kind === 'error' ? ' db-message-error' : ''}`} role={kind === 'error' ? 'alert' : 'status'}><span className="db-message-icon"><Icon aria-hidden="true" /></span><h2>{title}</h2>{children && <p>{children}</p>}{onRetry && <button type="button" className="db-button" onClick={onRetry}><LuRefreshCw aria-hidden="true" />Try again</button>}</div>;
}

function Dialog({ title, busy, onClose, children }) {
  const ref = useRef(null);
  const close = useRef(null);
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement;
    if (typeof element.showModal === 'function') element.showModal(); else element.setAttribute('open', '');
    close.current?.focus();
    return () => { if (typeof element.close === 'function' && element.open) element.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} className="db-api-dialog apib-dialog" aria-labelledby="apib-dialog-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><div className="db-dialog-body"><div className="db-dialog-heading"><span className="db-dialog-icon"><LuBraces aria-hidden="true" /></span><button ref={close} type="button" className="db-icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><LuX aria-hidden="true" /></button></div><h2 id="apib-dialog-title">{title}</h2>{children}</div></dialog>;
}

function JsonField({ label, value, onChange, rows = 8, disabled = false, help }) {
  const id = `apib-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <label className="apib-field" htmlFor={id}><span>{label}</span><textarea id={id} className="apib-json-input" aria-label={label} spellCheck="false" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} aria-describedby={help ? `${id}-help` : undefined} />{help && <small id={`${id}-help`}>{help}</small>}</label>;
}

function LiteralInput({ filter, column, disabled, onChange }) {
  const label = `Filter value for ${filter.column || 'column'}`;
  if (filter.operator === 'is_null') return <label className="apib-field"><span>Null check</span><select aria-label={label} value={String(filter.value ?? true)} disabled={disabled} onChange={(event) => onChange(event.target.value === 'true')}><option value="true">Is null</option><option value="false">Is not null</option></select></label>;
  if (filter.operator === 'in') return <label className="apib-field"><span>Values (JSON array)</span><input aria-label={label} value={Array.isArray(filter.value) ? JSON.stringify(filter.value) : String(filter.value ?? '')} disabled={disabled} placeholder={'["value", "another"]'} onChange={(event) => { let value; try { value = JSON.parse(event.target.value); } catch { value = event.target.value; } onChange(value); }} /></label>;
  const numeric = /INT|REAL|NUM|DEC|FLOAT|DOUBLE/i.test(column?.type || '');
  return <label className="apib-field"><span>Value</span><input aria-label={label} type={numeric ? 'number' : 'text'} value={filter.value ?? ''} disabled={disabled} onChange={(event) => onChange(numeric && event.target.value !== '' ? Number(event.target.value) : event.target.value)} /></label>;
}

function DefinitionForm({ definition, catalog, disabled, onChange, defaultsText, setDefaultsText }) {
  const table = catalog.tables.find((item) => item.id === definition.table);
  const columns = table?.columns || [];
  const operators = catalog.operators?.length ? catalog.operators : FALLBACK_OPERATORS;
  function change(patch) { onChange({ ...definition, ...patch }); }
  function filterChange(index, patch) {
    change({ filters: definition.filters.map((filter, i) => {
      if (i !== index) return filter;
      const next = { ...filter, ...patch };
      if (next.operator === 'is_null') { next.source = 'literal'; if (typeof next.value !== 'boolean') next.value = true; }
      if (next.source === 'query') delete next.value;
      else { delete next.parameter; delete next.required; }
      return next;
    }) });
  }
  return <div className="apib-builder-form">
    <section className="apib-panel"><div className="apib-panel-heading"><h3>Endpoint</h3><p>Choose a route and the data it exposes.</p></div><div className="apib-form-grid">
      <label className="apib-field"><span>Endpoint name</span><input value={definition.name} maxLength={80} disabled={disabled} onChange={(event) => change({ name: event.target.value })} /></label>
      <label className="apib-field"><span>Route path</span><input aria-label="Route path" value={definition.path} maxLength={120} disabled={disabled} onChange={(event) => change({ path: event.target.value })} placeholder="/products" /><small>Use 1–3 lowercase path segments, each starting with a letter.</small></label>
      <label className="apib-field"><span>HTTP method</span><select value={definition.method} disabled={disabled} onChange={(event) => { const method = event.target.value; change({ method, access: method === 'GET' ? 'app_user' : 'developer', filters: method === 'POST' ? [] : definition.filters, include: method === 'GET' ? definition.include : [], orderBy: method === 'GET' ? definition.orderBy : null, defaults: {} }); }}>{METHODS.map((method) => <option key={method}>{method}</option>)}</select></label>
      <label className="apib-field"><span>Source table</span><select value={definition.table} disabled={disabled} onChange={(event) => { const next = catalog.tables.find((item) => item.id === event.target.value); change({ table: next.id, columns: next.columns.map((item) => item.name), filters: [], orderBy: null, include: [], defaults: {} }); }}>{catalog.tables.map((item) => <option key={item.id} value={item.id}>{item.schema}.{item.name}</option>)}</select></label>
    </div></section>
    <section className="apib-panel"><div className="apib-panel-heading"><h3>Response columns</h3><p>Select the fields returned by this endpoint.</p></div><fieldset className="apib-columns" disabled={disabled}><legend className="sr-only">Columns</legend>{columns.map((column) => <label key={column.name}><input type="checkbox" checked={definition.columns.includes(column.name)} onChange={(event) => change({ columns: event.target.checked ? [...definition.columns, column.name] : definition.columns.filter((name) => name !== column.name) })} /><code>{column.name}</code><small>{column.type}</small></label>)}</fieldset>{!definition.columns.length && <p className="apib-inline-error" role="alert">Select at least one response column.</p>}</section>
    {definition.method !== 'POST' && <section className="apib-panel"><div className="apib-panel-heading apib-panel-heading-action"><div><h3>Filters</h3><p>Bind a condition to a fixed value or a query parameter.</p></div><button type="button" className="db-button" disabled={disabled || definition.filters.length >= 10} onClick={() => change({ filters: [...definition.filters, { column: columns[0]?.name || '', operator: 'eq', source: 'literal', value: '' }] })}><LuPlus aria-hidden="true" />Add filter</button></div>
      {!definition.filters.length && <p className="apib-muted">No filters. Requests can access all matching project rows allowed by this endpoint.</p>}
      {definition.filters.map((filter, index) => <fieldset className="apib-filter" key={index} disabled={disabled}><legend>Filter {index + 1}</legend><div className="apib-filter-grid"><label className="apib-field"><span>Column</span><select aria-label={`Filter ${index + 1} column`} value={filter.column} onChange={(event) => filterChange(index, { column: event.target.value, value: '' })}>{columns.map((column) => <option key={column.name}>{column.name}</option>)}</select></label><label className="apib-field"><span>Operator</span><select aria-label={`Filter ${index + 1} operator`} value={filter.operator} onChange={(event) => filterChange(index, { operator: event.target.value, ...(event.target.value === 'is_null' ? { source: 'literal', value: true } : { value: '' }) })}>{operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.label}</option>)}</select></label><label className="apib-field"><span>Value source</span><select aria-label={`Filter ${index + 1} source`} value={filter.source} disabled={filter.operator === 'is_null'} onChange={(event) => { const next = { ...filter, source: event.target.value }; if (next.source === 'query') { delete next.value; next.parameter = filter.column; next.required = true; } else { delete next.parameter; delete next.required; next.value = ''; } change({ filters: definition.filters.map((item, i) => i === index ? next : item) }); }}><option value="literal">Fixed value</option><option value="query">Query parameter</option></select></label>
      {filter.source === 'query' ? <label className="apib-field"><span>Parameter name</span><input aria-label={`Filter ${index + 1} parameter`} value={filter.parameter || ''} onChange={(event) => filterChange(index, { parameter: event.target.value })} /></label> : <LiteralInput filter={filter} column={columns.find((item) => item.name === filter.column)} disabled={disabled} onChange={(value) => filterChange(index, { value })} />}</div><div className="apib-filter-footer">{filter.source === 'query' && <label className="apib-checkbox"><input type="checkbox" checked={filter.required === true} onChange={(event) => filterChange(index, { required: event.target.checked })} />Require this query parameter</label>}<button type="button" className="apib-text-button" onClick={() => change({ filters: definition.filters.filter((_, i) => i !== index) })}><LuTrash2 aria-hidden="true" />Remove filter {index + 1}</button></div></fieldset>)}
    </section>}
    <section className="apib-panel"><div className="apib-panel-heading"><h3>Ordering & relationships</h3><p>Keep response sizes bounded and include related order details.</p></div><div className="apib-form-grid"><label className="apib-field"><span>Order by</span><select value={definition.orderBy?.column || ''} disabled={disabled || definition.method !== 'GET'} onChange={(event) => change({ orderBy: event.target.value ? { column: event.target.value, direction: definition.orderBy?.direction || 'asc' } : null })}><option value="">No ordering</option>{columns.map((column) => <option key={column.name}>{column.name}</option>)}</select></label><label className="apib-field"><span>Sort direction</span><select value={definition.orderBy?.direction || 'asc'} disabled={disabled || !definition.orderBy} onChange={(event) => change({ orderBy: { ...definition.orderBy, direction: event.target.value } })}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label><label className="apib-field"><span>Row limit</span><input type="number" min="1" max="100" step="1" aria-label="Row limit" value={definition.limit ?? ''} disabled={disabled} onChange={(event) => change({ limit: event.target.value === '' ? '' : Number(event.target.value) })} /><small>1–100 rows per GET response page.</small></label></div>{definition.table === 'orders' && definition.method === 'GET' && <fieldset className="apib-joins" disabled={disabled}><legend>Include related data</legend>{(table?.relationships || []).map((relationship) => <label className="apib-checkbox" key={relationship.id}><input type="checkbox" checked={definition.include.includes(relationship.id)} onChange={(event) => change({ include: event.target.checked ? [...definition.include, relationship.id] : definition.include.filter((id) => id !== relationship.id) })} />{relationship.label}</label>)}</fieldset>}</section>
    <section className="apib-panel"><div className="apib-panel-heading"><h3>Permissions</h3><p>Every request stays inside this project’s data.</p></div><label className="apib-field"><span>Access</span><select value={definition.access} disabled={disabled} onChange={(event) => change({ access: event.target.value })}><option value="app_user">Signed-in app users</option><option value="developer">Developer · server only</option>{definition.method === 'GET' && <option value="public">Public · no sign-in</option>}</select></label><p className={`apib-permission-note${definition.access === 'public' ? ' is-warning' : ''}`}><LuLockKeyhole aria-hidden="true" />{definition.access === 'app_user' ? 'Any signed-in user of this project’s web app can use this endpoint. Writes affect matching project rows; there is no per-user row ownership rule.' : definition.access === 'public' ? 'Anyone with the endpoint URL can read the selected matching project data.' : 'Requires your Grupedia developer session. Use from a trusted server; never expose a builder token in browser code.'}</p></section>
    {definition.method === 'POST' && <section className="apib-panel"><div className="apib-panel-heading"><h3>Default values</h3><p>Optional writable fields merged before the request body. Request values take precedence.</p></div><JsonField label="POST defaults (JSON)" value={defaultsText} disabled={disabled} onChange={setDefaultsText} rows={5} /></section>}
  </div>;
}

function makeSnippets(definition, runtimeUrl, paramsText, bodyText, rowId) {
  let url;
  try { url = new URL(runtimeUrl, window.location.origin); } catch { return { javascript: '// Save a draft to receive an endpoint URL.', curl: '# Save a draft to receive an endpoint URL.' }; }
  if (['PATCH', 'DELETE'].includes(definition.method)) url.pathname = `${url.pathname.replace(/\/$/, '')}/${encodeURIComponent(rowId || 'ROW_ID')}`;
  let params = {};
  try { params = parseObject(paramsText, 'Query parameters'); } catch { /* Editable test parameters may be temporarily invalid. */ }
  Object.entries(params).filter(([key]) => key !== 'id').forEach(([key, value]) => url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value)));
  let body = {};
  try { body = parseObject(bodyText, 'Request body'); } catch { /* Keep generated sample valid while editing. */ }
  const bodyMethod = ['POST', 'PATCH'].includes(definition.method);
  const auth = definition.access === 'public' ? '' : definition.access === 'app_user' ? "\n    Authorization: 'Bearer ' + appAccessToken," : "\n    Authorization: 'Bearer ' + process.env.GRUPEDIA_DEVELOPER_TOKEN,";
  const note = definition.access === 'developer' ? '// Server-side only. Never put your developer token in a web app.\n' : definition.access === 'app_user' ? '// appAccessToken is the in-memory access_token from app authentication.\n' : '// Public GET endpoint; no Authorization header is required.\n';
  const javascript = `${note}const response = await fetch(${JSON.stringify(url.toString())}, {\n  method: '${definition.method}',\n  credentials: 'omit',\n  headers: {\n    Accept: 'application/json',${auth}${bodyMethod ? "\n    'Content-Type': 'application/json'," : ''}\n  },${bodyMethod ? `\n  body: JSON.stringify(${pretty(body)}),` : ''}\n});\nconst data = await response.json();\nif (!response.ok) throw new Error(data.error || 'Request failed');\nconsole.log(data);`;
  const quote = (value) => `'${String(value).replace(/'/g, `'"'"'`)}'`;
  const curl = `${definition.access === 'developer' ? '# Trusted server/terminal only; never expose a developer token.\n' : ''}curl -X ${definition.method} ${quote(url.toString())} \\\n  -H 'Accept: application/json'${definition.access !== 'public' ? ` \\\n  -H "Authorization: Bearer $${definition.access === 'app_user' ? 'APP_ACCESS_TOKEN' : 'GRUPEDIA_DEVELOPER_TOKEN'}"` : ''}${bodyMethod ? ` \\\n  -H 'Content-Type: application/json' \\\n  --data ${quote(JSON.stringify(body))}` : ''}`;
  return { javascript, curl };
}

function ProjectApiBuilder({ workspace }) {
  const location = useLocation();
  const requestedTable = useRef(new URLSearchParams(location.search).get('table'));
  const { projectId, project, projectsLoading, projectsError, retryProjects, sidebarOpen, closeSidebar } = workspace;
  const [catalog, setCatalog] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [definition, setDefinition] = useState(null);
  const [definitionText, setDefinitionText] = useState('');
  const [defaultsText, setDefaultsText] = useState('{}');
  const [jsonEdited, setJsonEdited] = useState(false);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('Builder');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(null);
  const [paramsText, setParamsText] = useState('{}');
  const [bodyText, setBodyText] = useState('{}');
  const [rowId, setRowId] = useState('');
  const [result, setResult] = useState(null);
  const [snippetTab, setSnippetTab] = useState('javascript');
  const [copied, setCopied] = useState(false);
  const controllers = useRef(new Set());
  const mounted = useRef(true);
  const lock = useRef(false);
  const base = `/api/projects/${pathId(projectId)}/api-builder`;
  const selected = endpoints.find((endpoint) => String(endpoint.id) === selectedId);
  let effective = null;
  let definitionError = '';
  try { if (definition) effective = readDefinition(definitionText); } catch (failure) { definitionError = failure.message; }
  const dirty = Boolean(definition && (!selected || definitionText !== pretty(selected.definition) || (definition.method === 'POST' && defaultsText !== pretty(definition.defaults))));
  const publishedDefinition = selected?.isPublished ? selected.publishedDefinition : null;
  const requestDefinition = publishedDefinition || effective;
  let runtimeOrigin = window.location.origin;
  try { if (selected?.runtimeUrl) runtimeOrigin = new URL(selected.runtimeUrl, window.location.origin).origin; } catch { /* Unsaved drafts use the current origin. */ }
  const runtimeUrl = publishedDefinition ? selected.runtimeUrl : effective ? `${runtimeOrigin}/api/apps/${pathId(projectId)}/data${effective.path}` : '';
  const snippets = requestDefinition ? makeSnippets(requestDefinition, runtimeUrl, paramsText, bodyText, rowId) : { javascript: '// Apply a valid endpoint definition to generate request code.', curl: '# Apply a valid endpoint definition to generate request code.' };

  useEffect(() => {
    mounted.current = true;
    const currentControllers = controllers.current;
    return () => { mounted.current = false; currentControllers.forEach((controller) => controller.abort()); currentControllers.clear(); };
  }, []);
  const request = useCallback(async (path, options = {}, controller = new AbortController()) => {
    if (!mounted.current) throw new DOMException('The project changed.', 'AbortError');
    controllers.current.add(controller);
    try { return await apiRequest(path, { ...options, signal: controller.signal }); }
    finally { controllers.current.delete(controller); }
  }, []);

  function chooseEndpoint(endpoint) {
    setSelectedId(endpoint ? String(endpoint.id) : '');
    setDefinition(endpoint?.definition || null);
    setDefinitionText(endpoint ? pretty(endpoint.definition) : '');
    setDefaultsText(pretty(endpoint?.definition?.defaults || {}));
    setJsonEdited(false); setError(''); setConflict(false); setNotice(''); setResult(null); setRowId(''); setParamsText('{}');
    const source = catalog?.tables.find((item) => item.id === endpoint?.definition?.table);
    setBodyText(pretty(source?.exampleBody || {}));
    closeSidebar();
  }

  useEffect(() => {
    if (!projectId || projectsLoading || projectsError) return undefined;
    const controller = new AbortController();
    setLoading(true); setLoadError(''); setError(''); setConflict(false);
    Promise.all([request(`${base}/catalog`, {}, controller), request(`${base}/endpoints`, {}, controller)])
      .then(([catalogData, endpointData]) => {
        if (controller.signal.aborted || !mounted.current) return;
        if (!Array.isArray(catalogData?.tables) || !catalogData.tables.length || !Array.isArray(endpointData?.endpoints)) throw new Error('The API Builder response could not be read.');
        setCatalog(catalogData); setEndpoints(endpointData.endpoints);
        const max = endpointData.limits?.maxEndpoints || endpointData.limits?.maxEndpointsPerProject || catalogData.limits?.maxEndpoints || 25;
        setLimit(max);
        const source = catalogData.tables.find((item) => item.id === requestedTable.current);
        const seeded = source ? makeTemplate(catalogData, source.id, source.id) : null;
        requestedTable.current = null;
        const next = seeded ? null : endpointData.endpoints.find((item) => String(item.id) === selectedId) || endpointData.endpoints[0];
        const nextDefinition = seeded || next?.definition || null;
        setSelectedId(next ? String(next.id) : ''); setDefinition(nextDefinition); setDefinitionText(nextDefinition ? pretty(nextDefinition) : ''); setDefaultsText(pretty(nextDefinition?.defaults || {})); setJsonEdited(false); setResult(null);
        setBodyText(pretty(catalogData.tables.find((item) => item.id === nextDefinition?.table)?.exampleBody || {}));
      })
      .catch((failure) => { if (!controller.signal.aborted && mounted.current) setLoadError(failure.message || 'Could not load API Builder.'); })
      .finally(() => { if (!controller.signal.aborted && mounted.current) setLoading(false); });
    return () => controller.abort();
    // Explicit reload discards local edits only after the user chooses it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, projectId, projectsLoading, projectsError, revision, request]);

  function updateDefinition(value) {
    if (definition?.method !== value.method || definition?.table !== value.table) setDefaultsText(pretty(value.defaults || {}));
    if (definition?.table !== value.table) {
      setBodyText(pretty(catalog?.tables.find((item) => item.id === value.table)?.exampleBody || {}));
      setRowId('');
    }
    setDefinition(value); setDefinitionText(pretty(value)); setJsonEdited(false); setError(''); setNotice(''); setResult(null);
  }
  function getDefinition() {
    const value = readDefinition(definitionText);
    if (!jsonEdited && value.method === 'POST') value.defaults = parseObject(defaultsText, 'POST defaults');
    if (!value.columns.length) throw new Error('Select at least one response column.');
    if (!Number.isInteger(value.limit) || value.limit < 1 || value.limit > 100) throw new Error('Row limit must be a whole number from 1 to 100.');
    return value;
  }
  function chooseTemplate(kind) {
    const value = makeTemplate(catalog, kind);
    setSelectedId(''); updateDefinition(value); setDefaultsText('{}'); setTab('Builder'); setDialog(null); setBodyText(pretty(catalog.tables.find((item) => item.id === value.table)?.exampleBody || {})); setParamsText('{}'); setRowId(''); closeSidebar();
  }
  function openSelection(value) {
    if (busy) return;
    if (dirty) setDialog({ kind: 'discard', next: value });
    else if (value === 'new') setDialog({ kind: 'new' });
    else chooseEndpoint(value);
  }
  function applyJson() {
    try { const value = readDefinition(definitionText); updateDefinition(value); setDefaultsText(pretty(value.defaults)); setNotice('Definition applied. Save draft or run a preview to validate it on the server.'); setTab('Builder'); }
    catch (failure) { setError(failure.message); }
  }
  function recordEndpoint(endpoint, replaceEditor = true) {
    if (!endpoint?.id || !endpoint.definition || !Number.isInteger(endpoint.revision)) throw new Error('The server did not return an endpoint revision. Reload API Builder to check its status.');
    setEndpoints((current) => [...current.filter((item) => String(item.id) !== String(endpoint.id)), endpoint]);
    setSelectedId(String(endpoint.id));
    if (replaceEditor) { setDefinition(endpoint.definition); setDefinitionText(pretty(endpoint.definition)); setDefaultsText(pretty(endpoint.definition.defaults || {})); setJsonEdited(false); }
    return endpoint;
  }
  async function saveDefinition() {
    const value = getDefinition();
    const data = await request(selected ? `${base}/endpoints/${pathId(selected.id)}` : `${base}/endpoints`, { method: selected ? 'PUT' : 'POST', body: selected ? { definition: value, revision: selected.revision } : { definition: value } });
    if (!mounted.current) return null;
    return recordEndpoint(data.endpoint);
  }
  function reportFailure(failure) {
    if (!mounted.current || failure.name === 'AbortError') return;
    setError(failure.message || 'The operation failed. Please try again.'); setConflict(failure.status === 409);
  }
  async function changePublication(action) {
    if (lock.current) return;
    lock.current = true; setBusy(action); setError(''); setConflict(false); setNotice('');
    try {
      const endpoint = action === 'save' || (action === 'publish' && dirty) ? await saveDefinition() : selected;
      if (!endpoint || !mounted.current) return;
      if (action !== 'save') {
        const data = await request(`${base}/endpoints/${pathId(endpoint.id)}/${action}`, { method: 'POST', body: { revision: endpoint.revision } });
        if (!mounted.current) return;
        recordEndpoint(data.endpoint, action !== 'unpublish' || !dirty);
      }
      setNotice(action === 'save' ? 'Draft saved. Publish when you are ready to make this version available.' : action === 'publish' ? 'Endpoint published. The runtime now uses this saved definition.' : 'Endpoint unpublished. Its runtime URL no longer accepts requests.');
    } catch (failure) { reportFailure(failure); }
    finally { if (mounted.current) { lock.current = false; setBusy(''); } }
  }
  async function deleteEndpoint() {
    if (lock.current || !selected) return;
    lock.current = true; setBusy('delete'); setError('');
    try {
      await request(`${base}/endpoints/${pathId(selected.id)}?revision=${selected.revision}`, { method: 'DELETE' });
      if (!mounted.current) return;
      const remaining = endpoints.filter((item) => String(item.id) !== selectedId);
      setEndpoints(remaining); chooseEndpoint(remaining[0]); setDialog(null); setNotice('Endpoint deleted. Source table rows were not deleted.');
    } catch (failure) { reportFailure(failure); }
    finally { if (mounted.current) { lock.current = false; setBusy(''); } }
  }
  function previewPayload() {
    const value = getDefinition();
    const params = parseObject(paramsText, 'Query parameters');
    const payload = { definition: value, params, body: ['POST', 'PATCH'].includes(value.method) ? parseObject(bodyText, 'Request body') : {} };
    if (['PATCH', 'DELETE'].includes(value.method)) {
      if (!/^[1-9]\d*$/.test(rowId) || !Number.isSafeInteger(Number(rowId))) throw new Error('Enter the positive whole-number row ID to change.');
      payload.id = Number(rowId);
    }
    return payload;
  }
  function preparePreview() {
    if (lock.current) return;
    setError(''); setNotice('');
    try { const payload = previewPayload(); if (payload.definition.method === 'GET') runPreview(payload); else setDialog({ kind: 'preview', payload }); }
    catch (failure) { reportFailure(failure); }
  }
  async function runPreview(payload) {
    if (lock.current) return;
    lock.current = true; setBusy('test'); setError(''); setResult(null);
    try {
      const data = await request(`${base}/test`, { method: 'POST', body: payload });
      if (!mounted.current) return;
      if (!Number.isFinite(data?.status) || data.body === undefined) throw new Error('The preview response could not be read.');
      setResult(data); setDialog(null); setNotice(payload.definition.method === 'GET' ? '' : 'Developer preview completed. This request changed real project data.');
    } catch (failure) { reportFailure(failure); }
    finally { if (mounted.current) { lock.current = false; setBusy(''); } }
  }
  async function copySnippet() {
    try { await navigator.clipboard.writeText(snippets[snippetTab]); if (mounted.current) setCopied(true); }
    catch { setNotice('Copy is unavailable in this browser. Select the request code and copy it manually.'); }
  }
  function downloadSnippet() {
    const blob = new Blob([snippets[snippetTab]], { type: snippetTab === 'javascript' ? 'text/javascript;charset=utf-8' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `grupedia-request.${snippetTab === 'javascript' ? 'js' : 'sh'}`; anchor.click(); URL.revokeObjectURL(url);
  }
  const visible = endpoints.filter((endpoint) => `${endpoint.definition.name} ${endpoint.definition.method} ${endpoint.definition.path}`.toLowerCase().includes(search.toLowerCase()));
  const available = !projectsLoading && !projectsError && !loading && !loadError && catalog;
  const activeDefinition = effective || definition;
  const runtimeMethod = requestDefinition?.method || activeDefinition?.method;
  const requestAccess = requestDefinition?.access || activeDefinition?.access;
  const rows = Array.isArray(result?.body?.data) ? result.body.data : Array.isArray(result?.body) ? result.body : [];
  return <>
    <aside id="workspace-sidebar" className={`db-sidebar apib-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="API Builder navigation"><WorkspaceNavigation /><div className="db-sidebar-heading"><h1>API Builder</h1><span className="db-sidebar-beta">BETA</span></div><div className="apib-sidebar-action"><button type="button" className="db-button db-button-primary" disabled={!available || Boolean(busy) || endpoints.length >= limit} onClick={() => openSelection('new')}><LuPlus aria-hidden="true" />New endpoint</button></div><div className="db-tables-label"><h2>ENDPOINTS</h2><span>{endpoints.length} / {limit}</span></div><div className="db-table-search"><LuSearch aria-hidden="true" /><label className="sr-only" htmlFor="apib-search">Search endpoints</label><input id="apib-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search endpoints…" /></div><nav className="db-table-list" aria-label="Endpoints">{visible.map((endpoint) => <button type="button" key={endpoint.id} className={`db-table-item apib-endpoint${String(endpoint.id) === selectedId ? ' is-selected' : ''}`} onClick={() => openSelection(endpoint)} disabled={Boolean(busy)}><span className={`apib-method apib-method-${endpoint.definition.method.toLowerCase()}`}>{endpoint.definition.method}</span><span>{endpoint.definition.path}<small>{endpoint.definition.name}</small></span><span className={`apib-state-dot${endpoint.isPublished ? ' is-live' : ''}`} aria-label={endpoint.isPublished ? 'Published' : 'Draft'} /></button>)}{available && !visible.length && <p className="apib-sidebar-empty">{search ? 'No matching endpoints.' : 'Your endpoints will appear here.'}</p>}</nav><div className="apib-sidebar-footer"><LuBraces aria-hidden="true" /><span>Build an API from your data.<small>Draft, preview, then publish.</small></span></div></aside>
    <main id="workspace-content" className="db-editor apib-editor" tabIndex="-1"><div className="db-editor-heading"><div className="apib-breadcrumb"><LuBraces aria-hidden="true" /><span>API Builder</span><LuChevronRight aria-hidden="true" /><span>{definition?.name || 'Endpoints'}</span></div><span className="apib-project-scope">Project API</span></div>
      {projectsLoading ? <Message kind="loading" title="Loading your projects…" /> : projectsError ? <Message kind="error" title="Could not load your projects" onRetry={retryProjects}>{projectsError}</Message> : !projectId ? <Message title="No project available">Create a project to build its API.</Message> : loading ? <Message kind="loading" title="Loading API Builder…">Reading your endpoint definitions and table catalog.</Message> : loadError ? <Message kind="error" title="Could not load API Builder" onRetry={() => setRevision((value) => value + 1)}>{loadError}</Message> : !definition ? <div className="apib-empty"><span className="apib-empty-icon"><LuBraces aria-hidden="true" /></span><span className="apib-eyebrow">YOUR DATA, YOUR API</span><h2>Build your first endpoint</h2><p>Choose a table, set permissions, and publish a REST endpoint for your web app. Drafts stay private until you publish them.</p><button type="button" className="db-button db-button-primary" onClick={() => setDialog({ kind: 'new' })}><LuPlus aria-hidden="true" />New endpoint</button><div className="apib-empty-steps"><span>01 <strong>Select your data</strong></span><span>02 <strong>Preview the response</strong></span><span>03 <strong>Publish your endpoint</strong></span></div></div> : <>
        <div className="apib-workspace-scroll"><div className="apib-page-heading"><div><span className="apib-eyebrow">REST ENDPOINT</span><h2>{definition.name || 'Untitled endpoint'}</h2><div className="apib-status-row"><span className={`apib-method apib-method-${activeDefinition.method.toLowerCase()}`}>{activeDefinition.method}</span><span className={`apib-status${selected?.isPublished ? ' is-live' : ''}`}><span />{selected?.isPublished ? 'Published' : 'Draft'}</span>{dirty && <span className="apib-unsaved">Unsaved changes</span>}{selected?.hasUnpublishedChanges && <span className="apib-unsaved">Unpublished changes</span>}</div></div><div className="apib-actions"><button type="button" className="db-button" disabled={Boolean(busy) || Boolean(definitionError)} onClick={() => changePublication('save')}><LuSave aria-hidden="true" />{busy === 'save' ? 'Saving…' : 'Save draft'}</button><button type="button" className="db-button db-button-primary" disabled={Boolean(busy) || Boolean(definitionError)} onClick={() => changePublication('publish')}><LuSend aria-hidden="true" />{busy === 'publish' ? 'Publishing…' : 'Publish'}</button>{selected?.isPublished && <button type="button" className="db-button" disabled={Boolean(busy)} onClick={() => changePublication('unpublish')}><LuUnplug aria-hidden="true" />Unpublish</button>}{selected && <button type="button" className="db-icon-button apib-delete" aria-label="Delete endpoint" disabled={Boolean(busy)} onClick={() => setDialog({ kind: 'delete' })}><LuTrash2 aria-hidden="true" /></button>}</div></div>
        <div className="apib-route"><span className={`apib-method apib-method-${runtimeMethod.toLowerCase()}`}>{runtimeMethod}</span><code>{runtimeUrl}{['PATCH', 'DELETE'].includes(runtimeMethod) ? '/:id' : ''}</code></div><p className="apib-draft-note"><LuInfo aria-hidden="true" />{selected?.isPublished ? 'Published requests use the last published snapshot. Save draft changes, then publish to update live behavior.' : 'This endpoint is not published. Save and preview it before making its URL available.'}</p>
        <div className="apib-tabs" role="tablist" aria-label="Endpoint workspace">{TABS.map((name) => <button type="button" key={name} id={`apib-tab-${name.toLowerCase()}`} role="tab" aria-selected={tab === name} aria-controls={`apib-panel-${name.toLowerCase()}`} onClick={() => { setTab(name); setCopied(false); }}><span>{name === 'Builder' ? <LuBraces /> : name === 'Test' ? <LuPlay /> : <LuCode />}</span>{name}</button>)}</div>
        <div className="apib-tab-content" id={`apib-panel-${tab.toLowerCase()}`} role="tabpanel" aria-labelledby={`apib-tab-${tab.toLowerCase()}`}>
          {notice && <p className="apib-notice" role="status"><LuCheck aria-hidden="true" />{notice}</p>}{error && <div className="apib-error" role="alert"><LuTriangleAlert aria-hidden="true" /><div>{error}{conflict && <button type="button" className="apib-text-button" onClick={() => setDialog({ kind: 'reload' })}>Reload latest version</button>}</div></div>}
          {definitionError && <p className="apib-inline-error" role="alert">{definitionError} Open Code to correct the definition.</p>}
          {tab === 'Builder' && <>{jsonEdited && <div className="apib-json-pending"><p>Your JSON edits are used by Save, Publish, and Test. Apply them to update these visual controls.</p><button type="button" className="db-button" disabled={Boolean(definitionError) || Boolean(busy)} onClick={applyJson}>Apply JSON</button></div>}<DefinitionForm definition={definition} catalog={catalog} disabled={Boolean(busy) || jsonEdited} onChange={updateDefinition} defaultsText={defaultsText} setDefaultsText={(text) => { setDefaultsText(text); setNotice(''); try { const defaults = parseObject(text, 'POST defaults'); const value = { ...definition, defaults }; setDefinition(value); setDefinitionText(pretty(value)); } catch { /* Keep invalid JSON editable; save and preview report it. */ } }} /></>}
          {tab === 'Test' && <><section className="apib-panel"><div className="apib-panel-heading"><span className="apib-preview-badge"><LuLockKeyhole aria-hidden="true" />Developer preview</span><h3>Test against your project’s real data</h3><p>Preview the current definition using your developer access. A successful preview does not prove that an app-user token has access. Publishing is not required.</p></div><div className="apib-form-grid"><JsonField label="Query parameters (JSON)" value={paramsText} onChange={setParamsText} disabled={Boolean(busy)} rows={5} help="For query-bound filters, use the configured parameter names. GET also accepts page and pageSize." />{['POST', 'PATCH'].includes(activeDefinition.method) && <JsonField label="Request body (JSON)" value={bodyText} onChange={setBodyText} disabled={Boolean(busy)} rows={5} help="Use writable source-table fields only. This request changes real data." />}{['PATCH', 'DELETE'].includes(activeDefinition.method) && <label className="apib-field"><span>Row ID</span><input type="number" min="1" step="1" aria-label="Row ID" value={rowId} disabled={Boolean(busy)} onChange={(event) => setRowId(event.target.value)} /><small>Only this project row can be changed. Bulk deletion is not supported.</small></label>}</div><div className="apib-test-actions">{activeDefinition.method !== 'GET' && <p><LuTriangleAlert aria-hidden="true" />This preview writes to the real project database.</p>}<button type="button" className="db-button db-button-primary" disabled={Boolean(busy) || Boolean(definitionError)} onClick={preparePreview}>{busy === 'test' ? <LuLoaderCircle aria-hidden="true" /> : <LuPlay aria-hidden="true" />}{busy === 'test' ? 'Running…' : 'Run request'}</button></div></section>{result && <section className="apib-panel apib-result"><div className="apib-result-heading"><h3>Response</h3><span className={result.status >= 400 ? 'apib-result-error' : 'apib-result-ok'}>HTTP {result.status}</span>{Number.isFinite(result.durationMs) && <span>{result.durationMs} ms</span>}</div>{rows.length > 0 && <div className="apib-result-table-scroll"><table className="apib-result-table"><caption className="sr-only">Preview rows</caption><thead><tr>{Object.keys(rows[0]).map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>{rows.slice(0, 10).map((row, index) => <tr key={index}>{Object.keys(rows[0]).map((key) => <td key={key}>{typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? 'null')}</td>)}</tr>)}</tbody></table></div>}{rows.length > 10 && <p className="apib-muted">Showing the first 10 rows. The full response appears below.</p>}<pre className="apib-code" aria-label="Response JSON">{pretty(result.body)}</pre>{typeof result.sql === 'string' && <details className="apib-sql"><summary>SQL preview · read only</summary><pre className="apib-code" aria-label="SQL preview">{result.sql}</pre><p className="apib-muted">Bound parameters</p><pre className="apib-code">{pretty(result.parameters || [])}</pre></details>}</section>}</>}
          {tab === 'Code' && <><section className="apib-panel"><div className="apib-panel-heading apib-panel-heading-action"><div><h3>Edit the endpoint definition</h3><p>This JSON configures the actual endpoint. Arbitrary JavaScript and SQL are never executed.</p></div><button type="button" className="db-button" disabled={Boolean(busy) || Boolean(definitionError)} onClick={applyJson}>Apply JSON</button></div><JsonField label="Endpoint definition (JSON)" value={definitionText} onChange={(text) => { setDefinitionText(text); setJsonEdited(true); setError(''); setNotice(''); setResult(null); }} rows={20} disabled={Boolean(busy)} help="Save draft or run a preview to validate your definition on the server. Publish to update the runtime." /></section><section className="apib-panel"><div className="apib-panel-heading"><h3>Request code</h3><p>{publishedDefinition ? 'These examples use the last published method, route, and permissions. Publish your draft to update them.' : 'These examples use the current draft and become available after you publish it.'} Examples are read only and never execute here.</p></div><div className="apib-snippet-actions"><div className="apib-segmented" aria-label="Request code format"><button type="button" aria-pressed={snippetTab === 'javascript'} onClick={() => { setSnippetTab('javascript'); setCopied(false); }}>JavaScript</button><button type="button" aria-pressed={snippetTab === 'curl'} onClick={() => { setSnippetTab('curl'); setCopied(false); }}>cURL</button></div><div><button type="button" className="db-button" onClick={copySnippet}>{copied ? <LuCheck aria-hidden="true" /> : <LuCopy aria-hidden="true" />}{copied ? 'Copied' : 'Copy request code'}</button><button type="button" className="db-button" onClick={downloadSnippet}><LuDownload aria-hidden="true" />Download</button></div></div><pre className="apib-code" aria-label={`${snippetTab === 'javascript' ? 'JavaScript' : 'cURL'} request example`}>{snippets[snippetTab]}</pre><p className="apib-code-note">{requestAccess === 'developer' ? 'Developer endpoints are for trusted server environments. The placeholder above is not an issued token.' : requestAccess === 'app_user' ? 'Use an app-user access token from this project’s Authentication integration. Never use your Grupedia builder token in a web app.' : 'This public GET endpoint does not require an authentication token.'}</p><Link className="apib-inline-link" to="/dashboard/auth">Configure web app authentication & allowed origins <LuArrowUpRight aria-hidden="true" /></Link></section></>}
        </div></div><footer className="db-editor-footer"><span><LuGlobe aria-hidden="true" />{selected ? `Revision ${selected.revision}` : 'Local draft · not saved'}</span><span>{project?.name || 'Current project'} · {activeDefinition.access === 'app_user' ? 'App-user access' : activeDefinition.access === 'public' ? 'Public read access' : 'Developer access'}</span></footer>
      </>}
    </main>
    {dialog?.kind === 'new' && <Dialog title="New endpoint" onClose={() => setDialog(null)}><p>Start with a useful template. Nothing is published until you choose Publish.</p><div className="apib-templates"><button type="button" onClick={() => chooseTemplate('products')}><span className="apib-method apib-method-get">GET</span><span>List products<small>Read selected product fields</small></span><LuChevronRight aria-hidden="true" /></button><button type="button" onClick={() => chooseTemplate('orders')}><span className="apib-method apib-method-get">GET</span><span>Orders with details<small>Include product and customer relationships</small></span><LuChevronRight aria-hidden="true" /></button><button type="button" onClick={() => chooseTemplate('customer')}><span className="apib-method apib-method-post">POST</span><span>Create customer<small>Insert one customer with developer access</small></span><LuChevronRight aria-hidden="true" /></button></div></Dialog>}
    {dialog?.kind === 'discard' && <Dialog title="Discard unsaved changes?" onClose={() => setDialog(null)}><p>Your local changes have not been saved. Discard them to open another endpoint.</p><div className="apib-dialog-actions"><button type="button" className="db-button" onClick={() => setDialog(null)}>Keep editing</button><button type="button" className="db-button db-button-primary" onClick={() => { const next = dialog.next; setDialog(null); if (next === 'new') setDialog({ kind: 'new' }); else chooseEndpoint(next); }}>Discard changes</button></div></Dialog>}
    {dialog?.kind === 'reload' && <Dialog title="Reload the latest version?" onClose={() => setDialog(null)}><p>Another request changed this endpoint. Reloading replaces local unsaved changes with the latest server definition.</p><div className="apib-dialog-actions"><button type="button" className="db-button" onClick={() => setDialog(null)}>Keep editing</button><button type="button" className="db-button db-button-primary" onClick={() => { setDialog(null); setRevision((value) => value + 1); }}>Reload latest version</button></div></Dialog>}
    {dialog?.kind === 'delete' && selected && <Dialog title="Delete this endpoint?" busy={Boolean(busy)} onClose={() => setDialog(null)}><p>Delete <strong>{selected.definition.method} {selected.definition.path}</strong> from <strong>{project?.name || 'this project'}</strong>. Its published URL will stop working. This deletes endpoint configuration only; source table rows remain.</p>{error && <p className="apib-inline-error" role="alert">{error}</p>}<div className="apib-dialog-actions"><button type="button" className="db-button" disabled={Boolean(busy)} onClick={() => setDialog(null)}>Cancel</button><button type="button" className="db-button apib-danger-button" disabled={Boolean(busy)} onClick={deleteEndpoint}>{busy === 'delete' ? 'Deleting…' : 'Delete endpoint'}</button></div></Dialog>}
    {dialog?.kind === 'preview' && <Dialog title="Run a real data change?" busy={Boolean(busy)} onClose={() => setDialog(null)}><p>This developer preview will run <strong>{dialog.payload.definition.method}</strong> on <strong>{dialog.payload.definition.table}</strong> in <strong>{project?.name || 'this project'}</strong>{dialog.payload.id ? <> for row <strong>#{dialog.payload.id}</strong></> : ' and insert one row'}. This changes your real project data immediately, even when the endpoint is unpublished.</p>{error && <p className="apib-inline-error" role="alert">{error}</p>}<div className="apib-dialog-actions"><button type="button" className="db-button" disabled={Boolean(busy)} onClick={() => setDialog(null)}>Cancel</button><button type="button" className="db-button apib-danger-button" disabled={Boolean(busy)} onClick={() => runPreview(dialog.payload)}>{busy === 'test' ? 'Running…' : `Run ${dialog.payload.definition.method} request`}</button></div></Dialog>}
  </>;
}

export default function ApiBuilder() {
  const workspace = useWorkspace();
  return <ProjectApiBuilder key={workspace.projectId || 'no-project'} workspace={workspace} />;
}
