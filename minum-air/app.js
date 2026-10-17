// Minum Air: onboarding flow + home screen. All state lives in localStorage.
(() => {
  const STORE_KEY = 'minum-air:v2';
  const HEAT_START = 32;      // feels-like °C where extra water kicks in
  const HEAT_STEP = 250;      // +250 ml at 32 °C, and again for every 2 °C above
  const HEAT_MAX = 1250;

  const CITIES = [
    ['Kuala Lumpur', 3.139, 101.687], ['Putrajaya', 2.926, 101.696], ['Shah Alam', 3.073, 101.519],
    ['Petaling Jaya', 3.107, 101.607], ['George Town', 5.414, 100.329], ['Ipoh', 4.597, 101.090],
    ['Alor Setar', 6.121, 100.367], ['Kangar', 6.441, 100.198], ['Kota Bharu', 6.125, 102.238],
    ['Kuala Terengganu', 5.329, 103.137], ['Kuantan', 3.817, 103.326], ['Seremban', 2.726, 101.938],
    ['Melaka', 2.189, 102.250], ['Johor Bahru', 1.493, 103.741], ['Kota Kinabalu', 5.980, 116.073],
    ['Sandakan', 5.840, 118.117], ['Tawau', 4.245, 117.891], ['Kuching', 1.553, 110.359],
    ['Miri', 4.399, 113.991], ['Sibu', 2.288, 111.831], ['Labuan', 5.280, 115.242],
  ];

  // hyd = how much of the drink counts as water.
  const DRINKS = [
    { id: 'air', color: '#9fdcff', hyd: 1, ice: false },
    { id: 'tehtarik', color: '#c98b4e', hyd: .8, foam: '#f1dcc0' },
    { id: 'kopio', color: '#4a2c1a', hyd: .8 },
    { id: 'milo', color: '#7a4a2a', hyd: .85, ice: true, foam: '#9b6a45' },
    { id: 'bandung', color: '#f39bb7', hyd: .9, ice: true },
    { id: 'kelapa', color: '#f4f1e2', hyd: 1, ice: true },
    { id: 'limau', color: '#d9ef7a', hyd: 1, ice: true },
    { id: 'barli', color: '#efe3bd', hyd: .95, ice: true },
    { id: 'isotonik', color: '#d6f0ff', hyd: .95 },
  ];
  const SIZES = [150, 250, 400, 600];

  const ACTIVITY = {
    santai: { ic: '🛋️', add: 0 },
    sederhana: { ic: '🚶', add: 350 },
    aktif: { ic: '⚽', add: 700 },
  };
  const GENDER = {
    lelaki: { ic: '👨', f: 1 },
    perempuan: { ic: '👩', f: .92 },
    rahsia: { ic: '🤐', f: .96 },
  };

  // ---------- state ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  }
  const state = Object.assign({
    onboarded: false,
    profile: { name: '', gender: '', weight: 60, activity: '', city: '', wake: '07:00', sleep: '23:00', remind: false },
    days: {},
    weather: null,
    lastSize: 250,
    lang: 'en',
  }, load());

  // ---------- i18n ----------
  const I18N = window.MA_I18N;
  const LANGS = Object.keys(I18N);
  const L = () => I18N[state.lang] || I18N.en;
  function t(key, params) {
    const v = L()[key] !== undefined ? L()[key] : I18N.en[key];
    return typeof v === 'function' ? v(params || {}) : v;
  }
  const drinkName = (d) => L().drinks[d.id];
  const friend = () => state.profile.name || t('friend');
  function applyLang() {
    document.documentElement.lang = L()._html;
    document.querySelectorAll('#tabbar [data-tab]').forEach((b) => { b.lastChild.textContent = t('tabs')[b.dataset.tab]; });
  }

  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('en-MY');

  const dayKey = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(d);
  const myHour = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', hour12: false }).format(new Date()));
  const timeStr = (t) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' }).format(new Date(t));

  function baseGoal(p = state.profile) {
    const g = GENDER[p.gender] || GENDER.rahsia;
    const a = ACTIVITY[p.activity] || ACTIVITY.santai;
    const raw = p.weight * 33 * g.f + a.add;
    return Math.min(4500, Math.max(1500, Math.round(raw / 50) * 50));
  }
  function heatBonus(feels) {
    if (feels == null || feels < HEAT_START) return 0;
    return Math.min(HEAT_MAX, (Math.floor((feels - HEAT_START) / 2) + 1) * HEAT_STEP);
  }
  function todaysWeather() {
    const w = state.weather;
    return w && w.day === dayKey() && w.city === state.profile.city ? w : null;
  }
  function today() {
    const k = dayKey();
    if (!state.days[k]) state.days[k] = { log: [] };
    const d = state.days[k];
    const w = todaysWeather();
    d.goal = baseGoal() + heatBonus(w && w.feels);
    return d;
  }
  const total = (d) => d.log.reduce((s, x) => s + x.eff, 0);

  function streakCount() {
    let n = 0;
    const t = state.days[dayKey()];
    if (t && t.goal && total(t) >= t.goal) n++;
    for (let i = 1; i < 3650; i++) {
      const r = state.days[dayKey(new Date(Date.now() - i * 864e5))];
      if (r && r.goal && total(r) >= r.goal) n++; else break;
    }
    return n;
  }

  async function fetchWeather() {
    const city = CITIES.find((c) => c[0] === state.profile.city);
    if (!city || todaysWeather()) return;
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city[1]}&longitude=${city[2]}&daily=apparent_temperature_max,temperature_2m_max&timezone=Asia%2FKuala_Lumpur&forecast_days=1`);
      if (!res.ok) throw new Error(res.status);
      const j = await res.json();
      state.weather = { city: city[0], day: dayKey(), feels: j.daily.apparent_temperature_max[0], temp: j.daily.temperature_2m_max[0] };
      save();
      if (current === 'home') renderHome(false);
    } catch { /* offline: base goal only */ }
  }

  // ---------- drink icon (glass with liquid, ice, foam and straw) ----------
  function cupSvg(d, level = .72) {
    const top = 14 + (1 - level) * 46;
    const cid = 'g' + d.id + Math.round(level * 100);
    const ice = d.ice ? `<rect x="15" y="${top + 4}" width="9" height="9" rx="2" fill="#fff" opacity=".75" transform="rotate(-12 19 ${top + 8})"/><rect x="26" y="${top + 8}" width="8" height="8" rx="2" fill="#fff" opacity=".65" transform="rotate(14 30 ${top + 12})"/>` : '';
    const foam = d.foam ? `<rect x="9" y="${top - 2}" width="30" height="7" rx="3" fill="${d.foam}"/>` : '';
    return `<svg viewBox="0 0 48 60" aria-hidden="true">
      <path d="M33 4 L28 30" stroke="#e8453c" stroke-width="3.5" stroke-linecap="round"/>
      <clipPath id="${cid}"><path d="M8 12 L40 12 L36 56 Q35 58 33 58 L15 58 Q13 58 12 56 Z"/></clipPath>
      <g clip-path="url(#${cid})"><rect x="0" y="${top}" width="48" height="60" fill="${d.color}"/>${foam}${ice}</g>
      <path d="M8 12 L40 12 L36 56 Q35 58 33 58 L15 58 Q13 58 12 56 Z" fill="none" stroke="var(--cup-line)" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M13 18 L15 48" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>
    </svg>`;
  }

  // ---------- screen manager ----------
  const app = $('#app');
  let current = null;
  let screenEl = null;

  function show(name, html, { back = false, onMount } = {}) {
    const el = document.createElement('section');
    el.className = 'screen' + (back ? ' from-left' : '');
    el.dataset.name = name;
    el.innerHTML = html;
    app.appendChild(el);
    const old = screenEl;
    screenEl = el;
    current = name;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.add('active');
      el.classList.remove('from-left');
      if (old) {
        old.classList.remove('active');
        if (!back) old.classList.add('leave-left');
        setTimeout(() => old.remove(), 450);
      }
    }));
    if (onMount) onMount(el);
    return el;
  }

  // ---------- onboarding ----------
  const STEPS = ['welcome', 'name', 'gender', 'weight', 'activity', 'city', 'times', 'calc', 'goal', 'notify'];
  const PROGRESS_STEPS = ['name', 'gender', 'weight', 'activity', 'city', 'times', 'goal', 'notify'];
  let stepIdx = 0;

  function chrome(step, { skip = false } = {}) {
    const pi = PROGRESS_STEPS.indexOf(step);
    const pct = pi < 0 ? 0 : ((pi + 1) / PROGRESS_STEPS.length) * 100;
    return `<div class="ob-top">
      <button class="back" type="button" data-act="back" aria-label="${t('back')}">←</button>
      <div class="progress"><i style="width:${pct}%"></i></div>
      ${skip ? `<button class="skip" type="button" data-act="skip">${t('skip')}</button>` : '<span style="width:40px"></span>'}
    </div>`;
  }
  function hero(say, opts = {}) {
    return `<div class="ob-hero" style="flex-direction:column;align-items:center;gap:12px">
      ${say ? `<div class="bubble-say">${say}</div>` : ''}<div class="hero-cat" data-intro="${opts.intro ? 1 : ''}"></div></div>`;
  }
  function mountCat(el, { size = 240, level = 0, intro = false } = {}) {
    const holder = $('.hero-cat', el);
    if (!holder) return null;
    const cat = Meowie.create({ intro: intro || holder.dataset.intro === '1' });
    cat.style.width = size + 'px';
    holder.appendChild(cat);
    requestAnimationFrame(() => Meowie.setLevel(cat, level));
    return cat;
  }

  function goStep(i, back = false) {
    stepIdx = i;
    const step = STEPS[i];
    const p = state.profile;
    const name = friend();
    const fill = Math.min(.9, i / STEPS.length);
    let html = '';
    let mount = null;

    switch (step) {
      case 'welcome':
        html = `<div class="ob-top" style="justify-content:flex-end"><button class="lang-pill" type="button" data-act="lang" aria-label="${t('chooseLang')}">🌐 ${L()._label} <span aria-hidden="true">▾</span></button></div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center" class="stagger">
          ${hero(t('welcomeSay'), { intro: !back })}
          <h1 class="ob-title">${t('welcomeTitle')}</h1>
          <p class="ob-sub">${t('welcomeSub')}</p>
        </div>
        <div class="ob-foot"><button class="cta" data-act="next">${t('welcomeStart')}</button>
        <button class="cta ghost" data-act="demo">${t('welcomeDemo')}</button></div>`;
        mount = (el) => mountCat(el, { size: 320, level: .25 });
        break;

      case 'name':
        html = `${chrome(step, { skip: true })}${hero(t('nameSay'))}
          <div class="ob-body stagger"><h1 class="ob-title">${t('nameTitle')}</h1><p class="ob-sub">${t('nameSub')}</p>
          <input class="field" id="nameIn" maxlength="20" placeholder="${t('namePh')}" value="${esc(p.name)}" autocomplete="given-name"></div>
          <div class="ob-foot"><button class="cta" data-act="next">${t('next')}</button></div>`;
        mount = (el) => {
          mountCat(el, { level: fill });
          const inp = $('#nameIn', el);
          inp.addEventListener('input', () => { p.name = inp.value.trim(); save(); });
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') next(); });
        };
        break;

      case 'gender':
        html = `${chrome(step)}${hero(t('genderSay', { name: esc(name) }))}
          <div class="ob-body"><h1 class="ob-title">${t('genderTitle')}</h1><p class="ob-sub">${t('genderSub')}</p>
          <div class="stagger" style="display:grid;gap:10px">${Object.entries(GENDER).map(([k, g]) =>
            `<button class="option ${p.gender === k ? 'sel' : ''}" data-pick="gender" data-val="${k}"><span class="ic">${g.ic}</span><b>${L().gender[k]}</b></button>`).join('')}</div></div>
          <div class="ob-foot"><button class="cta" data-act="next" ${p.gender ? '' : 'disabled'}>${t('next')}</button></div>`;
        mount = (el) => mountCat(el, { level: fill });
        break;

      case 'weight':
        html = `${chrome(step)}${hero(t('weightSay'))}
          <div class="ob-body"><h1 class="ob-title">${t('weightTitle')}</h1>
          <div class="big-num"><span id="wNum">${p.weight}</span> <small>kg</small></div>
          <div class="stepper"><button type="button" data-w="-1" aria-label="${t('less')}">−</button>
          <input type="range" id="wRange" min="30" max="150" value="${p.weight}" aria-label="${t('weightTitle')}" style="max-width:200px">
          <button type="button" data-w="1" aria-label="${t('more')}">+</button></div></div>
          <div class="ob-foot"><button class="cta" data-act="next">${t('next')}</button></div>`;
        mount = (el) => {
          const cat = mountCat(el, { level: fill });
          const range = $('#wRange', el);
          const setW = (v) => {
            p.weight = Math.max(30, Math.min(150, v));
            range.value = p.weight;
            $('#wNum', el).textContent = p.weight;
            // Cat puffs up slightly with the number, just for fun.
            cat.style.transform = `scale(${.9 + (p.weight - 30) / 600})`;
            save();
          };
          cat.style.transition = 'transform .2s ease';
          setW(p.weight);
          range.addEventListener('input', () => setW(Number(range.value)));
          el.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => setW(p.weight + Number(b.dataset.w))));
        };
        break;

      case 'activity':
        html = `${chrome(step)}${hero(t('activitySay'))}
          <div class="ob-body"><h1 class="ob-title">${t('activityTitle')}</h1><p class="ob-sub">${t('activitySub')}</p>
          <div class="stagger" style="display:grid;gap:10px">${Object.entries(ACTIVITY).map(([k, a]) =>
            `<button class="option ${p.activity === k ? 'sel' : ''}" data-pick="activity" data-val="${k}"><span class="ic">${a.ic}</span><span><b>${L().activity[k][0]}</b><small>${L().activity[k][1]}</small></span></button>`).join('')}</div></div>
          <div class="ob-foot"><button class="cta" data-act="next" ${p.activity ? '' : 'disabled'}>${t('next')}</button></div>`;
        mount = (el) => mountCat(el, { level: fill });
        break;

      case 'city':
        html = `${chrome(step)}
          <div class="ob-body"><h1 class="ob-title" style="margin-top:14px">${t('cityTitle')}</h1><p class="ob-sub">${t('citySub')}</p>
          <div class="city-list stagger">${CITIES.map(([c]) =>
            `<button class="option ${p.city === c ? 'sel' : ''}" data-pick="city" data-val="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
          <div class="ob-foot" style="position:sticky;bottom:0;background:linear-gradient(transparent,var(--bg) 30%)"><button class="cta" data-act="next" ${p.city ? '' : 'disabled'}>${t('next')}</button></div>`;
        break;

      case 'times':
        html = `${chrome(step)}${hero(t('timesSay'))}
          <div class="ob-body"><h1 class="ob-title">${t('timesTitle')}</h1><p class="ob-sub">${t('timesSub')}</p>
          <div class="time-row stagger">
            <div class="time-card"><div class="ic">🌅</div><label for="wakeIn">${t('wake')}</label><input type="time" id="wakeIn" value="${p.wake}"></div>
            <div class="time-card"><div class="ic">🌙</div><label for="sleepIn">${t('sleep')}</label><input type="time" id="sleepIn" value="${p.sleep}"></div>
          </div></div>
          <div class="ob-foot"><button class="cta" data-act="next">${t('calcCta')}</button></div>`;
        mount = (el) => {
          mountCat(el, { level: fill });
          $('#wakeIn', el).addEventListener('change', (e) => { p.wake = e.target.value || '07:00'; save(); });
          $('#sleepIn', el).addEventListener('change', (e) => { p.sleep = e.target.value || '23:00'; save(); });
        };
        break;

      case 'calc':
        html = `<div class="screen-inner calc" style="flex:1;display:flex;flex-direction:column">
          ${hero('')}<div class="pct" id="calcPct">0%</div>
          <ul class="checks" id="checks">
            ${L().calc.map((f) => `<li>${f({ w: p.weight, city: esc(p.city) })}</li>`).join('')}
          </ul></div>`;
        mount = (el) => {
          el.classList.add('calc');
          const cat = mountCat(el, { size: 330, level: 0 });
          fetchWeather();
          const items = el.querySelectorAll('#checks li');
          const t0 = performance.now();
          const dur = 2800;
          (function tick(now) {
            const k = Math.min(1, (now - t0) / dur);
            $('#calcPct', el).textContent = Math.round(k * 100) + '%';
            Meowie.setLevel(cat, k);
            items.forEach((li, i) => li.classList.toggle('done', k >= (i + 1) / items.length - .02));
            if (k < 1) requestAnimationFrame(tick);
            else { Meowie.act(cat, 'jump'); setTimeout(() => current === 'ob-calc' && next(), 1400); }
          })(t0);
        };
        break;

      case 'goal': {
        const g = GENDER[p.gender] || GENDER.rahsia;
        const a = ACTIVITY[p.activity] || ACTIVITY.santai;
        const aLabel = L().activity[p.activity in ACTIVITY ? p.activity : 'santai'][0];
        const w = todaysWeather();
        const bonus = heatBonus(w && w.feels);
        html = `${chrome(step)}${hero(t('goalSay', { name: esc(name) }))}
          <div class="ob-body stagger">
            <div class="goal-card"><div style="text-align:center;color:var(--muted);font-weight:800">${t('goalLabel')}</div>
              <div class="big-num"><span id="goalNum">0</span> <small>ml</small></div>
              <div style="text-align:center;color:var(--muted);font-weight:700">${t('glasses', { n: Math.ceil(baseGoal() / 250) })}</div>
              <ul class="breakdown">
                <li>${t('weightRow', { w: p.weight })}${g.f !== 1 ? ` × ${g.f}` : ''}<b>${fmt(p.weight * 33 * g.f)} ml</b></li>
                <li>${t('activityRow', { a: aLabel })}<b>+${a.add} ml</b></li>
                <li>${t('weatherRow', { f: w ? Math.round(w.feels) : 0 })}<b>${bonus ? '+' + bonus : '+0'} ml</b></li>
              </ul></div>
            <p class="ob-sub" style="margin-top:4px">${t('goalNote')}</p>
          </div>
          <div class="ob-foot"><button class="cta" data-act="next">${t('goalCta')}</button></div>`;
        mount = (el) => {
          const cat = mountCat(el, { level: 1 });
          setTimeout(() => Meowie.act(cat, 'jump'), 500);
          countUp($('#goalNum', el), baseGoal() + bonus, 1200);
        };
        break;
      }

      case 'notify':
        html = `${chrome(step)}${hero(t('notifySay'))}
          <div class="ob-body stagger"><h1 class="ob-title">${t('notifyTitle')}</h1>
          <p class="ob-sub">${t('notifySub', { wake: p.wake, sleep: p.sleep })}</p>
          <div class="card" style="display:flex;gap:12px;align-items:center"><span style="font-size:30px">🦈</span>
            <div><b>Meowie</b><div style="color:var(--muted);font-size:14px">${t('notifySample', { name: esc(name) })}</div></div></div></div>
          <div class="ob-foot"><button class="cta" data-act="allow">${t('allow')}</button>
          <button class="cta ghost" data-act="finish">${t('later')}</button></div>`;
        mount = (el) => mountCat(el, { level: 1 });
        break;
    }

    show('ob-' + step, html, { back, onMount: mount });
  }

  function next() {
    if (stepIdx < STEPS.length - 1) goStep(stepIdx + 1);
    else finishOnboarding();
  }
  function prev() {
    let i = stepIdx - 1;
    if (STEPS[i] === 'calc') i--;
    if (i >= 0) goStep(i, true);
  }

  async function finishOnboarding(allow) {
    if (allow && 'Notification' in window) {
      try { state.profile.remind = (await Notification.requestPermission()) === 'granted'; } catch {}
    }
    state.onboarded = true;
    save();
    fetchWeather();
    $('#tabbar').hidden = false;
    renderHome(true);
    setTimeout(() => toast(t('welcomeToast', { name: friend() })), 500);
  }

  app.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act],[data-pick]');
    if (!t || !t.closest('.screen.active')) return;
    const act = t.dataset.act;
    if (t.dataset.pick) {
      state.profile[t.dataset.pick] = t.dataset.val;
      save();
      t.parentElement.querySelectorAll('.option').forEach((o) => o.classList.toggle('sel', o === t));
      const cta = $('.screen.active [data-act="next"]');
      if (cta) cta.disabled = false;
      const cat = $('.screen.active .cat-wrap');
      if (t.dataset.pick !== 'city') setTimeout(next, 380);
      return;
    }
    if (act === 'next') next();
    else if (act === 'back') stepIdx === 0 ? null : prev();
    else if (act === 'skip') next();
    else if (act === 'allow') finishOnboarding(true);
    else if (act === 'finish') finishOnboarding(false);
    else if (act === 'demo') runDemo();
    else if (act === 'lang') openLangSheet();
    else if (act === 'start') goStep(0);
  });

  // Fills a sample profile so people can peek at the home screen first.
  function runDemo() {
    Object.assign(state.profile, { name: state.profile.name, gender: 'rahsia', weight: 60, activity: 'sederhana', city: 'Kuala Lumpur' });
    finishOnboarding(false);
  }

  // ---------- splash ----------
  function splash() {
    const drops = Array.from({ length: 14 }, (_, i) =>
      `<span style="left:${(i * 7.3 + 3) % 100}%;animation-duration:${1.6 + (i % 5) * .35}s;animation-delay:${(i % 7) * .25}s"></span>`).join('');
    show('splash', `<div class="drops">${drops}</div>${hero('', { intro: true })}<h1>Minum Air</h1><p>${t('splashSub')}</p>`, {
      onMount: (el) => {
        el.classList.add('splash');
        const cat = mountCat(el, { size: 340, level: .3 });
        setTimeout(() => Meowie.act(cat, 'drink'), 1200);
        el.addEventListener('click', () => leave());
        let left = false;
        function leave() { if (left) return; left = true; state.onboarded ? enterHome() : goStep(0); }
        setTimeout(leave, 3000);
      },
    });
  }
  function enterHome() {
    $('#tabbar').hidden = false;
    renderHome(true);
  }

  // ---------- home ----------
  function greeting() {
    const h = myHour();
    const g = t('greet');
    return g[h < 12 ? 0 : h < 14 ? 1 : h < 19 ? 2 : 3];
  }
  function catLine(d, pct) {
    const w = todaysWeather();
    const hot = w && w.feels >= HEAT_START;
    const n = esc(state.profile.name || t('boss'));
    const lines = L().lines;
    const kind = pct >= 1 ? 'done' : pct >= .75 ? 'close' : pct >= .5 ? 'half' : pct > 0 ? (hot ? 'someHot' : 'some') : (hot ? 'noneHot' : 'none');
    return lines[kind]({ n, f: w ? Math.round(w.feels) : 0, greet: greeting() });
  }

  const bracket = (pct) => (pct >= 1 ? 4 : pct >= .75 ? 3 : pct >= .5 ? 2 : pct > 0 ? 1 : 0);

  let homeCat = null;
  let tapCount = 0;
  let lastAddedT = 0;
  let shownPct = 0;
  let tab = 'home';

  function renderHome(first) {
    if (tab !== 'home') return renderTab(tab);
    const d = today();
    const drunk = total(d);
    const pct = drunk / d.goal;
    const w = todaysWeather();
    const lines = catLine(d, pct);
    const name = esc(friend());
    const dateStr = new Intl.DateTimeFormat(L()._locale, { timeZone: 'Asia/Kuala_Lumpur', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    const bonus = heatBonus(w && w.feels);
    const html = `
      <div class="home-head"><div><h2>${greeting()}${t('comma')}${name}</h2><p>${dateStr}</p></div>
        <span class="pill fire" title="Streak">🔥 ${streakCount()}</span></div>
      <span class="pill weather-chip">${w ? (w.feels >= HEAT_START ? '☀️' : '⛅') : '🌤️'} ${esc(state.profile.city || 'Malaysia')} ·
        ${w ? `${t('feels', { f: Math.round(w.feels) })}${bonus ? ` · ${t('goalPlus', { b: bonus })}` : ''}` : t('loadingWeather')}</span>
      <div class="stage"><div class="bubble-say" id="say" data-bracket="${bracket(pct)}">${lines[0]}</div><div class="hero-cat"></div></div>
      <div class="stats-row"><div class="pct"><span id="pctNum">${Math.round(shownPct * 100)}</span>%</div>
        <div class="ml"><b id="mlNum">${fmt(drunk)}</b> / ${fmt(d.goal)} ml</div></div>
      <div class="add-main"><button class="cta" id="quickAdd">${cupSvg(DRINKS[0]).replace('<svg', '<svg style="width:26px;height:32px"')} ${t('addWater', { ml: state.lastSize })}</button>
        <button class="add-more" id="moreBtn" aria-label="${t('otherDrinks')}">+</button></div>
      <p class="hold-hint">${t('holdHint')}</p>
      <div class="drinks" id="drinkRow">${DRINKS.slice(1).map((x) =>
        `<button class="drink-chip" data-drink="${x.id}">${cupSvg(x)}<b>${drinkName(x)}</b></button>`).join('')}</div>
      <div class="section-title">${t('today')} <small>${t('drinksCount', { n: d.log.length })}</small></div>
      <ul class="log">${d.log.length ? d.log.slice().reverse().map((x) => {
        const dr = DRINKS.find((k) => k.id === x.drink) || DRINKS[0];
        return `<li class="${x.t === lastAddedT ? 'new' : ''}">${cupSvg(dr)}<div class="t"><b>${drinkName(dr)} · ${x.ml} ml</b><small>${timeStr(x.t)}${x.eff !== x.ml ? ` · ${t('countsAs', { ml: x.eff })}` : ''}</small></div>
          <button class="del" data-del="${x.t}" aria-label="${t('del')}">✕</button></li>`;
      }).join('') : `<li class="empty">${t('empty')}</li>`}</ul>`;

    if (current === 'home' && screenEl) {
      // Re-render in place around the existing stage. Moving the cat out of the
      // document would cancel its water transition, so the stage never leaves.
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const kids = [...tmp.children];
      const si = kids.findIndex((k) => k.classList.contains('stage'));
      const stage = $('.stage', screenEl);
      [...screenEl.children].forEach((c) => { if (c !== stage) c.remove(); });
      kids.slice(0, si).forEach((k) => stage.before(k));
      kids.slice(si + 1).reverse().forEach((k) => stage.after(k));
      const say = $('#say', screenEl);
      if (say.dataset.bracket !== String(bracket(pct))) { say.dataset.bracket = bracket(pct); say.innerHTML = lines[0]; }
      wireHome(screenEl, pct);
    } else {
      show('home', html, {
        onMount: (el) => {
          el.classList.add('home');
          homeCat = Meowie.create({ intro: first });
          $('.hero-cat', el).appendChild(homeCat);
          shownPct = 0;
          wireHome(el, pct);
        },
      });
    }
    lastAddedT = 0;
    setTab('home');
  }

  function wireHome(el, pct) {
    Meowie.setLevel(homeCat, pct);
    animateNumber($('#pctNum', el), shownPct * 100, Math.min(999, pct * 100), 900);
    shownPct = pct;
    // Tap adds a glass; press and hold opens the pour sheet to change the amount.
    const quick = $('#quickAdd', el);
    let holdTimer;
    let held = false;
    quick.addEventListener('pointerdown', () => {
      held = false;
      holdTimer = setTimeout(() => { held = true; if (navigator.vibrate) navigator.vibrate(15); openSheet('air'); }, 450);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => quick.addEventListener(ev, () => clearTimeout(holdTimer)));
    quick.addEventListener('contextmenu', (e) => e.preventDefault());
    quick.addEventListener('click', (e) => { if (held) { held = false; return; } addDrink(DRINKS[0], state.lastSize, e.currentTarget); });
    $('#moreBtn', el).addEventListener('click', () => openSheet());
    el.querySelectorAll('[data-drink]').forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.drink)));
    el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => removeDrink(Number(b.dataset.del))));
    homeCat.onclick = () => {
      tapCount++;
      Meowie.act(homeCat, tapCount % 2 ? 'jump' : 'swim');
      const lines = catLine(today(), shownPct);
      const say = $('#say', el);
      say.textContent = lines[Math.floor(Math.random() * lines.length)];
      say.style.animation = 'none'; void say.offsetWidth; say.style.animation = '';
    };
  }

  function addDrink(drink, ml, fromEl) {
    const d = today();
    const before = total(d);
    const eff = Math.round(ml * drink.hyd);
    lastAddedT = Date.now();
    d.log.push({ drink: drink.id, ml, eff, t: lastAddedT });
    if (drink.id === 'air') state.lastSize = ml;
    save();
    if (navigator.vibrate) navigator.vibrate(20);
    if (fromEl) flyDrops(fromEl);
    const after = total(d);
    const hit = before < d.goal && after >= d.goal;
    // Meowie laps from the glass while the tank fills, then leaps if the goal is reached.
    setTimeout(() => {
      const drinking = Meowie.act(homeCat, 'drink');
      setTimeout(() => renderHome(false), 600);
      toast(hit ? t('goalHit') : `+${eff} ml ${drink.id === 'air' ? '💧' : `(${drinkName(drink)})`}`);
      if (hit) drinking.then(() => { confetti(); Meowie.act(homeCat, 'jump'); });
    }, fromEl ? 420 : 0);
  }
  function removeDrink(t) {
    const d = today();
    d.log = d.log.filter((x) => x.t !== t);
    save();
    renderHome(false);
  }

  // ---------- bottom sheet ----------
  const sheet = $('#sheet');
  const sheetBg = $('#sheetBg');
  const POUR_MAX = 1000;
  const POUR_MIN = 50;
  const GLASS = 'M12 8 H108 L98 186 Q97 194 88 194 H32 Q23 194 22 186 Z';
  const pourY = (ml) => 194 - (ml / POUR_MAX) * 184;
  const sizeName = (ml) => t('sizes')[ml <= 175 ? 0 : ml <= 325 ? 1 : ml <= 500 ? 2 : 3];

  function pourSvg(d, ml) {
    let wave = 'M-120 5';
    for (let x = -120; x < 240; x += 40) wave += ` Q${x + 10} 0 ${x + 20} 5 T${x + 40} 5`;
    wave += ' V240 H-120 Z';
    const ticks = [250, 500, 750].map((v) => `<path d="M82 ${pourY(v)} H96" stroke="var(--cup-line)" stroke-width="2" opacity=".5"/>
      <text x="78" y="${pourY(v) + 4}" text-anchor="end" class="pour-tick">${v}</text>`).join('');
    return `<svg viewBox="0 0 132 200" aria-hidden="true">
      <clipPath id="pourClip"><path d="${GLASS}"/></clipPath>
      <path d="${GLASS}" fill="var(--bg)"/>
      <g clip-path="url(#pourClip)"><g class="pour-liquid" style="transform: translateY(${pourY(ml)}px)">
        <g class="pour-wave"><path d="${wave}" fill="${d.color}"/></g>
        <circle class="pour-bub" cx="44" cy="60" r="3" fill="#fff" opacity=".6"/><circle class="pour-bub b2" cx="70" cy="90" r="2.4" fill="#fff" opacity=".6"/>
      </g></g>
      ${ticks}
      <path d="${GLASS}" fill="none" stroke="var(--cup-line)" stroke-width="3" stroke-linejoin="round"/>
      <path d="M24 22 L32 170" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>
      <g class="pour-handle" style="transform: translateY(${pourY(ml)}px)">
        <rect x="100" y="-15" width="30" height="30" rx="15" fill="var(--brand)"/>
        <path d="M115 -8 L110 -3 H120 Z M115 8 L110 3 H120 Z" fill="var(--brand-ink)"/>
      </g>
    </svg>`;
  }

  function openSheet(drinkId) {
    let drink = DRINKS.find((x) => x.id === drinkId);
    let size = state.lastSize;
    function draw() {
      if (!drink) {
        sheet.innerHTML = `<div class="grab"></div><h3 style="font-size:22px">${t('pickDrink')}</h3>
          <div class="drink-grid">${DRINKS.map((x) => `<button class="drink-chip" data-pick-drink="${x.id}">${cupSvg(x)}<b>${drinkName(x)}</b></button>`).join('')}</div>`;
        sheet.querySelectorAll('[data-pick-drink]').forEach((b) => b.addEventListener('click', () => { drink = DRINKS.find((x) => x.id === b.dataset.pickDrink); draw(); }));
        return;
      }
      sheet.innerHTML = `<div class="grab"></div>
        <div class="sheet-head">${cupSvg(drink)}<div><h3>${drinkName(drink)}</h3>
          <p>${drink.hyd === 1 ? t('full') : t('partial', { p: Math.round(drink.hyd * 100) })}</p></div></div>
        <div class="pour">
          <div class="pour-glass" id="pour" role="slider" tabindex="0" aria-label="${t('amount')}" aria-valuemin="${POUR_MIN}" aria-valuemax="${POUR_MAX}" aria-valuenow="${size}">${pourSvg(drink, size)}</div>
          <div class="pour-read"><div class="pour-ml"><span id="pourMl">${size}</span><small>ml</small></div>
            <div class="pour-name" id="pourName">${sizeName(size)}</div>
            <div class="pour-hint"><span>↕</span> ${t('dragHint')}</div></div>
        </div>
        <div class="sizes">${SIZES.map((ml) => `<button class="${ml === size ? 'sel' : ''}" data-size="${ml}">${ml}<small>${sizeName(ml)}</small></button>`).join('')}</div>
        <button class="cta" id="sheetAdd">${t('add', { ml: size })}</button>`;

      const pour = $('#pour', sheet);
      const svgEl = $('svg', pour);
      function update() {
        const y = pourY(size);
        $('.pour-liquid', pour).style.transform = `translateY(${y}px)`;
        $('.pour-handle', pour).style.transform = `translateY(${y}px)`;
        $('#pourMl', sheet).textContent = size;
        $('#pourName', sheet).textContent = sizeName(size);
        pour.setAttribute('aria-valuenow', size);
        sheet.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('sel', Number(b.dataset.size) === size));
        $('#sheetAdd', sheet).textContent = t('add', { ml: size });
      }
      function setSize(ml, haptic) {
        const v = Math.max(POUR_MIN, Math.min(POUR_MAX, Math.round(ml / 50) * 50));
        if (v === size) return;
        size = v;
        update();
        if (haptic && navigator.vibrate) navigator.vibrate(4);
      }
      function fromPointer(e) {
        const r = svgEl.getBoundingClientRect();
        const ly = ((e.clientY - r.top) / r.height) * 200;
        setSize(((194 - ly) / 184) * POUR_MAX, true);
      }
      pour.addEventListener('pointerdown', (e) => { pour.setPointerCapture(e.pointerId); pour.classList.add('dragging'); fromPointer(e); });
      pour.addEventListener('pointermove', (e) => { if (pour.classList.contains('dragging')) fromPointer(e); });
      ['pointerup', 'pointercancel'].forEach((ev) => pour.addEventListener(ev, () => pour.classList.remove('dragging')));
      pour.addEventListener('keydown', (e) => {
        const step = { ArrowUp: 50, ArrowRight: 50, ArrowDown: -50, ArrowLeft: -50 }[e.key];
        if (step) { e.preventDefault(); setSize(size + step); }
      });
      sheet.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => setSize(Number(b.dataset.size))));
      $('#sheetAdd', sheet).addEventListener('click', (e) => { const btn = e.currentTarget; closeSheet(); addDrink(drink, size, btn); });
    }
    draw();
    openSheetEl();
  }

  // Swipe the sheet down by its handle to close it.
  function openSheetEl() {
    sheet.style.transform = '';
    sheet.classList.add('open');
    sheetBg.classList.add('open');
    const grab = $('.grab', sheet);
    if (!grab) return;
    let y0 = null;
    grab.addEventListener('pointerdown', (e) => { y0 = e.clientY; grab.setPointerCapture(e.pointerId); sheet.classList.add('dragging'); });
    grab.addEventListener('pointermove', (e) => {
      if (y0 == null) return;
      sheet.style.transform = `translate(-50%, ${Math.max(0, e.clientY - y0)}px)`;
    });
    const end = (e) => {
      if (y0 == null) return;
      const dy = e.clientY - y0;
      y0 = null;
      sheet.classList.remove('dragging');
      sheet.style.transform = '';
      if (dy > 80) closeSheet();
    };
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
  }
  function openLangSheet() {
    sheet.innerHTML = `<div class="grab"></div><h3 style="font-size:22px">🌐 ${t('chooseLang')}</h3>
      <div style="display:grid;gap:10px;margin-top:14px">${LANGS.map((k) =>
        `<button class="option ${k === state.lang ? 'sel' : ''}" data-lang="${k}"><b>${I18N[k]._label}</b></button>`).join('')}</div>`;
    sheet.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { closeSheet(); setLang(b.dataset.lang); }));
    openSheetEl();
  }
  function setLang(lang) {
    if (!I18N[lang] || lang === state.lang) return;
    state.lang = lang;
    save();
    applyLang();
    // Redraw whatever is on screen in the new language.
    if (current && current.startsWith('ob-')) goStep(stepIdx, true);
    else if (current === 'home') { current = null; renderHome(false); }
    else if (current) renderTab(tab);
  }
  function closeSheet() { sheet.classList.remove('open'); sheetBg.classList.remove('open'); }
  sheetBg.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  // ---------- tabs ----------
  function setTab(t) {
    tab = t;
    document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  }
  $('#tabbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b || b.dataset.tab === tab) return;
    setTab(b.dataset.tab);
    renderTab(b.dataset.tab);
  });
  function renderTab(t) {
    if (t === 'home') { current = null; return renderHome(false); }
    if (t === 'history') return renderHistory();
    if (t === 'profile') return renderProfile();
  }

  function renderHistory() {
    const dayName = (k) => new Intl.DateTimeFormat(L()._locale, { weekday: 'short' }).format(new Date(k + 'T12:00:00'));
    today();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const k = dayKey(new Date(Date.now() - i * 864e5));
      const r = state.days[k];
      days.push({ k, i, ml: r ? total(r) : 0, goal: (r && r.goal) || baseGoal() });
    }
    const all = Object.values(state.days).filter((r) => r.goal);
    const hit = all.filter((r) => total(r) >= r.goal).length;
    const avg = days.reduce((s, x) => s + x.ml, 0) / 7;
    const cups = all.reduce((s, r) => s + r.log.length, 0);
    let best = 0, run = 0;
    Object.keys(state.days).sort().forEach((k) => { const r = state.days[k]; run = r.goal && total(r) >= r.goal ? run + 1 : 0; best = Math.max(best, run); });
    show('history', `<h2 style="font-size:28px;margin-top:6px">${t('histTitle')}</h2>
      <div class="card"><div class="section-title" style="margin:0 0 14px">${t('last7')} <small>${t('pctGoal')}</small></div>
        <div class="week">${days.map((x) => `<div class="bar ${x.i === 0 ? 'today' : ''}" title="${x.k}: ${fmt(x.ml)}/${fmt(x.goal)} ml">
          <div class="b ${x.ml >= x.goal ? 'hit' : ''}"><i data-h="${Math.min(100, Math.round(x.ml / x.goal * 100))}"></i></div>
          <span>${dayName(x.k)}</span></div>`).join('')}</div></div>
      <div class="tiles stagger">
        <div class="tile"><div class="v">🔥 ${streakCount()}</div><div class="l">${t('streakNow')}</div></div>
        <div class="tile"><div class="v">🏆 ${best}</div><div class="l">${t('streakBest')}</div></div>
        <div class="tile"><div class="v">${fmt(avg)}</div><div class="l">${t('avg')}</div></div>
        <div class="tile"><div class="v">${hit}</div><div class="l">${t('daysHit')}</div></div>
        <div class="tile"><div class="v">${cups}</div><div class="l">${t('logged')}</div></div>
        <div class="tile"><div class="v">${fmt(baseGoal())}</div><div class="l">${t('baseGoal')}</div></div>
      </div>`, {
      onMount: (el) => {
        el.classList.add('home');
        setTimeout(() => el.querySelectorAll('.week i').forEach((i) => { i.style.height = i.dataset.h + '%'; }), 120);
      },
    });
  }

  function renderProfile() {
    const p = state.profile;
    const opt = (labels, v) => Object.entries(labels).map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${Array.isArray(l) ? l[0] : l}</option>`).join('');
    show('profile', `<h2 style="font-size:28px;margin-top:6px">${t('profTitle')}</h2>
      ${hero(t('profSay'))}
      <div class="card">
        <div class="prof-row"><span>${t('pLang')}</span><select id="pLang">${LANGS.map((k) => `<option value="${k}" ${k === state.lang ? 'selected' : ''}>${I18N[k]._label}</option>`).join('')}</select></div>
        <div class="prof-row"><span>${t('pName')}</span><input id="pName" value="${esc(p.name)}" maxlength="20"></div>
        <div class="prof-row"><span>${t('pGender')}</span><select id="pGender">${opt(L().gender, p.gender)}</select></div>
        <div class="prof-row"><span>${t('pWeight')}</span><input id="pWeight" type="number" min="30" max="150" value="${p.weight}" style="width:90px"></div>
        <div class="prof-row"><span>${t('pActivity')}</span><select id="pAct">${opt(L().activity, p.activity)}</select></div>
        <div class="prof-row"><span>${t('pCity')}</span><select id="pCity">${CITIES.map(([c]) => `<option ${c === p.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="prof-row"><span>${t('pTimes')}</span><span><input id="pWake" type="time" value="${p.wake}"> <input id="pSleep" type="time" value="${p.sleep}"></span></div>
        <div class="prof-row"><span>${t('pBase')}</span><b id="pGoal">${fmt(baseGoal())} ml</b></div>
      </div>
      <button class="danger" id="pReset">${t('reset')}</button>`, {
      onMount: (el) => {
        el.classList.add('home');
        mountCat(el, { size: 220, level: Math.min(1, total(today()) / today().goal) });
        const bind = (id, key, num) => $(id, el).addEventListener('change', (e) => {
          const v = num ? Math.max(30, Math.min(150, Number(e.target.value) || p[key])) : e.target.value;
          if (key === 'city' && v !== p.city) { state.weather = null; }
          p[key] = v;
          save();
          $('#pGoal', el).textContent = fmt(baseGoal()) + ' ml';
          if (key === 'city') fetchWeather();
          toast(t('saved'));
        });
        bind('#pName', 'name'); bind('#pGender', 'gender'); bind('#pWeight', 'weight', true); bind('#pAct', 'activity');
        bind('#pCity', 'city'); bind('#pWake', 'wake'); bind('#pSleep', 'sleep');
        $('#pLang', el).addEventListener('change', (e) => setLang(e.target.value));
        $('#pReset', el).addEventListener('click', () => {
          if (!confirm(t('resetConfirm'))) return;
          try { localStorage.removeItem(STORE_KEY); } catch {}
          location.reload();
        });
      },
    });
  }

  // ---------- motion helpers ----------
  function countUp(el, to, dur) { animateNumber(el, 0, to, dur, true); }
  function animateNumber(el, from, to, dur, comma) {
    if (!el) return;
    const t0 = performance.now();
    (function f(now) {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = from + (to - from) * e;
      el.textContent = comma ? fmt(v) : Math.round(v);
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  // Water droplets arc from the tapped button into Meowie's tank.
  function flyDrops(fromEl) {
    if (!homeCat) return;
    const a = fromEl.getBoundingClientRect();
    const b = homeCat.getBoundingClientRect();
    for (let i = 0; i < 7; i++) {
      const dot = document.createElement('div');
      dot.className = 'drop-fx';
      const sx = a.left + a.width / 2 + (Math.random() - .5) * 60;
      const sy = a.top + 10;
      const ex = b.left + b.width / 2 + (Math.random() - .5) * 60;
      const ey = b.top + b.height * .55;
      dot.style.left = sx + 'px';
      dot.style.top = sy + 'px';
      document.body.appendChild(dot);
      dot.animate([
        { transform: 'translate(0,0) scale(.6)', opacity: 0 },
        { transform: `translate(${(ex - sx) / 2}px, ${ey - sy - 90}px) scale(1)`, opacity: 1, offset: .5 },
        { transform: `translate(${ex - sx}px, ${ey - sy}px) scale(.4)`, opacity: .2 },
      ], { duration: 520 + i * 40, easing: 'cubic-bezier(.3,.6,.4,1)', delay: i * 25 }).onfinish = () => dot.remove();
    }
  }

  // Confetti in Jalur Gemilang colours.
  const fx = $('#fx');
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = fx.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    fx.width = innerWidth * dpr; fx.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#cc0001', '#ffffff', '#010066', '#ffcc00', '#5cc4ff'];
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 12, vy: -Math.random() * 13 - 4,
      r: Math.random() * 6 + 4, c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * 6, va: (Math.random() - .5) * .4,
    }));
    const t0 = performance.now();
    (function f(now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.strokeRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      });
      if (now - t0 < 2600) requestAnimationFrame(f); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  // ---------- reminders (only while the app is open or in the background tab) ----------
  function inWakeWindow() {
    const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number);
    const now = h * 60 + m;
    const toMin = (s) => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
    const w = toMin(state.profile.wake), s = toMin(state.profile.sleep);
    return w < s ? now >= w && now < s : now >= w || now < s;
  }
  let lastNudge = 0;
  setInterval(() => {
    if (!state.onboarded) return;
    const d = today();
    if (total(d) >= d.goal || !inWakeWindow()) return;
    const last = d.log.length ? d.log[d.log.length - 1].t : 0;
    const gap = 2 * 3600e3;
    if (Date.now() - Math.max(last, lastNudge) < gap) return;
    lastNudge = Date.now();
    const body = t('remind', { name: friend() });
    if (state.profile.remind && 'Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((r) => r.showNotification('Meowie 🦈', { body, icon: '/icon.svg', tag: 'minum' })).catch(() => {});
    } else if (!document.hidden) toast(body);
  }, 60e3);

  // New day while open → refresh.
  let lastDay = dayKey();
  setInterval(() => {
    if (dayKey() !== lastDay) { lastDay = dayKey(); fetchWeather(); if (current === 'home') renderHome(false); }
  }, 60e3);

  // ---------- boot ----------
  applyLang();
  if (state.onboarded) fetchWeather();
  splash();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();
