// Friends and the leaderboard. Each player is one small JSON record in Vercel Blob, named by their
// 6-letter friend code. Only what the leaderboard needs is kept: name, avatar and water progress.
// A record can only be changed with the secret its owner's phone made when joining (stored hashed).
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const MAX_FRIENDS = 50;

import { store as baseStore, json } from './_store.js';

// Players live under players/<code>.json.
const path = (code) => `players/${code}.json`;
const store = async () => {
  const s = await baseStore();
  return { get: (c) => s.get(path(c)), set: (c, r) => s.set(path(c), r), del: (c) => s.del(path(c)) };
};
const hash = (s) => createHash('sha256').update(String(s)).digest('hex');
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');

function owns(rec, secret) {
  if (!rec || typeof secret !== 'string' || secret.length < 16) return false;
  const a = Buffer.from(rec.key, 'hex');
  const b = Buffer.from(hash(secret), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

// Only these fields ever reach other players.
function card(c = {}) {
  const week = Array.isArray(c.week) ? c.week.slice(0, 7).map((x) => int(x, 0, 300)) : [];
  while (week.length < 7) week.push(0);
  return {
    name: String(c.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20) || 'Meowie fan',
    av: int(c.av, 1, 16),
    day: day(c.day), ml: int(c.ml, 0, 20000), goal: int(c.goal, 500, 10000),
    weekOf: day(c.weekOf), week,
    streak: int(c.streak, 0, 3650), hits: int(c.hits, 0, 100000),
  };
}
const weekPts = (w) => (w || []).reduce((a, x) => a + Math.min(100, x), 0);
// Last week's league points stay on the record after a new week starts, for the weekly recap.
const pub = (rec) => ({ code: rec.code, ...card(rec), prevWeekOf: rec.prevWeekOf || '', prevPts: rec.prevPts || 0, updated: rec.updated });

async function newCode(s) {
  for (let i = 0; i < 8; i++) {
    const code = Array.from({ length: 6 }, () => ALPHA[randomInt(ALPHA.length)]).join('');
    if (!(await s.get(code))) return code;
  }
  throw new Error('no free code');
}

// GET /api/friends?code=ABC123 → your card and your friends' cards.
export async function GET(req) {
  const code = new URL(req.url).searchParams.get('code') || '';
  if (!CODE_RE.test(code)) return json({ error: 'bad code' }, 400);
  const s = await store();
  const me = await s.get(code);
  if (!me) return json({ error: 'not found' }, 404);
  const friends = (await Promise.all((me.friends || []).slice(0, MAX_FRIENDS).map((c) => s.get(c)))).filter(Boolean);
  return json({ me: pub(me), friends: friends.map(pub) });
}

// POST /api/friends { action: 'sync' | 'add' | 'remove' | 'delete', code, secret, ... }
export async function POST(req) {
  if (Number(req.headers.get('content-length') || 0) > 8000) return json({ error: 'too big' }, 413);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const { action, code, secret } = body || {};
  const s = await store();

  if (action === 'sync' && !code) {
    if (typeof secret !== 'string' || secret.length < 16) return json({ error: 'bad secret' }, 400);
    const rec = { code: await newCode(s), key: hash(secret), friends: [], ...card(body.card), updated: Date.now() };
    await s.set(rec.code, rec);
    return json({ me: pub(rec) });
  }

  if (!CODE_RE.test(code || '')) return json({ error: 'bad code' }, 400);
  const me = await s.get(code);
  if (!me) return json({ error: 'not found' }, 404);
  if (!owns(me, secret)) return json({ error: 'forbidden' }, 403);

  if (action === 'sync') {
    const next = card(body.card);
    if (me.weekOf && next.weekOf && next.weekOf > me.weekOf) { me.prevWeekOf = me.weekOf; me.prevPts = weekPts(me.week); }
    Object.assign(me, next, { updated: Date.now() });
    await s.set(code, me);
    return json({ me: pub(me) });
  }
  if (action === 'add' || action === 'remove') {
    const fc = String(body.friend || '').toUpperCase();
    if (!CODE_RE.test(fc)) return json({ error: 'bad friend code' }, 400);
    if (fc === code) return json({ error: 'self' }, 400);
    const fr = await s.get(fc);
    if (!fr) return json({ error: 'friend not found' }, 404);
    const link = (a, b) => { a.friends = [...new Set([...(a.friends || []), b])].slice(0, MAX_FRIENDS); };
    const unlink = (a, b) => { a.friends = (a.friends || []).filter((x) => x !== b); };
    // Friendship goes both ways, so each of you sees the other.
    if (action === 'add') {
      if ((me.friends || []).length >= MAX_FRIENDS) return json({ error: 'full' }, 400);
      link(me, fc); link(fr, code);
    } else { unlink(me, fc); unlink(fr, code); }
    await Promise.all([s.set(code, me), s.set(fc, fr)]);
    return json({ friend: pub(fr) });
  }
  if (action === 'delete') {
    await Promise.all((me.friends || []).map(async (c) => { const f = await s.get(c); if (f) { f.friends = (f.friends || []).filter((x) => x !== code); await s.set(c, f); } }));
    await s.del(code);
    return json({ ok: true });
  }
  return json({ error: 'bad action' }, 400);
}
