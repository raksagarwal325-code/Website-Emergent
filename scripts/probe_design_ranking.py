"""Offline experiment; no application imports this module."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import ImageOps, Image


def describe(encoder, image):
    from customer_visual_features import model_input
    view = ImageOps.pad(image, (256, 256), method=Image.Resampling.BICUBIC, color='white')
    pixels = model_input(view)
    with encoder.lock:
        tokens = encoder.session.run(['last_hidden_state'], {'pixel_values': pixels})[0][0, 1:]
    rgb = (pixels[0].transpose(1, 2, 0) * np.array([.229,.224,.225]) + np.array([.485,.456,.406])) * 255
    grid = int(np.sqrt(len(tokens)))
    patch = rgb.reshape(grid,224//grid,grid,224//grid,3).transpose(0,2,1,3,4).reshape(grid*grid,-1,3)
    variation = patch.std(axis=1).mean(axis=1)
    brightness = patch.mean(axis=(1,2))
    mask = (variation > 8) & (brightness > 15) & (brightness < 245)
    if mask.sum() < 8:
        mask[:] = True
    selected = tokens[mask]
    pooled = selected.mean(axis=0)
    pooled /= max(np.linalg.norm(pooled),1e-12)
    selected = selected / np.maximum(np.linalg.norm(selected,axis=1,keepdims=True),1e-12)
    # Evenly cover the fixture's spatial extent; independent of any SKU/label.
    selected = selected[np.linspace(0,len(selected)-1,min(32,len(selected))).round().astype(int)]
    return {'pooled':pooled.tolist(),'patches':selected.tolist()}


def probe(output, products, rows, mapping, image_cache, encoder, fixtures):
    from customer_visual_features import decode_image, image_hashes, rank_images
    from evaluate_customer_references import jpeg_variant, selected_controls, canonical, overlay_references
    cache = output/'design-features'
    cache.mkdir(exist_ok=True)
    features = []
    for i,row in enumerate(rows):
        file = cache/(row['sha256']+'.json')
        if file.exists():
            feature = json.loads(file.read_text())
        else:
            data = (image_cache/hashlib.sha256(row['url'].encode()).hexdigest()).read_bytes()
            feature = describe(encoder,decode_image(data))
            file.write_text(json.dumps(feature))
        features.append(feature)
        if i%100 == 0: print('DESIGN FEATURES',i,len(rows),flush=True)
    augmented_rows, augmented_map, _ = overlay_references(products,rows,mapping,encoder)
    cases = []
    for sku,file in [('CH-029','ch-029-variant.jpg'),('CS-001','cs-001.jpg'),('CS-002','cs-002.jpg'),('WL-085','wl-085.jpg'),('WL-060','wl-060.jpg'),('HL-114','hl-114.jpg'),('Meher','meher.jpg')]:
        data=(fixtures/file).read_bytes()
        cases.append((sku+' original',data))
        cases.append((sku+' compressed',jpeg_variant(decode_image(data))))
    for sku,box in [('CS-001',(.35,0,.8,.12)),('WL-085',(.64,.35,.9,.78)),('CS-002',(0,.5,.3,.85))]:
        im=decode_image((fixtures/(sku.lower()+'.jpg')).read_bytes())
        bounds=tuple(round(v*(im.width if i%2==0 else im.height)) for i,v in enumerate(box))
        cases.append((sku+' negative',jpeg_variant(im.crop(bounds))))
    for p in selected_controls(products):
        data=(image_cache/hashlib.sha256(canonical(p['images'][0]).encode()).hexdigest()).read_bytes()
        cases.append((p['sku']+' control',jpeg_variant(decode_image(data))))
    pooled=np.asarray([f['pooled'] for f in features],dtype=np.float32)
    report=[]
    for label,data in cases:
        im=decode_image(data)
        q=np.asarray(encoder.encode_query(im),dtype=np.float32)
        d=describe(encoder,im)
        local=np.asarray(d['patches'],dtype=np.float32)
        global_scores=np.asarray([np.max(q@np.asarray(r['vectors'],dtype=np.float32).T) for r in rows])
        pool_scores=pooled@np.asarray(d['pooled'],dtype=np.float32)
        patch_scores=[]
        containment_scores=[]
        for f in features:
            similarity=local@np.asarray(f['patches'],dtype=np.float32).T
            containment_scores.append(float(similarity.max(axis=1).mean()))
            patch_scores.append((similarity.max(axis=0).mean()+similarity.max(axis=1).mean())/2)
        patch_scores=np.asarray(patch_scores)
        methods={'original':global_scores,'pooled':pool_scores,'patch':patch_scores,
                 'containment':np.asarray(containment_scores),'containment_blend':.5*global_scores+.5*np.asarray(containment_scores),
                 'pool_blend':.5*global_scores+.5*pool_scores,'patch_blend':.5*global_scores+.5*patch_scores}
        result={'case':label,'current':[{'sku':m['product']['sku'],'type':m['match_type'],'score':m['score']} for m in rank_images(image_hashes(data,im),q.tolist(),augmented_rows,augmented_map)],'methods':{}}
        for method,scores in methods.items():
            best={}
            for row,score in zip(rows,scores):
                for p in mapping[row['url']]:
                    if p['sku'] not in best or score>best[p['sku']]: best[p['sku']]=float(score)
            result['methods'][method]=sorted(best.items(),key=lambda x:-x[1])
        report.append(result)
        (output/'design-probe.json').write_text(json.dumps(report))
        print('DESIGN QUERY',label,flush=True)
    (output/'design-probe.json').write_text(json.dumps(report))
