#!/usr/bin/env python3
"""작업 84 — 12 소환 결과 팝업 캡처의 «터치하여 닫기» 잉크 bbox 스캔.

캡처는 1080×2280 프레임. 닫기 문구는 딤(α.80) 위 흰 글자라 밝기 임계로 잡힌다.
사용: python3 tools/scan12.py docs/review/12-84-r1.png [y0 y1]
"""
import sys
from pydep937 import Image

p = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/12-84-r1.png'
y0 = int(sys.argv[2]) if len(sys.argv) > 3 else 1960
y1 = int(sys.argv[3]) if len(sys.argv) > 3 else 2280

im = Image.open(p).convert('RGB')
W, H = im.size
px = im.load()

TH = 140          # 딤된 배경은 b<40, 흰 글자는 b>200. 안티에일리어싱 중간값을 반으로 가른다.
minx = miny = 10 ** 9
maxx = maxy = -1
for y in range(y0, min(y1, H)):
    for x in range(W):
        r, g, b = px[x, y]
        if (r + g + b) / 3 >= TH:
            if x < minx: minx = x
            if x > maxx: maxx = x
            if y < miny: miny = y
            if y > maxy: maxy = y

print('image %dx%d  scan y=%d..%d  th=%d' % (W, H, y0, y1, TH))
if maxy < 0:
    print('ink: NONE')
else:
    print('ink bbox: x %d~%d (w %d, cx %.1f)  y %d~%d (h %d)'
          % (minx, maxx, maxx - minx + 1, (minx + maxx) / 2.0, miny, maxy, maxy - miny + 1))
    print('bottom-anchored: ink bottom = %d from frame bottom, ink top = %d'
          % (H - 1 - maxy, H - 1 - miny))
