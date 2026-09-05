#!/usr/bin/env python3
"""작업 667 — **9회차 전용 자**: 리본 한 줄 위에 얹힌 부품들(수량 잉크 · 금색 판 · 리본 좌단 · 띠 두께).

8회차가 «9회차가 이어서 할 것» 으로 넘긴 자리는 전부 **리본 한 줄 안에서 벌어지는 어긋남**이다:

  1. 수량 «1,500» 잉크가 판 중심에서 오른쪽으로 앉는다(BB [4]·BC [8][16] — 2인 일치).
     ⚑ 8회차가 배너 글자에서 이미 잰 축이다 — `text-align:center` 는 **advance** 를 가운데 두는데
     잉크는 글자마다 side bearing 이 달라 그 중심에 안 온다. 손잡이는 `right`(가로)·`top`(세로).
  2. 리본 좌단이 카드 바깥선보다 나가는가 (BB [5] «우리 3.5px, ref 는 0» ↔ 측정표 §7-1 «ref −1.6»).
  3. 금색 판이 리본 위/아래로 얼마나 솟는가 — BC [14] «카드 종류별로 부호가 갈린다».
  4. 불릿형 리본 띠 두께 (BC [12] «+4.7%»).

⚑ **이 자의 규칙 둘**
  · **상자는 DOM 에서, 잉크는 화소에서.** `probe667b.js` 가 크롭-로컬 상자를 적어 주고 이 자는
    그 상자를 **창** 으로만 쓴다 — 창을 좁히면 8회차 ⒞ 가 겪은 «옆 부품이 섞여 마스크가 흔들린다» 가 없다.
  · **ref 와 우리를 같은 마스크로.** 금색은 **채움만**(tol 30 — 8회차가 ref 판 폭 33.0 / 우리 32.5 를
    낸 그 문턱이다. 문턱을 풀면 밝은 금 테까지 들어와 ref 가 40 으로 커진다).

⚑ **932(1회차) — 이 자의 모서리는 부분 화소다.** 옛 판은 `bbox()`·`left_edge()` 가 **정수** 좌표를
  돌려줬고, ref 는 우리보다 K=2.0628 배 작아 그 바닥깎기가 **우리 px 로 2.06 씩** 손해였다.
  증거는 이 자 자신의 옛 출력이다 — «환산» 칸이 예외 없이 K 의 배수였고, 참값이 1~2 ref px 인
  `prot`(리본 좌단 돌출)이 **네 줄 전부 정확히 +0.00** 이었다(측정표 §7-1 은 «ref −1.6» 이라 적는다).
  `--int` 로 옛 자를 그대로 부를 수 있다(대조·되돌림 시험).

실행:
  python3 tools/scan667b.py [--cap docs/review/151-r13] [--geo docs/review/151-r13.geo.json] [--int] [--ref-only]
"""
import json
import sys

from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628                      # ref 카드 폭 474.12 → 우리 978 (측정표 §9)

RED = (255, 86, 93)             # 리본 빨강 #FF565D
GOLD = (211, 124, 19)           # 금색 판 채움 (ref #D37C13 ↔ 우리 #D47D14 — 같은 마스크로 잡힌다)
TOL_GOLD = 30                   # 8회차와 같은 문턱 (밝은 금 테 #FDC532 를 뺀다)
TOL_RED = 90
BG = (39, 39, 49)               # 두 그림의 바탕이 같다 (ref 크롭 · 우리 캡처 모두)

# ── ref 의 리본·판 창 (scan151 «빨강 덩어리» + 금색 채움 탐색으로 확정 · abs px)
REF_CARDS = [
    ('ref 카드1 파랑=배너형', 17, 481, [('rb1', 180, 204, 150, 215), ('rb2', 237, 261, 195, 260)]),
    ('ref 카드2 초록=불릿형', 17, 481, [('rb1', 574, 602, 170, 235), ('rb2', 640, 667, 197, 262)]),
]


def near(a, rgb, tol):
    return np.abs(a - np.array(rgb)).sum(2) < tol


INT_STEP = False          # --int 로 켜면 옛 정수 걸음 자를 그대로 쓴다(대조·되돌림 시험)


def bbox(m, ox=0, oy=0):
    """옛 자 — «마스크가 선 첫/끝 화소» 의 정수 좌표. 대조용으로 남긴다."""
    ys = np.where(m.any(1))[0]
    xs = np.where(m.any(0))[0]
    if not len(ys):
        return None
    return (int(xs[0]) + ox, int(ys[0]) + oy, int(xs[-1]) + ox, int(ys[-1]) + oy)


def _edge(prof, thr, rising=True):
    """1차원 프로파일이 thr 을 지나는 자리를 **선형 보간**으로 — 없으면 None.

    ⚑ 창 **밖**은 «문턱 아래» 로 본다(가상 표본 0). 그래야 부품이 창 끝에 붙어 있어도
    모서리가 사라지지 않고, 창을 넘어간 만큼이 음수로 드러난다.
    돌려주는 값은 **화소 중심 좌표**(정수 i = i 번 화소의 한가운데)다.
    """
    n = len(prof)
    if n < 2:
        return None
    seq = list(range(n)) if rising else list(range(n - 1, -1, -1))
    pi, pv = seq[0] - (1 if rising else -1), 0.0        # 창 밖 가상 표본
    for i in seq:
        v = float(prof[i])
        if pv < thr <= v:
            return pi + (thr - pv) / (v - pv) * (i - pi)
        pi, pv = i, v
    return None


# ⚑⚑ **932 3회차 — 남은 얇은 축 셋(`ptop` · `dtop` · 리본 띠 두께)을 부분 화소로 갈아 끼웠다.**
#
#    2회차는 `bbox()` 를 «소속도가 반이 되는 자리» 로 갈아 봤다가 **재는 것이 바뀌어** 되돌렸다.
#    3회차가 그 자리를 다시 열어 **세 갈래를 실제로 돌려 봤고**, 가운데가 아니라 **셋째가 답이었다**:
#
#      ⓑ 질량 적분(`scan667c.dark_mass`)을 색 거리에 그대로  → 금판 폭 38 → **42.96(+13%)**
#         고원을 자동으로 찾으면 밝은 금 테(#FDC532 · 거리 60) **너머 검정**(거리 229)을 집고
#         테를 «74% 금» 으로 센다. 2회차가 «+10%» 로 만난 함정과 같은 자리다.
#      «바깥 색을 적어 준» 소속도 α = 1 − d/D        → 금판 **상변이 1.7 px 위로**
#         뾰족한 방패 꼭지에서 **꼭지 화소 한 톨**이 상변을 정한다. 옛 자가 재던 것이 아니다.
#      **ⓐ 같은 투영·같은 문턱의 교차점 보간**        → **정의를 한 글자도 안 바꾸고 정수 걸음만 없앤다** ✔
#
#    ⚑ 932 1회차 물리표의 마지막 줄이 이미 답을 적어 두고 있었다 — «교차점 보간은 «경계 위치» 처럼
#      **두께가 아닌 축**에만 쓴다». `ptop`·`dtop` 은 두께가 아니라 **두 모서리의 차**이고,
#      2회차가 `prot` 에 쓴 `left_edge` 도 같은 ⓐ 였다(선례가 이 파일 안에 있었다).
#      ⚠ 두께 **자체**를 내는 다른 R 자(`scan885e`·`scan887`·`probe866`)에는 ⓑ 가 그대로 1순위다.
#
#    **규칙 둘** —
#      1. **문턱은 한 칸도 안 무르게 한다.** 구간(run)은 옛 마스크와 **글자 그대로 같은 문턱**
#         (`TOL_RED` 90 · `TOL_GOLD` 30 · 잉크 `min>205`)으로 찾는다. 부분 화소는 그 구간의
#         **모서리를 미는 데만** 쓴다 — «문턱을 풀어 넓히는 일» 이 아니다(2회차 ⓗ 의 오답).
#      2. **창(窓)은 옛 정수 상자에서 그대로 가져온다.** 값이 커져도 창이 안 따라 커지므로
#         2회차가 겪은 «판이 넓어져 잉크 창에 옆 부품이 섞인다»(폭 42 → 60.6)가 구조적으로 안 생긴다.
#         (이 자의 머리말 규칙 «상자는 DOM 에서, 잉크는 화소에서» 의 연장이다.)
#
#    ⚑ **판 폭 33~38 · 판 높이 31~40 · 잉크 폭 42~47 은 정수로 남긴다 — «고치면 안 되는» 축이다.**
#      ⓐ 얇은 축이 아니다(±1 눈금 = ±1.4~1.5% · 932 의 결함 조건 ① 이 안 선다)
#      ⓑ 금판 채움 바깥에 밝은 금 테가 한 겹 있고 잉크 «1,500» 은 글자 사이가 비어 있어
#        **두 색 경계가 아니다** — 어느 자로 재도 «테를 반쯤 세느냐» 가 곧 정의 변경이다.
#      `verify932` **[6-d]** 가 그 여덟 폭이 정수인 것을 지킨다.
#
#    `--int` 로 옛 정수 자를 통째로 되부를 수 있다(대조·되돌림 시험 — `verify932` §5·§6).

PAD = 6          # 모서리를 보려면 상자 바깥 한 겹이 창 안에 있어야 한다 — 잘리면 «못 잰 것»

_DIST_TOL = {'red': TOL_RED, 'gold': TOL_GOLD, 'ink': 150}


def dist(line, kind):
    """한 줄(n×3)의 «표적에서 얼마나 먼가» — 안쪽 0 부근 · 바깥은 그 모서리의 다른 색.

    ⚠ 옛 마스크와 **정확히 같은 판정**을 준다: red/gold 는 `near()` 의 L1 거리 그대로이고,
    ink 는 `min>205` ⟺ `3·(255 − min) < 150` 이라 한 화소도 안 어긋난다.
    """
    if kind == 'ink':
        return 3.0 * (255 - line.min(1)).astype(float)
    tgt = RED if kind == 'red' else GOLD
    return np.abs(line - np.array(tgt)).sum(1).astype(float)


def edge_sub(sub, kind, axis, side, ib):
    """정수 상자 ib(sub 로컬)의 **한 모서리**를 부분 화소로 — 못 재면 None(창에 잘렸다).

    axis 0 = 세로 · 1 = 가로 · side 0 = 앞(위/왼쪽) · 1 = 뒤(아래/오른쪽).

    ⚑⚑ **정의는 한 글자도 안 바꾼다 — 걸음만 정수에서 부분 화소로 간다.**
      옛 `bbox()` 는 «투영해서(any) 마스크가 서는 첫 줄» 을 **정수 index** 로 줬다.
      여기서는 같은 투영·같은 문턱의 **교차점을 선형 보간**해 그 줄의 소수 자리를 낸다
      (932 등재문의 처방 ⓐ · 선례 `scan895.stroke_thk` · 이 자의 `left_edge`(2회차)와 같은 꼴).
      ⚠ 두께가 아니라 **경계 위치** 축이라 ⓐ 가 맞는 자리다 — 1회차 물리표의 마지막 줄 그대로.

    ⚑ 왜 «소속도 반» 이 아닌가 — 그 자는 **정의를 바꾼다.** 금판 위는 밝은 금 테라
      소속도로 재면 테를 반쯤 세어 상변이 1.7 px 위로 뜨고(3회차 실측), 뾰족한 방패 꼭지에서는
      «꼭지 화소 한 톨» 이 상변을 정한다. 옛 자가 재던 것은 그것이 아니다.
    """
    x0, y0, x1, y1 = ib
    if axis == 0:
        r0, r1 = max(0, y0 - PAD), min(sub.shape[0], y1 + 1 + PAD)
        c0, c1 = max(0, x0), min(sub.shape[1], x1 + 1)
        s0, s1, off = y0 - r0, y1 - r0, r0
    else:
        r0, r1 = max(0, y0), min(sub.shape[0], y1 + 1)
        c0, c1 = max(0, x0 - PAD), min(sub.shape[1], x1 + 1 + PAD)
        s0, s1, off = x0 - c0, x1 - c0, c0
    w = sub[r0:r1, c0:c1, :]
    if w.size == 0:
        return None
    d = dist(w.reshape(-1, 3), kind).reshape(w.shape[:2])
    pd = d.min(1) if axis == 0 else d.min(0)          # 투영 = 옛 bbox 와 같은 판정
    thr = _DIST_TOL[kind]
    inside = np.where(pd < thr)[0]
    if not len(inside):
        return None
    i = int(inside[0] if side == 0 else inside[-1])
    if not (s0 - 1 <= i <= s1 + 1):                   # 상자와 다른 덩어리를 잡았다
        return None
    j = i + (-1 if side == 0 else 1)
    if not (0 <= j < len(pd)):
        return None                                   # 창에 잘렸다 — 억지로 내지 않는다
    v0, v1 = float(pd[i]), float(pd[j])
    if not (v0 < thr <= v1):
        return None
    return off + i + (j - i) * (thr - v0) / (v1 - v0)


def win(a, x0, y0, x1, y1):
    x0, y0 = max(0, int(x0)), max(0, int(y0))
    x1, y1 = min(a.shape[1], int(x1)), min(a.shape[0], int(y1))
    return a[y0:y1, x0:x1], x0, y0


def left_edge(a, rows, x0, x1, thr=60):
    """행마다 «바탕이 아닌 첫 화소» 의 x — 검정 외곽까지 포함한 바깥 모서리.

    ⚑ 932 — 옛 판은 `np.where(d > thr)[0][0]` 로 **정수 x** 를 돌려줬고, 그 위에서 나온
    `prot`(리본 좌단 돌출)이 ref 네 줄 전부 **정확히 +0.00** 이었다(측정표 §7-1 은 «ref −1.6»
    이라고 적어 두었다 — 자가 그 값을 표현할 수 없었던 것이다). 이제 바탕 거리 d 가 thr 을
    지나는 자리를 **선형 보간**으로 잡는다. 딱 떨어지는 그림에서는 옛 값과 ±0.5 안에서 같다.
    """
    out = []
    for y in rows:
        if y < 0 or y >= a.shape[0]:
            continue
        row = a[y, max(0, x0):x1]
        d = np.abs(row - np.array(BG)).sum(1)
        if INT_STEP:
            i = np.where(d > thr)[0]
            if len(i):
                out.append(max(0, x0) + int(i[0]))
            continue
        e = _edge(d, thr, True)
        if e is not None:
            out.append(max(0, x0) + e)
    return out


def _side(sub, ox, oy, box, kind, axis, side, dflt):
    """절대 좌표 상자 box 의 한 모서리 — 부분 화소로 못 재면 옛 정수값(dflt)을 그대로 쓴다."""
    if INT_STEP:
        return float(dflt)
    x0, y0, x1, y1 = box
    v = edge_sub(sub, kind, axis, side, (x0 - ox, y0 - oy, x1 - ox, y1 - oy))
    return float(dflt) if v is None else (oy if axis == 0 else ox) + v


def one_ribbon(a, tag, cl, cr, ry0, ry1, gx0, gx1, ubox, k, scale):
    """리본 한 줄 — 4항. 좌표는 카드 외곽 좌상단 로컬 · scale 로 «우리 px 환산» 을 같이 낸다."""
    S = (lambda v: v * scale)
    # ── 리본 빨강 채움 (문턱은 옛 마스크 그대로 · 정수 상자가 곧 «창»)
    sub, ox, oy = win(a, cl - 25, ry0 - 8, cr, ry1 + 9)
    rb = bbox(near(sub, RED, TOL_RED), ox, oy)
    if rb is None:
        print(f'  {tag}: 빨강 채움 없음')
        return None
    rx0, iry_t, rx1, iry_b = rb          # ⚑ i… = 정수 상자 = «창» — 표본 줄은 이것만 본다
    win_rb = f'띠 y {iry_t}..{iry_b}'
    ry_t = _side(sub, ox, oy, rb, 'red', 0, 0, iry_t)
    ry_b = _side(sub, ox, oy, rb, 'red', 0, 1, iry_b)
    th = ry_b - ry_t + 1
    # ── 리본 좌단 돌출 (카드 바깥선 기준 · 둘 다 «바탕이 아닌 첫 화소»)
    body = [y for y in range(ry0 - 60, ry0 - 20)]
    ce = left_edge(a, body, cl - 25, cl + 45)
    re_ = left_edge(a, range(iry_t + 3, iry_b - 2), cl - 25, cl + 45)
    prot = (np.median(ce) - np.median(re_)) if ce and re_ else float('nan')
    # ── 금색 판 채움
    sub, ox, oy = win(a, gx0, ry0 - 22 * k, gx1, ry1 + 16 * k)
    pl = bbox(near(sub, GOLD, TOL_GOLD), ox, oy)
    print(f'  {tag}: 띠 y {ry_t:.2f}..{ry_b:.2f} 두께 **{th:.2f}** (환산 {S(th):.1f}) · '
          f'빨강좌단 {rx0 - cl:+.2f} · 좌단돌출(바깥선) **{prot:+.2f}** (환산 {S(prot):+.2f})')
    if pl is None:
        print('        금색 판 채움 없음')
        return None
    ipx0, ipy0, ipx1, ipy1 = pl          # ⚑ 창 전용 — 아래 잉크 창이 이것만 본다
    px0, py0, px1, py1 = pl
    win_pl = f'판 x {px0}..{px1} y {py0}..{py1}'
    # ⚑ **폭·높이는 정수 그대로 둔다(3회차 판정 · 되돌림이 아니라 결론이다)** —
    #   ① 얇은 축이 아니다(33~38 px ⇒ ±1 눈금이 ±1.4~1.5%, 895 가 겪은 −45% 와 격이 다르다)
    #   ② 금판 바깥에 **밝은 금 테**가 한 겹 있어 «두 색 경계» 가 아니다 — 어느 자로 재도
    #      테를 반쯤 세느냐 마느냐가 곧 정의 변경이 된다(2회차 +10% · 3회차 +13% 실측).
    #   ⇒ 이 축은 «부분 화소로 못 가는» 것이 아니라 **가면 재는 것이 바뀌는** 축이다.
    pw, ph = float(px1 - px0 + 1), float(py1 - py0 + 1)
    px0, px1, py1 = float(px0), float(px1), float(py1)
    py0 = _side(sub, ox, oy, pl, 'gold', 0, 0, py0)      # ptop 이 쓰는 상변만 부분 화소
    pcx = (px0 + px1 + 1) / 2
    print(f'        금판채움: x {px0 - cl:.1f}..{px1 - cl:.1f} 중심 **{pcx - cl:.2f}** 폭 {pw:.0f} · '
          f'y {py0:.2f}..{py1:.0f} 높이 {ph:.0f} · '
          f'띠상변 위로 **{ry_t - py0:+.2f}** (환산 {S(ry_t - py0):+.2f}) · 띠하변 아래로 {py1 - ry_b:+.2f}')
    # ── 수량 흰 잉크 (창 = ubox 가 있으면 그것, 없으면 판 아래 판폭 2배)
    if ubox:
        ux0, uy0 = ubox['x'] - 16, ubox['y'] - 10
        ux1, uy1 = ubox['x'] + ubox['w'] + 16, ubox['y'] + ubox['h'] + 12
        bcx = ubox['x'] + ubox['w'] / 2
    else:
        # ⚠⚑ **창은 «옛 정수 판» 에서 뽑는다** — 932 2회차가 여기서 발을 헛디뎠다.
        #    판 폭을 부분 화소로 다시 잰 값으로 창을 만들면 판이 넓어진 만큼 창이 커져
        #    **옆 부품이 잉크 마스크에 섞인다**(2회차 실측: 폭 42 → 60.6). 창과 값을 갈라 둔다.
        w = ipx1 - ipx0 + 1
        ipcx = (ipx0 + ipx1 + 1) / 2
        ux0, ux1 = ipcx - w, ipcx + w
        uy0, uy1 = ipy1 + 1, ipy1 + 1.5 * w
        bcx = pcx
    sub, ox, oy = win(a, ux0, uy0, ux1, uy1)
    wi = bbox(sub.min(2) > 205, ox, oy)
    if wi is None:
        print('        수량 잉크 없음')
        return None
    wx0, wy0, wx1, wy1 = wi
    win_wi = f'잉크 x {wx0}..{wx1} y {wy0}..{wy1}'
    wx0, wx1, wy1 = float(wx0), float(wx1), float(wy1)
    # ⚑ 잉크도 **상변만** — `dtop` 이 쓰는 축이다. 폭은 «1,500» 이라 두 색 경계가 아니고
    #   (글자 사이가 비어 있다) 42~47 px 이라 얇은 축도 아니다.
    #   ⚠ ref 쪽 창은 판 하변 바로 아래에서 시작하므로 상변이 창에 붙으면 못 잰다 —
    #     그럴 때 `_side` 가 옛 정수값을 그대로 돌려준다(억지로 밀지 않는다).
    wy0 = _side(sub, ox, oy, wi, 'ink', 0, 0, wy0)
    wcx = (wx0 + wx1 + 1) / 2
    print(f'        창(정수): {win_rb} · {win_pl} · {win_wi}')
    print(f'        수량잉크: x {wx0 - cl:.1f}..{wx1 - cl:.1f} 중심 **{wcx - cl:.2f}** 폭 {wx1 - wx0 + 1:.0f} · '
          f'y {wy0:.2f}..{wy1:.0f} 높이 {wy1 - wy0 + 1:.0f}')
    print(f'        ⇒ 잉크중심 − 판중심 **{wcx - pcx:+.2f}** (환산 {S(wcx - pcx):+.2f}) · '
          f'잉크중심 − 상자중심 **{wcx - bcx:+.2f}** · '
          f'잉크상변 − 띠하변 **{wy0 - ry_b:+.2f}** (환산 {S(wy0 - ry_b):+.2f})')
    return dict(th=th, prot=prot, pcx=pcx - cl, ptop=ry_t - py0, wcx=wcx - cl,
                dcx=wcx - pcx, dbox=wcx - bcx, dtop=wy0 - ry_b)


def main():
    global INT_STEP
    if '--int' in sys.argv:
        INT_STEP = True          # 옛 정수 걸음 자 — 대조·되돌림 시험 전용
    cap = 'docs/review/151-r13'
    geo = 'docs/review/151-r13.geo.json'
    if '--cap' in sys.argv:
        cap = sys.argv[sys.argv.index('--cap') + 1]
    if '--geo' in sys.argv:
        geo = sys.argv[sys.argv.index('--geo') + 1]

    print(f'== 레퍼런스 {REF} · 금색 문턱 {TOL_GOLD} · K={K}  (환산 = ref × K)'
          f'  [자: {"③ 정수 걸음(옛 판 · --int)" if INT_STEP else "부분 화소(932 1회차)"}]')
    ra = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    R = {}
    for name, cl, cr, rbs in REF_CARDS:
        print(f'\n--- {name}  (카드 x{cl}..{cr})')
        for tag, ry0, ry1, gx0, gx1 in rbs:
            R[(name[:8], tag)] = one_ribbon(ra, tag, cl, cr, ry0, ry1, gx0, gx1, None, 1, K)

    if '--ref-only' in sys.argv:
        return
    print(f'\n== 우리 {cap}-c*.png  (환산 = ×1)')
    try:
        G = json.load(open(geo))
    except FileNotFoundError:
        # ⚑ 932 — ref 쪽만으로도 이 자가 돌아야 한다(ref 는 저장소 안에 있고 캡처는 아니다).
        #   옛 판은 여기서 **추적 스택 + 코드 1** 로 죽어 ref 절까지 같이 버렸다.
        print(f'(기하 {geo} 없음 — node tools/cap151.js <캡처>.png --crop 먼저 · ref 절만 냈다)')
        return
    for i, c in enumerate(G['cards'], 1):
        try:
            oa = np.asarray(Image.open(f'{cap}-c{i}.png').convert('RGB')).astype(int)
        except FileNotFoundError:
            print(f'\n(크롭 {cap}-c{i}.png 없음 — node tools/cap151.js {cap}.png --crop 먼저)')
            continue
        cl, cr = int(c['card']['x']), int(c['card']['x'] + c['card']['w'])
        kind = '배너형' if 'ban1' in c['cls'] else '불릿형'
        print(f"\n--- 우리 카드{i} [{c['id']} · {kind}]  (카드 x{cl}..{cr})")
        for k in ('rb1', 'rb2'):
            rb, ub, bb = c[k], c[k + 'u'], c[k + 'b']
            one_ribbon(oa, f"{k} «{c[k + 'utxt']}»", cl, cr,
                       int(rb['y']), int(rb['y'] + rb['h']),
                       int(bb['x'] - 14), int(bb['x'] + bb['w'] + 14), ub, 2, 1.0)


if __name__ == '__main__':
    main()
