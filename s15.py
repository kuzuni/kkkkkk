from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
# find 보유효과 bar: left half is darker purple, right half lighter. It's a horizontal band.
def find_purpleband(img,name,y0,y1):
    r,g,b=img[:,:,0],img[:,:,1],img[:,:,2]
    pm=(b>g+15)&(b>110)&(r<170)&(g<160)  # bluish purple
    frac=pm[:,200:520].mean(axis=1)
    ys=np.where(frac>0.5)[0]; ys=ys[(ys>y0)&(ys<y1)]
    if len(ys): print(name,'보유효과 purple(left) band y',ys.min(),ys.max())
    return ys.min() if len(ys) else None,ys.max() if len(ys) else None
find_purpleband(ref,'ref',1200,1400)
find_purpleband(cap,'cap',1000,1200)
# colors of left(보유효과 label bg) and right(effect value bg)
def modecolor(img,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1].reshape(-1,3); q=(reg//8*8)
    vals,counts=np.unique(q,axis=0,return_counts=True)
    return vals[counts.argmax()].tolist(),int(counts.max()),len(reg)
print('REF 보유효과 left bg',modecolor(ref,1245,1290,210,420))
print('REF 보유효과 right bg',modecolor(ref,1245,1290,470,880))
print('CAP 보유효과 left bg',modecolor(cap,1235,1280,210,420))
print('CAP 보유효과 right bg',modecolor(cap,1235,1280,470,880))
