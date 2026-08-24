from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def prof(img,name,y0,y1,x0,x1,thr):
    reg=img[y0:y1,x0:x1]; b=reg.mean(axis=2); wf=b>thr
    rowden=wf.sum(axis=1)
    for i,v in enumerate(rowden): print(name,y0+i,int(v),'#'*(int(v)//4))
# ref left header "낮 쿨타임" x230-470
prof(ref,'REF',1052,1100,230,470,150)
print('---')
prof(cap,'CAP',842,890,270,470,150)
