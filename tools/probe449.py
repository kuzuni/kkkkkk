# 작업 449 — **ref 쪽** 자. 끝 칸(378)의 «셸에 닿는 면» 이 코너에서 어떤 굵기인가.
#
#   python3 tools/probe449.py
#
# 338 규칙 — 처방 전에 «목표값» 을 ref 에서 직접 뽑는다. probe409.py 와 같은 자(코너 원 중심에서
# 각도 α 로 쏜 광선의 법선 런)이고, 다른 것은 **표본**뿐이다:
#
#   · probe409.py = `07-스킬-팝업.jpg` 의 **가운데 칸** (양면에 검정이 있다)
#   · 여기        = `03-던전-팝업.jpg` 의 **끝 칸 «던전»** — 저장소 안에서 «활성 끝 칸» 이 찍힌
#                   유일한 레퍼런스다. 그 오른쪽 면이 바 오른쪽 끝과 같은 자리라 검정을 셸에 넘긴다
#                   (측정표 03 §4-3 — 바 우 테두리 `#000000` 939~944 · 알약 안쪽 림 `#634F37` 932~937).
#     ⚠ `06-장비-팝업.jpg` 의 활성 첫 칸은 표본이 **아니다** — 그 알약은 바 왼쪽 끝 **밖으로**
#       삐져나와(x 54 ↔ 바 66) 좌·우 모두 검정 7 을 그대로 가진다(측정표 06 §4-3). 378 이 다루는
#       «닿는 면» 이 아니라 «넘치는 면» 이라 여기서 물으면 다른 것을 재게 된다.
#
# 좌표: 알약 자신의 윤곽(= 셸 검정의 **안쪽** 변)에서 안으로 읽는다. 우리 캡처에서는 `.stab.on`
# 상자의 변이 곧 그 자리이므로 probe449.js 의 d=0 과 같은 뜻이 된다.
from pydep937 import Image
from probe409g import runs_from, phys_cols   # 자의 알맹이는 저기 하나뿐이다(사본 0 · 942 3회차 규약)
import math
import sys

REF = 'docs/ref/03-던전-팝업.jpg'
MODE = 'int' if '--int' in sys.argv else 'cov'   # 958 3회차 — 옛 자는 `--int` 로 산다
PAL = [
    ('K', (0, 0, 0)),          # 검정
    ('B', (99, 79, 55)),       # 베벨 #634F37
    ('F', (75, 62, 45)),       # 채움면 #4B3E2D
    ('D', (65, 49, 34)),       # 바닥 어두운 띠 #413122
    ('R', (112, 95, 75)),      # 셸 안쪽 밝은 림 #705F4B
    ('S', (97, 80, 60)),       # 셸(트랙) #61503C
]
DEGS = [0, 15, 30, 45, 60, 75]
R = 30

LVL = {ch: sum(rgb) / 3.0 for ch, rgb in PAL}   # 설계 밝기 — 문턱을 «두 층의 한복판» 에 세우는 데만 쓴다


def cls(c):
    best, bd = '?', 1 << 30
    for ch, rc in PAL:
        d = sum((int(a) - int(b)) ** 2 for a, b in zip(c, rc))
        if d < bd:
            best, bd = ch, d
    return best


def _lum(c):
    return (c[0] + c[1] + c[2]) / 3.0


def _runspan(s):
    out, i = [], 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        out.append((s[i], j - i, i))
        i = j
    return out


def _side(rs, ri, d):
    """런 목록에서 d 쪽으로 나아가며 **두께 ≥2 인 첫 다른 런**의 클래스 —
       한 칸짜리 런은 경사면·링잉이라 층으로 안 센다(`probe384._side` 와 같은 규칙)."""
    j = ri + d
    while 0 <= j < len(rs):
        if rs[j][1] >= 2:
            return rs[j][0]
        j += d
    j = ri + d
    return rs[j][0] if 0 <= j < len(rs) else None


def _cross(cols, i, cha, chb, span=3):
    """표본 i−1(층 a) ↔ i(층 b) 경계의 **부분 화소 자리** — 표본 중심 좌표계다
       (대칭 경사면이면 정확히 `i − 0.5` 를 돌려주므로 옛 자의 «+0.5» 규약과 한 글자도 안 어긋난다).
       문턱은 **두 층 설계 밝기의 한복판**(한복판이 아니면 번진 판에서만 밀려 새 비대칭이 생긴다)."""
    la, lb = LVL.get(cha), LVL.get(chb)
    if la is None or lb is None or abs(la - lb) < 1e-9:
        return float(i) - 0.5
    T = (la + lb) / 2.0
    best = None
    for j in range(max(0, i - 1 - span), min(len(cols) - 1, i + span)):
        v1, v2 = _lum(cols[j]), _lum(cols[j + 1])
        if (v1 - T) * (v2 - T) <= 0 and v1 != v2:
            x = j + (v1 - T) / (v1 - v2)
            if best is None or abs(x - (i - 0.5)) < abs(best - (i - 0.5)):
                best = x
    return (float(i) - 0.5) if best is None else best


def runs(s, step=0.5):
    out = []
    i = 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        out.append((s[i], (j - i) * step))
        i = j
    return out


def first_solid(rs, mn=1.5):
    for ch, n in rs:
        if n >= mn:
            return ch, n
    return '-', 0.0


def ray_cols(px, cx, cy, ux, uy, depth=24.0, step=0.5):
    """광선 위 표본 **색**. 표본 자리·개수·걸음은 옛 자와 한 칸도 안 다르다 —
       바뀐 것은 그 색을 «이긴 글자» 로 접느냐(옛) 층으로 나누느냐(새) 뿐이다."""
    out, d = [], 0.0
    while d <= depth + 1e-9:
        x = cx + ux * (R - d)
        y = cy + uy * (R - d)
        out.append(px[int(round(x)), int(round(y))])
        d += step
    return out


def ray(px, cx, cy, ux, uy, depth=24.0, step=0.5):
    return ''.join(cls(c) for c in ray_cols(px, cx, cy, ux, uy, depth, step))


def ray_runs(px, cx, cy, ux, uy, depth=24.0, step=0.5, mode=None):
    """⚑ 958 3회차 — 광선의 층 두께. 걸음이 **0.5px** 이라 942 5회차가 `probe409` 에 쓴
       **팔레트 길**(`probe409g.runs_from`)이 여기서는 쓸 수 있다(958 1회차가 1px 걸음의
       `probe384` 에서 원리적으로 못 쓴다고 기각한 그 길이다 — 걸음을 먼저 본다).
       ⚠ 팔레트는 **이 자의 것**을 넘긴다 — 셸(트랙) `S` 가 409 계열과 다른 색(#61503C)이다."""
    m = MODE if mode is None else mode
    cols = ray_cols(px, cx, cy, ux, uy, depth, step)
    return runs_from(cols, mode=m, step=step, pal=PAL)


def hscan(px, y, x0, x1):
    """가로 단면의 클래스 런 — 알약 윤곽을 눈이 아니라 색으로 찾는다."""
    s = ''.join(cls(px[x, y]) for x in range(x0, x1))
    return runs(s, 1)


class _Plate:
    """합성 판을 «그림처럼» 읽게 하는 얇은 껍데기 — 재현이 진짜 셈을 그대로 부른다(사본 0)."""

    def __init__(self, cols):
        self.cols = cols

    def __getitem__(self, xy):
        x = xy[0]
        return self.cols[min(max(x, 0), len(self.cols) - 1)]


C = dict(PAL)


def _edge_read(pl, n, mode):
    """§1 과 **같은 걸음** — 오른쪽에서 첫 K 런을 찾아 그 «안쪽 모서리» 를 낸다.
       (합성 판은 왼쪽이 바깥이라 K 런의 **오른쪽** 끝이 안쪽 모서리다.)"""
    cols = [pl[i, 0] for i in range(n)]
    cs = ''.join(cls(c) for c in cols)
    rsp = _runspan(cs)
    ri = next((q for q, r in enumerate(rsp) if r[0] == 'K'), None)
    if ri is None:
        return float('nan')
    end = rsp[ri][2] + rsp[ri][1]          # K 런 다음 표본
    if mode == 'int':
        return (end - 1) + 0.5             # 옛 규약 — 마지막 K 표본 + 0.5
    return _cross(cols, end, 'K', _side(rsp, ri, +1) or 'B')


def physics():
    """⚑ 958 3회차 재현 — 그림도 브라우저도 안 쓴다. 축이 둘이라 판도 둘이다.

    ⓐ **광선 층 두께**(§3) — 걸음 0.5px · 942 5회차가 `probe409` 에 쓴 팔레트 길과 **같은 자**라
      그 재현(`python3 tools/probe409g.py --physics` · `verify942` §1)이 그대로 이 자의 재현이다.
      여기서는 «이 자도 그 자를 부른다» 를 값으로 보인다(사본 0).
    ⓑ **알약 윤곽·세로 모서리**(§1·§2) — 걸음 1px 의 정수 런이라 팔레트 길이 못 온다(958 1회차 기각).
      932 처방 ⓐ(문턱 교차 보간)로 갈았고, 아래가 그 재현이다."""
    from probe409g import physics as g_physics
    print('══════ 449 재현 (958 3회차) — 합성 판 ══════')
    print('\n ⓐ 광선 층 두께 — 걸음 0.5px · 알맹이는 `probe409g.runs_from`(942 5회차와 **같은 자**)')
    gp = g_physics()
    for mode in ('int', 'cov'):
        for who in ('cap', 'ref'):
            print('   %-4s %-4s %s' % (mode, who,
                  ' '.join('%s%.2f' % (c, n) for c, n in gp[mode][who])))
    print('   ⇒ 참값 S3 K7 D4 B7 — 옛 자는 번진 판에서 **없는 층**을 세우고(층 4 → 6) 새 자는 차례를 되찾는다.')

    print('\n ⓑ 알약 윤곽 모서리(§1·§2) — 참값 층더미  F 6+ph · K k · B 8.0 · F 10.0  (참 모서리 = 6+ph+k)')
    print('  참K   자    판사이 최대|Δ|   번진 판 부호평균')
    PH = [i / 6.0 for i in range(6)]
    out = {}
    for k in (7.0, 6.0, 5.0, 4.0):
        for mode in ('int', 'cov'):
            vals = []
            for ph in PH:
                cols = phys_cols(widths=((C['F'], 6.0 + ph), (C['K'], k), (C['B'], 8.0), (C['F'], 10.0)),
                                 sig=1.1, step=1.0)
                n = len(cols['cap'])
                a = _edge_read(_Plate(cols['cap']), n, mode)
                b = _edge_read(_Plate(cols['ref']), n, mode)
                if a == a and b == b:
                    vals.append((a, b, 6.0 + ph + k - 0.5))
            out[(k, mode)] = ((max(abs(b - a) for a, b, _ in vals),
                               sum(b - t for _, b, t in vals) / len(vals)) if vals
                              else (float('nan'), float('nan')))
            v = out[(k, mode)]
            print('  %4.1f  %-4s  %8.2f        %+8.3f' % (k, mode, v[0], v[1]))
    worst = lambda vs: max([v for v in vs if v == v] or [float('nan')], key=abs)
    KS = (7.0, 6.0, 5.0, 4.0)
    print('  ⇒ **부호 편향  옛 %+.3f → 새 %+.3f px**  (판 사이 |Δ| %.2f → %.2f)'
          % (worst([out[(k, 'int')][1] for k in KS]), worst([out[(k, 'cov')][1] for k in KS]),
             max(out[(k, 'int')][0] for k in KS), max(out[(k, 'cov')][0] for k in KS)))
    print('  ⚠ 참 모서리에 −0.5 를 얹은 것은 옛 자의 좌표 규약이다(«마지막 K 표본 + 0.5»)  — 정의를 안 바꿨다.')
    ints = {}
    for mode in ('int', 'cov'):
        for who, blur in (('cap', False), ('ref', True)):
            vs = []
            for k in KS:
                for ph in PH:
                    cols = phys_cols(widths=((C['F'], 6.0 + ph), (C['K'], k), (C['B'], 8.0), (C['F'], 10.0)),
                                     sig=1.1, step=1.0)
                    n = len(cols['cap'])
                    v = _edge_read(_Plate(cols['ref' if blur else 'cap']), n, mode)
                    if v == v:
                        vs.append(v)
            ints[(who, mode)] = (sum(1 for v in vs if abs(v * 2 - round(v * 2)) < 1e-9), len(vs))
    print('\n ⓒ 지문 — 옛 자의 값은 예외 없이 0.5 의 배수, 새 자는 **번진 판에서** 그 격자에서 풀린다')
    for who in ('cap', 'ref'):
        for mode in ('int', 'cov'):
            print('   %s %-4s  0.5배수 %d/%d' % (who, mode, *ints[(who, mode)]))
    print()


def main():
    if '--physics' in sys.argv:
        physics()
        return
    im = Image.open(REF).convert('RGB')
    px = im.load()
    print('══════ 449 ref 자 — 03 «던전»(활성 끝 칸)의 «셸에 닿는 면» ══════')

    # ── 1. 세로 한복판 가로 단면으로 알약 우측 윤곽을 찾는다 (측정표 03 §4-3 교차검증)
    ymid = 2069
    print('\n[1] 세로 한복판 y=%d 가로 단면 (x 900..950) — 셸 검정과 베벨의 경계를 찾는다' % ymid)
    rs = hscan(px, ymid, 900, 950)
    print('    ' + ' '.join('%s%d' % r for r in rs))
    # 오른쪽에서 첫 K 런의 **안쪽 변** = 알약 윤곽
    x = 949
    while x > 900 and cls(px[x, ymid]) != 'K':
        x -= 1
    kx1 = x
    while x > 900 and cls(px[x, ymid]) == 'K':
        x -= 1
    outline = x + 0.5          # 검정의 안쪽 변 = 알약 윤곽
    print('    셸 검정 %d..%d (%dpx) → 알약 윤곽 x = %.1f' % (x + 1, kx1, kx1 - x, outline))
    if MODE != 'int':
        # ⚑ 958 3회차 — «어느 런인가»(오른쪽에서 첫 K 런) 는 위 걸음이 그대로 골랐고,
        #   바뀐 것은 그 런의 **안쪽 모서리를 어디에 세우는가** 뿐이다(932 처방 ⓐ).
        cols = [px[q, ymid] for q in range(900, 950)]
        cs = ''.join(cls(c) for c in cols)
        rsp = _runspan(cs)
        i0 = x + 1 - 900                       # K 런의 첫 표본
        ri = next(q for q, r in enumerate(rsp) if r[2] == i0)
        outline = _cross(cols, i0, _side(rsp, ri, -1) or 'D', 'K') + 900
        print('    ▸ 부분화소 알약 윤곽 x = **%.2f**  (옛 자 %.1f)' % (outline, x + 0.5))

    # ── 2. 알약 상·하 윤곽 (세로 단면)
    xin = int(outline) - 60    # 알약 안쪽 한복판 열
    s = ''.join(cls(px[xin, y]) for y in range(2005, 2135))
    rr = runs(s, 1)
    print('\n[2] x=%d 세로 단면 (y 2005..2135)' % xin)
    print('    ' + ' '.join('%s%d' % r for r in rr))
    # 상·하 «검정 런»(= 바 테두리, 알약이 그 변을 공유한다 — 측정표 07 §9 · 378)의 **안쪽** 변이
    # 곧 알약 윤곽이다. 가장 긴 K 런 두 개를 위·아래에서 하나씩 고른다.
    acc, ks = 2005, []
    for ch, n in rr:
        if ch == 'K' and n >= 4:
            ks.append((acc, acc + n))
        acc += n
    top = ks[0][1]
    bot = ks[-1][0]
    print('    상·하 검정 런 %s → 알약 세로 %d..%d (h %d)' % (ks, top, bot, bot - top))
    if MODE != 'int':
        # 같은 규약 — 옛 자의 `top`(K 런 **다음** 표본 번호)·`bot`(K 런 **첫** 표본 번호)은
        # 대칭 경사면에서 교차점 + 0.5 와 같다. 그 +0.5 를 그대로 얹어 정의를 안 바꾼다.
        colv = [px[xin, q] for q in range(2005, 2135)]
        cv = ''.join(cls(c) for c in colv)
        rv = _runspan(cv)
        it = top - 2005                        # 위 K 런 다음 표본
        ib = bot - 2005                        # 아래 K 런 첫 표본
        rt = next(q for q, r in enumerate(rv) if r[2] + r[1] == it)
        rb = next(q for q, r in enumerate(rv) if r[2] == ib)
        top = _cross(colv, it, 'K', _side(rv, rt, +1) or 'B') + 0.5 + 2005
        bot = _cross(colv, ib, _side(rv, rb, -1) or 'B', 'K') + 0.5 + 2005
        print('    ▸ 부분화소 알약 세로 **%.2f..%.2f** (h **%.2f**)' % (top, bot, bot - top))

    # ── 3. 코너 광선
    for cor in ('TR', 'BR'):
        cy = (top + R) if cor[0] == 'T' else (bot - R)
        cx = outline - R
        print('\n[3] %s 코너 (중심 %.1f, %.1f · r %d)' % (cor, cx, cy, R))
        for dg in DEGS:
            a = math.radians(dg)
            ux = math.cos(a)
            uy = (1 if cor[0] == 'B' else -1) * math.sin(a)
            rs = ray_runs(px, cx, cy, ux, uy)
            ch, n = first_solid(rs)
            print('    %2d°  첫실런 %s%.2f   |  %s' % (dg, ch, n, ' '.join('%s%.2f' % r for r in rs[:8])))


if __name__ == '__main__':
    sys.exit(main())
