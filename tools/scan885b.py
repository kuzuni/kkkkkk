#!/usr/bin/env python3
"""작업 885 3회차 — «2000% / 가치» 배지의 **세 번째 자**.

2회차 채점에서 DP·DQ 가 «배지 가로만 좁다» 에는 일치했는데 **자가 서로 달랐다**:

  · DP  **노랑 잉크 블록**(글자) — ref 154.7×88.7 ↔ 우리 143×88 ⇒ 폭 −7.6% · 높이 −0.8%
  · DQ  **분홍 실루엣**(별판)   — ref 169.1~171.2 ↔ 우리 160    ⇒ 폭 −5.4~6.5% · 높이 ≈0
  · ⚠ DP 자신이 «분홍 실루엣 폭» 을 **측정 한계로 기각**했다(임계 50/70/95/120 에서 부호가 뒤집혔다).
  · ⚠ 게이트 `verify833` [1-a] 는 ref 분홍 폭을 **160.90 / 158.84** 로 못박고 있다(`scan833.py` 값) —
    즉 **같은 «분홍 폭» 에 대해 게이트와 DQ 가 10px 다른 ref 를 들고 있다.**

⇒ 이 자는 «누가 옳은가» 를 **임계 스윕**으로 가른다(LESSONS A3-ⓑ — 임계를 흔들어 부호가
   안 바뀌는 지적만 믿는다). 두 축을 **같은 창·같은 문턱 사다리**로 나란히 잰다:

    ① 분홍 별판(plate)  — 배지의 실루엣
    ② 노랑 글자(glyph)  — «2000%» / «가치» 두 줄의 잉크 합 bbox

  ref 는 카드 폭 474.12 → 우리 978 이라 환산 K = 2.0628 을 곱해 **우리 px 로** 낸다(측정표 §9).
  ★ 창은 «카드 상변 위 ~40 ~ 배지 아래» 우상단 사분면으로 잡고, 카드마다 따로 낸다
    (ref 는 카드가 둘, 우리는 배지가 있는 카드가 둘 = 1:1 대응).

실행:
    python3 tools/scan885b.py                       ref + 기본 캡처
    python3 tools/scan885b.py --cap scratch/151-r37.png --geo scratch/geo37.json
"""
import json
import sys

import numpy as np
from PIL import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628

# ref 배지 창 (x, y0, y1) — 위 카드 / 아래 카드. 우상단 사분면만 문다.
REF_WIN = [(350, 0, 160), (350, 300, 420)]

# 문턱 사다리 — «얼마나 진한 분홍/노랑까지 잉크로 세는가».
# 분홍: R − max(G,B) 가 이 값 이상.        노랑: min(R,G) − B 가 이 값 이상.
PINK_STEPS = [40, 60, 80, 100, 120, 140]
YEL_STEPS = [30, 50, 70, 90, 110, 130]


def pink_mask(a, t):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (R - np.maximum(G, B) >= t) & (R > 120)


def yel_mask(a, t):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (np.minimum(R, G) - B >= t) & (R > 140) & (G > 110)


def bbox(m):
    ys, xs = np.nonzero(m)
    if len(ys) == 0:
        return None
    return (xs.min(), xs.max(), ys.min(), ys.max(), int(len(ys)))


def measure(img, win, steps, mask_fn, scale):
    """창 안에서 문턱마다 bbox 를 재고 (폭, 높이) 를 «우리 px» 로 돌려준다."""
    x0, y0, y1 = win
    sub = img[y0:y1, x0:]
    out = []
    for t in steps:
        b = bbox(mask_fn(sub, t))
        if b is None:
            out.append((t, None, None, 0))
            continue
        w = (b[1] - b[0] + 1) * scale
        h = (b[3] - b[2] + 1) * scale
        out.append((t, w, h, b[4]))
    return out


def main():
    cap = sys.argv[sys.argv.index('--cap') + 1] if '--cap' in sys.argv else 'scratch/151-r37.png'
    geo = sys.argv[sys.argv.index('--geo') + 1] if '--geo' in sys.argv else 'scratch/geo37.json'

    ref = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    ours = np.asarray(Image.open(cap).convert('RGB')).astype(int)
    g = json.load(open(geo))

    # 우리 창 — 배지 상자 ±20 (배지가 있는 카드만; 세 번째 카드는 배지가 없다)
    our_wins = []
    for c in g['cards']:
        b = c['bdg']
        if b is None:
            continue
        x0 = int(b['x']) - 20
        y0, y1 = int(b['y']) - 20, int(b['y'] + b['h']) + 20
        # 배지가 실제로 그려졌는지(분홍이 있는지) 확인 — 3번 카드는 판이 없다
        if pink_mask(ours[y0:y1, x0:], 60).sum() < 200:
            continue
        our_wins.append((c['id'], (x0, y0, y1)))

    for axis, steps, fn in (('① 분홍 별판', PINK_STEPS, pink_mask),
                            ('② 노랑 글자', YEL_STEPS, yel_mask)):
        print('\n=== %s — 문턱 스윕 (우리 px 환산) ===' % axis)
        print('%-6s | %-27s | %-27s | %s' % ('문턱', 'ref 폭×높이 (위/아래 카드)',
                                             '우리 폭×높이', 'Δ폭 % (우리÷ref−1)'))
        refs = [measure(ref, w, steps, fn, K) for w in REF_WIN]
        caps = [measure(ours, w, steps, fn, 1.0) for _, w in our_wins]
        for i, t in enumerate(steps):
            rw = [r[i][1] for r in refs]
            rh = [r[i][2] for r in refs]
            cw = [c[i][1] for c in caps]
            ch = [c[i][2] for c in caps]
            rwm = np.mean([v for v in rw if v]) if any(rw) else float('nan')
            cwm = np.mean([v for v in cw if v]) if any(cw) else float('nan')
            print('%-6d | %-27s | %-27s | %+.1f%%' % (
                t,
                ' / '.join('%.1f×%.1f' % (w, h) if w else '—' for w, h in zip(rw, rh)),
                ' / '.join('%.1f×%.1f' % (w, h) if w else '—' for w, h in zip(cw, ch)),
                (cwm / rwm - 1) * 100 if rwm == rwm else float('nan')))

    print('\n(창: ref %s · 우리 %s)' % (REF_WIN, [w for _, w in our_wins]))


if __name__ == '__main__':
    main()
