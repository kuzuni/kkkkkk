#!/usr/bin/env python3
"""93 15회차 — 색시계 프레임 디코더 (cap93.js 의 프리롤 바이어스 실측 전용).

cap93 이 프리롤 동안 저장한 jpg 를 읽어 **좌상단 색시계 블록의 평균 RGB** 를 찍는다.
시계는 `rgb(v, 255-v, 40)` 이고 `v = round(경과ms / STEP)` 이므로, 호출부가 v 로 «그려진 시각» 을
역산한다. 여기서는 판정하지 않고 **숫자만** 낸다 (판정은 cap93.js).

  python3 dec93.py <디렉터리>     # -> "<파일명> <R> <G> <B>" 를 파일당 한 줄

가장자리는 jpeg 크로마 서브샘플링(q55)에 오염되므로 블록(200×200) 안쪽 20~180 만 평균한다.
"""
import sys, os
from PIL import Image

d = sys.argv[1]
for name in sorted(os.listdir(d)):
    if not name.endswith('.jpg'):
        continue
    im = Image.open(os.path.join(d, name)).convert('RGB').crop((20, 20, 180, 180))
    raw = im.tobytes()
    n = len(raw) // 3
    r = sum(raw[0::3]) / n
    g = sum(raw[1::3]) / n
    b = sum(raw[2::3]) / n
    print('%s %.2f %.2f %.2f' % (name, r, g, b))
