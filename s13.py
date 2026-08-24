from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def strokethk(img,y0,y1,name):
    reg=img[y0:y1,470:600]; b=reg.mean(axis=2)
    black=b<40
    # measure black run thickness where it's the outline (adjacent to fill). Use vertical runs on left/right edges + horizontal top/bottom
    hruns=[]
    for row in black:
        c=0
        for v in row:
            if v:c+=1
            else:
                if c:hruns.append(c);c=0
        if c:hruns.append(c)
    hruns=np.array([r for r in hruns if 1<=r<=15])
    vruns=[]
    for col in black.T:
        c=0
        for v in col:
            if v:c+=1
            else:
                if c:vruns.append(c);c=0
        if c:vruns.append(c)
    vruns=np.array([r for r in vruns if 1<=r<=15])
    print(name,'H-run median',np.median(hruns),'p40',round(np.percentile(hruns,40),1),
          '| V-run median',np.median(vruns),'p40',round(np.percentile(vruns,40),1),
          '| black frac',round(black.mean(),3))
strokethk(ref,721,811,'REF털실')
strokethk(cap,512,602,'CAP검기')
