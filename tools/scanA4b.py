# A4 보조 스캐너 — [3] 노란 링 두께 임계 스윕 · [5] 슬롯별 아이콘 잉크 · [6] 하단 뱃지
#   python3 tools/scanA4b.py [회차] [--int]
# scanA4.py 와 같은 좌표 규약(cap y = ref y − 60).
#
# ── 958 6회차 (2026-09-06) — **문턱 런을 부분 화소로 갈았다**(932 처방 ⓐ · 옛 자는 `--int`).
#
#   장부(`probe932.js` LEDGER)가 이 자를 **B** 로 세워 둔 까닭은 «scanA4 와 같은 규약·같은
#   이유» 다. 반지름 걸음은 0.5px 인데 두께를 «색 마스크를 통과한 표본의 런»(b − a + .5)으로
#   내 값이 언제나 **0.5 의 배수**였다. 가로 1:1 이라 축척 편향은 없고 **번짐 편향만** 남는다
#   — ref(JPEG)의 경사면이 통째로 깎이거나 부푼다.
#
#   ⇒ 처방 ⓐ: 두께는 «표본 개수» 가 아니라 **두 모서리의 차**다. 런을 «고르는» 규칙
#      (노랑 마스크 3종 스윕 · 연속 표본 = 한 런)은 한 칸도 안 건드리고, 고른 런의
#      **양 끝에서만** 문턱 교차를 선형 보간한다.
#
#   ⚑⚑ **여기는 «밝기» 가 아니라 «색» 이 축이다** — scanA4 의 어두운 띠는 이웃이 둘 다
#      밝은 면이라 max(RGB) 한 축으로 갈렸지만, 이 자의 노란 밴드는 안쪽 이웃이 청록
#      (54,124,150)이고 바깥 이웃이 검정(7,2,0)이라 한 채널로는 두 모서리가 같은 자로
#      안 잡힌다. ⇒ 문턱을 **색 사영**(`probe409g._proj` · 사본 0) 위에 세운다:
#      이웃 고원 → 밴드 고원 선분에 사영한 몫 t 가 **0.5(한복판)** 를 지나는 자리다.
#      «한복판» 은 scanA4 5회차가 못박은 그 규약이고(스윕값을 그대로 쓰면 칼같은 판까지
#      밀린다), 색 공간에서 t = 0.5 가 정확히 그 한복판이다.
#
#   ⚑ 고원은 런의 중앙값이 아니라 **극값**이다(«측정 고원» — probe384 가 «다음 지렛대» 로
#      적어 둔 축 · scanA4 5회차 실측 +0.15px). 중앙값은 선별 마스크가 끌어들인 경사면
#      표본에 끌려 밴드 쪽으로 올라가고 그만큼 띠가 부푼다.
#
#   ⚠ 교차 탐색은 **방향을 안 가린다** — 선별 마스크와 두께 문턱이 다른 값이라 한복판
#      교차는 선별 경계 쌍의 «안쪽» 에 있을 수도 바깥에 있을 수도 있다(4회차 `scan335` 는
#      바깥 · 5회차 `scanA4` 는 안쪽으로 **방향까지 갈렸다**). 경계 둘레를 훑어 문턱을
#      실제로 사이에 두는 이웃 쌍을 **모두** 찾고 경계에 **가장 가까운** 교차를 쓴다.
#
# ── 캡처가 없으면 **ref 절만** 돈다(958 등재문 · 5회차 `scanA4` 에 이어 **열째**).
#   캡처 PNG 는 커밋 금지 자산이라 **없는 클론이 정상**이다.
import os
import sys
from pydep937 import Image
from pydep937 import np
from probe409g import _proj              # 색 사영은 저기 하나뿐이다(사본 0 · 942 3회차 규약)

MODE = 'int' if '--int' in sys.argv else 'cov'
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
R = ARGS[0] if ARGS else '6'
DY = 60
ref = np.asarray(Image.open('docs/ref/02-기본-메인-화면.jpg').convert('RGB')).astype(np.int32)
CAP_P = 'docs/review/A4-r' + R + '.png'
HAVE_CAP = os.path.exists(CAP_P)
cap = np.asarray(Image.open(CAP_P).convert('RGB')).astype(np.int32) if HAVE_CAP else None
CX = [86, 216.5, 347, 476.5, 606, 736.5, 866.5, 996.5]
CY = 2074.0
ANG = np.arange(0, 360, 5) * np.pi / 180.0
YTHRS = ((150, 160), (170, 140), (190, 120))
MAXOUT = 8                               # 이웃 고원을 찾아 걸어 나가는 최대 칸(4px — σ1.1 램프의 두 배)
SPAN = 6                                 # 교차 탐색 반경(표본 칸) — scanA4 5회차와 같은 값


def med(img, cx, cy, r):
    xs = np.clip(np.round(cx + r * np.cos(ANG)).astype(int), 0, img.shape[1] - 1)
    ys = np.clip(np.round(cy + r * np.sin(ANG)).astype(int), 0, img.shape[0] - 1)
    return np.median(img[ys, xs], axis=0)


def profile(img, cx, cy):
    return [(float(r), med(img, cx, cy, r)) for r in np.arange(30, 70, 0.5)]


def is_yellow(c, gthr, bthr):
    """옛 자와 **같은 마스크** — 한 글자도 안 바꿨다."""
    return c[0] > 200 and c[1] > gthr and c[2] < bthr


def _edge(prof, a, b, side):
    """런 [a..b] 의 한쪽 모서리 **반지름** — 이웃 고원 → 밴드 고원 사영 t 가 0.5 를 지나는 자리.

    side = -1 이면 안쪽(작은 r) 모서리, +1 이면 바깥(큰 r) 모서리.
    돌려주는 것이 None 이면 창이 프로파일 밖이라 못 찾은 것이다(호출부가 반 칸으로 받는다)."""
    rs = [r for r, _ in prof]
    cs = [np.asarray(c, dtype=float) for _, c in prof]
    n = len(prof)
    k = a if side < 0 else b                               # 선별 경계 표본
    if not (0 <= k + side < n):
        return None
    in_i = list(range(a, b + 1))                           # 밴드 고원은 **런 전체**에서 읽는다
    v = np.mean([cs[i] for i in in_i], axis=0) - cs[k + side]   # 노랑↔이웃 축(방향만 쓴다)
    if float(np.dot(v, v)) < 1e-9:
        return None
    # ⚑ 고원은 **극값**이다(«측정 고원» · 중앙값이 아니다). 그리고 이웃 고원은 **경사면 밖**에
    #    있다 — 선별 마스크가 엄해 경계 표본이 이미 램프 한복판이라, 옛 자리처럼 «바깥 4칸»
    #    으로 끊으면 램프 색을 고원으로 오인해 문턱이 밀린다(실측 −0.55px). ⇒ 사영값이
    #    **다시 오르기 시작할 때까지** 걸어 나가 그 골(첫 극값)을 이웃 고원으로 삼는다.
    p_band = cs[max(in_i, key=lambda i: float(np.dot(cs[i], v)))]
    j, bj, bv = k + side, k + side, float(np.dot(cs[k + side], v))
    for _ in range(MAXOUT - 1):
        j += side
        if not (0 <= j < n):
            break
        dv = float(np.dot(cs[j], v))
        if dv > bv + 1e-9:
            break                                          # 골을 지났다 — 그 앞이 고원이다
        bj, bv = j, dv
    p_nb = cs[bj]
    ts = [_proj(c, p_nb, p_band)[0] for c in cs]
    best, bd = None, 1e9
    for j in range(max(0, k - SPAN), min(n - 1, k + SPAN)):
        t1, t2 = ts[j], ts[j + 1]
        if (t1 - 0.5) * (t2 - 0.5) <= 0.0 and t1 != t2:
            f = (t1 - 0.5) / (t1 - t2)
            r = rs[j] + f * (rs[j + 1] - rs[j])
            d = abs(r - rs[k])
            if d < bd:
                best, bd = r, d
    return best


def bands(prof, gthr, bthr, mode=MODE):
    """노란 밴드 → [(a, b, 두께)]. 밴드를 «고르는» 셈은 옛 자 그대로이고
       바뀐 것은 그 밴드를 **두께로 바꾸는 셈** 뿐이다."""
    rs = [r for r, _ in prof]
    runs, cur = [], None
    for i, (_, c) in enumerate(prof):
        if is_yellow(c, gthr, bthr):
            if cur is None:
                cur = i
        elif cur is not None:
            runs.append((cur, i - 1)); cur = None
    if cur is not None:
        runs.append((cur, len(prof) - 1))
    if mode == 'int':
        return [(rs[a], rs[b], rs[b] - rs[a] + 0.5) for a, b in runs]
    out = []
    for a, b in runs:
        lo = _edge(prof, a, b, -1)
        hi = _edge(prof, a, b, +1)
        lo = rs[a] - 0.25 if lo is None else lo             # 창 끝 — 표본 반 칸
        hi = rs[b] + 0.25 if hi is None else hi
        out.append((rs[a], rs[b], hi - lo))
    return out


# ── 합성 재현 ──────────────────────────────────────────────────────────────
# 같은 참값 «노란 밴드» 를 «칼같은 판»(cap = PNG)과 «번진 판»(ref = JPEG)으로 그려 두 자로 잰다.
# 판을 그리는 셈은 `probe409g._phys_sample` 하나뿐이다(402 «사본을 지운다»).
# 더미 = 검정 → 노랑(참값 W) → 검정. 걸음은 이 자의 반지름 걸음 그대로 0.5px.
YEL = (254, 254, 19)
BLK = (7, 2, 0)


def physics():
    from probe409g import phys_cols
    print('합성 재현 — 검정 %s / 노랑 띠(참값 W) %s / 검정 · 걸음 0.5px · σ1.1' % (BLK, YEL))
    print('위상 6개(참 경계를 1/6 화소씩 민다) · 마스크는 이 자의 스윕 가운데 G>170,B<140\n')
    print('   %-5s %-5s %10s %10s %10s' % ('자', 'W', 'cap 편향', 'ref 편향', '판 사이 |Δ|'))
    rows = []
    for W in (7.0, 3.0):
        for mode in ('int', 'cov'):
            acc = {'cap': [], 'ref': []}
            for ph in range(6):
                pad = 12.0 + ph / 6.0
                widths = ((BLK, pad), (YEL, W), (BLK, 12.0))
                cols = phys_cols(widths, sig=1.1, step=0.5)
                for who in ('cap', 'ref'):
                    prof = [(i * 0.5, np.asarray(c, dtype=np.int32))
                            for i, c in enumerate(cols[who])]
                    gs = bands(prof, 170, 140, mode=mode)
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


# 캡처가 없으면 «ref 만» 도는 짝 목록을 준다 — 절 구조는 그대로 두고 대조 상대만 뺀다.
def pairs():
    out = [('REF', ref, CY)]
    if HAVE_CAP:
        out.append(('CAP', cap, CY - DY))
    return out


print('=== A4 보조 스캔 (ref 1080x2340 / cap r%s %s · cap y = ref y - %d) ===' % (
    R, ('1080x2280' if HAVE_CAP else '**없음 — ref 절만 돈다** (캡처 PNG 는 커밋 금지 자산)'), DY))
print('자 = %s\n' % ('옛 문턱 런(--int)' if MODE == 'int' else '부분 화소(색 사영 교차 보간)'))

print('[3b] 활성 슬롯 노란 밴드 — 임계 3종 스윕 (부호가 안 바뀌어야 믿을 수 있다)')
for gthr, bthr in YTHRS:
    for lbl, img, cy in pairs():
        gs = bands(profile(img, CX[0], cy), gthr, bthr)
        print('  G>%d,B<%d %s  ' % (gthr, bthr, lbl) + ' | '.join(
            'r%.1f~%.1f 두께%.3f' % (a, b, h) for a, b, h in gs))
    print()

print('[5b] 슬롯별 스킬 아이콘 잉크 bbox (장착 1·2·3번 · well 중앙값 대비 Δ>60, well 원 안쪽만)')
yy, xx = np.mgrid[0:88, 0:88]
incircle = ((xx - 43.5) ** 2 + (yy - 43.5) ** 2) < 42 ** 2
for i in (0, 1, 2):
    for lbl, img, cy in pairs():
        x0, y0 = int(CX[i] - 44), int(cy - 44)
        sub = img[y0:y0 + 88, x0:x0 + 88]
        well = np.median(sub[incircle].reshape(-1, 3), axis=0)
        m = (np.abs(sub - well).max(axis=2) > 60) & incircle
        if m.any():
            ys, xs = np.nonzero(m)
            w, h = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
            print('  %d번 %s  잉크 %dx%d  중심오프셋 x%+.1f y%+.1f  (well #%02x%02x%02x)' % (
                i + 1, lbl, w, h, (xs.min() + w / 2) - 43.5, (ys.min() + h / 2) - 43.5,
                int(well[0]), int(well[1]), int(well[2])))
    print()

print('[6b] 하단 뱃지 — 슬롯 하단 아래로 돌출한 덩어리 (슬롯 중심 ±34 열창, 배경 대비 Δ>50)')
for lbl, img, cy in pairs():
    for i in (0, 1):
        bot = int(cy + 60)
        x0 = int(CX[i] - 34)
        # 배경 = 뱃지보다 훨씬 아래 20행
        bg = np.median(img[bot + 30:bot + 50, x0:x0 + 68].reshape(-1, 3), axis=0)
        sub = img[bot - 4:bot + 28, x0:x0 + 68]
        m = np.abs(sub - bg).max(axis=2) > 50
        if m.any():
            ys, xs = np.nonzero(m)
            print('  %s %d번  뱃지 폭 %d · 슬롯하단 아래 돌출 %d · x중심오프셋 %+.1f  (bg #%02x%02x%02x)' % (
                lbl, i + 1, xs.max() - xs.min() + 1, ys.max() - 4 + 1,
                (xs.min() + (xs.max() - xs.min() + 1) / 2) - 34,
                int(bg[0]), int(bg[1]), int(bg[2])))
        else:
            print('  %s %d번  돌출 없음' % (lbl, i + 1))
print()

print('[8] 행 bbox — 슬롯 외곽(어두운 링) 세로 투영으로 행 상단·하단 y')
for lbl, img, cy in pairs():
    col = img[int(cy) - 80:int(cy) + 80, int(CX[4]) - 62:int(CX[4]) + 62]
    dark = (col.max(axis=2) < 95).sum(axis=1)
    idx = np.nonzero(dark >= 3)[0]
    print('  %s 5번 슬롯 세로 어두운 구간 y %d~%d (중심 %+.1f, 높이 %d)' % (
        lbl, int(cy) - 80 + idx.min(), int(cy) - 80 + idx.max(),
        (int(cy) - 80 + (idx.min() + idx.max()) / 2) - cy, idx.max() - idx.min() + 1))
