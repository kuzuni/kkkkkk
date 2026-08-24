from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
# body text: dark glyphs on cream. Find first text line height.
def lineheight(img,name,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1]; b=reg.mean(axis=2)
    dark=b<110
    rowden=dark.sum(axis=1)
    ys=np.where(rowden>4)[0]
    # first contiguous run = first line
    if len(ys)==0: print(name,'none');return
    runs=[];s=ys[0];p=ys[0]
    for y in ys[1:]:
        if y-p>6: runs.append((s,p));s=y
        p=y
    runs.append((s,p))
    print(name,'text lines (y+off, height):',[(r[0]+y0,r[1]+y0,r[1]-r[0]) for r in runs])
lineheight(ref,'REF body',1250,1420,120,900)
lineheight(cap,'CAP body',1040,1210,120,900)
