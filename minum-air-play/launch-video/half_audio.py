# Soundtrack for the launch video, synthesised in code (plus Meowie's own sounds from the app).
import numpy as np, subprocess, wave
SR = 44100; D = 10.05; N = int(SR * D)
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

BPM = 112; B = 60 / BPM
A3 = 220.0; note = lambda s: A3 * 2 ** (s / 12)
# A playful, slightly spooky groove in A minor: walking bass, kick and clap, a sneaky kalimba hook.
bassline = [0, 0, 3, 5, 7, 5, 3, 2]
hook = [12, -1, 15, 12, 19, -1, 17, 15, 12, -1, 10, 12, 15, -1, 12, -1]
bar = 0
while bar * 4 * B < D - .3:
    t0 = bar * 4 * B
    for beat in range(4):
        tb = t0 + beat * B
        if tb >= D - .3: break
        add(kick(), tb, .8 if bar > 0 or beat > 1 else .5)
        if beat % 2: add(clap(), tb, .4)
        add(hat(), tb + B / 2, .5, .2); add(hat(), tb + B * .75, .2, -.2)
        n = bassline[(bar * 4 + beat) % 8]
        add(bass(note(n - 12), B * .45), tb, .35); add(bass(note(n - 12), B * .4), tb + B / 2, .22)
    if bar > 0:
        for i, n in enumerate(hook):
            if n >= 0 and t0 + i * B / 4 < D - .4: add(pluck(note(n), .8), t0 + i * B / 4, .13, .15 if i % 2 else -.15)
    bar += 1
# Opening sting and Meowie's mew at the end.
for n in [12, 15, 19, 24]: add(pluck(note(n), 1.6, .6), 0.02, .12)
add(mp3('happy'), 0.3, .35)
add(mp3('mew'), D - 1.2, .75)
# Master: gentle glue and a soft limit; fade the very end.
out *= .9
fade = np.ones(N); fade[-int(.35 * SR):] = np.linspace(1, 0, int(.35 * SR)); out *= fade[:, None]
out = np.tanh(out * 1.1) * .9
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open('half.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('peak', float(np.abs(out).max()))
