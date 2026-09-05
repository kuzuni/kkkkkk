# 16 — ref/캡처의 «글자 잉크» 지표를 같은 창·같은 마스크로 비교한다.
#   python3 tools/ink16.py <캡처파일> [창이름...]
# 창 좌표는 캡처(1080x2280) 기준. ref 는 y+84 로 같은 창을 본다.
import sys
from pydep937 import Image
REF = 'docs/ref/16-유물-세부-팝업.jpg'
WINS = {
  'title':   (280, 675, 800, 745),
  'flavor1': (190, 995, 900, 1045),
  'eff1':    (190, 1200, 900, 1250),
  'act':     (430, 1450, 650, 1520),
  'ow':      (400, 1150, 680, 1200),
}
def lum(p): return 0.299*p[0]+0.587*p[1]+0.114*p[2]
def stats(px, x0, y0, x1, y1):
    n = (x1-x0+1)*(y1-y0+1); blk = wht = 0; xs = []; ys = []
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            p = px[x, y]; L = lum(p); sat = max(p)-min(p)
            if L < 60: blk += 1; xs.append(x); ys.append(y)
            elif L > 225 and sat < 20: wht += 1; xs.append(x); ys.append(y)
    bb = (min(xs), min(ys), max(xs)-min(xs)+1, max(ys)-min(ys)+1) if xs else None
    return blk*100.0/n, wht*100.0/n, bb
cap = Image.open(sys.argv[1]).convert('RGB').load()
ref = Image.open(REF).convert('RGB').load()
names = sys.argv[2:] or list(WINS)
for n in names:
    x0, y0, x1, y1 = WINS[n]
    cb, cw, cbb = stats(cap, x0, y0, x1, y1)
    rb, rw, rbb = stats(ref, x0, y0+84, x1, y1+84)
    rbb = (rbb[0], rbb[1]-84, rbb[2], rbb[3]) if rbb else None
    print('%-8s ref 검정%.1f%% 흰%.1f%% %s | cap 검정%.1f%% 흰%.1f%% %s' % (n, rb, rw, rbb, cb, cw, cbb))
