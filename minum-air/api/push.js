// Lock-screen reminders. A phone that turns reminders on sends its push subscription here with its
// routine and today's progress, and keeps the progress up to date after each drink. The scheduled
// job (push-cron) decides when to nudge. Nothing else is kept.
import { createHash } from 'node:crypto';
import { store, json } from './_store.js';
import { STYLES } from './_remind.js';

const idOf = (endpoint) => createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 32);
const path = (id) => `push/${id}.json`;
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const hm = (v) => (/^\d{2}:\d{2}$/.test(v) ? v : '07:00');

export async function GET() {
  return json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
}

export async function POST(req) {
  if (Number(req.headers.get('content-length') || 0) > 6000) return json({ error: 'too big' }, 413);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const sub = body && body.sub;
  const endpoint = sub && sub.endpoint;
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || endpoint.length > 1000) return json({ error: 'bad subscription' }, 400);
  const s = await store();
  const id = idOf(endpoint);
  if (body.action === 'delete') { await s.del(path(id)); return json({ ok: true }); }
  if (!sub.keys || typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string') return json({ error: 'bad subscription' }, 400);
  const i = body.info || {};
  const old = (await s.get(path(id))) || {};
  const rec = {
    id, sub: { endpoint, keys: { p256dh: sub.keys.p256dh.slice(0, 200), auth: sub.keys.auth.slice(0, 100) } },
    remind: i.remind !== false,
    lang: ['en', 'ms', 'zh'].includes(i.lang) ? i.lang : 'en',
    name: String(i.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20),
    wake: hm(i.wake), sleep: hm(i.sleep),
    style: STYLES[i.style] ? i.style : 'balanced',
    day: /^\d{4}-\d{2}-\d{2}$/.test(i.day) ? i.day : '',
    ml: int(i.ml, 0, 20000), goal: int(i.goal, 500, 10000),
    lastDrink: int(i.lastDrink, 0, 4e12), lastOpen: int(i.lastOpen, 0, 4e12) || old.lastOpen || Date.now(),
    rl: old.rl || null,
    updated: Date.now(),
  };
  await s.set(path(id), rec);
  return json({ ok: true });
}
