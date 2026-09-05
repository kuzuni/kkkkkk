"""54 시상대 행 경계 스캐너 — 배경 글로우(radial-gradient)에 속지 않도록 «급격한 가로 밝기 변화» 로 경계를 잡는다.

씬 배경은 x 방향으로 아주 완만하게(≤2 L/px) 변하고, 단상 외곽(검정 띠)·채움은 |ΔL| ≥ TH 로 튄다.
사용: python3 tools/edge54.py <이미지> <off> <y...>  [--th N]
출력: 각 행의 경계 x 목록(왼쪽→오른쪽, «상승/하강» 표시)
"""
import sys
from pydep937 import Image

args = [a for a in sys.argv[1:] if not a.startswith('--')]
TH = 12
for a in sys.argv[1:]:
    if a.startswith('--th'):
        TH = int(a.split('=')[1])

im = Image.open(args[0]).convert('RGB')
px = im.load()
W, H = im.size
off = int(args[1])


def L(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


for arg in args[2:]:
    fy = int(arg)
    y = fy + off
    lum = [L(px[x, y]) for x in range(W)]
    ed = []
    x = 1
    while x < W:
        d = lum[x] - lum[x - 1]
        if abs(d) >= TH:
            # 연속 전이 화소를 하나로 묶는다
            s = x
            tot = 0.0
            while x < W and abs(lum[x] - lum[x - 1]) >= 4 and (lum[x] - lum[x - 1]) * d > 0:
                tot += lum[x] - lum[x - 1]
                x += 1
            ed.append((s, x - 1, '+' if tot > 0 else '-', round(tot)))
        else:
            x += 1
    print(f"y={fy}: " + "  ".join(f"{e[0]}{'' if e[0]==e[1] else '..'+str(e[1])}{e[2]}{e[3]}" for e in ed))
