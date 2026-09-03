#!/usr/bin/env python3
# 작업 813 3회차 — **«상인방 위 스트립» 이 죽은 띠인가**를 칠해진 화소로 묻는다.
#
#   python3 tools/scan813b.py <캡처.png> [...]
#
# 왜 필요한가 — 14회차가 이 띠에 상한(300 → 160)을 건 근거는 실측이었다:
#   «2280 288px · 2600 293px 가 부재 0개 · 평균 휘도 29.6 · 66.6%가 32 미만 = 육안으로 검은 띠».
# 18회차가 벽 결을 넣은 뒤 다시 재 그 근거를 기각했다(행별 고유색 330~378 · std 15.9~16.3 ·
# 휘도 32.7~36.6). 813 3회차가 이 띠를 **또** 넓히려 하므로, 같은 자를 같은 방식으로 다시 댄다.
# «상한을 올린다» 는 판단을 인상이 아니라 **세 수치와 비평 2인의 A/B 판정** 위에 세우기 위해서다.
#
# 재는 것 — 패널 안쪽 좌우(x 20..1060)에서, 패널 안쪽 상변부터 상인방 상변까지의 각 행마다
#   · 행 표준편차(std)   : 결이 있으면 크다        · 행 고유색 수(uniq)
#   · 행 평균 휘도(lum)  · 그리고 «휘도 32 미만» 행의 비율(14회차가 쓴 바로 그 축)
# 상인방 상변은 이미지에서 직접 찾는다(행평균 휘도가 20계조 이상 급락하는 첫 행).
import sys
from PIL import Image

TOP = 116          # 패널 안쪽 상변 — 비평 2인이 각자 y115~116 으로 잰 값
X0, X1 = 20, 1060  # 패널 안쪽 좌우(금테·코너 브래킷 제외)


def lum(px):
    return 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2]


def rows(im, y0, y1):
    out = []
    for y in range(y0, y1):
        vals = [lum(im.getpixel((x, y))) for x in range(X0, X1, 4)]
        cols = {im.getpixel((x, y))[:3] for x in range(X0, X1, 4)}
        m = sum(vals) / len(vals)
        sd = (sum((v - m) ** 2 for v in vals) / len(vals)) ** 0.5
        out.append((y, m, sd, len(cols)))
    return out


def lintel_top(im, h):
    """행평균 휘도가 20계조 이상 급락하는 첫 행 — 비평 2인이 쓴 판정법 그대로."""
    prev = None
    for y in range(TOP + 8, min(h - 4, TOP + 900)):
        vals = [lum(im.getpixel((x, y))) for x in range(X0, X1, 8)]
        m = sum(vals) / len(vals)
        if prev is not None and prev - m >= 20:
            return y
        prev = m
    return None


for path in sys.argv[1:]:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    lt = lintel_top(im, h)
    if lt is None or lt - TOP < 8:
        print(f'{path}: 상인방 상변을 못 찾았다 (lt={lt})')
        continue
    rs = rows(im, TOP, lt)
    n = len(rs)
    mean = sum(r[1] for r in rs) / n
    sd = sum(r[2] for r in rs) / n
    uq = sum(r[3] for r in rs) / n
    dark = sum(1 for r in rs if r[1] < 32) / n * 100
    print(f'{path}')
    print(f'   스트립 {n}px (y{TOP}..{lt})  ·  평균 휘도 {mean:5.1f}  ·  행 std {sd:5.1f}'
          f'  ·  행 고유색 {uq:5.1f}  ·  «휘도 32 미만» 행 {dark:5.1f}%')
    print(f'   (14회차 반려 근거 = 평균 휘도 29.6 · 32 미만 66.6% · 부재 0 /'
          f'  18회차 기각 근거 = 휘도 32.7~36.6 · std 15.9~16.3 · 고유색 330~378)')
