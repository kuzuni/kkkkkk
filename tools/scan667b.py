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


# ⚑ **932 1회차가 여기서 멈춘 자리 — bbox 축 셋은 아직 정수다.**
#    `bbox()` 를 «소속도가 반이 되는 자리» 로 갈아 끼워 봤더니 **재는 것이 바뀌었다**:
#      · 금색 판 — 채움 바깥이 배경이 아니라 **밝은 금 테**(#FDC532)라, 안쪽 고원 ↔ 바깥 고원의
#        한가운데가 테 안으로 들어가 폭 33 → **36.4(+10%)** · 높이 31 → 33.9. 이 자의 머리말이
#        «문턱을 풀면 밝은 금 테까지 들어와 ref 가 40 으로 커진다» 고 경고한 바로 그 자리다.
#      · 수량 잉크 — 창이 판 폭에서 파생되므로 판이 넓어지면 창이 커져 **옆 부품이 섞인다**
#        (폭 42 → 60.6 · 중심 +10.35).
#    ⇒ **모서리마다 «바깥이 무엇인가» 를 따로 적어야 한다**(`scan667c.dark_mass` 가 두 밝은 고원을
#    각각 재는 이유가 이것이다). 그 셋은 932 다음 회차의 몫이고, 이번 회차는 **바깥이 바탕 하나로
#    분명한 `left_edge` 만** 갈아 끼웠다.


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


def one_ribbon(a, tag, cl, cr, ry0, ry1, gx0, gx1, ubox, k, scale):
    """리본 한 줄 — 4항. 좌표는 카드 외곽 좌상단 로컬 · scale 로 «우리 px 환산» 을 같이 낸다."""
    S = (lambda v: v * scale)
    # ── 리본 빨강 채움
    sub, ox, oy = win(a, cl - 25, ry0 - 8, cr, ry1 + 9)
    rb = bbox(near(sub, RED, TOL_RED), ox, oy)   # ⚠ 932 — 이 축은 아직 정수다(아래 ⚑)
    if rb is None:
        print(f'  {tag}: 빨강 채움 없음')
        return None
    rx0, ry_t, rx1, ry_b = rb
    th = ry_b - ry_t + 1
    # ── 리본 좌단 돌출 (카드 바깥선 기준 · 둘 다 «바탕이 아닌 첫 화소»)
    body = [y for y in range(ry0 - 60, ry0 - 20)]
    ce = left_edge(a, body, cl - 25, cl + 45)
    re_ = left_edge(a, range(ry_t + 3, ry_b - 2), cl - 25, cl + 45)
    prot = (np.median(ce) - np.median(re_)) if ce and re_ else float('nan')
    # ── 금색 판 채움
    sub, ox, oy = win(a, gx0, ry0 - 22 * k, gx1, ry1 + 16 * k)
    pl = bbox(near(sub, GOLD, TOL_GOLD), ox, oy)  # ⚠ 932 — 이 축은 아직 정수다(아래 ⚑)
    print(f'  {tag}: 띠 y {ry_t:.0f}..{ry_b:.0f} 두께 **{th}** (환산 {S(th):.1f}) · '
          f'빨강좌단 {rx0 - cl:+.2f} · 좌단돌출(바깥선) **{prot:+.2f}** (환산 {S(prot):+.2f})')
    if pl is None:
        print('        금색 판 채움 없음')
        return None
    px0, py0, px1, py1 = pl
    pcx = (px0 + px1 + 1) / 2
    print(f'        금판채움: x {px0 - cl:.1f}..{px1 - cl:.1f} 중심 **{pcx - cl:.2f}** 폭 {px1 - px0 + 1} · '
          f'y {py0:.0f}..{py1:.0f} 높이 {py1 - py0 + 1} · '
          f'띠상변 위로 **{ry_t - py0:+.1f}** (환산 {S(ry_t - py0):+.1f}) · 띠하변 아래로 {py1 - ry_b:+.1f}')
    # ── 수량 흰 잉크 (창 = ubox 가 있으면 그것, 없으면 판 아래 판폭 2배)
    if ubox:
        ux0, uy0 = ubox['x'] - 16, ubox['y'] - 10
        ux1, uy1 = ubox['x'] + ubox['w'] + 16, ubox['y'] + ubox['h'] + 12
        bcx = ubox['x'] + ubox['w'] / 2
    else:
        w = px1 - px0 + 1
        ux0, ux1 = pcx - w, pcx + w
        uy0, uy1 = py1 + 1, py1 + 1.5 * w
        bcx = pcx
    sub, ox, oy = win(a, ux0, uy0, ux1, uy1)
    wi = bbox(sub.min(2) > 205, ox, oy)           # ⚠ 932 — 이 축은 아직 정수다(아래 ⚑)
    if wi is None:
        print('        수량 잉크 없음')
        return None
    wx0, wy0, wx1, wy1 = wi
    wcx = (wx0 + wx1 + 1) / 2
    print(f'        수량잉크: x {wx0 - cl:.1f}..{wx1 - cl:.1f} 중심 **{wcx - cl:.2f}** 폭 {wx1 - wx0 + 1} · '
          f'y {wy0:.0f}..{wy1:.0f} 높이 {wy1 - wy0 + 1}')
    print(f'        ⇒ 잉크중심 − 판중심 **{wcx - pcx:+.2f}** (환산 {S(wcx - pcx):+.2f}) · '
          f'잉크중심 − 상자중심 **{wcx - bcx:+.2f}** · '
          f'잉크상변 − 띠하변 **{wy0 - ry_b:+.1f}** (환산 {S(wy0 - ry_b):+.1f})')
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
