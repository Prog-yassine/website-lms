import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuArrowUpRight, LuChevronRight, LuCircleCheck, LuClock, LuGithub, LuGlobe, LuInfo, LuKeyRound, LuLoaderCircle, LuLogOut, LuMail, LuMonitor, LuRefreshCw, LuSearch, LuShieldCheck, LuTable2, LuTriangleAlert, LuUsers, LuX } from 'react-icons/lu';
import { useWorkspace, WorkspaceNavigation } from '../components/dashboard/DashboardLayout';
import { apiRequest } from '../lib/api';
import './authentication.css';

const views = [
  { id: 'users', label: 'Users', Icon: LuUsers },
  { id: 'providers', label: 'Providers', Icon: LuKeyRound },
  { id: 'sessions', label: 'Sessions', Icon: LuMonitor },
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

export default function Authentication() {
  const { projectId, project, projectsLoading, projectsError, retryProjects, sidebarOpen, closeSidebar } = useWorkspace();
  const [view, setView] = useState('users');
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ projectId: '', data: null, loading: false, error: '' });
  const [selectedUser, setSelectedUser] = useState(null);
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
  const loading = projectsLoading || Boolean(projectId && (state.projectId !== projectId || state.loading));
  const activeView = views.find((item) => item.id === view);
  const authTable = view === 'users' || view === 'sessions' ? view : null;
  const filteredUsers = users.filter((user) => [user.name, user.email, user.id].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase().trim())));

  useEffect(() => {
    setView('users'); setSearch(''); setSelectedUser(null); setSelectedSession(null); setRevokeError(''); setNotice(''); setRevoking(false);
    mutationPending.current = false;
    const pendingMutations = mutations.current;
    pendingMutations.forEach((controller) => controller.abort());
    pendingMutations.clear();
    return () => { pendingMutations.forEach((controller) => controller.abort()); pendingMutations.clear(); };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setState({ projectId: '', data: null, loading: false, error: '' });
      return undefined;
    }
    const controller = new AbortController();
    setState({ projectId, data: null, loading: true, error: '' });
    apiRequest(`/api/projects/${encodeURIComponent(projectId)}/auth`, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted || currentProject.current !== projectId) return;
        if (!result || !Array.isArray(result.users) || !Array.isArray(result.sessions) || !Array.isArray(result.providers) || !result.settings || typeof result.settings !== 'object') {
          throw new Error('The authentication overview could not be read. Please try again.');
        }
        setState({ projectId, data: result, loading: false, error: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted && currentProject.current === projectId) setState({ projectId, data: null, loading: false, error: error.message || 'Authentication could not be loaded.' });
      });
    return () => controller.abort();
  }, [projectId, revision]);

  function chooseView(id) {
    setView(id); setSelectedUser(null); setSelectedSession(null); setRevokeError(''); setNotice(''); closeSidebar();
  }

  function moveTab(event) {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = views.findIndex((item) => item.id === view);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + views.length) % views.length;
    chooseView(views[next].id);
    event.currentTarget.querySelector(`#authmgr-tab-${views[next].id}`)?.focus();
  }

  function refresh() {
    setSelectedUser(null); setSelectedSession(null); setRevokeError(''); setNotice(''); setRevision((value) => value + 1);
  }

  async function revokeSession() {
    if (!data || !selectedSession || selectedSession.current || mutationPending.current) return;
    const controller = new AbortController();
    const requestProject = projectId;
    mutations.current.add(controller);
    mutationPending.current = true;
    setRevoking(true); setRevokeError('');
    try {
      await apiRequest(`/api/projects/${encodeURIComponent(requestProject)}/auth/sessions/${encodeURIComponent(selectedSession.id)}`, { method: 'DELETE', signal: controller.signal });
      if (controller.signal.aborted || currentProject.current !== requestProject) return;
      setSelectedSession(null); setNotice('The session was revoked.'); setRevision((value) => value + 1);
    } catch (error) {
      if (!controller.signal.aborted && currentProject.current === requestProject) setRevokeError(error.message || 'The session could not be revoked. Please try again.');
    } finally {
      mutations.current.delete(controller);
      if (!controller.signal.aborted && currentProject.current === requestProject) { mutationPending.current = false; setRevoking(false); }
    }
  }

  return <>
    <aside id="workspace-sidebar" className={`db-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Authentication navigation">
      <WorkspaceNavigation />
      <div className="db-sidebar-title"><LuShieldCheck aria-hidden="true" /><h1>Authentication</h1></div>
      <p className="authmgr-sidebar-label">MANAGE</p>
      <div className="authmgr-sidebar-tabs" role="tablist" aria-label="Authentication views" aria-orientation="vertical" onKeyDown={moveTab}>{views.map(({ id, label, Icon }) => <button id={`authmgr-tab-${id}`} key={id} type="button" role="tab" aria-selected={view === id} tabIndex={view === id ? 0 : -1} aria-controls="authmgr-panel" className={view === id ? 'is-active' : ''} onClick={() => chooseView(id)}><Icon aria-hidden="true" /><span>{label}</span>{data && id !== 'providers' && <small>{id === 'users' ? users.length : sessions.length}</small>}</button>)}</div>
      <div className="authmgr-sidebar-note"><LuShieldCheck aria-hidden="true" /><div><strong>Project owner</strong><p>Owner account access only.</p></div></div>
    </aside>
    <main className="db-editor authmgr-editor" id="workspace-content" tabIndex={-1}>
      <header className="db-editor-heading"><div className="db-current-table"><activeView.Icon aria-hidden="true" /><span>{activeView.label}</span><code className="authmgr-namespace-badge" aria-label="Authentication namespace">auth</code></div><span className="authmgr-scope-badge"><LuShieldCheck aria-hidden="true" /> Project owner</span></header>
      <section id="authmgr-panel" className="authmgr-panel" role="tabpanel" aria-labelledby={`authmgr-tab-${view}`}>
        {loading ? <AuthMessage kind="loading" title="Loading authentication">Reading the project owner’s account and sessions…</AuthMessage> : projectsError ? <AuthMessage kind="error" title="Your workspace couldn’t be loaded" onRetry={retryProjects}>{projectsError}</AuthMessage> : !projectId || !project ? <AuthMessage title="No project selected">Select a project to inspect its owner account.</AuthMessage> : state.error ? <AuthMessage kind="error" title="Authentication couldn’t be loaded" onRetry={refresh}>{state.error}</AuthMessage> : data ? <>
          <div className="authmgr-content-heading"><div><h2>{activeView.label}</h2><p>{view === 'users' ? 'The owner account with access to this project.' : view === 'providers' ? 'Sign-in methods available for the project owner.' : 'Manage the owner’s signed-in devices.'}</p></div><div className="authmgr-heading-actions">{authTable && <Link className="db-button authmgr-table-link" to={`/dashboard/database?schema=auth&table=${authTable}`}><LuTable2 aria-hidden="true" />View auth.{authTable}<LuArrowUpRight aria-hidden="true" /></Link>}<button type="button" className="db-button" onClick={refresh} disabled={revoking}><LuRefreshCw aria-hidden="true" /> Refresh</button></div></div>
          <p className="authmgr-namespace-note">Authentication records are grouped in the <code>auth</code> namespace. This prototype uses logical namespaces; PostgreSQL schema isolation is planned.</p>
          <div className="authmgr-scope-note"><LuInfo aria-hidden="true" /><p><strong>Project owner only.</strong> This view shows your Grupedia account and its sessions. An application-user directory is not configured for this project.</p></div>
          {notice && <p className="authmgr-success" role="status"><LuCircleCheck aria-hidden="true" />{notice}</p>}
          {view === 'users' && <>
            <div className="authmgr-user-toolbar"><div className="db-row-search"><LuSearch aria-hidden="true" /><label className="sr-only" htmlFor="authmgr-search">Search owner users</label><input id="authmgr-search" type="search" placeholder="Search by name, email, or ID…" value={search} onChange={(event) => setSearch(event.target.value)} autoComplete="off" /></div><span>{filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}</span></div>
            {filteredUsers.length ? <div className="authmgr-table-scroll" role="region" aria-label="Project owner users" tabIndex={0}><table className="authmgr-table"><caption className="sr-only">Project owner accounts</caption><thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Provider</th><th scope="col">Last sign-in</th><th scope="col">Created</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id}><td><div className="authmgr-user-cell"><span className="authmgr-avatar">{(user.name || user.email || '?').charAt(0).toUpperCase()}</span><div><strong>{user.name || 'Project owner'}</strong><span>{user.email}</span></div></div></td><td><span className="authmgr-role">{user.role === 'owner' ? 'Owner' : user.role || 'Owner'}</span></td><td><span className="authmgr-provider-inline"><LuMail aria-hidden="true" />{user.provider || 'email'}</span></td><td>{dateLabel(user.lastSignInAt)}</td><td>{dateLabel(user.createdAt)}</td><td><button type="button" className="authmgr-detail-button" onClick={() => setSelectedUser(user)} aria-label={`View ${user.email}`}><LuChevronRight aria-hidden="true" /></button></td></tr>)}</tbody></table></div> : <div className="authmgr-empty"><LuUsers aria-hidden="true" /><h3>{search ? 'No matching users' : 'No owner account found'}</h3><p>{search ? 'Try another name, email, or user ID.' : 'The owner account will appear here when available.'}</p></div>}
          </>}
          {view === 'providers' && <>
            <div className="authmgr-provider-list">{providers.length ? providers.map((provider) => {
              const Icon = provider.id === 'email' ? LuMail : provider.id === 'github' ? LuGithub : LuGlobe;
              return <article className="authmgr-provider-card" key={provider.id}><span className={`authmgr-provider-icon provider-${provider.id}`}><Icon aria-hidden="true" /></span><div><h3>{provider.name}</h3><p>{provider.id === 'email' ? 'Email and password for the project owner.' : `${provider.name} sign-in is not configured for this project.`}</p></div>{provider.enabled ? <span className="authmgr-provider-enabled"><span />Enabled</span> : <button className="db-button" type="button" disabled title="Provider setup is not available">Not connected</button>}</article>;
            }) : <div className="authmgr-empty"><LuKeyRound aria-hidden="true" /><h3>No providers available</h3><p>The configured sign-in methods will appear here.</p></div>}</div>
            <div className="authmgr-settings"><h3>Session & password settings</h3><p>Current account policies. These values are read only.</p><dl><div><dt><LuClock aria-hidden="true" />Access token lifetime</dt><dd>{durationLabel(settings.accessTokenSeconds)}</dd></div><div><dt><LuMonitor aria-hidden="true" />Refresh session lifetime</dt><dd>{durationLabel(settings.refreshTokenSeconds)}</dd></div><div><dt><LuKeyRound aria-hidden="true" />Minimum password length</dt><dd>{Number.isFinite(settings.passwordMinLength) ? `${settings.passwordMinLength} characters` : 'Not available'}</dd></div></dl></div>
          </>}
          {view === 'sessions' && (sessions.length ? <div className="authmgr-table-scroll" role="region" aria-label="Owner sessions" tabIndex={0}><table className="authmgr-table authmgr-sessions-table"><caption className="sr-only">Project owner sessions</caption><thead><tr><th scope="col">Session</th><th scope="col">Created</th><th scope="col">Last active</th><th scope="col">Expires</th><th scope="col"><span className="sr-only">Revoke session</span></th></tr></thead><tbody>{sessions.map((session, index) => <tr key={session.id}><td><div className="authmgr-session-cell"><LuMonitor aria-hidden="true" /><div><strong>{session.current ? 'Current session' : `Owner session ${index + 1}`}</strong><code title={session.id}>{session.id}</code></div></div></td><td>{dateLabel(session.createdAt)}</td><td>{dateLabel(session.lastUsedAt)}</td><td>{dateLabel(session.expiresAt)}</td><td>{session.current ? <button type="button" className="db-button" disabled>This session</button> : <button type="button" className="db-button authmgr-revoke-button" onClick={() => { setSelectedSession(session); setRevokeError(''); }} disabled={revoking} aria-label={`Revoke session ${session.id}`}><LuLogOut aria-hidden="true" />Revoke</button>}</td></tr>)}</tbody></table></div> : <div className="authmgr-empty"><LuMonitor aria-hidden="true" /><h3>No sessions found</h3><p>Your active sign-in sessions will appear here.</p></div>)}
        </> : null}
      </section>
    </main>
    {data && selectedUser && <AuthDialog title="Owner account details" onClose={() => setSelectedUser(null)}><p className="authmgr-dialog-description">Public account details for the owner of this project.</p><dl className="authmgr-user-details"><div><dt>Name</dt><dd>{selectedUser.name || 'Not available'}</dd></div><div><dt>Email</dt><dd>{selectedUser.email}</dd></div><div><dt>User ID</dt><dd><code>{selectedUser.id}</code></dd></div><div><dt>Role</dt><dd>Project owner</dd></div><div><dt>Provider</dt><dd>{selectedUser.provider || 'email'}</dd></div><div><dt>Created</dt><dd>{dateLabel(selectedUser.createdAt)}</dd></div><div><dt>Last sign-in</dt><dd>{dateLabel(selectedUser.lastSignInAt)}</dd></div></dl></AuthDialog>}
    {data && selectedSession && <AuthDialog title="Revoke this session?" busy={revoking} onClose={() => { if (!revoking) setSelectedSession(null); }}><p className="authmgr-dialog-description">This signs out the project owner on that device. Your current session stays active.</p><div className="authmgr-session-to-revoke"><LuMonitor aria-hidden="true" /><div><strong>Owner session</strong><code>{selectedSession.id}</code></div></div>{revokeError && <p className="authmgr-error" role="alert">{revokeError}</p>}<div className="authmgr-dialog-actions"><button type="button" className="db-button" onClick={() => setSelectedSession(null)} disabled={revoking}>Cancel</button><button type="button" className="db-button authmgr-revoke-confirm" onClick={revokeSession} disabled={revoking}>{revoking ? <LuLoaderCircle aria-hidden="true" className="db-spinning" /> : <LuLogOut aria-hidden="true" />}{revoking ? 'Revoking…' : 'Revoke session'}</button></div></AuthDialog>}
  </>;
}
