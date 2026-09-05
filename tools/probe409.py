# 작업 409 — «활성 알약의 검정 옆띠가 등폭 링인가, 가로 평행이동 밴드인가» 를 **각도로** 재는 자.
#
#   338 규칙: 처방(«면별 손잡이를 넷으로 쪼갠다») 을 따르기 전에 먼저 재현한다.
#   384 의 ⓗ 는 **가로 런**을 쟀다 — 가로 런은 코너에서 1/cosα 로 길어지므로 «등폭인가» 를
#   직접 묻지 못한다(BB 가 «대각 4.94 ↔ ref 7.08» 로 갈라 읽은 이유가 그것이다).
#   여기서는 **코너 원의 중심에서 각도 α 로 쏜 광선**을 따라 읽는다:
#     · 등폭 링이면  검정 두께(법선) = 7 이 α 와 무관하게 일정하다.
#     · 평행이동 밴드면 7·cos α 로 **얇아진다**(45° 에서 4.95 · 70° 에서 2.4).
#   그리고 «검정이 몇 도에서 끝나는가»(= 바닥 띠 D 로 넘어가는 각) 도 같이 낸다 —
#   CSS `border` 의 네 면 이음매는 **정확히 45°** 라, ref 가 45° 를 넘어 검정을 끌고 가는지가
#   처방(테두리 링 vs 그림자 링)을 가른다.
#
#   좌표계·표본은 probe384.py 와 같다(07 스킬 시트 · 하단 앵커 cap_y = ref_y − 60).
#
# ⚑⚑ 942 5회차 (2026-09-05) — **이 자의 «두께» 가 승자독식 런이었다.**
#   `sample()` 이 표본 하나를 «이긴 팔레트 색» 에 통째로 주므로 두께가 언제나 걸음(0.5)의 배수다.
#   ref 는 JPEG 이라 층 경계가 2~3px 번지고 cap 은 PNG 라 칼같으므로, 같은 참값 7.0 을
#   **번진 쪽만 얇게** 읽는다 — 1:1 인데도 ref 만 다르게 읽히는 그 얼굴(932 §ⓑ · 갈래 B).
#   판정값이 2~7px 이라 그 0.5~1.0px 이 곧 ±7~25% 다.
#   ⇒ 층 두께는 **`probe409g.runs_from`** 이 낸다(942 1회차가 세운 알맹이 · 사본 0):
#     ① 두 층 사이 경사면이 만든 «없는 층» 을 접고 ② 표본 몫을 이웃한 두 층에 비례로 나눈다.
#   ⚠ **표본 자리·개수·`cls()` 분류·창(밖 6 안 22)·걸음 0.5 는 한 칸도 안 건드렸다** —
#     `--int` 가 옛 값을 글자까지 되살리고, 두 모드의 **클래스 글자줄이 완전히 같다**.
#
# 사용:  python3 tools/probe409.py [--int] [--cap 파일] | --physics
import os
import sys
from pydep937 import Image
from probe409g import runs_from, phys_cols
import math

REF7, CAP7 = 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png'
BOX = {'ref': (292, 551, 2027), 'cap': (291, 551, 1967)}
H, R = 84, 30   # ⚠ 7회차 정정 — **84 다**(85 가 아니다). 제품에 직접 물어 확인:
                #    07 활성 «스킬» `getBoundingClientRect()` = 290.75, 1967, 261×84
                #    (`.stabs{height:98;border:7px}` → 콘텐츠 84) · ref 2027..2111 도 같은 84.
                #    1~6회차는 85 로 쟀고, 그러면 **아래** 코너 원 중심만 1px 내려앉아
                #    «접선으로 갈수록 검정이 가늘어진다» 는 가짜 테이퍼가 보인다(§16-1).

PAL = [
    ('K', (0, 0, 0)),          # 검정 테두리
    ('B', (99, 79, 55)),       # 베벨 #634F37
    ('F', (75, 62, 45)),       # 채움면 #4B3E2D
    ('D', (65, 49, 34)),       # 바닥 어두운 띠 #413122
    ('R', (112, 95, 75)),      # 셸 안쪽 밝은 림 #705F4B
    ('S', (43, 35, 26)),       # 셸 바닥
]


def cls(c):
    best, bd = '?', 1 << 30
    for ch, rc in PAL:
        d = sum((int(a) - int(b)) ** 2 for a, b in zip(c, rc))
        if d < bd:
            best, bd = ch, d
    return best


MODE = 'int' if '--int' in sys.argv else 'cov'   # 942 5회차 — 옛 자는 `--int` 로 산다


def sample(px, x, y):
    """이중선형 없이 최근접 — JPEG 링잉이 이미 ±1px 이라 보간이 정보를 안 늘린다."""
    return cls(px[int(round(x)), int(round(y))])


def ray_cols(px, l, t, corner, deg, out=6.0, inn=22.0, step=0.5):
    """같은 광선의 **표본 색**을 그대로 돌려준다(942 5회차 — 표본 자리는 `ray` 와 한 글자도 다르지 않다).
       클래스 문자열은 이 색줄을 `cls()` 로 옮긴 것이므로 두 자가 같은 자리를 본다."""
    a = math.radians(deg)
    if corner == 'BL':      # 좌하 — 중심 (R, H-R)
        cx, cy, ux, uy = R, H - R, -math.cos(a), math.sin(a)
    elif corner == 'TL':    # 좌상 — 중심 (R, R)
        cx, cy, ux, uy = R, R, -math.cos(a), -math.sin(a)
    else:
        raise ValueError(corner)
    cols, d = [], -out
    while d <= inn:
        # d < 0 = 윤곽 **바깥** · d > 0 = 안쪽. 광선은 항상 바깥 → 안쪽으로 읽는다.
        x, y = l + cx + ux * (R - d), t + cy + uy * (R - d)
        cols.append(px[int(round(x)), int(round(y))])
        d += step
    return cols


def ray(px, l, t, corner, deg, out=6.0, inn=22.0, step=0.5):
    """코너 원 중심에서 각도 deg(0=좌 정중앙 · 90=아래/위 정중앙) 방향으로
       바깥 out px 에서 안쪽 inn px 까지 훑은 클래스 문자열을 돌려준다."""
    return ''.join(cls(c) for c in ray_cols(px, l, t, corner, deg, out, inn, step))


def runs(s):
    out = []
    for ch in s:
        if out and out[-1][0] == ch:
            out[-1][1] += 1
        else:
            out.append([ch, 1])
    return out


def fmt(rs, step=0.5):
    return ' '.join('%s%.1f' % (a, b * step) for a, b in rs)


def black_runs(s):
    """(시작 index, 길이) 목록."""
    out, i = [], 0
    while i < len(s):
        if s[i] == 'K':
            j = i
            while j < len(s) and s[j] == 'K':
                j += 1
            out.append((i, j - i))
            i = j
        else:
            i += 1
    return out


def ring_run(s, out=6.0, step=0.5):
    """⚠ «처음 나오는 검정» 을 쓰면 안 된다 — 광선 바깥쪽에 **셸 테두리**가 먼저 걸린다
       (60° 에서 ref 가 `K2.0 F2.5 S1.0 K5.5 …` 로 읽힌다). 윤곽(d=0)에 **가장 가까운**
       검정 런이 알약의 옆띠다."""
    c = out / step
    rs = black_runs(s)
    if not rs:
        return (None, 0.0)
    i, n = min(rs, key=lambda r: abs(r[0] - c))
    return (i, n * step)


def layer_black(cols, mode=None, out=6.0, step=0.5):
    """⚑ 942 5회차 — **층 두께**로 낸 옆띠. `runs_from` 이 낸 층 중 윤곽(d=0)에 **가장 가까운**
       K 층의 두께다. 고르는 규칙은 `ring_run` 과 같다 — 옛 자는 시작 «표본 번호» 로,
       이 자는 그 번호를 px 로 옮긴 **시작 자리**로 비교할 뿐이라 같은 층을 고른다."""
    rs = runs_from(cols, mode=(MODE if mode is None else mode), step=step)
    best, pos = None, 0.0
    for ch, n in rs:
        if ch == 'K' and (best is None or abs(pos - out) < abs(best[0] - out)):
            best = (pos, n)
        pos += n
    return 0.0 if best is None else best[1]


def black_norm(s, step=0.5):
    return ring_run(s)[1]


def after_black(s):
    """옆띠 다음에 오는 첫 «진짜» 런의 글자 — D 면 바닥 띠가 이어받은 것이다."""
    i, n = ring_run(s)
    if i is None:
        return '-'
    for k in range(i + int(n / 0.5), len(s)):
        if s[k] not in 'S?K':
            return s[k]
    return '-'


def table(tag, px, l, t, corner, degs):
    print('   %-4s %s 코너 — 각도별 (법선 두께 px)' % (tag, '좌하' if corner == 'BL' else '좌상'))
    th, nx = [], []
    for d in degs:
        cols = ray_cols(px, l, t, corner, d)
        s = ''.join(cls(c) for c in cols)
        th.append(black_norm(s) if MODE == 'int' else layer_black(cols))
        nx.append(after_black(s))
    print('     deg   %s' % ' '.join('%5d' % d for d in degs))
    print('     검정  %s' % ' '.join(('%5.1f' if MODE == 'int' else '%5.2f') % v for v in th))
    print('     다음  %s' % ' '.join('%5s' % v for v in nx))
    return th


def physics():
    """⚑ 942 5회차 재현 — **그림도 브라우저도 안 쓴다.** 같은 참값 층더미를
       «칼같은 판»(cap = PNG)과 «번진 판»(ref = JPEG · σ 1.1px)으로 그려 두 자로 읽는다.
       판을 그리는 셈은 `probe409g.phys_cols` 하나뿐이다(사본 0 · 942 3회차 규약).
       광선의 층 차례를 그대로 흉내낸다 — 바깥 셸 S · 옆띠 K · 베벨 B · 채움 F."""
    print('\n══════ 409 «두께 자» 재현 (942 5회차) — 합성 판 ══════')
    print(' 참값 층더미  S6.0 K?.? D4.0 B7.0  ·  옛 자 = 승자독식 런 · 새 자 = 층 질량 분배')
    print(' (차례는 이 자가 ref 에서 실제로 읽는 것 그대로다 — `ⓒ 30°` 의 `… K6.0 S1.5 D3.0 … B6.0`.')
    print('  ⚠ K 다음은 B 가 아니라 **바닥 어두운 띠 D** 이고, 그 사이 `S` 가 곧 «없는 층» 이다.)')
    print('  참K    자    cap    ref      Δ')
    rows = []
    for k in (7.0, 6.0, 5.0, 4.0, 3.0, 2.0):
        cols = phys_cols(widths=(('S', 6.0), ('K', k), ('D', 4.0), ('B', 7.0)), sig=1.1, step=0.5)
        old = {w: layer_black(cols[w], mode='int') for w in ('cap', 'ref')}
        new = {w: layer_black(cols[w], mode='cov') for w in ('cap', 'ref')}
        rows.append((k, old, new))
        for tag, v in (('int', old), ('cov', new)):
            print('  %4.1f   %-4s %6.2f %6.2f  %+6.2f' % (k, tag, v['cap'], v['ref'], v['ref'] - v['cap']))
    do = max(abs(o['ref'] - o['cap']) for _, o, _ in rows)
    dn = max(abs(n['ref'] - n['cap']) for _, _, n in rows)
    eo = max(abs(o['ref'] - k) for k, o, _ in rows)
    en = max(abs(n['ref'] - k) for k, _, n in rows)
    print('  ⇒ 판 사이 최대 편차  옛 %.2f → 새 %.2f px' % (do, dn))
    print('  ⇒ 번진 판 읽기 오차  옛 %.2f → 새 %.2f px' % (eo, en))
    print('  ⇒ 옛 값은 %d/%d 가 0.5 의 배수 · 새 값은 %d/%d 가 비배수'
          % (sum(1 for _, o, _ in rows for v in o.values() if abs(v * 2 - round(v * 2)) < 1e-9), 2 * len(rows),
             sum(1 for _, _, n in rows for v in n.values() if abs(v * 2 - round(v * 2)) >= 1e-9), 2 * len(rows)))
    print()


def main():
    if '--physics' in sys.argv:
        physics()
        return
    ref = Image.open(REF7).convert('RGB').load()
    # ⚠ 캡처 PNG 는 **커밋 금지 자산**(ROUTINE 서두)이라 없는 클론이 정상이다 —
    #   없으면 즉사하지 말고 **ref 절만** 돈다(942 2·3·4회차가 세 자에서 고친 그 얼굴).
    cap = Image.open(CAP7).convert('RGB').load() if os.path.exists(CAP7) else None
    if cap is None:
        print('   (캡처 %s 없음 — ref 절만 돈다. 캡처는 `node tools/cap96.js` 계열이 만든다)' % CAP7)
    rl, _, rt = BOX['ref']
    cl, _, ct = BOX['cap']

    print('\n══════ 409 재현 — 검정 옆띠는 «등폭 링» 인가 «평행이동 밴드» 인가 ══════')
    print(' 07 스킬 시트 활성 알약 «스킬» · 코너 원 중심에서 쏜 광선 · 0°=변 한복판 · 90°=상/하변')
    print(' 예측  등폭 링 = 7.0 로 일정   ↔   평행이동 밴드 = 7·cos α (45° 4.9 · 60° 3.5 · 75° 1.8)')

    degs = [0, 10, 20, 30, 40, 50, 60, 70, 80]
    print('\n ⓐ 좌하 코너')
    tr = table('ref', ref, rl, rt, 'BL', degs)
    tc = table('cap', cap, cl, ct, 'BL', degs) if cap else None
    print('     예측(밴드) %s' % ' '.join('%5.1f' % (7 * math.cos(math.radians(d))) for d in degs))

    print('\n ⓑ 좌상 코너')
    table('ref', ref, rl, rt, 'TL', degs)
    if cap:
        table('cap', cap, cl, ct, 'TL', degs)

    print('\n ⓒ 광선 단면 원문 (좌하) — 바깥 6px → 안쪽 22px, 0.5px 간격')
    for d in (30, 45, 60, 70):
        print('   ref %2d°  %s' % (d, fmt(runs(ray(ref, rl, rt, 'BL', d)))))
        if cap:
            print('   cap %2d°  %s' % (d, fmt(runs(ray(cap, cl, ct, 'BL', d)))))
    print('   ref  %s' % fmt(runs(ray(ref, rl, rt, 'BL', 45))))
    print('   ref  (60°) %s' % fmt(runs(ray(ref, rl, rt, 'BL', 60))))
    if cap:
        print('   cap  %s' % fmt(runs(ray(cap, cl, ct, 'BL', 45))))
        print('   cap  (60°) %s' % fmt(runs(ray(cap, cl, ct, 'BL', 60))))

    print('\n ⓓ 요약 — 45° 법선 검정')
    if tc:
        print('   ref %.2f ↔ cap %.2f   (BB 1회차 실측: ref 7.08 ↔ 우리 4.94)' % (tr[3], tc[3]))
        print('   ref 0°→75° 편차 %.2f  ↔ cap 편차 %.2f   (등폭이면 0 에 가깝다)'
              % (max(tr) - min(tr), max(tc) - min(tc)))
    else:
        print('   ref %.2f   ref 0°→75° 편차 %.2f   (cap 없음 — 캡처가 있으면 두 줄이 더 찍힌다)'
              % (tr[3], max(tr) - min(tr)))
    print()


main()
