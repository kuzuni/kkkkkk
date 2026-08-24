#!/usr/bin/env python3
# 작업 28 — 캡처(1080x1920)에서 «흰 글자 잉크» bbox 를 실측해 레퍼런스 실측값과 대조한다.
# 화면 좌표 변환: 캡처 y = stagearea y + 104,  stagearea y = ref_y - 188  →  캡처 y = ref_y - 84
from PIL import Image
import sys

D = '/tmp/claude-0/-home-user-kkkkkk/912aed5d-6007-59e8-8f18-60ebe7454177/scratchpad/'
CONV = lambda ry: ry - 84          # ref(1080x2340) y  →  캡처(1080x1920) y

def ink(img, box, th=205):
    """box=(x0,y0,x1,y1) 안에서 «중성 흰색»(R,G,B 전부 th 이상) 픽셀의 bbox"""
    x0, y0, x1, y1 = box
    px = img.crop(box).load()
    w, h = x1 - x0, y1 - y0
    mnx, mny, mxx, mxy, n = w, h, -1, -1, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            if r >= th and g >= th and b >= th:
                n += 1
                mnx = min(mnx, x); mxx = max(mxx, x)
                mny = min(mny, y); mxy = max(mxy, y)
    if n == 0:
        return None
    return (x0 + mnx, y0 + mny, mxx - mnx + 1, mxy - mny + 1, n)

fails = []
def chk(name, got, exp, tol=2):
    if got is None:
        fails.append(name + ': 잉크 0px'); print('  ✗ %-22s 잉크 없음' % name); return
    d = [got[i] - exp[i] for i in range(4)]
    bad = any(abs(v) > tol for v in d)
    line = '%-22s got %s  ref→%s  Δ %s  (px %d)' % (
        name, ','.join(str(v) for v in got[:4]), ','.join(str(v) for v in exp), ','.join(str(v) for v in d), got[4])
    if bad:
        fails.append(line); print('  ✗ ' + line)
    else:
        print('  ✓ ' + line)

f39 = Image.open(D + '28-r39.png').convert('RGB')
f40 = Image.open(D + '28-r40.png').convert('RGB')

print('[39] 보스전 진행 중 — 흰 잉크 실측')
# ⏱ 숫자 «30.0» — ref 잉크 (498,252,133,47)
chk('타이머 숫자', ink(f39, (470, CONV(235), 700, CONV(320))), (498, CONV(252), 133, 47))
# 보스 체력바 가운데 수치 — ref 잉크 (507,340,66,20) : 문자열이 달라 폭은 참고값, 높이·y 만 본다
r = ink(f39, (300, CONV(332), 790, CONV(372)))
print('  · 체력바 수치 잉크 = %s (ref 507,%d,66,20 — 문자열이 달라 폭은 대조 제외)'
      % (','.join(str(v) for v in r[:4]) if r else '없음', CONV(340)))
# 우측 두개골 — ref 잉크 (817,334,46,42)
chk('체력바 두개골', ink(f39, (790, CONV(325), 890, CONV(385))), (817, CONV(334), 46, 42))
# STAGE 라벨 — ref 잉크 (443,421,194,28)
chk('STAGE 라벨(39)', ink(f39, (400, CONV(408), 700, CONV(462))), (443, CONV(421), 194, 28))
# 포기하기 버튼 텍스트 — ref 잉크 (488,496,103,22)
chk('포기하기 문구', ink(f39, (452, CONV(486), 630, CONV(536))), (488, CONV(496), 103, 22))

print('[40] 재도전 대기 — 흰 잉크 실측')
# STAGE 라벨 — ref 잉크 (443,311,194,28)
chk('STAGE 라벨(40)', ink(f40, (400, CONV(300), 700, CONV(350))), (443, CONV(311), 194, 28))
# 해골 노드 흰 두개골 — ref 잉크 (507,397,66,60)
chk('중앙 두개골', ink(f40, (470, CONV(380), 620, CONV(475))), (507, CONV(397), 66, 60))
# 스테이지 재도전 버튼 텍스트 — ref 잉크 (443,508,193,26)
chk('재도전 문구', ink(f40, (408, CONV(498), 675, CONV(552))), (443, CONV(508), 193, 26))

print('')
print('SCAN28 FAIL (%d)' % len(fails) if fails else 'SCAN28 PASS')
sys.exit(1 if fails else 0)
