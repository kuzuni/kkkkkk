#!/usr/bin/env python3
"""34 축복(버프) 팝업 — ref/캡처 공통 픽셀 실측기 (11회차, 2차 폴리시 라운드).

지시서 [3]-(나) 의 «비평가 엇갈림은 자체 raw 덤프로 결론낸다» 용도.
좌표계: ref = 1080x2340, cap = 1080x2280, **cap y = ref y - 84** (가로 1:1).
이 스크립트는 인자로 받은 좌표를 «프레임 좌표»(= cap 좌표)로 해석하고
ref 를 읽을 때만 자동으로 +84 한다. 두 이미지를 같은 숫자로 비교할 수 있다.

사용:
  python3 tools/m34.py all                  주요 항목 일괄 실측 (ref vs cap 대조표)
  python3 tools/m34.py row <y> [x0] [x1]    한 행 색 전이점
  python3 tools/m34.py col <x> [y0] [y1]    한 열 색 전이점
  python3 tools/m34.py mask <x0> <y0> <x1> <y1> <mode>
  python3 tools/m34.py arc <x0> <y0> <x1> <y1> <mode> <corner>   모서리 반경 최소자승
환경변수 CAP 로 캡처 경로 지정 (기본 docs/review/34-r11.png).
"""
import sys, os
from pydep937 import np
from pydep937 import Image

REF_PATH = 'docs/ref/34-축복-버프팝업.jpg'
CAP_PATH = os.environ.get('CAP', 'docs/review/34-r11.png')
DY = 84  # ref y - 84 = frame(cap) y

_cache = {}


def img(which):
    if which not in _cache:
        p = REF_PATH if which == 'ref' else CAP_PATH
        _cache[which] = np.asarray(Image.open(p).convert('RGB')).astype(int)
    return _cache[which]


def off(which):
    return DY if which == 'ref' else 0


# ── 마스크 ────────────────────────────────────────────────────────────────
def mask_of(a, mode):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = a.mean(axis=2)
    if mode == 'dark':      return lum < 70
    if mode == 'vdark':     return lum < 45
    if mode == 'bright':    return lum > 190
    if mode == 'cream':     return (r > 210) & (g > 185) & (b > 140) & (b < 225)
    if mode == 'notcream':  return ~mask_of(a, 'cream')
    if mode == 'magenta':   return (r > 130) & (g < 90) & (b > 55) & (b < 160) & (r - g > 60)
    if mode == 'green':     return (g > 110) & (g - r > 40) & (g - b > 40)
    if mode == 'red':       return (r > 140) & (r - g > 60) & (r - b > 55)
    if mode == 'toffee':    return (abs(r - 162) < 34) & (abs(g - 146) < 34) & (abs(b - 123) < 34)
    if mode == 'headband':  return (abs(r - 84) < 30) & (abs(g - 65) < 28) & (abs(b - 61) < 28)
    if mode == 'tab':       return (abs(r - 62) < 26) & (abs(g - 48) < 24) & (abs(b - 45) < 24)
    raise SystemExit('mode? ' + mode)


def bbox(which, x0, y0, x1, y1, mode, minpx=2):
    """프레임 좌표 사각형 안에서 mask bbox 를 프레임 좌표로 돌려준다."""
    a = img(which)
    o = off(which)
    reg = a[y0 + o:y1 + o, x0:x1]
    m = mask_of(reg, mode)
    cols = m.sum(axis=0); rows = m.sum(axis=1)
    xs = np.where(cols >= minpx)[0]; ys = np.where(rows >= minpx)[0]
    if not len(xs) or not len(ys):
        return None
    return (int(xs.min() + x0), int(ys.min() + y0), int(xs.max() + x0), int(ys.max() + y0))


def fmt(bb):
    if bb is None:
        return 'none'
    x0, y0, x1, y1 = bb
    return f'x{x0}..{x1}({x1-x0+1}) y{y0}..{y1}({y1-y0+1})'


def cmp_row(label, x0, y0, x1, y1, mode, minpx=2):
    r = bbox('ref', x0, y0, x1, y1, mode, minpx)
    c = bbox('cap', x0, y0, x1, y1, mode, minpx)
    d = ''
    if r and c:
        d = f'Δw {c[2]-c[0]-(r[2]-r[0]):+d}  Δh {c[3]-c[1]-(r[3]-r[1]):+d}  Δx {c[0]-r[0]:+d}  Δy {c[1]-r[1]:+d}'
    print(f'{label:<34} ref {fmt(r):<34} cap {fmt(c):<34} {d}')


# ── 전이점 ────────────────────────────────────────────────────────────────
def transitions(which, axis, fixed, a0, a1, thr=26):
    a = img(which); o = off(which)
    if axis == 'row':
        line = a[fixed + o, a0:a1]
        base = a0
    else:
        line = a[a0 + o:a1 + o, fixed]
        base = a0
    out = []
    prev = line[0]
    for i in range(1, len(line)):
        if np.abs(line[i] - prev).sum() > thr:
            out.append((base + i, tuple(int(v) for v in line[i])))
        prev = line[i]
    return out


# ── 모서리 반경 (원 최소자승) ─────────────────────────────────────────────
def arc_radius(which, x0, y0, x1, y1, mode, corner):
    """corner: tl|tr|bl|br — 그 모서리의 «채워진 영역» 경계점을 모아 원 반경을 최소자승."""
    a = img(which); o = off(which)
    reg = a[y0 + o:y1 + o, x0:x1]
    m = mask_of(reg, mode)
    pts = []
    h, w = m.shape
    for j in range(h):
        idx = np.where(m[j])[0]
        if not len(idx):
            continue
        e = idx.min() if corner in ('tl', 'bl') else idx.max()
        pts.append((e, j))
    if len(pts) < 6:
        return None
    P = np.array(pts, float)
    A = np.c_[2 * P[:, 0], 2 * P[:, 1], np.ones(len(P))]
    b = (P ** 2).sum(axis=1)
    try:
        sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    except np.linalg.LinAlgError:
        return None
    cx, cy, c = sol
    R = float(np.sqrt(max(c + cx * cx + cy * cy, 0)))
    return R, cx + x0, cy + y0


# ── 일괄 실측 ─────────────────────────────────────────────────────────────
def run_all():
    print(f'ref={REF_PATH}  cap={CAP_PATH}  (cap y = ref y - {DY})')
    print('=' * 132)

    print('\n[1] 핑크 캠페인 리본 (magenta)')
    cmp_row('리본 bbox', 0, 380, 420, 560, 'magenta', 3)

    print('\n[2] 안내 배너 (토프 바)')
    cmp_row('배너 bbox', 70, 455, 1010, 620, 'toffee', 120)

    print('\n[3] Lv 진행바 행 (알약+바)')
    cmp_row('진행바 밝은 코어', 240, 600, 880, 700, 'bright', 40)

    print('\n[4] 축복 카드 — 헤더 밴드 vs 본체 (인셋 판정)')
    for i, (cx0, cx1) in enumerate([(60, 390), (375, 705), (690, 1020)], 1):
        cmp_row(f'카드{i} 헤더밴드', cx0, 705, cx1, 780, 'headband', 20)
    print('   · 카드 본체(주황 스트라이프) 좌우단:')
    for i, (cx0, cx1) in enumerate([(60, 390), (375, 705), (690, 1020)], 1):
        cmp_row(f'카드{i} 본체', cx0, 800, cx1, 1150, 'notcream', 60)

    print('\n[5] «보너스 축복» 탭')
    cmp_row('탭 bbox', 240, 1160, 840, 1245, 'tab', 15)

    print('\n[6] 보너스 바')
    cmp_row('바 bbox', 60, 1240, 1020, 1420, 'notcream', 60)

    print('\n[7] 초록 프로모 스트립')
    cmp_row('스트립 bbox', 40, 1490, 1040, 1800, 'green', 60)
    print('   · 스트립 안 좌측 일러스트 잉크(비초록):')
    cmp_row('좌측 아트 잉크', 70, 1530, 560, 1775, 'notcream', 8)

    print('\n[8] 닫기 X 원')
    cmp_row('X 원 bbox', 400, 1770, 690, 1980, 'red', 5)

    print('\n[9] 팝업 외곽 프레임')
    cmp_row('팝업 bbox', 20, 330, 1060, 1520, 'notcream', 200)

    print('\n[10] 모서리 반경 (원 최소자승)')
    for which in ('ref', 'cap'):
        r = arc_radius(which, 30, 336, 130, 436, 'notcream', 'tl')
        print(f'   팝업 좌상단 R  {which}: ' + (f'{r[0]:.1f}' if r else 'none'))
    for which in ('ref', 'cap'):
        r = arc_radius(which, 70, 706, 170, 806, 'headband', 'tl')
        print(f'   카드1 좌상단 R {which}: ' + (f'{r[0]:.1f}' if r else 'none'))
    for which in ('ref', 'cap'):
        r = arc_radius(which, 310, 1190, 400, 1250, 'tab', 'tl')
        print(f'   보너스탭 좌상 R {which}: ' + (f'{r[0]:.1f}' if r else 'none'))
    for which in ('ref', 'cap'):
        r = arc_radius(which, 58, 1516, 158, 1616, 'green', 'tl')
        print(f'   초록스트립 좌상 R {which}: ' + (f'{r[0]:.1f}' if r else 'none'))


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] == 'all':
        run_all()
    elif sys.argv[1] == 'row':
        y = int(sys.argv[2]); x0 = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        x1 = int(sys.argv[4]) if len(sys.argv) > 4 else 1080
        for w in ('ref', 'cap'):
            print(w, transitions(w, 'row', y, x0, x1))
    elif sys.argv[1] == 'col':
        x = int(sys.argv[2]); y0 = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        y1 = int(sys.argv[4]) if len(sys.argv) > 4 else 2280
        for w in ('ref', 'cap'):
            print(w, transitions(w, 'col', x, y0, y1))
    elif sys.argv[1] == 'mask':
        x0, y0, x1, y1 = map(int, sys.argv[2:6]); mode = sys.argv[6]
        mp = int(sys.argv[7]) if len(sys.argv) > 7 else 2
        cmp_row(f'{mode} {x0},{y0}-{x1},{y1}', x0, y0, x1, y1, mode, mp)
    elif sys.argv[1] == 'arc':
        x0, y0, x1, y1 = map(int, sys.argv[2:6]); mode = sys.argv[6]; corner = sys.argv[7]
        for w in ('ref', 'cap'):
            r = arc_radius(w, x0, y0, x1, y1, mode, corner)
            print(w, (f'R={r[0]:.1f} c=({r[1]:.1f},{r[2]:.1f})' if r else 'none'))
    else:
        raise SystemExit(__doc__)
