#!/usr/bin/env python3
"""작업 885 5회차 — 배지 «2000% / 가치» **글자 덩어리가 분홍 별판 안 어디에 앉는가** 를 재는 자.

4회차가 1인 지적 둘을 다음 회차로 넘겼는데(review §4회차 ⓘ) **둘은 같은 것의 두 축**이었다:

  · ET ② «두 줄 덩어리가 별판 안에서 7.4 우리px **위**» — 판 중심 − 글자 중심의 **세로** 성분.
  · EU ⑧ «배지 노랑 글자가 카드 기준 좌 −5.5 · 우 −7.1px» — 같은 어긋남의 **가로** 성분.

⇒ 이 자는 그 둘을 **한 값**으로 낸다: 분홍 별판 기준으로 본 노랑 글자의 (dx, dy).
   카드 좌표를 안 쓰므로 «카드 상변이 어디냐»(§15-3 가 한 번 틀렸던 축) 에 의존하지 않는다.

⚠ 닫힌 자리 [30] — 분홍 별판의 **폭**은 문턱 사다리에서 부호가 뒤집히는 측정 한계다.
   그래서 이 자는 폭을 안 쓰고 **중심**만 쓴다. 중심이 문턱에 흔들리는지는 사다리로 같이 찍는다
   (흔들리면 이 축도 측정 한계로 적어야 한다 — 브리핑 §2-2).

두 가지 중심을 같이 낸다:
  · bbox 중심 — 끝점 두 개만 쓰므로 톱니(별 꼭짓점) 하나에 흔들린다.
  · 질량 중심(centroid) — 면 전체를 쓰므로 안정적이지만 «글자 수» 에 끌린다.
  ⇒ 판은 bbox·질량 둘 다, 글자는 질량으로 읽고 **둘의 차**를 본다. 두 읽기가 갈리면 그대로 적는다.

실행:
    python3 tools/scan885d.py --cap docs/review/151-r49.png --geo <geo.json>
"""
import json
import sys

from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628                        # 우리 px = ref px × K (측정표 §9)

# ref 배지 창 (x0, y0, y1) — 위 카드(배너형) / 아래 카드(불릿형).
# ⚠⚠ **scan885b·scan885c 가 쓰던 창 (350,0,160) 은 오염돼 있다** — 그 창은 배지(ref y15..102) 말고
#    **아래 43행에 있는 붉은 부품까지**(y125..180) 같이 문다. 그래서 그 창으로 분홍을 재면
#    208.3×299.1 이 나오고 문턱을 올리면 144.4 까지 미끄러진다 — 885 3회차가 그것을 보고
#    «분홍 별판 = 측정 한계»([30]) 로 닫았다. 창을 배지에만 맞추면(아래 값) ref 두 카드가
#    **문턱 t30~t90 에서 나란히 181.5×181.5** 로 서고 부호도 안 뒤집힌다(5회차 §ⓑ).
REF_WIN = [(350, 0, 110), (350, 300, 405)]

PINK_STEPS = [40, 60, 80, 100, 120]
YEL_STEPS = [30, 50, 70, 90, 110]


def pink_mask(a, t):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (R - np.maximum(G, B) >= t) & (R > 120)


def yel_mask(a, t):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (np.minimum(R, G) - B >= t) & (R > 140) & (G > 110)


def centers(m):
    """(bbox 중심 x,y · 질량 중심 x,y · 화소 수) — 창-로컬 좌표(창 px)."""
    ys, xs = np.nonzero(m)
    if len(ys) == 0:
        return None
    return (float(xs.min() + xs.max()) / 2, float(ys.min() + ys.max()) / 2,
            float(xs.mean()), float(ys.mean()), int(len(ys)))


def offsets(img, win, scale, pink_steps=PINK_STEPS, yel_steps=YEL_STEPS):
    """문턱 사다리마다 (판 중심 − 글자 중심) 을 «우리 px» 로 낸다.

    판은 노랑 글자를 **포함**하는 면이므로, 판 마스크에서 글자를 빼지 않는다 —
    빼면 «판 − 글자» 가 도넛이 되어 중심이 글자 자리에 끌려간다(같은 값을 두 번 쓰는 셈).
    """
    x0, y0, y1 = win
    sub = img[y0:y1, x0:]
    rows = []
    for tp, ty in zip(pink_steps, yel_steps):
        p = centers(pink_mask(sub, tp))
        y = centers(yel_mask(sub, ty))
        if p is None or y is None:
            rows.append((tp, ty, None))
            continue
        rows.append((tp, ty, {
            'bbox': ((p[0] - y[2]) * scale, (p[1] - y[3]) * scale),
            'mass': ((p[2] - y[2]) * scale, (p[3] - y[3]) * scale),
            'npx': (p[4], y[4]),
        }))
    return rows


def fmt(rows, tag):
    ok = [r[2] for r in rows if r[2]]
    if not ok:
        print('  %-26s — 잉크 없음' % tag)
        return None
    bx = [v['bbox'][0] for v in ok]
    by = [v['bbox'][1] for v in ok]
    mx = [v['mass'][0] for v in ok]
    my = [v['mass'][1] for v in ok]
    cells = []
    for (tp, ty, v) in rows:
        if v is None:
            cells.append('t%-3d —' % tp)
            continue
        cells.append('t%-3d bbox(%+5.1f,%+6.1f) mass(%+5.1f,%+6.1f)'
                     % (tp, v['bbox'][0], v['bbox'][1], v['mass'][0], v['mass'][1]))
    print('  %-26s | %s' % (tag, ' | '.join(cells)))
    med = (float(np.median(bx)), float(np.median(by)), float(np.median(mx)), float(np.median(my)))
    sign = ('부호 유지' if (min(by) > 0) == (max(by) > 0) and (min(bx) > 0) == (max(bx) > 0)
            else '⚠ 부호 뒤집힘(측정 한계)')
    print('  %-26s | 중앙값 bbox(%+.1f, %+.1f) · mass(%+.1f, %+.1f) · 폭 %.1f/%.1f · %s'
          % ('', med[0], med[1], med[2], med[3],
             max(bx) - min(bx), max(by) - min(by), sign))
    return med


def main():
    cap = sys.argv[sys.argv.index('--cap') + 1] if '--cap' in sys.argv else 'docs/review/151-r49.png'
    geo = sys.argv[sys.argv.index('--geo') + 1] if '--geo' in sys.argv else 'scratch/geo49.json'

    ref = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    ours = np.asarray(Image.open(cap).convert('RGB')).astype(int)
    g = json.load(open(geo))

    our_wins = []
    for c in g['cards']:
        b = c['bdg']
        if b is None:
            continue
        x0 = int(b['x']) - 20
        y0, y1 = int(b['y']) - 20, int(b['y'] + b['h']) + 20
        if pink_mask(ours[y0:y1, x0:], 60).sum() < 200:
            continue
        our_wins.append((c['id'], (x0, y0, y1)))

    print('=== 배지 «판 중심 − 글자 중심» (우리 px 환산 · + = 글자가 판보다 왼쪽/위) ===')
    r1 = fmt(offsets(ref, REF_WIN[0], K), 'ref 위 카드(배너형)')
    r2 = fmt(offsets(ref, REF_WIN[1], K), 'ref 아래 카드(불릿형)')
    outs = [fmt(offsets(ours, w, 1.0), '우리 %s' % cid) for cid, w in our_wins]

    outs = [o for o in outs if o]
    if r1 and r2 and outs:
        rx = np.mean([r1[0], r2[0]])
        ry = np.mean([r1[1], r2[1]])
        rmx = np.mean([r1[2], r2[2]])
        rmy = np.mean([r1[3], r2[3]])
        cx = np.mean([o[0] for o in outs])
        cy = np.mean([o[1] for o in outs])
        cmx = np.mean([o[2] for o in outs])
        cmy = np.mean([o[3] for o in outs])
        print('\n  ⇒ bbox 기준  ref (%+.1f, %+.1f) ↔ 우리 (%+.1f, %+.1f)  ⇒ Δ(%+.1f, %+.1f)'
              % (rx, ry, cx, cy, cx - rx, cy - ry))
        print('  ⇒ mass 기준  ref (%+.1f, %+.1f) ↔ 우리 (%+.1f, %+.1f)  ⇒ Δ(%+.1f, %+.1f)'
              % (rmx, rmy, cmx, cmy, cmx - rmx, cmy - rmy))
        print('     (Δ가 + 면 우리 글자가 ref 보다 판 안에서 **더 왼쪽/더 위** 에 있다)')


if __name__ == '__main__':
    main()
