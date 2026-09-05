#!/usr/bin/env python3
"""작업 163 스캐너 — 로딩 화면 프레임에서 «캐릭터 잉크 bbox» 를 뽑는다.
실행: python3 tools/scan163.py docs/shots/163-r3-bg.png docs/shots/163-r3-[1-8].png
      (첫 인자가 **배경 플레이트**, 나머지가 표본이다. `tools/cap163.js` 가 둘 다 만든다)

★ 단색 배경 가정은 버렸다. 3회차에 배경을 radial-gradient 로 바꾸자 «#0b0d18 과 다른 픽셀» 방식이
   **배경까지 잉크로 세어** bbox 가 540px 로 부풀었고, 그 값을 브리핑에 실어 비평가 두 명이 나란히
   틀린 전제 위에서 채점했다(«히어로 잉크 540×508»). 이제 **배경 플레이트와 차분**해서 실제로
   그 프레임에만 있는 것(캐릭터 + 그림자)만 남긴다.
"""
import sys
from pydep937 import Image

THR = 30          # 배경 플레이트 대비 채널 합 차이(0~765)


def scan(path, bg):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    p, b = im.load(), bg.load()
    # 무대 구간만 — 아래 문구·진행바는 배경 플레이트에도 있어 차분에서 이미 사라지지만,
    # 진행바 채움처럼 «프레임마다 다른» 것이 남으므로 y 범위로 한 번 더 자른다
    y0b, y1b = int(H * 0.28), int(H * 0.58)
    xs, ys = [], []
    for y in range(y0b, y1b, 2):
        row = [x for x in range(0, W, 2)
               if abs(p[x, y][0] - b[x, y][0]) + abs(p[x, y][1] - b[x, y][1]) + abs(p[x, y][2] - b[x, y][2]) > THR]
        if not row:
            continue
        xs += row
        ys += [y] * len(row)
    if not xs:
        return dict(path=path, ink=0)
    return dict(path=path, ink=len(xs), x0=min(xs), x1=max(xs), y0=min(ys), y1=max(ys),
                w=max(xs) - min(xs), h=max(ys) - min(ys), cx=(min(xs) + max(xs)) // 2)


def main(paths):
    if len(paths) < 2:
        raise SystemExit('사용법: scan163.py <배경플레이트.png> <표본...>')
    bg = Image.open(paths[0]).convert('RGB')
    print(f'배경 플레이트: {paths[0].split("/")[-1]}')
    print(f"{'파일':<28}{'잉크':>7}{'x0':>6}{'x1':>6}{'중심x':>7}{'폭':>6}{'y0':>6}{'y1':>6}{'높이':>6}")
    prev = None
    for f in paths[1:]:
        r = scan(f, bg)
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
