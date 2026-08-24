from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def iconbox(img,name,y0,y1):
    sub=img[y0:y1,120:360]; bs=sub.mean(axis=2)
    notc=bs<195
    rowden=notc.mean(axis=1); colden=notc.mean(axis=0)
    ys=np.where(rowden>0.5)[0]; xs=np.where(colden>0.5)[0]
    print(name,'iconbox y',ys.min()+y0,ys.max()+y0,'H',ys.max()-ys.min(),'x',xs.min()+120,xs.max()+120,'W',xs.max()-xs.min())
iconbox(ref,'REF',820,1010)
iconbox(cap,'CAP',610,800)
# rarity pill (커먼/일반) - dark brown rounded, x ~340-560 top row
def pill(img,name,y0,y1):
    r,g,b=img[:,:,0],img[:,:,1],img[:,:,2]
    db=(r>60)&(r<130)&(g>40)&(g<100)&(b>25)&(b<80)&(r>g)
    sub=db[y0:y1,340:640]
    colden=sub.sum(axis=0); rowden=sub.sum(axis=1)
    xs=np.where(colden>(y1-y0)*0.3)[0]; ys=np.where(rowden> (300)*0.3)[0]
    if len(xs): print(name,'pill x',xs.min()+340,xs.max()+340,'W',xs.max()-xs.min(),'y',ys.min()+y0 if len(ys) else '-',ys.max()+y0 if len(ys) else '-')
pill(ref,'REF',830,900)
pill(cap,'CAP',620,690)
