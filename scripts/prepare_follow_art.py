"""Build the rear walk cycle and small depth grids for the twelve illustrated paths."""
import json
import sys

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image
from prepare_art import CITIES, OUT, SOURCE, depth_field


def walk_sheet():
    art = Image.open(SOURCE / "traveler-rear.png").convert("RGBA")
    art = art.crop(art.getchannel("A").point(lambda x: 255 if x > 35 else 0).getbbox())
    art.thumbnail((320, 520), Image.Resampling.LANCZOS)
    w, h = art.size
    yy, xx = np.indices((h, w), dtype=np.float32)
    legs = np.clip((yy / h - .63) / .31, 0, 1)
    side = np.clip((xx / w - .49) * 12, -1, 1)
    sheet = Image.new("RGBA", (w * 8, h + 8))
    for frame in range(8):
        stride = (1 - np.cos(frame * np.pi / 4)) / 2
        # The drawn right foot starts lifted. Exchange the heights of the two
        # feet as the hips, backpack and head remain anchored in the same place.
        sample_y = yy + legs * stride * h * (.061 - .076 * side)
        warped = cv2.remap(np.array(art), xx, sample_y.astype(np.float32),
                           cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        sheet.paste(Image.fromarray(warped), (frame * w, 4))
    sheet.save(OUT / "rear-stride.webp", quality=90, method=6)
    print("Stride frame", w, h+8)


def fields(model):
    session = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
    result = {}
    for city in CITIES:
        result[city] = []
        for index in range(4):
            scene = Image.open(OUT / city / f"{index}-scene.webp").convert("RGB")
            depth = cv2.resize(depth_field(np.array(scene), session), (41, 25), interpolation=cv2.INTER_AREA)
            lo, hi = np.percentile(depth, [5, 97])
            depth = np.clip((depth-lo) / (hi-lo), 0, 1)
            depth = cv2.GaussianBlur(depth, (0, 0), 2)
            result[city].append(np.round(depth * 255).astype(np.uint8).flatten().tolist())
    (OUT / "travel-depth.json").write_text(json.dumps(result, separators=(",", ":"))+"\n")


if __name__ == "__main__":
    walk_sheet()
    fields(sys.argv[1])
