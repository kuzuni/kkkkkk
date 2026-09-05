# 작업 409 5회차 — «접선 근처에서 검정이 어떻게 끝나는가» 를 **한 자로** 뽑는다.
#
#   4회차 인계(§13-4 2번): 세 비평가(CY 법선 · DB EDT · DD 열두께)의 절대값이 서로 달라
#   («임계 정의가 다르면 일치해도 틀린다» — A1 라운드 교훈) 처방의 근거가 될 곡선은
#   **하나의 자**로 뽑아야 한다. 이 파일이 그 자다.
#
#   probe409.py 의 «법선 광선» 은 70° 위에서 못 쓴다 — ref 에서 **셸 테두리 검정과 알약 검정이
#   붙어 버려**(K10.0) 두 검정을 못 가른다. 그래서 여기서는 축을 바꾼다:
#     · 알약 상자 **안쪽만** 본다(rel y ≥ 0 · rel x ≥ 0). 셸은 상자 밖이라 애초에 안 들어온다.
#     · 각 **열**(rel x = dx)에서 위(아래) 끝에서부터 세어 «검정이 몇 px 인가» 를 낸다.
#       등폭 동심 링이면 dx 가 코너 중심(30)에 가까워질수록 두께가 **7 에 수렴**하고,
#       ref 처럼 접선에서 사라지면 **0 으로 떨어진다**.
#
# ⚑⚑ 942 2회차(2026-09-05) — **이 자의 «검정 화소 수» 를 부분 화소로 갈아 끼웠다.**
#   932 전수가 이 자를 주홍(B · 번짐 비대칭)으로 적어 둔 근거가 아래 `col_black` 의 한 줄이었다:
#     `sum(1 for … if cls(...) == 'K')` — **불리언 세기 그 자체**라 값이 언제나 정수이고
#     판정값이 0~7px 이라 **±1px 이 곧 ±14%** 다. ref 는 JPEG 사진이라 검정 기둥의 두 끝이
#     2~3px 번지는데 우리 캡처(PNG)는 칼같으므로, 승자독식 분류는 **번진 쪽만** 깎아 먹는다
#     — 1:1 인데도 ref 만 얇게 읽히는 그 얼굴이다(932 §ⓑ).
#   ⇒ 갈아 끼운 것은 **셈 하나뿐**이다. 창(span 20 · dx 45 바닥값)·열 자리·팔레트·`cls()` 는
#     한 칸도 안 건드렸고, 옛 자는 `--int` 로 살아 있어 지문을 매 실행 다시 찍는다.
#   ⇒ 새 셈은 **`probe409g.runs_from`**(942 1회차가 세운 알맹이)을 그대로 부른다 — 사본을 안 만든다.
#     그 자는 ① 번짐이 만든 «없는 층»(두 층 사이 경사면이 사이 색으로 이기는 것)을 접고
#     ② 표본 하나의 몫을 **차례가 정한 이웃 두 층**에 비례로 나눈다(질량 보존).
#     이 자의 «검정» 은 그렇게 나뉜 층 중 **K 층 두께의 합**이다(옛 «K 화소 수» 의 연속판).
#
# 사용:  python3 tools/probe409c.py [--cap 파일] [--int] | --physics
import os
import sys
from pydep937 import Image
from probe409g import runs_from, physics

REF7 = 'docs/ref/07-스킬-팝업.jpg'
CAP7 = 'docs/review/96-full-hero.png'
BOX = {'ref': (292, 2027), 'cap': (291, 1967)}
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


def col_black(px, l, t, dx, top=True, span=20, mode='cov'):
    """열 dx 에서 «알약 상자 안쪽 끝»(top=True 면 rel y=0)부터 span 화소 안의 **검정 두께**.
       ⚠ 상자 바깥(셸)은 안 본다 — 그것이 이 자가 probe409.py 와 갈리는 유일한 점이다."""
    # ⚠ **이어진 런이 아니라 «검정의 양»** 이다. 셸 테두리가 상자 첫 행을 덮고 그 밑에 셸 안쪽
    #    립이 한 줄 끼면 이어진 런은 거기서 끊긴다(ref 의 위 코너·437·450 이후의 cap 둘 다 그렇다).
    #    바닥값(직선 구간 dx 45)을 빼는 쪽이 ref·cap 에 같은 자다 — `col()` 이 그 뺄셈을 한다.
    cols = [px[l + dx, t + (i if top else H - 1 - i)] for i in range(span)]
    if mode == 'int':
        return float(sum(1 for c in cols if cls(c) == 'K'))     # 옛 자 — 불리언 세기(정수)
    # 942 2회차 — 층으로 갈라 **K 층 두께의 합**을 낸다(걸음 1px · 몫은 이웃 층에 비례로).
    return sum(w for ch, w in runs_from(cols, mode='cov', step=1.0) if ch == 'K')


def col(px, l, t, dx, top=True, mode='cov'):
    """알약 자신의 검정 = 그 열의 검정 두께 − 직선 구간(dx 45)의 검정 두께(= 셸 몫)."""
    return max(0.0, col_black(px, l, t, dx, top, mode=mode)
               - col_black(px, l, t, 45, top, mode=mode))


def grid(px, l, t, tag, top=True, w=34, h=16):
    print('   %s — rel x 0..%d (가로) × rel y %s (세로)' % (tag, w - 1, '0..%d' % (h - 1) if top else '%d..%d' % (H - h, H - 1)))
    print('        ' + ''.join('%d' % (x % 10) for x in range(w)))
    for i in range(h):
        y = i if top else H - h + i
        print('    y%3d %s' % (y, ''.join(cls(px[l + x, t + y]) for x in range(w))))


def curve(px, l, t, tag, top=True, mode='cov'):
    ds = list(range(0, 31, 2)) + [31, 32, 34, 36]
    vs = [col(px, l, t, d, top, mode=mode) for d in ds]
    print('   %-4s dx  %s' % (tag, ' '.join('%5d' % d for d in ds)))
    print('        검정 %s' % ' '.join('%5.2f' % v for v in vs))
    return vs


def phys(mode, stack, sig=1.1):
    """합성 재현 — 같은 참값 기둥을 «칼같은 판(cap)» 과 «번진 판(ref)» 으로 그려 이 자의 셈으로 잰다.
       942 1회차의 `probe409g.physics` 를 **걸음 1.0px**(이 자의 걸음)으로 그대로 부른다.
       돌려주는 것: {판: (K 두께, 전 층 두께의 합)} — 뒤엣것이 질량 보존의 증인이다."""
    r = physics(widths=stack, sig=sig, step=1.0)
    return {who: (sum(w for ch, w in r[mode][who] if ch == 'K'),
                  sum(w for _, w in r[mode][who])) for who in ('cap', 'ref')}


def main():
    a = sys.argv[1:]
    mode = 'int' if '--int' in a else 'cov'

    if '--physics' in a:
        # 이 자가 실제로 재는 것과 같은 꼴의 기둥 — 셸 바닥(S) → 검정 테(K) → 채움면(F).
        # ⚠ **얇은 참값(K2)이 덫이다** — 접기가 무르면 진짜 층이 통째로 사라진다.
        stacks = [(('S', 3.0), ('K', w), ('F', 10.0)) for w in (7.0, 5.0, 3.0, 2.0)]
        print('\n══ 409-c/physics — 같은 참값 기둥을 «칼같은 판(cap)» 과 «번진 판(ref)» 으로 ══')
        print('   번짐 σ 1.1px · 걸음 1.0px (이 자의 열 걸음) · 재는 것 = **K 층 두께**\n')
        print('   %-6s %-6s %8s %8s %10s %10s' % ('참값', '자', 'cap', 'ref', 'ref−cap', '합(ref)'))
        for stack in stacks:
            kw = dict(stack)['K']
            for m in ('int', 'cov'):
                v = phys(m, stack)
                print('   K%-5.1f %-6s %8.2f %8.2f %10.2f  (%+.1f%%) %6.2f'
                      % (kw, m, v['cap'][0], v['ref'][0], v['ref'][0] - v['cap'][0],
                         100.0 * (v['ref'][0] - v['cap'][0]) / v['cap'][0], v['ref'][1]))
        print('\n   ⚑ 옛 자(int)는 **번진 판만** 깎아 먹는다 — 1:1 인데도 ref 가 얇게 읽히는 그 얼굴이다')
        print('     (참값이 얇을수록 비가 커진다: K7 −14.3% · K2 −50%).')
        print('     새 자(cov)는 두 판이 같은 값을 낸다 = 번짐 비대칭이 사라졌고, «합» 은 창 그대로다.\n')
        return

    capf = CAP7
    if '--cap' in a:
        capf = a[a.index('--cap') + 1]
    ref = Image.open(REF7).convert('RGB').load()
    # ⚠ 캡처 PNG 는 **커밋 금지 자산**이라 없는 클론이 정상이다 — 없으면 ref 절만 돈다(409g 선례).
    cap = None
    if os.path.exists(capf):
        cap = Image.open(capf).convert('RGB').load()
    rl, rt = BOX['ref']
    cl, ct = BOX['cap']

    print('\n══════ 409 5회차 — 접선 근처의 검정 (열 단위 · 알약 상자 안쪽만) ══════')
    print(' 07 스킬 시트 활성 알약 «스킬» · 좌 코너 · dx = 알약 좌변에서의 거리(코너 중심 30)')
    print(' 예측  등폭 동심 링 = dx 가 30 에 갈수록 7 로 수렴   ↔   ref = 접선에서 0 으로 떨어진다')
    print(' 자   %s\n' % ('**옛 불리언 세기**(--int · 값이 언제나 정수 — 942 2회차가 갈아 끼운 자리)'
                          if mode == 'int' else
                          '층 질량 분배(942 2회차 — K 층 두께의 합 · `probe409g.runs_from`)'))
    if cap is None:
        print('  ⚠ 캡처 없음(%s) — ref 절만 돈다. 만들려면 `node tools/cap96.js`.\n' % capf)

    print(' ⓐ 위 코너 (상변 쪽으로 접선)')
    tr = curve(ref, rl, rt, 'ref', True, mode)
    tc = curve(cap, cl, ct, 'cap', True, mode) if cap else None

    print('\n ⓑ 아래 코너 (하변 쪽으로 접선)')
    br = curve(ref, rl, rt, 'ref', False, mode)
    bc = curve(cap, cl, ct, 'cap', False, mode) if cap else None

    print('\n ⓒ 클래스 격자 — ref 위 코너')
    grid(ref, rl, rt, 'ref', True)
    print('\n ⓔ 클래스 격자 — ref 아래 코너')
    grid(ref, rl, rt, 'ref', False)
    if cap:
        print('\n ⓓ 클래스 격자 — cap 위 코너')
        grid(cap, cl, ct, 'cap', True)
        print('\n ⓕ 클래스 격자 — cap 아래 코너')
        grid(cap, cl, ct, 'cap', False)

    print('\n ⓖ 요약 — dx 26/28/30 (접선 3열)')
    for nm, r, c in (('위', tr, tc), ('아래', br, bc)):
        f = lambda v: '[' + ' '.join('%.2f' % x for x in v) + ']'
        print('   %s 코너  ref %s  ↔  cap %s'
              % (nm, f([r[13], r[14], r[15]]), f([c[13], c[14], c[15]]) if c else '(캡처 없음)'))
    print()


main()
