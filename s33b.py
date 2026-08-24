# -*- coding: utf-8 -*-
"""
s33b.py — docs/ref/33-재화-정보-팝업.jpg (1080x2340) 픽셀 실측 스캐너

측정 항목
  §0 딤(배경 어둡기) 추정  : 팝업 밖 고정 UI(하단 탭바)를 02-기본-메인-화면.jpg 와 선형회귀
  §1 팝업 껍데기           : 외곽 검정 테두리 / 갈색 링 / 헤더 바 / 크림 fill / radius
  §2 타이틀 "보석"
  §3 아이콘 박스 + 보석 아트
  §4 "보유: 3,210"
  §5 설명 패널 + 2줄 본문
  §6 "획득처" 라벨
  §7 획득처 리스트 패널 + 3행(체크 + 텍스트)
  §8 크림 배경 별 워터마크
  §9 세로 gap 요약

실행:  python3 s33b.py
"""
import numpy as np
from PIL import Image

REF = 'docs/ref/33-재화-정보-팝업.jpg'
BASE = 'docs/ref/02-기본-메인-화면.jpg'

A = np.asarray(Image.open(REF).convert('RGB')).astype(int)
H, W, _ = A.shape

CREAM = np.array([240, 217, 186])   # 팝업 본문 fill
HDR   = np.array([82, 62, 61])      # 헤더 바 fill


# ---------- 공용 헬퍼 ----------
def runs(vals, pred):
    out, s = [], None
    for i, v in enumerate(vals):
        if pred(v):
            if s is None:
                s = i
        else:
            if s is not None:
                out.append((s, i - 1))
                s = None
    if s is not None:
        out.append((s, len(vals) - 1))
    return out


def black_runs_h(y, x0, x1, thr=45):
    return [(s + x0, e + x0, e - s + 1)
            for s, e in runs(A[y, x0:x1], lambda c: c.max() < thr)]


def black_runs_v(x, y0, y1, thr=45):
    return [(s + y0, e + y0, e - s + 1)
            for s, e in runs(A[y0:y1, x], lambda c: c.max() < thr)]


def bbox(mask, x0, y0):
    ys, xs = np.where(mask)
    if len(ys) == 0:
        return None
    return dict(x=int(xs.min() + x0), X=int(xs.max() + x0),
                y=int(ys.min() + y0), Y=int(ys.max() + y0),
                w=int(xs.max() - xs.min() + 1), h=int(ys.max() - ys.min() + 1))


def fmt(b):
    if b is None:
        return 'none'
    return 'x %d..%d (w %d)  y %d..%d (h %d)' % (b['x'], b['X'], b['w'], b['y'], b['Y'], b['h'])


def ink_bbox(x0, x1, y0, y1, bg, thr=60):
    """bg 색과 thr 이상 차이나는 픽셀의 bbox (외곽선 포함 잉크)"""
    reg = A[y0:y1 + 1, x0:x1 + 1]
    return bbox(np.abs(reg - np.array(bg)).sum(axis=2) > thr, x0, y0)


def core_bbox(x0, x1, y0, y1, pred):
    reg = A[y0:y1 + 1, x0:x1 + 1]
    return bbox(pred(reg), x0, y0)


def median_of(x0, x1, y0, y1, pred):
    reg = A[y0:y1 + 1, x0:x1 + 1]
    m = pred(reg)
    return np.median(reg[m], axis=0) if m.sum() else None


def fit_radius(samples):
    """samples = [(dy, inset), ...]  →  원호 inset = r - sqrt(2*r*dy - dy^2) 최소제곱 r"""
    best, bestE = None, 1e18
    for r10 in range(20, 800):
        r = r10 / 10.0
        e = 0.0
        n = 0
        for dy, ins in samples:
            if dy >= r:
                continue
            e += (ins - (r - (2 * r * dy - dy * dy) ** 0.5)) ** 2
            n += 1
        if n >= 3 and e / n < bestE:
            bestE, best = e / n, r
    return best, bestE


def corner_profile(x_edge, y_edge, xdir, ydir, test, span=40, reach=70):
    """모서리에서 dy(변으로부터의 깊이) → inset(변에서 안쪽으로 밀린 양). 2px 연속 확인으로 노이즈 배제"""
    out = []
    for dy in range(0, span):
        y = y_edge + ydir * dy
        for dx in range(0, reach):
            x = x_edge + xdir * dx
            if test(y, x) and test(y, x + xdir * 2):
                out.append((dy, dx))
                break
    return out


def radius_report(name, samples):
    r, e = fit_radius(samples)
    print('  %-22s radius ≈ %.0f  (rms %.1f)  샘플 %s' % (name, r, e ** .5, samples[:8]))
    return r


# =========================================================
print('=' * 72)
print('§0. 딤(배경 어둡기) — 팝업 밖 고정 UI(하단 탭바 y2170..2330)로 추정')
print('=' * 72)
B = np.asarray(Image.open(BASE).convert('RGB')).astype(float)
Af = A.astype(float)
y0, y1 = 2170, 2330
sa = Af[y0:y1].reshape(-1, 3)
sb = B[y0:y1].reshape(-1, 3)
for ch, nm in enumerate('RGB'):
    x, y = sb[:, ch], sa[:, ch]
    sol, *_ = np.linalg.lstsq(np.vstack([x, np.ones_like(x)]).T, y, rcond=None)
    print('  %s  기울기 %.3f  절편 %+.1f  corr %.3f' % (nm, sol[0], sol[1], np.corrcoef(x, y)[0, 1]))
idx = np.argsort(sb.mean(axis=1))[-2000:]
print('  02 최고광 픽셀 %s → 33 %s  (비 %s)' % (
    np.round(sb[idx].mean(axis=0), 1), np.round(sa[idx].mean(axis=0), 1),
    np.round(sa[idx].mean(axis=0) / sb[idx].mean(axis=0), 3)))
print('  → 순검정 곱연산 ≈ 0.46  ⇒ 딤 rgba(0,0,0,0.54)')
print('  팝업 주변 그림자 검사 (좌/우/상/하 20px 밖 vs 60px 밖):')
for nm, pts in [('우', [(1250, 845), (1250, 875)]), ('하', [(1600, 540), (1640, 540)]),
                ('좌', [(1250, 235), (1250, 205)]), ('상', [(760, 400), (720, 400)])]:
    print('   ', nm, [tuple(A[p[0], p[1]]) for p in pts])

# =========================================================
print()
print('=' * 72)
print('§1. 팝업 껍데기')
print('=' * 72)
# 외곽 검정 테두리
print('  좌변 검정 run  (y=1200):', [r for r in black_runs_h(1200, 200, 300) if r[2] >= 4])
print('  우변 검정 run  (y=1200):', [r for r in black_runs_h(1200, 800, 840) if r[2] >= 4])
print('  상변 검정 run  (x=400):', [r for r in black_runs_v(400, 740, 900) if r[2] >= 4])
print('  하변 검정 run  (x=400):', [r for r in black_runs_v(400, 1540, 1650) if r[2] >= 4])
PX0, PX1, PY0, PY1 = 241, 838, 781, 1593
print('  → 팝업 border-box  x %d..%d (w %d)  y %d..%d (h %d)  중심 (%.1f, %.1f)'
      % (PX0, PX1, PX1 - PX0 + 1, PY0, PY1, PY1 - PY0 + 1, (PX0 + PX1) / 2, (PY0 + PY1) / 2))
print('  화면중심(540,1170) 대비 offset: x %+.1f  y %+.1f' % ((PX0 + PX1) / 2 - 540, (PY0 + PY1) / 2 - 1170))

print('  좌측 링 단면 (y=1200, x=248..262):', [(x, tuple(A[1200, x])) for x in range(248, 263)])
print('  하단 링 단면 (x=300, y=1571..1586):', [(y, tuple(A[y, 300])) for y in range(1571, 1587)])
print('  헤더 좌측 단면 (y=830, x=248..262):', [(x, tuple(A[830, x])) for x in range(248, 263)])
print('  헤더 상단 단면 (x=320, y=788..802):', [(y, tuple(A[y, 320])) for y in range(788, 803)])
print('  헤더→크림 경계 (x=320, y=876..884):', [(y, tuple(A[y, 320])) for y in range(876, 885)])

print('  크림 fill 색 median:', median_of(300, 780, 1550, 1570, lambda r: np.ones(r.shape[:2], bool)))
print('  헤더 fill 색 median:', median_of(300, 780, 860, 875, lambda r: np.ones(r.shape[:2], bool)))

# 외곽 radius — 우상단 모서리 (배경 노이즈 적음)
def is_panel(y, x):
    c = A[y, x]
    return c.max() < 50 or abs(c - HDR).sum() < 45 or abs(c - np.array([91, 70, 67])).sum() < 45
print('  (배경이 어두워 외곽 검정 자체의 모서리는 노이즈 → 검정 안쪽 갈색 박스 모서리로 측정 후 +9px)')


def is_brown(y, x):
    c = A[y, x]
    return abs(c - HDR).sum() < 50 or abs(c - np.array([91, 70, 67])).sum() < 50
ri = radius_report('검정 안쪽 갈색박스 TL', corner_profile(249, 790, +1, +1, is_brown))
radius_report('검정 안쪽 갈색박스 TR', corner_profile(830, 790, -1, +1, is_brown))
print('  → 외곽 border-box radius ≈ %.0f (= 안쪽 %.0f + 검정 9px)' % (ri + 9, ri))

# 크림 fill 하단 모서리 radius
is_cream = lambda y, x: A[y, x][0] > 218
radius_report('크림 fill BL', corner_profile(261, 1572, +1, -1, is_cream))
radius_report('크림 fill BR', corner_profile(818, 1572, -1, -1, is_cream))
print('  크림 fill 좌상단(헤더 아래) 첫 크림 x:',
      [(y, next((x for x in range(255, 300) if is_cream(y, x)), None)) for y in (881, 885, 895, 910)])
print('  → 크림 fill-box  x 261..818 (w 558)  y 881..1572 (h 692), 상단 모서리 각짐(헤더가 덮음)')

# =========================================================
print()
print('=' * 72)
print('§2. 타이틀 "보석"')
print('=' * 72)
t_core = core_bbox(260, 819, 790, 879, lambda r: (r[:, :, 0] > 190) & (r[:, :, 1] > 150) & (r[:, :, 2] < 130))
print('  옐로 코어 :', fmt(t_core))
print('  옐로 색   :', median_of(260, 819, 790, 879,
                                lambda r: (r[:, :, 0] > 190) & (r[:, :, 1] > 150) & (r[:, :, 2] < 130)))
print('  스템 단면(x=508, y=806..858):', [(y, tuple(A[y, 508])) for y in range(806, 859, 2)])
print('  헤더 fill  y 790..879 (h 90), 코어 중심 y %.1f' % ((t_core['y'] + t_core['Y']) / 2))

# =========================================================
print()
print('=' * 72)
print('§3. 아이콘 박스 + 보석 아트')
print('=' * 72)
ib = ink_bbox(420, 660, 890, 1068, CREAM)
print('  아이콘 박스 border-box :', fmt(ib))
print('  좌변 단면 (y=980, x=458..500):', [(x, tuple(A[980, x])) for x in range(458, 500, 2)])
print('  상변 단면 (x=540, y=899..940):', [(y, tuple(A[y, 540])) for y in range(899, 940, 2)])
print('  골드 림 색:', median_of(466, 472, 950, 1010, lambda r: np.ones(r.shape[:2], bool)))
print('  오렌지 fill 색(상):', median_of(490, 580, 920, 930, lambda r: np.ones(r.shape[:2], bool)))
print('  오렌지 fill 색(하):', median_of(490, 580, 1035, 1045, lambda r: np.ones(r.shape[:2], bool)))
nc = lambda y, x: abs(A[y, x] - CREAM).sum() > 110
radius_report('아이콘 박스 TL', corner_profile(460, 901, +1, +1, nc))
radius_report('아이콘 박스 TR', corner_profile(619, 901, -1, +1, nc))
radius_report('아이콘 박스 BL', corner_profile(460, 1060, +1, -1, nc))
sub = A[907:1055, 466:614]
orange = np.abs(sub - np.array([211, 124, 19])).sum(axis=2) < 90
gold = np.abs(sub - np.array([253, 196, 47])).sum(axis=2) < 110
sil = ~(orange | gold)
print('  보석 실루엣(외곽선 포함):', fmt(bbox(sil[10:-10, 10:-10], 476, 917)))
gem = core_bbox(474, 606, 915, 1047,
                lambda r: (r[:, :, 2] > 150) & (r[:, :, 1] > 150) & (r[:, :, 0] < 220))
print('  보석 시안 코어      :', fmt(gem))
print('  보석 시안 색        :', median_of(474, 606, 915, 1047,
      lambda r: (r[:, :, 2] > 200) & (r[:, :, 1] > 200) & (r[:, :, 0] < 220)))

# =========================================================
print()
print('=' * 72)
print('§4. "보유: 3,210"')
print('=' * 72)
line = ink_bbox(300, 780, 1065, 1125, CREAM)
print('  전체 잉크(외곽선 포함):', fmt(line))
green = lambda r: (r[:, :, 1] > 200) & (r[:, :, 0] > 140) & (r[:, :, 0] < 220) & (r[:, :, 2] < 140)
print('  라임 코어 전체        :', fmt(core_bbox(300, 780, 1065, 1125, green)))
print('  "보유:" 잉크          :', fmt(ink_bbox(442, 521, 1065, 1125, CREAM)))
print('  "보유:" 코어          :', fmt(core_bbox(442, 521, 1065, 1125, green)))
print('  "3,210" 잉크          :', fmt(ink_bbox(529, 636, 1065, 1125, CREAM)))
print('  "3,210" 코어          :', fmt(core_bbox(529, 636, 1065, 1125, green)))
print('  라임 색               :', median_of(300, 780, 1065, 1125, green))
print('  스템 단면(x=600, y=1074..1114):', [(y, tuple(A[y, 600])) for y in range(1074, 1115, 2)])

# =========================================================
print()
print('=' * 72)
print('§5. 설명 패널 + 본문 2줄')
print('=' * 72)
print('  좌/우 경계 (y=1300):', [(x, tuple(A[1300, x])) for x in (289, 290, 291, 292, 787, 788, 789, 790)])
print('  상/하 경계 (x=350):', [(y, tuple(A[y, 350])) for y in (1129, 1130, 1131, 1132, 1328, 1329, 1330, 1331)])
DP = (291, 788, 1131, 1329)
print('  → 설명 패널 x %d..%d (w %d)  y %d..%d (h %d)' % (DP[0], DP[1], DP[1] - DP[0] + 1, DP[2], DP[3], DP[3] - DP[2] + 1))
print('  패널 fill median:', median_of(320, 760, 1240, 1300, lambda r: np.ones(r.shape[:2], bool)))
half = lambda y, x: A[y, x][0] < 218          # 크림(240)과 패널(196~199)의 중간값
radius_report('설명 패널 TL', corner_profile(291, 1131, +1, +1, half))
radius_report('설명 패널 TR', corner_profile(788, 1131, -1, +1, half))
radius_report('설명 패널 BL', corner_profile(291, 1329, +1, -1, half))
for lbl, (a0, a1) in [('L1', (1149, 1184)), ('L2', (1186, 1222))]:
    w = lambda r: r.mean(axis=2) > 215
    d = lambda r: r.max(axis=2) < 55
    print('  %s 흰색 코어     : %s' % (lbl, fmt(core_bbox(300, 782, a0, a1, w))))
    print('  %s 잉크+외곽선   : %s' % (lbl, fmt(core_bbox(300, 782, a0, a1, lambda r: w(r) | d(r)))))
print('  본문 흰색:', median_of(300, 782, 1149, 1222, lambda r: r.mean(axis=2) > 215))

# =========================================================
print()
print('=' * 72)
print('§6. "획득처" 라벨')
print('=' * 72)
pale = lambda r: (r[:, :, 0] > 235) & (r[:, :, 1] > 230) & (r[:, :, 2] > 140) & (r[:, :, 2] < 210)
print('  크림옐로 코어:', fmt(core_bbox(300, 780, 1350, 1405, pale)))
print('  코어 색      :', median_of(300, 780, 1350, 1405, pale))
print('  스템 단면(x=540, y=1360..1400):', [(y, tuple(A[y, 540])) for y in range(1360, 1401, 2)])

# =========================================================
print()
print('=' * 72)
print('§7. 획득처 리스트 패널')
print('=' * 72)
print('  좌/우 경계 (y=1470):', [(x, tuple(A[1470, x])) for x in (288, 289, 290, 291, 788, 789, 790, 791)])
print('  상/하 경계 (x=350):', [(y, tuple(A[y, 350])) for y in (1383, 1384, 1385, 1386, 1543, 1544, 1545, 1546)])
LP = (290, 789, 1385, 1544)
print('  → 리스트 패널 x %d..%d (w %d)  y %d..%d (h %d)' % (LP[0], LP[1], LP[1] - LP[0] + 1, LP[2], LP[3], LP[3] - LP[2] + 1))
print('  패널 fill median:', median_of(600, 780, 1400, 1440, lambda r: np.ones(r.shape[:2], bool)))
radius_report('리스트 패널 TL', corner_profile(290, 1385, +1, +1, half))
radius_report('리스트 패널 TR', corner_profile(789, 1385, -1, +1, half))
radius_report('리스트 패널 BL', corner_profile(290, 1544, +1, -1, half))
radius_report('리스트 패널 BR', corner_profile(789, 1544, -1, -1, half))
labels = ['가이드미션', '파견', '퀘스트']
for i, (a0, a1) in enumerate([(1410, 1450), (1452, 1490), (1492, 1530)]):
    g = lambda r: (r[:, :, 1] > 150) & (r[:, :, 1] - r[:, :, 0] > 40)
    d = lambda r: r.max(axis=2) < 60
    w = lambda r: r.mean(axis=2) > 215
    print('  [%d] %s' % (i + 1, labels[i]))
    print('      체크 초록 코어 :', fmt(core_bbox(292, 335, a0, a1, g)))
    print('      체크 외곽포함  :', fmt(core_bbox(292, 335, a0, a1, lambda r: g(r) | d(r))))
    print('      텍스트 흰코어  :', fmt(core_bbox(336, 520, a0, a1, w)))
    print('      텍스트 잉크    :', fmt(core_bbox(336, 520, a0, a1, lambda r: w(r) | d(r))))
print('  체크 초록색:', median_of(292, 335, 1410, 1530,
      lambda r: (r[:, :, 1] > 150) & (r[:, :, 1] - r[:, :, 0] > 40)))
print('  항목 흰색  :', median_of(336, 520, 1410, 1530, lambda r: r.mean(axis=2) > 215))

# =========================================================
print()
print('=' * 72)
print('§8. 크림 배경 별 워터마크 / 패널 투명도')
print('=' * 72)
from collections import deque
reg = A[881:1573, 261:819]
d = np.abs(reg - CREAM).sum(axis=2)
star = (d > 12) & (d < 45)
vis = np.zeros(star.shape, bool)
hh, ww = star.shape
for y in range(hh):
    for x in range(ww):
        if star[y, x] and not vis[y, x]:
            q = deque([(y, x)])
            vis[y, x] = True
            pts = []
            while q:
                cy, cx = q.popleft()
                pts.append((cy, cx))
                for dy_ in (-1, 0, 1):
                    for dx_ in (-1, 0, 1):
                        ny, nx = cy + dy_, cx + dx_
                        if 0 <= ny < hh and 0 <= nx < ww and star[ny, nx] and not vis[ny, nx]:
                            vis[ny, nx] = True
                            q.append((ny, nx))
            if len(pts) > 900:
                ys = [p[0] for p in pts]
                xs = [p[1] for p in pts]
                print('  별 x %d..%d (w %d)  y %d..%d (h %d)' % (
                    min(xs) + 261, max(xs) + 261, max(xs) - min(xs) + 1,
                    min(ys) + 881, max(ys) + 881, max(ys) - min(ys) + 1))
print('  별 색(크림 위):', np.median(reg[star], axis=0))
print('  별 색(리스트 패널 아래):', median_of(645, 697, 1484, 1534,
      lambda r: (199 - r[:, :, 0] > 4) & (199 - r[:, :, 0] < 20)))
print('  → 패널 = 크림 대비 R %.3f G %.3f B %.3f  ⇒ 검정 오버레이 ≈ 20%%'
      % (199 / 240, 175 / 217, 148 / 186))

# =========================================================
print()
print('=' * 72)
print('§9. 세로 gap 요약')
print('=' * 72)
seq = [('팝업 상단 검정 시작', 781), ('헤더 fill 시작', 790), ('타이틀 코어 상', 813),
       ('타이틀 코어 하', 851), ('헤더 fill 끝', 879), ('크림 fill 시작', 881),
       ('아이콘 박스 상', 901), ('아이콘 박스 하', 1060), ('보유 잉크 상', 1074),
       ('보유 잉크 하', 1118), ('설명 패널 상', 1131), ('본문L1 잉크 상', 1149),
       ('본문L1 잉크 하', 1184), ('본문L2 잉크 상', 1186), ('본문L2 잉크 하', 1222),
       ('설명 패널 하', 1329), ('획득처 잉크 상', 1364), ('리스트 패널 상', 1385),
       ('획득처 코어 하', 1396), ('항목1 잉크 상', 1416), ('항목1 잉크 하', 1446),
       ('항목2 잉크 상', 1456), ('항목2 잉크 하', 1486), ('항목3 잉크 상', 1497),
       ('항목3 잉크 하', 1524), ('리스트 패널 하', 1544), ('크림 fill 끝', 1572),
       ('팝업 하단 검정 끝', 1593)]
for i in range(1, len(seq)):
    print('  %-16s %4d → %-16s %4d   Δ %d' % (seq[i - 1][0], seq[i - 1][1], seq[i][0], seq[i][1],
                                              seq[i][1] - seq[i - 1][1]))
