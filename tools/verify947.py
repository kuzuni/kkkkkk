#!/usr/bin/env python3
"""작업 947 — `verify947.js` 가 읽는 **합성 시험대**.

   python3 tools/verify947.py

레퍼런스도 캡처도 안 쓴다 — 진짜 치수를 **내가 정한** 그림 쌍을 그 자리에서 만들어
`probe866.diff_box` 에게 물어본다(캡처 PNG 는 커밋 금지 자산이라 자가 그것에 기대면
없는 클론에서 빨개진다 — 953 이 그 자리다). 한 줄에 한 표본을 «키=값» 으로 찍는다.

  ⓐ `cross`  = 등재문 처방 ⓐ(`flat()` 과 같은 `_cross` 교차점)를 그대로 얹었을 때
  ⓑ `cov`    = 947 이 고른 소속도 걸음(지금 `probe866.cov_f`)
  ⓒ `int`    = 옛 정수 걸음(`--int`)
  ⓓ `covmax` = 소속도인데 끝 행 통계만 «중앙값» 대신 «최댓값» (945 가 그만둔 자리)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pydep937 import Image                            # 937 — 없으면 «한 줄 + 코드 2»
import probe866 as M

TH = 8
BG = (208, 206, 200)
FG = (20, 18, 16)


def cov1(lo, hi, i):
    """화소 i(중심)가 [lo, hi] 에 덮인 길이 — 0..1."""
    return max(0.0, min(hi, i + .5) - max(lo, i - .5))


def make(w, h, x0, y0, ww, hh, r=0.0, notch=0):
    """(부품 있는 판, 숨긴 판) — 부품은 [x0, x0+ww] × [y0, y0+hh] 상자(모서리 반지름 r).
       모서리가 있으면 8×8 초표본으로 덮인 넓이를 낸다(둥근 어깨를 진짜로 만든다).

       `notch` = 양 끝 n 열의 **안쪽 두 행**을 끝 행과 같은 색으로 눌러 «안쪽 이웃이 가득 차
       있지 않은 열» 을 만든다 — 실캡처의 둥근 어깨가 바로 그 모양이다(끝 행 256열 중
       250열이 α 0.302 인데 코너 네 열만 1.00). 945 가 «거기서 재기를 그만둔» 자리."""
    a = Image.new('RGB', (w, h), BG)
    b = Image.new('RGB', (w, h), BG)
    pa = a.load()
    x1, y1 = x0 + ww, y0 + hh
    for y in range(h):
        for x in range(w):
            if r <= 0:
                al = cov1(x0, x1, x) * cov1(y0, y1, y)
            else:
                n, s = 8, 0
                for sy in range(n):
                    for sx in range(n):
                        px, py = x - .5 + (sx + .5) / n, y - .5 + (sy + .5) / n
                        if not (x0 <= px <= x1 and y0 <= py <= y1):
                            continue
                        cx = min(max(px, x0 + r), x1 - r)
                        cy = min(max(py, y0 + r), y1 - r)
                        if (px - cx) ** 2 + (py - cy) ** 2 <= r * r:
                            s += 1
                al = s / float(n * n)
            if al > 0:
                pa[x, y] = tuple(int(round(BG[i] + (FG[i] - BG[i]) * al)) for i in range(3))
    if notch:
        pb0 = b.load()

        def dv0(x, y):
            return abs(M.lum(pa[x, y]) - M.lum(pb0[x, y]))

        ty, xs = None, []
        for y in range(h):
            xs = [x for x in range(w) if dv0(x, y) > TH]
            if xs:
                ty = y
                break
        for k in range(notch):
            for x in (xs[k], xs[-1 - k]):
                for y in (ty + 1, ty + 2):
                    pa[x, y] = pa[x, ty]
    return a.load(), b.load()


def read(pa, pb, win, kind):
    """네 걸음(int·cross·cov·covmax)으로 같은 상자를 잰다 — 창·마스크는 하나다."""
    box = M.diff_box(pa, pb, win, TH)
    x0, y0, x1, y1 = [int(v) for v in win]

    def dv(x, y):
        return abs(M.lum(pa[x, y]) - M.lum(pb[x, y]))

    rows = {}
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if dv(x, y) > TH]
        if xs:
            rows[y] = (min(xs), max(xs))

    def push(val, i, step):
        v = val(i)
        if kind == 'int':
            return 0.5
        if kind == 'cross':
            f = M._cross(v, val(i + step), TH)
            return 0.5 if f is None else f
        ins = [u for u in (val(i - step * k) for k in (1, 2, 3)) if u > TH]
        if not ins:
            return 0.5
        c = M.med(ins)
        return (min(1.0, v / c) - 0.5) if c > 0 else 0.5

    def span(y):
        a, z = rows[y]
        row = lambda i: dv(i, y)                                      # noqa: E731
        return (z + push(row, z, +1)) - (a - push(row, a, -1))

    def edge(y, step):
        a, z = rows[y]
        fs = [push(lambda j: dv(x, j), y, step) for x in
              (range(a, z + 1) if kind == 'covmax' else M.v_band(a, z)) if dv(x, y) > TH]
        if not fs:
            return 0.5
        return max(fs) if kind == 'covmax' else M.med(fs)

    ys = sorted(rows)
    return (max(span(y) for y in rows),
            (ys[-1] + edge(ys[-1], +1)) - (ys[0] - edge(ys[0], -1)),
            box)


def main():
    W, H = 160, 90
    print('# 947 합성 시험대 — 진짜 치수를 내가 정한 그림 쌍')
    # ⓪ 차분 경계가 «램프» 인가 «계단» 인가 — 밖 화소의 차분을 그대로 찍는다
    pa, pb = make(W, H, 30.0, 20.0, 100.4, 40.6)
    out = [abs(M.lum(pa[x, 40]) - M.lum(pb[x, 40])) for x in (26, 27, 28, 29)]
    print('STEP outside=%s' % ','.join('%.3f' % v for v in out))

    win = (5, 5, W - 5, H - 5)
    for ww, hh, r, notch in ((100.0, 40.0, 0, 0), (100.3, 40.3, 0, 0), (100.5, 40.5, 0, 0),
                             (100.7, 40.7, 0, 0), (100.4, 40.6, 0, 0), (100.4, 40.6, 9.0, 0),
                             (100.4, 40.6, 9.0, 4)):
        pa, pb = make(W, H, 30.0, 20.0, ww, hh, r, notch)
        vals = {}
        for kind in ('int', 'cross', 'cov', 'covmax'):
            w_, h_, box = read(pa, pb, win, kind)
            vals[kind] = (w_, h_)
        M.SUB = True
        sw, sh = M.diff_box(pa, pb, win, TH, sub=True)['ws'], \
            M.diff_box(pa, pb, win, TH, sub=True)['hs']
        M.SUB = False
        iw = M.diff_box(pa, pb, win, TH, sub=True)
        M.SUB = True
        print('SYN r=%.1f notch=%d truth_w=%.2f truth_h=%.2f box_w=%d box_h=%d '
              'int_w=%.2f int_h=%.2f cross_w=%.2f cross_h=%.2f cov_w=%.2f cov_h=%.2f '
              'covmax_h=%.2f probe_w=%.2f probe_h=%.2f intmode_w=%.2f intmode_h=%.2f'
              % (r, notch, ww, hh, iw['w'], iw['h'],
                 vals['int'][0], vals['int'][1], vals['cross'][0], vals['cross'][1],
                 vals['cov'][0], vals['cov'][1], vals['covmax'][1],
                 sw, sh, iw['ws'], iw['hs']))


if __name__ == '__main__':
    main()
