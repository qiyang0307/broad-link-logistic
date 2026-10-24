// Minum Air: onboarding flow + home screen. All state lives in localStorage.
(() => {
  const STORE_KEY = 'minum-air:v2';
  const HEAT_START = 32;      // feels-like °C where extra water kicks in
  const HEAT_STEP = 250;      // +250 ml at 32 °C, and again for every 2 °C above
  const HEAT_MAX = 1250;

  // Where you stay: the Malaysian states and federal territories, and Singapore. The weather is
  // read at each one's capital.
  const CITIES = [
    ['Johor', 1.493, 103.741], ['Kedah', 6.121, 100.367], ['Kelantan', 6.125, 102.238],
    ['Melaka', 2.189, 102.250], ['Negeri Sembilan', 2.726, 101.938], ['Pahang', 3.817, 103.326],
    ['Penang', 5.414, 100.329], ['Perak', 4.597, 101.090], ['Perlis', 6.441, 100.198],
    ['Sabah', 5.980, 116.073], ['Sarawak', 1.553, 110.359], ['Selangor', 3.073, 101.519],
    ['Terengganu', 5.329, 103.137], ['Kuala Lumpur', 3.139, 101.687], ['Putrajaya', 2.926, 101.696],
    ['Labuan', 5.280, 115.242], ['Singapore', 1.352, 103.820],
  ];
  // Profiles saved before states replaced cities.
  const OLD_CITY = {
    'Shah Alam': 'Selangor', 'Petaling Jaya': 'Selangor', 'George Town': 'Penang', Ipoh: 'Perak', 'Alor Setar': 'Kedah',
    Kangar: 'Perlis', 'Kota Bharu': 'Kelantan', 'Kuala Terengganu': 'Terengganu', Kuantan: 'Pahang', Seremban: 'Negeri Sembilan',
    'Johor Bahru': 'Johor', 'Kota Kinabalu': 'Sabah', Sandakan: 'Sabah', Tawau: 'Sabah', Kuching: 'Sarawak', Miri: 'Sarawak', Sibu: 'Sarawak',
  };

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
  // How Meowie behaves for each activity level on the setup screen.
  const VIBE = { santai: 'relax', sederhana: 'walk', aktif: 'hyper' };
  // Each choice gets a Meowie: the cool one, the lovey one, and the one hiding in his box.
  const GENDER = {
    lelaki: { ic: '<img class="ic-av" src="av/08.jpg" alt="">', f: 1 },
    perempuan: { ic: '<img class="ic-av" src="av/16.jpg" alt="">', f: .92 },
    rahsia: { ic: '<img class="ic-av" src="av/09.jpg" alt="">', f: .96 },
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
    lang: 'en',
  }, load());
  // The blue button always adds one 250 ml glass; a held press or the pour sheet changes only that drink.
  const QUICK_ML = 250;
  delete state.lastSize;
  if (OLD_CITY[state.profile.city]) { state.profile.city = OLD_CITY[state.profile.city]; state.weather = null; }
  if (!state.profile.age) state.profile.age = 30;

  // ---------- i18n ----------
  const I18N = window.MA_I18N;
  const LANGS = Object.keys(I18N);
  const L = () => I18N[state.lang] || I18N.en;
  function t(key, params) {
    const v = L()[key] !== undefined ? L()[key] : I18N.en[key];
    return typeof v === 'function' ? v(params || {}) : v;
  }
  const drinkName = (d) => (d.custom ? esc(d.name) : L().drinks[d.id]);
  // Built-in drinks plus the ones the user made.
  const allDrinks = () => DRINKS.concat(state.customDrinks || []);
  const findDrink = (id) => allDrinks().find((k) => k.id === id) || DRINKS[0];
  const PAW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><ellipse cx="6.2" cy="10.2" rx="2.1" ry="2.6" transform="rotate(-18 6.2 10.2)"/><ellipse cx="17.8" cy="10.2" rx="2.1" ry="2.6" transform="rotate(18 17.8 10.2)"/><ellipse cx="9.6" cy="6.2" rx="2.1" ry="2.7"/><ellipse cx="14.4" cy="6.2" rx="2.1" ry="2.7"/><path d="M12 11.6c-2.6 0-5.4 3.4-5.4 5.6 0 1.6 1.2 2.4 2.6 2.4 1.1 0 1.8-.6 2.8-.6s1.7.6 2.8.6c1.4 0 2.6-.8 2.6-2.4 0-2.2-2.8-5.6-5.4-5.6Z"/></svg>';
  const CUP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 4h9v5.2a4.5 4.5 0 0 1-9 0V4ZM7.5 6H5c-.3 0-.5.2-.5.5 0 2.3 1.3 3.8 3.3 4.1M16.5 6H19c.3 0 .5.2.5.5 0 2.3-1.3 3.8-3.3 4.1M12 13.7v3.3M9 20h6M10 17h4v3h-4z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  const CHART_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8.5 16.5v-3M12 16.5v-7M15.5 16.5v-5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
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

  // Water per kg of body weight by age: younger bodies need a little more, over 55 a little less.
  const mlPerKg = (age) => (age < 30 ? 35 : age <= 55 ? 33 : 30);
  function baseGoal(p = state.profile) {
    const g = GENDER[p.gender] || GENDER.rahsia;
    const a = ACTIVITY[p.activity] || ACTIVITY.santai;
    const raw = p.weight * mlPerKg(p.age || 30) * g.f + a.add;
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

  // ---------- Meowie's worlds ----------
  // Backgrounds earned by reaching the daily goal: the reef on the first full day, the pool after three.
  const SCENES = [{ id: 'classic', need: 0 }, { id: 'reef', need: 1, img: 'bg-reef' }, { id: 'pool', need: 3, img: 'bg-pool' }];
  const daysHit = () => Object.values(state.days).filter((r) => r.goal && total(r) >= r.goal).length;
  const unlockedScenes = (hits = daysHit()) => SCENES.filter((x) => hits >= x.need).map((x) => x.id);
  const currentScene = () => (unlockedScenes().includes(state.scene) ? state.scene : 'classic');
  const sceneIsNew = () => unlockedScenes().some((id) => id !== 'classic' && !(state.scenesSeen || []).includes(id));
  function setSceneChoice(id) {
    state.scene = id;
    save();
    if (homeCat) Meowie.setScene(homeCat, id);
  }

  let weatherFailed = false;
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
    } catch {
      // Offline or blocked: keep the base goal and stop showing the loading text.
      weatherFailed = true;
      if (current === 'home') renderHome(false);
    }
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
  const STEPS = ['welcome', 'name', 'gender', 'age', 'weight', 'activity', 'city', 'times', 'calc', 'goal', 'notify'];
  const PROGRESS_STEPS = ['name', 'gender', 'age', 'weight', 'activity', 'city', 'times', 'goal', 'notify'];
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
    // On the setup screens Meowie just idles: no swimming, tricks or mood moves.
    const cat = Meowie.create({ intro: intro || holder.dataset.intro === '1', calm: true });
    cat.style.width = size + 'px';
    holder.appendChild(cat);
    Meowie.interact(cat);
    requestAnimationFrame(() => Meowie.setLevel(cat, level));
    return cat;
  }

  function goStep(i, back = false) {
    stepIdx = i;
    setTimeout(syncBack, 0);
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
</div>`;
        mount = (el) => {
          const cat = mountCat(el, { size: 320, level: 0 });
          // Demo: the water fills drink by drink in different colours, then drains and repeats.
          const colors = ['#3fb4f0', '#8fd14f', '#c98b4e', '#ffb02e', '#f39bb7', '#4a2c1a'];
          let n = 0;
          (function step() {
            if (!cat.isConnected) return;
            n = (n + 1) % 6;
            Meowie.setLayers(cat, colors.slice(0, n).map((c) => ({ color: c, w: 1 })));
            Meowie.setLevel(cat, n * .13);
            setTimeout(step, n === 5 ? 2200 : 1100);
          })();
        };
        break;

      case 'name':
        // A name is needed: Meowie greets you by it everywhere, so Next waits for one.
        html = `${chrome(step)}${hero(t('nameSay'))}
          <div class="ob-body stagger"><h1 class="ob-title">${t('nameTitle')}</h1><p class="ob-sub">${t('nameSub')}</p>
          <input class="field" id="nameIn" maxlength="20" placeholder="${t('namePh')}" value="${esc(p.name)}" autocomplete="given-name">
          <p class="field-hint" id="nameHint" hidden>${t('nameNeed')}</p></div>
          <div class="ob-foot"><button class="cta" data-act="next" ${p.name ? '' : 'disabled'}>${t('next')}</button></div>`;
        mount = (el) => {
          mountCat(el, { level: fill });
          const inp = $('#nameIn', el);
          const btn = $('[data-act=next]', el);
          const hint = $('#nameHint', el);
          inp.addEventListener('input', () => { p.name = inp.value.trim(); save(); btn.disabled = !p.name; if (p.name) hint.hidden = true; });
          inp.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            if (p.name) next();
            else { hint.hidden = false; inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); }
          });
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

      case 'age':
        html = `${chrome(step)}${hero(t('ageSay'))}
          <div class="ob-body"><h1 class="ob-title">${t('ageTitle')}</h1><p class="ob-sub">${t('ageSub')}</p>
          <div class="big-num"><span id="aNum">${p.age}</span> <small>${t('years')}</small></div>
          <div class="stepper"><button type="button" data-a="-1" aria-label="${t('less')}">−</button>
          <input type="range" id="aRange" min="10" max="90" value="${p.age}" aria-label="${t('ageTitle')}" style="max-width:200px">
          <button type="button" data-a="1" aria-label="${t('more')}">+</button></div></div>
          <div class="ob-foot"><button class="cta" data-act="next">${t('next')}</button></div>`;
        mount = (el) => {
          mountCat(el, { level: fill });
          const range = $('#aRange', el);
          const setA = (v) => {
            p.age = Math.max(10, Math.min(90, v));
            range.value = p.age;
            $('#aNum', el).textContent = p.age;
            save();
          };
          range.addEventListener('input', () => setA(Number(range.value)));
          el.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => setA(p.age + Number(b.dataset.a))));
        };
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
            // Meowie slims down or fills out with the weight.
            Meowie.setBuild(cat, (p.weight - 65) / 45);
            save();
          };
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
        mount = (el) => {
          const cat = mountCat(el, { level: fill });
          if (p.activity) Meowie.setVibe(cat, VIBE[p.activity]);
        };
        break;

      case 'city':
        html = `${chrome(step)}
          <h1 class="ob-title" style="margin-top:14px">${t('cityTitle')}</h1><p class="ob-sub">${t('citySub')}</p>
          <div class="ob-body scroll"><div class="city-list stagger">${CITIES.map(([c]) =>
            `<button class="option ${p.city === c ? 'sel' : ''}" data-pick="city" data-val="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
          <div class="ob-foot"><button class="cta" data-act="next" ${p.city ? '' : 'disabled'}>${t('next')}</button></div>`;
        mount = (el) => {
          el.classList.add('fixed-foot');
          const sel = $('.option.sel', el);
          if (sel) sel.scrollIntoView({ block: 'center', inline: 'nearest' });
        };
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
          <div class="orbit-wrap"><div class="clip-card"><video class="clip-vid" muted playsinline autoplay preload="auto" disablepictureinpicture loop><source src="meowie-look.mp4" type="video/mp4"><source src="meowie-look.webm" type="video/webm"></video></div><div class="orbit" aria-hidden="true">${orbitDots()}</div></div><div class="pct" id="calcPct">0%</div>
          <ul class="checks" id="checks">
            ${L().calc.map((f) => `<li>${f({ w: p.weight, a: p.age, city: esc(p.city) })}</li>`).join('')}
          </ul></div>`;
        mount = (el) => {
          el.classList.add('calc');
          fetchWeather();
          const items = el.querySelectorAll('#checks li');
          const t0 = performance.now();
          const dur = 4200;
          (function tick(now) {
            const k = Math.min(1, (now - t0) / dur);
            $('#calcPct', el).textContent = Math.round(k * 100) + '%';
            items.forEach((li, i) => li.classList.toggle('done', k >= (i + 1) / items.length - .02));
            if (k < 1) requestAnimationFrame(tick);
            else setTimeout(() => current === 'ob-calc' && next(), 1600);
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
                <li>${t('ageRow', { a: p.age })}<b>${mlPerKg(p.age)} ml/kg</b></li>
                <li>${t('weightRow', { w: p.weight, k: mlPerKg(p.age) })}${g.f !== 1 ? ` × ${g.f}` : ''}<b>${fmt(p.weight * mlPerKg(p.age) * g.f)} ml</b></li>
                <li>${t('activityRow', { a: aLabel })}<b>+${a.add} ml</b></li>
                <li>${t('weatherRow', { f: w ? Math.round(w.feels) : 0 })}<b>${bonus ? '+' + bonus : '+0'} ml</b></li>
              </ul></div>
            <p class="ob-sub" style="margin-top:4px">${t('goalNote')}</p>
          </div>
          <div class="ob-foot"><button class="cta" data-act="next">${t('goalCta')}</button></div>`;
        mount = (el) => {
          el.classList.add('icy');
          el.insertAdjacentHTML('afterbegin', iceField());
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
          <div class="card notify-card"><img class="notify-av" id="notifyAv" src="${avatarSrc(randomAvatar())}" alt="">
            <div><b>Meowie</b><div class="notify-line" id="notifyLine">${t('notifySample', { name: esc(name) })}</div></div></div></div>
          <div class="ob-foot"><button class="cta" data-act="allow">${t('allow')}</button>
          <button class="cta ghost" data-act="finish">${t('later')}</button></div>`;
        mount = (el) => {
          const cat = mountCat(el, { level: .6 });
          // Like a reminder preview: the message and Meowie's pose change every few seconds.
          const lines = t('notifyLines', { name: esc(name) });
          const acts = ['drink', 'jump', 'swim'];
          let i = 0;
          (function cycle() {
            setTimeout(() => {
              if (!cat.isConnected) return;
              i = (i + 1) % lines.length;
              const line = $('#notifyLine', el);
              line.classList.remove('swap'); void line.offsetWidth; line.classList.add('swap');
              setTimeout(() => { line.textContent = lines[i]; }, 180);
              const av = $('#notifyAv', el);
              if (av) { av.classList.remove('pop'); void av.offsetWidth; av.classList.add('pop'); setTimeout(() => { av.src = avatarSrc(randomAvatar(av)); }, 160); }
              Meowie.act(cat, acts[i % acts.length]);
              cycle();
            }, 2800);
          })();
        };
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
      // Activity choices show straight away on Meowie; the user moves on with Next.
      if (t.dataset.pick === 'activity') {
        const cw = $('.screen.active .cat-wrap');
        if (cw) Meowie.setVibe(cw, VIBE[t.dataset.val]);
      }
      return;
    }
    if (act === 'next') next();
    else if (act === 'back') stepIdx === 0 ? null : prev();
    else if (act === 'skip') next();
    else if (act === 'allow') finishOnboarding(true);
    else if (act === 'finish') finishOnboarding(false);
    else if (act === 'lang') openLangSheet();
    else if (act === 'start') goStep(0);
  });


  // ---------- splash ----------
  // Opening scene, also the loading screen: Meowie's intro film plays once with its own sound
  // on a fresh, clean water background while the app gets his animations ready. It can't be
  // skipped; it moves on once the film has finished and everything has loaded.
  function splash() {
    const bubbles = Array.from({ length: 12 }, (_, i) =>
      `<i style="left:${(i * 8.3 + 4) % 100}%;width:${6 + (i % 4) * 4}px;height:${6 + (i % 4) * 4}px;animation-duration:${5 + (i % 5)}s;animation-delay:${-(i * .7).toFixed(1)}s"></i>`).join('');
    const word = (w, cls) => [...w].map((ch, i) => `<span class="${cls}" style="animation-delay:${(.5 + i * .07).toFixed(2)}s">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    show('splash', `<div class="sp-bubbles" aria-hidden="true">${bubbles}</div>
      <div class="sp-film"><video class="clip-vid" playsinline preload="auto" disablepictureinpicture><source src="meowie-intro.mp4" type="video/mp4"><source src="meowie-intro.webm" type="video/webm"></video></div>
      <div class="splash-title"><h1 aria-label="Meowie">${word('Meowie', 'sp-l')}</h1>
        <p class="splash-app"><span class="sp-water">Minum Air</span></p><p class="sp-sub">${t('splashSub')}</p></div>
      <div class="sp-load" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="sp-glass"><i id="spFill"></i></div><span id="spTxt">${t('loadingApp')}</span></div>
      <svg class="sp-wave" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
        <path class="w1" d="M0 30 Q50 10 100 30 T200 30 T300 30 T400 30 V60 H0 Z"/><path class="w2" d="M0 36 Q50 18 100 36 T200 36 T300 36 T400 36 V60 H0 Z"/></svg>`, {
      onMount: (el) => {
        el.classList.add('splash');
        const v = $('video', el);
        const fill = $('#spFill', el);
        const bar = $('.sp-load', el);
        const wantSound = !window.MASound || MASound.music || MASound.sfx;
        let left = false;
        let filmDone = false;
        let assetsDone = false;
        const t0 = performance.now();
        // Get Meowie's animations and avatar ready while the film plays.
        const urls = ['meowie-sit.webp', 'meowie-pet.webp', 'meowie-swim.webp?v=3', 'meowie-peek.webp', 'meowie-turn.webp', 'meowie-full.webp?v=2', 'meowie-fullb.webp?v=2', 'meowie-fullc.webp', avatarSrc()];
        let loaded = 0;
        Promise.all(urls.map((u) => new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => { loaded++; res(); }; im.src = u; })))
          .then(() => { assetsDone = true; maybeLeave(); });
        function leave() {
          if (left) return;
          left = true;
          v.pause();
          if (window.MASound) MASound.hush(false);
          state.onboarded ? enterHome() : goStep(0);
        }
        function maybeLeave() { if (filmDone && assetsDone) setTimeout(leave, 350); }
        // The glass fills with both the film's progress and the files loaded.
        (function tick() {
          if (left) return;
          const filmK = v.duration ? Math.min(1, v.currentTime / v.duration) : Math.min(1, (performance.now() - t0) / 4200);
          const k = Math.min(1, .55 * (filmDone ? 1 : filmK) + .45 * (loaded / urls.length));
          fill.style.height = Math.round(k * 100) + '%';
          bar.setAttribute('aria-valuenow', Math.round(k * 100));
          requestAnimationFrame(tick);
        })();
        if (window.MASound) MASound.hush(true);
        v.muted = !wantSound;
        if (window.MASound) v.volume = Math.max(MASound.sfxVol, MASound.musicVol);
        let waitingForTouch = false;
        v.play().catch(() => { v.muted = true; waitingForTouch = wantSound; return v.play().catch(() => { filmDone = true; maybeLeave(); }); });
        // Phones block sound until a touch: the first touch turns it on (the film keeps going).
        // Only a finished tap counts as permission for sound on phones (a touch that has only just
        // begun does not), and unmuting too early makes Safari pause the film. If sound is still
        // refused, it carries on muted; a tap never stops it.
        const unmute = () => {
          if (!waitingForTouch || left) return;
          waitingForTouch = false;
          v.muted = false;
          v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
          setTimeout(() => { if (!left && v.paused && !v.ended) { v.muted = true; v.play().catch(() => {}); } }, 120);
        };
        ['touchend', 'pointerup', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, unmute, { capture: true, passive: true }));
        // Nothing may pause the film before it ends: if something does, it picks straight back up.
        v.addEventListener('pause', () => {
          if (left || v.ended) return;
          v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
        });
        v.addEventListener('ended', () => { filmDone = true; maybeLeave(); }, { once: true });
        // Never get stuck: if the film can't play, move on after its length; hard stop at 9 s.
        setTimeout(() => { if (v.paused || !v.duration) { filmDone = true; maybeLeave(); } }, 4600);
        setTimeout(leave, 9000);
      },
    });
  }
  // A screen can still be nudged sideways by scrollIntoView or a stray swipe; snap it back.
  document.addEventListener('scroll', (e) => {
    const el = e.target;
    if (el && el.classList && el.classList.contains('screen') && el.scrollLeft) el.scrollLeft = 0;
  }, true);
  window.addEventListener('scroll', () => { if (window.scrollX) window.scrollTo(0, window.scrollY); });

  function enterHome() {
    $('#tabbar').hidden = false;
    renderHome(true);
    if (joined()) scheduleSync(800);
    if (state.pendingFriend) setTimeout(acceptInvite, 1500);
  }

  // ---------- home ----------
  // When the next glass is due: the waking day split evenly into 250 ml glasses, counted
  // from the last drink (or from waking up).
  function nextSip(d) {
    const p = state.profile;
    const at = (hm) => { const [h, m] = String(hm || '07:00').split(':').map(Number); const x = new Date(); x.setHours(h, m, 0, 0); return x.getTime(); };
    const wake = at(p.wake);
    let sleep = at(p.sleep);
    if (sleep <= wake) sleep += 864e5;
    const now = Date.now();
    if (total(d) >= d.goal) return t('sipDone');
    if (now < wake || now > sleep) return t('sipRest');
    const left = Math.max(1, Math.ceil((d.goal - total(d)) / 250));
    const last = d.log.length ? d.log[d.log.length - 1].t : wake;
    const gap = Math.max(15 * 6e4, (sleep - Math.max(now, last)) / left);
    const mins = Math.round((last + gap - now) / 6e4);
    return mins <= 0 ? t('sipNow') : mins < 60 ? t('sipIn', { m: mins }) : t('sipInH', { h: Math.floor(mins / 60), m: mins % 60 });
  }
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
  // Today's list shows the newest few drinks until expanded.
  const LOG_PEEK = 3;
  let logOpen = false;
  let reviewOpen = false;
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
      <div class="top-bar">
        <button type="button" class="pill weather-chip" id="wxBtn" aria-label="${t('wxTitle')}">${Meowie.skyNow() === 'night' ? '🌙' : w ? (w.feels >= HEAT_START ? '☀️' : '⛅') : '🌤️'} ${w ? `${Math.round(w.feels)}°C ${esc(state.profile.city || '')}` : esc(state.profile.city || 'Malaysia')}</button>
        <button type="button" class="pill fire" id="streakBtn" aria-label="${t('streakTitle')}">🔥 ${t('streakPill', { n: streakCount() })}</button>
      </div>
      <div class="home-head"><div><p class="date">${dateStr} 🌸</p><h2>${greeting()}${t('comma')}${name}!</h2></div>
        <button type="button" class="scene-btn" id="sceneBtn" aria-label="${t('sceneBtn')}">🏝️${sceneIsNew() ? '<i class="dot"></i>' : ''}</button></div>
      <div class="stage"><div class="bubble-say" id="say" data-bracket="${bracket(pct)}">${lines[0]}</div><div class="hero-cat"></div></div>
      <div class="goal-card stats-row">
        <p class="gc-label"><i></i>${t('hydGoal')} 💧</p>
        <div class="gc-main">
          <div class="pct"><span id="pctNum">${Math.round(pctShown)}</span>%<small>${pct >= 1 ? t('gcDone') : drunk ? t('gcCompleted') : t('gcStart')}</small></div>
          <div class="gc-side"><span class="ml"><b id="mlNum">${fmt(drunk)}</b> / ${fmt(d.goal)} ml</span>
            <small>${pct >= 1 ? (drunk > d.goal ? t('gcOver', { ml: fmt(drunk - d.goal) }) : t('gcExact')) : t('gcLeft', { ml: fmt(d.goal - drunk) })}</small></div>
        </div>
        <div class="gc-bar"><span style="width:${Math.min(100, shownPct * 100)}%"></span></div>
        <div class="gc-chips"><span class="gc-chip sip">⏰ ${nextSip(d)}</span>
          <span class="gc-chip cups">🏁 ${t('gcCups', { n: Math.ceil(d.goal / 250) })}</span></div>
      </div>
      <div class="add-main"><button class="cta" id="quickAdd">${cupSvg(DRINKS[0]).replace('<svg', '<svg style="width:26px;height:32px"')} ${t('addWater', { ml: QUICK_ML })}</button>
        <button class="add-more" id="moreBtn" aria-label="${t('otherDrinks')}">+</button></div>
      <p class="hold-hint">${t('holdHint')}</p>
      <div class="drinks" id="drinkRow">${allDrinks().slice(1).map((x) =>
        `<button class="drink-chip" data-drink="${x.id}">${cupSvg(x)}<b>${drinkName(x)}</b></button>`).join('')}</div>
      ${reviewCard(d, true)}
      <button type="button" class="section-title log-toggle" id="logToggle" aria-expanded="${logOpen}">${t('today')}
        <small>${t('drinksCount', { n: d.log.length })} <span class="chev">${logOpen ? '▴' : '▾'}</span></small></button>
      <ul class="log ${logOpen ? 'open' : ''}" id="todayLog">${d.log.length ? d.log.slice().reverse().map((x, i) => {
        const dr = findDrink(x.drink);
        return `<li class="${x.t === lastAddedT ? 'new' : ''} ${!logOpen && i >= LOG_PEEK ? 'more' : ''}">${cupSvg(dr)}<div class="t"><b>${drinkName(dr)} · ${x.ml} ml</b><small>${timeStr(x.t)}${x.eff !== x.ml ? ` · ${t('countsAs', { ml: x.eff })}` : ''}</small></div>
          <button class="del" data-del="${x.t}" aria-label="${t('del')}">✕</button></li>`;
      }).join('') : `<li class="empty">${t('empty')}</li>`}</ul>
      ${d.log.length > LOG_PEEK ? `<button type="button" class="log-more" id="logMore">${logOpen ? t('showLess') : t('showMore', { n: d.log.length - LOG_PEEK })}</button>` : ''}`;

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
          homeCat = Meowie.create({ intro: first, scene: currentScene() });
          $('.hero-cat', el).appendChild(homeCat);
          Meowie.interact(homeCat, { onTap: onCatTap });
          // Only the very first visit counts up from zero; coming back from another tab shows
          // today's numbers and water as they are, without replaying.
          if (first) { shownPct = 0; pctShown = 0; }
          else { Meowie.setLayers(homeCat, layersFor(d)); Meowie.setLevel(homeCat, pct, { instant: true }); }
          wireHome(el, pct);
        },
      });
    }
    lastAddedT = 0;
    setTab('home');
  }

  // Consecutive drinks of the same kind merge into one band.
  function layersFor(d) {
    const out = [];
    d.log.forEach((x) => {
      const dr = findDrink(x.drink);
      const color = dr.id === 'air' ? null : dr.color;
      const last = out[out.length - 1];
      if (last && last.id === dr.id) last.w += x.eff;
      else out.push({ id: dr.id, color, w: x.eff });
    });
    return out;
  }

  // Today's % always continues from the number on screen. A refresh mid-count (the day's weather
  // arriving and nudging the goal, a drink, a tab change) carries on from there instead of
  // jumping to the end and counting again.
  let pctShown = 0;
  let pctRaf = 0;
  function animatePct(node, to) {
    if (!node) return;
    cancelAnimationFrame(pctRaf);
    const from = pctShown;
    if (Math.abs(to - from) < .5 || matchMedia('(prefers-reduced-motion: reduce)').matches) { pctShown = to; node.textContent = Math.round(to); return; }
    node.textContent = Math.round(from);
    const t0 = performance.now();
    const dur = Math.min(900, 300 + Math.abs(to - from) * 4);
    (function f(now) {
      const k = Math.min(1, (now - t0) / dur);
      pctShown = from + (to - from) * (1 - Math.pow(1 - k, 3));
      node.textContent = Math.round(pctShown);
      if (k < 1) pctRaf = requestAnimationFrame(f);
    })(t0);
  }

  function wireHome(el, pct) {
    // While sitting Meowie is still drinking, hold the water level until he finishes.
    const holding = homeCat._mw && homeCat._mw.busy && homeCat._mw.mode === 'sit';
    if (!holding) {
      Meowie.setLayers(homeCat, layersFor(today()));
      Meowie.setLevel(homeCat, pct);
    }
    animatePct($('#pctNum', el), Math.min(999, pct * 100));
    if (pct >= .5 && !today().rewarded) preloadReward();
    shownPct = pct;
    // Tap adds a glass; press and hold opens the pour sheet to change the amount.
    // The world button sits in the header (rebuilt each time), under the streak pill.
    const sb = $('#sceneBtn', el);
    if (sb) sb.addEventListener('click', openSceneSheet);
    const quick = $('#quickAdd', el);
    let holdTimer;
    let held = false;
    quick.addEventListener('pointerdown', () => {
      held = false;
      holdTimer = setTimeout(() => { held = true; if (navigator.vibrate) navigator.vibrate(15); openSheet('air'); }, 450);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => quick.addEventListener(ev, () => clearTimeout(holdTimer)));
    quick.addEventListener('contextmenu', (e) => e.preventDefault());
    quick.addEventListener('click', (e) => { if (held) { held = false; return; } addDrink(DRINKS[0], QUICK_ML, e.currentTarget); });
    $('#moreBtn', el).addEventListener('click', () => openSheet());
    el.querySelectorAll('[data-drink]').forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.drink, b)));
    $('#streakBtn', el).addEventListener('click', openStreakSheet);
    $('#wxBtn', el).addEventListener('click', openWeatherSheet);
    const bar = $('.gc-bar span', el);
    if (bar) requestAnimationFrame(() => { bar.style.width = Math.min(100, pct * 100) + '%'; });
    const toggleLog = () => { logOpen = !logOpen; renderHome(false); };
    // The review at the top shows its first tip; tap it to see the rest.
    const rv = el.querySelector(':scope > .review');
    if (rv) {
      rv.classList.toggle('expanded', reviewOpen);
      rv.addEventListener('click', () => { reviewOpen = !reviewOpen; rv.classList.toggle('expanded', reviewOpen); });
    }
    const lt = $('#logToggle', el);
    if (lt) lt.addEventListener('click', toggleLog);
    const lm = $('#logMore', el);
    if (lm) lm.addEventListener('click', toggleLog);
    el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => removeDrink(Number(b.dataset.del))));
  }

  function sayLine(text) {
    const say = $('#say', screenEl);
    if (!say) return;
    say.innerHTML = text;
    say.style.animation = 'none'; void say.offsetWidth; say.style.animation = '';
  }

  function onCatTap() {
    // Meowie.interact already brings in the petting hand; he answers with a line.
    tapCount++;
    const lines = catLine(today(), shownPct);
    sayLine(lines[Math.floor(Math.random() * lines.length)]);
  }

  function addDrink(drink, ml, fromEl) {
    const d = today();
    const before = total(d);
    const eff = Math.round(ml * drink.hyd);
    lastAddedT = Date.now();
    d.log.push({ drink: drink.id, ml, eff, t: lastAddedT });
    save();
    scheduleSync();
    if (navigator.vibrate) navigator.vibrate(20);
    const after = total(d);
    const hit = before < d.goal && after >= d.goal;
    // Crossing 25%, 50% or 75% earns a small celebration of its own.
    const milestone = !hit && [.75, .5, .25].find((m) => before < d.goal * m && after >= d.goal * m);
    // A cup pours the drink: sitting Meowie gets his glass filled and laps it up,
    // swimming Meowie rises to the surface and drinks straight from the stream.
    const flow = Meowie.pourAndDrink(homeCat, drink.color);
    toast(hit ? t('goalHit') : `+${eff} ml ${drink.id === 'air' ? '💧' : `(${drinkName(drink)})`}`);
    setTimeout(() => floatMl(`+${eff} ml`), 700);
    setTimeout(() => {
      renderHome(false);
      bump($('.stats-row .pct', screenEl));
      if (milestone) sayLine(t('milestone', { p: Math.round(milestone * 100) }));
    }, 900);
    flow.then(() => {
      if (!homeCat || !homeCat.isConnected) return;
      // Sitting Meowie drank from his glass; now the water catches up.
      syncWater();
      if (hit) {
        confetti(); Meowie.act(homeCat, 'jump');
        // The first time each day the goal is reached, Meowie's victory dance plays as a reward.
        const fresh = unlockedScenes().filter((id) => !unlockedScenes(daysHit() - 1).includes(id));
        if (!d.rewarded) { d.rewarded = true; save(); setTimeout(() => showReward(fresh[0]), 1100); }
      }
      else if (milestone) { confetti(36); Meowie.act(homeCat, milestone >= .5 ? 'jump' : 'swim'); }
    });
  }
  function syncWater() {
    const d = today();
    Meowie.setLayers(homeCat, layersFor(d));
    Meowie.setLevel(homeCat, total(d) / d.goal);
  }
  function removeDrink(t) {
    const d = today();
    d.log = d.log.filter((x) => x.t !== t);
    save();
    scheduleSync();
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

  const HOT = ['tehtarik', 'kopio'];
  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => v / 255);
    return .2126 * r + .7152 * g + .0722 * b;
  }

  // After "Add", the glass shrinks, flies over the water and tips over to pour.
  function flyGlass(svgEl, delay = 0) {
    if (!svgEl || !homeCat || matchMedia('(prefers-reduced-motion: reduce)').matches) return new Promise((res) => setTimeout(res, delay));
    // Lift the glass out of the sheet right away so it stays put while the sheet slides down.
    const r = svgEl.getBoundingClientRect();
    const clone = svgEl.cloneNode(true);
    clone.querySelectorAll('.pour-handle, .pour-tick').forEach((n) => n.remove());
    Object.assign(clone.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', zIndex: 60, transformOrigin: '50% 4%', pointerEvents: 'none' });
    document.body.appendChild(clone);
    return new Promise((res) => setTimeout(() => flyClone(clone, r).then(res), delay));
  }
  function flyClone(clone, r) {
    // Fly to where Meowie's pouring cup appears, shrink to its size and hand over to it.
    const target = Meowie.pourTarget(homeCat);
    const k = .26;
    const dx = target.x - (r.left + r.width / 2) + 8;
    const dy = target.y - (r.top + r.height * .04);
    const a = clone.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * .6}px, ${dy * .6 - 50}px) scale(${(1 + k) / 2}) rotate(10deg)`, opacity: 1, offset: .45 },
      { transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(0deg)`, opacity: 1, offset: .85 },
      { transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(0deg)`, opacity: 0 },
    ], { duration: 820, easing: 'cubic-bezier(.45,0,.2,1)' });
    a.onfinish = () => clone.remove();
    return new Promise((res) => setTimeout(res, 640));
  }

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
      ${d.ice ? '<path d="M82 186 L104 -8" stroke="#f2b45c" stroke-width="7" stroke-linecap="round" opacity=".9"/>' : ''}
      ${HOT.includes(d.id) ? `<path d="M104 48 Q132 50 130 92 Q128 130 98 132" fill="none" stroke="var(--cup-line)" stroke-width="7" stroke-linecap="round"/>
        <g class="pour-steam" stroke="var(--muted)" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6">
          <path d="M44 0 Q38 -10 44 -20 Q50 -30 44 -40"/><path d="M60 -4 Q54 -14 60 -24 Q66 -34 60 -44"/><path d="M76 0 Q70 -10 76 -20 Q82 -30 76 -40"/></g>` : ''}
      <path d="${GLASS}" fill="none" stroke="var(--cup-line)" stroke-width="3" stroke-linejoin="round"/>
      <path d="M24 22 L32 170" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>
      <g class="pour-handle" style="transform: translateY(${pourY(ml)}px)">
        <circle cx="60" cy="0" r="15" fill="var(--card)" stroke="var(--cup-line)" stroke-width="2"/>
        <path d="M60 -8 L55 -3 H65 Z M60 8 L55 3 H65 Z" fill="var(--ink)"/>
      </g>
    </svg>`;
  }

  function openSheet(drinkId, originEl) {
    let drink = drinkId ? allDrinks().find((x) => x.id === drinkId) : null;
    let size = QUICK_ML;
    function draw() {
      if (!drink) {
        sheet.innerHTML = `<div class="grab"></div><h3 style="font-size:22px">${t('pickDrink')}</h3>
          <div class="drink-grid">${allDrinks().map((x) => `<div class="chip-wrap"><button class="drink-chip" data-pick-drink="${x.id}">${cupSvg(x)}<b>${drinkName(x)}</b></button>
            ${x.custom ? `<button class="chip-del" data-del-custom="${x.id}" aria-label="${t('del')} ${esc(x.name)}">✕</button>` : ''}</div>`).join('')}
            <button class="drink-chip custom-chip" id="customNew"><span class="plus">＋</span><b>${t('customDrink')}</b></button></div>`;
        sheet.querySelectorAll('[data-pick-drink]').forEach((b) => b.addEventListener('click', () => { drink = allDrinks().find((x) => x.id === b.dataset.pickDrink); draw(); }));
        sheet.querySelectorAll('[data-del-custom]').forEach((b) => b.addEventListener('click', () => {
          state.customDrinks = (state.customDrinks || []).filter((x) => x.id !== b.dataset.delCustom);
          save();
          draw();
          if (current === 'home') renderHome(false);
        }));
        $('#customNew', sheet).addEventListener('click', () => customForm((made) => { drink = made; draw(); if (current === 'home') renderHome(false); }));
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
      const addBtn = $('#sheetAdd', sheet);
      if (drink.id !== 'air') {
        addBtn.style.background = drink.color;
        addBtn.style.color = luminance(drink.color) > .55 ? '#14212e' : '#fff';
      }
      addBtn.addEventListener('click', () => {
        // Bring Meowie into view first so the glass has somewhere to pour.
        const scrolled = screenEl && screenEl.scrollTop > 0;
        const flight = flyGlass($('#pour svg', sheet), scrolled ? 420 : 0);
        closeSheet();
        if (scrolled) screenEl.scrollTo({ top: 0, behavior: 'smooth' });
        flight.then(() => addDrink(drink, size, null));
      });
    }
    draw();
    openSheetEl();
    if (originEl && drink) flyCup(originEl);
  }

  // The tapped drink's cup flies from its chip into the sheet header.
  function flyCup(originEl) {
    const head = $('.sheet-head svg', sheet);
    const src = $('svg', originEl);
    if (!head || !src || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = src.getBoundingClientRect();
    const sr = sheet.getBoundingClientRect();
    const hr = head.getBoundingClientRect();
    // The sheet is still below the screen; work out where the header will land.
    const finalTop = hr.top - (sr.top - (innerHeight - sr.height));
    const clone = head.cloneNode(true);
    Object.assign(clone.style, { position: 'fixed', left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', zIndex: 60, transformOrigin: '0 0', pointerEvents: 'none' });
    document.body.appendChild(clone);
    head.style.visibility = 'hidden';
    const dx = hr.left - from.left;
    const dy = finalTop - from.top;
    const k = hr.width / from.width;
    clone.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
      { transform: `translate(${dx * .5}px, ${dy * .5 - 60}px) scale(${(1 + k) / 2}) rotate(-12deg)`, offset: .5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${k}) rotate(0deg)` },
    ], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => { clone.remove(); head.style.visibility = ''; };
  }

  // Swipe the sheet down by its handle to close it.
  function openSheetEl() {
    sheet.style.transform = '';
    sheet.classList.add('open');
    sheetBg.classList.add('open');
    syncBack();
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
  // Make a drink that isn't on the list: name, colour, how much counts as water, sweet or caffeinated.
  const CUSTOM_COLORS = ['#7cc8f5', '#8fd14f', '#ffb02e', '#ff7a59', '#f39bb7', '#b07cf0', '#c98b4e', '#4a2c1a'];
  function customForm(done) {
    const f = { name: '', color: CUSTOM_COLORS[2], hyd: .9, sweet: false, caff: false };
    sheet.innerHTML = `<div class="grab"></div>
      <div class="custom-form">
        <div class="custom-preview" id="cPrev">${cupSvg({ id: 'cprev', color: f.color })}</div>
        <h3>${t('customTitle')}</h3>
        <label class="c-label" for="cName">${t('customName')}</label>
        <input class="field" id="cName" maxlength="24" placeholder="${t('customNamePh')}" autocomplete="off">
        <span class="c-label">${t('customColor')}</span>
        <div class="swatches" role="radiogroup" aria-label="${t('customColor')}">${CUSTOM_COLORS.map((c, i) =>
          `<button type="button" class="swatch ${i === 2 ? 'sel' : ''}" data-color="${c}" style="background:${c}" role="radio" aria-checked="${i === 2}" aria-label="${c}"></button>`).join('')}</div>
        <span class="c-label">${t('customHyd')}</span>
        <div class="hyd-opts">${[[1, t('hydPlain')], [.9, t('hydJuice')], [.8, t('hydTea')], [.7, t('hydCoffee')]].map(([v, l]) =>
          `<button type="button" class="hyd ${v === .9 ? 'sel' : ''}" data-hyd="${v}"><b>${Math.round(v * 100)}%</b><small>${l}</small></button>`).join('')}</div>
        <div class="toggles">
          <label class="tog"><input type="checkbox" id="cSweet"> <span>🍬 ${t('customSweet')}</span></label>
          <label class="tog"><input type="checkbox" id="cCaff"> <span>☕ ${t('customCaff')}</span></label>
        </div>
        <p class="c-err" id="cErr" hidden>${t('customNeedName')}</p>
        <button class="cta" id="cSave">${t('customSave')}</button>
      </div>`;
    $('#cName', sheet).addEventListener('input', () => { $('#cErr', sheet).hidden = true; });
    const prev = $('#cPrev', sheet);
    const paint = () => { prev.innerHTML = cupSvg({ id: 'cprev' + f.color.slice(1), color: f.color, ice: false }); };
    sheet.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
      f.color = b.dataset.color;
      sheet.querySelectorAll('[data-color]').forEach((x) => { x.classList.toggle('sel', x === b); x.setAttribute('aria-checked', x === b); });
      paint();
      bump(prev);
    }));
    sheet.querySelectorAll('[data-hyd]').forEach((b) => b.addEventListener('click', () => {
      f.hyd = Number(b.dataset.hyd);
      sheet.querySelectorAll('[data-hyd]').forEach((x) => x.classList.toggle('sel', x === b));
    }));
    $('#cSave', sheet).addEventListener('click', () => {
      f.name = $('#cName', sheet).value.trim();
      if (!f.name) { $('#cErr', sheet).hidden = false; $('#cName', sheet).focus(); return; }
      const made = { id: 'c' + Date.now().toString(36), custom: true, name: f.name, color: f.color, hyd: f.hyd,
        sweet: $('#cSweet', sheet).checked, caff: $('#cCaff', sheet).checked ? 80 : 0, ice: false };
      state.customDrinks = (state.customDrinks || []).concat(made);
      save();
      done(made);
    });
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
  function closeSheet() { sheet.classList.remove('open'); sheetBg.classList.remove('open'); syncBack(); }

  // ---------- phone back button ----------
  // Back closes what's open, one layer at a time: the reward, a sheet, another tab (back to
  // Today) or a setup step. Only on Today with nothing open does it leave the app. One extra
  // history entry stands for "something to close" and is added or taken away as that changes.
  let backPushed = false;
  let backIgnore = false;
  let rewardCloser = null;
  const backLayers = () => !!rewardCloser || sheet.classList.contains('open')
    || (state.onboarded ? !!tab && tab !== 'home' : stepIdx > 0 && current && current.startsWith('ob-'));
  function syncBack() {
    const want = backLayers();
    if (want && !backPushed) { history.pushState({ ma: 1 }, ''); backPushed = true; }
    else if (!want && backPushed) { backPushed = false; backIgnore = true; history.back(); }
  }
  window.addEventListener('popstate', () => {
    backPushed = false;
    if (backIgnore) { backIgnore = false; return; }
    if (rewardCloser) rewardCloser();
    else if (sheet.classList.contains('open')) { sheet.classList.remove('open'); sheetBg.classList.remove('open'); }
    else if (state.onboarded && tab !== 'home') { setTab('home'); renderTab('home'); }
    else if (!state.onboarded && stepIdx > 0) prev();
    // Anything still open gets its own back step again.
    setTimeout(syncBack, 0);
  });
  sheetBg.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  // ---------- tabs ----------
  function setTab(t) {
    tab = t;
    setTimeout(syncBack, 0);
    const btns = [...document.querySelectorAll('#tabbar button')];
    btns.forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    // A soft blob slides under the active tab and stretches as it moves.
    const blob = $('#tabbar .tab-blob');
    const i = btns.findIndex((b) => b.dataset.tab === t);
    if (blob && i >= 0) {
      const moved = blob.dataset.i !== undefined && blob.dataset.i !== String(i);
      blob.dataset.i = i;
      blob.style.transform = `translateX(${i * 100}%)`;
      if (moved) { blob.classList.remove('moving'); void blob.offsetWidth; blob.classList.add('moving'); }
    }
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
    if (t === 'friends') { renderFriends(); return refreshBoard(); }
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
    show('history', `<h2 class="prof-title">${t('histTitle')} <span class="ttl-ic">${CHART_SVG}</span></h2>
      <div class="card"><div class="section-title" style="margin:0 0 14px">${t('last7')} <small>${t('pctGoal')}</small></div>
        <div class="week">${days.map((x) => `<button type="button" class="bar ${x.i === 0 ? 'today' : ''}" data-day="${x.k}" aria-label="${x.k}: ${fmt(x.ml)} / ${fmt(x.goal)} ml">
          <div class="b ${x.ml >= x.goal ? 'hit' : ''}"><i data-h="${Math.min(100, Math.round(x.ml / x.goal * 100))}"></i></div>
          <span>${dayName(x.k)}</span></button>`).join('')}</div>
        <p class="tap-hint">${t('tapDay')}</p></div>
      <div class="tiles stagger">
        <button type="button" class="tile tap" data-streak><div class="v">🔥 ${streakCount()}</div><div class="l">${t('streakNow')} <span class="tile-go">›</span></div></button>
        <button type="button" class="tile tap" data-streak><div class="v">🏆 ${best}</div><div class="l">${t('streakBest')} <span class="tile-go">›</span></div></button>
        <div class="tile"><div class="v">${fmt(avg)}</div><div class="l">${t('avg')}</div></div>
        <div class="tile"><div class="v">${hit}</div><div class="l">${t('daysHit')}</div></div>
        <div class="tile"><div class="v">${cups}</div><div class="l">${t('logged')}</div></div>
        <div class="tile"><div class="v">${fmt(baseGoal())}</div><div class="l">${t('baseGoal')}</div></div>
      </div>`, {
      onMount: (el) => {
        el.classList.add('home');
        setTimeout(() => el.querySelectorAll('.week i').forEach((i) => { i.style.height = i.dataset.h + '%'; }), 120);
        el.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => openDaySheet(b.dataset.day)));
        // The streak tiles open the same milestones and rewards sheet as the streak pill on Today.
        el.querySelectorAll('[data-streak]').forEach((b) => b.addEventListener('click', openStreakSheet));
      },
    });
  }

  function renderProfile() {
    const p = state.profile;
    // Edits go into a draft; nothing changes until Save.
    const draft = { ...p, lang: state.lang };
    const opt = (labels, v) => Object.entries(labels).map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${Array.isArray(l) ? l[0] : l}</option>`).join('');
    const row = (ic, bg, label, ctl, forId) => `<div class="set-row"><span class="set-ic" style="--ic:${bg}">${ic}</span>
      ${forId ? `<label for="${forId}">${label}</label>` : `<span class="set-l">${label}</span>`}<span class="set-ctl">${ctl}</span></div>`;
    // A volume slider under its switch; greyed out while that sound is off.
    const vol = (id, v, on, label) => `<div class="set-row vol-row ${on ? '' : 'off'}"><span class="vol-ic" aria-hidden="true">🔈</span>
      <input type="range" id="${id}" min="0" max="100" step="5" value="${Math.round(v * 100)}" aria-label="${label}" style="--p:${Math.round(v * 100)}%" ${on ? '' : 'disabled'}>
      <span class="vol-ic" aria-hidden="true">🔊</span><b class="vol-val" id="${id}Val">${Math.round(v * 100)}%</b></div>`;
    const sw = (id, on, label) => `<button type="button" class="switch" id="${id}" role="switch" aria-pressed="${on}" aria-checked="${on}" aria-label="${label}"><i></i></button>`;
    show('profile', `<h2 class="prof-title">${t('profTitle')} <span class="ttl-ic">${PAW_SVG}</span></h2>
      <div class="prof-hero"><div class="bubble-say">${pick(L().profSay || I18N.en.profSay)({ name: esc(p.name || t('friend')) })}</div><button type="button" class="av-btn" id="avBtn" aria-label="${t('avPick')}"><span class="av-float"><img src="${avatarSrc()}" alt="Meowie" width="320" height="320"></span><span class="av-edit">✏️ ${t('avChange')}</span></button></div>
      <h3 class="set-head">${t('secAbout')}</h3>
      <div class="set-group">
        ${row('👤', '#5aa9ff', t('pName'), `<input id="pName" value="${esc(p.name)}" maxlength="20">`, 'pName')}
        ${row('🧑', '#b18cff', t('pGender'), `<select id="pGender">${opt(L().gender, p.gender)}</select>`, 'pGender')}
        ${row('🎂', '#ff8fb1', t('pAge'), `<input id="pAge" type="number" inputmode="numeric" min="10" max="90" value="${p.age}">`, 'pAge')}
        ${row('⚖️', '#ffb02e', t('pWeight'), `<input id="pWeight" type="number" inputmode="numeric" min="30" max="150" value="${p.weight}">`, 'pWeight')}
      </div>
      <h3 class="set-head">${t('secRoutine')}</h3>
      <div class="set-group">
        ${row('🏃', '#3fd39a', t('pActivity'), `<select id="pAct">${opt(L().activity, p.activity)}</select>`, 'pAct')}
        ${row('📍', '#ff7a6b', t('pCity'), `<select id="pCity">${CITIES.map(([c]) => `<option ${c === p.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`, 'pCity')}
        ${row('🌅', '#ffc23d', t('wake'), `<input id="pWake" type="time" value="${p.wake}">`, 'pWake')}
        ${row('🌙', '#6b7bff', t('sleep'), `<input id="pSleep" type="time" value="${p.sleep}">`, 'pSleep')}
        <div class="set-row goal"><span class="set-ic" style="--ic:#0a84d6">💧</span><span class="set-l">${t('pBase')}</span><b id="pGoal">${fmt(baseGoal())} ml</b></div>
      </div>
      <h3 class="set-head">${t('secPrefs')}</h3>
      <div class="set-group">
        ${row('🌐', '#2fb7c4', t('pLang'), `<select id="pLang">${LANGS.map((k) => `<option value="${k}" ${k === state.lang ? 'selected' : ''}>${I18N[k]._label}</option>`).join('')}</select>`, 'pLang')}
        ${row('🎵', '#f06aa8', t('sndMusic'), sw('sMusic', MASound.music, t('sndMusic')))}
        ${vol('vMusic', MASound.musicVol, MASound.music, t('volMusic'))}
        ${row('🔊', '#8c7bff', t('sndSfxLong'), sw('sSfx', MASound.sfx, t('sndSfxLong')))}
        ${vol('vSfx', MASound.sfxVol, MASound.sfx, t('volSfx'))}
      </div>
      <h3 class="set-head">${t('secRemind')}</h3>
      <div class="set-group">
        ${row('🔔', '#ff9f43', t('rmOn'), sw('sRemind', !!p.remind, t('rmOn')))}
        ${row('⏱️', '#22b8a6', t('rmStyle'), `<select id="pRemind" ${p.remind ? '' : 'disabled'}>${Object.keys(REMIND_STYLES).map((k) => `<option value="${k}" ${k === (p.remindStyle || 'balanced') ? 'selected' : ''}>${t('rmStyles')[k]}</option>`).join('')}</select>`, 'pRemind')}
        <p class="set-note"><b id="rmInfo">${t('rmInfo', remindStyle())}</b> ${t('rmHint')}</p>
      </div>
      <div class="save-bar"><span id="pDirty" class="dirty" hidden>${t('unsaved')}</span>
        <button class="cta" id="pSave" disabled>${t('save')}</button></div>
      <div class="danger-zone">
        <h3>${t('dangerTitle')}</h3>
        <p>${t('dangerBody')}</p>
        <button class="danger-btn" id="pReset">🗑 ${t('reset')}</button>
      </div>`, {
      onMount: (el) => {
        el.classList.add('home');
        const saveBtn = $('#pSave', el);
        const dirtyNote = $('#pDirty', el);
        const isDirty = () => draft.lang !== state.lang || ['name', 'gender', 'age', 'weight', 'activity', 'city', 'wake', 'sleep'].some((k) => String(draft[k]) !== String(p[k]));
        const refresh = () => {
          const dirty = isDirty();
          saveBtn.disabled = !dirty;
          dirtyNote.hidden = !dirty;
          $('#pGoal', el).textContent = fmt(baseGoal(draft)) + ' ml';
        };
        const bind = (id, key, num) => {
          const inp = $(id, el);
          const update = () => {
            const [lo, hi] = key === 'age' ? [10, 90] : [30, 150];
            draft[key] = num ? Math.max(lo, Math.min(hi, Number(inp.value) || p[key])) : (key === 'name' ? inp.value.trim() : inp.value);
            refresh();
          };
          inp.addEventListener('input', update);
          inp.addEventListener('change', update);
        };
        bind('#pLang', 'lang'); bind('#pName', 'name'); bind('#pGender', 'gender'); bind('#pWeight', 'weight', true); bind('#pAge', 'age', true);
        bind('#pAct', 'activity'); bind('#pCity', 'city'); bind('#pWake', 'wake'); bind('#pSleep', 'sleep');
        saveBtn.addEventListener('click', () => {
          const cityChanged = draft.city !== p.city;
          const langChanged = draft.lang !== state.lang;
          ['name', 'gender', 'age', 'weight', 'activity', 'city', 'wake', 'sleep'].forEach((k) => { p[k] = draft[k]; });
          if (cityChanged) state.weather = null;
          save();
          scheduleSync();
          if (cityChanged) fetchWeather();
          if (langChanged) setLang(draft.lang);
          else { refresh(); bump($('#pGoal', el)); }
          toast(t('saved'));
        });
        $('#pReset', el).addEventListener('click', openDeleteSheet);
        $('#avBtn', el).addEventListener('click', openAvatarSheet);
        // Sound switches apply straight away; they are device settings, not part of the profile draft.
        const toggle = (id, get, set) => $(id, el).addEventListener('click', (e) => {
          set(!get());
          e.currentTarget.setAttribute('aria-pressed', get());
          e.currentTarget.setAttribute('aria-checked', get());
        });
        toggle('#sMusic', () => MASound.music, MASound.setMusic);
        toggle('#sSfx', () => MASound.sfx, MASound.setSfx);
        // Volume sliders: music changes as you drag; Meowie gives a little mew at the new level.
        const slider = (id, set, onSw, get, preview) => {
          const r = $(id, el);
          const out = $(id + 'Val', el);
          const row = r.closest('.vol-row');
          r.addEventListener('input', () => { r.style.setProperty('--p', r.value + '%'); out.textContent = r.value + '%'; set(r.value / 100); });
          if (preview) r.addEventListener('change', preview);
          $(onSw, el).addEventListener('click', () => { r.disabled = !get(); row.classList.toggle('off', !get()); });
        };
        slider('#vMusic', MASound.setMusicVol, '#sMusic', () => MASound.music);
        slider('#vSfx', MASound.setSfxVol, '#sSfx', () => MASound.sfx, () => Meowie.sfx('mew', .8));
        // Reminder settings also apply straight away. Turning them on asks for permission to notify.
        const rs = $('#sRemind', el);
        const styleSel = $('#pRemind', el);
        const showRemind = () => { rs.setAttribute('aria-pressed', !!p.remind); rs.setAttribute('aria-checked', !!p.remind); styleSel.disabled = !p.remind; };
        rs.addEventListener('click', async () => {
          p.remind = !p.remind;
          showRemind();
          if (p.remind && 'Notification' in window && Notification.permission !== 'granted') {
            let perm = Notification.permission;
            try { if (perm === 'default') perm = await Notification.requestPermission(); } catch {}
            if (perm !== 'granted') toast(t('rmDenied'));
          }
          save();
          toast(p.remind ? t('rmOnToast', { s: t('rmStyles')[p.remindStyle || 'balanced'] }) : t('rmOffToast'));
        });
        styleSel.addEventListener('change', () => {
          p.remindStyle = styleSel.value;
          save();
          $('#rmInfo', el).textContent = t('rmInfo', remindStyle());
          toast(t('rmOnToast', { s: t('rmStyles')[p.remindStyle] }));
        });
      },
    });
  }

  // Streak milestones and the badge each one unlocks.
  const MILESTONES = [
    { d: 3, ic: '💧' }, { d: 7, ic: '🧊' }, { d: 14, ic: '🥥' },
    { d: 30, ic: '🦈' }, { d: 60, ic: '🌊' }, { d: 100, ic: '👑' },
  ];
  function bestStreak() {
    let best = 0;
    let run = 0;
    Object.keys(state.days).sort().forEach((k) => {
      const r = state.days[k];
      run = r.goal && total(r) >= r.goal ? run + 1 : 0;
      best = Math.max(best, run);
    });
    return best;
  }
  function openStreakSheet() {
    const now = streakCount();
    const best = Math.max(bestStreak(), now);
    const next = MILESTONES.find((m) => m.d > now);
    const prev = [...MILESTONES].reverse().find((m) => m.d <= now);
    const from = prev ? prev.d : 0;
    const pct = next ? Math.round(((now - from) / (next.d - from)) * 100) : 100;
    const names = t('badges');
    sheet.innerHTML = `<div class="grab"></div>
      <div class="streak-sheet">
        <div class="streak-hero"><span class="flame ${now ? 'lit' : ''}">🔥</span>
          <div><b class="streak-num">${now}</b><span>${t('streakDays', { n: now })}</span></div></div>
        <p class="streak-sub">${now ? t('streakKeep') : t('streakStart')} · ${t('streakBestN', { n: best })}</p>
        ${next ? `<div class="next-card">
          <div class="next-top"><span>${t('streakNext', { n: next.d - now, badge: `${next.ic} ${names[MILESTONES.indexOf(next)]}` })}</span><b>${now}/${next.d}</b></div>
          <div class="next-bar"><i style="--w:${pct}%"></i></div></div>` : `<div class="next-card done">${t('streakAll')}</div>`}
        <h3 class="badge-title">${t('streakRewards')}</h3>
        <ul class="badges">${MILESTONES.map((m, i) => {
          const got = best >= m.d;
          return `<li class="${got ? 'got' : ''} ${next === m ? 'next' : ''}" style="animation-delay:${i * 60}ms">
            <span class="b-ic">${got ? m.ic : '🔒'}</span>
            <span class="b-txt"><b>${names[i]}</b><small>${t('badgeDays', { n: m.d })} · ${t('badgePerks')[i]}</small></span>
            <span class="b-state">${got ? '✓' : `${Math.min(now, m.d)}/${m.d}`}</span></li>`;
        }).join('')}</ul>
        <p class="streak-how">${t('streakHow')}</p>
      </div>`;
    openSheetEl();
    requestAnimationFrame(() => { const bar = $('.next-bar i', sheet); if (bar) bar.classList.add('go'); });
  }

  // ---------- Avatar: pick your favourite Meowie ----------
  const AVATARS = 16;
  // A random Meowie, different from the one an <img> is showing now.
  const randomAvatar = (img) => {
    const cur = img && Number((img.getAttribute('src') || '').match(/(\d+)\.jpg/)?.[1]);
    let i;
    do i = 1 + Math.floor(Math.random() * AVATARS); while (i === cur);
    return i;
  };
  const avatarSrc = (i = state.avatar || 1) => `av/${String(i).padStart(2, '0')}.jpg`;
  function openSceneSheet() {
    const hits = daysHit();
    const have = unlockedScenes(hits);
    const cur = currentScene();
    sheet.innerHTML = `<div class="grab"></div><h3 style="font-size:22px">${t('sceneTitle')}</h3><p class="av-sub">${t('sceneSub')}</p>
      <div class="scene-grid">${SCENES.map((x, i) => {
        const open = have.includes(x.id);
        return `<button type="button" class="scene-opt ${x.id === cur ? 'sel' : ''} ${open ? '' : 'locked'}" data-scene="${x.id}" ${open ? '' : 'aria-disabled="true"'} style="animation-delay:${i * 60}ms">
          <span class="thumb ${x.img ? '' : 'classic'}" ${x.img ? `style="background-image:url(${x.img}-s.webp)"` : ''}></span>
          <span><b>${t('scenes')[x.id]}</b><small>${open ? (x.id === cur ? t('sceneUsing') : t('sceneReady')) : t('sceneNeed', { n: x.need, have: Math.min(hits, x.need) })}</small>
            ${open ? '' : `<span class="need"><i style="width:${Math.round(Math.min(hits, x.need) / x.need * 100)}%"></i></span>`}</span>
          ${x.id === cur ? '<span class="tick">✓</span>' : '<span></span>'}</button>`;
      }).join('')}</div>`;
    openSheetEl();
    state.scenesSeen = have;
    save();
    const dot = document.querySelector('#sceneBtn .dot');
    if (dot) dot.remove();
    sheet.querySelectorAll('[data-scene]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.scene;
      if (!have.includes(id)) {
        b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 });
        return;
      }
      if (navigator.vibrate) navigator.vibrate(12);
      setSceneChoice(id);
      setTimeout(closeSheet, 250);
    }));
  }

  function openAvatarSheet() {
    const names = t('avNames');
    const cur = state.avatar || 1;
    sheet.innerHTML = `<div class="grab"></div><div class="av-sheet">
      <h3>${t('avPick')}</h3><p class="av-sub">${t('avSub')}</p>
      <div class="av-grid">${Array.from({ length: AVATARS }, (_, k) => k + 1).map((i) => `
        <button type="button" class="av-opt ${i === cur ? 'sel' : ''}" data-av="${i}" style="animation-delay:${(i - 1) * 30}ms" aria-label="${names[i - 1]}">
          <img src="${avatarSrc(i)}" alt="" loading="lazy"><span>${names[i - 1]}</span></button>`).join('')}</div></div>`;
    openSheetEl();
    sheet.querySelectorAll('[data-av]').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.av);
      sheet.querySelectorAll('.av-opt').forEach((o) => o.classList.toggle('sel', o === b));
      b.animate([{ transform: 'scale(1)' }, { transform: 'scale(.86) rotate(-4deg)' }, { transform: 'scale(1.08) rotate(3deg)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
      if (navigator.vibrate) navigator.vibrate(12);
      state.avatar = i;
      save();
      scheduleSync();
      setTimeout(() => {
        closeSheet();
        const img = document.querySelector('#avBtn img');
        if (!img) return;
        // Smooth swap: the new Meowie fades in over the old one, then takes its place.
        const next = new Image();
        next.src = avatarSrc(i);
        next.className = 'av-next';
        next.alt = '';
        const show = () => {
          img.parentNode.appendChild(next);
          requestAnimationFrame(() => next.classList.add('in'));
          setTimeout(() => { img.src = next.src; next.remove(); }, 520);
        };
        (next.decode ? next.decode() : Promise.resolve()).then(show, show);
        toast(t('avSaved', { name: names[i - 1] }));
      }, 380);
    }));
  }

  // Weather right now in your city: conditions, temperature, heat level, humidity and haze.
  // Live from Open-Meteo (forecast + air quality); asked for each time the sheet opens.
  const WX_ICON = (c, night) => (c === 0 ? (night ? '🌙' : '☀️') : c <= 2 ? (night ? '☁️' : '🌤️') : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️' : c <= 67 ? '🌧️' : c <= 82 ? '🌧️' : '⛈️');
  const WX_KIND = (c) => (c === 0 ? 0 : c <= 2 ? 1 : c === 3 ? 2 : c <= 48 ? 3 : c <= 57 ? 4 : c <= 82 ? 5 : 6);
  // Heat level from the feels-like temperature (heat index bands).
  const heatLevel = (f) => (f < 27 ? 0 : f < 32 ? 1 : f < 39 ? 2 : f < 46 ? 3 : 4);
  const humLevel = (h) => (h < 40 ? 0 : h < 60 ? 1 : h < 80 ? 2 : 3);
  // Haze from fine particles (PM2.5, µg/m³), in the same bands Malaysia's API uses.
  const hazeLevel = (pm) => (pm <= 12 ? 0 : pm <= 35 ? 1 : pm <= 55 ? 2 : pm <= 150 ? 3 : 4);
  const LEVEL_COL = ['#3fd39a', '#9bd84a', '#ffb02e', '#f2753a', '#d9435a'];
  async function openWeatherSheet() {
    const city = CITIES.find((c) => c[0] === state.profile.city) || CITIES[0];
    sheet.innerHTML = `<div class="grab"></div><div class="wx-sheet"><h3>${esc(city[0])}</h3><p class="wx-load">${t('loadingWeather')}</p></div>`;
    openSheetEl();
    const box = $('.wx-sheet', sheet);
    try {
      const q = `latitude=${city[1]}&longitude=${city[2]}&timezone=Asia%2FKuala_Lumpur`;
      const [wr, ar] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?${q}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,uv_index&daily=temperature_2m_max,temperature_2m_min&forecast_days=1`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&current=pm2_5,pm10,us_aqi`).catch(() => null),
      ]);
      if (!wr.ok) throw new Error(wr.status);
      const c = (await wr.json());
      const air = ar && ar.ok ? (await ar.json()).current : null;
      const cur = c.current;
      const night = !cur.is_day;
      const hl = heatLevel(cur.apparent_temperature);
      const hu = humLevel(cur.relative_humidity_2m);
      const hz = air && air.pm2_5 != null ? hazeLevel(air.pm2_5) : -1;
      const row = (ic, label, val, lvl, txt, pct) => `<li><span class="wx-ic">${ic}</span><span class="wx-t"><small>${label}</small><b>${val}</b>
        ${txt ? `<em style="--c:${LEVEL_COL[lvl]}">${txt}</em>` : ''}</span>${pct != null ? `<span class="wx-meter"><i style="--w:${pct}%;--c:${LEVEL_COL[lvl]}"></i></span>` : ''}</li>`;
      if (sheet.querySelector('.wx-sheet') !== box) return;
      box.innerHTML = `<div class="wx-hero"><span class="wx-big">${WX_ICON(cur.weather_code, night)}</span>
          <div><h3>${esc(city[0])}</h3><p>${t('wxKinds')[WX_KIND(cur.weather_code)]}</p></div>
          <div class="wx-temp"><b>${Math.round(cur.temperature_2m)}°</b><small>${Math.round(c.daily.temperature_2m_min[0])}° / ${Math.round(c.daily.temperature_2m_max[0])}°</small></div></div>
        <ul class="wx-list">
          ${row('🌡️', t('wxFeels'), `${Math.round(cur.apparent_temperature)}°C`, hl, t('wxHeat')[hl], Math.min(100, Math.max(6, (cur.apparent_temperature - 22) / 26 * 100)))}
          ${row('💦', t('wxHum'), `${Math.round(cur.relative_humidity_2m)}%`, [1, 0, 2, 3][hu], t('wxHumL')[hu], cur.relative_humidity_2m)}
          ${hz >= 0 ? row('🌫️', t('wxHaze'), `PM2.5 ${Math.round(air.pm2_5)} µg/m³`, hz, t('wxHazeL')[hz], Math.min(100, Math.max(6, air.pm2_5 / 1.5))) : row('🌫️', t('wxHaze'), '—', 0, '', null)}
          ${row('🔆', t('wxUv'), Math.round(cur.uv_index), Math.min(4, Math.floor(cur.uv_index / 2.5)), '', Math.min(100, cur.uv_index / 11 * 100))}
          ${row('🍃', t('wxWind'), `${Math.round(cur.wind_speed_10m)} km/h`, 0, '', null)}
        </ul>
        <p class="wx-tip">${hz >= 2 ? t('wxTipHaze') : hl >= 2 ? t('wxTipHot') : t('wxTipOk')}</p>
        <p class="wx-src">${t('wxSrc')}</p>`;
      requestAnimationFrame(() => box.querySelectorAll('.wx-meter i').forEach((i) => i.classList.add('go')));
    } catch {
      if (sheet.querySelector('.wx-sheet') === box) box.innerHTML = `<h3>${esc(city[0])}</h3><p class="wx-load">${t('wxFail')}</p>`;
    }
  }

  // Deleting everything takes two steps: confirm, then a final button that unlocks after a short countdown.
  function openDeleteSheet() {
    sheet.innerHTML = `<div class="grab"></div>
      <div class="del-step">
        <div class="del-icon">🗑</div>
        <h3>${t('del1Title')}</h3>
        <p>${t('del1Body')}</p>
        <button class="danger-btn" id="del1">${t('del1Yes')}</button>
        <button class="cta ghost" id="delCancel">${t('cancel')}</button>
      </div>`;
    openSheetEl();
    $('#delCancel', sheet).addEventListener('click', closeSheet);
    $('#del1', sheet).addEventListener('click', () => {
      sheet.innerHTML = `<div class="grab"></div>
        <div class="del-step">
          <div class="del-icon">⚠️</div>
          <h3>${t('del2Title')}</h3>
          <p>${t('del2Body')}</p>
          <button class="danger-btn" id="del2" disabled>${t('del2Wait', { s: 3 })}</button>
          <button class="cta ghost" id="delCancel">${t('cancel')}</button>
        </div>`;
      $('#delCancel', sheet).addEventListener('click', closeSheet);
      const btn = $('#del2', sheet);
      let left = 3;
      const timer = setInterval(() => {
        left--;
        if (!btn.isConnected) { clearInterval(timer); return; }
        if (left > 0) btn.textContent = t('del2Wait', { s: left });
        else { clearInterval(timer); btn.disabled = false; btn.textContent = t('del2Yes'); }
      }, 1000);
      btn.addEventListener('click', () => {
        // Leaving the leaderboard too: friends stop seeing you.
        if (state.friends && state.friends.code) friendsApi('POST', { action: 'delete' }).catch(() => {});
        try { localStorage.removeItem(STORE_KEY); } catch {}
        btn.textContent = t('deleted');
        setTimeout(() => location.reload(), 600);
      });
    });
  }

  // ---------- daily review ----------
  const SWEET = ['tehtarik', 'milo', 'bandung', 'barli', 'limau', 'isotonik'];
  const CAFFEINE = { kopio: 95, tehtarik: 45 }; // mg per 250 ml
  // Share of the waking day that has passed (1 for past days).
  function dayElapsed() {
    const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number);
    const toMin = (x) => { const [a, b] = x.split(':').map(Number); return a * 60 + b; };
    const w = toMin(state.profile.wake);
    let sl = toMin(state.profile.sleep);
    let now = h * 60 + m;
    if (sl <= w) { sl += 1440; if (now < w) now += 1440; }
    return Math.max(0, Math.min(1, (now - w) / (sl - w)));
  }

  function review(d, isToday) {
    const goal = d.goal || baseGoal();
    const tot = total(d);
    const raw = d.log.reduce((a, x) => a + x.ml, 0);
    const plain = d.log.filter((x) => x.drink === 'air' || x.drink === 'kelapa').reduce((a, x) => a + x.ml, 0);
    const waterShare = raw ? plain / raw : 0;
    const sweet = d.log.filter((x) => SWEET.includes(x.drink) || findDrink(x.drink).sweet).length;
    const caff = Math.round(d.log.reduce((a, x) => a + ((CAFFEINE[x.drink] || findDrink(x.drink).caff || 0) * x.ml) / 250, 0));
    const expected = isToday ? dayElapsed() : 1;
    const progress = tot / goal;
    const times = d.log.map((x) => x.t).sort((a, b) => a - b);
    let gap = 0;
    for (let i = 1; i < times.length; i++) gap = Math.max(gap, times[i] - times[i - 1]);
    if (isToday && times.length && expected < 1) gap = Math.max(gap, Date.now() - times[times.length - 1]);
    const gapH = gap / 3600e3;
    const score = !d.log.length ? 0 : Math.min(100, Math.round(
      55 * Math.min(1, progress / Math.max(expected, .15)) + 30 * waterShare + 15 * (sweet <= 1 ? 1 : sweet === 2 ? .5 : 0)));
    const grade = score >= 85 ? 0 : score >= 65 ? 1 : score >= 40 ? 2 : 3;
    const tips = [];
    if (!d.log.length) tips.push(t(isToday ? 'tipStart' : 'dayEmpty'));
    else {
      const behind = Math.round((expected * goal - tot) / 50) * 50;
      if (progress < 1 && behind >= 250) tips.push(isToday ? t('tipBehind', { ml: fmt(behind) }) : t('tipMissed', { ml: fmt(Math.round((goal - tot) / 50) * 50) }));
      if (sweet >= 2) tips.push(t('tipSugar', { n: sweet }));
      if (caff >= 300) tips.push(t('tipCaffeine', { mg: caff }));
      if (waterShare < .5) tips.push(t('tipWaterShare', { p: Math.round(waterShare * 100) }));
      if (gapH >= 3) tips.push(t('tipGap', { h: gapH.toFixed(1) }));
      const w = todaysWeather();
      if (isToday && w && heatBonus(w.feels) && progress < expected) tips.push(t('tipHeat'));
      if (!tips.length) tips.push(t('tipGreat'));
    }
    return { score, grade, waterShare, sweet, caff, gapH, tips: tips.slice(0, 3), count: d.log.length };
  }

  function reviewCard(d, isToday) {
    const r = review(d, isToday);
    const chips = r.count ? `<div class="review-stats">
        <span class="stat-chip">💧 ${t('statWater', { p: Math.round(r.waterShare * 100) })}</span>
        <span class="stat-chip ${r.sweet >= 2 ? 'warn' : ''}">🍬 ${t('statSweet', { n: r.sweet })}</span>
        <span class="stat-chip ${r.caff >= 300 ? 'warn' : ''}">☕ ${t('statCaffeine', { mg: r.caff })}</span>
        ${r.count > 1 && r.gapH >= .1 ? `<span class="stat-chip ${r.gapH >= 3 ? 'warn' : ''}">⏱ ${t('statGap', { h: r.gapH.toFixed(1) })}</span>` : ''}
      </div>` : '';
    return `<div class="card review">
      <div class="review-head">
        <div class="score-ring g${r.grade}" style="--p:${r.score}"><b>${r.score}</b></div>
        <div><h3>${t(isToday ? 'reviewTitle' : 'reviewDay')}</h3><p class="grade g${r.grade}">${r.count ? t('grades')[r.grade] : t('gradeNone')}</p></div>
      </div>
      ${chips}
      <ul class="tips">${r.tips.map((x) => `<li>${x}</li>`).join('')}</ul>
      ${isToday && r.tips.length > 1 ? `<span class="more-tips">${t('moreTips', { n: r.tips.length - 1 })}</span>` : ''}
    </div>`;
  }

  // Tap a day in History to see what was drunk and how the day went.
  function openDaySheet(k) {
    const isToday = k === dayKey();
    const d = isToday ? today() : (state.days[k] || { log: [], goal: baseGoal() });
    const goal = d.goal || baseGoal();
    const tot = total(d);
    const title = new Intl.DateTimeFormat(L()._locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(k + 'T12:00:00'));
    const strip = d.log.length ? `<div class="day-strip">${d.log.map((x) => {
      const dr = findDrink(x.drink);
      return `<i style="flex:${x.eff};background:${dr.id === 'air' ? 'var(--water-1)' : dr.color}" title="${drinkName(dr)}"></i>`;
    }).join('')}${tot < goal ? `<i class="rest" style="flex:${goal - tot}"></i>` : ''}</div>` : '';
    sheet.innerHTML = `<div class="grab"></div>
      <div class="day-sheet">
        <h3>${title}</h3>
        <p class="day-total"><b>${fmt(tot)}</b> / ${fmt(goal)} ml · ${Math.round((tot / goal) * 100)}%</p>
        ${strip}
        ${reviewCard(d, isToday)}
        <ul class="log">${d.log.length ? d.log.map((x) => {
          const dr = findDrink(x.drink);
          return `<li>${cupSvg(dr)}<div class="t"><b>${drinkName(dr)} · ${x.ml} ml</b><small>${timeStr(x.t)}${x.eff !== x.ml ? ` · ${t('countsAs', { ml: x.eff })}` : ''}</small></div></li>`;
        }).join('') : `<li class="empty">${t('dayEmpty')}</li>`}</ul>
      </div>`;
    openSheetEl();
  }

  // ---------- motion helpers ----------
  // A ring of coloured dots that orbits and pulses around Meowie while the goal is worked out.
  function orbitDots() {
    const colors = ['#3fb4f0', '#8fd14f', '#ffb02e', '#f39bb7', '#c98b4e', '#7b6cf0'];
    return Array.from({ length: 42 }, (_, i) =>
      `<span style="--a:${(i * 360 / 42).toFixed(1)}deg"><i style="background:${colors[i % colors.length]};animation-delay:${(i * .06).toFixed(2)}s"></i></span>`).join('');
  }
  // Floating ice cubes behind the goal screen.
  function iceField() {
    const cubes = [[8, 14, 46, -12], [78, 8, 38, 18], [64, 46, 56, 8], [6, 58, 34, -22], [86, 70, 44, 30], [30, 84, 40, 12], [46, 22, 26, -6]];
    return `<div class="ice-field" aria-hidden="true">${cubes.map(([x, y, s, r], i) =>
      `<i style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;--r:${r}deg;animation-delay:${(-i * .9).toFixed(1)}s"></i>`).join('')}</div>`;
  }
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

  // ---------- friends and the leaderboard ----------
  // Opt-in: nothing leaves the phone until you join. Then your name, avatar and water progress
  // (today, this week, streak) are shared with the friends you add, and theirs with you.
  const joined = () => !!(state.friends && state.friends.code);
  let frSort = 'today';
  // The week runs Monday to Sunday, Malaysia time.
  function weekDays() {
    const todayK = dayKey();
    const dow = (new Date(todayK + 'T12:00:00Z').getUTCDay() + 6) % 7;
    return Array.from({ length: 7 }, (_, i) => dayKey(new Date(Date.now() + (i - dow) * 864e5)));
  }
  function myCard() {
    const d = today();
    const wk = weekDays();
    return {
      name: state.profile.name || t('friend'), av: state.avatar || 1, day: dayKey(), ml: total(d), goal: d.goal,
      weekOf: wk[0], week: wk.map((k) => { const r = state.days[k]; return r && r.goal ? Math.round(total(r) / r.goal * 100) : 0; }),
      streak: streakCount(), hits: daysHit(),
    };
  }
  async function friendsApi(method, body, qs = '') {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 9000);
    try {
      const f = state.friends || {};
      const res = await fetch('/api/friends' + qs, method === 'GET' ? { signal: ctl.signal, cache: 'no-store' } : {
        method, signal: ctl.signal, headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: f.code, secret: f.secret, ...body }), keepalive: body.action === 'delete',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error || 'error'), { status: res.status, code: data.error });
      return data;
    } finally { clearTimeout(timer); }
  }
  let syncTimer = 0;
  function scheduleSync(ms = 1500) {
    if (!joined()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => friendsApi('POST', { action: 'sync', card: myCard() }).catch(() => {}), ms);
  }
  async function joinFriends() {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const secret = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' }[c]));
    const data = await friendsApi('POST', { action: 'sync', card: myCard(), code: undefined, secret });
    state.friends = { code: data.me.code, secret, board: { me: data.me, friends: [] } };
    save();
  }
  async function loadBoard() {
    const data = await friendsApi('GET', null, `?code=${state.friends.code}`);
    state.friends.board = data;
    save();
    return data;
  }
  async function addFriend(code) {
    code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) { toast(t('frBadCode')); return false; }
    if (code === state.friends.code) { toast(t('frSelf')); return false; }
    try {
      const { friend } = await friendsApi('POST', { action: 'add', friend: code });
      toast(t('frAdded', { name: esc(friend.name) }), avatarSrc(friend.av));
      if (navigator.vibrate) navigator.vibrate([15, 40, 15]);
      return true;
    } catch (e) {
      toast(e.status === 404 ? t('frNotFound') : e.code === 'full' ? t('frFull') : t('frOffline'));
      return false;
    }
  }
  async function acceptInvite() {
    const code = state.pendingFriend;
    if (!code) return;
    delete state.pendingFriend;
    save();
    if (!joined()) {
      try { await joinFriends(); } catch { toast(t('frOffline')); state.pendingFriend = code; save(); return; }
    }
    if (await addFriend(code) && tab === 'friends') renderFriends();
  }

  // Scores for each way of ranking: today's %, this week's points (each day's % up to 100), streak.
  function score(c, by) {
    if (by === 'today') return c.day === dayKey() ? Math.round(c.ml / c.goal * 100) : 0;
    if (by === 'week') return c.weekOf === weekDays()[0] ? c.week.reduce((s, x) => s + Math.min(100, x), 0) : 0;
    return c.streak;
  }
  const scoreText = (v, by) => (by === 'today' ? `${v}%` : by === 'week' ? t('frPts', { n: fmt(v) }) : `🔥 ${v}`);
  function subText(c, by) {
    if (by === 'today') return c.day === dayKey() ? `${fmt(c.ml)} / ${fmt(c.goal)} ml` : t('frNotYet');
    if (by === 'week') return t('frWeekHit', { n: c.weekOf === weekDays()[0] ? c.week.filter((x) => x >= 100).length : 0 });
    return t('frDaysHit', { n: c.hits });
  }

  // The podium, rows and note for one way of ranking.
  function frBoard(by) {
    const f = state.friends;
    const board = f.board || { me: null, friends: [] };
    // Your own row always uses what's on this phone, so it's never behind.
    const me = { ...(board.me || {}), ...myCard(), code: f.code, me: true };
    const rows = [me, ...board.friends.filter((x) => x.code !== f.code)]
      .map((c) => ({ ...c, v: score(c, by) }))
      .sort((a, b) => b.v - a.v || (b.me ? 1 : 0) - (a.me ? 1 : 0));
    const top = rows[0] && rows[0].v > 0 ? rows[0].v : 0;
    const max = Math.max(1, ...rows.map((r) => r.v), by === 'today' ? 100 : by === 'week' ? 700 : 7);
    const medal = (i) => ['🥇', '🥈', '🥉'][i] || `<span class="rk">${i + 1}</span>`;
    const podium = rows.length >= 2 ? `<div class="fr-podium">${[1, 0, 2].filter((i) => rows[i]).map((i) => `
      <button type="button" class="pod p${i + 1}" data-fr="${rows[i].code}">
        <span class="pav">${i === 0 && top ? '<i class="crown">👑</i>' : ''}<img src="${avatarSrc(rows[i].av)}" alt=""></span>
        <b>${rows[i].me ? t('frYou') : esc(rows[i].name)}</b><small>${scoreText(rows[i].v, by)}</small>
        <span class="step">${i + 1}</span></button>`).join('')}</div>` : '';
    const list = rows.map((r, i) => `
        <button type="button" class="fr-row ${r.me ? 'me' : ''}" data-fr="${r.code}" style="animation-delay:${i * 50}ms">
          <span class="fr-rank">${medal(i)}</span>
          <img class="fr-av" src="${avatarSrc(r.av)}" alt="">
          <span class="fr-main"><b>${esc(r.name)}${r.me ? ` <em>${t('frYou')}</em>` : ''}</b><small>${subText(r, by)}</small>
            <span class="fr-bar"><i style="width:${Math.min(100, r.v / max * 100)}%"></i></span></span>
          <span class="fr-val">${scoreText(r.v, by)}</span></button>`).join('');
    const note = by === 'week' ? t('frWeekNote') : by === 'today' ? t('frTodayNote') : t('frStreakNote');
    return { rows, podium, list, note };
  }

  function renderFriends() {
    if (!joined()) {
      show('friends', `<h2 class="prof-title">${t('frTitle')} <span class="ttl-ic">${CUP_SVG}</span></h2>
        <div class="card fr-join">
          <div class="fr-avs" aria-hidden="true">${[3, 8, 12].map((i, k) => `<img src="${avatarSrc(i)}" alt="" style="animation-delay:${k * .25}s">`).join('')}</div>
          <h3>${t('frJoinTitle')}</h3><p>${t('frJoinBody')}</p>
          <ul class="fr-points"><li>🏆 ${t('frPoint1')}</li><li>🔥 ${t('frPoint2')}</li><li>🔒 ${t('frPoint3')}</li></ul>
          <button class="cta" id="frJoin">${t('frJoin')}</button>
        </div>`, {
        onMount: (el) => {
          el.classList.add('home');
          $('#frJoin', el).addEventListener('click', async (e) => {
            const b = e.currentTarget;
            b.disabled = true;
            b.textContent = t('frJoining');
            try { await joinFriends(); confetti(60); renderFriends(); } catch { toast(t('frOffline')); b.disabled = false; b.textContent = t('frJoin'); }
          });
        },
      });
      return;
    }
    const f = state.friends;
    const idx = ['today', 'week', 'streak'].indexOf(frSort);
    let cur = frBoard(frSort);
    show('friends', `<h2 class="prof-title">${t('frTitle')} <span class="ttl-ic">${CUP_SVG}</span>
        <button type="button" class="fr-refresh" id="frRefresh" aria-label="${t('frRefresh')}">↻</button></h2>
      <div class="seg fr-seg" role="tablist"><span class="seg-pill" style="transform:translateX(calc(${idx} * (100% + 4px)))"></span>${['today', 'week', 'streak'].map((k) => `<button type="button" role="tab" aria-selected="${k === frSort}" class="${k === frSort ? 'on' : ''}" data-sort="${k}">${t('frSort')[k]}</button>`).join('')}</div>
      <div id="frPodium">${cur.podium}</div>
      <div class="fr-list fr-enter" id="frList">${cur.list}</div>
      ${cur.rows.length < 2 ? `<p class="fr-empty">${t('frEmpty')}</p>` : ''}
      <p class="fr-note" id="frNote">${cur.note}</p>
      <div class="card fr-code">
        <small>${t('frYourCode')}</small>
        <b class="code" id="frCode">${f.code}</b>
        <div class="fr-code-btns"><button type="button" class="ghost-btn" id="frCopy">📋 ${t('frCopy')}</button><button type="button" class="cta" id="frShare">💌 ${t('frInvite')}</button></div>
      </div>
      <form class="fr-add" id="frAdd" autocomplete="off">
        <input class="field" id="frIn" maxlength="6" placeholder="${t('frAddPh')}" autocapitalize="characters" spellcheck="false" aria-label="${t('frAddPh')}">
        <button class="cta" type="submit">${t('frAdd')}</button>
      </form>
      <p class="fr-privacy">🔒 ${t('frPoint3')}</p>`, {
      onMount: (el) => {
        el.classList.add('home');
        // Switching the ranking updates the board in place: the pill slides across, rows glide to
        // their new places and the bars grow or shrink, with no rebuild of the screen.
        el.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => {
          if (b.dataset.sort === frSort) return;
          frSort = b.dataset.sort;
          const i = ['today', 'week', 'streak'].indexOf(frSort);
          $('.seg-pill', el).style.transform = `translateX(calc(${i} * (100% + 4px)))`;
          el.querySelectorAll('[data-sort]').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
          const list = $('#frList', el);
          const before = {};
          list.querySelectorAll('.fr-row').forEach((r) => { before[r.dataset.fr] = { top: r.getBoundingClientRect().top, w: r.querySelector('.fr-bar i').style.width }; });
          cur = frBoard(frSort);
          list.classList.remove('fr-enter');
          list.innerHTML = cur.list;
          const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
          list.querySelectorAll('.fr-row').forEach((r) => {
            const old = before[r.dataset.fr];
            if (!old || calm) return;
            const bar = r.querySelector('.fr-bar i');
            const w = bar.style.width;
            bar.style.transition = 'none';
            bar.style.width = old.w;
            const dy = old.top - r.getBoundingClientRect().top;
            if (dy) r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,.8,.3,1)' });
            r.querySelector('.fr-val').animate([{ opacity: .2, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
            requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = ''; bar.style.width = w; }));
          });
          const pod = $('#frPodium', el);
          pod.innerHTML = cur.podium;
          pod.querySelectorAll('.pod').forEach((x) => { x.style.animation = 'none'; });
          if (!calm && cur.podium) pod.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
          $('#frNote', el).textContent = cur.note;
        }));
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-fr]');
          if (b) openFriendSheet(cur.rows.find((r) => r.code === b.dataset.fr));
        });
        $('#frRefresh', el).addEventListener('click', (e) => { e.currentTarget.classList.add('spin'); refreshBoard(true); });
        $('#frCopy', el).addEventListener('click', () => {
          (navigator.clipboard ? navigator.clipboard.writeText(f.code) : Promise.reject()).then(() => toast(t('frCopied')), () => toast(f.code));
        });
        $('#frShare', el).addEventListener('click', () => {
          const url = `${location.origin}/?f=${f.code}`;
          const text = t('frShareText', { code: f.code });
          if (navigator.share) navigator.share({ title: 'Minum Air · Meowie', text, url }).catch(() => {});
          else (navigator.clipboard ? navigator.clipboard.writeText(`${text} ${url}`) : Promise.reject()).then(() => toast(t('frLinkCopied')), () => toast(url));
        });
        const inp = $('#frIn', el);
        inp.addEventListener('input', () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
        $('#frAdd', el).addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = e.currentTarget.querySelector('button');
          btn.disabled = true;
          if (await addFriend(inp.value)) { inp.value = ''; await refreshBoard(); }
          btn.disabled = false;
        });
      },
    });
  }
  let boardBusy = false;
  async function refreshBoard(loud) {
    if (!joined() || boardBusy) return;
    boardBusy = true;
    try {
      await friendsApi('POST', { action: 'sync', card: myCard() }).catch(() => {});
      await loadBoard();
      if (tab === 'friends') renderFriends();
    } catch (e) {
      // This phone's place on the board is gone (deleted elsewhere): start over.
      if (e.status === 404 || e.status === 403) { delete state.friends; save(); if (tab === 'friends') renderFriends(); }
      else if (loud) toast(t('frOffline'));
      const r = $('#frRefresh'); if (r) r.classList.remove('spin');
    } finally { boardBusy = false; }
  }

  // A friend's week at a glance, and the way to remove them.
  function openFriendSheet(c) {
    if (!c) return;
    const wk = weekDays();
    const thisWeek = c.weekOf === wk[0];
    const dayName = (k) => new Intl.DateTimeFormat(L()._locale, { weekday: 'narrow' }).format(new Date(k + 'T12:00:00'));
    const todayPct = score(c, 'today');
    sheet.innerHTML = `<div class="grab"></div><div class="fr-sheet">
      <img class="fr-big" src="${avatarSrc(c.av)}" alt="">
      <h3>${esc(c.name)}${c.me ? ` <em>${t('frYou')}</em>` : ''}</h3>
      <div class="fr-stats"><div><b>${todayPct}%</b><small>${t('frSort').today}</small></div><div><b>🔥 ${c.streak}</b><small>${t('frSort').streak}</small></div><div><b>${fmt(score(c, 'week'))}</b><small>${t('frSort').week}</small></div></div>
      <div class="week fr-week">${wk.map((k, i) => { const v = thisWeek ? c.week[i] : 0; return `<div class="bar ${k === dayKey() ? 'today' : ''}"><div class="b ${v >= 100 ? 'hit' : ''}"><i style="height:${Math.min(100, v)}%"></i></div><span>${dayName(k)}</span></div>`; }).join('')}</div>
      ${c.me ? `<button type="button" class="danger-btn" id="frLeave">${t('frLeave')}</button>` : `<button type="button" class="ghost-btn" id="frRemove">${t('frRemove')}</button>`}
    </div>`;
    openSheetEl();
    const rm = $('#frRemove');
    if (rm) rm.addEventListener('click', async () => {
      rm.disabled = true;
      try { await friendsApi('POST', { action: 'remove', friend: c.code }); closeSheet(); toast(t('frRemoved', { name: esc(c.name) })); await refreshBoard(); } catch { toast(t('frOffline')); rm.disabled = false; }
    });
    const lv = $('#frLeave');
    if (lv) lv.addEventListener('click', async () => {
      if (lv.dataset.sure !== '1') { lv.dataset.sure = '1'; lv.textContent = t('frLeaveSure'); return; }
      lv.disabled = true;
      try { await friendsApi('POST', { action: 'delete' }); } catch (e) { if (e.status !== 404) { toast(t('frOffline')); lv.disabled = false; return; } }
      delete state.friends; save(); closeSheet(); renderFriends();
    });
  }

  // ---------- 100% reward ----------
  // A full-screen celebration: light rays, a ring that fills to 100%, then Meowie's dance video
  // pops in with stars and confetti. Plays once a day when the goal is first reached.
  // The dance video is fetched ahead of time, once today's goal is in sight, and played from
  // memory so it never stops to buffer.
  let rewardUrl = null;
  let rewardLoading = false;
  function preloadReward() {
    if (rewardUrl || rewardLoading) return;
    rewardLoading = true;
    const mp4 = document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"');
    fetch(mp4 ? 'meowie-reward.mp4' : 'meowie-reward.webm')
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => { rewardUrl = URL.createObjectURL(b); })
      .catch(() => {})
      .finally(() => { rewardLoading = false; });
  }
  // Light rays drawn once into a small canvas; the screen only turns it (cheap on phones).
  function raysCanvas() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.translate(256, 256);
    g.fillStyle = 'rgba(255,255,255,.14)';
    for (let i = 0; i < 16; i++) {
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 256, 0, Math.PI * 2 / 40); g.closePath(); g.fill();
      g.rotate(Math.PI * 2 / 16);
    }
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createRadialGradient(0, 0, 20, 0, 0, 256);
    fade.addColorStop(0, '#000'); fade.addColorStop(.35, 'rgba(0,0,0,.9)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade;
    g.fillRect(-256, -256, 512, 512);
    c.className = 'rw-rays';
    c.setAttribute('aria-hidden', 'true');
    return c;
  }

  function showReward(newScene) {
    if (document.querySelector('.reward')) return;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wantSound = !window.MASound || MASound.sfx;
    const stars = Array.from({ length: 14 }, (_, i) => {
      const a = i / 14 * Math.PI * 2;
      const r = 38 + (i % 3) * 7;
      return `<i style="left:${(50 + Math.cos(a) * r).toFixed(1)}%;top:${(46 + Math.sin(a) * r * .9).toFixed(1)}%;animation-delay:${(1.2 + (i % 5) * .25).toFixed(2)}s;--s:${(.6 + (i % 4) * .2).toFixed(1)}"></i>`;
    }).join('');
    const el = document.createElement('div');
    el.className = 'reward';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', t('rewardTitle'));
    el.innerHTML = `<div class="rw-stars" aria-hidden="true">${stars}</div>
      <div class="rw-body">
        <div class="rw-badge">
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="rw-track"/><circle cx="60" cy="60" r="52" class="rw-ring" pathLength="100"/></svg>
          <b><span id="rwNum">0</span><small>%</small></b>
        </div>
        <h2 class="rw-title">${t('rewardTitle')}</h2>
        <div class="rw-film"><video playsinline preload="auto" disablepictureinpicture ${rewardUrl ? `src="${rewardUrl}"` : ''}>${rewardUrl ? '' : '<source src="meowie-reward.mp4" type="video/mp4"><source src="meowie-reward.webm" type="video/webm">'}</video>
          <button class="rw-snd" type="button" hidden aria-label="${t('sndSfxLong')}">🔇</button></div>
        <p class="rw-sub">${t('rewardSub', { name: esc(state.profile.name || 'Kawan') })}</p>
        ${newScene ? `<div class="rw-unlock"><img src="bg-${newScene}-s.webp" alt=""><span>${t('sceneNew', { name: t('scenes')[newScene] })}</span></div>` : ''}
        <button class="cta rw-go" type="button">${newScene ? t('sceneTry') : t('rewardBtn')}</button>
      </div>`;
    el.insertBefore(raysCanvas(), el.firstChild);
    document.body.appendChild(el);
    const v = $('video', el);
    if (window.MASound) v.volume = MASound.sfxVol;
    const snd = $('.rw-snd', el);
    let closed = false;
    if (window.MASound) MASound.hush(true);
    requestAnimationFrame(() => el.classList.add('on'));
    animateNumber($('#rwNum', el), 0, 100, calm ? 10 : 1200);
    if (navigator.vibrate) navigator.vibrate([30, 60, 30, 60, 80]);
    // Confetti bursts as the ring fills and again when the dance ends, never during the video,
    // so the phone can give the video its full attention.
    confetti(110);
    // The video joins once the ring has filled.
    setTimeout(() => {
      if (closed) return;
      v.muted = !wantSound;
      v.play().catch(() => {
        // The phone blocked sound: play muted and let a tap on the speaker turn it on.
        v.muted = true;
        if (wantSound) snd.hidden = false;
        v.play().catch(() => {});
      });
    }, calm ? 0 : 1300);
    snd.addEventListener('click', () => { v.muted = false; snd.hidden = true; v.play().catch(() => {}); });
    // The phone's back button closes the reward (like tapping the button).
    rewardCloser = () => close();
    syncBack();
    v.addEventListener('ended', () => { el.classList.add('done'); if (!closed) confetti(90); });
    function close() {
      if (closed) return;
      closed = true;
      rewardCloser = null;
      syncBack();
      v.pause();
      if (window.MASound) MASound.hush(false);
      el.classList.remove('on');
      el.classList.add('off');
      setTimeout(() => el.remove(), 450);
    }
    $('.rw-go', el).addEventListener('click', () => {
      close();
      // A world unlocked with this goal moves in straight away.
      if (newScene) setTimeout(() => { setSceneChoice(newScene); state.scenesSeen = [...new Set([...(state.scenesSeen || []), newScene])]; save(); renderHome(false); }, 300);
    });
  }

  // Confetti in Jalur Gemilang colours.
  const fx = $('#fx');
  function confetti(count = 140) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = fx.getContext('2d');
    // Up to 2x is plenty for confetti and keeps the canvas light on 3x phones.
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    fx.width = innerWidth * dpr; fx.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#cc0001', '#ffffff', '#010066', '#ffcc00', '#5cc4ff'];
    const parts = Array.from({ length: count }, () => ({
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

  // "+250 ml" rises out of the water after a drink.
  function floatMl(text) {
    if (!homeCat || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = homeCat.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float-ml';
    el.textContent = text;
    el.style.left = r.left + r.width / 2 + 'px';
    el.style.top = r.top + r.height * .45 + 'px';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
  function bump(el) {
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // Parallax: tilt the phone (or move the mouse) and the water scene shifts in layers.
  let tiltFrame = 0;
  function applyTilt(nx, ny) {
    if (tiltFrame) return;
    tiltFrame = requestAnimationFrame(() => {
      tiltFrame = 0;
      const cx = Math.max(-1, Math.min(1, nx));
      const cy = Math.max(-1, Math.min(1, ny));
      document.querySelectorAll('.screen.active .cat-wrap').forEach((w) => Meowie.tilt(w, cx, cy));
    });
  }
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    applyTilt(e.gamma / 25, (e.beta - 45) / 30);
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    applyTilt((e.clientX / innerWidth - .5) * 2, (e.clientY / innerHeight - .5) * 2);
  });
  // iOS asks permission for motion sensors; request it on the first touch.
  window.addEventListener('pointerdown', function askMotion() {
    window.removeEventListener('pointerdown', askMotion);
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {});
  });

  // Water ripple on the main button where it was pressed.
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.cta, .add-more, .drink-chip');
    if (!b) return;
    const r = b.getBoundingClientRect();
    const dot = document.createElement('span');
    dot.className = 'press-ripple';
    dot.style.left = e.clientX - r.left + 'px';
    dot.style.top = e.clientY - r.top + 'px';
    b.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove());
  });

  let toastTimer;
  function toast(msg, avatar) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('with-av', !!avatar);
    if (avatar) t.insertAdjacentHTML('afterbegin', `<img src="${avatar}" alt="">`);
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
  // Pace-based: Meowie only speaks up when you fall behind where you should be by now, with the
  // waking day as the clock (halfway through your day, about half your goal). Ignored reminders
  // back off, and each style has its own gap, leeway and daily cap.
  const REMIND_STYLES = { gentle: { gap: 120, slack: .15, max: 4 }, balanced: { gap: 90, slack: .1, max: 6 }, keen: { gap: 60, slack: .05, max: 8 } };
  const remindStyle = () => REMIND_STYLES[state.profile.remindStyle] || REMIND_STYLES.balanced;
  function dayProgress() {
    const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number);
    const toMin = (x) => { const [a, b] = x.split(':').map(Number); return a * 60 + b; };
    const w = toMin(state.profile.wake);
    let sl = toMin(state.profile.sleep);
    if (sl <= w) sl += 1440;
    let now = h * 60 + m;
    if (now < w) now += 1440;
    return Math.max(0, Math.min(1, (now - w) / (sl - w)));
  }
  function paceCheck() {
    if (!state.onboarded || !state.profile.remind || !inWakeWindow()) return;
    const d = today();
    const st = remindStyle();
    const goal = d.goal;
    const have = total(d);
    if (have >= goal) return;
    const expected = goal * dayProgress();
    if (have >= expected - goal * st.slack) return;
    const r = state.remindLog && state.remindLog.day === dayKey() ? state.remindLog : (state.remindLog = { day: dayKey(), n: 0, last: 0, ignored: 0 });
    if (r.n >= st.max) return;
    const lastDrink = d.log.length ? d.log[d.log.length - 1].t : 0;
    if (lastDrink > r.last) r.ignored = 0;
    const now = Date.now();
    // Never right after a drink, and each ignored reminder doubles the wait (up to 4 hours).
    if (now - lastDrink < 30 * 6e4) return;
    if (now - r.last < Math.min(240, st.gap * Math.pow(2, r.ignored)) * 6e4) return;
    if (r.last && lastDrink < r.last) r.ignored++;
    r.n++;
    r.last = now;
    save();
    const ml = Math.max(50, Math.ceil((expected - have) / 50) * 50);
    const body = t('remindPace', { name: friend(), p: Math.round(have / goal * 100), e: Math.round(expected / goal * 100), ml: fmt(ml) });
    if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
      // Each reminder comes from a different Meowie.
      const icon = '/' + avatarSrc(randomAvatar());
      navigator.serviceWorker.ready.then((reg) => reg.showNotification('Meowie 🦈', { body, icon, badge: '/icon-192.png', tag: 'minum', renotify: true })).catch(() => {});
    } else if (!document.hidden) toast(body, avatarSrc(randomAvatar()));
  }
  setInterval(paceCheck, 60e3);

  // New day while open → refresh.
  let lastDay = dayKey();
  setInterval(() => {
    if (dayKey() !== lastDay) { lastDay = dayKey(); fetchWeather(); if (current === 'home') renderHome(false); }
  }, 60e3);

  // ---------- boot ----------
  // An invite link (?f=CODE) adds that friend once you're set up.
  const inviteCode = new URLSearchParams(location.search).get('f');
  if (inviteCode && /^[A-Za-z0-9]{6}$/.test(inviteCode)) {
    state.pendingFriend = inviteCode.toUpperCase();
    save();
    history.replaceState(null, '', location.pathname + location.hash);
  }
  applyLang();
  if (state.onboarded) fetchWeather();
  splash();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then((r) => r.update()).catch(() => {});

  }
})();
