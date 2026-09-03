#!/usr/bin/env python3
"""작업 833 3회차 — 앞 회차가 «먼저 ref 를 화소로 재라» 고 넘긴 두 자리의 자.

  ⓐ **리본 우단(제비꼬리 끝)** — 1회차 2인 일치 2번.
     ⚠ 리본은 `display:flex` 라 **폭이 라벨 advance 를 따라간다** — 상수로 박으면
     «맞음» 으로 올라온 리본1 이 깨진다. 그래서 이 자는 리본을 **한 줄씩** 재고
     ref·우리를 같은 뜻으로 짝지어 «어느 줄이 어긋나는가» 를 먼저 가른다.

  ⓑ **상태 탭** — 1회차 2인 일치 3번. **두 비평가의 기대값이 7px 어긋난 자리**라
     (CX 50.3~52.2 ↔ CY 57.6) 사람 눈이 아니라 화소로 판정한다.
     ⓐ 탭 판이 카드 상변 위로 솟은 높이 · ⓑ 탭 안 글자 잉크의 세로 자리.

자는 833 1회차의 `scan833.py` 를 그대로 재사용한다(카드 상자 · 50% 교차 모서리).
리본 채움은 ref·우리가 **같은 색**(#FF565D = 255,86,93)이라 색 마스크가 곧 자다.

실행:
    python3 tools/scan833b.py [--cap <경로접두>]
      (기본 접두 = 환경변수 CAP833 또는 docs/review/151-r20)
"""
import os
import sys
import importlib.util

import numpy as np
from PIL import Image

_spec = importlib.util.spec_from_file_location(
    's833', os.path.join(os.path.dirname(__file__), 'scan833.py'))
S833 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(S833)

K = S833.K
REF = S833.REF
RIB = (255, 86, 93)          # 리본 채움 — ref·우리 같은 값
BODY = {'배너형(파랑)': (67, 188, 245), '불릿형(초록)': (52, 178, 130)}   # 카드 몸통색(ref 실측 = 우리 --c)
CROP_DX, CROP_DY = 40, 80    # cap151 --crop 의 여백(카드 좌상단이 크롭 (40,80))


def lum(a):
    return S833.lum(a)


def ref_cards(ra, rbg):
    """ref 두 카드의 (좌, 우, 상) — scan833 과 같은 자."""
    out = {}
    for n, rgb in S833.HDR.items():
        r = S833.scan(ra, 'ref ' + n, rgb, K)
        if not r:
            continue
        ct = r['ctop']
        los, his = [], []
        for dy in range(120, 401, 20):
            if int(ct) + dy >= ra.shape[0]:
                break
            lo, hi = S833.card_x_edges(ra, int(ct) + dy, rbg)
            if lo is not None:
                los.append(lo)
            if hi is not None:
                his.append(hi)
        if los and his:
            out[n] = (min(los), max(his), ct)
    return out


def ribbons(a, card, scale, tag, body):
    """카드 안 리본을 **행 묶음**으로 갈라 줄마다 좌·우단(카드-로컬 환산 px).

    ⚠ **채움 색 마스크로 우단을 재면 안 된다** — 리본 채움은 ref·우리 둘 다 세로
    그러데이션(밝은 띠 → 몸통 → 어두운 띠)이라 «가운데 색» 이 잡히는 행수가 서로 다르고
    (ref 49.5 ↔ 우리 37 환산), 제비꼬리 **끝이 리본 위·아래 끝 행에만 있어서**
    잡히는 행이 넓은 쪽이 저절로 더 바깥을 찍는다. 3회차 1차 작성이 그래서
    ref 를 +7~9px 바깥으로 읽었다.

    ⇒ ① 가운데 색으로 **행 묶음만** 찾고 ② 리본 한복판 열에서 위·아래로 걸어 나가
    **리본의 바깥 모서리**(카드 몸통색으로 돌아가는 자리)를 찾은 뒤 ③ 그 행들에서
    «카드 몸통색도 바탕도 아닌» 가장 오른쪽 화소를 센다 — 그것이 제비꼬리 끝이다.
    """
    cx0, cx1, cy = card
    mid = np.abs(a - np.array(RIB)).sum(2) < 40
    keep = np.zeros_like(mid)
    ybot = int(cy + 720 / scale)
    keep[max(0, int(cy)):min(a.shape[0], ybot), max(0, int(cx0)):int(cx1) + 1] = True
    mid = mid & keep
    cnt = mid.sum(1)
    rows = np.where(cnt >= 0.15 * max(1, cnt.max()))[0]
    if not len(rows):
        return []
    grp, s, p = [], rows[0], rows[0]
    for y in rows[1:]:
        if y > p + 4:
            grp.append((s, p))
            s = y
        p = y
    grp.append((s, p))

    bodym = np.abs(a - np.array(body)).sum(2) < 60      # 카드 몸통색
    Lm = lum(a.astype(float))
    bg = float(np.median(Lm[:, :4]))
    out = []
    for y0, y1g in grp:
        if (y1g - y0 + 1) * scale < 20:
            continue
        xs = np.where(mid[y0:y1g + 1].any(0))[0]
        xm = int((xs.min() + xs.max()) / 2)             # 리본 한복판 열
        t = y0
        while t > int(cy) and not bodym[t - 1, xm] and abs(Lm[t - 1, xm] - bg) > 14:
            t -= 1
        b = y1g
        while b < ybot - 1 and not bodym[b + 1, xm] and abs(Lm[b + 1, xm] - bg) > 14:
            b += 1
        # ⚠ «몸통색이 아닌 가장 오른쪽 화소» 를 그대로 쓰면 같은 행에 있는 **금색 판·수량·
        #   노치·그림**까지 걸려 우단이 카드 폭으로 읽힌다(3회차 2차 작성의 오측).
        #   리본은 카드 왼끝에 붙어 있으므로 **왼쪽에서 걸어 나가 처음 몸통색이 되는 자리**가
        #   그 행의 리본 끝이다. 제비꼬리는 가운데 행이 파여 있으므로 **행별 최댓값**이 꼬리 끝.
        e0 = int(cx0 + 6 / scale)
        e1 = int(cx1)
        rr, ll = [], []
        for y in range(t, b + 1):
            x = e0
            while x < e1 - 2 and not (bodym[y, x] and bodym[y, x + 1] and bodym[y, x + 2]):
                x += 1
            if x < e1 - 3:
                rr.append(x)
            xs2 = np.where(np.abs(Lm[y, int(cx0):x] - bg) > 14)[0]
            if len(xs2):
                ll.append(int(cx0) + xs2.min())
        if not rr:
            continue
        out.append(dict(y=(t - cy) * scale, h=(b - t + 1) * scale,
                        l=(min(ll) - cx0) * scale if ll else 0.0,
                        r=(max(rr) - cx0) * scale))
    for i, r in enumerate(out, 1):
        print(f'  {tag} 리본{i}: 상변 {r["y"]:+.1f} · 높이 {r["h"]:.1f} · '
              f'좌 {r["l"]:.1f} · **우 {r["r"]:.1f}**')
    return out


def tab(a, card, scale, tag, bg):
    """상태 탭 — 카드 상변 위로 솟은 높이 · 글자 잉크 세로 자리(카드-로컬 환산 px)."""
    cx0, cx1, cy = card
    L = lum(a.astype(float))
    x0 = int(cx0 + 20 / scale)                   # 탭은 카드-로컬 29..279
    x1 = int(cx0 + 290 / scale)
    # ⚠ «카드 상변 위 90px 안에서 처음 바탕이 아닌 행» 으로 찾으면 안 된다 — ref 는 두 카드가
    #   붙어 있어 **위 카드의 밑동**이 먼저 걸리고(불릿형이 90.3 으로 읽혔다), 우리 크롭은
    #   상점 배경이 그러데이션이라 첫 행부터 걸린다. ⇒ **카드 상변에서 위로 걸어 올라가다가
    #   바탕을 만나면 멈춘다**(탭 판은 카드에 붙어 있는 한 덩어리다).
    lo = max(0, int(cx0) - int(35 / scale))
    hi = max(lo + 1, int(cx0) - int(5 / scale))
    strip = L[max(0, int(cy) - int(70 / scale)):max(1, int(cy) - 3), lo:hi]
    bg = float(np.median(strip)) if strip.size else bg
    top = int(cy)
    lim = max(0, int(cy) - int(90 / scale))
    while top > lim and (np.abs(L[top - 1, x0:x1] - bg) > 10).mean() > 0.5:
        top -= 1
    if top >= int(cy):
        print(f'  {tag} 탭: 못 찾음')
        return None
    # 판 안 글자 잉크 — 회색 라벨(ref 181 · 우리 175). 검정 테·컬러 판과 채도로 가른다
    box = a[top:int(cy), x0:x1]
    bl = lum(box.astype(float))
    sat = box.max(2) - box.min(2)
    ink = (bl > 100) & (sat < 40)
    ys = np.where(ink.sum(1) >= 3)[0]
    res = dict(rise=(cy - top) * scale)
    if len(ys):
        res['ink_t'] = (top + ys.min() - cy) * scale
        res['ink_b'] = (top + ys.max() + 1 - cy) * scale
        res['ink_h'] = (ys.max() - ys.min() + 1) * scale
        # 판 안에서의 자리 — 판 상변에서 잉크 중심까지
        res['ink_in'] = (ys.min() + ys.max() + 1) / 2 * scale
    print(f'  {tag} 탭: 솟은 높이 {res["rise"]:.1f}' +
          (f' · 잉크 상 {res["ink_t"]:+.1f} 하 {res["ink_b"]:+.1f} 높이 {res["ink_h"]:.1f}'
           f' · 판 상변→잉크중심 {res["ink_in"]:.1f}' if 'ink_t' in res else ''))
    return res


def main():
    cap = os.environ.get('CAP833', 'docs/review/151-r20')
    if '--cap' in sys.argv:
        cap = sys.argv[sys.argv.index('--cap') + 1]

    print(f'== ref {REF} · K={K}')
    ra = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    rbg = float(np.median(lum(ra.astype(float))[:, :4]))
    RC = ref_cards(ra, rbg)
    R = {}
    for n, c in RC.items():
        print(f'  ref {n} 카드 {c[0]:.2f}..{c[1]:.2f} · 상변 {c[2]:.2f}')
        R[n] = dict(rb=ribbons(ra, c, K, 'ref ' + n, BODY[n]),
                    tab=tab(ra, c, K, 'ref ' + n, rbg))

    print(f'\n== 우리 {cap}-c*.png  (크롭 원점 = 카드 좌상단 −{CROP_DX},−{CROP_DY})')
    O = {}
    for i in (1, 2, 3):
        f = f'{cap}-c{i}.png'
        try:
            oa = np.asarray(Image.open(f).convert('RGB')).astype(int)
        except FileNotFoundError:
            print(f'(크롭 {f} 없음)')
            continue
        kind = '배너형(파랑)' if i == 1 else '불릿형(초록)'
        obg = float(np.median(lum(oa.astype(float))[:, :6]))
        card = (CROP_DX, CROP_DX + 978, CROP_DY)
        print(f'  카드{i} [{kind}]')
        O.setdefault(kind, []).append(
            dict(rb=ribbons(oa, card, 1.0, f'  카드{i}', BODY[kind]),
                 tab=tab(oa, card, 1.0, f'  카드{i}', obg)))

    print('\n== 요약 (환산 px)')
    print('| 자리 | ref | 우리 | Δ |')
    print('|---|---|---|---|')
    for kind in S833.HDR:
        if kind not in R or kind not in O:
            continue
        rr, oo = R[kind]['rb'], O[kind][0]['rb']
        for j in range(min(len(rr), len(oo))):
            for key, lab in (('l', '좌단'), ('r', '우단'), ('h', '높이')):
                print(f'| {kind} 리본{j + 1} {lab} | {rr[j][key]:.1f} | {oo[j][key]:.1f} | '
                      f'**{oo[j][key] - rr[j][key]:+.1f}** |')
        rt, ot = R[kind]['tab'], O[kind][0]['tab']
        if rt and ot:
            for key, lab in (('rise', '탭 솟은 높이'), ('ink_t', '탭 잉크 상변'),
                             ('ink_b', '탭 잉크 하변'), ('ink_h', '탭 잉크 높이'),
                             ('ink_in', '탭 판 상변→잉크 중심')):
                if key in rt and key in ot:
                    print(f'| {kind} {lab} | {rt[key]:.1f} | {ot[key]:.1f} | '
                          f'**{ot[key] - rt[key]:+.1f}** |')


if __name__ == '__main__':
    main()
