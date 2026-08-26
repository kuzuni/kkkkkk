#!/usr/bin/env python3
"""58 24회차 신설 — «부분 중복 페인트» 검출기.

23회차가 넣은 `cap58.js` 의 «⚠ 중복 페인트» 경고는 **프레임 전체가 바이트 동일** 할 때만 운다.
24회차에 비평가 AR 이 낸 ①-1(«gain 10↔11, 70ms 동안 비행 코인 6개 완전 정지 — HUD 는 4,092px
바뀌었으므로 캡처 중복이 아니다»)을 `probe58t` 로 DOM 에서 재니 **그 구간에 아이콘이 프레임마다
45~63px 씩 움직이고 있었다**(정지 프레임 0). 그런데 파일을 직접 재면 AR 이 맞다 —
비행 밴드 y400~800 변경 **0px** · HUD y0~160 변경 5,408px.

즉 CDP 스크린캐스트가 **레이어별로 부분 재합성**한 프레임을 내보낸다: HUD(자체 합성 레이어에서
CSS 애니메이션 중)는 새로 그리고 `#fxl` 오버레이의 페인트는 앞 프레임 것을 재사용한다.
프레임 전체는 서로 다르므로 md5 로는 절대 안 잡히고, 비평가는 «연출이 멈췄다» 로 정직하게 읽는다.
23회차·24회차 ① 감점의 상당 부분이 이 계열이다.

→ 인접 슬롯 쌍마다 **구역별로** 변경 픽셀을 세서, «연출 구역은 0 인데 다른 구역은 바뀐» 쌍을
  경고한다. 이 경고는 비평가 전달문에 그대로 옮겨야 한다(0번 규칙과 같다).

사용: python3 pxdup58.py r24
"""
import sys, os, glob, re

try:
    from PIL import Image, ImageChops
except ImportError:
    print('pxdup58: PIL 이 없다 — `pip install pillow` 후 다시 돌려라'); sys.exit(0)

TAG = sys.argv[1] if len(sys.argv) > 1 else 'r24'
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs', 'review')

# 구역 — 연출이 사는 곳과 «그 프레임이 살아 있다» 는 증거가 되는 곳. 프레임은 1080x2280.
#   첫 판(24회차)은 «어느 구역이든 0 이면 경고» 였는데, 하단 탭바처럼 **원래 안 변하는** 구역이
#   매 쌍에서 걸려 15건 중 12건이 잡음이었다. 판정을 절대값이 아니라 **그 씬 자신의 중앙값 대비**로
#   바꾼다 — 연출 구역이 이웃 쌍들의 5% 밑으로 떨어지면서 다른 구역은 살아 있는 쌍만 운다.
ZONE_FX   = ('연출밴드', (0,  160, 1080, 1900))
ZONE_LIVE = ('HUD',      (0,    0, 1080,  160))
RATIO     = 0.05     # 씬 중앙값 대비 이 비율 아래면 «페인트 재사용» 후보
MINLIVE   = 400      # 다른 구역이 이만큼은 바뀌어야 «프레임 자체는 새것» 이다
THRESH = 12          # 채널 차 — JPEG 압축 잡음 위
STEP   = 2           # 2px 격자 표본(결과는 ×4 로 환산)

def changed(a, b, box):
    ca, cb = a.crop(box), b.crop(box)
    df = ImageChops.difference(ca, cb)
    px = df.load(); w, h = df.size
    n = 0
    for y in range(0, h, STEP):
        for x in range(0, w, STEP):
            if max(px[x, y]) > THRESH:
                n += 1
    return n * STEP * STEP

def main():
    scenes = {}
    for f in glob.glob(os.path.join(D, '58-%s-*.jpg' % TAG)):
        m = re.search(r'58-%s-([a-z]+)-(\d+)\.jpg$' % TAG, f)
        if m:
            scenes.setdefault(m.group(1), []).append((int(m.group(2)), f))
    if not scenes:
        print('pxdup58: docs/review/58-%s-*.jpg 를 못 찾았다' % TAG); return
    warned = 0
    for sc in sorted(scenes):
        files = [f for _, f in sorted(scenes[sc])]
        pairs = []
        for i in range(len(files) - 1):
            a = Image.open(files[i]).convert('RGB')
            b = Image.open(files[i + 1]).convert('RGB')
            pairs.append((i + 1, i + 2,
                          changed(a, b, ZONE_FX[1]), changed(a, b, ZONE_LIVE[1])))
        fx = sorted(p[2] for p in pairs)
        med = fx[len(fx) // 2] if fx else 0
        print('· %s %d장 — 연출 구역 프레임간 변경 중앙값 %dpx' % (sc, len(files), med))
        for i1, i2, vfx, vlive in pairs:
            if med and vfx < med * RATIO and vlive >= MINLIVE:
                warned += 1
                print('  ⚠ 부분 중복 페인트 %s: %d↔%d — 연출 구역 변경 %dpx '
                      '(이 씬 중앙값의 %.1f%%) 인데 HUD 는 %dpx 바뀌었다'
                      % (sc, i1, i2, vfx, 100.0 * vfx / med, vlive))
                print('    → 전달문: «%s 슬롯 %d↔%d 는 캡처가 연출 레이어의 앞 프레임 페인트를 '
                      '재사용한 것이다(프레임 전체는 서로 다르므로 md5 로는 안 잡힌다). '
                      '이 쌍에서 연출이 안 움직이는 것을 «정지»·«무반응» 으로 세지 말 것.»'
                      % (sc, i1, i2))
    if not warned:
        print('\nPXDUP58 CLEAN — 부분 중복 페인트 없음')
    else:
        print('\nPXDUP58 %d건 — 위 전달문을 비평가 브리프에 그대로 옮겨라' % warned)

main()
