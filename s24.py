from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
reg=ref[1265:1390,120:900]; b=reg.mean(axis=2); dark=(b<110).sum(axis=1)
for i,v in enumerate(dark):
    print(1265+i, int(v), '#'*(int(v)//6))
