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
#
# ── 958 5회차 (2026-09-06) — **문턱 런을 부분 화소로 갈았다**(932 처방 ⓐ · 옛 자는 `--int`).
#
#   장부(`probe932.js` LEDGER)가 이 자를 **B** 로 세워 둔 까닭 그대로다: 반지름 걸음은 0.5px 인데
#   두께를 «문턱 아래인 표본의 런» 으로 내(b − a + .5) 값이 언제나 **0.5 의 배수**였다.
#   1:1 이라 축척 편향은 없고 **번짐 편향만** 남는다 — ref(JPEG)의 경사면이 통째로 깎인다.
#
#   ⇒ 처방 ⓐ: 두께는 «표본 개수» 가 아니라 **두 모서리의 차**다. 런을 «고르는» 규칙
#      (문턱 3종 · 이웃 간격 0.75 · «b − a ≥ 1 만 남긴다»)은 한 칸도 안 건드리고,
#      고른 런의 **양 끝에서만** 문턱 교차를 선형 보간한다.
#
#   ⚑ 좌표 규약 — 표본은 반지름 **격자점**에서 오므로 모서리는 그 사이다(942 4회차 [9-e]).
#      옛 자의 `+.5` 는 «표본 한 칸» 을 두께로 세던 값이라 새 자에서는 교차가 대신한다.
#
# ── 캡처가 없으면 **ref 절만** 돈다(958 등재문 · 4회차 `scan335` 에 이어 **아홉째**).
#   캡처 PNG 는 커밋 금지 자산이라 **없는 클론이 정상**이다.
import os
import sys
from pydep937 import Image
from pydep937 import np

MODE = 'int' if '--int' in sys.argv else 'cov'
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
R = ARGS[0] if ARGS else '6'
DY = 60
ref = np.asarray(Image.open('docs/ref/02-기본-메인-화면.jpg').convert('RGB')).astype(np.int32)
CAP_P = 'docs/review/A4-r' + R + '.png'
HAVE_CAP = os.path.exists(CAP_P)
cap = np.asarray(Image.open(CAP_P).convert('RGB')).astype(np.int32) if HAVE_CAP else None

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


def _cross(prof, i, j, thr):
    """`max(RGB) = thr` 를 지나는 **반지름**. i 는 바깥(밝은 쪽) · j 는 런 경계(어두운 쪽).

    ⚑⚑ **인접한 한 쌍만 보면 안 된다** — 런을 «고르는» 문턱(thr 스윕)과 두께를 내는 문턱
       (고원 한복판)이 **다른 값**이라, 한복판 교차는 그 쌍의 **안쪽**에 있을 수도 바깥에
       있을 수도 있다(실측: 선별 경계 두 표본이 66·46 인데 한복판은 56 이라 **안쪽** 쌍이다).
       ⇒ 경계 둘레를 훑어 **문턱을 실제로 사이에 두는 이웃 한 쌍**을 모두 찾고,
       그 중 **경계에 가장 가까운** 교차를 쓴다(958 4회차 `scan335` 와 같은 함정 · 방향까지 갈렸다)."""
    n = len(prof)
    if i < 0 or i >= n or j < 0 or j >= n:
        return None
    mx = [float(c.max()) for _, c in prof]
    rs = [r for r, _ in prof]
    best, bd = None, 1e9
    for k in range(max(0, j - 6), min(n - 1, j + 6)):
        va, vb = mx[k], mx[k + 1]
        if (va - thr) * (vb - thr) <= 0.0 and va != vb:
            f = (va - thr) / (va - vb)
            r = rs[k] + f * (rs[k + 1] - rs[k])
            d = abs(r - rs[j])
            if d < bd:
                best, bd = r, d
    if best is not None:
        return best
    va, vb = mx[i], mx[j]
    if va == vb:
        return (rs[i] + rs[j]) / 2.0
    f = min(max((va - thr) / (va - vb), 0.0), 1.0)
    return rs[i] + f * (rs[j] - rs[i])


def band_groups(prof, thr, mode=MODE):
    """문턱 아래인 표본의 런 → [(a, b, 두께)].  런을 «고르는» 규칙은 옛 자 그대로."""
    d = dark_edges(prof, thr)
    groups, cur = [], []
    for r in d:
        if cur and r - cur[-1] > 0.75:
            groups.append((cur[0], cur[-1])); cur = []
        cur.append(r)
    if cur:
        groups.append((cur[0], cur[-1]))
    groups = [g for g in groups if g[1] - g[0] >= 1]        # 옛 자와 같은 선별
    if mode == 'int':
        return [(a, b, b - a + .5) for a, b in groups]
    # 두께는 «표본 개수» 가 아니라 **두 모서리의 차** — 고른 런의 양 끝에서만 교차 보간.
    #
    # ⚑⚑ **문턱은 스윕값 thr 가 아니라 «이웃한 두 고원의 한복판» 이다**(958 1회차 판정).
    #    thr 는 «어느 런인가» 를 고르는 값이고(옛 자 그대로), 두께를 내는 문턱으로 그대로 쓰면
    #    한복판이 아니라서 **칼같은 판까지 밀린다**(실측 — thr 80 · 고원 112↔0 에서 +0.214px).
    #    한복판으로 세우면 칼같은 판이 0.000 으로 돌아오고 번진 판의 편향이 같이 닫힌다.
    #    부수 효과가 곧 검산이다 — 두께가 **문턱 스윕에 거의 안 흔들린다**(옛 자는 3.00↔4.00).
    rs = [r for r, _ in prof]
    mx = [float(c.max()) for _, c in prof]
    out = []
    for a, b in groups:
        ia, ib = rs.index(a), rs.index(b)
        # ⚑ **«측정 고원»** — 문턱을 세우는 값은 런의 중앙값이 아니라 **극값**이다(probe384 가
        #    «다음 지렛대» 로 적어 둔 그 축). 중앙값은 선별 문턱이 끌어들인 경사면 표본에 끌려
        #    올라가고(실측 6.0 ↔ 참값 0), 그만큼 한복판이 밖으로 밀려 띠가 부푼다(+0.15px).
        dark = min(mx[ia:ib + 1])                           # 런 안 고원 = 최솟값
        lo_s = mx[max(0, ia - 4):ia] or [dark]              # 바깥 고원은 **양쪽 각자의 것**
        hi_s = mx[ib + 1:ib + 5] or [dark]                  # (scan887 6회차 교훈)
        tl, th = (max(lo_s) + dark) / 2.0, (max(hi_s) + dark) / 2.0
        lo = _cross(prof, ia - 1, ia, tl)
        hi = _cross(prof, ib + 1, ib, th)
        lo = a - 0.25 if lo is None else lo                 # 창 끝 — 표본 반 칸
        hi = b + 0.25 if hi is None else hi
        out.append((a, b, hi - lo))
    return out


def report_rings(name, img, cx, cy):
    prof = profile(img, cx, cy)
    out = []
    for thr in (60, 80, 100):
        gs = band_groups(prof, thr)
        out.append('  thr%3d 어두운띠 ' % thr
                   + ' '.join('r%.1f~%.1f(%.2f)' % (a, b, h) for a, b, h in gs))
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


# ── 합성 재현 ──────────────────────────────────────────────────────────────
# 같은 참값 «어두운 띠» 를 «칼같은 판»(cap = PNG)과 «번진 판»(ref = JPEG)으로 그려 두 자로 잰다.
# 판을 그리는 셈은 `probe409g._phys_sample` 하나뿐이다(402 «사본을 지운다»).
# 더미 = 밝은 면 → 어두운 띠(참값 W) → 밝은 면. 걸음은 이 자의 반지름 걸음 그대로 0.5px.
BRIGHT = (112, 95, 75)


def physics():
    from probe409g import phys_cols
    print('합성 재현 — 밝은 면 %s / 어두운 띠(참값 W) / 밝은 면 · 걸음 0.5px · σ1.1' % (BRIGHT,))
    print('위상 6개(참 경계를 1/6 화소씩 민다) · 문턱은 이 자의 스윕 그대로 60·80·100\n')
    print('   %-5s %-5s %10s %10s %10s' % ('자', 'W', 'cap 편향', 'ref 편향', '판 사이 |Δ|'))
    rows = []
    for W in (7.0, 3.0):
        for mode in ('int', 'cov'):
            acc = {'cap': [], 'ref': []}
            for ph in range(6):
                pad = 12.0 + ph / 6.0
                widths = ((BRIGHT, pad), ((0, 0, 0), W), (BRIGHT, 12.0))
                cols = phys_cols(widths, sig=1.1, step=0.5)
                for who in ('cap', 'ref'):
                    prof = [(i * 0.5, np.asarray(c, dtype=np.int32))
                            for i, c in enumerate(cols[who])]
                    gs = band_groups(prof, 80, mode=mode)
                    acc[who].append((gs[0][2] - W) if gs else float('nan'))
            c = sum(acc['cap']) / 6.0
            r = sum(acc['ref']) / 6.0
            rows.append((mode, W, c, r))
            print('   %-5s %-5.0f %10.3f %10.3f %10.3f' % (mode, W, c, r, abs(c - r)))
    print('\n   ⚑ 과녁은 «판 사이 |Δ|» 가 아니라 **번진 판 부호 편향**이다 —')
    print('     칼같은 판은 계단이라 어느 자로 재도 ±0.25(반 걸음) 를 못 넘는다(942 4회차 [9-d]).')
    return rows


if '--physics' in sys.argv:
    physics()
    sys.exit(0)

print('=== A4 스캔 (ref 1080x2340 / cap r%s %s · cap y = ref y - %d) ===' % (
    R, ('1080x2280' if HAVE_CAP else '**없음 — ref 절만 돈다** (캡처 PNG 는 커밋 금지 자산)'), DY))
print('자 = %s\n' % ('옛 문턱 런(--int)' if MODE == 'int' else '부분 화소(문턱 교차 보간)'))

# 캡처가 없으면 «ref 만» 도는 짝 목록을 준다 — 절 구조는 그대로 두고 대조 상대만 뺀다.
def pairs(idx_cy):
    return [t for t in idx_cy if t[1] is not None]

print('[1] 링 4겹 — 어두운 띠 반지름 (임계값 3종 스윕)')
for i, tag in ((0, '1번 활성'), (1, '2번 대기'), (4, '5번 잠금')):
    report_rings('  REF %s (cx=%.1f)' % (tag, CX[i]), ref, CX[i], CY_REF)
    if HAVE_CAP:
        report_rings('  CAP %s' % tag, cap, CX[i], CY_REF - DY)
    print()

print('[2] 컬러 링(r=51.5) 시계 8지점 색')
for i, tag in ((0, '1번 활성'), (1, '2번 대기'), (4, '5번 잠금')):
    a = clock(ref, CX[i], CY_REF, 51.5)
    b = clock(cap, CX[i], CY_REF - DY, 51.5) if HAVE_CAP else None
    print('  %s' % tag)
    for k in ['12시', '1:30', '3시', '4:30', '6시', '7:30', '9시', '10:30']:
        if b is None:
            print('    %-5s ref %-16s' % (k, '#%02x%02x%02x' % a[k]))
        else:
            d = max(abs(a[k][j] - b[k][j]) for j in range(3))
            print('    %-5s ref %-16s cap %-16s Δmax %d' % (k, '#%02x%02x%02x' % a[k], '#%02x%02x%02x' % b[k], d))
    print()

print('[3] 활성 슬롯 노란 링 — 반지름 밴드 패턴 (노랑 = R>200 and G>170 and B<140)')
for lbl, img, cy in pairs((('REF', ref, CY_REF), ('CAP', cap, CY_REF - DY))):
    s = ''
    for r in np.arange(30, 70, 1.0):
        c = sample(img, CX[0], cy, r)
        s += 'Y' if (c[0] > 200 and c[1] > 170 and c[2] < 140) else ('.' if c.max() < 90 else 'o')
    print('  %s r30~69: %s' % (lbl, s))
print()

print('[4] 자물쇠 흰 몸통 잉크 bbox (5번 슬롯 · 흰색 = min(RGB) > thr)')
for thr in (150, 180, 200):
    for lbl, img, cy in pairs((('REF', ref, CY_REF), ('CAP', cap, CY_REF - DY))):
        x0, y0 = int(CX[4] - 44), int(cy - 44)
        bb = ink_bbox(img, x0, y0, x0 + 88, y0 + 88, lambda s, t=thr: s.min(axis=2) > t)
        if bb:
            print('  thr%3d %s bbox %dx%d  중심오프셋 y %+.1f' % (thr, lbl, bb[2], bb[3], (bb[1] + bb[3] / 2) - cy))
        else:
            print('  thr%3d %s 없음' % (thr, lbl))
print()

print('[5] 스킬 아이콘 잉크 bbox (2번 대기 슬롯 · 배경 well 색과 다른 픽셀)')
for lbl, img, cy in pairs((('REF', ref, CY_REF), ('CAP', cap, CY_REF - DY))):
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
for lbl, img, cy in pairs((('REF', ref, CY_REF), ('CAP', cap, CY_REF - DY))):
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
for lbl, img, cy in pairs((('REF', ref, CY_REF), ('CAP', cap, CY_REF - DY))):
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
