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

BPM = 100; B = 60 / BPM
C4 = 261.63; note = lambda s: C4 * 2 ** (s / 12)
PRESS, RIP0, DROP, END = 3.3, 3.6, 4.65, 13.3
# Intro (0 - 3.3): an unhurried kalimba figure over a soft ticking hat.
intro = [12, 16, 19, 24, 19, 16, 14, 17, 21, 19, 16]
for i, n in enumerate(intro): add(pluck(note(n), 1.2, .7), .1 + i * B / 2, .15, -.2 + .1 * (i % 3))
for i in range(11): add(hat(), i * B / 2 + B / 4, .4)
# A paper slap for each piece that lands.
for t in [.3, .85, 1.3, 1.55, 2.1, 2.55, 4.75, 5.3, 6.1, 8.0, 8.35, 8.6, 10.0, 10.7, 12.05, 12.3, 12.65,
          END + .3, END + .45, END + .65, END + .95, END + 1.05]:
    add(slap(), t, .5, rng.uniform(-.3, .3))
add(click(), PRESS, .9)
add(riser(.35), PRESS - .05, .3)
add(rip(1.05), RIP0, .9, -.15); add(rip(.8), RIP0 + .12, .55, .25)
# The groove (4.65 - 13.3): kick, clap, hats, bass and a bouncy kalimba line.
melody = [24, -1, 26, 28, 31, -1, 28, -1, 26, -1, 24, 26, 28, -1, 31, 33]
chords = [(48, 52, 55), (45, 48, 52), (41, 45, 48), (43, 47, 50)]
bar = 0
while DROP + bar * 4 * B < END - .05:
    t0 = DROP + bar * 4 * B
    for beat in range(4):
        tb = t0 + beat * B
        if tb >= END: break
        add(kick(), tb, .85)
        if beat % 2: add(clap(), tb, .4)
        add(hat(), tb + B / 2, .55, .2); add(hat(), tb + B * .75, .22, -.2)
        root = chords[(bar * 2 + beat // 2) % 4][0] - 60
        add(bass(note(root - 12), B * .9), tb, .33)
    for i, n in enumerate(melody):
        if n >= 0 and t0 + i * B / 4 < END: add(pluck(note(n), .9), t0 + i * B / 4, .13, .15 if i % 2 else -.15)
    bar += 1
# Meowie's own sounds, on what he does in the footage.
add(mp3('drink'), 5.2, .5); add(mp3('splash'), 7.8, .45); add(mp3('happy'), 10.0, .45)
# End card: a bright chord as the sheet lands, a lift as the name appears, then his mew.
add(kick(), END, .8)
for n in [12, 16, 19, 24]: add(pluck(note(n), 1.8, .5), END, .14)
for n in [24, 28, 31, 36]: add(pluck(note(n), 1.5, .6), END + .65, .11)
add(mp3('mew'), END + .95, .8)
# Master: gentle glue and a soft limit; fade the very end.
out *= .9
fade = np.ones(N); fade[-int(.35 * SR):] = np.linspace(1, 0, int(.35 * SR)); out *= fade[:, None]
out = np.tanh(out * 1.1) * .9
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
with wave.open('sound.wav', 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('peak', float(np.abs(out).max()))
