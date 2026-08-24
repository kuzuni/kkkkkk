from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
# restrict to dark-brown title band (glyph fill = white on brown)
def fillbox(img,y0,y1,name):
    reg=img[y0:y1,470:600]; b=reg.mean(axis=2)
    wf=b>175
    ys,xs=np.where(wf)
    print(name,'band',y0,y1,'white-fill H',ys.max()-ys.min(),'W',xs.max()-xs.min(),'top',ys.min()+y0,'bot',ys.max()+y0)
fillbox(ref,721,811,'REF털실')
fillbox(cap,512,602,'CAP검기')
