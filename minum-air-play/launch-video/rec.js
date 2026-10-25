// Records short clips of the real app for the launch video.
const { chromium } = require(process.env.PW);
const out = process.argv[2];
const B = 'http://localhost:8771';
const kl = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(d);
const cors = { 'access-control-allow-origin': '*' };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const now = Date.now(); const tk = kl(new Date());
  const days = {}; [1.05, 1.1, 1.02, 1.0, 1.08, .8, 1.02].forEach((f, i) => { days[kl(new Date(now - (i + 1) * 864e5))] = { goal: 2400, log: [{ drink: 'air', ml: Math.round(2400 * f), eff: Math.round(2400 * f), t: 1 }] }; });
  const prof = { name: 'Aisyah', gender: 'perempuan', weight: 55, age: 27, activity: 'aktif', city: 'Kuala Lumpur', wake: '07:00', sleep: '23:00' };
  const base = { onboarded: true, installed: true, tourDone: true, recapSeen: 'x', avatar: 3, scenesSeen: ['classic', 'reef', 'pool'], profile: prof, lang: 'en' };
  async function clip(name, seed, fraction, act, extra = {}) {
    // Find the goal first (it depends on the weather), without recording.
    const mkCtx = async (rec) => { const c = await b.newContext({ viewport: rec ? { width: 780, height: 1688 } : { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: rec ? 1 : 2, ...(rec ? { recordVideo: { dir: `${out}/${name}`, size: { width: 780, height: 1688 } } } : {}) }); if (rec) await c.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.zoom = '2'; }); }); return c; };
    const route = async (ctx) => {
      await ctx.route('https://api.open-meteo.com/**', (r) => { const u = r.request().url(); r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(u.includes('current=') ? { current: { temperature_2m: 32, apparent_temperature: 36, relative_humidity_2m: 74, weather_code: 2, is_day: 1, wind_speed_10m: 9, uv_index: 8 }, daily: { temperature_2m_max: [33], temperature_2m_min: [25] } } : { daily: { apparent_temperature_max: [36], temperature_2m_max: [33] } }) }); });
      await ctx.route('https://air-quality-api.open-meteo.com/**', (r) => r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ current: { pm2_5: 18, pm10: 25, us_aqi: 50 } }) }));
    };
    let ctx = await mkCtx(false); await route(ctx); let p = await ctx.newPage();
    await p.goto(B + '/#day');
    await p.evaluate((s) => localStorage.setItem('minum-air:v2', JSON.stringify(s)), { ...base, ...seed, days: { ...days, [tk]: { goal: 2400, log: [{ drink: 'air', ml: 100, eff: 100, t: now - 3600e3 }] } } });
    await p.reload(); await p.waitForSelector('.screen.active[data-name="home"]'); await p.waitForTimeout(2500);
    const goal = await p.evaluate(() => Number((document.querySelector('.stats-row').textContent.match(/\/\s*([\d,]+)\s*ml/) || [0, '2400'])[1].replace(/,/g, '')));
    const st = await p.evaluate(() => localStorage.getItem('minum-air:v2'));
    await ctx.close();
    const s = JSON.parse(st); s.days[tk].log[0].ml = s.days[tk].log[0].eff = Math.round(goal * fraction); s.days[tk].goal = goal; Object.assign(s, extra);
    ctx = await mkCtx(true); await route(ctx); p = await ctx.newPage();
    await p.goto(B + '/#day');
    await p.evaluate((s) => { localStorage.setItem('minum-air:v2', JSON.stringify(s)); sessionStorage.setItem('minum-air:splashed', '1'); }, s);
    const t0 = Date.now();
    await p.reload(); await p.waitForSelector('.screen.active[data-name="home"]');
    const marks = { load: Date.now() - t0 };
    await act(p, marks, t0);
    marks.end = Date.now() - t0;
    await ctx.close();
    require('fs').writeFileSync(`${out}/${name}/marks.json`, JSON.stringify(marks));
    console.log(name, goal, marks);
  }
  // A: below half, tap the blue button: Meowie drinks, water rises past 50%, he swims.
  await clip('drink', { scene: 'reef' }, .44, async (p, m, t0) => {
    await p.waitForTimeout(2200); m.tap = Date.now() - t0; await p.evaluate(() => document.querySelector('#quickAdd').click()); await p.waitForTimeout(8500);
  });
  // B: just under the goal: tap, the 100% party.
  await clip('party', { scene: 'reef' }, .965, async (p, m, t0) => {
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('minum-air:v2')); return s; });
    await p.waitForTimeout(1500); m.tap = Date.now() - t0; await p.evaluate(() => document.querySelector('#quickAdd').click()); await p.waitForTimeout(9000);
  }, {});
  // C: the friends league.
  const api = async (body) => (await (await fetch(B + '/api/friends', { method: 'POST', body: JSON.stringify(body) })).json());
  const wk = (() => { const dow = (new Date(tk + 'T12:00:00Z').getUTCDay() + 6) % 7; return Array.from({ length: 7 }, (_, i) => kl(new Date(now + (i - dow) * 864e5))); })();
  const mkP = async (name, av, ml, week, streak, hits, sec) => (await api({ action: 'sync', secret: sec, card: { name, av, day: tk, ml, goal: 2600, weekOf: wk[0], week, streak, hits } })).me.code;
  const meSec = 'me-secret-aaaaaaaaaaaa';
  const me = await mkP('Aisyah', 3, 2300, [100, 100, 95, 100, 88, 0, 0], 5, 9, meSec);
  for (const [n, a, ml, w, st, h] of [['Hafiz', 8, 2900, [100, 100, 100, 100, 100, 0, 0], 7, 12], ['Mei Ling', 12, 1900, [90, 100, 80, 100, 70, 0, 0], 3, 6], ['Ravi', 5, 1200, [60, 75, 100, 50, 40, 0, 0], 1, 3]]) {
    const c = await mkP(n, a, ml, w, st, h, 'sec-' + n.replace(' ', '') + '-bbbbbbbbbbbb'); await api({ action: 'add', code: me, secret: meSec, friend: c });
  }
  await clip('friends', { scene: 'reef' }, .7, async (p, m, t0) => {
    await p.waitForTimeout(800); m.tab = Date.now() - t0; await p.click('[data-tab=friends]'); await p.waitForTimeout(2200);
    m.week = Date.now() - t0; await p.click('[data-sort=week]'); await p.waitForTimeout(2500);
  }, { friends: { code: me, secret: meSec } });
  await b.close();
})();
