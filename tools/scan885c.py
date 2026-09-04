#!/usr/bin/env python3
"""작업 885 4회차 — 배지 «2000% / 가치» **두 줄 사이 거리**를 «회전과 무관하게» 재는 자.

3회차가 남긴 물음이 이것이다(review §3회차 ⓗ):

  · 기울기를 ref 값(+14~15°)으로 키우면 **맞아 있던 AABB 높이가 +10% 로 깨진다.**
  · 회전 전 상자를 되살려 보면 «ref 가 10° 라면 높이 +2.9% · 14° 라면 **+19%**» ⇒
    **«ref 가 더 기울었다» 와 «우리 두 줄이 너무 벌어졌다» 는 한 쌍**이고, 둘을 따로 옮기면
    하나를 맞출 때마다 다른 하나가 그만큼 어긋난다.
  ⇒ 그래서 **각도를 가정하지 않고** 두 줄 사이 거리를 먼저 재야 한다. 그 값이 서면 각도가 따라 정해진다.

**자의 원리 — 각도와 간격을 «같이» 추정한다.**
  두 줄은 평행하므로, 잉크를 각도 θ 의 **수직 방향**으로 투영하면 θ 가 맞을 때 두 줄이
  가장 깨끗한 두 덩이로 갈린다. ⇒ θ 를 훑으며 «2-분할 within-class 분산»(Otsu 와 같은 축)이
  최소가 되는 θ 를 고르고, 그 θ 에서 두 덩이의 거리를 낸다.
  · θ 는 **추정 결과**이지 입력이 아니다 — CSS 값도 채점자 값도 안 쓴다.
  · 거리는 둘을 같이 낸다: **무게중심 거리**(cen) 와 **아랫변 거리**(base = 각 줄의 «바닥 끝»
    사이 거리 ≈ 베이스라인 간격). 글자 수·글리프 높이가 형마다 달라도 base 는 덜 흔들린다.

⚠ ref 아랫줄과 우리 아랫줄은 **문구가 다르다**(브리핑 §3-4 «문구 수 축»). 그래서 이 자는
   «아랫줄이 얼마나 넓은가» 가 아니라 **«두 줄이 얼마나 떨어져 있는가»** 만 낸다.

실행:
    python3 tools/scan885c.py --cap scratch/151-r42.png --geo scratch/geo42.json
"""
import json
import sys

import numpy as np
from PIL import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628

# ref 배지 창 (x0, y0, y1) — 위 카드(배너형) / 아래 카드(불릿형). 우상단 사분면만 문다.
REF_WIN = [(350, 0, 160), (350, 300, 420)]

YEL_STEPS = [30, 50, 70, 90, 110, 130]


def yel_mask(a, t):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (np.minimum(R, G) - B >= t) & (R > 140) & (G > 110)


def two_line(pts, deg_lo=-30.0, deg_hi=30.0, step=0.25):
    """점구름을 «평행한 두 줄» 로 보고 (각도, 무게중심 거리, 아랫변 거리, 분리도) 를 낸다.

    각도 θ 를 훑으며 수직축 투영값 u 를 2-분할(Otsu)하고 within-class 분산이 최소인 θ 를 고른다.
    반환 각도의 부호는 **CSS rotate 와 같은 뜻**(양수 = 왼→오른쪽으로 내려간다)이다.
    """
    if len(pts) < 40:
        return None
    y = pts[:, 0].astype(float)
    x = pts[:, 1].astype(float)
    best = None
    d = deg_lo
    while d <= deg_hi + 1e-9:
        th = np.radians(d)
        # 줄 방향 (cosθ, sinθ) 의 수직 방향으로 투영 (화면 좌표: y 아래로 증가)
        u = -x * np.sin(th) + y * np.cos(th)
        lo, hi = u.min(), u.max()
        if hi - lo < 4:
            d += step
            continue
        # Otsu — 128 칸
        hist, edges = np.histogram(u, bins=128, range=(lo, hi))
        tot = hist.sum()
        cw = np.cumsum(hist)
        mids = (edges[:-1] + edges[1:]) / 2
        cm = np.cumsum(hist * mids)
        gm = cm[-1] / tot
        wb = cw / tot
        wf = 1 - wb
        ok = (wb > 0.05) & (wf > 0.05)
        if not ok.any():
            d += step
            continue
        mb = np.divide(cm, cw, out=np.zeros_like(cm), where=cw > 0)
        mf = np.divide(cm[-1] - cm, tot - cw, out=np.zeros_like(cm), where=(tot - cw) > 0)
        between = wb * wf * (mb - mf) ** 2
        between = np.where(ok, between, -1)
        i = int(np.argmax(between))
        # ⚠ between 자체를 목적함수로 쓰면 «퍼짐이 큰 각» 이 이긴다(투영 분산이 θ 에 따라 변한다).
        #   실제로 1판이 −30°(스윕 끝)에서 굳었다. ⇒ **총분산으로 정규화**한 Otsu η 를 쓴다.
        var = float(np.var(u))
        sep = float(between[i] / var) if var > 1e-9 else -1.0
        if best is None or sep > best[0]:
            best = (sep, d, mids[i], u.copy())
        d += step
    if best is None:
        return None
    sep, deg, cut, u = best
    a, b = u[u <= cut], u[u > cut]
    if len(a) < 10 or len(b) < 10:
        return None
    cen = b.mean() - a.mean()
    # «아랫변» = 각 줄에서 아래쪽 끝(투영 최댓값). 꼬리 잡음을 피해 99.5 분위로 읽는다.
    base = np.percentile(b, 99.5) - np.percentile(a, 99.5)
    # ⚑ 4회차 — «두 줄이 **어느 방향으로** 쌓여 있는가». 한 덩이로 회전한 블록이면 아랫줄 중심은
    #   윗줄 중심에서 «베이스라인의 수직» 으로 내려가고(=stack 각 ≈ 기울기), 줄마다 따로 회전하면
    #   순수하게 **수직**으로 내려간다(=stack 각 ≈ 0). 이 둘은 화면에서 아랫줄의 «좌우» 로 갈린다.
    m = u <= cut
    dx = float(x[~m].mean() - x[m].mean())
    dy = float(y[~m].mean() - y[m].mean())
    stack = np.degrees(np.arctan2(-dx, dy)) if dy != 0 else float('nan')
    return deg, cen, base, float(sep), stack, dx


def run(img, win, scale, tag, steps=YEL_STEPS):
    x0, y0, y1 = win
    sub = img[y0:y1, x0:]
    rows = []
    for t in steps:
        m = yel_mask(sub, t)
        pts = np.argwhere(m)
        r = two_line(pts)
        if r is None:
            rows.append((t, None, None, None, None, None))
            continue
        deg, cen, base, sep, stack, dxc = r
        rows.append((t, deg, cen * scale, base * scale, stack, dxc * scale))
    print('  %-24s | %s' % (tag, ' | '.join(
        ('t%-3d 각 %+5.1f° cen %5.1f base %5.1f 쌓임 %+5.1f° (dx %+5.1f)' % (t, d, c, b, st, dx))
        if d is not None else ('t%-3d —' % t) for t, d, c, b, st, dx in rows)))
    good = [(d, c, b, st, dx) for t, d, c, b, st, dx in rows if d is not None]
    if good:
        print('  %-24s | 중앙값  각 %+.1f° · cen %.1f · base %.1f · 쌓임 %+.1f° · dx %+.1f  (5단 부호 %s)'
              % ('', np.median([g[0] for g in good]), np.median([g[1] for g in good]),
                 np.median([g[2] for g in good]), np.median([g[3] for g in good]),
                 np.median([g[4] for g in good]),
                 '유지' if len({np.sign(g[0]) for g in good}) == 1 else '⚠ 뒤집힘'))
    return good


def main():
    cap = sys.argv[sys.argv.index('--cap') + 1] if '--cap' in sys.argv else 'scratch/151-r42.png'
    geo = sys.argv[sys.argv.index('--geo') + 1] if '--geo' in sys.argv else 'scratch/geo42.json'

    ref = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    ours = np.asarray(Image.open(cap).convert('RGB')).astype(int)
    g = json.load(open(geo))

    print('=== 배지 두 줄 — 각도·간격 동시 추정 (우리 px 환산 · ref×K=%.4f) ===' % K)
    print('  (cen = 두 줄 무게중심 거리 · base = 두 줄 «아랫변» 거리 ≈ 베이스라인 간격)')
    rr = []
    for i, w in enumerate(REF_WIN):
        rr += run(ref, w, K, 'ref %s' % ('위 카드(배너형)' if i == 0 else '아래 카드(불릿형)'))

    oo = []
    for c in g['cards']:
        b = c.get('bdg')
        if b is None:
            continue
        x0 = int(b['x']) - 20
        y0, y1 = int(b['y']) - 20, int(b['y'] + b['h']) + 20
        sub = ours[y0:y1, x0:]
        if yel_mask(sub, 90).sum() < 200:
            continue
        oo += run(ours, (x0, y0, y1), 1.0, '우리 %s' % c['id'])

    if rr and oo:
        rc = np.median([v[1] for v in rr]); oc = np.median([v[1] for v in oo])
        rb = np.median([v[2] for v in rr]); ob = np.median([v[2] for v in oo])
        ra = np.median([v[0] for v in rr]); oa = np.median([v[0] for v in oo])
        print('\n  ⇒ 각도  ref %+.1f°  ↔ 우리 %+.1f°   (Δ %+.1f°)' % (ra, oa, oa - ra))
        print('  ⇒ cen   ref %.1f   ↔ 우리 %.1f    (Δ %+.1f%%)' % (rc, oc, (oc / rc - 1) * 100))
        print('  ⇒ base  ref %.1f   ↔ 우리 %.1f    (Δ %+.1f%%)' % (rb, ob, (ob / rb - 1) * 100))
        rs = np.median([v[3] for v in rr]); os_ = np.median([v[3] for v in oo])
        rdx = np.median([v[4] for v in rr]); odx = np.median([v[4] for v in oo])
        print('  ⇒ 쌓임  ref %+.1f°(dx %+.1f) ↔ 우리 %+.1f°(dx %+.1f)' % (rs, rdx, os_, odx))
        print('     (쌓임 각 ≈ 기울기 = 한 덩이로 회전한 블록 · 쌓임 각 ≈ 0 = 줄마다 따로 회전)')


if __name__ == '__main__':
    main()
