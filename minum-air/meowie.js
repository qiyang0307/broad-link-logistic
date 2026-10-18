// Meowie: a grey tabby in a shark hood, in a tank that fills up as you drink.
// He is played frame by frame from his own video clips (cut out of their backgrounds) inside
// a scene drawn in code: idling on the sand, lapping from his glass, being petted, a happy
// prance, and swimming left and right once the water is half way up.
(function () {
  let uid = 0;
  const LINE = '#454b54';

  // Scene geometry (viewBox 0 0 400 320). No frame: the water fades out at the sides.
  const W = 400;
  const FLOOR = 290;
  const levelY = (p) => 284 - p * 224;

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 0 thirsty, 1 meh, 2 content, 3 happy, 4 over the moon
  const moodFor = (p) => (p >= 1 ? 4 : p >= .75 ? 3 : p >= .5 ? 2 : p >= .2 ? 1 : 0);
  const SWIM_AT = .5;

  // Meowie is cut out of his video clips frame by frame (background removed, camera zoom undone)
  // and packed into one sprite sheet per action (each under 4096 px for phone GPUs). Cells are
  // 300 pose units tall at 1.1 px per unit; his feet sit at y 292 (swimming: his middle at y 172), centred across.
  // A second "ghost" layer holds the previous frame and fades out, so switching clips dissolves.
  const CELL_H = 300;
  const PX = 1.1;
  const COLS = 8;
  const SHEETS = {
    idle: { n: 61, w: 360, x: 180, cols: 8 }, pet: { n: 35, w: 520, x: 180, cols: 7 },
    drink: { n: 28, w: 360, x: 180, cols: 8 }, happy: { n: 26, w: 360, x: 180, cols: 8 },
    swim: { n: 15, w: 360, x: 180, cols: 8 }, roll: { n: 13, w: 360, x: 180, cols: 8 },
  };
  const sheetUrl = (name) => `meowie-${name}.webp`;
  const range = (a, b) => Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => (a < b ? a + i : a - i));
  const on = (sheet, frames) => frames.map((i) => [sheet, i]);
  const CLIPS = {
    // Lean in, lap a few times, then sit back up.
    drink: on('drink', range(0, 27).concat(range(26, 20), range(21, 27), range(26, 20), range(21, 27), range(27, 0).filter((_, i) => i % 2 === 0))),
    pet: on('pet', range(0, 34)),
    happy: on('happy', range(0, 25)),
    roll: on('roll', range(0, 12)),
  };
  const FPS = 15;
  const IDLE_FPS = 12;
  const SWIM_FPS = 15;
  const XFADE = 220;

  // Meowie's own sounds, cut from the clips.
  const SOUNDS = ['meow', 'purr', 'drink', 'happy', 'splash'];
  const sounds = {};
  function sfx(name, vol = .8) {
    if (window.MASound && !window.MASound.sfx) return;
    let a = sounds[name];
    if (!a) { a = sounds[name] = new Audio(`snd-${name}.mp3`); a.preload = 'auto'; }
    a.volume = vol;
    try { a.currentTime = 0; } catch {}
    if (window.MASound) window.MASound.duck(true);
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
    clearTimeout(sfx.t);
    sfx.t = setTimeout(() => window.MASound && window.MASound.duck(false), 1800);
  }

  const star = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill="#ffd54a"/>`;

  // Meowie lives in an HTML layer over the drawn scene, so stepping his frames only moves an image
  // (a GPU transform) instead of repainting the whole SVG tank.
  function layer(cls) {
    return `<div class="mw-layer ${cls}">${Object.entries(SHEETS).map(([n, s]) => `<div class="mw-cell" data-sheet="${n}" style="left:${-s.x}px;top:-292px;width:${s.w}px;height:${CELL_H}px;display:none">
      <img src="${sheetUrl(n)}" alt="" draggable="false" style="width:${s.w * s.cols}px"></div>`).join('')}</div>`;
  }

  // Meowie. Origin = between his feet when sitting.
  function sitPose() {
    return `<div class="mw-sit"><div class="mw-bodyfit"><div class="mw-look"><div class="mw-squish">
        ${layer('mw-main')}${layer('mw-ghost')}
        <div class="mw-hit" style="left:-90px;top:-210px;width:180px;height:210px"></div>
        <i class="mw-pt mw-mouth-pt"></i><i class="mw-pt mw-head-pt"></i>
      </div></div></div>
      <svg class="mw-deco" viewBox="-160 -340 320 360" aria-hidden="true">
        <path class="mw-x mw-sweat" d="M62 -196 Q70 -184 66 -178 Q61 -174 57 -179 Q55 -185 62 -196 Z" fill="#8fd3ff" stroke="#4fa8de" stroke-width="1.4"/>
        <g class="mw-x mw-spark">${star(-100, -200, 1)}${star(105, -180, .8)}${star(-115, -90, .7)}${star(115, -70, 1)}</g>
        <g class="mw-ball" transform="translate(-60 -240)"><g class="mw-ball-in">
          <circle r="17" fill="#fff" stroke="${LINE}" stroke-width="2.6"/>
          <path d="M-17 0 A17 17 0 0 1 0 -17 L0 0 Z" fill="#e8453c"/><path d="M17 0 A17 17 0 0 1 0 17 L0 0 Z" fill="#e8453c"/>
          <path d="M0 -17 A17 17 0 0 1 17 0 L0 0 Z" fill="#ffc93c"/><path d="M0 17 A17 17 0 0 1 -17 0 L0 0 Z" fill="#2f7fe0"/>
          <circle r="17" fill="none" stroke="${LINE}" stroke-width="2.6"/><circle cx="-6" cy="-7" r="4" fill="#fff" opacity=".7"/></g></g>
      </svg>
    </div>`;
  }

  function show(layerEl, [sheet, i]) {
    if (layerEl._key === sheet + i) return;
    const s = SHEETS[sheet];
    if (layerEl._sheet !== sheet) {
      layerEl.querySelectorAll('.mw-cell').forEach((g) => { g.style.display = g.dataset.sheet === sheet ? '' : 'none'; });
      layerEl._sheet = sheet;
    }
    layerEl._key = sheet + i;
    const im = layerEl.querySelector(`.mw-cell[data-sheet="${sheet}"] img`);
    im.style.transform = `translate3d(${-(i % s.cols) * s.w}px, ${-Math.floor(i / s.cols) * CELL_H}px, 0)`;
  }

  // Show one frame: [sheet, index]. Changing to a different clip dissolves from the last frame.
  function frame(wrap, f) {
    const st = wrap._mw;
    const main = wrap.querySelector('.mw-main');
    if (!main) return;
    // Hold the current frame until the next sheet has loaded, so there is never a blank frame.
    if (st.sheet !== f[0]) {
      const im = main.querySelector(`.mw-cell[data-sheet="${f[0]}"] img`);
      if (!im.complete || !im.naturalWidth) return;
    }
    if (st.sheet && st.sheet !== f[0] && !reduced()) {
      const ghost = wrap.querySelector('.mw-ghost');
      show(ghost, st.last);
      ghost.getAnimations().forEach((a) => a.cancel());
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: XFADE, easing: 'ease-out', fill: 'forwards' });
    }
    st.sheet = f[0];
    st.last = f;
    show(main, f);
  }

  // What he shows when nothing is playing: the idle loop on the sand, the swim cycle in the water.
  function idleFrame(wrap, now) {
    const st = wrap._mw;
    if (st.hold) return st.hold;
    if (reduced()) return [st.mode === 'swim' ? 'swim' : 'idle', 0];
    if (st.mode === 'swim') return ['swim', Math.floor((now / 1000) * SWIM_FPS) % SHEETS.swim.n];
    const relax = wrap.classList.contains('mw--relax');
    return ['idle', Math.floor((now / 1000) * IDLE_FPS * (relax ? .7 : 1)) % SHEETS.idle.n];
  }

  // One animation loop per Meowie steps whatever is playing.
  function run(wrap) {
    const st = wrap._mw;
    if (st.running) return;
    st.running = true;
    (function tick(now) {
      // Keep waiting until he is first put on the page; stop once he has been taken off it.
      if (!wrap.isConnected) {
        if (st.shown) { st.running = false; return; }
        requestAnimationFrame(tick);
        return;
      }
      st.shown = true;
      const c = st.clip;
      if (c) {
        const k = Math.max(0, Math.floor(((now - c.t0) / 1000) * c.fps));
        if (k >= c.frames.length) { st.clip = null; c.done(); frame(wrap, idleFrame(wrap, now)); }
        else frame(wrap, c.frames[k]);
      } else frame(wrap, idleFrame(wrap, now));
      requestAnimationFrame(tick);
    })(performance.now());
  }

  // Play a clip; resolves when done. A new clip cuts off the one playing.
  function play(wrap, name, o = {}) {
    const st = wrap._mw;
    if (st.clip) st.clip.done();
    if (reduced()) { st.clip = null; return Promise.resolve(); }
    return new Promise((done) => {
      st.clip = { frames: CLIPS[name], fps: o.fps || FPS, t0: performance.now(), done };
      if (!st.running) run(wrap);
    });
  }

  function wave(amp) {
    let d = `M-60 ${amp}`;
    for (let x = -60; x < 900; x += 60) d += ` Q${x + 15} 0 ${x + 30} ${amp} T${x + 60} ${amp}`;
    return d + ' V420 H-60 Z';
  }

  // Time of day in Malaysia picks the sky: sun, sunset or moon and stars.
  function skyNow() {
    const forced = (location.hash || '').slice(1);
    if (['day', 'dusk', 'night'].includes(forced)) return forced;
    const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', hour12: false }).format(new Date()));
    return h >= 7 && h < 18 ? 'day' : h >= 18 && h < 20 ? 'dusk' : 'night';
  }

  function skyMarkup(id, sky) {
    if (sky === 'night') {
      const stars = [[40, 30], [96, 14], [150, 44], [214, 18], [262, 52], [300, 22], [372, 70], [70, 72], [190, 60], [240, 86]]
        .map(([x, y], i) => `<path class="mw-star" style="animation-delay:${(i * .37).toFixed(2)}s" transform="translate(${x} ${y}) scale(${.35 + (i % 3) * .15})" d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z"/>`).join('');
      return `<g class="mw-sky">
        <rect x="0" y="-120" width="${W}" height="280" fill="url(#${id}-night)"/>
        <defs><linearGradient id="${id}-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a5a" stop-opacity="0"/><stop offset=".45" stop-color="#1b2a5a" stop-opacity=".45"/><stop offset="1" stop-color="#1b2a5a" stop-opacity="0"/></linearGradient>
          <mask id="${id}-moon"><rect x="280" y="0" width="100" height="100" fill="#fff"/><circle cx="345" cy="36" r="16" fill="#000"/></mask></defs>
        <g fill="#ffd54a">${stars}</g>
        <g class="mw-moon"><circle cx="336" cy="44" r="26" fill="#ffe7a0" opacity=".18"/><circle cx="336" cy="44" r="18" fill="#ffe7a0" mask="url(#${id}-moon)"/></g>
      </g>`;
    }
    const dusk = sky === 'dusk';
    const sx = 334;
    const sy = dusk ? 92 : 44;
    const rays = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return `M${(sx + Math.cos(a) * 24).toFixed(1)} ${(sy + Math.sin(a) * 24).toFixed(1)} L${(sx + Math.cos(a) * 33).toFixed(1)} ${(sy + Math.sin(a) * 33).toFixed(1)}`;
    }).join(' ');
    const cloud = (x, y, s, cls) => `<g class="mw-cloud ${cls}" transform="translate(${x} ${y}) scale(${s})"><path d="M0 14 Q0 0 14 2 Q20 -10 34 -4 Q48 -8 50 6 Q62 8 58 18 Z" fill="#fff" opacity=".9"/></g>`;
    return `<g class="mw-sky">
      ${dusk ? `<rect x="0" y="-120" width="${W}" height="280" fill="url(#${id}-dusk)"/><defs><linearGradient id="${id}-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a5a" stop-opacity="0"/><stop offset=".45" stop-color="#ff9a5a" stop-opacity=".3"/><stop offset="1" stop-color="#ff9a5a" stop-opacity="0"/></linearGradient></defs>` : ''}
      <g class="mw-sun"><circle cx="${sx}" cy="${sy}" r="34" fill="${dusk ? '#ff8a4c' : '#ffd54a'}" opacity=".2"/>
        <path class="mw-sunrays" d="${rays}" stroke="${dusk ? '#ff9a5a' : '#ffc93c'}" stroke-width="4" stroke-linecap="round" style="transform-origin:${sx}px ${sy}px"/>
        <circle cx="${sx}" cy="${sy}" r="18" fill="${dusk ? '#ff9a5a' : '#ffd54a'}"/></g>
      ${cloud(40, 30, .9, 'mw-cloud-1')}${cloud(190, 12, .7, 'mw-cloud-2')}
    </g>`;
  }

  function create(opts = {}) {
    const id = 'mw' + (++uid);
    const sky = opts.sky || skyNow();
    const bubbles = [60, 110, 170, 250, 300, 345].map((x, i) =>
      `<circle class="mw-bub" cx="${x}" cy="250" r="${2.5 + (i % 3) * 1.5}" style="animation-delay:${i * .8}s;animation-duration:${3.6 + (i % 3) * .9}s"/>`).join('');
    const weed = (x, h, c, cls) => `<g class="mw-weed ${cls}"><path d="M${x} ${FLOOR + 2} C${x - 10} ${FLOOR - h * .3} ${x + 12} ${FLOOR - h * .5} ${x} ${FLOOR - h * .75} C${x - 8} ${FLOOR - h * .9} ${x + 6} ${FLOOR - h} ${x + 2} ${FLOOR - h}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/></g>`;
    const svg = `
<svg class="mw-scene" viewBox="0 0 ${W} 320" role="img" aria-label="Meowie, a cat in a shark hood, in the water">
  <defs>
    <radialGradient id="${id}-glow"><stop offset="0" class="mw-glow" stop-opacity=".45"/><stop offset="1" class="mw-glow" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}-wb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--water-1)"/><stop offset="1" stop-color="var(--water-2)"/></linearGradient>
    <linearGradient id="${id}-mix" class="mw-mix" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color: var(--water-1)"/><stop offset="1" style="stop-color: var(--water-2)"/></linearGradient>
    <clipPath id="${id}-box"><rect x="0" y="-400" width="${W}" height="${320 + 400}"/></clipPath>
    <linearGradient id="${id}-bfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--bg)" stop-opacity="0"/><stop offset="1" stop-color="var(--bg)"/></linearGradient>
  </defs>
  ${skyMarkup(id, sky)}
  <g clip-path="url(#${id}-box)">
    <ellipse cx="200" cy="${FLOOR + 6}" rx="190" ry="26" fill="url(#${id}-glow)"/>
    <g class="mw-water mw-water-back"><g class="mw-slosh"><g class="mw-layers"><g class="mw-wave mw-wave-back"><path d="${wave(9)}" fill="url(#${id}-mix)"/></g></g></g>
      <g class="mw-bubs" fill="#fff" opacity=".75">${bubbles}</g></g>
    <g class="mw-par1"><g class="mw-rays"><path d="M90 0 L50 330 H86 L130 0 Z M220 0 L196 330 H240 L262 0 Z M320 0 L310 330 H338 L350 0 Z" fill="#fff"/></g></g>
    <g class="mw-fish" style="opacity:0">
      <path d="M-14 0 L-26 -9 L-24 0 L-26 9 Z" fill="#ff8a3d" stroke="#c75d1f" stroke-width="1.5" stroke-linejoin="round" class="mw-fish-tail"/>
      <ellipse cx="0" cy="0" rx="15" ry="9.5" fill="#ff9a3c" stroke="#c75d1f" stroke-width="1.5"/>
      <path d="M-4 -9 Q-1 0 -4 9 M5 -8 Q8 0 5 8" stroke="#fff" stroke-width="3" fill="none"/>
      <circle cx="9" cy="-2" r="2.4" fill="#1d1f22"/><circle cx="9.8" cy="-2.8" r=".8" fill="#fff"/>
    </g>
    <g class="mw-par2">${weed(46, 120, '#3cb37a', 'mw-weed-1')}${weed(74, 84, '#2f9d6a', 'mw-weed-2')}${weed(352, 110, '#2f9d6a', 'mw-weed-3')}
    <g class="mw-coral"><path d="M318 ${FLOOR} V258 M318 270 Q306 262 304 248 M318 264 Q330 256 332 242" stroke="#ff8fa3" stroke-width="7" stroke-linecap="round" fill="none"/></g></g>
    <path d="M-20 ${FLOOR} Q90 276 200 288 T420 282 V330 H-20 Z" class="mw-sand"/>
    <g class="mw-pebbles"><circle cx="110" cy="298" r="5"/><circle cx="246" cy="300" r="6"/><circle cx="276" cy="295" r="3.5"/><circle cx="150" cy="303" r="3"/></g>
    <rect x="0" y="298" width="${W}" height="24" fill="url(#${id}-bfade)"/>
  </g>
</svg>
<div class="mw-hl"><div class="mw-hl-in"><div class="mw-par3"><div class="mw-pos" style="transform: translate(200px, ${FLOOR + 4}px) scale(.8)">
  <div class="mw-drift"><div class="mw-actor">${sitPose()}</div></div>
</div></div></div></div>
<svg class="mw-top mw-front" viewBox="0 0 ${W} 320" aria-hidden="true">
  <defs><clipPath id="${id}-above"><path d="M0 -400 H${W} V283 Q310 293 200 288 Q90 276 0 289 Z"/></clipPath></defs>
  <g clip-path="url(#${id}-above)" pointer-events="none">
    <g class="mw-water mw-water-front"><g class="mw-slosh"><g class="mw-wave"><path d="${wave(6)}" fill="var(--water-2)" opacity=".2"/></g></g></g>
  </g>
</svg>
<svg class="mw-top" viewBox="0 0 ${W} 320" aria-hidden="true">
  <g class="mw-fx" pointer-events="none"></g>
</svg>`;
    const wrap = document.createElement('div');
    wrap.className = `cat-wrap mw mw--m0 mw--${sky}${opts.intro ? ' mw--intro' : ''}`;
    wrap.innerHTML = svg;
    wrap._mw = { id, level: 0, mode: 'sit', mood: 0, busy: false, layers: [], sx: 0, sy: 0, face: 1, frame: -1 };
    // The HTML layer is laid out in scene units (400 x 320) and scaled to the width on screen.
    // Decode every sheet up front so switching clips is instant.
    wrap.querySelectorAll('.mw-main img').forEach((im) => { if (im.decode) im.decode().catch(() => {}); });
    const fit = () => wrap.style.setProperty('--k', ((wrap.clientWidth || W) / W).toFixed(4));
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(wrap);
    requestAnimationFrame(fit);
    place(wrap, 0, true);
    run(wrap);
    return wrap;
  }

  function place(wrap, pct, instant) {
    const st = wrap._mw;
    const svg = wrap.querySelector('svg');
    const y = levelY(pct);
    const moving = wrap.querySelectorAll('.mw-water, .mw-pos');
    if (instant) moving.forEach((g) => { g.style.transition = 'none'; });
    wrap.querySelectorAll('.mw-water').forEach((g) => { g.style.transform = `translateY(${y}px)`; });
    renderLayers(wrap);
    const swim = st.forceSwim || pct >= SWIM_AT;
    if (!swim && st.mode === 'swim') stopSwim(wrap);
    st.mode = swim ? 'swim' : 'sit';
    const mark = (sel, x, y) => { const m = wrap.querySelector(sel); m.style.left = x + 'px'; m.style.top = y + 'px'; };
    mark('.mw-mouth-pt', swim ? 86 : 10, swim ? -118 : -95);
    mark('.mw-head-pt', swim ? 70 : 0, swim ? -150 : -150);
    if (swim !== (st.lastMode === 'swim') && st.placed && !reduced()) sfx('splash', .6);
    st.lastMode = st.mode;
    wrap.classList.toggle('mw--swim', swim);
    // Once swimming, Meowie keeps his depth when more water pours in; he only
    // moves down if the surface drops too close to him.
    if (swim) {
      if (st.swimY == null) st.swimY = Math.min(236, Math.max((y + FLOOR) / 2 + 6, 118));
      st.swimY = Math.min(236, Math.max(st.swimY, y + 52));
    } else st.swimY = null;
    wrap.querySelector('.mw-pos').style.transform = swim
      ? `translate(206px, ${st.swimY + 40}px) scale(.72)`
      : `translate(200px, ${FLOOR + 4}px) scale(.8)`;
    if (instant) {
      svg.getBoundingClientRect();
      requestAnimationFrame(() => moving.forEach((g) => { g.style.transition = ''; }));
    }
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
    if (stops.length < 2) return;
    const layers = (st.layers || []).filter((l) => l.w > 0);
    const coloured = layers.some((l) => l.color);
    if (!coloured) {
      // Plain water keeps the theme's blues (and their night tint).
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

  // Where a pour stream starts, in screen coordinates.
  function pourPoint(wrap) {
    const st = wrap._mw;
    const x = st.mode === 'swim' ? 112 : 108;
    const top = Math.max(-30, levelY(st.level) - 230);
    return toClient(wrap.querySelector('svg'), x, top);
  }

  // Body build from thin (-1) to chubby (1): the body widens, the head drops to sit on it and puffs a little.
  function setBuild(wrap, k) {
    const b = Math.max(-1, Math.min(1, k));
    const sx = 1 + b * (b > 0 ? .24 : .14);
    const sy = 1 - b * .04;
    const body = wrap.querySelector('.mw-sit .mw-bodyfit');
    if (body) body.style.transform = `scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
  }

  // Activity moods: relax (eyes shut, slow breathing), walk (strolls about), hyper (hops and juggles a ball).
  function setVibe(wrap, vibe) {
    const svg = wrap.querySelector('svg');
    ['relax', 'walk', 'hyper'].forEach((v) => wrap.classList.toggle('mw--' + v, v === vibe));
  }

  function setMood(wrap, mood, instant) {
    const st = wrap._mw;
    const svg = wrap.querySelector('svg');
    if (mood === st.mood && wrap.classList.contains('mw--m' + mood)) return;
    for (let i = 0; i <= 4; i++) wrap.classList.toggle('mw--m' + i, i === mood);
    if (!instant && mood !== st.mood) {
      wrap.classList.remove('mw--moodpop');
      svg.getBoundingClientRect();
      wrap.classList.add('mw--moodpop');
    }
    st.mood = mood;
  }

  function setLevel(wrap, pct, opts = {}) {
    const p = Math.max(0, Math.min(1, pct));
    const first = !wrap._mw.placed;
    if (!first && p > wrap._mw.level + .001) slosh(wrap);
    wrap._mw.level = p;
    wrap._mw.placed = true;
    if (!wrap._mw.running) run(wrap);
    place(wrap, p);
    setMood(wrap, moodFor(pct), opts.instant || first);
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function splash(wrap, x) {
    if (reduced()) return;
    const fx = wrap.querySelector('.mw-fx');
    const y = levelY(wrap._mw.level);
    const ns = 'http://www.w3.org/2000/svg';
    const ring = document.createElementNS(ns, 'ellipse');
    ring.setAttribute('cx', x); ring.setAttribute('cy', y); ring.setAttribute('rx', 12); ring.setAttribute('ry', 3.5);
    ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#fff'); ring.setAttribute('stroke-width', 3);
    ring.style.transformOrigin = `${x}px ${y}px`;
    fx.appendChild(ring);
    ring.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(5)', opacity: 0 }],
      { duration: 800, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => ring.remove();
    for (let i = 0; i < 11; i++) {
      const d = document.createElementNS(ns, 'circle');
      d.setAttribute('cx', x); d.setAttribute('cy', y); d.setAttribute('r', 2.5 + Math.random() * 3.5);
      d.setAttribute('fill', i % 2 ? '#bfe6ff' : '#fff');
      fx.appendChild(d);
      const dx = (Math.random() - .5) * 110;
      d.animate([
        { transform: 'translate(0,0)', opacity: 1 },
        { transform: `translate(${dx * .6}px, ${-44 - Math.random() * 46}px)`, opacity: 1, offset: .45 },
        { transform: `translate(${dx}px, 12px)`, opacity: 0 },
      ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => d.remove();
    }
  }

  // Sitting: he leans into his glass and laps it up. In the water: a happy somersault and bubbles.
  async function drink(wrap) {
    if (reduced()) return;
    if (wrap._mw.mode === 'swim') {
      setTimeout(() => mouthBubbles(wrap, 5), 300);
      setTimeout(() => floatHearts(wrap, 3), 500);
      sfx('splash', .5);
      await play(wrap, 'roll', { fps: 12 });
      return;
    }
    setTimeout(() => sfx('drink'), 700);
    setTimeout(() => floatHearts(wrap, 3), 2600);
    await play(wrap, 'drink');
  }

  // A happy prance with a meow.
  async function happy(wrap) {
    const st = wrap._mw;
    if (st.clip || reduced()) return;
    if (st.mode === 'swim') { await play(wrap, 'roll', { fps: 12 }); return; }
    sfx('happy', .6);
    await play(wrap, 'happy');
  }

  function floatHearts(wrap, n) {
    const fx = wrap.querySelector('.mw-fx');
    const ns = 'http://www.w3.org/2000/svg';
    const { x: x0, y: y0 } = markPoint(wrap, '.mw-head-pt', { x: 200, y: 120 });
    for (let i = 0; i < n; i++) {
      const h = document.createElementNS(ns, 'path');
      h.setAttribute('d', 'M0 6 C-9 0 -6 -7 0 -3 C6 -7 9 0 0 6 Z');
      h.setAttribute('fill', '#ff7a98');
      fx.appendChild(h);
      const dx = (i - (n - 1) / 2) * 26;
      h.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(.2)`, opacity: 0 },
        { transform: `translate(${x0 + dx * .5}px, ${y0 - 30}px) scale(1.2)`, opacity: 1, offset: .3 },
        { transform: `translate(${x0 + dx}px, ${y0 - 80}px) scale(.9)`, opacity: 0 },
      ], { duration: 1300, delay: 250 + i * 220, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }).onfinish = () => h.remove();
    }
  }

  // Leap out of the water in an arc and splash back down (used for big moments in the water).
  async function jump(wrap) {
    const st = wrap._mw;
    if (reduced()) return;
    if (st.mode !== 'swim') { await happy(wrap); return; }
    const svg = wrap.querySelector('svg');
    const actor = wrap.querySelector('.mw-actor');
    wrap.classList.add('mw--jump');
    sfx('splash', .6);
    play(wrap, 'roll', { fps: 11 });
    const anim = actor.animate([
      { transform: 'translate(0px, 0px) rotate(0deg)' },
      { transform: 'translate(10px, -120px) rotate(-10deg)', offset: .45 },
      { transform: 'translate(0px, 0px) rotate(0deg)' },
    ], { duration: 1200, easing: 'cubic-bezier(.33,.1,.3,1)' });
    setTimeout(() => splash(wrap, 206), 1050);
    await anim.finished.catch(() => {});
    wrap.classList.remove('mw--jump');
  }

  // Swim a lap even when the water is low.
  async function swim(wrap) {
    const st = wrap._mw;
    if (st.mode === 'swim') { await play(wrap, 'roll', { fps: 12 }); return; }
    await happy(wrap);
  }

  async function act(wrap, name) {
    if (!wrap || !wrap._mw || wrap._mw.busy) return;
    wrap._mw.busy = true;
    try {
      if (name === 'drink') await drink(wrap);
      else if (name === 'jump') await jump(wrap);
      else if (name === 'swim') await swim(wrap);
    } finally {
      wrap._mw.busy = false;
    }
  }

  // ---------- Interaction & idle life ----------

  // The water surface wobbles when something lands in it.
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

  const toClient = (svg, x, y) => {
    const m = svg.getScreenCTM();
    return m ? new DOMPoint(x, y).matrixTransform(m) : { x, y };
  };
  const toSvg = (svg, cx, cy) => {
    const m = svg.getScreenCTM();
    return m ? new DOMPoint(cx, cy).matrixTransform(m.inverse()) : { x: cx, y: cy };
  };

  // Pupils follow a point on screen, then drift back to centre.
  // He leans a little towards where you touch or what he is watching.
  function lookAt(wrap, cx, cy) {
    const st = wrap._mw;
    const look = wrap.querySelector('.mw-look');
    const r = wrap.querySelector('.mw-hit').getBoundingClientRect();
    const vx = cx - (r.left + r.width / 2);
    const k = Math.max(-1, Math.min(1, vx / Math.max(80, r.width)));
    look.style.transform = `rotate(${(k * 5).toFixed(2)}deg)`;
    clearTimeout(st.lookTimer);
    st.lookTimer = setTimeout(() => { look.style.transform = ''; }, 1800);
  }
  const lookAtSvg = (wrap, x, y) => { const c = toClient(wrap.querySelector('svg'), x, y); lookAt(wrap, c.x, c.y); };

  // Tap the water: ripple rings and bubbles where you touched.
  function ripple(wrap, x, y) {
    const fx = wrap.querySelector('.mw-fx');
    const ns = 'http://www.w3.org/2000/svg';
    const surface = levelY(wrap._mw.level);
    if (y < surface - 6 || reduced()) return false;
    for (let i = 0; i < 2; i++) {
      const ring = document.createElementNS(ns, 'circle');
      ring.setAttribute('cx', x); ring.setAttribute('cy', y); ring.setAttribute('r', 8);
      ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#fff'); ring.setAttribute('stroke-width', 2.5);
      ring.style.transformOrigin = `${x}px ${y}px`;
      fx.appendChild(ring);
      ring.animate([{ transform: 'scale(.4)', opacity: .9 }, { transform: 'scale(4)', opacity: 0 }],
        { duration: 900, delay: i * 180, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }).onfinish = () => ring.remove();
    }
    for (let i = 0; i < 6; i++) {
      const b = document.createElementNS(ns, 'circle');
      b.setAttribute('cx', x + (Math.random() - .5) * 24); b.setAttribute('cy', y); b.setAttribute('r', 2 + Math.random() * 3);
      b.setAttribute('fill', '#fff'); b.setAttribute('opacity', '.8');
      fx.appendChild(b);
      const rise = Math.min(y - surface, 120);
      b.animate([{ transform: 'translateY(0)', opacity: .9 }, { transform: `translate(${(Math.random() - .5) * 20}px, ${-rise}px)`, opacity: 0 }],
        { duration: 900 + Math.random() * 700, easing: 'ease-in', delay: i * 60, fill: 'backwards' }).onfinish = () => b.remove();
    }
    return true;
  }

  // Pet Meowie: a hand comes in and rubs his head; he purrs, squints and bounces. Hearts float up.
  async function pet(wrap) {
    const st = wrap._mw;
    if (st.busy || reduced()) { floatHearts(wrap, 3); return; }
    st.busy = true;
    if (navigator.vibrate) navigator.vibrate([8, 50, 8, 50, 8]);
    try {
      if (st.mode === 'swim') {
        floatHearts(wrap, 4);
        sfx('meow', .6);
        await play(wrap, 'roll', { fps: 12 });
      } else {
        sfx('purr');
        setTimeout(() => floatHearts(wrap, 4), 900);
        await play(wrap, 'pet');
      }
    } finally { st.busy = false; }
  }

  // A little fish swims by; Meowie watches it and lunges if he is swimming.
  function fishPass(wrap) {
    const st = wrap._mw;
    const fish = wrap.querySelector('.mw-fish');
    if (!fish || st.busy || reduced()) return;
    const surface = levelY(st.level);
    const y = surface + 22 + Math.random() * Math.max(10, FLOOR - surface - 60);
    const ltr = Math.random() < .5;
    const x0 = ltr ? -30 : W + 30;
    const x1 = ltr ? W + 30 : -30;
    const dur = 5200;
    const flip = ltr ? 1 : -1;
    fish.style.opacity = 1;
    const anim = fish.animate([
      { transform: `translate(${x0}px, ${y}px) scale(${flip}, 1)` },
      { transform: `translate(${x0 + (x1 - x0) * .25}px, ${y - 10}px) scale(${flip}, 1)` },
      { transform: `translate(${x0 + (x1 - x0) * .5}px, ${y + 6}px) scale(${flip}, 1)` },
      { transform: `translate(${x0 + (x1 - x0) * .75}px, ${y - 8}px) scale(${flip}, 1)` },
      { transform: `translate(${x1}px, ${y}px) scale(${flip}, 1)` },
    ], { duration: dur, easing: 'linear' });
    const t0 = performance.now();
    let lunged = false;
    (function track(now) {
      const k = (now - t0) / dur;
      if (k >= 1 || !wrap.isConnected) return;
      lookAtSvg(wrap, x0 + (x1 - x0) * k, y);
      if (!lunged && k > .42 && st.mode === 'swim' && !st.busy) {
        lunged = true;
        const actor = wrap.querySelector('.mw-actor');
        actor.animate([
          { transform: 'translate(0, 0) rotate(0deg)' },
          { transform: `translate(${ltr ? 60 : -40}px, ${(y - 200) * .4}px) rotate(${ltr ? -6 : 6}deg)`, offset: .4 },
          { transform: 'translate(0, 0) rotate(0deg)' },
        ], { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
      requestAnimationFrame(track);
    })(t0);
    anim.onfinish = () => { fish.style.opacity = 0; };
  }

  // Idle: he keeps idling; now and then a meow, and a happy prance when the day is going well.
  function idleMove(wrap) {
    const st = wrap._mw;
    if (st.busy || st.clip || reduced() || st.mode === 'swim') return;
    const svg = wrap.querySelector('svg');
    if (wrap.classList.contains('mw--hyper') || (st.mood >= 3 && Math.random() < .5)) happy(wrap);
    else if (Math.random() < .35) sfx('meow', .45);
  }

  function lookAround(wrap) {
    const pts = [[60, 120], [340, 140], [200, 40]];
    pts.forEach(([x, y], i) => setTimeout(() => wrap.isConnected && lookAtSvg(wrap, x, y), i * 700));
  }

  // Random idle moments so Meowie never feels frozen.
  function startIdle(wrap) {
    const st = wrap._mw;
    if (st.idle) return;
    st.idle = true;
    (function next() {
      setTimeout(() => {
        if (!wrap.isConnected) { st.idle = false; return; }
        if (!document.hidden && !st.busy) {
          const r = Math.random();
          if (st.mode === 'swim' && r < .4) fishPass(wrap);
          else idleMove(wrap);
        }
        next();
      }, 8000 + Math.random() * 6000);
    })();
  }

  // Wire touch: eyes follow the finger, tap the cat, tap the water, rub to pet.
  function interact(wrap, { onTap } = {}) {
    const svg = wrap.querySelector('svg');
    let down = null;
    let rub = 0;
    let last = null;
    wrap.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, cat: !!e.target.closest('.mw-actor') };
      last = { x: e.clientX, y: e.clientY };
      rub = 0;
      lookAt(wrap, e.clientX, e.clientY);
    });
    wrap.addEventListener('pointermove', (e) => {
      lookAt(wrap, e.clientX, e.clientY);
      if (!down || !last) return;
      const onCat = !!e.target.closest('.mw-actor') || down.cat;
      if (onCat) rub += Math.hypot(e.clientX - last.x, e.clientY - last.y);
      last = { x: e.clientX, y: e.clientY };
      if (rub > 140) { rub = 0; pet(wrap); }
    });
    const end = (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved < 10) {
        if (down.cat) { pet(wrap); if (onTap) onTap(); }
        else {
          const p = toSvg(svg, e.clientX, e.clientY);
          if (ripple(wrap, p.x, p.y) && navigator.vibrate) navigator.vibrate(6);
        }
      }
      down = null;
      last = null;
    };
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', () => { down = null; });
    wrap.addEventListener('pointerleave', () => { down = null; });
    startIdle(wrap);
    startSwimLoop(wrap);
  }

  // Parallax: nx, ny in -1..1 from phone tilt or pointer position.
  function tilt(wrap, nx, ny) {
    const set = (sel, k, ky) => { const g = wrap.querySelector(sel); if (g) g.style.transform = `translate(${nx * k}px, ${ny * ky}px)`; };
    set('.mw-par1', 16, 6);
    set('.mw-par2', 8, 3);
    set('.mw-par3', -6, -3);
  }

  // A stream of the drink pours down into the water, then the tail falls in with splashes.
  // A little cup tips over above (x, end) and pours a stream of the drink down to it.
  function pour(wrap, color = '#7cc8f5', o = {}) {
    const st = wrap._mw;
    const x = o.x != null ? o.x : (st.mode === 'swim' ? 112 : 108);
    const end = o.end != null ? o.end : levelY(st.level);
    const toWater = o.surface !== false;
    if (reduced()) { if (toWater) slosh(wrap, .6); return Promise.resolve(); }
    const fx = wrap.querySelector('.mw-fx');
    // o.tilt swings the cup and stream round the landing point so it can pour in from the side.
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    if (o.tilt) box.setAttribute('transform', `rotate(${o.tilt} ${x} ${end})`);
    fx.appendChild(box);
    setTimeout(() => box.remove(), 2600);
    const ns = 'http://www.w3.org/2000/svg';
    const top = Math.max(-40, end - (o.drop || 190));
    const len = end - top + 4;
    const lead = o.cup === false ? 0 : 260;
    if (o.cup !== false) {
      // Cup drawn with its pouring lip at (0,0) so it tips around the lip.
      const cup = document.createElementNS(ns, 'g');
      cup.setAttribute('transform', `translate(${x + 2} ${top - 2}) scale(1.35)`);
      cup.innerHTML = `<g class="mw-cup">
        <clipPath id="${st.id}-cupc"><path d="M0 0 H30 L27 36 Q26.5 38 24 38 H6 Q3.5 38 3 36 Z"/></clipPath>
        <path d="M0 0 H30 L27 36 Q26.5 38 24 38 H6 Q3.5 38 3 36 Z" fill="#fff"/>
        <g clip-path="url(#${st.id}-cupc)"><rect class="mw-cup-liquid" x="-10" y="10" width="50" height="40" fill="${color}"/></g>
        <path d="M0 0 H30 L27 36 Q26.5 38 24 38 H6 Q3.5 38 3 36 Z" fill="none" stroke="#3b4048" stroke-width="2.8" stroke-linejoin="round"/>
        <path d="M6 6 L8 30" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></g>`;
      cup.style.filter = 'drop-shadow(0 3px 4px rgba(0,0,0,.18))';
      box.appendChild(cup);
      const inner = cup.firstElementChild;
      inner.style.transformOrigin = '0px 0px';
      inner.animate([
        { transform: 'translate(10px, -30px) rotate(0deg)', opacity: 0 },
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1, offset: .14 },
        { transform: 'rotate(-112deg)', offset: .3 },
        { transform: 'rotate(-112deg)', offset: .8 },
        { transform: 'translate(8px, -16px) rotate(-20deg)', opacity: 0 },
      ], { duration: 1500, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).onfinish = () => cup.remove();
      cup.querySelector('.mw-cup-liquid').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(0)', offset: .3 }, { transform: 'translateY(32px)' }],
        { duration: 1200, fill: 'forwards' });
    }
    const g = document.createElementNS(ns, 'g');
    g.innerHTML = `<g class="mw-stream"><rect x="${x - 6}" y="${top}" width="12" height="${len}" rx="6" fill="${color}" opacity=".92"/>
      <rect x="${x - 3}" y="${top}" width="3.5" height="${len}" rx="2" fill="#fff" opacity=".55"/></g>`;
    g.style.transformOrigin = `${x}px ${top}px`;
    g.style.opacity = 0;
    box.appendChild(g);
    setTimeout(() => {
      g.style.opacity = 1;
      g.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 320, easing: 'cubic-bezier(.55,0,.8,.3)', fill: 'forwards' });
    }, lead);
    setTimeout(() => {
      g.animate([{ transform: 'translateY(0) scaleY(1)' }, { transform: `translateY(${len}px) scaleY(0)` }],
        { duration: 320, easing: 'cubic-bezier(.55,0,.8,.3)', fill: 'forwards' }).onfinish = () => g.remove();
    }, lead + 820);
    if (toWater) {
      setTimeout(() => ripple(wrap, x, end + 6), lead + 560);
      setTimeout(() => ripple(wrap, x, end + 6), lead + 900);
    } else {
      setTimeout(() => dropsAt(wrap, x, end, 5), lead + 420);
      setTimeout(() => dropsAt(wrap, x, end, 4), lead + 760);
    }
    lookAtSvg(wrap, x, end);
    return new Promise((r) => setTimeout(() => {
      if (toWater) { splash(wrap, x); slosh(wrap, .8); } else dropsAt(wrap, x, end, 6);
      r();
    }, lead + 320));
  }

  // Tiny droplets that hop out of a glass rim.
  function dropsAt(wrap, x, y, n) {
    const fx = wrap.querySelector('.mw-fx');
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < n; i++) {
      const d = document.createElementNS(ns, 'circle');
      d.setAttribute('cx', x); d.setAttribute('cy', y); d.setAttribute('r', 1.8 + Math.random() * 1.8);
      d.setAttribute('fill', '#bfe6ff');
      fx.appendChild(d);
      const dx = (Math.random() - .5) * 40;
      d.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx * .6}px, ${-12 - Math.random() * 16}px)`, offset: .45 }, { transform: `translate(${dx}px, 8px)`, opacity: 0 }],
        { duration: 600, easing: 'ease-out' }).onfinish = () => d.remove();
    }
  }

  // A marker inside the sprite in scene coordinates, measured so every CSS animation and transform is included.
  function markPoint(wrap, sel, fallback) {
    const svg = wrap.querySelector('svg');
    const r = wrap.querySelector(sel).getBoundingClientRect();
    if (!r.width && !r.height && !r.left) return fallback;
    return toSvg(svg, r.left + r.width / 2, r.top + r.height / 2);
  }
  const mouthPoint = (wrap) => markPoint(wrap, '.mw-mouth-pt', { x: 200, y: levelY(wrap._mw.level) + 20 });

  // Where the pouring cup will appear, in screen coordinates (for hand-off animations).
  function pourTarget(wrap) {
    const st = wrap._mw;
    const svg = wrap.querySelector('svg');
    if (st.mode === 'sit') return toClient(svg, GLASS_X + 2, GLASS_RIM - GLASS_DROP - 2);
    const mouth = mouthPoint(wrap);
    return toClient(svg, mouth.x + 2, Math.max(-40, levelY(st.level) - 196) - 2);
  }

  function mouthBubbles(wrap, n) {
    const fx = wrap.querySelector('.mw-fx');
    const ns = 'http://www.w3.org/2000/svg';
    const m = mouthPoint(wrap);
    const surf = levelY(wrap._mw.level);
    for (let i = 0; i < n; i++) {
      const b = document.createElementNS(ns, 'circle');
      b.setAttribute('cx', m.x); b.setAttribute('cy', m.y); b.setAttribute('r', 2 + Math.random() * 2.5);
      b.setAttribute('fill', 'none'); b.setAttribute('stroke', '#fff'); b.setAttribute('stroke-width', 1.5);
      fx.appendChild(b);
      const rise = Math.max(20, m.y - surf - 4);
      b.animate([{ transform: 'translate(0,0)', opacity: 0 }, { transform: `translate(${(Math.random() - .5) * 10}px, -10px)`, opacity: 1, offset: .15 },
        { transform: `translate(${(Math.random() - .5) * 24}px, ${-rise}px)`, opacity: 0 }],
        { duration: 1100 + Math.random() * 600, delay: i * 110, easing: 'ease-in', fill: 'backwards' }).onfinish = () => b.remove();
    }
  }

  // ---------- Swimming ----------
  // In the water Meowie paddles left and right across the tank, turning round at the sides
  // with a little bob, and stays at his depth.
  const SX_MIN = -120;
  const SX_MAX = 120;
  const rand = (a, b) => a + Math.random() * (b - a);
  const tf = (x, y, face, rot = 0) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rot}deg) scale(${face}, 1)`;

  function stopSwim(wrap) {
    const st = wrap._mw;
    if (st.swimAnim) { st.swimAnim.cancel(); st.swimAnim = null; }
    st.sx = 0; st.sy = 0; st.face = 1;
    const d = wrap.querySelector('.mw-drift');
    if (d) d.style.transform = '';
  }

  async function swimMove(wrap) {
    const st = wrap._mw;
    const drift = wrap.querySelector('.mw-drift');
    const { sx, face } = st;
    const ahead = face > 0 ? SX_MAX - sx : sx - SX_MIN;
    let frames, dur, ex = sx, ef = face;
    if (ahead < 30) { // turn round: a little hop and flip
      frames = [tf(sx, 0, face), tf(sx, -10, face * .1, face * -4), tf(sx, 0, -face)];
      ef = -face; dur = 650;
    } else { // paddle along with a gentle wave
      ex = sx + face * Math.min(ahead, rand(80, 240));
      const d = Math.abs(ex - sx);
      frames = [tf(sx, 0, face), tf(sx + (ex - sx) * .25, -6, face, -2), tf(sx + (ex - sx) * .5, 3, face, 1), tf(sx + (ex - sx) * .75, -6, face, -2), tf(ex, 0, face)];
      dur = Math.max(1400, d * 22);
    }
    const anim = drift.animate(frames.map((transform) => ({ transform })), { duration: dur, easing: 'ease-in-out', fill: 'forwards' });
    st.swimAnim = anim;
    try { await anim.finished; } catch { return; }
    if (st.swimAnim !== anim) return;
    st.sx = ex; st.sy = 0; st.face = ef;
    drift.style.transform = tf(ex, 0, ef);
    anim.cancel();
    st.swimAnim = null;
  }

  function startSwimLoop(wrap) {
    const st = wrap._mw;
    if (st.swimLoop) return;
    st.swimLoop = true;
    if (st.face == null) { st.sx = 0; st.sy = 0; st.face = 1; }
    (async function loop() {
      while (wrap.isConnected) {
        if (st.mode === 'swim' && !document.hidden && !reduced()) {
          await swimMove(wrap);
          await wait(rand(150, 700));
        } else await wait(700);
      }
      st.swimLoop = false;
    })();
  }

  // Where his glass ends up in the drinking clip, in scene coordinates (sit pose at
  // (200, FLOOR + 4) scaled .8; rim about (72, -46) in pose space).
  const GLASS_X = 200 + 72 * .8;
  const GLASS_RIM = FLOOR + 4 - 46 * .8;
  const GLASS_DROP = 120;

  // Pour a drink for Meowie and let him enjoy it. Sitting: a cup pours by his paws and he leans in
  // to lap from his glass. In the water: the stream lands by him and he does a happy somersault.
  async function pourAndDrink(wrap, color, o = {}) {
    const st = wrap._mw;
    if (reduced()) { slosh(wrap, .6); return; }
    if (st.busy) { pour(wrap, color, { cup: o.cup }); await wait(1300); return; }
    st.busy = true;
    try {
      if (st.mode === 'sit') {
        await pour(wrap, color, { x: GLASS_X, end: GLASS_RIM, drop: GLASS_DROP, cup: o.cup, surface: false });
        await drink(wrap);
      } else {
        const mouth = mouthPoint(wrap);
        pour(wrap, color, { x: Math.max(40, Math.min(360, mouth.x)), end: levelY(st.level), cup: o.cup });
        await wait(700);
        await drink(wrap);
      }
    } finally {
      st.busy = false;
    }
  }

  window.Meowie = { create, setLevel, setLayers, pourPoint, act, moodFor, interact, tilt, slosh, lookAt, pet, pour, pourAndDrink, pourTarget, skyNow, setBuild, setVibe };
})();
