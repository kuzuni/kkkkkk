# 작업 114 — 캡처 프레임의 «연출 밀도» 자가 점검(비평가에게 보내기 전 1차 게이트).
# 전투 캔버스 영역(y 340~1760)에서 밝은 픽셀(휘도>150)·채도 높은 픽셀 수를 세어
# «연출이 몇 프레임에 실제로 보이는가» 를 수치로 만든다. 사용: python3 tools/scan114.py <회차>
import sys, glob, os
from pydep937 import Image
R = sys.argv[1] if len(sys.argv) > 1 else '1'
root = os.path.join(os.path.dirname(__file__), '..', 'docs', 'review')
for scene in ['trail', 'impact', 'boom', 'bolt']:
    fs = sorted(glob.glob(os.path.join(root, '114-r%s-%s-*.png' % (R, scene))),
                key=lambda p: int(p.rsplit('-', 1)[1].split('.')[0]))
    if not fs: continue
    rows = []
    for f in fs:
        im = Image.open(f).convert('RGB').crop((0, 340, 1080, 1760))
        px = im.load()
        bright = hot = 0
        for y in range(0, im.height, 3):
            for x in range(0, im.width, 3):
                r, g, b = px[x, y]
                l = (r*299 + g*587 + b*114)//1000
                if l > 150: bright += 1
                if l > 205: hot += 1
        rows.append((os.path.basename(f).rsplit('-', 1)[1].split('.')[0], bright, hot))
    tot = len(rows)
    live = sum(1 for _, b, _ in rows if b > 200)
    print('%-7s %d프레임 · 밝은픽셀>200인 프레임 %d/%d' % (scene, tot, live, tot))
    print('        ' + ' '.join('%s:%d/%d' % r for r in rows))
