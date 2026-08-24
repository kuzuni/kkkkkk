# -*- coding: utf-8 -*-
"""Critic C - pixel scan, 33 재화 정보 팝업
   ref : docs/ref/33-재화-정보-팝업.jpg  1080x2340
   cap : docs/review/33-r2.png          1080x1920
   x : 1:1   |   y : cap_y = ref_y - 210
   All numbers below are printed in REF coordinates (cap values are +210 shifted).
"""
from PIL import Image
import numpy as np

DY = 210
R = np.asarray(Image.open("docs/ref/33-재화-정보-팝업.jpg").convert("RGB")).astype(int)
C = np.asarray(Image.open("docs/review/33-r2.png").convert("RGB")).astype(int)


def runs(v, lo, hi, minlen=1):
    out, cur = [], None
    for i in range(lo, hi):
        if v[i]:
            if cur is None:
                cur = i
        else:
            if cur is not None and i - cur >= minlen:
                out.append((cur, i - 1, i - cur))
            cur = None
    if cur is not None and hi - cur >= minlen:
        out.append((cur, hi - 1, hi - cur))
    return out


def bbox(m, x0, y0):
    ys, xs = np.nonzero(m)
    if not len(xs):
        return None
    return (int(xs.min()) + x0, int(xs.max()) + x0, int(ys.min()) + y0, int(ys.max()) + y0)


def line(tag, b, dy=0):
    if b is None:
        print(f"  {tag:26s} none"); return
    x0, x1, y0, y1 = b
    print(f"  {tag:26s} x {x0}..{x1} (w {x1-x0+1})   y {y0+dy}..{y1+dy} (h {y1-y0+1})")


def sect(t):
    print("\n" + "=" * 78 + f"\n{t}\n" + "=" * 78)


# ---------- 1. border box (outer black stroke) ----------
sect("1. BORDER BOX / STROKE")
box = {}
for lab, A, y0, y1, thr in (("REF", R, 760, 1620, 14), ("CAP", C, 550, 1410, 6)):
    D = A.max(axis=2) <= thr
    S = D[y0:y1 + 1, 230:850]
    cols = [x for x in range(S.shape[1]) if S[:, x].sum() > 400]
    rows = [y for y in range(S.shape[0]) if S[y, :].sum() > 400]
    bx0, bx1 = min(cols) + 230, max(cols) + 230
    by0, by1 = min(rows) + y0, max(rows) + y0
    box[lab] = (bx0, bx1, by0, by1)
    dy = DY if lab == "CAP" else 0
    print(f"  {lab}  x {bx0}..{bx1} (w {bx1-bx0+1})   y {by0+dy}..{by1+dy} (h {by1-by0+1})")
    lr = runs(D[(by0 + by1) // 2, :], 200, 900)
    tb = runs(D[:, (bx0 + bx1) // 2], y0, y1)
    print(f"        stroke L/R = {lr[0][2]}/{lr[-1][2]} px   T/B = {tb[0][2]}/{tb[-1][2]} px")

# ---------- 2. cream fill / panels / icon box ----------
sect("2. FILLS  (cream / desc panel / list panel / icon box)")


def m_cream(S):
    r, g, b = S[..., 0], S[..., 1], S[..., 2]
    return (r > 225) & (g > 205) & (b > 168) & (b < 225) & (r > g) & (g > b)


def m_panel(S):
    r, g, b = S[..., 0], S[..., 1], S[..., 2]
    return (r > 178) & (r < 212) & (g > 152) & (g < 192) & (b > 126) & (b < 166) & (r > g) & (g > b)


def m_noncream(S):
    r, g, b = S[..., 0], S[..., 1], S[..., 2]
    return ~((r > 218) & (g > 192) & (b > 150) & (b < 230))


for lab, A, ry0, ry1 in (("REF", R, 760, 1620), ("CAP", C, 550, 1410)):
    dy = DY if lab == "CAP" else 0
    print(f" [{lab}]")
    S = A[ry0:ry1 + 1, 230:850]
    line("cream fill", bbox(m_cream(S), 230, ry0), dy)
    m = m_panel(S)
    occ = m.sum(axis=1)
    for i, (a, b_, l) in enumerate(runs(occ > 60, 0, m.shape[0], minlen=8)):
        cc = m[a:b_ + 1].sum(axis=0); xs = np.nonzero(cc > 10)[0]
        line(f"panel#{i}", (xs.min() + 230, xs.max() + 230, a + ry0, b_ + ry0), dy)
    iy0 = 880 if lab == "REF" else 670
    Sb = A[iy0:iy0 + 200, 400:690]
    mb = m_noncream(Sb); occ = mb.sum(axis=1)
    a, b_, l = runs(occ > 80, 0, mb.shape[0], minlen=20)[0]
    cc = mb[a:b_ + 1].sum(axis=0); xs = np.nonzero(cc > l * .6)[0]
    line("icon box", (xs.min() + 400, xs.max() + 400, a + iy0, b_ + iy0), dy)

# ---------- 3. text ink, matched thresholds ----------
sect("3. TEXT INK  (dark-ink threshold 130 / gold r-b>90, identical both sides)")


def ink(A, x0, x1, y0, y1, t=130):
    S = A[y0:y1 + 1, x0:x1 + 1]
    return bbox(S.max(axis=2) < t, x0, y0)


def gold(A, x0, x1, y0, y1, t=90):
    S = A[y0:y1 + 1, x0:x1 + 1]
    return bbox((S[..., 0] - S[..., 2]) > t, x0, y0)


TXT = [("title (gold)", gold, (470, 610, 805, 862), (470, 610, 595, 652)),
       ("'보유:' token", ink, (438, 525, 1068, 1122), (438, 532, 858, 912)),
       ("desc line1", ink, (300, 780, 1144, 1186), (300, 780, 934, 976)),
       ("desc line2", ink, (300, 780, 1187, 1228), (300, 780, 977, 1018)),
       ("'획득처'", ink, (470, 600, 1355, 1408), (470, 600, 1146, 1198)),
       ("list row1 text", ink, (333, 786, 1410, 1450), (333, 786, 1200, 1240)),
       ("list row2 text", ink, (333, 786, 1450, 1492), (333, 786, 1240, 1282)),
       ("list row3 text", ink, (333, 786, 1492, 1532), (333, 786, 1280, 1320))]
for name, fn, rr, cc_ in TXT:
    a = fn(R, *rr); b = fn(C, *cc_)
    print(f"  {name}")
    line("   REF", a); line("   CAP(+210)", b, DY)

# ---------- 4. checkmarks + stars ----------
sect("4. CHECK MARKS  /  STAR WATERMARK")
for lab, A, ys, dy in (("REF", R, [(1412, 1450), (1452, 1492), (1492, 1532)], 0),
                       ("CAP", C, [(1202, 1240), (1242, 1282), (1282, 1322)], DY)):
    for i, (y0, y1) in enumerate(ys):
        S = A[y0:y1 + 1, 292:335]
        r, g, b = S[..., 0], S[..., 1], S[..., 2]
        line(f"{lab} check{i}", bbox((g - r > 35) & (g - b > 45), 292, y0), dy)
for lab, A, y0, dy in (("REF", R, 890, 0), ("CAP", C, 680, DY)):
    S = A[y0:y0 + 70, 285:360]
    line(f"{lab} star(top-left)", bbox(S[..., 0] < 232, 285, y0), dy)

# ---------- 5. surface colours ----------
sect("5. SURFACE COLOURS (median)")
P = [("header band", (300, 780, 800, 860), (300, 780, 590, 650)),
     ("cream", (280, 300, 1100, 1125), (280, 300, 890, 915)),
     ("desc panel", (700, 780, 1250, 1300), (700, 780, 1040, 1090)),
     ("list panel", (700, 780, 1420, 1470), (700, 780, 1210, 1260)),
     ("icon box fill", (480, 500, 930, 960), (480, 500, 720, 750))]
for n, rb, cb in P:
    a = tuple(int(v) for v in np.median(R[rb[2]:rb[3], rb[0]:rb[1]].reshape(-1, 3), axis=0))
    b = tuple(int(v) for v in np.median(C[cb[2]:cb[3], cb[0]:cb[1]].reshape(-1, 3), axis=0))
    print(f"  {n:16s} REF {str(a):18s} CAP {str(b):18s} Δ {[b[i]-a[i] for i in range(3)]}")
