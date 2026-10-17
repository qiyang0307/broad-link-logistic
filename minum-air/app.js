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
    { id: 'air', name: 'Air Kosong', color: '#9fdcff', hyd: 1, ice: false },
    { id: 'tehtarik', name: 'Teh Tarik', color: '#c98b4e', hyd: .8, foam: '#f1dcc0' },
    { id: 'kopio', name: 'Kopi O', color: '#4a2c1a', hyd: .8 },
    { id: 'milo', name: 'Milo Ais', color: '#7a4a2a', hyd: .85, ice: true, foam: '#9b6a45' },
    { id: 'bandung', name: 'Sirap Bandung', color: '#f39bb7', hyd: .9, ice: true },
    { id: 'kelapa', name: 'Air Kelapa', color: '#f4f1e2', hyd: 1, ice: true },
    { id: 'limau', name: 'Air Limau', color: '#d9ef7a', hyd: 1, ice: true },
    { id: 'barli', name: 'Air Barli', color: '#efe3bd', hyd: .95, ice: true },
    { id: 'isotonik', name: 'Isotonik', color: '#d6f0ff', hyd: .95 },
  ];
  const SIZES = [[150, 'Cawan'], [250, 'Gelas'], [400, 'Besar'], [600, 'Jumbo mamak']];

  const ACTIVITY = {
    santai: { label: 'Santai', sub: 'Kerja ofis, banyak duduk', ic: '🛋️', add: 0 },
    sederhana: { label: 'Aktif sikit', sub: 'Jalan kaki, kerja berdiri', ic: '🚶', add: 350 },
    aktif: { label: 'Aktif gila', sub: 'Gym, futsal, kerja luar', ic: '⚽', add: 700 },
  };
  const GENDER = {
    lelaki: { label: 'Lelaki', ic: '👨', f: 1 },
    perempuan: { label: 'Perempuan', ic: '👩', f: .92 },
    rahsia: { label: 'Tak nak bagitahu', ic: '🤐', f: .96 },
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
  }, load());

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
      <button class="back" type="button" data-act="back" aria-label="Kembali">←</button>
      <div class="progress"><i style="width:${pct}%"></i></div>
      ${skip ? '<button class="skip" type="button" data-act="skip">Langkau</button>' : '<span style="width:40px"></span>'}
    </div>`;
  }
  function hero(say, opts = {}) {
    return `<div class="ob-hero" style="flex-direction:column;align-items:center;gap:12px">
      ${say ? `<div class="bubble-say">${say}</div>` : ''}<div class="hero-cat" data-intro="${opts.intro ? 1 : ''}"></div></div>`;
  }
  function mountCat(el, { size = 150, level = 0, intro = false } = {}) {
    const holder = $('.hero-cat', el);
    if (!holder) return null;
    const cat = BosMeow.create({ intro: intro || holder.dataset.intro === '1' });
    cat.style.width = size + 'px';
    holder.appendChild(cat);
    requestAnimationFrame(() => BosMeow.setLevel(cat, level));
    return cat;
  }

  function goStep(i, back = false) {
    stepIdx = i;
    const step = STEPS[i];
    const p = state.profile;
    const name = p.name || 'kawan';
    const fill = Math.min(.9, i / STEPS.length);
    let html = '';
    let mount = null;

    switch (step) {
      case 'welcome':
        html = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center" class="stagger">
          ${hero('Hai! Saya <b>Bos Meow</b> 😎<br>Cikgu minum air you.', { intro: true })}
          <h1 class="ob-title">Minum air, jangan malas!</h1>
          <p class="ob-sub">Setiap gelas isi badan Bos Meow. Target ikut cuaca panas Malaysia hari ni ☀️</p>
        </div>
        <div class="ob-foot"><button class="cta" data-act="next">Jom mula!</button>
        <button class="cta ghost" data-act="demo">Tengok demo dulu</button></div>`;
        mount = (el) => mountCat(el, { size: 170, level: .25 });
        break;

      case 'name':
        html = `${chrome(step, { skip: true })}${hero('Boleh saya panggil you apa?')}
          <div class="ob-body stagger"><h1 class="ob-title">Nama you?</h1><p class="ob-sub">Nanti Bos Meow tegur dengan nama ni.</p>
          <input class="field" id="nameIn" maxlength="20" placeholder="cth. Aisyah, Ah Meng, Kumar" value="${esc(p.name)}" autocomplete="given-name"></div>
          <div class="ob-foot"><button class="cta" data-act="next">Seterusnya</button></div>`;
        mount = (el) => {
          mountCat(el, { level: fill });
          const inp = $('#nameIn', el);
          inp.addEventListener('input', () => { p.name = inp.value.trim(); save(); });
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') next(); });
        };
        break;

      case 'gender':
        html = `${chrome(step)}${hero(`Selamat berkenalan, ${esc(name)}! 🤝`)}
          <div class="ob-body"><h1 class="ob-title">Jantina</h1><p class="ob-sub">Bantu kira keperluan air badan.</p>
          <div class="stagger" style="display:grid;gap:10px">${Object.entries(GENDER).map(([k, g]) =>
            `<button class="option ${p.gender === k ? 'sel' : ''}" data-pick="gender" data-val="${k}"><span class="ic">${g.ic}</span><b>${g.label}</b></button>`).join('')}</div></div>
          <div class="ob-foot"><button class="cta" data-act="next" ${p.gender ? '' : 'disabled'}>Seterusnya</button></div>`;
        mount = (el) => mountCat(el, { level: fill });
        break;

      case 'weight':
        html = `${chrome(step)}${hero('Rahsia, Bos Meow tak bagitahu sesiapa 🤫')}
          <div class="ob-body"><h1 class="ob-title">Berat badan</h1>
          <div class="big-num"><span id="wNum">${p.weight}</span> <small>kg</small></div>
          <div class="stepper"><button type="button" data-w="-1" aria-label="Kurang">−</button>
          <input type="range" id="wRange" min="30" max="150" value="${p.weight}" aria-label="Berat badan" style="max-width:200px">
          <button type="button" data-w="1" aria-label="Tambah">+</button></div></div>
          <div class="ob-foot"><button class="cta" data-act="next">Seterusnya</button></div>`;
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
        html = `${chrome(step)}${hero('Selalu berpeluh tak? 💦')}
          <div class="ob-body"><h1 class="ob-title">Tahap aktiviti</h1><p class="ob-sub">Lagi aktif, lagi banyak air diperlukan.</p>
          <div class="stagger" style="display:grid;gap:10px">${Object.entries(ACTIVITY).map(([k, a]) =>
            `<button class="option ${p.activity === k ? 'sel' : ''}" data-pick="activity" data-val="${k}"><span class="ic">${a.ic}</span><span><b>${a.label}</b><small>${a.sub}</small></span></button>`).join('')}</div></div>
          <div class="ob-foot"><button class="cta" data-act="next" ${p.activity ? '' : 'disabled'}>Seterusnya</button></div>`;
        mount = (el) => mountCat(el, { level: fill });
        break;

      case 'city':
        html = `${chrome(step)}
          <div class="ob-body"><h1 class="ob-title" style="margin-top:14px">Duduk mana? 📍</h1><p class="ob-sub">Bos Meow semak cuaca setiap hari. Hari panas = target naik.</p>
          <div class="city-list stagger">${CITIES.map(([c]) =>
            `<button class="option ${p.city === c ? 'sel' : ''}" data-pick="city" data-val="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
          <div class="ob-foot" style="position:sticky;bottom:0;background:linear-gradient(transparent,var(--bg) 30%)"><button class="cta" data-act="next" ${p.city ? '' : 'disabled'}>Seterusnya</button></div>`;
        break;

      case 'times':
        html = `${chrome(step)}${hero('Bos Meow tak kacau masa you tidur 😴')}
          <div class="ob-body"><h1 class="ob-title">Rutin harian</h1><p class="ob-sub">Peringatan hanya antara waktu bangun dan tidur.</p>
          <div class="time-row stagger">
            <div class="time-card"><div class="ic">🌅</div><label for="wakeIn">Bangun</label><input type="time" id="wakeIn" value="${p.wake}"></div>
            <div class="time-card"><div class="ic">🌙</div><label for="sleepIn">Tidur</label><input type="time" id="sleepIn" value="${p.sleep}"></div>
          </div></div>
          <div class="ob-foot"><button class="cta" data-act="next">Kira target saya</button></div>`;
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
            <li>Kira ikut berat ${p.weight} kg</li><li>Tambah tahap aktiviti</li>
            <li>Semak cuaca ${esc(p.city)}</li><li>Siapkan pelan minum</li>
          </ul></div>`;
        mount = (el) => {
          el.classList.add('calc');
          const cat = mountCat(el, { size: 190, level: 0 });
          fetchWeather();
          const items = el.querySelectorAll('#checks li');
          const t0 = performance.now();
          const dur = 2800;
          (function tick(now) {
            const k = Math.min(1, (now - t0) / dur);
            $('#calcPct', el).textContent = Math.round(k * 100) + '%';
            BosMeow.setLevel(cat, k);
            items.forEach((li, i) => li.classList.toggle('done', k >= (i + 1) / items.length - .02));
            if (k < 1) requestAnimationFrame(tick);
            else { BosMeow.react(cat, 'party'); setTimeout(() => current === 'ob-calc' && next(), 700); }
          })(t0);
        };
        break;

      case 'goal': {
        const g = GENDER[p.gender] || GENDER.rahsia;
        const a = ACTIVITY[p.activity] || ACTIVITY.santai;
        const w = todaysWeather();
        const bonus = heatBonus(w && w.feels);
        html = `${chrome(step)}${hero(`Ini target you, ${esc(name)}! 💪`)}
          <div class="ob-body stagger">
            <div class="goal-card"><div style="text-align:center;color:var(--muted);font-weight:800">Target harian</div>
              <div class="big-num"><span id="goalNum">0</span> <small>ml</small></div>
              <div style="text-align:center;color:var(--muted);font-weight:700">≈ ${Math.ceil(baseGoal() / 250)} gelas sehari</div>
              <ul class="breakdown">
                <li>Berat ${p.weight} kg × 33 ml${g.f !== 1 ? ` × ${g.f}` : ''}<b>${fmt(p.weight * 33 * g.f)} ml</b></li>
                <li>Aktiviti: ${a.label}<b>+${a.add} ml</b></li>
                <li>Cuaca hari ini${w ? ` (${Math.round(w.feels)}° terasa)` : ''}<b>${bonus ? '+' + bonus : '+0'} ml</b></li>
              </ul></div>
            <p class="ob-sub" style="margin-top:4px">Hari panas, target naik automatik. Hari sejuk (hujan), balik ke asal.</p>
          </div>
          <div class="ob-foot"><button class="cta" data-act="next">Cantik, setuju!</button></div>`;
        mount = (el) => {
          const cat = mountCat(el, { level: 1 });
          setTimeout(() => BosMeow.react(cat, 'happy'), 300);
          countUp($('#goalNum', el), baseGoal() + bonus, 1200);
        };
        break;
      }

      case 'notify':
        html = `${chrome(step)}${hero('Kalau you lupa, Bos Meow tegur sikit je 🔔')}
          <div class="ob-body stagger"><h1 class="ob-title">Peringatan minum</h1>
          <p class="ob-sub">Bos Meow ingatkan bila dah lama tak minum, antara ${p.wake} hingga ${p.sleep}.</p>
          <div class="card" style="display:flex;gap:12px;align-items:center"><span style="font-size:30px">😼</span>
            <div><b>Bos Meow</b><div style="color:var(--muted);font-size:14px">Oi ${esc(name)}, dah 2 jam tak minum. Jom satu gelas! 💧</div></div></div></div>
          <div class="ob-foot"><button class="cta" data-act="allow">Boleh, ingatkan saya</button>
          <button class="cta ghost" data-act="finish">Nanti dulu</button></div>`;
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
    setTimeout(() => toast(`Selamat datang, ${state.profile.name || 'kawan'}! 🎉`), 500);
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
      if (cat) BosMeow.react(cat, 'wiggle');
      if (t.dataset.pick !== 'city') setTimeout(next, 380);
      return;
    }
    if (act === 'next') next();
    else if (act === 'back') stepIdx === 0 ? null : prev();
    else if (act === 'skip') next();
    else if (act === 'allow') finishOnboarding(true);
    else if (act === 'finish') finishOnboarding(false);
    else if (act === 'demo') runDemo();
    else if (act === 'start') goStep(0);
  });

  // Fills a sample profile so people can peek at the home screen first.
  function runDemo() {
    Object.assign(state.profile, { name: state.profile.name || 'Kawan', gender: 'rahsia', weight: 60, activity: 'sederhana', city: 'Kuala Lumpur' });
    finishOnboarding(false);
  }

  // ---------- splash ----------
  function splash() {
    const drops = Array.from({ length: 14 }, (_, i) =>
      `<span style="left:${(i * 7.3 + 3) % 100}%;animation-duration:${1.6 + (i % 5) * .35}s;animation-delay:${(i % 7) * .25}s"></span>`).join('');
    show('splash', `<div class="drops">${drops}</div>${hero('', { intro: true })}<h1>Minum Air</h1><p>bersama Bos Meow 😎</p>`, {
      onMount: (el) => {
        el.classList.add('splash');
        const cat = mountCat(el, { size: 200, level: 0 });
        setTimeout(() => BosMeow.setLevel(cat, .45), 900);
        el.addEventListener('click', () => leave());
        let left = false;
        function leave() { if (left) return; left = true; state.onboarded ? enterHome() : goStep(0); }
        setTimeout(leave, 2600);
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
    if (h < 12) return 'Selamat pagi';
    if (h < 14) return 'Selamat tengah hari';
    if (h < 19) return 'Selamat petang';
    return 'Selamat malam';
  }
  function catLine(d, pct) {
    const w = todaysWeather();
    const hot = w && w.feels >= HEAT_START;
    const n = esc(state.profile.name || 'bos');
    if (pct >= 1) return ['Target settle! Steady la you 😎', 'Badan segar, otak power 💪', 'Tak payah minum teh ais lagi, ok? 😆'];
    if (pct >= .75) return ['Sikit lagi je, can one!', `Last push, ${n}!`, 'Hampir penuh dah perut saya 🫃'];
    if (pct >= .5) return ['Separuh jalan dah 👍', 'Jangan tukar jadi teh tarik pula…', 'Steady, teruskan!'];
    if (pct > 0) return hot ? ['Panas gila hari ni 🥵 minum lagi!', 'Bahang betul, jangan lupa air!'] : ['Good start! Satu lagi?', 'Bos Meow masih dahaga 🥲'];
    return hot ? [`${Math.round(w.feels)}° terasa! Target naik hari ni ☀️`, 'Hari panas, mula dengan segelas air!'] : [`${greeting()}, ${n}! Jom segelas air 💧`, 'Perut saya kosong ni… 🥲'];
  }

  const bracket = (pct) => (pct >= 1 ? 4 : pct >= .75 ? 3 : pct >= .5 ? 2 : pct > 0 ? 1 : 0);

  let homeCat = null;
  let shownPct = 0;
  let tab = 'home';

  function renderHome(first) {
    if (tab !== 'home') return renderTab(tab);
    const d = today();
    const drunk = total(d);
    const pct = drunk / d.goal;
    const w = todaysWeather();
    const lines = catLine(d, pct);
    const name = esc(state.profile.name || 'kawan');
    const dateStr = new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    const bonus = heatBonus(w && w.feels);
    const html = `
      <div class="home-head"><div><h2>${greeting()}, ${name}</h2><p>${dateStr}</p></div>
        <span class="pill fire" title="Streak">🔥 ${streakCount()}</span></div>
      <span class="pill weather-chip">${w ? (w.feels >= HEAT_START ? '☀️' : '⛅') : '🌤️'} ${esc(state.profile.city || 'Malaysia')} ·
        ${w ? `${Math.round(w.feels)}° terasa${bonus ? ` · target +${bonus} ml` : ''}` : 'memuatkan cuaca…'}</span>
      <div class="stage"><div class="ring"></div><div class="bubble-say" id="say" data-bracket="${bracket(pct)}">${lines[0]}</div><div class="hero-cat"></div></div>
      <div class="stats-row"><div class="pct"><span id="pctNum">${Math.round(shownPct * 100)}</span>%</div>
        <div class="ml"><b id="mlNum">${fmt(drunk)}</b> / ${fmt(d.goal)} ml</div></div>
      <div class="add-main"><button class="cta" id="quickAdd">${cupSvg(DRINKS[0]).replace('<svg', '<svg style="width:26px;height:32px"')} + ${state.lastSize} ml air</button>
        <button class="add-more" id="moreBtn" aria-label="Minuman lain">+</button></div>
      <div class="drinks" id="drinkRow">${DRINKS.slice(1).map((x) =>
        `<button class="drink-chip" data-drink="${x.id}">${cupSvg(x)}<b>${x.name}</b></button>`).join('')}</div>
      <div class="section-title">Hari ini <small>${d.log.length} minuman</small></div>
      <ul class="log">${d.log.length ? d.log.slice().reverse().map((x) => {
        const dr = DRINKS.find((k) => k.id === x.drink) || DRINKS[0];
        return `<li>${cupSvg(dr)}<div class="t"><b>${dr.name} · ${x.ml} ml</b><small>${timeStr(x.t)}${x.eff !== x.ml ? ` · dikira ${x.eff} ml air` : ''}</small></div>
          <button class="del" data-del="${x.t}" aria-label="Padam">✕</button></li>`;
      }).join('') : '<li class="empty">Belum minum lagi hari ni. Tekan butang biru! 👆</li>'}</ul>`;

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
          homeCat = BosMeow.create({ intro: first });
          $('.hero-cat', el).appendChild(homeCat);
          shownPct = 0;
          wireHome(el, pct);
        },
      });
    }
    setTab('home');
  }

  function wireHome(el, pct) {
    BosMeow.setLevel(homeCat, pct);
    animateNumber($('#pctNum', el), shownPct * 100, Math.min(999, pct * 100), 900);
    shownPct = pct;
    $('#quickAdd', el).addEventListener('click', (e) => addDrink(DRINKS[0], state.lastSize, e.currentTarget));
    $('#moreBtn', el).addEventListener('click', () => openSheet());
    el.querySelectorAll('[data-drink]').forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.drink)));
    el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => removeDrink(Number(b.dataset.del))));
    homeCat.onclick = () => {
      BosMeow.react(homeCat, 'wiggle');
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
    d.log.push({ drink: drink.id, ml, eff, t: Date.now() });
    if (drink.id === 'air') state.lastSize = ml;
    save();
    if (navigator.vibrate) navigator.vibrate(20);
    if (fromEl) flyDrops(fromEl);
    setTimeout(() => {
      renderHome(false);
      BosMeow.react(homeCat, 'happy');
      const after = total(d);
      if (before < d.goal && after >= d.goal) {
        BosMeow.react(homeCat, 'party');
        confetti();
        toast('Target hari ni settle! 🎉🇲🇾');
      } else {
        toast(`+${eff} ml ${drink.id === 'air' ? '💧' : `(${drink.name})`}`);
      }
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
  function openSheet(drinkId) {
    let drink = DRINKS.find((x) => x.id === drinkId);
    let size = state.lastSize;
    function draw() {
      if (!drink) {
        sheet.innerHTML = `<div class="grab"></div><h3 style="font-size:22px">Minum apa tadi? 🥤</h3>
          <div class="drink-grid">${DRINKS.map((x) => `<button class="drink-chip" data-pick-drink="${x.id}">${cupSvg(x)}<b>${x.name}</b></button>`).join('')}</div>`;
        sheet.querySelectorAll('[data-pick-drink]').forEach((b) => b.addEventListener('click', () => { drink = DRINKS.find((x) => x.id === b.dataset.pickDrink); draw(); }));
        return;
      }
      sheet.innerHTML = `<div class="grab"></div>
        <div class="sheet-head">${cupSvg(drink, .3 + SIZES.findIndex((s) => s[0] === size) * .18)}<div><h3>${drink.name}</h3>
          <p>${drink.hyd === 1 ? 'Dikira 100% air 💧' : `Dikira ${Math.round(drink.hyd * 100)}% air (ada gula/kafein)`}</p></div></div>
        <div class="sizes">${SIZES.map(([ml, l]) => `<button class="${ml === size ? 'sel' : ''}" data-size="${ml}">${ml}<small>${l}</small></button>`).join('')}</div>
        <button class="cta" id="sheetAdd">Tambah ${size} ml</button>`;
      sheet.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => { size = Number(b.dataset.size); draw(); }));
      $('#sheetAdd', sheet).addEventListener('click', (e) => { const btn = e.currentTarget; closeSheet(); addDrink(drink, size, btn); });
    }
    draw();
    sheet.classList.add('open');
    sheetBg.classList.add('open');
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
    const names = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];
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
    show('history', `<h2 style="font-size:28px;margin-top:6px">Sejarah 📊</h2>
      <div class="card"><div class="section-title" style="margin:0 0 14px">7 hari lepas <small>% target</small></div>
        <div class="week">${days.map((x) => `<div class="bar ${x.i === 0 ? 'today' : ''}" title="${x.k}: ${fmt(x.ml)}/${fmt(x.goal)} ml">
          <div class="b ${x.ml >= x.goal ? 'hit' : ''}"><i data-h="${Math.min(100, Math.round(x.ml / x.goal * 100))}"></i></div>
          <span>${names[new Date(x.k + 'T12:00:00').getDay()]}</span></div>`).join('')}</div></div>
      <div class="tiles stagger">
        <div class="tile"><div class="v">🔥 ${streakCount()}</div><div class="l">Streak sekarang</div></div>
        <div class="tile"><div class="v">🏆 ${best}</div><div class="l">Streak terbaik</div></div>
        <div class="tile"><div class="v">${fmt(avg)}</div><div class="l">Purata ml / hari (7 hari)</div></div>
        <div class="tile"><div class="v">${hit}</div><div class="l">Hari capai target</div></div>
        <div class="tile"><div class="v">${cups}</div><div class="l">Jumlah minuman dicatat</div></div>
        <div class="tile"><div class="v">${fmt(baseGoal())}</div><div class="l">Target asas (ml)</div></div>
      </div>`, {
      onMount: (el) => {
        el.classList.add('home');
        setTimeout(() => el.querySelectorAll('.week i').forEach((i) => { i.style.height = i.dataset.h + '%'; }), 120);
      },
    });
  }

  function renderProfile() {
    const p = state.profile;
    const opt = (obj, v) => Object.entries(obj).map(([k, o]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${o.label}</option>`).join('');
    show('profile', `<h2 style="font-size:28px;margin-top:6px">Profil 😺</h2>
      ${hero('Nak ubah apa-apa? Target dikira semula automatik.')}
      <div class="card">
        <div class="prof-row"><span>Nama</span><input id="pName" value="${esc(p.name)}" maxlength="20"></div>
        <div class="prof-row"><span>Jantina</span><select id="pGender">${opt(GENDER, p.gender)}</select></div>
        <div class="prof-row"><span>Berat (kg)</span><input id="pWeight" type="number" min="30" max="150" value="${p.weight}" style="width:90px"></div>
        <div class="prof-row"><span>Aktiviti</span><select id="pAct">${opt(ACTIVITY, p.activity)}</select></div>
        <div class="prof-row"><span>Bandar</span><select id="pCity">${CITIES.map(([c]) => `<option ${c === p.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="prof-row"><span>Bangun / Tidur</span><span><input id="pWake" type="time" value="${p.wake}"> <input id="pSleep" type="time" value="${p.sleep}"></span></div>
        <div class="prof-row"><span>Target asas</span><b id="pGoal">${fmt(baseGoal())} ml</b></div>
      </div>
      <button class="danger" id="pReset">Padam semua data & mula semula</button>`, {
      onMount: (el) => {
        el.classList.add('home');
        mountCat(el, { size: 120, level: Math.min(1, total(today()) / today().goal) });
        const bind = (id, key, num) => $(id, el).addEventListener('change', (e) => {
          const v = num ? Math.max(30, Math.min(150, Number(e.target.value) || p[key])) : e.target.value;
          if (key === 'city' && v !== p.city) { state.weather = null; }
          p[key] = v;
          save();
          $('#pGoal', el).textContent = fmt(baseGoal()) + ' ml';
          if (key === 'city') fetchWeather();
          toast('Disimpan ✓');
        });
        bind('#pName', 'name'); bind('#pGender', 'gender'); bind('#pWeight', 'weight', true); bind('#pAct', 'activity');
        bind('#pCity', 'city'); bind('#pWake', 'wake'); bind('#pSleep', 'sleep');
        $('#pReset', el).addEventListener('click', () => {
          if (!confirm('Padam semua data minum dan profil?')) return;
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

  // Water droplets arc from the tapped button into Bos Meow.
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
    const body = `Oi ${state.profile.name || 'kawan'}, dah lama tak minum. Jom satu gelas! 💧`;
    if (state.profile.remind && 'Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((r) => r.showNotification('Bos Meow 😼', { body, icon: '/minum-air/icon.svg', tag: 'minum' })).catch(() => {});
    } else if (!document.hidden) toast(body);
  }, 60e3);

  // New day while open → refresh.
  let lastDay = dayKey();
  setInterval(() => {
    if (dayKey() !== lastDay) { lastDay = dayKey(); fetchWeather(); if (current === 'home') renderHome(false); }
  }, 60e3);

  // ---------- boot ----------
  if (state.onboarded) fetchWeather();
  splash();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/minum-air/sw.js', { scope: '/minum-air' })
      .catch(() => navigator.serviceWorker.register('/minum-air/sw.js').catch(() => {}));
  }
})();
