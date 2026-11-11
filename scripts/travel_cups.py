"""Restore the printed recipe sleeve in travel poses and keep it legible when facing left."""
from PIL import Image, ImageDraw, ImageOps, ImageFilter
import json
from prepare_art import OUT,SOURCE,CITIES,src,walk_cycle

# Local pose pixels measured on the unscaled cutouts. Preserve the bent wrist.
props={
 ('miami',0):([(116,37),(163,37),(163,128),(132,128),(131,121),(127,100),(117,88)],(121,53,69)),
 ('miami',1):([(111,47),(159,47),(159,140),(119,140),(116,121),(111,83)],(112,64,71)),
 ('miami',2):([(98,35),(141,35),(141,123),(104,123),(101,110),(101,69)],(99,52,70)),
 ('miami',3):([(119,45),(162,45),(162,127),(132,127),(127,118),(124,93),(119,84)],(121,55,68)),
 ('hawaii',2):([(121,38),(175,38),(175,148),(136,148),(136,123),(125,123),(121,109)],(124,58,82)),
 ('la',3):([(131,43),(183,43),(183,150),(137,150),(137,122),(130,121)],(131,61,81))}
def cup_at(actor,master,placement,left=False):
    x,y,h=placement
    cup=master.resize((round(master.width*h/master.height),h),Image.Resampling.LANCZOS)
    out=ImageOps.mirror(actor) if left else actor.copy()
    out.alpha_composite(cup,(actor.width-x-cup.width if left else x,y))
    return out
def build():
    manifest=json.loads((OUT/'manifest.json').read_text())
    routes=json.loads((OUT/'routes.json').read_text())
    for (city,stop),(poly,placement) in props.items():
        idx=CITIES.index(city)*4+stop
        key=f'p{20+idx//2}-{1+idx%2:02}'
        plate=src(key).convert('RGBA');plate.thumbnail((1440,960),Image.Resampling.LANCZOS)
        alpha=Image.open(SOURCE/'mattes'/(key+'-pose.png')).convert('L').filter(ImageFilter.GaussianBlur(.55))
        plate.putalpha(alpha);actor=plate.crop(alpha.getbbox())
        matte=actor.getchannel('A');ImageDraw.Draw(matte).polygon(poly,fill=0);actor.putalpha(matte)
        master=Image.open(OUT/city/'cup.webp').convert('RGBA')
        pose=cup_at(actor,master,placement)
        pose.save(OUT/city/f'{stop}-pose.webp',quality=92)
        if (city,stop) in [('miami',0),('hawaii',2),('la',3)]:
            for i,frame in enumerate(walk_cycle(actor)):
                for left in [False,True]:
                    name=f'walk-left-{i}' if left else f'walk-{i}'
                    revised=cup_at(frame,master,placement,left)
                    revised.save(OUT/city/(name+'.webp'),quality=92)
                    if i==0 and not left:revised.save(OUT/city/'walk.webp',quality=92)
                    if left:
                        base=next(r for r in manifest if r['path']==f'/art/{city}/walk-{i}.webp')
                        path=f'/art/{city}/{name}.webp'
                        manifest=[r for r in manifest if r['path']!=path]
                        manifest.append(dict(base,path=path,processing='Mirrored body with original, readable recipe sleeve at reflected hand socket'))
    for city,stops in routes.items():
        for s in stops:
            i=s['stop'];img=Image.open(OUT/city/f'{i}-scene.webp').convert('RGBA')
            pose=Image.open(OUT/city/f'{i}-pose.webp').convert('RGBA')
            img.alpha_composite(pose,(round(s['footX']*img.width-pose.width/2),round(s['footY']*img.height-pose.height)))
            img.convert('RGB').save(OUT/city/f'{i}-still.webp',quality=88)
    for row in manifest:
        if row['path'].endswith('-still.webp'):row['processing']='Recomposed plate with recipe-corrected landmark mascot'
        elif '-pose.webp' in row['path'] or '/walk' in row['path']:
            row['processing']+='; selected sleeve retained or composited at hand'
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if __name__=='__main__':build()
