#!/usr/bin/env python3
"""작업 885 9회차 — 수량 라벨(«1,500»·«10,000»·«16,000»)의 **낱자 폭 · 낱자 피치 · 라벨 bbox** 를
**한 자로** ref 와 우리에게 같이 묻는다.

왜 새 자인가 — 8회차 채점 2인(GB·GC)이 «낱자 피치 −8.3~−11.5% · 낱자 폭은 맞다» 로 일치했는데
(7회차 FA 까지 3인 누적), **GC 자신이 «라벨 bbox 폭 −2.7~−4.1%» 를 같이 냈다.**
낱자 폭이 같고 피치가 −9% 면 bbox 는 −8~−10% 여야 한다 — **세 수치가 동시에 참일 수 없다.**
그리고 셋은 **손잡이가 서로 다르다**:

  · 피치가 맞으면 → **자간**(letter-spacing)
  · bbox 가 맞으면 → **`PV_QTY_ADV` 상한**(shrink-to-fit 이 상한까지만 줄인다)
  · 낱자 폭이 틀렸으면 → **font-size**

⇒ 338 규칙대로 처방 전에 셋을 **한 절차**로 같이 낸다. 이 자가 지키는 규약:

  ⓐ 라벨을 **덩이(연결성분)로 쪼개** 낱자를 잡는다 — 열 프로파일 문턱은 쉼표·«1» 처럼
     좁은 글리프에서 덩이를 흘린다(GB·GC 가 «마지막 0→0 쌍» 만 쓴 이유가 그것이다).
     쉼표는 아랫줄에만 있으므로 **세로 중앙 60% 띠**에서만 덩이를 세어 자동으로 빠진다.
  ⓑ 낱자 폭·피치·bbox 를 **같은 마스크 한 벌에서** 낸다(자를 갈아타면 셋의 산수가 안 닫힌다).
  ⓒ 문턱 사다리 3단. 셋 중 하나라도 사다리에서 부호가 뒤집히면 그 축은 **측정 한계**다.
  ⓓ ref 는 K=2.0628 을 곱해 **우리 px** 로 낸다. 두 그림에 **같은 절차**를 돌린다.

⚠ 라벨마다 자릿수가 달라 shrink-to-fit 배율이 다르다 — **라벨을 섞어 평균 내지 마라**(그래서
   같은 문자열끼리만 짝지어 낸다: ref 배너 «1,500» ↔ 우리 배너 «1,500» 처럼).

실행: python3 tools/scan885g.py [우리캡처.png]
"""
import sys

from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628

# 라벨 창 (x0, x1, y0, y1) — 흰 숫자만 담고 금색 판·리본 빨강은 안 담는다.
# ref 는 자기 그림 좌표, 우리는 1080×2280 캡처 좌표. 창은 각 그림에서 «흰 잉크 덩이» 로 확인했다.
REF_WIN = [('ban «1,500»', 157, 207, 202, 218), ('ban «10,000»', 200, 250, 261, 274),
           ('bl «1,500»', 178, 228, 602, 619), ('bl «16,000»', 202, 257, 669, 684)]
OUR_WIN = [('ban «1,500»', 355, 452, 924, 964), ('ban «10,000»', 444, 541, 1045, 1079),
           ('bl «1,500»', 398, 495, 1664, 1704), ('bl «16,000»', 450, 555, 1800, 1836)]

STEPS = [(150, 200), (180, 225), (205, 245)]


def alpha(a, t0, t1):
    """흰 잉크 부분화소 피복 — 휘도 사다리 + «색이 없을 것»(검정 획·금색·빨강 배제)."""
    L = a.mean(2)
    sat = a.max(2) - a.min(2)
    v = np.clip((L - t0) / float(t1 - t0), 0, 1)
    return np.where(sat < 70, v, 0.0)


def blobs(al, minw=1.5):
    """세로 중앙 60% 띠의 열 무게로 덩이를 쪼갠다(쉼표는 이 띠 밖이라 자동으로 빠진다)."""
    h = al.shape[0]
    band = al[int(h * .20):int(h * .80)]
    col = band.sum(0)
    on = col > 0.30 * max(col.max(), 1e-9) * 0.10 + 0.0   # 바닥 잡음만 턴다
    on = col > 0.05 * col.max() if col.max() > 0 else on
    out, s = [], None
    for x in range(len(col)):
        if on[x] and s is None:
            s = x
        if (not on[x]) and s is not None:
            if col[s:x].sum() > 0 and (x - s) >= minw:
                out.append((s, x))
            s = None
    if s is not None:
        out.append((s, len(col)))
    return [(s, e, float((col[s:e] * np.arange(s, e)).sum() / col[s:e].sum())) for s, e in out]


def ink_bbox(al):
    """라벨 전체 잉크 bbox 폭 — 부분화소(열 무게 0.5 교차)."""
    col = al.sum(0)
    if col.max() <= 0:
        return None
    t = 0.5 * np.percentile(col[col > 0], 90) * 0.10
    t = max(t, 0.02 * col.max())
    on = np.nonzero(col > t)[0]
    if not len(on):
        return None
    return float(on[-1] - on[0] + 1)


def run(path, wins, scale, label):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    print('== %s  (K=%.4f)' % (label, scale))
    res = {}
    for name, x0, x1, y0, y1 in wins:
        sub = a[y0:y1, x0:x1]
        row = []
        for t0, t1 in STEPS:
            al = alpha(sub, t0, t1)
            bl = blobs(al)
            if len(bl) < 2:
                row.append(None); continue
            cs = [c for _, _, c in bl]
            pit = [cs[i + 1] - cs[i] for i in range(len(cs) - 1)]
            wid = [e - s for s, e, _ in bl]
            bb = ink_bbox(al)
            row.append((len(bl), np.median(pit) * scale, np.median(wid) * scale,
                        (bb or 0) * scale))
        res[name] = row
        print('  %-12s' % name, end='')
        for r in row:
            if r is None:
                print('   (덩이<2)', end='')
            else:
                print('  n%d 피치%6.2f 폭%6.2f bbox%7.2f' % r, end='')
        print()
    return res


if __name__ == '__main__':
    our = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/151-r65.png'
    r = run(REF, REF_WIN, K, 'ref  ' + REF)
    o = run(our, OUR_WIN, 1.0, 'our  ' + our)
    print('\n== Δ (우리 ÷ ref − 1, %) — 같은 문자열끼리만 짝지었다')
    print('  %-12s %-24s %-24s %-24s' % ('라벨', '피치', '낱자 폭', 'bbox'))
    for name, _, _, _, _ in REF_WIN:
        cells = []
        for k in range(3):
            A, B = r[name][k], o[name][k]
            if A is None or B is None:
                cells.append(('   —', '   —', '   —')); continue
            cells.append(tuple('%+6.1f' % ((B[i] / A[i] - 1) * 100) if A[i] else '   —'
                               for i in (1, 2, 3)))
        print('  %-12s' % name, end='')
        for i in range(3):
            print(' %s' % ' '.join(c[i] for c in cells), end='  ')
        print()
    print('\n  (각 칸은 문턱 3단 — 부호가 뒤집히면 그 축은 «측정 한계»다)')
