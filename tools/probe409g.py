# 작업 409 14회차 — **알약 «바깥 윤곽» 을 전제 없이 재는 자 (반경 축).**
#
#   13회차 채점에서 DR 이 새 축을 열었다: 검정 링 **바깥** 경계에 최소제곱 원을 피팅하면
#   ref R 33~34 ↔ cap 31.4 — «ref 알약이 더 둥글다». 그 값은 **352 §10 «알약 반경 30»** 을
#   건드리므로 ROUTINE 338 규칙대로 **ref 를 내 자로 다시 재기 전에는 움직이지 않는다.**
#
#   ⚠ **왜 새 자가 필요한가 — 기존 자로는 반경을 잴 수 없다.**
#      `probe409e --rays` 와 `verify409` 의 `ray()` 는 **R=30 을 전제로** «윤곽(d=0)» 을
#      코너 중심에서 30px 인 점으로 잡는다. 반경이 30 이 아니면 그 자는 ref 를
#      몇 px **안쪽에서부터** 읽기 시작한다 — 반경을 재는 데 그 자를 쓰면 순환논법이다.
#
#   세 모드 — 전부 «그림에서 경계를 찾는다»:
#     --edge   행마다 바깥 → 안으로 훑어 **경계 x** 를 찍는다(ref ↔ cap 나란히). 전제 0개.
#     --apex   코너 이등분선 위의 **꼭짓점 거리** d 로 반경을 역산한다: 원이면 d = r(√2 − 1).
#     --diag   이등분선을 따라 **바깥에서 안으로** 코너 층 두께를 잰다(전제 0개).
#              ⚑ 942 1회차 — 경사면이 만든 가짜 층을 접고 표본 몫을 **이웃 두 층에 비례로** 나눈다.
#              옛 «최근접 런» 은 `--int` · 합성 재현은 `--physics`(번진 판 ↔ 칼같은 판 |Δ| 5.00 → 0.13).
#
# 사용:  python3 tools/probe409g.py --edge|--apex|--diag [--int] [--corner BL] | --physics
import os
import sys
import math
from pydep937 import Image

REF7, CAP7 = 'docs/ref/07-스킬-팝업.jpg', 'docs/review/96-full-hero.png'
# 알약 상자 — probe409e/f 와 같은 값(352 §3·§10 · 7회차 §16-1 정정).
# ⚠⚠ **409 17회차 — 아래 `BOX['ref']` 의 x=292 는 1.32px 틀렸다(고치지 않고 남겨 둔다).**
#    ref 알약의 검정 링은 실제로 x 290.73..297.98 이라 **좌변은 290.7** 이다(측정표 07 정오표).
#    값을 그대로 두는 것은 이 파일들이 남긴 **옛 읽기를 재현할 수 있게** 하기 위해서다 —
#    새로 재는 자리에는 `tools/probe409i.py` 를 써라. 그것은 알약 네 변을 **그림에서** 직선
#    스캔해 상자를 잡고, cap 에서 DOM 실측과 0.14px 로 검산된다.
BOX = {'ref': (292, 2027), 'cap': (291, 1967)}
H = 84
W = 261

# 바깥(서브탭 바 바닥)은 밝다(실측 80·94) · 알약 테두리는 검정(0). 중간값을 문턱으로.
EDGE_T = 45

PAL = [
    ('K', (0, 0, 0)),
    ('B', (99, 79, 55)),
    ('F', (75, 62, 45)),
    ('D', (65, 49, 34)),
    ('R', (112, 95, 75)),
    ('S', (43, 35, 26)),
]


def lum(px, x, y):
    c = px[x, y]
    return (c[0] + c[1] + c[2]) / 3.0


def cls(c):
    best, bd = '?', 1 << 30
    for ch, rc in PAL:
        d = sum((int(a) - int(b)) ** 2 for a, b in zip(c, rc))
        if d < bd:
            best, bd = ch, d
    return best


def row_edge(px, bx, by, ly, right, span=34):
    """행 ly 에서 바깥 → 안으로 훑어 «어두워지는» 첫 자리(국소 x, 서브픽셀 선형 보간)."""
    rng = range(W - 1, W - span - 1, -1) if right else range(0, span)
    prev = None
    for lx in rng:
        v = lum(px, bx + lx, by + ly)
        if v <= EDGE_T:
            if prev is None:
                return float(lx)
            pv, plx = prev
            if pv == v:
                return float(lx)
            t = (pv - EDGE_T) / (pv - v)          # pv > T ≥ v
            return plx + t * (lx - plx)
        prev = (v, float(lx))
    return None


def apex(px, bx, by, corner, span=40):
    """코너 이등분선 위의 꼭짓점 거리 d(px) — 상자 코너에서 «처음 어두워지는» 점까지."""
    bottom, right = corner[0] == 'B', corner[1] == 'R'
    ox = (W - 1) if right else 0
    oy = (H - 1) if bottom else 0
    sx = -1 if right else 1
    sy = -1 if bottom else 1
    prev = None
    t = 0.0
    while t <= span:
        x = int(round(ox + sx * t))
        y = int(round(oy + sy * t))
        v = lum(px, bx + x, by + y)
        if v <= EDGE_T:
            if prev is None:
                return t * math.sqrt(2.0)
            pv, pt = prev
            f = (pv - EDGE_T) / (pv - v) if pv != v else 0.0
            return (pt + f * (t - pt)) * math.sqrt(2.0)
        prev = (v, t)
        t += 0.5
    return None


def diag(px, bx, by, corner, inn=22.0, span=40, mode='cov'):
    """이등분선을 따라 **꼭짓점부터 안쪽으로** 코너 층 두께 (전제 0개).

    ⚑⚑ **942 1회차 — 이 축만 «최근접 런» 이었다(같은 파일 안에서 자가 갈렸다).**
       `--edge`·`--apex` 는 진작 문턱 교차 보간인데 여기만 «표본을 이긴 클래스에 통째로 준다» 라
       층 두께가 **언제나 0.5 의 배수**로 굳었다. ref 는 JPEG 이라 층 경계가 2~3px 번지고
       cap 은 PNG 라 칼같으므로, 승자독식은 번진 쪽(ref)의 경사면을 통째로 옆 층에 넘긴다
       — 같은 띠가 ref 만 얇게(또는 두껍게) 읽힌다(932 §ⓑ · `probe409i.cov_ray` 주석의 «ref 6.0 / cap 7.0»).

    ⇒ **걸음도 창(窓)도 문턱도 한 칸 안 바꾼다** — 표본 자리·개수·`cls()` 분류가 옛 자와 같고
      층의 첫 차례도 그 분류가 그대로 정한다(mode='int' 가 옛 값을 글자까지 재현한다).
      바뀌는 것은 둘뿐이다 — ① 두 층 사이 **경사면이 만든 가짜 층**을 접고(`runs_from` ②)
      ② 표본 하나의 몫 0.5 를 **이웃한 두 층**의 색 선분에 사영해 비례로 나눈다(③ · 질량 보존).
      ⇒ 부분 화소는 «구간의 모서리를 미는 데만» 쓴다(932 3회차 규칙 1·2).
    """
    bottom, right = corner[0] == 'B', corner[1] == 'R'
    ox = (W - 1) if right else 0
    oy = (H - 1) if bottom else 0
    sx = -1 if right else 1
    sy = -1 if bottom else 1
    d = apex(px, bx, by, corner, span)
    if d is None:
        return None
    t0 = d / math.sqrt(2.0)
    step = 0.5
    cols, s = [], 0.0
    while s <= inn + 1e-9:
        t = t0 + s / math.sqrt(2.0)
        cols.append(px[bx + int(round(ox + sx * t)), by + int(round(oy + sy * t))])
        s += step
    return runs_from(cols, mode=mode, step=step)


PH_W = 2.0      # 이 폭 이하인 런만 «경사면 후보» 로 본다(그보다 두꺼우면 진짜 층이다)
PH_D = 14.0     # 이웃 두 색을 잇는 선분에서 채널 RMS 이만큼 안쪽이면 «섞인 색» 이다
PH_T = 0.30     # ⚑ 결정적 조건 — 경사면은 사영 t 가 **훑고 지나간다**(진짜 층은 한 자리에 뭉친다)


def _proj(c, p1, p2):
    """색 c 를 선분 p1→p2 에 사영 — (t, 잔차 RMS). t = p2 쪽 몫."""
    vv = [p2[k] - p1[k] for k in range(3)]
    den = sum(v * v for v in vv)
    if den == 0:
        return 0.0, 1e9
    t = sum((int(c[k]) - p1[k]) * vv[k] for k in range(3)) / den
    tc = 0.0 if t < 0 else (1.0 if t > 1 else t)
    res = math.sqrt(sum((int(c[k]) - (p1[k] + tc * vv[k])) ** 2 for k in range(3)) / 3.0)
    return tc, res


def runs_from(cols, mode='cov', step=0.5):
    """표본 색의 줄 `cols` → 층 [(클래스, 두께)]. **자의 알맹이는 여기 하나뿐**이라
       그림 없이도(합성 프로파일로) 같은 자를 돌릴 수 있다(`--physics`)."""
    RGB = dict(PAL)
    # ① 층의 차례 — 옛 자와 **글자 그대로 같은 규칙**(표본을 이긴 클래스).
    runs, owner = [], []
    for c in cols:
        ch = cls(c)
        if runs and runs[-1][0] == ch:
            runs[-1][1] += step
        else:
            runs.append([ch, step])
        owner.append(len(runs) - 1)
    if mode == 'int':
        return [(c, n) for c, n in runs]

    # ② ⚑⚑ **가짜 층을 접는다.** 번진 판에서 두 층 사이 경사면은 «그 둘 사이에 있는 세 번째
    #    팔레트 색»(예: K↔D 사이의 S · D↔B 사이의 F)으로 이겨 **없는 층**이 생긴다
    #    (`--physics`: 참값 S3 K7 D4 B7 이 번진 판에서 `K6.5 S1.5 D2.0 F1.5 B6.5` 로 읽힌다).
    #    좁고(≤PH_W) **이웃 두 색을 잇는 선분 위에 있으면**(잔차 ≤PH_D) 그것은 층이 아니라 경사면이다.
    #    ⚠ 진짜 얇은 층은 그 선분에서 멀리 떨어져 있으므로 잔차 조건이 지켜 준다.
    idx = []                                            # 런별 표본 번호
    j0 = 0
    for ch, n in runs:
        cnt = int(round(n / step))
        idx.append(list(range(j0, j0 + cnt)))
        j0 += cnt
    seq = [r[0] for r in runs]
    bnd = {}                                            # 표본 → (앞 런, 뒤 런) 경사면 표본
    changed = True
    while changed and len(seq) > 2:
        changed = False
        for i in range(1, len(seq) - 1):
            if len(idx[i]) * step > PH_W or seq[i - 1] == seq[i + 1]:
                continue
            p1, p2 = RGB[seq[i - 1]], RGB[seq[i + 1]]
            pr = [_proj(cols[k], p1, p2) for k in idx[i]]
            ts = [t for t, _ in pr]
            # ⚠ 잔차만 보면 **진짜 층도 접힌다** — 참값 D 는 K↔F 선분에서 잔차 2.8 밖에 안 된다.
            #    가르는 것은 «t 가 훑는가» 다: 경사면은 표본마다 t 가 옮겨 가고, 층은 제자리에 뭉친다.
            if pr and max(r for _, r in pr) <= PH_D and (max(ts) - min(ts)) >= PH_T:
                for k in idx[i]:
                    bnd[k] = (i - 1, i + 1)
                del seq[i]
                del idx[i]
                for k in list(bnd):                     # 접힌 뒤 번호가 한 칸 당겨진다
                    a, b = bnd[k]
                    bnd[k] = (a - 1 if a > i else a, b - 1 if b > i else b)
                changed = True
                break

    # ③ 두께 — 표본 몫 step 을 **이웃한 두 «층»** 의 색 선분에 사영해 나눈다.
    #    (⚠ `probe409i.cov_ray` 처럼 «가장 가까운 두 팔레트 색» 에 나누면 K↔D 경사면이
    #     사이에 낀 S 로 새어 나간다 — 이 자는 **차례가 정한 이웃**에만 나눈다.)
    w = [0.0] * len(seq)
    pos = {}
    for i, ks in enumerate(idx):
        for r, k in enumerate(ks):
            pos[k] = (i, r, len(ks))
    for k, c in enumerate(cols):
        if k in bnd:
            a, b = bnd[k]
            t, _ = _proj(c, RGB[seq[a]], RGB[seq[b]])
            w[a] += (1.0 - t) * step
            w[b] += t * step
            continue
        i, r, n = pos[k]
        cand = [j for j in (i - 1, i + 1) if 0 <= j < len(seq)]
        best = None
        for j in cand:
            t, res = _proj(c, RGB[seq[i]], RGB[seq[j]])
            if best is None or res < best[2]:
                best = (j, t, res)
        if best is None:
            w[i] += step
        else:
            j, t, _ = best
            w[i] += (1.0 - t) * step
            w[j] += t * step
    return [(seq[i], w[i]) for i in range(len(seq))]


def physics(widths=((('S'), 3.0), ('K', 7.0), ('D', 4.0), ('B', 7.0)), sig=1.1, step=0.5):
    """**합성 재현** — 같은 참값 층더미를 «칼같은 판»(cap = PNG)과 «번진 판»(ref = JPEG)으로
       그려 두 모드로 잰다. 화소도 브라우저도 안 쓴다.
       돌려주는 것: {mode: {'cap': [...], 'ref': [...]}} · 층은 참값과 같은 차례."""
    import math as _m
    col = dict(PAL)
    # 참값 경계 — 층더미를 0.1px 격자에 그린 뒤 걸음 step 으로 표본한다.
    edges, acc = [], 0.0
    for ch, w in widths:
        edges.append((acc, acc + w, ch))
        acc += w
    total = acc

    def truth(x):
        if x < 0.0:
            return col[edges[0][2]]          # 더미 밖은 «같은 층이 이어진다» — 끝의 가짜 경사면을 안 만든다
        for a, b, ch in edges:
            if a <= x < b:
                return col[ch]
        return col[edges[-1][2]]

    def sample(x, blur):
        if not blur:
            return truth(x)
        # 가우시안 번짐 — ref(JPEG) 의 경사면. 정규화한 커널로 참값을 흐린다.
        num, den = [0.0, 0.0, 0.0], 0.0
        u = -3.0 * sig
        while u <= 3.0 * sig + 1e-9:
            wgt = _m.exp(-0.5 * (u / sig) ** 2)
            c = truth(x + u)
            for k in range(3):
                num[k] += wgt * c[k]
            den += wgt
            u += 0.1
        return tuple(int(round(num[k] / den)) for k in range(3))

    out = {}
    for mode in ('int', 'cov'):
        out[mode] = {}
        for who, blur in (('cap', False), ('ref', True)):
            cols, x = [], 0.0
            while x <= total - 1e-9:
                cols.append(sample(x + step / 2.0, blur))
                x += step
            out[mode][who] = runs_from(cols, mode=mode, step=step)
    return out


def fmt_runs(rs):
    if rs is None:
        return '(경계 없음)'
    return ' '.join('%s%.2f' % (c, n) for c, n in rs)


def imgs():
    """⚠ 캡처(`docs/review/96-*.png`)는 **커밋 금지 자산**이라 없는 클론이 정상이다 —
       없으면 즉사하지 말고 ref 절만 돌린다(932 2회차 `--ref-only` 선례)."""
    out = {'ref': Image.open(REF7).convert('RGB')}
    if os.path.exists(CAP7):
        out['cap'] = Image.open(CAP7).convert('RGB')
    else:
        print('  ⚠ 캡처 없음(%s) — ref 절만 돈다. 만들려면 `node tools/cap96.js`.' % CAP7)
    return out


def main():
    a = sys.argv[1:]
    corners = [a[a.index('--corner') + 1]] if '--corner' in a else ['BL', 'BR', 'TL', 'TR']

    if '--physics' in a or '--physics-thin' in a:
        # ⚠ **되돌림 시험용 더미** — 진짜로 얇은 층 D 2.0px 이 K 와 B **사이 색**이다(= 접기의 덫).
        #    잔차만 보고 접으면 이 층이 통째로 사라진다(2회차 실측: 접기 전 갈래가 실제로 먹었다).
        #    «t 가 훑는가» 조건이 그것을 막는지 — 이 더미가 그 증인이다.
        thin = '--physics-thin' in a
        stack = (('K', 7.0), ('D', 2.0), ('B', 7.0)) if thin else \
                (('S', 3.0), ('K', 7.0), ('D', 4.0), ('B', 7.0))
        r = physics(widths=stack)
        print('══ 409-g/physics — 같은 참값 층더미를 «칼같은 판(cap)» 과 «번진 판(ref)» 으로 그려 두 자로 잰다 ══')
        print('   참값  %s · 번짐 σ 1.1px · 걸음 0.5px\n'
              % ' '.join('%s%.2f' % (c, w) for c, w in stack))
        print('   %-6s %-8s %s' % ('자', '판', '층'))
        for mode in ('int', 'cov'):
            for who in ('cap', 'ref'):
                print('   %-6s %-8s %s' % (mode, who, fmt_runs(r[mode][who])))
        print('')
        for mode in ('int', 'cov'):
            rr, cc = r[mode]['ref'], r[mode]['cap']
            if len(rr) != len(cc):
                print('   %-6s 판 사이 **층 개수가 다르다** (%d ↔ %d) — 번짐이 없는 층을 만들었다'
                      % (mode, len(rr), len(cc)))
                continue
            d = [abs(a2[1] - b2[1]) for a2, b2 in zip(rr, cc)]
            print('   %-6s 판 사이 최대 |Δ| = %.2f px' % (mode, max(d)))
        return

    ims = imgs()

    if '--edge' in a:
        print('══ 409-g/edge — 행마다 «바깥 → 안» 첫 어두운 자리(국소 x) · 전제 0개 ══')
        for corner in corners:
            bottom, right = corner[0] == 'B', corner[1] == 'R'
            ys = list(range(H - 30, H)) if bottom else list(range(0, 30))
            print('\n  %s   (y = 상자 국소)' % corner)
            print('    %-5s %8s %8s %8s' % ('y', 'ref', 'cap', 'Δ(cap−ref)'))
            for ly in ys:
                r = row_edge(ims['ref'].load(), BOX['ref'][0], BOX['ref'][1], ly, right)
                c = row_edge(ims['cap'].load(), BOX['cap'][0], BOX['cap'][1], ly, right)
                if r is None or c is None:
                    continue
                print('    %-5d %8.1f %8.1f %8.1f' % (ly, r, c, c - r))
        return

    if '--apex' in a:
        print('══ 409-g/apex — 코너 이등분선 꼭짓점 거리 d → 반경 역산 (원이면 d = r(√2−1)) ══')
        print('  %-6s %10s %10s %10s' % ('코너', 'ref d/r', 'cap d/r', 'Δr'))
        for corner in corners:
            rr = cc = None
            for who in ('ref', 'cap'):
                d = apex(ims[who].load(), BOX[who][0], BOX[who][1], corner)
                if d is None:
                    continue
                r = d / (math.sqrt(2.0) - 1.0)
                if who == 'ref':
                    rr = (d, r)
                else:
                    cc = (d, r)
            if rr and cc:
                print('  %-6s %4.1f/%5.1f %4.1f/%5.1f %10.1f'
                      % (corner, rr[0], rr[1], cc[0], cc[1], cc[1] - rr[1]))
        print('\n  ⚑ 우리 CSS `30px / 33px` 의 45° 유효반경 = %.1f'
              % math.sqrt(2.0 / (1.0 / 900.0 + 1.0 / 1089.0)))
        return

    mode = 'int' if '--int' in a else 'cov'
    print('══ 409-g/diag — 이등분선 층 두께 (꼭짓점 → 안쪽 22px) · 시작점을 그림에서 찾는다 ══')
    print('   자: %s\n' % ('**옛 최근접 런**(--int · 값이 0.5 의 배수로 굳는다 — 942 가 갈아 끼운 자리)'
                           if mode == 'int' else
                           '질량 분배(942 1회차 — 표본 몫 0.5 를 두 색에 비례로 · 합 보존)'))
    for corner in corners:
        print('\n  %s' % corner)
        for who in ('ref', 'cap'):
            if who not in ims:
                continue
            rs = diag(ims[who].load(), BOX[who][0], BOX[who][1], corner, mode=mode)
            print('    %s  %s' % (who, fmt_runs(rs)))


# ⚑ 942 2회차 — **부를 수 있게 문만 달았다.** 이 파일의 알맹이(`runs_from`·`physics`)를
#    `probe409c.py` 가 그대로 쓴다(사본을 만들지 않는다 — 402 «사본을 지운다»).
#    가드가 없으면 `import probe409g` 가 이 `main()` 을 실행해 버린다. 셈·문턱·출력은 한 글자도 안 바뀐다.
if __name__ == '__main__':
    main()
