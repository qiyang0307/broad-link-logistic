// Meowie: a grey tabby in a shark hood swimming in open water that rises as you drink.
// Three actions, all drawn and animated in code: drink (laps from a glass),
// swim (paddles once the water is half way up) and jump (leaps out with a splash).
// His face changes with the day's progress: thirsty → meh → content → happy → in love.
(function () {
  let uid = 0;
  const LINE = '#454b54';
  const FUR = '#a3a9b0';
  const FUR_DARK = '#565c64';
  const CREAM = '#f7f5f2';
  const HOOD = '#8f979f';
  const HOOD_DARK = '#79818a';
  const HOOD_LIGHT = '#a4acb4';
  const EYE = '#7cc43c';

  // Scene geometry (viewBox 0 0 400 320). No frame: the water fades out at the sides.
  const W = 400;
  const FLOOR = 290;
  const levelY = (p) => 284 - p * 224;

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 0 thirsty, 1 meh, 2 content, 3 happy, 4 over the moon
  const moodFor = (p) => (p >= 1 ? 4 : p >= .75 ? 3 : p >= .45 ? 2 : p >= .2 ? 1 : 0);

  // The face opening of the hood: an ellipse centred at (0, FY).
  const FY = 10;
  const FRX = 52;
  const FRY = 50;

  // A full ring of white felt teeth around the face opening, the bottom centre left clear for the mouth.
  function teeth() {
    let out = '';
    const r = (d) => (d * Math.PI) / 180;
    const p = (deg, k) => [(Math.cos(r(deg)) * FRX * k).toFixed(1), (FY + Math.sin(r(deg)) * FRY * k).toFixed(1)];
    for (let a = 11.25; a < 360; a += 22.5) {
      const [x1, y1] = p(a - 9.5, 1.02);
      const [x2, y2] = p(a + 9.5, 1.02);
      const [tx, ty] = p(a, .79);
      out += `<path d="M${x1} ${y1} L${tx} ${ty} L${x2} ${y2} Z" fill="#fff" stroke="#c9ced4" stroke-width="1.2" stroke-linejoin="round"/>`;
    }
    return out;
  }

  function openEye(x) {
    return `<ellipse cx="${x}" cy="15" rx="12.5" ry="13" fill="#fff" stroke="${LINE}" stroke-width="1.6"/>
      <ellipse cx="${x}" cy="15.5" rx="10.5" ry="11.5" fill="${EYE}"/>
      <g class="mw-pupil"><ellipse cx="${x}" cy="16" rx="6.6" ry="8.6" fill="#16181b"/>
      <circle cx="${x + 3.4}" cy="11" r="3.4" fill="#fff"/><circle cx="${x - 3.2}" cy="20" r="1.6" fill="#fff"/></g>`;
  }
  const heart = (x) => `<path d="M${x} 24 C${x - 15} 13 ${x - 10} 2 ${x} 9 C${x + 10} 2 ${x + 15} 13 ${x} 24 Z" fill="#ff6b8b" stroke="#d94f70" stroke-width="1.4"/>
      <circle cx="${x - 4}" cy="10" r="2" fill="#fff"/>`;
  const star = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill="#ffd54a"/>`;

  // Head in a felt shark hood, centred on (0,0). Every expression is drawn; CSS shows the one for the mood.
  // .mw-face holds everything inside the hood opening so a head bow can sink it and show the shark face above.
  function head(id) {
    const hood = 'M0 -78 C46 -78 80 -46 80 2 C80 50 50 80 0 80 C-50 80 -80 50 -80 2 C-80 -46 -46 -78 0 -78 Z';
    return `<g class="mw-head">
      <g class="mw-fin"><path d="M-15 -70 Q-8 -104 4 -124 Q6 -98 17 -70 Z" fill="${HOOD}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M-6 -78 Q-2 -96 2 -108" stroke="${HOOD_LIGHT}" stroke-width="4" stroke-linecap="round" fill="none"/></g>
      <path d="${hood}" fill="${HOOD}" stroke="${LINE}" stroke-width="3"/>
      <path d="M-50 -52 Q0 -80 50 -52" fill="none" stroke="${HOOD_LIGHT}" stroke-width="8" stroke-linecap="round" opacity=".75"/>
      <path d="M-74 30 Q-70 62 -40 76 M74 30 Q70 62 40 76" fill="none" stroke="${HOOD_DARK}" stroke-width="5" stroke-linecap="round" opacity=".7"/>
      <g class="mw-shark">
        <g class="mw-sheye"><circle cx="-52" cy="-30" r="8.5" fill="#fff" stroke="${LINE}" stroke-width="2"/><circle cx="-51" cy="-29" r="5.6" fill="#1d2026"/><circle cx="-49.5" cy="-31.5" r="1.8" fill="#fff"/></g>
        <g class="mw-sheye"><circle cx="52" cy="-30" r="8.5" fill="#fff" stroke="${LINE}" stroke-width="2"/><circle cx="51" cy="-29" r="5.6" fill="#1d2026"/><circle cx="49.5" cy="-31.5" r="1.8" fill="#fff"/></g>
        <circle cx="-13" cy="-50" r="3" fill="${LINE}"/><circle cx="13" cy="-50" r="3" fill="${LINE}"/>
      </g>
      <g class="mw-face">
      <clipPath id="${id}-face"><ellipse cx="0" cy="${FY}" rx="${FRX}" ry="${FRY}"/></clipPath>
      <ellipse cx="0" cy="${FY}" rx="${FRX}" ry="${FRY}" fill="${FUR}"/>
      <g clip-path="url(#${id}-face)">
        <path d="M-16 -34 Q-13 -20 -17 -6 M0 -38 V-10 M16 -34 Q13 -20 17 -6 M-30 -28 Q-26 -18 -30 -10 M30 -28 Q26 -18 30 -10" stroke="${FUR_DARK}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M-56 12 Q-46 15 -36 11 M-56 24 Q-46 27 -38 23 M56 12 Q46 15 36 11 M56 24 Q46 27 38 23" stroke="${FUR_DARK}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
        <ellipse cx="-18" cy="15" rx="17" ry="16" fill="#c4c9ce"/><ellipse cx="18" cy="15" rx="17" ry="16" fill="#c4c9ce"/>
        <path d="M-38 34 Q-34 18 -14 26 Q0 30 14 26 Q34 18 38 34 Q38 66 0 70 Q-38 66 -38 34 Z" fill="${CREAM}"/>
      </g>
      <ellipse cx="0" cy="${FY}" rx="${FRX}" ry="${FRY}" fill="none" stroke="${LINE}" stroke-width="3"/>
      ${teeth()}
      <g class="mw-blush"><ellipse cx="-31" cy="34" rx="8.5" ry="5" fill="#ff9db4"/><ellipse cx="31" cy="34" rx="8.5" ry="5" fill="#ff9db4"/></g>
      <g class="mw-x mw-eo">${openEye(-18)}${openEye(18)}
        <g class="mw-lid">
          <path d="M-31 1 H-5 V14 Q-18 10 -31 14 Z M31 1 H5 V14 Q18 10 31 14 Z" fill="#c4c9ce"/>
          <path d="M-30 14 Q-18 10 -6 14 M30 14 Q18 10 6 14" stroke="${LINE}" stroke-width="2.4" stroke-linecap="round" fill="none"/>
        </g>
      </g>
      <g class="mw-x mw-eh"><path d="M-28 18 Q-18 5 -8 18 M28 18 Q18 5 8 18" stroke="#2c2f35" stroke-width="3.8" stroke-linecap="round" fill="none"/></g>
      <g class="mw-x mw-ek">${heart(-18)}${heart(18)}</g>
      <path class="mw-tongue" d="M-6.5 39 Q-8 64 0 70 Q8 64 6.5 39 Z" fill="#ef8296" stroke="#c75d72" stroke-width="1.2"/>
      <g class="mw-x mw-mf"><path d="M-6 42.5 Q0 37.5 6 42.5" stroke="#6d5f60" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>
      <g class="mw-x mw-mw"><path d="M0 33.5 V37 M0 37 Q-5 42 -10 38.5 M0 37 Q5 42 10 38.5" fill="none" stroke="#6d5f60" stroke-width="2.4" stroke-linecap="round"/></g>
      <g class="mw-x mw-ms"><path d="M0 33.5 V36 M-12 36 Q-6 45 0 37 Q6 45 12 36" fill="none" stroke="#6d5f60" stroke-width="2.6" stroke-linecap="round"/></g>
      <g class="mw-x mw-mo"><path d="M-10 36 Q0 38 10 36 Q9 51 0 51 Q-9 51 -10 36 Z" fill="#7a2f3b" stroke="#5a2430" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M-6 46 Q0 41 6 46 Q5 51 0 51 Q-5 51 -6 46 Z" fill="#ef8296"/></g>
      <circle class="mw-mouth-pt" cx="0" cy="40" r="1" fill="none"/>
      <path d="M-6 27 Q0 25.5 6 27 L0 33.5 Z" fill="#f28c9c" stroke="#c97a8a" stroke-width="1.2" stroke-linejoin="round"/>
      <g class="mw-lick"><path d="M-3 38 C-12 44 -27 40 -29 28 C-31 17 -19 12 -11 19 C-6 23 -3 31 4 37 Z" fill="#f07b92" stroke="#c75d72" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M-6 34 Q-14 30 -18 22" stroke="#d9667e" stroke-width="1.6" stroke-linecap="round" fill="none"/></g>
      <g stroke="#eef0f2" stroke-width="1.6" stroke-linecap="round" opacity=".9">
        <path d="M-26 36 L-64 30 M-26 41 L-64 44"/><path d="M26 36 L64 30 M26 41 L64 44"/>
      </g>
      </g>
      <path class="mw-x mw-sweat" d="M58 -14 Q66 -2 62 4 Q57 8 53 3 Q51 -3 58 -14 Z" fill="#8fd3ff" stroke="#4fa8de" stroke-width="1.4"/>
      <g class="mw-x mw-spark">${star(-84, -58, 1)}${star(88, -44, .8)}${star(-80, 52, .7)}${star(86, 62, 1)}</g>
    </g>`;
  }

  // Sitting pose: a round, chubby tabby with a white bib and paws. Origin = between the feet.
  function sitPose(id) {
    const body = 'M-40 -150 C-72 -146 -86 -92 -86 -48 C-86 -14 -72 0 -50 0 H50 C72 0 86 -14 86 -48 C86 -92 72 -146 40 -150 Z';
    const stripes = [-128, -104, -80, -56, -32].map((y, i) => {
      const w = i % 2 ? 8 : 10;
      return `<path d="M-96 ${y} Q-64 ${y + 9} -34 ${y - 2} M96 ${y} Q64 ${y + 9} 34 ${y - 2}" stroke="${FUR_DARK}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
    }).join('');
    const paw = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${CREAM}" stroke="${LINE}" stroke-width="2.6"/>
      <path d="M${x - rx * .32} ${y + ry * .1} V${y + ry * .8} M${x + rx * .32} ${y + ry * .1} V${y + ry * .8}" stroke="#bfc3c8" stroke-width="2" stroke-linecap="round"/>`;
    return `<g class="mw-sit">
      <g class="mw-bodyfit"><g class="mw-squish">
      <g class="mw-tail-sit">
        <path d="M60 -12 C112 -6 124 -46 100 -78" fill="none" stroke="${LINE}" stroke-width="21" stroke-linecap="round"/>
        <path d="M60 -12 C112 -6 124 -46 100 -78" fill="none" stroke="${FUR}" stroke-width="15" stroke-linecap="round"/>
        <path d="M60 -12 C112 -6 124 -46 100 -78" fill="none" stroke="${FUR_DARK}" stroke-width="15" stroke-dasharray="8 10" stroke-dashoffset="4"/>
      </g>
      <clipPath id="${id}-body"><path d="${body}"/></clipPath>
      <path d="${body}" fill="${FUR}"/>
      <g clip-path="url(#${id}-body)">${stripes}
        <path d="M-84 -40 Q-60 -78 -36 -30 M84 -40 Q60 -78 36 -30" stroke="${FUR_DARK}" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55"/>
        <path d="M-30 -150 Q0 -138 30 -150 Q40 -84 26 -26 Q0 -14 -26 -26 Q-40 -84 -30 -150 Z" fill="#e9eaec"/>
        <path d="M-12 -96 Q-6 -90 0 -96 Q6 -90 12 -96 M-14 -70 Q-7 -64 0 -70 Q7 -64 14 -70" stroke="#cfd2d6" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      </g>
      <path d="${body}" fill="none" stroke="${LINE}" stroke-width="3"/>
      ${paw(-66, -8, 19, 10)}${paw(66, -8, 19, 10)}
      ${paw(-26, -7, 16, 11)}${paw(26, -7, 16, 11)}
      </g></g>
      <g class="mw-headpos" transform="translate(0 -184)">${head(id + 's')}</g>
      <g class="mw-glass">
        <path d="M-21 -52 H21 L18 -2 Q17.5 2 13 2 H-13 Q-17.5 2 -18 -2 Z" fill="rgba(214,238,255,.45)" stroke="#8fb4cf" stroke-width="2.4" stroke-linejoin="round"/>
        <clipPath id="${id}-gl"><path d="M-21 -52 H21 L18 -2 Q17.5 2 13 2 H-13 Q-17.5 2 -18 -2 Z"/></clipPath>
        <g clip-path="url(#${id}-gl)"><g class="mw-glass-water"><rect x="-26" y="-34" width="52" height="40" fill="#7cc8f5" opacity=".85"/>
          <path d="M-26 -34 H26" stroke="#d8f0ff" stroke-width="2.4"/></g></g>
        <path d="M-14 -45 L-12 -8" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>
        <ellipse cx="0" cy="-52" rx="21" ry="3.2" fill="none" stroke="#a9c8de" stroke-width="1.6"/>
      </g>
      <g class="mw-ball" transform="translate(-34 -272)"><g class="mw-ball-in">
        <circle r="17" fill="#fff" stroke="${LINE}" stroke-width="2.6"/>
        <path d="M-17 0 A17 17 0 0 1 0 -17 L0 0 Z" fill="#e8453c"/><path d="M17 0 A17 17 0 0 1 0 17 L0 0 Z" fill="#e8453c"/>
        <path d="M0 -17 A17 17 0 0 1 17 0 L0 0 Z" fill="#ffc93c"/><path d="M0 17 A17 17 0 0 1 -17 0 L0 0 Z" fill="#2f7fe0"/>
        <circle r="17" fill="none" stroke="${LINE}" stroke-width="2.6"/><circle cx="-6" cy="-7" r="4" fill="#fff" opacity=".7"/></g></g>
    </g>`;
  }

  // Stretched pose for swimming and jumping. Origin = middle of the body.
  function stretchPose(id) {
    const leg = (cls, d, [ex, ey]) => `<g class="mw-leg ${cls}"><path d="${d}" stroke="${LINE}" stroke-width="22" stroke-linecap="round" fill="none"/>
      <path d="${d}" stroke="${FUR}" stroke-width="16" stroke-linecap="round" fill="none"/>
      <circle cx="${ex}" cy="${ey}" r="9.5" fill="${CREAM}" stroke="${LINE}" stroke-width="2.4"/></g>`;
    return `<g class="mw-stretch">
      <g class="mw-tail-s">
        <path d="M-92 -4 C-126 -16 -142 8 -180 -12" fill="none" stroke="${LINE}" stroke-width="21" stroke-linecap="round"/>
        <path d="M-92 -4 C-126 -16 -142 8 -180 -12" fill="none" stroke="${FUR}" stroke-width="15" stroke-linecap="round"/>
        <path d="M-92 -4 C-126 -16 -142 8 -180 -12" fill="none" stroke="${FUR_DARK}" stroke-width="15" stroke-dasharray="8 10"/>
      </g>
      ${leg('mw-leg-b2', 'M-62 20 Q-82 40 -96 44', [-96, 44])}
      ${leg('mw-leg-f2', 'M30 22 Q50 42 66 46', [66, 46])}
      <clipPath id="${id}-sb"><ellipse cx="-16" cy="4" rx="86" ry="44"/></clipPath>
      <ellipse cx="-16" cy="4" rx="86" ry="44" fill="${FUR}"/>
      <g clip-path="url(#${id}-sb)">
        <path d="M-80 -44 Q-70 -14 -78 14 M-56 -48 Q-46 -14 -54 12 M-32 -48 Q-22 -14 -30 10 M-8 -48 Q2 -16 -6 8 M16 -46 Q26 -18 18 4" stroke="${FUR_DARK}" stroke-width="8" stroke-linecap="round" fill="none"/>
        <path d="M-96 26 Q-56 36 -16 34 Q30 34 70 18 V60 H-96 Z" fill="#e9eaec"/>
      </g>
      <ellipse cx="-16" cy="4" rx="86" ry="44" fill="none" stroke="${LINE}" stroke-width="3"/>
      ${leg('mw-leg-b1', 'M-50 26 Q-66 48 -78 56', [-78, 56])}
      ${leg('mw-leg-f1', 'M40 24 Q58 48 76 54', [76, 54])}
      <g transform="translate(80 -16) scale(.9)">${head(id + 'w')}</g>
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
    <linearGradient id="${id}-mix" class="mw-mix" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color: var(--water-1)"/><stop offset="1" style="stop-color: var(--water-2)"/></linearGradient>
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
  <g class="mw-par3"><g class="mw-pos" style="transform: translate(200px, ${FLOOR + 4}px) scale(.8)">
    <g class="mw-drift"><g class="mw-actor">
      ${sitPose(id)}
      ${stretchPose(id)}
    </g></g>
  </g></g>
  <g mask="url(#${id}-mask)" clip-path="url(#${id}-above)" pointer-events="none">
    <g class="mw-water mw-water-front"><g class="mw-slosh"><g class="mw-wave"><path d="${wave(6)}" fill="var(--water-2)" opacity=".2"/></g></g>
</g>
  </g>
  <g class="mw-fx" pointer-events="none"></g>
</svg>`;
    const wrap = document.createElement('div');
    wrap.className = 'cat-wrap';
    wrap.innerHTML = svg;
    wrap._mw = { id, level: 0, mode: 'sit', mood: 0, busy: false, layers: [], sx: 0, sy: 0, face: 1 };
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
    renderLayers(wrap);
    const swim = st.forceSwim || pct >= .45;
    if (!swim && st.mode === 'swim') stopSwim(wrap);
    st.mode = swim ? 'swim' : 'sit';
    svg.classList.toggle('mw--swim', swim);
    // Once swimming, Meowie keeps his depth when more water pours in; he only
    // moves down if the surface drops too close to him.
    if (swim) {
      if (st.swimY == null) st.swimY = Math.min(236, Math.max((y + FLOOR) / 2 + 6, 118));
      st.swimY = Math.min(236, Math.max(st.swimY, y + 52));
    } else st.swimY = null;
    wrap.querySelector('.mw-pos').style.transform = swim
      ? `translate(206px, ${st.swimY}px) scale(.66)`
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
    const sx = 1 + b * (b > 0 ? .62 : .34);
    const sy = 1 - b * (b > 0 ? .1 : -.08);
    const hx = 1 + b * (b > 0 ? .14 : .07);
    const body = wrap.querySelector('.mw-sit .mw-bodyfit');
    const head = wrap.querySelector('.mw-sit .mw-headpos');
    if (!body || !head) return;
    body.style.transform = `scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    head.style.transform = `translate(0px, ${(-184 + 140 * (1 - sy)).toFixed(1)}px) scale(${hx.toFixed(3)}, 1)`;
  }

  // Activity moods: relax (eyes shut, slow breathing), walk (strolls about), hyper (hops and juggles a ball).
  function setVibe(wrap, vibe) {
    const svg = wrap.querySelector('svg');
    ['relax', 'walk', 'hyper'].forEach((v) => svg.classList.toggle('mw--' + v, v === vibe));
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

  // Sitting: bow into the glass, lap it up with the tongue, come up with a happy squint and lick his lips.
  // Swimming: gulp at the surface. Hearts float up while drinking.
  async function drink(wrap) {
    const svg = wrap.querySelector('svg');
    if (reduced()) return;
    if (wrap._mw.mode === 'sit') { await lapGlass(wrap); return; }
    svg.classList.add('mw--drink');
    floatHearts(wrap, 3);
    await wait(1500);
    svg.classList.remove('mw--drink');
  }

  async function lapGlass(wrap) {
    const svg = wrap.querySelector('svg');
    svg.classList.add('mw--glass');
    await wait(420);
    lookAtSvg(wrap, 200, 320);
    svg.classList.add('mw--drink');
    await wait(2300);
    svg.classList.remove('mw--drink');
    await lick(wrap, true);
    svg.classList.remove('mw--glass');
  }

  // Big sideways lick of the lips with a happy squint.
  async function lick(wrap, hearts) {
    const svg = wrap.querySelector('svg');
    svg.classList.add('mw--lick');
    if (hearts) floatHearts(wrap, 3);
    await wait(1150);
    svg.classList.remove('mw--lick');
  }

  function floatHearts(wrap, n) {
    const fx = wrap.querySelector('.mw-fx');
    const ns = 'http://www.w3.org/2000/svg';
    const swim = wrap._mw.mode === 'swim';
    const x0 = swim ? 250 : 200;
    const y0 = swim ? levelY(wrap._mw.level) + 10 : 120;
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
          else if (st.mode === 'sit' && r < .65) lick(wrap);
          else if (st.mode === 'sit' && r < .8) yawn(wrap);
          else lookAround(wrap);
        }
        next();
      }, 4500 + Math.random() * 4500);
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
    const ns = 'http://www.w3.org/2000/svg';
    const top = Math.max(-40, end - 190);
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
      fx.appendChild(cup);
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
    fx.appendChild(g);
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

  // Swimming Meowie's mouth in scene coordinates (the mouth sits at 0,38 in head space).
  function mouthPoint(wrap) {
    const svg = wrap.querySelector('svg');
    // Measured from a marker in the head so every CSS animation and transform is included.
    const r = wrap.querySelector('.mw-stretch .mw-mouth-pt').getBoundingClientRect();
    if (!r.width && !r.height && !r.left) return { x: 260, y: levelY(wrap._mw.level) + 20 };
    return toSvg(svg, r.left + r.width / 2, r.top + r.height / 2);
  }

  // Where the pouring cup will appear, in screen coordinates (for hand-off animations).
  function pourTarget(wrap) {
    const st = wrap._mw;
    const svg = wrap.querySelector('svg');
    if (st.mode === 'sit') return toClient(svg, GLASS_X + 2, Math.max(-40, GLASS_RIM - 190) - 2);
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

  // ---------- Swim choreography ----------
  // While in the water Meowie strings together different moves: cruising, turning round,
  // swimming backwards, a loop-the-loop, a dive, and a backstroke on his back.
  const SX_MIN = -110;
  const SX_MAX = 90;
  const rand = (a, b) => a + Math.random() * (b - a);
  const tf = (x, y, face, rot = 0, fy = 1) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rot}deg) scale(${face}, ${fy})`;

  function stopSwim(wrap) {
    const st = wrap._mw;
    if (st.swimAnim) { st.swimAnim.cancel(); st.swimAnim = null; }
    st.sx = 0; st.sy = 0; st.face = 1;
    const d = wrap.querySelector('.mw-drift');
    if (d) d.style.transform = '';
    wrap.querySelector('svg').classList.remove('mw--rev');
  }

  async function swimMove(wrap) {
    const st = wrap._mw;
    const drift = wrap.querySelector('.mw-drift');
    const svg = wrap.querySelector('svg');
    const { sx, sy, face } = st;
    const ahead = face > 0 ? SX_MAX - sx : sx - SX_MIN;
    const behind = face > 0 ? sx - SX_MIN : SX_MAX - sx;
    let move = Math.random();
    // Pick a move that fits the space in front of him.
    if (ahead < 50) move = behind > 70 && Math.random() < .35 ? .45 : .2; // reverse or turn round
    let frames, dur, ex = sx, ey = 0, ef = face, easing = 'cubic-bezier(.45,.05,.35,1)';
    if (move < .3) {
      if (ahead < 50) { // turn round
        frames = [tf(sx, sy, face), tf(sx, sy - 8, face * .15), tf(sx, sy, -face)];
        ef = -face; dur = 800;
      } else { // cruise forward with a gentle wave
        ex = sx + face * rand(50, Math.min(ahead, 140));
        frames = [tf(sx, sy, face), tf((sx + ex) / 2, sy - 10, face), tf(ex, 0, face)];
        dur = Math.max(1500, Math.abs(ex - sx) * 20);
      }
    } else if (move < .45 && behind > 70) { // swim backwards, tail first
      ex = sx - face * rand(60, Math.min(behind, 110));
      frames = [tf(sx, sy, face, 0), tf((sx + ex) / 2, sy + 6, face, 4), tf(ex, 0, face, 0)];
      dur = 2400;
      svg.classList.add('mw--rev');
    } else if (move < .6 && ahead >= 70) { // loop-the-loop
      ex = sx + face * 60;
      frames = [tf(sx, sy, face, 0), tf(sx + face * 20, sy - 28, face, -120), tf(sx + face * 40, sy - 20, face, -240), tf(ex, 0, face, -360)];
      dur = 1700;
    } else if (move < .78 && ahead >= 60) { // dive down and come back up
      ex = sx + face * rand(60, Math.min(ahead, 110));
      frames = [tf(sx, sy, face, 0), tf(sx + (ex - sx) * .45, sy + 32, face, 14), tf(ex, 0, face, -6)];
      dur = 1900;
    } else if (ahead >= 60) { // backstroke: roll onto his back, glide, roll back
      ex = sx + face * rand(55, Math.min(ahead, 100));
      frames = [tf(sx, sy, face, 0, 1), tf(sx + (ex - sx) * .15, sy - 4, face, 0, -1), tf(sx + (ex - sx) * .85, sy - 4, face, 0, -1), tf(ex, 0, face, 0, 1)];
      dur = 2600;
      easing = 'ease-in-out';
    } else {
      frames = [tf(sx, sy, face), tf(sx, sy - 8, face * .15), tf(sx, sy, -face)];
      ef = -face; dur = 800;
    }
    const anim = drift.animate(frames.map((transform) => ({ transform })), { duration: dur, easing, fill: 'forwards' });
    st.swimAnim = anim;
    try { await anim.finished; } catch { return; }
    if (st.swimAnim !== anim) return;
    st.sx = ex; st.sy = ey; st.face = ef;
    drift.style.transform = tf(ex, ey, ef);
    anim.cancel();
    st.swimAnim = null;
    svg.classList.remove('mw--rev');
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
          await wait(rand(350, 1300));
        } else await wait(700);
      }
      st.swimLoop = false;
    })();
  }

  // While being filled the glass waits to his side; rim in scene coordinates
  // (sit pose at (200, FLOOR + 4) scaled .8, glass shifted 100 right, rim at y -52 locally).
  const GLASS_X = 200 + 100 * .8;
  const GLASS_RIM = FLOOR + 4 - 52 * .8;

  // Pour a drink for Meowie and let him enjoy it.
  // Sitting: the cup fills his glass and he laps it up.
  // Swimming: he rises to the surface, catches the stream in his mouth and looks blissful.
  async function pourAndDrink(wrap, color, o = {}) {
    const st = wrap._mw;
    const svg = wrap.querySelector('svg');
    if (reduced()) { slosh(wrap, .6); return; }
    if (st.busy) { pour(wrap, color, { cup: o.cup }); await wait(1300); return; }
    st.busy = true;
    try {
      if (st.mode === 'sit') {
        svg.classList.add('mw--fill');
        const gw = wrap.querySelector('.mw-sit .mw-glass-water');
        const fill = gw.animate([{ transform: 'translateY(26px)' }, { transform: 'translateY(0)' }],
          { duration: 800, delay: (o.cup === false ? 0 : 260) + 300, easing: 'ease-out', fill: 'both' });
        await pour(wrap, color, { x: GLASS_X, end: GLASS_RIM, cup: o.cup, surface: false });
        await wait(800);
        // The full glass slides in between his paws, then he laps it up.
        svg.classList.add('mw--glass');
        svg.classList.remove('mw--fill');
        await wait(150);
        fill.cancel();
        await lapGlass(wrap);
      } else {
        // He keeps swimming at his depth and gulps the fresh water happily, blowing bubbles.
        const mouth = mouthPoint(wrap);
        const surf = levelY(st.level);
        pour(wrap, color, { x: Math.max(40, Math.min(360, mouth.x)), end: surf, cup: o.cup });
        setTimeout(() => svg.classList.add('mw--sip'), 500);
        setTimeout(() => mouthBubbles(wrap, 5), 700);
        setTimeout(() => mouthBubbles(wrap, 4), 1400);
        setTimeout(() => floatHearts(wrap, 3), 1100);
        await wait(2600);
        svg.classList.remove('mw--sip');
      }
    } finally {
      st.busy = false;
    }
  }

  window.Meowie = { create, setLevel, setLayers, pourPoint, act, moodFor, interact, tilt, slosh, lookAt, pet, pour, pourAndDrink, pourTarget, skyNow, setBuild, setVibe };
})();
