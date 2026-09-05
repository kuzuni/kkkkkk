"""1위 슬래브 금색 윗변 — 가림 없는 열에서 «금색 fill 첫 행 / 마지막 행» 을 센다.
사용: python3 tools/slab1.py <이미지> <off>
금색 판정: R>210 · G>150 · B<150 · R>B+80 (ref #FCC745~#FFDC62 · 우리 #FFDC62)
"""
import sys
from pydep937 import Image

im = Image.open(sys.argv[1]).convert('RGB')
px = im.load()
off = int(sys.argv[2])


def gold(c):
    return c[0] > 210 and c[1] > 150 and c[2] < 150 and c[0] > c[2] + 80


rows = []
for x in range(398, 690, 6):
    a = b = -1
    for y in range(440, 500):
        if gold(px[x, y + off]):
            if a < 0: a = y
            b = y
    if a > 0 and b - a > 20:
        rows.append((x, a, b))
tops = [r[1] for r in rows]
bots = [r[2] for r in rows]
print("열수", len(rows))
print("윗변  min/median/max :", min(tops), sorted(tops)[len(tops) // 2], max(tops))
print("아랫변 min/median/max :", min(bots), sorted(bots)[len(bots) // 2], max(bots))
print("표본:", " ".join(f"{x}:{a}..{b}" for x, a, b in rows))
