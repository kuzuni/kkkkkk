from PIL import Image
import sys, statistics
# 훈련 카드 1 (#trw .tr-card:nth-child(1)) — left18 w326 h510, #trw 시트 안. 실제 프레임 좌표는 DOM 에서 뜬 값을 쓴다.
box = tuple(int(x) for x in sys.argv[1:5])   # x0 y0 x1 y1
print('card box', box)
base = None
for i in range(1, 9):
    im = Image.open(f'docs/review/58-r6-upg-{i}.png').convert('RGB').crop(box)
    px = list(im.getdata())
    mean = tuple(round(sum(c[k] for c in px)/len(px), 1) for k in range(3))
    lum  = round(sum(0.299*c[0]+0.587*c[1]+0.114*c[2] for c in px)/len(px), 1)
    if base is None: base = px
    d = round(sum(abs(a[0]-b[0])+abs(a[1]-b[1])+abs(a[2]-b[2]) for a, b in zip(px, base))/len(px)/3, 2)
    print(f'  upg-{i}  mean RGB {mean}  휘도 {lum}  frame1 대비 Δ {d}')
