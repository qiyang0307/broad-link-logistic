// Meowie: a grey tabby in a shark hood who lives in a fish tank that fills as you drink.
// Three actions, all drawn and animated in code: drink (laps from a glass),
// swim (paddles once the tank is half full) and jump (leaps out with a splash).
(function () {
  let uid = 0;
  const LINE = '#4a5059';
  const FUR = '#a9afb6';
  const FUR_DARK = '#6b7179';
  const CREAM = '#f6f2ec';
  const HOOD = '#9ea8b3';
  const HOOD_DARK = '#87919c';

  // Tank geometry (viewBox 0 0 300 320).
  const TANK = 'M30 70 Q30 40 60 40 H240 Q270 40 270 70 V270 Q270 300 240 300 H60 Q30 300 30 270 Z';
  const FLOOR = 288;
  const levelY = (p) => 292 - p * 236; // water surface for 0..1

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hood teeth around the face opening (ellipse rx 44, ry 40 centred at 0,14), leaving the chin clear.
  function teeth() {
    let out = '';
    for (let a = 168; a <= 372; a += 17) {
      const r = (d) => (d * Math.PI) / 180;
      const p = (deg, k) => [(Math.cos(r(deg)) * 44 * k).toFixed(1), (14 + Math.sin(r(deg)) * 40 * k).toFixed(1)];
      const [x1, y1] = p(a - 7, 1);
      const [x2, y2] = p(a + 7, 1);
      const [tx, ty] = p(a, .76);
      out += `<path d="M${x1} ${y1} L${tx} ${ty} L${x2} ${y2} Z" fill="#fff" stroke="#cdd2d8" stroke-width="1.2" stroke-linejoin="round"/>`;
    }
    return out;
  }

  function eye(x, flip) {
    const s = flip ? -1 : 1;
    return `<g class="mw-eye">
      <ellipse cx="${x}" cy="14" rx="10" ry="10.5" fill="#d3cf6a"/>
      <ellipse cx="${x}" cy="15" rx="6" ry="8" fill="#1d1f22"/>
      <circle cx="${x + 3}" cy="10" r="2.6" fill="#fff"/>
      <path d="M${x - 12 * s} 1 L${x + 12 * s} 4 L${x + 12 * s} 7 L${x - 12 * s} 3 Z" fill="${CREAM}"/>
      <path d="M${x - 12 * s} 3.5 L${x + 11 * s} 7" stroke="${FUR_DARK}" stroke-width="2.4" stroke-linecap="round"/>
    </g>`;
  }

  // Head with hood, centred on (0,0). Same markup is used in both poses.
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
        <path d="M-50 -30 H50 V2 Q24 -6 0 -2 Q-24 -6 -50 2 Z" fill="${FUR}"/>
        <path d="M-12 -24 Q-10 -12 -13 -2 M0 -26 V-4 M12 -24 Q10 -12 13 -2 M-40 0 Q-30 -4 -24 4 M40 0 Q30 -4 24 4" stroke="${FUR_DARK}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      </g>
      <ellipse cx="0" cy="14" rx="44" ry="40" fill="none" stroke="${LINE}" stroke-width="3"/>
      ${teeth()}
      <g class="mw-eyes">${eye(-18, false)}${eye(18, true)}</g>
      <ellipse cx="-9" cy="36" rx="10.5" ry="7.5" fill="#fff"/><ellipse cx="9" cy="36" rx="10.5" ry="7.5" fill="#fff"/>
      <path class="mw-tongue" d="M-5.5 39 Q-6 51 0 52 Q6 51 5.5 39 Z" fill="#ef8296" stroke="#c75d72" stroke-width="1.2"/>
      <path d="M-5 28 L5 28 L0 33.5 Z" fill="#f0a1b0" stroke="#c97a8a" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M0 33.5 V37 M0 37 Q-5 42 -10 38.5 M0 37 Q5 42 10 38.5" fill="none" stroke="#6d5f60" stroke-width="2.2" stroke-linecap="round"/>
      <g stroke="#cfcac3" stroke-width="1.6" stroke-linecap="round" class="mw-whiskers">
        <path d="M-24 34 L-58 28 M-24 39 L-58 42"/><path d="M24 34 L58 28 M24 39 L58 42"/>
      </g>
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
      <g class="mw-paws-sit"><ellipse cx="-21" cy="-6" rx="16" ry="10" fill="#fff" stroke="${LINE}" stroke-width="2.6"/>
        <ellipse cx="21" cy="-6" rx="16" ry="10" fill="#fff" stroke="${LINE}" stroke-width="2.6"/></g>
      <g class="mw-glass">
        <path d="M-82 -44 H-50 L-53 -2 Q-54 2 -58 2 H-74 Q-78 2 -79 -2 Z" fill="rgba(210,236,255,.55)" stroke="#8fb4cf" stroke-width="2.4" stroke-linejoin="round"/>
        <clipPath id="${id}-gl"><path d="M-82 -44 H-50 L-53 -2 Q-54 2 -58 2 H-74 Q-78 2 -79 -2 Z"/></clipPath>
        <g clip-path="url(#${id}-gl)"><rect class="mw-glass-water" x="-90" y="-30" width="50" height="40" fill="#7cc8f5"/></g>
        <path d="M-76 -38 L-74 -8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
      </g>
      <path d="M-34 -98 Q0 -84 34 -98" fill="none" stroke="#56606b" stroke-width="7" stroke-linecap="round"/>
      <circle cx="0" cy="-88" r="6" fill="#d7dbe0" stroke="${LINE}" stroke-width="2"/>
      <g transform="translate(0 -150)">${head(id + 's')}</g>
    </g>`;
  }

  // Stretched pose for swimming and jumping. Origin = middle of the body.
  function stretchPose(id) {
    return `<g class="mw-stretch">
      <g class="mw-tail-s">
        <path d="M-88 -4 C-122 -16 -138 8 -176 -12" fill="none" stroke="${LINE}" stroke-width="19" stroke-linecap="round"/>
        <path d="M-88 -4 C-122 -16 -138 8 -176 -12" fill="none" stroke="${FUR}" stroke-width="13" stroke-linecap="round"/>
        <path d="M-88 -4 C-122 -16 -138 8 -176 -12" fill="none" stroke="${FUR_DARK}" stroke-width="13" stroke-dasharray="7 11"/>
      </g>
      <g class="mw-leg mw-leg-b2"><path d="M-62 20 Q-82 40 -96 44" stroke="${LINE}" stroke-width="20" stroke-linecap="round" fill="none"/><path d="M-62 20 Q-82 40 -96 44" stroke="#fff" stroke-width="14" stroke-linecap="round" fill="none"/></g>
      <g class="mw-leg mw-leg-f2"><path d="M30 22 Q50 42 66 46" stroke="${LINE}" stroke-width="20" stroke-linecap="round" fill="none"/><path d="M30 22 Q50 42 66 46" stroke="#fff" stroke-width="14" stroke-linecap="round" fill="none"/></g>
      <ellipse cx="-16" cy="4" rx="82" ry="38" fill="${FUR}" stroke="${LINE}" stroke-width="3"/>
      <path d="M-16 30 Q-60 30 -84 16 Q-60 42 -16 42 Q30 42 54 20 Q30 30 -16 30 Z" fill="${CREAM}"/>
      <path d="M-70 -24 Q-62 -6 -68 10 M-46 -32 Q-38 -10 -44 8 M-22 -34 Q-14 -12 -20 6 M2 -32 Q10 -12 4 4" stroke="${FUR_DARK}" stroke-width="5" stroke-linecap="round" fill="none"/>
      <g class="mw-leg mw-leg-b1"><path d="M-50 26 Q-66 48 -78 56" stroke="${LINE}" stroke-width="20" stroke-linecap="round" fill="none"/><path d="M-50 26 Q-66 48 -78 56" stroke="#fff" stroke-width="14" stroke-linecap="round" fill="none"/></g>
      <g class="mw-leg mw-leg-f1"><path d="M40 24 Q58 48 76 54" stroke="${LINE}" stroke-width="20" stroke-linecap="round" fill="none"/><path d="M40 24 Q58 48 76 54" stroke="#fff" stroke-width="14" stroke-linecap="round" fill="none"/></g>
      <path d="M40 -26 Q58 2 44 30" fill="none" stroke="#56606b" stroke-width="7" stroke-linecap="round"/>
      <g transform="translate(78 -14) scale(.92)">${head(id + 'w')}</g>
    </g>`;
  }

  function create(opts = {}) {
    const id = 'mw' + (++uid);
    const bubbles = [70, 120, 200, 236, 160].map((x, i) =>
      `<circle class="mw-bub" cx="${x}" cy="250" r="${3 + (i % 3) * 1.5}" style="animation-delay:${i * .9}s;animation-duration:${3.4 + (i % 3) * .8}s"/>`).join('');
    const wave = (amp) => {
      let d = `M0 ${amp}`;
      for (let x = 0; x < 720; x += 60) d += ` Q${x + 15} 0 ${x + 30} ${amp} T${x + 60} ${amp}`;
      return d + ' V400 H0 Z';
    };
    const svg = `
<svg class="mw ${opts.intro ? 'mw--intro' : ''}" viewBox="0 0 300 320" role="img" aria-label="Meowie, a cat in a shark hood, in a water tank">
  <defs>
    <clipPath id="${id}-tank"><path d="${TANK}"/></clipPath>
    <linearGradient id="${id}-wb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd0ff"/><stop offset="1" stop-color="#1f8fe0"/></linearGradient>
    <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="${TANK}" class="mw-tank-bg"/>
  <g clip-path="url(#${id}-tank)">
    <g class="mw-water mw-water-back"><g class="mw-wave mw-wave-back"><path d="${wave(8)}" fill="url(#${id}-wb)"/></g>
      <g class="mw-bubs" fill="#fff" opacity=".75">${bubbles}</g></g>
    <g class="mw-rays" opacity=".18"><path d="M70 40 L40 300 H70 L110 40 Z M150 40 L130 300 H170 L190 40 Z" fill="#fff"/></g>
    <g class="mw-weed mw-weed-1"><path d="M58 ${FLOOR} C48 260 70 246 58 218 C50 198 66 188 60 170" fill="none" stroke="#3cb37a" stroke-width="7" stroke-linecap="round"/></g>
    <g class="mw-weed mw-weed-2"><path d="M246 ${FLOOR} C256 262 236 248 248 224 C256 206 242 198 248 184" fill="none" stroke="#2f9d6a" stroke-width="7" stroke-linecap="round"/></g>
    <path d="M30 ${FLOOR} Q90 278 150 286 T270 282 V310 H30 Z" fill="#f0d9a8"/>
    <g fill="#e2c48c"><circle cx="92" cy="294" r="4"/><circle cx="196" cy="296" r="5"/><circle cx="226" cy="292" r="3"/></g>
  </g>
  <g class="mw-pos" style="transform: translate(150px, ${FLOOR + 4}px) scale(.78)">
    <g class="mw-drift"><g class="mw-actor">
      ${sitPose(id)}
      ${stretchPose(id)}
    </g></g>
  </g>
  <g clip-path="url(#${id}-tank)" pointer-events="none">
    <g class="mw-water mw-water-front"><g class="mw-wave"><path d="${wave(6)}" fill="#3aa6ee" opacity=".28"/></g></g>
  </g>
  <g class="mw-fx" pointer-events="none"></g>
  <path d="${TANK}" fill="url(#${id}-glass)" pointer-events="none"/>
  <path d="${TANK}" fill="none" class="mw-tank-line" pointer-events="none"/>
  <path d="M44 84 Q44 58 64 54" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7" pointer-events="none"/>
</svg>`;
    const wrap = document.createElement('div');
    wrap.className = 'cat-wrap';
    wrap.innerHTML = svg;
    wrap._mw = { level: 0, mode: 'sit', busy: false };
    place(wrap, 0, true);
    return wrap;
  }

  function place(wrap, pct, instant) {
    const st = wrap._mw;
    const svg = wrap.querySelector('svg');
    const y = levelY(pct);
    wrap.querySelectorAll('.mw-water').forEach((g) => { g.style.transform = `translateY(${y}px)`; });
    if (instant) wrap.querySelectorAll('.mw-water, .mw-pos').forEach((g) => { g.style.transition = 'none'; });
    const swim = st.forceSwim || pct >= .45;
    st.mode = swim ? 'swim' : 'sit';
    svg.classList.toggle('mw--swim', swim);
    const pos = wrap.querySelector('.mw-pos');
    pos.style.transform = swim
      ? `translate(166px, ${Math.min(240, Math.max((y + FLOOR) / 2 + 6, 120))}px) scale(.64)`
      : `translate(150px, ${FLOOR + 4}px) scale(.78)`;
    if (instant) requestAnimationFrame(() => wrap.querySelectorAll('.mw-water, .mw-pos').forEach((g) => { g.style.transition = ''; }));
  }

  function setLevel(wrap, pct) {
    wrap._mw.level = Math.max(0, Math.min(1, pct));
    place(wrap, wrap._mw.level);
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function splash(wrap, x) {
    if (reduced()) return;
    const fx = wrap.querySelector('.mw-fx');
    const y = levelY(wrap._mw.level);
    const ns = 'http://www.w3.org/2000/svg';
    const ring = document.createElementNS(ns, 'ellipse');
    ring.setAttribute('cx', x); ring.setAttribute('cy', y); ring.setAttribute('rx', 10); ring.setAttribute('ry', 3);
    ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#fff'); ring.setAttribute('stroke-width', 3);
    fx.appendChild(ring);
    ring.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(5)', opacity: 0 }],
      { duration: 700, easing: 'ease-out' }).onfinish = () => ring.remove();
    ring.style.transformOrigin = `${x}px ${y}px`;
    for (let i = 0; i < 9; i++) {
      const d = document.createElementNS(ns, 'circle');
      d.setAttribute('cx', x); d.setAttribute('cy', y); d.setAttribute('r', 3 + Math.random() * 3);
      d.setAttribute('fill', i % 2 ? '#bfe6ff' : '#fff');
      fx.appendChild(d);
      const dx = (Math.random() - .5) * 90;
      d.animate([
        { transform: 'translate(0,0)', opacity: 1 },
        { transform: `translate(${dx * .6}px, ${-40 - Math.random() * 40}px)`, opacity: 1, offset: .45 },
        { transform: `translate(${dx}px, 10px)`, opacity: 0 },
      ], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => d.remove();
    }
  }

  // Lap from a glass (sitting) or gulp at the surface (swimming).
  async function drink(wrap) {
    const svg = wrap.querySelector('svg');
    svg.classList.add('mw--drink');
    await wait(reduced() ? 50 : 1500);
    svg.classList.remove('mw--drink');
  }

  // Leap out of the water in an arc and splash back down.
  async function jump(wrap) {
    const svg = wrap.querySelector('svg');
    const actor = wrap.querySelector('.mw-actor');
    if (reduced()) return;
    const wasSwim = wrap._mw.mode === 'swim';
    svg.classList.add('mw--jump');
    const posX = wasSwim ? 166 : 150;
    const anim = actor.animate([
      { transform: 'translate(0px, 0px) rotate(0deg) scale(1, 1)' },
      { transform: 'translate(0px, 14px) rotate(0deg) scale(1.08, .86)', offset: .14 },
      { transform: 'translate(30px, -330px) rotate(-28deg) scale(1, 1)', offset: .5 },
      { transform: 'translate(10px, -370px) rotate(-4deg) scale(1, 1)', offset: .62 },
      { transform: 'translate(-10px, -20px) rotate(24deg) scale(1, 1)', offset: .9 },
      { transform: 'translate(0px, 0px) rotate(0deg) scale(1, 1)' },
    ], { duration: 1300, easing: 'cubic-bezier(.35,.1,.3,1)' });
    setTimeout(() => splash(wrap, posX), 240);
    setTimeout(() => splash(wrap, posX - 10), 1120);
    await anim.finished.catch(() => {});
    svg.classList.remove('mw--jump');
  }

  // Swim a lap even when the tank is low.
  async function swim(wrap) {
    const st = wrap._mw;
    if (st.mode === 'swim') {
      const svg = wrap.querySelector('svg');
      svg.classList.add('mw--zoom');
      await wait(reduced() ? 50 : 1600);
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

  window.Meowie = { create, setLevel, act };
})();
