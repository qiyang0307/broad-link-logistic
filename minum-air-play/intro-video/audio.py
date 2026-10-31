# Soundtrack for the launch video, synthesised in code (plus Meowie's own sounds from the app).
import numpy as np, subprocess, wave
SR = 44100; D = 15.0; N = int(SR * D)
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


def rustle(dur=.35):
    # Paper sliding: soft filtered noise that swells and fades.
    n = int(dur * SR); nz = rng.normal(0, 1, n); band = lp(nz - lp(nz, .12), .45)
    x = np.arange(n) / SR; e = np.sin(np.pi * np.clip(x / dur, 0, 1)) ** 1.5
    grit = 1 + .6 * lp((rng.random(n) < .02).astype(np.float32) * 3, .1)
    return band * e * grit * .9
def popsnd(f=700):
    n = int(.12 * SR); x = np.arange(n) / SR; fr = f * (1 + 1.2 * np.exp(-x * 40))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, .002, .04) * .8
def plink(f):
    n = int(.5 * SR); x = np.arange(n) / SR; fr = f * (1 + .5 * np.exp(-x * 30))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, .002, .12) * .7
def chime(f, dur=1.2):
    n = int(dur * SR); x = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * x) + .4 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 6)) * env(n, .003, .5)
def pad(notes, t0, dur, g=.06):
    n = int(dur * SR); x = np.arange(n) / SR; e = np.minimum(1, x / .6) * np.minimum(1, (dur - x) / .8)
    sig = sum(np.sin(2 * np.pi * note(m) * x) + .3 * np.sin(2 * np.pi * note(m) * 2 * x) for m in notes) / len(notes)
    add(lp(sig.astype(np.float32), .2) * e, t0, g)

BPM = 96; B = 60 / BPM
C4 = 261.63; note = lambda s: C4 * 2 ** (s / 12)
# Soft cheerful bed: pad chords, kalimba melody, light shaker; a gentle kick joins after the intro.
chords = [(0, 4, 7), (-3, 0, 4), (-7, -3, 0), (-5, -1, 2)]
for i in range(int(15 / (4 * B)) + 1):
    t0 = i * 4 * B
    if t0 < 15: pad([c + 12 for c in chords[i % 4]], t0, min(4 * B + .4, 15 - t0))
mel = [12, 16, 19, 16, 21, 19, 16, 14, 12, 14, 16, 19, 16, 14, 12, -1]
for i in range(int(15 / (B / 2))):
    t = .05 + i * B / 2
    m = mel[i % len(mel)]
    if m >= 0 and t < 14.6: add(pluck(note(m + 12), 1.0, .5), t, .085, .2 if i % 2 else -.2)
    if i % 2 and t < 14.8: add(hat(), t, .18)
for i in range(int(15 / B)):
    t = i * B
    if 3.0 <= t < 13.0 and i % 2 == 0: add(kick() * .5, t, .45)
    if 2.8 <= t < 13.0 and i % 2 == 1: add(bass(note(chords[(i // 4) % 4][0] - 12), B * .9), t, .18)
# Scene 1: pieces slide in, the cat peeks, decorations pop, the title lands, a mew.
for t in [.1, .2, .25, .35]: add(rustle(.45), t, .35, rng.uniform(-.5, .5))
add(rustle(.6), .9, .3)
for i, t in enumerate([1.1, 1.25, 1.4, 1.5, 1.6]): add(popsnd(620 + i * 90), t, .35, rng.uniform(-.4, .4))
add(slap() * .6, 1.6, .4); add(mp3('mew'), 1.85, .6)
# Paper sweeps between scenes.
for t in [2.65, 5.65, 9.65, 12.65]: add(rustle(.75), t, .5, rng.uniform(-.3, .3))
# Scene 2: glass pops in, droplets bounce, label, excited "!".
add(popsnd(500), 3.3, .45); add(slap() * .6, 3.5, .35)
for i, t in enumerate([3.7, 3.95, 4.2, 4.45]): add(plink(1100 + i * 180), t, .3, rng.uniform(-.5, .5))
add(mp3('happy'), 3.95, .35)
# Scene 3: bottle, label, droplets land one by one, a happy jump.
add(popsnd(480), 6.2, .45); add(slap() * .6, 6.4, .35)
for i in range(8): add(plink(note(12 + [0, 2, 4, 5, 7, 9, 11, 12][i] ) ), 6.6 + i * .3 + .5, .32, -.3 + .08 * i)
add(mp3('splash'), 9.0, .25); add(mp3('happy'), 9.05, .4)
# Scene 4: notification chime, the nudge, sparkles.
add(chime(note(19)), 10.4, .3); add(chime(note(24)), 10.55, .3)
add(rustle(.5), 11.4, .3)
for i, t in enumerate([11.5, 11.9, 12.1, 12.3, 12.5]): add(chime(note(24 + [0, 4, 7, 12, 7][i]), .8), t, .12, rng.uniform(-.5, .5))
add(mp3('purr'), 11.4, .25)
# Scene 5: logo letters pop, warm final chord, a last mew.
add(slap() * .6, 13.05, .4)
for i in range(6): add(popsnd(560 + i * 70), 13.15 + i * .07, .3, -.4 + .16 * i)
for m in [0, 4, 7, 12, 16]: add(pluck(note(m + 12), 2.0, .5), 13.1, .1)
add(slap() * .5, 13.75, .3); add(slap() * .5, 14.0, .3)
add(mp3('mew'), 14.25, .6)
# Master: gentle glue and a soft limit; fade the very end.
out *= .9
fade = np.ones(N); fade[-int(.35 * SR):] = np.linspace(1, 0, int(.35 * SR)); out *= fade[:, None]
out = np.tanh(out * 1.1) * .9
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open('meowie-intro.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('peak', float(np.abs(out).max()))
