"""Isolated diagnosis of multi-fixture query; no runtime changes."""
import hashlib,json,shutil
import numpy as np

def probe(output, products, rows, mapping, image_cache, encoder, fixtures):
    from customer_visual_features import decode_image,image_hashes,rank_images
    from customer_design_ranking import encode_details,unpack_details,needs_detail_check
    targets={f"SGE-HL-{n:03d}" for n in range(72,80)}
    assets=output/"diagnostic-assets"
    assets.mkdir(exist_ok=True)
    for p in products:
        if p["sku"] in targets:
            for i,url in enumerate(p.get("images") or []):
                from evaluate_customer_references import canonical
                src=image_cache/hashlib.sha256(canonical(url).encode()).hexdigest()
                if src.exists(): shutil.copy(src,assets/(p["sku"]+f"-{i}.image"))
    im=decode_image((fixtures/"pendants-room.jpg").read_bytes())
    boxes={"whole":(0,0,1,1),"left_fixture":(.14,.41,.32,.94),
           "middle_fixture":(.35,.38,.53,.76),"right_fixture":(.59,.38,.77,.77)}
    # A generic grid is a diagnostic candidate, not a shipped change.
    for yi,(y0,y1) in enumerate(((.25,.75),(.4,1))):
        for xi in range(4):
            x0=xi*.2
            boxes[f"grid_{yi}_{xi}"]=(x0,y0,x0+.4,y1)
    stored=[]
    for row in rows:
        f=output/"design-features"/(row["sha256"]+".json")
        if f.exists(): data=np.asarray(json.loads(f.read_text())["patches"],dtype="<f2").tobytes()
        else:
            data=encode_details(encoder,decode_image((image_cache/hashlib.sha256(row["url"].encode()).hexdigest()).read_bytes()))
        stored.append(unpack_details(data))
    results=[]
    for name,box in boxes.items():
        crop=im.crop(tuple(round(v*(im.width if i%2==0 else im.height)) for i,v in enumerate(box)))
        vectors=encoder.encode_query(crop)
        scores={}
        detail_scores={}
        query=unpack_details(encode_details(encoder,crop))
        for row,detail in zip(rows,stored):
            score=float(np.max(np.asarray(vectors)@np.asarray(row["vectors"]).T))
            sim=query@detail.T
            ds=float((sim.max(axis=0).mean()+sim.max(axis=1).mean())/2)
            for p in mapping[row["url"]]:
                sku=p["sku"]
                scores[sku]=max(score,scores.get(sku,-1))
                detail_scores[sku]=max(ds,detail_scores.get(sku,-1))
        order=sorted(scores,key=lambda k:-scores[k])
        dorder=sorted(detail_scores,key=lambda k:-detail_scores[k])
        baseline=rank_images({"sha256":"","pixels":""},vectors,rows,mapping,60)
        result={"case":name,"detail_gate":needs_detail_check(baseline),
          "top12":[{"sku":k,"score":scores[k]} for k in order[:12]],
          "detail_top12":[{"sku":k,"score":detail_scores[k]} for k in dorder[:12]],
          "expected":[{"sku":k,"rank":order.index(k)+1,"score":scores[k],
                       "detail_rank":dorder.index(k)+1,"detail_score":detail_scores[k]}
                      for k in sorted(targets) if k in scores]}
        results.append(result)
        print("ROOM_DIAGNOSIS",json.dumps(result),flush=True)
    (output/"design-probe.json").write_text(json.dumps({"products":len(products),"images":len(rows),"results":results},indent=2))
