from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def prof(img,name,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1]; b=reg.mean(axis=2); wf=(b>210).sum(axis=0)
    s=''.join('#' if v>10 else ('.' if v>3 else ' ') for v in wf)
    print(name,'('+str(x0)+')',s)
prof(ref,'REF',1615,1680,530,780)
prof(cap,'CAP',1405,1470,590,860)
