// Pace-based reminders, worked out on the server for phones subscribed to push. Same rules as the
// app: only when you're behind where you should be by now (the waking day as the clock), never
// while you sleep or right after a drink, a gap and daily cap per style, and ignored reminders
// make the next one wait twice as long.
export const STYLES = { gentle: { gap: 120, slack: .15, max: 4 }, balanced: { gap: 90, slack: .1, max: 6 }, keen: { gap: 60, slack: .05, max: 8 } };
const TZ = 'Asia/Kuala_Lumpur';
export const dayKey = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
const nowMin = (d = new Date()) => {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d).split(':').map(Number);
  return (h % 24) * 60 + m;
};
const toMin = (s) => { const [a, b] = String(s || '07:00').split(':').map(Number); return a * 60 + (b || 0); };

// Where you are in your waking day, 0 to 1; null while you're asleep.
export function dayProgress(wake, sleep, d = new Date()) {
  const w = toMin(wake);
  let sl = toMin(sleep);
  if (sl <= w) sl += 1440;
  let n = nowMin(d);
  if (n < w) n += 1440;
  if (n >= sl) return null;
  return (n - w) / (sl - w);
}

const MSG = {
  en: {
    title: 'Meowie 🦈',
    pace: ({ name, p, e, ml }) => `Oi ${name}, you're at ${p}% but should be around ${e}% by now. ${ml} ml gets you back on track! 💧`,
    miss: ({ name }) => `Meowie misses you, ${name} 🥺 Come back for one glass?`,
  },
  ms: {
    title: 'Meowie 🦈',
    pace: ({ name, p, e, ml }) => `Oi ${name}, baru ${p}% tapi patutnya dah sekitar ${e}%. Minum ${ml} ml untuk kejar balik! 💧`,
    miss: ({ name }) => `Meowie rindu awak, ${name} 🥺 Jom datang minum satu gelas?`,
  },
  zh: {
    title: 'Meowie 🦈',
    pace: ({ name, p, e, ml }) => `喂 ${name}，你才 ${p}%，现在应该差不多 ${e}% 了。喝 ${ml} 毫升就能追上！💧`,
    miss: ({ name }) => `Meowie 想你了，${name} 🥺 回来喝一杯好吗？`,
  },
};
const fmt = (n) => Math.round(n).toLocaleString('en-US');

// Decide what (if anything) to send this person now. Returns { body } or null, and updates rec.rl.
export function due(rec, now = Date.now()) {
  if (!rec.remind) return null;
  const L = MSG[rec.lang] || MSG.en;
  const name = rec.name || 'kawan';
  const prog = dayProgress(rec.wake, rec.sleep, new Date(now));
  if (prog == null) return null;
  const today = dayKey(new Date(now));
  const rl = rec.rl && rec.rl.day === today ? rec.rl : (rec.rl = { day: today, n: 0, last: 0, ignored: 0 });
  // Away for two days or more: one "Meowie misses you" a day, in the daytime, instead of pace nudges.
  if (rec.lastOpen && now - rec.lastOpen > 48 * 3600e3) {
    if (rl.missed || prog < .15 || prog > .8) return null;
    rl.missed = true;
    return { body: L.miss({ name }), tag: 'minum-miss' };
  }
  const st = STYLES[rec.style] || STYLES.balanced;
  const goal = Math.max(500, rec.goal || 2000);
  const have = rec.day === today ? rec.ml || 0 : 0;
  if (have >= goal) return null;
  const expected = goal * prog;
  if (have >= expected - goal * st.slack) return null;
  if (rl.n >= st.max) return null;
  const lastDrink = rec.day === today ? rec.lastDrink || 0 : 0;
  if (now - lastDrink < 30 * 6e4) return null;
  // Reminders in a row with no drink since: each one makes the next wait twice as long.
  const ignored = rl.last && lastDrink < rl.last ? (rl.ignored || 0) + 1 : 0;
  if (now - rl.last < Math.min(240, st.gap * Math.pow(2, ignored)) * 6e4) return null;
  rl.ignored = ignored;
  rl.n++;
  rl.last = now;
  const ml = Math.max(50, Math.ceil((expected - have) / 50) * 50);
  return { body: L.pace({ name, p: Math.round(have / goal * 100), e: Math.round(prog * 100), ml: fmt(ml) }), tag: 'minum' };
}
export const title = (rec) => (MSG[rec.lang] || MSG.en).title;
