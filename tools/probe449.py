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
import math
import sys

REF = 'docs/ref/03-던전-팝업.jpg'
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


def cls(c):
    best, bd = '?', 1 << 30
    for ch, rc in PAL:
        d = sum((int(a) - int(b)) ** 2 for a, b in zip(c, rc))
        if d < bd:
            best, bd = ch, d
    return best


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


def ray(px, cx, cy, ux, uy, depth=24.0, step=0.5):
    s = ''
    d = 0.0
    while d <= depth + 1e-9:
        x = cx + ux * (R - d)
        y = cy + uy * (R - d)
        s += cls(px[int(round(x)), int(round(y))])
        d += step
    return s


def hscan(px, y, x0, x1):
    """가로 단면의 클래스 런 — 알약 윤곽을 눈이 아니라 색으로 찾는다."""
    s = ''.join(cls(px[x, y]) for x in range(x0, x1))
    return runs(s, 1)


def main():
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

    # ── 3. 코너 광선
    for cor in ('TR', 'BR'):
        cy = (top + R) if cor[0] == 'T' else (bot - R)
        cx = outline - R
        print('\n[3] %s 코너 (중심 %.1f, %.1f · r %d)' % (cor, cx, cy, R))
        for dg in DEGS:
            a = math.radians(dg)
            ux = math.cos(a)
            uy = (1 if cor[0] == 'B' else -1) * math.sin(a)
            s = ray(px, cx, cy, ux, uy)
            rs = runs(s)
            ch, n = first_solid(rs)
            print('    %2d°  첫실런 %s%.1f   |  %s' % (dg, ch, n, ' '.join('%s%.1f' % r for r in rs[:8])))


if __name__ == '__main__':
    sys.exit(main())
