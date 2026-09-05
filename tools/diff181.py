"""181 픽셀 차분 — docs/shots/181-f*.png 연속 프레임에서 «움직인 화소» 를 센다.

    python3 tools/diff181.py [tol] [box|all]

`box`(기본) = 모달 박스 안(.mbox) 만, 원판(.rlt) 사각은 마스크 — «팝업이 흔들리는가».
`all`       = 화면 전체(원판만 마스크) — 회전 중 화면에서 움직이는 것 전부.
"""
import glob, os, sys
from pydep937 import Image

SHOTS = sorted(glob.glob(os.path.join(os.path.dirname(__file__), '..', 'docs', 'shots', '181-f*.png')))
RLT = (210, 768, 870, 1429)          # .rlt 원판 컨테이너 (pix181.js 실측)
MBOX = (91, 527, 989, 1729)          # #modal .mbox 실측
TOL = int(sys.argv[1]) if len(sys.argv) > 1 else 24
MODE = sys.argv[2] if len(sys.argv) > 2 else 'box'

x0, y0, x1, y1 = MBOX if MODE == 'box' else (0, 0, 1080, 2280)

def load(p):
    return Image.open(p).convert('RGB').load()

prev = None
for p in SHOTS:
    cur = load(p)
    name = os.path.basename(p)
    if prev is None:
        prev = cur; prevname = name; continue
    rows = {}
    n = 0
    for y in range(y0, y1, 2):
        cnt = 0
        for x in range(x0, x1, 2):
            if RLT[0] <= x <= RLT[2] and RLT[1] <= y <= RLT[3]:
                continue
            a = prev[x, y]; b = cur[x, y]
            if max(abs(a[0]-b[0]), abs(a[1]-b[1]), abs(a[2]-b[2])) > TOL:
                cnt += 1
        if cnt:
            rows[y] = cnt
            n += cnt
    top = sorted(rows.items(), key=lambda kv: -kv[1])[:6]
    band = ''
    if rows:
        ys = sorted(rows)
        band = ' y%d..%d' % (ys[0], ys[-1])
    print('%s → %s : 변한 표본 %5d%s  최다행 %s' % (prevname, name, n, band,
          ' '.join('y%d:%d' % kv for kv in top)))
    prev = cur; prevname = name
