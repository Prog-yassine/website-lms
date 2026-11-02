import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const frontend = resolve(root, 'build');
const output = resolve(root, 'dist');
const manifest = JSON.parse(await readFile(resolve(frontend, 'asset-manifest.json'), 'utf8'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };
const files = new Set(['index.html', 'logo.svg', 'touch-icon.png', 'manifest.json', 'favicon.ico', 'logo192.png', 'logo512.png', 'robots.txt']);
for (const path of Object.values(manifest.files)) if (!path.endsWith('.map')) files.add(path.replace(/^\//, ''));
// Include any build assets emitted by CSS imports, without source maps.
async function collect(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) await collect(path);
    else if (!path.endsWith('.map') && !path.endsWith('.LICENSE.txt')) files.add(relative(frontend, path));
  }
}
await collect(resolve(frontend, 'static'));
const assets = {};
for (const path of files) {
  try {
    if (!(await stat(resolve(frontend, path))).isFile()) continue;
    assets[`/${path}`] = { body: (await readFile(resolve(frontend, path))).toString('base64'), type: types[extname(path)] || 'application/octet-stream' };
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'server'), { recursive: true });
await writeFile(resolve(output, 'server/package.json'), '{"type":"module"}\n');
const entry = `
import { handleApi } from './server/worker.js';
const assets = ${JSON.stringify(assets)};
export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api' || pathname.startsWith('/api/')) return handleApi(request, env, ctx);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', {status:405, headers:{Allow:'GET, HEAD'}});
    let asset = assets[pathname];
    if (!asset && !pathname.startsWith('/static/') && !/\\.[^/]+$/.test(pathname)) asset = assets['/index.html'];
    if (!asset) return new Response('Not found', {status:404});
    const headers = {
      'Content-Type': asset.type,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': pathname.startsWith('/static/') ? 'public, max-age=31536000, immutable' : 'no-cache'
    };
    const bytes = request.method === 'HEAD' ? null : Uint8Array.from(atob(asset.body), char => char.charCodeAt(0));
    return new Response(bytes, {headers});
  }
};`;
await build({ stdin: { contents: entry, resolveDir: root, sourcefile: 'grupedia-site.js' }, bundle: true, platform: 'browser', format: 'esm', target: 'es2022', minify: true, outfile: resolve(output, 'server/index.js'), legalComments: 'inline' });
await mkdir(resolve(output, '.openai'), { recursive: true });
await cp(resolve(root, '.openai/hosting.json'), resolve(output, '.openai/hosting.json'));
await cp(resolve(root, 'drizzle'), resolve(output, '.openai/drizzle'), { recursive: true });
console.log(`Built Worker and ${Object.keys(assets).length} frontend assets in dist/.`);
