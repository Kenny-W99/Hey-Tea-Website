"""Isolate the continuously tilted source pitcher and helper from the full-bowl plate."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFilter
import json
root=Path(__file__).resolve().parents[1]/'public/art'
manifest=json.loads((root/'manifest.json').read_text())
for city in ['miami','hawaii','la']:
    src=Image.open(root/city/'pour.webp').convert('RGBA')
    w,h=src.size
    anchors=[(.345,0),(1,0),(1,1),(.595,1),(.60,.69),(.676,.56),(.683,.40),(.62,.35),(.49,.43),(.335,.287)]
    mask=Image.new('L',(w,h))
    ImageDraw.Draw(mask).polygon([(round(x*w),round(y*h)) for x,y in anchors],fill=255)
    src.putalpha(ImageChops.multiply(src.getchannel('A'),mask.filter(ImageFilter.GaussianBlur(.5))))
    src.save(root/city/'pitcher.webp',quality=90)
    base=next(row for row in manifest if row['path']=='/art/'+city+'/pour.webp')
    name='/art/'+city+'/pitcher.webp'
    manifest=[row for row in manifest if row['path']!=name]
    manifest.append(dict(base,path=name,purpose='Interactive pouring figure',processing='Masked original full bowl and frozen stream. Gameplay supplies liquid level and active stream.'))
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
