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

print("="*72);print("F. DESCRIPTION PANEL (tan 178 on cream 220), thr=199")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    y=1250-base; p=L[y]
    xl=cross(p,265,400,199,False); xr=cross(p,815,700,199,False)
    q=L[:,320]  # column inside panel, left of text
    yt=cross(q,1100-base,1180-base,199,False); yb=cross(q,1400-base,1300-base,199,False)
    print(f" {nm}: x {xl:.1f}..{xr:.1f} w={xr-xl:.1f} | y {yt+base:.1f}..{yb+base:.1f} h={yb-yt:.1f}")

print("="*72);print("G. LIST PANEL (semi-transparent, slightly darker than cream) at y=1470/1260")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    y=1500-base; p=L[y]
    print(f" {nm} y={y+base} x282..300:",' '.join(f'{x}:{p[x]:.0f}' for x in range(282,301)))
    print(f" {nm} y={y+base} x780..800:",' '.join(f'{x}:{p[x]:.0f}' for x in range(780,801)))
    q=L[:,780]
    print(f" {nm} x=780 y1378..1398:",' '.join(f'{yy+base}:{q[yy]:.0f}' for yy in range(1378-base,1399-base)))
    print(f" {nm} x=780 y1536..1556:",' '.join(f'{yy+base}:{q[yy]:.0f}' for yy in range(1536-base,1557-base)))
    print()
