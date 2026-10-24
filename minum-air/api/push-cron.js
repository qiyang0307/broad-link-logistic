// The scheduled job: looks at everyone with reminders on and sends the ones that are due.
// Runs every half hour. When it isn't called by Vercel's scheduler it still only does a full
// pass once every 10 minutes, so calling it by hand can't spam anyone.
import webpush from 'web-push';
import { store, json } from './_store.js';
import { due, title } from './_remind.js';

export async function GET(req) {
  const s = await store();
  const scheduled = process.env.CRON_SECRET && req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  const run = (await s.get('push-meta/run.json')) || {};
  if (!scheduled && Date.now() - (run.at || 0) < 10 * 6e4) return json({ skipped: true });
  await s.set('push-meta/run.json', { at: Date.now() });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return json({ error: 'push keys missing' }, 500);
  webpush.setVapidDetails('https://minum-air.vercel.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const paths = (await s.list('push/')).filter((p) => p.endsWith('.json'));
  let sent = 0, gone = 0;
  await Promise.all(paths.map(async (p) => {
    const rec = await s.get(p);
    if (!rec || !rec.sub) return;
    const msg = due(rec);
    if (!msg) return;
    try {
      await webpush.sendNotification(rec.sub, JSON.stringify({ title: title(rec), body: msg.body, tag: msg.tag, av: 1 + Math.floor(Math.random() * 16) }), { TTL: 1800, urgency: 'normal' });
      sent++;
      await s.set(p, rec);
    } catch (e) {
      // The phone unsubscribed or the app was removed: forget it.
      if (e && (e.statusCode === 404 || e.statusCode === 410)) { gone++; await s.del(p); }
    }
  }));
  return json({ checked: paths.length, sent, gone });
}
