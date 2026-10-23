// Minum Air sound: generated background music plus the switches for music and Meowie's sounds.
// The music is made live with Web Audio: a soft pad, a kalimba melody and a warm bass in
// C major pentatonic, looping an 8-bar C–Am–F–G progression with a touch of reverb.
// Browsers only allow audio after a tap, so nothing plays until unlock() runs from one.
(function () {
  const KEY = 'minum-air:sound';
  let prefs = { music: true, sfx: true };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {} };

  let ctx = null;
  let master = null;
  let musicBus = null;
  let verb = null;
  let timer = 0;
  let nextBar = 0;
  let bar = 0;
  let ducked = false;
  let hushed = false;

  const BPM = 84;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const MUSIC_VOL = .32;
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // C–Am–F–G, two bars each.
  const CHORDS = [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 57, 60], [43, 50, 55, 59]];
  const SCALE = [72, 74, 76, 79, 81, 84, 86, 88];
  // Melody steps per bar (index into SCALE, -1 = rest), eighth notes. Two phrases that answer each other.
  const MELODY = [
    [2, -1, 4, 3, 2, -1, 0, -1], [1, -1, 2, -1, 0, -1, -1, -1],
    [0, -1, 2, 4, 5, -1, 4, -1], [3, -1, 2, -1, 1, -1, -1, -1],
    [4, -1, 5, 4, 2, -1, 3, -1], [2, -1, 0, -1, 1, -1, -1, -1],
    [3, -1, 4, 5, 6, -1, 5, 4], [3, -1, 2, -1, 4, -1, -1, -1],
  ];

  function impulse(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  function setup() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(master);
    verb = ctx.createConvolver();
    verb.buffer = impulse(2.4);
    const wet = ctx.createGain();
    wet.gain.value = .35;
    verb.connect(wet);
    wet.connect(musicBus);
    return true;
  }

  function out(node, dry = 1, wet = .6) {
    const d = ctx.createGain();
    d.gain.value = dry;
    node.connect(d);
    d.connect(musicBus);
    const w = ctx.createGain();
    w.gain.value = wet;
    node.connect(w);
    w.connect(verb);
  }

  function pad(notes, t, dur) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.05, t + .9);
    g.gain.setValueAtTime(.05, t + dur - .8);
    g.gain.linearRampToValueAtTime(0, t + dur + .4);
    lp.connect(g);
    out(g, .8, .8);
    notes.slice(1).forEach((n) => [-6, 6].forEach((det) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = midi(n);
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + .5);
    }));
  }

  function bass(n, t) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = midi(n - 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.16, t + .03);
    g.gain.exponentialRampToValueAtTime(.001, t + BEAT * 1.8);
    o.connect(g);
    out(g, 1, .1);
    o.start(t);
    o.stop(t + BEAT * 2);
  }

  // Kalimba: a sine with a bright, quickly fading overtone.
  function pluck(n, t, vel = 1) {
    const f = midi(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.11 * vel, t + .005);
    g.gain.exponentialRampToValueAtTime(.001, t + 1.6);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g);
    const h = ctx.createOscillator();
    h.type = 'sine';
    h.frequency.value = f * 5.4;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(.03 * vel, t);
    hg.gain.exponentialRampToValueAtTime(.0005, t + .18);
    h.connect(hg);
    hg.connect(g);
    out(g, .9, .7);
    o.start(t); h.start(t);
    o.stop(t + 1.7); h.stop(t + .3);
  }

  // A soft shaker on the off-beats.
  let noiseBuf = null;
  function shaker(t) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .1, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(.025, t);
    g.gain.exponentialRampToValueAtTime(.001, t + .07);
    s.connect(hp); hp.connect(g);
    out(g, 1, .2);
    s.start(t);
  }

  function scheduleBar(t) {
    const ci = Math.floor(bar / 2) % CHORDS.length;
    const chord = CHORDS[ci];
    if (bar % 2 === 0) pad(chord, t, BAR * 2);
    bass(chord[0], t);
    bass(chord[0] + (bar % 2 ? 7 : 0), t + BEAT * 2);
    MELODY[bar % MELODY.length].forEach((step, i) => {
      if (step >= 0) pluck(SCALE[step], t + i * BEAT / 2, i % 2 ? .7 : 1);
    });
    for (let i = 0; i < 4; i++) shaker(t + i * BEAT + BEAT / 2);
    bar++;
  }

  function tick() {
    while (nextBar < ctx.currentTime + .6) {
      scheduleBar(nextBar);
      nextBar += BAR;
    }
  }

  function musicTarget() { return prefs.music && !hushed ? MUSIC_VOL * (ducked ? .35 : 1) : 0; }

  function startMusic() {
    if (!ctx || timer) return;
    nextBar = ctx.currentTime + .1;
    tick();
    timer = setInterval(tick, 200);
  }
  function stopMusic() {
    clearInterval(timer);
    timer = 0;
  }

  function apply() {
    if (!ctx) return;
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(musicTarget(), now + .6);
    if (prefs.music) startMusic();
    else setTimeout(() => { if (!prefs.music) stopMusic(); }, 700);
  }

  function unlock() {
    if (!prefs.music && !prefs.sfx) return;
    if (!setup()) return;
    if (ctx.state === 'suspended') ctx.resume();
    apply();
  }

  // Quiet everything while the app is in the background.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (prefs.music) ctx.resume();
  });
  // The first tap anywhere starts the music.
  // Try straight away: installed apps and often-visited sites are allowed to play sound without a
  // tap. Otherwise the first touch of any kind (tap, scroll, key) starts it; iOS counts touchend.
  setTimeout(unlock, 0);
  ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));

  window.MASound = {
    get music() { return prefs.music; },
    get sfx() { return prefs.sfx; },
    setMusic(on) { prefs.music = !!on; save(); if (on) unlock(); else apply(); },
    setSfx(on) {
      prefs.sfx = !!on;
      save();
      if (!on) document.querySelectorAll('video.mw-act').forEach((v) => { v.muted = true; });
    },
    // Lower the music while Meowie makes his own sounds.
    duck(on) { ducked = !!on; if (ctx && prefs.music) { const n = ctx.currentTime; musicBus.gain.cancelScheduledValues(n); musicBus.gain.setValueAtTime(musicBus.gain.value, n); musicBus.gain.linearRampToValueAtTime(musicTarget(), n + .3); } },
    // Silence the background music while something else (the opening film) has the stage.
    hush(on) { hushed = !!on; apply(); },
    unlock,
  };
})();
