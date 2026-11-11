"""Extract the campaign's existing preparation figures without redrawing them."""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
out = root / 'public/art/fruit'
manifest_path = root / 'public/art/manifest.json'
manifest = json.loads(manifest_path.read_text())

def export(name, key, box, figure=True):
    original = Image.open(root / 'source-art' / (key+'.png')).convert('RGB')
    image = original.crop(box).convert('RGBA')
    if figure:
        ink = np.uint8(np.array(image.convert('L')) < 100) * 255
        contours, _ = cv2.findContours(ink, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contour = max(contours, key=cv2.contourArea)
        mask = np.zeros_like(ink)
        cv2.drawContours(mask, [contour], -1, 255, -1, cv2.LINE_AA)
    else:
        rgb = np.array(image)[:,:,:3]
        background = np.uint8((rgb.min(axis=2)>224) & (rgb.max(axis=2)-rgb.min(axis=2)<24))
        # Flood only the connected exterior, retaining the white mascot interiors.
        flood = np.pad(background, 1, constant_values=1)
        cv2.floodFill(flood, None, (0,0), 2)
        mask = np.uint8(flood[1:-1,1:-1]!=2)*255
        count, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
        for i in range(1,count):
            x,y,w,h,area = stats[i]
            if area < 7000 and (x < 5 or x+w > image.width-5):
                mask[labels==i] = 0
    image.putalpha(Image.fromarray(mask))
    image = image.crop(image.getbbox())
    image.thumbnail((700,600), Image.Resampling.LANCZOS)
    image.save(out / (name+'.webp'), quality=93, exact=True)
    path = '/art/fruit/'+name+'.webp'
    manifest[:] = [r for r in manifest if r['path'] != path]
    manifest.append(dict(path=path, source=key+'.png', page=int(key[1:3]),
        originalSize=original.size, size=image.size, purpose='Original campaign preparation helper',
        processing='Source crop; exterior matte follows the existing dark outline' if figure else 'Source action vignette; connected exterior matte',
        optimization='WebP with alpha', qualityStatus='Browser visual review'))
    print(name, image.size)

export('helper-transfer', 'p12-01', (20,280,260,630))
export('helper-squeeze', 'p12-05', (1690,285,2005,600))
export('scoop-scene', 'p15-04', (1040,90,1480,650), figure=False)
for fruit,key,ranges in [
    ('pineapple','p14-04',[(0,620),(740,1330),(1400,2030)]),
    ('prickly-pear','p17-01',[(0,495),(580,1075),(1155,1700)]),
    ('orange','p17-05',[(0,565),(635,1230),(1320,2000)]),
]:
    for i,(left,right) in enumerate(ranges):
        export(f'{fruit}-helper-{i}',key,(left,0,right,683),figure=False)
    unused = 'helper-'+fruit
    (out / (unused+'.webp')).unlink(missing_ok=True)
    manifest[:] = [r for r in manifest if r['path'] != '/art/fruit/'+unused+'.webp']
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
