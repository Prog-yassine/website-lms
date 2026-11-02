import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../dist/server/index.js';
import { createLocalD1 } from './local-d1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(resolve(root, 'server/.local'), { recursive: true });
const DB = createLocalD1(resolve(root, 'server/.local/grupedia.sqlite'));
// Local migrations run at startup, never inside a request handler.
await DB.exec('CREATE TABLE IF NOT EXISTS __local_migrations (tag TEXT PRIMARY KEY)');
const journal = JSON.parse(await readFile(resolve(root, 'drizzle/meta/_journal.json'), 'utf8'));
for (const migration of journal.entries) {
  if (!await DB.prepare('SELECT tag FROM __local_migrations WHERE tag = ?').bind(migration.tag).first()) {
    await DB.exec('BEGIN');
    try {
      await DB.exec(await readFile(resolve(root, `drizzle/${migration.tag}.sql`), 'utf8'));
      await DB.prepare('INSERT INTO __local_migrations (tag) VALUES (?)').bind(migration.tag).run();
      await DB.exec('COMMIT');
    } catch (error) {
      await DB.exec('ROLLBACK');
      throw error;
    }
  }
}
const env = { DB, JWT_SECRET: process.env.JWT_SECRET || randomBytes(48).toString('hex') };
const port = Number(process.env.PORT || 8787);
const server = createServer(async (incoming, outgoing) => {
  try {
    const host = incoming.headers.host || `127.0.0.1:${port}`;
    if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(host)) {
      outgoing.writeHead(400).end('Invalid local host');
      return;
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > 16 * 1024) { outgoing.writeHead(413).end('Request too large'); return; }
      chunks.push(chunk);
    }
    const request = new Request(`http://${host}${incoming.url}`, {
      method: incoming.method, headers: incoming.headers,
      ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = await worker.fetch(request, env, { waitUntil: promise => promise.catch(console.error) });
    const headers = Object.fromEntries(response.headers);
    const cookies = response.headers.getSetCookie();
    if (cookies.length) headers['set-cookie'] = cookies;
    outgoing.writeHead(response.status, headers);
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Local server failed:', error.name);
    outgoing.writeHead(500).end('Local server error');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Grupedia fullstack: http://127.0.0.1:${port}`));
function close() { server.close(() => { DB.close(); process.exit(0); }); }
process.on('SIGINT', close);
process.on('SIGTERM', close);
