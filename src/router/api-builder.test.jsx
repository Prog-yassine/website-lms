import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ApiBuilder from './api-builder';
import { apiRequest } from '../lib/api';

let mockWorkspace;
jest.mock('../components/dashboard/DashboardLayout', () => ({ useWorkspace: () => mockWorkspace, WorkspaceNavigation: () => null }));
jest.mock('../lib/api', () => ({ apiRequest: jest.fn() }));

const columns = [{ name: 'id', type: 'INTEGER', writable: false, primaryKey: true }, { name: 'name', type: 'TEXT', writable: true, required: true }, { name: 'price', type: 'REAL', writable: true, required: true }];
const catalog = {
  tables: [
    { id: 'products', name: 'products', schema: 'main', columns, relationships: [], exampleBody: { name: 'Canvas bag', price: 18 } },
    { id: 'customers', name: 'customers', schema: 'main', columns: [columns[0], columns[1], { name: 'email', type: 'TEXT', writable: true, required: true }], relationships: [], exampleBody: { name: 'Alex', email: 'alex@example.com' } },
    { id: 'orders', name: 'orders', schema: 'main', columns: [columns[0], { name: 'amount', type: 'REAL', writable: true }], relationships: [{ id: 'product', label: 'Product' }, { id: 'customer', label: 'Customer' }], exampleBody: { amount: 36 } },
  ],
  operators: [{ id: 'eq', label: 'equals' }, { id: 'gt', label: 'greater than' }, { id: 'is_null', label: 'is null' }], limits: { maxEndpoints: 25 },
};
const definition = { name: 'Products list', path: '/products', method: 'GET', table: 'products', columns: ['id', 'name', 'price'], filters: [], orderBy: null, limit: 25, access: 'app_user', include: [], defaults: {} };
function endpoint(changes = {}) { return { id: 'endpoint-one', definition, publishedDefinition: null, isPublished: false, hasUnpublishedChanges: true, revision: 1, runtimeUrl: 'https://api.example.test/api/apps/p1/data/products', ...changes }; }
function install(endpoints = [], mutation) {
  apiRequest.mockImplementation((path, options = {}) => {
    if (path.endsWith('/catalog')) return Promise.resolve(catalog);
    if (path.endsWith('/endpoints') && !options.method) return Promise.resolve({ endpoints, limits: { maxEndpoints: 25 } });
    if (mutation) return mutation(path, options);
    throw new Error(`Unexpected request: ${options.method} ${path}`);
  });
}
function page(entry = '/dashboard/api-builder') { return <MemoryRouter initialEntries={[entry]}><div className="db-shell"><ApiBuilder /></div></MemoryRouter>; }
function mutateCalls() { return apiRequest.mock.calls.filter(([, options]) => options?.method); }
async function createTemplate(name = 'List products') {
  const buttons = await screen.findAllByRole('button', { name: 'New endpoint' });
  fireEvent.click(buttons[0]);
  fireEvent.click(within(screen.getByRole('dialog', { name: 'New endpoint' })).getByRole('button', { name: new RegExp(name) }));
  return screen.findByLabelText('Endpoint name');
}
beforeEach(() => {
  apiRequest.mockReset();
  mockWorkspace = { projectId: 'p1', project: { id: 'p1', name: 'Shop project' }, projectsLoading: false, projectsError: '', retryProjects: jest.fn(), sidebarOpen: false, closeSidebar: jest.fn() };
});
afterEach(cleanup);

test('new drafts stay private and Publish saves the actual definition before using its revision', async () => {
  install([], (path, options) => {
    if (path.endsWith('/endpoints') && options.method === 'POST') return Promise.resolve({ endpoint: endpoint({ definition: options.body.definition, revision: 1 }) });
    if (path.endsWith('/publish')) return Promise.resolve({ endpoint: endpoint({ revision: 2, isPublished: true, hasUnpublishedChanges: false, publishedDefinition: definition }) });
    throw new Error('Unexpected mutation');
  });
  render(page());
  expect(await screen.findByRole('heading', { name: 'Build your first endpoint' })).toBeInTheDocument();
  await createTemplate();
  fireEvent.change(screen.getByLabelText('Endpoint name'), { target: { value: 'Featured products' } });
  expect(mutateCalls()).toHaveLength(0);
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
  await screen.findByText('Endpoint published. The runtime now uses this saved definition.');
  const mutations = mutateCalls();
  expect(mutations).toHaveLength(2);
  expect(mutations[0][0]).toBe('/api/projects/p1/api-builder/endpoints');
  expect(mutations[0][1].body.definition.name).toBe('Featured products');
  expect(mutations[0][1].body.definition.access).toBe('app_user');
  expect(mutations[1][0]).toBe('/api/projects/p1/api-builder/endpoints/endpoint-one/publish');
  expect(mutations[1][1].body).toEqual({ revision: 1 });
});

test('the editable definition is real configuration and malformed JSON cannot be saved or previewed', async () => {
  install([endpoint()], (path, options) => Promise.resolve({ endpoint: endpoint({ definition: options.body.definition, revision: 2 }) }));
  render(page());
  await screen.findByLabelText('Endpoint name');
  fireEvent.click(screen.getByRole('tab', { name: 'Code' }));
  const editor = screen.getByLabelText('Endpoint definition (JSON)');
  fireEvent.change(editor, { target: { value: '{ invalid' } });
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  fireEvent.click(screen.getByRole('tab', { name: 'Test' }));
  expect(screen.getByRole('button', { name: 'Run request' })).toBeDisabled();
  fireEvent.click(screen.getByRole('tab', { name: 'Code' }));
  const edited = { ...definition, name: 'Affordable products', path: '/affordable', filters: [{ column: 'price', operator: 'gt', source: 'literal', value: 10 }] };
  fireEvent.change(screen.getByLabelText('Endpoint definition (JSON)'), { target: { value: JSON.stringify(edited) } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply JSON' }));
  expect(screen.getByLabelText('Endpoint name')).toHaveValue('Affordable products');
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByText(/Draft saved/);
  expect(mutateCalls()[0][1].body).toEqual({ definition: edited, revision: 1 });
});

test('query filter edits remove literal keys and GET preview returns the real response and read-only SQL', async () => {
  install([endpoint()], (path, options) => {
    if (path.endsWith('/test')) return Promise.resolve({ status: 200, body: { data: [{ id: 1, name: 'Canvas bag' }] }, durationMs: 3.4, sql: 'SELECT id, name FROM products WHERE project_id = ? AND price > ?', parameters: ['p1', 10] });
    throw new Error('Unexpected mutation');
  });
  render(page());
  await screen.findByLabelText('Endpoint name');
  fireEvent.click(screen.getByRole('button', { name: 'Add filter' }));
  fireEvent.change(screen.getByLabelText('Filter 1 source'), { target: { value: 'query' } });
  fireEvent.change(screen.getByLabelText('Filter 1 column'), { target: { value: 'price' } });
  fireEvent.change(screen.getByLabelText('Filter 1 operator'), { target: { value: 'gt' } });
  fireEvent.change(screen.getByLabelText('Filter 1 parameter'), { target: { value: 'minimum' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Test' }));
  fireEvent.change(screen.getByLabelText('Query parameters (JSON)'), { target: { value: '{"minimum":10}' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run request' }));
  expect(await screen.findByText('HTTP 200')).toBeInTheDocument();
  const call = mutateCalls()[0];
  expect(call[0]).toBe('/api/projects/p1/api-builder/test');
  expect(call[1].body.definition.filters).toEqual([{ column: 'price', operator: 'gt', source: 'query', parameter: 'minimum', required: true }]);
  expect(call[1].body.params).toEqual({ minimum: 10 });
  expect(screen.getByLabelText('SQL preview')).toHaveTextContent('SELECT id, name FROM products');
  expect(screen.queryByRole('button', { name: /execute.*sql/i })).not.toBeInTheDocument();
});

test('write preview requires explicit confirmation naming the project and method before changing real rows', async () => {
  install([], (path, options) => {
    if (path.endsWith('/test')) return Promise.resolve({ status: 201, body: { data: [{ id: 5, name: 'Alex' }] }, durationMs: 2, sql: 'INSERT INTO customers', parameters: [] });
    throw new Error('Unexpected mutation');
  });
  render(page());
  await screen.findByRole('heading', { name: 'Build your first endpoint' });
  await createTemplate('Create customer');
  expect(screen.getByLabelText('Access')).toHaveValue('developer');
  fireEvent.click(screen.getByRole('tab', { name: 'Test' }));
  fireEvent.click(screen.getByRole('button', { name: 'Run request' }));
  const dialog = screen.getByRole('dialog', { name: 'Run a real data change?' });
  expect(dialog).toHaveTextContent('POST');
  expect(dialog).toHaveTextContent('Shop project');
  expect(dialog).toHaveTextContent('customers');
  expect(mutateCalls()).toHaveLength(0);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(mutateCalls()).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Run request' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Run POST request' }));
  await screen.findByText('HTTP 201');
  expect(mutateCalls()).toHaveLength(1);
  expect(mutateCalls()[0][1].body.body).toEqual({ name: 'Alex', email: 'alex@example.com' });
});

test('PATCH requires a single row ID and method changes reset unsupported relationship/filter configuration', async () => {
  const withJoins = { ...definition, table: 'orders', columns: ['id', 'amount'], include: ['product', 'customer'], filters: [{ column: 'amount', operator: 'gt', source: 'literal', value: 1 }] };
  install([endpoint({ definition: withJoins })]);
  render(page());
  await screen.findByLabelText('HTTP method');
  fireEvent.change(screen.getByLabelText('HTTP method'), { target: { value: 'POST' } });
  expect(screen.queryByRole('button', { name: 'Add filter' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Code' }));
  const post = JSON.parse(screen.getByLabelText('Endpoint definition (JSON)').value);
  expect(post.include).toEqual([]); expect(post.filters).toEqual([]); expect(post.access).toBe('developer');
  fireEvent.click(screen.getByRole('tab', { name: 'Builder' }));
  fireEvent.change(screen.getByLabelText('HTTP method'), { target: { value: 'PATCH' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Test' }));
  fireEvent.click(screen.getByRole('button', { name: 'Run request' }));
  expect(await screen.findByText('Enter the positive whole-number row ID to change.')).toBeInTheDocument();
  expect(mutateCalls()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Row ID'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run request' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('#12');
});

test('revision conflicts preserve edits and require an explicit reload before replacing them', async () => {
  let latest = false;
  apiRequest.mockImplementation((path, options = {}) => {
    if (path.endsWith('/catalog')) return Promise.resolve(catalog);
    if (path.endsWith('/endpoints') && !options.method) return Promise.resolve({ endpoints: [endpoint({ revision: latest ? 3 : 1, definition: latest ? { ...definition, name: 'Server version' } : definition })] });
    const failure = new Error('This endpoint changed. Reload it before saving'); failure.status = 409; return Promise.reject(failure);
  });
  render(page());
  fireEvent.change(await screen.findByLabelText('Endpoint name'), { target: { value: 'My local edits' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByText('This endpoint changed. Reload it before saving');
  expect(screen.getByLabelText('Endpoint name')).toHaveValue('My local edits');
  expect(mutateCalls()[0][1].body.revision).toBe(1);
  latest = true;
  fireEvent.click(screen.getByRole('button', { name: 'Reload latest version' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reload latest version' }));
  await waitFor(() => expect(screen.getByLabelText('Endpoint name')).toHaveValue('Server version'));
});

test('table-editor deep links seed an unsaved catalog-approved draft without overwriting existing endpoints', async () => {
  install([endpoint()]);
  render(page('/dashboard/api-builder?table=customers'));
  expect(await screen.findByLabelText('Source table')).toHaveValue('customers');
  expect(screen.getByLabelText('HTTP method')).toHaveValue('GET');
  expect(screen.getByText('Local draft · not saved')).toBeInTheDocument();
  expect(mutateCalls()).toHaveLength(0);
  cleanup();
  render(page('/dashboard/api-builder?table=auth.users'));
  expect(await screen.findByLabelText('Source table')).toHaveValue('products');
  expect(screen.getByText('Revision 1')).toBeInTheDocument();
});

test('switching projects aborts pending loads and prevents late endpoint data from crossing workspaces', async () => {
  let release;
  let oldSignal;
  apiRequest.mockImplementation((path, options = {}) => {
    if (path.endsWith('/catalog')) return Promise.resolve(catalog);
    if (path.includes('/p1/')) { oldSignal = options.signal; return new Promise((resolve) => { release = resolve; }); }
    return Promise.resolve({ endpoints: [] });
  });
  const view = render(page());
  await waitFor(() => expect(release).toBeDefined());
  mockWorkspace = { ...mockWorkspace, projectId: 'p2', project: { id: 'p2', name: 'Second project' } };
  view.rerender(page());
  await screen.findByRole('heading', { name: 'Build your first endpoint' });
  expect(oldSignal.aborted).toBe(true);
  await act(async () => { release({ endpoints: [endpoint({ definition: { ...definition, name: 'Private first project' } })] }); });
  expect(screen.queryByText('Private first project')).not.toBeInTheDocument();
});

test('published runtime examples keep their snapshot method, path, and permissions while the draft changes', async () => {
  const published = { ...definition, access: 'public' };
  install([endpoint({ definition: published, publishedDefinition: published, isPublished: true, hasUnpublishedChanges: false })]);
  render(page());
  await screen.findByLabelText('HTTP method');
  fireEvent.change(screen.getByLabelText('HTTP method'), { target: { value: 'PATCH' } });
  fireEvent.change(screen.getByLabelText('Route path'), { target: { value: '/changed-draft' } });
  expect(screen.getByLabelText('Access')).toHaveValue('developer');
  fireEvent.click(screen.getByRole('tab', { name: 'Code' }));
  const code = screen.getByLabelText('JavaScript request example');
  expect(code).toHaveTextContent("method: 'GET'");
  expect(code).toHaveTextContent('https://api.example.test/api/apps/p1/data/products');
  expect(code).not.toHaveTextContent('/changed-draft');
  expect(code).not.toHaveTextContent('Authorization:');
  expect(code).not.toHaveTextContent('GRUPEDIA_DEVELOPER_TOKEN');
  expect(screen.getByText(/These examples use the last published method/)).toBeInTheDocument();
  expect(screen.getByText('This public GET endpoint does not require an authentication token.')).toBeInTheDocument();
  expect(mutateCalls()).toHaveLength(0);
});

test('changing the source table resets the test request body and row selection to that table', async () => {
  install([endpoint({ definition: { ...definition, method: 'PATCH', access: 'developer' } })]);
  render(page());
  await screen.findByLabelText('Source table');
  fireEvent.click(screen.getByRole('tab', { name: 'Test' }));
  fireEvent.change(screen.getByLabelText('Row ID'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('Request body (JSON)'), { target: { value: '{"price":99}' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Builder' }));
  fireEvent.change(screen.getByLabelText('Source table'), { target: { value: 'customers' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Test' }));
  expect(screen.getByLabelText('Row ID')).toHaveValue(null);
  expect(JSON.parse(screen.getByLabelText('Request body (JSON)').value)).toEqual(catalog.tables[1].exampleBody);
});
