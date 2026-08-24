from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/08-스킬-세부-팝업.jpg').convert('RGB')).astype(int)
cap=np.asarray(Image.open('/tmp/claude-0/-home-user-kkkkkk/506217fa-81ce-5f52-b78d-03d62df5e75b/scratchpad/08-final.png').convert('RGB')).astype(int)
def modecolor(img,y0,y1,x0,x1):
    reg=img[y0:y1,x0:x1].reshape(-1,3); q=(reg//6*6)
    vals,counts=np.unique(q,axis=0,return_counts=True)
    v=vals[counts.argmax()]
    return v.tolist()
print('REF 보유효과 LEFT ',modecolor(ref,1452,1495,215,410))
print('CAP 보유효과 LEFT ',modecolor(cap,1241,1284,215,410))
print('REF 보유효과 RIGHT',modecolor(ref,1452,1495,470,860))
print('CAP 보유효과 RIGHT',modecolor(cap,1241,1284,470,860))
# buttons: blue and gray
print('REF btn BLUE',modecolor(ref,1580,1620,260,400))
print('CAP btn BLUE',modecolor(cap,1370,1410,300,440))
print('REF btn GRAY',modecolor(ref,1580,1620,560,700))
print('CAP btn GRAY',modecolor(cap,1370,1410,620,760))
# cooltime header text color (light blue in ref?) and value text
print('REF header band bg',modecolor(ref,1055,1095,300,500))
print('CAP header band bg',modecolor(cap,845,885,300,500))
