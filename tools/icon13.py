#!/usr/bin/env python3
"""작업 13 — 카드 크림 패널 «아이콘 잉크» 를 ref/cap **동일 마스크**로 재는 probe (9회차 신설).

8회차가 남긴 미판정(«카드④ AC 세로 −19% ↔ AD 가로 +15%» — 축이 반대)을 닫으려고 만들었다.

마스크 고르기(9회차에 실패한 것도 남긴다 — 다음 세션이 같은 길을 다시 파지 않도록):
  ✗ «크림(252,234,214)에서 채널합 거리 > 150»  — 패널은 균일 크림이 아니라 세로 그라디언트 +
    안쪽 그림자라, 창 테두리가 통째로 잉크로 잡혀 **창 크기(240×141)를 그대로 뱉는다**.
  ✗ «행별 배경 중앙값에서 벗어난 픽셀» — 아이콘이 그 행의 절반 이상을 덮으면 중앙값 자체가
    아이콘 색이 돼서 반전된다. 인셋을 10·16·20·24 로 쓸어도 칸마다 창 크기로 saturate 했다.
  ✓ «어둡거나(min<170) 채도 높은(max−min>70) 픽셀» — 크림·흰 패널은 밝고 무채라 안 걸리고,
    아이콘 잉크만 걸린다. 창을 카드+(25,83)~(259,212) 로 잡으면 ④⑤⑥ 이 Δ≤3% 로 떨어져
    **saturate 하지 않는다는 것이 확인된다**(대조군).

실행: python3 tools/icon13.py [캡처경로]
"""
import sys
from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/13-상점-팝업-재화-탭.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/13-r9.png'
DY = 84
CARDS = [(111, 783), (401, 783), (691, 783), (111, 1102), (401, 1102), (691, 1102)]
NAME = ['① 보석', '② 공물', '③ 골드 상자', '④ 상자 열쇠', '⑤ 강화석', '⑥ 소환 열쇠']


def ink(img, x0, y0, x1, y1):
    w = img[y0:y1, x0:x1].astype(np.int32)
    mx, mn = w.max(axis=2), w.min(axis=2)
    m = (mn < 170) | ((mx - mn) > 70)
    if m.sum() < 30:
        return None
    ys, xs = np.where(m)
    return (int(x0 + xs.min()), int(y0 + ys.min()),
            int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1))


ref = np.asarray(Image.open(REF).convert('RGB'))
cap = np.asarray(Image.open(CAP).convert('RGB'))
print('%-12s %-22s %-22s %s' % ('카드', 'ref→프레임(x,y,w,h)', 'cap(x,y,w,h)', 'Δ(x,y,w,h) / Δw% Δh%'))
print('-' * 96)
for i, (cx, cy) in enumerate(CARDS):
    br = ink(ref, cx + 25, cy + DY + 83, cx + 259, cy + DY + 212)
    bc = ink(cap, cx + 25, cy + 83, cx + 259, cy + 212)
    if br is None or bc is None:
        print('%-12s %s %s  마스크 부족' % (NAME[i], br, bc)); continue
    brf = (br[0], br[1] - DY, br[2], br[3])
    dw = (bc[2] - br[2]) / br[2] * 100
    dh = (bc[3] - br[3]) / br[3] * 100
    flag = '  <<' if (abs(dw) >= 6 or abs(dh) >= 6) else ''
    print('%-12s %-22s %-22s (%+d,%+d,%+d,%+d) / %+.1f%% %+.1f%%%s'
          % (NAME[i], str(brf), str(bc), bc[0] - brf[0], bc[1] - brf[1],
             bc[2] - brf[2], bc[3] - brf[3], dw, dh, flag))
print('-' * 96)
print('① 은 «구매 완료» 딤·검정 띠가 창을 덮어 대조가 성립하지 않는다(캡처 상태). ④⑤⑥ = 대조군.')
