# A4 스킬 슬롯 — 레퍼런스와 캡처를 **같은 알고리즘·같은 창·같은 임계값**으로 훑는다.
#   python3 tools/scanA4.py [회차]        (기본 6 → docs/review/A4-r<회차>.png)
#
# 좌표: 레퍼런스 1080×2340 · 캡처 1080×2280 · 가로 1:1.
#   세로는 이 구간이 **바닥 앵커**(#battlefoot{bottom:0}, 탭바와 같은 기준)라 −84 가 아니라 **−60** 이다.
#   실측 근거: 슬롯 하단 ref 2133 ↔ cap 2073 · 탭바 상단 ref 2159 ↔ cap 2100 (LESSONS 63-4).
#
# LESSONS 반영:
#   A3-ⓔ 마스크가 다르면 «다른 것» 을 잰다 — 두께·지름은 반드시 **같은 마스크**로 양쪽을 잰다.
#   A4 자체 경고 «비평가가 갈리면 직접 재고, well + 2×링대 = 외경 으로 검산하라».
#   70-④ 두께는 «순색 코어» 끼리 비교(레퍼런스 JPEG 는 경계마다 AA 가 붙는다) — 임계값을 흔들어 본다.
import sys
from pydep937 import Image
from pydep937 import np

R = sys.argv[1] if len(sys.argv) > 1 else '6'
DY = 60
ref = np.asarray(Image.open('docs/ref/02-기본-메인-화면.jpg').convert('RGB')).astype(np.int32)
cap = np.asarray(Image.open('docs/review/A4-r' + R + '.png').convert('RGB')).astype(np.int32)

# 슬롯 중심 — 레퍼런스 실측(측정표 §1). 캡처는 같은 x, y 는 −DY.
CX = [86, 216.5, 347, 476.5, 606, 736.5, 866.5, 996.5]
CY_REF = 2074.0
ANG = np.arange(0, 360, 5) * np.pi / 180.0


def sample(img, cx, cy, r):
    """중심 (cx,cy) 반지름 r 원주 72지점의 **중앙값 RGB**. 링은 각도 방향으로 균일하므로
       중앙값이 아이콘·뱃지 같은 국소 오염을 걷어낸다."""
    xs = np.clip(np.round(cx + r * np.cos(ANG)).astype(int), 0, img.shape[1] - 1)
    ys = np.clip(np.round(cy + r * np.sin(ANG)).astype(int), 0, img.shape[0] - 1)
    px = img[ys, xs]
    return np.median(px, axis=0)


def profile(img, cx, cy, rmax=72):
    return [(r, sample(img, cx, cy, r)) for r in np.arange(0, rmax, 0.5)]


def dark_edges(prof, thr):
    """어두운 테(두 겹)의 반지름 구간을 임계값 thr 로 잡는다. 반환: 어두운 r 목록."""
    return [r for r, c in prof if c.max() < thr]


def report_rings(name, img, cx, cy):
    prof = profile(img, cx, cy)
    out = []
    for thr in (60, 80, 100):
        d = dark_edges(prof, thr)
        # 어두운 구간을 연속 덩어리로 묶는다
        groups, cur = [], []
        for r in d:
            if cur and r - cur[-1] > 0.75:
                groups.append((cur[0], cur[-1])); cur = []
            cur.append(r)
        if cur:
            groups.append((cur[0], cur[-1]))
        out.append('  thr%3d 어두운띠 ' % thr + ' '.join('r%.1f~%.1f(%.1f)' % (a, b, b - a + .5) for a, b in groups if b - a >= 1))
    print(name)
    for l in out:
        print(l)


def ring_color(img, cx, cy, r):
    return tuple(int(v) for v in sample(img, cx, cy, r))


def clock(img, cx, cy, r):
    """시계 8지점 색 — 링 그라디언트 방향 대조용(0deg = 3시, CSS conic 은 12시 기준이라 표기만 맞춘다)"""
    pts = {'12시': -90, '1:30': -45, '3시': 0, '4:30': 45, '6시': 90, '7:30': 135, '9시': 180, '10:30': -135}
    o = {}
    for k, a in pts.items():
        t = a * np.pi / 180.0
        x = int(round(cx + r * np.cos(t))); y = int(round(cy + r * np.sin(t)))
        # ±6° 평균 (JPEG 번짐 완화)
        acc = []
        for d in (-6, -3, 0, 3, 6):
            tt = (a + d) * np.pi / 180.0
            xx = int(round(cx + r * np.cos(tt))); yy = int(round(cy + r * np.sin(tt)))
            acc.append(img[yy, xx])
        o[k] = tuple(int(v) for v in np.mean(acc, axis=0))
    return o


def ink_bbox(img, x0, y0, x1, y1, pred):
    sub = img[y0:y1, x0:x1]
    m = pred(sub)
    if not m.any():
        return None
    ys, xs = np.nonzero(m)
    return (x0 + xs.min(), y0 + ys.min(), xs.max() - xs.min() + 1, ys.max() - ys.min() + 1)


print('=== A4 스캔 (ref 1080x2340 / cap r%s 1080x2280 · cap y = ref y - %d) ===\n' % (R, DY))

print('[1] 링 4겹 — 어두운 띠 반지름 (임계값 3종 스윕)')
for i, tag in ((0, '1번 활성'), (1, '2번 대기'), (4, '5번 잠금')):
    report_rings('  REF %s (cx=%.1f)' % (tag, CX[i]), ref, CX[i], CY_REF)
    report_rings('  CAP %s' % tag, cap, CX[i], CY_REF - DY)
    print()

print('[2] 컬러 링(r=51.5) 시계 8지점 색')
for i, tag in ((0, '1번 활성'), (1, '2번 대기'), (4, '5번 잠금')):
    a = clock(ref, CX[i], CY_REF, 51.5)
    b = clock(cap, CX[i], CY_REF - DY, 51.5)
    print('  %s' % tag)
    for k in ['12시', '1:30', '3시', '4:30', '6시', '7:30', '9시', '10:30']:
        d = max(abs(a[k][j] - b[k][j]) for j in range(3))
        print('    %-5s ref %-16s cap %-16s Δmax %d' % (k, '#%02x%02x%02x' % a[k], '#%02x%02x%02x' % b[k], d))
    print()

print('[3] 활성 슬롯 노란 링 — 반지름 밴드 패턴 (노랑 = R>200 and G>170 and B<140)')
for lbl, img, cy in (('REF', ref, CY_REF), ('CAP', cap, CY_REF - DY)):
    s = ''
    for r in np.arange(30, 70, 1.0):
        c = sample(img, CX[0], cy, r)
        s += 'Y' if (c[0] > 200 and c[1] > 170 and c[2] < 140) else ('.' if c.max() < 90 else 'o')
    print('  %s r30~69: %s' % (lbl, s))
print()

print('[4] 자물쇠 흰 몸통 잉크 bbox (5번 슬롯 · 흰색 = min(RGB) > thr)')
for thr in (150, 180, 200):
    for lbl, img, cy in (('REF', ref, CY_REF), ('CAP', cap, CY_REF - DY)):
        x0, y0 = int(CX[4] - 44), int(cy - 44)
        bb = ink_bbox(img, x0, y0, x0 + 88, y0 + 88, lambda s, t=thr: s.min(axis=2) > t)
        if bb:
            print('  thr%3d %s bbox %dx%d  중심오프셋 y %+.1f' % (thr, lbl, bb[2], bb[3], (bb[1] + bb[3] / 2) - cy))
        else:
            print('  thr%3d %s 없음' % (thr, lbl))
print()

print('[5] 스킬 아이콘 잉크 bbox (2번 대기 슬롯 · 배경 well 색과 다른 픽셀)')
for lbl, img, cy in (('REF', ref, CY_REF), ('CAP', cap, CY_REF - DY)):
    x0, y0 = int(CX[1] - 44), int(cy - 44)
    sub = img[y0:y0 + 88, x0:x0 + 88]
    well = np.median(sub.reshape(-1, 3), axis=0)
    for thr in (40, 60, 80):
        m = np.abs(sub - well).max(axis=2) > thr
        # 원 밖(코너)은 제외
        yy, xx = np.mgrid[0:88, 0:88]
        m &= ((xx - 43.5) ** 2 + (yy - 43.5) ** 2) < 43 ** 2
        if m.any():
            ys, xs = np.nonzero(m)
            print('  %s thr%2d well=#%02x%02x%02x  아이콘 잉크 %dx%d' % (
                lbl, thr, int(well[0]), int(well[1]), int(well[2]),
                xs.max() - xs.min() + 1, ys.max() - ys.min() + 1))
print()

print('[6] 하단 뱃지 — 1번 슬롯 아래 돌출부 (슬롯 하단 y 기준)')
for lbl, img, cy in (('REF', ref, CY_REF), ('CAP', cap, CY_REF - DY)):
    bot = cy + 60
    x0 = int(CX[0] - 40)
    sub = img[int(bot - 20):int(bot + 30), x0:x0 + 80]
    bg = np.median(img[int(bot + 34):int(bot + 44), x0:x0 + 80].reshape(-1, 3), axis=0)
    m = np.abs(sub - bg).max(axis=2) > 45
    if m.any():
        ys, xs = np.nonzero(m)
        print('  %s bg=#%02x%02x%02x  뱃지 폭 %d  하단돌출 %d (슬롯 하단 아래로)' % (
            lbl, int(bg[0]), int(bg[1]), int(bg[2]), xs.max() - xs.min() + 1, (ys.max() - 20 + 1)))
print()

print('[7] 행 기하 — 좌우 여백 · pitch (슬롯 외곽 어두운 띠 x 투영)')
for lbl, img, cy in (('REF', ref, CY_REF), ('CAP', cap, CY_REF - DY)):
    row = img[int(cy) - 2:int(cy) + 3, :, :].mean(axis=0)
    dark = row.max(axis=1) < 90
    idx = np.nonzero(dark)[0]
    if len(idx):
        # 연속 덩어리 → 칸 경계
        gs, cur = [], [idx[0]]
        for v in idx[1:]:
            if v - cur[-1] > 3:
                gs.append((cur[0], cur[-1])); cur = []
            cur.append(v)
        gs.append((cur[0], cur[-1]))
        print('  %s 어두운 x덩어리 %d개: %s' % (lbl, len(gs), ' '.join('%d~%d' % g for g in gs[:20])))
