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
        region_scores=[]
        for box in boxes:
            mask=foreground & (xy[:,0]>=box[0]) & (xy[:,0]<box[2]) & (xy[:,1]>=box[1]) & (xy[:,1]<box[3])
            by_id={}
            if mask.sum()>=4:
                for i,row in enumerate(rows):
                    a=similarity[mask,starts[i]:starts[i+1]]
                    score=float((a.max(axis=0).mean()+a.max(axis=1).mean())/2)
                    for prod in mapping[row['url']]:by_id[prod['id']]=max(by_id.get(prod['id'],-1),score)
            region_scores.append(max(by_id.values(),default=-1))
        selected=[]
        for i in np.argsort(-np.asarray(region_scores),kind='stable'):
            if all(region_iou(boxes[i],boxes[old])<.3 for old in selected):selected.append(int(i))
            if len(selected)==3:break
        coarse_elapsed=time.monotonic()-t
        worker=RegionEncoder(encoder,time.monotonic()+60,threading.Event())
        refined=[]
        for i in selected:
            box=boxes[i];bounds=tuple(round(v*(im.width if j%2==0 else im.height)) for j,v in enumerate(box))
            crop=im.crop(bounds);q=worker.encode(crop)
            for subbox in ((.15,0,.85,.6),(.15,.4,.85,1)):
                sub=tuple(round(v*(crop.width if j%2==0 else crop.height)) for j,v in enumerate(subbox))
                q.extend(worker.encode(crop.crop(sub)))
            a=np.asarray(q,dtype=np.float32)@catalog.T
            refined.append([float(a[:,inds].max()) for inds in by_product])
        out=select_region_matches(current,np.asarray(refined),products)
        result={'case':label,'selected':selected,'region_scores':region_scores,'coarse_seconds':coarse_elapsed,'total_seconds':time.monotonic()-t,
                'matches':[{'sku':m['product']['sku'],'score':m['score'],'type':m['match_type']} for m in out]}
        report.append(result);print('PATCH_PROPOSALS',json.dumps(result),flush=True)
    (output/'region-report.json').write_text(json.dumps({'cases':report}))
