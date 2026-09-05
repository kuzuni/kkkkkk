# 작업 335 — 서브탭 바의 **가로 범위·축**을 ref/cap 에서 같은 마스크로 잰다.
#
#   72 17회차 AJ·AK 가 «서브탭 축이 −8.5px 좌(레퍼런스는 화면중심 +8.5 비대칭)» 로 일치 지적한 자리.
#   96 2회차 비평가는 반대로 «다른 공용 바는 전부 대칭이라 같은 부품으로 안 읽힌다» 며 143/143 대칭을
#   요구했고 그대로 반영돼 있다. **어느 쪽이 레퍼런스인지**를 픽셀로 확정한다.
#
#   바 세로 중심: ref y=2069 / cap y=2009 (하단 앵커 −60). 그 높이에서 좌→우로 훑으며
#   «페이지 바탕(#26211B lum≈33) → 검정 테두리(lum<12) → 바 안쪽(lum>45)» 전이를 찾는다.
from pydep937 import Image
import sys

CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/335-r0.png'
ref = Image.open('docs/ref/03-던전-팝업.jpg').convert('RGB')
cap = Image.open(CAP).convert('RGB')


def lum(c):
    return (c[0] * 299 + c[1] * 587 + c[2] * 114) // 1000


def scan(im, y, label, off):
    px = im.load()
    L = [lum(px[x, y]) for x in range(0, 1080)]
    # 바 안쪽(밝은 면 lum>=45) 의 좌·우 끝
    ins = [x for x in range(0, 1080) if L[x] >= 45]
    il, ir = (ins[0], ins[-1]) if ins else (None, None)
    # 그 바깥으로 이어지는 검정(lum<12) 띠 = 테두리
    bl = il
    while bl is not None and bl > 0 and L[bl - 1] < 12:
        bl -= 1
    br = ir
    while br is not None and br < 1079 and L[br + 1] < 12:
        br += 1
    print('\n── %s  (y=%d)' % (label, y))
    print('   바 안쪽(면)   x %s ~ %s   w %s   중심 %.1f' % (il, ir, ir - il + 1, (il + ir) / 2))
    print('   바 바깥(테두리 포함) x %s ~ %s   w %s   중심 %.1f'
          % (bl, br, br - bl + 1, (bl + br) / 2))
    print('   좌 여백 %d / 우 여백 %d   → 화면중심 539.5 대비 축 %+.1f'
          % (bl, 1079 - br, (bl + br) / 2 - 539.5))
    return bl, br


rl, rr = scan(ref, 2069, 'ref 03-던전-팝업.jpg', 0)
cl, cr = scan(cap, 2009, 'cap ' + CAP, 0)
print('\n── 판정')
print('   ref 좌 %d / 우여백 %d   ·   cap 좌 %d / 우여백 %d' % (rl, 1079 - rr, cl, 1079 - cr))
print('   축 Δ(cap − ref) = %+.1f px' % (((cl + cr) / 2) - ((rl + rr) / 2)))
print('   폭 Δ(cap − ref) = %+.1f px' % ((cr - cl) - (rr - rl)))
