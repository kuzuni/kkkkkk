from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def rows_mask(img,cond):
    m=cond(img)  # HxW bool
    frac=m.mean(axis=1)
    ys=np.where(frac>0.05)[0]
    # group into bands
    bands=[]
    if len(ys):
        s=ys[0];p=ys[0]
        for y in ys[1:]:
            if y-p>5:
                bands.append((s,p));s=y
            p=y
        bands.append((s,p))
    return bands
R,G,B=0,1,2
def yellow(img):
    return (img[:,:,R]>200)&(img[:,:,G]>150)&(img[:,:,B]<90)
def purple(img):
    return (img[:,:,R]>90)&(img[:,:,R]<160)&(img[:,:,B]>140)&(img[:,:,G]<140)&(abs(img[:,:,B]-img[:,:,R])>20)
def blue(img):
    return (img[:,:,B]>190)&(img[:,:,G]>170)&(img[:,:,R]<150)&(img[:,:,R]>40)
for name,img in [('ref',ref),('cap',cap)]:
    print('==',name)
    print(' yellow bands',[b for b in rows_mask(img,yellow) if b[1]-b[0]>8])
    print(' blue bands',[b for b in rows_mask(img,blue) if b[1]-b[0]>15])
