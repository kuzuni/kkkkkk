#!/usr/bin/env python3
# Critic F - full diff audit for 33-재화-정보-팝업 (ref 1080x2340 JPEG) vs docs/review/33-r3.png (1080x1920 PNG)
# PIL only. vertical mapping: impl_y = ref_y - 210.  Phases run top-to-bottom.

# ================= PHASE: critF33.py =================
# Critic F - diff audit for 33-재화-정보-팝업 (ref 1080x2340) vs 33-r3.png (1080x1920)
# PIL only. vertical mapping: impl_y = ref_y - 210
from PIL import Image, ImageFilter, ImageChops
import math, sys
from collections import deque

REF = 'docs/ref/33-재화-정보-팝업.jpg'
CAP = 'docs/review/33-r3.png'
DY = 210

ref = Image.open(REF).convert('RGB')
cap = Image.open(CAP).convert('RGB')
RW, RH = ref.size
CW, CH = cap.size

def px(im): return im.load()

out = []
def P(*a):
    s = ' '.join(str(x) for x in a)
    out.append(s); print(s)

P('=== sizes ===', ref.size, cap.size)

# ---------------------------------------------------------------- helpers
def col(im, x, y):
    return im.getpixel((x, y))

def dist(c1, c2):
    return max(abs(c1[0]-c2[0]), abs(c1[1]-c2[1]), abs(c1[2]-c2[2]))

# ================================================================ 1. confidence cross-check
P('\n########## 1. CONFIDENCE CROSS-CHECK ##########')

# --- popup border box: find the dark outline ring against the busy background.
# scan row through popup middle for the near-black ring (very dark pixels)
def darkmask_scan_row(im, y, x0, x1, thr=70):
    p = im.load(); res=[]
    for x in range(x0, x1):
        c=p[x,y]
        if max(c) < thr: res.append(x)
    return res

def find_popup_edges(im, ycenter, x0=150, x1=950, thr=80):
    p=im.load()
    # from left find first run of >=3 dark px
    L=None
    x=x0
    while x < x1-3:
        if all(max(p[x+k,ycenter])<thr for k in range(3)):
            L=x; break
        x+=1
    R=None
    x=x1-1
    while x> x0+3:
        if all(max(p[x-k,ycenter])<thr for k in range(3)):
            R=x; break
        x-=1
    return L,R

for name, im, yc in (('ref', ref, 1200), ('cap', cap, 990)):
    L,R = find_popup_edges(im, yc)
    P(f'  {name} popup outer edges @y={yc}: L={L} R={R} w={None if L is None else R-L+1}')

def find_popup_vedges(im, xcenter, y0, y1, thr=80):
    p=im.load()
    T=None
    y=y0
    while y<y1-3:
        if all(max(p[xcenter,y+k])<thr for k in range(3)):
            T=y;break
        y+=1
    B=None
    y=y1-1
    while y>y0+3:
        if all(max(p[xcenter,y-k])<thr for k in range(3)):
            B=y;break
        y-=1
    return T,B

for name, im, y0,y1 in (('ref', ref, 700, 1700), ('cap', cap, 490, 1490)):
    T,B = find_popup_vedges(im, 540, y0, y1)
    P(f'  {name} popup outer edges @x=540: T={T} B={B} h={None if T is None else B-T+1}')

# --- header bar (brown ~ (86,68,58)-ish dark brown fill) & cream fill
def classify(c):
    r,g,b=c
    return (r,g,b)

# header brown sample
P('  ref header sample (540,830):', col(ref,540,830), ' cap (540,620):', col(cap,540,620))
P('  ref cream sample (300,1000):', col(ref,300,1000), ' cap (300,790):', col(cap,300,790))

# find header bar horizontal extent at y where header is (ref 830 / cap 620)
def find_band(im, y, x0, x1, target, tol=40):
    p=im.load(); xs=[x for x in range(x0,x1) if dist(p[x,y],target)<=tol]
    return (min(xs),max(xs),len(xs)) if xs else None

hdr_ref = col(ref,540,830); hdr_cap = col(cap,540,620)
P('  ref header band @830:', find_band(ref,830,200,900,hdr_ref,35))
P('  cap header band @620:', find_band(cap,620,200,900,hdr_cap,35))

cr_ref = col(ref,300,1000); cr_cap = col(cap,300,790)
P('  ref cream band @1000:', find_band(ref,1000,200,900,cr_ref,26))
P('  cap cream band @790:', find_band(cap,790,200,900,cr_cap,26))

# vertical extents of header & cream on x=540 excluding text -> use x=270 (left, inside)
def find_vband(im, x, y0, y1, target, tol=35):
    p=im.load(); ys=[y for y in range(y0,y1) if dist(p[x,y],target)<=tol]
    if not ys: return None
    # longest contiguous run
    best=(ys[0],ys[0]); cur=(ys[0],ys[0])
    for y in ys[1:]:
        if y==cur[1]+1: cur=(cur[0],y)
        else:
            if cur[1]-cur[0]>best[1]-best[0]: best=cur
            cur=(y,y)
    if cur[1]-cur[0]>best[1]-best[0]: best=cur
    return best[0],best[1],best[1]-best[0]+1

P('  ref header vband @x=270:', find_vband(ref,270,760,960,hdr_ref,32))
P('  cap header vband @x=270:', find_vband(cap,270,550,750,hdr_cap,32))
P('  ref cream vband @x=270:', find_vband(ref,270,860,1620,cr_ref,24))
P('  cap cream vband @x=270:', find_vband(cap,270,650,1410,cr_cap,24))

# ================================================================ 2. DIFF BLOBS
P('\n########## 2. DIFF BLOBS ##########')
X0,X1 = 241, 839          # popup region, exclusive right
RY0,RY1 = 781, 1594
CY0,CY1 = RY0-DY, RY1-DY

rc = ref.crop((X0,RY0,X1,RY1))
cc = cap.crop((X0,CY0,X1,CY1))
W,H = rc.size
P('  aligned region size:', rc.size, cc.size)

# blur both slightly to normalise JPEG ringing, then diff (max channel)
rb = rc.filter(ImageFilter.GaussianBlur(1.0))
cb = cc.filter(ImageFilter.GaussianBlur(1.0))
rbp, cbp = rb.load(), cb.load()

def build_diff(thr):
    m = bytearray(W*H)
    for y in range(H):
        base=y*W
        for x in range(W):
            a=rbp[x,y]; b=cbp[x,y]
            d=max(abs(a[0]-b[0]),abs(a[1]-b[1]),abs(a[2]-b[2]))
            if d>=thr: m[base+x]=1
    return m

def erode(m):
    # remove pixels whose 4-neighbours aren't all set -> kills <=2px JPEG fringes
    n=bytearray(W*H)
    for y in range(1,H-1):
        b=y*W
        for x in range(1,W-1):
            if m[b+x] and m[b+x-1] and m[b+x+1] and m[b-W+x] and m[b+W+x]:
                n[b+x]=1
    return n

def dilate(m,src):
    n=bytearray(m)
    for y in range(1,H-1):
        b=y*W
        for x in range(1,W-1):
            if m[b+x]:
                for dy in(-1,0,1):
                    for dx in(-1,0,1):
                        i=b+dy*W+x+dx
                        if src[i]: n[i]=1
    return n

def blobs(m, minarea=40):
    seen=bytearray(W*H); res=[]
    for y in range(H):
        b=y*W
        for x in range(W):
            i=b+x
            if m[i] and not seen[i]:
                q=deque([i]); seen[i]=1; cells=[]
                while q:
                    j=q.popleft(); cells.append(j)
                    jy,jx = divmod(j,W)
                    for dy in(-2,-1,0,1,2):
                        for dx in(-2,-1,0,1,2):
                            ny,nx=jy+dy,jx+dx
                            if 0<=ny<H and 0<=nx<W:
                                k=ny*W+nx
                                if m[k] and not seen[k]:
                                    seen[k]=1;q.append(k)
                if len(cells)>=minarea:
                    ys=[c//W for c in cells]; xs=[c%W for c in cells]
                    res.append((len(cells),min(xs),min(ys),max(xs),max(ys)))
    res.sort(reverse=True)
    return res

def region_stats(bx0,by0,bx1,by1):
    """decide missing / extra / shift by comparing luminance & 'ink' in both."""
    rr = rc.crop((bx0,by0,bx1+1,by1+1)); ccx = cc.crop((bx0,by0,bx1+1,by1+1))
    def stat(im):
        p=im.load(); w,h=im.size
        lum=[];
        for y in range(h):
            for x in range(w):
                c=p[x,y]; lum.append(0.299*c[0]+0.587*c[1]+0.114*c[2])
        mean=sum(lum)/len(lum)
        var=sum((v-mean)**2 for v in lum)/len(lum)
        return mean, math.sqrt(var), min(lum), max(lum)
    return stat(rr), stat(ccx)

for THR in (30, 9):
    P(f'\n----- threshold {THR} (blur1.0, erode x1 => drops <=2px fringes) -----')
    m=build_diff(THR)
    raw=sum(m)
    e=erode(m)
    P(f'  raw diff px={raw} ({100*raw/(W*H):.2f}%)  after erode={sum(e)} ({100*sum(e)/(W*H):.2f}%)')
    bs=blobs(e, 40 if THR==30 else 60)
    P(f'  blobs>= min area: {len(bs)}')
    for k,(area,x0,y0,x1,y1) in enumerate(bs[:14]):
        gx0,gy0 = x0+X0, y0+RY0
        rs,cs = region_stats(x0,y0,x1,y1)
        P(f'   #{k+1} area={area:5d} bbox ref=({gx0},{gy0})-({x1+X0},{y1+RY0}) '
          f'w={x1-x0+1} h={y1-y0+1} | ref lum {rs[0]:.0f}±{rs[1]:.0f} [{rs[2]:.0f},{rs[3]:.0f}] '
          f'| cap lum {cs[0]:.0f}±{cs[1]:.0f} [{cs[2]:.0f},{cs[3]:.0f}]')

# ================================================================ 3. thin-layer hunt at thr 9
P('\n########## 3. THIN LAYER HUNT (rows/cols profile, thr 9) ##########')
m9=erode(build_diff(9))
rowsum=[sum(m9[y*W:(y+1)*W]) for y in range(H)]
colsum=[sum(m9[y*W+x] for y in range(H)) for x in range(W)]
P('  rows with >30% width differing:')
for y,v in enumerate(rowsum):
    if v > 0.30*W:
        P(f'    ref_y={y+RY0} cap_y={y+CY0} diffpx={v} ({100*v/W:.0f}%)')
P('  cols with >30% height differing:')
for x,v in enumerate(colsum):
    if v > 0.30*H:
        P(f'    ref_x={x+X0} diffpx={v} ({100*v/H:.0f}%)')

# ================================================================ 4. FALSIFICATION TESTS
P('\n########## 4. FALSIFICATION ##########')

# ---- (A) white text stroke thickness / ink density on the 2 description lines
# description text lines: find them by scanning for white pixels inside desc panel
def desc_panel(im, y0, y1, x0=270, x1=810):
    return None

def white_rows(im, x0,x1,y0,y1, wthr=200):
    p=im.load(); rows=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if min(p[x,y])>=wthr)
        rows.append((y,n))
    return rows

P('\n--- (A) white glyph stroke / ink density : description 2 lines ---')
# locate desc lines
for name, im, yo in (('ref',ref,0), ('cap',cap,-DY)):
    rows = white_rows(im, 280,800, 1150+yo, 1260+yo)
    ys=[y for y,n in rows if n>5]
    P(f'  {name}: white rows in desc band {min(ys) if ys else None}..{max(ys) if ys else None}')

# Use identical *ref-space* bands for both; measure per-line
LINES = [(1155,1200),(1205,1250)]   # ref coords, two description lines
def ink_stats(im, x0,x1, y0,y1, wthr=205, dthr=110):
    p=im.load()
    white=0; dark=0; tot=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=p[x,y]; l=0.299*c[0]+0.587*c[1]+0.114*c[2]
            tot+=1
            if min(c)>=wthr: white+=1
            elif l<=dthr: dark+=1
    return white,dark,tot

def stroke_widths(im, x0,x1,y0,y1, wthr=205, dthr=110):
    """for each scanline, find transitions bg->dark->white; record the dark run
       immediately preceding a white run = one-sided outline thickness."""
    p=im.load(); widths=[]
    for y in range(y0,y1):
        run=0; state=None
        prevdark=0
        x=x0
        while x<x1:
            c=p[x,y]; l=0.299*c[0]+0.587*c[1]+0.114*c[2]
            isw = min(c)>=wthr
            isd = (not isw) and l<=dthr
            if isd:
                prevdark+=1
            elif isw:
                if prevdark>0:
                    widths.append(prevdark)
                prevdark=0
            else:
                prevdark=0
            x+=1
    return widths

def core_runs(im,x0,x1,y0,y1,wthr=205):
    p=im.load(); runs=[]
    for y in range(y0,y1):
        run=0
        for x in range(x0,x1):
            if min(p[x,y])>=wthr: run+=1
            else:
                if run>0: runs.append(run); run=0
        if run: runs.append(run)
    return runs

for i,(ly0,ly1) in enumerate(LINES,1):
    rw = stroke_widths(ref, 280,800, ly0,ly1)
    cw = stroke_widths(cap, 280,800, ly0-DY,ly1-DY)
    rwh,rdk,rt = ink_stats(ref,280,800,ly0,ly1)
    cwh,cdk,ct = ink_stats(cap,280,800,ly0-DY,ly1-DY)
    rcore=core_runs(ref,280,800,ly0,ly1); ccore=core_runs(cap,280,800,ly0-DY,ly1-DY)
    def med(v):
        v=sorted(v); return v[len(v)//2] if v else 0
    def mean(v): return sum(v)/len(v) if v else 0
    P(f'  line{i} ref: one-side outline n={len(rw)} mean={mean(rw):.2f} med={med(rw)} | '
      f'white px={rwh} ({100*rwh/rt:.2f}%) dark px={rdk} ({100*rdk/rt:.2f}%) dark/white={rdk/max(rwh,1):.2f} '
      f'| core runs n={len(rcore)} mean={mean(rcore):.2f}')
    P(f'  line{i} cap: one-side outline n={len(cw)} mean={mean(cw):.2f} med={med(cw)} | '
      f'white px={cwh} ({100*cwh/ct:.2f}%) dark px={cdk} ({100*cdk/ct:.2f}%) dark/white={cdk/max(cwh,1):.2f} '
      f'| core runs n={len(ccore)} mean={mean(ccore):.2f}')
    P(f'  line{i} RATIO cap/ref: outline={mean(cw)/max(mean(rw),1e-9):.3f} '
      f'whitearea={cwh/max(rwh,1):.3f} dark={cdk/max(rdk,1):.3f} darkwhite={ (cdk/max(cwh,1))/max(rdk/max(rwh,1),1e-9):.3f} '
      f'core={mean(ccore)/max(mean(rcore),1e-9):.3f}')

# ---- (B) header bottom <-> cream top seam
P('\n--- (B) header/cream seam ---')
for name, im, yo in (('ref',ref,0),('cap',cap,-DY)):
    p=im.load()
    P(f'  {name} column x=300 scan ref_y 865..900:')
    s=[]
    for y in range(865,901):
        c=p[300,y+yo]
        s.append(f'{y}:{c}')
    for k in range(0,len(s),6):
        P('     '+'  '.join(s[k:k+6]))
# quantify: count rows between header brown end and cream start that match ring brown (86,68,58)
RING=(86,68,58)
for name, im, yo in (('ref',ref,0),('cap',cap,-DY)):
    p=im.load()
    cnt=0; rows=[]
    for y in range(860,905):
        # sample across width inside popup
        hits=sum(1 for x in range(280,800,7) if dist(p[x,y+yo],RING)<=22)
        if hits> (len(range(280,800,7))*0.7):
            cnt+=1; rows.append(y)
    P(f'  {name}: rows matching ring-brown{RING} +-22 across seam = {cnt} {rows}')

# ---- (C) desc panel opaque vs list panel translucent : star-lattice local variance
P('\n--- (C) panel translucency (star lattice bleed-through) ---')
# desc panel ref approx x 268..812, y 1140..1345 ; list panel ref y 1400..1560
def local_dev(im, x0,x1,y0,y1, yo=0, skip_bright=True):
    """std-dev of luminance over the panel, ignoring glyph pixels (very bright/very dark)."""
    p=im.load(); vals=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=p[x,y+yo]; l=0.299*c[0]+0.587*c[1]+0.114*c[2]
            if 60 < l < 205:
                vals.append(l)
    if not vals: return None
    m=sum(vals)/len(vals); v=sum((t-m)**2 for t in vals)/len(vals)
    return m, math.sqrt(v), len(vals)

REGIONS = [
 ('desc panel (glyph-free lower half)', 280,800,1265,1340),
 ('list panel (right glyph-free part)', 560,800,1400,1560),
 ('cream bg left of desc panel',        246,262,1150,1340),
]
for label,x0,x1,y0,y1 in REGIONS:
    r=local_dev(ref,x0,x1,y0,y1,0)
    c=local_dev(cap,x0,x1,y0,y1,-DY)
    P(f'  {label}: ref mean={r[0]:.1f} sd={r[1]:.2f} n={r[2]} | cap mean={c[0]:.1f} sd={c[1]:.2f} n={c[2]}')

# explicit star spot check: sample known star centres vs neighbouring panel
def probe(im, x,y,yo=0):
    return im.getpixel((x,y+yo))
P('  probe points (star inside desc panel area / star inside list panel):')
for (x,y,tag) in [(300,1500,'list-panel-left-star?'),(760,1480,'list-panel-right-star?'),
                  (300,1300,'desc-panel-left'),(760,1300,'desc-panel-right'),
                  (700,1180,'desc-panel-upper-right')]:
    P(f'    {tag} ({x},{y}) ref={probe(ref,x,y)} cap={probe(cap,x,y,-DY)}')

with open('/tmp/critF33_out.txt','w') as f:
    f.write('\n'.join(out))

# ================= PHASE: critF33b.py =================
# Critic F - part 2 : precise geometry, thin-layer edges, sub-pixel shift, translucency
from PIL import Image, ImageFilter
import math
ref = Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')
cap = Image.open('docs/review/33-r3.png').convert('RGB')
DY=210
rp, cp = ref.load(), cap.load()
def C(im,x,y): return im.getpixel((x,y))
def d(a,b): return max(abs(a[0]-b[0]),abs(a[1]-b[1]),abs(a[2]-b[2]))

print('=========== 1. GEOMETRY (ref-space; cap sampled at y-210) ===========')
HDR=(82,62,61); CREAM=(240,217,186); RING=(86,68,58)

def edge_lr(im, y, yo, target, tol, x0=200, x1=900):
    p=im.load(); xs=[x for x in range(x0,x1) if d(p[x,y+yo],target)<=tol]
    if not xs: return None
    return min(xs),max(xs),max(xs)-min(xs)+1

def edge_tb(im, x, yo, target, tol, y0, y1):
    p=im.load(); ys=[y for y in range(y0,y1) if d(p[x,y+yo],target)<=tol]
    if not ys: return None
    best=cur=(ys[0],ys[0])
    for y in ys[1:]:
        if y==cur[1]+1: cur=(cur[0],y)
        else:
            if cur[1]-cur[0]>best[1]-best[0]: best=cur
            cur=(y,y)
    if cur[1]-cur[0]>best[1]-best[0]: best=cur
    return best[0],best[1],best[1]-best[0]+1

# --- popup border box: outermost non-background. Use the dark ring: scan from popup
#     centre outward until we leave the ring (ring is dark brown, bg is busy art).
def outer_edges(im, yo):
    p=im.load()
    res={}
    y=1200   # ref-space, inside cream
    # go left from x=400 until pixel stops being cream/ring-ish, i.e. find ring then bg
    x=400
    while x>150 and d(p[x,y+yo],CREAM)<=40: x-=1
    ring_in_L=x+1
    while x>100 and (p[x,y+yo][0]<160): x-=1     # ring is dark
    ring_out_L=x+1
    x=680
    while x<950 and d(p[x,y+yo],CREAM)<=40: x+=1
    ring_in_R=x-1
    while x<1000 and (p[x,y+yo][0]<160): x+=1
    ring_out_R=x-1
    res['L_in,L_out']=(ring_in_L,ring_out_L)
    res['R_in,R_out']=(ring_in_R,ring_out_R)
    # vertical, at x=300 (inside cream / header)
    x=300
    y=830
    while y>740 and p[x,y+yo][0]<170: y-=1
    top_out=y+1
    y=1500
    while y<1700 and p[x,y+yo][0]<230 or d(p[x,y+yo],CREAM)<=40:
        if y>1690: break
        y+=1
    res['top_out']=top_out
    return res

for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print(f' {nm}', outer_edges(im,yo))

# bottom of popup: scan x=300 downward from cream
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    p=im.load(); rows=[]
    for y in range(1550,1620):
        rows.append((y,p[300,y+yo]))
    print(f' {nm} x=300 bottom seam:', ' '.join(f'{y}:{c}' for y,c in rows[::2]))

print('\n--- header bar band (fill 82,62,61 tol 14) ---')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print(f'  {nm} horiz @y=800:', edge_lr(im,800,yo,HDR,14))
    print(f'  {nm} horiz @y=870:', edge_lr(im,870,yo,HDR,14))
    print(f'  {nm} vert  @x=300:', edge_tb(im,300,yo,HDR,14,760,960))
    print(f'  {nm} vert  @x=800:', edge_tb(im,800,yo,HDR,14,760,960))

print('\n--- cream fill (240,217,186 tol 18) ---')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print(f'  {nm} horiz @y=900:', edge_lr(im,900,yo,CREAM,18))
    print(f'  {nm} horiz @y=1560:',edge_lr(im,1560,yo,CREAM,18))
    print(f'  {nm} vert  @x=270:', edge_tb(im,270,yo,CREAM,18,860,1620))
    print(f'  {nm} vert  @x=810:', edge_tb(im,810,yo,CREAM,18,860,1620))

print('\n=========== 2. THIN-LAYER EDGE PROBES ===========')
def probe_col(x, ys, ye):
    print(f'  --- vertical scan at x={x} ---')
    for y in range(ys,ye):
        print(f'    y={y:5d} ref={rp[x,y]}  cap={cp[x,y-DY]}  Δ={d(rp[x,y],cp[x,y-DY])}')
def probe_row(y, xs, xe, step=1):
    print(f'  --- horizontal scan at ref_y={y} ---')
    for x in range(xs,xe,step):
        print(f'    x={x:5d} ref={rp[x,y]}  cap={cp[x,y-DY]}  Δ={d(rp[x,y],cp[x,y-DY])}')

print('\n [row 789] popup top / header top edge')
probe_col(400, 780, 800)
print('\n [rows 1568..1600] cream bottom / popup bottom edge')
probe_col(400, 1562, 1600)
print('\n [col 260 / 819] cream left+right edge, at y=1000')
probe_row(1000, 252, 272)
probe_row(1000, 810, 830)
print('\n [seam rows 876..886] at x=700')
probe_col(700, 874, 888)

print('\n=========== 3. SHIFT / ALIGNMENT of same-text elements ===========')
def mask(im, x0,x1,y0,y1, yo, wthr=205):
    p=im.load()
    return [[1 if min(p[x,y+yo])>=wthr else 0 for x in range(x0,x1)] for y in range(y0,y1)]
def bbox_white(im,x0,x1,y0,y1,yo,wthr=205,minrun=2):
    p=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if min(p[x,y+yo])>=wthr: xs.append(x);ys.append(y)
    if not xs: return None
    return min(xs),min(ys),max(xs),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1,len(xs)

print(' description line1 white-core bbox (search box 270..810, 1145..1190):')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('  ',nm, bbox_white(im,270,810,1145,1190,yo))
print(' description line2 white-core bbox (search box 270..810, 1190..1235):')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('  ',nm, bbox_white(im,270,810,1190,1235,yo))

def bbox_col(im,x0,x1,y0,y1,yo,target,tol):
    p=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if d(p[x,y+yo],target)<=tol: xs.append(x);ys.append(y)
    if not xs: return None
    return min(xs),min(ys),max(xs),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1,len(xs)

print(' "획득처" heading (yellow-ish glyph) bbox, search 400..690, 1350..1410:')
YEL=(255,214,70)
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('  ',nm, bbox_col(im,400,690,1350,1410,yo,YEL,70))
print(' "보유:" label green glyph bbox, search 380..560, 1065..1125:')
GRN=(150,255,110)
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('  ',nm, bbox_col(im,380,700,1060,1130,yo,GRN,75))
print(' icon frame (orange fill) bbox, search 400..680, 880..1080:')
ORG=(228,150,26)
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('  ',nm, bbox_col(im,400,690,880,1090,yo,ORG,60))
print(' desc panel fill (196,175,148 tol 12) bbox, search 250..830, 1120..1360:')
PAN=(196,175,148)
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('  ',nm, bbox_col(im,250,835,1120,1365,yo,PAN,12))
print(' list panel fill bbox, search 250..830, 1380..1580:')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('  ',nm, bbox_col(im,250,835,1380,1585,yo,PAN,14))
print(' check marks (green) bboxes, search 280..340, 1400..1540:')
CHK=(120,220,60)
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    p=im.load(); rows={}
    for y in range(1395,1545):
        n=sum(1 for x in range(280,345) if d(p[x,y+yo],CHK)<=80)
        if n>0: rows[y]=n
    ys=sorted(rows)
    # group
    grp=[];cur=[ys[0]]
    for y in ys[1:]:
        if y-cur[-1]<=3: cur.append(y)
        else: grp.append(cur);cur=[y]
    grp.append(cur)
    print('  ',nm,[ (g[0],g[-1],g[-1]-g[0]+1) for g in grp])
    xs_all=[]
    for g in grp:
        xs=[x for y in g for x in range(280,345) if d(p[x,y+yo],CHK)<=80]
        xs_all.append((min(xs),max(xs)))
    print('     x-extents:',xs_all)

print('\n=========== 4. TRANSLUCENCY (median-filtered sd) ===========')
def med_sd(im,x0,x1,y0,y1,yo):
    box=im.crop((x0,y0+yo,x1,y1+yo)).filter(ImageFilter.MedianFilter(5)).convert('L')
    p=box.load(); w,h=box.size
    v=[p[x,y] for y in range(2,h-2) for x in range(2,w-2)]
    m=sum(v)/len(v); s=math.sqrt(sum((t-m)**2 for t in v)/len(v))
    return m,s,min(v),max(v)
for label,x0,x1,y0,y1 in [
    ('DESC panel interior (no glyphs) 1250..1345', 280,800,1250,1345),
    ('LIST panel interior (no glyphs) 1400..1560', 470,800,1400,1560),
    ('LIST panel lower-right corner star zone',    640,800,1440,1560),
    ('CREAM bg (no panel) right strip',            760,812,1240,1350),
    ('CREAM bg star zone upper-left',              280,360,930,1040),
]:
    r=med_sd(ref,x0,x1,y0,y1,0); c=med_sd(cap,x0,x1,y0,y1,-DY)
    print(f'  {label}\n     ref mean={r[0]:.1f} sd={r[1]:.2f} range[{r[2]},{r[3]}] | cap mean={c[0]:.1f} sd={c[1]:.2f} range[{c[2]},{c[3]}]')

# ================= PHASE: critF33c.py =================
# Critic F - part 3 : blur-invariant ink mass, star-bleed translucency, exact seam, sizes
from PIL import Image
import math
ref = Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')
cap = Image.open('docs/review/33-r3.png').convert('RGB')
DY=210
rp,cp = ref.load(), cap.load()
def L(c): return 0.299*c[0]+0.587*c[1]+0.114*c[2]
def d(a,b): return max(abs(a[0]-b[0]),abs(a[1]-b[1]),abs(a[2]-b[2]))

PANEL=(196,175,148); PL=L(PANEL)
CREAM=(240,217,186); CL=L(CREAM)
print(f'panel lum={PL:.1f} cream lum={CL:.1f}')

print('\n=========== A. BLUR-INVARIANT INK MASS (description 2 lines) ===========')
print('  metric: DarkMass=sum(max(0,bg-lum)), WhiteMass=sum(max(0,lum-bg)); integrals are')
print('  preserved under blur, so JPEG softness cannot bias them.')
def ink(im, yo, x0,x1,y0,y1, bg):
    p=im.load(); dm=0.0; wm=0.0; mn=999; mx=-1
    for y in range(y0,y1):
        for x in range(x0,x1):
            l=L(p[x,y+yo])
            mn=min(mn,l); mx=max(mx,l)
            if l<bg: dm+=bg-l
            else: wm+=l-bg
    return dm,wm,mn,mx

BANDS=[('line1',300,790,1146,1188),('line2',300,790,1186,1228)]
res={}
for nm,x0,x1,y0,y1 in BANDS:
    r=ink(ref,0,x0,x1,y0,y1,PL); c=ink(cap,-DY,x0,x1,y0,y1,PL)
    # equivalent full-coverage areas
    rdark_lum, cdark_lum = r[2], c[2]
    Ar_w = r[1]/(255-PL); Ac_w = c[1]/(255-PL)
    Ar_d = r[0]/(PL-rdark_lum); Ac_d = c[0]/(PL-cdark_lum)
    print(f'\n  {nm} ref: DarkMass={r[0]:11.0f} WhiteMass={r[1]:11.0f} lum[{r[2]:.0f},{r[3]:.0f}]'
          f'  -> A_white={Ar_w:8.1f}px A_dark={Ar_d:8.1f}px  D/W={Ar_d/Ar_w:.3f}')
    print(f'  {nm} cap: DarkMass={c[0]:11.0f} WhiteMass={c[1]:11.0f} lum[{c[2]:.0f},{c[3]:.0f}]'
          f'  -> A_white={Ac_w:8.1f}px A_dark={Ac_d:8.1f}px  D/W={Ac_d/Ac_w:.3f}')
    print(f'  {nm} RATIO cap/ref : DarkMass={c[0]/r[0]:.3f}  WhiteMass={c[1]/r[1]:.3f} '
          f' A_white={Ac_w/Ar_w:.3f}  A_dark={Ac_d/Ar_d:.3f}  (D/W)={ (Ac_d/Ac_w)/(Ar_d/Ar_w):.3f}')
    res[nm]=(Ar_w,Ar_d,Ac_w,Ac_d)

# one-sided outline thickness via half-height crossing on horizontal scanlines
print('\n  --- one-sided outline thickness, sub-pixel, at half-amplitude crossings ---')
def outline_thickness(im, yo, x0,x1,y0,y1):
    """walk each scanline; find every maximal 'valley' where lum dips below the
       midpoint between bg(PL) and the darkest local value, measure its width at
       half-amplitude, but only for valleys that sit adjacent to a white plateau."""
    p=im.load(); ts=[]
    for y in range(y0,y1):
        prof=[L(p[x,y+yo]) for x in range(x0,x1)]
        n=len(prof)
        i=1
        while i<n-1:
            if prof[i]<PL-25:
                j=i
                while j<n-1 and prof[j]<PL-25: j+=1
                seg=prof[i:j]
                lo=min(seg)
                half=(PL+lo)/2.0
                w=sum(1 for v in seg if v<half)
                # count only if a white plateau (>PL+45) touches within 3px on a side
                left = any(prof[k]>PL+45 for k in range(max(0,i-3),i))
                right= any(prof[k]>PL+45 for k in range(j,min(n,j+3)))
                if (left ^ right) and 0<w<20:   # one-sided outline only
                    ts.append(w)
                i=j
            i+=1
    return ts
for nm,x0,x1,y0,y1 in BANDS:
    rt=outline_thickness(ref,0,x0,x1,y0,y1); ct=outline_thickness(cap,-DY,x0,x1,y0,y1)
    def m(v): return sum(v)/len(v) if v else 0
    def md(v):
        v=sorted(v); return v[len(v)//2] if v else 0
    print(f'   {nm} ref n={len(rt):4d} mean={m(rt):.2f} med={md(rt)} | cap n={len(ct):4d} mean={m(ct):.2f} med={md(ct)}'
          f' | ratio mean={m(ct)/max(m(rt),1e-9):.3f} med={md(ct)/max(md(rt),1e-9):.3f}')

print('\n=========== B. HEADER/CREAM SEAM - EXACT COLOUR TEST ===========')
RING=(86,68,58); HDR=(82,62,61)
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    p=im.load()
    print(f'  {nm}: per-row across x=270..810 (step 5), y=872..886')
    for y in range(872,887):
        ring=sum(1 for x in range(270,810,5) if d(p[x,y+yo],RING)<=3)
        hdr =sum(1 for x in range(270,810,5) if d(p[x,y+yo],HDR)<=3)
        crm =sum(1 for x in range(270,810,5) if d(p[x,y+yo],CREAM)<=3)
        tot=len(range(270,810,5))
        print(f'    y={y}  ring(86,68,58)={ring:3d}/{tot}  header(82,62,61)={hdr:3d}/{tot}  cream={crm:3d}/{tot}')

print('\n=========== C. STAR-BLEED TRANSLUCENCY ===========')
# build star map from CAP cream area (PNG, clean): pixels in cream region whose colour
# differs from pure cream. Stars are (231,208,177)-ish (darker cream).
p=cp
print('  sampling cream-area colours to identify star tone:')
from collections import Counter
cnt=Counter()
for y in range(890,1560,3):
    for x in range(265,815,3):
        cnt[cp[x,y-DY]]+=1
for c,n in cnt.most_common(8):
    print(f'    {c}  n={n}  lum={L(c):.1f}')

def star_map(x0,x1,y0,y1):
    """True where cap cream-layer pixel is a star (not pure cream), using cap outside panels."""
    m={}
    for y in range(y0,y1):
        for x in range(x0,x1):
            m[(x,y)] = d(cp[x,y-DY],CREAM)>4
    return m

# region strictly inside DESC panel (find its box first)
def panel_box(im,yo,ysearch0,ysearch1):
    p=im.load(); xs=[];ys=[]
    for y in range(ysearch0,ysearch1):
        for x in range(255,825):
            c=p[x,y+yo]
            if abs(L(c)-PL)<9 and c[0]>c[2]:
                xs.append(x);ys.append(y)
    return (min(xs),min(ys),max(xs),max(ys)) if xs else None
print('\n  panel boxes (lum within 9 of panel lum):')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print(f'   {nm} DESC:', panel_box(im,yo,1125,1370), ' LIST:', panel_box(im,yo,1375,1580))

# translucency test: inside each panel, compare mean lum where the CREAM layer has a star
# vs where it does not.  Star positions taken from the star geometry of each image itself
# (stars in the free cream band above/beside panels are at the same coords in ref & cap?).
# Instead: measure the panel's own internal lum spread with a large-scale (16px) box average,
# which cancels JPEG noise but keeps a 40-80px star.
def boxavg_spread(im,yo,x0,x1,y0,y1,B=16):
    p=im.load(); vals=[]
    for by in range(y0,y1-B,B):
        for bx in range(x0,x1-B,B):
            s=0
            for y in range(by,by+B):
                for x in range(bx,bx+B):
                    s+=L(p[x,y+yo])
            vals.append(s/(B*B))
    m=sum(vals)/len(vals); sd=math.sqrt(sum((v-m)**2 for v in vals)/len(vals))
    return m,sd,min(vals),max(vals),len(vals)

print('\n  16x16 box-average spread (JPEG noise cancelled; a bled-through star survives):')
TESTS=[('DESC panel interior', 285,795,1255,1340),
       ('LIST panel interior', 285,795,1400,1555),
       ('LIST panel right half',560,795,1400,1555),
       ('CREAM open band (control, stars present)',270,810,905,1055)]
for lab,x0,x1,y0,y1 in TESTS:
    r=boxavg_spread(ref,0,x0,x1,y0,y1); c=boxavg_spread(cap,-DY,x0,x1,y0,y1)
    print(f'   {lab}\n      ref mean={r[0]:.2f} sd={r[1]:.2f} range=[{r[2]:.1f},{r[3]:.1f}] amp={r[3]-r[2]:.2f}'
          f'\n      cap mean={c[0]:.2f} sd={c[1]:.2f} range=[{c[2]:.1f},{c[3]:.1f}] amp={c[3]-c[2]:.2f}')

print('\n=========== D. ELEMENT SIZES ===========')
def dark_box(im,yo,x0,x1,y0,y1,thr=60):
    p=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if L(p[x,y+yo])<thr: xs.append(x);ys.append(y)
    return (min(xs),min(ys),max(xs),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1) if xs else None
print('  icon frame outer black outline (lum<60) in 430..660 / 880..1090:')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('   ',nm, dark_box(im,yo,430,660,880,1090))
print('  header title ink box (lum<60) in 400..690 / 795..875:')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('   ',nm, dark_box(im,yo,400,690,795,875))
print('  "획득처" ink box (lum<60) in 430..660 / 1355..1412:')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('   ',nm, dark_box(im,yo,430,660,1355,1412))
print('  "보유:" row ink box (lum<60) in 380..720 / 1060..1130:')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('   ',nm, dark_box(im,yo,380,720,1060,1130))
print('  desc line1 ink box (lum<60) 300..800 / 1146..1188:')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('   ',nm, dark_box(im,yo,300,800,1146,1188))
print('  desc line2 ink box (lum<60) 300..800 / 1186..1230:')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print('   ',nm, dark_box(im,yo,300,800,1186,1230))

print('\n  check marks: green mask (g>r+25 and g>b+40) rows in x 285..350')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    p=im.load(); rows={}
    for y in range(1400,1545):
        n=0; xs=[]
        for x in range(285,352):
            c=p[x,y+yo]
            if c[1]>c[0]+25 and c[1]>c[2]+40: n+=1; xs.append(x)
        if n>=2: rows[y]=(n,min(xs),max(xs))
    ys=sorted(rows); grp=[];cur=[ys[0]]
    for y in ys[1:]:
        if y-cur[-1]<=4: cur.append(y)
        else: grp.append(cur); cur=[y]
    grp.append(cur)
    o=[]
    for g in grp:
        xs=[rows[y][1] for y in g]+[rows[y][2] for y in g]
        o.append(f'y{g[0]}..{g[-1]}(h={g[-1]-g[0]+1}) x{min(xs)}..{max(xs)}(w={max(xs)-min(xs)+1})')
    print(f'   {nm}: '+' | '.join(o))

# ================= PHASE: critF33d.py =================
# Critic F - part 4 : strict-bound translucency, core erosion, header extent, gap table
from PIL import Image
import math
ref=Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')
cap=Image.open('docs/review/33-r3.png').convert('RGB')
DY=210; rp,cp=ref.load(),cap.load()
def L(c): return 0.299*c[0]+0.587*c[1]+0.114*c[2]
def d(a,b): return max(abs(a[0]-b[0]),abs(a[1]-b[1]),abs(a[2]-b[2]))
PANEL=(196,175,148); PL=L(PANEL); CREAM=(240,217,186); CL=L(CREAM)

print('===== 1. STRICT-BOUND TRANSLUCENCY (16x16 box avg, fully inside each panel) =====')
def boxavg(im,yo,x0,x1,y0,y1,B=16):
    p=im.load(); v=[]
    for by in range(y0,y1-B+1,B):
        for bx in range(x0,x1-B+1,B):
            s=0
            for y in range(by,by+B):
                for x in range(bx,bx+B): s+=L(p[x,y+yo])
            v.append(s/(B*B))
    m=sum(v)/len(v); sd=math.sqrt(sum((t-m)**2 for t in v)/len(v))
    return m,sd,min(v),max(v),len(v)
T=[('DESC panel, strictly inside, glyph-free (300..780, 1250..1360)',300,780,1250,1360),
   ('LIST panel, strictly inside, right of text (555..805, 1405..1560)',555,805,1405,1560),
   ('LIST panel, strictly inside, top strip (300..805, 1382..1408)',300,805,1382,1408),
   ('CREAM control band (300..800, 900..1050)',300,800,900,1050)]
for lab,x0,x1,y0,y1 in T:
    r=boxavg(ref,0,x0,x1,y0,y1); c=boxavg(cap,-DY,x0,x1,y0,y1)
    print(f'  {lab}')
    print(f'    ref mean={r[0]:7.2f} sd={r[1]:6.2f} amp={r[3]-r[2]:6.2f}  |  cap mean={c[0]:7.2f} sd={c[1]:6.2f} amp={c[3]-c[2]:6.2f}   n={r[4]}')

print('\n===== 2. WHITE-CORE EROSION (blur-fair, strictly inside desc panel) =====')
def ink(im,yo,x0,x1,y0,y1,white_lvl):
    p=im.load(); dm=wm=0.0
    for y in range(y0,y1):
        for x in range(x0,x1):
            l=L(p[x,y+yo])
            if l<PL: dm+=PL-l
            else: wm+=l-PL
    return dm/(PL-0.0), wm/(white_lvl-PL)
def core_mask_perim(im,yo,x0,x1,y0,y1,frac=0.5,white_lvl=255.0):
    """white core = lum above midpoint of panel and white; return area + perimeter"""
    thr=PL+frac*(white_lvl-PL)
    p=im.load(); W=x1-x0; H=y1-y0
    m=[[1 if L(p[x0+i,y0+j+yo])>=thr else 0 for i in range(W)] for j in range(H)]
    a=sum(sum(r) for r in m)
    per=0
    for j in range(1,H-1):
        for i in range(1,W-1):
            if m[j][i] and not(m[j][i-1] and m[j][i+1] and m[j-1][i] and m[j+1][i]): per+=1
    return a,per
BANDS=[('line1',302,785,1146,1188),('line2',302,785,1186,1228)]
for nm,x0,x1,y0,y1 in BANDS:
    rd,rw = ink(ref,0,x0,x1,y0,y1,255.0)
    cd,cw = ink(cap,-DY,x0,x1,y0,y1,249.0)
    ra,rper = core_mask_perim(ref,0,x0,x1,y0,y1,0.5,255.0)
    ca,cper = core_mask_perim(cap,-DY,x0,x1,y0,y1,0.5,249.0)
    delta = (ra-ca)/max((rper+cper)/2.0,1)
    print(f'  {nm}')
    print(f'    equiv-area  ref: dark={rd:8.1f}px white={rw:8.1f}px  D/W={rd/rw:.3f}')
    print(f'    equiv-area  cap: dark={cd:8.1f}px white={cw:8.1f}px  D/W={cd/cw:.3f}   (each image own white level)')
    print(f'    RATIO cap/ref: dark={cd/rd:.3f} white={cw/rw:.3f}  (D/W)={ (cd/cw)/(rd/rw):.3f}')
    print(f'    50%-core mask ref area={ra} perim={rper} | cap area={ca} perim={cper}'
          f' -> per-side core erosion delta = {delta:+.2f}px  (=> cap outline thicker by that much per side)')

print('\n===== 3. HEADER BAR EXACT HORIZONTAL EXTENT =====')
HDR=(82,62,61)
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    p=im.load()
    for y in (800,830,860,875):
        xs=[x for x in range(230,860) if d(p[x,y+yo],HDR)<=10]
        # longest run
        if not xs: print(f'  {nm} y={y}: none'); continue
        best=cur=(xs[0],xs[0])
        for x in xs[1:]:
            if x==cur[1]+1: cur=(cur[0],x)
            else:
                if cur[1]-cur[0]>best[1]-best[0]: best=cur
                cur=(x,x)
        if cur[1]-cur[0]>best[1]-best[0]: best=cur
        print(f'  {nm} y={y}: x {best[0]}..{best[1]} w={best[1]-best[0]+1}')

print('\n===== 4. GAP / RHYTHM TABLE (ref-space) =====')
def vrange(im,yo,x,y0,y1,target,tol):
    p=im.load(); ys=[y for y in range(y0,y1) if d(p[x,y+yo],target)<=tol]
    if not ys: return None
    best=cur=(ys[0],ys[0])
    for y in ys[1:]:
        if y==cur[1]+1: cur=(cur[0],y)
        else:
            if cur[1]-cur[0]>best[1]-best[0]: best=cur
            cur=(y,y)
    if cur[1]-cur[0]>best[1]-best[0]: best=cur
    return best
def hrange(im,yo,y,x0,x1,target,tol):
    p=im.load(); xs=[x for x in range(x0,x1) if d(p[x,y+yo],target)<=tol]
    if not xs: return None
    best=cur=(xs[0],xs[0])
    for x in xs[1:]:
        if x==cur[1]+1: cur=(cur[0],x)
        else:
            if cur[1]-cur[0]>best[1]-best[0]: best=cur
            cur=(x,x)
    if cur[1]-cur[0]>best[1]-best[0]: best=cur
    return best

print('  DESC panel edges: vertical at x=400 / horizontal at y=1300')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print(f'   {nm} v@400:',vrange(im,yo,400,1120,1375,PANEL,10),' h@1300:',hrange(im,yo,1300,255,825,PANEL,10))
print('  LIST panel edges: vertical at x=700 / horizontal at y=1440')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print(f'   {nm} v@700:',vrange(im,yo,700,1370,1580,PANEL,10),' h@1440:',hrange(im,yo,1440,255,825,PANEL,10))
print('  LIST panel horizontal at y=1550 (below text)')
for nm,im,yo in (('ref',ref,0),('cap',cap,-DY)):
    print(f'   {nm} h@1550:',hrange(im,yo,1550,255,825,PANEL,10))

print('\n  derived vertical rhythm (ref-space):')
def report(nm, hdr_b, icon_t, icon_b, hold_t, hold_b, dp_t, dp_b, hd_t, hd_b, lp_t, lp_b, cream_b):
    print(f'   {nm}: header_bottom={hdr_b}  icon={icon_t}..{icon_b}(h={icon_b-icon_t+1})'
          f'  hold={hold_t}..{hold_b}  descpanel={dp_t}..{dp_b}(h={dp_b-dp_t+1})'
          f'  heading={hd_t}..{hd_b}  listpanel={lp_t}..{lp_b}(h={lp_b-lp_t+1})  cream_bottom={cream_b}')
    print(f'      gaps: hdr->icon={icon_t-hdr_b-1}  icon->hold={hold_t-icon_b-1}  hold->descpanel={dp_t-hold_b-1}'
          f'  descpanel->heading={hd_t-dp_b-1}  heading->listpanel={lp_t-hd_b-1}  listpanel->cream_bottom={cream_b-lp_b}')

# ================= PHASE: f4.py =================
ref=Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')
cap=Image.open('docs/review/33-r3.png').convert('RGB')
DY=210; rp,cp=ref.load(),cap.load()
def L(c): return 0.299*c[0]+0.587*c[1]+0.114*c[2]
def d(a,b): return max(abs(a[0]-b[0]),abs(a[1]-b[1]),abs(a[2]-b[2]))
PANEL=(196,175,148); CREAM=(240,217,186); HDR=(82,62,61)
print('--- header bar left/right edge, raw pixels, y=820 and y=870 ---')
for y in (820,870):
    for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
        lft=' '.join(f'{x}:{L(p[x,y+yo]):.0f}' for x in range(244,258))
        rgt=' '.join(f'{x}:{L(p[x,y+yo]):.0f}' for x in range(823,837))
        print(f' y={y} {nm} L[{lft}]  R[{rgt}]')
print('\n--- DESC panel box: scan rows/cols for panel colour (tol 8) ---')
def box(p,yo,x0,x1,y0,y1,t=8):
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if d(p[x,y+yo],PANEL)<=t: xs.append(x); ys.append(y)
    return (min(xs),min(ys),max(xs),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1)
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    print(' ',nm,'DESC',box(p,yo,262,818,1120,1372))
    print(' ',nm,'LIST',box(p,yo,262,818,1374,1580))
print('\n--- vertical profile at x=780 (right gutter, no glyphs) 1120..1580 : panel vs cream ---')
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    runs=[];cur=None
    for y in range(1120,1580):
        c=p[780,y+yo]
        k='P' if d(c,PANEL)<=14 else ('C' if d(c,CREAM)<=14 else '?')
        if cur and cur[0]==k: cur[2]=y
        else:
            if cur: runs.append(cur)
            cur=[k,y,y]
    runs.append(cur)
    print(' ',nm,[f'{k}{a}-{b}' for k,a,b in runs if b-a>=2])
print('\n--- icon frame black outline + orange, exact ---')
def dbox(p,yo,x0,x1,y0,y1,thr):
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if L(p[x,y+yo])<thr: xs.append(x);ys.append(y)
    return (min(xs),min(ys),max(xs),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1)
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    print(' ',nm,'icon black outline', dbox(p,yo,430,660,885,1080,70))
print('\n--- icon frame: horizontal scan y=980 and vertical scan x=540, luminance ---')
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    xs=[x for x in range(430,660) if L(p[x,980+yo])<70]
    ys=[y for y in range(885,1080) if L(p[470,y+yo])<70]
    print(f'  {nm} y=980 dark x runs {min(xs)}..{max(xs)}   x=470 dark y {min(ys)}..{max(ys)}')

# ================= PHASE: f5.py =================
ref=Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')
cap=Image.open('docs/review/33-r3.png').convert('RGB')
DY=210; rp,cp=ref.load(),cap.load()
def L(c): return 0.299*c[0]+0.587*c[1]+0.114*c[2]
def d(a,b): return max(abs(a[0]-b[0]),abs(a[1]-b[1]),abs(a[2]-b[2]))
PANEL=(196,175,148); CREAM=(240,217,186); MID=(178.2+220.3)/2
print('--- panel/cream half-threshold(199 lum) vertical transitions at x=780 and x=300 ---')
for x in (780,300):
    for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
        st=[]; prev=None
        for y in range(1110,1585):
            v = L(p[x,y+yo])<MID   # True = panel side
            if prev is None: prev=v; start=y
            elif v!=prev:
                st.append((prev,start,y-1)); prev=v; start=y
        st.append((prev,start,1584))
        print(f'  x={x} {nm}: '+' '.join(f'{"PANEL" if a else "cream"}{b}-{c}' for a,b,c in st if c-b>=3))
print('\n--- row scans to locate DESC panel bottom edge ---')
for y in (1330,1340,1345,1350,1360,1370):
    for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
        xs=[x for x in range(262,818) if d(p[x,y+yo],PANEL)<=10]
        print(f'  y={y} {nm}: n={len(xs)} span={(min(xs),max(xs)) if xs else None}')
print('\n--- icon frame black outline, window 885..1068 ---')
def dbox(p,yo,x0,x1,y0,y1,thr):
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if L(p[x,y+yo])<thr: xs.append(x);ys.append(y)
    return (min(xs),min(ys),max(xs),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1)
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    print(' ',nm, dbox(p,yo,435,655,885,1068,70))
print('\n--- "보유:" ink box, window 1066..1130 ---')
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    print(' ',nm, dbox(p,yo,380,720,1066,1130,70))
print('\n--- list rows: ink box of each list item text (x 340..800) ---')
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    o=[]
    for a,b in ((1405,1450),(1448,1492),(1490,1535)):
        try: o.append(dbox(p,yo,340,800,a,b,70))
        except: o.append(None)
    print(' ',nm,o)
print('\n--- popup outer black outline: top/bottom/left/right at mid ---')
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    ys=[y for y in range(760,1620) if L(p[540,y+yo])<25]
    top=[y for y in ys if y<900]; bot=[y for y in ys if y>1500]
    xs=[x for x in range(200,900) if L(p[x,1200+yo])<25]
    lf=[x for x in xs if x<400]; rt=[x for x in xs if x>700]
    print(f'  {nm}: top black {min(top)}..{max(top)}  bottom black {min(bot)}..{max(bot)}  left {min(lf)}..{max(lf)}  right {min(rt)}..{max(rt)}')

# ================= PHASE: f6.py =================
ref=Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')
cap=Image.open('docs/review/33-r3.png').convert('RGB')
DY=210; rp,cp=ref.load(),cap.load()
def L(c): return 0.299*c[0]+0.587*c[1]+0.114*c[2]
print('--- popup left/right border layer stack at y=1450 (list-panel band, quiet bg) ---')
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    print(f'  {nm} L:', ' '.join(f'{x}:{p[x,1450+yo]}' for x in range(236,264)))
    print(f'  {nm} R:', ' '.join(f'{x}:{p[x,1450+yo]}' for x in range(816,844)))
print('\n--- DESC panel top/bottom edge stack at x=600 (bevel / border check) ---')
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    print(f'  {nm} top   :', ' '.join(f'{y}:{p[600,y+yo]}' for y in range(1134,1148)))
    print(f'  {nm} bottom:', ' '.join(f'{y}:{p[600,y+yo]}' for y in range(1315,1329)))
print('\n--- LIST panel top edge stack at x=600 ---')
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    print(f'  {nm}:', ' '.join(f'{y}:{p[600,y+yo]}' for y in range(1382,1396)))
print('\n--- header top bevel stack at x=600 ---')
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    print(f'  {nm}:', ' '.join(f'{y}:{p[600,y+yo]}' for y in range(786,802)))

# ================= PHASE: f7.py =================
ref=Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')
cap=Image.open('docs/review/33-r3.png').convert('RGB')
DY=210; rp,cp=ref.load(),cap.load()
def L(c): return 0.299*c[0]+0.587*c[1]+0.114*c[2]
MID=(178.2+220.3)/2
print('panel<->cream transitions at x=600 (centre column), 1110..1580')
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    st=[];prev=None;start=1110
    for y in range(1110,1582):
        v=L(p[600,y+yo])<MID
        if prev is None: prev=v
        elif v!=prev: st.append((prev,start,y-1)); prev=v; start=y
    st.append((prev,start,1581))
    print(' ',nm,' '.join(f'{"P" if a else "c"}{b}-{c}' for a,b,c in st if c-b>=3))
print()
print('panel<->cream transitions at x=340 for DESC (avoid glyphs? use 1300..1400 only)')
for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
    print(' ',nm,[ (y, p[340,y+yo]) for y in range(1318,1326)])

# ================= PHASE: f8.py =================
ref=Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')
cap=Image.open('docs/review/33-r3.png').convert('RGB')
DY=210; rp,cp=ref.load(),cap.load()
def L(c): return 0.299*c[0]+0.587*c[1]+0.114*c[2]
MID=(178.2+220.3)/2
for y in (1535,1400,1300,1160):
    for nm,p,yo in (('ref',rp,0),('cap',cp,-DY)):
        xs=[x for x in range(262,818) if L(p[x,y+yo])<MID]
        if not xs: print(f' y={y} {nm}: none'); continue
        best=cur=(xs[0],xs[0])
        for x in xs[1:]:
            if x==cur[1]+1: cur=(cur[0],x)
            else:
                if cur[1]-cur[0]>best[1]-best[0]: best=cur
                cur=(x,x)
        if cur[1]-cur[0]>best[1]-best[0]: best=cur
        print(f' y={y} {nm}: longest panel run {best[0]}..{best[1]} w={best[1]-best[0]+1}')

