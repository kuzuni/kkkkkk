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
from pydep937 import Image

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


# ─────────────────────────────────────────────────────────────────────────────
# 18회차 (2026-08-31) — **법선 자** (§26-8 ⓪ 가 시킨 첫 일)
#
#   17회차까지의 광선은 코너를 **원 30** 으로 가정하고 «중심에서 반지름 30 지점» 부터
#   안으로 훑었다. 그런데 이 코너는 `.stab.on::after{border-radius:30px / 33px}` =
#   **30 × 33 타원**이다. 두 가지가 동시에 틀어진다:
#     ⓐ **출발점** — 타원 45° 의 참 반지름은 31.39 라 «30 에서 출발» 은 이미 1.39px **안**이다
#        (검정 링이 7.0 인데 6.0 으로 읽히던 그 1px).
#     ⓑ **방향** — 원이 아니면 «중심에서 나가는 선» 은 법선이 아니다. 층 두께는 법선 위에서만
#        참값이고, 반지름 위에서 재면 cos(반지름↔법선 각) 만큼 **부풀어** 읽힌다.
#   ⇒ 이 자는 둘 다 없앤다: 코너 윤곽(검정 **바깥** 모서리)을 그림에서 서브픽셀로 잡고,
#      그 윤곽의 **국소 법선** 위에서만 층을 읽는다. 모델(원이든 타원이든)을 안 쓴다.
#
#   ⚑ 왜 이 자가 옳은가 — 비평가 DU·DV 가 서로 다른 방법(DV 컨투어 법선 · DU 이등분선 +
#      0.5° 스윕 최소거리)으로 «아래 코너 D 가 −20~30%» 라는 **같은 값**을 냈는데,
#      원 30 자만 «ref ≈ cap» 으로 읽었다. 갈리면 법선 자가 옳다(§26-8).
#
#   ⚠ 상자 자(`find_box`)와 윤곽 자는 **다른 것을 잰다** — 상자는 좌·우에서 «검정 바깥»,
#      위·아래에서 «검정 안쪽»(그 검정은 알약이 아니라 바 테두리다)을 잡는다. 법선 자는
#      네 방향 전부 «검정 **바깥** 모서리» 한 정의로만 잡는다(코너에서는 알약의 검정과
#      바 테두리가 같은 검정이라 그것이 유일하게 일관된 정의다).

NRMAX = 52.0        # 윤곽 탐색 시작 거리(중심에서) — 아래로 52px 이면 바 밖 밝은 배경이다
NSMOOTH = 6.0       # 법선을 낼 때 r(φ) 를 국소 2차로 매끈하게 하는 창(±도)


def _corner_frame(box, corner):
    """(중심x, 중심y, sx, sy) — sx·sy 는 그 코너의 «바깥» 방향 부호."""
    x0, y0, w, h = box
    bottom, right = corner[0] == 'B', corner[1] == 'R'
    cx = x0 + (w - R if right else R)
    cy = y0 + (h - R if bottom else R)
    return cx, cy, (1 if right else -1), (1 if bottom else -1)


def outer_edge(px, cx, cy, sx, sy, deg, rmax=NRMAX, step=0.25, minrun=2.0):
    """코너 중심에서 **밖으로** 훑어 알약 검정 링의 **바깥** 모서리까지의 거리(서브픽셀).

    ⚠⚠ **밖에서 안으로 훑으면 안 된다** — 알약 아래 검정과 서브탭 바 **자신의 아래 테두리**가
       다른 물건인데 같은 검정이다. 실측(cap, BL): x=305 열은 알약 링 2040..2047 · **셸림
       2049..2050** · 바 테두리 2051..2057 로 **셋이 갈라져 있고**, x=420(직선부)에서는 알약
       링과 바 테두리가 **같은 2051..2057 한 줄로 붙는다.** 밖에서 들어오면 코너에서는 바
       테두리를 알약으로 읽어 윤곽이 8~10px 부풀고, 직선부에서는 우연히 맞는다 =
       **코너에서만 틀리는 자** 가 된다(이 작업이 11회차째 쫓던 바로 그 종류의 오차다).
    ⇒ 안에서 밖으로 나가면 처음 만나는 검정이 **반드시 알약 자신의 링**이라 애매함이 없다.
       코너 중심(코너 반지름만큼 안쪽)은 라벨 글자에서 멀어 `diag` 가 겪던 «글자 외곽선을
       링으로 읽는» 함정도 없다.
    `minrun` 은 JPEG AA 한두 표본을 링으로 읽지 않기 위한 최소 두께다."""
    a = math.radians(deg)
    ux, uy = sx * math.cos(a), sy * math.sin(a)
    t, dark_at, prev = 4.0, None, None
    while t <= rmax:
        v = lum(px, cx + ux * t, cy + uy * t)
        if dark_at is None:
            if v <= EDGE_T:
                pv, pt = prev if prev else (v, t)
                f = (pv - EDGE_T) / (pv - v) if pv != v else 0.0
                dark_at = pt + f * (t - pt)
        elif v > EDGE_T:
            if t - dark_at >= minrun:
                pv, pt = prev
                f = (EDGE_T - pv) / (v - pv) if v != pv else 0.0
                return pt + f * (t - pt)
            dark_at = None            # 너무 얇았다 = AA · 계속 나간다
        prev, t = (v, t), t + step
    return None


def inner_edge(px, cx, cy, sx, sy, deg, rmax=NRMAX, step=0.25):
    """코너 중심에서 **밖으로** 훑어 검정 링의 **안쪽** 모서리까지의 거리(서브픽셀).

    ⚑⚑ **이 자가 윤곽으로 삼는 것은 링의 «바깥» 이 아니라 «안» 이다.** 바깥은 잴 수 없다 —
       알약의 검정과 서브탭 바 자신의 테두리가 **아래 직선부에서 한 줄로 붙기** 때문이다
       (cap 실측: x=420 은 알약 D 2044..2050 · 검정 2051..2057 인데 그 검정은 바 테두리와
       같은 줄이고, x=305 코너에서는 알약 링 2040..2047 · 셸림 2049..2050 · 바 테두리
       2051..2057 로 **셋이 갈라진다**). 바깥으로 맞춘 타원은 그래서 b 가 33 이 아니라
       **38** 로 나오고 K 가 7 이 아니라 **9.5~12** 로 읽힌다 = 바 테두리를 알약으로 센 값이다.
       안쪽 모서리는 «알약의 색이 시작하는 자리» 라 그런 오염이 **원리적으로** 없다.
    ⚠ 그래서 이 자가 돌려주는 타원은 `::after` 의 **안쪽** 반지름이다(우리 CSS 로는
       30−7 × 33−7 = **23 × 26**). 법선 방향은 안·바깥 어느 쪽으로 맞춰도 같은 곡선족이므로
       층 두께를 재는 데 필요한 것은 이것으로 충분하다."""
    a = math.radians(deg)
    ux, uy = sx * math.cos(a), sy * math.sin(a)
    prev, t = None, 4.0
    while t <= rmax:
        v = lum(px, cx + ux * t, cy + uy * t)
        if v <= EDGE_T:
            if prev is None:
                return None
            pv, pt = prev
            f = (pv - EDGE_T) / (pv - v) if pv != v else 0.0
            return pt + f * (t - pt)
        prev, t = (v, t), t + step
    return None


def contour(px, box, corner, lo=0.0, hi=90.0, dphi=0.5, edge='inner'):
    """코너 한 사분면의 윤곽을 극좌표로 — [(φ, r)] (φ 0° = 바깥 가로 · 90° = 바깥 세로).
       `edge='inner'` 는 검정 링 **안쪽** 모서리(기본 · 위 주석), `'outer'` 는 바깥 모서리."""
    cx, cy, sx, sy = _corner_frame(box, corner)
    fn = inner_edge if edge == 'inner' else outer_edge
    out, ph = [], lo
    while ph <= hi + 1e-9:
        r = fn(px, cx, cy, sx, sy, ph)
        if r is not None:
            out.append((ph, r))
        ph += dphi
    return (cx, cy, sx, sy), out


def fit_ellipse(samples, lo=6.0, hi=84.0):
    """코너 윤곽점들에 **타원**을 최소제곱으로 맞춘다 → (a, b, 잔차RMS, 표본수).

    ⚑ 왜 모델을 맞추는가 — 법선은 윤곽의 **미분**이라 표본 잡음(서브픽셀 ±0.25px)에
       그대로 증폭된다(생 미분은 φ=60° 근처에서 ±40° 로 튄다). 그런데 이 코너는 ref 든
       우리든 **둥근 사각형의 모서리** = 타원 하나이고, 타원은 `u·X² + v·Y² = 1`
       (u=1/a², v=1/b²) 로 **파라미터에 선형**이라 두 미지수 최소제곱으로 닫힌다.
       ⇒ 잡음은 평균되고 법선은 해석적으로 나온다.
    ⚠ 이것은 «반지름 30» 을 **가정하는 것이 아니다** — a·b 를 그림에서 **재는 것**이다.
       잔차가 크면(>0.6px) 타원이 아니라는 뜻이니 그때는 이 자를 믿지 마라.
    직선부(φ<6°·>84°)는 뺀다 — 거기서는 윤곽이 코너가 아니라 변이다."""
    P = [(r * math.cos(math.radians(p)), r * math.sin(math.radians(p)))
         for p, r in samples if lo <= p <= hi]
    if len(P) < 12:
        return None
    s11 = sum(X ** 4 for X, _ in P)
    s12 = sum((X ** 2) * (Y ** 2) for X, Y in P)
    s22 = sum(Y ** 4 for _, Y in P)
    t1 = sum(X ** 2 for X, _ in P)
    t2 = sum(Y ** 2 for _, Y in P)
    det = s11 * s22 - s12 * s12
    if abs(det) < 1e-9:
        return None
    u = (t1 * s22 - t2 * s12) / det
    v = (s11 * t2 - s12 * t1) / det
    if u <= 0 or v <= 0:
        return None
    a, b = u ** -0.5, v ** -0.5
    res = 0.0
    for X, Y in P:
        rr = math.hypot(X, Y)
        th = math.atan2(Y / b, X / a) if rr else 0.0
        # 같은 방향의 타원 위 점까지의 거리로 잔차를 잰다(반지름 방향 잔차)
        c, s = X / rr, Y / rr
        den = math.sqrt((c / a) ** 2 + (s / b) ** 2)
        res += (rr - 1.0 / den) ** 2
    return a, b, (res / len(P)) ** 0.5, len(P)


def ellipse_normal(frame, a, b, theta):
    """바깥 법선이 `theta`(0°=가로 · 90°=세로)인 타원 위 점 P 와 그 **바깥 법선** 단위벡터.
       매개변수 t 에서 점 (a cos t, b sin t) · 법선 ∝ (cos t / a, sin t / b)
       ⇒ tan θ = (a/b)·tan t 로 t 를 직접 푼다."""
    cx, cy, sx, sy = frame
    th = math.radians(theta)
    t = math.atan2(math.sin(th) * b, math.cos(th) * a)
    X, Y = a * math.cos(t), b * math.sin(t)
    nx, ny = math.cos(t) / a, math.sin(t) / b
    L = math.hypot(nx, ny)
    return (cx + sx * X, cy + sy * Y), (sx * nx / L, sy * ny / L)


def _fit(samples, ph0, win=NSMOOTH):
    """φ=ph0 근방을 국소 2차로 맞춰 (r, dr/dφ[rad]) — JPEG 잡음이 미분을 흔드는 것을 막는다."""
    xs = [(p - ph0, r) for p, r in samples if abs(p - ph0) <= win]
    if len(xs) < 5:
        return None
    n = float(len(xs))
    s1 = sum(d for d, _ in xs)
    s2 = sum(d * d for d, _ in xs)
    s3 = sum(d ** 3 for d, _ in xs)
    s4 = sum(d ** 4 for d, _ in xs)
    t0 = sum(r for _, r in xs)
    t1 = sum(d * r for d, r in xs)
    t2 = sum(d * d * r for d, r in xs)
    # [n s1 s2; s1 s2 s3; s2 s3 s4] · [c0 c1 c2] = [t0 t1 t2]
    m = [[n, s1, s2, t0], [s1, s2, s3, t1], [s2, s3, s4, t2]]
    for i in range(3):
        p = max(range(i, 3), key=lambda k: abs(m[k][i]))
        if abs(m[p][i]) < 1e-12:
            return None
        m[i], m[p] = m[p], m[i]
        for k in range(i + 1, 3):
            f = m[k][i] / m[i][i]
            for j in range(i, 4):
                m[k][j] -= f * m[i][j]
    c = [0.0] * 3
    for i in (2, 1, 0):
        c[i] = (m[i][3] - sum(m[i][j] * c[j] for j in range(i + 1, 3))) / m[i][i]
    return c[0], c[1] * 180.0 / math.pi      # r(ph0), dr/dφ(라디안)


def normal_at(frame, samples, ph):
    """윤곽점 P(φ) 와 그 자리의 **바깥 법선** 단위벡터, 그리고 그 법선의 각도(도).

    극좌표 r(φ) 곡선의 접선은 (dr/dφ)·r̂ + r·φ̂ 이고 바깥 법선은 그것을 90° 돌린
    r·r̂ − (dr/dφ)·φ̂ 를 정규화한 것이다. 코너 프레임(sx, sy)에서 화면 좌표로 옮긴다."""
    cx, cy, sx, sy = frame
    f = _fit(samples, ph)
    if f is None:
        return None
    r, dr = f
    a = math.radians(ph)
    ca, sa = math.cos(a), math.sin(a)
    px_, py_ = cx + sx * r * ca, cy + sy * r * sa
    # 코너 프레임 안에서의 바깥 법선 (r̂ = (ca,sa) · φ̂ = (−sa,ca))
    nx = r * ca - dr * (-sa)
    ny = r * sa - dr * ca
    L = math.hypot(nx, ny)
    if L < 1e-9:
        return None
    nx, ny = nx / L, ny / L
    ang = math.degrees(math.atan2(ny, nx))
    return (px_, py_), (sx * nx, sy * ny), ang


def ray_normal(px, frame, fit, theta, inn=24.0, out0=10.0, step=0.5):
    """**법선 자** — 맞춘 타원(링 안쪽 모서리) 위에서 바깥 법선이 `theta` 인 점을 잡아
       그 점의 **바깥으로 `out0`** 물러섰다가 안쪽 법선 방향으로 층을 읽는다.
       바깥에서 출발하는 이유는 옛 자와 같은 `gate_layers`(검정 링 → 1층 → 2층)를
       그대로 쓰기 위해서다. 보폭·읽는 길이는 옛 자와 같게 둔다.
       ⚠ 이렇게 읽은 **K 는 알약 링 + 바 테두리의 합**일 수 있다(위 `inner_edge` 주석).
          이 자가 참값으로 말하는 것은 K 뒤의 **1층·2층**(D·B)이다."""
    if fit is None:
        return None, None
    a, b = fit[0], fit[1]
    P, N = ellipse_normal(frame, a, b, theta)
    out, d = '', -out0
    while d <= inn + 1e-9:
        out += cls(px[int(round(P[0] - N[0] * d)), int(round(P[1] - N[1] * d))])
        d += step
    return out, P


def norm_layers(s, out0=10.0, step=0.5):
    """법선 자 전용 층 읽기 — `gate_layers` 와 규칙은 같고 **두 가지만** 다르다.

    ① **«마지막» 검정 런을 링으로 잡는다.** 바깥에서 출발하면 코너에서 바 테두리 검정이
       먼저 오고 셸림이 한 칸 끼었다가 알약 링이 온다(실측 cap 60°: `K3.0 R1.0 K6.0 …`).
       첫 K 를 잡으면 그 뒤 «1층» 이 알약 링 자신이 되어 표가 통째로 한 칸 밀린다.
    ② **K 바로 뒤의 S 런은 건너뛴다.** `S`(#2B231A)는 셸 바닥색이지 알약 층이 아니고,
       ref 는 JPEG 이라 검정↔띠 경계에 1~2px 이 그 색으로 번진다(cap 에는 없다).
       이것을 안 건너뛰면 ref 75° 가 «1층 = S 2.0» 으로 읽혀 ref 만 −2px 손해를 본다."""
    rs = layers(s, step)
    anchor = out0 + 1.5
    i, d, best = 0, 0.0, None
    for i in range(len(rs)):
        if rs[i][0] == 'K' and d <= anchor:
            best = i
        d += rs[i][1]
    if best is None:
        return 0.0, ('-', 0.0), ('-', 0.0)
    k = rs[best][1]

    def nxt(j):
        while j < len(rs) and (rs[j][1] < 2.0 or rs[j][0] == 'S'):
            j += 1
        return j
    j = nxt(best + 1)
    a = rs[j] if j < len(rs) else ('-', 0.0)
    m = nxt(j + 1)
    b = rs[m] if m < len(rs) else ('-', 0.0)
    return k, a, b


def normal_table(imgs=None):
    """ref ↔ cap 을 **법선 자**로 나란히 — §26-8 ⓪."""
    ims = imgs or {'ref': (REF7, BOX['ref']), 'cap': (CAP7, BOX['cap'])}
    print('══ 409-i/normal — **법선 자** (윤곽을 그림에서 잡고 그 국소 법선 위에서만 읽는다) ══')
    print('   K 검정 · B 베벨#634F37 · F 채움#4B3E2D · D 바닥띠#413122 · R 셸림 · S 셸바닥')
    print('   θ 0° = 바깥 가로 · 90° = 바깥 세로 (옛 광선 자와 같은 각도 규약)\n')
    data = {}
    for who, (pathname, bxy) in ims.items():
        px = Image.open(pathname).convert('RGB').load()
        box = find_box(px, *bxy)
        data[who] = (px, box)
        print('  %-3s 상자 (%.2f, %.2f, %.2f×%.2f)' % ((who,) + tuple(box)))
    print('')
    res = {}
    print('  [코너 타원] 윤곽에 맞춘 a(가로)×b(세로) — 우리 CSS 는 `30px / 33px` 이다')
    for corner in ('BL', 'BR', 'TL', 'TR'):
        row = []
        for who in ('ref', 'cap'):
            px, box = data[who]
            frame, samples = contour(px, box, corner)
            fit = fit_ellipse(samples)
            res[(who, corner, 'fit')] = (frame, fit)
            row.append('%s %.2f×%.2f (잔차 %.2f · n%d)' % ((who,) + tuple(fit)) if fit else who + ' —')
        print('    %-3s  %s   %s' % (corner, row[0], row[1]))
    print('')
    for corner in ('BL', 'BR', 'TL', 'TR'):
        print('  %s' % corner)
        for who in ('ref', 'cap'):
            px, box = data[who]
            frame, fit = res[(who, corner, 'fit')]
            for th in DEGS:
                s, P = ray_normal(px, frame, fit, th)
                if s is None:
                    print('    %-3s %2d°  (타원 못 맞춤)' % (who, th))
                    continue
                k, a, b = norm_layers(s)
                res[(who, corner, th)] = (k, a, b)
                print('    %-3s %2d°  %-42s  K%.1f  %s%.1f  %s%.1f'
                      % (who, th, fmt(s), k, a[0], a[1], b[0], b[1]))
        print('')
    return res


def normal_delta():
    """법선 자로 «ref ↔ cap» 차이만 요약 — 18회차가 무엇을 향해 깎는지."""
    res = normal_table()
    print('══ 요약 — 법선 자로 잰 ref ↔ cap (층 이름은 ref 기준) ══\n')
    for corner in ('BL', 'BR', 'TL', 'TR'):
        print('  %s' % corner)
        print('    θ   │  K ref/cap      │  1층 ref/cap            │  2층 ref/cap')
        for th in DEGS:
            r = res.get(('ref', corner, th))
            c = res.get(('cap', corner, th))
            if not r or not c:
                continue
            print('    %2d° │  %4.1f / %4.1f    │  %s %4.1f / %s %4.1f  (%+.1f)  │  %s %4.1f / %s %4.1f'
                  % (th, r[0], c[0], r[1][0], r[1][1], c[1][0], c[1][1],
                     c[1][1] - r[1][1], r[2][0], r[2][1], c[2][0], c[2][1]))
        print('')
    return res


def cov_ray(px, frame, fit, theta, inn=26.0, out0=8.0, step=0.25):
    """**커버리지 적분** 판 법선 자 — 층 두께를 «문턱 넘은 표본 세기» 가 아니라
       «색 소속도의 적분» 으로 잰다. 돌려주는 것은 {클래스: 두께}.

    ⚑⚑ **왜 이것이 필요한가 — 문턱 자는 ref 만 1px 손해를 보게 한다.**
       ref 는 JPEG 이라 층 경계가 2~3px 번지고 cap 은 PNG 라 칼같다. 문턱으로 세면
       ref 의 번진 양끝이 **양쪽 다 떨어져 나가** 같은 7px 띠가 ref 6.0 / cap 7.0 으로 읽힌다
       (실측: ref 밑변 D 는 하드런 2105..2110 = 6.0 인데 352 4회차가 커버리지 적분으로 잰
       값은 **6.86** 이고 우리 CSS 는 7 이다). 그 1px 을 «우리가 두껍다» 로 읽고 깎으면
       **없는 결함을 고치게 된다.**
    ⇒ 표본마다 가장 가까운 두 팔레트 색의 선분 위로 사영해 소속도를 나눠 갖는다.
       번짐은 양끝에서 **대칭으로** 나뉘므로 JPEG·PNG 가 같은 값을 돌려준다.
    이 방식은 352 4회차(비평가 AW)가 이 부품의 세 띠를 6.75/6.86/7.03 으로 재어
    «전부 7» 이라는 규약을 세울 때 쓴 것과 같은 자다."""
    if fit is None:
        return None
    a, b = fit[0], fit[1]
    P, N = ellipse_normal(frame, a, b, theta)
    acc, d = {}, -out0
    while d <= inn + 1e-9:
        c = px[int(round(P[0] - N[0] * d)), int(round(P[1] - N[1] * d))]
        ds = sorted(((sum((int(c[k]) - rc[k]) ** 2 for k in range(3)), ch, rc)
                     for ch, rc in PAL))
        (_, c1, p1), (_, c2, p2) = ds[0], ds[1]
        vv = [p2[k] - p1[k] for k in range(3)]
        den = sum(v * v for v in vv)
        t = 0.0 if den == 0 else sum((int(c[k]) - p1[k]) * vv[k] for k in range(3)) / den
        t = 0.0 if t < 0 else (1.0 if t > 1 else t)
        acc[c1] = acc.get(c1, 0.0) + (1.0 - t) * step
        acc[c2] = acc.get(c2, 0.0) + t * step
        d += step
    return acc


def cov_sweep(imgs=None, lo=30.0, hi=90.0, dth=5.0, corners=('BL', 'BR', 'TL', 'TR')):
    """커버리지 적분으로 아래 코너의 **D**(어두운 띠) · 위 코너의 **B**(베벨) 곡선을 훑는다."""
    ims = imgs or {'ref': (REF7, BOX['ref']), 'cap': (CAP7, BOX['cap'])}
    names = list(ims)
    data = {}
    for who, (pathname, bxy) in ims.items():
        px = Image.open(pathname).convert('RGB').load()
        data[who] = (px, find_box(px, *bxy))
    print('══ 409-i/cov — **커버리지 적분** 법선 자 (JPEG↔PNG 번짐 편향을 없앤 두께) ══')
    print('   아래 코너는 D(어두운 띠) · 위 코너는 B(베벨) 를 본다. θ 90° = 직선부\n')
    out = {}
    for corner in corners:
        key = 'D' if corner[0] == 'B' else 'B'
        fits = {}
        for who in names:
            px, box = data[who]
            frame, samples = contour(px, box, corner)
            fits[who] = (px, frame, fit_ellipse(samples))
        print('  %s (%s)   θ  │ %s │  Δ' % (corner, key, ' │ '.join('%-6s' % w for w in names)))
        th = lo
        while th <= hi + 1e-9:
            vs = []
            for who in names:
                px, frame, fit = fits[who]
                acc = cov_ray(px, frame, fit, th)
                vs.append(acc.get(key, 0.0) if acc else float('nan'))
                out[(who, corner, th)] = vs[-1]
            print('              %4.0f │ %s │  %+.2f'
                  % (th, ' │ '.join('%6.2f' % v for v in vs), vs[-1] - vs[0]))
            th += dth
        print('')
    return out


def normal_sweep(imgs=None, lo=30.0, hi=90.0, dth=5.0, corners=('BL', 'BR', 'TL', 'TR')):
    """법선 자를 **각도로 훑는다** — 두 비평가가 «감쇠 곡선이 틀렸다» 고 한 그 곡선을 직접 본다.
       세 각(45/60/75)만으로는 곡선의 모양을 못 본다(직선부 90° 가 기준선이다)."""
    ims = imgs or {'ref': (REF7, BOX['ref']), 'cap': (CAP7, BOX['cap'])}
    data = {}
    for who, (pathname, bxy) in ims.items():
        px = Image.open(pathname).convert('RGB').load()
        box = find_box(px, *bxy)
        data[who] = (px, box)
    print('══ 409-i/sweep — 법선 자 각도 훑기 (1층 두께 · θ 90° = 직선부) ══\n')
    for corner in corners:
        fits = {}
        for who in ims:
            px, box = data[who]
            frame, samples = contour(px, box, corner)
            fits[who] = (px, frame, fit_ellipse(samples))
        names = list(ims)
        print('  %s   θ  │ %s' % (corner, ' │ '.join('%-12s' % w for w in names)))
        th = lo
        while th <= hi + 1e-9:
            cells = []
            for who in names:
                px, frame, fit = fits[who]
                s, _ = ray_normal(px, frame, fit, th)
                k, a, b = norm_layers(s) if s else (0, ('-', 0), ('-', 0))
                cells.append('%s%4.1f  (K%4.1f)' % (a[0], a[1], k))
            print('       %4.0f │ %s' % (th, ' │ '.join(cells)))
            th += dth
        print('')


def main():
    a = sys.argv[1:]
    if '--sweep' in a or '--cov' in a:
        ims = None
        if '--img' in a:
            ims = {'ref': (REF7, BOX['ref']), 'cap': (a[a.index('--img') + 1], BOX['cap'])}
        (cov_sweep if '--cov' in a else normal_sweep)(ims)
        return 0
    if '--normal' in a:
        if '--img' in a:
            normal_table({'ref': (REF7, BOX['ref']),
                          'cap': (a[a.index('--img') + 1], BOX['cap'])})
            return 0
    if '--img' in a:
        img_read(a[a.index('--img') + 1])
        return 0
    if '--ref-curve' in a:
        ref_curve()
        return 0
    if '--normal' in a:
        normal_delta()
        return 0
    table()
    return 0


if __name__ == '__main__':
    sys.exit(main())
