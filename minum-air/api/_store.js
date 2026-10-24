// Small JSON records for the API: Vercel Blob in production, a folder on disk when MA_FILE_STORE
// is set (local testing). Shared by the friends and push endpoints.
let storeP = null;
async function makeStore() {
  if (process.env.MA_FILE_STORE) {
    const fs = await import('node:fs/promises');
    const dir = process.env.MA_FILE_STORE;
    const file = (path) => `${dir}/${path.replace(/\//g, '__')}`;
    await fs.mkdir(dir, { recursive: true });
    return {
      async get(path) { try { return JSON.parse(await fs.readFile(file(path), 'utf8')); } catch { return null; } },
      async set(path, rec) { await fs.writeFile(file(path), JSON.stringify(rec)); },
      async del(path) { await fs.rm(file(path), { force: true }); },
      async list(prefix) { const p = prefix.replace(/\//g, '__'); return (await fs.readdir(dir)).filter((f) => f.startsWith(p)).map((f) => f.replace(/__/g, '/')); },
    };
  }
  const blob = await import('@vercel/blob');
  return {
    async get(path) {
      const meta = await blob.head(path).catch(() => null);
      if (!meta) return null;
      const res = await fetch(`${meta.url}?t=${Date.now()}`, { cache: 'no-store' });
      return res.ok ? res.json() : null;
    },
    async set(path, rec) {
      await blob.put(path, JSON.stringify(rec), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
    },
    async del(path) { await blob.del(path).catch(() => {}); },
    async list(prefix) {
      const out = [];
      let cursor;
      do {
        const r = await blob.list({ prefix, cursor, limit: 1000 });
        r.blobs.forEach((b) => out.push(b.pathname));
        cursor = r.hasMore ? r.cursor : undefined;
      } while (cursor);
      return out;
    },
  };
}
export const store = () => (storeP ||= makeStore());
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
