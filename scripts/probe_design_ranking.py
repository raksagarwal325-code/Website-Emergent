"""Offline region experiment, never imported by the application."""
import hashlib,json,time
import numpy as np


def probe(output, products, rows, mapping, image_cache, encoder, fixtures):
    from customer_visual_features import decode_image,image_hashes,rank_images
    from customer_design_ranking import DESIGN_VERSION,encode_details,needs_detail_check,promote_detail_match,add_related_designs,load_relations
    from evaluate_customer_references import jpeg_variant,selected_controls,canonical,overlay_references
    for row in rows:
        f=output/'design-features'/(row['sha256']+'.json')
        row['design_vectors']=np.asarray(json.loads(f.read_text())['patches'],dtype='<f2').tobytes() if f.exists() else encode_details(encoder,decode_image((image_cache/hashlib.sha256(row['url'].encode()).hexdigest()).read_bytes()))
        row['design_version']=DESIGN_VERSION
    augmented,amap,_=overlay_references(products,rows,mapping,encoder)
    cases=[]
    for sku,file in [('room','pendants-room.jpg'),('CH-029','ch-029-variant.jpg'),('CS-001','cs-001.jpg'),('CS-002','cs-002.jpg'),('WL-085','wl-085.jpg'),('WL-060','wl-060.jpg'),('HL-114','hl-114.jpg'),('Meher','meher.jpg')]:
        data=(fixtures/file).read_bytes()
        cases.extend([(sku+' original',data),(sku+' compressed',jpeg_variant(decode_image(data)))])
    for sku,box in [('CS-001',(.35,0,.8,.12)),('WL-085',(.64,.35,.9,.78)),('CS-002',(0,.5,.3,.85))]:
        im=decode_image((fixtures/(sku.lower()+'.jpg')).read_bytes())
        cases.append((sku+' negative',jpeg_variant(im.crop(tuple(round(v*(im.width if i%2==0 else im.height)) for i,v in enumerate(box))))))
    for p in selected_controls(products):
        data=(image_cache/hashlib.sha256(canonical(p['images'][0]).encode()).hexdigest()).read_bytes()
        cases.append((p['sku']+' control',jpeg_variant(decode_image(data))))
    boxes=[(x,y,x+.25,y+.5) for y in (0,.25,.5) for x in (0,.15,.3,.45,.6,.75)]
    skus=[p['sku'] for p in products]
    ids={p['id']:i for i,p in enumerate(products)}
    catalog=np.asarray([r['vectors'] for r in rows],dtype=np.float32).reshape(-1,384)
    by_product=[[] for p in products]
    for i,r in enumerate(rows):
        for p in mapping[r['url']]: by_product[ids[p['id']]].extend((i*2,i*2+1))

    import os,threading
    from pathlib import Path
    from PIL import ImageOps,Image
    from customer_visual_features import model_input
    from customer_design_ranking import unpack_details
    from customer_region_encoder import RegionEncoder
    from customer_region_search import region_iou,select_region_matches
    cgroup=Path('/sys/fs/cgroup') / Path('/proc/self/cgroup').read_text().strip().split('::')[-1].lstrip('/')
    print('ACTUAL_CPU_QUOTA',(cgroup/'cpu.max').read_text().strip(),flush=True)
    chunks=[unpack_details(r['design_vectors']) for r in rows]
    starts=np.cumsum([0]+[len(c) for c in chunks])
    patches=np.concatenate(chunks).T
    report=[]
    for label,data in cases[:2]:
        im=decode_image(data); hashes=image_hashes(data,im); vectors=encoder.encode_query(im)
        current=rank_images(hashes,vectors,augmented,amap)
        t=time.monotonic()
        padded=ImageOps.pad(im,(256,256),method=Image.Resampling.BICUBIC,color='white')
        pixels=model_input(padded)
        with encoder.lock:
            tokens=encoder.session.run(['last_hidden_state'],{'pixel_values':pixels})[0][0,1:]
        tokens=tokens/np.maximum(np.linalg.norm(tokens,axis=1,keepdims=True),1e-12)
        rgb=(pixels[0].transpose(1,2,0)*np.array([.229,.224,.225])+np.array([.485,.456,.406]))*255
        parts=rgb.reshape(16,14,16,14,3).transpose(0,2,1,3,4).reshape(256,-1,3)
        foreground=(parts.std(axis=1).mean(axis=1)>8)&(parts.mean(axis=(1,2))>15)&(parts.mean(axis=(1,2))<245)
        similarity=tokens@patches
        scaled=ImageOps.contain(im,(256,256))
        xy=np.stack(np.meshgrid(np.arange(16)*14+23,np.arange(16)*14+23),axis=-1).reshape(-1,2)
        xy=(xy-np.array([(256-scaled.width)//2,(256-scaled.height)//2]))/np.array([scaled.width,scaled.height])

        heat=similarity.max(axis=1)
        serialize=lambda out:[{'sku':m['product']['sku'],'score':m['score'],'type':m['match_type']} for m in out]
        for threshold in (.60,.65,.70,.75):
            hot=(foreground & (heat>=threshold)).reshape(16,16)
            horizontal=np.zeros_like(hot)
            horizontal[:,:-1] |= hot[:,:-1] & hot[:,1:]
            horizontal[:,1:] |= hot[:,:-1] & hot[:,1:]
            hot &= horizontal
            seen=set();components=[]
            for y in range(16):
                for x in range(16):
                    if not hot[y,x] or (y,x) in seen:continue
                    todo=[(y,x)];seen.add((y,x));points=[]
                    while todo:
                        yy,xx=todo.pop();points.append((yy,xx))
                        for dy in (-1,0,1):
                            for dx in (-1,0,1):
                                ny,nx=yy+dy,xx+dx
                                if 0<=ny<16 and 0<=nx<16 and hot[ny,nx] and (ny,nx) not in seen:
                                    seen.add((ny,nx));todo.append((ny,nx))
                    if 3<=len(points)<=80:
                        indices=[yy*16+xx for yy,xx in points]
                        coords=xy[indices]
                        low=coords.min(axis=0)-np.array([7/scaled.width,7/scaled.height])
                        high=coords.max(axis=0)+np.array([7/scaled.width,7/scaled.height])
                        margin=(high-low)*.15
                        low=np.maximum(low-margin,0);high=np.minimum(high+margin,1)
                        box=[float(low[0]),float(low[1]),float(high[0]),float(high[1])]
                        if np.prod(high-low)<.5:
                            components.append({'box':box,'strength':float(heat[indices].mean()),'n':len(points)})
            components=sorted(components,key=lambda c:(-c['n'],-c['strength'],c['box']))[:3]
            refined=[]
            encoder_start=time.monotonic()
            for c in components:
                bounds=tuple(round(v*(im.width if j%2==0 else im.height)) for j,v in enumerate(c['box']))
                q=np.asarray(encoder.encode(im.crop(bounds)),dtype=np.float32)
                sim=q@catalog.T
                refined.append([float(sim[:,inds].max()) for inds in by_product])
            out=select_region_matches(current,np.asarray(refined),products) if refined else current
            result={'case':label,'threshold':threshold,'components':components,'refine_seconds':time.monotonic()-encoder_start,
                    'matches':serialize(out)}
            report.append(result);print('OBJECT_PROPOSALS',json.dumps(result),flush=True)
    (output/'region-report.json').write_text(json.dumps({'cases':report}))
