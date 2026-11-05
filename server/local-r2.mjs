import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';

/** Durable filesystem implementation of the R2 methods used by the local Worker. */
export function createLocalR2(directory) {
  const root = resolve(directory);
  const paths = (key) => {
    // User-controlled names never become local filesystem paths.
    const digest = createHash('sha256').update(key).digest('hex');
    return { body: resolve(root, `${digest}.body`), meta: resolve(root, `${digest}.json`) };
  };

  async function metadata(key) {
    try {
      const record = JSON.parse(await readFile(paths(key).meta, 'utf8'));
      return {
        ...record,
        uploaded: new Date(record.uploaded),
        writeHttpMetadata(headers) {
          if (record.httpMetadata?.contentType) headers.set('Content-Type', record.httpMetadata.contentType);
          if (record.httpMetadata?.contentDisposition) headers.set('Content-Disposition', record.httpMetadata.contentDisposition);
        },
      };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  return {
    async put(key, value, options = {}) {
      await mkdir(root, { recursive: true });
      const body = Buffer.from(await new Response(value).arrayBuffer());
      const etag = createHash('md5').update(body).digest('hex');
      const record = { key, size: body.length, etag, httpEtag: `"${etag}"`, uploaded: new Date().toISOString(), httpMetadata: options.httpMetadata || {} };
      const target = paths(key);
      const temporary = `${target.body}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, body, { flag: 'wx' });
        await rename(temporary, target.body);
        await writeFile(target.meta, JSON.stringify(record));
      } catch (error) {
        await unlink(temporary).catch(() => {});
        throw error;
      }
      return metadata(key);
    },
    head: metadata,
    async get(key) {
      const record = await metadata(key);
      if (!record) return null;
      return {
        ...record,
        body: Readable.toWeb(createReadStream(paths(key).body)),
        async arrayBuffer() {
          const body = await readFile(paths(key).body);
          return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
        },
        async text() { return readFile(paths(key).body, 'utf8'); },
      };
    },
    async delete(key) {
      for (const path of Object.values(paths(key))) {
        try { await unlink(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
    },
  };
}
