"""Build a sharper 2x Wynwood Walls plate for the close view.

The walk ends close to the painted walls, so the plate is magnified several
times. A Lanczos 2x copy with a light unsharp mask keeps edges crisp under
that magnification. The 1440px plate is kept in source-art for re-runs.
"""
from pathlib import Path
import shutil
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parents[1]
plate = root / 'public/art/miami/3-scene.webp'
original = root / 'source-art/miami-3-scene-1440.webp'
if not original.exists():
    shutil.copy(plate, original)
im = Image.open(original).convert('RGB')
big = im.resize((im.width * 2, im.height * 2), Image.Resampling.LANCZOS)
big = big.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
big.save(plate, quality=90, method=6)
print(plate.relative_to(root), big.size)
