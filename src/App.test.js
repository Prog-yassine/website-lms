import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { clearSession } from './lib/api';

const USER = { id: '11111111-1111-4111-8111-111111111111', name: 'Alex Teacher', email: 'alex@example.com' };
const SESSION = { token: 'integration-access-token', user: USER, expiresIn: 900 };
const originalFetch = global.fetch;

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: jest.fn().mockResolvedValue(payload) };
}

function pathOf(url) {
  return new URL(String(url), 'https://test.example').pathname;
}

function callsTo(path) {
  return fetch.mock.calls.filter(([url]) => pathOf(url) === path);
}

function authorization(options) {
  return typeof options.headers?.get === 'function' ? options.headers.get('Authorization') :
    options.headers?.Authorization || options.headers?.authorization;
}

function AuthState() {
  const { status } = useAuth();
  return <span data-testid="app-auth-state">{status}</span>;
}

function visit(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><AuthState /><AppRoutes /></AuthProvider>
    </MemoryRouter>
  );
}

function installFetch(authenticated = false, handler = () => { throw new Error('Unexpected backend request'); }) {
  global.fetch = jest.fn((url, options) => {
    if (pathOf(url) === '/api/auth/refresh') {
      return Promise.resolve(authenticated ? response(SESSION) : response({ error: 'No active session' }, 401));
    }
    return handler(url, options);
  });
}

async function waitForAuth(status = 'anonymous') {
  await waitFor(() => expect(screen.getByTestId('app-auth-state')).toHaveTextContent(status));
}

function installDashboardFetch(handleOther = (url) => { throw new Error(`Unexpected backend request: ${url}`); }) {
  installFetch(true, (url, options) => {
    const path = pathOf(url);
    if (path === '/api/auth/login') return Promise.resolve(response(SESSION));
    if (path === '/api/projects') return Promise.resolve(response({
      projects: [{ id: 'project-test', name: 'Integration project', environment: 'test', databaseType: 'SQLite', seeded: true }],
    }));
    if (path === '/api/projects/project-test/tables') return Promise.resolve(response({
      tables: [{ id: 'products', name: 'products', schema: 'main', rowCount: 1 }],
    }));
    if (path === '/api/projects/project-test/tables/products/rows') return Promise.resolve(response({
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
        { name: 'name', type: 'TEXT', nullable: false, primaryKey: false },
      ],
      rows: [{ id: 1, name: 'Integration product' }], rowCount: 1, page: 1, pageSize: 25, totalPages: 1,
    }));
    return handleOther(url, options);
  });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearSession();
  installFetch();
});

afterEach(() => {
  cleanup();
  clearSession();
  jest.restoreAllMocks();
});

afterAll(() => { global.fetch = originalFetch; });

test('the dashboard guard waits for the cookie session before sending an anonymous visitor to login', async () => {
  let resolveRefresh;
  global.fetch = jest.fn((url) => {
    if (pathOf(url) === '/api/auth/refresh') return new Promise((resolve) => { resolveRefresh = resolve; });
    throw new Error(`Unexpected backend request: ${url}`);
  });
  visit('/dashboard');
  expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
  expect(screen.queryByRole('heading', { name: /table editor/i })).not.toBeInTheDocument();
  expect(callsTo('/api/projects')).toHaveLength(0);

  await act(async () => { resolveRefresh(response({ error: 'No active session' }, 401)); });
  expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  expect(callsTo('/api/projects')).toHaveLength(0);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test.each(['/dashboard/database', '/dashboard/org', '/dashboard/division/old-project/database'])(
  'anonymous access to %s requires login and never loads project data', async (path) => {
    visit(path);
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(callsTo('/api/auth/refresh')).toHaveLength(1);
    expect(callsTo('/api/projects')).toHaveLength(0);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  }
);

test.each(['/dashboard', '/dashboard/database'])(
  'an authenticated visitor at %s sees real API rows with Bearer-authorized data requests', async (path) => {
    installDashboardFetch();
    visit(path);
    expect(await screen.findByRole('table', { name: 'products table, page 1 of 1' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Integration product' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Table Editor' })).toBeInTheDocument();
    for (const endpoint of ['/api/projects', '/api/projects/project-test/tables', '/api/projects/project-test/tables/products/rows']) {
      expect(callsTo(endpoint)).toHaveLength(1);
      expect(authorization(callsTo(endpoint)[0][1])).toBe('Bearer integration-access-token');
    }
    expect(localStorage.getItem('token')).toBeNull();
  }
);

test.each([
  '/dashboard/org',
  '/dashboard/org/new',
  '/dashboard/org/old-organization',
  '/dashboard/org/old-organization/division/new',
  '/dashboard/division/old-project/database',
  '/dashboard/division/old-project/auth/users',
  '/dashboard/division/old-project/setting/compute',
])('authenticated legacy workspace URL %s keeps the protected Coming soon page', async (path) => {
  installFetch(true);
  visit(path);
  expect(await screen.findByRole('heading', { name: /coming soon/i })).toBeInTheDocument();
  expect(callsTo('/api/auth/refresh')).toHaveLength(1);
  expect(callsTo('/api/projects')).toHaveLength(0);
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('signing out of the placeholder posts logout and returns to login with a cleared session', async () => {
  installFetch(true, (url) => {
    if (pathOf(url) === '/api/auth/logout') return Promise.resolve(response(null, 204));
    throw new Error(`Unexpected backend request: ${url}`);
  });
  localStorage.setItem('token', 'legacy-session');
  visit('/coming-soon');
  fireEvent.click(await screen.findByRole('button', { name: /sign out/i }));

  expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  await waitForAuth();
  expect(localStorage.getItem('token')).toBeNull();
  expect(callsTo('/api/auth/logout')).toHaveLength(1);
  const options = callsTo('/api/auth/logout')[0][1];
  expect(options).toEqual(expect.objectContaining({ method: 'POST', credentials: 'include' }));
  expect(authorization(options)).toBe('Bearer integration-access-token');
  expect(callsTo('/api/projects')).toHaveLength(0);
});

test('dashboard logout keeps its pending UI until the server response completes without aborting the request', async () => {
  let resolveLogout;
  let logoutSignal;
  installDashboardFetch((url, options) => {
    if (pathOf(url) !== '/api/auth/logout') throw new Error(`Unexpected backend request: ${url}`);
    logoutSignal = options.signal;
    return new Promise((resolve) => { resolveLogout = resolve; });
  });
  visit('/dashboard');
  expect(await screen.findByRole('cell', { name: 'Integration product' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^sign out$/i }));

  expect(screen.getByRole('button', { name: /signing out/i })).toBeDisabled();
  expect(screen.getByTestId('app-auth-state')).toHaveTextContent('authenticated');
  expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument();
  expect(callsTo('/api/auth/logout')).toHaveLength(1);
  expect(logoutSignal.aborted).toBe(false);

  await act(async () => { resolveLogout(response(null, 204)); });
  expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  await waitForAuth();
  expect(logoutSignal.aborted).toBe(false);
});

test('an offline logout survives a reload and requires an explicit login before reopening the dashboard', async () => {
  installFetch(true, (url) => {
    if (pathOf(url) === '/api/auth/logout') return Promise.reject(new Error('Offline'));
    throw new Error(`Unexpected backend request: ${url}`);
  });
  const firstVisit = visit('/coming-soon');
  fireEvent.click(await screen.findByRole('button', { name: /sign out/i }));
  expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  expect(sessionStorage.getItem('grupedia:signed-out')).toBe('true');
  firstVisit.unmount();

  visit('/dashboard');
  expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  expect(callsTo('/api/auth/refresh')).toHaveLength(1);
  expect(callsTo('/api/projects')).toHaveLength(0);

  installDashboardFetch();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: USER.email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
  expect(await screen.findByRole('cell', { name: 'Integration product' })).toBeInTheDocument();
  expect(sessionStorage.getItem('grupedia:signed-out')).toBeNull();
  expect(callsTo('/api/auth/login')).toHaveLength(1);
  expect(callsTo('/api/auth/refresh')).toHaveLength(0);
});

test('mobile navigation opens, closes with Escape, and restores keyboard focus', async () => {
  visit('/');
  await waitForAuth();
  const toggle = screen.getByRole('button', { name: /open navigation menu/i });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(document.getElementById('mobile-navigation')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(document.getElementById('mobile-navigation')).not.toBeInTheDocument();
  expect(toggle).toHaveFocus();
});

test('mobile navigation follows a public link and closes the menu', async () => {
  visit('/');
  await waitForAuth();
  fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
  const menu = document.getElementById('mobile-navigation');
  fireEvent.click(within(menu).getByRole('link', { name: 'Pricing' }));
  expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(document.title).toBe('Pricing · Grupedia');
  expect(document.getElementById('mobile-navigation')).not.toBeInTheDocument();
  expect(callsTo('/api/auth/refresh')).toHaveLength(1);
  expect(callsTo('/api/projects')).toHaveLength(0);
});

test('unknown addresses offer a useful way back home', async () => {
  visit('/missing-page');
  await waitForAuth();
  expect(screen.getByText('404 · A small detour')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
});
