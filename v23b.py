# 23 — 2차 정밀 스캔: 화살표 형상 / 배수탭 구분선 / 버튼 면 그라데이션 / 서브탭 밴드
from PIL import Image
import statistics as st

ref = Image.open('docs/ref/23-훈련-팝업.jpg').convert('RGB')
cap = Image.open('docs/review/23-r4.png').convert('RGB')
OFF = 425


def green(p):
    return p[1] > 150 and p[0] > 110 and p[2] < 110


print('=== A. 화살표 초록 잉크 행별 폭 ===')
print('  ref(y1203..1307)                 | cap(y778..882)')
for k in range(0, 105, 4):
    ry, cy = 1203 + k, 778 + k
    rr = [x for x in range(856, 962) if green(ref.getpixel((x, ry)))]
    cc = [x for x in range(856, 962) if green(cap.getpixel((x, cy)))]
    f = lambda s: ('x%d..%d w%d' % (min(s), max(s), max(s) - min(s) + 1)) if s else '-'
    print('  +%3d ref %-22s | cap %-22s' % (k, f(rr), f(cc)))

print()
print('=== B. 버튼 면 세로 그라데이션 (화살표 피한 좌측 면 컬럼) ===')
# ref 면: x869..876 / cap 면: x869..876
for k in range(0, 105, 5):
    ry, cy = 1203 + k, 778 + k
    rv = [ref.getpixel((x, ry)) for x in range(869, 877)]
    cv = [cap.getpixel((x, cy)) for x in range(869, 877)]
    rm = round(st.median([p[0] for p in rv])); cm = round(st.median([p[0] for p in cv]))
    print('  +%3d ref %3d | cap %3d' % (k, rm, cm))

print()
print('=== C. 배수탭 구분선 색·세로범위 (ref x664..667) ===')
for y in range(1326, 1410, 3):
    seg = [ref.getpixel((x, y)) for x in range(664, 668)]
    trk = ref.getpixel((640, y))
    m = tuple(round(st.median([p[i] for p in seg])) for i in range(3))
    print('  ref y%4d  구분선 %-16s 트랙 %-16s %s' % (y, m, trk, 'DIV' if trk[0] - m[0] > 8 else ''))

print()
print('  -- cap --')
for y in range(1326 - OFF, 1410 - OFF, 3):
    seg = [cap.getpixel((x, y)) for x in range(666, 669)]
    trk = cap.getpixel((640, y))
    m = tuple(round(st.median([p[i] for p in seg])) for i in range(3))
    print('  cap y%4d  구분선 %-16s 트랙 %-16s %s' % (y, m, trk, 'DIV' if trk[0] - m[0] > 8 else ''))

print()
print('=== D. 서브탭 바 — 검정/갈색 세로 경계 (x700) ===')
for nm, img, y0, y1 in (('ref', ref, 2018, 2124), ('cap', cap, 2018 - OFF, 2124 - OFF)):
    rows = []
    for y in range(y0, y1):
        p = img.getpixel((700, y))
        rows.append((y, 'K' if max(p) < 45 else ('B' if p[0] > 105 else 'b')))
    s = ''.join(r[1] for r in rows)
    print('  %s y%d.. %s' % (nm, y0, s))

print()
print('=== E. 배수탭 바 상·하 립 (x300, 선택칸 밖) ===')
for k in range(0, 84, 3):
    ry, cy = 1326 + k, 1326 + k - OFF
    print('  +%2d ref %-16s | cap %s' % (k, ref.getpixel((300, ry)), cap.getpixel((300, cy))))
