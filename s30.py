from PIL import Image
import numpy as np
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
reg=cap[1405:1475,600:860]; b=reg.mean(axis=2); wf=b>205
colden=wf.sum(axis=0); xs=np.where(colden>8)[0]
rowden=wf.sum(axis=1); ys=np.where(rowden>15)[0]
print('CAP 강화 W',xs.max()-xs.min(),'H',ys.max()-ys.min(),'x',xs.min()+600,xs.max()+600)
