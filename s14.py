from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def modecolor(img,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1].reshape(-1,3)
    # quantize
    q=(reg//8*8)
    vals,counts=np.unique(q,axis=0,return_counts=True)
    top=vals[counts.argsort()[::-1][:4]]
    return top, [int(c) for c in sorted(counts)[::-1][:4]]
# Gauge bar: ref around y 958-993 fill; unfilled segment to the right
# ref gauge full bar y ~960-992, x from ~430 to 790. Filled(yellow) left ~ to x600, unfilled x 620-780
print('REF gauge unfilled', modecolor(ref,962,988,650,780))
print('CAP gauge unfilled', modecolor(cap,750,778,700,880))
