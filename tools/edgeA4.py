# A4 — «편향 없는» 50% 교차 서브픽셀 측정기.  python3 tools/edgeA4.py [회차]
#
# ★ 왜 이 파일이 따로 있나 (2026-08-26, 6~8회차에서 데인 것):
#   scanA4b.py 의 «색 마스크로 밴드를 잡는» 방식은 **crisp PNG 에서 두께를 1px 씩 깎아** 재고,
#   대비가 큰 경계(파랑 well ↔ 노랑 링)에서는 임계가 램프의 한쪽으로 쏠려 **반대로 넓게** 재기도 한다.
#   같은 그림을 비평가 N 은 «두 평탄 구간의 중간값(50%) 교차» 로 재서 **CSS 값을 오차 0.02px 로 복원**했다
#   (CSS inset 5px → 실측 5.00). 그래서 두께·지름은 전부 이 방식으로 재고, 색 마스크는 «어디쯤 있나»
#   찾는 용도로만 쓴다. (LESSONS A3-ⓔ «마스크가 다르면 다른 것을 잰다» 의 A4 판)
#
# 좌표: cap y = ref y − 60 (바닥 앵커 구간. scanA4.py 머리말 참고)
import sys
from pydep937 import Image
from pydep937 import np

R = sys.argv[1] if len(sys.argv) > 1 else '8'
DY = 60
ref = np.asarray(Image.open('docs/ref/02-기본-메인-화면.jpg').convert('RGB')).astype(float)
cap = np.asarray(Image.open('docs/review/A4-r' + R + '.png').convert('RGB')).astype(float)
CX = [86, 216.5, 347, 476.5, 606, 736.5, 866.5, 996.5]
ANG = np.arange(0, 360, 2.0) * np.pi / 180


def bil(img, x, y):
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = x - x0, y - y0
    return (img[y0, x0] * (1 - fx)[:, None] + img[y0, x0 + 1] * fx[:, None]) * (1 - fy)[:, None] + \
           (img[y0 + 1, x0] * (1 - fx)[:, None] + img[y0 + 1, x0 + 1] * fx[:, None]) * fy[:, None]


RS = np.arange(20, 74, 0.05)


def radial(img, cx, cy, ch):
    """반지름별 채널 중앙값 (180방향). ch: 0=R 1=G 2=B"""
    o = []
    for r in RS:
        p = bil(img, cx + r * np.cos(ANG), cy + r * np.sin(ANG))
        o.append(np.median(p[:, ch]))
    return np.array(o)


def edge(P, a, b, f=0.5):
    """구간 [a,b] 안에서 «양끝 평탄값의 f 지점» 을 지나는 곳. 평탄값은 구간 양끝 3px 평균."""
    i0, i1 = int((a - 20) / 0.05), int((b - 20) / 0.05)
    seg = P[i0:i1]
    lo = seg[:60].mean(); hi = seg[-60:].mean()
    thr = lo + (hi - lo) * f
    for j in range(len(seg) - 1):
        x, y = seg[j], seg[j + 1]
        if (x < thr <= y) or (x >= thr > y):
            return a + 0.05 * (j + (thr - x) / (y - x) if y != x else j)
    return None


def fmt(v):
    return '%.2f' % v if v is not None else '  --  '


print('=== A4 엣지 측정 (ref vs cap r%s · 50%% 교차 서브픽셀) ===\n' % R)

print('[A] 잠금 슬롯 링 구조 — G채널. well→테1→링→테2→배경')
for lbl, img, cy in (('REF', ref, 2074.0), ('CAP', cap, 2014.0)):
    rows = []
    for i in (3, 4, 5, 6, 7):
        P = radial(img, CX[i], cy, 1)
        wa = edge(P, 40, 47)          # well(밝음) → 테1(검정)
        rb = edge(P, 45, 51)          # 테1 → 회색 링
        rc = edge(P, 52, 58)          # 링 → 테2
        rd = edge(P, 55, 64)          # 테2 → 배경
        if None in (wa, rb, rc, rd):
            continue
        rows.append((2 * wa, rb - wa, rc - rb, rd - rc, 2 * rd))
    a = np.mean(rows, axis=0)
    print('  %s  wellØ %.2f · 테1 %.2f · 링 %.2f · 테2 %.2f · 외곽Ø %.2f   (검산 %.2f)' % (
        lbl, a[0], a[1], a[2], a[3], a[4], a[0] + 2 * (a[1] + a[2] + a[3])))
print()

print('[B] 활성(1번) 노란 링 2겹 — R채널. f=0.3/0.5/0.7 스윕(부호 불변이어야 신뢰)')
for f in (0.3, 0.5, 0.7):
    for lbl, img, cy, cx in (('REF', ref, 2074.0, 86.0), ('CAP', cap, 2014.0, 87.0)):
        P = radial(img, cx, cy, 0)
        i1 = edge(P, 33, 41, f); i2 = edge(P, 41, 47, 1 - f)
        o1 = edge(P, 56, 63, f); o2 = edge(P, 63, 71, 1 - f)
        print('    f%.1f %s 안쪽 r%s~%s 두께%s | 바깥 r%s~%s 두께%s' % (
            f, lbl, fmt(i1), fmt(i2), fmt(i2 - i1) if i1 and i2 else '  --  ',
            fmt(o1), fmt(o2), fmt(o2 - o1) if o1 and o2 else '  --  '))
    print()

print('[C] 행 세로 위치 — 잠금 슬롯 중심열의 상·하 외곽 50% 교차 중점')
for lbl, img, cy in (('REF', ref, 2074.0), ('CAP', cap, 2014.0)):
    cs = []
    for i in (3, 4, 5, 6, 7):
        cx = int(round(CX[i]))
        col = img[int(cy) - 80:int(cy) + 80, cx - 2:cx + 3, 1].mean(axis=1)
        bg = np.mean([col[:8].mean(), col[-8:].mean()])
        dark = col[70:90].min()
        thr = (bg + col[8:70].min()) / 2
        top = bot = None
        for j in range(len(col) - 1):
            a1, b1 = col[j], col[j + 1]
            if top is None and a1 >= thr > b1:
                top = int(cy) - 80 + j + (thr - a1) / (b1 - a1)
            if a1 < thr <= b1:
                bot = int(cy) - 80 + j + (thr - a1) / (b1 - a1)
        if top and bot:
            cs.append(((top + bot) / 2 - cy, bot - top))
    a = np.mean(cs, axis=0)
    print('  %s 행 중심 (슬롯중심 기준) %+.2f · 세로 외곽Ø %.2f  (n=%d)' % (lbl, a[0], a[1], len(cs)))
