from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def stroke(img,y0,y1,x0,x1,name):
    reg=img[y0:y1,x0:x1]
    black=reg.mean(axis=2)<40
    fill=reg.mean(axis=2)>170
    # outline thickness: scan each column, the top black run before fill begins = top outline thickness
    tops=[]
    for cx in range(black.shape[1]):
        col=black[:,cx]; fcol=fill[:,cx]
        fys=np.where(fcol)[0]
        if len(fys)==0: continue
        f0=fys[0]  # first fill row
        # count black immediately above f0
        t=0; y=f0-1
        while y>=0 and col[y]: t+=1; y-=1
        if 1<=t<=25: tops.append(t)
    tops=np.array(tops)
    print(name,'top-outline thickness  n',len(tops),'median',np.median(tops),'mean',round(tops.mean(),1))
    # fill height per column
    fh=[]
    for cx in range(fill.shape[1]):
        fys=np.where(fill[:,cx])[0]
        if len(fys): fh.append(fys.max()-fys.min())
    print(name,'fill height median',np.median(fh))
stroke(ref,715,805,490,590,'REF털실')
stroke(cap,505,605,488,586,'CAP검기')
