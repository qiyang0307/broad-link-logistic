// Meowie: the shark-hood cat, played from his own video clips (background and all).
// Each action is a short clip: idling, looking around, drinking, being petted, celebrating,
// wading in and swimming. A base loop plays all the time; actions cross-fade in on top of it
// and fade back out, so he never pops. A translucent tint over the video rises with the day's
// water and takes on the colour of what you drank.
(function () {
  let uid = 0;

  // Overlay geometry (viewBox 0 0 400 286, the stage's 1.4 aspect).
  const W = 400;
  const H = 286;
  const levelY = (p) => 282 - p * 236;
  const FADE = 320;

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 0 thirsty, 1 meh, 2 content, 3 happy, 4 over the moon
  const moodFor = (p) => (p >= 1 ? 4 : p >= .75 ? 3 : p >= .45 ? 2 : p >= .2 ? 1 : 0);

  // Clips. Loops were cut so their last frame dissolves into their first.
  // pos is the object-position that keeps the action in view when the sides are cropped.
  const CLIPS = {
    idle: { loop: true },
    calm: { loop: true },
    look: {},
    happy: {},
    drink: { pos: '62% 50%' },
    pet: { pos: '60% 50%' },
    swimin: {},
    swim: {},
  };
  const src = (name) => `meowie-${name}.mp4`;

  function skyNow() {
    const forced = (location.hash || '').slice(1);
    if (['day', 'dusk', 'night'].includes(forced)) return forced;
    const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', hour12: false }).format(new Date()));
    return h >= 7 && h < 18 ? 'day' : h >= 18 && h < 20 ? 'dusk' : 'night';
  }

  function wave(amp) {
    let d = `M-60 ${amp}`;
    for (let x = -60; x < 900; x += 60) d += ` Q${x + 15} 0 ${x + 30} ${amp} T${x + 60} ${amp}`;
    return d + ' V420 H-60 Z';
  }

  const sfxOn = () => !window.MASound || window.MASound.sfx;

  function video(cls) {
    return `<video class="mw-vid ${cls}" muted playsinline preload="auto" disablepictureinpicture></video>`;
  }

  function create(opts = {}) {
    const id = 'mw' + (++uid);
    const wrap = document.createElement('div');
    wrap.className = 'cat-wrap mw-v' + (opts.intro ? ' mw--intro' : '');
    wrap.innerHTML = `<div class="mw-screen" role="img" aria-label="Meowie, a cat in a shark hood">
      <div class="mw-film">${video('mw-base mw-on')}${video('mw-base')}${video('mw-act')}</div>
      <svg class="mw-over mw mw--m0" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="${id}-mix" class="mw-mix" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--water-1)"/><stop offset="1" style="stop-color: var(--water-2)"/></linearGradient></defs>
        <g class="mw-water"><g class="mw-slosh"><g class="mw-wave">
          <path d="${wave(7)}" fill="url(#${id}-mix)" class="mw-tint"/>
          <path d="${wave(7).replace(/ V420 H-60 Z$/, '')}" fill="none" stroke="#fff" stroke-width="2.5" stroke-opacity=".75"/></g></g></g>
        <g class="mw-fx"></g>
      </svg>
    </div>`;
    wrap._mw = { id, level: 0, mode: 'sit', mood: 0, busy: false, layers: [], base: 'idle', vibe: null, act: null };
    const [b1, b2, act] = wrap.querySelectorAll('video');
    wrap._mw.vids = { bases: [b1, b2], act };
    setBase(wrap, 'idle', true);
    watchVisible(wrap);
    place(wrap, 0);
    return wrap;
  }

  // Play the videos only while Meowie is on screen: in the page, on the active screen, in view.
  function onScreen(wrap) {
    if (!wrap.isConnected || document.hidden) return false;
    const scr = wrap.closest('.screen');
    if (scr && !scr.classList.contains('active')) return false;
    const r = wrap.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }
  function watchVisible(wrap) {
    const st = wrap._mw;
    (function check() {
      const vis = onScreen(wrap);
      if (vis !== st.visible) {
        st.visible = vis;
        const base = st.vids.bases.find((v) => v.classList.contains('mw-on'));
        if (vis) { safePlay(base); if (st.act) safePlay(st.vids.act, !st.vids.act.muted); }
        else wrap.querySelectorAll('video').forEach((v) => v.pause());
      }
      // Keep checking while he exists; stop once he has been removed for good.
      if (wrap.isConnected || !st.everShown) setTimeout(check, 500);
      if (wrap.isConnected) st.everShown = true;
    })();
  }

  function safePlay(v, withSound) {
    if (!v) return Promise.resolve();
    v.muted = !withSound;
    const p = v.play();
    if (!p || !p.catch) return Promise.resolve();
    // If the browser won't play with sound yet, play muted instead.
    return p.catch(() => { if (!v.muted) { v.muted = true; return v.play().catch(() => {}); } });
  }

  function load(v, name) {
    if (v.dataset.clip !== name) {
      v.dataset.clip = name;
      v.src = src(name);
      v.style.objectPosition = CLIPS[name].pos || '50% 50%';
      v.loop = !!CLIPS[name].loop;
    }
  }

  // Cross-fade the base loop to another clip.
  function setBase(wrap, name, instant) {
    const st = wrap._mw;
    const [a, b] = st.vids.bases;
    const cur = a.classList.contains('mw-on') ? a : b;
    const next = cur === a ? b : a;
    if (cur.dataset.clip === name) return;
    st.base = name;
    if (instant || !cur.dataset.clip) {
      load(cur, name);
      cur.currentTime = 0;
      if (st.visible !== false) safePlay(cur);
      return;
    }
    load(next, name);
    next.currentTime = 0;
    const go = () => {
      next.classList.add('mw-on');
      cur.classList.remove('mw-on');
      setTimeout(() => { if (!cur.classList.contains('mw-on')) cur.pause(); }, FADE + 60);
    };
    if (next.readyState >= 2) { safePlay(next); go(); }
    else { next.addEventListener('loadeddata', go, { once: true }); safePlay(next); }
  }

  const baseFor = (st) => (st.mode === 'swim' || st.vibe === 'relax' ? 'calm' : 'idle');

  // Play an action clip over the base loop; resolves once it has faded back out.
  function play(wrap, name, o = {}) {
    const st = wrap._mw;
    const v = st.vids.act;
    if (reduced() || st.visible === false) return Promise.resolve();
    if (st.act) st.act.cancel();
    return new Promise((done) => {
      let over = false;
      let raf = 0;
      const finish = () => {
        if (over) return;
        over = true;
        cancelAnimationFrame(raf);
        v.classList.remove('mw-on');
        if (window.MASound) window.MASound.duck(false);
        setTimeout(() => { if (st.act === token) { st.act = null; v.pause(); } done(); }, FADE);
      };
      const token = { cancel: finish };
      st.act = token;
      load(v, name);
      v.playbackRate = o.rate || 1;
      try { v.currentTime = 0; } catch {}
      const sound = sfxOn() && o.sound !== false;
      v.volume = .8;
      const start = () => {
        if (over) return;
        v.classList.add('mw-on');
        if (sound && window.MASound) window.MASound.duck(true);
        // Fade back to the base loop just before the clip ends.
        (function watch() {
          if (over) return;
          if (v.duration && v.currentTime >= v.duration - (FADE / 1000) * v.playbackRate - .05) return finish();
          if (v.ended) return finish();
          raf = requestAnimationFrame(watch);
        })();
      };
      safePlay(v, sound).then(() => { if (v.readyState >= 2) start(); else v.addEventListener('playing', start, { once: true }); });
      setTimeout(finish, 9000);
    });
  }

  function place(wrap, pct) {
    const st = wrap._mw;
    wrap.querySelectorAll('.mw-water').forEach((g) => { g.style.transform = `translateY(${levelY(pct)}px)`; });
    const swim = st.forceSwim || pct >= .45;
    const was = st.mode;
    st.mode = swim ? 'swim' : 'sit';
    wrap.querySelector('svg').classList.toggle('mw--swim', swim);
    if (was !== st.mode && st.placed && swim) {
      // Wading in: the tank fills up around him, then he swims. Waits for a drink to finish first.
      (async () => {
        while (st.busy) await wait(200);
        if (st.mode !== 'swim') return;
        st.busy = true;
        setTimeout(() => setBase(wrap, baseFor(st)), 1800);
        try { await play(wrap, 'swimin'); if (st.mode === 'swim') await play(wrap, 'swim'); } finally { st.busy = false; }
      })();
    } else setBase(wrap, baseFor(st), !st.placed);
  }

  // The drinks blend into one colour: a weighted mix of everything poured in, kept bright and watery.
  const WATER = [63, 180, 240];
  const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgbHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  function liven([r, g, b], light, minSat) {
    // Through HSL so a blue + brown mix stays a clear tint instead of going grey.
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, sat = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      sat = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    sat = Math.max(sat, minSat);
    l = Math.max(.25, Math.min(.85, l + light));
    const q = l < .5 ? l * (1 + sat) : l + sat - l * sat, p = 2 * l - q;
    const f = (tt) => { tt = (tt + 1) % 1; return tt < 1 / 6 ? p + (q - p) * 6 * tt : tt < .5 ? q : tt < 2 / 3 ? p + (q - p) * (2 / 3 - tt) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function renderLayers(wrap) {
    const st = wrap._mw;
    const stops = wrap.querySelectorAll('.mw-mix stop');
    const layers = (st.layers || []).filter((l) => l.w > 0);
    if (!layers.some((l) => l.color)) {
      stops[0].style.stopColor = 'var(--water-1)';
      stops[1].style.stopColor = 'var(--water-2)';
      return;
    }
    const tot = layers.reduce((a, l) => a + l.w, 0);
    const mix = [0, 0, 0];
    layers.forEach((l) => {
      const c = l.color ? hexRgb(l.color) : WATER;
      for (let i = 0; i < 3; i++) mix[i] += (c[i] * l.w) / tot;
    });
    stops[0].style.stopColor = rgbHex(liven(mix, .12, .45));
    stops[1].style.stopColor = rgbHex(liven(mix, -.1, .5));
  }

  function setLayers(wrap, layers) {
    wrap._mw.layers = layers || [];
    renderLayers(wrap);
  }

  // Body build from thin (-1) to chubby (1): the picture widens a touch.
  function setBuild(wrap, k) {
    const b = Math.max(-1, Math.min(1, k));
    wrap.querySelector('.mw-film').style.setProperty('--build', (1 + b * .1).toFixed(3));
  }

  // Activity moods: relax (calm underwater loop), walk (looks around often), hyper (celebrates).
  function setVibe(wrap, vibe) {
    const st = wrap._mw;
    st.vibe = vibe;
    setBase(wrap, baseFor(st));
    if (vibe === 'walk') play(wrap, 'look');
    else if (vibe === 'hyper') play(wrap, 'happy', { rate: 1.15 });
  }

  function setMood(wrap, mood, instant) {
    const st = wrap._mw;
    const svg = wrap.querySelector('svg');
    for (let i = 0; i <= 4; i++) svg.classList.toggle('mw--m' + i, i === mood);
    if (!instant && mood > st.mood && mood >= 3 && !st.busy) play(wrap, 'happy');
    st.mood = mood;
  }

  function setLevel(wrap, pct, opts = {}) {
    const p = Math.max(0, Math.min(1, pct));
    const first = !wrap._mw.placed;
    if (!first && p > wrap._mw.level + .001) slosh(wrap);
    wrap._mw.level = p;
    place(wrap, p);
    wrap._mw.placed = true;
    setMood(wrap, moodFor(pct), opts.instant || first);
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // The water tint wobbles when something lands in it.
  function slosh(wrap, strength = 1) {
    if (reduced()) return;
    wrap.querySelectorAll('.mw-slosh').forEach((g) => g.animate([
      { transform: 'scaleY(1)' },
      { transform: `scaleY(${1 + 1.8 * strength})` },
      { transform: `scaleY(${1 - .5 * strength})` },
      { transform: `scaleY(${1 + .5 * strength})` },
      { transform: 'scaleY(1)' },
    ], { duration: 1500, easing: 'ease-out' }));
  }

  function floatHearts(wrap, n) {
    const fx = wrap.querySelector('.mw-fx');
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < n; i++) {
      const h = document.createElementNS(ns, 'path');
      h.setAttribute('d', 'M0 6 C-9 0 -6 -7 0 -3 C6 -7 9 0 0 6 Z');
      h.setAttribute('fill', '#ff7a98');
      fx.appendChild(h);
      const x0 = 200 + (i - (n - 1) / 2) * 30;
      h.animate([
        { transform: `translate(${x0}px, 120px) scale(.2)`, opacity: 0 },
        { transform: `translate(${x0 + (i % 2 ? 8 : -8)}px, 90px) scale(1.3)`, opacity: 1, offset: .3 },
        { transform: `translate(${x0}px, 30px) scale(.9)`, opacity: 0 },
      ], { duration: 1400, delay: 200 + i * 200, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }).onfinish = () => h.remove();
    }
  }

  // Actions the app asks for by name.
  async function act(wrap, name) {
    const st = wrap && wrap._mw;
    if (!st || st.busy) return;
    st.busy = true;
    try {
      if (name === 'drink') await play(wrap, 'drink');
      else if (name === 'jump') await play(wrap, 'happy');
      else if (name === 'swim') await play(wrap, st.mode === 'swim' ? 'swim' : 'look');
    } finally {
      st.busy = false;
    }
  }

  // Tap to pet: a hand comes in and gives him a rub.
  async function pet(wrap) {
    const st = wrap._mw;
    if (st.busy) return;
    st.busy = true;
    if (navigator.vibrate) navigator.vibrate([8, 50, 8, 50, 8]);
    try { await play(wrap, 'pet'); } finally { st.busy = false; }
  }

  // Idle life: look around, celebrate when the day is going well, swim about in the water.
  function startIdle(wrap) {
    const st = wrap._mw;
    if (st.idle) return;
    st.idle = true;
    (function next() {
      setTimeout(() => {
        if (!wrap.isConnected) { st.idle = false; return; }
        if (!document.hidden && !st.busy && !st.act && st.visible !== false) {
          const r = Math.random();
          if (st.mode === 'swim') play(wrap, r < .6 ? 'swim' : 'look');
          else if (st.vibe === 'hyper' || (st.mood >= 3 && r < .45)) play(wrap, 'happy');
          else play(wrap, 'look');
        }
        next();
      }, 7000 + Math.random() * 6000);
    })();
  }

  function interact(wrap, { onTap } = {}) {
    const screen = wrap.querySelector('.mw-screen');
    let down = null;
    screen.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY };
      if (window.MASound) window.MASound.unlock();
    });
    screen.addEventListener('pointerup', (e) => {
      if (!down) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12) {
        pet(wrap);
        if (onTap) onTap();
      }
      down = null;
    });
    screen.addEventListener('pointercancel', () => { down = null; });
    startIdle(wrap);
  }

  // Parallax: the picture drifts a little with phone tilt or pointer position.
  function tilt(wrap, nx, ny) {
    const f = wrap.querySelector('.mw-film');
    if (f) f.style.setProperty('--tx', `${(nx * 6).toFixed(1)}px`), f.style.setProperty('--ty', `${(ny * 4).toFixed(1)}px`);
  }

  // Where to aim things at Meowie's glass, in screen coordinates.
  function pourTarget(wrap) {
    const r = wrap.querySelector('.mw-screen').getBoundingClientRect();
    return { x: r.left + r.width * .74, y: r.top + r.height * .62 };
  }
  const pourPoint = pourTarget;

  // A drink for Meowie: the drinking clip pours his glass and he laps it up.
  async function pourAndDrink(wrap) {
    const st = wrap._mw;
    if (reduced()) { slosh(wrap, .6); return; }
    if (st.busy) { slosh(wrap, .6); await wait(600); return; }
    st.busy = true;
    try {
      setTimeout(() => floatHearts(wrap, 3), 3200);
      await play(wrap, 'drink');
    } finally {
      st.busy = false;
    }
  }

  const noop = () => {};
  window.Meowie = { create, setLevel, setLayers, pourPoint, act, moodFor, interact, tilt, slosh, lookAt: noop, pet, pour: () => Promise.resolve(), pourAndDrink, pourTarget, skyNow, setBuild, setVibe };
})();
