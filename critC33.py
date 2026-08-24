from PIL import Image
import sys, numpy as np

REF="/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg"
CAP="/home/user/kkkkkk/docs/review/33-r2.png"
DY=210  # cap_y = ref_y - 210

def load(p):
    im=Image.open(p).convert("RGB")
    return np.asarray(im).astype(int), im.size

R,rs=load(REF); C,cs=load(CAP)
print("ref",rs,"cap",cs)

def px(A,x,y): return tuple(A[y,x])

# probe some columns/rows to find popup edges
def rowprofile(A,y,x0,x1):
    return [(x,tuple(A[y,x])) for x in range(x0,x1)]

# Find cream: cream fill is light beige ~ (245,232,205)?
def creammask(A):
    r,g,b=A[:,:,0],A[:,:,1],A[:,:,2]
    return (r>225)&(g>210)&(b>170)&(b<225)&(r>=g)&(g>b)

for name,A in (("REF",R),("CAP",C)):
    m=creammask(A)
    ys,xs=np.nonzero(m)
    print(name,"cream bbox raw", xs.min(),xs.max(),ys.min(),ys.max(), m.sum())

print("\n--- sample row scan around popup left edge (ref y=1200, cap y=990) ---")
for name,A,y in (("REF",R,1200),("CAP",C,990)):
    print(name, [(x,tuple(A[y,x])) for x in range(232,272)])
