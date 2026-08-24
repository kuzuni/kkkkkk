from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def pill(img,name,y0,y1):
    r,g,b=img[:,:,0],img[:,:,1],img[:,:,2]
    db=(r>55)&(r<135)&(g>38)&(g<105)&(b>22)&(b<85)&(r>g)&(g>b)
    sub=db[y0:y1,340:660]
    colden=sub.sum(axis=0)
    xs=np.where(colden>(y1-y0)*0.25)[0]
    rowden=db[y0:y1,380:560].sum(axis=1)
    ys=np.where(rowden>60)[0]
    if len(xs): print(name,'pill x',xs.min()+340,xs.max()+340,'W',xs.max()-xs.min(),'| y',ys.min()+y0 if len(ys) else '-',ys.max()+y0 if len(ys) else '-','H',(ys.max()-ys.min()) if len(ys) else '-')
pill(ref,'REF',825,905)
pill(cap,'CAP',615,695)
