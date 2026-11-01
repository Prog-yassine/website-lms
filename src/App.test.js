import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';

function visit(path) {
  return render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn(() => Promise.reject(new Error('Unexpected backend request')));
});
afterEach(() => jest.restoreAllMocks());

test.each([
  '/dashboard/org',
  '/dashboard/org/new',
  '/dashboard/org/old-organization',
  '/dashboard/org/old-organization/division/new',
  '/dashboard/division/old-project/database',
  '/dashboard/division/old-project/auth/users',
  '/dashboard/division/old-project/setting/compute',
])('old workspace URL %s goes to Coming soon without calling the backend', async (path) => {
  visit(path);
  expect(await screen.findByRole('heading', { name: /coming soon/i })).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('signing out of the placeholder removes the session and returns to sign in', async () => {
  localStorage.setItem('token', 'existing-session');
  visit('/coming-soon');
  fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
  expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('mobile navigation opens, closes with Escape, and restores keyboard focus', () => {
  visit('/');
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
  fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
  const menu = document.getElementById('mobile-navigation');
  fireEvent.click(within(menu).getByRole('link', { name: 'Pricing' }));
  expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(document.title).toBe('Pricing · Grupedia');
  expect(document.getElementById('mobile-navigation')).not.toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('unknown addresses offer a useful way back home', () => {
  visit('/missing-page');
  expect(screen.getByText('404 · A small detour')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
});
