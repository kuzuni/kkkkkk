from PIL import Image
import numpy as np
ref=np.asarray(Image.open('docs/ref/33-재화-정보-팝업.jpg').convert('RGB')).astype(float)
cap=np.asarray(Image.open('docs/review/33-r3.png').convert('RGB')).astype(float)
DY=210
def lum(a): return a[...,0]*0.299+a[...,1]*0.587+a[...,2]*0.114
RL,CL=lum(ref),lum(cap)

def inkbox(L,x0,x1,y0,y1,thr,dark=True,minpix=1):
    sub=L[y0:y1,x0:x1]
    m = sub<thr if dark else sub>thr
    cols=np.where(m.sum(0)>=minpix)[0]; rows=np.where(m.sum(1)>=minpix)[0]
    if len(cols)==0: return None
    return (x0+cols[0], x0+cols[-1], y0+rows[0], y0+rows[-1], cols[-1]-cols[0]+1, rows[-1]-rows[0]+1)

def rowprof(L,x0,x1,y0,y1,thr,dark=True):
    sub=L[y0:y1,x0:x1]
    m=(sub<thr) if dark else (sub>thr)
    return m.sum(1)

def bands(cnt,y0,minc=1):
    out=[];s=None
    for i,c in enumerate(cnt):
        if c>=minc and s is None: s=i
        elif c<minc and s is not None: out.append((y0+s,y0+i-1)); s=None
    if s is not None: out.append((y0+s,y0+len(cnt)-1))
    return out

print("="*72);print("H. HEADER BAND (dark brown 68) vertical, at x=300 (no text)")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    p=L[:,300]
    # black top edge -> brown 68 -> cream 220
    def cr(i0,i1,thr,ris):
        st=1 if i1>i0 else -1
        for i in range(i0,i1,st):
            a,b=p[i],p[i+st]
            if ris and a<thr<=b: return i+st*(thr-a)/(b-a)
            if (not ris) and a>=thr>b: return i+st*(a-thr)/(a-b)
    t=cr(770-base,800-base,34.0,True)   # black->brown68
    b=cr(860-base,900-base,144.0,True)  # brown68->cream220
    print(f" {nm}: brown band {t+base:.1f}..{b+base:.1f}  h={b-t:.1f}")

print("="*72);print("I. TITLE ink (yellow text on brown) thr: bright>140")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    bb=inkbox(L,300,780,790-base,880-base,150,dark=False,minpix=2)
    print(f" {nm}: x {bb[0]}..{bb[1]} (w{bb[4]})  y {bb[2]+base}..{bb[3]+base} (h{bb[5]}) cx={(bb[0]+bb[1])/2:.1f}")

print("="*72);print("J. '보유:' line ink (green+white on cream) thr dark<170")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    bb=inkbox(L,280,800,1060-base,1125-base,175,dark=True,minpix=2)
    print(f" {nm}: x {bb[0]}..{bb[1]} (w{bb[4]})  y {bb[2]+base}..{bb[3]+base} (h{bb[5]}) cx={(bb[0]+bb[1])/2:.1f}")

print("="*72);print("K. DESCRIPTION 2 lines (dark text on tan 178) thr<120")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    cnt=rowprof(L,295,785,1135-base,1330-base,120,dark=True)
    print(f" {nm} row-bands:",[(a+base,b+base,b-a+1) for a,b in bands(cnt,1135-base,3)])
    for i,(a,b) in enumerate(bands(cnt,1135-base,3)):
        bb=inkbox(L,295,785,a,b+1,120,dark=True,minpix=1)
        print(f"    line{i}: x {bb[0]}..{bb[1]} w={bb[4]} y {bb[2]+base}..{bb[3]+base} h={bb[5]}")

print("="*72);print("L. '획득처' ink (dark on cream) thr<120")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    bb=inkbox(L,350,730,1335-base,1385-base,120,dark=True,minpix=2)
    print(f" {nm}: x {bb[0]}..{bb[1]} (w{bb[4]})  y {bb[2]+base}..{bb[3]+base} (h{bb[5]}) cx={(bb[0]+bb[1])/2:.1f}")

print("="*72);print("M. CHECK ROWS: rows of dark text inside list panel")
for nm,L,base in [('ref',RL,0),('cap',CL,DY)]:
    cnt=rowprof(L,290,790,1390-base,1545-base,120,dark=True)
    bs=bands(cnt,1390-base,3)
    print(f" {nm} bands:",[(a+base,b+base,b-a+1) for a,b in bs])
    tops=[a+base for a,b in bs]
    print("    pitch:",[tops[i+1]-tops[i] for i in range(len(tops)-1)])
    for i,(a,b) in enumerate(bs):
        bb=inkbox(L,290,790,a,b+1,120,dark=True,minpix=1)
        print(f"    row{i} textink: x {bb[0]}..{bb[1]} w={bb[4]} h={bb[5]}")
print("="*72);print("N. GREEN CHECK marks (green: G>R and G>B)")
for nm,img,base in [('ref',ref,0),('cap',cap,DY)]:
    g=(img[...,1]>110)&(img[...,1]-img[...,0]>35)&(img[...,1]-img[...,2]>35)
    sub=g[1390-base:1545-base,290:340]
    rows=np.where(sub.sum(1)>0)[0]; 
    bs=bands(sub.sum(1),1390-base,1)
    print(f" {nm} check bands:",[(a+base,b+base,b-a+1) for a,b in bs])
    for a,b in bs:
        cc=np.where(g[a:b+1,290:340].sum(0)>0)[0]
        print(f"    y{a+base}..{b+base} x {290+cc[0]}..{290+cc[-1]} w={cc[-1]-cc[0]+1}")
