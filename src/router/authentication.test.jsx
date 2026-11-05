import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Authentication from './authentication';
import { clearSession, setAccessToken } from '../lib/api';

let mockWorkspace;
jest.mock('../components/dashboard/DashboardLayout', () => ({
  useWorkspace: () => mockWorkspace,
  WorkspaceNavigation: () => null,
}));

const APP_USER = {
  id: 'app-user-one', name: 'Alex Student', email: 'alex.student@example.com', role: 'authenticated', provider: 'email',
  createdAt: '2026-11-05T10:00:00Z', lastSignInAt: '2026-11-05T10:30:00Z',
  passwordHash: 'must-never-render-app-password-hash', token: 'must-never-render-app-user-token',
};
const APP_SESSION = {
  id: 'app-session-one', userId: APP_USER.id, email: APP_USER.email,
  createdAt: '2026-11-05T10:30:00Z', lastUsedAt: '2026-11-05T10:31:00Z', expiresAt: '2026-11-12T10:30:00Z',
  refreshHash: 'must-never-render-app-refresh-hash', current: true,
};
const SETTINGS = { accessTokenSeconds: 900, refreshTokenSeconds: 604800, passwordMinLength: 8, allowedOrigins: [], signupEnabled: true };
const AUTH_URL = 'https://api.example.test/api/apps/p1/auth';
const originalFetch = global.fetch;

function overview({ users = [], sessions = [], settings = SETTINGS, projectId = 'p1' } = {}) {
  return {
    users, sessions,
    providers: [{ id: 'email', name: 'Email', enabled: true }, { id: 'google', name: 'Google', enabled: false }, { id: 'github', name: 'GitHub', enabled: false }],
    settings,
    integration: { projectId, authUrl: `https://api.example.test/api/apps/${projectId}/auth`, basePath: `/api/apps/${projectId}/auth` },
    totals: { users: users.length, activeSessions: sessions.length },
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

function page() {
  return <MemoryRouter><div className="db-shell"><Authentication /></div></MemoryRouter>;
}

function visit() {
  return render(page());
}

function allowOverview(payload = overview()) {
  global.fetch = jest.fn((url) => {
    if (pathOf(url) === '/api/projects/p1/auth') return Promise.resolve(response(payload));
    throw new Error(`Unexpected backend request: ${url}`);
  });
}

function mutationCalls(method) {
  return fetch.mock.calls.filter(([, options]) => options.method === method);
}

async function openCreateUser() {
  fireEvent.click(await screen.findByRole('button', { name: 'Create user' }));
  return screen.getByRole('dialog', { name: 'Create app user' });
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

test('a new project has an empty app-user directory and does not substitute its platform owner', async () => {
  let resolveOverview;
  fetch.mockImplementation((url) => {
    if (pathOf(url) !== '/api/projects/p1/auth') throw new Error(`Unexpected backend request: ${url}`);
    return new Promise((resolve) => { resolveOverview = resolve; });
  });
  visit();
  expect(screen.getByRole('status')).toHaveTextContent('Loading authentication');
  await act(async () => { resolveOverview(response(overview())); });

  expect(await screen.findByRole('heading', { name: 'No app users yet' })).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByText(/project owner only|owner account access only|current session/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create user' })).toBeEnabled();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(pathOf(fetch.mock.calls[0][0])).toBe('/api/projects/p1/auth');
  expect(authorization(fetch.mock.calls[0][1])).toBe('Bearer owner-access-token');
});

test('manual user creation persists through the scoped API and clears passwords when the dialog closes', async () => {
  let created = false;
  global.fetch = jest.fn((url, options) => {
    if (pathOf(url) === '/api/projects/p1/auth') return Promise.resolve(response(overview({ users: created ? [APP_USER] : [] })));
    if (pathOf(url) === '/api/projects/p1/auth/users' && options.method === 'POST') {
      created = true;
      return Promise.resolve(response({ user: APP_USER }, 201));
    }
    throw new Error(`Unexpected backend request: ${url}`);
  });
  visit();
  let dialog = await openCreateUser();
  fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'cancelled-secret123' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
  dialog = await openCreateUser();
  expect(within(dialog).getByLabelText('Password')).toHaveValue('');
  fireEvent.change(within(dialog).getByLabelText('Full name (optional)'), { target: { value: APP_USER.name } });
  fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: APP_USER.email } });
  fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'app-password123' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create user' }));

  expect(await screen.findByRole('table', { name: 'Application users' })).toBeInTheDocument();
  expect(screen.getByText(APP_USER.email)).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const [url, options] = mutationCalls('POST')[0];
  expect(pathOf(url)).toBe('/api/projects/p1/auth/users');
  expect(JSON.parse(options.body)).toEqual({ name: APP_USER.name, email: APP_USER.email, password: 'app-password123' });
  expect(authorization(options)).toBe('Bearer owner-access-token');
  expect(fetch.mock.calls.filter(([request]) => pathOf(request) === '/api/projects/p1/auth')).toHaveLength(2);
  dialog = await openCreateUser();
  expect(within(dialog).getByLabelText('Password')).toHaveValue('');
  expect(localStorage.getItem('password')).toBeNull();
});

test('invalid user input cannot create an account or optimistically populate the directory', async () => {
  allowOverview();
  visit();
  const dialog = await openCreateUser();
  const email = within(dialog).getByLabelText('Email');
  fireEvent.change(email, { target: { value: 'not-an-email' } });
  fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'app-password123' } });
  expect(email).toBeInvalid();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create user' }));
  expect(mutationCalls('POST')).toHaveLength(0);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('app-user search and details expose public end-user fields while omitting credential material', async () => {
  allowOverview(overview({ users: [APP_USER] }));
  visit();
  await screen.findByRole('table', { name: 'Application users' });
  const search = screen.getByLabelText('Search app users');
  fireEvent.change(search, { target: { value: 'someone-else@example.com' } });
  expect(screen.getByRole('heading', { name: 'No matching users' })).toBeInTheDocument();
  expect(screen.queryByText(APP_USER.email)).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: APP_USER.id.toUpperCase() } });
  expect(screen.getByText(APP_USER.email)).toBeInTheDocument();
  expect(screen.getByText('App user')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: `View ${APP_USER.email}` }));
  const dialog = await screen.findByRole('dialog', { name: 'App user details' });
  expect(within(dialog).getByText(APP_USER.email)).toBeInTheDocument();
  expect(within(dialog).getByText(APP_USER.id)).toBeInTheDocument();
  for (const secret of [APP_USER.passwordHash, APP_USER.token, 'owner-access-token']) {
    expect(screen.queryByText(secret)).not.toBeInTheDocument();
  }
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('provider settings save through PUT and refresh the returned application-auth policy', async () => {
  let savedSettings = { ...SETTINGS, allowedOrigins: ['https://old.example.com'] };
  global.fetch = jest.fn((url, options) => {
    if (pathOf(url) === '/api/projects/p1/auth') return Promise.resolve(response(overview({ settings: savedSettings })));
    if (pathOf(url) === '/api/projects/p1/auth/settings' && options.method === 'PUT') {
      savedSettings = { ...SETTINGS, ...JSON.parse(options.body) };
      return Promise.resolve(response({ settings: savedSettings }));
    }
    throw new Error(`Unexpected backend request: ${url}`);
  });
  visit();
  await screen.findByRole('heading', { name: 'No app users yet' });
  fireEvent.click(screen.getByRole('tab', { name: 'Providers' }));
  expect(screen.getByLabelText('Allowed web app origins')).toHaveValue('https://old.example.com');
  const disconnected = screen.getAllByRole('button', { name: 'Not connected' });
  expect(disconnected).toHaveLength(2);
  disconnected.forEach((button) => expect(button).toBeDisabled());
  fireEvent.change(screen.getByLabelText('Allowed web app origins'), { target: { value: 'https://app.example.com\nhttp://localhost:3000' } });
  fireEvent.click(screen.getByLabelText('Allow new users to sign up'));
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

  expect(await screen.findByText('Authentication settings saved.')).toBeInTheDocument();
  await waitFor(() => expect(fetch.mock.calls.filter(([url]) => pathOf(url) === '/api/projects/p1/auth')).toHaveLength(2));
  expect(await screen.findByLabelText('Allowed web app origins')).toHaveValue('https://app.example.com\nhttp://localhost:3000');
  expect(screen.getByLabelText('Allow new users to sign up')).not.toBeChecked();
  const [url, options] = mutationCalls('PUT')[0];
  expect(pathOf(url)).toBe('/api/projects/p1/auth/settings');
  expect(JSON.parse(options.body)).toEqual({ allowedOrigins: ['https://app.example.com', 'http://localhost:3000'], signupEnabled: false });
  expect(authorization(options)).toBe('Bearer owner-access-token');
});

test.each([
  ['wildcards', '*'],
  ['untrusted plain HTTP', 'http://app.example.com'],
  ['too many origins', Array.from({ length: 11 }, (_, index) => `https://app${index}.example.com`).join('\n')],
])('provider settings reject %s before sending a mutation', async (_, origins) => {
  allowOverview();
  visit();
  await screen.findByRole('heading', { name: 'No app users yet' });
  fireEvent.click(screen.getByRole('tab', { name: 'Providers' }));
  fireEvent.change(screen.getByLabelText('Allowed web app origins'), { target: { value: origins } });
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(mutationCalls('PUT')).toHaveLength(0);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('app sessions can be revoked without exposing or controlling the platform-owner session', async () => {
  let revoked = false;
  global.fetch = jest.fn((url, options) => {
    const path = pathOf(url);
    if (path === '/api/projects/p1/auth') return Promise.resolve(response(overview({ users: [APP_USER], sessions: revoked ? [] : [APP_SESSION] })));
    if (path === '/api/projects/p1/auth/sessions/app-session-one' && options.method === 'DELETE') {
      revoked = true;
      return Promise.resolve(response(null, 204));
    }
    throw new Error(`Unexpected backend request: ${url}`);
  });
  visit();
  await screen.findByRole('table', { name: 'Application users' });
  fireEvent.click(screen.getByRole('tab', { name: /^Sessions/ }));
  const sessions = screen.getByRole('table', { name: 'Application sessions' });
  expect(within(sessions).getByText(APP_USER.email)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'This session' })).not.toBeInTheDocument();
  expect(screen.queryByText(APP_SESSION.refreshHash)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Revoke session app-session-one' }));
  const dialog = screen.getByRole('dialog', { name: 'Revoke this app session?' });
  expect(mutationCalls('DELETE')).toHaveLength(0);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke session' }));

  await waitFor(() => expect(fetch.mock.calls.filter(([url]) => pathOf(url) === '/api/projects/p1/auth')).toHaveLength(2));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Revoke session app-session-one' })).not.toBeInTheDocument());
  expect(fetch.mock.calls.map(([url, options]) => [pathOf(url), options.method])).toEqual([
    ['/api/projects/p1/auth', 'GET'],
    ['/api/projects/p1/auth/sessions/app-session-one', 'DELETE'],
    ['/api/projects/p1/auth', 'GET'],
  ]);
});

test('integration shows the public project contract and safe app-token examples', async () => {
  allowOverview();
  const { container } = visit();
  await screen.findByRole('heading', { name: 'No app users yet' });
  fireEvent.click(screen.getByRole('tab', { name: 'Integration' }));

  expect(screen.getByLabelText('Project ID')).toHaveValue('p1');
  expect(screen.getByLabelText('Authentication URL')).toHaveValue(AUTH_URL);
  const snippets = Array.from(container.querySelectorAll('pre')).map((block) => block.textContent).join('\n');
  for (const endpoint of ['/register', '/login', '/me', '/logout']) expect(snippets).toContain(endpoint);
  expect(snippets).toMatch(/credentials:\s*['"]omit['"]/);
  expect(snippets).toContain('accessToken');
  expect(snippets).toContain('refreshToken');
  expect(snippets).not.toMatch(/owner-access-token|(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|getItem)|\/api\/auth\/root/);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('users and sessions link to their own auth table while providers offer no table shortcut', async () => {
  allowOverview();
  visit();
  await screen.findByRole('heading', { name: 'No app users yet' });
  expect(screen.getByRole('link', { name: 'View auth.users' })).toHaveAttribute('href', '/dashboard/database?schema=auth&table=users');
  fireEvent.click(screen.getByRole('tab', { name: /^Sessions/ }));
  expect(screen.getByRole('link', { name: 'View auth.sessions' })).toHaveAttribute('href', '/dashboard/database?schema=auth&table=sessions');
  fireEvent.click(screen.getByRole('tab', { name: 'Providers' }));
  expect(screen.queryByRole('link', { name: /^View auth\./ })).not.toBeInTheDocument();
});

test('an overview failure retries the scoped app directory rather than inventing users', async () => {
  let attempts = 0;
  global.fetch = jest.fn((url) => {
    if (pathOf(url) !== '/api/projects/p1/auth') throw new Error(`Unexpected backend request: ${url}`);
    attempts += 1;
    return Promise.resolve(attempts === 1 ? response({ error: 'Authentication temporarily unavailable' }, 503) : response(overview()));
  });
  visit();
  expect(await screen.findByRole('alert')).toHaveTextContent('Authentication temporarily unavailable');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('heading', { name: 'No app users yet' })).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('switching projects immediately removes the previous app user and details while the next directory loads', async () => {
  const secondUser = { ...APP_USER, id: 'app-user-two', name: 'Sam Student', email: 'sam.student@example.com' };
  let resolveSecondProject;
  let firstSignal;
  global.fetch = jest.fn((url, options) => {
    if (pathOf(url) === '/api/projects/p1/auth') {
      firstSignal = options.signal;
      return Promise.resolve(response(overview({ users: [APP_USER] })));
    }
    if (pathOf(url) === '/api/projects/p2/auth') return new Promise((resolve) => { resolveSecondProject = resolve; });
    throw new Error(`Unexpected backend request: ${url}`);
  });
  const { rerender } = visit();
  await screen.findByRole('table', { name: 'Application users' });
  fireEvent.click(screen.getByRole('button', { name: `View ${APP_USER.email}` }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  mockWorkspace = { ...mockWorkspace, projectId: 'p2', project: { id: 'p2', name: 'Second project' } };
  rerender(page());

  expect(screen.getByRole('status')).toHaveTextContent('Loading authentication');
  expect(screen.queryByText(APP_USER.email)).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(firstSignal.aborted).toBe(true);
  await act(async () => { resolveSecondProject(response(overview({ users: [secondUser], projectId: 'p2' }))); });
  expect(await screen.findByText(secondUser.email)).toBeInTheDocument();
  expect(screen.queryByText(APP_USER.email)).not.toBeInTheDocument();
  expect(fetch.mock.calls.map(([url]) => pathOf(url))).toEqual(['/api/projects/p1/auth', '/api/projects/p2/auth']);
});
