# 작업 384 — 비평가에게 줄 **앵커 적용 1:1 비교판** + 코너 확대판.
#
#   crop352.py 와 같은 창(하단 앵커 −60 을 미리 적용한다 — 337 교훈 2)이고,
#   여기에 «코너» 를 4배 최근접 확대한 짝을 더한다. 384 가 다투는 것은 30px 짜리 호(弧)라
#   1:1 창만 주면 두 그림 다 «그냥 알약» 으로 보인다.
#
#   python3 tools/crop384.py  →  docs/review/384-07-{ref,cap}.png · 384-07-{ref,cap}-corner.png
from pydep937 import Image

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
# 코너 창 — 알약 좌하단에서 안쪽으로 46×46 (감김이 사는 자리 rel 52~85 를 다 덮는다)
CW, CH = 46, 46

ry0, ry1 = BAR_REF_Y0 - PAD_T, BAR_REF_Y1 + PAD_B
ref = Image.open(REF).convert('RGB')
cap = Image.open(CAP).convert('RGB')

ref.crop((X0, ry0, X1, ry1)).save('docs/review/384-07-ref.png')
cap.crop((X0, ry0 - OFF, X1, ry1 - OFF)).save('docs/review/384-07-cap.png')

for tag, im, (px, py) in (('ref', ref, PILL_REF), ('cap', cap, PILL_CAP)):
    box = (px - 3, py + PH - CH, px - 3 + CW, py + PH + 3)
    im.crop(box).resize((CW * ZOOM, (CH + 3) * ZOOM), Image.NEAREST) \
        .save('docs/review/384-07-%s-corner.png' % tag)
    print('384-07-%s-corner  원본 %s → %d배 확대' % (tag, box, ZOOM))

print('384-07  창 x %d~%d · ref y %d~%d → cap y %d~%d' % (X0, X1 - 1, ry0, ry1 - 1, ry0 - OFF, ry1 - 1 - OFF))
