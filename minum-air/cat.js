// Bos Meow: the Minum Air mascot, drawn entirely in SVG.
// A grey-and-white tabby in a backwards cap and pixel shades whose body fills with water.
(function () {
  let uid = 0;

  // Pixel shades: 1 = black pixel, 2 = white glint pixel. Each cell is PX user units.
  const PX = 5.8;
  const SHADES = [
    '1111111111111111111111111',
    '0111111111100011111111110',
    '0112211111100011221111100',
    '0011221111000001122111100',
    '0001111110000000111111000',
  ];

  function shadesMarkup() {
    let out = '';
    SHADES.forEach((row, y) => {
      [...row].forEach((c, x) => {
        if (c === '0') return;
        out += `<rect x="${(x * PX).toFixed(1)}" y="${(y * PX).toFixed(1)}" width="${PX + .4}" height="${PX + .4}" fill="${c === '2' ? '#fff' : '#0c0c0f'}"/>`;
      });
    });
    return out;
  }

  // Head + ears + body silhouette, reused as the water clip and the outline.
  const HEAD = 'M48 112 C46 82 52 62 62 52 L58 10 L98 40 C110 37 130 37 142 40 L182 10 L178 52 C188 62 194 82 192 112 C192 150 162 172 120 172 C78 172 48 150 48 112 Z';
  const BODY = 'M50 260 C42 212 68 168 120 166 C172 168 198 212 190 260 Z';

  function wavePath(w, amp) {
    // Two periods of a sine-ish wave, wide enough to slide horizontally forever.
    let d = `M0 ${amp}`;
    for (let x = 0; x < w * 2; x += 60) {
      d += ` Q${x + 15} 0 ${x + 30} ${amp} T${x + 60} ${amp}`;
    }
    return d + ` V300 H0 Z`;
  }

  function waterLayer(clip, gradId) {
    return `<g clip-path="url(#${clip})"><g class="cat-water" style="transform: translateY(262px)">
      <g class="wave wave-back"><path d="${wavePath(240, 10)}" fill="var(--water-2)" opacity=".45" transform="translate(0 -6)"/></g>
      <g class="wave wave-front"><path d="${wavePath(240, 10)}" fill="url(#${gradId})" opacity=".7"/></g>
      <circle class="bubble b1" cx="80" cy="60" r="4" fill="#fff" opacity=".7"/>
      <circle class="bubble b2" cx="150" cy="80" r="3" fill="#fff" opacity=".7"/>
      <circle class="bubble b3" cx="118" cy="40" r="5" fill="#fff" opacity=".6"/>
    </g></g>`;
  }

  function create(opts = {}) {
    const id = 'cat' + (++uid);
    const water = opts.water !== false;
    const svg = `
<svg class="cat ${opts.intro ? 'cat--intro' : ''}" viewBox="0 0 240 260" role="img" aria-label="Bos Meow, a cool cat in sunglasses">
  <defs>
    <clipPath id="${id}-head"><path d="${HEAD}"/></clipPath>
    <clipPath id="${id}-body"><path d="${BODY}"/></clipPath>
    <clipPath id="${id}-top"><path d="M0 0 H240 V106 C190 98 50 98 0 106 Z"/></clipPath>
    <linearGradient id="${id}-w" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--water-1)"/><stop offset="1" stop-color="var(--water-2)"/>
    </linearGradient>
  </defs>

  <g class="cat-tail"><path d="M190 238 C236 230 238 186 214 170" fill="none" stroke="#8b9097" stroke-width="18" stroke-linecap="round"/>
    <path d="M222 188 L214 170" stroke="#5c6168" stroke-width="18" stroke-linecap="round"/></g>

  <g class="cat-body">
    <path d="${BODY}" fill="#f7f4f0"/>
    ${water ? waterLayer(id + '-body', id + '-w') : ''}
    <path d="${BODY}" fill="none" stroke="var(--cat-line)" stroke-width="3"/>
    <path d="M78 190 Q86 200 82 214 M162 190 Q154 200 158 214 M110 196 Q120 206 130 196" fill="none" stroke="#e2ddd6" stroke-width="3" stroke-linecap="round"/>
    <g class="cat-paws"><ellipse cx="92" cy="252" rx="20" ry="11" fill="#fff" stroke="var(--cat-line)" stroke-width="3"/>
      <ellipse cx="148" cy="252" rx="20" ry="11" fill="#fff" stroke="var(--cat-line)" stroke-width="3"/></g>
  </g>

  <g class="cat-head">
    <g class="cat-ear-l"><path d="M62 54 L58 10 L98 40 Z" fill="#8b9097" stroke="var(--cat-line)" stroke-width="3" stroke-linejoin="round"/><path d="M66 46 L64 22 L88 40 Z" fill="#f2b6c1"/></g>
    <g class="cat-ear-r"><path d="M178 54 L182 10 L142 40 Z" fill="#8b9097" stroke="var(--cat-line)" stroke-width="3" stroke-linejoin="round"/><path d="M174 46 L176 22 L152 40 Z" fill="#f2b6c1"/></g>
    <path d="${HEAD}" fill="#f7f4f0"/>
    <g clip-path="url(#${id}-top)">
      <path d="${HEAD}" fill="#9ca1a8"/>
      <path d="M92 52 Q96 70 92 86 M108 46 Q112 66 108 88 M132 46 Q128 66 132 88 M148 52 Q144 70 148 86 M60 84 Q72 82 80 90 M180 84 Q168 82 160 90" stroke="#5c6168" stroke-width="5" stroke-linecap="round" fill="none"/>
    </g>
    ${water ? waterLayer(id + '-head', id + '-w') : ''}
    <path d="${HEAD}" fill="none" stroke="var(--cat-line)" stroke-width="3"/>

    <g class="cat-eyes"><ellipse cx="94" cy="108" rx="8" ry="9" fill="#2a2a2e"/><ellipse cx="146" cy="108" rx="8" ry="9" fill="#2a2a2e"/>
      <circle cx="97" cy="104" r="2.6" fill="#fff"/><circle cx="149" cy="104" r="2.6" fill="#fff"/></g>

    <ellipse cx="104" cy="138" rx="17" ry="12" fill="#fff"/><ellipse cx="136" cy="138" rx="17" ry="12" fill="#fff"/>
    <path d="M113 124 L127 124 L120 133 Z" fill="#ec8fa0" stroke="#c96b7c" stroke-width="1.5" stroke-linejoin="round"/>
    <path class="cat-mouth" d="M120 133 V138 M120 138 Q113 145 107 140 M120 138 Q127 145 133 140" fill="none" stroke="#6b5e5e" stroke-width="2.6" stroke-linecap="round"/>
    <g class="cat-whiskers" stroke="#c9c4bd" stroke-width="2" stroke-linecap="round">
      <path d="M84 136 L40 128 M84 142 L38 146 M86 148 L46 162"/><path d="M156 136 L200 128 M156 142 L202 146 M154 148 L194 162"/>
    </g>

    <g class="cat-cap">
      <path d="M50 76 C52 30 92 14 122 14 C156 14 190 32 190 76 C168 64 146 60 120 60 C94 60 70 64 50 76 Z" fill="#141518"/>
      <path d="M186 64 C204 64 220 70 224 80 C212 82 198 78 186 74 Z" fill="#141518"/>
      <path d="M94 62 Q120 46 146 62" fill="none" stroke="#2b2d33" stroke-width="10"/>
      <path d="M100 58 Q120 50 140 58" fill="none" stroke="#0a0a0c" stroke-width="5"/>
      <rect x="112" y="47" width="16" height="11" rx="2" fill="none" stroke="#b8bcc4" stroke-width="2.6"/>
      <circle cx="121" cy="18" r="5" fill="#26282d"/>
    </g>

    <g class="cat-shades"><g transform="translate(47 95)">${shadesMarkup()}</g></g>
  </g>

</svg>`;
    const wrap = document.createElement('div');
    wrap.className = 'cat-wrap';
    wrap.innerHTML = svg;
    return wrap;
  }

  // 0..1 water level. The silhouette spans roughly y=12 (ear tips) to y=260.
  function setLevel(wrap, pct) {
    const p = Math.max(0, Math.min(1, pct));
    const y = 262 - p * 254;
    wrap.querySelectorAll('.cat-water').forEach((g) => { g.style.transform = `translateY(${y}px)`; });
  }

  function react(wrap, mood) {
    const svg = wrap.querySelector('svg');
    svg.classList.remove('cat--intro', 'cat--happy', 'cat--slurp', 'cat--party', 'cat--wiggle');
    void svg.getBoundingClientRect(); // restart the animation
    svg.classList.add('cat--' + mood);
  }

  window.BosMeow = { create, setLevel, react };
})();
