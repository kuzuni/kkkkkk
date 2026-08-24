from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
# 강화 white text on gray button. Right button.
def wtext(img,name,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1]; b=reg.mean(axis=2)
    wf=b>190
    ys,xs=np.where(wf)
    if len(xs)==0: print(name,'none');return
    print(name,'강화 white text W',xs.max()-xs.min(),'H',ys.max()-ys.min(),'x',xs.min()+x0,xs.max()+x0,'y',ys.min()+y0,ys.max()+y0)
# ref right button ~ y1620-1720, x560-760 ; cap y1410-1510 x620-820
wtext(ref,'REF 강화',1600,1720,540,770)
wtext(cap,'CAP 강화',1390,1510,600,830)
# also 장착 vs 해제 differ (diff string) skip width. But blue button box geometry:
def boxc(img,name,y0,y1,x0,x1,cond):
    reg=img[y0:y1,x0:x1]
    m=cond(reg)
    ys,xs=np.where(m)
    if len(xs): print(name,'x',xs.min()+x0,xs.max()+x0,'W',xs.max()-xs.min(),'y',ys.min()+y0,ys.max()+y0,'H',ys.max()-ys.min())
blue=lambda r:(r[:,:,2]>190)&(r[:,:,1]>170)&(r[:,:,0]<150)&(r[:,:,0]>40)
boxc(ref,'REF blue btn',1560,1730,200,470,blue)
boxc(cap,'CAP blue btn',1350,1520,200,470,blue)
gray=lambda r:(abs(r[:,:,0]-r[:,:,1])<12)&(abs(r[:,:,1]-r[:,:,2])<12)&(r[:,:,0]>120)&(r[:,:,0]<200)
boxc(ref,'REF gray btn',1560,1730,500,780,gray)
boxc(cap,'CAP gray btn',1350,1520,500,780,gray)
