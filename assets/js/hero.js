/* Hero background — "Corridor Drive"
   A perspective highway rendered on canvas: moving lane dashes, a technical
   ground grid, oncoming/outgoing light trails and an animated route network
   in the sky. Scrolling drives the camera forward and lifts the horizon. */
(function () {
  const canvas = document.querySelector('[data-hero-canvas]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.closest('[data-hero]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, h = 0, dpr = 1;
  let travel = 0, last = performance.now();
  let running = !reduce, visible = true;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  const DMAX = 70, DMIN = 0.55;

  const cities = [
    { id: 'SIN', name: 'Singapore', x: 0.68, y: 0.46 },
    { id: 'JHB', name: 'Johor Bahru', x: 0.74, y: 0.30, hq: true },
    { id: 'MLK', name: 'Melaka', x: 0.80, y: 0.44 },
    { id: 'KUL', name: 'Kuala Lumpur', x: 0.86, y: 0.20 },
    { id: 'IPH', name: 'Ipoh', x: 0.91, y: 0.38 },
    { id: 'PEN', name: 'Penang', x: 0.96, y: 0.12 },
  ];
  const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [1, 3], [0, 2]];
  const pulses = links.map((l, i) => ({ link: i, t: Math.random(), speed: 0.07 + Math.random() * 0.08 }));

  // Highway: 3 lanes each way. x < 0 oncoming (toward viewer), x > 0 outgoing.
  const laneCenters = [-3.5, -2.5, -1.5, 1.5, 2.5, 3.5];
  const trails = [];
  function spawn(t, fresh) {
    const lane = laneCenters[(Math.random() * laneCenters.length) | 0];
    t.x = lane + (Math.random() - 0.5) * 0.25;
    t.toward = lane < 0;
    t.speed = (t.toward ? 9 : 6) + Math.random() * 6;
    t.len = 1.6 + Math.random() * 2.6;
    t.heavy = Math.random() < 0.28;
    t.d = fresh ? DMIN + Math.random() * (DMAX - DMIN) : (t.toward ? DMAX : DMIN + 0.2);
    return t;
  }
  for (let i = 0; i < 90; i++) trails.push(spawn({}, true));

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!running) draw(0);
  }

  function heroProgress() {
    const r = hero.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / (r.height || 1)));
  }

  function draw(dt) {
    const p = heroProgress();
    const narrow = w < 700;
    mouse.sx += (mouse.x - mouse.sx) * 0.05;
    mouse.sy += (mouse.y - mouse.sy) * 0.05;

    const hy = h * (narrow ? 0.62 : 0.56) - p * h * 0.18 + mouse.sy * 10;
    const vx = w * (narrow ? 0.5 : 0.64) + mouse.sx * 50;
    const f = (h - hy) * 1.05;
    const speed = 1 + p * 4.5;
    travel += dt * 7 * speed;

    const P = (x, d) => [vx + (x * f) / d, hy + f / d];

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, '#f7fbff'); sky.addColorStop(1, '#dbecfa');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hy + 1);
    // ground
    const g = ctx.createLinearGradient(0, hy, 0, h);
    g.addColorStop(0, '#cfe5f8'); g.addColorStop(0.45, '#94c6f0'); g.addColorStop(1, '#4a9ce4');
    ctx.fillStyle = g; ctx.fillRect(0, hy, w, h - hy);

    // horizon glow
    const glow = ctx.createRadialGradient(vx, hy, 0, vx, hy, Math.max(w, h) * 0.55);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.18, 'rgba(214,236,252,0.5)');
    glow.addColorStop(1, 'rgba(214,236,252,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

    drawNetwork(hy, p, dt);

    ctx.lineCap = 'round';
    // ground grid — longitudinal
    const gridXs = [-40, -28, -20, -14, -10, -7, 7, 10, 14, 20, 28, 40];
    ctx.strokeStyle = 'rgba(26,115,194,0.16)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const x of gridXs) {
      const a = P(x, DMAX), b = P(x, 0.3);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    // ground grid — transverse, scrolling toward viewer
    const spacing = 4, off = travel % spacing;
    for (let d = DMAX - off; d > 0.35; d -= spacing) {
      const y = hy + f / d;
      const a = Math.min(0.22, 0.6 / d + 0.03) * (1 - d / DMAX);
      ctx.strokeStyle = `rgba(26,115,194,${a})`;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // road surface
    const r1 = P(-4.6, DMAX), r2 = P(4.6, DMAX), r3 = P(4.6, 0.3), r4 = P(-4.6, 0.3);
    const rg = ctx.createLinearGradient(0, hy, 0, h);
    rg.addColorStop(0, 'rgba(10,34,56,0.18)'); rg.addColorStop(1, 'rgba(10,34,56,0.5)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.moveTo(r1[0], r1[1]); ctx.lineTo(r2[0], r2[1]); ctx.lineTo(r3[0], r3[1]); ctx.lineTo(r4[0], r4[1]); ctx.closePath(); ctx.fill();

    // edges and median
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    for (const x of [-4.6, 4.6, -0.35, 0.35]) {
      const a = P(x, DMAX), b = P(x, 0.3);
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // lane dashes
    const dashGap = 5, dashLen = 2.2, doff = travel % dashGap;
    for (const x of [-3, -2, 2, 3]) {
      for (let d = DMAX - doff; d > DMIN; d -= dashGap) {
        const d2 = Math.max(DMIN, d - dashLen);
        const a = P(x, d), b = P(x, d2);
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.9, 1.2 - d / DMAX)})`;
        ctx.lineWidth = Math.max(0.6, 6 / d);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }

    // light trails
    for (const t of trails) {
      const v = t.speed * speed * dt;
      t.d += t.toward ? -v : v;
      if (t.d < DMIN || t.d > DMAX) spawn(t, false);
      const near = t.toward ? t.d : t.d;
      const far = Math.min(DMAX, near + t.len * (1 + p * 2));
      const a = P(t.x, far), b = P(t.x, Math.max(DMIN, near));
      const fade = Math.min(1, (DMAX - t.d) / 12);
      const width = Math.max(1, (t.heavy ? 20 : 13) / near);
      const grad = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
      if (t.toward) {
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, `rgba(255,255,255,${0.95 * fade})`);
      } else {
        grad.addColorStop(0, `rgba(12,79,150,${0.95 * fade})`);
        grad.addColorStop(1, 'rgba(108,192,255,0)');
      }
      ctx.strokeStyle = grad; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      if (t.toward && near < 12) {
        ctx.fillStyle = `rgba(255,255,255,${0.35 * fade})`;
        ctx.beginPath(); ctx.arc(b[0], b[1], width * 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }

    // horizon line
    ctx.strokeStyle = 'rgba(26,115,194,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(w, hy); ctx.stroke();
  }

  function drawNetwork(hy, p, dt) {
    const narrow = w < 700;
    const top = h * (narrow ? 0.08 : 0.14) - p * h * 0.25;
    const band = Math.max(40, (hy - top) * (narrow ? 0.35 : 0.55));
    const pos = cities.map(c => {
      const x = narrow ? w * (0.1 + (c.x - 0.68) * 2.8) : w * c.x;
      return [x + mouse.sx * 18, top + c.y * band + mouse.sy * 8];
    });

    ctx.lineWidth = 1;
    for (let i = 0; i < links.length; i++) {
      const [a, b] = links[i];
      const A = pos[a], B = pos[b];
      const mx = (A[0] + B[0]) / 2, my = Math.min(A[1], B[1]) - 26;
      ctx.strokeStyle = 'rgba(26,115,194,0.28)';
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(mx, my, B[0], B[1]); ctx.stroke();
      ctx.setLineDash([]);
      const pl = pulses[i];
      pl.t = (pl.t + dt * pl.speed * (1 + p * 3)) % 1;
      const t = pl.t, u = 1 - t;
      const px = u * u * A[0] + 2 * u * t * mx + t * t * B[0];
      const py = u * u * A[1] + 2 * u * t * my + t * t * B[1];
      ctx.fillStyle = 'rgba(26,115,194,0.9)';
      ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(58,155,230,0.18)';
      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = '600 10px "IBM Plex Mono", monospace';
    ctx.textBaseline = 'middle';
    const now = performance.now() / 1000;
    cities.forEach((c, i) => {
      const [x, y] = pos[i];
      if (c.hq) {
        const r = 6 + ((now * 0.8) % 1) * 16;
        ctx.strokeStyle = `rgba(26,115,194,${1 - ((now * 0.8) % 1)})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = c.hq ? '#0a2238' : '#ffffff';
      ctx.strokeStyle = '#1a73c2'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, c.hq ? 4.5 : 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(10,34,56,0.78)';
      ctx.fillText(c.hq ? c.id + ' · HQ' : c.id, x + 9, y - 1);
    });
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (running && visible) draw(dt);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', e => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener('scroll', () => { if (!running && visible) draw(0); }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  const btn = document.querySelector('[data-hero-pause]');
  if (btn) {
    const label = btn.querySelector('[data-pause-label]');
    const sync = () => { btn.setAttribute('aria-pressed', String(!running)); label.textContent = running ? 'Pause motion' : 'Play motion'; };
    btn.addEventListener('click', () => { running = !running; last = performance.now(); sync(); });
    sync();
  }

  resize();
  draw(0);
  requestAnimationFrame(frame);
})();
