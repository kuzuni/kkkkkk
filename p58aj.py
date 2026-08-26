#!/usr/bin/env python3
"""31회차 — 강제 합성 캡처(`cap58b.js`)가 스크린캐스트가 놓치던 «재화 픽셀» 을 실제로 담는지 검산.

  python3 p58aj.py <씬> [라운드] [기준라운드]
    예) python3 p58aj.py quest r31 r30

프레임마다 «코인 잉크» 픽셀 수와 그 bbox 를 낸다. 마스크는 30회차가 쓴 것과 같은 계열
(금색: r 크고 b 작다). 기준 프레임(f1)과의 차분이 아니라 절대 마스크를 쓴다 — f1 에도 HUD
알약의 금색이 있으므로 **밴드 영역(y 범위)** 으로 잘라서 센다.
"""
import sys, os
from PIL import Image
import numpy as np

scene = sys.argv[1] if len(sys.argv) > 1 else 'quest'
rounds = sys.argv[2:] or ['r31']
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs', 'review')

# 씬 B(quest) 의 재화는 퀘스트 행 밴드(대략 y 800~1100) 에서 태어나 HUD(y<300)로 간다.
# 밴드만 보면 «퍼짐/머묾» 구간의 유무가 그대로 보인다.
BAND = {'quest': (700, 1200), 'gain': (900, 2100), 'upg': (1300, 1900)}[scene]

# 첫 시험은 절대 마스크였는데 **기준 프레임 f1 에서만 25,209 px** 이 잡혔다 — 퀘스트 행의 보상
# 아이콘·버튼이 이미 같은 금색이다. 연출이 «더한» 것만 봐야 하므로 f1 과의 차분에 마스크를 건다.
def coin_mask(a, base):
    r = a[:, :, 0].astype(np.int16); g = a[:, :, 1].astype(np.int16); b = a[:, :, 2].astype(np.int16)
    gold = (r > 150) & (g > 90) & (b < 130) & (r - b > 60)
    d = np.abs(a.astype(np.int16) - base.astype(np.int16)).max(axis=2)
    return gold & (d > 40)

for rd in rounds:
    print(f'== {rd} / {scene} ==')
    n = 1
    base = None
    while True:
        p = os.path.join(D, f'58-{rd}-{scene}-{n}.jpg')
        if not os.path.exists(p):
            p2 = os.path.join(D, f'58-{rd}-{scene}-{n}.png')
            if not os.path.exists(p2): break
            p = p2
        a = np.asarray(Image.open(p).convert('RGB'))
        sub = a[BAND[0]:BAND[1]]
        if base is None: base = sub
        m = coin_mask(sub, base)
        cnt = int(m.sum())
        if cnt:
            ys, xs = np.nonzero(m)
            bb = f'x{xs.min()}..{xs.max()} y{BAND[0]+ys.min()}..{BAND[0]+ys.max()}'
            w, h = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
            bb += f' ({w}x{h}, 비율 {w/max(h,1):.2f}:1)'
        else:
            bb = '-'
        print(f'  f{n:<3} 밴드 코인픽셀 {cnt:>6}  {bb}')
        n += 1
