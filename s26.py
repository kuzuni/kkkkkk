from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def wtext(img,name,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1]; b=reg.mean(axis=2)
    wf=b>195
    ys,xs=np.where(wf)
    # column density to find text x-extent (exclude button top glare)
    print(name,'W',xs.max()-xs.min(),'H',ys.max()-ys.min(),'xrange',xs.min()+x0,xs.max()+x0,'yrange',ys.min()+y0,ys.max()+y0)
wtext(ref,'REF 강화',1610,1700,555,760)
wtext(cap,'CAP 강화',1400,1490,615,820)
# button outer box via dark border
def btnbox(img,name,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1]; b=reg.mean(axis=2)
    dark=b<60
    rowden=dark.sum(axis=1); colden=dark.sum(axis=0)
    ys=np.where(rowden>30)[0]; xs=np.where(colden>20)[0]
    if len(ys) and len(xs):
        print(name,'outer y',ys.min()+y0,ys.max()+y0,'H',ys.max()-ys.min(),'x',xs.min()+x0,xs.max()+x0,'W',xs.max()-xs.min())
btnbox(ref,'REF blueBtn outer',1550,1740,220,500)
btnbox(cap,'CAP blueBtn outer',1340,1530,220,500)
