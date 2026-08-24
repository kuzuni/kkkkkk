from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(float)
cap=np.asarray(Image.open('docs/review/33-r3.png').convert('RGB')).astype(float)
DY=210
def lum(a): return a[...,0]*0.299+a[...,1]*0.587+a[...,2]*0.114
RL,CL=lum(ref),lum(cap)
def inkbox(L,x0,x1,y0,y1,thr,dark=True,minpix=1):
    sub=L[y0:y1,x0:x1]; m=(sub<thr) if dark else (sub>thr)
    c=np.where(m.sum(0)>=minpix)[0]; r=np.where(m.sum(1)>=minpix)[0]
    if len(c)==0: return None
    return (x0+c[0],x0+c[-1],y0+r[0],y0+r[-1],c[-1]-c[0]+1,r[-1]-r[0]+1)
def bands(cnt,y0,minc=1):
    o=[];s=None
    for i,c in enumerate(cnt):
        if c>=minc and s is None: s=i
        elif c<minc and s is not None: o.append((y0+s,y0+i-1)); s=None
    if s is not None: o.append((y0+s,y0+len(cnt)-1))
    return o

print("="*72);print("J2. '보유:' line ink, window y1066..1128, thr<170")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    bb=inkbox(L,280,800,1066-base,1128-base,170,True,2)
    print(f" {nm}: x {bb[0]}..{bb[1]} w={bb[4]} y {bb[2]+base}..{bb[3]+base} h={bb[5]} cx={(bb[0]+bb[1])/2:.1f}")
    # split: green '보유:' part vs number part
    g=( (ref if nm=='ref' else cap)[...,1] - (ref if nm=='ref' else cap)[...,0] )
    img=(ref if nm=='ref' else cap)
    gm=(img[...,1]>120)&(img[...,1]-img[...,0]>30)&(img[...,1]-img[...,2]>30)
    sub=gm[1066-base:1128-base,280:800]
    c=np.where(sub.sum(0)>0)[0]; r=np.where(sub.sum(1)>0)[0]
    print(f"    green('보유:') x {280+c[0]}..{280+c[-1]} w={c[-1]-c[0]+1} y {1066+r[0]}..{1066+r[-1]} h={r[-1]-r[0]+1}")

print("="*72);print("K2. DESC lines row profile (thr<120), col 295..785")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    cnt=(L[1135-base:1335-base,295:785]<120).sum(1)
    print(f" {nm}:",' '.join(f'{1135+i}:{v}' for i,v in enumerate(cnt) if v>0 or (1135+i)%1==0)[:0] or '')
    bs=bands(cnt,1135,8)
    print("   bands(minc=8):",[(a,b,b-a+1) for a,b in bs])
    for i,(a,b) in enumerate(bs):
        bb=inkbox(L,295,785,a-base,b+1-base,120,True,1)
        print(f"    L{i}: x {bb[0]}..{bb[1]} w={bb[4]} y {bb[2]+base}..{bb[3]+base} h={bb[5]}")
    if len(bs)==2: print("    line pitch:",bs[1][0]-bs[0][0])
    print("   raw counts 1180..1195:",[int(cnt[y-1135]) for y in range(1180,1196)])

print("="*72);print("L2. '획득처' ink, window y1340..1412, x350..730, thr<120")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    bb=inkbox(L,350,730,1340-base,1412-base,120,True,2)
    print(f" {nm}: x {bb[0]}..{bb[1]} w={bb[4]} y {bb[2]+base}..{bb[3]+base} h={bb[5]} cx={(bb[0]+bb[1])/2:.1f}")

print("="*72);print("O. GAPS (vertical rhythm)")
