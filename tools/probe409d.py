# 작업 409 7회차 — «링을 어느 쪽으로 그리는가» 를 재는 자 (§15-8 인계).
#
#   6회차 비평가 DH 가 «ref 는 r30 상자 **바깥** 으로 스트로크를 그린다(바깥 R36.08 · 안쪽 R30) ↔
#   우리는 안쪽(R28.40 / R22)» 이라고 원 피팅으로 냈고, 그 값이 1~6회차의 전제를 뒤집는다고 적었다.
#   338 규칙대로 **처방 전에 그 값을 재현**한다.
#
#   앞선 자들이 못 재던 이유는 둘 다 «창» 이다:
#     · probe409.py  — 광선을 «윤곽 바깥 6px» 에서 시작해 70° 위에서 셸 검정과 알약 검정이 붙는다.
#     · probe409c.py — 알약 상자 «안쪽만» 본다(상자 밖 스트로크가 아예 안 들어온다).
#   여기서는 **알약 속(r=14)에서 바깥으로** 훑는다. 그러면 만나는 순서가 곧 구조다:
#       채움 → [링 검정 r_i..r_o] → (틈 g) → [바 테두리 검정] → 바깥
#   «링» 은 «알약 채움에 맞닿은 검정» 으로 **정의로** 고정되므로 셸 검정과 붙어도 안 헷갈린다
#   (붙었으면 틈 g = 0 으로 나오고, 그것이 곧 «ref 는 접선에서 바 테두리와 만난다» 는 사실이다).
#
#   판정은 «두께» 가 아니라 **바깥 반지름 r_o 가 각도에 대해 상수인가**(= 동심 링인가) 다.
#
# 사용:  python3 tools/probe409d.py [--cap 파일] [--json]
import sys
import math
import json

from pydep937 import Image

REF7 = 'docs/ref/07-스킬-팝업.jpg'
CAP7 = 'docs/review/96-full-hero.png'

# 활성 알약(«스킬») 상자 — 352 §3·§10 확정값. 세로는 하단 앵커 ref y − 60.
BOX = {'ref': (292, 2027), 'cap': (291, 1967)}
H, R = 84, 30   # ⚠ 84 다 — 7회차에 제품에 직접 물어 고쳤다(onRect h=84.0 · ref 2027..2111). 앞선 probe409·409c 의 85 는 오차 1px.

# 팔레트 휘도(0.299/0.587/0.114): K 0 · S(셸 바닥 #2B231A) 36.4 · D(#413122) 52.1 ·
# F(#4B3E2D) 63.9 · B(#634F37) 82.3 · R(#705F4B) 97.8.
# «검정» 임계는 K 와 가장 어두운 이웃 S(36.4) 의 중간 아래로 잡는다.
TH = 26.0
DEGS = list(range(0, 89, 5))


def load(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.load()
    lum = [[0.0] * w for _ in range(h)]
    for y in range(h):
        row = lum[y]
        for x in range(w):
            r, g, b = px[x, y]
            row[x] = 0.299 * r + 0.587 * g + 0.114 * b
    return lum, w, h


def bil(lum, x, y):
    x0, y0 = int(math.floor(x)), int(math.floor(y))
    fx, fy = x - x0, y - y0
    a = lum[y0][x0] * (1 - fx) + lum[y0][x0 + 1] * fx
    b = lum[y0 + 1][x0] * (1 - fx) + lum[y0 + 1][x0 + 1] * fx
    return a * (1 - fy) + b * fy


def profile(lum, l, t, corner, deg, r0=14.0, r1=44.0, step=0.1):
    """알약 **속**(r0)에서 **바깥**(r1)으로 훑은 (반지름, 휘도) 목록."""
    a = math.radians(deg)
    if corner == 'BL':
        cx, cy, ux, uy = R, H - R, -math.cos(a), math.sin(a)
    elif corner == 'TL':
        cx, cy, ux, uy = R, R, -math.cos(a), -math.sin(a)
    elif corner == 'BR':
        cx, cy, ux, uy = None, None, None, None
    else:
        raise ValueError(corner)
    out = []
    r = r0
    while r <= r1 + 1e-9:
        out.append((r, bil(lum, l + cx + ux * r, t + cy + uy * r)))
        r += step
    return out


def cross(p, i, up):
    """구간 [i-1, i] 안에서 임계 TH 를 지나는 반지름 — 선형 보간(서브픽셀)."""
    (r0, v0), (r1, v1) = p[i - 1], p[i]
    if v1 == v0:
        return r1
    f = (TH - v0) / (v1 - v0)
    return r0 + (r1 - r0) * f


def structure(p):
    """알약 속 → 바깥 순서로 «검정 런» 을 뽑는다.
       돌려주는 것: [(r_in, r_out), …] · 첫 런이 «링»(채움에 맞닿은 검정)이다."""
    runs = []
    inside = p[0][1] < TH
    start = p[0][0] if inside else None
    for i in range(1, len(p)):
        v = p[i][1]
        if not inside and v < TH:
            inside = True
            start = cross(p, i, False)
        elif inside and v >= TH:
            inside = False
            runs.append((start, cross(p, i, True)))
    if inside:
        runs.append((start, p[-1][0]))
    return runs


def row(lum, l, t, corner, deg):
    p = profile(lum, l, t, corner, deg)
    runs = structure(p)
    if not runs:
        return None
    ri, ro = runs[0]
    gap, bar_i = None, None
    if len(runs) > 1:
        bar_i = runs[1][0]
        gap = bar_i - ro
    return {'deg': deg, 'ri': ri, 'ro': ro, 'th': ro - ri, 'gap': gap, 'nruns': len(runs)}


def fit_circle(pts):
    """최소자승 원 피팅(Kasa) → (cx, cy, R, rms)."""
    n = len(pts)
    Sx = sum(x for x, _ in pts)
    Sy = sum(y for _, y in pts)
    Sxx = sum(x * x for x, _ in pts)
    Syy = sum(y * y for _, y in pts)
    Sxy = sum(x * y for x, y in pts)
    Sxxx = sum(x * x * x for x, _ in pts)
    Syyy = sum(y * y * y for _, y in pts)
    Sxyy = sum(x * y * y for x, y in pts)
    Sxxy = sum(x * x * y for x, y in pts)
    A = [[2 * (Sxx - Sx * Sx / n), 2 * (Sxy - Sx * Sy / n)],
         [2 * (Sxy - Sx * Sy / n), 2 * (Syy - Sy * Sy / n)]]
    B = [Sxxx + Sxyy - (Sxx + Syy) * Sx / n,
         Sxxy + Syyy - (Sxx + Syy) * Sy / n]
    det = A[0][0] * A[1][1] - A[0][1] * A[1][0]
    if abs(det) < 1e-9:
        return None
    cx = (B[0] * A[1][1] - B[1] * A[0][1]) / det
    cy = (A[0][0] * B[1] - A[1][0] * B[0]) / det
    rr = sum(math.hypot(x - cx, y - cy) for x, y in pts) / n
    rms = math.sqrt(sum((math.hypot(x - cx, y - cy) - rr) ** 2 for x, y in pts) / n)
    return cx, cy, rr, rms


def to_xy(corner, deg, r):
    a = math.radians(deg)
    if corner == 'BL':
        return (R - math.cos(a) * r, H - R + math.sin(a) * r)
    return (R - math.cos(a) * r, R - math.sin(a) * r)


def table(tag, lum, l, t, corner, degs):
    rows = [row(lum, l, t, corner, d) for d in degs]
    print('   %-3s %s — 링(채움에 맞닿은 검정)' % (tag, '좌하' if corner == 'BL' else '좌상'))
    print('     deg   ' + ' '.join('%5d' % d for d in degs))
    print('     r_o   ' + ' '.join(('%5.2f' % x['ro']) if x else '    -' for x in rows))
    print('     r_i   ' + ' '.join(('%5.2f' % x['ri']) if x else '    -' for x in rows))
    print('     두께  ' + ' '.join(('%5.2f' % x['th']) if x else '    -' for x in rows))
    print('     틈    ' + ' '.join(
        ('%5.2f' % x['gap']) if x and x['gap'] is not None else '  없음' for x in rows))
    return rows


def ell(rx, ry, d):
    a = math.radians(d)
    return 1.0 / math.sqrt((math.cos(a) / rx) ** 2 + (math.sin(a) / ry) ** 2)


def rms_of(model, obs):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(model, obs)) / len(obs))


def bias_table(tag, rows, ctl, corner):
    """대조군(순수 동심 원 링 r30)으로 자 자신의 각도 편향을 뺀다 — 남는 것이 진짜 모양이다."""
    degs, obs = [], []
    for x, c in zip(rows, ctl):
        # ⚠ 바 테두리와 «붙은» 각은 링 바깥면이 아니다(합쳐진 런의 바깥 끝은 바의 것) — 빼고 잰다.
        #    붙었는지는 두께로 안다: 규약 7 짜리 링이 8 을 넘으면 두 검정이 하나로 읽힌 것이다.
        if not x or not c or x['th'] >= 8.0:
            continue
        degs.append(x['deg'])
        obs.append(x['ro'] - (c['ro'] - R))
    if len(obs) < 6:
        return None
    print('     %s 대조군 보정 r_o  %s' % (tag, ' '.join('%5.2f' % v for v in obs)))
    best = None
    for ry in (30, 31, 32, 33, 34, 35):
        e = rms_of([ell(R, ry, d) for d in degs], obs)
        if best is None or e < best[1]:
            best = (ry, e)
    print('       모형 rms — 원 r30 %.3f · 타원 30/31~35 %s  ⇒ 최적 **30/%d (rms %.3f)**'
          % (rms_of([float(R)] * len(obs), obs),
             ' '.join('%.3f' % rms_of([ell(R, ry, d) for d in degs], obs) for ry in (31, 32, 33, 34, 35)),
             best[0], best[1]))
    return best


def main():
    capf = CAP7
    as_json = '--json' in sys.argv
    ctlf = None
    if '--cap' in sys.argv:
        capf = sys.argv[sys.argv.index('--cap') + 1]
    if '--ctl' in sys.argv:
        ctlf = sys.argv[sys.argv.index('--ctl') + 1]

    ref, _, _ = load(REF7)
    cap, _, _ = load(capf)
    ctl = load(ctlf)[0] if ctlf else None
    rl, rt = BOX['ref']
    cl, ct = BOX['cap']

    print('\n══════ 409-d — 링의 «바깥 반지름» 이 각도에 대해 상수인가 (동심인가) ══════')
    print(' 07 스킬 시트 활성 알약 «스킬» · 알약 **속**(r14)에서 바깥(r44)으로 훑는다 · 임계 휘도 %.0f' % TH)
    print(' 0° = 좌변 한복판 · 90° = 하/상변 한복판 · r 은 코너 원 중심(로컬 30,%d) 기준' % (H - R))
    print(' 동심 링이면 r_o 가 각도와 무관하게 일정하다. «틈» = 링 바깥면 ↔ 바 테두리 검정 사이 밝은 구간.')

    res = {}
    for corner in ('BL', 'TL'):
        print('\n ⓐ %s 코너' % ('좌하' if corner == 'BL' else '좌상'))
        rr = table('ref', ref, rl, rt, corner, DEGS)
        cr = table('cap', cap, cl, ct, corner, DEGS)
        res[corner] = {'ref': rr, 'cap': cr}
        if ctl:
            # 대조군은 «순수한 동심 원 링» 이므로 그 자체가 자의 편향이다(제품 상자와 같은 소수 좌표).
            kr = [row(ctl, cl, ct, corner, d) for d in DEGS]
            bias_table('ref', rr, kr, corner)
            bias_table('cap', cr, kr, corner)

        # 원 피팅 — 셸 검정과 붙은 각(틈 0)은 «링 바깥면» 이 아니므로 뺀다.
        for tag, rows in (('ref', rr), ('cap', cr)):
            pts_o = [to_xy(corner, x['deg'], x['ro']) for x in rows
                     if x and x['gap'] is not None and x['gap'] > 0.6]
            pts_i = [to_xy(corner, x['deg'], x['ri']) for x in rows if x]
            fo = fit_circle(pts_o) if len(pts_o) >= 4 else None
            fi = fit_circle(pts_i) if len(pts_i) >= 4 else None
            print('     %s 원 피팅  바깥 %s   안쪽 %s'
                  % (tag,
                     ('R %.2f (중심 %.2f,%.2f · rms %.2f · n=%d)' % (fo[2], fo[0], fo[1], fo[3], len(pts_o)))
                     if fo else '표본 부족',
                     ('R %.2f (중심 %.2f,%.2f · rms %.2f · n=%d)' % (fi[2], fi[0], fi[1], fi[3], len(pts_i)))
                     if fi else '표본 부족'))
            res[corner][tag + '_fit'] = {'out': fo, 'in': fi}

    print('\n ⓑ 판정')
    for corner in ('BL', 'TL'):
        for tag in ('ref', 'cap'):
            rows = [x for x in res[corner][tag] if x]
            free = [x for x in rows if x['gap'] is not None and x['gap'] > 0.6]
            if not free:
                continue
            ros = [x['ro'] for x in free]
            print('   %s %s  r_o %.2f~%.2f (폭 %.2f) · 자유각 %d개(0~%d°) · 두께 %.2f~%.2f'
                  % (corner, tag, min(ros), max(ros), max(ros) - min(ros),
                     len(free), max(x['deg'] for x in free),
                     min(x['th'] for x in free), max(x['th'] for x in free)))
    print()

    if as_json:
        print(json.dumps({k: {kk: vv for kk, vv in v.items() if not kk.endswith('_fit')}
                          for k, v in res.items()}, ensure_ascii=False))


main()
