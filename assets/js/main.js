/* Broad-link Logistics — page interactions
   Nav state, scroll progress, reveals, counters, word-by-word statement,
   scroll-driven corridor map, pinned horizontal fleet, parallax and form. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const isDesktop = () => window.innerWidth > 900;

  /* ---------- nav ---------- */
  const nav = $('[data-nav]');
  const toggle = $('[data-menu-toggle]');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  $$('[data-menu] a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- counters ---------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target, end = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
      const big = end > 1000, start = big ? end - 40 : 0;
      if (reduce) { el.textContent = end.toFixed(dec) + suf; return; }
      const t0 = performance.now(), dur = 1600;
      const step = now => {
        const k = clamp((now - t0) / dur), ease = 1 - Math.pow(1 - k, 4);
        el.textContent = (start + (end - start) * ease).toFixed(dec) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- word-by-word statement ---------- */
  const statement = $('[data-words]');
  let words = [];
  if (statement) {
    statement.innerHTML = statement.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
    words = $$('.w', statement);
  }

  /* ---------- corridor map ---------- */
  const corridor = $('[data-corridor]');
  const map = { ready: false };
  function smoothPath(pts, closed) {
    const n = pts.length, P = i => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    const segs = [];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      const seg = `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
      segs.push(`M${p1[0]} ${p1[1]} ${seg}`);
      d += ' ' + seg;
    }
    return { d: d + (closed ? ' Z' : ''), segs };
  }
  if (corridor) {
    const svg = $('[data-map]');
    const land = [[8, -20], [8, 0], [40, 58], [48, 80], [56, 118], [64, 152], [66, 190], [70, 215], [80, 258], [88, 300], [104, 342], [124, 380], [148, 436], [160, 462], [184, 498], [218, 530], [246, 546], [274, 566], [300, 590], [318, 604], [340, 600], [362, 600], [384, 606], [376, 580], [358, 540], [347, 507], [334, 470], [318, 420], [306, 372], [312, 330], [300, 272], [291, 218], [262, 180], [219, 138], [184, 110], [140, 64], [110, 40], [96, 20], [94, -20]];
    $('[data-land]', svg).setAttribute('d', smoothPath(land, true).d);

    const route = [[326, 621], [344, 598], [294, 560], [240, 520], [195, 478], [168, 440], [150, 400], [126, 290], [100, 250], [78, 212], [80, 160], [68, 100], [74, 52]];
    const sp = smoothPath(route, false);
    const base = $('[data-route-base]', svg), line = $('[data-route]', svg);
    base.setAttribute('d', sp.d); line.setAttribute('d', sp.d);
    const NS = 'http://www.w3.org/2000/svg';
    const cum = [0];
    sp.segs.forEach(sd => {
      const t = document.createElementNS(NS, 'path'); t.setAttribute('d', sd); svg.appendChild(t);
      cum.push(cum[cum.length - 1] + t.getTotalLength()); t.remove();
    });
    const total = line.getTotalLength();
    line.style.strokeDasharray = `${total} ${total}`;

    const nodes = [
      { i: 0, id: 'SIN', sub: 'Singapore', dx: -40, dy: 26 },
      { i: 1, id: 'JHB · HQ', sub: 'Johor Bahru', dx: 12, dy: -12, hq: true },
      { i: 5, id: 'KUL', sub: 'Kuala Lumpur · Port Klang', dx: 14, dy: 4 },
      { i: 9, id: 'PEN', sub: 'Penang · Prai', dx: 14, dy: 4 },
      { i: 11, id: 'BKH', sub: 'Bukit Kayu Hitam', dx: 14, dy: 4 },
    ];
    const g = $('[data-nodes]', svg);
    nodes.forEach(n => {
      const [x, y] = route[n.i];
      const el = document.createElementNS(NS, 'g');
      el.setAttribute('class', 'map__node');
      el.innerHTML = `<circle cx="${x}" cy="${y}" r="${n.hq ? 7 : 5.5}" ${n.hq ? 'class="hq"' : ''}/><text x="${x + n.dx}" y="${y + n.dy}">${n.id}</text><text class="sub" x="${x + n.dx}" y="${y + n.dy + 12}">${n.sub}</text>`;
      g.appendChild(el); n.el = el;
    });
    Object.assign(map, {
      ready: true, line, total, cum, nodes,
      truck: $('[data-truck]', svg), legs: $$('[data-legs] .leg'),
      legNodes: [[0, 1], [1, 5], [5, 9], [9, 11]],
      readLeg: $('[data-readout-leg]'), readKm: $('[data-readout-km]'),
      // approximate road distances per leg (km), for the readout only
      legKm: [[0, 30], [30, 360], [360, 720], [720, 880]],
      active: -1,
    });
  }
  function updateMap() {
    if (!map.ready) return;
    let p;
    if (isDesktop()) {
      const r = corridor.getBoundingClientRect();
      p = clamp(-r.top / (r.height - window.innerHeight));
    } else {
      const r = $('[data-map]').getBoundingClientRect();
      p = clamp((window.innerHeight * 0.85 - r.top) / (r.height + window.innerHeight * 0.3));
    }
    const legs = map.legNodes.length;
    const k = Math.min(legs - 1, Math.floor(p * legs));
    const lp = clamp(p * legs - k);
    const [a, b] = map.legNodes[k];
    const len = map.cum[a] + (map.cum[b] - map.cum[a]) * lp;
    map.line.style.strokeDashoffset = map.total - len;
    const pt = map.line.getPointAtLength(Math.max(0.01, len));
    map.truck.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    map.nodes.forEach(n => n.el.classList.toggle('is-on', map.cum[n.i] <= len + 0.5));
    if (k !== map.active) {
      map.active = k;
      map.legs.forEach((el, i) => el.classList.toggle('is-active', i === k));
      map.readLeg.textContent = 'Leg 0' + (k + 1);
    }
    const [k0, k1] = map.legKm[k];
    map.readKm.textContent = `≈ ${Math.round(k0 + (k1 - k0) * lp)} km`;
  }

  /* ---------- fleet horizontal ---------- */
  const fleet = $('[data-fleet]');
  const track = $('[data-fleet-track]');
  const fleetBar = $('[data-fleet-bar]'), fleetIdx = $('[data-fleet-index]');
  let fleetDist = 0;
  function sizeFleet() {
    if (!fleet) return;
    if (!isDesktop() || reduce) { fleet.style.height = ''; track.style.transform = ''; fleetDist = 0; return; }
    fleetDist = Math.max(0, track.scrollWidth - window.innerWidth);
    fleet.style.height = (window.innerHeight + fleetDist) + 'px';
  }
  function updateFleet() {
    if (!fleetDist) return;
    const r = fleet.getBoundingClientRect();
    const p = clamp(-r.top / fleetDist);
    track.style.transform = `translate3d(${-p * fleetDist}px,0,0)`;
    const n = track.children.length;
    fleetBar.style.transform = `scaleX(${(1 + p * (n - 1)) / n})`;
    fleetIdx.textContent = String(Math.min(n, 1 + Math.round(p * (n - 1)))).padStart(2, '0');
  }

  /* ---------- parallax ---------- */
  const parallax = $$('[data-parallax]');
  function updateParallax() {
    if (reduce) return;
    const vh = window.innerHeight;
    parallax.forEach(el => {
      const wrap = el.closest('[data-parallax-wrap]') || el.parentElement;
      const r = wrap.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
      el.style.transform = el.classList.contains('intro__banner-art')
        ? `translate3d(-50%, ${off}px, 0)` : `translate3d(0, ${off}px, 0)`;
    });
  }

  /* ---------- scroll loop ---------- */
  const bar = $('.progress span');
  const heroContent = $('[data-hero-content]');
  const steps = $('[data-steps]');
  const sections = $$('main section[id]');
  const navLinks = $$('.nav__links a');
  let lastY = window.scrollY, ticking = false;

  function onScroll() {
    const y = window.scrollY, vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    nav.classList.toggle('is-scrolled', y > 40);
    if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > lastY && y > vh * 0.9);
    lastY = y;

    if (!reduce && heroContent) {
      const p = clamp(y / vh);
      heroContent.style.transform = `translate3d(0, ${p * -90}px, 0)`;
      heroContent.style.opacity = String(1 - p * 1.3);
    }

    if (words.length) {
      const r = statement.getBoundingClientRect();
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      const on = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < on));
    }

    if (steps) {
      const r = steps.getBoundingClientRect();
      steps.style.setProperty('--steps-p', clamp((vh * 0.8 - r.top) / (vh * 0.5)).toFixed(3));
    }

    let current = '';
    sections.forEach(s => { if (s.getBoundingClientRect().top < vh * 0.4) current = s.id; });
    navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + current));

    updateMap();
    updateFleet();
    updateParallax();
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', () => { sizeFleet(); onScroll(); });
  window.addEventListener('load', () => { sizeFleet(); onScroll(); });
  sizeFleet(); onScroll();

  /* ---------- project filters ---------- */
  const filters = $$('[data-filters] button');
  filters.forEach(btn => btn.addEventListener('click', () => {
    filters.forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-selected', String(b === btn)); });
    const f = btn.dataset.filter;
    $$('[data-cases] .case').forEach(c => {
      const show = f === 'all' || c.dataset.cat === f;
      c.classList.toggle('is-hidden', !show);
      if (show) c.classList.add('is-in');
    });
  }));

  /* ---------- quote form ---------- */
  const form = $('[data-quote]');
  if (form) {
    const err = $('[data-quote-error]'), ok = $('[data-quote-ok]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const d = new FormData(form);
      if (!String(d.get('name') || '').trim()) { err.hidden = false; ok.hidden = true; form.elements.name.focus(); return; }
      err.hidden = true;
      const lines = [
        'Quotation request — Broad-Link Logistics',
        `From: ${d.get('origin')}`,
        `To: ${d.get('destination')}`,
        `Cargo / service: ${d.get('vehicle')}`,
        d.get('weight') ? `Est. weight: ${d.get('weight')} MT` : '',
        d.get('date') ? `Target date: ${d.get('date')}` : '',
        `Customs forwarding: ${d.get('customs') ? 'Yes' : 'No'}`,
        `Name / company: ${d.get('name')}`,
        d.get('notes') ? `Notes: ${d.get('notes')}` : '',
      ].filter(Boolean).join('\n');
      let copied = false;
      try { await navigator.clipboard.writeText(lines); copied = true; } catch (_) { /* clipboard unavailable */ }
      ok.hidden = false;
      ok.textContent = copied
        ? 'Your enquiry is copied. Paste it into the Messenger chat that just opened, or call us on 07-332 9889.'
        : 'Messenger is opening. Please include your shipment details there, or call us on 07-332 9889.';
      window.open('https://m.me/broadlinkjb', '_blank', 'noopener');
    });
  }

  const yr = $('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
