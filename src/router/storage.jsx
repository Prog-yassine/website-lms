import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LuArchive, LuCheck, LuDownload, LuFile, LuFileImage, LuFileText,
  LuFolderOpen, LuHardDrive, LuLoaderCircle, LuLockKeyhole,
  LuPlus, LuRefreshCw, LuSearch, LuTrash2, LuTriangleAlert, LuUpload, LuX,
} from 'react-icons/lu';
import { useWorkspace, WorkspaceNavigation } from '../components/dashboard/DashboardLayout';
import { apiRequest } from '../lib/api';
import './storage.css';

const DEFAULT_LIMITS = { maxFileBytes: 5 * 1024 * 1024, maxBuckets: 5, maxFilesPerBucket: 50 };
const DEFAULT_USAGE = { totalBytes: 0, maxTotalBytes: 25 * 1024 * 1024 };
const BUCKET_NAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function formatStorageBytes(bytes = 0) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value % 1024 === 0 ? 0 : 1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(value % (1024 * 1024) === 0 ? 0 : 1)} MB`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function invalidFilename(name) {
  return !name || name.length > 120 || ['.', '..'].includes(name) || /[/\\]/.test(name) ||
    Array.from(name).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}

function Message({ kind, title, children, onRetry, action }) {
  const Icon = kind === 'loading' ? LuLoaderCircle : kind === 'error' ? LuTriangleAlert : LuFolderOpen;
  return <div className={`db-editor-message storage-message${kind ? ` db-message-${kind}` : ''}`} role={kind === 'error' ? 'alert' : 'status'}>
    <span className="db-message-icon"><Icon aria-hidden="true" /></span>
    <h2>{title}</h2>{children && <p>{children}</p>}
    {onRetry && <button type="button" className="db-button" onClick={onRetry}><LuRefreshCw aria-hidden="true" /> Try again</button>}
    {action}
  </div>;
}

function Modal({ title, children, onClose, busy, icon: Icon = LuArchive }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previouslyFocused = document.activeElement;
    if (typeof element.showModal === 'function') element.showModal();
    else element.setAttribute('open', '');
    return () => {
      if (typeof element.close === 'function' && element.open) element.close();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);
  return <dialog ref={dialog} className="db-api-dialog storage-dialog" aria-labelledby="storage-dialog-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="db-dialog-body">
      <div className="db-dialog-heading"><span className="db-dialog-icon"><Icon aria-hidden="true" /></span><button type="button" className="db-icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><LuX aria-hidden="true" /></button></div>
      <h2 id="storage-dialog-title">{title}</h2>{children}
    </div>
  </dialog>;
}

function FileIcon({ contentType }) {
  const Icon = contentType?.startsWith('image/') ? LuFileImage : contentType?.startsWith('text/') ? LuFileText : LuFile;
  return <span className="storage-file-icon"><Icon aria-hidden="true" /></span>;
}

/** A keyed instance prevents project A's pending responses from entering project B. */
function ProjectStorage({ workspace }) {
  const { projectId, project, projectsLoading, projectsError, retryProjects, sidebarOpen, closeSidebar } = workspace;
  const [buckets, setBuckets] = useState([]);
  const [bucketId, setBucketId] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [bucketsLoading, setBucketsLoading] = useState(Boolean(projectId));
  const [bucketsError, setBucketsError] = useState('');
  const [bucketsRevision, setBucketsRevision] = useState(0);
  const [objects, setObjects] = useState(null);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [objectsError, setObjectsError] = useState('');
  const [objectsRevision, setObjectsRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [operation, setOperation] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [bucketName, setBucketName] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [uploads, setUploads] = useState([]);
  const input = useRef(null);
  const controllers = useRef(new Set());
  const downloads = useRef(new Set());
  const mounted = useRef(true);
  const operationLock = useRef(false);
  const base = `/api/projects/${encodeURIComponent(projectId)}/storage`;
  const bucket = buckets.find((item) => String(item.id) === bucketId);
  const limits = { ...DEFAULT_LIMITS, ...metadata?.limits };
  const usage = { ...DEFAULT_USAGE, ...metadata?.usage };
  const configured = metadata?.configured === true;
  const busy = Boolean(operation);
  const quotaFull = usage.totalBytes >= usage.maxTotalBytes;
  const bucketFull = Number(bucket?.fileCount || 0) >= limits.maxFilesPerBucket;
  const canUpload = Boolean(bucket && configured && !busy && !bucketsLoading && !bucketsError && !quotaFull && !bucketFull);

  useEffect(() => {
    mounted.current = true;
    const pendingControllers = controllers.current;
    const pendingDownloads = downloads.current;
    return () => {
      mounted.current = false;
      pendingControllers.forEach((controller) => controller.abort());
      pendingDownloads.forEach((url) => URL.revokeObjectURL(url));
      pendingControllers.clear();
      pendingDownloads.clear();
    };
  }, []);

  const request = useCallback(async (path, options = {}, controller = new AbortController()) => {
    if (!mounted.current) throw new DOMException('The workspace changed.', 'AbortError');
    controllers.current.add(controller);
    try { return await apiRequest(path, { ...options, signal: controller.signal }); }
    finally { controllers.current.delete(controller); }
  }, []);

  useEffect(() => {
    if (!projectId || projectsLoading || projectsError) return undefined;
    const controller = new AbortController();
    setBucketsLoading(true);
    setBucketsError('');
    request(`${base}/buckets`, {}, controller)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data?.buckets)) throw new Error('The bucket list could not be read. Please try again.');
        setBuckets(data.buckets);
        setMetadata(data);
        setBucketId((current) => data.buckets.some((item) => String(item.id) === current) ? current : String(data.buckets[0]?.id || ''));
      })
      .catch((error) => { if (!controller.signal.aborted && mounted.current) setBucketsError(error.message || 'Could not load storage.'); })
      .finally(() => { if (!controller.signal.aborted && mounted.current) setBucketsLoading(false); });
    return () => controller.abort();
  }, [base, projectId, projectsLoading, projectsError, bucketsRevision, request]);

  useEffect(() => {
    if (filter === search.trim()) return undefined;
    const timer = window.setTimeout(() => setFilter(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search, filter]);

  useEffect(() => {
    if (!bucketId) { setObjects(null); setObjectsLoading(false); return undefined; }
    const controller = new AbortController();
    setObjectsLoading(true);
    setObjectsError('');
    setObjects(null);
    const query = new URLSearchParams({ search: filter });
    request(`${base}/buckets/${encodeURIComponent(bucketId)}/objects?${query}`, {}, controller)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data?.objects)) throw new Error('The file list could not be read. Please try again.');
        setObjects(data.objects);
        setMetadata((current) => ({ ...current, usage: data.usage || current?.usage, limits: data.limits || current?.limits, configured: data.configured ?? current?.configured }));
        if (data.bucket) setBuckets((current) => current.map((item) => String(item.id) === bucketId ? data.bucket : item));
      })
      .catch((error) => { if (!controller.signal.aborted && mounted.current) setObjectsError(error.message || 'Could not load these files.'); })
      .finally(() => { if (!controller.signal.aborted && mounted.current) setObjectsLoading(false); });
    return () => controller.abort();
  }, [base, bucketId, filter, objectsRevision, request]);

  function refresh() {
    setBucketsRevision((current) => current + 1);
    setObjectsRevision((current) => current + 1);
  }

  function chooseBucket(id) {
    if (operationLock.current) return;
    if (id !== bucketId) {
      setObjects(null);
      setObjectsError('');
      setBucketId(id);
      setSearch('');
      setFilter('');
      setUploads([]);
      setNotice(null);
    }
    closeSidebar();
  }

  function openCreate() {
    setDialogError('');
    setBucketName('');
    setDialog({ kind: 'create' });
  }

  function openDelete(kind, item) {
    setDialogError('');
    setDialog({ kind, item });
  }

  async function createBucket(event) {
    event.preventDefault();
    if (operationLock.current) return;
    const name = bucketName.trim();
    if (!BUCKET_NAME.test(name)) {
      setDialogError('Use 1–63 lowercase letters, numbers, or hyphens. Start and end with a letter or number.');
      return;
    }
    operationLock.current = true;
    setOperation({ type: 'create' });
    setDialogError('');
    try {
      const data = await request(`${base}/buckets`, { method: 'POST', body: { name } });
      if (!mounted.current) return;
      if (!data?.bucket?.id) throw new Error('The server did not return the new bucket. Refresh storage to check its status.');
      setBuckets((current) => [...current.filter((item) => String(item.id) !== String(data.bucket.id)), data.bucket]);
      setObjects(null);
      setBucketId(String(data.bucket.id));
      setSearch('');
      setFilter('');
      setDialog(null);
      setNotice({ kind: 'success', text: `Private bucket “${name}” created.` });
      closeSidebar();
      refresh();
    } catch (error) {
      if (mounted.current && error.name !== 'AbortError') setDialogError(error.message || 'Could not create the bucket.');
    } finally {
      if (mounted.current) { operationLock.current = false; setOperation(null); }
    }
  }

  async function confirmDelete() {
    if (!dialog || operationLock.current) return;
    const { kind, item } = dialog;
    operationLock.current = true;
    setOperation({ type: 'delete', id: item.id });
    setDialogError('');
    try {
      const path = kind === 'delete-bucket' ? `${base}/buckets/${encodeURIComponent(item.id)}` : `${base}/buckets/${encodeURIComponent(bucketId)}/objects/${encodeURIComponent(item.id)}`;
      await request(path, { method: 'DELETE' });
      if (!mounted.current) return;
      if (kind === 'delete-bucket') {
        setBuckets((current) => current.filter((entry) => String(entry.id) !== String(item.id)));
        setBucketId('');
        setObjects(null);
      } else setObjects((current) => current?.filter((entry) => String(entry.id) !== String(item.id)) || []);
      setDialog(null);
      setNotice({ kind: 'success', text: `${kind === 'delete-bucket' ? 'Bucket' : 'File'} “${item.name}” deleted.` });
      refresh();
    } catch (error) {
      if (mounted.current && error.name !== 'AbortError') setDialogError(error.message || 'Could not delete this item.');
    } finally {
      if (mounted.current) { operationLock.current = false; setOperation(null); }
    }
  }

  async function uploadFiles(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length || !canUpload || operationLock.current) return;
    const remaining = Math.max(0, limits.maxFilesPerBucket - Number(bucket.fileCount || 0));
    const jobs = selected.map((file, index) => ({
      id: index, name: file.name,
      status: file.size > limits.maxFileBytes || index >= remaining || invalidFilename(file.name) ? 'error' : 'pending',
      error: file.size > limits.maxFileBytes ? `Exceeds the ${formatStorageBytes(limits.maxFileBytes)} file limit.` : index >= remaining ? 'This bucket has no remaining file slots.' : invalidFilename(file.name) ? 'Use a filename of 1–120 characters without slashes or control characters.' : '',
    }));
    operationLock.current = true;
    setOperation({ type: 'upload' });
    setUploads(jobs);
    setNotice(null);
    let successful = 0;
    let failed = jobs.filter((job) => job.status === 'error').length;
    try {
      for (const job of jobs) {
        if (!mounted.current) return;
        if (job.status === 'error') continue;
        const file = selected[job.id];
        setUploads((current) => current.map((item) => item.id === job.id ? { ...item, status: 'uploading' } : item));
        try {
          const query = new URLSearchParams({ filename: file.name });
          await request(`${base}/buckets/${encodeURIComponent(bucketId)}/objects?${query}`, {
            method: 'POST', rawBody: true, body: file,
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
          });
          if (!mounted.current) return;
          successful += 1;
          setUploads((current) => current.map((item) => item.id === job.id ? { ...item, status: 'done' } : item));
        } catch (error) {
          if (error.name === 'AbortError' || !mounted.current) return;
          failed += 1;
          setUploads((current) => current.map((item) => item.id === job.id ? { ...item, status: 'error', error: error.message || 'Upload failed. Please try again.' } : item));
        }
      }
      if (!mounted.current) return;
      setNotice({ kind: failed ? 'error' : 'success', text: `${successful} ${successful === 1 ? 'file' : 'files'} uploaded.${failed ? ` ${failed} ${failed === 1 ? 'file could' : 'files could'} not be uploaded. See details below.` : ''}` });
      refresh();
    } finally {
      if (mounted.current) { operationLock.current = false; setOperation(null); }
    }
  }

  async function downloadFile(file) {
    if (operationLock.current) return;
    operationLock.current = true;
    setOperation({ type: 'download', id: file.id });
    setNotice(null);
    try {
      const blob = await request(`${base}/buckets/${encodeURIComponent(bucketId)}/objects/${encodeURIComponent(file.id)}/content`, { responseType: 'blob' });
      if (!mounted.current) return;
      const url = URL.createObjectURL(blob);
      downloads.current.add(url);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => { if (downloads.current.delete(url)) URL.revokeObjectURL(url); }, 1000);
      setNotice({ kind: 'success', text: `Download started for “${file.name}”.` });
    } catch (error) {
      if (mounted.current && error.name !== 'AbortError') setNotice({ kind: 'error', text: error.message || 'Could not download this file.' });
    } finally {
      if (mounted.current) { operationLock.current = false; setOperation(null); }
    }
  }

  const createButton = <button type="button" className="db-button db-button-primary" onClick={openCreate} disabled={!configured || busy || bucketsLoading || Boolean(bucketsError) || buckets.length >= limits.maxBuckets}><LuPlus aria-hidden="true" /> New bucket</button>;
  let content;
  if (projectsLoading) content = <Message kind="loading" title="Opening your workspace">Loading your projects…</Message>;
  else if (projectsError) content = <Message kind="error" title="Your workspace couldn’t be loaded" onRetry={retryProjects}>{projectsError}</Message>;
  else if (!projectId || !project) content = <Message title="No project selected">Choose a project to manage its private files.</Message>;
  else if (bucketsLoading) content = <Message kind="loading" title="Opening storage">Loading your private buckets…</Message>;
  else if (bucketsError) content = <Message kind="error" title="Storage couldn’t be loaded" onRetry={refresh}>{bucketsError}</Message>;
  else if (!configured) content = <Message title="Storage is not available yet">Your project administrator can enable private file storage for this workspace. Refresh this page after it has been enabled.</Message>;
  else if (!bucket) content = <Message title="A home for your project’s files" action={createButton}>Create your first private bucket to organize uploads. Files are accessible only through your signed-in workspace.</Message>;
  else if (objectsLoading) content = <Message kind="loading" title="Loading your files">Reading {bucket.name}…</Message>;
  else if (objectsError) content = <Message kind="error" title="These files couldn’t be loaded" onRetry={() => setObjectsRevision((current) => current + 1)}>{objectsError}</Message>;
  else if (!objects?.length) content = <Message title={filter ? 'No matching files' : 'This bucket is ready for its first file'} action={!filter ? <button type="button" className="db-button db-button-primary" onClick={() => input.current?.click()} disabled={!canUpload}><LuUpload aria-hidden="true" /> Upload files</button> : undefined}>{filter ? 'Try another filename or clear the search.' : `Upload a document, image, or other file. Each file can be up to ${formatStorageBytes(limits.maxFileBytes)}.`}</Message>;
  else content = <table className="storage-file-table">
    <caption className="sr-only">Files in the private bucket {bucket.name}</caption>
    <thead><tr><th scope="col">Name</th><th scope="col">Size</th><th scope="col" className="storage-file-type">Type</th><th scope="col" className="storage-file-date">Uploaded</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
    <tbody>{objects.map((file) => <tr key={file.id}>
      <th scope="row"><div className="storage-file-name"><FileIcon contentType={file.contentType} /><span title={file.name}>{file.name}</span></div></th>
      <td className="storage-file-size">{formatStorageBytes(file.size)}</td>
      <td className="storage-file-type"><span title={file.contentType}>{file.contentType || 'application/octet-stream'}</span></td>
      <td className="storage-file-date">{formatDate(file.createdAt)}</td>
      <td><div className="storage-file-actions"><button type="button" className="db-icon-button" aria-label={`Download ${file.name}`} title={`Download ${file.name}`} disabled={busy} onClick={() => downloadFile(file)}>{operation?.type === 'download' && operation.id === file.id ? <LuLoaderCircle className="db-spinning" aria-hidden="true" /> : <LuDownload aria-hidden="true" />}</button><button type="button" className="db-icon-button storage-delete-button" aria-label={`Delete ${file.name}`} title={`Delete ${file.name}`} disabled={busy || !configured} onClick={() => openDelete('delete-file', file)}><LuTrash2 aria-hidden="true" /></button></div></td>
    </tr>)}</tbody>
  </table>;

  return <>
    <aside id="workspace-sidebar" className={`db-sidebar storage-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Storage navigation">
      <WorkspaceNavigation />
      <div className="db-sidebar-title"><LuHardDrive aria-hidden="true" /><h1>Storage</h1></div>
      <p className="storage-sidebar-intro">Private files for your project.</p>
      <div className="storage-create-bucket">{createButton}</div>
      <div className="db-sidebar-divider" />
      <div className="db-tables-label"><h2>Buckets</h2><span>{buckets.length} / {limits.maxBuckets}</span></div>
      <div className="db-table-list" aria-busy={bucketsLoading}>
        {bucketsLoading ? <p className="db-sidebar-message"><LuLoaderCircle className="db-spinning" aria-hidden="true" /> Loading buckets…</p> : bucketsError ? <p className="db-sidebar-message db-sidebar-error">Could not load buckets.</p> : buckets.length ? buckets.map((item) => <button type="button" className={`db-table-item storage-bucket-item${String(item.id) === bucketId ? ' is-selected' : ''}`} key={item.id} onClick={() => chooseBucket(String(item.id))} disabled={busy} aria-current={String(item.id) === bucketId ? 'true' : undefined}><LuArchive aria-hidden="true" /><span>{item.name}</span><small>{item.fileCount || 0}</small></button>) : <p className="db-sidebar-message">No buckets yet.</p>}
      </div>
      <div className="storage-sidebar-usage"><div><span>Project storage</span><strong>{formatStorageBytes(usage.totalBytes)} <span>/ {formatStorageBytes(usage.maxTotalBytes)}</span></strong></div><progress max={Math.max(1, usage.maxTotalBytes)} value={Math.min(usage.totalBytes, usage.maxTotalBytes)} aria-label="Project storage used" /><p><LuLockKeyhole aria-hidden="true" /> Private by default</p></div>
    </aside>

    <main id="workspace-content" className="db-editor storage-editor" tabIndex={-1}>
      <div className="db-editor-heading"><div className="db-current-table"><LuArchive aria-hidden="true" /><span>{bucket?.name || 'Storage buckets'}</span></div><div className="storage-private-badge"><LuLockKeyhole aria-hidden="true" /> Private</div></div>
      <div className="storage-mobile-bucket"><label htmlFor="storage-bucket-picker">Bucket</label><select id="storage-bucket-picker" value={bucketId} onChange={(event) => chooseBucket(event.target.value)} disabled={busy || !buckets.length || bucketsLoading}>{!buckets.length && <option value="">No buckets yet</option>}{buckets.map((item) => <option value={String(item.id)} key={item.id}>{item.name}</option>)}</select><button type="button" className="db-icon-button" aria-label="Create a private bucket" onClick={openCreate} disabled={!configured || busy || bucketsLoading || Boolean(bucketsError) || buckets.length >= limits.maxBuckets}><LuPlus aria-hidden="true" /></button></div>
      <div className="db-toolbar storage-toolbar">
        <div className="db-row-search"><LuSearch aria-hidden="true" /><label className="sr-only" htmlFor="storage-file-search">Search files</label><input id="storage-file-search" type="search" placeholder="Search files…" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} disabled={!bucket || busy || !configured} /></div>
        <button type="button" className="db-button storage-refresh" onClick={refresh} disabled={busy || bucketsLoading || objectsLoading || projectsLoading || !projectId} title="Refresh storage"><LuRefreshCw className={bucketsLoading || objectsLoading ? 'db-spinning' : ''} aria-hidden="true" /><span>Refresh</span></button>
        <div className="storage-toolbar-actions"><button type="button" className="db-button storage-delete-bucket" onClick={() => openDelete('delete-bucket', bucket)} disabled={!bucket || busy || !configured || Number(bucket?.fileCount || 0) > 0 || bucketsLoading} title={Number(bucket?.fileCount || 0) > 0 ? 'Delete all files before deleting this bucket.' : 'Delete this empty bucket'}><LuTrash2 aria-hidden="true" /><span>Delete bucket</span></button><button type="button" className="db-button db-button-primary" disabled={!canUpload} onClick={() => input.current?.click()}><LuUpload aria-hidden="true" />{operation?.type === 'upload' ? 'Uploading…' : 'Upload files'}</button></div>
        <input ref={input} className="sr-only" id="storage-upload" aria-label="Choose files to upload" type="file" multiple tabIndex={-1} onChange={uploadFiles} disabled={!canUpload} />
      </div>
      {notice && <div className={`storage-notice storage-notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}><span>{notice.kind === 'error' ? <LuTriangleAlert aria-hidden="true" /> : <LuCheck aria-hidden="true" />}{notice.text}</span><button type="button" className="db-icon-button" onClick={() => setNotice(null)} aria-label="Dismiss notification"><LuX aria-hidden="true" /></button></div>}
      {uploads.length > 0 && <section className="storage-uploads" aria-label="Upload status" aria-live="polite"><div className="storage-uploads-heading"><strong>{busy && operation?.type === 'upload' ? 'Uploading your files' : 'Upload results'}</strong>{!busy && <button type="button" className="db-icon-button" aria-label="Dismiss upload results" onClick={() => setUploads([])}><LuX aria-hidden="true" /></button>}</div><ul>{uploads.map((job) => <li key={job.id} className={job.status === 'error' ? 'is-error' : ''}><span>{job.status === 'uploading' ? <LuLoaderCircle className="db-spinning" aria-hidden="true" /> : job.status === 'done' ? <LuCheck aria-hidden="true" /> : job.status === 'error' ? <LuTriangleAlert aria-hidden="true" /> : <LuFile aria-hidden="true" />}</span><div><strong>{job.name}</strong>{job.error && <p>{job.error}</p>}</div><small>{job.status === 'uploading' ? 'Uploading' : job.status === 'done' ? 'Uploaded' : job.status === 'error' ? 'Failed' : 'Waiting'}</small></li>)}</ul></section>}
      {quotaFull && configured && !bucketsError && <p className="storage-quota-note"><LuTriangleAlert aria-hidden="true" /> Project storage is full. Delete a file to make room for new uploads.</p>}
      {bucketFull && configured && !quotaFull && <p className="storage-quota-note"><LuTriangleAlert aria-hidden="true" /> This bucket has reached its {limits.maxFilesPerBucket}-file limit.</p>}
      <div className="db-grid-area storage-files-area" aria-busy={bucketsLoading || objectsLoading || projectsLoading}>{content}</div>
      <footer className="db-editor-footer storage-footer"><span>{bucket ? `${bucket.fileCount || 0} ${(bucket.fileCount || 0) === 1 ? 'file' : 'files'} · ${formatStorageBytes(bucket.totalBytes || 0)}` : `${buckets.length} ${buckets.length === 1 ? 'bucket' : 'buckets'}`}</span><span><LuLockKeyhole aria-hidden="true" /> Private · {formatStorageBytes(limits.maxFileBytes)} per file</span></footer>
    </main>

    {dialog?.kind === 'create' && <Modal title="Create a private bucket" busy={busy} onClose={() => setDialog(null)}><p>Give your files a place of their own. Only signed-in members with access to this project can manage this bucket.</p><form onSubmit={createBucket}><label className="storage-field-label" htmlFor="storage-bucket-name">Bucket name</label><input id="storage-bucket-name" className="storage-field" autoFocus value={bucketName} onChange={(event) => setBucketName(event.target.value)} placeholder="project-assets" maxLength={63} autoComplete="off" spellCheck="false" disabled={busy} required aria-describedby={`storage-bucket-help${dialogError ? ' storage-dialog-error' : ''}`} aria-invalid={Boolean(dialogError)} /><p className="storage-field-help" id="storage-bucket-help">1–63 lowercase letters, numbers, or hyphens. No spaces.</p><div className="storage-dialog-privacy"><LuLockKeyhole aria-hidden="true" /><div><strong>Private bucket</strong><span>Files are downloaded through your protected workspace.</span></div></div>{dialogError && <p className="storage-dialog-error" id="storage-dialog-error" role="alert">{dialogError}</p>}<div className="storage-dialog-actions"><button type="button" className="db-button" disabled={busy} onClick={() => setDialog(null)}>Cancel</button><button type="submit" className="db-button db-button-primary" disabled={busy}>{busy ? <LuLoaderCircle className="db-spinning" aria-hidden="true" /> : <LuPlus aria-hidden="true" />}{busy ? 'Creating…' : 'Create bucket'}</button></div></form></Modal>}
    {(dialog?.kind === 'delete-file' || dialog?.kind === 'delete-bucket') && <Modal title={dialog.kind === 'delete-file' ? 'Delete this file?' : 'Delete this empty bucket?'} busy={busy} onClose={() => setDialog(null)} icon={LuTrash2}><p><strong className="storage-delete-name">{dialog.item.name}</strong> will be permanently deleted. This action cannot be undone.{dialog.kind === 'delete-bucket' ? ' Buckets must be empty before they can be deleted.' : ''}</p>{dialogError && <p className="storage-dialog-error" role="alert">{dialogError}</p>}<div className="storage-dialog-actions"><button type="button" className="db-button" disabled={busy} onClick={() => setDialog(null)} autoFocus>Cancel</button><button type="button" className="db-button storage-danger" disabled={busy} onClick={confirmDelete}>{busy ? <LuLoaderCircle className="db-spinning" aria-hidden="true" /> : <LuTrash2 aria-hidden="true" />}{busy ? 'Deleting…' : dialog.kind === 'delete-file' ? 'Delete file' : 'Delete bucket'}</button></div></Modal>}
  </>;
}

export default function Storage() {
  const workspace = useWorkspace();
  return <ProjectStorage key={workspace.projectId || '__no_project__'} workspace={workspace} />;
}
