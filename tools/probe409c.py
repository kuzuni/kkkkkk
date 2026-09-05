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
# 사용:  python3 tools/probe409c.py [--cap 파일]
import sys
from pydep937 import Image

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


def col_black(px, l, t, dx, top=True, span=20):
    """열 dx 에서 «알약 상자 안쪽 끝»(top=True 면 rel y=0)부터 이어지는 검정 런의 길이.
       ⚠ 상자 바깥(셸)은 안 본다 — 그것이 이 자가 probe409.py 와 갈리는 유일한 점이다."""
    # ⚠ **이어진 런이 아니라 «검정 픽셀 수»** 다. 셸 테두리가 상자 첫 행을 덮고 그 밑에 셸 안쪽
    #    립이 한 줄 끼면 이어진 런은 거기서 끊긴다(ref 의 위 코너·437·450 이후의 cap 둘 다 그렇다).
    #    바닥값(직선 구간 dx 45)을 빼는 쪽이 ref·cap 에 같은 자다 — `col()` 이 그 뺄셈을 한다.
    return sum(1 for i in range(span)
               if cls(px[l + dx, t + (i if top else H - 1 - i)]) == 'K')


def col(px, l, t, dx, top=True):
    """알약 자신의 검정 = 그 열의 검정 픽셀 수 − 직선 구간(dx 45)의 검정 픽셀 수(= 셸 몫)."""
    return max(0, col_black(px, l, t, dx, top) - col_black(px, l, t, 45, top))


def grid(px, l, t, tag, top=True, w=34, h=16):
    print('   %s — rel x 0..%d (가로) × rel y %s (세로)' % (tag, w - 1, '0..%d' % (h - 1) if top else '%d..%d' % (H - h, H - 1)))
    print('        ' + ''.join('%d' % (x % 10) for x in range(w)))
    for i in range(h):
        y = i if top else H - h + i
        print('    y%3d %s' % (y, ''.join(cls(px[l + x, t + y]) for x in range(w))))


def curve(px, l, t, tag, top=True):
    ds = list(range(0, 31, 2)) + [31, 32, 34, 36]
    print('   %-4s dx  %s' % (tag, ' '.join('%4d' % d for d in ds)))
    print('        검정%s' % ' '.join('%4d' % col(px, l, t, d, top) for d in ds))
    return [col(px, l, t, d, top) for d in ds]


def main():
    capf = CAP7
    if '--cap' in sys.argv:
        capf = sys.argv[sys.argv.index('--cap') + 1]
    ref = Image.open(REF7).convert('RGB').load()
    cap = Image.open(capf).convert('RGB').load()
    rl, rt = BOX['ref']
    cl, ct = BOX['cap']

    print('\n══════ 409 5회차 — 접선 근처의 검정 (열 단위 · 알약 상자 안쪽만) ══════')
    print(' 07 스킬 시트 활성 알약 «스킬» · 좌 코너 · dx = 알약 좌변에서의 거리(코너 중심 30)')
    print(' 예측  등폭 동심 링 = dx 가 30 에 갈수록 7 로 수렴   ↔   ref = 접선에서 0 으로 떨어진다\n')

    print(' ⓐ 위 코너 (상변 쪽으로 접선)')
    tr = curve(ref, rl, rt, 'ref', True)
    tc = curve(cap, cl, ct, 'cap', True)

    print('\n ⓑ 아래 코너 (하변 쪽으로 접선)')
    br = curve(ref, rl, rt, 'ref', False)
    bc = curve(cap, cl, ct, 'cap', False)

    print('\n ⓒ 클래스 격자 — ref 위 코너')
    grid(ref, rl, rt, 'ref', True)
    print('\n ⓓ 클래스 격자 — cap 위 코너')
    grid(cap, cl, ct, 'cap', True)
    print('\n ⓔ 클래스 격자 — ref 아래 코너')
    grid(ref, rl, rt, 'ref', False)
    print('\n ⓕ 클래스 격자 — cap 아래 코너')
    grid(cap, cl, ct, 'cap', False)

    print('\n ⓖ 요약 — dx 26/28/30 (접선 3열)')
    for nm, r, c in (('위', tr, tc), ('아래', br, bc)):
        print('   %s 코너  ref %s  ↔  cap %s' % (nm, [r[13], r[14], r[15]], [c[13], c[14], c[15]]))
    print()


main()
