# 작업 352 — «337 이 남긴 넷» 을 ref/cap 에서 **같은 마스크로 동시에** 재는 재현기(픽셀 쪽).
#
#   338 규칙: 등재문의 처방을 따르기 전에 먼저 재현한다.
#   337 교훈 1: «같은 것» 을 재라 — 여기서는 같은 부품(.stabs 셸)의 **같은 칸·같은 면**이다.
#     07 스킬 시트는 ref 와 우리 양쪽에서 **가운데 칸(스킬)이 활성**이라 알약 자리가 1:1 이다.
#     03 은 209 로 칸이 2 → 3 이 됐고 ref 는 «오른쪽 칸» 이 활성이라 알약 대조에 못 쓴다.
#
#   좌표계: 서브탭 바는 하단 앵커(335 정오표) — cap_y = ref_y − 60. 가로는 1:1.
#
# ⚑⚑ 958 2회차 (2026-09-06) — **세 축이 전부 정수 격자에 굳어 있었다**(932 장부 B 열).
#   셋 다 «문턱 이하 화소의 **개수**» 를 세므로 ref 의 JPEG 경사면이 통째로 깎인다:
#     ⓑ 테두리 두께 = `runlen` · ⓐ 알약 코너 인셋 = 어두운 런의 시작 글자 번호 ·
#     ⓒ 구분선 높이 = 색 상자에 드는 행의 개수.
#   ⇒ 932 처방 **ⓐ(문턱 교차 보간)** 로 갔다 — **정의는 한 글자도 안 바꾸고 걸음만**
#   정수에서 부분 화소로 간다. 두께는 «화소 개수» 가 아니라 **두 모서리의 차**로 내고
#   (`probe866` 이 «테 = 바깥 − 속» 으로 같은 판정을 내린 자리 · 932 3회차 ⓚ),
#   인셋은 고른 런의 **시작 모서리**로 낸다. **어느 런인가 고르는 규칙**(느슨 문턱 ≤24 ·
#   순검정 ≤4 · 색 상자 · «3칸 이상 런») 과 표본 자리·창은 한 칸도 안 건드렸다.
#   옛 자는 `--int` 로 산다(두 모드의 «어느 런인가» 는 글자까지 같다 — `verify958` [9-h]).
#
#   ⚠ **문턱은 층 쌍마다 «설계 밝기의 한복판»** 이다. 한복판이 아니면 **번진 판에서만**
#     교차점이 밀려(칼같은 판은 계단이라 T 와 무관하게 화소 경계에 선다) **새 비대칭**이 생긴다
#     — 이 자가 고치려는 바로 그 병이다. 다행히 이 부품은 팔레트를 짐작할 필요가 없다:
#     ref 의 고원이 **CSS 선언과 정확히 같은 색**으로 앉는다(#F0D9BA · #000 · #705F4B ·
#     #61523D · #483B2B — `PAL352` 옆의 실측 주석).
#
# ⚑ 이 자가 «두 문턱» 을 들고 있던 것 자체가 정수 걸음의 증상이었다 —
#   느슨(≤24) 8 ↔ 순검정(≤4) 7 은 **같은 경계를 반 화소씩 다르게 반올림한 값**이고,
#   부분 화소로 세면 **둘이 한 값으로 모인다**(좌 8.38 · CSS 는 테두리 7 + 안쪽 립 --sl 1.5 = 8.5).
#   ⇒ 아래 ⓑ 의 옛 결론(«ref 순검정 6 + AA 한 줄»)은 437 이 이미 폐기했고, 여기서
#   그 폐기가 **자 자신의 값으로도** 확인된다.
#
# 사용:  python3 tools/probe352.py [--int]     (옛 정수 자로 되돌려 읽는다)
#        python3 tools/probe352.py --physics   (합성 재현 — 그림도 브라우저도 안 쓴다)
import os
import sys
import math

from pydep937 import Image
from probe409g import phys_cols   # 재현용 «판을 그리는 셈» 하나만 빌린다(사본 0 · 942 3회차 규약)

OFF = 60
LOOSE, PURE = 24, 4

REF7, CAP7 = 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png'
REF3, CAP3 = 'docs/ref/03-던전-팝업.jpg', 'docs/review/96-full-dun.png'

MODE = 'int' if '--int' in sys.argv else 'cov'   # 958 2회차 — 옛 자는 `--int` 로 산다

# ── 부품 팔레트 — **CSS 선언 그대로**(설계 밝기). 문턱을 «두 층의 한복판» 에 세우는 데만 쓴다.
#   실측 검산(ref 07 · JPEG 인데도 고원이 선언과 한 글자도 안 틀린다):
#     P 시트 크림  #F0D9BA  → (240,217,186)  y2069 x58..64
#     K 셸 테두리  #000     → (0,0,0)        border:7px solid #000 + inset --sl 1.5px
#     R 안쪽 밝은 림 #705F4B → (112,95,75)   box-shadow inset ±(1.5+7)
#     S 셸 바닥    #61523D  → (97,82,61)     background linear-gradient
#     V 구분선     #483B2B  → (72,59,43)     .stab-sep{background:#483B2B}
PAL352 = [
    ('P', (240, 217, 186)),
    ('K', (0, 0, 0)),
    ('R', (112, 95, 75)),
    ('S', (97, 82, 61)),
    ('V', (72, 59, 43)),
]
LVL352 = {ch: sum(rgb) / 3.0 for ch, rgb in PAL352}


def load(p):
    return Image.open(p).convert('RGB')


fmt = lambda c: '#%02X%02X%02X' % c


def _lum(c):
    return (c[0] + c[1] + c[2]) / 3.0


def cls352(c):
    """가장 가까운 팔레트 글자 — **이웃이 어느 층인가**(=어느 문턱을 쓰는가) 를 고르는 데만 쓴다.
       «어느 런인가» 는 여전히 옛 문턱 규칙이 고른다."""
    best, bd = '?', 1 << 30
    for ch, rc in PAL352:
        d = sum((int(a) - int(b)) ** 2 for a, b in zip(c, rc))
        if d < bd:
            best, bd = ch, d
    return best


def _runspan(s):
    """클래스 문자열 → [(클래스, 길이, 시작 index)]."""
    out, i = [], 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        out.append((s[i], j - i, i))
        i = j
    return out


def _side(rs, ri, d):
    """런 목록 `rs` 의 ri 번째 런에서 d(−1 바깥 / +1 안쪽) 쪽으로 나아가며 **두께 ≥2 인 첫 다른 런**
       의 클래스. 한 칸짜리 런은 링잉·경사면이라 층으로 안 센다(`probe384._side` 와 같은 규칙)."""
    j = ri + d
    while 0 <= j < len(rs):
        if rs[j][1] >= 2:
            return rs[j][0]
        j += d
    j = ri + d
    return rs[j][0] if 0 <= j < len(rs) else None


def _cross(cols, i, cha, chb, span=3):
    """표본 i−1(층 a) ↔ i(층 b) 사이 경계의 **부분 화소 자리** — 옛 자와 같은 좌표계다
       («i 번째 화소가 층 b 의 첫 화소» = 경계 = i · 표본 중심은 i+0.5).

    선례는 저장소 안에 여럿이다(`probe866._cross`(932 4회차) · `probe409f`(942 4회차) ·
    `probe384._cross`(958 1회차)) — 전부 «같은 밝기·같은 문턱의 교차점 선형 보간» 이고 여기도 그대로다.
    문턱 T 는 **두 층 설계 밝기의 한복판**(P↔K 107.2 · K↔R 47.0 · S↔V 68.7)."""
    la, lb = LVL352.get(cha), LVL352.get(chb)
    if la is None or lb is None or abs(la - lb) < 1e-9:
        return float(i)
    T = (la + lb) / 2.0
    best = None
    for j in range(max(0, i - 1 - span), min(len(cols) - 1, i + span)):
        v1, v2 = _lum(cols[j]), _lum(cols[j + 1])
        if (v1 - T) * (v2 - T) <= 0 and v1 != v2:
            x = (j + 0.5) + (v1 - T) / (v1 - v2)
            if best is None or abs(x - i) < abs(best - i):
                best = x
    return float(i) if best is None else best


def runlen(px, x, y, dx, dy, thr, n=24):
    k = 0
    for i in range(n):
        if max(px[x + dx * i, y + dy * i]) <= thr:
            k += 1
        else:
            break
    return k


def _walk(px, x, y, dx, dy, n, pre):
    """표본 색줄 — 걸음 방향으로 n 칸, 그리고 **시작 앞쪽 pre 칸**(바깥 경계를 보간하려면
       바깥 층 표본이 있어야 한다). 인덱스 pre 가 (x, y) 다."""
    return [px[x + dx * (i - pre), y + dy * (i - pre)] for i in range(pre + n)]


def strip(px, x, y, dx, dy, n=20):
    return ' '.join(fmt(px[x + dx * i, y + dy * i]) for i in range(n))


def first_black(px, y, xa, xb, thr):
    for x in range(xa, xb):
        if max(px[x, y]) <= thr:
            return x
    return None


def edge_v(px, x, ya, yb, thr):
    ys = [y for y in range(ya, yb) if max(px[x, y]) <= thr]
    return (min(ys), max(ys)) if ys else (None, None)


# ── ⓑ 테두리 두께 — 정수(옛) / 부분 화소(새) ────────────────────────────
def black_sub(px, x, y, dx, dy, thr=LOOSE, n=24, pre=4):
    """검정 런의 **두 모서리의 차**. 런을 고르는 규칙은 옛 `runlen` 그대로이고
       (같은 문턱 · 같은 시작 표본), 바뀐 것은 그 런의 모서리를 어디에 세우는가 뿐이다.
       바깥·안쪽 이웃 층은 표본을 분류해서 고른다(`_side`) — 좌우는 P↔K↔R, 상하도 같다."""
    k = runlen(px, x, y, dx, dy, thr, n)
    if k == 0:
        return float('nan')
    cols = _walk(px, x, y, dx, dy, n, pre)
    s = ''.join(cls352(c) for c in cols)
    rs = _runspan(s)
    ri = next((q for q, r in enumerate(rs) if r[2] <= pre < r[2] + r[1]), None)
    out_ch = _side(rs, ri, -1) if ri is not None else 'P'
    in_ch = _side(rs, ri, +1) if ri is not None else 'R'
    lo = _cross(cols, pre, out_ch or 'P', 'K')
    hi = _cross(cols, pre + k, 'K', in_ch or 'R')
    return hi - lo


def border(tag, px, l, r, t, b, ycen, xcol):
    out = []
    for thr, nm in ((LOOSE, '느슨≤24'), (PURE, '순검정≤4')):
        # 순검정은 «가장자리 1px» 이 AA 라 안쪽으로 한 칸 들어가 세기 시작한다
        lo = runlen(px, l, ycen, 1, 0, thr) if thr == LOOSE else runlen(px, l + 1, ycen, 1, 0, thr)
        ro = runlen(px, r, ycen, -1, 0, thr) if thr == LOOSE else runlen(px, r - 1, ycen, -1, 0, thr)
        to = runlen(px, xcol, t, 0, 1, thr) if thr == LOOSE else runlen(px, xcol, t + 1, 0, 1, thr)
        bo = runlen(px, xcol, b, 0, -1, thr) if thr == LOOSE else runlen(px, xcol, b - 1, 0, -1, thr)
        out.append('%s 좌%d 우%d 상%d 하%d' % (nm, lo, ro, to, bo))
    print('   %-4s %s   |   %s' % (tag, out[0], out[1]))
    if MODE == 'int':
        return None
    v = (black_sub(px, l, ycen, 1, 0), black_sub(px, r, ycen, -1, 0),
         black_sub(px, xcol, t, 0, 1), black_sub(px, xcol, b, 0, -1))
    print('   %-4s ▸ 부분화소 좌%.2f 우%.2f 상%.2f 하%.2f   (CSS 테두리 7 + 안쪽 립 --sl 1.5 = **8.5**)'
          % (tag, v[0], v[1], v[2], v[3]))
    return v


# ── ⓐ 알약 코너 반경 — 원호 역산 ─────────────────────────────────────────
def radius(px, pill_l, pill_r, pill_t, tag, span=25):
    """상변에서 d 행 내려온 좌·우 인셋 ins → r = (d+ins) + √(2·d·ins).
       좌·우를 둘 다 재서 평균한다 — JPEG 가 좌 밴드를 얇게, 우 밴드를 두껍게 찍어
       검출 시작점이 양쪽 다 같은 방향으로 밀리므로 평균이 그 편향을 지운다.

       ⚑ 958 2회차 — «어느 런인가»(≤LOOSE · 3칸 이상 · 첫 런/끝 런) 는 한 글자도 안 바꿨고,
       고른 런의 **시작·끝 모서리**만 문턱 교차 보간으로 낸다. 좌표 규약도 옛 자 그대로다 —
       좌 인셋 = (좌 모서리) − pill_l · 우 인셋 = (pill_r + 1) − (우 모서리)
       [옛 정수식 `pill_r − runs[-1][-1]` 의 부분 화소 일반화다: 마지막 어두운 화소 b 의
        오른쪽 모서리가 b+1 이므로 `pill_r − b = (pill_r+1) − (b+1)`]."""
    est = {'L': [], 'R': []}
    prof = {'L': [], 'R': []}
    sub = {'L': [], 'R': []}
    x0 = pill_l - 25
    for d in range(1, span + 1):
        y = pill_t + d
        cols = [px[x, y] for x in range(x0, pill_r + 25)]
        xs = [x for x in range(x0, pill_r + 25) if max(px[x, y]) <= LOOSE]
        runs, cur = [], None
        for x in xs:
            if cur is None or x != cur[-1] + 1:
                if cur and len(cur) >= 3:
                    runs.append(cur)
                cur = [x]
            else:
                cur.append(x)
        if cur and len(cur) >= 3:
            runs.append(cur)
        if not runs:
            prof['L'].append('--'); prof['R'].append('--')
            sub['L'].append(float('nan')); sub['R'].append(float('nan'))
            continue
        s = ''.join(cls352(c) for c in cols)
        rs = _runspan(s)
        iL, iR = runs[0][0] - x0, runs[-1][-1] + 1 - x0
        rL = next((q for q, r in enumerate(rs) if r[2] <= iL < r[2] + r[1]), None)
        rR = next((q for q, r in enumerate(rs) if r[2] <= iR - 1 < r[2] + r[1]), None)
        eL = _cross(cols, iL, (_side(rs, rL, -1) if rL is not None else 'R') or 'R', 'K') + x0
        eR = _cross(cols, iR, 'K', (_side(rs, rR, +1) if rR is not None else 'R') or 'R') + x0
        sub['L'].append(eL - pill_l)
        sub['R'].append((pill_r + 1) - eR)
        for side, ins in (('L', runs[0][0] - pill_l), ('R', pill_r - runs[-1][-1])):
            prof[side].append(str(ins))
            if MODE == 'int' and ins > 0 and d >= 3:
                est[side].append((d + ins) + math.sqrt(2.0 * d * ins))
        if MODE != 'int':
            for side in 'LR':
                ins = sub[side][-1]
                if ins == ins and ins > 0 and d >= 3:
                    est[side].append((d + ins) + math.sqrt(2.0 * d * ins))
    med = {}
    for s in 'LR':
        v = sorted(est[s])
        med[s] = v[len(v) // 2] if v else float('nan')
    print('   %-4s 좌인셋 %s' % (tag, ' '.join(prof['L'][:16])))
    print('   %-4s 우인셋 %s' % ('', ' '.join(prof['R'][:16])))
    if MODE != 'int':
        f = lambda vs: ' '.join('--' if v != v else '%.2f' % v for v in vs[:16])
        print('   %-4s ▸ 부분화소 좌 %s' % ('', f(sub['L'])))
        print('   %-4s ▸ 부분화소 우 %s' % ('', f(sub['R'])))
    print('   %-4s r 좌 %.1f · 우 %.1f · **평균 %.1f**' % ('', med['L'], med['R'], (med['L'] + med['R']) / 2))
    return (med['L'] + med['R']) / 2


# ── ⓒ 구분선 ─────────────────────────────────────────────────────────────
def sep(px, x, ytop, tag):
    """색 상자에 드는 **가장 긴 행 런** — 고르는 규칙은 옛 자 그대로다.
       958 2회차: 그 런의 «행 개수» 대신 **두 모서리의 차**를 같이 낸다(S↔V 한복판 68.7)."""
    ys = [y for y in range(ytop, ytop + 97)
          if 45 <= px[x, y][0] <= 95 and 30 <= px[x, y][1] <= 80 and 20 <= px[x, y][2] <= 65
          and sum(px[x, y]) < 210]
    if not ys:
        print('   %-4s 구분선 표본 0' % tag); return None, None
    best = cur = [ys[0]]
    for y in ys[1:]:
        if y == cur[-1] + 1:
            cur.append(y)
        else:
            if len(cur) > len(best):
                best = cur
            cur = [y]
    if len(cur) > len(best):
        best = cur
    print('   %-4s y %d~%d (h %d) · 셸 바깥 상변에서 **+%d**' % (tag, best[0], best[-1], len(best), best[0] - ytop))
    if MODE == 'int':
        return best[0] - ytop, len(best)
    lo, hi, top = sep_sub(px, x, ytop, best)
    print('   %-4s ▸ 부분화소 y %.2f~%.2f (h **%.2f**) · 상변에서 **+%.2f**  (CSS 54 · top 16)'
          % ('', lo, hi, hi - lo, top))
    # 968 — 원점을 **리터럴이 아니라 같은 자로** 잰다. 위 줄의 `ytop` 은 손으로 적은 정수라
    #   ① 낡으면 조용히 틀리고(437 이 바 상변을 1961 → 1960 으로 옮겼다) ② ref 는 정수라
    #   부분화소 상변(2020.75)과 0.25 어긋난다. 둘 다 «제품이 밀렸다» 로 오독된다.
    #   ⚠ 위 줄들은 한 글자도 안 건드렸다 — 이 줄은 **덧붙인 검산**이다.
    o = outer_top(px, x, ytop)
    print('   %-4s ▸ 원점을 같은 자로: 셸 바깥 상변 %.2f ⇒ 오프셋 **+%.2f** · 하변 **+%.2f**'
          % ('', o, lo - o, hi - o))
    return top, hi - lo


def outer_top(px, x, ytop):
    """셸 바깥 상변(P 크림 → K 검정)의 **부분화소** 자리 — ⓑ 가 두께를 낼 때 쓰는 그 교차다."""
    pre = 10
    cols = [px[x, ytop - pre + i] for i in range(pre + 14)]
    return _cross(cols, pre, 'P', 'K') + ytop - pre


def sep_sub(px, x, ytop, best):
    pre = 4
    y0 = best[0] - pre
    n = len(best) + 2 * pre
    cols = [px[x, y0 + i] for i in range(n)]
    lo = _cross(cols, pre, 'S', 'V') + y0
    hi = _cross(cols, pre + len(best), 'V', 'S') + y0
    return lo, hi, lo - ytop


# ── 합성 재현 ────────────────────────────────────────────────────────────
class _Plate:
    """합성 판을 «그림처럼» 읽게 하는 얇은 껍데기 — 재현이 **진짜 자**를 그대로 부른다(사본 0)."""

    def __init__(self, cols):
        self.cols = cols

    def __getitem__(self, xy):
        x = xy[0]
        return self.cols[min(max(x, 0), len(self.cols) - 1)]


C = dict(PAL352)


def _stat(vals):
    """(판 사이 최대 |Δ| · 번진 판 **부호** 평균 편향). 표본이 없으면 nan —
       ⚠ 얇은 층은 번짐 σ 아래로 내려가면 «느슨 문턱 이하» 표본이 아예 안 남는다(분해 한계)."""
    if not vals:
        return (float('nan'), float('nan'))
    return (max(abs(b - a) for a, b, _ in vals), sum(b - t for _, b, t in vals) / len(vals))


def _fmt(st):
    return '     --             --   ' if st[0] != st[0] else '%8.2f        %+8.3f' % st


def physics():
    """⚑ 958 2회차 재현 — **그림도 브라우저도 안 쓴다.** 같은 참값 층더미를 «칼같은 판»(cap = PNG)과
       «번진 판»(ref = JPEG · σ 1.1px)으로 그려 두 자로 읽는다. 판을 그리는 셈은
       `probe409g.phys_cols` 하나뿐이다(사본 0 · 942 3회차 규약 — 팔레트 밖 색은 삼중항으로 준다).

    ⚠ **위상 6개를 평균한다** — 참 경계가 화소 격자 어디에 앉느냐로 정수 자의 오차가 0 에서 1 까지
      오가므로 한 위상만 보면 어느 쪽으로든 결론이 뒤집힌다(932 [3] 규약).
    ⚠ 판정을 지는 것은 «판 사이 |Δ|» 가 아니라 **번진 판 부호 편향**이다 — 칼같은 판은 경계가
      계단이라 어느 자로 재도 ±0.5 를 못 넘고(942 4회차 [9-d]) 그 ±0.5 가 |Δ| 에 그대로 섞인다."""
    print('\n══════ 352 재현 (958 2회차) — 합성 판 ══════')
    print(' 걸음은 이 자의 것 그대로 **1px** 다 · 옛 자 = 문턱 이하 화소 개수 · 새 자 = 문턱 교차 보간(ⓐ)')
    PH = [i / 6.0 for i in range(6)]

    def plates(widths):
        # ⚠ 층 이름은 **RGB 삼중항**으로 준다 — `probe409g.PAL` 에는 이 부품의 색(시트 크림 P ·
        #   바 바닥 S · 구분선 V)이 없고, 있는 글자(S)는 **다른 색**이다. 팔레트에 색을 더하면
        #   그 자의 `cls()` 분류가 바뀌어 남의 자가 흔들리므로 판만 색으로 그린다(958 2회차).
        cols = phys_cols(widths=tuple((C[ch], w) for ch, w in widths), sig=1.1, step=1.0)
        return _Plate(cols['cap']), _Plate(cols['ref']), len(cols['cap'])

    # ── ⓐ 셸 검정 테두리 두께 (P → K → R) ──────────────────────────────
    print('\n ⓐ 셸 검정 테두리 두께(`black_sub`) — 참값 층더미  P 6+ph · K k · R 7.0 · S 10.0')
    print('  참K   자    판사이 최대|Δ|   번진 판 부호평균')
    A = {}
    KS = (8.5, 7.0, 6.0, 5.0, 4.0, 3.0)
    for k in KS:
        for mode in ('int', 'cov'):
            vals = []
            for ph in PH:
                cap, ref, n = plates((('P', 6.0 + ph), ('K', k), ('R', 7.0), ('S', 10.0)))
                row = []
                for pl in (cap, ref):
                    st = next((i for i in range(n) if max(pl[i, 0]) <= LOOSE), None)
                    if st is None:
                        row.append(float('nan')); continue
                    row.append(float(runlen(pl, st, 0, 1, 0, LOOSE, n - st)) if mode == 'int'
                               else black_sub(pl, st, 0, 1, 0, LOOSE, n - st))
                if row[0] == row[0] and row[1] == row[1]:
                    vals.append((row[0], row[1], k))
            A[(k, mode)] = _stat(vals)
            print('  %4.1f  %-4s  %s' % (k, mode, _fmt(A[(k, mode)])))
    band = [k for k in KS if k >= 4.0]     # 판정 대역 — 이 자가 ref 에서 읽는 값은 7~8.5px
    worst = lambda vs: max([v for v in vs if v == v] or [float('nan')], key=abs)
    print('  ⇒ **판정 대역(K ≥ 4) 부호 편향  옛 %+.3f → 새 %+.3f px**  (판 사이 |Δ| %.2f → %.2f)'
          % (worst([A[(k, 'int')][1] for k in band]), worst([A[(k, 'cov')][1] for k in band]),
             max(A[(k, 'int')][0] for k in band), max(A[(k, 'cov')][0] for k in band)))

    # ── ⓑ 구분선 두께 (S → V → S) ──────────────────────────────────────
    print('\n ⓑ 구분선 두께(`sep`) — 참값 층더미  S 8+ph · V v · S 12.0   (S↔V 는 밝기 차 22 뿐이다)')
    print('  참V   자    판사이 최대|Δ|   번진 판 부호평균')
    B = {}
    VS = (54.0, 40.0, 20.0, 10.0)
    for v in VS:
        for mode in ('int', 'cov'):
            vals = []
            for ph in PH:
                cap, ref, n = plates((('S', 8.0 + ph), ('V', v), ('S', 12.0)))
                row = []
                for pl in (cap, ref):
                    ys = [i for i in range(n)
                          if 45 <= pl[i, 0][0] <= 95 and 30 <= pl[i, 0][1] <= 80
                          and 20 <= pl[i, 0][2] <= 65 and sum(pl[i, 0]) < 210]
                    if not ys:
                        row.append(float('nan')); continue
                    best = cur = [ys[0]]
                    for y in ys[1:]:
                        if y == cur[-1] + 1:
                            cur.append(y)
                        else:
                            if len(cur) > len(best):
                                best = cur
                            cur = [y]
                    if len(cur) > len(best):
                        best = cur
                    if mode == 'int':
                        row.append(float(len(best)))
                    else:
                        pre = 4
                        y0 = best[0] - pre
                        cols = [pl[y0 + i, 0] for i in range(len(best) + 2 * pre)]
                        row.append((_cross(cols, pre + len(best), 'V', 'S')
                                    - _cross(cols, pre, 'S', 'V')))
                if row[0] == row[0] and row[1] == row[1]:
                    vals.append((row[0], row[1], v))
            B[(v, mode)] = _stat(vals)
            print('  %4.1f  %-4s  %s' % (v, mode, _fmt(B[(v, mode)])))
    print('  ⇒ **부호 편향  옛 %+.3f → 새 %+.3f px**'
          % (worst([B[(v, 'int')][1] for v in VS]), worst([B[(v, 'cov')][1] for v in VS])))

    # ── ⓒ 인셋 (위치 축) ───────────────────────────────────────────────
    print('\n ⓒ 알약 코너 인셋(위치 축) — 참값 층더미  R 8+ph · K k · R 12.0   (참 인셋 = 8+ph)')
    print('  참K   자    판사이 최대|Δ|   번진 판 부호평균')
    D = {}
    for k in (7.0, 5.0, 3.0):
        for mode in ('int', 'cov'):
            vals = []
            for ph in PH:
                cap, ref, n = plates((('R', 8.0 + ph), ('K', k), ('R', 12.0)))
                row = []
                for pl in (cap, ref):
                    xs = [i for i in range(n) if max(pl[i, 0]) <= LOOSE]
                    if len(xs) < 3:
                        row.append(float('nan')); continue
                    if mode == 'int':
                        row.append(float(xs[0]))
                    else:
                        cols = [pl[i, 0] for i in range(n)]
                        row.append(_cross(cols, xs[0], 'R', 'K'))
                if row[0] == row[0] and row[1] == row[1]:
                    vals.append((row[0], row[1], 8.0 + ph))
            D[(k, mode)] = _stat(vals)
            print('  %4.1f  %-4s  %s' % (k, mode, _fmt(D[(k, mode)])))
    print('  ⇒ **부호 편향  옛 %+.3f → 새 %+.3f px**'
          % (worst([D[(k, 'int')][1] for k in (7.0, 5.0, 3.0)]),
             worst([D[(k, 'cov')][1] for k in (7.0, 5.0, 3.0)])))

    # ── ⓓ 지문 ─────────────────────────────────────────────────────────
    print('\n ⓓ 지문 — 옛 자의 값은 예외 없이 정수, 새 자는 **번진 판에서** 그 격자에서 풀린다')
    print('   ⚠ **칼같은 판은 새 자도 정수가 맞다** — 경계가 계단이면 부분 화소 정보가 애초에 없다.')
    for who, blur in (('cap', False), ('ref', True)):
        for mode in ('int', 'cov'):
            vs = []
            for k in KS:
                for ph in PH:
                    cap, ref, n = plates((('P', 6.0 + ph), ('K', k), ('R', 7.0), ('S', 10.0)))
                    pl = ref if blur else cap
                    st = next((i for i in range(n) if max(pl[i, 0]) <= LOOSE), None)
                    if st is None:
                        continue
                    v = (float(runlen(pl, st, 0, 1, 0, LOOSE, n - st)) if mode == 'int'
                         else black_sub(pl, st, 0, 1, 0, LOOSE, n - st))
                    if v == v:
                        vs.append(v)
            print('   %s %-4s  정수 %d/%d' % (who, mode,
                  sum(1 for v in vs if abs(v - round(v)) < 1e-9), len(vs)))
    print()


# ── 본문 ─────────────────────────────────────────────────────────────────
def main():
    if '--physics' in sys.argv:
        physics()
        return

    ref7 = load(REF7).load()
    ref3 = load(REF3).load()
    # ⚑ 958 2회차 곁다리(여섯째) — 캡처 PNG 는 **커밋 금지 자산**이라 없는 클론이 정상이다.
    #   942 의 2·3·4·5회차와 958 1회차가 같은 얼굴을 다섯 번 고쳤다. 없으면 **ref 절만** 돈다.
    has = os.path.exists(CAP7) and os.path.exists(CAP3)
    cap7 = load(CAP7).load() if has else None
    cap3 = load(CAP3).load() if has else None
    if not has:
        print('\n⚠ 캡처 없음 (%s) — 커밋 금지 자산이라 **없는 클론이 정상**이다. ref 절만 돈다.' % CAP7)

    print('\n══════ 07 스킬 시트 — 4칸 · 활성 «스킬»(가운데) · 구분선 있음 ══════')
    print(' 자 = %s' % ('옛 정수 (--int)' if MODE == 'int' else '부분 화소 (958 2회차 · 옛 자는 --int)'))
    print(' ⓪ 셸 바깥 상자 (느슨 문턱으로 찾는다)')
    print('   ref  x 66~1013 (w 948) · y 2021~2117 (h 97)')
    print('   cap  x 65~1014 (w 950) · y 1960~2057 (h 98)   ← 437 로 상변이 1961 → 1960')

    print('\n ⓑ 셸 검정 테두리 — «ref 8 ↔ 우리 6» 인가')
    border('ref', ref7, 66, 1013, 2021, 2117, 2069, 663)
    if has:
        border('cap', cap7, 65, 1014, 1960, 2057, 2008, 663)   # 437 — 셸 98/테두리 7 로 상변 −1
    print('   ref 좌 세로단면 %s' % strip(ref7, 66, 2069, 1, 0, 12))
    print('   ref 상 가로단면 %s' % strip(ref7, 663, 2021, 0, 1, 12))
    print('   ⇒ ref 의 순검정은 6 이고 그 바깥에 AA 가 한 줄씩 붙는다. 느슨 문턱으로 세면 8 이 된다.')
    print('   ⚠ 437 (2026-08-30) 정오 — 이 두 줄의 결론은 **폐기**됐다. `probe437.py` 가 자 넷을')
    print('     우리 캡처로 먼저 검산(넷 다 오차 0.00)한 뒤 ref 를 색 분류로 읽으니')
    print('     K7 · B7 · F63 · B7 · D7 · K6(+AA) = 테두리 **7** · 칸 **84** · 바깥 **98** 이다.')
    print('     «97 · 85 · 6» 은 정수 문턱이 부분화소를 버린 값이었다(부분화소 바깥 높이 ref 98.02).')
    print('   ⚑ 958 2회차 — 그 폐기가 **이 자의 값으로도** 확인된다: 느슨 8 ↔ 순검정 7 은')
    print('     같은 경계를 반 화소씩 다르게 반올림한 값이고, 부분 화소로 세면 **한 값으로 모인다**')
    print('     (CSS 테두리 7 + 안쪽 립 --sl 1.5 = 8.5 — 450 이 등재한 그 립까지가 이 런이다).')

    print('\n ⓓ 검정 안쪽 20px — 셸 좌·우 «밝은 림»')
    print('   ref 좌 %s' % strip(ref7, 66, 2069, 1, 0))
    if has:
        print('   cap 좌 %s' % strip(cap7, 65, 2009, 1, 0))
    print('   ref 우 %s' % strip(ref7, 1013, 2069, -1, 0))
    if has:
        print('   cap 우 %s' % strip(cap7, 1014, 2009, -1, 0))
    print('   ref 03 좌 %s' % strip(ref3, 151, 2069, 1, 0))
    if has:
        print('   cap 03 좌 %s' % strip(cap3, 151, 2009, 1, 0))

    print('\n ⓐ 활성 알약 «스킬» 코너 반경 — 원호 역산 (역산기는 우리 캡처로 검산한다)')
    radius(ref7, 292, 551, 2027, 'ref')
    if has:
        radius(cap7, 291, 551, 1967, 'cap')

    print('\n ⓒ `.stab-sep` 구분선 — x777(ref) / x775(cap)')
    sep(ref7, 777, 2021, 'ref')
    if has:
        # 968 — cap 원점 1961 → **1960**. 437 이 바 상변을 1961 → 1960 으로 옮겼는데(바로 위
        #   ⓪ 줄이 그렇게 적고 있다) 이 리터럴만 안 따라와 «+22» 를 찍었고, CSS 항등식
        #   (테두리 7 + top 16 = 23)과의 그 1.00px 이 968 등재문의 «0.86px» 로 굳었다.
        #   원점을 고치면 cap 이 **+23.00 = 항등식 Δ0.00** 이다(같은 줄의 새 검산과 일치).
        sep(cap7, 775, 1960, 'cap')


if __name__ == '__main__':
    main()
