# -*- coding: utf-8 -*-
"""critA33.py — 비평가 A 독립 픽셀 스캔 (최종 측정)

ref: docs/ref/33-재화-정보-팝업.jpg (1080x2340)
cap: docs/review/33-r1.png        (1080x1920)
규약: 가로 1:1 · 세로 impl_y = ref_y - 210  (정중앙 다이얼로그 앵커)
CAP 수치는 전부 «ref 등가 좌표»(= 실제 y + 210) 로 출력한다.
"""
import numpy as np
from PIL import Image

REF = 'docs/ref/33-재화-정보-팝업.jpg'
CAP = 'docs/review/33-r1.png'
DY = 210
CREAM = np.array([240, 217, 186])


def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(int)


def runs(mask, base=0):
    out, s = [], None
    for i, v in enumerate(mask):
        if v:
            if s is None:
                s = i
        else:
            if s is not None:
                out.append((s + base, i - 1 + base, i - s))
                s = None
    if s is not None:
        out.append((s + base, len(mask) - 1 + base, len(mask) - s))
    return out


def bbox(m):
    ys, xs = np.where(m)
    if len(ys) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


class S:
    def __init__(self, path, off):
        self.A = load(path)
        self.off = off

    def win(self, x0, y0, x1, y1):
        return self.A[y0 - self.off:y1 - self.off + 1, x0:x1 + 1]

    def bb(self, x0, y0, x1, y1, m):
        b = bbox(m)
        return None if b is None else (b[0] + x0, b[1] + y0, b[2] + x0, b[3] + y0)

    def px(self, x, y):
        return self.A[y - self.off, x]

    # 마스크
    @staticmethod
    def ink(W, thr=90):
        return W.max(axis=-1) < thr

    @staticmethod
    def yellow(W):
        return (W[..., 0] > 200) & (W[..., 1] > 150) & (W[..., 2] < 150) & (W[..., 0] - W[..., 2] > 90)

    @staticmethod
    def green(W):
        return (W[..., 1] > 170) & (W[..., 1] - W[..., 0] > 45) & (W[..., 1] - W[..., 2] > 60)

    @staticmethod
    def white(W):
        return (W > 226).all(axis=-1)

    # ── 서브픽셀 엣지: 값 시퀀스가 thr 를 가로지르는 위치 ──
    def cross(self, vals, base, thr, first=True):
        n = len(vals)
        rng = range(n - 1) if first else range(n - 2, -1, -1)
        for i in rng:
            a, b = vals[i], vals[i + 1]
            if (a >= thr) != (b >= thr):
                # 선형보간
                if a == b:
                    return base + i + 0.5
                t = (thr - a) / float(b - a)
                return round(base + i + t, 2)
        return None

    def vprof(self, x, ya, yb, ch=0):
        return [int(self.px(x, y)[ch]) for y in range(ya, yb + 1)]

    def hprof(self, y, xa, xb, ch=0):
        return [int(self.px(x, y)[ch]) for x in range(xa, xb + 1)]


def measure(sc):
    r = {}

    # ── §1 팝업 border-box ─────────────────────────────────────
    # 갈색 링(86,68,58 / 70,56,45)을 찾고, 그 바깥 검정 밴드의 바깥 끝이 border-box 변.
    ring = (np.abs(sc.A - np.array([86, 68, 58])) <= 26).all(axis=-1) | \
           (np.abs(sc.A - np.array([70, 56, 45])) <= 26).all(axis=-1)
    y = 1200
    rw = ring[y - sc.off]
    lrun = [q for q in runs(rw) if q[1] < 300 and q[2] >= 6][-1]
    rrun = [q for q in runs(rw) if q[0] > 780 and q[2] >= 6][0]
    # 검정: 링 바깥으로 걸어나가며 max<8 인 밴드
    def walk(axis, fixed, start, step):
        t = start
        seen = 0
        lim = sc.A.shape[1] if axis == 'x' else sc.A.shape[0] + sc.off
        while 0 <= t < lim:
            c = sc.px(t, fixed) if axis == 'x' else sc.px(fixed, t)
            if max(c) < 8:
                seen += 1
            elif seen >= 4:
                return t - step   # 마지막 검정 픽셀
            elif seen and max(c) > 60:
                return t - step
            t += step
        return None
    lx = walk('x', y, lrun[0] - 1, -1)
    rx = walk('x', y, rrun[1] + 1, +1)
    # 상/하: x=300 (타이틀 글자 없음)
    xh = 300
    rc = ring[:, xh]
    ur = [q for q in runs(rc, sc.off) if q[1] < 880 and q[2] >= 4]
    dr = [q for q in runs(rc, sc.off) if q[0] > 1560 and q[2] >= 4]
    ty = walk('y', xh, (ur[-1][0] if ur else 789) - 1, -1)
    by = walk('y', xh, dr[0][1] + 1, +1)
    # 헤더 바가 상변을 차지하므로 헤더 위 검정을 직접 찾는다
    hdr = (np.abs(sc.A - np.array([91, 70, 67])) <= 24).all(axis=-1) | \
          (np.abs(sc.A - np.array([82, 62, 61])) <= 24).all(axis=-1)
    hc = [q for q in runs(hdr[:, xh], sc.off) if q[2] > 40 and q[0] < 900][0]
    ty = walk('y', xh, hc[0] - 1, -1)
    r['popup'] = (lx - 1, ty - 1, rx + 1, by + 1)   # AA 1px 보정 (양쪽 동일 적용)
    r['header'] = (None, hc[0], None, hc[1])

    # ── 크림 fill ──────────────────────────────────────────────
    cream = (np.abs(sc.A - CREAM) <= 10).all(axis=-1)
    q = [z for z in runs(cream[1350 - sc.off]) if z[2] > 300][0]
    band = cream[:, q[0]:q[1] + 1].sum(axis=1)
    seg = [z for z in runs(band > q[2] * 0.5, sc.off) if z[2] > 20]
    r['cream'] = (q[0], seg[0][0], q[1], seg[-1][1])
    r['header'] = (q[0], hc[0], q[1], hc[1])

    # ── §2 타이틀 ──────────────────────────────────────────────
    W = sc.win(300, 795, 780, 870)
    r['title_core'] = sc.bb(300, 795, 780, 870, sc.yellow(W))
    tc = r['title_core']
    W = sc.win(tc[0] - 14, tc[1] - 14, tc[2] + 14, tc[3] + 14)
    r['title_ink'] = sc.bb(tc[0] - 14, tc[1] - 14, tc[2] + 14, tc[3] + 14, sc.ink(W, 70))

    # ── §3 아이콘 박스 ─────────────────────────────────────────
    W = sc.win(430, 885, 650, 1070)
    ib = sc.ink(W, 110)
    rowc = ib.sum(axis=1)
    seg = [z for z in runs(rowc > 6, 885) if z[2] > 100][0]
    m = ib[seg[0] - 885:seg[1] - 885 + 1]
    b = bbox(m)
    r['icon_box'] = (b[0] + 430, seg[0], b[2] + 430, seg[1])
    bx0, by0, bx1, by1 = r['icon_box']
    p = 16
    W2 = sc.win(bx0 + p, by0 + p, bx1 - p, by1 - p)
    oran = (np.abs(W2 - np.array([252, 193, 50])) <= 58).all(axis=-1) | \
           (np.abs(W2 - np.array([211, 124, 19])) <= 58).all(axis=-1) | \
           (np.abs(W2 - np.array([240, 160, 35])) <= 62).all(axis=-1)
    r['icon_art'] = sc.bb(bx0 + p, by0 + p, bx1 - p, by1 - p, ~oran)

    # ── §4 보유 라인 ───────────────────────────────────────────
    W = sc.win(280, 1062, 800, 1128)
    r['own_ink'] = sc.bb(280, 1062, 800, 1128, sc.ink(W, 90))
    r['own_core'] = sc.bb(280, 1062, 800, 1128, sc.green(W))
    # 첫 글자 «보» 만 (좌단 +42px 이내) — 한글 대문자 높이 비교용
    ox0 = r['own_ink'][0]
    W = sc.win(ox0, 1062, ox0 + 40, 1128)
    r['own_ch1'] = sc.bb(ox0, 1062, ox0 + 40, 1128, sc.ink(W, 90))

    # ── §5 패널 (서브픽셀) ─────────────────────────────────────
    def pv(x, ya, yb):
        v = sc.vprof(x, ya, yb)
        return sc.cross(v, ya, 222, True), sc.cross(v, ya, 222, False)

    def ph(y, xa, xb):
        v = sc.hprof(y, xa, xb)
        return sc.cross(v, xa, 222, True), sc.cross(v, xa, 222, False)

    t, b_ = pv(540, 1120, 1345)
    l, rg = ph(1300, 280, 800)
    r['desc_panel'] = (l, t, rg, b_)
    t2, _ = pv(760, 1370, 1420)
    _, b2 = pv(540, 1450, 1560)
    l2, r2 = ph(1530, 280, 800)
    r['list_panel'] = (l2, t2, r2, b2)

    # ── §6 설명 본문 ───────────────────────────────────────────
    px0, py0, px1, py1 = 292, 1135, 787, 1330
    W = sc.win(px0, py0, px1, py1)
    w = sc.white(W)
    r['desc_lines'] = []
    for a, b3, L in [z for z in runs(w.sum(axis=1) >= 3, py0) if z[2] >= 10]:
        bb = bbox(w[a - py0:b3 - py0 + 1])
        r['desc_lines'].append((bb[0] + px0, a, bb[2] + px0, b3))

    # ── §7 획득처 라벨 ─────────────────────────────────────────
    W = sc.win(440, 1350, 650, 1412)
    r['src_ink'] = sc.bb(440, 1350, 650, 1412, sc.ink(W, 90))
    r['src_core'] = sc.bb(440, 1350, 650, 1412,
                          (np.abs(W - np.array([254, 247, 175])) <= 26).all(axis=-1))

    # ── §8 체크 + 행 텍스트 ────────────────────────────────────
    lx0, lx1 = 292, 787
    W = sc.win(lx0, 1390, lx1, 1540)
    g = sc.green(W)
    r['checks'] = []
    for a, b4, L in [z for z in runs(g.sum(axis=1) >= 1, 1390) if z[2] >= 8]:
        bb = bbox(g[a - 1390:b4 - 1390 + 1])
        r['checks'].append((bb[0] + lx0, a, bb[2] + lx0, b4))
    ik = sc.ink(W, 90)
    r['rows'] = []
    for (cx0, cy0, cx1, cy1) in r['checks']:
        band = ik[cy0 - 1390 - 9:cy1 - 1390 + 10, cx1 - lx0 + 3:]
        bb = bbox(band)
        r['rows'].append(None if bb is None else
                         (bb[0] + cx1 + 3, bb[1] + cy0 - 9, bb[2] + cx1 + 3, bb[3] + cy0 - 9))

    # ── §9 «보» 글자만 (양쪽 동일 글자) 연두 코어 ────────────────
    gx0 = r['own_core'][0]
    Wc = sc.win(gx0, 1065, gx0 + 36, 1125)
    r['own_bo'] = sc.bb(gx0, 1065, gx0 + 36, 1125, sc.green(Wc))

    # ── §10 체크 외곽선 박스 (체크만 있는 좁은 창) ────────────────
    r['check_out'] = []
    for yc in (1430, 1470, 1510):
        Wc = sc.win(294, yc - 24, 331, yc + 24)
        r['check_out'].append(sc.bb(294, yc - 24, 331, yc + 24, sc.ink(Wc, 100)))

    # ── §11 별 워터마크 타일 (아이콘 박스 왼쪽 밴드) ──────────────
    Wc = sc.win(262, 885, 455, 1125)
    st = (np.abs(Wc - np.array([229, 202, 172])) <= 10).all(axis=-1)
    r['stars'] = []
    for a, b5, L in [z for z in runs(st.sum(axis=1) > 0, 885) if z[2] >= 5]:
        bb = bbox(st[a - 885:b5 - 885 + 1])
        r['stars'].append((bb[0] + 262, a, bb[2] + 262, b5))

    # ── §12 체크 우단 -> 행 텍스트 좌단 gap ──────────────────────
    r['ck_gap'] = [r['rows'][i][0] - r['checks'][i][2] for i in range(len(r['checks']))
                   if r['rows'][i]]
    return r



def f(b):
    if b is None or b[0] is None:
        return 'FAIL'
    x0, y0, x1, y1 = b
    return 'x %.1f..%.1f (w %.1f)  y %.1f..%.1f (h %.1f)' % (x0, x1, x1 - x0 + 1, y0, y1, y1 - y0 + 1)


def dd(a, b):
    return '—' if a is None or b is None else '%+.1f' % (b - a)


if __name__ == '__main__':
    R = measure(S(REF, 0))
    C = measure(S(CAP, DY))
    print('=' * 104)
    print('%-14s | %-42s | %s' % ('요소', 'REF (1080x2340)', 'CAP (ref 등가 y+210)'))
    print('=' * 104)
    for k in ('popup', 'header', 'cream', 'title_core', 'title_ink', 'icon_box', 'icon_art',
              'own_ink', 'own_core', 'own_ch1', 'desc_panel', 'src_ink', 'src_core', 'list_panel'):
        a, b = R.get(k), C.get(k)
        print('%-14s | %-42s | %s' % (k, f(a), f(b)))
        if a and b and a[0] is not None and b[0] is not None:
            print('%-14s | Δx0 %-6s Δy0 %-6s Δw %-6s Δh %-6s  (Δcx %s)' %
                  ('', dd(a[0], b[0]), dd(a[1], b[1]), dd(a[2] - a[0], b[2] - b[0]),
                   dd(a[3] - a[1], b[3] - b[1]),
                   dd((a[0] + a[2]) / 2, (b[0] + b[2]) / 2)))
    print('\n-- 설명 본문 (문구 동일 → 폭도 비교 가능) --')
    for i in range(max(len(R['desc_lines']), len(C['desc_lines']))):
        a = R['desc_lines'][i] if i < len(R['desc_lines']) else None
        b = C['desc_lines'][i] if i < len(C['desc_lines']) else None
        print(' L%d REF %-42s CAP %-42s  Δw %s Δh %s Δy %s' %
              (i + 1, f(a), f(b), dd(a[2] - a[0], b[2] - b[0]) if a and b else '—',
               dd(a[3] - a[1], b[3] - b[1]) if a and b else '—', dd(a[1], b[1]) if a and b else '—'))
    if len(R['desc_lines']) >= 2 and len(C['desc_lines']) >= 2:
        print(' 줄 pitch  REF %d  CAP %d  Δ %+d' % (R['desc_lines'][1][1] - R['desc_lines'][0][1],
                                                  C['desc_lines'][1][1] - C['desc_lines'][0][1],
                                                  (C['desc_lines'][1][1] - C['desc_lines'][0][1]) -
                                                  (R['desc_lines'][1][1] - R['desc_lines'][0][1])))
    print('\n-- 체크 아이콘 --')
    for i in range(3):
        a = R['checks'][i] if i < len(R['checks']) else None
        b = C['checks'][i] if i < len(C['checks']) else None
        print(' C%d REF %-42s CAP %-42s' % (i + 1, f(a), f(b)))
    print(' pitch REF %s  CAP %s' % ([R['checks'][i + 1][1] - R['checks'][i][1] for i in range(len(R['checks']) - 1)],
                                     [C['checks'][i + 1][1] - C['checks'][i][1] for i in range(len(C['checks']) - 1)]))
    print('\n-- 행 텍스트 잉크 (문구 다름 → 폭 무시, 높이·위치만) --')
    for i in range(3):
        a = R['rows'][i] if i < len(R['rows']) else None
        b = C['rows'][i] if i < len(C['rows']) else None
        print(' T%d REF %-42s CAP %-42s  Δx0 %s Δh %s' %
              (i + 1, f(a), f(b), dd(a[0], b[0]) if a and b else '—',
               dd(a[3] - a[1], b[3] - b[1]) if a and b else '—'))

    print('\n-- 동일 글자 «보» 연두코어 / 획득처 연노랑코어 --')
    for k in ('own_bo', 'src_core'):
        print(' %-10s REF %-42s CAP %-42s Δw %s Δh %s' %
              (k, f(R[k]), f(C[k]), dd(R[k][2] - R[k][0], C[k][2] - C[k][0]),
               dd(R[k][3] - R[k][1], C[k][3] - C[k][1])))

    print('\n-- 체크 외곽선 박스 --')
    for i in range(3):
        print(' O%d REF %-42s CAP %-42s' % (i + 1, f(R['check_out'][i]), f(C['check_out'][i])))
    print(' 체크우단 -> 텍스트좌단 gap  REF %s  CAP %s' % (R['ck_gap'], C['ck_gap']))

    print('\n-- 별 워터마크 타일 --')
    for i in range(max(len(R['stars']), len(C['stars']))):
        a = R['stars'][i] if i < len(R['stars']) else None
        b = C['stars'][i] if i < len(C['stars']) else None
        print(' S%d REF %-42s CAP %-42s' % (i + 1, f(a), f(b)))

    print('\n-- 세로 gap 사슬 (ref 등가) --')
    chain = [
        ('팝업상단 -> 헤더하단(헤더높이)', lambda z: z['header'][3] - z['popup'][1]),
        ('헤더하단 -> 크림상단', lambda z: z['cream'][1] - z['header'][3]),
        ('크림상단 -> 아이콘박스상단', lambda z: z['icon_box'][1] - z['cream'][1]),
        ('아이콘박스하단 -> 보유잉크상단', lambda z: z['own_ink'][1] - z['icon_box'][3]),
        ('보유잉크하단 -> 설명패널상단', lambda z: z['desc_panel'][1] - z['own_ink'][3]),
        ('설명패널상단 -> 본문L1상단', lambda z: z['desc_lines'][0][1] - z['desc_panel'][1]),
        ('본문L2하단 -> 설명패널하단', lambda z: z['desc_panel'][3] - z['desc_lines'][-1][3]),
        ('설명패널하단 -> 획득처잉크상단', lambda z: z['src_ink'][1] - z['desc_panel'][3]),
        ('획득처잉크상단 -> 리스트패널상단', lambda z: z['list_panel'][1] - z['src_ink'][1]),
        ('리스트패널상단 -> 체크1상단', lambda z: z['checks'][0][1] - z['list_panel'][1]),
        ('체크3하단 -> 리스트패널하단', lambda z: z['list_panel'][3] - z['checks'][-1][3]),
        ('리스트패널하단 -> 크림하단', lambda z: z['cream'][3] - z['list_panel'][3]),
        ('크림하단 -> 팝업하단', lambda z: z['popup'][3] - z['cream'][3]),
    ]
    for n, fn in chain:
        va, vb = fn(R), fn(C)
        print(' %-30s REF %8.1f   CAP %8.1f   Δ %s' % (n, va, vb, dd(va, vb)))

    print('\n-- 가로 중심 (팝업 중심 = %.1f / %.1f) --' %
          ((R['popup'][0] + R['popup'][2]) / 2, (C['popup'][0] + C['popup'][2]) / 2))
    for k in ('title_core', 'icon_box', 'icon_art', 'own_core', 'desc_panel', 'src_ink', 'list_panel'):
        a, b = R[k], C[k]
        print(' %-12s REF cx %7.1f  CAP cx %7.1f  Δ %s' %
              (k, (a[0] + a[2]) / 2, (b[0] + b[2]) / 2, dd((a[0] + a[2]) / 2, (b[0] + b[2]) / 2)))
