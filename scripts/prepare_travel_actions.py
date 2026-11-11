"""Articulate the supplied traveler drawings at their existing joints."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageOps

art = Path(__file__).resolve().parents[1] / "public/art"
out = art / "traveler"
out.mkdir(exist_ok=True)


def separate(image, outline, base, moving):
    image = image.convert("RGBA")
    scale = 4
    mask = Image.new("L", (image.width * scale, image.height * scale))
    ImageDraw.Draw(mask).polygon([(round(x*scale), round(y*scale)) for x,y in outline], fill=255)
    mask = mask.resize(image.size, Image.Resampling.LANCZOS)
    for name, region in [(base, ImageOps.invert(mask)), (moving, mask)]:
        layer = image.copy()
        layer.putalpha(ImageChops.multiply(image.getchannel("A"), region))
        layer.save(out / (name+".webp"), quality=92, method=6)


sheet = Image.open(art / "rear-stride.webp")
frame = sheet.crop((0, 0, sheet.width//8, sheet.height))
w,h = frame.size
separate(frame, [(x*w,y*h) for x,y in [
    (.704,.372),(.762,.349),(1,.348),(1,.566),(.738,.579),(.691,.515),(.661,.466)
]], "sip-body", "sip-arm")
separate(Image.open(art / "la/0-pose.webp"), [
    (128,92),(145,72),(151,56),(148,27),(196,23),(196,72),(141,116)
], "wave-body", "wave-arm")
separate(Image.open(art / "la/1-pose.webp"), [
    (0,201),(41,202),(44,220),(51,224),(59,224),(62,217),(77,221),(96,222),
    (115,216),(134,217),(135,231),(144,237),(168,239),(179,237),(182,231),
    (181,225),(238,221),(238,284),(0,284)
], "skater", "board")
