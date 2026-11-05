import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LuBookOpen, LuBraces, LuChevronDown, LuDatabase, LuFileBox,
  LuGitBranch, LuLogOut, LuMenu, LuShieldCheck, LuTable2, LuX,
} from 'react-icons/lu';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../lib/api';
import '../../router/dashboard.css';

const WorkspaceContext = createContext(null);
const sections = [
  { id: 'database', to: '/dashboard/database', label: 'Database', railLabel: 'Table editor', icon: LuTable2 },
  { id: 'auth', to: '/dashboard/auth', label: 'Authentication', railLabel: 'Authentication', icon: LuShieldCheck },
  { id: 'storage', to: '/dashboard/storage', label: 'Storage', railLabel: 'Storage', icon: LuFileBox },
  { id: 'api-builder', to: '/dashboard/api-builder', label: 'API Builder', railLabel: 'API Builder', icon: LuBraces },
];

function activeSection(pathname) {
  if (pathname === '/dashboard/auth' || pathname.startsWith('/dashboard/auth/')) return 'auth';
  if (pathname === '/dashboard/storage' || pathname.startsWith('/dashboard/storage/')) return 'storage';
  if (pathname === '/dashboard/api-builder' || pathname.startsWith('/dashboard/api-builder/')) return 'api-builder';
  return 'database';
}

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('Workspace sections must be rendered inside DashboardLayout.');
  return workspace;
}

export function WorkspaceNavigation() {
  const { closeSidebar } = useWorkspace();
  const { pathname } = useLocation();
  const section = activeSection(pathname);
  return <nav className="db-section-navigation" aria-label="Workspace sections">
    <span className="db-section-navigation-label">Project tools</span>
    <div>{sections.map(({ id, to, label, icon: Icon }) => <Link key={id} to={to} className={`db-section-link${section === id ? ' is-active' : ''}`} aria-current={section === id ? 'page' : undefined} onClick={closeSidebar}><Icon aria-hidden="true" />{label}</Link>)}</div>
  </nav>;
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [projectsRevision, setProjectsRevision] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const sidebarButton = useRef(null);
  const project = projects.find((item) => String(item.id) === projectId);
  const section = activeSection(pathname);
  const sidebarName = section === 'database' ? 'tables' : section === 'auth' ? 'authentication' : section === 'api-builder' ? 'API builder' : 'storage';
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const retryProjects = useCallback(() => setProjectsRevision((value) => value + 1), []);

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

  useEffect(() => { setSidebarOpen(false); }, [pathname, projectId]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        sidebarButton.current?.focus();
      }
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen]);

  async function signOut() {
    if (signingOut) return;
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

  return <WorkspaceContext.Provider value={{ projectId, project, projectsLoading, projectsError, retryProjects, sidebarOpen, closeSidebar }}>
    <div className="db-shell">
      <a href={section === 'database' ? '#database-editor' : '#workspace-content'} className="db-skip-link">Skip to {section === 'database' ? 'table editor' : section === 'auth' ? 'authentication' : section === 'api-builder' ? 'API builder' : 'storage'}</a>
      <nav className="db-rail" aria-label="Project tools">
        <Link to="/" className="db-rail-brand" aria-label="Grupedia home"><img src={`${process.env.PUBLIC_URL || ''}/logo.svg`} alt="" width="31" height="29" /></Link>
        <div className="db-rail-tools">
          {sections.map(({ id, to, railLabel, icon: Icon }) => <Link key={id} to={to} className={`db-rail-button${section === id ? ' is-active' : ''}`} aria-label={railLabel} aria-current={section === id ? 'page' : undefined} title={railLabel}><Icon aria-hidden="true" /></Link>)}
        </div>
        <Link className="db-rail-button db-rail-help" to="/docs" aria-label="Documentation" title="Documentation"><LuBookOpen /></Link>
        <span className="db-rail-avatar" title={user?.email || 'Your account'}>{(user?.name || user?.email || 'G').charAt(0).toUpperCase()}</span>
      </nav>
      <header className="db-topbar">
        <div className="db-topbar-project">
          <button ref={sidebarButton} type="button" className="db-icon-button db-sidebar-toggle" aria-label={sidebarOpen ? `Close ${sidebarName} sidebar` : `Open ${sidebarName} sidebar`} aria-expanded={sidebarOpen} aria-controls="workspace-sidebar" onClick={() => setSidebarOpen((value) => !value)}>{sidebarOpen ? <LuX /> : <LuMenu />}</button>
          <span className="db-workspace-name">Grupedia</span><span className="db-breadcrumb-divider" aria-hidden="true">/</span>
          <div className="db-project-picker"><LuDatabase aria-hidden="true" /><label className="sr-only" htmlFor="db-project">Project</label><select id="db-project" value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={projectsLoading || !projects.length}>{!projects.length && <option value="">{projectsLoading ? 'Loading projects…' : 'No project'}</option>}{projects.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select><LuChevronDown aria-hidden="true" /></div>
          <span className="db-test-badge">Test database</span>
        </div>
        <div className="db-topbar-actions"><span className="db-branch"><LuGitBranch aria-hidden="true" />{project?.environment || 'test'}</span><button type="button" className="db-signout" onClick={signOut} disabled={signingOut} title="Sign out"><LuLogOut aria-hidden="true" /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span></button></div>
      </header>
      {sidebarOpen && <button type="button" className="db-sidebar-backdrop" aria-label={`Close ${sidebarName} sidebar`} onClick={closeSidebar} />}
      {signOutError && <p className="db-shell-error" role="alert">{signOutError}</p>}
      <Outlet key={projectId} />
    </div>
  </WorkspaceContext.Provider>;
}
