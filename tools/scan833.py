#!/usr/bin/env python3
"""작업 833 ③ — 헤더 밴드(제목 띠) 세로 자.

667 10회차의 `scan667c.py` 는 «밝은 것 ↔ 검정 ↔ 밝은 것» 인 자리에서만 검정 질량을 잰다.
머리띠 **위**는 카드 바깥(어두운 바탕 + 드롭섀도)이라 그 자를 그대로는 못 댄다.
⇒ 이 자는 «질량» 대신 **50% 교차 모서리**로 잰다 — 두 고원의 중간값이 놓이는 자리를
선형 보간으로 찾는다. ref 는 AA 가 깔려 있고 우리 캡처는 경계가 딱 떨어지는데,
50% 교차는 그 둘에 **같은 뜻**을 준다(AA 가 없으면 교차는 정확히 화소 경계 −0.5 다).

재는 자리 (한 열에서 위 → 아래):
    바탕/이웃  ─ ① ─  검정 테  ─ ② ─  밴드 채움  ─ ③ ─  카드 몸통(더 밝은 같은 색조)
  위 검정 테 = ② − ①      채움 = ③ − ②      머리띠 총 = ③ − ①

⚠ 열은 **글자·장식이 없는 열만** 쓴다 — 채움 고원이 한 값으로 안 서는 열은 버린다.
⚠ ref 는 카드 폭 474.12 → 우리 978 이라 환산 K=2.0628 을 곱한다(측정표 §9).

실행:
    python3 tools/scan833.py
    python3 tools/scan833.py --cap docs/review/151-r18 --geo docs/review/151-r18.geo.json
"""
import json
import sys
from collections import Counter

import numpy as np
from PIL import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628
HDR = {'배너형(파랑)': (58, 134, 212), '불릿형(초록)': (33, 145, 97)}
OURS_HDR = {'배너형(파랑)': (81, 148, 217), '불릿형(초록)': (33, 145, 97)}


def has_cls(card, name):
    """카드가 그 클래스를 갖는가 — 기하를 만든 자가 둘이라 **모양이 둘**이다.

    901 — `cap151.js --geo` 는 `cls` 를 **목록**으로, `probe667b.js` 는 `className`
    **문자열**로 싣는다. 옛 코드 `'ban1' in c['cls']` 는 둘 다 «도는» 것처럼 보이지만
    문자열 쪽은 부분일치라 `ban10` 같은 이웃 클래스가 생기면 조용히 참이 된다.
    ⇒ 어느 모양이든 **낱말 단위**로 가른다(자를 베끼는 형제 scan667b·scan667c 도 이걸 쓴다).
    """
    cls = card['cls']
    return name in (cls if isinstance(cls, (list, tuple)) else str(cls).split())


def lum(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def near(a, rgb, tol):
    return np.abs(a - np.array(rgb)).sum(2) < tol


def band_box(a, rgb, tol=45, win=None):
    """헤더 색 띠 — «그 색이 행의 대부분을 채우는» 행만 센다.

    ⚠ 문턱을 «40 화소 이상» 으로 두면 카드 상단의 장식·AA 가 같이 걸려
    띠가 위로 20~30행 번진다(1차 작성이 그래서 표본 0 이었다).
    """
    m = near(a, rgb, tol)
    if win:                              # (x0, x1, y0, y1) — 카드 상단으로 창을 좁힌다
        wx0, wx1, wy0, wy1 = win
        keep = np.zeros_like(m)
        keep[max(0, wy0):wy1, max(0, wx0):wx1] = True
        m = m & keep
    cnt = m.sum(1)
    if not cnt.max():
        return None
    rows = np.where(cnt >= 0.6 * cnt.max())[0]
    if not len(rows):
        return None
    grp, s, p = [], rows[0], rows[0]
    for y in rows[1:]:
        if y > p + 3:
            grp.append((s, p))
            s = y
        p = y
    grp.append((s, p))
    y0, y1 = max(grp, key=lambda g: g[1] - g[0])
    xs = np.where(m[y0:y1 + 1].any(0))[0]
    return int(xs.min()), int(xs.max()), int(y0), int(y1)


def cross(col, i, j, thr):
    """i(위) 와 j(아래) 사이에서 thr 를 지나는 자리 — 선형 보간. 못 찾으면 None."""
    step = 1 if j > i else -1
    for y in range(i, j, step):
        a, b = col[y], col[y + step]
        if (a - thr) * (b - thr) <= 0 and a != b:
            return y + step * (thr - a) / (b - a)
    return None


def col_hdr(col, y0, y1, bg, dark=0.30):
    """한 열 — (위 검정 바깥 모서리, 채움 상단, 채움 하단). 못 재면 None.

    ⚠ **바깥 host 가 «바탕» 인 열만** 센다. ref 카드 상변에는 겹쳐 놓인 장식(보라 리본·
    상태 탭·가치 배지)이 있어 그 열에서는 검정 테가 1~2행으로 얇게 읽힌다 —
    거르지 않으면 중앙값이 4.9 ↔ 2.8 두 봉우리 사이에서 «장식 쪽» 으로 잡힌다.
    """
    mid = (y0 + y1) // 2
    plat = float(np.median(col[y0 + 4:y1 - 3]))
    if plat < 55 or float(np.std(col[y0 + 4:y1 - 3])) > 2.0:
        return None
    # 채움 상단 — 위로 올라가며 처음으로 «검정»(고원의 dark 배) 인 자리
    t = mid
    while t > 0 and col[t] > plat * dark:
        t -= 1
    if t <= 0 or mid - t > 120:   # 밴드 절반(≈51) 보다 넉넉히
        return None
    e_fill_top = cross(col, mid, t, plat / 2)
    # 검정 바깥 — 그 위로 올라가며 처음으로 «검정보다 밝은 고원»
    u = t
    while u > 0 and col[u] < plat * dark:
        u -= 1
    if u <= 0 or t - u > 25:
        return None
    outer = float(np.median(col[max(0, u - 4):u + 1]))
    # ⚠ 검정 바깥 8행이 **전부** 바탕이어야 한다. ref 카드 상변에는 겹쳐 놓인 장식
    #   (보라 리본·상태 탭·가치 배지)이 있고 우리 카드에도 `.stt`·`.pil` 이 걸쳐 있어,
    #   그 열에서는 검정 테가 얇게(1~2행) 읽힌다 — 거르지 않으면 중앙값이 두 봉우리
    #   사이에서 장식 쪽으로 잡힌다(1차 작성이 ref 4.9 를 2.8 로 읽은 뿌리).
    above = col[max(0, u - 7):u + 1]
    if outer < 8 or len(above) < 6 or np.max(np.abs(above - bg)) > 12:
        return None
    # ⚠ 바깥(u) 쪽에서 안(t) 으로 내려오며 찾는다 — 반대로 훑으면 «검정 → 채움» 어깨의
    #   AA 화소가 먼저 문턱을 지나 검정 테가 0.5px 로 읽힌다(1차 작성의 오측).
    e_black_out = cross(col, u, t, outer / 2)
    # 채움 하단 — 아래로 내려가며 고원을 벗어나는 자리(몸통은 같은 색조의 더 밝은 값)
    d = mid
    while d < len(col) - 1 and abs(col[d] - plat) < 3:
        d += 1
    if d >= len(col) - 2 or d - mid > 200:
        return None
    body = float(np.median(col[d + 2:d + 7])) if d + 7 < len(col) else None
    if body is None or abs(body - plat) < 8:
        return None
    e_fill_bot = cross(col, mid, d + 2, (plat + body) / 2)
    if None in (e_fill_top, e_black_out, e_fill_bot):
        return None
    return e_black_out, e_fill_top, e_fill_bot


def scan(a, tag, rgb, scale, bg=None, win=None):
    b = band_box(a, rgb, win=win)
    if not b:
        print(f'  {tag}: 밴드 못 찾음')
        return None
    x0, x1, y0, y1 = b
    L = lum(a.astype(float))
    if bg is None:
        bg = float(np.median(L[:, :6]))
    T, F, H, XS, TOPS = [], [], [], [], []
    for x in range(x0 + 6, x1 - 5):
        r = col_hdr(L[:, x], y0, y1, bg)
        if not r:
            continue
        o, ft, fb = r
        # ⚠ 자리 sanity — 머리띠 채움은 80~130px(환산) 사이다. 배너형 카드는 오른쪽 절반을
        #   그림(`.art`)이 덮어 «밴드 → 그림» 경계가 색차 15 로 흐려지는 열이 있고,
        #   그런 열은 채움이 155px 로 읽힌다(밴드 + 그림 윗동). 그 열은 밴드를 안 재는 것이다.
        if not (80 <= (fb - ft) * scale <= 130):
            continue
        T.append(ft - o)
        F.append(fb - ft)
        H.append(fb - o)
        TOPS.append(o)
        XS.append(x)
    # ⚑ **가장 긴 연속 열 구간**만 쓴다. 흩어진 열은 장식(배지 검정 링·리본·상태 탭)의
    #   가장자리라 값이 제 자리의 것이 아니다 — 이어진 구간이 곧 «띠의 민낯» 이다.
    if XS:
        runs, s0 = [], 0
        for k in range(1, len(XS) + 1):
            if k == len(XS) or XS[k] != XS[k - 1] + 1:
                runs.append((s0, k))
                s0 = k
        a0, b0 = max(runs, key=lambda r: r[1] - r[0])
        T, F, H, TOPS = T[a0:b0], F[a0:b0], H[a0:b0], TOPS[a0:b0]
    if len(T) < 4:      # 배너형 카드는 «위가 바탕» 인 열이 4개뿐이다(제목·알약·그림이 상변을 덮는다)
        print(f'  {tag}: 표본 {len(T)} — 부족')
        return None
    t, f, h = (float(np.median(v)) for v in (T, F, H))
    ctop = float(np.median(TOPS))
    print(f'  {tag}: 열 {len(T)} · 위 검정 테 {t * scale:.2f} · 채움 {f * scale:.2f} · '
          f'머리띠 총 {h * scale:.2f}   (원시 {t:.2f} / {f:.2f} / {h:.2f})')
    return dict(top=t * scale, fill=f * scale, hdr=h * scale, ctop=ctop)


# ── ① «2000% 가치» 배지 ─────────────────────────────────────────────────
PINK = (244, 49, 113)


def card_x_edges(a, y, bg):
    """행 y 에서 카드 좌·우 바깥 모서리(검정 테 바깥) — 50% 교차."""
    L = lum(a.astype(float))[y]
    thr = bg / 2
    lo = None
    for x in range(0, len(L) - 1):
        if L[x] > bg - 8 and L[x + 1] < thr:
            lo = x + (L[x] - thr) / (L[x] - L[x + 1])
            break
    hi = None
    for x in range(len(L) - 1, 0, -1):
        if L[x] > bg - 8 and L[x - 1] < thr:
            hi = x - (L[x] - thr) / (L[x] - L[x - 1])
            break
    return lo, hi


def badge(a, tag, card, scale, bg):
    """배지 별의 **분홍 잉크** bbox — 카드 상변·우변 기준 (환산 px)."""
    cx0, cx1, cy = card
    m = near(a, PINK, 60)
    x_lo = int(cx0 + (cx1 - cx0) * 0.55)
    keep = np.zeros_like(m)
    keep[max(0, int(cy) - 60):int(cy) + 200, x_lo:] = True
    m = m & keep
    ys, xs = np.where(m)
    if len(ys) < 50:
        print(f'  {tag}: 분홍 표본 {len(ys)} — 못 잼')
        return None
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    w, h = (x1 - x0 + 1), (y1 - y0 + 1)
    top = y0 - cy                      # 카드 상변 기준 (음수 = 위로 나감)
    right = cx1 - (x1 + 1)             # 카드 우변에서 배지 우단까지
    cyc = (y0 + y1 + 1) / 2 - cy       # 잉크 세로 중심
    print(f'  {tag}: 분홍 {w * scale:.1f}×{h * scale:.1f} · 윗변 {top * scale:+.1f} · '
          f'중심 {cyc * scale:+.1f} · 우변에서 {right * scale:.1f}')
    return dict(w=w * scale, h=h * scale, top=top * scale, cy=cyc * scale, right=right * scale)


def main():
    cap, geo = 'docs/review/151-r18', 'docs/review/151-r18.geo.json'
    if '--cap' in sys.argv:
        cap = sys.argv[sys.argv.index('--cap') + 1]
    if '--geo' in sys.argv:
        geo = sys.argv[sys.argv.index('--geo') + 1]

    print(f'== ref {REF} · K={K}')
    ra = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    rbg = float(np.median(lum(ra.astype(float))[:, :4]))
    R = {n: scan(ra, 'ref ' + n, rgb, K) for n, rgb in HDR.items()}
    RB = {}
    for n in HDR:
        if not R.get(n):
            continue
        ct = R[n]['ctop']
        # ⚠ 한 행만 재면 **홈(노치)·리본**이 걸려 카드 우변이 15px 안쪽으로 읽힌다
        #   (dy=200 에서 470.3, dy=150 에서 485.5). 여러 행의 «가장 바깥» 을 쓴다.
        los, his = [], []
        for dy in range(120, 401, 20):
            if int(ct) + dy >= ra.shape[0]:
                break
            lo, hi = card_x_edges(ra, int(ct) + dy, rbg)
            if lo is not None:
                los.append(lo)
            if hi is not None:
                his.append(hi)
        if not los or not his:
            continue
        lo, hi = min(los), max(his)
        print(f'  ref {n} 카드 좌우 {lo:.2f}..{hi:.2f} · 폭 {(hi - lo) * K:.1f}(환산)')
        RB[n] = badge(ra, 'ref ' + n + ' 배지', (lo, hi, ct), K, rbg)

    print(f'\n== 우리 {cap}-c*.png')
    O, OB = {}, {}
    cards = json.load(open(geo))['cards']
    # 901 — 이 절이 묻는 두 키(`cls`·`card`)는 `cap151.js --geo --crop` 이 만든다.
    # 없는 채로 들어오면 `KeyError` 한 줄로 죽어 «자가 부패했다» 처럼 보였다(등재문).
    # 낡은 기하를 들고 온 것이 결손이므로, 죽을 거면 무엇을 다시 뽑아야 하는지 말한다.
    miss = sorted({k for c in cards for k in ('cls', 'card') if k not in c})
    if miss:
        sys.exit(f'기하 {geo} 에 카드 키 {miss} 가 없다 — cap151.js 가 이 키들을 싣기 전에 뽑은 '
                 f'낡은 덤프다. `node tools/cap151.js {cap}.png --geo --crop` 으로 다시 뽑아라.')
    for i, c in enumerate(cards, 1):
        try:
            oa = np.asarray(Image.open(f'{cap}-c{i}.png').convert('RGB')).astype(int)
        except FileNotFoundError:
            print(f'(크롭 {cap}-c{i}.png 없음)')
            continue
        kind = '배너형(파랑)' if has_cls(c, 'ban1') else '불릿형(초록)'
        cx, cy = int(c['card']['x']), int(c['card']['y'])
        cw = int(c['card']['w'])
        # ⚠ 밴드 색은 «행의 중앙값» 이 아니라 **최빈색**으로 읽는다 — 배너형 카드는
        #   오른쪽 절반을 그림(`.art`)이 덮어 밴드가 두 색(58,134,212 / 81,148,217)이다.
        row = [tuple(v) for v in oa[cy + 40, cx + 20:cx + cw - 20].tolist()]
        rgb = Counter(row).most_common(1)[0][0]
        win = (cx + 20, cx + cw - 20, max(0, cy - 30), cy + 220)
        r = scan(oa, f'카드{i} [{c["id"]} · {kind}]', rgb, 1.0, win=win)
        if r:
            O.setdefault(kind, []).append(r)
        # 카드 상자는 DOM 에서 왔다(크롭-로컬) — 픽셀로 다시 찾을 이유가 없다
        bd = badge(oa, f'카드{i} 배지', (cx, cx + cw, cy), 1.0,
                   float(np.median(lum(oa.astype(float))[:, :6])))
        if bd:
            OB.setdefault(kind, []).append(bd)

    print('\n== 요약 (환산 px · 우리는 같은 형 중앙값)')
    print('| 자리 | ref | 우리 | Δ | Δ% |')
    print('|---|---|---|---|---|')
    for kind in HDR:
        if not R.get(kind) or kind not in O:
            continue
        for key, lab in (('top', '위 검정 테'), ('fill', '채움'), ('hdr', '머리띠 총')):
            rv, ov = R[kind][key], float(np.median([x[key] for x in O[kind]]))
            print(f'| {kind} {lab} | {rv:.2f} | {ov:.2f} | **{ov - rv:+.2f}** | '
                  f'{(ov - rv) / rv * 100:+.1f}% |')
    for kind in HDR:
        if not RB.get(kind) or kind not in OB:
            continue
        for key, lab in (('w', '배지 분홍 폭'), ('h', '배지 분홍 높이'),
                         ('top', '배지 윗변(카드 상변 기준)'), ('cy', '배지 세로 중심'),
                         ('right', '배지 우단 ← 카드 우변')):
            rv, ov = RB[kind][key], float(np.median([x[key] for x in OB[kind]]))
            pct = f'{(ov - rv) / rv * 100:+.1f}%' if abs(rv) > 1 else '—'
            print(f'| {kind} {lab} | {rv:.2f} | {ov:.2f} | **{ov - rv:+.2f}** | {pct} |')


if __name__ == '__main__':
    main()
