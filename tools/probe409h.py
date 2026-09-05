# 작업 409 16회차 — **두 자를 가르는 심판** (§24-5 2번).
#
#   15회차가 «어느 자가 옳은지 못 가른다» 로 남긴 자리를 «정답을 아는 그림» 으로 가른다.
#   `node tools/syn409b.js` 가 만든 대조군은 폭이 **내가 정한 등폭 동심 3겹**(K7 D4 B7)이다.
#   같은 상자에 두 자를 그대로 올려 **누가 7/4/7 을 되돌려주는가** 를 본다.
#
#     · diag  — `probe409g.diag` 와 같은 규칙: 그림에서 꼭짓점을 찾아 **이등분선**을 훑는다.
#     · rays  — `probe409e.ray` 와 같은 규칙(= `verify409`·`verify462` 가 쓰는 자):
#               코너 원 중심(반경 30 전제)에서 각도로 쏜다.
#
#   ⚠ 두 자는 «같은 45° 선» 이 아니다 — rays 의 기준 꼭짓점은 (0, H) 이고
#      diag 의 기준 꼭짓점은 (0, H−1) 이라 **반대각선으로 1px 어긋난 평행선**이다.
#      그 1px 이 얇은 층(1~2px)의 순서를 뒤집을 수 있으므로 [C] 로 따로 잰다.
#
# 사용:  node tools/syn409b.js && python3 tools/probe409h.py
import math
import sys
from pydep937 import Image

SYN = 'docs/review/409-syn3.png'
# 대조군 상자 — syn409b.js 와 같은 값.
BOX = (290.75, 1967)
W, H = 261, 84
# syn409b.js 가 그린 «정답»
TRUTH = {'K': 7.0, 'D': 4.0, 'B': 7.0}

PAL = [
    ('K', (0, 0, 0)),
    ('B', (99, 79, 55)),
    ('F', (75, 62, 45)),
    ('D', (65, 49, 34)),
    ('R', (112, 95, 75)),
    ('S', (43, 35, 26)),
]


def cls(c):
    best, bd = '?', 1 << 30
    for ch, rc in PAL:
        d = sum((int(a) - int(b)) ** 2 for a, b in zip(c, rc))
        if d < bd:
            best, bd = ch, d
    return best


def fmt(s, step=0.5):
    o = []
    for ch in s:
        if o and o[-1][0] == ch:
            o[-1][1] += 1
        else:
            o.append([ch, 1])
    return ' '.join('%s%.1f' % (c, n * step) for c, n in o)


def widths(s, step=0.5):
    """클래스 런을 {글자: 폭} 으로 — 같은 글자가 여러 번 나오면 **가장 두꺼운 런**을 쓴다."""
    o, cur, n = {}, None, 0
    for ch in s + '\0':
        if ch == cur:
            n += 1
            continue
        if cur is not None:
            o[cur] = max(o.get(cur, 0.0), n * step)
        cur, n = ch, 1
    return o


def ray(px, bx, by, corner, deg, R=30.0, inn=22.0, step=0.5):
    """probe409e.ray / verify409 의 `ray` 와 같은 규칙 (반경 30 전제)."""
    a = math.radians(deg)
    bottom, right = corner[0] == 'B', corner[1] == 'R'
    cx = bx + (W - R if right else R)
    cy = by + (H - R if bottom else R)
    ux = (1 if right else -1) * math.cos(a)
    uy = (1 if bottom else -1) * math.sin(a)
    out, d = '', 0.0
    while d <= inn + 1e-9:
        out += cls(px[int(round(cx + ux * (R - d))), int(round(cy + uy * (R - d)))])
        d += step
    return out


EDGE_T = 45          # probe409g 와 같은 휘도 문턱


def lum(px, x, y):
    c = px[x, y]
    return (c[0] + c[1] + c[2]) / 3.0


def apex(px, bx, by, corner, span=40, oy_off=1):
    """probe409g.apex 와 **같은 규칙** — 상자 코너에서 «처음 어두워지는» 점까지의 거리."""
    bottom, right = corner[0] == 'B', corner[1] == 'R'
    ox = (W - 1) if right else 0
    oy = (H - oy_off) if bottom else 0
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


def diag(px, bx, by, corner, inn=22.0, oy_off=1):
    """probe409g.diag 와 같은 규칙 — 그림에서 찾은 꼭짓점부터 이등분선을 훑는다."""
    bottom, right = corner[0] == 'B', corner[1] == 'R'
    ox = (W - 1) if right else 0
    oy = (H - oy_off) if bottom else 0
    sx = -1 if right else 1
    sy = -1 if bottom else 1
    d = apex(px, bx, by, corner, oy_off=oy_off)
    if d is None:
        return '(경계 없음)'
    t0 = d / math.sqrt(2.0)
    out, s = '', 0.0
    while s <= inn + 1e-9:
        t = t0 + s / math.sqrt(2.0)
        out += cls(px[bx_i(bx + ox + sx * t), bx_i(by + oy + sy * t)])
        s += 0.5
    return out


def bx_i(v):
    return int(round(v))


def score(name, s):
    w = widths(s)
    got = {k: w.get(k, 0.0) for k in ('K', 'D', 'B')}
    err = {k: got[k] - TRUTH[k] for k in got}
    l1 = sum(abs(v) for v in err.values())
    print('    %-14s %-42s  K%+.1f D%+.1f B%+.1f   L1 %.1f'
          % (name, fmt(s), err['K'], err['D'], err['B'], l1))
    return l1


REF7, CAP7 = 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png'
# 알약 상자 — probe409e/f/g 와 같은 값(352 §3·§10 · 7회차 §16-1 정정).
# ⚠⚠ **409 17회차 — 아래 x=292 는 1.32px 틀렸다(고치지 않고 남겨 둔다).**
#    ref 알약의 검정 링은 실제로 x 290.73..297.98 이라 **좌변은 290.7** 이다(측정표 07 정오표).
#    ⇒ 이 파일 §25-2 의 «BL·BR 는 구간이 겹쳐 못 잰다» 는 결론은 **그 오차의 그림자**였다.
#    새로 재는 자리에는 `tools/probe409i.py` 를 써라(알약 네 변을 그림에서 직선 스캔 ·
#    cap 에서 DOM 실측과 0.14px 로 검산). 값을 남기는 것은 옛 읽기를 재현할 수 있게 하기 위해서다.
BOX_RC = {'ref': (292, 2027), 'cap': (291, 1967)}


def cmp_reg():
    """[R] **등록 오차를 인정하는** ref ↔ cap 대조.

    상자 좌표는 ±1px 안에서만 알 수 있다(ref 는 JPEG 에서 눈으로 잡은 값 · cap 은 290.75 를 반올림).
    그런데 이등분선 읽기는 그 1px 에 **±2px 로 흔들린다** — 그래서 «점 하나» 로 비교하면
    없는 차이를 만들어 낸다. 여기서는 5자리 등록 창(0,0)·(±1,0)·(0,±1)을 전부 읽어
    **구간**으로 보고한다. 두 구간이 겹치면 «차이가 잰 것보다 작다» 는 뜻이다.
    """
    ims = {'ref': Image.open(REF7).convert('RGB'), 'cap': Image.open(CAP7).convert('RGB')}
    print('══ 409-h/cmp — 등록 오차 ±1px 를 인정한 ref ↔ cap 대조 ══')
    print('   D+B = 어두운 띠 + 베벨 (코너 이등분선) · 구간이 겹치면 차이는 «잴 수 없다»\n')
    for corner in ('BL', 'BR', 'TL', 'TR'):
        print('  %s' % corner)
        span, dropped = {}, {}
        for who in ('ref', 'cap'):
            px = ims[who].load()
            bx, by = BOX_RC[who]
            vals, drop = [], 0
            for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
                w = widths(diag(px, bx + dx, by + dy, corner))
                # 표본 하나를 버리는 두 가지 — 둘 다 «알약 링을 안 보고 있다» 는 뜻이다.
                #   ⓐ 검정 링을 못 잡았다(상자가 미끄러졌다)
                #   ⓑ 이등분선이 **서브탭 바 셸림(R)** 을 길게 지난다 — 위 코너는 알약 상변이
                #      바 림에 붙어 있어 그 자리의 D·B 는 알약이 아니라 바 껍데기다.
                if w.get('K', 0.0) < 4.0 or w.get('R', 0.0) >= 3.0:
                    drop += 1
                    continue
                vals.append(w.get('D', 0.0) + w.get('B', 0.0))
            dropped[who] = drop
            if not vals:
                span[who] = None
                print('    %-4s D+B  — (쓸 수 있는 표본 0 / 5 · 버림 %d)' % (who, drop))
                continue
            span[who] = (min(vals), max(vals), sum(vals) / len(vals))
            print('    %-4s D+B  %.1f .. %.1f   (평균 %.2f · 표본 %d/5 · 버림 %d)'
                  % (who, span[who][0], span[who][1], span[who][2], len(vals), drop))
        r, c = span['ref'], span['cap']
        if r is None or c is None:
            print('    ⇒ ⛔ **이 자로는 못 잰다** — 쓸 수 있는 표본이 없다'
                  '(이등분선이 셸림을 지나거나 상자가 미끄러진다).\n')
            continue
        overlap = not (c[1] < r[0] or r[1] < c[0])
        print('    ⇒ %s (평균 Δ cap−ref %+.2f)\n'
              % ('구간 겹침 — 차이를 «잴 수 없다»' if overlap else '⚠ 구간이 안 겹친다 — 실재하는 차이',
                 c[2] - r[2]))


def img_read(pathname):
    """[I] 임의의 캡처 한 장을 cap 상자로 읽는다 — `try409.js` 후보값을 재는 입구."""
    px = Image.open(pathname).convert('RGB').load()
    bx, by = BOX_RC['cap']
    print('══ 409-h/img — %s (cap 상자 %d,%d) ══' % (pathname, bx, by))
    for corner in ('BL', 'BR', 'TL', 'TR'):
        print('  %-3s diag      %s' % (corner, fmt(diag(px, bx, by, corner))))
        for dg in (45, 60, 75):
            print('      rays %2d°  %s' % (dg, fmt(ray(px, bx, by, corner, dg))))


def main():
    a = sys.argv[1:]
    if '--img' in a:
        img_read(a[a.index('--img') + 1])
        return 0
    if '--cmp' in a:
        cmp_reg()
        return 0
    try:
        im = Image.open(SYN).convert('RGB')
    except FileNotFoundError:
        print('대조군이 없다 — 먼저 `node tools/syn409b.js` 를 돌려라.', file=sys.stderr)
        return 2
    px = im.load()
    bx, by = int(round(BOX[0])), BOX[1]

    print('══ 409-h — 두 자 심판 (대조군: 등폭 동심 3겹 K%.0f D%.0f B%.0f · r30) ══'
          % (TRUTH['K'], TRUTH['D'], TRUTH['B']))
    print('   되돌려준 값이 정답에서 얼마나 벗어났는가(L1 이 작을수록 옳은 자)\n')

    tot = {'diag': 0.0, 'rays45': 0.0}
    for corner in ('BL', 'BR', 'TL', 'TR'):
        print('  %s' % corner)
        tot['diag'] += score('diag', diag(px, bx, by, corner))
        tot['rays45'] += score('rays 45°', ray(px, bx, by, corner, 45))
        # 광선 자는 각도를 여러 개 쓰므로 참고로 같이 찍는다(판정에는 45° 만 쓴다).
        for dg in (60, 75):
            w = widths(ray(px, bx, by, corner, dg))
            print('    %-14s K%.1f D%.1f B%.1f (참고)'
                  % ('rays %d°' % dg, w.get('K', 0), w.get('D', 0), w.get('B', 0)))
        print('')

    print('  ── 합계 L1 (네 코너) ──')
    for k in ('diag', 'rays45'):
        print('    %-8s %.1f' % (k, tot[k]))
    win = min(tot, key=tot.get)
    print('\n  ⇒ 정답에 가까운 자: **%s** (L1 %.1f ↔ %.1f)'
          % (win, tot[win], max(tot.values())))

    # [C] 두 자의 기준 꼭짓점이 1px 어긋난 것이 원인인지 — diag 를 (0,H) 로도 돌려 본다.
    print('\n  [C] diag 의 기준 꼭짓점을 rays 와 같은 (0, H) 로 옮기면')
    for corner in ('BL', 'BR'):
        print('    %s  H−1(현행) %s' % (corner, fmt(diag(px, bx, by, corner))))
        print('    %s  H  (rays 와 같은 자리) %s' % (corner, fmt(diag(px, bx, by, corner, oy_off=0))))
    return 0


if __name__ == '__main__':
    sys.exit(main())
