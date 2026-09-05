#!/usr/bin/env python3
"""작업 934 — 배지 두 줄 덩어리가 별판 안에서 «위로 떠 있는가» 를 **셋째 자**로 가른다.

왜 셋째 자인가 — 895 1회차 채점 2인이 **부호는 같고 크기가 4배 갈렸다**:
  · GH «판 **무게중심** 대비 세로 −5.4px(위로) · 화면축 위 5.8px» ⇒ 처방 «두 줄을 내려라»
  · GI «판 **AABB 중심** 대비 −1.2/−1.3px = 판 폭의 0.9% 이내 — 제자리다»
등재문이 뿌리를 «별판이 별 모양이라 무게중심 ≠ AABB 중심» 으로 짚고
«셋째 자는 **어느 원점이 ref 의 제자리를 정하는가** 부터 정하라» 고 적었다.

**이 자의 답 — 원점을 고르기 전에 «그 원점이 무엇에 의존하는가» 를 먼저 묻는다.**

분홍 마스크는 판 «전체» 가 아니다. 노랑 글자와 그 검정 획이 판 위에 얹혀 있으므로
분홍은 그 자리에 **구멍이 뚫린 도넛**이고, 도넛의 무게중심은 **구멍의 크기·자리**에 끌려간다.
글자는 판 위쪽에 있으니 구멍이 클수록 무게중심이 **아래로** 내려가고,
그만큼 «판 − 글자» 가 «글자가 위로 떴다» 로 읽힌다.
⇒ **GH 의 원점은 재려는 대상(글자)에 의존한다 — 자가 자기 답을 만든다.**

실측이 그 순환을 그대로 찍는다(구멍이 판에서 차지하는 넓이):
    ref 8.9~9.5%  ↔  우리 21.3~21.8%   (우리 검정 획이 8px/7px 로 두껍다)
그래서 «생(生) 무게중심 − AABB 중심» 이 ref +2.5 ↔ 우리 +7.0 (우리 px) 로 갈리고,
그 차 4.5px 이 두 비평의 갈림 5.8 − 1.4 = 4.4px 을 **통째로** 설명한다.

**처방 — 덮개 적분(942 등재분의 처방).** 구멍을 테두리에서 흘려 채워(flood fill) 메운 뒤
무게중심을 낸다. 그러면 원점이 글자와 무관해지고, 그 순간 두 형이 만난다:
    덮개 «무게중심 − AABB 중심»  ref +4.4  ↔  우리 +4.8   (Δ 0.4px)
= **별 모양 자체는 충실하다.** 남는 것은 글자 덩어리의 자리뿐이고,
글자에 안 기대는 원점이 같은 답을 낸다(AABB +1.43 · 덮개 +1.78 · 판 높이의 0.8~1.0%).

⚑ **932 규약 — 판정을 지는 축은 정수 걸음이 아니다.** AABB 중심은 min/max 라
ref 에서 ±0.5 ref px = **±1.03 우리 px** 로 양자화되고, 그 눈금이 재려는 양(1.4px)과
같은 크기다 ⇒ **AABB 는 방증으로만 쓰고**, 판정은 부분 피복 **질량 적분**(`pink_cov`)으로
낸 «덮개 질량적분» 이 진다(이진 덮개 +1.82 ↔ 질량적분 +1.78 — 계단이 답을 안 만든다).

⚠ 이 자는 «판 자리» 는 묻지 않는다 — 등재문이 «판 중심은 건드리지 마라»(2인 독립 확인)로 닫았다.

실행:
    python3 tools/scan934.py --cap scratch/934-cap.png --geo scratch/934-geo2.json
    python3 tools/scan934.py ... --shift-i 4.9 --shift-b 6.4   # 되돌림 시험(GH 처방을 흉내)
"""
import json
import sys

from pydep937 import np
from pydep937 import Image
from pydep937 import fail

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628                        # 우리 px = ref px × K (측정표 §9)

# ref 배지 창 (x0, y0, y1) — scan885d.py 와 **같은 창**을 쓴다(자끼리 어긋나지 않게).
REF_WIN = [(350, 0, 110), (350, 300, 405)]

PINK_STEPS = [40, 60, 80, 100, 120]
YEL_STEPS = [30, 50, 70, 90, 110]


def pink_mask(a, t):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (R - np.maximum(G, B) >= t) & (R > 120)


def pink_cov(a, t, band=40.0):
    """분홍 **부분 피복** α∈[0,1] — 932 규약(정수로 세는 자로 ref 를 재면 우리와 못 견준다).

    이진 마스크의 무게중심은 «화소가 마스크에 드는가» 라는 계단을 한 번 거치므로
    ref(작은 그림)에서 그 계단이 ×K 로 확대된다. 색거리 d 를 문턱 t 에서 band 폭으로
    선형으로 풀어 **질량 적분**으로 무게중심을 내면 그 계단이 사라진다.
    """
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    d = (R - np.maximum(G, B)).astype(float)
    al = np.clip((d - (t - band / 2.0)) / band, 0.0, 1.0)
    al[R <= 120] = 0.0
    return al


def yel_mask(a, t):
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    return (np.minimum(R, G) - B >= t) & (R > 140) & (G > 110)


def fill_holes(m):
    """테두리에서 배경을 흘려 «바깥» 을 찾고, 배경에서 그것을 뺀 것이 구멍이다.

    scipy 를 안 쓴다(937 조건부 의존 — 이 자 하나 때문에 무거운 의존을 심지 않는다).
    배지 창은 200px 안팎이라 4-이웃 팽창 반복으로 충분하다.
    """
    bg = ~m
    out = np.zeros_like(bg)
    out[0, :] |= bg[0, :]
    out[-1, :] |= bg[-1, :]
    out[:, 0] |= bg[:, 0]
    out[:, -1] |= bg[:, -1]
    while True:
        n = out.copy()
        n[1:, :] |= out[:-1, :]
        n[:-1, :] |= out[1:, :]
        n[:, 1:] |= out[:, :-1]
        n[:, :-1] |= out[:, 1:]
        n &= bg
        if int(n.sum()) == int(out.sum()):
            break
        out = n
    return m | (bg & ~out)


def geom(m):
    """(AABB 중심 x,y · 무게중심 x,y · 화소 수 · AABB 폭,높이) — 창-로컬 px."""
    ys, xs = np.nonzero(m)
    if len(ys) == 0:
        return None
    return {
        'bx': float(xs.min() + xs.max()) / 2, 'by': float(ys.min() + ys.max()) / 2,
        'mx': float(xs.mean()), 'my': float(ys.mean()), 'n': int(len(ys)),
        'w': float(xs.max() - xs.min() + 1), 'h': float(ys.max() - ys.min() + 1),
    }


def measure(img, win, scale, shift=None):
    """문턱 사다리마다 세 원점의 «판 원점 − 글자 무게중심» 을 우리 px 으로 낸다.

    shift = (dx, dy) 우리 px — 되돌림 시험용으로 **글자 쪽만** 옮겨 재현한다.
    """
    x0, y0, y1 = win
    sub = img[y0:y1, x0:]
    rows = []
    for tp, ty in zip(PINK_STEPS, YEL_STEPS):
        pm = pink_mask(sub, tp)
        ym = yel_mask(sub, ty)
        if pm.sum() < 200 or ym.sum() < 50:
            rows.append(None)
            continue
        p = geom(pm)
        fm = fill_holes(pm)
        pf = geom(fm)
        y = geom(ym)
        # 덮개 **질량 적분** — 구멍은 α=1 로 메우고(글자 자리도 판이다) 나머지는 부분 피복.
        al = np.maximum(pink_cov(sub, tp), fm.astype(float))
        tot = al.sum()
        acx = float((al * np.arange(al.shape[1])[None, :]).sum() / tot)
        acy = float((al * np.arange(al.shape[0])[:, None]).sum() / tot)
        gy = y['my']
        gx = y['mx']
        if shift:
            gx += shift[0] / scale
            gy += shift[1] / scale
        rows.append({
            't': tp,
            'aabb': ((p['bx'] - gx) * scale, (p['by'] - gy) * scale),
            'raw': ((p['mx'] - gx) * scale, (p['my'] - gy) * scale),
            'cov': ((acx - gx) * scale, (acy - gy) * scale),
            'cov_bin': ((pf['mx'] - gx) * scale, (pf['my'] - gy) * scale),
            'skew_raw': (p['my'] - p['by']) * scale,
            'skew_cov': (acy - pf['by']) * scale,
            'hole': 100.0 * (pf['n'] - p['n']) / pf['n'],
            'pw': p['w'] * scale, 'ph': p['h'] * scale,
        })
    return rows


def med(rows, key, idx=None):
    v = [r[key] if idx is None else r[key][idx] for r in rows if r]
    return float(np.median(v)) if v else float('nan')


def report(rows, tag):
    if not [r for r in rows if r]:
        print('  %-22s — 잉크 없음' % tag)
        return None
    print('  %-22s 판 %.1f×%.1f · 구멍 %.1f%% · 기울음(생) %+.2f · 기울음(덮개) %+.2f'
          % (tag, med(rows, 'pw'), med(rows, 'ph'), med(rows, 'hole'),
             med(rows, 'skew_raw'), med(rows, 'skew_cov')))
    for nm, key in (('AABB 중심', 'aabb'), ('생 무게중심', 'raw'),
                    ('덮개(이진)', 'cov_bin'), ('덮개 질량적분', 'cov')):
        cells = ' | '.join('t%-3d(%+5.1f,%+6.1f)' % (r['t'], r[key][0], r[key][1])
                           for r in rows if r)
        print('    %-14s %s' % (nm, cells))
        print('    %-14s ⇒ 중앙값 (%+.1f, %+.1f)'
              % ('', med(rows, key, 0), med(rows, key, 1)))
    return {k: (med(rows, k, 0), med(rows, k, 1))
            for k in ('aabb', 'raw', 'cov', 'cov_bin')} | {
        'hole': med(rows, 'hole'), 'skew_raw': med(rows, 'skew_raw'),
        'skew_cov': med(rows, 'skew_cov'), 'ph': med(rows, 'ph'), 'pw': med(rows, 'pw')}


def main():
    def arg(nm, dv=None):
        return sys.argv[sys.argv.index(nm) + 1] if nm in sys.argv else dv

    cap = arg('--cap', 'scratch/934-cap.png')
    geo = arg('--geo', 'scratch/934-geo2.json')
    shift = None
    si, sb = arg('--shift-i'), arg('--shift-b')
    if si or sb:
        # 두 줄을 서로 다른 양으로 미는 GH 처방은 강체를 깬다 — 자에는 평균으로 들어온다
        # (덩어리 중심이 얼마나 내려가는가 만 묻기 때문이다).
        shift = (0.0, (float(si or 0) + float(sb or 0)) / 2)

    try:
        ref = np.asarray(Image.open(REF).convert('RGB')).astype(int)
        ours = np.asarray(Image.open(cap).convert('RGB')).astype(int)
        g = json.load(open(geo))
    except Exception as e:                                   # noqa: BLE001
        fail('입력을 못 열었다: %s' % e, 'node tools/cap151.js scratch/934-cap.png --geo 를 먼저 돌려라')

    print('=== 934 셋째 자 — «판 원점 − 글자 무게중심» (우리 px · + = 글자가 판보다 위/왼쪽) ===')
    if shift:
        print('  ⚠ 되돌림 시험: 글자 덩어리를 세로 %+.2f px 옮겨 재현한다' % shift[1])
    R = [report(measure(ref, w, K), 'ref %s' % nm)
         for w, nm in zip(REF_WIN, ('위 카드(배너형)', '아래 카드(불릿형)'))]
    O = []
    for c in g['cards']:
        b = c.get('bdg')
        if not b:
            continue
        x0, y0 = int(b['x']) - 20, int(b['y']) - 20
        y1 = int(b['y'] + b['h']) + 20
        if pink_mask(ours[y0:y1, x0:], 60).sum() < 200:
            continue
        O.append(report(measure(ours, (x0, y0, y1), 1.0, shift), '우리 %s' % c['id']))
    R = [r for r in R if r]
    O = [o for o in O if o]
    if not R or not O:
        fail('ref 또는 우리 배지를 못 찾았다', '창(REF_WIN)과 geo 의 bdg 를 확인하라')

    def av(rows, k, i=None):
        return float(np.mean([r[k] if i is None else r[k][i] for r in rows]))

    print('\n  --- 원점이 무엇에 의존하는가 ---')
    print('  구멍이 판에서 차지하는 넓이   ref %.1f%%  ↔  우리 %.1f%%   (차 %+.1f%%p)'
          % (av(R, 'hole'), av(O, 'hole'), av(O, 'hole') - av(R, 'hole')))
    print('  «무게중심 − AABB 중심» 생    ref %+.2f  ↔  우리 %+.2f   ⇒ 갈림 %+.2f px'
          % (av(R, 'skew_raw'), av(O, 'skew_raw'), av(O, 'skew_raw') - av(R, 'skew_raw')))
    print('  «무게중심 − AABB 중심» 덮개  ref %+.2f  ↔  우리 %+.2f   ⇒ 갈림 %+.2f px'
          % (av(R, 'skew_cov'), av(O, 'skew_cov'), av(O, 'skew_cov') - av(R, 'skew_cov')))

    print('\n  --- 세 원점의 답 (Δ = 우리 − ref · + 면 우리 글자가 판 안에서 더 위/왼쪽) ---')
    out = {}
    for nm, key in (('AABB 중심   ', 'aabb'), ('생 무게중심  ', 'raw'),
                    ('덮개(이진)  ', 'cov_bin'), ('덮개 질량적분', 'cov')):
        dx = av(O, key, 0) - av(R, key, 0)
        dy = av(O, key, 1) - av(R, key, 1)
        ph = av(O, 'ph')
        print('  %s  ref (%+.1f,%+.1f) ↔ 우리 (%+.1f,%+.1f)  ⇒ Δ(%+.2f, %+.2f)  세로 = 판 높이의 %.2f%%'
              % (nm, av(R, key, 0), av(R, key, 1), av(O, key, 0), av(O, key, 1),
                 dx, dy, 100.0 * dy / ph))
        out[key.strip()] = (dx, dy, 100.0 * dy / ph)
    print(json.dumps({'dx_dy_pct': out,
                      'hole_ref': av(R, 'hole'), 'hole_our': av(O, 'hole'),
                      'skew_raw': [av(R, 'skew_raw'), av(O, 'skew_raw')],
                      'skew_cov': [av(R, 'skew_cov'), av(O, 'skew_cov')]},
                     ensure_ascii=False))


if __name__ == '__main__':
    main()
