import os,time,json
from pathlib import Path
import sys
sys.path.insert(0,'backend')
from customer_visual_features import VisualEncoder,MODEL_REPO,MODEL_REVISION,decode_image
from huggingface_hub import hf_hub_download
model=hf_hub_download(MODEL_REPO,'onnx/model.onnx',revision=MODEL_REVISION)
os.environ['CUSTOMER_IMAGE_MODEL_PATH']=model
from scripts.evaluate_customer_references import deny_network
deny_network()
import onnxruntime as ort
import numpy as np
photo=decode_image(Path('tests/fixtures/customer-reference-evaluation/pendants-room.jpg').read_bytes())
real=ort.InferenceSession
affinity=os.sched_getaffinity(0)
def limit_all(cpus):
    for tid in os.listdir('/proc/self/task'):
        try: os.sched_setaffinity(int(tid),cpus)
        except ProcessLookupError: pass
for scope,cpus in [('runner',affinity),('one_cpu',{min(affinity)})]:
    limit_all(cpus)
    for threads in [2,1]:
        def session(*args,**kwargs):
            kwargs['sess_options'].intra_op_num_threads=threads
            return real(*args,**kwargs)
        ort.InferenceSession=session
        encoder=VisualEncoder();encoder.load()
        limit_all(cpus)
        vals=[]
        for _ in range(3):
            start=time.monotonic()
            vectors=encoder.encode_query(photo)
            vals.append(time.monotonic()-start)
        if threads==2: previous=np.asarray(vectors)
        print('CPU_PROFILE',json.dumps({'scope':scope,'threads':threads,'seconds':vals,'max_difference':float(np.abs(np.asarray(vectors)-previous).max())}),flush=True)
        del encoder
limit_all(affinity)
