from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
# "Lv. 8" white text on dark pill at left of gauge. ref gauge y~958-993, pill left of x494
def lvlabel(img,name,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1]; b=reg.mean(axis=2); wf=b>190
    colden=wf.sum(axis=0); rowden=wf.sum(axis=1)
    xs=np.where(colden>1)[0]; ys=np.where(rowden>1)[0]
    print(name,'Lv.8 white W',xs.max()-xs.min(),'H',ys.max()-ys.min(),'x',xs.min()+x0,xs.max()+x0,'y',ys.min()+y0,ys.max()+y0)
lvlabel(ref,'REF',945,1005,300,470)
lvlabel(cap,'CAP',735,795,300,470)
# header label "쿨타임" -- ref "낮 쿨타임"/"밤 쿨타임"; cap "쿨타임"/"피해량". white/cream text on dark band.
# compare glyph HEIGHT only (font size). ref band y1055-1095, cap 845-885
def hdrH(img,name,y0,y1):
    reg=img[y0:y1,200:900]; b=reg.mean(axis=2); wf=b>170
    rowden=wf.sum(axis=1); ys=np.where(rowden>10)[0]
    print(name,'header text H',ys.max()-ys.min(),'y',ys.min()+y0,ys.max()+y0)
hdrH(ref,'REF hdr',1050,1105)
hdrH(cap,'CAP hdr',840,895)
