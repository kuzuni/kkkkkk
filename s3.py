from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
for name,img,lo in [('ref',ref,500),('cap',cap,300)]:
    rb=img[:,140:940,:].mean(axis=(1,2))
    # panel top: first row after lo where rb jumps above 150 sustained
    r=None
    for y in range(lo,img.shape[0]-30):
        if (rb[y:y+30]>150).all():
            r=y;break
    print(name,'panel top(border-in to cream) ~',r)
    # print rb around it
