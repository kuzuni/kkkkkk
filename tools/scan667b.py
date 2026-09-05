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

실행:
  python3 tools/scan667b.py [--cap docs/review/151-r13] [--geo docs/review/151-r13.geo.json]
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


def bbox(m, ox=0, oy=0):
    ys = np.where(m.any(1))[0]
    xs = np.where(m.any(0))[0]
    if not len(ys):
        return None
    return (int(xs[0]) + ox, int(ys[0]) + oy, int(xs[-1]) + ox, int(ys[-1]) + oy)


def win(a, x0, y0, x1, y1):
    x0, y0 = max(0, int(x0)), max(0, int(y0))
    x1, y1 = min(a.shape[1], int(x1)), min(a.shape[0], int(y1))
    return a[y0:y1, x0:x1], x0, y0


def left_edge(a, rows, x0, x1, thr=60):
    """행마다 «바탕이 아닌 첫 화소» 의 x — 검정 외곽까지 포함한 바깥 모서리"""
    out = []
    for y in rows:
        if y < 0 or y >= a.shape[0]:
            continue
        row = a[y, max(0, x0):x1]
        d = np.abs(row - np.array(BG)).sum(1)
        i = np.where(d > thr)[0]
        if len(i):
            out.append(max(0, x0) + int(i[0]))
    return out


def one_ribbon(a, tag, cl, cr, ry0, ry1, gx0, gx1, ubox, k, scale):
    """리본 한 줄 — 4항. 좌표는 카드 외곽 좌상단 로컬 · scale 로 «우리 px 환산» 을 같이 낸다."""
    S = (lambda v: v * scale)
    # ── 리본 빨강 채움
    sub, ox, oy = win(a, cl - 25, ry0 - 8, cr, ry1 + 9)
    rb = bbox(near(sub, RED, TOL_RED), ox, oy)
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
    pl = bbox(near(sub, GOLD, TOL_GOLD), ox, oy)
    print(f'  {tag}: 띠 y {ry_t - 0:.0f}..{ry_b:.0f} 두께 **{th}** (환산 {S(th):.1f}) · '
          f'빨강좌단 {rx0 - cl:+.1f} · 좌단돌출(바깥선) **{prot:+.2f}** (환산 {S(prot):+.2f})')
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
    wi = bbox(sub.min(2) > 205, ox, oy)
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
    cap = 'docs/review/151-r13'
    geo = 'docs/review/151-r13.geo.json'
    if '--cap' in sys.argv:
        cap = sys.argv[sys.argv.index('--cap') + 1]
    if '--geo' in sys.argv:
        geo = sys.argv[sys.argv.index('--geo') + 1]

    print(f'== 레퍼런스 {REF} · 금색 문턱 {TOL_GOLD} · K={K}  (환산 = ref × K)')
    ra = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    R = {}
    for name, cl, cr, rbs in REF_CARDS:
        print(f'\n--- {name}  (카드 x{cl}..{cr})')
        for tag, ry0, ry1, gx0, gx1 in rbs:
            R[(name[:8], tag)] = one_ribbon(ra, tag, cl, cr, ry0, ry1, gx0, gx1, None, 1, K)

    print(f'\n== 우리 {cap}-c*.png  (환산 = ×1)')
    G = json.load(open(geo))
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
