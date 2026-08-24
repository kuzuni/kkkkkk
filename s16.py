from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def scanpurple(img,name,y0,y1):
    r,g,b=img[:,:,0],img[:,:,1],img[:,:,2]
    pm=(b>g+15)&(b>120)&(r<170)
    frac=pm[:,200:500].mean(axis=1)
    for y in range(y0,y1):
        if frac[y]>0.4: 
            pass
    ys=[y for y in range(y0,y1) if frac[y]>0.4]
    if ys: print(name,'purple-left rows',min(ys),max(ys))
    else: print(name,'no purple band in',y0,y1)
scanpurple(ref,'REF',1150,1550)
scanpurple(cap,'CAP',950,1350)
