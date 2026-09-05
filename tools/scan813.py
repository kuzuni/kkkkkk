#!/usr/bin/env python3
# 작업 813 — «상인방 ↓ 배수 바» 간극이 **비어 있는가** 를 칠해진 화소로 묻는다.
#
#   python3 tools/scan813.py
#
# 왜 필요한가 — probe754 의 판정은 **박스 사이의 빈 산수**다. 그 사이에 다른 부품이
# «그려져» 있으면 «간극» 이라는 말 자체가 성립하지 않는다(754 6회차 ⓐ 에서 CD 가
# «자가 잰 0 은 칠해지는 변과 무관한 박스 값이다» 로 54·06 의 [❌] 를 기각한 것과 같은 축).
# 89 의 이 자리에는 아치(`.rw-bg::after`)의 정점이 지나가므로, 그 구간의 세로 잉크 프로필을
# 재서 «죽은 벽» 인지 «그림이 있는 자리» 인지 가른다.
#
# 재는 것 — 화면 중앙 세로 띠(x 400..680)에서 행마다
#   · 행 표준편차(std)        : 결이 있으면 크다
#   · 행 평균 휘도(lum)
#   · 행 고유색 수(uniq)
# 를 내고, 위 상인방 하변 ~ 바 상변 구간을 «비교 대상 두 구간» 과 나란히 놓는다.
import sys
from pydep937 import Image

SHOTS = {
    1600: 'docs/shots/754-813r1a-89-1600.png',
    2280: 'docs/shots/754-813r1a-89-2280.png',
}
# probe813 [B] 실측(패널 지역 좌표) — 패널 상단의 프레임 y 는 캡처마다 다르므로
# «상인방 상변» 을 화면에서 직접 찾지 않고 probe813 이 준 값을 그대로 쓴다.
# (프레임 y = 패널 y + 패널 상단 오프셋. 패널은 #relw 안 top:4px 이고 #relw 는 프레임 전체다.)
BANDS = {
    #  프레임: (상인방 하변, 바 상변, 바 하변, 격자 상변)  — 패널 지역 좌표
    1600: (85.7, 99.5, 197.5, 208.8),
    2280: (180.4, 294.7, 392.7, 409.9),
}
PANEL_TOP = 4          # .rw-panel{top:4px}
X0, X1 = 400, 680      # 화면 중앙 세로 띠(아치 정점이 지나가는 폭)


def prof(im, y0, y1):
    px = im.convert('RGB').load()
    rows = []
    for y in range(int(y0), int(y1)):
        vals, cols = [], set()
        for x in range(X0, X1, 2):
            r, g, b = px[x, y]
            vals.append(0.299 * r + 0.587 * g + 0.114 * b)
            cols.add((r >> 2, g >> 2, b >> 2))
        n = len(vals)
        m = sum(vals) / n
        sd = (sum((v - m) ** 2 for v in vals) / n) ** 0.5
        rows.append((y, m, sd, len(cols)))
    return rows


def summarize(rows):
    if not rows:
        return (0, 0, 0)
    return (sum(r[1] for r in rows) / len(rows),
            sum(r[2] for r in rows) / len(rows),
            sum(r[3] for r in rows) / len(rows))


print('SCAN813 — «상인방 ↓ 배수 바» 구간이 비어 있는가 (중앙 띠 x400..680)\n')
print('  프레임  구간                        높이   평균휘도   행std   행고유색   판정')
for fh, path in SHOTS.items():
    im = Image.open(path)
    lb, mt, mb, gt = BANDS[fh]
    off = PANEL_TOP
    segs = [
        ('상인방 하변 → 바 상변 (쌍ⓐ)', lb + off, mt + off),
        ('바 하변 → 격자 상변',          mb + off, gt + off),
        ('상인방 위 스트립(죽은 벽)',     off + 2, lb - 66 + off),
    ]
    for name, a, b in segs:
        if b - a < 2:
            print(f'  {fh:>5}  {name:<28}{b-a:>6.1f}   (표본 부족)')
            continue
        rows = prof(im, a, b)
        lum, sd, uq = summarize(rows)
        # «죽은 벽» 판정 — 18회차가 쓴 축 그대로: 행 std 와 행 고유색 수
        verdict = '그림 있음' if (sd >= 12 or uq >= 60) else '결 약함'
        print(f'  {fh:>5}  {name:<28}{b-a:>6.1f}{lum:>10.1f}{sd:>9.1f}{uq:>10.1f}   {verdict}')
    print()
print('  기준 — 18회차가 «검은 띠» 반려 근거를 뒤집을 때 쓴 축: 행 고유색 330~378 · 행 std 15.9~16.3 ·')
print('  평균 휘도 32.7~36.6 이면 «디테일 0 이 아니다». (그 회차는 폭 1080 전체를 셌고 여기는 중앙 280 뿐이라')
print('  고유색 절대값은 더 작게 나온다 — 세 구간을 **서로** 비교하는 것이 이 표의 쓰임이다.)')
