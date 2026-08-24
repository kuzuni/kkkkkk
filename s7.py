from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def coltxt(img,y0,y1,name):
    reg=img[y0:y1]
    black=reg.mean(axis=2)<40
    colden=black.sum(axis=0)
    cols=np.where(colden>3)[0]
    # central cluster: title near center x 540
    cols=cols[(cols>300)&(cols<780)]
    print(name,'title x range',cols.min(),cols.max(),'width',cols.max()-cols.min())
    return cols.min(),cols.max()
# title y bands (glyph only, excluding bar borders)
coltxt(ref,720,800,'REF털실')
coltxt(cap,510,600,'CAP검기')
