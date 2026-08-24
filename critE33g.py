from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(float)
cap=np.asarray(Image.open('docs/review/33-r3.png').convert('RGB')).astype(float)
DY=210
def lum(a): return a[...,0]*0.299+a[...,1]*0.587+a[...,2]*0.114
RL,CL=lum(ref),lum(cap)
def bands(cnt,o,minc=1):
    r=[];s=None
    for i,c in enumerate(cnt):
        if c>=minc and s is None: s=i
        elif c<minc and s is not None: r.append((o+s,o+i-1)); s=None
    if s is not None: r.append((o+s,o+len(cnt)-1))
    return r
print("="*72);print("S. TITLE per-glyph clusters (bright>150 on brown), y805..860")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    s=L[805-base:860-base,440:640]>150
    cb=bands(s.sum(0),440,1)
    print(f" {nm}:",[(a,b,b-a+1) for a,b in cb])
    if len(cb)>1:
        adv=[cb[i+1][0]-cb[i][0] for i in range(len(cb)-1)]
        print(f"    glyph advances: {adv}  mean={np.mean(adv):.1f}")
    print(f"    total ink w={cb[-1][1]-cb[0][0]+1}  per-char={(cb[-1][1]-cb[0][0]+1)/(2 if nm=='ref' else 3):.2f}")

print("="*72);print("T. CHECK ROW TEXT ONLY (x>=336), thr<120")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    for i,(ya,yb) in enumerate([(1410,1450),(1450,1490),(1490,1530)]):
        s=L[ya-base:yb-base,336:790]<120
        r=np.where(s.sum(1)>0)[0]; c=np.where(s.sum(0)>0)[0]
        cb=bands(s.sum(0),336,1)
        print(f" {nm} row{i}: x {336+c[0]}..{336+c[-1]} w={c[-1]-c[0]+1} y {ya+r[0]}..{ya+r[-1]} h={r[-1]-r[0]+1} nclust={len(cb)} firstclust_w={cb[0][2] if False else cb[0][1]-cb[0][0]+1}")
    print()
print("="*72);print("U. 획득처 per-glyph (thr<120) y1358..1408")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    s=L[1358-base:1408-base,460:620]<120
    cb=bands(s.sum(0),460,1)
    print(f" {nm}:",[(a,b,b-a+1) for a,b in cb], f" advances={[cb[i+1][0]-cb[i][0] for i in range(len(cb)-1)]}")

print("="*72);print("V. STAR WATERMARK centroids (cream 220 vs star ~207)")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    reg=L[885-base:1570-base,262:818]
    m=(reg>198)&(reg<214)
    lab=[]
    seen=np.zeros(m.shape,bool)
    from collections import deque
    for y in range(m.shape[0]):
        for x in range(m.shape[1]):
            if m[y,x] and not seen[y,x]:
                q=deque([(y,x)]); seen[y,x]=True; pts=[]
                while q:
                    cy,cx=q.popleft(); pts.append((cy,cx))
                    for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<m.shape[0] and 0<=nx<m.shape[1] and m[ny,nx] and not seen[ny,nx]:
                            seen[ny,nx]=True; q.append((ny,nx))
                if len(pts)>400:
                    ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
                    lab.append((262+ (min(xs)+max(xs))/2, 885+(min(ys)+max(ys))/2, max(xs)-min(xs)+1, max(ys)-min(ys)+1, len(pts)))
    lab.sort(key=lambda t:(round(t[1]/40),t[0]))
    print(f" {nm}: {len(lab)} stars")
    for t in lab: print(f"    cx={t[0]:.1f} cy={t[1]:.1f} w={t[2]} h={t[3]} area={t[4]}")
