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
    import onnxruntime as ort
    import customer_region_search as regions
    from customer_visual_features import VisualEncoder
    from pathlib import Path
    cgroup=Path('/sys/fs/cgroup') / Path('/proc/self/cgroup').read_text().strip().split('::')[-1].lstrip('/')
    quota=(cgroup/'cpu.max').read_text().strip()
    print('ACTUAL_CPU_QUOTA',quota,flush=True)
    assert quota.split()[0]!='max' and int(quota.split()[0])/int(quota.split()[1])==.5

    print('MODEL_INPUT',[(x.name,x.shape) for x in encoder.session.get_inputs()],flush=True)
    import customer_region_encoder as re
    from PIL import Image
    original_input=re.model_input

    import onnx,copy
    from onnx import numpy_helper
    source=onnx.load(os.environ['CUSTOMER_IMAGE_MODEL_PATH'])
    print('POSITION_TENSORS',[(t.name,list(t.dims)) for t in source.graph.initializer if list(t.dims)==[1,257,384]],flush=True)
    sessions={224:encoder.session}
    for side in (168,140,112):
        graph=copy.deepcopy(source)
        tensors=list(graph.graph.initializer)
        tensors += [attr.t for node in graph.graph.node for attr in node.attribute if attr.type==onnx.AttributeProto.TENSOR]
        count=0
        for tensor in tensors:
            if list(tensor.dims)!=[1,257,384]:continue
            a=numpy_helper.to_array(tensor)
            grid=a[:,1:,:].reshape(16,16,384)
            reduced=np.stack([np.asarray(Image.fromarray(grid[:,:,i]).resize((side//14,side//14),Image.Resampling.BICUBIC)) for i in range(384)],axis=-1).reshape(1,-1,384)
            arr=np.concatenate([a[:,:1,:],reduced],axis=1)
            tensor.CopyFrom(numpy_helper.from_array(arr.astype(np.float32),name=tensor.name));count+=1
        print('POSITION_RESIZED',side,count,flush=True)
        assert count==1
        options=ort.SessionOptions();options.intra_op_num_threads=1;options.inter_op_num_threads=1
        sessions[side]=ort.InferenceSession(graph.SerializeToString(),sess_options=options,providers=['CPUExecutionProvider'])
    report=[]
    for label,data in cases[:2]:
        im=decode_image(data); hashes=image_hashes(data,im); vectors=encoder.encode_query(im)
        current=rank_images(hashes,vectors,augmented,amap)
        serialize=lambda out:[{'sku':m['product']['sku'],'score':m['score'],'type':m['match_type']} for m in out]
        result={'case':label,'attempts':[]}
        for size in (224,168,140,112):
            def resized(image):
                arr=original_input(image)
                if size==224:return arr
                return np.stack([np.asarray(Image.fromarray(ch).resize((size,size),Image.Resampling.BICUBIC)) for ch in arr[0]])[None].astype(np.float32)
            re.model_input=resized
            encoder.session=sessions[size]
            regions.REGION_SECONDS=60
            diagnostic={}
            try:
                out=regions.rescue_region_matches(encoder,im,rows,mapping,current,threading.Event(),diagnostic)
                entry={'size':size,'matches':serialize(out),'diagnostic':diagnostic}
            except Exception as exc:
                entry={'size':size,'error':repr(exc)}
            finally:
                re.model_input=original_input
                encoder.session=sessions[224]
            result['attempts'].append(entry)
            print('RESOLUTION_BENCHMARK',label,json.dumps(entry),flush=True)
        report.append(result)
    (output/'region-report.json').write_text(json.dumps({'cpu_quota':quota,'products':len(products),'images':len(rows),'cases':report}))
