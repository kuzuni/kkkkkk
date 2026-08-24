from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)

def analyze_title(img,y0,y1,name):
    reg=img[y0:y1,120:960]
    bright=reg.mean(axis=2)
    black=bright<40          # pure black stroke
    fill =bright>170         # white/bright fill
    # bounding box of black (title outline)
    ys,xs=np.where(black)
    print(name,'black bbox y',ys.min()+y0,ys.max()+y0,'x',xs.min()+120,xs.max()+120)
    # ink height via fill
    fy,fx=np.where(fill)
    if len(fy):
        print(name,'fill bbox y',fy.min()+y0,fy.max()+y0,'x',fx.min()+120,fx.max()+120,'fill-height',fy.max()-fy.min())
    # stroke thickness: for each row measure horizontal black run lengths, take median of runs
    runs=[]
    for row in black:
        c=0
        for v in row:
            if v: c+=1
            else:
                if c>0: runs.append(c); c=0
        if c>0: runs.append(c)
    runs=np.array(runs)
    # outline stroke thickness ~ small runs; use median of runs between 2 and 25
    sr=runs[(runs>=1)&(runs<=30)]
    print(name,'black horiz runs median',np.median(sr),'mean',round(sr.mean(),1),'p25',np.percentile(sr,25),'p75',np.percentile(sr,75))
    # vertical stroke thickness
    vruns=[]
    for col in black.T:
        c=0
        for v in col:
            if v: c+=1
            else:
                if c>0: vruns.append(c);c=0
        if c>0: vruns.append(c)
    vruns=np.array(vruns); vr=vruns[(vruns>=1)&(vruns<=30)]
    print(name,'black vert runs median',np.median(vr),'mean',round(vr.mean(),1))

# ref title band approx y 700-815; cap 500-610
analyze_title(ref,690,815,'REF털실')
analyze_title(cap,485,615,'CAP검기')
