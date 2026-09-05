# 작업 409 8회차 — **세로 단면이 아니라 «열별 단면» 으로 코너를 읽는 자.**
#
#   1~7회차의 자는 전부 «코너 중심에서 각도로 쏘는 광선»(probe409·b·c·d)이거나
#   «행별 클래스 런»(probe384)이었다. 둘 다 못 보는 것이 하나 있다 —
#   **마스크 경계(알약 x=30)에서 층이 끊기는가**. 감긴 띠가 코너에서 «몇 px 인가» 는
#   광선이 재지만, 그 띠가 직선 구간의 같은 띠와 **이어지는가** 는 열을 세로로 훑어야 보인다.
#
#   출력: 알약 국소 x 마다 y 를 위에서 아래로 훑어 클래스 런을 찍는다.
#   ref 와 cap 을 같은 x 에 나란히 놓아 «어디서 끊기는가» 를 눈이 아니라 글자로 본다.
#
# 사용:  python3 tools/probe409e.py [--x0 0] [--x1 40] [--y0 40] [--y1 92]
import sys
import math
from pydep937 import Image

REF7, CAP7 = 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png'
# 알약 상자 — 352 §3·§10. 세로는 하단 앵커 ref y − 60. 높이 84(7회차 §16-1 정정).
# ⚠⚠ **409 17회차 — 아래 `BOX['ref']` 의 x=292 는 1.32px 틀렸다(고치지 않고 남겨 둔다).**
#    ref 알약의 검정 링은 실제로 x 290.73..297.98 이라 **좌변은 290.7** 이다(측정표 07 정오표).
#    값을 그대로 두는 것은 이 파일들이 남긴 **옛 읽기를 재현할 수 있게** 하기 위해서다 —
#    새로 재는 자리에는 `tools/probe409i.py` 를 써라. 그것은 알약 네 변을 **그림에서** 직선
#    스캔해 상자를 잡고, cap 에서 DOM 실측과 0.14px 로 검산된다.
BOX = {'ref': (292, 2027), 'cap': (291, 1967)}
H = 84

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


def runs(px, x, y0, y1):
    out, cur, n = [], None, 0
    for y in range(y0, y1):
        ch = cls(px[x, y])
        if ch == cur:
            n += 1
        else:
            if cur is not None:
                out.append((cur, n))
            cur, n = ch, 1
    if cur is not None:
        out.append((cur, n))
    return out


def fmt(rs, y0):
    y, parts = y0, []
    for ch, n in rs:
        parts.append('%s%d(%d..%d)' % (ch, n, y, y + n))
        y += n
    return ' '.join(parts)


def ray(px, bx, by, corner, deg, R=30.0, inn=20.0, step=0.5):
    """verify409 의 `ray` 와 **같은 규칙** — 코너 원 중심에서 각도 deg 로 윤곽(d=0)부터
       안쪽으로 훑는다. 그래야 게이트가 보는 값과 ref 값을 같은 자로 비교할 수 있다."""
    a = math.radians(deg)
    bottom, right = corner[0] == 'B', corner[1] == 'R'
    cx = bx + (261 - R if right else R)
    cy = by + (H - R if bottom else R)
    ux = (1 if right else -1) * math.cos(a)
    uy = (1 if bottom else -1) * math.sin(a)
    out, d = '', 0.0
    while d <= inn + 1e-9:
        out += cls(px[int(round(cx + ux * (R - d))), int(round(cy + uy * (R - d)))])
        d += step
    return out


def fmt_runs(s, step=0.5):
    o = []
    for ch in s:
        if o and o[-1][0] == ch:
            o[-1][1] += 1
        else:
            o.append([ch, 1])
    return ' '.join('%s%.1f' % (c, n * step) for c, n in o)


def rays():
    ims = {'ref': Image.open(REF7).convert('RGB'), 'cap': Image.open(CAP7).convert('RGB')}
    degs = [0, 15, 30, 45, 60, 75]
    print('══ 409-e/rays — verify409 와 **같은 광선**(윤곽 d=0 → 안쪽 20px) ══')
    for corner in ('BL', 'BR', 'TL', 'TR'):
        print('\n  %s' % corner)
        for who in ('ref', 'cap'):
            bx, by = BOX[who]
            px = ims[who].load()
            for dg in degs:
                print('    %s %2d°  %s' % (who, dg, fmt_runs(ray(px, bx, by, corner, dg))))
            print('')


def main():
    a = sys.argv[1:]
    if '--rays' in a:
        rays()
        return

    def opt(name, d):
        return int(a[a.index(name) + 1]) if name in a else d

    x0, x1 = opt('--x0', 0), opt('--x1', 40)
    y0, y1 = opt('--y0', 40), opt('--y1', 92)
    side = a[a.index('--side') + 1] if '--side' in a else 'L'

    ims = {'ref': Image.open(REF7).convert('RGB'), 'cap': Image.open(CAP7).convert('RGB')}
    print('══ 409-e — 열별 세로 단면 (알약 아래 %s 코너 · 국소 y %d..%d) ══' % (side, y0, y1))
    print('   K 검정 · B 베벨#634F37 · F 채움#4B3E2D · D 바닥띠#413122 · R 셸림 · S 셸바닥')
    for who in ('ref', 'cap'):
        bx, by = BOX[who]
        px = ims[who].load()
        print('\n  %s' % who)
        for lx in range(x0, x1):
            sx = bx + lx if side == 'L' else bx + 261 - 1 - lx
            print('    x%-3d %s' % (lx, fmt(runs(px, sx, by + y0, by + y1), y0)))


main()
