# -*- coding: utf-8 -*-
"""critB33.py — 비평가 B : 33 재화-정보-팝업  ref vs impl  픽셀 차분 감사
   ref : docs/ref/33-재화-정보-팝업.jpg  1080x2340
   cap : docs/review/33-r1.png          1080x1920
   정렬: cap_y = ref_y - 210 , x 1:1
   실행: python3 critB33.py
"""
from PIL import Image, ImageFilter
import numpy as np
from collections import deque

REF='docs/ref/33-재화-정보-팝업.jpg'; CAP='docs/review/33-r1.png'
ref=np.asarray(Image.open(REF).convert('RGB')).astype(int)
cap=np.asarray(Image.open(CAP).convert('RGB')).astype(int)
DY=210
BLACK=lambda p:p.sum()<10
def blur(a,s=1.2):
    return np.asarray(Image.fromarray(a.astype('uint8')).filter(ImageFilter.GaussianBlur(s))).astype(int)
def cc(mask,minpx,k=9):
    md=np.asarray(Image.fromarray((mask*255).astype('uint8')).filter(ImageFilter.MaxFilter(k)))>127
    H,W=md.shape; lab=np.zeros((H,W),int); out=[]
    for y in range(H):
        for x in range(W):
            if md[y,x] and lab[y,x]==0:
                q=deque([(y,x)]); lab[y,x]=1; pts=[]
                while q:
                    a,b=q.popleft(); pts.append((a,b))
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=a+dy,b+dx
                        if 0<=ny<H and 0<=nx<W and md[ny,nx] and lab[ny,nx]==0:
                            lab[ny,nx]=1; q.append((ny,nx))
                ys=[p[0] for p in pts]; xs=[p[1] for p in pts]
                y0,y1,x0,x1=min(ys),max(ys),min(xs),max(xs)
                core=mask[y0:y1+1,x0:x1+1]
                if core.sum()>=minpx: out.append((core.sum(),x0,y0,x1-x0+1,y1-y0+1,core))
    out.sort(key=lambda t:-t[0]); return out

# ===================== 1. 신뢰도 교차 검증 =====================
print('='*74); print('1. 신뢰도 교차 검증 (내 스캔)'); print('='*74)
def frame(A,o,lab):
    """outer edge = black core run (max ch <=6) extended over its antialias step."""
    def edge(vals, i_core, step):
        j=i_core
        while True:
            k=j+step
            if not (0<=k<len(vals)-2 and 0<=k-2*step<len(vals)): break
            a=vals[k]; b=vals[k+step] if 0<=k+step<len(vals) else a
            if max(a)<=40 and abs(int(max(a))-int(max(b)))>12: j=k
            else: break
        return j
    row=[A[1100+o,x] for x in range(0,1080)]
    col=[A[y+o,540] for y in range(0,A.shape[0]-max(0,-o))]
    core=lambda p:max(p)<=6
    run=lambda v,i,st:all(core(v[i+st*k]) for k in range(6))
    xs=[x for x in range(200,900) if core(row[x])]
    ys=[y for y in range(700,1700) if core(col[y])]
    xL=edge(row,min(x for x in xs if x<540 and run(row,x,1)),-1)
    xR=edge(row,max(x for x in xs if x>540 and run(row,x,-1)),1)
    tops=[];bots=[]
    for xx in range(420,661,20):
        cl=[A[y+o,xx] for y in range(0,A.shape[0]-max(0,-o))]
        yy=[y for y in range(700,1700) if core(cl[y])]
        tops.append(edge(cl,min(y for y in yy if y<1100 and run(cl,y,1)),-1))
        bots.append(edge(cl,max(y for y in yy if y>1100 and run(cl,y,-1)),1))
    yT=int(np.median(tops)); yB=int(np.median(bots))
    print(' %-14s 팝업 border-box : x %d..%d (w %d) | y %d..%d (h %d)'%(lab,xL,xR,xR-xL+1,yT,yB,yB-yT+1))
    ct=[y for y in range(yT,yT+300) if A[y+o,540][0]>215 and A[y+o,540][1]>195 and A[y+o,540][2]>150][0]
    hy=(yT+ct)//2
    hxs=[x for x in range(xL,xR+1) if max(A[hy+o,x])>40]
    hx0,hx1=min(hxs),max(hxs)
    print(' %-14s 헤더 바         : x %d..%d (w %d) | y %d..%d (h %d)   (본문 크림 시작 y=%d)'%(
          lab,hx0,hx1,hx1-hx0+1,yT+9,ct-1,ct-(yT+9),ct))
    reg=A[1090+o:1360+o,xL:xR+1]
    r_,g_,b_=reg[:,:,0],reg[:,:,1],reg[:,:,2]
    pm=(r_>165)&(r_<220)&(g_>145)&(g_<205)&(b_>120)&(b_<180)
    rc=pm.sum(axis=1); idx=np.where(rc>240)[0]; a,b=idx.min(),idx.max()
    ix=np.where(pm[a:b].sum(axis=0)>(b-a)*0.5)[0]
    print(' %-14s 설명 패널       : x %d..%d (w %d) | y %d..%d (h %d)'%(lab,xL+ix.min(),xL+ix.max(),
          ix.max()-ix.min()+1,1090+a,1090+b,b-a+1))
frame(ref,0,'REF'); frame(cap,-DY,'CAP(→REF좌표)')

# ===================== 2. 차분 =====================
print(); print('='*74); print('2. 픽셀 차분 (팝업 영역 정렬 후)'); print('='*74)
X0,X1,Y0,Y1=241,839,781,1594
r=ref[Y0:Y1,X0:X1]; c=cap[Y0-DY:Y1-DY,X0:X1]
rb,cb=blur(r),blur(c); d=np.abs(rb-cb).max(axis=2); H,W=d.shape
print(' crop %dx%d  |  >48: %.2f%%   >9: %.2f%%   mean|d|=%.1f'%(W,H,100*(d>48).mean(),100*(d>9).mean(),np.abs(rb-cb).mean()))
print('\n [A] 고강도 차분 (thr 48) 상위:')
for i,(n,x0,y0,w,h,core) in enumerate(cc(d>48,300),1):
    if i>13: break
    print('  %2d (%3d,%4d,%3d,%3d) refY=%4d  px=%5d  강도=%5.1f'%(i,X0+x0,Y0-DY+y0,w,h,Y0+y0,n,d[y0:y0+h,x0:x0+w][core].mean()))
print('\n [B] 저강도 차분 (thr 9, 내용영역·모서리 마스크) — 얇은 레이어 사냥:')
m=d>9
for xa,xb,ya,yb in [(480,600,805,860),(455,625,896,1066),(430,650,1045,1120),
                    (305,780,1140,1230),(480,600,1355,1406),(292,610,1405,1535)]:
    m[ya-Y0:yb-Y0, xa-X0:xb-X0]=False
for a,b in ((0,0),(0,W-52),(H-52,0),(H-52,W-52)): m[a:a+52,b:b+52]=False
ring=np.ones((H,W),bool); ring[14:H-14,14:W-14]=False; m[ring]=False
for i,(n,x0,y0,w,h,core) in enumerate(cc(m,120,11),1):
    if i>8: break
    rm=rb[y0:y0+h,x0:x0+w][core].mean(); cm=cb[y0:y0+h,x0:x0+w][core].mean()
    v='CAP가 더 어둡다 → 우리가 «더 그림»' if cm<rm-4 else ('REF가 더 어둡다 → 우리가 «빠뜨림»' if rm<cm-4 else '같은 요소가 어긋남')
    print('  %2d (%3d,%4d,%3d,%3d) refY=%4d  px=%5d  강도=%4.1f  REF%3.0f/CAP%3.0f  %s'%(i,X0+x0,Y0-DY+y0,w,h,Y0+y0,n,
          d[y0:y0+h,x0:x0+w][core].mean(),rm,cm,v))

# ===================== 3. 워터마크(별) 격자 =====================
print(); print('='*74); print('3. 별 워터마크 격자 대조 («얇은 레이어» 정밀 검사)'); print('='*74)
def probe(A,o,cx,cy):
    y0,y1,x0,x1=cy-24,cy+24,cx-24,cx+24
    if y0<884 or y1>1570 or x0<264 or x1>816: return None
    reg=A[y0+o:y1+o,x0:x1].astype(float)
    med=np.median(reg.reshape(-1,3),axis=0)
    return (np.abs(reg-med).max(axis=2)>7).mean()*100
print('  cx    cy   REF%   CAP%   판정')
for cy in [925,1042,1159,1276,1392,1509]:
    for cx in [320,437,554,671,790]:
        a=probe(ref,0,cx,cy); b=probe(cap,-DY,cx,cy)
        if a is None or b is None: continue
        if a>12 and b>12: v='both'
        elif a>12: v='### REF만 있음 = 우리가 누락'
        elif b>12: v='### CAP만 있음 = 우리가 과잉'
        else: v='neither'
        if v.startswith('#') or (cy in (1276,)): print('  %4d %5d %6.1f %6.1f   %s'%(cx,cy,a,b,v))
print('  (전체 30개 격자점 중 불일치는 위 항목뿐 — 나머지는 모두 일치)')

# ===================== 4. 수직 리듬 =====================
print(); print('='*74); print('4. 수직 리듬 / 여백 (REF 좌표)'); print('='*74)
edges=[('헤더 상단',790,789),('헤더/본문 경계',881,879),('아이콘 외곽 top',902,901),('아이콘 외곽 bot',1059,1060),
 ('보유 텍스트 top',1080,1080),('보유 텍스트 bot',1111,1110),('설명 패널 top',1131,1131),('설명 패널 bot',1329,1329),
 ('설명 1행 top',1148,1149),('설명 2행 bot',1222,1222),('획득처 라벨 top',1364,1365),('획득처 라벨 bot',1399,1399),
 ('목록 패널 top',1384,1385),('목록 패널 bot',1544,1544),('항목1 top',1416,1413),('항목3 bot',1524,1523),
 ('본문 크림 bottom',1573,1572)]
print('  %-18s %6s %6s %6s'%('edge','REF','CAP','Δ'))
for n,a,b in edges: print('  %-18s %6d %6d %+6d'%(n,a,b,b-a))
print('\n  주요 간격:')
for n,ra,rb_,ca,cb_ in [('헤더 높이',790,881,789,879),('본문top→아이콘',881,902,879,901),
  ('아이콘→보유',1059,1080,1060,1080),('보유→설명패널',1111,1131,1110,1131),('설명패널 h',1131,1330,1131,1330),
  ('설명패널 상단패딩',1131,1148,1131,1149),('설명패널→획득처',1329,1364,1329,1365),
  ('목록패널 h',1384,1545,1385,1545),('목록패널 상단패딩',1384,1416,1385,1413),
  ('항목3→패널 bot',1524,1544,1523,1544),('패널bot→본문bot',1544,1573,1544,1572)]:
    print('   %-20s REF %4d  CAP %4d  Δ=%+d'%(n,rb_-ra,cb_-ca,(cb_-ca)-(rb_-ra)))

# ===================== 5. 크기·폰트 =====================
print(); print('='*74); print('5. 요소 크기 / 폰트 (REF 좌표)'); print('='*74)
def ob(A,o,ya,yb,xa,xb,pred,mr,mc,tag):
    reg=A[ya+o:yb+o,xa:xb]; mm=pred(reg)
    rc=mm.sum(axis=1); ccx=mm.sum(axis=0)
    ys=np.where(rc>=mr)[0]; xs=np.where(ccx>=mc)[0]
    print('   %-18s x %3d..%3d (w %3d) | y %4d..%4d (h %3d)'%(tag,xa+xs.min(),xa+xs.max(),xs.max()-xs.min()+1,
          ya+ys.min(),ya+ys.max(),ys.max()-ys.min()+1))
orange=lambda r:(r[:,:,0]>195)&(r[:,:,1]>100)&(r[:,:,1]<215)&(r[:,:,2]<100)
yellow=lambda r:(r[:,:,0]>200)&(r[:,:,1]>150)&(r[:,:,2]<120)
greenv=lambda r:(r[:,:,1]>170)&(r[:,:,1]-r[:,:,0]>50)&(r[:,:,2]<140)
inky  =lambda r:(r.sum(axis=2)<230)
for lab,A,o in (('REF',ref,0),('CAP',cap,-DY)):
    print('  [%s]'%lab)
    ob(A,o,890,1075,440,660,orange,30,30,'아이콘 오렌지판')
    ob(A,o,789,880,255,825,yellow,2,2,'타이틀 글자')
    ob(A,o,1040,1125,420,660,greenv,2,2,'보유 값(녹색)')
    ob(A,o,1140,1235,300,780,inky,2,2,'설명 2행 블록')
    ob(A,o,1355,1405,470,610,inky,2,2,'획득처 라벨')
    ob(A,o,1408,1535,335,560,inky,2,2,'목록 항목 텍스트')
    ink=(A[1145+o:1228+o,300:780].sum(axis=2)<200).sum()
    print('   설명문 잉크 밀도 : %d px (%.1f%%)'%(ink,100*ink/(83*480)))
print(); print('완료.')
