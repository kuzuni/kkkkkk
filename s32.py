from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def blacktext(img,name,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1]; b=reg.mean(axis=2); bl=b<45
    colden=bl.sum(axis=0); rowden=bl.sum(axis=1)
    xs=np.where(colden>2)[0]; ys=np.where(rowden>2)[0]
    print(name,'강화 black-outline W',(xs.max()-xs.min()) if len(xs) else '-','H',(ys.max()-ys.min()) if len(ys) else '-','x',(xs.min()+x0,xs.max()+x0) if len(xs) else '-','y',(ys.min()+y0,ys.max()+y0) if len(ys) else '-')
# inset to avoid button border: ref btn x593-779 -> inset 610-762; y interior 1600-1695
blacktext(ref,'REF',1595,1700,608,765)
blacktext(cap,'CAP',1385,1495,668,825)
