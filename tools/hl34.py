"""34 초록 스트립 헤드라인 잉크 bbox 결선 (16회차).

11·13회차는 «작다» 로 fs 를 56→62→65→70 으로 키웠고, 16회차 비평가 R·S 는 «크다» 로 뒤집었다.
같은 요소가 라운드를 넘어 부호를 바꾸면(LESSONS 92-⑨) 값을 또 흔들지 말고 직접 재야 한다.

방법: 스트립 안 «초록이 아닌» 화소를 잉크로 보고, 좌측 일러스트를 제외한 우측 영역에서만 bbox 를 잡는다.
  ref  = docs/ref/34-축복-버프팝업.jpg (1080x2340, 상단 84px 상태바) → 프레임 y = ref y - 84
  cap  = docs/review/34-r17.png       (1080x2280)
사용: python3 tools/hl34.py [cap경로]
"""
import sys
from pydep937 import np
from pydep937 import Image

CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/34-r17.png'


def ink_mask(a):
    """초록 바탕(스트립) 위의 «초록이 아닌» 화소 = 글자 잉크 + 외곽선."""
    r, g, b = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
    green = (g > r + 30) & (g > b + 30) & (g > 90)
    return ~green


def bbox(m):
    ys, xs = np.nonzero(m)
    if len(ys) == 0:
        return None
    return xs.min(), ys.min(), xs.max(), ys.max()


def report(name, path, yoff, x0, y0, x1, y1):
    a = np.array(Image.open(path).convert('RGB'))
    sub = a[y0 + yoff:y1 + yoff, x0:x1]
    m = ink_mask(sub)
    bb = bbox(m)
    if bb is None:
        print(f'{name}: 잉크 없음')
        return None
    bx0, by0, bx1, by1 = bb
    w, h = bx1 - bx0 + 1, by1 - by0 + 1
    fx0, fy0 = x0 + bx0, y0 + by0
    print(f'{name:5s} 헤드라인 잉크 bbox  x{fx0}..{x0+bx1}  y{fy0}..{y0+by1}   '
          f'**{w}x{h}**   중심({fx0+w/2:.1f},{fy0+h/2:.1f})   우끝 {x0+bx1}')
    # 행별 잉크 폭 프로파일 상/하단 5행 — 절단 여부 확인용
    rows = m.sum(axis=1)
    nz = np.nonzero(rows)[0]
    print(f'      상단 5행 잉크폭 {[int(rows[i]) for i in nz[:5]]} · 하단 5행 {[int(rows[i]) for i in nz[-5:]]}')
    return w, h


# 헤드라인은 스트립 우측(좌측 일러스트 x137..459 제외). 스트립 프레임 y1522..1771.
# 좌측 일러스트를 확실히 피하려고 x 는 480 부터, 세로는 스트립 상단부(버튼 위)만 본다.
# 스트립 박스는 frame x64..1016 · y1523..1772, 검정 테두리 5px → 내부는 x69..1011 · y1528..1767.
# 테두리는 «초록이 아닌» 화소라 창에 넣으면 잉크로 잡힌다 — 창을 내부로 확실히 들여놓는다.
# 좌측 일러스트는 x64+68 .. +323 = x132..455 이므로 x470 부터. CTA 버튼은 frame y1635~ 이므로 y1632 까지.
X0, X1 = 470, 1006
Y0, Y1 = 1535, 1632
print(f'창: x{X0}..{X1} · 프레임 y{Y0}..{Y1}  (ref 는 +84 행에서 읽는다)')
ref = report('ref', 'docs/ref/34-축복-버프팝업.jpg', 84, X0, Y0, X1, Y1)
cap = report('우리', CAP, 0, X0, Y0, X1, Y1)
if ref and cap:
    print(f'\n차이: 폭 {cap[0]-ref[0]:+d}px ({(cap[0]/ref[0]-1)*100:+.1f}%) · '
          f'높이 {cap[1]-ref[1]:+d}px ({(cap[1]/ref[1]-1)*100:+.1f}%)')
