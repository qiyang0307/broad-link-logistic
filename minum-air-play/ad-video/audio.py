# Soundtrack for the launch video, synthesised in code (plus Meowie's own sounds from the app).
import numpy as np, subprocess, wave
SR = 44100; D = 25.0; N = int(SR * D)
out = np.zeros((N, 2), np.float32)
rng = np.random.default_rng(3)
def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR); sig = sig[:max(0, N - i)]
    if sig.ndim == 1: sig = np.stack([sig * (1 - pan) ** .5, sig * (1 + pan) ** .5], 1) / 1.41
    out[i:i + len(sig)] += sig * gain
def env(n, a, d): x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def lp(x, k): # one-pole low-pass, k in 0..1
    y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s += k * (x[i] - s); y[i] = s
    return y
def kick(): n = int(.35 * SR); x = np.arange(n) / SR; f = 50 + 110 * np.exp(-x * 28); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .16)
def clap():
    n = int(.25 * SR); nz = rng.normal(0, 1, n); e = np.zeros(n)
    for k in range(3): e[int(k * .011 * SR):] += env(n - int(k * .011 * SR), .001, .012 if k < 2 else .09)
    return (nz - lp(nz, .25)) * e * .7
def hat(): n = int(.06 * SR); nz = rng.normal(0, 1, n); return (nz - lp(nz, .6)) * env(n, .001, .015) * .35
def pluck(f, dur=1.2, bright=1.0):
    n = int(dur * SR); x = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * x) + .3 * bright * np.sin(2 * np.pi * f * 5.4 * x) * np.exp(-x * 25)) * env(n, .004, .45)
def bass(f, dur): n = int(dur * SR); x = np.arange(n) / SR; s = np.sin(2 * np.pi * f * x) + .3 * np.sin(4 * np.pi * f * x); return s * env(n, .01, dur * .6)
def slap():
    # Paper slapped onto the desk: a short, dull burst with a crinkle.
    n = int(.12 * SR); nz = rng.normal(0, 1, n)
    body = lp(nz, .08) * env(n, .001, .03) * 3
    crk = (nz - lp(nz, .5)) * env(n, .001, .012) * .5
    thump = np.sin(2 * np.pi * 90 * np.arange(n) / SR) * env(n, .001, .04) * .6
    return body + crk + thump
def click():
    n = int(.08 * SR); x = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1800 * x) * env(n, .0005, .006) + np.sin(2 * np.pi * 220 * x) * env(n, .001, .03) * .8 + rng.normal(0, 1, n) * env(n, .0005, .004) * .4)
def rip(dur=.75):
    # Tearing paper: crackling noise in bursts that speed up.
    n = int(dur * SR); nz = rng.normal(0, 1, n); band = nz - lp(nz, .35); band = lp(band, .55)
    x = np.arange(n) / SR; am = np.zeros(n); t = 0.0
    while t < dur:
        i = int(t * SR); L = int(rng.uniform(.004, .02) * SR); am[i:i + L] += rng.uniform(.4, 1.0); t += rng.uniform(.004, .028)
    am = lp(am, .05) * (np.minimum(1, x / .05)) * np.exp(-np.maximum(0, x - dur * .7) * 12)
    return band * am * 2.2
def riser(dur):
    n = int(dur * SR); x = np.arange(n) / SR; nz = rng.normal(0, 1, n); s = np.zeros(n); st = 0.0
    k = .02 + .5 * (x / dur) ** 2
    for i in range(n): st += k[i] * (nz[i] - st); s[i] = st
    return s * (x / dur) ** 1.5 * .9
def mp3(name):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'assets/snd-{name}.mp3', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


BPM = 120; B = .5
A3 = 220.0; note = lambda s: A3 * 2 ** (s / 12)
def saw(f, n):
    x = np.arange(n) / SR; ph = (x * f) % 1; return 2 * ph - 1
def stab(chord, t, dur=.42, g=.13, cut=.18):
    n = int(dur * SR); sig = np.zeros(n, np.float32)
    for m in chord:
        for d in (-.08, 0, .08): sig += saw(note(m) * 2 ** (d / 12), n)
    sig = lp(sig / (len(chord) * 3), cut) * env(n, .004, dur * .35)
    add(sig, t, g, 0)
def chordpad(chord, t, dur, g=.05, cut=.04):
    n = int(dur * SR); sig = np.zeros(n, np.float32); x = np.arange(n) / SR
    for m in chord:
        for d in (-.12, .12): sig += saw(note(m) * 2 ** (d / 12), n)
    e = np.minimum(1, x / .4) * np.minimum(1, (dur - x) / .5)
    add(lp(sig / (len(chord) * 2), cut) * e, t, g)
def sub(f, t, dur, g=.4):
    n = int(dur * SR); x = np.arange(n) / SR; add(np.sin(2 * np.pi * f * x) * env(n, .005, dur * .7), t, g)
def impact(t, g=1.0):
    n = int(1.6 * SR); x = np.arange(n) / SR; f = 38 + 90 * np.exp(-x * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 2.2)
    nz = rng.normal(0, 1, n); air = lp(nz, .08) * np.exp(-x * 4) * .5
    add((boom + air).astype(np.float32), t, g * .8)
def whoosh(t, dur=.6, g=.4):
    add(riser(dur), t - dur, g)
def ding(f, t, g=.25):
    n = int(1.2 * SR); x = np.arange(n) / SR
    add((np.sin(2 * np.pi * f * x) + .5 * np.sin(2 * np.pi * f * 2 * x) * np.exp(-x * 5)) * env(n, .002, .4), t, g)

prog = [(0, 3, 7, 12), (-4, 0, 3, 8), (-9, -5, 0, 3), (-2, 2, 5, 10)]   # Am F C G (relative to A3)
bar = lambda i: prog[i % 4]
# 0 - 3.5: cold open. A filtered pad, a ticking clock, a rising sweep into the first hit; splash on the dive.
chordpad(bar(0), 0, 2, .06); chordpad(bar(1), 2, 1.6, .06)
for i in range(7): add(hat(), .25 + i * B, .25 + .05 * i)
whoosh(3.5, 1.4, .45); add(mp3('splash'), 2.3, .45)
# 3.5 - 5.5: the pet. Kick in, plucky arp, purr.
for i in range(4):
    t = 3.5 + i * B; add(kick(), t, .7); add(hat(), t + B / 2, .35)
arp = [12, 15, 19, 24, 19, 15, 12, 15]
for i in range(8): add(pluck(note(arp[i] + (bar(1)[0])), .5, .9), 3.5 + i * B / 2, .1, -.2 + .05 * i)
add(mp3('purr'), 3.7, .25); add(mp3('happy'), 4.6, .3)
# 5.5 - 9: the drop. Full beat: kick, clap, hats, sub, stabs; slider whoosh.
impact(5.5, .9); whoosh(5.5, .5, .3)
for i in range(7):
    t = 5.5 + i * B; c = bar(i // 2)
    add(kick(), t, .9); add(hat(), t + B / 2, .45, .2); add(hat(), t + B * .75, .2, -.2)
    if i % 2: add(clap(), t, .5)
    sub(note(c[0] - 12), t, B * .95, .35)
    stab(c, t + B / 2, .3, .1)
add(mp3('drink'), 6.6, .35)
# 9 - 12: "Any drink" — a stab and a pour on every cut.
for k in range(6):
    t = 9 + k * B; c = bar(k)
    add(kick(), t, .9); stab(c, t, .4, .14, .25); add(hat(), t + B / 2, .45)
    if k % 2: add(clap(), t, .5)
    sub(note(c[0] - 12), t, B * .95, .35)
for k in range(6): ding(note(24 + [0, 3, 7, 12, 7, 3][k]), 9 + k * B + .02, .08)
# 12 - 15: the swim. Half-time and dreamy: pad, big sub, soft claps, bubbles.
impact(12, .6); chordpad(bar(2), 12, 1.6, .07, .06); chordpad(bar(3), 13.5, 1.6, .07, .06)
for i in range(6):
    t = 12 + i * B
    if i % 2 == 0: add(kick(), t, .7)
    if i % 4 == 2: add(clap(), t, .4)
    add(hat(), t + B / 2, .25)
for i, t in enumerate([12.4, 12.9, 13.6, 14.2]): ding(note(31 + i * 2), t, .06)
add(mp3('splash'), 12.05, .3)
# 15 - 18: the UI. Minimal tick, the click, the notification.
for i in range(6): add(hat(), 15 + i * B + B / 2, .3); add(kick() * .6, 15 + i * B, .5) if i % 2 == 0 else None
add(click(), 16.2, .8); ding(note(27), 16.7, .22); ding(note(31), 16.82, .22)
chordpad(bar(0), 15, 3, .05)
whoosh(18, 1.0, .4)
# 18 - 21.5: the line-up. Biggest section.
impact(18, 1.0)
for i in range(7):
    t = 18 + i * B; c = bar(i // 2)
    add(kick(), t, 1.0); add(hat(), t + B / 2, .5, .2); add(hat(), t + B / 4, .2, -.2)
    if i % 2: add(clap(), t, .6)
    sub(note(c[0] - 12), t, B * .95, .4)
    stab(c, t, .25, .11, .3); stab(c, t + B * .75, .2, .07, .3)
add(mp3('happy'), 18.6, .45)
whoosh(21.5, .8, .4)
# 21.5 - 25: the end card. One big hit, a ringing chord, Meowie's mew.
impact(21.5, 1.1)
chordpad(bar(0), 21.5, 3.4, .09, .07)
for m in [12, 15, 19, 24, 27]: add(pluck(note(m), 2.6, .5), 21.5, .1)
add(mp3('mew'), 22.4, .6)
# Master: gentle glue and a soft limit; fade the very end.
out *= .9
fade = np.ones(N); fade[-int(.35 * SR):] = np.linspace(1, 0, int(.35 * SR)); out *= fade[:, None]
out = np.tanh(out * 1.1) * .9
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open('ad.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('peak', float(np.abs(out).max()))
