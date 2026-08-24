# 4회차 수정 자체 검증 — ref 대비 r5
from PIL import Image
import statistics as st
ref = Image.open('docs/ref/23-훈련-팝업.jpg').convert('RGB')
cap = Image.open('docs/review/23-r5.png').convert('RGB')
OFF = 425
ok = fail = 0
def chk(name, r, c, tol=6):
    global ok, fail
    d = max(abs(r[i]-c[i]) for i in range(3))
    good = d <= tol
    globals().__setitem__('ok', ok+1) if good else globals().__setitem__('fail', fail+1)
    print('  %-42s ref%-16s cap%-16s Δ%-3d %s' % (name, r, c, d, 'OK' if good else 'FAIL'))
    return good

print('=== 1. ↑ 버튼 림·면 (가로 y1255 / cap y830) ===')
for lbl, x in (('림 좌 x862',862), ('림 좌 x866',866), ('면 좌 x870',870), ('면 우 x946',946), ('림 우 x954',954)):
    chk(lbl, ref.getpixel((x,1255)), cap.getpixel((x,830)))
print('  면 세로 그라데이션 방향 (x869..876 중앙값):')
for k in (25,45,70):
    rv = round(st.median([ref.getpixel((x,1203+k))[0] for x in range(869,877)]))
    cv = round(st.median([cap.getpixel((x,778+k))[0] for x in range(869,877)]))
    print('    +%2d  ref %3d  cap %3d' % (k, rv, cv))

print('=== 2. 진행바 ===')
chk('초록 채움 상부 (x300,y1246)', ref.getpixel((300,1246)), cap.getpixel((300,821)))
chk('초록 채움 하부 (x300,y1266)', ref.getpixel((300,1266)), cap.getpixel((300,841)))
chk('트랙 상단 그늘 (x700,y1237)', ref.getpixel((700,1237)), cap.getpixel((700,812)))
chk('트랙 본체 (x700,y1254)', ref.getpixel((700,1254)), cap.getpixel((700,829)))

print('=== 3. 헤더 밴드 하드 2단 ===')
chk('본체 상 (x800,y970)', ref.getpixel((800,970)), cap.getpixel((800,545)))
chk('립 하 (x800,y1014)', ref.getpixel((800,1014)), cap.getpixel((800,589)))

print('=== 4. 크림 박스 트레이 룰 ===')
chk('상단 룰 (x100,y1405)', ref.getpixel((100,1405)), cap.getpixel((100,980)))
chk('본문 (x100,y1420)', ref.getpixel((100,1420)), cap.getpixel((100,995)))
chk('하단 하이라이트 (x100,y1985)', ref.getpixel((100,1985)), cap.getpixel((100,1560)))

print('=== 5. 서브탭 바 인셋 립 ===')
chk('상단 밝은 립 (x700,y2033)', ref.getpixel((700,2033)), cap.getpixel((700,1608)))
chk('본체 (x700,y2060)', ref.getpixel((700,2060)), cap.getpixel((700,1635)))
chk('하단 밝은 립 (x700,y2108)', ref.getpixel((700,2108)), cap.getpixel((700,1683)))

print('=== 6. 배수탭 구분선 (색 + 세로 범위) ===')
rd = [ref.getpixel((x,1365)) for x in range(664,668)]
cd = [cap.getpixel((x,940)) for x in range(665,669)]
chk('구분선 색 y1365', tuple(round(st.median([p[i] for p in rd])) for i in range(3)),
    tuple(round(st.median([p[i] for p in cd])) for i in range(3)), 10)
for nm,img,xr,yb in (('ref',ref,range(664,668),1328),('cap',cap,range(665,669),903)):
    ys=[y for y in range(yb,yb+80) if st.median([img.getpixel((x,y))[0] for x in xr]) < st.median([img.getpixel((640,y))[0]])-8]
    print('    %s 구분선 세로 %s..%s (h%s)'%(nm,min(ys) if ys else '-',max(ys) if ys else '-',(max(ys)-min(ys)+1) if ys else 0))

print('=== 7. 선택 칩(x1) 높이 ===')
for nm,img,y0 in (('ref',ref,1328),('cap',cap,903)):
    col=[y for y in range(y0,y0+75) if img.getpixel((200,y))[0]>238 and img.getpixel((200,y))[2]>150]
    print('    %s 칩 채움 세로 %s..%s (h%s)'%(nm,min(col) if col else '-',max(col) if col else '-',(max(col)-min(col)+1) if col else 0))

print('=== 8. 화살표 초록 잉크 ===')
def g(p): return p[1]>150 and p[0]>110 and p[2]<110
for nm,img,y0 in (('ref',ref,1203),('cap',cap,778)):
    ys=[k for k in range(105) if any(g(img.getpixel((x,y0+k))) for x in range(856,962))]
    ws=[]
    for k in ys:
        xs=[x for x in range(856,962) if g(img.getpixel((x,y0+k)))]
        ws.append(max(xs)-min(xs)+1)
    print('    %s 초록 y+%d..+%d (h%d) 최대폭 %d, 중심 +%.1f (버튼중심 +52.5)'%(nm,min(ys),max(ys),max(ys)-min(ys)+1,max(ws),(min(ys)+max(ys))/2))

print('=== 9. 카드 아트 플레이트 ===')
for nm,img,y0 in (('ref',ref,0),('cap',cap,-OFF)):
    n=sum(1 for x in range(380,700) for y in range(1566,1716)
          if abs(img.getpixel((x,y+y0))[0]-234)<12 and abs(img.getpixel((x,y+y0))[1]-214)<14 and abs(img.getpixel((x,y+y0))[2]-179)<18)
    print('    %s 카드2 플레이트색 픽셀 %d개'%(nm,n))
print()
print('요약: OK %d / FAIL %d' % (ok, fail))
