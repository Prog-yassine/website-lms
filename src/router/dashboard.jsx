import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LuArrowLeftToLine, LuArrowRightToLine, LuBookOpen, LuBraces,
  LuCheck, LuChevronDown, LuChevronLeft, LuChevronRight, LuCode,
  LuColumns3, LuDatabase, LuExternalLink, LuFileBox, LuGitBranch,
  LuKeyRound, LuLoaderCircle, LuLogOut, LuMenu, LuRefreshCw,
  LuSearch, LuShieldCheck, LuTable2, LuTriangleAlert, LuX,
} from 'react-icons/lu';
import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../lib/api';
import './dashboard.css';

function readableValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

function Value({ value }) {
  const text = readableValue(value);
  return <span className={`db-cell-value${value === null || value === undefined ? ' is-null' : ''}${typeof value === 'boolean' ? ' is-boolean' : ''}`} title={text}>{text}</span>;
}

function EditorMessage({ kind = 'empty', title, children, onRetry }) {
  const Icon = kind === 'loading' ? LuLoaderCircle : kind === 'error' ? LuTriangleAlert : LuTable2;
  return <div className={`db-editor-message db-message-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
    <span className="db-message-icon"><Icon aria-hidden="true" /></span>
    <h2>{title}</h2>
    {children && <p>{children}</p>}
    {onRetry && <button type="button" className="db-button" onClick={onRetry}><LuRefreshCw aria-hidden="true" /> Try again</button>}
  </div>;
}

function ApiDialog({ project, table, onClose }) {
  const dialog = useRef(null);
  const path = `/api/projects/${encodeURIComponent(project.id)}/tables/${encodeURIComponent(table.id)}/rows?page=1&pageSize=25`;
  useEffect(() => {
    const element = dialog.current;
    if (typeof element.showModal === 'function') element.showModal();
    else element.setAttribute('open', '');
  }, []);
  return <dialog ref={dialog} className="db-api-dialog" aria-labelledby="db-api-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="db-dialog-body">
      <div className="db-dialog-heading"><span className="db-dialog-icon"><LuCode aria-hidden="true" /></span><button type="button" className="db-icon-button" onClick={onClose} aria-label="Close API example" autoFocus><LuX /></button></div>
      <h2 id="db-api-title">Read your table with the API</h2>
      <p>A read-only request for <strong>{table.name}</strong>. This example uses a placeholder, never your session credentials.</p>
      <pre><code>{`fetch('${path}', {\n  headers: {\n    Authorization: 'Bearer <ACCESS_TOKEN>'\n  }\n})\n  .then(response => response.json())\n  .then(data => console.log(data.rows));`}</code></pre>
      <div className="db-dialog-note"><LuShieldCheck aria-hidden="true" /><span>Your project and table permissions also apply to API requests.</span></div>
      <button type="button" className="db-button db-button-primary" onClick={onClose}>Got it <LuCheck aria-hidden="true" /></button>
    </div>
  </dialog>;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [projectsRevision, setProjectsRevision] = useState(0);
  const [tables, setTables] = useState([]);
  const [tableId, setTableId] = useState('');
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [rowSearch, setRowSearch] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [result, setResult] = useState(null);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState('');
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState('data');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const sidebarButton = useRef(null);

  const project = projects.find((item) => String(item.id) === projectId);
  const table = tables.find((item) => String(item.id) === tableId);
  const filteredTables = tables.filter((item) => item.name.toLowerCase().includes(tableSearch.toLowerCase().trim()));
  const columns = result?.columns || [];
  const rows = result?.rows || [];
  const rowCount = result?.rowCount || 0;
  const totalPages = Math.max(1, result?.totalPages || 1);
  const firstRow = rows.length ? (page - 1) * pageSize + 1 : 0;
  const lastRow = rows.length ? firstRow + rows.length - 1 : 0;

  useEffect(() => {
    const controller = new AbortController();
    setProjectsLoading(true);
    setProjectsError('');
    apiRequest('/api/projects', { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.projects)) throw new Error('The project list could not be read. Please try again.');
        setProjects(data.projects);
        setProjectId((current) => data.projects.some((item) => String(item.id) === current) ? current : String(data.projects[0]?.id ?? ''));
      })
      .catch((error) => { if (!controller.signal.aborted) setProjectsError(error.message || 'Could not load your projects.'); })
      .finally(() => { if (!controller.signal.aborted) setProjectsLoading(false); });
    return () => controller.abort();
  }, [projectsRevision]);

  useEffect(() => {
    if (!projectId) {
      setTablesLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setTablesLoading(true);
    setTablesError('');
    apiRequest(`/api/projects/${encodeURIComponent(projectId)}/tables`, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.tables)) throw new Error('The table list could not be read. Please try again.');
        setTables(data.tables);
        setTableId((current) => data.tables.some((item) => String(item.id) === current) ? current : String(data.tables[0]?.id ?? ''));
      })
      .catch((error) => { if (!controller.signal.aborted) setTablesError(error.message || 'Could not load this database.'); })
      .finally(() => { if (!controller.signal.aborted) setTablesLoading(false); });
    return () => controller.abort();
  }, [projectId, projectsRevision]);

  useEffect(() => {
    if (rowSearch.trim() === search) return undefined;
    const timer = window.setTimeout(() => {
      setSearch(rowSearch.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [rowSearch, search]);

  useEffect(() => {
    if (!projectId || !tableId) {
      setRowsLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setRowsLoading(true);
    setRowsError('');
    setResult(null);
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search });
    apiRequest(`/api/projects/${encodeURIComponent(projectId)}/tables/${encodeURIComponent(tableId)}/rows?${query}`, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.columns) || !Array.isArray(data.rows)) throw new Error('The table data could not be read. Please try again.');
        setResult(data);
        if (page > Math.max(1, data.totalPages || 1)) setPage(Math.max(1, data.totalPages || 1));
      })
      .catch((error) => { if (!controller.signal.aborted) setRowsError(error.message || 'Could not load the table rows.'); })
      .finally(() => { if (!controller.signal.aborted) setRowsLoading(false); });
    return () => controller.abort();
  }, [projectId, tableId, page, pageSize, search, revision]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const close = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        sidebarButton.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [sidebarOpen]);

  function chooseProject(event) {
    setProjectId(event.target.value);
    setTables([]);
    setTableId('');
    setTableSearch('');
    resetRows();
  }

  function resetRows() {
    setPage(1);
    setRowSearch('');
    setSearch('');
    setResult(null);
    setRowsError('');
    setView('data');
    setApiOpen(false);
  }

  function chooseTable(id) {
    if (String(id) !== tableId) {
      resetRows();
      setTableId(String(id));
    }
    setSidebarOpen(false);
  }

  async function signOut() {
    setSigningOut(true);
    setSignOutError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setSigningOut(false);
      setSignOutError('Could not sign out. Please try again.');
    }
  }

  function refresh() {
    if (tableId) setRevision((value) => value + 1);
    else setProjectsRevision((value) => value + 1);
  }

  const busy = projectsLoading || tablesLoading || rowsLoading;

  return <div className="db-shell">
    <a href="#database-editor" className="db-skip-link">Skip to table editor</a>
    <nav className="db-rail" aria-label="Project tools">
      <Link to="/" className="db-rail-brand" aria-label="Grupedia home"><img src={`${process.env.PUBLIC_URL || ''}/logo.svg`} alt="" width="31" height="29" /></Link>
      <div className="db-rail-tools">
        <button className="db-rail-button is-active" type="button" aria-label="Table editor" aria-current="page" title="Table editor"><LuTable2 /></button>
        <button className="db-rail-button" type="button" disabled aria-label="Authentication — coming soon" title="Authentication — coming soon"><LuShieldCheck /></button>
        <button className="db-rail-button" type="button" disabled aria-label="Storage — coming soon" title="Storage — coming soon"><LuFileBox /></button>
        <button className="db-rail-button" type="button" disabled aria-label="Functions — coming soon" title="Functions — coming soon"><LuBraces /></button>
      </div>
      <Link className="db-rail-button db-rail-help" to="/docs" aria-label="Documentation" title="Documentation"><LuBookOpen /></Link>
      <span className="db-rail-avatar" title={user?.email || 'Your account'}>{(user?.name || user?.email || 'G').charAt(0).toUpperCase()}</span>
    </nav>

    <header className="db-topbar">
      <div className="db-topbar-project">
        <button ref={sidebarButton} type="button" className="db-icon-button db-sidebar-toggle" aria-label={sidebarOpen ? 'Close tables sidebar' : 'Open tables sidebar'} aria-expanded={sidebarOpen} aria-controls="database-sidebar" onClick={() => setSidebarOpen((value) => !value)}>{sidebarOpen ? <LuX /> : <LuMenu />}</button>
        <span className="db-workspace-name">Grupedia</span><span className="db-breadcrumb-divider" aria-hidden="true">/</span>
        <div className="db-project-picker"><LuDatabase aria-hidden="true" /><label className="sr-only" htmlFor="db-project">Project</label><select id="db-project" value={projectId} onChange={chooseProject} disabled={projectsLoading || !projects.length}>{!projects.length && <option value="">{projectsLoading ? 'Loading projects…' : 'No project'}</option>}{projects.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select><LuChevronDown aria-hidden="true" /></div>
        <span className="db-test-badge">Test database</span>
      </div>
      <div className="db-topbar-actions"><span className="db-branch"><LuGitBranch aria-hidden="true" />{project?.environment || 'test'}</span><button type="button" className="db-signout" onClick={signOut} disabled={signingOut} title="Sign out"><LuLogOut aria-hidden="true" /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span></button></div>
    </header>

    {sidebarOpen && <button type="button" className="db-sidebar-backdrop" aria-label="Close tables sidebar" onClick={() => setSidebarOpen(false)} />}
    <aside id="database-sidebar" className={`db-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Database tables">
      <div className="db-sidebar-title"><LuTable2 aria-hidden="true" /><h1>Table Editor</h1></div>
      <label className="db-schema-label" htmlFor="db-schema">Schema</label>
      <div className="db-schema-select"><LuDatabase aria-hidden="true" /><select id="db-schema" value="main" onChange={() => {}} aria-label="Database schema"><option value="main">main</option></select><LuChevronDown aria-hidden="true" /></div>
      <div className="db-sidebar-divider" />
      <div className="db-tables-label"><h2>Tables</h2><span>{tables.length}</span></div>
      <div className="db-table-search"><LuSearch aria-hidden="true" /><label className="sr-only" htmlFor="db-table-search">Search tables</label><input id="db-table-search" value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} placeholder="Search tables…" type="search" autoComplete="off" /></div>
      <div className="db-table-list" aria-busy={tablesLoading}>
        {tablesLoading ? <p className="db-sidebar-message"><LuLoaderCircle className="db-spinning" aria-hidden="true" /> Loading tables…</p> : tablesError ? <p className="db-sidebar-message db-sidebar-error">{tablesError}</p> : filteredTables.length ? filteredTables.map((item) => <button type="button" className={`db-table-item${String(item.id) === tableId ? ' is-selected' : ''}`} key={item.id} onClick={() => chooseTable(item.id)} aria-current={String(item.id) === tableId ? 'true' : undefined}><LuTable2 aria-hidden="true" /><span>{item.name}</span><small>{item.rowCount ?? '—'}</small></button>) : <p className="db-sidebar-message">{tableSearch ? 'No matching tables.' : 'No tables in this database.'}</p>}
      </div>
      <div className="db-sidebar-environment"><span className="db-environment-icon"><LuDatabase aria-hidden="true" /></span><div><strong>{project?.databaseType || 'SQLite'} database</strong><span>Isolated test environment</span></div><span className="db-environment-dot" title="Test environment" /></div>
    </aside>

    <main id="database-editor" className="db-editor" tabIndex={-1}>
      <div className="db-editor-heading">
        <div className="db-current-table"><LuTable2 aria-hidden="true" /><span>{table?.name || 'Table editor'}</span>{table && <span className="db-table-schema">{table.schema || 'main'}</span>}</div>
        <div className="db-heading-labels">{project?.seeded && <span className="db-sample-badge">Sample data</span>}<span className="db-readonly"><LuShieldCheck aria-hidden="true" /> Read only</span></div>
      </div>
      <div className="db-toolbar">
        <div className="db-row-search"><LuSearch aria-hidden="true" /><label className="sr-only" htmlFor="db-row-search">Search rows</label><input id="db-row-search" type="search" value={rowSearch} onChange={(event) => setRowSearch(event.target.value)} placeholder="Search rows…" autoComplete="off" disabled={!table} /></div>
        <button className="db-button db-refresh-button" type="button" onClick={refresh} disabled={busy} title="Refresh table data"><LuRefreshCw className={busy ? 'db-spinning' : ''} aria-hidden="true" /><span>Refresh</span></button>
        <div className="db-view-toggle" role="group" aria-label="Table view"><button type="button" aria-pressed={view === 'data'} className={view === 'data' ? 'is-active' : ''} onClick={() => setView('data')}><LuTable2 aria-hidden="true" /><span>Data</span></button><button type="button" aria-pressed={view === 'schema'} className={view === 'schema' ? 'is-active' : ''} onClick={() => setView('schema')}><LuColumns3 aria-hidden="true" /><span>Schema</span></button></div>
        <button type="button" className="db-button db-api-button" onClick={() => setApiOpen(true)} disabled={!project || !table}><LuCode aria-hidden="true" /><span>API</span><LuExternalLink aria-hidden="true" /></button>
      </div>
      {signOutError && <p className="db-signout-error" role="alert">{signOutError}</p>}
      <div className="db-grid-area" role="region" aria-label="Table data and column definitions" tabIndex={0} aria-busy={busy}>
        {projectsLoading ? <EditorMessage kind="loading" title="Opening your workspace">Loading your projects…</EditorMessage> : projectsError ? <EditorMessage kind="error" title="Your workspace couldn’t be loaded" onRetry={() => setProjectsRevision((value) => value + 1)}>{projectsError}</EditorMessage> : !project ? <EditorMessage title="No projects yet">Your available projects will appear here.</EditorMessage> : tablesLoading ? <EditorMessage kind="loading" title="Reading your database">Loading the available tables…</EditorMessage> : tablesError ? <EditorMessage kind="error" title="Your tables couldn’t be loaded" onRetry={() => setProjectsRevision((value) => value + 1)}>{tablesError}</EditorMessage> : !table ? <EditorMessage title="No table selected">{tables.length ? 'Choose a table from the sidebar to explore its data.' : 'There are no tables in this database yet.'}</EditorMessage> : rowsLoading ? <EditorMessage kind="loading" title="Loading table data">Reading {table.name}…</EditorMessage> : rowsError ? <EditorMessage kind="error" title="Your rows couldn’t be loaded" onRetry={refresh}>{rowsError}</EditorMessage> : result && view === 'schema' ? <table className="db-data-table db-structure-table"><caption className="sr-only">Column definitions for {table.name}</caption><thead><tr><th scope="col">Column</th><th scope="col">Type</th><th scope="col">Nullable</th><th scope="col">Key</th></tr></thead><tbody>{columns.map((column) => <tr key={column.name}><th scope="row"><span className="db-structure-name">{column.primaryKey ? <LuKeyRound aria-label="Primary key" /> : <LuColumns3 aria-hidden="true" />}{column.name}</span></th><td><code className="db-type-badge">{column.type}</code></td><td>{column.nullable ? 'Yes' : 'No'}</td><td>{column.primaryKey ? <span className="db-primary-badge">Primary key</span> : <span className="db-cell-muted">—</span>}</td></tr>)}</tbody></table> : result && !rows.length ? <EditorMessage title={search ? 'No matching rows' : 'This table is empty'}>{search ? 'Try another search or clear the current filter.' : 'The table exists, but it has no rows to display.'}</EditorMessage> : result ? <table className="db-data-table"><caption className="sr-only">{table.name} table, page {page} of {totalPages}</caption><thead><tr><th className="db-row-number" scope="col"><span className="sr-only">Row number</span><span aria-hidden="true">#</span></th>{columns.map((column) => <th key={column.name} scope="col"><span className="db-column-heading">{column.primaryKey ? <LuKeyRound className="db-key-icon" aria-label="Primary key" /> : <LuColumns3 aria-hidden="true" />}<span>{column.name}</span><span className="db-column-type">{column.type}</span></span></th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${page}-${index}`}><th className="db-row-number" scope="row">{(page - 1) * pageSize + index + 1}</th>{columns.map((column) => <td key={column.name}><Value value={row[column.name]} /></td>)}</tr>)}</tbody></table> : null}
      </div>
      <footer className="db-editor-footer">
        <div className="db-footer-total"><span className="db-environment-dot" /><span>{result ? `${firstRow.toLocaleString()}–${lastRow.toLocaleString()} of ${rowCount.toLocaleString()} rows` : 'Read-only table explorer'}</span></div>
        <div className="db-pagination"><label htmlFor="db-page-size">Rows per page</label><select id="db-page-size" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} disabled={!table || busy}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select><span className="db-pagination-divider" /><button className="db-icon-button" type="button" onClick={() => setPage(1)} disabled={page <= 1 || busy || !result} aria-label="First page"><LuArrowLeftToLine /></button><button className="db-icon-button" type="button" onClick={() => setPage((value) => value - 1)} disabled={page <= 1 || busy || !result} aria-label="Previous page"><LuChevronLeft /></button><span className="db-page-label">Page <strong>{page}</strong> of {totalPages}</span><button className="db-icon-button" type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= totalPages || busy || !result} aria-label="Next page"><LuChevronRight /></button><button className="db-icon-button" type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages || busy || !result} aria-label="Last page"><LuArrowRightToLine /></button></div>
      </footer>
    </main>
    {apiOpen && project && table && <ApiDialog project={project} table={table} onClose={() => setApiOpen(false)} />}
  </div>;
}
