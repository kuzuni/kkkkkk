from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def wtext(img,name,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1]; b=reg.mean(axis=2)
    wf=b>200
    # column density, find text cluster (ignore sparse glare)
    colden=wf.sum(axis=0); rowden=wf.sum(axis=1)
    xs=np.where(colden>3)[0]; ys=np.where(rowden>3)[0]
    print(name,'강화 W',xs.max()-xs.min(),'H',ys.max()-ys.min(),'| x',xs.min()+x0,xs.max()+x0,'y',ys.min()+y0,ys.max()+y0)
wtext(ref,'REF',1595,1710,540,780)
wtext(cap,'CAP',1385,1500,600,840)
