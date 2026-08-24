from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def blacktext(img,name,y0,y1):
    reg=img[y0:y1,585:790]; b=reg.mean(axis=2); bl=b<45
    colden=bl.sum(axis=0); rowden=bl.sum(axis=1)
    # exclude button border columns: border is at extreme left/right of 585-790. Find interior text cluster
    xs=np.where(colden>2)[0]
    ys=np.where(rowden>2)[0]
    print(name,'colden:',list(colden))
    print(name,'x',xs.min()+585,xs.max()+585,'W',xs.max()-xs.min(),'H',ys.max()-ys.min())
blacktext(ref,'REF',1600,1695)
blacktext(cap,'CAP',1390,1485)
