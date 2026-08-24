# 23 — G 의 P1(카드 아트 플레이트) · P2(크림박스 트레이 룰) 검증
from PIL import Image
ref = Image.open('docs/ref/23-훈련-팝업.jpg').convert('RGB')
cap = Image.open('docs/review/23-r4.png').convert('RGB')
OFF = 425

print('=== P2. 크림 박스 세로 프로파일 x=100 (카드 바깥 좌측 여백) ===')
prev = None
for y in range(1380, 2010):
    p = ref.getpixel((100, y))
    if prev is None or max(abs(p[i] - prev[i]) for i in range(3)) > 4:
        print('  ref y%4d %s   (local %d)' % (y, p, y - 1063))
        prev = p
print('  -- cap 대응 --')
prev = None
for y in range(1380 - OFF, 2010 - OFF):
    p = cap.getpixel((100, y))
    if prev is None or max(abs(p[i] - prev[i]) for i in range(3)) > 4:
        print('  cap y%4d %s   (ref %d)' % (y, p, y + OFF))
        prev = p

print()
print('=== P1. 카드2 내부 — 45° 플레이트 존재 여부 (ref x465..614 y1566..1715) ===')
print('  ref 카드2 가로 스캔 (아이콘 위쪽 y1580 / 중앙 y1640):')
for y in (1575, 1600, 1640, 1690, 1710):
    row = [ref.getpixel((x, y)) for x in range(380, 700)]
    # 흰 본문 (255,253,246) 대비 어두운 크림 (234,214,179) 구간 찾기
    idx = [380 + i for i, p in enumerate(row) if abs(p[0] - 234) < 12 and abs(p[1] - 214) < 14 and abs(p[2] - 179) < 18]
    print('   ref y%4d  플레이트색 픽셀 %3d개  %s' % (y, len(idx),
          ('x%d..%d' % (min(idx), max(idx))) if idx else '-'))
print('  cap 대응:')
for y in (1575, 1600, 1640, 1690, 1710):
    row = [cap.getpixel((x, y - OFF)) for x in range(380, 700)]
    idx = [380 + i for i, p in enumerate(row) if abs(p[0] - 234) < 12 and abs(p[1] - 214) < 14 and abs(p[2] - 179) < 18]
    print('   cap y%4d  플레이트색 픽셀 %3d개  %s' % (y - OFF, len(idx),
          ('x%d..%d' % (min(idx), max(idx))) if idx else '-'))

print()
print('=== P4. 시트 상단 코너 반경 — 크림(베이지) 채움 좌상단 곡선 ===')
for nm, img, ytop in (('ref', ref, 920), ('cap', cap, 495)):
    print('  %s: 각 x 에서 시트 채움이 시작되는 y (상단에서)' % nm)
    o = []
    for x in (2, 5, 8, 12, 16, 20, 26, 33, 40):
        for y in range(ytop - 4, ytop + 60):
            p = img.getpixel((x, y))
            if max(p) > 40:   # 검정 테두리 아래 = 채움
                o.append('x%d:+%d' % (x, y - ytop)); break
        else:
            o.append('x%d:-' % x)
    print('    ' + '  '.join(o))
