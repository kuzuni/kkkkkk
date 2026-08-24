from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
# icon box: dark brown border square top-left of body. Find via dark-brown frame around x150-320
def iconbox(img,name,y0,y1):
    r,g,b=img[:,:,0],img[:,:,1],img[:,:,2]
    # the icon inner has bright content; border dark. Detect box by scanning region x140-330
    # Use edge: find contiguous non-cream block
    sub=img[y0:y1,140:340]; bs=sub.mean(axis=2)
    # box present where not cream (>210). 
    notc=bs<200
    rowden=notc.mean(axis=1); colden=notc.mean(axis=0)
    ys=np.where(rowden>0.5)[0]; xs=np.where(colden>0.5)[0]
    if len(ys) and len(xs):
        print(name,'iconbox y',ys.min()+y0,ys.max()+y0,'H',ys.max()-ys.min(),'x',xs.min()+140,xs.max()+140,'W',xs.max()-xs.min())
iconbox(ref,'REF',850,1000)
iconbox(cap,'CAP',640,790)
