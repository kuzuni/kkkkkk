# 작업 409 17회차 — **형상 앵커 광선 자**(§25-7 의 첫 일).
#
#   16회차가 못박은 두 가지에서 출발한다:
#     · §25-1 — 두 자(diag·rays)는 **품질이 같다**(정답 그림에서 K·B 를 한 픽셀도 안 틀린다).
#     · §25-2 — 갈림의 정체는 **자를 «상자» 에 걸었다**는 것이다. 상자 좌표는 ±1px 안에서만
#               알 수 있고(ref 는 JPEG 에서 잡은 값 · cap 은 290.75 반올림), 그 1px 이 층 배분을
#               ±2px 로 흔든다. 비평가 DS·DT 는 자를 **«재려는 형상 자신»** 에 걸어 그 오차를
#               원천에서 없앴고 둘 다 같은 결론을 냈다.
#
#   ⇒ 이 자는 `probe409e --rays`(= `verify409`·`verify462` 가 쓰는 광선)와 **각도·방향·보폭이
#      같고**, 다른 것은 딱 하나다 — **출발점을 상자에서 계산하지 않고 그림에서 찾는다.**
#      광선을 코너 바깥에서 안쪽으로 훑어 «처음 어두워지는» 자리(= 알약 윤곽)를 서브픽셀로
#      잡고, 거기서부터 안쪽으로 층을 읽는다.
#
#   ⚠ 이 자가 고치는 것은 **광선 방향의 등록 오차**다. 중심의 «가로» 오차는 여전히 남지만
#      그것은 2차항이다(45° 에서 1px 의 가로 오차 → 시작점 0.7px, 이 자는 그중 세로 몫만 없앤다가
#      아니라 **광선 위 거리**를 형상에서 다시 잡으므로 둘 다 상쇄된다).
#
# 사용:
#   python3 tools/probe409i.py                  ref ↔ cap 아래 코너 45/60/75°(+ 위 코너 참고)
#   python3 tools/probe409i.py --img <png>      임의 캡처 한 장을 cap 상자로 읽는다
#   python3 tools/probe409i.py --ref-curve      `verify462` [3] 에 넣을 ref 곡선만 찍는다
import math
import sys
from PIL import Image

REF7, CAP7 = 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png'
# 스캔 **출발점**일 뿐이다 — 진짜 상자는 `find_box` 가 그림에서 잰다.
# probe409e/f/g/h 가 쓰는 손 값과 같은 값을 넣어 둔다(그래야 «손 ↔ 그림» 대조가 된다).
#
# ⚑⚑ 17회차가 찾은 것 — **ref 의 손 상자 x=292 는 1.32px 틀렸다.**
#    ref 알약의 검정 링은 x 290.73..297.98(폭 7.25)이고 우변 링은 542.87..551.50 이다
#    ⇒ 상자 좌변 = **290.7**(폭 260.8). 292 는 링 «안» 이다.
#    이 방법은 cap 에서 검산된다 — 그림이 돌려준 290.61 이 DOM 실측 290.75 와 **0.14px** 차이다.
BOX = {'ref': (292, 2027), 'cap': (291, 1967)}
W, H = 261, 84
R = 30.0
EDGE_T = 45          # probe409g·h 와 같은 휘도 문턱 (바깥이 밝다 · 알약 둘레는 셸림 #705F4B 휘도 94)

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


def lum(px, x, y):
    c = px[int(round(x)), int(round(y))]
    return (c[0] + c[1] + c[2]) / 3.0


def fmt(s, step=0.5):
    o = []
    for ch in s:
        if o and o[-1][0] == ch:
            o[-1][1] += 1
        else:
            o.append([ch, 1])
    return ' '.join('%s%.1f' % (c, n * step) for c, n in o)


def layers(s, step=0.5):
    """클래스 런을 순서대로 [(글자, 폭), …] 로."""
    o = []
    for ch in s:
        if o and o[-1][0] == ch:
            o[-1][1] += step
        else:
            o.append([ch, step])
    return [(c, n) for c, n in o]


def geom(bx, by, corner, deg, w=W, h=H):
    a = math.radians(deg)
    bottom, right = corner[0] == 'B', corner[1] == 'R'
    cx = bx + (w - R if right else R)
    cy = by + (h - R if bottom else R)
    ux = (1 if right else -1) * math.cos(a)
    uy = (1 if bottom else -1) * math.sin(a)
    return cx, cy, ux, uy


def cross(px, x0, y0, dx, dy, span, step=0.25):
    """알약 **바깥**(x0,y0) 에서 (dx,dy) 로 들어가며 **처음 어두워지는**(검정 링) 자리까지의 거리.

    ⚠ 두 가지를 다 해 보고 이것을 골랐다.
      · 밖에서 안으로 + **긴 span** → 알약을 담은 **서브탭 바 자신의 어두운 테두리**를 먼저 만나
        상자 높이가 84 → 96.7 로 부푼다(바 rim 은 알약 위아래 7px 밖이다).
      · 안에서 밖으로 → 알약 **안에 라벨 글자**(검정 외곽선)가 있어 그것을 링으로 읽는다.
      ⇒ 밖에서 안으로 훑되 **출발점을 바 안쪽에 둔다**(세로 span 은 바 rim 보다 짧게).
    서브픽셀은 직선 보간. 못 찾으면 None."""
    prev, t = None, 0.0
    while t <= span:
        v = lum(px, x0 + dx * t, y0 + dy * t)
        if v <= EDGE_T:
            if prev is None:
                return None              # 첫 표본부터 어둡다 = 출발점이 이미 안이다
            pv, pt = prev
            f = (pv - EDGE_T) / (pv - v) if pv != v else 0.0
            return pt + f * (t - pt)
        prev, t = (v, t), t + step
    return None


def thru(px, x0, y0, dx, dy, span, step=0.25):
    """검정 띠를 **통과해** 그 띠가 끝나는 자리까지의 거리.

    ⚑ 위·아래 변에서 «처음 어두워지는 자리» 는 알약 윤곽이 **아니다** — 그 검정은 알약의 링이
       아니라 **서브탭 바 자신의 테두리**이고, 알약 상자는 그 검정이 **끝나는** 자리에서 시작한다
       (실측: cap 은 바 테두리 1960..1966 · 알약 top 1967 · bottom 2051 = 검정 2051..2057 의 시작).
       좌·우 변은 반대다 — 거기 검정은 알약 **자신의** 링이라 «처음 어두워지는 자리» 가 곧 윤곽이다.
       두 규칙 다 «검정 띠와 알약 속살의 경계» 를 잡는다는 점에서 같은 정의다."""
    prev, t, dark_seen = None, 0.0, False
    while t <= span:
        v = lum(px, x0 + dx * t, y0 + dy * t)
        if not dark_seen:
            if v <= EDGE_T:
                dark_seen = True
        elif v > EDGE_T:
            pv, pt = prev
            f = (EDGE_T - pv) / (v - pv) if v != pv else 0.0
            return pt + f * (t - pt)
        prev, t = (v, t), t + step
    return None


def find_box(px, bx, by, span=14.0):
    """⚑ **이 자의 본체** — 알약 상자를 «넘겨받은 좌표» 가 아니라 **그림에서** 잡는다.

    §25-2 가 밝힌 대로 상자 좌표의 ±1px 오차는 층 배분을 ±2px 로 흔든다. 그런데 알약의
    네 변 한복판은 **직선부**라 코너 곡률과 무관하고, 바깥이 밝다(셸림 #705F4B 휘도 94)
    ⇒ 네 변을 각각 직선 스캔으로 서브픽셀로 잡으면 등록 오차가 **원천에서** 사라진다.
    돌려주는 것은 (x0, y0, w, h) 실수 좌표.
    """
    ymid, xmid = by + H / 2.0, bx + W / 2.0
    dl = cross(px, bx - span, ymid, +1, 0, 2 * span)
    dr = cross(px, bx + W + span, ymid, -1, 0, 2 * span)
    dt = thru(px, xmid, by - span, 0, +1, 2 * span)
    db = thru(px, xmid, by + H + span, 0, -1, 2 * span)
    if None in (dl, dr, dt, db):
        return None
    x0, x1 = bx - span + dl, bx + W + span - dr
    y0, y1 = by - span + dt, by + H + span - db
    return x0, y0, x1 - x0, y1 - y0


def ray_box(px, bx, by, corner, deg, inn=22.0, step=0.5):
    """probe409e.ray / verify409·verify462 와 **같은 규칙**(상자 앵커) — 대조용."""
    cx, cy, ux, uy = geom(bx, by, corner, deg)
    out, d = '', 0.0
    while d <= inn + 1e-9:
        out += cls(px[int(round(cx + ux * (R - d))), int(round(cy + uy * (R - d)))])
        d += step
    return out


def ray_shape(px, box, corner, deg, inn=24.0, step=0.5):
    """**형상 앵커 광선** — 각도·방향·보폭은 `verify462`/`probe409e` 와 **같고**,
       다른 것은 상자가 «넘겨받은 값» 이 아니라 `find_box` 가 **그림에서 잰 값** 이라는 것뿐이다."""
    x0, y0, w, h = box
    cx, cy, ux, uy = geom(x0, y0, corner, deg, w, h)
    out, d = '', 0.0
    while d <= inn + 1e-9:
        out += cls(px[int(round(cx + ux * (R - d))), int(round(cy + uy * (R - d)))])
        d += step
    return out


def diag(px, box, corner, inn=24.0, step=0.5):
    """**이등분선** 자 — `probe409g/h.diag` 와 같은 규칙(꼭짓점에서 첫 어두워지는 자리부터 훑는다).
       다른 것은 꼭짓점을 «손으로 적은 상자» 가 아니라 `find_box` 의 실수 좌표에서 잡는다는 것뿐이다.
       ⚑ 비평가 DS·DT 가 쓴 자가 이것이고, 16회차의 ref 읽기는 **상자 x 가 1.32px 어긋난 선** 위였다."""
    x0, y0, w, h = box
    bottom, right = corner[0] == 'B', corner[1] == 'R'
    ox = (x0 + w) if right else x0
    oy = (y0 + h) if bottom else y0
    sx, sy = (-1 if right else 1), (-1 if bottom else 1)
    # ⚠ 꼭짓점 자신이 이미 검정일 수 있다(cap 은 상자 코너가 링 위다) — 대각선 **바깥** 4px 에서 출발한다.
    back = 4.0
    sx2, sy2 = sx / math.sqrt(2.0), sy / math.sqrt(2.0)
    ox, oy = ox - sx2 * back, oy - sy2 * back
    d = cross(px, ox, oy, sx2, sy2, 28.0)
    if d is None:
        return None
    out, s = '', 0.0
    while s <= inn + 1e-9:
        t = (d + s) / math.sqrt(2.0)
        out += cls(px[int(round(ox + sx * t)), int(round(oy + sy * t))])
        s += step
    return out


def gate_layers(s):
    """`verify462.layers` 와 **글자까지 같은 규칙** — 검정 링 → 그 뒤 첫 실런(<2.0 은 AA 로 건너뜀)
       → 그 다음 실런. 게이트가 [2][3] 에서 보는 그 값이다."""
    rs = layers(s)
    i = 0
    while i < len(rs) and rs[i][0] != 'K':
        i += 1
    k = rs[i][1] if i < len(rs) else 0.0
    j = i + 1
    while j < len(rs) and rs[j][1] < 2.0:
        j += 1
    a = rs[j] if j < len(rs) else ('-', 0.0)
    m = j + 1
    while m < len(rs) and rs[m][1] < 2.0:
        m += 1
    b = rs[m] if m < len(rs) else ('-', 0.0)
    return k, a, b


DEGS = (45, 60, 75)


def read(px, bx, by, tag=None):
    """한 그림의 아래 두 코너를 **두 자로** 읽는다 → {(corner,deg): (상자앵커, 형상앵커)}"""
    b2 = find_box(px, bx, by)
    out = {}
    for corner in ('BL', 'BR'):
        for dg in DEGS:
            sb = ray_box(px, bx, by, corner, dg)
            ss = ray_shape(px, b2, corner, dg) if b2 else None
            out[(corner, dg)] = (sb, ss)
    return out, b2


def table(quiet=False):
    ims = {'ref': Image.open(REF7).convert('RGB'), 'cap': Image.open(CAP7).convert('RGB')}
    res, boxes = {}, {}
    for who in ('ref', 'cap'):
        px = ims[who].load()
        bx, by = BOX[who]
        res[who], boxes[who] = read(px, bx, by)
    if quiet:
        return res, boxes
    print('══ 409-i — 형상 앵커 광선 (상자를 넘겨받지 않고 **그림에서 잰다**) ══')
    print('   K 검정 · B 베벨#634F37 · F 채움#4B3E2D · D 바닥띠#413122 · R 셸림 · S 셸바닥\n')
    print('  [상자] 손으로 적은 값 ↔ 네 변 직선 스캔이 돌려준 값')
    for who in ('ref', 'cap'):
        bx, by = BOX[who]
        b2 = boxes[who]
        print('    %-3s  손 (%d, %d, %d×%d)   그림 (%.2f, %.2f, %.2f×%.2f)   Δ (%+.2f, %+.2f)'
              % (who, bx, by, W, H, b2[0], b2[1], b2[2], b2[3], b2[0] - bx, b2[1] - by))
    print('')
    for corner in ('BL', 'BR'):
        print('  %s' % corner)
        for dg in DEGS:
            for who in ('ref', 'cap'):
                sb, ss = res[who][(corner, dg)]
                _, ab, _ = gate_layers(sb)
                _, asx, _ = gate_layers(ss)
                print('    %-3s %2d°  상자앵커 %-40s  띠 %s%.1f' % (who, dg, fmt(sb), ab[0], ab[1]))
                print('    %-3s %2d°  형상앵커 %-40s  띠 %s%.1f' % ('', dg, fmt(ss), asx[0], asx[1]))
            print('')
    return res, boxes


def ref_curve():
    """`verify462` [3] 에 넣을 ref 곡선 — 형상 앵커로 BL·BR 를 재어 평균."""
    res, boxes = table(quiet=True)
    print('══ 409-i/ref-curve — `verify462` [3] REF_DARK 재측정 (§25-7 의 첫 일) ══\n')
    print('  상자(그림에서 잰 값)  ref %.2f,%.2f %.2f×%.2f   cap %.2f,%.2f %.2f×%.2f\n'
          % (tuple(boxes['ref']) + tuple(boxes['cap'])))
    print('  각도 │  ref BL   ref BR   **ref 평균**  │  cap BL   cap BR   cap 평균')
    outs = []
    for dg in DEGS:
        row = {}
        for who in ('ref', 'cap'):
            vs = []
            for corner in ('BL', 'BR'):
                _, ss = res[who][(corner, dg)]
                _, a, _ = gate_layers(ss)
                vs.append(a[1] if a[0] == 'D' else float('nan'))
            row[who] = vs
        m = sum(row['ref']) / 2.0
        outs.append(m)
        print('  %2d°  │  %5.1f    %5.1f    **%5.2f**   │  %5.1f    %5.1f    %5.2f'
              % (dg, row['ref'][0], row['ref'][1], m,
                 row['cap'][0], row['cap'][1], sum(row['cap']) / 2.0))
    print('\n  ⇒ 형상 앵커 REF_DARK = [%s]' % ', '.join('%.2f' % v for v in outs))
    print('     (현행 게이트의 상자 앵커 곡선 = 2.5 / 3.75 / 5.0)')
    return outs


def img_read(pathname):
    px = Image.open(pathname).convert('RGB').load()
    bx, by = BOX['cap']
    b2 = find_box(px, bx, by)
    print('══ 409-i/img — %s (그림에서 잰 상자 %.2f, %.2f, %.2f×%.2f) ══'
          % ((pathname,) + tuple(b2)))
    for corner in ('BL', 'BR'):
        for dg in DEGS:
            ss = ray_shape(px, b2, corner, dg)
            _, a, b = gate_layers(ss)
            print('  %-3s %2d°  %-40s  띠 %s%.1f  뒤 %s%.1f'
                  % (corner, dg, fmt(ss), a[0], a[1], b[0], b[1]))


def main():
    a = sys.argv[1:]
    if '--img' in a:
        img_read(a[a.index('--img') + 1])
        return 0
    if '--ref-curve' in a:
        ref_curve()
        return 0
    table()
    return 0


if __name__ == '__main__':
    sys.exit(main())
