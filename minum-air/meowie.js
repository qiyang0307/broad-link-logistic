// Meowie: a grey tabby in a shark hood swimming in open water that rises as you drink.
// Three actions, all drawn and animated in code: drink (laps from a glass),
// swim (paddles once the water is half way up) and jump (leaps out with a splash).
// His face changes with the day's progress: thirsty → meh → content → happy → in love.
(function () {
  let uid = 0;
  const LINE = '#4a5059';
  const FUR = '#a9afb6';
  const FUR_DARK = '#6b7179';
  const CREAM = '#f6f2ec';
  const HOOD = '#9ea8b3';
  const HOOD_DARK = '#87919c';

  // Scene geometry (viewBox 0 0 400 320). No frame: the water fades out at the sides.
  const W = 400;
  const FLOOR = 290;
  const levelY = (p) => 284 - p * 224;

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 0 thirsty, 1 meh, 2 content, 3 happy, 4 over the moon
  const moodFor = (p) => (p >= 1 ? 4 : p >= .75 ? 3 : p >= .45 ? 2 : p >= .2 ? 1 : 0);

  // Hood teeth around the face opening (ellipse rx 44, ry 40 centred at 0,14), leaving the chin clear.
  function teeth() {
    let out = '';
    for (let a = 168; a <= 372; a += 17) {
      const r = (d) => (d * Math.PI) / 180;
      const p = (deg, k) => [(Math.cos(r(deg)) * 44 * k).toFixed(1), (14 + Math.sin(r(deg)) * 40 * k).toFixed(1)];
      const [x1, y1] = p(a - 7, 1);
      const [x2, y2] = p(a + 7, 1);
      const [tx, ty] = p(a, .78);
      out += `<path d="M${x1} ${y1} L${tx} ${ty} L${x2} ${y2} Z" fill="#fff" stroke="#cdd2d8" stroke-width="1.2" stroke-linejoin="round"/>`;
    }
    return out;
  }

  function openEye(x) {
    return `<ellipse cx="${x}" cy="15" rx="11" ry="12" fill="#cfd36b"/>
      <g class="mw-pupil"><ellipse cx="${x}" cy="16" rx="8" ry="10" fill="#1d1f22"/>
      <circle cx="${x + 3.6}" cy="11" r="3.6" fill="#fff"/><circle cx="${x - 3.4}" cy="20" r="1.7" fill="#fff"/></g>`;
  }
  const heart = (x) => `<path d="M${x} 24 C${x - 15} 13 ${x - 10} 2 ${x} 9 C${x + 10} 2 ${x + 15} 13 ${x} 24 Z" fill="#ff6b8b" stroke="#d94f70" stroke-width="1.4"/>
      <circle cx="${x - 4}" cy="10" r="2" fill="#fff"/>`;
  const star = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill="#ffd54a"/>`;

  // Head with hood, centred on (0,0). Every expression is drawn; CSS shows the one for the mood.
  function head(id) {
    return `<g class="mw-head">
      <path d="M-56 22 Q-92 26 -98 52 Q-70 50 -48 38 Z" fill="${HOOD_DARK}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M56 22 Q92 26 98 52 Q70 50 48 38 Z" fill="${HOOD_DARK}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-16 -58 Q0 -102 28 -112 Q20 -84 22 -56 Z" fill="${HOOD}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M0 -66 C40 -66 68 -38 68 6 C68 46 38 68 0 68 C-38 68 -68 46 -68 6 C-68 -38 -40 -66 0 -66 Z" fill="${HOOD}" stroke="${LINE}" stroke-width="3"/>
      <path d="M-46 -40 Q0 -62 46 -40" fill="none" stroke="#b4bdc7" stroke-width="6" stroke-linecap="round" opacity=".7"/>
      <circle cx="-32" cy="-34" r="6.5" fill="#1d2026"/><circle cx="-30" cy="-36.5" r="2" fill="#fff"/>
      <circle cx="32" cy="-34" r="6.5" fill="#1d2026"/><circle cx="34" cy="-36.5" r="2" fill="#fff"/>
      <clipPath id="${id}-face"><ellipse cx="0" cy="14" rx="44" ry="40"/></clipPath>
      <ellipse cx="0" cy="14" rx="44" ry="40" fill="${CREAM}"/>
      <g clip-path="url(#${id}-face)">
        <path d="M-50 -30 H50 V0 Q24 -8 0 -4 Q-24 -8 -50 0 Z" fill="${FUR}"/>
        <path d="M-12 -24 Q-10 -14 -13 -5 M0 -26 V-7 M12 -24 Q10 -14 13 -5" stroke="${FUR_DARK}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      </g>
      <ellipse cx="0" cy="14" rx="44" ry="40" fill="none" stroke="${LINE}" stroke-width="3"/>
      ${teeth()}
      <g class="mw-blush"><ellipse cx="-29" cy="32" rx="8.5" ry="5" fill="#ff9db4"/><ellipse cx="29" cy="32" rx="8.5" ry="5" fill="#ff9db4"/></g>
      <g class="mw-x mw-eo">${openEye(-18)}${openEye(18)}
        <g class="mw-lid">
          <path d="M-31 2 H-5 V14 Q-18 10 -31 14 Z M31 2 H5 V14 Q18 10 31 14 Z" fill="${CREAM}"/>
          <path d="M-30 14 Q-18 10 -6 14 M30 14 Q18 10 6 14" stroke="${LINE}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
        </g>
      </g>
      <g class="mw-x mw-eh"><path d="M-27 18 Q-18 6 -9 18 M27 18 Q18 6 9 18" stroke="#33363d" stroke-width="3.6" stroke-linecap="round" fill="none"/></g>
      <g class="mw-x mw-ek">${heart(-18)}${heart(18)}</g>
      <ellipse cx="-9" cy="36" rx="10.5" ry="7.5" fill="#fff"/><ellipse cx="9" cy="36" rx="10.5" ry="7.5" fill="#fff"/>
      <path class="mw-tongue" d="M-5.5 39 Q-6 51 0 52 Q6 51 5.5 39 Z" fill="#ef8296" stroke="#c75d72" stroke-width="1.2"/>
      <g class="mw-x mw-mf"><path d="M-6 42.5 Q0 37.5 6 42.5" stroke="#6d5f60" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>
      <g class="mw-x mw-mw"><path d="M0 33.5 V37 M0 37 Q-5 42 -10 38.5 M0 37 Q5 42 10 38.5" fill="none" stroke="#6d5f60" stroke-width="2.4" stroke-linecap="round"/></g>
      <g class="mw-x mw-ms"><path d="M0 33.5 V36 M-12 36 Q-6 45 0 37 Q6 45 12 36" fill="none" stroke="#6d5f60" stroke-width="2.6" stroke-linecap="round"/></g>
      <g class="mw-x mw-mo"><path d="M-10 36 Q0 38 10 36 Q9 51 0 51 Q-9 51 -10 36 Z" fill="#7a2f3b" stroke="#5a2430" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M-6 46 Q0 41 6 46 Q5 51 0 51 Q-5 51 -6 46 Z" fill="#ef8296"/></g>
      <path d="M-5 28 L5 28 L0 33.5 Z" fill="#f0a1b0" stroke="#c97a8a" stroke-width="1.2" stroke-linejoin="round"/>
      <g stroke="#cfcac3" stroke-width="1.6" stroke-linecap="round">
        <path d="M-24 34 L-58 28 M-24 39 L-58 42"/><path d="M24 34 L58 28 M24 39 L58 42"/>
      </g>
      <path class="mw-x mw-sweat" d="M50 -14 Q58 -2 54 4 Q49 8 45 3 Q43 -3 50 -14 Z" fill="#8fd3ff" stroke="#4fa8de" stroke-width="1.4"/>
      <g class="mw-x mw-spark">${star(-74, -54, 1)}${star(78, -40, .8)}${star(-66, 48, .7)}${star(74, 58, 1)}</g>
    </g>`;
  }

  // Sitting pose. Origin = between the feet.
  function sitPose(id) {
    return `<g class="mw-sit">
      <g class="mw-tail-sit">
        <path d="M38 -14 C92 -8 108 -44 86 -74" fill="none" stroke="${LINE}" stroke-width="19" stroke-linecap="round"/>
        <path d="M38 -14 C92 -8 108 -44 86 -74" fill="none" stroke="${FUR}" stroke-width="13" stroke-linecap="round"/>
        <path d="M38 -14 C92 -8 108 -44 86 -74" fill="none" stroke="${FUR_DARK}" stroke-width="13" stroke-dasharray="7 11" stroke-dashoffset="4"/>
      </g>
      <ellipse cx="0" cy="-52" rx="58" ry="52" fill="${FUR}" stroke="${LINE}" stroke-width="3"/>
      <path d="M-50 -66 Q-40 -58 -44 -44 M-54 -40 Q-44 -32 -48 -20 M50 -66 Q40 -58 44 -44 M54 -40 Q44 -32 48 -20" stroke="${FUR_DARK}" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      <ellipse cx="0" cy="-42" rx="31" ry="40" fill="${CREAM}"/>
      <g><ellipse cx="-21" cy="-6" rx="16" ry="10" fill="#fff" stroke="${LINE}" stroke-width="2.6"/>
        <ellipse cx="21" cy="-6" rx="16" ry="10" fill="#fff" stroke="${LINE}" stroke-width="2.6"/></g>
      <g class="mw-glass">
        <path d="M-84 -46 H-50 L-53 -2 Q-54 2 -58 2 H-76 Q-80 2 -81 -2 Z" fill="rgba(210,236,255,.6)" stroke="#8fb4cf" stroke-width="2.4" stroke-linejoin="round"/>
        <clipPath id="${id}-gl"><path d="M-84 -46 H-50 L-53 -2 Q-54 2 -58 2 H-76 Q-80 2 -81 -2 Z"/></clipPath>
        <g clip-path="url(#${id}-gl)"><rect class="mw-glass-water" x="-90" y="-32" width="50" height="40" fill="#7cc8f5"/></g>
        <path d="M-78 -40 L-76 -8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
      </g>
      <path d="M-34 -98 Q0 -84 34 -98" fill="none" stroke="#56606b" stroke-width="7" stroke-linecap="round"/>
      <circle cx="0" cy="-88" r="6" fill="#d7dbe0" stroke="${LINE}" stroke-width="2"/>
      <g transform="translate(0 -150)">${head(id + 's')}</g>
    </g>`;
  }

  // Stretched pose for swimming and jumping. Origin = middle of the body.
  function stretchPose(id) {
    const leg = (cls, d) => `<g class="mw-leg ${cls}"><path d="${d}" stroke="${LINE}" stroke-width="20" stroke-linecap="round" fill="none"/><path d="${d}" stroke="#fff" stroke-width="14" stroke-linecap="round" fill="none"/></g>`;
    return `<g class="mw-stretch">
      <g class="mw-tail-s">
        <path d="M-88 -4 C-122 -16 -138 8 -176 -12" fill="none" stroke="${LINE}" stroke-width="19" stroke-linecap="round"/>
        <path d="M-88 -4 C-122 -16 -138 8 -176 -12" fill="none" stroke="${FUR}" stroke-width="13" stroke-linecap="round"/>
        <path d="M-88 -4 C-122 -16 -138 8 -176 -12" fill="none" stroke="${FUR_DARK}" stroke-width="13" stroke-dasharray="7 11"/>
      </g>
      ${leg('mw-leg-b2', 'M-62 20 Q-82 40 -96 44')}
      ${leg('mw-leg-f2', 'M30 22 Q50 42 66 46')}
      <ellipse cx="-16" cy="4" rx="82" ry="38" fill="${FUR}" stroke="${LINE}" stroke-width="3"/>
      <path d="M-16 30 Q-60 30 -84 16 Q-60 42 -16 42 Q30 42 54 20 Q30 30 -16 30 Z" fill="${CREAM}"/>
      <path d="M-70 -24 Q-62 -6 -68 10 M-46 -32 Q-38 -10 -44 8 M-22 -34 Q-14 -12 -20 6 M2 -32 Q10 -12 4 4" stroke="${FUR_DARK}" stroke-width="5" stroke-linecap="round" fill="none"/>
      ${leg('mw-leg-b1', 'M-50 26 Q-66 48 -78 56')}
      ${leg('mw-leg-f1', 'M40 24 Q58 48 76 54')}
      <path d="M40 -26 Q58 2 44 30" fill="none" stroke="#56606b" stroke-width="7" stroke-linecap="round"/>
      <g transform="translate(78 -14) scale(.92)">${head(id + 'w')}</g>
    </g>`;
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
<svg class="mw mw--m0 mw--${sky} ${opts.intro ? 'mw--intro' : ''}" viewBox="0 0 ${W} 320" role="img" aria-label="Meowie, a cat in a shark hood, in the water">
  <defs>
    <linearGradient id="${id}-wb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--water-1)"/><stop offset="1" stop-color="var(--water-2)"/></linearGradient>
    <linearGradient id="${id}-fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".12" stop-color="#fff"/><stop offset=".88" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="-400" width="${W}" height="760"><rect x="0" y="-400" width="${W}" height="760" fill="url(#${id}-fade)"/></mask>
    <clipPath id="${id}-box"><rect x="0" y="-400" width="${W}" height="${320 + 400}"/></clipPath>
    <linearGradient id="${id}-bfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--bg)" stop-opacity="0"/><stop offset="1" stop-color="var(--bg)"/></linearGradient>
    <clipPath id="${id}-above"><path d="M0 -400 H${W} V283 Q310 293 200 288 Q90 276 0 289 Z"/></clipPath>
  </defs>
  ${skyMarkup(id, sky)}
  <g mask="url(#${id}-mask)" clip-path="url(#${id}-box)">
    <ellipse cx="200" cy="${FLOOR + 6}" rx="190" ry="26" class="mw-glow"/>
    <g class="mw-water mw-water-back"><g class="mw-slosh"><g class="mw-layers"><g class="mw-band" data-j="0"><g class="mw-wave mw-wave-back"><path d="${wave(9)}" fill="url(#${id}-wb)"/></g></g></g></g>
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
  <g class="mw-par3"><g class="mw-pos" style="transform: translate(200px, ${FLOOR + 4}px) scale(.8)">
    <g class="mw-drift"><g class="mw-actor">
      ${sitPose(id)}
      ${stretchPose(id)}
    </g></g>
  </g></g>
  <g mask="url(#${id}-mask)" clip-path="url(#${id}-above)" pointer-events="none">
    <g class="mw-water mw-water-front"><g class="mw-slosh"><g class="mw-wave"><path d="${wave(6)}" fill="var(--water-2)" opacity=".2"/></g></g>
      <path d="M-60 6 H900" stroke="#fff" stroke-width="2" opacity=".55"/></g>
  </g>
  <g class="mw-fx" pointer-events="none"></g>
</svg>`;
    const wrap = document.createElement('div');
    wrap.className = 'cat-wrap';
    wrap.innerHTML = svg;
    wrap._mw = { id, level: 0, mode: 'sit', mood: 0, busy: false, layers: [] };
    place(wrap, 0, true);
    return wrap;
  }

  function place(wrap, pct, instant) {
    const st = wrap._mw;
    const svg = wrap.querySelector('svg');
    const y = levelY(pct);
    const moving = wrap.querySelectorAll('.mw-water, .mw-pos');
    if (instant) moving.forEach((g) => { g.style.transition = 'none'; });
    wrap.querySelectorAll('.mw-water').forEach((g) => { g.style.transform = `translateY(${y}px)`; });
    renderLayers(wrap, pct);
    const swim = st.forceSwim || pct >= .45;
    st.mode = swim ? 'swim' : 'sit';
    svg.classList.toggle('mw--swim', swim);
    wrap.querySelector('.mw-pos').style.transform = swim
      ? `translate(206px, ${Math.min(236, Math.max((y + FLOOR) / 2 + 6, 118))}px) scale(.66)`
      : `translate(200px, ${FLOOR + 4}px) scale(.8)`;
    if (instant) {
      svg.getBoundingClientRect();
      requestAnimationFrame(() => moving.forEach((g) => { g.style.transition = ''; }));
    }
  }

  // Each drink is its own coloured band, stacked oldest at the bottom, newest at the surface.
  function renderLayers(wrap, pct) {
    const st = wrap._mw;
    const box = wrap.querySelector('.mw-layers');
    if (!box) return;
    const layers = st.layers && st.layers.length ? st.layers : [{ color: null, w: 1 }];
    const H = Math.max(0, Math.min(1, pct)) * 224;
    const total = layers.reduce((a, l) => a + l.w, 0) || 1;
    const ns = 'http://www.w3.org/2000/svg';
    const byJ = {};
    box.querySelectorAll('.mw-band').forEach((b) => { byJ[b.dataset.j] = b; });
    Object.keys(byJ).forEach((k) => { if (Number(k) >= layers.length) { byJ[k].remove(); delete byJ[k]; } });
    let off = 0;
    let prev = null;
    for (let j = layers.length - 1; j >= 0; j--) {
      let b = byJ[j];
      if (!b) {
        b = document.createElementNS(ns, 'g');
        b.setAttribute('class', 'mw-band');
        b.dataset.j = j;
        b.innerHTML = `<g class="mw-wave" style="animation-duration:${(3.4 + (j % 3) * .9).toFixed(1)}s;animation-direction:${j % 2 ? 'normal' : 'reverse'}"><path d="${wave(7)}"/></g>`;
        b.style.transform = `translateY(${off}px)`;
      }
      // Keep DOM order top band first so lower (older) bands paint over the tail of newer ones.
      const want = prev ? prev.nextSibling : box.firstChild;
      if (b !== want) box.insertBefore(b, want);
      b.querySelector('path').setAttribute('fill', layers[j].color || `url(#${st.id}-wb)`);
      b.style.transform = `translateY(${off.toFixed(1)}px)`;
      off += (layers[j].w / total) * H;
      prev = b;
    }
  }

  function setLayers(wrap, layers) {
    wrap._mw.layers = layers || [];
    renderLayers(wrap, wrap._mw.level);
  }

  // Where a pour stream starts, in screen coordinates.
  function pourPoint(wrap) {
    const st = wrap._mw;
    const x = st.mode === 'swim' ? 112 : 108;
    const top = Math.max(-30, levelY(st.level) - 230);
    return toClient(wrap.querySelector('svg'), x, top);
  }

  function setMood(wrap, mood, instant) {
    const st = wrap._mw;
    const svg = wrap.querySelector('svg');
    if (mood === st.mood && svg.classList.contains('mw--m' + mood)) return;
    for (let i = 0; i <= 4; i++) svg.classList.toggle('mw--m' + i, i === mood);
    if (!instant && mood !== st.mood) {
      svg.classList.remove('mw--moodpop');
      svg.getBoundingClientRect();
      svg.classList.add('mw--moodpop');
    }
    st.mood = mood;
  }

  function setLevel(wrap, pct, opts = {}) {
    const p = Math.max(0, Math.min(1, pct));
    const first = !wrap._mw.placed;
    if (!first && p > wrap._mw.level + .001) slosh(wrap);
    wrap._mw.level = p;
    wrap._mw.placed = true;
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

  // Lap from a glass (sitting) or gulp at the surface (swimming). Hearts float up while drinking.
  async function drink(wrap) {
    const svg = wrap.querySelector('svg');
    svg.classList.add('mw--drink');
    if (!reduced()) floatHearts(wrap, 3);
    await wait(reduced() ? 50 : 1500);
    svg.classList.remove('mw--drink');
  }

  function floatHearts(wrap, n) {
    const fx = wrap.querySelector('.mw-fx');
    const ns = 'http://www.w3.org/2000/svg';
    const swim = wrap._mw.mode === 'swim';
    const x0 = swim ? 250 : 200;
    const y0 = swim ? levelY(wrap._mw.level) + 10 : 150;
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

  // Leap out of the water in an arc and splash back down.
  async function jump(wrap) {
    const svg = wrap.querySelector('svg');
    const actor = wrap.querySelector('.mw-actor');
    if (reduced()) return;
    const x = wrap._mw.mode === 'swim' ? 206 : 200;
    svg.classList.add('mw--jump');
    const anim = actor.animate([
      { transform: 'translate(0px, 0px) rotate(0deg) scale(1, 1)' },
      { transform: 'translate(0px, 16px) rotate(0deg) scale(1.08, .86)', offset: .14 },
      { transform: 'translate(34px, -320px) rotate(-26deg) scale(1, 1)', offset: .48 },
      { transform: 'translate(12px, -360px) rotate(-4deg) scale(1, 1)', offset: .6 },
      { transform: 'translate(-10px, -24px) rotate(22deg) scale(1, 1)', offset: .9 },
      { transform: 'translate(0px, 0px) rotate(0deg) scale(1, 1)' },
    ], { duration: 1400, easing: 'cubic-bezier(.33,.1,.3,1)' });
    setTimeout(() => splash(wrap, x), 260);
    setTimeout(() => splash(wrap, x - 8), 1220);
    await anim.finished.catch(() => {});
    svg.classList.remove('mw--jump');
  }

  // Swim a lap even when the water is low.
  async function swim(wrap) {
    const st = wrap._mw;
    const svg = wrap.querySelector('svg');
    if (st.mode === 'swim') {
      svg.classList.add('mw--zoom');
      await wait(reduced() ? 50 : 1400);
      svg.classList.remove('mw--zoom');
      return;
    }
    st.forceSwim = true;
    place(wrap, st.level);
    await wait(reduced() ? 50 : 2600);
    st.forceSwim = false;
    place(wrap, st.level);
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
  function lookAt(wrap, cx, cy) {
    const st = wrap._mw;
    wrap.querySelectorAll(st.mode === 'swim' ? '.mw-stretch .mw-head' : '.mw-sit .mw-head').forEach((h) => {
      const r = h.getBoundingClientRect();
      const vx = cx - (r.left + r.width / 2);
      const vy = cy - (r.top + r.height * .55);
      const d = Math.max(60, Math.hypot(vx, vy));
      const tx = (vx / d) * 4;
      const ty = (vy / d) * 3;
      h.querySelectorAll('.mw-pupil').forEach((p) => { p.style.transform = `translate(${tx}px, ${ty}px)`; });
    });
    clearTimeout(st.lookTimer);
    st.lookTimer = setTimeout(() => wrap.querySelectorAll('.mw-pupil').forEach((p) => { p.style.transform = ''; }), 1800);
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

  // Rub Meowie: happy squint, purr and hearts.
  function pet(wrap) {
    const st = wrap._mw;
    const svg = wrap.querySelector('svg');
    clearTimeout(st.petTimer);
    svg.classList.add('mw--pet');
    floatHearts(wrap, 4);
    if (navigator.vibrate) navigator.vibrate([8, 50, 8, 50, 8]);
    st.petTimer = setTimeout(() => svg.classList.remove('mw--pet'), 1800);
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

  function yawn(wrap) {
    const svg = wrap.querySelector('svg');
    if (wrap._mw.busy || reduced()) return;
    svg.classList.add('mw--yawn');
    setTimeout(() => svg.classList.remove('mw--yawn'), 1600);
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
          if (st.level >= .2 && r < .5) fishPass(wrap);
          else if (st.mode === 'sit' && r < .75) yawn(wrap);
          else lookAround(wrap);
        }
        next();
      }, 6000 + Math.random() * 5000);
    })();
  }

  // Wire touch: eyes follow the finger, tap the cat, tap the water, rub to pet.
  function interact(wrap, { onTap } = {}) {
    const svg = wrap.querySelector('svg');
    let down = null;
    let rub = 0;
    let last = null;
    svg.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, cat: !!e.target.closest('.mw-actor') };
      last = { x: e.clientX, y: e.clientY };
      rub = 0;
      lookAt(wrap, e.clientX, e.clientY);
    });
    svg.addEventListener('pointermove', (e) => {
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
        if (down.cat) { if (onTap) onTap(); }
        else {
          const p = toSvg(svg, e.clientX, e.clientY);
          if (ripple(wrap, p.x, p.y) && navigator.vibrate) navigator.vibrate(6);
        }
      }
      down = null;
      last = null;
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', () => { down = null; });
    svg.addEventListener('pointerleave', () => { down = null; });
    startIdle(wrap);
  }

  // Parallax: nx, ny in -1..1 from phone tilt or pointer position.
  function tilt(wrap, nx, ny) {
    const set = (sel, k, ky) => { const g = wrap.querySelector(sel); if (g) g.style.transform = `translate(${nx * k}px, ${ny * ky}px)`; };
    set('.mw-par1', 16, 6);
    set('.mw-par2', 8, 3);
    set('.mw-par3', -6, -3);
  }

  // A stream of the drink pours down into the water, then the tail falls in with splashes.
  function pour(wrap, color = '#7cc8f5') {
    const st = wrap._mw;
    if (reduced()) { slosh(wrap, .6); return Promise.resolve(); }
    const fx = wrap.querySelector('.mw-fx');
    const ns = 'http://www.w3.org/2000/svg';
    const x = st.mode === 'swim' ? 112 : 108;
    const surf = levelY(st.level);
    const top = Math.max(-30, surf - 230);
    const len = surf - top + 4;
    const g = document.createElementNS(ns, 'g');
    g.innerHTML = `<g class="mw-stream"><rect x="${x - 7}" y="${top}" width="14" height="${len}" rx="7" fill="${color}" opacity=".92"/>
      <rect x="${x - 3.5}" y="${top}" width="4" height="${len}" rx="2" fill="#fff" opacity=".55"/></g>`;
    g.style.transformOrigin = `${x}px ${top}px`;
    fx.appendChild(g);
    g.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 360, easing: 'cubic-bezier(.55,0,.8,.3)', fill: 'forwards' });
    setTimeout(() => {
      g.animate([{ transform: 'translateY(0) scaleY(1)' }, { transform: `translateY(${len}px) scaleY(0)` }],
        { duration: 360, easing: 'cubic-bezier(.55,0,.8,.3)', fill: 'forwards' }).onfinish = () => g.remove();
    }, 900);
    setTimeout(() => ripple(wrap, x, surf + 6), 620);
    setTimeout(() => ripple(wrap, x, surf + 6), 1020);
    lookAtSvg(wrap, x, surf);
    return new Promise((r) => setTimeout(() => { splash(wrap, x); slosh(wrap, .8); r(); }, 360));
  }

  window.Meowie = { create, setLevel, setLayers, pourPoint, act, moodFor, interact, tilt, slosh, lookAt, pet, pour, skyNow };
})();
