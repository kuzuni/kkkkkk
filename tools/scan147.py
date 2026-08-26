"""147 — 시상대 위 «캐릭터 몸통» 행 프로파일 (레퍼런스·캡처 공용).

단상 x 구간마다, 단상 윗면 위쪽 행에서 «씬 배경이 아닌» 화소 수를 세어
행당 화소 >= TH 인 구간을 «몸통» 으로 잡는다(작업 147 등재가 쓴 기준과 같다 — TH 기본 100).
배경은 row54.py 와 같이 «그 행의 x=0..20 평균색» 으로 잡는다(씬 배경이 세로 그라디언트라서).

작업 101 이 폐기한 «부유 장식»(ref y110~170 의 성긴 덩어리, 행당 12~59 화소) 은 TH 로 걸러진다 —
TH 를 낮춰 그 구간을 캐릭터로 세지 마라(147 등재의 «오독» 경고).

사용: python3 tools/scan147.py <이미지> <off> [TH]
  off = 이미지 y - 프레임 y (레퍼런스 1080x2340 = 84, 캡처 1080x2280 = 0)
"""
import sys
from PIL import Image

# 측정표 54 §3 — 단상별 x 구간과 윗면 y (프레임 좌표)
PODIUMS = [
    ('2위(좌)', 72, 359, 482),
    ('1위(중)', 398, 684, 448),
    ('3위(우)', 723, 1009, 492),
]
BGTH = 26          # row54.py 와 같은 «배경과 다르다» 임계
TOP = 40           # 스캔 시작 행(프레임 y)

im = Image.open(sys.argv[1]).convert('RGB')
px = im.load()
W, H = im.size
off = int(sys.argv[2])
TH = int(sys.argv[3]) if len(sys.argv) > 3 else 100

print(f"{sys.argv[1]}  off={off}  행당 화소 >= {TH} 를 «몸통» 으로")
print(f"{'단상':<9} {'몸통 상단':>8} {'몸통 하단':>8} {'높이':>6} {'최대폭행':>8} {'폭':>5}")
for name, x0, x1, ptop in PODIUMS:
    rows = []
    for fy in range(TOP, ptop):
        y = fy + off
        if y < 0 or y >= H:
            continue
        bg = [0, 0, 0]
        for x in range(0, 20):
            c = px[x, y]
            bg[0] += c[0]; bg[1] += c[1]; bg[2] += c[2]
        bg = [v / 20.0 for v in bg]
        n = 0; lo = -1; hi = -1
        for x in range(x0, x1 + 1):
            c = px[x, y]
            if abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) > BGTH:
                n += 1
                if lo < 0:
                    lo = x
                hi = x
        rows.append((fy, n, lo, hi))
    body = [r for r in rows if r[1] >= TH]
    if not body:
        print(f"{name:<9}  — 몸통 없음")
        continue
    top, bot = body[0][0], body[-1][0]
    wide = max(body, key=lambda r: r[1])
    print(f"{name:<9} {top:>8} {bot:>8} {bot-top+1:>6} {wide[0]:>8} {wide[1]:>5}"
          f"   (최대폭행 x {wide[2]}..{wide[3]}, 윗면 {ptop})")
    thin = [r for r in rows if 0 < r[1] < TH and r[0] < top]
    if thin:
        print(f"          └ 상단 성긴 구간(장식 자리 — 세지 않음): y {thin[0][0]}..{thin[-1][0]}"
              f" 행당 {min(r[1] for r in thin)}~{max(r[1] for r in thin)}")
