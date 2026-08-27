#!/usr/bin/env python3
"""작업 163 스캐너 — 캡처된 로딩 화면 프레임에서 «캐릭터 잉크 bbox» 와 배경/바닥/그림자를 수치로 뽑는다.
실행: python3 tools/scan163.py docs/shots/163-r1-*.png

배경(#0b0d18)과 충분히 다른 픽셀을 «잉크» 로 본다. 무대 영역(y 상단 40%)만 훑어
캐릭터 bbox(x0,x1,y0,y1·폭·높이)와 중심 x 를 낸다 — 등장 궤적이 «가속 없이 감속해 선다» 를
숫자로 확인하고, 비평가 지적(«몇 px 어긋남»)을 이 자로 검증하기 위한 것.
"""
import sys
from PIL import Image

BG = (0x0b, 0x0d, 0x18)


def far(px, thr=26):
    return abs(px[0] - BG[0]) + abs(px[1] - BG[1]) + abs(px[2] - BG[2]) > thr


def scan(path):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    p = im.load()
    # 무대는 프레임 세로 중앙 위쪽 — 텍스트/진행바를 빼기 위해 y 범위를 잘라 준다
    y0b, y1b = int(H * 0.30), int(H * 0.55)
    # 바닥선(#ldGr)은 폭 650px 로 가로지르므로 캐릭터 bbox 를 통째로 삼킨다.
    # 한 행의 잉크가 520px 넘게 벌어지면 «바닥선/그림자 행» 으로 보고 뺀다.
    xs, ys = [], []
    for y in range(y0b, y1b, 2):
        row = [x for x in range(0, W, 2) if far(p[x, y])]
        if not row or (row[-1] - row[0]) > 520:
            continue
        xs += row
        ys += [y] * len(row)
    if not xs:
        return dict(path=path, ink=0)
    return dict(path=path, ink=len(xs), x0=min(xs), x1=max(xs), y0=min(ys), y1=max(ys),
                w=max(xs) - min(xs), h=max(ys) - min(ys), cx=(min(xs) + max(xs)) // 2)


def main(paths):
    print(f"{'파일':<28}{'잉크':>7}{'x0':>6}{'x1':>6}{'중심x':>7}{'폭':>6}{'y0':>6}{'y1':>6}{'높이':>6}")
    prev = None
    for f in paths:
        r = scan(f)
        name = f.split('/')[-1]
        if not r['ink']:
            print(f'{name:<28}{0:>7}   (무대에 잉크 없음 — 캐릭터 미등장)')
            prev = None
            continue
        d = '' if prev is None else f"   Δ중심x {r['cx'] - prev:+d}"
        print(f"{name:<28}{r['ink']:>7}{r['x0']:>6}{r['x1']:>6}{r['cx']:>7}{r['w']:>6}{r['y0']:>6}{r['y1']:>6}{r['h']:>6}{d}")
        prev = r['cx']


if __name__ == '__main__':
    main(sys.argv[1:])
