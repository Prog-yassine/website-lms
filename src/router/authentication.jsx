import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuArrowUpRight, LuChevronRight, LuCircleCheck, LuClock, LuCode, LuCopy, LuEye, LuEyeOff, LuGithub, LuGlobe, LuInfo, LuKeyRound, LuLoaderCircle, LuLogOut, LuMail, LuMonitor, LuPlus, LuRefreshCw, LuSearch, LuShieldCheck, LuTable2, LuTriangleAlert, LuUsers, LuX } from 'react-icons/lu';
import { useWorkspace, WorkspaceNavigation } from '../components/dashboard/DashboardLayout';
import { apiRequest } from '../lib/api';
import './authentication.css';

const views = [
  { id: 'users', label: 'Users', Icon: LuUsers },
  { id: 'providers', label: 'Providers', Icon: LuKeyRound },
  { id: 'sessions', label: 'Sessions', Icon: LuMonitor },
  { id: 'integration', label: 'Integration', Icon: LuCode },
];

function dateLabel(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function durationLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'Not available';
  if (seconds % 86400 === 0) return `${seconds / 86400} days`;
  if (seconds % 60 === 0) return `${seconds / 60} minutes`;
  return `${seconds} seconds`;
}

function AuthMessage({ kind = 'empty', title, children, onRetry }) {
  const Icon = kind === 'loading' ? LuLoaderCircle : kind === 'error' ? LuTriangleAlert : LuShieldCheck;
  return <div className={`db-editor-message db-message-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
    <span className="db-message-icon"><Icon aria-hidden="true" /></span><h2>{title}</h2>
    {children && <p>{children}</p>}
    {onRetry && <button className="db-button" onClick={onRetry} type="button"><LuRefreshCw aria-hidden="true" /> Try again</button>}
  </div>;
}

function AuthDialog({ title, onClose, busy = false, children }) {
  const dialog = useRef(null);
  const closeButton = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const element = dialog.current;
    if (typeof element.showModal === 'function') element.showModal();
    else element.setAttribute('open', '');
    closeButton.current?.focus();
    return () => { if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);
  return <dialog ref={dialog} className="authmgr-dialog" aria-labelledby="authmgr-dialog-title" aria-busy={busy} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); if (!busy) onClose(); } }} onClick={(event) => { if (!busy && event.target === event.currentTarget) onClose(); }}>
    <div className="authmgr-dialog-header"><span className="authmgr-dialog-mark"><LuShieldCheck aria-hidden="true" /></span><button ref={closeButton} type="button" className="db-icon-button" onClick={onClose} aria-label="Close dialog" disabled={busy}><LuX aria-hidden="true" /></button></div>
    <h2 id="authmgr-dialog-title">{title}</h2>{children}
  </dialog>;
}

function CreateAppUserDialog({ projectId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function createUser(event) {
    event.preventDefault();
    if (request.current) return;
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) { setError('Use at least 8 characters and at most 72 bytes for the password.'); return; }
    if (name.trim().length > 80 || Array.from(name).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) { setError('Use a name with at most 80 characters and no control characters.'); return; }
    const controller = new AbortController();
    request.current = controller; setBusy(true);
    try {
      const body = { email: email.trim(), password };
      if (name.trim()) body.name = name.trim();
      const result = await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/auth/users`, { method: 'POST', body, signal: controller.signal });
      if (!result?.user?.id) throw new Error('The app user could not be read from the server response.');
      if (!controller.signal.aborted) { setPassword(''); onCreated(); }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'The app user could not be created.');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <AuthDialog title="Create app user" onClose={onClose} busy={busy}>
    <p className="authmgr-dialog-description">Create an email/password account for this web app. This does not create a Grupedia builder account.</p>
    <form className="authmgr-form" onSubmit={createUser}>
      <div className="authmgr-field"><label htmlFor="app-user-name">Full name (optional)</label><input id="app-user-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="off" disabled={busy} /></div>
      <div className="authmgr-field"><label htmlFor="app-user-email">Email</label><input id="app-user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="off" required disabled={busy} /></div>
      <div className="authmgr-field"><label htmlFor="app-user-password">Password</label><div className="authmgr-password-field"><input id="app-user-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required disabled={busy} aria-describedby="app-user-password-help" /><button type="button" className="db-icon-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} disabled={busy}>{showPassword ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />}</button></div><small id="app-user-password-help">At least 8 characters. The password is not shown after creation.</small></div>
      {error && <p className="authmgr-error" role="alert">{error}</p>}
      <div className="authmgr-dialog-actions"><button type="button" className="db-button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="db-button db-button-primary" disabled={busy}>{busy ? <LuLoaderCircle className="db-spinning" aria-hidden="true" /> : <LuPlus aria-hidden="true" />}{busy ? 'Creating…' : 'Create user'}</button></div>
    </form>
  </AuthDialog>;
}

function parseOrigins(value) {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 10) throw new Error('Add at most 10 allowed origins.');
  return [...new Set(lines.map((line) => {
    let url;
    try { url = new URL(line); } catch { throw new Error('Use exact HTTPS origins, or HTTP localhost origins with an explicit port.'); }
    const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && Boolean(url.port);
    if (line.includes('*') || url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !localHttp)) {
      throw new Error('Use exact HTTPS origins or HTTP localhost with a port. Wildcards, paths, credentials, and query strings are not allowed.');
    }
    return url.origin;
  }))];
}

function AppAuthSettings({ projectId, settings, onSaved }) {
  const [origins, setOrigins] = useState(() => (settings.allowedOrigins || []).join('\n'));
  const [signupEnabled, setSignupEnabled] = useState(settings.signupEnabled !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function save(event) {
    event.preventDefault();
    if (request.current) return;
    setError('');
    let allowedOrigins;
    try { allowedOrigins = parseOrigins(origins); } catch (failure) { setError(failure.message); return; }
    const controller = new AbortController();
    request.current = controller; setBusy(true);
    try {
      const result = await apiRequest(`/api/projects/${encodeURIComponent(projectId)}/auth/settings`, { method: 'PUT', body: { allowedOrigins, signupEnabled }, signal: controller.signal });
      if (!result?.settings || !Array.isArray(result.settings.allowedOrigins) || typeof result.settings.signupEnabled !== 'boolean') throw new Error('The updated authentication settings could not be read.');
      if (!controller.signal.aborted) onSaved();
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'Authentication settings could not be saved.');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <div className="authmgr-settings authmgr-app-settings">
    <h3>Web app sign-in settings</h3><p>Allow your web app’s browser origin and control public registration.</p>
    <form className="authmgr-form" onSubmit={save}>
      <div className="authmgr-field"><label htmlFor="app-auth-origins">Allowed web app origins</label><textarea id="app-auth-origins" value={origins} onChange={(event) => setOrigins(event.target.value)} placeholder={'https://app.example.com\nhttp://localhost:3000'} rows={3} disabled={busy} aria-describedby="app-auth-origins-help" /><small id="app-auth-origins-help">One exact origin per line, up to 10. No wildcards or URL paths. An empty list configures no external browser apps; this site’s origin remains allowed.</small></div>
      <label className="authmgr-checkbox"><input type="checkbox" aria-label="Allow new users to sign up" aria-describedby="app-auth-signup-help" checked={signupEnabled} onChange={(event) => setSignupEnabled(event.target.checked)} disabled={busy} /><span><strong>Allow new users to sign up</strong><small id="app-auth-signup-help">Controls public web app registration. You can still create app users here when disabled.</small></span></label>
      {error && <p className="authmgr-error" role="alert">{error}</p>}
      <div className="authmgr-settings-actions"><button className="db-button db-button-primary" type="submit" disabled={busy}>{busy && <LuLoaderCircle className="db-spinning" aria-hidden="true" />}{busy ? 'Saving…' : 'Save settings'}</button></div>
    </form>
    <div className="authmgr-policy-settings"><h3>Token & password policy</h3><p>Current read-only policies for app users.</p><dl><div><dt><LuClock aria-hidden="true" />Access token lifetime</dt><dd>{durationLabel(settings.accessTokenSeconds)}</dd></div><div><dt><LuMonitor aria-hidden="true" />Refresh token lifetime</dt><dd>{durationLabel(settings.refreshTokenSeconds)}</dd></div><div><dt><LuKeyRound aria-hidden="true" />Minimum password length</dt><dd>{Number.isFinite(settings.passwordMinLength) ? `${settings.passwordMinLength} characters` : 'Not available'}</dd></div></dl></div>
  </div>;
}

function integrationCode(authUrl) {
  return `const AUTH_URL = ${JSON.stringify(authUrl)};\n\n// App-user tokens stay in memory, never localStorage.\nlet accessToken = null;\nlet refreshToken = null;\n\nasync function request(path, { method = 'POST', body, authenticated = false } = {}) {\n  const headers = { Accept: 'application/json' };\n  if (body !== undefined) headers['Content-Type'] = 'application/json';\n  if (authenticated && accessToken) {\n    headers.Authorization = 'Bearer ' + accessToken;\n  }\n  const response = await fetch(AUTH_URL + path, {\n    method,\n    credentials: 'omit',\n    headers,\n    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),\n  });\n  const data = await response.json();\n  if (!response.ok) throw new Error(data.error || 'App authentication failed');\n  return data;\n}\n\n// Registration creates a user; call login separately to start a session.\nexport async function register({ email, password, name }) {\n  return request('/register', { body: { email, password, ...(name ? { name } : {}) } });\n}\n\nexport async function login(email, password) {\n  const session = await request('/login', { body: { email, password } });\n  accessToken = session.access_token;\n  refreshToken = session.refresh_token;\n  return session.user;\n}\n\nexport async function getUser() {\n  const data = await request('/me', { method: 'GET', authenticated: true });\n  return data.user;\n}\n\nexport async function refreshSession() {\n  try {\n    const session = await request('/refresh', { body: { refresh_token: refreshToken } });\n    accessToken = session.access_token;\n    refreshToken = session.refresh_token;\n    return session.user;\n  } catch (error) {\n    accessToken = null;\n    refreshToken = null;\n    throw error;\n  }\n}\n\nexport async function logout() {\n  try {\n    await request('/logout', {\n      authenticated: true,\n      body: { refresh_token: refreshToken },\n    });\n  } finally {\n    accessToken = null;\n    refreshToken = null;\n  }\n}`;
}

function AppIntegration({ integration, projectId, onConfigure }) {
  const [copyNotice, setCopyNotice] = useState('');
  const authUrl = typeof integration?.authUrl === 'string' ? integration.authUrl : '';
  const code = authUrl ? integrationCode(authUrl) : '';
  async function copyCode() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code); setCopyNotice('JavaScript copied.');
    } catch { setCopyNotice('Select and copy the code below.'); }
  }
  return <div className="authmgr-integration">
    <div className="authmgr-integration-intro"><h3>Connect your own web app</h3><p>Use this project’s public authentication endpoint in your application. Users register and sign in with their own app credentials.</p><a className="db-button" href={`/app-auth-demo.html?project=${encodeURIComponent(projectId)}`} target="_blank" rel="noopener noreferrer">Try auth demo <LuArrowUpRight aria-hidden="true" /></a></div>
    <div className="authmgr-integration-identifiers"><div className="authmgr-field"><label htmlFor="app-auth-project">Project ID</label><input id="app-auth-project" value={integration?.projectId || projectId} readOnly /><small>A public identifier, not an API key or secret.</small></div><div className="authmgr-field"><label htmlFor="app-auth-url">Authentication URL</label><input id="app-auth-url" value={authUrl} readOnly /><small>The base URL for this app’s register, login, me, refresh, and logout requests.</small></div></div>
    <div className="authmgr-integration-step"><span>1</span><div><h3>Allow your web app’s origin</h3><p>For a browser app hosted on another domain, add its exact origin in Providers before calling this API. Server-side clients without an Origin header can also use these endpoints.</p><button type="button" className="db-button" onClick={onConfigure}>Configure allowed origins <LuArrowUpRight aria-hidden="true" /></button></div></div>
    <div className="authmgr-integration-step"><span>2</span><div><h3>Add app authentication to your JavaScript</h3><p>Use your app form values with <code>register()</code> and <code>login()</code>. The example keeps both app tokens in module memory; reloading requires a new sign-in. Never embed your Grupedia builder token in an app.</p></div></div>
    {authUrl ? <div className="authmgr-code-example"><div><span>app-auth.js</span><button type="button" className="db-button" onClick={copyCode}><LuCopy aria-hidden="true" />Copy JavaScript</button></div><pre tabIndex={0} aria-label="Web app authentication JavaScript"><code>{code}</code></pre>{copyNotice && <p role="status">{copyNotice}</p>}</div> : <p className="authmgr-error" role="alert">The authentication URL is unavailable. Refresh the overview to load this project’s integration details.</p>}
  </div>;
}

export default function Authentication() {
  const { projectId, project, projectsLoading, projectsError, retryProjects, sidebarOpen, closeSidebar } = useWorkspace();
  const [view, setView] = useState('users');
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ projectId: '', data: null, loading: false, error: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');
  const [notice, setNotice] = useState('');
  const mutations = useRef(new Set());
  const currentProject = useRef(projectId);
  currentProject.current = projectId;
  const mutationPending = useRef(false);
  const data = state.projectId === projectId ? state.data : null;
  const users = data?.users || [];
  const sessions = data?.sessions || [];
  const providers = data?.providers || [];
  const settings = data?.settings || {};
  const userTotal = Number.isFinite(data?.totals?.users) ? data.totals.users : users.length;
  const sessionTotal = Number.isFinite(data?.totals?.activeSessions) ? data.totals.activeSessions : sessions.length;
  const loading = projectsLoading || Boolean(projectId && (state.projectId !== projectId || state.loading));
  const activeView = views.find((item) => item.id === view);
  const authTable = view === 'users' || view === 'sessions' ? view : null;
  const filteredUsers = users.filter((user) => [user.name, user.email, user.id].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase().trim())));

  useEffect(() => {
    setView('users'); setSearch(''); setSelectedUser(null); setCreateOpen(false); setSelectedSession(null); setRevokeError(''); setNotice(''); setRevoking(false);
    mutationPending.current = false;
    const pendingMutations = mutations.current;
    pendingMutations.forEach((controller) => controller.abort()); pendingMutations.clear();
    return () => { pendingMutations.forEach((controller) => controller.abort()); pendingMutations.clear(); };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setState({ projectId: '', data: null, loading: false, error: '' }); return undefined; }
    const controller = new AbortController();
    setState({ projectId, data: null, loading: true, error: '' });
    apiRequest(`/api/projects/${encodeURIComponent(projectId)}/auth`, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted || currentProject.current !== projectId) return;
        if (!result || !Array.isArray(result.users) || !Array.isArray(result.sessions) || !Array.isArray(result.providers) || !result.settings || typeof result.settings !== 'object') throw new Error('The authentication overview could not be read. Please try again.');
        setState({ projectId, data: result, loading: false, error: '' });
      })
      .catch((error) => { if (!controller.signal.aborted && currentProject.current === projectId) setState({ projectId, data: null, loading: false, error: error.message || 'Authentication could not be loaded.' }); });
    return () => controller.abort();
  }, [projectId, revision]);

  function chooseView(id, close = true) {
    setView(id); setSelectedUser(null); setCreateOpen(false); setSelectedSession(null); setRevokeError(''); setNotice(''); if (close) closeSidebar();
  }
  function moveTab(event) {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = views.findIndex((item) => item.id === view);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + views.length) % views.length;
    chooseView(views[next].id, false); event.currentTarget.querySelector(`#authmgr-tab-${views[next].id}`)?.focus();
  }
  function refresh(message = '') {
    setSelectedUser(null); setCreateOpen(false); setSelectedSession(null); setRevokeError(''); setNotice(message); setRevision((value) => value + 1);
  }
  async function revokeSession() {
    if (!data || !selectedSession || mutationPending.current) return;
    const controller = new AbortController(); const requestProject = projectId;
    mutations.current.add(controller); mutationPending.current = true; setRevoking(true); setRevokeError('');
    try {
      await apiRequest(`/api/projects/${encodeURIComponent(requestProject)}/auth/sessions/${encodeURIComponent(selectedSession.id)}`, { method: 'DELETE', signal: controller.signal });
      if (!controller.signal.aborted && currentProject.current === requestProject) refresh('The app session was revoked.');
    } catch (error) {
      if (!controller.signal.aborted && currentProject.current === requestProject) setRevokeError(error.message || 'The app session could not be revoked.');
    } finally {
      mutations.current.delete(controller);
      if (!controller.signal.aborted && currentProject.current === requestProject) { mutationPending.current = false; setRevoking(false); }
    }
  }

  return <>
    <aside id="workspace-sidebar" className={`db-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Authentication navigation">
      <WorkspaceNavigation /><div className="db-sidebar-title"><LuShieldCheck aria-hidden="true" /><h1>Authentication</h1></div>
      <p className="authmgr-sidebar-label">YOUR WEB APP</p>
      <div className="authmgr-sidebar-tabs" role="tablist" aria-label="Authentication views" aria-orientation="vertical" onKeyDown={moveTab}>{views.map(({ id, label, Icon }) => <button id={`authmgr-tab-${id}`} key={id} type="button" role="tab" aria-selected={view === id} tabIndex={view === id ? 0 : -1} aria-controls="authmgr-panel" className={view === id ? 'is-active' : ''} onClick={() => chooseView(id)}><Icon aria-hidden="true" /><span>{label}</span>{data && ['users', 'sessions'].includes(id) && <small>{id === 'users' ? userTotal : sessionTotal}</small>}</button>)}</div>
      <div className="authmgr-sidebar-note"><LuShieldCheck aria-hidden="true" /><div><strong>Application authentication</strong><p>Users of your own web app.</p></div></div>
    </aside>
    <main className="db-editor authmgr-editor" id="workspace-content" tabIndex={-1}>
      <header className="db-editor-heading"><div className="db-current-table"><activeView.Icon aria-hidden="true" /><span>{activeView.label}</span><code className="authmgr-namespace-badge" aria-label="Authentication namespace">auth</code></div><span className="authmgr-scope-badge"><LuGlobe aria-hidden="true" /> Web app</span></header>
      <section id="authmgr-panel" className="authmgr-panel" role="tabpanel" aria-labelledby={`authmgr-tab-${view}`}>
        {loading ? <AuthMessage kind="loading" title="Loading authentication">Reading your web app’s users and sessions…</AuthMessage> : projectsError ? <AuthMessage kind="error" title="Your workspace couldn’t be loaded" onRetry={retryProjects}>{projectsError}</AuthMessage> : !projectId || !project ? <AuthMessage title="No project selected">Select a project to manage its web app authentication.</AuthMessage> : state.error ? <AuthMessage kind="error" title="Authentication couldn’t be loaded" onRetry={() => refresh()}>{state.error}</AuthMessage> : data ? <>
          <div className="authmgr-content-heading"><div><h2>{activeView.label}</h2><p>{view === 'users' ? `Users of ${project.name || 'your project'} applications.` : view === 'providers' ? 'Configure sign-in for your own web app.' : view === 'sessions' ? 'Active sign-in sessions for your app users.' : 'Connect registration and sign-in to your web app.'}</p></div><div className="authmgr-heading-actions">{view === 'users' && <button type="button" className="db-button db-button-primary" onClick={() => setCreateOpen(true)}><LuPlus aria-hidden="true" />Create user</button>}{authTable && <Link className="db-button authmgr-table-link" to={`/dashboard/database?schema=auth&table=${authTable}`}><LuTable2 aria-hidden="true" />View auth.{authTable}<LuArrowUpRight aria-hidden="true" /></Link>}<button type="button" className="db-button" onClick={() => refresh()} disabled={revoking}><LuRefreshCw aria-hidden="true" />Refresh</button></div></div>
          <p className="authmgr-namespace-note">Application authentication records are grouped in the <code>auth</code> namespace. This prototype uses logical namespaces; PostgreSQL schema isolation is planned.</p>
          <div className="authmgr-scope-note"><LuInfo aria-hidden="true" /><p><strong>Your web app’s users.</strong> These accounts are separate from your Grupedia builder account.</p></div>
          {notice && <p className="authmgr-success" role="status"><LuCircleCheck aria-hidden="true" />{notice}</p>}
          {view === 'users' && <>
            <div className="authmgr-user-toolbar"><div className="db-row-search"><LuSearch aria-hidden="true" /><label className="sr-only" htmlFor="authmgr-search">Search app users</label><input id="authmgr-search" type="search" placeholder="Search by name, email, or ID…" value={search} onChange={(event) => setSearch(event.target.value)} autoComplete="off" /></div><span>{filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}</span></div>
            {userTotal > users.length && <p className="authmgr-list-limit">Showing {users.length.toLocaleString()} of {userTotal.toLocaleString()} app users. Search filters this loaded list.</p>}
            {filteredUsers.length ? <div className="authmgr-table-scroll" role="region" aria-label="App users" tabIndex={0}><table className="authmgr-table"><caption className="sr-only">Application users</caption><thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Provider</th><th scope="col">Last sign-in</th><th scope="col">Created</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id}><td><div className="authmgr-user-cell"><span className="authmgr-avatar">{(user.name || user.email || '?').charAt(0).toUpperCase()}</span><div><strong>{user.name || 'App user'}</strong><span>{user.email}</span></div></div></td><td><span className="authmgr-role">App user</span></td><td><span className="authmgr-provider-inline"><LuMail aria-hidden="true" />{user.provider || 'email'}</span></td><td>{dateLabel(user.lastSignInAt)}</td><td>{dateLabel(user.createdAt)}</td><td><button type="button" className="authmgr-detail-button" onClick={() => setSelectedUser(user)} aria-label={`View ${user.email}`}><LuChevronRight aria-hidden="true" /></button></td></tr>)}</tbody></table></div> : <div className="authmgr-empty"><LuUsers aria-hidden="true" /><h3>{search ? 'No matching users' : 'No app users yet'}</h3><p>{search ? 'Try another name, email, or user ID.' : 'Users appear here when they register through your web app. You can also create a user to test your integration.'}</p></div>}
          </>}
          {view === 'providers' && <>
            <div className="authmgr-provider-list">{providers.length ? providers.map((provider) => { const Icon = provider.id === 'email' ? LuMail : provider.id === 'github' ? LuGithub : LuGlobe; return <article className="authmgr-provider-card" key={provider.id}><span className={`authmgr-provider-icon provider-${provider.id}`}><Icon aria-hidden="true" /></span><div><h3>{provider.name}</h3><p>{provider.id === 'email' ? 'Your web app’s email/password sign-in.' : `${provider.name} sign-in is not connected for this web app.`}</p></div>{provider.enabled ? <span className="authmgr-provider-enabled"><span />Ready</span> : <button className="db-button" type="button" disabled title="Provider setup is not available">Not connected</button>}</article>; }) : <div className="authmgr-empty"><LuKeyRound aria-hidden="true" /><h3>No providers available</h3><p>The configured sign-in methods will appear here.</p></div>}</div>
            <AppAuthSettings projectId={projectId} settings={settings} onSaved={() => refresh('Authentication settings saved.')} />
          </>}
          {view === 'sessions' && <>{sessionTotal > sessions.length && <p className="authmgr-list-limit">Showing the latest {sessions.length.toLocaleString()} of {sessionTotal.toLocaleString()} active app sessions.</p>}{sessions.length ? <div className="authmgr-table-scroll" role="region" aria-label="App sessions" tabIndex={0}><table className="authmgr-table authmgr-sessions-table"><caption className="sr-only">Application sessions</caption><thead><tr><th scope="col">App user</th><th scope="col">Session</th><th scope="col">Created</th><th scope="col">Last active</th><th scope="col">Expires</th><th scope="col"><span className="sr-only">Revoke session</span></th></tr></thead><tbody>{sessions.map((session) => <tr key={session.id}><td><div className="authmgr-user-cell"><span className="authmgr-avatar"><LuUsers aria-hidden="true" /></span><div><strong>{session.email || 'App user'}</strong><span className="authmgr-user-id" title={session.userId}>{session.userId}</span></div></div></td><td><code className="authmgr-session-id" title={session.id}>{session.id}</code></td><td>{dateLabel(session.createdAt)}</td><td>{dateLabel(session.lastUsedAt)}</td><td>{dateLabel(session.expiresAt)}</td><td><button type="button" className="db-button authmgr-revoke-button" onClick={() => { setSelectedSession(session); setRevokeError(''); }} disabled={revoking} aria-label={`Revoke session ${session.id}`}><LuLogOut aria-hidden="true" />Revoke</button></td></tr>)}</tbody></table></div> : <div className="authmgr-empty"><LuMonitor aria-hidden="true" /><h3>No app sessions yet</h3><p>Sessions appear when users sign in to your web app.</p></div>}</>}
          {view === 'integration' && <AppIntegration integration={data.integration} projectId={projectId} onConfigure={() => chooseView('providers', false)} />}
        </> : null}
      </section>
    </main>
    {data && createOpen && <CreateAppUserDialog key={projectId} projectId={projectId} onClose={() => setCreateOpen(false)} onCreated={() => refresh('App user created.')} />}
    {data && selectedUser && <AuthDialog title="App user details" onClose={() => setSelectedUser(null)}><p className="authmgr-dialog-description">Public profile details for this web app user.</p><dl className="authmgr-user-details"><div><dt>Name</dt><dd>{selectedUser.name || 'Not provided'}</dd></div><div><dt>Email</dt><dd>{selectedUser.email}</dd></div><div><dt>User ID</dt><dd><code>{selectedUser.id}</code></dd></div><div><dt>Role</dt><dd>App user</dd></div><div><dt>Provider</dt><dd>{selectedUser.provider || 'email'}</dd></div><div><dt>Created</dt><dd>{dateLabel(selectedUser.createdAt)}</dd></div><div><dt>Last sign-in</dt><dd>{dateLabel(selectedUser.lastSignInAt)}</dd></div></dl></AuthDialog>}
    {data && selectedSession && <AuthDialog title="Revoke this app session?" busy={revoking} onClose={() => { if (!revoking) setSelectedSession(null); }}><p className="authmgr-dialog-description">Revoke this web app session. The app user will need to sign in again for this session.</p><div className="authmgr-session-to-revoke"><LuMonitor aria-hidden="true" /><div><strong>{selectedSession.email || 'App user'}</strong><code>{selectedSession.id}</code></div></div>{revokeError && <p className="authmgr-error" role="alert">{revokeError}</p>}<div className="authmgr-dialog-actions"><button type="button" className="db-button" onClick={() => setSelectedSession(null)} disabled={revoking}>Cancel</button><button type="button" className="db-button authmgr-revoke-confirm" onClick={revokeSession} disabled={revoking}>{revoking ? <LuLoaderCircle aria-hidden="true" className="db-spinning" /> : <LuLogOut aria-hidden="true" />}{revoking ? 'Revoking…' : 'Revoke session'}</button></div></AuthDialog>}
  </>;
}
