from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(float)
cap=np.asarray(Image.open('docs/review/33-r3.png').convert('RGB')).astype(float)
DY=210
def lum(a): return a[...,0]*0.299+a[...,1]*0.587+a[...,2]*0.114
RL,CL=lum(ref),lum(cap)
def cross(p,i0,i1,thr,rising):
    st=1 if i1>i0 else -1
    for i in range(i0,i1,st):
        a,b=p[i],p[i+st]
        if rising and a<thr<=b: return i+st*(thr-a)/(b-a)
        if (not rising) and a>=thr>b: return i+st*(a-thr)/(a-b)
    return None

print("="*72);print("E. ICON BOX (orange square w/ dark outline) — outer black edge")
# scan horizontal through icon center
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    y=980-base
    p=L[y]
    print(f" {nm} y={y+base} x452..472:",' '.join(f'{x}:{p[x]:.0f}' for x in range(452,473)))
    print(f" {nm} y={y+base} x610..632:",' '.join(f'{x}:{p[x]:.0f}' for x in range(610,633)))
    q=L[:,540]
    print(f" {nm} x=540 y{893+0}..{913}:",' '.join(f'{yy+base}:{q[yy]:.0f}' for yy in range(893-base,914-base)))
    print(f" {nm} x=540 y1052..1072:",' '.join(f'{yy+base}:{q[yy]:.0f}' for yy in range(1052-base,1073-base)))
    print()
