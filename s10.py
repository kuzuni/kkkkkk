from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def glyphbox(img,y0,y1,x0,x1,name):
    reg=img[y0:y1,x0:x1]; b=reg.mean(axis=2)
    mask=(b<40)|(b>170)   # outline+fill = glyph
    # limit to columns that are title (central)
    ys,xs=np.where(mask)
    print(name,'glyph block: y',ys.min()+y0,ys.max()+y0,'H',ys.max()-ys.min(),'| x',xs.min()+x0,xs.max()+x0,'W',xs.max()-xs.min())
    # white fill only
    wf=b>170; wy,wx=np.where(wf)
    print(name,'white-fill: H',wy.max()-wy.min(),'W',wx.max()-wx.min())
glyphbox(ref,715,805,488,590,'REF털실')
glyphbox(cap,505,608,488,588,'CAP검기')
