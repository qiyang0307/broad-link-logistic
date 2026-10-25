# Soundtrack for the launch video, synthesised in code (plus Meowie's own sounds from the app).
import numpy as np, subprocess, wave
SR = 44100; D = 10.0; N = int(SR * D)
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

BPM = 120; B = 60 / BPM
C4 = 261.63; note = lambda s: C4 * 2 ** (s / 12)
# Intro (0 - 2.3): a light kalimba figure and a ticking hat.
for i, s in enumerate([12, 16, 19, 24, 19, 16, 12, 16]): add(pluck(note(s), 1.0, .8), .05 + i * B / 2, .16, -.2 + .1 * (i % 3))
for i in range(8): add(hat(), i * B / 2 + B / 4, .5)
# Paper slaps on every piece that lands.
for t in [.12, .32, .45, .6, 1.0, 1.25, 3.2, 3.5, 4.05, 4.8, 5.05, 5.2, 6.0, 6.3, 7.2, 7.4, 7.7, 8.4, 8.55, 8.7, 8.85, 9.15, 9.3]:
    add(slap(), t, .55, rng.uniform(-.3, .3))
add(click(), 1.97, .9)
add(riser(.4), 1.98, .35)
add(rip(.8), 2.35, .9, -.15); add(rip(.6), 2.45, .6, .25)
# The drop (3.1 - 8.4): kick, clap, hats, bass and a bouncy kalimba line.
start = 3.0
melody = [24, -1, 26, 28, 31, -1, 28, -1, 26, -1, 24, 26, 28, -1, 31, 33]
chords = [(48, 52, 55), (45, 48, 52), (41, 45, 48), (43, 47, 50)]
for bar in range(3):
    t0 = start + bar * 4 * B
    for beat in range(4):
        tb = t0 + beat * B
        add(kick(), tb, .9)
        if beat % 2: add(clap(), tb, .45)
        add(hat(), tb + B / 2, .6, .2); add(hat(), tb + B * .75, .25, -.2)
        root = chords[(bar * 2 + beat // 2) % 4][0] - 60
        add(bass(note(root - 12), B * .9), tb, .35)
    for i, s in enumerate(melody):
        if s >= 0: add(pluck(note(s), .8), t0 + i * B / 4, .14, .15 if i % 2 else -.15)
# Meowie's own sounds.
add(mp3('drink'), 3.65, .55); add(mp3('splash'), 4.75, .45); add(mp3('happy'), 5.95, .5)
# End card: a bright final chord and Meowie's mew.
for s in [12, 16, 19, 24]: add(pluck(note(s), 1.6, .5), 8.4, .15)
add(kick(), 8.4, .8)
for s in [24, 28, 31, 36]: add(pluck(note(s), 1.4, .6), 9.0, .12)
add(mp3('mew'), 9.15, .8)
# Master: gentle glue and a soft limit; fade the very end.
out *= .9
fade = np.ones(N); fade[-int(.25 * SR):] = np.linspace(1, 0, int(.25 * SR)); out *= fade[:, None]
out = np.tanh(out * 1.1) * .9
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open('sound.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('peak', float(np.abs(out).max()))
