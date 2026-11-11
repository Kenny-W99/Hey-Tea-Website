"""Clear the Venice bike lane so the traveler skates on an open road.

The roller skater standing in the traveler's lane is removed. The asphalt
behind them is rebuilt row by row from clean pavement on both sides (the
palm shadows run across the lane, so each row continues its own shading),
then the lane markings are redrawn across the gap from straight-line fits
of the visible paint. Other people in the scene stay. The original plate is
kept in source-art so the script can be re-run.
"""
from pathlib import Path
import shutil
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
plate = root / 'public/art/la/1-scene.webp'
original = root / 'source-art/la-1-scene-original.webp'
if not original.exists():
    shutil.copy(plate, original)
im = np.array(Image.open(original).convert('RGB'))
H, W = im.shape[:2]
img = im.astype(np.float32)


def shapes(rects=(), ovals=()):
    m = np.zeros((H, W), np.uint8)
    for u0, v0, u1, v1 in rects:
        cv2.rectangle(m, (round(u0 * W), round(v0 * H)), (round(u1 * W), round(v1 * H)), 255, -1)
    for u0, v0, u1, v1 in ovals:
        cv2.ellipse(m, (round((u0 + u1) / 2 * W), round((v0 + v1) / 2 * H)),
                    (round((u1 - u0) / 2 * W), round((v1 - v0) / 2 * H)), 0, 0, 360, 255, -1)
    return m


r, g, b = img[..., 0], img[..., 1], img[..., 2]
yellow = (g - b > 35) & (r - b > 65) & (r > 170)
white = ((r + g + b) / 3 > 212) & (r - b < 38) & (g > 198)
paint = yellow | white
mean = (r + g + b) / 3
# Plain road: pale, low-saturation asphalt or concrete, sunlit or in shade.
plain = (mean > 110) & (mean < 240) & (img.max(axis=2) - img.min(axis=2) < 72) & ~paint

# The roller skater in the traveler's lane (between the yellow centre line
# and the right edge line), found by colour inside her box, plus the shadow
# she casts to the left.
box = shapes(rects=[(0.44, 0.544, 0.5, 0.737)]) > 0
# Skin matches the yellow paint colour, so only white paint is excluded here;
# the yellow line behind her is rebuilt afterwards.
person = box & ~plain & ~white
person = cv2.morphologyEx(np.uint8(person) * 255, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
contours, _ = cv2.findContours(person, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
person = np.zeros_like(person)
cv2.drawContours(person, contours, -1, 255, -1)
remove = cv2.dilate(person, np.ones((7, 7), np.uint8))
remove |= shapes(ovals=[(0.362, 0.713, 0.49, 0.744)])
remove[paint & ~box] = 0
fill = remove > 0
# Everyone who stays, and the couple's shadow, are never copied into the gap.
keep_out = shapes(
    rects=[(0.11, 0.53, 0.2, 0.75), (0.24, 0.54, 0.32, 0.74), (0.33, 0.51, 0.39, 0.69),
           (0.398, 0.495, 0.43, 0.61), (0.43, 0.49, 0.47, 0.545), (0.497, 0.5, 0.528, 0.62),
           (0.53, 0.49, 0.56, 0.58), (0.55, 0.54, 0.64, 0.76), (0.26, 0.5, 0.33, 0.62)],
    ovals=[(0.2, 0.7, 0.28, 0.745), (0.3, 0.655, 0.36, 0.69), (0.33, 0.655, 0.42, 0.695),
           (0.494, 0.727, 0.6, 0.756)],
) > 0
source = plain & ~keep_out & ~fill
# Other riders' shadows lie in the rows of her shadow; never copy them.
shade = (img[..., 2] > img[..., 0] - 5) | (img.mean(axis=2) < 178)
source[int(0.70 * H):int(0.76 * H)] &= ~shade[int(0.70 * H):int(0.76 * H)]
reach = round(0.085 * W)

# 1. Row fill: mirror plain road in from both sides and blend across, so
#    palm shadows crossing the lane continue through the gap.
out = img.copy()
unfilled = np.zeros((H, W), bool)
for y in np.unique(np.nonzero(fill)[0]):
    xs = np.nonzero(fill[y])[0]
    for run in np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1):
        a, z = run[0], run[-1]
        n = z - a + 1

        def gather(start, step):
            got, x = [], start
            while len(got) < n and 0 <= x < W and abs(x - start) < reach:
                if source[y, x]:
                    got.append(img[y, x])
                x += step
            return np.array(got)

        left, right = gather(a - 1, -1), gather(z + 1, +1)
        left = left if len(left) >= 3 else left[:0]
        right = right if len(right) >= 3 else right[:0]
        if not len(left) and not len(right):
            unfilled[y, a:z + 1] = True
            continue

        def tile(samples, i):
            # Ping-pong through short runs instead of stretching one pixel.
            k, m = i % (2 * len(samples)), len(samples)
            return samples[k if k < m else 2 * m - 1 - k]

        for i in range(n):
            t = (i + 0.5) / n
            lc = tile(left, i) if len(left) else None
            rc = tile(right, n - 1 - i) if len(right) else None
            out[y, a + i] = rc if lc is None else lc if rc is None else lc * (1 - t) + rc * t
if unfilled.any():
    patched = cv2.inpaint(np.clip(out, 0, 255).astype(np.uint8), np.uint8(unfilled) * 255, 5, cv2.INPAINT_TELEA)
    out[unfilled] = patched[unfilled]
smooth = cv2.GaussianBlur(out, (0, 0), sigmaX=0.7, sigmaY=1.6)
out[fill] = smooth[fill]
print('rows needing inpaint fallback:', int(unfilled.any(axis=1).sum()))


# 2. The double yellow line passes behind her hair and arm. Fit the band's
#    centre and width along the visible paint, then copy the nearest visible
#    cross-section (both stripes and the gap) into each hidden row.
def rebuild(mask, guide, search):
    gy = np.array([q[1] for q in guide]) * H
    gx = np.array([q[0] for q in guide]) * W
    rows = []
    for y in range(int(gy.min()), int(gy.max()) + 1):
        cx = np.interp(y, gy[::-1], gx[::-1]) if gy[0] > gy[-1] else np.interp(y, gy, gx)
        lo, hi = int(cx - search), int(cx + search)
        if fill[y, lo:hi].any():
            continue
        xs = np.nonzero(mask[y, lo:hi])[0]
        if len(xs) >= 2:
            rows.append((y, lo + xs.min(), lo + xs.max()))
    rows = np.array(rows, float)
    centre = np.polyfit(rows[:, 0], (rows[:, 1] + rows[:, 2]) / 2, 2)
    width = np.polyfit(rows[:, 0], rows[:, 2] - rows[:, 1] + 1, 1)
    soft = cv2.GaussianBlur(np.float32(mask), (0, 0), 0.6)
    for y in range(int(rows[:, 0].min()), int(rows[:, 0].max()) + 1):
        xc, wd = np.polyval(centre, y), np.polyval(width, y)
        span = range(int(xc - wd), int(xc + wd) + 2)
        if not any(0 <= x < W and fill[y, x] for x in span):
            continue
        ref = int(rows[np.argmin(np.abs(rows[:, 0] - y)), 0])
        rc, rw = np.polyval(centre, ref), np.polyval(width, ref)
        for x in span:
            if not (0 <= x < W and fill[y, x]):
                continue
            # Same relative position across the band in the reference row.
            sx = rc + (x - xc) * rw / wd
            x0 = int(np.floor(sx)); f = sx - x0
            a = soft[ref, x0] * (1 - f) + soft[ref, x0 + 1] * f
            colour = img[ref, x0] * (1 - f) + img[ref, x0 + 1] * f
            # Keep the local shading of the rebuilt asphalt under the paint.
            out[y, x] = out[y, x] * (1 - a) + colour * a


rebuild(yellow, [(0.5, 0.52), (0.477, 0.55), (0.445, 0.6), (0.4, 0.66), (0.378, 0.7), (0.36, 0.73), (0.345, 0.76)], round(0.016 * W))

# Feather the boundary so no seam shows.
alpha = cv2.GaussianBlur(np.float32(fill), (0, 0), 1.2)
alpha = np.maximum(alpha, np.float32(fill))[..., None]
result = img * (1 - alpha) + out * alpha
Image.fromarray(np.clip(result, 0, 255).astype(np.uint8)).save(plate, quality=92)
print('cleared', int(fill.sum()), 'pixels in', plate.relative_to(root))
