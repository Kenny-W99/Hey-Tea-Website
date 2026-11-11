"""Produce the site artwork from preserved source-art. Optional argument: path to the depth estimation ONNX described in docs/assets.md."""
from __future__ import annotations

import json
from pathlib import Path
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "art"
SOURCE = ROOT / "source-art"
records: list[dict] = []
CITIES = ('miami', 'hawaii', 'la')


def src_path(key):
    return next(f for f in sorted(SOURCE.glob(key + '.*')) if '.alpha.' not in f.name)


def src(key):
    image = Image.open(src_path(key)).convert('RGB')
    alpha = SOURCE / (key + '.alpha.png')
    if alpha.exists():
        image.putalpha(Image.open(alpha))
    return image


def export(image, name, key, purpose, process, limit=None, status="Visual review"):
    image = image.copy()
    if limit:
        image.thumbnail(limit, Image.Resampling.LANCZOS)
    file = OUT / (name + '.webp')
    file.parent.mkdir(parents=True, exist_ok=True)
    image.save(file, 'WEBP', quality=88, method=5, exact=True)
    records.append(dict(path='/art/' + name + '.webp', source=src_path(key).name,
                        page=int(key[1:3]), originalSize=Image.open(src_path(key)).size,
                        size=image.size, purpose=purpose, processing=process,
                        optimization='WebP quality 88 with alpha where applicable', qualityStatus=status))


def pixel_crop(image, box, reference_width=900):
    factor = image.width / reference_width
    return image.crop(tuple(round(v * factor) for v in box))


def flat_assets():
    for key, name in [('p05-01', 'globe-day'), ('p05-02', 'globe-sunset')]:
        export(src(key), name, key, 'Globe illustration', 'Native 2:1 composition', (1550, 775))
    # Real packaging from the approved six-cup master. Trace the clear lids explicitly
    # so a bright background classifier cannot remove ice or translucent sleeve highlights.
    board = src('p02-01')
    polygon = [(154,59),(155,55),(155,49),(160,45),(169,42),(178,26),(184,23),(195,20),(218,18),
               (259,18),(282,21),(291,25),(300,39),(301,42),(311,46),(315,50),(315,53),(319,56),
               (318,61),(312,64),(289,287),(287,291),(280,293),(262,294),(211,294),(191,293),(186,290),(163,65)]
    for city, dx in [('miami',216),('hawaii',426),('la',0)]:
        for suffix, dy in [('cup',0),('cup-back',288)]:
            mask = Image.new('L', board.size)
            scale = board.width / 900
            ImageDraw.Draw(mask).polygon([(round((x+dx)*scale), round((y+dy)*scale)) for x,y in polygon], fill=255)
            alpha = mask.filter(ImageFilter.GaussianBlur(0.7))
            cut = board.copy()
            cut.putalpha(alpha)
            export(cut.crop(alpha.getbbox()),city+'/'+suffix,'p02-01','Campaign cup, '+suffix,'Manually traced lid and printed sleeve. Native hero crop.')
    pg = src('p07-01')
    logo = pixel_crop(pg, (352,13,546,60)).convert('L')
    alpha = ImageOps.invert(logo).point(lambda v: min(255,max(0,round((v-44)*255/186))))
    ink = Image.new('RGB',logo.size,(27,30,25))
    ink.putalpha(alpha)
    export(ink.crop(alpha.getbbox()),'wordmark','p07-01','HEYTEA wordmark and drinking figure','Isolated dark ink at original board scale')
    for city,box in zip(('la','miami','hawaii'),[(101,195,305,336),(333,191,537,327),(570,195,772,338)]):
        crop = pixel_crop(pg,box)
        lab = cv2.cvtColor(np.array(crop), cv2.COLOR_RGB2LAB).astype(float)
        bg = np.median(lab[:5,:,:],axis=(0,1))
        delta = np.linalg.norm(lab-bg,axis=2)
        alpha = np.uint8(np.clip((delta-4)*22,0,255))
        if city=='miami':
            # The mascot's head starts underneath the Miami vignette on this board.
            alpha[round(alpha.shape[0]*.943):, round(alpha.shape[1]*.2):round(alpha.shape[1]*.70)] = 0
        crop.putalpha(Image.fromarray(alpha))
        export(crop,city+'/vignette','p07-01','Illustrated destination vignette','Isolated colored campaign drawing and lifted ground')
    fruits = dict(guava=['p11-02','p11-03','p11-01'],lime=['p12-04','p12-03','p12-02'],
                  pineapple=['p14-01','p14-02','p14-03'],lilikoi=['p15-03','p15-02','p15-01'],
                  orange=['p17-02','p17-03','p17-04'])
    fruits['prickly-pear']=['p16-03','p16-02','p16-04']
    for fruit,keys in fruits.items():
        for i,key in enumerate(keys):
            export(src(key),f'fruit/{fruit}-{i}',key,'Fruit preparation state','Preserve registered square framing and original PDF soft mask',(640,640))
    for city,key in zip(CITIES,['p13-01','p15-05','p18-01']):
        sheet = src(key)
        # Separate complete connected figures, leaving the progression arrows off the sprites.
        alpha = np.array(sheet.getchannel('A'))
        _, labels, stats, _ = cv2.connectedComponentsWithStats(np.uint8(alpha>20))
        for n,action in enumerate(('mash','pour','mix')):
            cx = (stats[:,0]+.5*stats[:,2])/sheet.width
            selected = np.flatnonzero((cx>n/3)&(cx<(n+1)/3)&(stats[:,4]>1000))
            selected = [k for k in selected if k>0 and (stats[k,2]>130 or stats[k,3]>130)]
            keep = np.uint8(np.isin(labels,selected))*255
            # Retain original subpixel opacity along the selected components.
            keep = cv2.dilate(keep,np.ones((5,5),np.uint8))
            result = sheet.copy()
            result.putalpha(Image.fromarray(cv2.bitwise_and(alpha,keep)))
            result = result.crop(result.getbbox())
            export(result,city+'/'+action,key,'Station helper with '+action+' implement','Isolated native transparent pose from preparation strip',(640,560))


# ROI bounds in source-normalized space; outline control points in a 240×220 local guide.
# Each contour is hand-placed against the plate. GrabCut refines a small boundary band.
ROIS = [(.16,.58,.33,.96),(.13,.50,.30,.89),(.16,.58,.31,.90),(.17,.58,.33,.95),
        (.11,.51,.30,.91),(.27,.50,.43,.89),(.16,.54,.33,.93),(.19,.58,.34,.96),
        (.13,.54,.34,.96),(.16,.52,.39,.95),(.15,.54,.35,.95),(.15,.54,.34,.96)]
OUTLINES = [
    '78,97 76,72 88,56 104,47 131,44 145,40 158,44 157,53 166,65 165,89 150,100 166,107 173,113 172,90 169,88 169,79 177,77 175,60 181,58 185,78 203,80 206,87 202,101 211,101 209,115 204,119 203,124 181,129 166,124 165,145 183,167 199,162 208,166 204,178 180,190 167,193 146,171 134,161 121,173 111,175 111,182 104,190 85,189 79,183 76,158 79,148 62,146 56,140 57,119 68,102',
    '41,86 33,73 36,51 46,35 65,27 88,24 112,23 126,19 135,24 126,35 140,49 143,64 137,81 124,90 139,97 137,82 140,70 155,67 153,57 147,50 150,47 160,54 162,68 178,70 183,79 180,97 181,109 176,115 154,115 144,113 141,120 159,119 174,123 184,138 199,161 202,169 193,174 179,175 166,165 148,147 137,145 101,148 83,145 77,147 57,151 46,147 44,141 52,137 66,105 62,98',
    '46,81 50,60 58,46 72,39 94,32 110,34 123,26 132,27 137,36 136,44 145,57 146,78 137,94 127,100 146,106 155,116 153,85 154,77 169,75 166,61 159,59 162,55 174,58 176,74 190,78 194,85 194,100 197,102 194,120 187,124 180,126 159,125 156,145 164,161 185,162 192,159 199,166 195,174 177,188 161,189 136,165 121,158 106,174 90,179 87,190 71,191 60,186 57,160 61,151 51,144 50,130 48,130 47,114 60,98',
    '75,87 76,69 87,57 103,48 125,44 140,45 147,40 158,41 160,52 171,65 171,88 158,101 168,110 176,113 184,109 184,89 177,88 179,81 189,77 187,64 193,63 196,78 210,80 214,87 209,101 218,101 213,116 210,120 207,127 184,129 166,127 168,145 185,166 198,167 207,165 213,170 211,178 183,192 168,192 145,167 132,162 124,176 109,180 108,189 96,196 79,193 74,183 72,163 76,153 59,152 50,146 53,117 63,102',
    '62,76 61,55 67,43 76,33 101,26 124,26 136,21 149,25 149,34 159,45 165,66 158,82 149,90 159,93 171,80 169,65 167,47 164,41 164,31 177,23 194,23 206,27 210,37 207,43 207,52 214,56 212,71 206,74 201,81 182,89 174,96 161,104 157,122 181,124 200,130 207,147 202,165 211,174 208,181 192,186 175,191 162,184 150,158 134,156 111,153 96,149 92,158 78,158 67,154 61,157 56,151 56,126 62,103 76,97',
    '59,68 59,47 72,31 95,24 115,22 122,12 140,12 147,22 155,27 165,41 167,55 158,69 148,74 166,80 177,75 191,75 199,81 196,88 169,93 153,99 145,100 146,120 137,135 128,143 124,156 129,166 126,174 109,180 91,181 91,175 78,178 63,173 60,167 74,139 56,140 43,134 44,114 50,90 67,83',
    '63,73 67,55 78,43 96,34 120,31 132,30 143,23 154,23 161,30 159,38 173,48 177,62 174,79 161,91 168,98 176,109 179,107 175,91 172,85 179,79 180,72 187,69 191,71 190,80 198,70 200,57 206,56 206,70 215,78 218,87 209,90 207,106 214,107 211,118 198,123 186,124 180,122 178,141 193,160 207,161 216,164 218,169 208,177 186,190 172,192 147,168 132,158 121,173 104,179 103,185 94,190 79,191 73,186 71,159 78,149 55,147 46,143 47,118 53,99 66,94 74,95',
    '59,65 60,50 70,37 87,30 108,28 127,26 142,21 156,24 160,32 157,38 171,48 176,63 174,81 156,94 166,98 173,107 181,104 190,106 194,115 189,126 178,131 171,150 169,174 171,179 178,180 177,188 164,193 141,193 137,187 136,183 135,193 126,198 101,198 94,194 94,187 101,156 81,158 61,155 51,150 52,122 57,104 70,96 80,95 70,88',
    '89,76 97,56 101,42 111,31 131,28 146,25 157,21 167,24 168,34 163,39 171,46 176,62 171,74 165,79 177,78 186,65 188,54 191,48 197,47 201,55 204,49 210,47 215,51 210,58 218,60 218,65 207,73 199,76 184,93 173,102 178,125 176,158 175,164 182,167 186,174 180,180 154,180 149,176 147,167 146,144 142,144 139,172 143,179 140,185 120,189 112,186 113,173 118,137 99,137 88,133 83,122 85,105 88,96 78,89 64,81 60,75 64,71 72,74 67,65 69,60 77,63 80,73 81,64 85,62 91,75 99,78',
    '75,73 78,54 85,42 100,35 121,31 135,30 142,28 152,32 153,39 150,43 156,52 157,68 149,82 140,90 151,94 166,94 179,98 183,104 178,110 160,111 140,107 139,130 151,133 157,144 157,162 165,166 166,171 184,174 198,174 205,170 205,177 197,183 170,192 156,193 153,201 147,207 141,205 136,198 137,192 74,185 67,186 62,195 54,197 49,194 47,187 41,185 34,181 32,172 36,165 44,164 63,169 65,159 82,145 74,138 65,137 61,129 64,113 45,125 40,127 37,122 41,115 61,97 59,93 68,84 83,81',
    '61,80 60,61 67,47 80,37 101,31 124,30 135,24 145,26 148,34 145,40 157,50 161,67 156,82 143,93 154,101 162,122 178,125 190,138 198,154 205,150 213,152 218,158 214,165 201,173 185,181 169,180 177,186 181,192 176,197 164,200 148,197 139,190 135,161 122,158 101,155 88,151 82,155 69,158 59,157 56,151 59,143 51,142 48,133 51,109 61,98 73,95',
    '65,74 67,53 79,39 99,30 122,28 135,27 142,21 150,24 151,32 148,38 159,50 162,66 156,80 142,90 155,98 164,104 176,99 170,87 165,75 168,63 184,61 186,56 199,55 208,60 210,68 202,74 196,75 198,90 191,100 184,104 192,109 189,115 177,117 173,121 163,121 161,139 178,159 191,159 198,157 203,160 201,170 185,182 166,186 157,185 138,164 123,153 114,169 102,175 103,181 95,185 80,185 75,179 74,160 80,145 68,143 57,138 56,121 61,102 71,92 80,91'
]

def poster_accents():
    poster = src('p06-02')
    # Matte is a connected pale sky. Preserve all enclosed white line-art interiors.
    beach = pixel_crop(poster,(0,380,400,534),reference_width=400)
    rgb = np.array(beach).astype('int16')
    sample = np.median(rgb[:8],axis=(0,1))
    diff = np.sqrt(np.sum((rgb-sample)**2,axis=2))
    is_sky = np.uint8(diff<24)
    cv2.floodFill(is_sky, None, (0,0), 2)
    alpha = np.uint8(is_sky!=2)*255
    beach.putalpha(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(.5)))
    export(beach,'poster-beach','p06-02','Branded illustrated beach footer from outdoor poster','Removed exterior sky ground, preserved interior ink and cups',(1086,420))
    # The p7 pose intentionally ends at the counter. It is suitable as a bust illustration.
    image=src('p07-01')
    scale=image.width/900
    polygon=[(396,400),(402,369),(393,362),(386,351),(387,338),(395,329),(406,324),
             (419,323),(432,330),(438,329),(441,337),(438,342),(440,346),(439,355),
             (434,361),(446,368),(445,359),(442,357),(444,353),(453,351),(453,342),
             (458,341),(459,351),(471,352),(474,357),(471,362),(469,389),(450,392),(454,402)]
    mask=Image.new('L',image.size)
    ImageDraw.Draw(mask).polygon([(round(x*scale),round(y*scale)) for x,y in polygon],fill=255)
    image.putalpha(mask.filter(ImageFilter.GaussianBlur(.6)))
    export(image.crop(image.getbbox()),'sip-mascot','p07-01','Cup-holding mascot bust','Hand-traced native outline',(250,250))


def character_mask(rgb, index):
    h,w=rgb.shape[:2]
    x0,y0,x1,y1=ROIS[index]
    sx,sy=(x1-x0)*w/240,(y1-y0)*h/220
    points=[tuple(map(int,xy.split(','))) for xy in OUTLINES[index].split()]
    pts=np.int32([(round(x0*w+x*sx),round(y0*h+y*sy)) for x,y in points])
    poly=np.zeros((h,w),np.uint8)
    cv2.fillPoly(poly,[pts],255)
    # Keep a narrow confident interior and allow uncertain edge pixels on either side.
    kernel=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9))
    label=np.zeros_like(poly)
    label[cv2.dilate(poly,kernel)>0]=cv2.GC_PR_BGD
    label[poly>0]=cv2.GC_PR_FGD
    label[cv2.erode(poly,kernel)>0]=cv2.GC_FGD
    x,y,bw,bh=cv2.boundingRect(cv2.dilate(poly,np.ones((25,25),np.uint8)))
    sub=label[y:y+bh,x:x+bw].copy()
    cv2.grabCut(rgb[y:y+bh,x:x+bw],sub,None,np.zeros((1,65)),np.zeros((1,65)),4,cv2.GC_INIT_WITH_MASK)
    label[y:y+bh,x:x+bw]=sub
    mask=np.uint8((label==cv2.GC_FGD)|(label==cv2.GC_PR_FGD))*255
    contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    core=max(contours,key=cv2.contourArea)
    main=np.zeros_like(mask);cv2.drawContours(main,[core],-1,255,-1)
    return cv2.bitwise_and(mask,main)


def repair(rgb,mask,offset):
    h,w=rgb.shape[:2]
    # Borrow same-elevation textures from the original scene, with feathered edges.
    expanded=cv2.dilate(mask,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(19,19)))
    x,y,bw,bh=cv2.boundingRect(expanded)
    source_x=max(0,min(w-bw,x+int(w*offset)))
    donor=rgb[y:y+bh,source_x:source_x+bw].copy()
    area=expanded[y:y+bh,x:x+bw].copy()
    # Padding retains the antialiased rim when seamlessly blending the repair.
    return cv2.seamlessClone(donor,rgb,area,(x+bw//2,y+bh//2),cv2.NORMAL_CLONE)


def depth_field(rgb,session):
    h,w=rgb.shape[:2]
    dh=294;dw=round(w/h*dh/14)*14
    raw=cv2.resize(rgb,(dw,dh),interpolation=cv2.INTER_AREA).astype(np.float32)/255
    tensor=((raw-np.float32([.485,.456,.406]))/np.float32([.229,.224,.225])).transpose(2,0,1)[None]
    prediction=session.run(None,{'pixel_values':tensor})[0].squeeze()
    return cv2.resize(prediction,(w,h),interpolation=cv2.INTER_LINEAR)


def split_planes(rgb,depth):
    """Partition actual source pixels using a monocular estimate. Bleed med/far colors
    under near occluders so small relative parallax never exposes the original object twice."""
    from_mask = lambda mask: cv2.medianBlur(np.uint8(mask)*255,9)
    near=from_mask(depth>np.percentile(depth,89))
    middle=from_mask(depth>np.percentile(depth,49))
    # Fill hidden pixels with nearest same-plane edge colors. The fill should be
    # visible only along a narrow border when planes separate.
    def extend(im, remove):
        _, idx=cv2.distanceTransformWithLabels(remove,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
        lookup=np.zeros((int(idx.max())+1,3),np.uint8)
        visible=remove==0
        lookup[idx[visible]]=im[visible]
        return lookup[idx]
    def layer(im,alpha):
        image=Image.fromarray(im)
        image.putalpha(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(.65)))
        return image
    without_near=extend(rgb,near)
    # Keep the midplane opaque under near-plane shapes where a midplane is present.
    mid=layer(without_near,middle)
    back=Image.fromarray(extend(without_near,middle))
    return back,mid,layer(rgb,near)


def walk_cycle(actor):
    """Alternate the two source legs at a fixed foot baseline on a six-frame loop."""
    rgb=np.array(actor.convert("RGBA"))
    h,w=rgb.shape[:2]
    yy,xx=np.indices((h,w),dtype=np.float32)
    t=np.clip((yy/h-.65)/.31,0,1)
    bend=t*t*(3-2*t)
    # The negative-space cleft between the two feet is centered under the hip.
    lower=yy>=h*.65
    rear=lower & (xx<w*.51)
    for frame_no in range(6):
        angle=frame_no*np.pi/3
        stride=.5*(1-np.cos(angle))
        torso=rgb.copy();torso[lower,3]=0
        image=Image.fromarray(torso)
        for group,side in ((rear,1),(lower & ~rear,-1)):
            sprite=rgb.copy();sprite[~group,3]=0
            sway=side*stride*w*.50
            lift=max(0,np.sin(angle)*side)*h*.071
            sy=yy+lift*bend
            # Reverse sampling keeps each deformed limb continuous at subpixel scale.
            bent_t=np.clip((sy/h-.65)/.31,0,1)
            sx=xx-sway*bent_t*bent_t*(3-2*bent_t)
            part=cv2.remap(sprite,sx.astype('float32'),sy.astype('float32'),cv2.INTER_LINEAR)
            image.alpha_composite(Image.fromarray(part))
        yield image


def environments(model_file):
    import onnxruntime as ort
    config=ort.SessionOptions();config.intra_op_num_threads=4;config.inter_op_num_threads=1
    session=ort.InferenceSession(model_file,sess_options=config,providers=['CPUExecutionProvider'])
    routes={city:[] for city in CITIES}
    offsets=[.14,.14,.13,.15,.13,.18,.14,.13,.13,.18,.17,.15]
    for idx in range(12):
        city=CITIES[idx//4];stop=idx%4;key=f'p{20+idx//2}-{1+idx%2:02}'
        original=src(key)
        original.thumbnail((1440,960),Image.Resampling.LANCZOS)
        rgb=np.array(original.convert('RGB'));h,w=rgb.shape[:2]
        mask=np.array(Image.open(SOURCE/'mattes'/(key+'-pose.png')).convert('L'))
        soft=Image.fromarray(mask).filter(ImageFilter.GaussianBlur(.55))
        pose=Image.fromarray(rgb);pose.putalpha(soft)
        box=soft.getbbox()
        actor=pose.crop(box)
        # These posed source illustrations leave a hand empty. Place the same
        # selected cup sleeve at that hand; preserve original drawn drinks elsewhere.
        hand_anchors={5:(.89,.43),7:(.87,.54),8:(.10,.33),9:(.81,.43),10:(.28,.72)}
        if idx in hand_anchors:
            cup=Image.open(OUT/city/'cup.webp').convert('RGBA')
            target_h=round(actor.height*.23)
            cup=cup.resize((round(cup.width*target_h/cup.height),target_h), Image.Resampling.LANCZOS)
            hx,hy=hand_anchors[idx]
            actor.alpha_composite(cup,(round(hx*actor.width-cup.width*.5),round(hy*actor.height-cup.height*.70)))
        export(actor,f'{city}/{stop}-pose',key,'Landmark-specific pose','Manually traced local outline with GrabCut boundary refinement')
        if idx in (0,6,11):
            for frame_no,frame in enumerate(walk_cycle(actor)):
                export(frame,f'{city}/walk-{frame_no}',key,'Walking frame','Two independently displaced lower limbs with planted contact and alternating lift')
                if frame_no==0:
                    export(frame,f'{city}/walk',key,'City walking pose','Traveling mascot silhouette with original bag and drink')
        repaired=repair(rgb,mask,offsets[idx])
        export(Image.fromarray(repaired),f'{city}/{stop}-scene',key,'Character-free destination vista','Removed the mascot and synthesized concealed pixels from nearby same-elevation scene textures')
        back,mid,front=split_planes(repaired,depth_field(repaired,session))
        for label,image in [('back',back),('mid',mid),('front',front),('still',Image.fromarray(rgb))]:
            detail='Source geometry preserved in static reference' if label=='still' else 'Removed baked mascot, filled with adjacent source textures, partitioned depth planes with edge bleed'
            export(image,f'{city}/{stop}-{label}',key,'Environment '+label,detail)
        x0,y0,x1,y1=box
        routes[city].append(dict(stop=stop,footX=round((x0+x1)/2/w,5),footY=round(y1/h,5),
                                 poseWidth=round((x1-x0)/w,5),poseHeight=round((y1-y0)/h,5),
                                 aspect=round(w/h,5)))
        print(f'{city} {stop} done',flush=True)
    (OUT/'routes.json').write_text(json.dumps(routes,indent=2)+'\n')


if __name__=='__main__':
    flat_assets()
    poster_accents()
    environments(sys.argv[1])
    (OUT/'manifest.json').write_text(json.dumps(records,indent=2)+'\n')
