import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Storage from './storage';
import { apiRequest } from '../lib/api';

let mockWorkspace;
jest.mock('../components/dashboard/DashboardLayout', () => ({
  useWorkspace: () => mockWorkspace,
  WorkspaceNavigation: () => <nav aria-label="Workspace sections" />,
}));
jest.mock('../lib/api', () => ({ apiRequest: jest.fn() }));

const bucket = { id: 'bucket-a', name: 'project-assets', createdAt: '2026-11-04T12:00:00Z', fileCount: 0, totalBytes: 0 };
const file = { id: 'object-a', name: 'lesson.txt', size: 11, contentType: 'text/plain', createdAt: '2026-11-04T12:00:00Z' };
const usage = { totalBytes: 0, maxTotalBytes: 25 * 1024 * 1024 };
const limits = { maxFileBytes: 5 * 1024 * 1024, maxBuckets: 5, maxFilesPerBucket: 50 };
const bucketsResponse = (buckets = [bucket], options = {}) => ({ buckets, configured: true, usage, limits, provider: 'Cloudflare R2', ...options });
const objectsResponse = (objects = [], selectedBucket = bucket) => ({ bucket: { ...selectedBucket, fileCount: objects.length }, objects, configured: true, usage, limits });
const bucketPath = '/api/projects/project-a/storage/buckets';

beforeEach(() => {
  mockWorkspace = { projectId: 'project-a', project: { id: 'project-a', name: 'My project' }, projectsLoading: false, projectsError: '', retryProjects: jest.fn(), sidebarOpen: false, closeSidebar: jest.fn() };
  apiRequest.mockReset();
  apiRequest.mockImplementation((path) => {
    if (path === bucketPath) return Promise.resolve(bucketsResponse());
    if (path.includes('/objects?')) return Promise.resolve(objectsResponse());
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); });

async function waitForEmptyBucket() {
  expect(await screen.findByRole('heading', { name: 'This bucket is ready for its first file' })).toBeInTheDocument();
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('starts with real empty storage and creates a private bucket only after valid input', async () => {
  let created = false;
  apiRequest.mockImplementation((path, options = {}) => {
    if (path === bucketPath && options.method === 'POST') { created = true; return Promise.resolve({ bucket }); }
    if (path === bucketPath) return Promise.resolve(bucketsResponse(created ? [bucket] : []));
    if (path.includes('/objects?')) return Promise.resolve(objectsResponse());
    return Promise.reject(new Error('Unexpected request'));
  });
  render(<Storage />);
  expect(await screen.findByRole('heading', { name: 'A home for your project’s files' })).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('complementary', { name: 'Storage navigation' })).getByRole('button', { name: 'New bucket' }));
  const dialog = screen.getByRole('dialog', { name: 'Create a private bucket' });
  fireEvent.change(within(dialog).getByLabelText('Bucket name'), { target: { value: 'Bad Name' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create bucket' }));
  expect(within(dialog).getByRole('alert')).toHaveTextContent('lowercase letters');
  expect(apiRequest.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(0);
  fireEvent.change(within(dialog).getByLabelText('Bucket name'), { target: { value: 'project-assets' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create bucket' }));
  await waitForEmptyBucket();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(apiRequest).toHaveBeenCalledWith(bucketPath, expect.objectContaining({ method: 'POST', body: { name: 'project-assets' }, signal: expect.any(AbortSignal) }));
  expect(screen.getByText('Private bucket “project-assets” created.')).toBeInTheDocument();
});

test('uploads the original File body and reports server-confirmed completion', async () => {
  let uploaded = false;
  apiRequest.mockImplementation((path, options = {}) => {
    if (path === bucketPath) return Promise.resolve(bucketsResponse([{ ...bucket, fileCount: uploaded ? 1 : 0 }]));
    if (path.includes('/objects?') && options.method === 'POST') { uploaded = true; return Promise.resolve({ object: file }); }
    if (path.includes('/objects?')) return Promise.resolve(objectsResponse(uploaded ? [file] : []));
    return Promise.reject(new Error('Unexpected request'));
  });
  render(<Storage />);
  await waitForEmptyBucket();
  const rawFile = new File(['hello world'], 'lesson.txt', { type: 'text/plain' });
  fireEvent.change(screen.getByLabelText('Choose files to upload'), { target: { files: [rawFile] } });
  expect(await screen.findByRole('button', { name: 'Download lesson.txt' })).toBeInTheDocument();
  const [, request] = apiRequest.mock.calls.find(([, options]) => options.method === 'POST');
  expect(request.rawBody).toBe(true);
  expect(request.body).toBe(rawFile);
  expect(request.headers['Content-Type']).toBe('text/plain');
  expect(screen.getByText('1 file uploaded.')).toBeInTheDocument();
  expect(screen.getByText('Uploaded', { selector: 'small' })).toBeInTheDocument();
});

test('rejects an oversized file before sending its body to the server', async () => {
  render(<Storage />);
  await waitForEmptyBucket();
  const large = new File(['large'], 'large.bin');
  Object.defineProperty(large, 'size', { value: limits.maxFileBytes + 1 });
  fireEvent.change(screen.getByLabelText('Choose files to upload'), { target: { files: [large] } });
  expect(await screen.findByText('Exceeds the 5 MB file limit.')).toBeInTheDocument();
  expect(apiRequest.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(0);
  expect(screen.getByRole('alert')).toHaveTextContent('1 file could not be uploaded');
});

test('file deletion requires confirmation and preserves the file after a server rejection', async () => {
  apiRequest.mockImplementation((path, options = {}) => {
    if (options.method === 'DELETE') return Promise.reject(new Error('You no longer have access to this project.'));
    if (path === bucketPath) return Promise.resolve(bucketsResponse([{ ...bucket, fileCount: 1 }]));
    if (path.includes('/objects?')) return Promise.resolve(objectsResponse([file]));
    return Promise.reject(new Error('Unexpected request'));
  });
  render(<Storage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete lesson.txt' }));
  expect(apiRequest.mock.calls.filter(([, options]) => options.method === 'DELETE')).toHaveLength(0);
  const dialog = screen.getByRole('dialog', { name: 'Delete this file?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete file' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('no longer have access');
  expect(screen.getByRole('button', { name: 'Download lesson.txt' })).toBeInTheDocument();
  expect(apiRequest).toHaveBeenCalledWith(`${bucketPath}/bucket-a/objects/object-a`, expect.objectContaining({ method: 'DELETE' }));
});

test('downloads files as protected blobs instead of displaying executable file content', async () => {
  const blob = new Blob(['<html>untrusted content</html>'], { type: 'text/html' });
  const htmlFile = { ...file, name: 'page.html', contentType: 'text/html' };
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn().mockReturnValue('blob:private-download');
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function clickDownload() { expect(this.download).toBe('page.html'); });
  apiRequest.mockImplementation((path, options = {}) => {
    if (path.endsWith('/content')) return Promise.resolve(blob);
    if (path === bucketPath) return Promise.resolve(bucketsResponse([{ ...bucket, fileCount: 1 }]));
    if (path.includes('/objects?')) return Promise.resolve(objectsResponse([htmlFile]));
    return Promise.reject(new Error('Unexpected request'));
  });
  const { unmount } = render(<Storage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Download page.html' }));
  await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
  expect(apiRequest).toHaveBeenCalledWith(`${bucketPath}/bucket-a/objects/object-a/content`, expect.objectContaining({ responseType: 'blob' }));
  expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-download');
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

test('project changes abort pending requests and never display the previous project’s buckets', async () => {
  const old = deferred();
  let oldSignal;
  apiRequest.mockImplementation((path, options = {}) => {
    if (path === bucketPath) { oldSignal = options.signal; return old.promise; }
    if (path === '/api/projects/project-b/storage/buckets') return Promise.resolve(bucketsResponse([]));
    return Promise.reject(new Error('Unexpected request'));
  });
  const { rerender } = render(<Storage />);
  await waitFor(() => expect(oldSignal).toBeDefined());
  mockWorkspace = { ...mockWorkspace, projectId: 'project-b', project: { id: 'project-b', name: 'Second project' } };
  rerender(<Storage />);
  expect(await screen.findByRole('heading', { name: 'A home for your project’s files' })).toBeInTheDocument();
  expect(oldSignal.aborted).toBe(true);
  await act(async () => { old.resolve(bucketsResponse([{ ...bucket, name: 'private-old-project' }])); });
  expect(screen.queryByText('private-old-project')).not.toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('switching buckets ignores a late file response from the previous bucket', async () => {
  const old = deferred();
  const secondBucket = { ...bucket, id: 'bucket-b', name: 'other-assets', fileCount: 1 };
  const secondFile = { ...file, id: 'object-b', name: 'second.txt' };
  let oldSignal;
  apiRequest.mockImplementation((path, options = {}) => {
    if (path === bucketPath) return Promise.resolve(bucketsResponse([bucket, secondBucket]));
    if (path.includes('/bucket-a/objects?')) { oldSignal = options.signal; return old.promise; }
    if (path.includes('/bucket-b/objects?')) return Promise.resolve(objectsResponse([secondFile], secondBucket));
    return Promise.reject(new Error('Unexpected request'));
  });
  render(<Storage />);
  await waitFor(() => expect(oldSignal).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: /other-assets/ }));
  expect(await screen.findByRole('button', { name: 'Download second.txt' })).toBeInTheDocument();
  expect(oldSignal.aborted).toBe(true);
  await act(async () => { old.resolve(objectsResponse([file])); });
  expect(screen.queryByRole('button', { name: 'Download lesson.txt' })).not.toBeInTheDocument();
});

test('unconfigured storage never enables mutation buttons or shows pretend seed files', async () => {
  apiRequest.mockResolvedValue(bucketsResponse([], { configured: false }));
  render(<Storage />);
  expect(await screen.findByRole('heading', { name: 'Storage is not available yet' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'New bucket' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Upload files' })).toBeDisabled();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
});
