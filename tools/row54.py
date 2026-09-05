"""54 시상대 행스캔 — 한 행(y)에서 «씬 배경이 아닌» 구간(= 검정 외곽 포함 단상 바깥 폭)을 뽑는다.

사용: python3 tools/row54.py <이미지> <off> <y...>
  off = 이미지 y − 프레임 y (레퍼런스 1080x2340 은 84, 캡처 1080x2280 은 0)
씬 배경은 세로 그라디언트(#101020→#2A1020→#4B1723)라 «그 행의 x=0..20 평균색» 을 배경으로 잡고
채널차 합 > TH 인 화소를 «단상» 으로 본다. 인접 구간은 3px 이하 틈이면 붙인다.
"""
import sys
from pydep937 import Image

im = Image.open(sys.argv[1]).convert('RGB')
px = im.load()
W, H = im.size
off = int(sys.argv[2])
TH = 26

for arg in sys.argv[3:]:
    fy = int(arg)
    y = fy + off
    if y < 0 or y >= H:
        print(f"y={fy}: 범위 밖")
        continue
    bg = [0, 0, 0]
    for x in range(0, 20):
        c = px[x, y]
        for i in range(3):
            bg[i] += c[i]
    bg = [v / 20.0 for v in bg]
    on = []
    for x in range(W):
        c = px[x, y]
        d = abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2])
        on.append(d > TH)
    segs = []
    x = 0
    while x < W:
        if on[x]:
            s = x
            while x < W and on[x]:
                x += 1
            segs.append([s, x - 1])
        else:
            x += 1
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] <= 3:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    merged = [s for s in merged if s[1] - s[0] >= 8]
    out = []
    for s in merged:
        out.append(f"{s[0]}..{s[1]}(w{s[1]-s[0]+1} c{(s[0]+s[1])/2:.1f})")
    gaps = []
    for i in range(1, len(merged)):
        gaps.append(str(merged[i][0] - merged[i - 1][1] - 1))
    print(f"y={fy}  bg=({bg[0]:.0f},{bg[1]:.0f},{bg[2]:.0f})  " + " | ".join(out) + ("   gaps=" + ",".join(gaps) if gaps else ""))
