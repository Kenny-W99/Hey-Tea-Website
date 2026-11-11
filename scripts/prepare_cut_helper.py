"""Rig the knife arm from the supplied middle guava panel at its drawn shoulder."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1]
image = Image.open(root / "source-art/guava-cutting-reference.jpg").convert("RGB")
crop = image.crop((913, 287, 1127, 538))
gray = np.array(crop.convert("L"))
contours, _ = cv2.findContours(np.uint8(gray < 85)*255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
mask = np.zeros_like(gray)
cv2.drawContours(mask, [max(contours, key=cv2.contourArea)], -1, 255, -1, cv2.LINE_AA)
# Negative space between the legs belongs to the original fruit photograph.
cv2.fillPoly(mask, [np.array([(145,201),(154,222),(161,226),(154,237),(145,244),(141,240)])], 0)
sprite = crop.convert("RGBA")
sprite.putalpha(Image.fromarray(mask))
arm = Image.new("L", crop.size)
ImageDraw.Draw(arm).polygon([(7,57),(80,90),(99,99),(119,111),(143,104),(150,106),
                            (148,133),(133,140),(118,143),(78,138),(9,106)], fill=255)
hand = sprite.copy()
hand.putalpha(Image.fromarray(np.minimum(mask,np.array(arm))))
body = sprite.copy()
body.putalpha(Image.fromarray(np.minimum(mask,255-np.array(arm))))
pen=ImageDraw.Draw(body)
pen.polygon([(128,103),(151,101),(150,143),(121,146),(122,117)],fill=(252,251,249,255))
pen.line([(128,103),(122,119),(120,147)],fill=(40,36,34,255),width=3)
out=root/"public/art/fruit"
body.save(out/"helper-body.webp",quality=95)
hand.save(out/"helper-knife.webp",quality=95)
