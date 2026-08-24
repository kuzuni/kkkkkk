from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def box(img,y0,y1,name):
    reg=img[y0:y1,470:600]; b=reg.mean(axis=2)
    mask=(b<40)|(b>170)
    rowden=mask.sum(axis=1)
    ys=np.where(rowden>2)[0]
    print(name,'rows with glyph: top',ys.min()+y0,'bot',ys.max()+y0,'H',ys.max()-ys.min())
box(ref,700,815,'REF털실')
box(cap,490,615,'CAP검기')
