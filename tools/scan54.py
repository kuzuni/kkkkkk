"""작업 54 (랭킹 팝업) 레퍼런스 픽셀 스캐너.

scan53.py 를 일반화했다 — 대상 이미지를 인자로 받고 bbox/hist 모드를 추가했다.
LESSONS 34-① «주기 패턴·틴트는 세그먼트 개수가 아니라 면적 히스토그램으로 판정하라» ·
LESSONS 22-① «가림 없는 열의 세로 연속 높이로 재라» 를 쓰기 위한 도구.

  python3 tools/scan54.py <img> row  <y> <x0> <x1> [th]     한 행의 색 세그먼트
  python3 tools/scan54.py <img> col  <x> <y0> <y1> [th]     한 열의 색 세그먼트
  python3 tools/scan54.py <img> rect <x0> <y0> <x1> <y1>    면적 히스토그램(8단위 양자화)
  python3 tools/scan54.py <img> rowsum <x0> <x1> <y0> <y1>  행 평균 밝기 변화점
  python3 tools/scan54.py <img> colsum <y0> <y1> <x0> <x1>  열 평균 밝기 변화점
  python3 tools/scan54.py <img> bbox <x0> <y0> <x1> <y1> <pred> [minrun]
        pred: dark<N> | light>N | near:RRGGBB:tol | notnear:RRGGBB:tol
        → 조건을 만족하는 화소의 bbox + 행/열 히스토그램 요약
  python3 tools/scan54.py <img> runs <axis> <fixed> <a0> <a1> <pred>
        축을 따라가며 pred 를 만족하는 연속 구간 나열 (axis=row|col)
  python3 tools/scan54.py <img> px <x> <y>                  단일 화소
  python3 tools/scan54.py <img> prof <axis> <x0> <y0> <x1> <y1> <pred>
        axis=row → 각 y 의 (첫 x, 끝 x, 개수) / axis=col → 각 x 의 (첫 y, 끝 y, 개수)
        같은 값이 연속되면 «y a..b» 로 압축 → 코너 반경·모서리 프로파일 추출용
  python3 tools/scan54.py <img> tile <x0> <y0> <x1> <y1> <axis> <pmin> <pmax>
        축 방향 자기상관으로 워터마크 타일 주기 탐색 (pmin..pmax 주기 중 최적)
"""
import sys
from pydep937 import Image

img = sys.argv[1]
im = Image.open(img).convert('RGB')
W, H = im.size
px = im.load()
mode = sys.argv[2]
A = sys.argv[3:]


def hx(c):
    return '#%02X%02X%02X' % (c[0], c[1], c[2])


def mkpred(s):
    if s.startswith('dark<'):
        n = int(s[5:]);  return lambda c: (c[0] + c[1] + c[2]) / 3 < n
    if s.startswith('light>'):
        n = int(s[6:]);  return lambda c: (c[0] + c[1] + c[2]) / 3 > n
    if s.startswith('near:'):
        _, rgb, tol = s.split(':'); t = int(tol)
        r, g, b = int(rgb[0:2], 16), int(rgb[2:4], 16), int(rgb[4:6], 16)
        return lambda c: abs(c[0] - r) <= t and abs(c[1] - g) <= t and abs(c[2] - b) <= t
    if s.startswith('notnear:'):
        _, rgb, tol = s.split(':'); t = int(tol)
        r, g, b = int(rgb[0:2], 16), int(rgb[2:4], 16), int(rgb[4:6], 16)
        return lambda c: not (abs(c[0] - r) <= t and abs(c[1] - g) <= t and abs(c[2] - b) <= t)
    raise SystemExit('알 수 없는 pred: ' + s)


if mode == 'size':
    print(f'{W}x{H}')

elif mode == 'px':
    x, y = int(A[0]), int(A[1]); print(f'({x},{y}) {hx(px[x, y])} {px[x, y]}')

elif mode == 'row':
    y, x0, x1 = int(A[0]), int(A[1]), int(A[2])
    th = int(A[3]) if len(A) > 3 else 18
    segs = []; s = x0; prev = px[x0, y]
    for x in range(x0 + 1, x1 + 1):
        c = px[x, y]
        if max(abs(c[i] - prev[i]) for i in range(3)) > th:
            segs.append((s, x - 1, prev)); s = x
        prev = c
    segs.append((s, x1, prev))
    for a, b, c in segs:
        print(f'{a}..{b} ({b - a + 1}) {hx(c)}')

elif mode == 'col':
    x, y0, y1 = int(A[0]), int(A[1]), int(A[2])
    th = int(A[3]) if len(A) > 3 else 18
    segs = []; s = y0; prev = px[x, y0]
    for y in range(y0 + 1, y1 + 1):
        c = px[x, y]
        if max(abs(c[i] - prev[i]) for i in range(3)) > th:
            segs.append((s, y - 1, prev)); s = y
        prev = c
    segs.append((s, y1, prev))
    for a, b, c in segs:
        print(f'{a}..{b} ({b - a + 1}) {hx(c)}')

elif mode == 'rect':
    from collections import Counter
    x0, y0, x1, y1 = map(int, A[:4])
    cnt = Counter()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = px[x, y]; cnt[(c[0] // 8 * 8, c[1] // 8 * 8, c[2] // 8 * 8)] += 1
    t = sum(cnt.values())
    for c, n in cnt.most_common(14):
        print(f'{hx(c)} {n * 100 / t:.1f}%')

elif mode == 'rowsum':
    x0, x1, y0, y1 = map(int, A[:4])
    prev = None
    for y in range(y0, y1 + 1):
        s = sum(sum(px[x, y]) for x in range(x0, x1 + 1)) / (3 * (x1 - x0 + 1))
        if prev is None or abs(s - prev) > 6:
            print(f'y{y} {s:.1f}'); prev = s

elif mode == 'colsum':
    y0, y1, x0, x1 = map(int, A[:4])
    prev = None
    for x in range(x0, x1 + 1):
        s = sum(sum(px[x, y]) for y in range(y0, y1 + 1)) / (3 * (y1 - y0 + 1))
        if prev is None or abs(s - prev) > 6:
            print(f'x{x} {s:.1f}'); prev = s

elif mode == 'bbox':
    x0, y0, x1, y1 = map(int, A[:4])
    p = mkpred(A[4])
    minrun = int(A[5]) if len(A) > 5 else 1
    xs, ys, n = [], [], 0
    rows, cols = {}, {}
    for y in range(y0, y1 + 1):
        run = 0
        for x in range(x0, x1 + 1):
            if p(px[x, y]):
                run += 1
            else:
                if run >= minrun:
                    for xx in range(x - run, x):
                        xs.append(xx); ys.append(y); n += 1
                        rows[y] = rows.get(y, 0) + 1; cols[xx] = cols.get(xx, 0) + 1
                run = 0
        if run >= minrun:
            for xx in range(x1 + 1 - run, x1 + 1):
                xs.append(xx); ys.append(y); n += 1
                rows[y] = rows.get(y, 0) + 1; cols[xx] = cols.get(xx, 0) + 1
    if not n:
        print('MATCH 0'); raise SystemExit
    print(f'MATCH {n}  bbox x{min(xs)}..{max(xs)} (w{max(xs) - min(xs) + 1}) '
          f'y{min(ys)}..{max(ys)} (h{max(ys) - min(ys) + 1}) '
          f'cx{(min(xs) + max(xs)) / 2:.1f} cy{(min(ys) + max(ys)) / 2:.1f}')

elif mode == 'runs':
    axis, fixed, a0, a1 = A[0], int(A[1]), int(A[2]), int(A[3])
    p = mkpred(A[4])
    out = []; run = 0
    for a in range(a0, a1 + 1):
        c = px[a, fixed] if axis == 'row' else px[fixed, a]
        if p(c):
            run += 1
        else:
            if run:
                out.append((a - run, a - 1, run))
            run = 0
    if run:
        out.append((a1 + 1 - run, a1, run))
    for a, b, r in out:
        print(f'{a}..{b} ({r})')

elif mode == 'prof':
    axis = A[0]
    x0, y0, x1, y1 = map(int, A[1:5])
    p = mkpred(A[5])
    out = []
    outer = range(y0, y1 + 1) if axis == 'row' else range(x0, x1 + 1)
    inner = range(x0, x1 + 1) if axis == 'row' else range(y0, y1 + 1)
    for a in outer:
        hits = [b for b in inner if p(px[b, a] if axis == 'row' else px[a, b])]
        out.append((a, (hits[0], hits[-1], len(hits)) if hits else None))
    # 같은 값 연속 압축
    s = 0
    for i in range(1, len(out) + 1):
        if i == len(out) or out[i][1] != out[s][1]:
            a0, a1_ = out[s][0], out[i - 1][0]
            tag = f'{a0}' if a0 == a1_ else f'{a0}..{a1_}'
            v = out[s][1]
            print(f'{tag}: ' + ('none' if v is None else f'{v[0]}..{v[1]} n{v[2]}'))
            s = i

elif mode == 'tile':
    x0, y0, x1, y1 = map(int, A[:4])
    axis = A[4]; pmin, pmax = int(A[5]), int(A[6])
    if axis == 'row':      # 가로 주기
        sig = [sum(sum(px[x, y]) for y in range(y0, y1 + 1)) / (y1 - y0 + 1)
               for x in range(x0, x1 + 1)]
    else:                  # 세로 주기
        sig = [sum(sum(px[x, y]) for x in range(x0, x1 + 1)) / (x1 - x0 + 1)
               for y in range(y0, y1 + 1)]
    m = sum(sig) / len(sig)
    sig = [v - m for v in sig]
    best = []
    for p_ in range(pmin, pmax + 1):
        n = len(sig) - p_
        if n < p_:
            continue
        num = sum(sig[i] * sig[i + p_] for i in range(n))
        den = (sum(sig[i] ** 2 for i in range(n)) * sum(sig[i + p_] ** 2 for i in range(n))) ** .5
        best.append((num / den if den else 0, p_))
    best.sort(reverse=True)
    for c, p_ in best[:8]:
        print(f'period {p_}  r={c:.3f}')

else:
    raise SystemExit('알 수 없는 모드: ' + mode)
