import sys
from pydep937 import Image
im=Image.open(sys.argv[1]).convert('RGB');px=im.load(); off=int(sys.argv[2])
def L(c): return 0.299*c[0]+0.587*c[1]+0.114*c[2]
def brown(c): return c[0]>c[1]>c[2] and c[0]-c[2]>20
print("x\ttopL80\tbrightL95\tlip")
for x in range(705, 1030, 5):
    res=[]
    # L80 상판 시작
    t=-1
    for y in range(off+455, off+520):
        if all(76<=L(px[x,yy])<=87 and brown(px[x,yy]) for yy in range(y,y+5)): t=y-off; break
    # L95 하이라이트 시작
    h=-1
    for y in range(off+((t+3) if t>0 else 455), off+525):
        if all(L(px[x,yy])>=90 and brown(px[x,yy]) for yy in range(y,y+4)): h=y-off; break
    # 립
    l=-1
    for y in range(off+((h+3) if h>0 else 500), off+535):
        if all(66<=L(px[x,yy])<=78 and brown(px[x,yy]) for yy in range(y,y+5)): l=y-off; break
    print(f"{x}\t{t}\t{h}\t{l}")
