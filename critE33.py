from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(float)
cap=np.asarray(Image.open('docs/review/33-r3.png').convert('RGB')).astype(float)
DY=210
def lum(a): return a[...,0]*0.299+a[...,1]*0.587+a[...,2]*0.114
RL,CL=lum(ref),lum(cap)

def cross(prof, i0, i1, thr, rising):
    """first 50%-threshold crossing scanning i0->i1 (i1 may be < i0)"""
    step = 1 if i1>i0 else -1
    for i in range(i0, i1, step):
        a,b=prof[i],prof[i+step]
        if rising and a<thr<=b: return i+step*(thr-a)/(b-a)
        if (not rising) and a>=thr>b: return i+step*(a-thr)/(a-b)
    return None

def hprof(L,y,x0=200,x1=900): return L[y]
def vprof(L,x): return L[:,x]

print("="*70); print("A. CREAM FILL (thr=(220+72)/2=146 on brown/cream)")
CT=146.0
for nm,L,y in [('ref',RL,1360),('cap',CL,1150)]:
    p=L[y]
    xl=cross(p,200,500,CT,True); xr=cross(p,900,600,CT,True)
    print(f" {nm} y={y}: left={xl:.1f} right={xr:.1f} w={xr-xl:.1f}")
# vertical cream extent through a clean column (x=270 near left inside, avoid panels)
for nm,L,x in [('ref',RL,270),('cap',CL,270)]:
    p=L[:,x]
    y0=cross(p,700 if nm=='ref' else 500, 1000 if nm=='ref' else 800, CT, True)
    y1=cross(p,1700 if nm=='ref' else 1490, 1400 if nm=='ref' else 1190, CT, True)
    off = 0 if nm=='ref' else DY
    print(f" {nm} x={x}: top={y0:.1f}(+{DY}->{y0+off:.1f}) bot={y1:.1f}(+{DY}->{y1+off:.1f}) h={y1-y0:.1f}")

print("="*70); print("B. POPUP BORDER BOX (outer edge of dark brown ring vs background)")
# outer edge: bg is dark/varied. use threshold between bg and ring.
for nm,L,y in [('ref',RL,1360),('cap',CL,1150)]:
    p=L[y]
    print(f" {nm} y={y} x 230..270:", [f"{p[x]:.0f}" for x in range(230,272,2)])
    print(f" {nm} y={y} x 810..850:", [f"{p[x]:.0f}" for x in range(810,852,2)])

print("="*70); print("C. TITLE BAR / header band (dark brown top) vertical structure at x=300")
for nm,L,off in [('ref',RL,0),('cap',CL,DY)]:
    p=L[:,300]
    base = 781 if nm=='ref' else 571
    print(f" {nm} x=300 y {base-15}..{base+120}:", " ".join(f"{p[y]:.0f}" for y in range(base-15,base+121,5)))
