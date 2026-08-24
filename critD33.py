from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
def near(A,c,t=26):
    return (np.abs(A-np.array(c)).sum(axis=2)<=t)
HDR=(82,62,61); RIM=(91,70,67); CREAM=(240,217,186); PANEL=(197,176,149)
def bbox(m,label):
    ys,xs=np.where(m)
    if len(ys)==0: print(label,"EMPTY"); return None
    b=(xs.min(),xs.max(),ys.min(),ys.max())
    print(f"{label}: x {b[0]}..{b[1]} (w {b[1]-b[0]+1}) y {b[2]}..{b[3]} (h {b[3]-b[2]+1})  px={m.sum()}")
    return b
print("=== 1. CROSS-CHECK ===")
for nm,A,off in (("REF",ref,0),("CAP",cap,-DY)):
    sub=A[700+off:1700+off,180:900]
    hdr=near(sub,HDR,20)
    # keep largest component rows/cols by column sums
    b=bbox(hdr,f"{nm} header-fill(82,62,61)")
    if b: print(f"   -> abs x {b[0]+180}..{b[1]+180} y {b[2]+700+off}..{b[3]+700+off}")
    cr=near(sub,CREAM,18)
    colsum=cr.sum(axis=0); rowsum=cr.sum(axis=1)
    xs=np.where(colsum>50)[0]; ys=np.where(rowsum>50)[0]
    print(f"   {nm} cream fill: x {xs.min()+180}..{xs.max()+180} (w {xs.max()-xs.min()+1}) y {ys.min()+700+off}..{ys.max()+700+off} (h {ys.max()-ys.min()+1})")
    rm=near(sub,RIM,16)
    b2=bbox(rm,f"{nm} rim(91,70,67)")
    if b2: print(f"   -> abs x {b2[0]+180}..{b2[1]+180} y {b2[2]+700+off}..{b2[3]+700+off}")

print("\n=== precise edges via column/row profiles inside popup band ===")
def prof(A,label,y_hdr,ytop,ybot):
    # horizontal scan across header mid row
    row=A[y_hdr]
    def cls(p):
        if abs(p[0]-82)+abs(p[1]-62)+abs(p[2]-61)<=22: return 'H'
        if abs(p[0]-91)+abs(p[1]-70)+abs(p[2]-67)<=16: return 'R'
        if p.sum()<60: return 'K'
        return '.'
    s=''.join(cls(row[x]) for x in range(230,850))
    print(label,"row",y_hdr,"x230+:",s[:120])
    print(label,"           x730+:",''.join(cls(row[x]) for x in range(730,850)))
for A,ys in ((ref,(800,835,870)),(cap,(590,625,660))):
    nm = "REF" if A is ref else "CAP"
    for y in ys: prof(A,nm,y,0,0)
from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
print("REF y=1450 x235..275:"); print([ (x,tuple(ref[1450,x])) for x in range(235,276)])
print("CAP y=1240 x235..275:"); print([ (x,tuple(cap[1240,x])) for x in range(235,276)])
print("REF y=1450 x800..850:"); print([ (x,tuple(ref[1450,x])) for x in range(800,851)])
print("CAP y=1240 x800..850:"); print([ (x,tuple(cap[1240,x])) for x in range(800,851)])
print()
print("REF x=540 y=865..900:"); print([ (y,tuple(ref[y,540])) for y in range(865,901)])
print("CAP x=540 y=655..690:"); print([ (y,tuple(cap[y,540])) for y in range(655,691)])
print()
print("REF x=540 y=1560..1605:"); print([ (y,tuple(ref[y,540])) for y in range(1560,1606)])
print("CAP x=540 y=1350..1395:"); print([ (y,tuple(cap[y,540])) for y in range(1350,1396)])
print()
print("REF x=540 y=770..800:"); print([ (y,tuple(ref[y,540])) for y in range(770,801)])
print("CAP x=540 y=560..590:"); print([ (y,tuple(cap[y,540])) for y in range(560,591)])
from PIL import Image
import numpy as np
from collections import deque
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
X0,X1,Y0,Y1=241,839,781,1594
R=ref[Y0:Y1,X0:X1]; C=cap[Y0-210:Y1-210,X0:X1]
print("crop",R.shape,C.shape)
Rg=R.mean(axis=2); Cg=C.mean(axis=2)
D=np.abs(R.astype(float)-C.astype(float)).max(axis=2)

def blobs(D,thr,minpx=60,dil=3):
    m=D>thr
    # dilate via max filter using shifts
    mm=m.copy()
    for dy in range(-dil,dil+1):
        for dx in range(-dil,dil+1):
            mm |= np.roll(np.roll(m,dy,0),dx,1)
    H,W=m.shape
    lab=np.zeros((H,W),int); cur=0; out=[]
    for y in range(H):
        for x in range(W):
            if mm[y,x] and lab[y,x]==0:
                cur+=1; q=deque([(y,x)]); lab[y,x]=cur; pts=[]
                while q:
                    cy,cx=q.popleft(); pts.append((cy,cx))
                    for ny,nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                        if 0<=ny<H and 0<=nx<W and mm[ny,nx] and lab[ny,nx]==0:
                            lab[ny,nx]=cur; q.append((ny,nx))
                ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
                y0,y1,x0,x1=min(ys),max(ys),min(xs),max(xs)
                real=m[y0:y1+1,x0:x1+1].sum()
                if real>=minpx:
                    out.append(dict(x0=x0+X0,x1=x1+X0,y0=y0+Y0,y1=y1+Y0,px=int(real),
                                    energy=float(D[y0:y1+1,x0:x1+1][m[y0:y1+1,x0:x1+1]].sum())))
    out.sort(key=lambda d:-d['energy'])
    return out

for thr in (48,9):
    print(f"\n===== DIFF blobs thr={thr} =====")
    bl=blobs(D,thr)
    print(f"total blobs={len(bl)}  diffpx={int((D>thr).sum())}")
    for i,b in enumerate(bl[:18]):
        w=b['x1']-b['x0']+1; h=b['y1']-b['y0']+1
        # decide which side has ink: compare local mean darkness/contrast
        rr=R[b['y0']-Y0:b['y1']-Y0+1, b['x0']-X0:b['x1']-X0+1]
        cc=C[b['y0']-Y0:b['y1']-Y0+1, b['x0']-X0:b['x1']-X0+1]
        print(f"{i+1:2d}. x{b['x0']}..{b['x1']} (w{w}) y{b['y0']}..{b['y1']} (h{h}) px={b['px']} E={b['energy']:.0f} refmean={rr.mean():.0f} capmean={cc.mean():.0f} refstd={rr.std():.0f} capstd={cc.std():.0f}")
from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
print("### A. vertical strips x257..266 / x813..822 (y878..1561) ###")
for y in (900,1000,1250,1550):
    print(" REF y%4d x252..272:"%y, [int(ref[y,x].mean()) for x in range(252,273)])
    print(" CAP y%4d       :"%y, [int(cap[y-DY,x].mean()) for x in range(252,273)])
    print(" REF y%4d x808..828:"%y, [int(ref[y,x].mean()) for x in range(808,829)])
    print(" CAP y%4d       :"%y, [int(cap[y-DY,x].mean()) for x in range(808,829)])
print()
print("### B. bottom edge y1560..1580 at x=400 ###")
print(" REF:", [(y,int(ref[y,400].mean())) for y in range(1558,1582)])
print(" CAP:", [(y,int(cap[y-DY,400].mean())) for y in range(1558,1582)])
from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
PAN=(197,176,149)
def panelmask(A):
    return (np.abs(A-np.array(PAN)).sum(axis=2)<=30)
print("### PANEL BOUNDS ###")
for nm,A,off in (("REF",ref,0),("CAP",cap,-DY)):
    m=panelmask(A)
    m[:,:250]=0; m[:,840:]=0
    for lo,hi,lbl in ((1100+off,1360+off,"desc panel"),(1370+off,1560+off,"list panel")):
        sub=m[lo:hi]
        rs=sub.sum(axis=1); cs=sub.sum(axis=0)
        ys=np.where(rs>200)[0]; xs=np.where(cs>60)[0]
        print(f"{nm} {lbl}: x {xs.min()}..{xs.max()} (w{xs.max()-xs.min()+1})  y {ys.min()+lo-off}..{ys.max()+lo-off} (h{ys.max()-ys.min()+1})")

print("\n### STAR WATERMARK LOCAL DEVIATION ###")
def stardev(A,x0,x1,y0,y1,lbl):
    sub=A[y0:y1,x0:x1].mean(axis=2)
    med=np.median(sub)
    dev=sub-med
    print(f"  {lbl}: median={med:.1f} min={sub.min():.1f} max={sub.max():.1f} std={sub.std():.2f} "
          f"p1={np.percentile(sub,1):.1f} p99={np.percentile(sub,99):.1f} range(p1..p99)={np.percentile(sub,99)-np.percentile(sub,1):.1f} "
          f"frac|dev|>4={(np.abs(dev)>4).mean()*100:.1f}%")
# text-free bands
print(" DESC PANEL text-free band (below text):")
stardev(ref,300,780,1240,1322,"REF y1240..1322")
stardev(cap,300,780,1030,1112,"CAP y1030..1112")
print(" DESC PANEL full incl. known star centers (ref stars at ~x330,y1250? scan):")
stardev(ref,296,784,1136,1324,"REF full")
stardev(cap,296,784,926,1114,"CAP full")
print(" LIST PANEL right half (text-free):")
stardev(ref,570,790,1392,1540,"REF")
stardev(cap,570,790,1182,1330,"CAP")
print(" LIST PANEL full:")
stardev(ref,292,788,1390,1542,"REF")
stardev(cap,292,788,1180,1332,"CAP")
print(" CREAM background (outside panels) y1340..1380 for star reference:")
stardev(ref,270,810,1336,1380,"REF cream band")
stardev(cap,270,810,1126,1170,"CAP cream band")
from PIL import Image
import numpy as np
from collections import deque
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
def cc(m,minpx=40):
    H,W=m.shape; lab=np.zeros((H,W),np.int32); out=[]; cur=0
    for y in range(H):
        for x in range(W):
            if m[y,x] and lab[y,x]==0:
                cur+=1; q=deque([(y,x)]); lab[y,x]=cur; pts=[]
                while q:
                    cy,cx=q.popleft(); pts.append((cy,cx))
                    for ny,nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                        if 0<=ny<H and 0<=nx<W and m[ny,nx] and lab[ny,nx]==0:
                            lab[ny,nx]=cur; q.append((ny,nx))
                if len(pts)>=minpx:
                    ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
                    out.append((min(xs),max(xs),min(ys),max(ys),len(pts)))
    return out
print("### STAR WATERMARK DETECTION (cream/panel bg, darker spots) ###")
for nm,A,off in (("REF",ref,0),("CAP",cap,-DY)):
    g=A[881+off:1573+off,262:818].mean(axis=2)
    # star = slightly darker than local bg; bg is 214 (cream) or 173 (panel)
    bg = np.where(g>195, 214.3, 173.7)
    m = (g < bg-4) & (g > bg-30)
    stars=cc(m,120)
    stars.sort(key=lambda s:(s[2],s[0]))
    print(f"{nm}: {len(stars)} spots")
    for s in stars:
        print(f"   x{s[0]+262}..{s[1]+262} (w{s[1]-s[0]+1}) y{s[2]+881+off-off}..{s[3]+881}"
              if False else f"   x{s[0]+262}..{s[1]+262} (w{s[1]-s[0]+1}) y{s[2]+881}..{s[3]+881} (h{s[3]-s[2]+1}) area={s[4]}")
from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
sites=[("TL cream",295,350,895,955),("TR cream",765,820,895,955),
       ("ML cream",405,465,1010,1070),("MR cream",640,700,1010,1070),
       ("L-upper?",405,465,930,990),("R-upper?",640,700,930,990),
       ("R desc-edge",780,820,1130,1190),("L desc-edge",262,300,1130,1190),
       ("desc mid-L",320,380,1240,1300),("desc mid-R",700,760,1240,1300),
       ("TL list",293,350,1363,1423),("TR list",765,820,1363,1423),
       ("BL list",410,465,1480,1540),("BR list",640,700,1480,1540)]
print(f"{'site':14s} {'refbg':>6} {'refmin':>6} {'refdip':>6} | {'capbg':>6} {'capmin':>6} {'capdip':>6}  verdict")
for lbl,x0,x1,y0,y1 in sites:
    r=ref[y0:y1,x0:x1].mean(axis=2); c=cap[y0-DY:y1-DY,x0:x1].mean(axis=2)
    rb=np.percentile(r,90); cb=np.percentile(c,90)
    rd=rb-np.percentile(r,3); cd=cb-np.percentile(c,3)
    v="both" if rd>4 and cd>4 else ("REF-only(MISSING)" if rd>4 else ("CAP-only(EXTRA)" if cd>4 else "neither"))
    print(f"{lbl:14s} {rb:6.1f} {r.min():6.1f} {rd:6.1f} | {cb:6.1f} {c.min():6.1f} {cd:6.1f}  {v}")

print("\n### star centroid alignment (dark-dip centroid) ###")
for lbl,x0,x1,y0,y1 in sites:
    r=ref[y0:y1,x0:x1].mean(axis=2); c=cap[y0-DY:y1-DY,x0:x1].mean(axis=2)
    def cen(a,off_x,off_y):
        b=np.percentile(a,90); w=np.clip(b-a,0,None)
        if w.sum()<200: return None
        ys,xs=np.mgrid[0:a.shape[0],0:a.shape[1]]
        return ((xs*w).sum()/w.sum()+off_x,(ys*w).sum()/w.sum()+off_y,w.sum())
    a=cen(r,x0,y0); b=cen(c,x0,y0)
    if a and b:
        print(f"{lbl:14s} ref=({a[0]:.1f},{a[1]:.1f}) mass={a[2]:.0f} | cap=({b[0]:.1f},{b[1]:.1f}) mass={b[2]:.0f} | d=({b[0]-a[0]:+.1f},{b[1]-a[1]:+.1f}) massratio={b[2]/a[2]:.2f}")
    else:
        print(f"{lbl:14s} ref={'ok' if a else 'none'} cap={'ok' if b else 'none'}")
from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
def txt(A,x0,x1,y0,y1,lbl,whitethr=205,blackthr=70):
    s=A[y0:y1,x0:x1]; g=s.mean(axis=2)
    sat=s.max(axis=2)-s.min(axis=2)
    W=(g>=whitethr)&(sat<40); B=(g<=blackthr)
    ink=W|B
    ys,xs=np.where(ink)
    if len(ys)==0: print(lbl,"none"); return
    bb=(xs.min()+x0,xs.max()+x0,ys.min()+y0,ys.max()+y0)
    print(f"{lbl}: bbox x{bb[0]}..{bb[1]} (w{bb[1]-bb[0]+1}) y{bb[2]}..{bb[3]} (h{bb[3]-bb[2]+1}) "
          f"white={W.sum()} black={B.sum()} ratio(blk/wht)={B.sum()/max(W.sum(),1):.2f}")
    # row profile of ink to get line positions and cap-height
    rp=ink.sum(axis=1)
    rows=[(i+y0,int(v)) for i,v in enumerate(rp) if v>0]
    runs=[]; st=None
    for i,v in enumerate(rp):
        if v>2 and st is None: st=i
        elif v<=2 and st is not None: runs.append((st+y0,i-1+y0)); st=None
    if st is not None: runs.append((st+y0,len(rp)-1+y0))
    print(f"    line runs: {[(a,b,b-a+1) for a,b in runs]}")
    return W,B

print("### DESCRIPTION TEXT (identical wording) ###")
txt(ref,262,818,1130,1240,"REF desc")
txt(cap,262,818,920,1030,"CAP desc")
print("\n### 획득처 heading (identical wording) ###")
txt(ref,440,640,1350,1420,"REF 획득처")
txt(cap,440,640,1140,1210,"CAP 획득처")
print("\n### 보유: prefix region ###")
txt(ref,400,530,1065,1125,"REF 보유:")
txt(cap,400,530,855,915,"CAP 보유:")
print("\n### TITLE (content differs, size only) ###")
txt(ref,400,700,795,875,"REF title",whitethr=190)
txt(cap,400,700,585,665,"CAP title",whitethr=190)
from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
def strokes(A,x0,x1,y0,y1,bg,lbl):
    g=A[y0:y1,x0:x1].mean(axis=2)
    dark=g<bg-45; white=g>bg+30
    ink=g<bg-20
    outs=[]
    for r in range(g.shape[0]):
        row=dark[r]; wr=white[r]
        x=0
        while x<len(row):
            if row[x]:
                s=x
                while x<len(row) and row[x]: x+=1
                L=x-s
                # bordered by white on one side?
                lw = s>0 and wr[s-1]
                rw = x<len(row) and wr[x]
                if (lw or rw) and L<=20: outs.append(L)
            else: x+=1
    outs=np.array(outs)
    print(f"{lbl}: darkpx={dark.sum()} whitepx={white.sum()} inkpx={ink.sum()} "
          f"dark/white={dark.sum()/max(white.sum(),1):.2f} | outline runs n={len(outs)} median={np.median(outs) if len(outs) else 0:.1f} mean={outs.mean() if len(outs) else 0:.2f}")
    return dark.sum(),white.sum(),ink.sum(),(np.median(outs) if len(outs) else 0)

print("### OUTLINE THICKNESS / INK DENSITY ###")
print("-- description text (identical wording), panel bg=173 --")
r=strokes(ref,300,780,1140,1230,173,"REF desc")
c=strokes(cap,300,780,930,1020,173,"CAP desc")
print(f"   >> CAP/REF  dark={c[0]/r[0]:.2f}  white={c[1]/r[1]:.2f}  ink={c[2]/r[2]:.2f}  outlineW={c[3]/max(r[3],1):.2f}")
print("-- 획득처 heading (identical wording), cream bg=214 --")
r=strokes(ref,440,600,1355,1415,214,"REF 획득처")
c=strokes(cap,440,600,1145,1205,214,"CAP 획득처")
print(f"   >> CAP/REF  dark={c[0]/r[0]:.2f}  white={c[1]/r[1]:.2f}  ink={c[2]/r[2]:.2f}  outlineW={c[3]/max(r[3],1):.2f}")
print("-- 보유: prefix, cream bg=214 --")
r=strokes(ref,435,530,1070,1120,214,"REF 보유:")
c=strokes(cap,435,530,860,910,214,"CAP 보유:")
print(f"   >> CAP/REF  dark={c[0]/r[0]:.2f}  white={c[1]/r[1]:.2f}  ink={c[2]/r[2]:.2f}  outlineW={c[3]/max(r[3],1):.2f}")

print("\n### TITLE bbox (header bg 82,62,61 -> g=68) ###")
def title(A,y0,y1,lbl):
    s=A[y0:y1,300:800]; g=s.mean(axis=2)
    m=(s[:,:,0]>150)&(s[:,:,1]>110)&(s[:,:,2]<140)  # yellow glyph
    ys,xs=np.where(m)
    print(f"{lbl} yellow: x{xs.min()+300}..{xs.max()+300} (w{xs.max()-xs.min()+1}) y{ys.min()+y0}..{ys.max()+y0} (h{ys.max()-ys.min()+1}) px={m.sum()}")
title(ref,790,880,"REF title")
title(cap,580,670,"CAP title")

print("\n### ICON FRAME (orange rounded square) ###")
def icon(A,y0,y1,lbl):
    s=A[y0:y1,350:750]
    m=(np.abs(s-np.array([211,124,19])).sum(axis=2)<70)|(np.abs(s-np.array([252,193,50])).sum(axis=2)<70)
    ys,xs=np.where(m)
    print(f"{lbl}: x{xs.min()+350}..{xs.max()+350} (w{xs.max()-xs.min()+1}) y{ys.min()+y0}..{ys.max()+y0} (h{ys.max()-ys.min()+1})")
icon(ref,880,1080,"REF icon")
icon(cap,670,870,"CAP icon")

print("\n### CHECKMARK column & list rows ###")
def green(A,y0,y1,lbl):
    s=A[y0:y1,270:400]
    m=(s[:,:,1]>150)&(s[:,:,0]<190)&(s[:,:,2]<160)&(s[:,:,1]-s[:,:,0]>40)
    ys,xs=np.where(m)
    if len(ys)==0: print(lbl,"none"); return
    print(f"{lbl}: x{xs.min()+270}..{xs.max()+270} (w{xs.max()-xs.min()+1}) y{ys.min()+y0}..{ys.max()+y0} px={m.sum()}")
    rp=m.sum(axis=1); runs=[];st=None
    for i,v in enumerate(rp):
        if v>0 and st is None: st=i
        elif v==0 and st is not None: runs.append((st+y0,i-1+y0)); st=None
    if st is not None: runs.append((st+y0,len(rp)-1+y0))
    print("    rows:",[(a,b,b-a+1) for a,b in runs])
green(ref,1400,1550,"REF checks")
green(cap,1190,1340,"CAP checks")
from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
def outline(A,x0,x1,y0,y1,bg,lbl):
    g=A[y0:y1,x0:x1].mean(axis=2)
    glyph=np.abs(g-bg)>18
    core=g>200
    Ls=[];Ws=[];Ts=[]
    for r in range(g.shape[0]):
        row=glyph[r]; cr=core[r]; x=0
        while x<len(row):
            if row[x]:
                s=x
                while x<len(row) and row[x]: x+=1
                L=x-s
                w=cr[s:x].sum()
                if L<=26 and w>=2:
                    Ls.append(L);Ws.append(w);Ts.append((L-w)/2)
            else: x+=1
    Ls=np.array(Ls);Ws=np.array(Ws);Ts=np.array(Ts)
    print(f"{lbl}: n={len(Ls)} glyphrun med={np.median(Ls):.1f} whitecore med={np.median(Ws):.1f} outline/side med={np.median(Ts):.2f} mean={Ts.mean():.2f}")
    return np.median(Ts),np.median(Ws),np.median(Ls)
print("### OUTLINE PER SIDE (white text w/ dark outline) ###")
a=outline(ref,300,780,1140,1230,173,"REF desc")
b=outline(cap,300,780,930,1020,173,"CAP desc")
print(f"   >> CAP/REF outline per side = {b[0]/a[0]:.2f}x  (whitecore {b[1]/a[1]:.2f}x, glyphrun {b[2]/a[2]:.2f}x)")

print("\n### thr=9 DIFF with text+icon+title masked (thin-layer hunt) ###")
X0,X1,Y0,Y1=241,839,781,1594
R=ref[Y0:Y1,X0:X1].astype(float); C=cap[Y0-DY:Y1-DY,X0:X1].astype(float)
D=np.abs(R-C).max(axis=2)
M=np.ones(D.shape,bool)
def mask(x0,x1,y0,y1):
    M[y0-Y0:y1-Y0, x0-X0:x1-X0]=False
mask(400,700,795,880)   # title
mask(440,640,1060,1130) # 보유
mask(440,660,1350,1425) # 획득처
mask(280,800,1135,1235) # desc text
mask(280,800,1405,1545) # list rows
mask(440,640,890,1075)  # icon
Dm=np.where(M,D,0)
print("masked diffpx>9:",int((Dm>9).sum()),"  >20:",int((Dm>20).sum()),"  >40:",int((Dm>40).sum()))
# row/col profiles of remaining diff
rp=(Dm>9).sum(axis=1); cp=(Dm>9).sum(axis=0)
print("top rows by residual diff (abs y, count):")
for i in np.argsort(-rp)[:20]: print(f"   y={i+Y0} n={rp[i]}")
print("top cols by residual diff (abs x, count):")
for i in np.argsort(-cp)[:20]: print(f"   x={i+X0} n={cp[i]}")
from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
def cs(A,axis,fixed,lo,hi,lbl,off=0):
    if axis=='v': v=[(y,tuple(int(t) for t in A[y-off,fixed])) for y in range(lo,hi)]
    else: v=[(x,tuple(int(t) for t in A[fixed-off,x])) for x in range(lo,hi)]
    print(lbl, v)
print("--- DESC PANEL top edge (x=600) ---")
cs(ref,'v',600,1126,1140,"REF")
cs(cap,'v',600,1126,1140,"CAP",DY)
print("--- DESC PANEL bottom edge (x=600) ---")
cs(ref,'v',600,1324,1338,"REF")
cs(cap,'v',600,1324,1338,"CAP",DY)
print("--- DESC PANEL left edge (y=1300) ---")
cs(ref,'h',1300,286,298,"REF")
cs(cap,'h',1300,286,298,"CAP",DY)
print("--- DESC PANEL right edge (y=1300) ---")
cs(ref,'h',1300,782,794,"REF")
cs(cap,'h',1300,782,794,"CAP",DY)
print("--- LIST PANEL top edge (x=620) ---")
cs(ref,'v',620,1379,1392,"REF")
cs(cap,'v',620,1379,1392,"CAP",DY)
print("--- LIST PANEL bottom edge (x=620) ---")
cs(ref,'v',620,1538,1552,"REF")
cs(cap,'v',620,1538,1552,"CAP",DY)
print("--- LIST PANEL left edge (y=1450) ---")
cs(ref,'h',1450,285,296,"REF")
cs(cap,'h',1450,285,296,"CAP",DY)
print("--- LIST PANEL right edge (y=1450) ---")
cs(ref,'h',1450,784,795,"REF")
cs(cap,'h',1450,784,795,"CAP",DY)
from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
def panrow(A,off,lbl,y0,y1):
    print(lbl)
    for y in range(y0,y1):
        row=A[y-off,262:818]
        m=(np.abs(row-np.array([197,176,150])).sum(axis=1)<=34)
        xs=np.where(m)[0]
        print(f"  y={y}: n={m.sum()} span={(xs.min()+262,xs.max()+262) if m.sum() else None}")
panrow(ref,0,"REF list panel rows",1378,1394)
panrow(cap,DY,"CAP list panel rows",1378,1394)
print()
print("### heading 획득처 exact bbox (dark-on-cream/panel) ###")
for nm,A,off in (("REF",ref,0),("CAP",cap,DY)):
    s=A[1350-off:1415-off,420:660]; g=s.mean(axis=2)
    m=g<120
    ys,xs=np.where(m)
    print(f"{nm}: x{xs.min()+420}..{xs.max()+420} (w{xs.max()-xs.min()+1}) y{ys.min()+1350}..{ys.max()+1350} (h{ys.max()-ys.min()+1}) px={m.sum()}")
print()
print("### divider line under 획득처? scan cream x270..810 for any row differing from 214 ###")
for nm,A,off in (("REF",ref,0),("CAP",cap,DY)):
    print(nm)
    for y in range(1340,1392):
        row=A[y-off,265:815].mean(axis=1)
        n=(np.abs(row-214.3)>6).sum()
        if n>200: print(f"   y={y} n={n} medval={np.median(row):.0f}")
from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
blobs=[("desc text 2 lines",313,767,1145,1226),
 ("list rows text",294,544,1410,1528),
 ("icon frame+art",457,622,898,1063),
 ("gem art inner",491,588,932,1032),
 ("보유: value",440,640,1072,1120),
 ("title",478,600,806,860),
 ("획득처 heading",489,591,1359,1406),
 ("popup top band",241,838,781,823),
 ("cream bottom edge",271,803,1566,1576),
 ("inner L/R cream edge",257,266,878,1561),
 ("checkmark row3",294,332,1494,1526),
 ("bottom corners",241,286,1550,1593)]
print(f"{'#':>2} {'region':22s} {'bbox':38s} {'refInk':>8} {'capInk':>8} {'c/r':>5}")
for i,(lbl,x0,x1,y0,y1) in enumerate(blobs):
    r=ref[y0:y1+1,x0:x1+1].mean(axis=2); c=cap[y0-DY:y1-DY+1,x0:x1+1].mean(axis=2)
    rb=np.median(r); cb=np.median(c)
    ri=np.abs(r-rb).sum(); ci=np.abs(c-cb).sum()
    print(f"{i+1:2d} {lbl:22s} x{x0}..{x1} y{y0}..{y1} ({x1-x0+1}x{y1-y0+1})  {ri:8.0f} {ci:8.0f} {ci/max(ri,1):5.2f}")

print("\n### desc line split (REF thresholded harder) ###")
for nm,A,off in (("REF",ref,0),("CAP",cap,DY)):
    s=A[1140-off:1235-off,300:780].mean(axis=2)
    m=np.abs(s-173)>50
    rp=m.sum(axis=1)
    runs=[];st=None
    for i,v in enumerate(rp):
        if v>8 and st is None: st=i
        elif v<=8 and st is not None: runs.append((st+1140,i-1+1140)); st=None
    if st is not None: runs.append((st+1140,1234))
    print(nm, [(a,b,b-a+1) for a,b in runs], " rowprofile min between lines:", )

print("\n### heading fill bbox tight ###")
for nm,A,off in (("REF",ref,0),("CAP",cap,DY)):
    s=A[1355-off:1412-off,470:615]; g=s.mean(axis=2)
    m=g<110
    ys,xs=np.where(m)
    print(f"{nm} heading outline: x{xs.min()+470}..{xs.max()+470} (w{xs.max()-xs.min()+1}) y{ys.min()+1355}..{ys.max()+1355} (h{ys.max()-ys.min()+1}) darkpx={m.sum()}")
    m2=(g>225)
    ys,xs=np.where(m2)
    print(f"     fill(>225): px={m2.sum()}  dark/fill={m.sum()/max(m2.sum(),1):.2f}")
from PIL import Image
import numpy as np
ref = np.asarray(Image.open('/home/user/kkkkkk/docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(int)
cap = np.asarray(Image.open('/home/user/kkkkkk/docs/review/33-r2.png').convert('RGB')).astype(int)
DY=210
print("### desc row profile (white core only) to split lines ###")
for nm,A,off in (("REF",ref,0),("CAP",cap,DY)):
    s=A[1140-off:1235-off,300:780].mean(axis=2)
    w=(s>205).sum(axis=1)
    print(nm, " ".join(f"{1140+i}:{v}" for i,v in enumerate(w) if True)[:0] or "")
    # find local minima
    prof=[(1140+i,int(v)) for i,v in enumerate(w)]
    print("  ", prof)
print("\n### CAP heading fill level ###")
s=cap[1360-DY:1405-DY,480:600]; g=s.mean(axis=2)
print("  CAP heading percentiles:", [round(float(np.percentile(g,p)),1) for p in (1,10,50,80,90,95,99,100)])
s=ref[1360:1405,480:600]; g=ref[1360:1405,480:600].mean(axis=2)
print("  REF heading percentiles:", [round(float(np.percentile(g,p)),1) for p in (1,10,50,80,90,95,99,100)])
print("\n### glyph cap-heights summary ###")
def h(A,x0,x1,y0,y1,thr,mode,lbl,off=0):
    g=A[y0-off:y1-off,x0:x1].mean(axis=2)
    m = g<thr if mode=='d' else g>thr
    ys,xs=np.where(m)
    print(f"  {lbl}: h={ys.max()-ys.min()+1} (y{ys.min()+y0}..{ys.max()+y0}) w={xs.max()-xs.min()+1} px={m.sum()}")
    return ys.max()-ys.min()+1
a=h(ref,300,780,1145,1230,205,'w',"REF desc white-core")
b=h(cap,300,780,1145,1230,205,'w',"CAP desc white-core",DY)
print(f"   ratio {b/a:.3f}")
