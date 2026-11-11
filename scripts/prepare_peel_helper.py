"""Build the continuous peeling helper from the original campaign art.

The orange page (p17-05) supplies the pulling and cheering mascot. Its open
line style leaves the front foot under the peel, so a short closing stroke
finishes that outline. Each fruit's whole and peeled photos are registered on
one canvas so the skin can be revealed progressively in the browser.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
out = root / 'public/art/fruit'
manifest_path = root / 'public/art/manifest.json'
manifest = json.loads(manifest_path.read_text())


def record(path, source, size, purpose, processing):
    manifest[:] = [r for r in manifest if r['path'] != path]
    manifest.append(dict(path=path, source=source, page=int(source[1:3]),
        size=size, purpose=purpose, processing=processing,
        optimization='WebP with alpha', qualityStatus='Browser visual review'))


def figure(name, box, close, seals=()):
    pil = Image.open(root / 'source-art/p17-05.png').convert('RGB').crop(box)
    im = np.array(pil).astype(np.int16)
    gray = im.mean(axis=2)
    sat = im.max(axis=2) - im.min(axis=2)
    ink = np.uint8(gray < 120) * 255
    rgb = im.astype(np.uint8).copy()
    for path in seals:
        pts = np.int32([(x - box[0], y - box[1]) for x, y in path])
        cv2.polylines(ink, [pts], False, 255, 5)
        cv2.polylines(rgb, [pts], False, (24, 22, 22), 4, cv2.LINE_AA)
    sealed = cv2.morphologyEx(ink, cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close, close)))
    flood = np.pad(np.uint8(sealed == 0), 1, constant_values=1)
    cv2.floodFill(flood, None, (0, 0), 2)
    inside = (flood[1:-1, 1:-1] != 2).astype(np.uint8) * 255
    count, labels, stats, _ = cv2.connectedComponentsWithStats(inside)
    keep = np.uint8(labels == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])) * 255
    keep = cv2.morphologyEx(keep, cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    # Inside the mascot, anything coloured is fruit showing through: snap it
    # to the drawing's black line or white fill.
    g2 = rgb.astype(np.int16).mean(axis=2)
    s2 = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2)
    inner = keep > 0
    rgb[inner & (g2 > 150)] = 255
    rgb[inner & (g2 <= 150) & (s2 > 30)] = (24, 22, 22)
    alpha = cv2.GaussianBlur(keep, (3, 3), 0)
    img = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
    bbox = img.getbbox()
    img = img.crop(bbox)
    img.save(out / (name + '.webp'), quality=94, exact=True)
    record('/art/fruit/' + name + '.webp', 'p17-05.png', list(img.size),
        'Peeling helper pose', 'Source crop, closed mascot silhouette, foot outline completed')
    print(name, img.size, 'source origin', bbox[0] + box[0], bbox[1] + box[1])


# Pulling pose: hands at the left end of the arms hold the peel.
figure('peel-pull', (1045, 335, 1225, 580), 9,
       [[(1093, 545), (1101, 553), (1117, 553), (1126, 543), (1131, 512)]])
figure('peel-cheer', (1750, 320, 1990, 600), 11)


def body_box(alpha, top=0):
    ys, xs = np.where(alpha[top:] > 40)
    return xs.min(), ys.min() + top, xs.max(), ys.max() + top


for fruit in ['pineapple', 'prickly-pear', 'orange']:
    skin = Image.open(out / f'{fruit}-0.webp').convert('RGBA')
    flesh = Image.open(out / f'{fruit}-2.webp').convert('RGBA')
    s = np.array(skin)
    crown_cut = 0
    if fruit == 'pineapple':
        # Leaves are green; the body starts below their spread.
        r, g, b, a = [s[:, :, i].astype(int) for i in range(4)]
        green = (g > r + 8) & (g > b + 15) & (a > 0)
        rows = np.arange(s.shape[0])[:, None]
        crown = ((rows < 250) | (green & (rows < 330))) & (a > 20)
        crown_img = s.copy()
        crown_img[~crown, 3] = 0
        body = s.copy()
        body[crown | (a <= 20), 3] = np.where(a[crown | (a <= 20)] > 20, 0, a[crown | (a <= 20)])
        Image.fromarray(crown_img).crop(Image.fromarray(crown_img).getbbox()).save(
            out / 'pineapple-peel-crown.webp', quality=92, exact=True)
        cb = Image.fromarray(crown_img).getbbox()
        print('crown box', cb)
        skin = Image.fromarray(body)
        crown_cut = 255
    sb = body_box(np.array(skin)[:, :, 3], crown_cut)
    fb = body_box(np.array(flesh)[:, :, 3])
    scale = (sb[2] - sb[0]) * 0.965 / (fb[2] - fb[0])
    fw, fh = round(flesh.width * scale), round(flesh.height * scale)
    small = flesh.resize((fw, fh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', skin.size, (0, 0, 0, 0))
    cx = (sb[0] + sb[2]) / 2 - ((fb[0] + fb[2]) / 2) * scale
    bottom = sb[3] - 3 - fb[3] * scale
    canvas.alpha_composite(small, (round(cx), round(bottom)))
    skin.save(out / f'{fruit}-peel-skin.webp', quality=93, exact=True)
    canvas.save(out / f'{fruit}-peel-flesh.webp', quality=93, exact=True)
    page = next(r['page'] for r in manifest if r['path'] == f'/art/fruit/{fruit}-0.webp')
    for kind in ['skin', 'flesh']:
        record(f'/art/fruit/{fruit}-peel-{kind}.webp', f'p{page:02d} via {fruit}-{0 if kind == "skin" else 2}.webp',
            skin.size, 'Progressive peeling layer', 'Registered whole and peeled photos on one canvas')
    if fruit == 'pineapple':
        crown = Image.open(out / 'pineapple-peel-crown.webp')
        record('/art/fruit/pineapple-peel-crown.webp', f'p{page:02d} via pineapple-0.webp', crown.size,
            'Pineapple crown, lifted before peeling', 'Green leaves separated from the whole fruit photo')
    print(fruit, 'skin body', sb, 'flesh box', fb, 'scale', round(scale, 3))
    print('  flesh placed', round(cx), round(bottom), fw, fh)

manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
