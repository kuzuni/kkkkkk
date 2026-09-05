# 02 기본 메인 화면 — 레퍼런스·캡처를 «같은 코드·같은 임계값» 으로 재는 대조 스캐너.
# LESSONS 36-④ «비평가 수치는 같은 도구로 재현한 뒤에만 반영한다».
#
# 02 는 세로 변환이 **두 가지**다(LESSONS 63-4):
#   · 화면 위쪽 고정 요소(스테이지 헤더·메뉴 버튼)      cap y = ref y − 84
#   · 탭바 위 고정 요소(좌하단·미션 배너·배속 버튼)     cap y = ref y − 60
#     (레퍼런스 콘텐츠 2256 과 프레임 2280 의 24px 차이를 캔버스가 흡수한다)
# 기본은 84 이고, 하단 요소는 `--dy 60` 을 준다.
#
# 사용 (좌표는 전부 **레퍼런스 절대 y**):
#   python3 tools/cmp02.py row  <refY> <x0> <x1> [--dy N] [--cap F]      가로 단면 색 런
#   python3 tools/cmp02.py col  <x> <refY0> <refY1> [--dy N] [--cap F]   세로 단면 색 런
#   python3 tools/cmp02.py ink  <x0> <refY0> <x1> <refY1> [--min 170]    밝은 잉크 bbox
#   python3 tools/cmp02.py dark <x0> <refY0> <x1> <refY1> [--max 60]     어두운 잉크 bbox
#   python3 tools/cmp02.py hue  <x0> <refY0> <x1> <refY1> <hex> [--tol 40]  색 마스크 bbox
import sys
from pydep937 import Image

REF = 'docs/ref/02-기본-메인-화면.jpg'
CAP = 'docs/review/02-r4.png'

argv = sys.argv[1:]


def opt(name, default):
    global argv
    if name in argv:
        i = argv.index(name)
        v = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
        return v
    return default


DY = int(opt('--dy', 84))
CAP = opt('--cap', CAP)
MINL = int(opt('--min', 170))
MAXL = int(opt('--max', 60))
TOL = int(opt('--tol', 40))

mode = argv[0]
a = [int(x) for x in argv[1:] if not x.startswith('#')]
hexv = [x for x in argv[1:] if x.startswith('#')]

IM = [('ref', Image.open(REF).convert('RGB'), 0),
      ('cap', Image.open(CAP).convert('RGB'), DY)]


def hx(c):
    return '#%02X%02X%02X' % c


def lum(c):
    return (c[0] * 299 + c[1] * 587 + c[2] * 114) // 1000


def near(c, t, tol):
    return abs(c[0] - t[0]) <= tol and abs(c[1] - t[1]) <= tol and abs(c[2] - t[2]) <= tol


def parse_hex(h):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def runs_of(seq, key):
    """[(start, end_inclusive, 대표값)] — key 가 같은 값으로 이어지는 구간"""
    out = []
    s = 0
    for i in range(1, len(seq) + 1):
        if i == len(seq) or key(seq[i]) != key(seq[s]):
            out.append((s, i - 1, key(seq[s])))
            s = i
    return out


def bbox(im, dy, x0, y0, x1, y1, test):
    px = im.load()
    W, H = im.size
    xs, ys = [], []
    for ry in range(y0, y1 + 1):
        y = ry - dy                        # 캡처는 ref y − dy 자리를 본다
        if y < 0 or y >= H:
            continue
        for x in range(x0, x1 + 1):
            if x < 0 or x >= W:
                continue
            if test(px[x, y]):
                xs.append(x)
                ys.append(ry)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1)


for name, im, dy in IM:
    px = im.load()
    if mode == 'row':
        y, x0, x1 = a[0] - dy, a[1], a[2]
        seq = [px[x, y] for x in range(x0, x1 + 1)]
        r = runs_of(list(range(len(seq))), lambda i: hx(tuple(c // 12 * 12 for c in seq[i])))
        print(name, 'row refY=%d capY=%d' % (a[0], y),
              ' '.join('%d..%d %s' % (x0 + s, x0 + e, v) for s, e, v in r if e - s >= 1))
    elif mode == 'col':
        x, y0, y1 = a[0], a[1] - dy, a[2] - dy
        seq = [px[x, y] for y in range(y0, y1 + 1)]
        r = runs_of(list(range(len(seq))), lambda i: hx(tuple(c // 12 * 12 for c in seq[i])))
        print(name, 'col x=%d' % x,
              ' '.join('%d..%d %s' % (a[1] + s, a[1] + e, v) for s, e, v in r if e - s >= 1))
    elif mode == 'ink':
        b = bbox(im, dy, a[0], a[1], a[2], a[3], lambda c: lum(c) >= MINL)
        print(name, 'ink(min%d)' % MINL, b)
    elif mode == 'dark':
        b = bbox(im, dy, a[0], a[1], a[2], a[3], lambda c: lum(c) <= MAXL)
        print(name, 'dark(max%d)' % MAXL, b)
    elif mode == 'hue':
        t = parse_hex(hexv[0])
        b = bbox(im, dy, a[0], a[1], a[2], a[3], lambda c: near(c, t, TOL))
        print(name, 'hue %s tol%d' % (hexv[0], TOL), b)
    else:
        print('unknown mode', mode)
        break
