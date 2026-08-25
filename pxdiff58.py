from PIL import Image, ImageChops
import sys
tag = sys.argv[1]
base = Image.open(f'docs/review/58-{tag}-1.png').convert('RGB')
for i in range(2, 9):
    im = Image.open(f'docs/review/58-{tag}-{i}.png').convert('RGB')
    d = ImageChops.difference(im, base).convert('L')
    bb = d.point(lambda v: 255 if v > 18 else 0).getbbox()
    hist = d.histogram()
    changed = sum(hist[19:])
    print(f'  {tag}-{i}: 변화 픽셀 {changed:>7}  bbox {bb}')
