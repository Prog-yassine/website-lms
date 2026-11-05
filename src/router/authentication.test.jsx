import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Authentication from './authentication';
import { clearSession, setAccessToken } from '../lib/api';

let mockWorkspace;
jest.mock('../components/dashboard/DashboardLayout', () => ({
  useWorkspace: () => mockWorkspace,
  WorkspaceNavigation: () => null,
}));

const OWNER = {
  id: 'owner-one', name: 'Alex Teacher', email: 'alex@example.com', role: 'owner', provider: 'email',
  createdAt: '2026-10-01T10:00:00Z', lastSignInAt: '2026-11-04T10:00:00Z',
  passwordHash: 'must-never-render-password-hash', token: 'must-never-render-user-token',
};
const CURRENT_SESSION = {
  id: 'current-session', current: true, createdAt: '2026-11-03T10:00:00Z',
  lastUsedAt: '2026-11-04T10:00:00Z', expiresAt: '2026-11-10T10:00:00Z',
  refreshHash: 'must-never-render-refresh-hash',
};
const OTHER_SESSION = { ...CURRENT_SESSION, id: 'other-session', current: false };
const originalFetch = global.fetch;

function overview({ owner = OWNER, sessions = [CURRENT_SESSION, OTHER_SESSION] } = {}) {
  return {
    users: [owner], sessions,
    providers: [{ id: 'email', name: 'Email', enabled: true }, { id: 'google', name: 'Google', enabled: false }, { id: 'github', name: 'GitHub', enabled: false }],
    settings: { accessTokenSeconds: 900, refreshTokenSeconds: 604800, passwordMinLength: 8 },
  };
}

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(payload) };
}

function pathOf(url) {
  return new URL(String(url), 'https://test.example').pathname;
}

function authorization(options) {
  return typeof options.headers?.get === 'function' ? options.headers.get('Authorization') :
    options.headers?.Authorization || options.headers?.authorization;
}

function visit() {
  return render(<MemoryRouter><div className="db-shell"><Authentication /></div></MemoryRouter>);
}

function allowOverview(payload = overview()) {
  global.fetch = jest.fn((url) => {
    if (pathOf(url) === '/api/projects/p1/auth') return Promise.resolve(response(payload));
    throw new Error(`Unexpected backend request: ${url}`);
  });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearSession();
  setAccessToken('owner-access-token');
  mockWorkspace = {
    projectId: 'p1', project: { id: 'p1', name: 'Project' },
    projectsLoading: false, projectsError: '', retryProjects: jest.fn(),
    sidebarOpen: false, closeSidebar: jest.fn(),
  };
  global.fetch = jest.fn(() => { throw new Error('Unexpected backend request'); });
});

afterEach(() => { cleanup(); clearSession(); });
afterAll(() => { global.fetch = originalFetch; });

test('the owner overview loads only its scoped project and never renders sensitive fields', async () => {
  let resolveOverview;
  fetch.mockImplementation((url) => {
    if (pathOf(url) !== '/api/projects/p1/auth') throw new Error(`Unexpected backend request: ${url}`);
    return new Promise((resolve) => { resolveOverview = resolve; });
  });
  visit();
  expect(screen.getByRole('status')).toHaveTextContent('Loading authentication');
  await act(async () => { resolveOverview(response(overview())); });

  const users = await screen.findByRole('table', { name: 'Project owner accounts' });
  expect(within(users).getByText(OWNER.email)).toBeInTheDocument();
  expect(screen.getByText(/an application-user directory is not configured for this project/i)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(pathOf(fetch.mock.calls[0][0])).toBe('/api/projects/p1/auth');
  expect(authorization(fetch.mock.calls[0][1])).toBe('Bearer owner-access-token');
  for (const secret of [OWNER.passwordHash, OWNER.token, CURRENT_SESSION.refreshHash, 'owner-access-token']) {
    expect(screen.queryByText(secret)).not.toBeInTheDocument();
  }
});

test('owner search filters the scoped user list and details show only the selected account', async () => {
  allowOverview();
  visit();
  await screen.findByRole('table', { name: 'Project owner accounts' });
  const search = screen.getByLabelText('Search owner users');
  fireEvent.change(search, { target: { value: 'someone-else@example.com' } });
  expect(screen.getByRole('heading', { name: 'No matching users' })).toBeInTheDocument();
  expect(screen.queryByText(OWNER.email)).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: OWNER.id.toUpperCase() } });
  expect(screen.getByText(OWNER.email)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: `View ${OWNER.email}` }));
  const dialog = await screen.findByRole('dialog', { name: 'Owner account details' });
  expect(within(dialog).getByText(OWNER.email)).toBeInTheDocument();
  expect(within(dialog).getByText(OWNER.id)).toBeInTheDocument();
  expect(within(dialog).queryByText(OWNER.passwordHash)).not.toBeInTheDocument();
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('providers disclose the real connection state and expose no fake setup actions', async () => {
  allowOverview();
  visit();
  await screen.findByRole('table', { name: 'Project owner accounts' });
  fireEvent.click(screen.getByRole('tab', { name: 'Providers' }));

  const email = screen.getByRole('heading', { name: 'Email', level: 3 }).closest('article');
  expect(within(email).getByText('Enabled')).toBeInTheDocument();
  for (const name of ['Google', 'GitHub']) {
    const provider = screen.getByRole('heading', { name, level: 3 }).closest('article');
    const unavailable = within(provider).getByRole('button', { name: 'Not connected' });
    expect(unavailable).toBeDisabled();
    fireEvent.click(unavailable);
  }
  expect(screen.queryByRole('button', { name: /configure|connect provider|enable provider/i })).not.toBeInTheDocument();
  expect(screen.getByText('15 minutes')).toBeInTheDocument();
  expect(screen.getByText('7 days')).toBeInTheDocument();
  expect(screen.getByText('8 characters')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('authentication views link to the matching database table without offering a provider table', async () => {
  allowOverview();
  visit();
  await screen.findByRole('table', { name: 'Project owner accounts' });
  expect(screen.getByRole('link', { name: 'View auth.users' })).toHaveAttribute('href', '/dashboard/database?schema=auth&table=users');

  fireEvent.click(screen.getByRole('tab', { name: /^Sessions/ }));
  expect(screen.getByRole('link', { name: 'View auth.sessions' })).toHaveAttribute('href', '/dashboard/database?schema=auth&table=sessions');
  expect(screen.queryByRole('link', { name: 'View auth.users' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: 'Providers' }));
  expect(screen.queryByRole('link', { name: /^View auth\./ })).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('revoking another session requires confirmation, uses the scoped DELETE, and refreshes the overview', async () => {
  let revoked = false;
  global.fetch = jest.fn((url, options) => {
    const path = pathOf(url);
    if (path === '/api/projects/p1/auth') {
      return Promise.resolve(response(overview({ sessions: revoked ? [CURRENT_SESSION] : [CURRENT_SESSION, OTHER_SESSION] })));
    }
    if (path === '/api/projects/p1/auth/sessions/other-session' && options.method === 'DELETE') {
      revoked = true;
      return Promise.resolve(response(null, 204));
    }
    throw new Error(`Unexpected backend request: ${url}`);
  });
  visit();
  await screen.findByRole('table', { name: 'Project owner accounts' });
  fireEvent.click(screen.getByRole('tab', { name: /^Sessions/ }));
  expect(screen.getByRole('button', { name: 'This session' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Revoke session other-session' }));
  const dialog = screen.getByRole('dialog', { name: 'Revoke this session?' });
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke session' }));

  expect(await screen.findByText('The session was revoked.')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Revoke session other-session' })).not.toBeInTheDocument());
  expect(await screen.findByRole('button', { name: 'This session' })).toBeDisabled();
  expect(fetch.mock.calls.map(([url, options]) => [pathOf(url), options.method])).toEqual([
    ['/api/projects/p1/auth', 'GET'],
    ['/api/projects/p1/auth/sessions/other-session', 'DELETE'],
    ['/api/projects/p1/auth', 'GET'],
  ]);
  expect(authorization(fetch.mock.calls[1][1])).toBe('Bearer owner-access-token');
});

test('an overview error offers a scoped retry rather than invented owner data', async () => {
  let attempts = 0;
  global.fetch = jest.fn((url) => {
    if (pathOf(url) !== '/api/projects/p1/auth') throw new Error(`Unexpected backend request: ${url}`);
    attempts += 1;
    return Promise.resolve(attempts === 1 ? response({ error: 'Authentication temporarily unavailable' }, 503) : response(overview()));
  });
  visit();
  expect(await screen.findByRole('alert')).toHaveTextContent('Authentication temporarily unavailable');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByText(OWNER.email)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByRole('table', { name: 'Project owner accounts' })).toBeInTheDocument();
  expect(screen.getByText(OWNER.email)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls.every(([url]) => pathOf(url) === '/api/projects/p1/auth')).toBe(true);
});

test('switching projects removes the previous owner and open details while the next project loads', async () => {
  const secondOwner = { ...OWNER, id: 'owner-two', name: 'Sam Builder', email: 'sam@example.com' };
  let resolveSecondProject;
  let firstSignal;
  global.fetch = jest.fn((url, options) => {
    if (pathOf(url) === '/api/projects/p1/auth') {
      firstSignal = options.signal;
      return Promise.resolve(response(overview()));
    }
    if (pathOf(url) === '/api/projects/p2/auth') return new Promise((resolve) => { resolveSecondProject = resolve; });
    throw new Error(`Unexpected backend request: ${url}`);
  });
  const { rerender } = visit();
  await screen.findByRole('table', { name: 'Project owner accounts' });
  fireEvent.click(screen.getByRole('button', { name: `View ${OWNER.email}` }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  mockWorkspace = { ...mockWorkspace, projectId: 'p2', project: { id: 'p2', name: 'Second project' } };
  rerender(<MemoryRouter><div className="db-shell"><Authentication /></div></MemoryRouter>);

  expect(screen.getByRole('status')).toHaveTextContent('Loading authentication');
  expect(screen.queryByText(OWNER.email)).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(firstSignal.aborted).toBe(true);
  await act(async () => { resolveSecondProject(response(overview({ owner: secondOwner }))); });
  expect(await screen.findByText(secondOwner.email)).toBeInTheDocument();
  expect(screen.queryByText(OWNER.email)).not.toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch.mock.calls.map(([url]) => pathOf(url))).toEqual(['/api/projects/p1/auth', '/api/projects/p2/auth']);
});
