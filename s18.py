from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
# Gauge bar geometry: detect the gauge (yellow+bluegray) band and its x extent
def gauge(img,name,y0,y1):
    r,g,b=img[:,:,0],img[:,:,1],img[:,:,2]
    yellow=(r>200)&(g>150)&(b<90)
    bluegray=(b>g+15)&(b>130)&(r<170)&(r>90)
    bar=yellow|bluegray
    sub=bar[y0:y1]
    colden=sub.sum(axis=0)
    xs=np.where(colden> (y1-y0)*0.4)[0]
    ys=np.where(bar[:, (xs.min()+xs.max())//2 if len(xs) else 600].astype(int))[0]
    if len(xs): print(name,'gauge bar x',xs.min(),xs.max(),'W',xs.max()-xs.min())
    # yellow fill extent
    ysx=np.where(yellow[y0:y1].sum(axis=0)>(y1-y0)*0.4)[0]
    if len(ysx): print(name,'  yellow fill x',ysx.min(),ysx.max(),'W',ysx.max()-ysx.min())
gauge(ref,'REF',960,990)
gauge(cap,'CAP',748,778)
