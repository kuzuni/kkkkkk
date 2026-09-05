#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
artbox72.py — 던전 카드 «우측 일러스트» bbox 를 레퍼런스·캡처에 «같은 알고리즘» 으로 재는 자
(비평가 O 가 쓴 방법을 도구화한 것 — 카드별 선버스트 배경 팔레트를 만들고 L1 거리 > TH 인 픽셀만 아트로 본다)

사용법 (repo 루트에서):
  python3 tools/artbox72.py ref                 # docs/ref/03-던전-팝업.jpg (카드 top 241/601/…)
  python3 tools/artbox72.py cap <png>           # 1080x2280 캡처 (카드 top = ref-84)
  python3 tools/artbox72.py both <png>          # 둘을 나란히 + 차이
옵션: 뒤에 TH(기본 52) 를 붙일 수 있다.

배경 팔레트 표본은 «아트가 절대 없는» x 600~700 세로 스트립에서 뽑는다.
텍스트 오염을 피하려고 판정 영역은 x 660~1022 로 제한한다.
"""
import sys
from pydep937 import Image

REF = 'docs/ref/03-던전-팝업.jpg'
TOPS_REF = [241, 601, 961, 1321, 1681]
X0, X1 = 660, 1022          # 판정 영역 (좌측 텍스트 클러스터는 우단 500 이므로 안전)
PX0, PX1 = 600, 700         # 배경 팔레트 표본 스트립


def artbox(im, top, th):
    px = im.load()
    y0, y1 = top + 9, top + 340          # 카드 안쪽(테두리 8) 에서 AA 1px 씩 더 뺀다
    # 배경 팔레트를 «양자화 격자 + 반경» 으로 근사한다(픽셀당 팔레트 전수 비교는 카드당 수천만 회라 못 쓴다).
    q = max(1, th // 3)
    bg = set()
    for y in range(y0, y1 + 1, 2):
        for x in range(PX0, PX1 + 1, 2):
            c = px[x, y]
            b = (c[0] // q, c[1] // q, c[2] // q)
            for dr in (-1, 0, 1):
                for dg in (-1, 0, 1):
                    for db in (-1, 0, 1):
                        bg.add((b[0] + dr, b[1] + dg, b[2] + db))
    xs, ys, rows = [], [], {}
    for y in range(y0, y1 + 1):
        for x in range(X0, X1 + 1):
            c = px[x, y]
            if (c[0] // q, c[1] // q, c[2] // q) not in bg:
                xs.append(x); ys.append(y); rows.setdefault(y, []).append(x)
    if not xs:
        return None
    botrow = max(rows)
    return {
        'x0': min(xs), 'x1': max(xs), 'y0': min(ys), 'y1': max(ys),
        'w': max(xs) - min(xs) + 1, 'h': max(ys) - min(ys) + 1,
        'relx': min(xs) - 50, 'rely': min(ys) - top,
        'botw': max(rows[botrow]) - min(rows[botrow]) + 1,
        'rband': sum(1 for x in xs if x >= 923) / max(1, (X1 - 923 + 1) * (y1 - y0 + 1)),
    }


def show(tag, b):
    if not b:
        print(f'{tag}: none'); return
    print(f"{tag}: x{b['x0']}~{b['x1']} (w{b['w']}) y{b['y0']}~{b['y1']} (h{b['h']}) "
          f"| 카드기준 rel x+{b['relx']} y+{b['rely']} | aspect {b['w']/b['h']:.2f} "
          f"| 최하단행 폭 {b['botw']} | 우측100px 커버리지 {b['rband']*100:.0f}%")


def main():
    mode = sys.argv[1]
    cap = sys.argv[2] if mode in ('cap', 'both') else None
    th = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 52
    if mode in ('ref', 'both'):
        im = Image.open(REF).convert('RGB')
        for i, t in enumerate(TOPS_REF, 1):
            show(f'REF 카드{i}', artbox(im, t, th))
    if mode in ('cap', 'both'):
        im = Image.open(cap).convert('RGB')
        for i, t in enumerate(TOPS_REF, 1):
            show(f'CAP 카드{i}', artbox(im, t - 84, th))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    main()
