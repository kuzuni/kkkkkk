from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
# dark-brown header bands: brownish, dark. Look in x[180:900]
def darkbrown(img):
    r,g,b=img[:,:,0],img[:,:,1],img[:,:,2]
    return (r>60)&(r<130)&(g>40)&(g<100)&(b>25)&(b<80)&(r>g)&(g>=b-5)
for name,img in [('ref',ref),('cap',cap)]:
    m=darkbrown(img)[:,180:900]
    frac=m.mean(axis=1)
    ys=np.where(frac>0.6)[0]
    bands=[]
    if len(ys):
        s=ys[0];p=ys[0]
        for y in ys[1:]:
            if y-p>4: bands.append((s,p));s=y
            p=y
        bands.append((s,p))
    print(name,'wide dark-brown bands(header rows)',[b for b in bands if b[1]-b[0]>10])
