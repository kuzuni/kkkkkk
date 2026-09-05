# A4 스킬 슬롯 — 레퍼런스와 캡처를 **같은 내용이 같은 좌표에 오도록** 잘라 준다.
#   python3 tools/cropA4.py <회차>
#     → docs/review/A4-ref-crop.png   (레퍼런스 1080×2340 에서 슬롯 행 구간)
#     → docs/review/A4-r<회차>-cmp.png(캡처 1080×2280 에서 같은 구간)
#   두 장은 **같은 크기 1080×300** 이고, 같은 픽셀 좌표가 같은 요소를 가리킨다.
#
# ⚠ 세로 변환은 이 화면만 «−84» 가 아니다.
#   #slots 는 #battlefoot 안에 있고 #battlefoot 은 `bottom:0` 이다. 탭바(bottom:0·h180)와 같은
#   **바닥 앵커**라, 레퍼런스 콘텐츠 2256 과 프레임 2280 의 24px 차이가 이 행 «위»(전투 캔버스)에서
#   흡수된다(LESSONS 63-4). 실측으로도 슬롯 하단 ref 2133 ↔ cap 2073, 탭바 상단 ref 2159 ↔ cap 2100
#   으로 **Δ60** 이 일정하다. → cap y = ref y − 60.
import sys
from pydep937 import Image

r = sys.argv[1] if len(sys.argv) > 1 else '6'
DY = 60                                    # ref y - DY = cap y  (바닥 앵커 구간)
REF_Y0, H = 1950, 300                      # 레퍼런스 좌표 기준 창(슬롯 행 2015~2133 + 위아래 여유)

ref = Image.open('docs/ref/02-기본-메인-화면.jpg').convert('RGB')
cap = Image.open('docs/review/A4-r' + r + '.png').convert('RGB')

ref.crop((0, REF_Y0, 1080, REF_Y0 + H)).save('docs/review/A4-ref-crop.png')
cap.crop((0, REF_Y0 - DY, 1080, REF_Y0 - DY + H)).save('docs/review/A4-r' + r + '-cmp.png')
print('A4-ref-crop.png   ref y %d..%d' % (REF_Y0, REF_Y0 + H))
print('A4-r%s-cmp.png    cap y %d..%d  (= 같은 내용)' % (r, REF_Y0 - DY, REF_Y0 - DY + H))
