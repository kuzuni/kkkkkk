from PIL import Image
import numpy as np
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
reg=cap[1050:1110,120:900]; b=reg.mean(axis=2); dark=(b<110).sum(axis=1)
for i,v in enumerate(dark):
    if v>3: print(1050+i,int(v),'#'*(int(v)//8))
