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
# 사용:  python3 tools/probe384.py            (07 만)
#        python3 tools/probe384.py --all      (07 + 03)
from pydep937 import Image
import sys

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


def row(px, x0, y, n, step=1):
    return ''.join(cls(px[x0 + i * step, y]) for i in range(n))


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


def face_left(px, l, t, rel, run=6, n=44):
    """채움면(F) 좌 경계 인셋 — **런 기준**이다.
       JPEG 링잉이 한 픽셀짜리 F 를 아무 데나 뿌리므로 «F 가 run 개 연속으로 시작하는 x» 를 쓴다."""
    s = row(px, l, t + rel, n, 1)
    for i in range(n - run):
        if s[i:i + run] == 'F' * run:
            return i
    return None


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
        prof.append('-' if v is None else str(v))
        if v is not None:
            pts.append((v, rel))
    f = fit_circle(pts)
    print('   %-5s 인셋 %s' % (tag, ' '.join('%3s' % s for s in prof)))
    if f:
        print('   %-5s 자유 원 적합  r = **%.2f**  (rms %.3f · 표본 %d)' % ('', f[2], f[3], len(pts)))
    return f



def black_at(px, l, t, rel, n=34):
    """검정(K) 런 — 코너에서 «등폭 링인가 평행이동 밴드인가» 를 가르는 자.
       BC(1회차 비평가)가 이 값 하나로 ④ 를 5 로 깎았다."""
    s = row(px, l, t + rel, n, 1)
    i = s.find('K')
    if i < 0:
        return 0
    j = i
    while j < len(s) and s[j] == 'K':
        j += 1
    return j - i

def main():
    all_ = '--all' in sys.argv
    ref7, cap7 = load(REF7).load(), load(CAP7).load()

    rl, rr, rt = BOX['07']['ref']
    cl, cr, ct = BOX['07']['cap']

    print('\n══════ 384 재현 — 07 스킬 시트 활성 알약 «스킬» ══════')
    print(' 알약 상자  ref x %d..%d y %d..%d   cap x %d..%d y %d..%d  (h %d)'
          % (rl, rr, rt, rt + H - 1, cl, cr, ct, ct + H - 1, H))
    print(' 팔레트  K 검정 · B 베벨#634F37(79) · F 채움면#4B3E2D(62) · D 바닥띠#413122(49) · R 셸림#705F4B · S 셸바닥')

    print('\n ⓐ 세로 한복판(rel 42) 가로 단면 — 좌변 안쪽 26px  [규약: K7 B7 F…]')
    print('   ref  %s   %s' % (row(ref7, rl, rt + 42, 26), fmt_runs(row(ref7, rl, rt + 42, 26))))
    print('   cap  %s   %s' % (row(cap7, cl, ct + 42, 26), fmt_runs(row(cap7, cl, ct + 42, 26))))

    print('\n ⓑ 가로 한복판 세로 단면 — 상변에서 아래로 26px  [규약: B7 F… ]')
    xc_r, xc_c = (rl + rr) // 2, (cl + cr) // 2
    print('   ref  %s' % ''.join(cls(ref7[xc_r, rt + i]) for i in range(26)))
    print('   cap  %s' % ''.join(cls(cap7[xc_c, ct + i]) for i in range(26)))
    print('   ref  하변에서 위로 26px  %s' % ''.join(cls(ref7[xc_r, rt + H - 1 - i]) for i in range(26)))
    print('   cap  하변에서 위로 26px  %s' % ''.join(cls(cap7[xc_c, ct + H - 1 - i]) for i in range(26)))

    print('\n ⓒ Q1·Q2 — «바닥 어두운 띠(D)가 코너를 감고 올라가는가»')
    print('   좌변 안쪽 30px 안의 D 픽셀 수 (rel 행별)')
    dr = dict(dark_wrap('ref', ref7, rl, rt))
    dc = dict(dark_wrap('cap', cap7, cl, ct))
    print('   rel  %s' % ' '.join('%3d' % r for r in range(52, 85)))
    print('   ref  %s' % ' '.join('%3d' % dr[r] for r in range(52, 85)))
    print('   cap  %s' % ' '.join('%3d' % dc[r] for r in range(52, 85)))
    print('   AX 가 잰 창(07-ref y2087..2104 = rel 60..77 · x rel 10..16):')
    print('     ref D 합 %d px · cap D 합 %d px'
          % (sum(row(ref7, rl + 10, rt + r, 7).count('D') for r in range(60, 78)),
             sum(row(cap7, cl + 10, ct + r, 7).count('D') for r in range(60, 78))))

    print('\n ⓓ Q3 — 좌 코너 구간의 클래스 런 (rel 52..84)')
    corner_table('ref', ref7, rl, rt, 'L', range(52, 85))
    print()
    corner_table('cap', cap7, cl, ct, 'L', range(52, 85))

    print('\n ⓔ 위 코너 구간의 클래스 런 (rel 0..20) — 위는 어떻게 감기는가')
    corner_table('ref', ref7, rl, rt, 'L', range(0, 21))
    print()
    corner_table('cap', cap7, cl, ct, 'L', range(0, 21))

    print('\n ⓕ 채움면(F) 좌 경계 — «자유 원 적합»(AZ 의 자). 아래 코너 = 384 가 손대는 자리')
    bot = list(range(56, 79))
    print('   rel  %s' % ' '.join('%3d' % r for r in bot))
    fr = face_arc('ref', ref7, rl, rt, bot)
    fc = face_arc('cap', cap7, cl, ct, bot)
    if fr and fc:
        print('   ⇒ 아래 코너  ref %.2f ↔ cap %.2f  (Δ %+.1f%%)' % (fr[2], fc[2], (fc[2] / fr[2] - 1) * 100))
    top = list(range(9, 32))
    print('\n   위 코너(384 는 안 건드린다 — 대조군)')
    print('   rel  %s' % ' '.join('%3d' % r for r in top))
    tr = face_arc('ref', ref7, rl, rt, top)
    tc = face_arc('cap', cap7, cl, ct, top)
    if tr and tc:
        print('   ⇒ 위 코너    ref %.2f ↔ cap %.2f  (Δ %+.1f%%)' % (tr[2], tc[2], (tc[2] / tr[2] - 1) * 100))

    print('\n ⓗ 검정 옆띠 두께 — 코너에서 등폭(ref)인가 평행이동(우리)인가')
    rr = list(range(56, 85, 2))
    print('   rel  %s' % ' '.join('%3d' % r for r in rr))
    print('   ref  %s' % ' '.join('%3d' % black_at(ref7, rl, rt, r) for r in rr))
    print('   cap  %s' % ' '.join('%3d' % black_at(cap7, cl, ct, r) for r in rr))

    print('\n ⓖ 요약 — 한 줄로 «얼마나 가까워졌나»')
    axw_r = sum(row(ref7, rl + 10, rt + r, 7).count('D') for r in range(60, 78))
    axw_c = sum(row(cap7, cl + 10, ct + r, 7).count('D') for r in range(60, 78))
    print('   AX 창(rel 60..77 × x rel 10..16) D 픽셀   ref %d ↔ cap %d   (수리 전 cap = 3)' % (axw_r, axw_c))
    ds, n = 0.0, 0
    for rel in range(56, 71):
        a, b = face_left(ref7, rl, rt, rel), face_left(cap7, cl, ct, rel)
        if a is not None and b is not None:
            ds += abs(a - b); n += 1
    if n:
        print('   채움면 좌 경계 평균 |Δ| (rel 56..70)        **%.1f px** / %d행   (수리 전 = 6.8)' % (ds / n, n))

    if all_:
        cap3 = load(CAP3).load()
        c3l, c3r, c3t = BOX['03']['cap']
        print('\n══════ 03 던전 페이지 — 우리 쪽 재현(활성 칸) ══════')
        print('   cap  rel 42 %s' % fmt_runs(row(cap3, c3l, c3t + 42, 26)))
        corner_table('cap03', cap3, c3l, c3t, 'L', range(52, 85))

    print()


main()
