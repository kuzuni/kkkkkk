# 작업 409 — 비평가에게 줄 **앵커 적용 1:1 비교판** + 코너 확대판(위·아래 둘 다).
#
#   crop384.py 와 같은 창(하단 앵커 −60 을 미리 적용한다 — 337 교훈 2).
#   384 는 «바닥 띠가 코너를 감는가» 라 아래 코너 한 장이면 됐지만, 409 가 다투는 것은
#   **검정 옆띠가 코너 호 전체에서 등폭인가** 라 위·아래 코너를 **둘 다** 줘야 한다
#   (밴드는 위·아래에서 같은 방식으로 얇아진다 — 한쪽만 주면 «원래 그런 그림» 으로 읽힌다).
#
#   python3 tools/crop409.py
#     → docs/review/409-07-{ref,cap}.png        1:1 바 전체
#       docs/review/409-07-{ref,cap}-bl.png     좌하 코너 4배
#       docs/review/409-07-{ref,cap}-tl.png     좌상 코너 4배
from PIL import Image

OFF = 60
PAD_T, PAD_B = 46, 46
BAR_REF_Y0, BAR_REF_Y1 = 2021, 2118

REF, CAP = 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png'
X0, X1 = 20, 1060

# 활성 알약(«스킬») 상자 — 352 §3·§10 이 확정한 값. 세로는 하단 앵커 −60.
PILL_REF = (292, 2027)
PILL_CAP = (291, 1967)
PW, PH = 260, 85
ZOOM = 4
CW, CH = 46, 46          # 코너 창 — 반경 30 + 여유

ry0, ry1 = BAR_REF_Y0 - PAD_T, BAR_REF_Y1 + PAD_B
ref = Image.open(REF).convert('RGB')
cap = Image.open(CAP).convert('RGB')

ref.crop((X0, ry0, X1, ry1)).save('docs/review/409-07-ref.png')
cap.crop((X0, ry0 - OFF, X1, ry1 - OFF)).save('docs/review/409-07-cap.png')

for tag, im, (px, py) in (('ref', ref, PILL_REF), ('cap', cap, PILL_CAP)):
    for cor, box in (
        ('bl', (px - 3, py + PH - CH, px - 3 + CW, py + PH + 3)),
        ('tl', (px - 3, py - 3, px - 3 + CW, py - 3 + CH + 3)),
    ):
        im.crop(box).resize((CW * ZOOM, (CH + 3) * ZOOM), Image.NEAREST) \
            .save('docs/review/409-07-%s-%s.png' % (tag, cor))
        print('409-07-%s-%s  원본 %s → %d배 확대' % (tag, cor, box, ZOOM))

print('409-07  창 x %d~%d · ref y %d~%d → cap y %d~%d' % (X0, X1 - 1, ry0, ry1 - 1, ry0 - OFF, ry1 - 1 - OFF))
