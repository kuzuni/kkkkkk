from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(float)
cap=np.asarray(Image.open('docs/review/33-r3.png').convert('RGB')).astype(float)
DY=210
def lum(a): return a[...,0]*0.299+a[...,1]*0.587+a[...,2]*0.114
RL,CL=lum(ref),lum(cap)
print("="*72);print("W. DESC text luminance min & 50%-threshold ink height sweep")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    reg=L[1145-base:1190-base,300:780]
    print(f" {nm}: bg~{np.percentile(reg,95):.0f} ink_min={reg.min():.0f} p2={np.percentile(reg,2):.0f}")
for thr in [90,110,128,140,150]:
    line=f"  thr<{thr}: "
    for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
        for lbl,(ya,yb) in [('L0',(1142,1186)),('L1',(1187,1228))]:
            s=L[ya-base:yb-base,300:780]<thr
            r=np.where(s.sum(1)>=2)[0]; c=np.where(s.sum(0)>=1)[0]
            line+=f"{nm}.{lbl} h={r[-1]-r[0]+1} w={c[-1]-c[0]+1} | "
    print(line)

print("="*72);print("X. STAR bboxes (thr 198<L<214) exact")
from collections import deque
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    reg=L[885-base:1570-base,262:818]
    m=(reg>197)&(reg<215)
    seen=np.zeros(m.shape,bool); out=[]
    for y in range(m.shape[0]):
        for x in range(m.shape[1]):
            if m[y,x] and not seen[y,x]:
                q=deque([(y,x)]); seen[y,x]=True; pts=[]
                while q:
                    cy,cx=q.popleft(); pts.append((cy,cx))
                    for dy,dx in((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<m.shape[0] and 0<=nx<m.shape[1] and m[ny,nx] and not seen[ny,nx]:
                            seen[ny,nx]=True; q.append((ny,nx))
                if len(pts)>500:
                    ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
                    h=max(ys)-min(ys)+1; w=max(xs)-min(xs)+1
                    if h>60 or w>70: continue
                    out.append((262+min(xs),262+max(xs),885+min(ys),885+max(ys),w,h))
    out.sort(key=lambda t:(t[2],t[0]))
    print(f" {nm}: {len(out)}")
    for t in out: print(f"    x{t[0]}..{t[1]} y{t[2]}..{t[3]} w{t[4]} h{t[5]}")

print("="*72);print("Y. TONE LEVELS (median RGB of flat regions) — 명암 only")
regs={'cream':(300,340,1345,1360),'header brown':(300,340,820,860),
 'desc panel':(300,340,1250,1290),'list panel':(700,740,1470,1500),
 'ring brown':(251,255,1300,1340),'ring inner':(257,259,1300,1340),
 'outer border':(243,247,1300,1340),'icon orange':(475,495,1010,1030),
 'star on cream':(300,320,908,918),'star under list':(775,785,1400,1410)}
for k,(x0,x1,y0,y1) in regs.items():
    a=np.median(ref[y0:y1,x0:x1].reshape(-1,3),0)
    b=np.median(cap[y0-DY:y1-DY,x0:x1].reshape(-1,3),0)
    la=0.299*a[0]+0.587*a[1]+0.114*a[2]; lb=0.299*b[0]+0.587*b[1]+0.114*b[2]
    print(f" {k:16s} ref L={la:6.1f} rgb={tuple(int(v) for v in a)}  cap L={lb:6.1f} rgb={tuple(int(v) for v in b)}  dL={lb-la:+5.1f}")
