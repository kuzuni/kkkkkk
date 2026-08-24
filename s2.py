from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)

def scan(img,name):
    # brightness along column x=540
    prof=img[:,540,:].mean(axis=1)
    # find rows > 200 (cream)
    bright=np.where(prof>190)[0]
    print(name,'first bright col540',bright.min() if len(bright) else None,'last',bright.max() if len(bright) else None)
scan(ref,'ref'); scan(cap,'cap')

# find title band: title text is dark on cream, band top = popup top border
# Detect popup outer top border: transition from dark bg to dark-brown border to cream
# Let's print brightness profile around expected regions
for name,img in [('ref',ref),('cap',cap)]:
    prof=img[:,540,:].mean(axis=1)
    # scan from top find first row where a run of >=20 rows are >190
    r=None
    for y in range(img.shape[0]-25):
        if (prof[y:y+25]>190).all():
            r=y;break
    print(name,'panel cream start col540',r)
