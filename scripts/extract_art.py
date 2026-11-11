"""Preserve the embedded reference images at native resolution. Run with the campaign PDF path."""
from pathlib import Path
import sys
import pypdfium2 as pdf
import pypdfium2.raw as raw

project = Path(__file__).resolve().parents[1]
out = project / "source-art"
out.mkdir(exist_ok=True)
document = pdf.PdfDocument(sys.argv[1])
for page_no, page in enumerate(document, start=1):
    objects = sorted(page.get_objects(filter=[raw.FPDF_PAGEOBJ_IMAGE]), key=lambda obj: (-round(obj.get_bounds()[3], 0), obj.get_bounds()[0]))
    for number, image in enumerate(objects, start=1):
        name = f"p{page_no:02}-{number:02}"
        image.extract(out / name)
        # PDF streams store the high-quality opacity mask separately from the colors.
        if 11 <= page_no <= 18:
            rgba = image.get_bitmap(render=True).to_pil().copy()
            if rgba.mode == "RGBA" and rgba.getchannel("A").getextrema()[0] < 255:
                rgba.getchannel("A").resize(image.get_px_size()).save(out / f"{name}.alpha.png")
