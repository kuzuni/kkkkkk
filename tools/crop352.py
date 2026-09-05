# 작업 352 — 비평가에게 줄 **앵커 적용 1:1 비교판**.
#
#   337 교훈 2: «앵커가 둘» 을 말로 주면 유령이 돌아온다(335 는 그것으로 세 회차를 태웠다).
#   ref 를 하단 앵커(−60)만큼 미리 밀어 **같은 창**으로 잘라 준다 — 두 장을 겹쳐 보면 바로 대조된다.
#
#   python3 tools/crop352.py   →  docs/review/352-{03,07}-{ref,cap}.png
from pydep937 import Image

OFF = 60
PAD_T, PAD_B = 46, 46          # 바 위·아래 여백 (탭바·시트 바닥과의 관계까지 보이게)
BAR_REF_Y0, BAR_REF_Y1 = 2021, 2118

JOBS = [
    ('07', 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png', 20, 1060),
    ('03', 'docs/ref/03-던전-팝업.jpg', 'docs/review/96-full-dun.png', 110, 990),
]

for tag, refp, capp, x0, x1 in JOBS:
    ry0, ry1 = BAR_REF_Y0 - PAD_T, BAR_REF_Y1 + PAD_B
    ref = Image.open(refp).convert('RGB').crop((x0, ry0, x1, ry1))
    cap = Image.open(capp).convert('RGB').crop((x0, ry0 - OFF, x1, ry1 - OFF))
    ref.save('docs/review/352-%s-ref.png' % tag)
    cap.save('docs/review/352-%s-cap.png' % tag)
    print('352-%s  창 x %d~%d · ref y %d~%d → cap y %d~%d  (%dx%d)'
          % (tag, x0, x1 - 1, ry0, ry1 - 1, ry0 - OFF, ry1 - 1 - OFF, ref.width, ref.height))
