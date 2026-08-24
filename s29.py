from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
# 강화 text = white fill; measure white but restrict to INTERIOR (avoid button rim by insetting x,y)
def wtext(img,name,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1]; b=reg.mean(axis=2)
    wf=b>205
    colden=wf.sum(axis=0)
    # find contiguous text columns: threshold higher
    xs=np.where(colden>8)[0]
    rowden=wf.sum(axis=1); ys=np.where(rowden>15)[0]
    print(name,'강화 W',(xs.max()-xs.min()) if len(xs) else '-','H',(ys.max()-ys.min()) if len(ys) else '-','x',(xs.min()+x0,xs.max()+x0) if len(xs) else '-')
# inset windows well inside buttons, below the top rim
wtext(ref,'REF',1615,1685,555,765)
wtext(cap,'CAP',1405,1475,615,825)
