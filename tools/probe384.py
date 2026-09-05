# 작업 384 — «활성 알약의 좌·우 밴드가 코너를 안 따라간다» 를 **찍힌 픽셀로 재현**하는 재현기.
#
#   338 규칙: 등재문의 처방(ⓐ border+스프레드 / ⓑ 코너를 도는 그림)을 따르기 전에 먼저 재현한다.
#   341·350 이 그 규칙으로 «가설 기각» 을 두 번 냈다 — 여기서도 먼저 묻는다:
#     Q1. ref 의 바닥 어두운 띠(#413122·레벨 49)는 정말 코너를 «감고 올라가는가»? 어디까지?
#     Q2. 우리 캡처의 같은 자리는 정말 0px 인가? 무엇이 그 자리를 덮고 있는가?
#     Q3. 우리 옆띠(검정 7 + 베벨 7)는 코너에서 «세로 직선» 인가, 아니면 반경을 따라가는가?
#         (`box-shadow:inset 7px 0 0` 은 패딩 상자에 클리핑되므로 «직선» 이 자명하지 않다.)
#
#   좌표계: 서브탭 바는 하단 앵커(335 정오표) — cap_y = ref_y − 60. 가로는 1:1.
#   표본은 352 가 쓰던 것과 같은 자리다(07 스킬 시트 = ref·우리 둘 다 가운데 칸이 활성).
#     ref 알약 x 292..551 · y 2027..2111 (h 85)   cap 알약 x 291..551 · y 1967..2051
#
# ⚑⚑ 958 1회차 (2026-09-05) — **이 자의 «두께» 와 «인셋» 이 승자독식 런이었다.**
#   `black_at()` 은 최근접 팔레트 문자열에서 «K 가 몇 글자 이어지는가» 를 세고
#   `face_left()` 는 «F 가 run 개 이어지기 시작하는 글자 번호» 를 돌려준다 —
#   둘 다 표본 하나를 **이긴 색에 통째로** 주므로 값이 언제나 **정수**다.
#   ref 는 JPEG 이라 층 경계가 2~3px 번지고 cap 은 PNG 라 칼같으므로, 같은 참값 7.0 을
#   **번진 쪽만 얇게** 읽는다 — 1:1 인데도 ref 만 다르게 읽히는 그 얼굴(932 §ⓑ · 갈래 B).
#   판정값이 3~7px 이라 그 1.0px 이 곧 ±14~33% 다.
#   ⚑⚑ **등재문의 처방(`probe409g.runs_from`)은 재현이 기각했다** — 이 자의 걸음이 1px 이라
#     그 자의 «경사면 접기» 가 원리적으로 한 번도 안 돈다. 상세·실측은 `why_not_runs_from()`.
#   ⇒ 932 처방 **ⓐ(문턱 교차 보간)** 로 갔다 — 두께는 «화소 개수» 가 아니라 **두 모서리의 차**로,
#     인셋은 고른 런의 **시작 모서리**로 낸다. 문턱은 층 쌍마다 **설계 밝기의 한복판**이다
#     (한복판이 아니면 번진 판에서만 밀려 새 비대칭이 생긴다).
#   ⚠ **표본 자리·개수·`cls()` 분류·창(26·30·34·44)·걸음 1px·«어느 런인가» 고르는 규칙은
#     한 칸도 안 건드렸다** — `--int` 가 옛 값을 글자까지 되살리고, 두 모드의
#     **클래스 글자줄이 완전히 같다**(ⓐⓑⓓⓔ 의 런 표는 두 모드에서 한 글자도 안 다르다).
#
# 사용:  python3 tools/probe384.py [--int] [--all]   (07 만 / --all 이면 07 + 03)
#        python3 tools/probe384.py --physics         (합성 재현 — 그림도 브라우저도 안 쓴다)
import os
import sys
from pydep937 import Image
from probe409g import phys_cols   # 재현용 «판을 그리는 셈» 하나만 빌린다(사본 0).
                                  # 같은 파일의 층 셈은 이 자에 못 쓴다 — 아래 `why_not_runs_from`.

REF7, CAP7 = 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png'
REF3, CAP3 = 'docs/ref/03-던전-팝업.jpg', 'docs/review/96-full-dun.png'

# 알약 상자 — 352 가 확정한 값(§3·§10). 세로는 하단 앵커 −60.
BOX = {
    '07': dict(ref=(292, 551, 2027), cap=(291, 551, 1967)),
    # 03 은 209 로 3칸이 됐고 **오른쪽 칸(레이드)이 활성**이라 ref 와 자리가 1:1 이 아니다.
    # 그래서 여기서는 «우리 그림이 03 에서도 같은가»(AX 의 03 재현) 만 본다.
    '03': dict(ref=None, cap=(566, 825, 1967)),
}
H = 85

# 부품 팔레트 — 알약이 쓰는 네 색 + 셸 쪽 두 색.
PAL = [
    ('K', (0, 0, 0)),          # 검정 테두리
    ('B', (99, 79, 55)),       # 베벨 #634F37 (레벨 79)
    ('F', (75, 62, 45)),       # 채움면 #4B3E2D (레벨 62)
    ('D', (65, 49, 34)),       # 바닥 어두운 띠 #413122 (레벨 49)
    ('R', (112, 95, 75)),      # 셸 안쪽 밝은 림 #705F4B
    ('S', (43, 35, 26)),       # 셸 바닥(비활성 칸 배경) — 실측으로 채운다
]


def load(p):
    return Image.open(p).convert('RGB')


def cls(c, pal=PAL):
    """가장 가까운 팔레트 글자. JPEG 링잉 때문에 «정확한 색» 이 아니라 최근접으로 읽는다."""
    best, bd = '?', 1 << 30
    for ch, rc in pal:
        d = sum((int(a) - int(b)) ** 2 for a, b in zip(c, rc))
        if d < bd:
            best, bd = ch, d
    return best


def lvl(c):
    return round(sum(c) / 3)


MODE = 'int' if '--int' in sys.argv else 'cov'   # 958 1회차 — 옛 자는 `--int` 로 산다


def row_cols(px, x0, y, n, step=1):
    """같은 행의 **표본 색**을 그대로 돌려준다(958 1회차 — 표본 자리는 `row` 와 한 글자도 다르지 않다).
       클래스 문자열은 이 색줄을 `cls()` 로 옮긴 것이므로 두 자가 같은 자리를 본다."""
    return [px[x0 + i * step, y] for i in range(n)]


def row(px, x0, y, n, step=1):
    return ''.join(cls(c) for c in row_cols(px, x0, y, n, step))


def hexrow(px, x0, y, n, step=1):
    return ' '.join('%02X' % lvl(px[x0 + i * step, y]) for i in range(n))


def runs(s):
    """'KKKBBBFFF' → [('K',3),('B',3),('F',3)]"""
    out = []
    for ch in s:
        if out and out[-1][0] == ch:
            out[-1][1] += 1
        else:
            out.append([ch, 1])
    return [(a, b) for a, b in out]


def fmt_runs(s):
    return ' '.join('%s%d' % (a, b) for a, b in runs(s))


def corner_table(tag, px, l, t, side='L', rows=range(0, 85), n=26):
    """알약 좌(또는 우) 변에서 안쪽으로 n px 를 클래스 문자열로 찍는다."""
    print('   %s  %s변 안쪽 %dpx (rel 행 → 클래스 런)' % (tag, '좌' if side == 'L' else '우', n))
    for rel in rows:
        y = t + rel
        s = row(px, l, y, n, 1) if side == 'L' else row(px, l, y, n, -1)
        print('     rel %2d  %s   %s' % (rel, s, fmt_runs(s)))


def dark_wrap(tag, px, l, t, n=30):
    """Q1/Q2 — 각 행에서 «바닥 어두운 띠 색(D)» 이 좌변 안쪽 n px 안에 몇 px 있는가."""
    out = []
    for rel in range(0, H):
        s = row(px, l, t + rel, n, 1)
        out.append((rel, s.count('D')))
    return out


LVL = {ch: sum(rgb) / 3.0 for ch, rgb in PAL}   # 설계 밝기 — 문턱을 «두 층의 한복판» 에 세우는 데만 쓴다


def _lum(c):
    return (c[0] + c[1] + c[2]) / 3.0


def _side(rs, ri, d):
    """런 목록 `rs` 의 ri 번째 런에서 d(−1 바깥 / +1 안쪽) 쪽으로 나아가며
       **두께 ≥2 인 첫 다른 런**의 클래스. 한 칸짜리 런은 링잉·경사면이라 층으로 안 센다
       (옛 `face_left` 가 «F 가 6개 연속» 으로 이미 쓰던 그 규칙이다)."""
    j = ri + d
    while 0 <= j < len(rs):
        if rs[j][1] >= 2:
            return rs[j][0]
        j += d
    j = ri + d
    return rs[j][0] if 0 <= j < len(rs) else None


def _cross(cols, i, cha, chb, span=3):
    """표본 i−1(층 a) ↔ i(층 b) 사이 경계의 **부분 화소 자리** — 옛 자와 같은 좌표계다
       («i 번째 화소가 층 b 의 첫 화소» = 경계 x = i · 표본 중심은 i+0.5).

    ⚑⚑ 958 1회차 — **정의는 한 글자도 안 바꾸고 걸음만 정수에서 부분 화소로 간다.**
      선례는 저장소 안에 여럿이다(`probe866._cross`(932 4회차) · `probe409f`(942 4회차) ·
      `probe409g.row_edge`) — 전부 «같은 밝기·같은 문턱의 교차점 선형 보간» 이고 여기도 그대로다.
    ⚠ **문턱은 반드시 두 층 설계 밝기의 «한복판»** 이어야 한다. 한복판이 아니면 번진 판에서만
      교차점이 밀려(칼같은 판은 계단이라 T 와 무관하게 화소 경계에 선다) **새 비대칭**이 생긴다 —
      이 자가 고치려는 바로 그 병이다. 그래서 양쪽 문턱을 층마다 따로 세운다
      (K↔S 는 17.4 · K↔D 는 24.7 — 한 값으로 뭉치면 한쪽이 밀린다)."""
    la, lb = LVL.get(cha), LVL.get(chb)
    if la is None or lb is None or abs(la - lb) < 1e-9:
        return float(i)
    T = (la + lb) / 2.0
    best = None
    for j in range(max(0, i - 1 - span), min(len(cols) - 1, i + span)):
        v1, v2 = _lum(cols[j]), _lum(cols[j + 1])
        if (v1 - T) * (v2 - T) <= 0 and v1 != v2:
            x = (j + 0.5) + (v1 - T) / (v1 - v2)
            if best is None or abs(x - i) < abs(best - i):
                best = x
    return float(i) if best is None else best


def _runspan(s):
    """클래스 문자열 → [(클래스, 길이, 시작 index)] — 옛 `runs` 에 시작 자리만 얹었다."""
    out, i = [], 0
    for ch, n in runs(s):
        out.append((ch, n, i))
        i += n
    return out


def face_left(px, l, t, rel, run=6, n=44, mode=None):
    """채움면(F) 좌 경계 인셋 — **런 기준**이다.
       JPEG 링잉이 한 픽셀짜리 F 를 아무 데나 뿌리므로 «F 가 run 개 연속으로 시작하는 x» 를 쓴다.

       ⚑ 958 1회차 — 그 «런» 이 곧 승자독식이라 인셋이 언제나 정수였다.
       **고르는 규칙(어느 런인가)은 한 글자도 안 바꾸고**, 고른 런의 «시작 자리» 만
       문턱 교차 보간으로 낸다(932 처방 ⓐ · 경계 위치 축)."""
    m = MODE if mode is None else mode
    s = row(px, l, t + rel, n, 1)
    i = None
    for k in range(n - run):
        if s[k:k + run] == 'F' * run:
            i = k
            break
    if i is None or m == 'int':
        return i
    rs = _runspan(s)
    ri = next(q for q, r in enumerate(rs) if r[2] == i)
    return _cross(row_cols(px, l, t + rel, n, 1), i, _side(rs, ri, -1), 'F')


def fit_circle(pts):
    """(x,y) 점들에 자유 원 적합(대수적 최소제곱) → (cx, cy, r, rms).
       AZ 가 «채움면 코너 반경» 을 잰 방식과 같은 자다 — 모델(반경 상수)을 안 가정한다."""
    n = len(pts)
    if n < 4:
        return None
    Sx = sum(p[0] for p in pts); Sy = sum(p[1] for p in pts)
    Sxx = sum(p[0] * p[0] for p in pts); Syy = sum(p[1] * p[1] for p in pts)
    Sxy = sum(p[0] * p[1] for p in pts)
    Sxxx = sum(p[0] ** 3 for p in pts); Syyy = sum(p[1] ** 3 for p in pts)
    Sxyy = sum(p[0] * p[1] * p[1] for p in pts); Sxxy = sum(p[0] * p[0] * p[1] for p in pts)
    A = n * Sxx - Sx * Sx
    B = n * Sxy - Sx * Sy
    C = n * Syy - Sy * Sy
    D = 0.5 * (n * Sxyy - Sx * Syy + n * Sxxx - Sx * Sxx)
    E = 0.5 * (n * Sxxy - Sy * Sxx + n * Syyy - Sy * Syy)
    den = A * C - B * B
    if abs(den) < 1e-9:
        return None
    cx = (D * C - B * E) / den
    cy = (A * E - B * D) / den
    r = sum(((p[0] - cx) ** 2 + (p[1] - cy) ** 2) ** .5 for p in pts) / n
    rms = (sum((((p[0] - cx) ** 2 + (p[1] - cy) ** 2) ** .5 - r) ** 2 for p in pts) / n) ** .5
    return cx, cy, r, rms


def face_arc(tag, px, l, t, rows):
    pts, prof = [], []
    for rel in rows:
        v = face_left(px, l, t, rel)
        prof.append('-' if v is None else ('%d' % v if MODE == 'int' else '%.2f' % v))
        if v is not None:
            pts.append((v, rel))
    f = fit_circle(pts)
    print('   %-5s 인셋 %s' % (tag, ' '.join('%5s' % s for s in prof)))
    if f:
        print('   %-5s 자유 원 적합  r = **%.2f**  (rms %.3f · 표본 %d)' % ('', f[2], f[3], len(pts)))
    return f



def black_at(px, l, t, rel, n=34, mode=None):
    """검정(K) 런 — 코너에서 «등폭 링인가 평행이동 밴드인가» 를 가르는 자.
       BC(1회차 비평가)가 이 값 하나로 ④ 를 5 로 깎았다.

       ⚑ 958 1회차 — 고르는 규칙은 옛 자 그대로 **«처음 나오는 K»** 다(이 창은 알약 좌변
       바깥에서 시작하므로 첫 검정이 곧 옆띠다 — 409 의 광선과 달리 셸 테두리를 안 지난다).
       바뀐 것은 그 런의 **두 모서리를 어디에 세우는가** 뿐이다 — 두께를 «화소 개수» 로
       세는 대신 **양 끝 경계의 차**로 낸다(932 처방 ⓐ · `probe866` 이 «테 = 두 모서리의 차»
       로 같은 판정을 내린 자리)."""
    m = MODE if mode is None else mode
    s = row(px, l, t + rel, n, 1)
    i = s.find('K')
    if i < 0:
        return 0 if m == 'int' else 0.0
    j = i
    while j < len(s) and s[j] == 'K':
        j += 1
    if m == 'int':
        return j - i
    cols = row_cols(px, l, t + rel, n, 1)
    rs = _runspan(s)
    ri = next(q for q, r in enumerate(rs) if r[2] == i)
    lo = _cross(cols, i, _side(rs, ri, -1) or 'S', 'K')
    hi = _cross(cols, j, 'K', _side(rs, ri, +1) or 'D')
    return hi - lo

def physics():
    """⚑ 958 1회차 재현 — **그림도 브라우저도 안 쓴다.** 같은 참값 층더미를
       «칼같은 판»(cap = PNG)과 «번진 판»(ref = JPEG · σ 1.1px)으로 그려 두 자로 읽는다.
       판을 그리는 셈은 `probe409g.phys_cols` 하나뿐이다(사본 0 · 942 3회차 규약).
       ⚠ 층 차례는 **이 자가 ref 코너 행에서 실제로 읽는 것 그대로**다 —
       ⓓ 의 코너 행 원문이 `S… K? D? B?…` 라 K 다음은 베벨이 아니라 **바닥 어두운 띠 D** 이고,
       그 사이에 «없는 층» S 가 선다(942 5회차가 차례를 잘못 세워 재현이 한 번 죽은 자리)."""
    print('\n══════ 384 «두께·인셋 자» 재현 (958 1회차) — 합성 판 ══════')
    print(' 참값 층더미  S6.0 K?.? D4.0 B7.0 F10.0  ·  옛 자 = 화소 개수 · 새 자 = 문턱 교차 보간(ⓐ)')
    print(' 걸음은 이 자의 것 그대로 **1px** 다(409 의 0.5 가 아니다 — 가로 행은 화소 걸음이다).')
    print(' ⚠ **위상 6개를 평균한다** — 참 경계가 화소 격자 어디에 앉느냐로 정수 자의 오차가')
    print('   0 에서 1 까지 오가므로, 한 위상만 보면 어느 쪽으로든 결론이 뒤집힌다(932 [3] 규약).')
    PH = [i / 6.0 for i in range(6)]

    def read(k, ph):
        """참값 층더미를 위상 ph 만큼 밀어 두 판으로 그리고, **진짜 자**로 읽는다."""
        cols = phys_cols(widths=(('S', 6.0 + ph), ('K', k), ('D', 4.0), ('B', 7.0), ('F', 10.0)),
                         sig=1.1, step=1.0)
        out = {}
        for w in ('cap', 'ref'):
            pl, ln = _Plate(cols[w]), len(cols[w])
            out[w] = dict(
                int=(float(black_at(pl, 0, 0, 0, n=ln, mode='int')),
                     _f(face_left(pl, 0, 0, 0, run=6, n=ln, mode='int'))),
                cov=(float(black_at(pl, 0, 0, 0, n=ln, mode='cov')),
                     _f(face_left(pl, 0, 0, 0, run=6, n=ln, mode='cov'))))
        return out

    tab = {k: [read(k, ph) for ph in PH] for k in (7.0, 6.0, 5.0, 4.0, 3.0, 2.0)}

    def stat(k, mode, axis, truth):
        """(판 사이 최대 |Δ| · 번진 판 **부호** 평균 편향).
           ⚠ 판정을 지는 것은 **부호 편향**이다 — 칼같은 판은 경계가 계단이라 어느 자로 재도
           ±0.5 를 못 넘고(942 4회차 [9-d]), 그 ±0.5 가 «판 사이 |Δ|» 에 그대로 섞인다.
           이 자가 고치려는 병은 «번진 쪽만 한 방향으로 깎인다» 이므로 부호 평균이 과녁이다."""
        vals = []
        for ph, r in zip(PH, tab[k]):
            a, b = r['cap'][mode][axis], r['ref'][mode][axis]
            if a == a and b == b:
                vals.append((a, b, truth(ph)))
        gap = max(abs(b - a) for a, b, _ in vals)
        bias = sum(b - t for _, b, t in vals) / len(vals)
        return gap, bias

    def worst(vs):
        return max(vs, key=abs)

    KS = (7.0, 6.0, 5.0, 4.0, 3.0, 2.0)
    print('\n ⓐ 검정 옆띠 두께(`black_at`) — 위상 6개 · 참값 = K')
    print('  참K   자    판사이 최대|Δ|   번진 판 부호평균')
    A = {}
    for k in KS:
        for mode in ('int', 'cov'):
            A[(k, mode)] = stat(k, mode, 0, lambda ph, k=k: k)
            print('  %4.1f  %-4s  %8.2f        %+8.3f' % (k, mode, A[(k, mode)][0], A[(k, mode)][1]))
    band = [k for k in KS if k >= 4.0]     # 판정값 대역(옆띠 ≈7px · 코너에서 4 까지)
    print('  ⇒ **판정 대역(K ≥ 4) 부호 편향  옛 %+.3f → 새 %+.3f px**  (판 사이 |Δ| %.2f → %.2f)'
          % (worst([A[(k, 'int')][1] for k in band]), worst([A[(k, 'cov')][1] for k in band]),
             max(A[(k, 'int')][0] for k in band), max(A[(k, 'cov')][0] for k in band)))
    print('  ⚠ K ≤ 3 은 «못 고친 것» 이 아니라 **분해 한계**다 — σ1.1px 번짐에서 2px 검정은')
    print('     고원에 못 닿아 두 문턱이 서로를 향해 밀린다(옛 자도 −1.00). 아래 ⓒ 가 그 자리를 든다.')

    print('\n ⓑ 채움면 좌 경계 인셋(`face_left`) — 위상 6개 · 참 인셋 = S+ph + K + D + B')
    print('  참K   자    판사이 최대|Δ|   번진 판 부호평균')
    B = {}
    for k in band:
        for mode in ('int', 'cov'):
            B[(k, mode)] = stat(k, mode, 1, lambda ph, k=k: 6.0 + ph + k + 4.0 + 7.0)
            print('  %4.1f  %-4s  %8.2f        %+8.3f' % (k, mode, B[(k, mode)][0], B[(k, mode)][1]))
    print('  ⇒ **부호 편향  옛 %+.3f → 새 %+.3f px**'
          % (worst([B[(k, 'int')][1] for k in band]), worst([B[(k, 'cov')][1] for k in band])))

    print('\n ⓒ 지문 — 옛 자의 값은 예외 없이 정수, 새 자는 **번진 판에서** 그 격자에서 풀린다')
    print('   ⚠ **칼같은 판은 새 자도 정수가 맞다** — 경계가 계단이면 부분 화소 정보가 애초에')
    print('     없다(942 4회차 [9-d]). 격자에서 풀려야 하는 것은 번진 쪽이다.')
    for w in ('cap', 'ref'):
        for m in ('int', 'cov'):
            vs = [v for k in tab for r in tab[k] for a in (0, 1)
                  if (v := r[w][m][a]) == v]
            print('   %s %-4s  정수 %d/%d' % (w, m,
                  sum(1 for v in vs if abs(v - round(v)) < 1e-9), len(vs)))
    print()


def _f(v):
    return float('nan') if v is None else float(v)


class _Plate:
    """합성 판을 «그림처럼» 읽게 하는 얇은 껍데기 — 재현이 **진짜 자**(`black_at`·`face_left`)를
       그대로 부른다(사본 0). 판을 그리는 셈은 `probe409g.phys_cols` 하나뿐이다."""

    def __init__(self, cols):
        self.cols = cols

    def __getitem__(self, xy):
        x = xy[0]
        return self.cols[min(max(x, 0), len(self.cols) - 1)]


def why_not_runs_from():
    """⚑⚑ **등재문의 처방을 재현이 기각한 자리** — 958 1회차.

    958 등재문(942 5회차 §ⓘ 표)은 이 자를 «팔레트 분류라 `probe409g.runs_from` 을 부르면 된다
    (가장 짧은 길)» 로 적었다. 그 길을 먼저 갔고, **합성 판이 그것을 기각했다**:
    이 자의 걸음은 **1px** 인데(409 계열은 0.5px), `runs_from` 의 ② 접기는
    «경사면은 사영 t 가 **훑는다**»(`PH_T` 0.30)로 진짜 층과 경사면을 가른다.
    표본이 **한 개**뿐인 런은 t 훑음이 **항상 0** 이라 그 조건을 원리적으로 못 넘는다
    ⇒ 1px 걸음에서는 접기가 **한 번도 안 돈다**. 실측(참값 S6 K7 D4 B7 F10 · σ1.1):

        ref  SSSSSSKKKKKKKSDDFBBBBBBBFFFFFFFFFF
        runs_from · cov 모드  S6.59 **K6.41** S1.21 D1.75 F2.07 B6.34 F9.63

    K↔D 경사면이 세운 «없는 층» `S1.21` 이 그대로 남아 K 의 몫을 가져간다 —
    번진 판만 −0.59px(칼같은 판은 7.00) 라 **고치려던 그 비대칭이 그대로 남는다**.
    접기를 1표본에도 열면 K↔B 선분 위에 있는 **진짜 1px D 층**을 먹는다(942 1회차 [2-d]).
    ⇒ 그래서 이 자는 932 처방 **ⓐ(문턱 교차 보간)** 로 갔다 — `probe866` 이 «테 = 두 모서리의
    차» 로 같은 판정을 내린 자리이고(경계 위치 축), 두 모서리를 **각각 그 층 쌍의 한복판**
    문턱으로 세우므로 번짐이 대칭인 한 편향이 0 이다.
    ⚑ **남은 다섯 자에게**: `scan335`·`scanA4`·`scanA4b` 도 1px 걸음의 문턱 런이다 —
    표에 적힌 대로 ⓐ/ⓑ 로 가고, 팔레트 길(`runs_from`)은 **걸음이 0.5px 인 자에게만** 쓸 수 있다."""
    return True


def main():
    if '--physics' in sys.argv:
        physics()
        return
    all_ = '--all' in sys.argv
    ref7 = load(REF7).load()
    # ⚠ 캡처 PNG 는 **커밋 금지 자산**(ROUTINE 서두)이라 없는 클론이 정상이다 —
    #   없으면 즉사하지 말고 **ref 절만** 돈다(942 2·3·4·5회차가 네 자에서 고친 그 얼굴로 **다섯째**다).
    cap7 = load(CAP7).load() if os.path.exists(CAP7) else None
    if cap7 is None:
        print('   (캡처 %s 없음 — ref 절만 돈다. 캡처는 `node tools/cap96.js` 계열이 만든다)' % CAP7)

    rl, rr, rt = BOX['07']['ref']
    cl, cr, ct = BOX['07']['cap']

    print('\n══════ 384 재현 — 07 스킬 시트 활성 알약 «스킬» ══════')
    print(' 알약 상자  ref x %d..%d y %d..%d   cap x %d..%d y %d..%d  (h %d)'
          % (rl, rr, rt, rt + H - 1, cl, cr, ct, ct + H - 1, H))
    print(' 팔레트  K 검정 · B 베벨#634F37(79) · F 채움면#4B3E2D(62) · D 바닥띠#413122(49) · R 셸림#705F4B · S 셸바닥')

    print('\n ⓐ 세로 한복판(rel 42) 가로 단면 — 좌변 안쪽 26px  [규약: K7 B7 F…]')
    print('   ref  %s   %s' % (row(ref7, rl, rt + 42, 26), fmt_runs(row(ref7, rl, rt + 42, 26))))
    if cap7:
        print('   cap  %s   %s' % (row(cap7, cl, ct + 42, 26), fmt_runs(row(cap7, cl, ct + 42, 26))))

    print('\n ⓑ 가로 한복판 세로 단면 — 상변에서 아래로 26px  [규약: B7 F… ]')
    xc_r, xc_c = (rl + rr) // 2, (cl + cr) // 2
    print('   ref  %s' % ''.join(cls(ref7[xc_r, rt + i]) for i in range(26)))
    if cap7:
        print('   cap  %s' % ''.join(cls(cap7[xc_c, ct + i]) for i in range(26)))
    print('   ref  하변에서 위로 26px  %s' % ''.join(cls(ref7[xc_r, rt + H - 1 - i]) for i in range(26)))
    if cap7:
        print('   cap  하변에서 위로 26px  %s' % ''.join(cls(cap7[xc_c, ct + H - 1 - i]) for i in range(26)))

    print('\n ⓒ Q1·Q2 — «바닥 어두운 띠(D)가 코너를 감고 올라가는가»')
    print('   좌변 안쪽 30px 안의 D 픽셀 수 (rel 행별)')
    dr = dict(dark_wrap('ref', ref7, rl, rt))
    print('   rel  %s' % ' '.join('%3d' % r for r in range(52, 85)))
    print('   ref  %s' % ' '.join('%3d' % dr[r] for r in range(52, 85)))
    if cap7:
        dc = dict(dark_wrap('cap', cap7, cl, ct))
        print('   cap  %s' % ' '.join('%3d' % dc[r] for r in range(52, 85)))
    print('   AX 가 잰 창(07-ref y2087..2104 = rel 60..77 · x rel 10..16):')
    print('     ref D 합 %d px%s'
          % (sum(row(ref7, rl + 10, rt + r, 7).count('D') for r in range(60, 78)),
             (' · cap D 합 %d px' % sum(row(cap7, cl + 10, ct + r, 7).count('D')
                                        for r in range(60, 78))) if cap7 else ''))

    print('\n ⓓ Q3 — 좌 코너 구간의 클래스 런 (rel 52..84)')
    corner_table('ref', ref7, rl, rt, 'L', range(52, 85))
    if cap7:
        print()
        corner_table('cap', cap7, cl, ct, 'L', range(52, 85))

    print('\n ⓔ 위 코너 구간의 클래스 런 (rel 0..20) — 위는 어떻게 감기는가')
    corner_table('ref', ref7, rl, rt, 'L', range(0, 21))
    if cap7:
        print()
        corner_table('cap', cap7, cl, ct, 'L', range(0, 21))

    print('\n ⓕ 채움면(F) 좌 경계 — «자유 원 적합»(AZ 의 자). 아래 코너 = 384 가 손대는 자리')
    bot = list(range(56, 79))
    print('   rel  %s' % ' '.join('%5d' % r for r in bot))
    fr = face_arc('ref', ref7, rl, rt, bot)
    fc = face_arc('cap', cap7, cl, ct, bot) if cap7 else None
    if fr and fc:
        print('   ⇒ 아래 코너  ref %.2f ↔ cap %.2f  (Δ %+.1f%%)' % (fr[2], fc[2], (fc[2] / fr[2] - 1) * 100))
    top = list(range(9, 32))
    print('\n   위 코너(384 는 안 건드린다 — 대조군)')
    print('   rel  %s' % ' '.join('%5d' % r for r in top))
    tr = face_arc('ref', ref7, rl, rt, top)
    tc = face_arc('cap', cap7, cl, ct, top) if cap7 else None
    if tr and tc:
        print('   ⇒ 위 코너    ref %.2f ↔ cap %.2f  (Δ %+.1f%%)' % (tr[2], tc[2], (tc[2] / tr[2] - 1) * 100))

    print('\n ⓗ 검정 옆띠 두께 — 코너에서 등폭(ref)인가 평행이동(우리)인가')
    rr = list(range(56, 85, 2))
    NUM = '%5.1f' if MODE == 'int' else '%5.2f'
    print('   rel  %s' % ' '.join('%5d' % r for r in rr))
    print('   ref  %s' % ' '.join(NUM % black_at(ref7, rl, rt, r) for r in rr))
    if cap7:
        print('   cap  %s' % ' '.join(NUM % black_at(cap7, cl, ct, r) for r in rr))

    print('\n ⓖ 요약 — 한 줄로 «얼마나 가까워졌나»')
    axw_r = sum(row(ref7, rl + 10, rt + r, 7).count('D') for r in range(60, 78))
    if cap7:
        axw_c = sum(row(cap7, cl + 10, ct + r, 7).count('D') for r in range(60, 78))
        print('   AX 창(rel 60..77 × x rel 10..16) D 픽셀   ref %d ↔ cap %d   (수리 전 cap = 3)' % (axw_r, axw_c))
    else:
        print('   AX 창(rel 60..77 × x rel 10..16) D 픽셀   ref %d   (cap 없음)' % axw_r)
    ds, n = 0.0, 0
    if cap7:
        for rel in range(56, 71):
            a, b = face_left(ref7, rl, rt, rel), face_left(cap7, cl, ct, rel)
            if a is not None and b is not None:
                ds += abs(a - b); n += 1
    if n:
        print('   채움면 좌 경계 평균 |Δ| (rel 56..70)        **%.1f px** / %d행   (수리 전 = 6.8)' % (ds / n, n))

    if all_ and os.path.exists(CAP3):
        cap3 = load(CAP3).load()
        c3l, c3r, c3t = BOX['03']['cap']
        print('\n══════ 03 던전 페이지 — 우리 쪽 재현(활성 칸) ══════')
        print('   cap  rel 42 %s' % fmt_runs(row(cap3, c3l, c3t + 42, 26)))
        corner_table('cap03', cap3, c3l, c3t, 'L', range(52, 85))

    print()


main()
