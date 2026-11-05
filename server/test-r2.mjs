/** In-memory implementation of the R2 service boundary, with real binary bodies. */
export function createTestR2() {
  const objects = new Map();
  const failures = new Map();
  const holds = new Map();
  const calls = [];

  function failure(operation) {
    const queue = failures.get(operation);
    return queue?.shift();
  }

  async function before(operation, key) {
    calls.push({ operation, key });
    const hold = holds.get(operation)?.shift();
    if (hold) {
      hold.enter(key);
      await hold.pending;
    }
  }

  function metadata(key, object) {
    return {
      key,
      size: object.bytes.byteLength,
      uploaded: new Date(object.uploaded),
      etag: object.etag,
      httpEtag: `"${object.etag}"`,
      httpMetadata: { ...object.httpMetadata },
      customMetadata: { ...object.customMetadata },
    };
  }

  return {
    calls,
    keys: () => [...objects.keys()],

    /** Fail one service operation; afterWrite models an indeterminate failed upload. */
    failNext(operation, { afterWrite = false, message = 'Injected R2 service failure' } = {}) {
      if (!failures.has(operation)) failures.set(operation, []);
      failures.get(operation).push({ afterWrite, error: new Error(message) });
    },

    /** Keep an operation in flight while another HTTP request tests its reservation. */
    holdNext(operation) {
      let enter;
      let release;
      const entered = new Promise(resolve => { enter = resolve; });
      const pending = new Promise(resolve => { release = resolve; });
      if (!holds.has(operation)) holds.set(operation, []);
      holds.get(operation).push({ enter, pending });
      return { entered, release };
    },

    async put(key, value, options = {}) {
      await before('put', key);
      const failed = failure('put');
      if (failed && !failed.afterWrite) throw failed.error;
      const bytes = new Uint8Array(await new Response(value).arrayBuffer());
      const object = {
        bytes,
        uploaded: new Date(),
        etag: crypto.randomUUID().replaceAll('-', ''),
        httpMetadata: { ...options.httpMetadata },
        customMetadata: { ...options.customMetadata },
      };
      objects.set(key, object);
      if (failed) throw failed.error;
      return metadata(key, object);
    },

    async head(key) {
      await before('head', key);
      const failed = failure('head');
      if (failed) throw failed.error;
      const object = objects.get(key);
      return object ? metadata(key, object) : null;
    },

    async get(key) {
      await before('get', key);
      const failed = failure('get');
      if (failed) throw failed.error;
      const object = objects.get(key);
      if (!object) return null;
      const bytes = object.bytes.slice();
      return {
        ...metadata(key, object),
        body: new Blob([bytes]).stream(),
        arrayBuffer: async () => bytes.slice().buffer,
        text: async () => new TextDecoder().decode(bytes),
        writeHttpMetadata(headers) {
          if (object.httpMetadata.contentType) headers.set('Content-Type', object.httpMetadata.contentType);
        },
      };
    },

    async delete(key) {
      await before('delete', key);
      const failed = failure('delete');
      if (failed) throw failed.error;
      for (const name of Array.isArray(key) ? key : [key]) objects.delete(name);
    },
  };
}
