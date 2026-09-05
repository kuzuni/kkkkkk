# 작업 409 14회차 — **알약 «바깥 윤곽» 을 전제 없이 재는 자 (반경 축).**
#
#   13회차 채점에서 DR 이 새 축을 열었다: 검정 링 **바깥** 경계에 최소제곱 원을 피팅하면
#   ref R 33~34 ↔ cap 31.4 — «ref 알약이 더 둥글다». 그 값은 **352 §10 «알약 반경 30»** 을
#   건드리므로 ROUTINE 338 규칙대로 **ref 를 내 자로 다시 재기 전에는 움직이지 않는다.**
#
#   ⚠ **왜 새 자가 필요한가 — 기존 자로는 반경을 잴 수 없다.**
#      `probe409e --rays` 와 `verify409` 의 `ray()` 는 **R=30 을 전제로** «윤곽(d=0)» 을
#      코너 중심에서 30px 인 점으로 잡는다. 반경이 30 이 아니면 그 자는 ref 를
#      몇 px **안쪽에서부터** 읽기 시작한다 — 반경을 재는 데 그 자를 쓰면 순환논법이다.
#
#   세 모드 — 전부 «그림에서 경계를 찾는다»:
#     --edge   행마다 바깥 → 안으로 훑어 **경계 x** 를 찍는다(ref ↔ cap 나란히). 전제 0개.
#     --apex   코너 이등분선 위의 **꼭짓점 거리** d 로 반경을 역산한다: 원이면 d = r(√2 − 1).
#     --diag   이등분선을 따라 **바깥에서 안으로** 클래스 런을 찍는다(코너 층 두께 · 편향 없음).
#
# 사용:  python3 tools/probe409g.py --edge|--apex|--diag [--corner BL]
import sys
import math
from pydep937 import Image

REF7, CAP7 = 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png'
# 알약 상자 — probe409e/f 와 같은 값(352 §3·§10 · 7회차 §16-1 정정).
# ⚠⚠ **409 17회차 — 아래 `BOX['ref']` 의 x=292 는 1.32px 틀렸다(고치지 않고 남겨 둔다).**
#    ref 알약의 검정 링은 실제로 x 290.73..297.98 이라 **좌변은 290.7** 이다(측정표 07 정오표).
#    값을 그대로 두는 것은 이 파일들이 남긴 **옛 읽기를 재현할 수 있게** 하기 위해서다 —
#    새로 재는 자리에는 `tools/probe409i.py` 를 써라. 그것은 알약 네 변을 **그림에서** 직선
#    스캔해 상자를 잡고, cap 에서 DOM 실측과 0.14px 로 검산된다.
BOX = {'ref': (292, 2027), 'cap': (291, 1967)}
H = 84
W = 261

# 바깥(서브탭 바 바닥)은 밝다(실측 80·94) · 알약 테두리는 검정(0). 중간값을 문턱으로.
EDGE_T = 45

PAL = [
    ('K', (0, 0, 0)),
    ('B', (99, 79, 55)),
    ('F', (75, 62, 45)),
    ('D', (65, 49, 34)),
    ('R', (112, 95, 75)),
    ('S', (43, 35, 26)),
]


def lum(px, x, y):
    c = px[x, y]
    return (c[0] + c[1] + c[2]) / 3.0


def cls(c):
    best, bd = '?', 1 << 30
    for ch, rc in PAL:
        d = sum((int(a) - int(b)) ** 2 for a, b in zip(c, rc))
        if d < bd:
            best, bd = ch, d
    return best


def row_edge(px, bx, by, ly, right, span=34):
    """행 ly 에서 바깥 → 안으로 훑어 «어두워지는» 첫 자리(국소 x, 서브픽셀 선형 보간)."""
    rng = range(W - 1, W - span - 1, -1) if right else range(0, span)
    prev = None
    for lx in rng:
        v = lum(px, bx + lx, by + ly)
        if v <= EDGE_T:
            if prev is None:
                return float(lx)
            pv, plx = prev
            if pv == v:
                return float(lx)
            t = (pv - EDGE_T) / (pv - v)          # pv > T ≥ v
            return plx + t * (lx - plx)
        prev = (v, float(lx))
    return None


def apex(px, bx, by, corner, span=40):
    """코너 이등분선 위의 꼭짓점 거리 d(px) — 상자 코너에서 «처음 어두워지는» 점까지."""
    bottom, right = corner[0] == 'B', corner[1] == 'R'
    ox = (W - 1) if right else 0
    oy = (H - 1) if bottom else 0
    sx = -1 if right else 1
    sy = -1 if bottom else 1
    prev = None
    t = 0.0
    while t <= span:
        x = int(round(ox + sx * t))
        y = int(round(oy + sy * t))
        v = lum(px, bx + x, by + y)
        if v <= EDGE_T:
            if prev is None:
                return t * math.sqrt(2.0)
            pv, pt = prev
            f = (pv - EDGE_T) / (pv - v) if pv != v else 0.0
            return (pt + f * (t - pt)) * math.sqrt(2.0)
        prev = (v, t)
        t += 0.5
    return None


def diag(px, bx, by, corner, inn=22.0, span=40):
    """이등분선을 따라 **꼭짓점부터 안쪽으로** 클래스 런 — 코너 층 두께(전제 없음)."""
    bottom, right = corner[0] == 'B', corner[1] == 'R'
    ox = (W - 1) if right else 0
    oy = (H - 1) if bottom else 0
    sx = -1 if right else 1
    sy = -1 if bottom else 1
    d = apex(px, bx, by, corner, span)
    if d is None:
        return '(경계 없음)'
    t0 = d / math.sqrt(2.0)
    out, s = '', 0.0
    while s <= inn + 1e-9:
        t = t0 + s / math.sqrt(2.0)
        out += cls(px[bx + int(round(ox + sx * t)), by + int(round(oy + sy * t))])
        s += 0.5
    o = []
    for ch in out:
        if o and o[-1][0] == ch:
            o[-1][1] += 1
        else:
            o.append([ch, 1])
    return ' '.join('%s%.1f' % (c, n * 0.5) for c, n in o)


def imgs():
    return {'ref': Image.open(REF7).convert('RGB'), 'cap': Image.open(CAP7).convert('RGB')}


def main():
    a = sys.argv[1:]
    corners = [a[a.index('--corner') + 1]] if '--corner' in a else ['BL', 'BR', 'TL', 'TR']
    ims = imgs()

    if '--edge' in a:
        print('══ 409-g/edge — 행마다 «바깥 → 안» 첫 어두운 자리(국소 x) · 전제 0개 ══')
        for corner in corners:
            bottom, right = corner[0] == 'B', corner[1] == 'R'
            ys = list(range(H - 30, H)) if bottom else list(range(0, 30))
            print('\n  %s   (y = 상자 국소)' % corner)
            print('    %-5s %8s %8s %8s' % ('y', 'ref', 'cap', 'Δ(cap−ref)'))
            for ly in ys:
                r = row_edge(ims['ref'].load(), BOX['ref'][0], BOX['ref'][1], ly, right)
                c = row_edge(ims['cap'].load(), BOX['cap'][0], BOX['cap'][1], ly, right)
                if r is None or c is None:
                    continue
                print('    %-5d %8.1f %8.1f %8.1f' % (ly, r, c, c - r))
        return

    if '--apex' in a:
        print('══ 409-g/apex — 코너 이등분선 꼭짓점 거리 d → 반경 역산 (원이면 d = r(√2−1)) ══')
        print('  %-6s %10s %10s %10s' % ('코너', 'ref d/r', 'cap d/r', 'Δr'))
        for corner in corners:
            rr = cc = None
            for who in ('ref', 'cap'):
                d = apex(ims[who].load(), BOX[who][0], BOX[who][1], corner)
                if d is None:
                    continue
                r = d / (math.sqrt(2.0) - 1.0)
                if who == 'ref':
                    rr = (d, r)
                else:
                    cc = (d, r)
            if rr and cc:
                print('  %-6s %4.1f/%5.1f %4.1f/%5.1f %10.1f'
                      % (corner, rr[0], rr[1], cc[0], cc[1], cc[1] - rr[1]))
        print('\n  ⚑ 우리 CSS `30px / 33px` 의 45° 유효반경 = %.1f'
              % math.sqrt(2.0 / (1.0 / 900.0 + 1.0 / 1089.0)))
        return

    print('══ 409-g/diag — 이등분선 클래스 런 (꼭짓점 → 안쪽 22px) · 시작점을 그림에서 찾는다 ══')
    for corner in corners:
        print('\n  %s' % corner)
        for who in ('ref', 'cap'):
            print('    %s  %s' % (who, diag(ims[who].load(), BOX[who][0], BOX[who][1], corner)))


main()
