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
print("="*72);print("P. '보유:' line — column bands (glyph clusters), thr<170")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    sub=L[1070-base:1122-base,400:700]<170
    cb=bands(sub.sum(0),400,1)
    print(f" {nm} col clusters:",[(a,b,b-a+1) for a,b in cb])
    # '보유:' = first clusters up to the colon; measure ink height of x range 440..540
    for label,xa,xb in [('보유:only',440,530),('number',540,660)]:
        s2=L[1066-base:1128-base,xa:xb]<170
        r=np.where(s2.sum(1)>0)[0]; c=np.where(s2.sum(0)>0)[0]
        if len(r): print(f"    {label}: y {1066+r[0]}..{1066+r[-1]} h={r[-1]-r[0]+1} x {xa+c[0]}..{xa+c[-1]} w={c[-1]-c[0]+1}")

print("="*72);print("Q. DESC line2 ink both")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    s=L[1187-base:1226-base,295:785]<120
    r=np.where(s.sum(1)>0)[0]; c=np.where(s.sum(0)>0)[0]
    print(f" {nm} L1: x {295+c[0]}..{295+c[-1]} w={c[-1]-c[0]+1} y {1187+r[0]}..{1187+r[-1]} h={r[-1]-r[0]+1}")
    s0=L[1140-base:1186-base,295:785]<120
    r0=np.where(s0.sum(1)>0)[0]; c0=np.where(s0.sum(0)>0)[0]
    print(f" {nm} L0: x {295+c0[0]}..{295+c0[-1]} w={c0[-1]-c0[0]+1} y {1140+r0[0]}..{1140+r0[-1]} h={r0[-1]-r0[0]+1}")

print("="*72);print("R. VERTICAL RHYTHM (key edges, ref-vs-cap in ref coords)")
rows=[
 ('popup top',780.7,780.5),('header/cream',880.3,880.5),
 ('icon top',901.3,900.5),('icon bot',1059.6,1060.5),
 ('보유 ink top',1075,1076),('보유 ink bot',1117,1115),
 ('desc panel top',1131.0,1130.5),('desc L0 top',1148,1150),('desc L1 bot',1222,1221),
 ('desc panel bot',1329.8,1329.5),('획득처 top',1363,1363),('획득처 bot',1403,1401),
 ('list panel top',1384.5,1384.5),('chk1 top',1420,1420),('chk3 bot',1520,1520),
 ('list panel bot',1544.1,1544.5),('cream bot',1573.5,1572.5),('popup bot',1593.2,1593.5)]
prev=None
for n,r,c in rows:
    print(f" {n:18s} ref{r:8.1f} cap{c:8.1f}  d={c-r:+.1f}")
print()
print(" GAPS:")
def g(n,a,b,c,d): print(f"  {n:28s} ref={b-a:6.1f} cap={d-c:6.1f} d={(d-c)-(b-a):+.1f}")
g('cream_top->icon_top',880.3,901.3,880.5,900.5)
g('icon_bot->보유ink_top',1059.6,1075,1060.5,1076)
g('보유ink_bot->descpanel',1117,1131.0,1115,1130.5)
g('descpanel_top->L0ink',1131.0,1148,1130.5,1150)
g('descL1ink_bot->panelbot',1222,1329.8,1221,1329.5)
g('descpanel_bot->획득처top',1329.8,1363,1329.5,1363)
g('획득처bot->listpanel_top',1403,1384.5,1401,1384.5)
g('listpanel_top->chk1top',1384.5,1420,1384.5,1420)
g('chk3bot->listpanel_bot',1520,1544.1,1520,1544.5)
g('listpanel_bot->cream_bot',1544.1,1573.5,1544.5,1572.5)
