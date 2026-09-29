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
    report=[]; matrices={}
    for ci,(label,data) in enumerate(cases):
        im=decode_image(data); hashes=image_hashes(data,im); vectors=encoder.encode_query(im)
        base=rank_images(hashes,vectors,augmented,amap)
        current=base
        if needs_detail_check(base): current=promote_detail_match(rank_images(hashes,vectors,augmented,amap,60),encode_details(encoder,im),rows,mapping)
        current=add_related_designs(current,products,load_relations())
        result={'case':label,'current':[{'sku':m['product']['sku'],'score':m['score'],'type':m['match_type']} for m in current]}
        run=bool(base and base[0]['match_type'] in ('similar','possible') and base[0]['score']<.80)
        start=time.monotonic()
        if run:
            regional=[]
            for box in boxes:
                bounds=tuple(round(v*(im.width if i%2==0 else im.height)) for i,v in enumerate(box))
                q=np.asarray(encoder.encode(im.crop(bounds)),dtype=np.float32)
                scores=(q@catalog.T).max(axis=0)
                regional.append([float(scores[ix].max()) if ix else 0 for ix in by_product])
            matrices['case_'+str(ci)]=np.asarray(regional,dtype=np.float32)
            result['matrix']='case_'+str(ci)
        result['region_seconds']=time.monotonic()-start
        report.append(result)
        print('REGION_CASE',label,'scan',run,'seconds',result['region_seconds'],flush=True)
    (output/'region-report.json').write_text(json.dumps({'skus':skus,'boxes':boxes,'cases':report}))
    np.savez_compressed(output/'region-scores.npz',**matrices)
