# Paper textures and photocopied Meowie cut-outs for the launch video, all made in code.
import numpy as np, cv2
from PIL import Image
rng = np.random.default_rng(7)
OUT = '/tmp/claude-0/-home-user-broad-link-logistic/1b1ff10a-a152-5fa7-993d-cafc5e3dc6a4/scratchpad/lv/assets'
APP = '/home/user/broad-link-logistic/minum-air'

def fbm(h, w, octaves=6, base=4, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        n = base * 2 ** o
        g = r.standard_normal((n + 1, int(n * w / h) + 2)).astype(np.float32)
        out += amp * cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC); tot += amp; amp *= .5
    return out / tot

def crumple(h, w, seed, creases=110):
    # Height: soft lumps plus sharp crease ridges (like paper that was balled up and flattened).
    hgt = fbm(h, w, 6, 5, seed) * 9
    r = np.random.default_rng(seed + 1)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    for _ in range(creases):
        x0, y0 = r.uniform(0, w), r.uniform(0, h); a = r.uniform(0, np.pi)
        nx, ny = -np.sin(a), np.cos(a)
        d = (xx - x0) * nx + (yy - y0) * ny
        along = (xx - x0) * ny - (yy - y0) * nx
        L = r.uniform(.05, .32) * max(h, w)
        fade = np.clip(1 - np.abs(along) / L, 0, 1) ** .7
        hgt += r.uniform(.8, 2.2) * np.exp(-np.abs(d) / r.uniform(5, 22)) * fade * r.choice([-1, 1])
    gx = cv2.Sobel(hgt, cv2.CV_32F, 1, 0, ksize=5); gy = cv2.Sobel(hgt, cv2.CV_32F, 0, 1, ksize=5)
    n = np.dstack([-gx, -gy, np.full_like(gx, 18)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    light = np.array([-.5, -.65, .58]); light /= np.linalg.norm(light)
    shade = np.clip((n @ light), 0, 1)
    return shade

def paper(h, w, color, seed, strength=.55, grain=6, stains=True):
    sh = crumple(h, w, seed)
    sh = (sh - sh.mean()) / (sh.std() + 1e-6)
    base = np.array(color, np.float32)[None, None, :]
    img = base * (1 + strength * .12 * sh[..., None])
    if stains:
        st = fbm(h, w, 4, 2, seed + 9)
        img *= (1 - .05 * np.clip(st, 0, None)[..., None])
    img += rng.normal(0, grain, (h, w, 1))
    fib = cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), .8)
    img += fib[..., None] * 4
    return np.clip(img, 0, 255).astype(np.uint8)

W, H = 1080, 1920
Image.fromarray(paper(H, W, (236, 231, 219), 1)).save(f'{OUT}/paper.jpg', quality=92)
Image.fromarray(paper(H, W, (24, 120, 214), 2, strength=.9, grain=5)).save(f'{OUT}/paper-blue.jpg', quality=92)
Image.fromarray(paper(H, W, (245, 242, 234), 3, strength=.7)).save(f'{OUT}/paper-end.jpg', quality=92)
# Small tiles for labels (multiplied over coloured pieces).
Image.fromarray(paper(900, 900, (200, 200, 200), 4, strength=1.2, grain=8, stains=False)).save(f'{OUT}/crumple-tile.jpg', quality=90)

def photocopy(rgba, border=16, ink=(18, 18, 18)):
    a = rgba[..., 3].astype(np.float32) / 255
    g = cv2.cvtColor(rgba[..., :3], cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    # Copier look: punchy levels, crushed blacks, a little toner noise.
    g = np.clip((g - .28) / .55, 0, 1) ** 1.25
    g = g + rng.normal(0, .06, g.shape)
    g = cv2.GaussianBlur(g, (0, 0), .6)
    g = np.clip(g, 0, 1)
    g = np.round(g * 5) / 5 * .85 + g * .15
    rgb = np.dstack([ink[0] / 255 + (1 - ink[0] / 255) * g, ink[1] / 255 + (1 - ink[1] / 255) * g, ink[2] / 255 + (1 - ink[2] / 255) * g])
    # White sticker border cut a little roughly by scissors.
    pad = border * 2
    A = np.pad(a, pad); RGB = np.pad(rgb, ((pad, pad), (pad, pad), (0, 0)))
    m = (A > .4).astype(np.uint8)
    rough = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (border * 2 + 1, border * 2 + 1)))
    rough = cv2.GaussianBlur(rough.astype(np.float32), (0, 0), 3) > .5
    # Straightish scissor cuts: simplify the outline.
    cs, _ = cv2.findContours(rough.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    poly = np.zeros_like(m)
    for c in cs:
        ap = cv2.approxPolyDP(c, 3.5, True); cv2.fillPoly(poly, [ap], 1)
    out = np.ones(RGB.shape, np.float32) * np.array([.97, .96, .93])
    out = out * (1 - A[..., None]) + RGB * A[..., None]
    alpha = np.maximum(poly.astype(np.float32), A)
    res = np.dstack([out, alpha])
    ys, xs = np.where(alpha > 0); res = res[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return Image.fromarray((res * 255).astype(np.uint8), 'RGBA')

def frame(sheet, i, cw, ch, cols=8):
    im = np.array(Image.open(f'{APP}/{sheet}').convert('RGBA'))
    return im[(i // cols) * ch:(i // cols + 1) * ch, (i % cols) * cw:(i % cols + 1) * cw]

sit = frame('meowie-sit.webp', 6, 484, 330)
up = cv2.resize(sit, (sit.shape[1] * 2, sit.shape[0] * 2), interpolation=cv2.INTER_CUBIC)
photocopy(up, 18).save(f'{OUT}/meowie-sit-copy.png')
full = frame('meowie-fullc.webp', 20, 484, 330)
up = cv2.resize(full, (full.shape[1] * 2, full.shape[0] * 2), interpolation=cv2.INTER_CUBIC)
photocopy(up, 18).save(f'{OUT}/meowie-full-copy.png')
swim = frame('meowie-swim.webp', 3, 396, 330)
up = cv2.resize(swim, (swim.shape[1] * 2, swim.shape[0] * 2), interpolation=cv2.INTER_CUBIC)
photocopy(up, 18).save(f'{OUT}/meowie-swim-copy.png')
# Colour Meowie (sticker-cut) for the end card.
def sticker(rgba, border=18):
    a = rgba[..., 3].astype(np.float32) / 255; pad = border * 2
    A = np.pad(a, pad); RGB = np.pad(rgba[..., :3].astype(np.float32) / 255, ((pad, pad), (pad, pad), (0, 0)))
    m = (A > .4).astype(np.uint8)
    rough = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (border * 2 + 1,) * 2))
    cs, _ = cv2.findContours(rough, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); poly = np.zeros_like(m)
    for c in cs: cv2.fillPoly(poly, [cv2.approxPolyDP(c, 3.5, True)], 1)
    out = np.ones(RGB.shape, np.float32) * .98; out = out * (1 - A[..., None]) + RGB * A[..., None]
    alpha = np.maximum(poly.astype(np.float32), A); res = np.dstack([out, alpha])
    ys, xs = np.where(alpha > 0); res = res[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return Image.fromarray((res * 255).astype(np.uint8), 'RGBA')
sitc = frame('meowie-sit.webp', 36, 484, 330)
sticker(cv2.resize(sitc, (sitc.shape[1] * 2, sitc.shape[0] * 2), interpolation=cv2.INTER_CUBIC)).save(f'{OUT}/meowie-sit-color.png')
print('ok')
