# Pastel papers and Meowie sticker frames for the intro video (all in code).
import sys, numpy as np, cv2
from PIL import Image
sys.path.insert(0, '/tmp/claude-0/-home-user-broad-link-logistic/1b1ff10a-a152-5fa7-993d-cafc5e3dc6a4/scratchpad/lv')
OUT = '/tmp/claude-0/-home-user-broad-link-logistic/1b1ff10a-a152-5fa7-993d-cafc5e3dc6a4/scratchpad/mv/assets'
APP = '/home/user/broad-link-logistic/minum-air'
src = open('/tmp/claude-0/-home-user-broad-link-logistic/1b1ff10a-a152-5fa7-993d-cafc5e3dc6a4/scratchpad/lv/tex.py').read()
src = src[:src.index('W, H = 1080, 1920')]   # just the helpers (fbm, crumple, paper)
exec(src)
OUT = '/tmp/claude-0/-home-user-broad-link-logistic/1b1ff10a-a152-5fa7-993d-cafc5e3dc6a4/scratchpad/mv/assets'
Image.fromarray(paper(1920, 1080, (250, 244, 232), 11, strength=.3, grain=3)).save(f'{OUT}/bg-cream.jpg', quality=92)
for name, col, seed in [('blue', (168, 212, 245), 21), ('sky', (200, 230, 252), 22), ('pink', (250, 200, 214), 23), ('yellow', (253, 234, 160), 24), ('lavender', (214, 204, 245), 25), ('cream', (252, 247, 236), 26)]:
    Image.fromarray(paper(700, 700, col, seed, strength=.28, grain=3, stains=False)).save(f'{OUT}/p-{name}.jpg', quality=90)

# Meowie sticker frames, all cut to the same box so they line up when swapped (stop motion).
im = np.array(Image.open(f'{APP}/meowie-sit.webp').convert('RGBA'))
CW, CH = 484, 330
idx = [6, 14, 22, 30, 36, 38, 40, 46]
frames = [im[(i // 8) * CH:(i // 8 + 1) * CH, (i % 8) * CW:(i % 8 + 1) * CW] for i in idx]
frames = [cv2.resize(f, (CW * 2, CH * 2), interpolation=cv2.INTER_CUBIC) for f in frames]
B = 22
union = np.zeros(frames[0].shape[:2], bool)
for f in frames: union |= f[..., 3] > 40
ys, xs = np.where(union); y0, y1, x0, x1 = ys.min() - 3 * B, ys.max() + 3 * B, xs.min() - 3 * B, xs.max() + 3 * B
for k, f in zip(idx, frames):
    f = np.pad(f, ((3 * B, 3 * B), (3 * B, 3 * B), (0, 0)))[y0 + 3 * B:y1 + 3 * B, x0 + 3 * B:x1 + 3 * B]
    a = f[..., 3].astype(np.float32) / 255
    m = (a > .35).astype(np.uint8)
    rough = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * B + 1, 2 * B + 1)))
    cs, _ = cv2.findContours(rough, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); poly = np.zeros_like(m)
    for c in cs: cv2.fillPoly(poly, [cv2.approxPolyDP(c, 4, True)], 1)
    rgb = f[..., :3].astype(np.float32) / 255
    out = np.ones_like(rgb) * np.array([1, .99, .97]); out = out * (1 - a[..., None]) + rgb * a[..., None]
    alpha = np.maximum(poly.astype(np.float32), a)
    Image.fromarray((np.dstack([out, alpha]) * 255).astype(np.uint8), 'RGBA').save(f'{OUT}/cat-{k}.png')
print('ok', (x1 - x0, y1 - y0))
