from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
# "스킬 설명" pill: dark brown rounded, cream text, centered. ref ~y1195, cap ~985
def pill(img,name,y0,y1):
    r,g,b=img[:,:,0],img[:,:,1],img[:,:,2]
    db=(r>55)&(r<135)&(g>38)&(g<105)&(b>22)&(b<85)&(r>=g)&(g>=b-3)
    sub=db[y0:y1,340:740]; colden=sub.sum(axis=0)
    xs=np.where(colden>(y1-y0)*0.3)[0]
    if len(xs): print(name,'스킬설명 pill x',xs.min()+340,xs.max()+340,'W',xs.max()-xs.min())
    # text height (cream on brown)
    reg=img[y0:y1,380:700]; bb=reg.mean(axis=2); wf=bb>150
    rowden=wf.sum(axis=1); ys=np.where(rowden>8)[0]
    if len(ys): print(name,'  text H',ys.max()-ys.min(),'y',ys.min()+y0,ys.max()+y0)
pill(ref,'REF',1180,1240)
pill(cap,'CAP',970,1030)
