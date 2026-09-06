# -*- coding: utf-8 -*-
"""작업 966 — 10 이용권 «불릿형» 카드의 **세로 사다리** 재현기 (923 10회차 채점 GZ·HA 가 넘긴 자리).

무엇을 묻는가 — 966 등재문:
  > 마지막 알약 아랫변 ↔ 리본1 윗변 틈 **+2.65~2.87 우리px (+5.7~6.2%)**
  > 몫 = 마지막 알약 아랫변 ← 카드 바닥 **+1.62 / +1.85** · 리본1 윗변 ← 카드 바닥 **−1.07 / −1.03**
  > 알약 높이 −0.20 · 피치 −0.51 · 사이 틈 −0.31 (= ±0.5 안 = 맞다)

⚑ **이 자는 «틈» 하나를 재는 자가 아니라 사다리 전체를 한 번에 재는 자다.**
   등재문이 손잡이 후보를 둘 남겨 뒀기 때문이다 —
     ⓐ 알약 더미를 통째로 내린다(`.pvl{top}`)  ⓑ 더미의 «아래 여백» 만 늘린다(높이·피치)
   ⓐ 는 10회차가 맞춰 둔 **«밴드 아랫변 ↔ 첫 알약 윗변» 21.70** 을 깨므로,
   **그 칸이 정말 맞는지부터** 재야 갈린다(338 규칙 — 처방 전에 재현).

자 규약 (885 브리핑 §2 · 923 과 같은 절차를 ref 와 우리에게 그대로):
  ⓐ **원점 = 카드 «바닥» 외곽선**. ⚠ 윗변 기준은 못 쓴다 — **ref 는 알약 4개, 우리는 3개**라
     «마지막 알약» 이 같은 서수가 아니어서 분해가 뒤집힌다(GZ·HA 독립 일치).
  ⓑ 모든 경계는 **부분화소 50% 교차**(선형 보간). 정수 마스크는 ref 쪽만 ×K 로 부푼다(895 교훈).
  ⓒ 가로창은 **알약 안쪽의 «빈 띠»** 하나뿐이다(card-local 100..118 우리px) —
     별(≤96.5)과 라벨 잉크(≥120) 사이. 창을 넓히면 흰 글자가 행 중앙값을 끌어올린다(923 6회차 «오염된 창»).
  ⓓ **리본 창은 검정 안에서 끝나야 한다(HA 경고)** — 검정 4px 을 넘어 빨강까지 2행만 침범해도
     ref 값이 3.0 ref px 움직여 Δ 부호가 뒤집힌다. 이 자는 창 끝 화소의 색을 **같이 찍고**,
     빨강(리본 몸통)에 닿으면 그 줄을 «⛔ 창 오염» 으로 표시한다.
  ⓔ 문턱 사다리 3단(±20%)을 같이 낸다. 부호가 뒤집히면 그 축은 «측정 한계» 다.

실행:
  python3 tools/probe966.py --ref                          레퍼런스(불릿형 = 둘째 카드)
  python3 tools/probe966.py --cap <png> --geo <json>       우리 캡처(cap151.js --geo 가 낸 기하)
  python3 tools/probe966.py --ref --cap <png> --geo <json> 둘 다 + Δ 표
  ... [--json] 노드 게이트가 읽는 통로   [--ladder] 문턱 ±20% 사다리
"""
import json
import sys

from pydep937 import np
from pydep937 import Image
from pydep937 import fail

REF = 'docs/ref/151-이용권-카드.png'
K = 2.0628                 # 우리 px = ref px × K (측정표 §9 · 923 과 같은 값)

# 가로창 — 카드-로컬 «우리 px». 별 실루엣은 card-local 96.5 에서 끝나고 라벨 잉크는 120 에서 시작한다
# (`.pvl{left:41}` + `.pvb>s{left:14.40,width:41.09}` · `.pvb>i{left:79}`).
WIN_L, WIN_R = 100.0, 118.0
# 밴드 아랫변 전용 가로창 — **제목 잉크를 피해야 한다**(`.pvt{left:38px}`).
# 위 알약 창(100..118)은 ref 에서 제목 잉크가 카드-로컬 70~114 까지 내려와 밴드 아랫변(111.3)을 밟는다.
BAND_L, BAND_R = 20.0, 36.0
BG_T = 40.0                # 카드 «바깥 바탕» 판정 문턱(|Δ바탕|₁)


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def cross(prof, y0, t, down):
    """prof = 행 밝기 배열(index 0 이 y0). 문턱 t 를 처음 넘는 자리를 부분화소로.

    down=True  → 값이 t «아래로» 내려가는 첫 자리 · down=False → «위로» 올라가는 첫 자리.
    반환은 923 `gap_pill_ribbon()` 과 같은 규약(경계 = 두 화소 중심 사이 + 0.5).
    """
    for i in range(len(prof) - 1):
        a, b = prof[i], prof[i + 1]
        if (down and a > t >= b) or ((not down) and a < t <= b):
            return y0 + i + (t - a) / (b - a) + 0.5
    return None


def ladder(a, cl, cr, ctop, cbot, s, label, quiet=False):
    """카드 하나의 세로 사다리. [cl,cr] = 카드 좌·우 외곽(이미지 px) · ctop/cbot = 상·하 외곽(부분화소).

    s = 이미지 px ÷ 우리 px (ref 는 1/K · 우리 캡처는 1.0). 반환값의 길이는 전부 **우리 px** 다.
    """
    x0 = int(round(cl + WIN_L * s))
    x1 = int(round(cl + WIN_R * s)) + 1
    y0, y1 = int(ctop), int(cbot) + 1
    L = lum(a)
    prof = np.array([float(np.median(L[y, x0:x1])) for y in range(y0, y1)])
    if len(prof) < 40:
        fail(f'{label}: 창이 너무 짧다({len(prof)}행)', '카드 상자를 다시 잡아라')

    # ── 세 고원의 대표값 ─────────────────────────────────────────────
    # 몸통(카드 채움)은 최댓값 쪽, 알약 채움은 그 아래 고원, 검정은 바닥.
    body = float(np.percentile(prof, 92))
    dark = float(prof.min())
    # 알약 채움 = «몸통도 검정도 아닌» 화소의 중앙값(알약이 화면의 큰 몫이다)
    mid = prof[(prof < (body + dark) / 2 + (body - dark) * 0.18) & (prof > dark + (body - dark) * 0.18)]
    fillv = float(np.median(mid)) if len(mid) else (body + dark) / 2
    t_pill = (fillv + body) / 2          # 알약 ↔ 몸통
    t_blk = body / 2                     # 몸통 ↔ 검정 테

    # ── 알약 띠 찾기(정수 → 그 다음 부분화소) ───────────────────────
    below = prof < t_pill
    bands, st = [], None
    for i, v in enumerate(below):
        if v and st is None:
            st = i
        elif not v and st is not None:
            if i - st >= 4:
                bands.append((st, i - 1))
            st = None
    if st is not None and len(below) - st >= 4:
        bands.append((st, len(below) - 1))
    # 검정 테(카드 상·하 외곽·리본)도 t_pill 아래다 — 그 안이 «검정» 인 띠는 알약이 아니다.
    pills = [(s0, s1) for s0, s1 in bands if float(prof[s0:s1 + 1].min()) > (dark + fillv) / 2]

    out = {'label': label, 'pills': [], 'card_bottom_img': cbot, 'card_top_img': ctop,
           'x_win': [x0, x1], 'levels': {'body': body, 'fill': fillv, 'dark': dark}}
    for s0, s1 in pills:
        top = cross(prof[max(0, s0 - 6):s0 + 3], y0 + max(0, s0 - 6), t_pill, down=True)
        bot = cross(prof[s1 - 2:s1 + 7], y0 + s1 - 2, t_pill, down=False)
        if top is None or bot is None:
            continue
        out['pills'].append({'top_img': top, 'bot_img': bot,
                             'top': (cbot - top) / s, 'bot': (cbot - bot) / s,
                             'h': (bot - top) / s})

    # ── 헤더 밴드 아랫변 (밴드색 → 몸통색) ───────────────────────────
    #   ⚠ 제목 잉크를 피해 **왼쪽 빈 띠**에서 잰다(위 BAND_L/BAND_R 주석).
    #   ⚠ «첫 교차» 가 아니라 **알약1 바로 위의 마지막 교차**를 쓴다 — 위쪽에는 밴드 안 장식이 더 있다.
    band_bot = None
    if out['pills']:
        bx0 = int(round(cl + BAND_L * s))
        bx1 = int(round(cl + BAND_R * s)) + 1
        bprof = np.array([float(np.median(L[y, bx0:bx1])) for y in range(y0, y1)])
        p0 = int(out['pills'][0]['top_img']) - y0
        bandv = float(np.median(bprof[max(0, p0 - int(60 * s)):max(1, p0 - int(25 * s))]))
        t_band = (bandv + body) / 2
        last = None
        for i in range(p0):
            if bprof[i] < t_band:
                last = i
        if last is not None and last + 1 < len(bprof):
            band_bot = cross(bprof[last:p0 + 1], y0 + last, t_band, down=False)
        out['band_level'] = bandv
        out['band_x_win'] = [bx0, bx1 - 1]
    out['band_bot'] = (cbot - band_bot) / s if band_bot is not None else None
    out['band_bot_img'] = band_bot

    # ── 리본1 윗변 (몸통 → 검정) + ⓓ 창 오염 검사 ────────────────────
    rb_top, rb_bad = None, None
    if out['pills']:
        pb = int(out['pills'][-1]['bot_img']) - y0 + 2
        seg = prof[pb:]
        rb_top = cross(seg, y0 + pb, t_blk, down=True)
        if rb_top is not None:
            # 창 끝 = 교차점 뒤 4 이미지-px(검정 테 두께 10 우리px ≈ ref 4.8) — 그 안이 정말 검정인가.
            e = int(rb_top) + max(2, int(round(4 * s)))
            e = min(e, y1 - 1)
            px = a[e, (x0 + x1) // 2].tolist()
            rb_bad = bool(max(px) > 90)      # 빨강 리본 몸통(255,86,93)에 닿았다
            out['rb_end_px'] = px
            out['rb_end_y'] = e
            out['rb_window_ok'] = not rb_bad
    out['rb_top'] = (cbot - rb_top) / s if rb_top is not None else None
    out['rb_top_img'] = rb_top

    if out['pills'] and rb_top is not None:
        out['gap'] = (rb_top - out['pills'][-1]['bot_img']) / s
    if len(out['pills']) >= 2:
        out['pitch'] = float(np.median([out['pills'][i]['top_img'] - out['pills'][i + 1]['top_img']
                                        for i in range(len(out['pills']) - 1)])) / s * -1
        out['inter'] = float(np.median([out['pills'][i + 1]['top_img'] - out['pills'][i]['bot_img']
                                        for i in range(len(out['pills']) - 1)])) / s
        out['ph'] = float(np.median([p['h'] for p in out['pills']]))
    if out['pills'] and band_bot is not None:
        out['band_to_p1'] = (out['pills'][0]['top_img'] - band_bot) / s

    # ── 아래쪽 사다리 전체 — 리본 두 장의 검정 테 교차를 차례로 ──────────
    #   ⚑ 원점(카드 바닥)이 두 그림에서 같은 자리를 가리키는지를 **여기가 검산한다**:
    #     리본1·2 는 CSS 가 `bottom:` 으로 바닥에 매달아 놓은 부품이라(`.rb1{bottom:196}`·`.rb2{bottom:62}`)
    #     원점이 맞으면 ref 값도 그 선언값 근처여야 한다. 안 맞으면 **원점이 틀린 것**이다.
    if out['pills']:
        pb = int(out['pills'][-1]['bot_img']) - y0 + 2
        seg, base, rungs, i = prof[pb:], y0 + pb, [], 0
        want_down = True
        while i < len(seg) - 1:
            c = cross(seg[i:], base + i, t_blk, down=want_down)
            if c is None:
                break
            rungs.append((cbot - c) / s)
            i = int(c - base) + 1
            want_down = not want_down
        out['rungs'] = rungs
        # ⚑ 969 — **이름표가 틀려 있었다(자 부패).** 사다리 한 칸은 «리본 한 장» 이 아니라 «검정 교차
        #   한 번» 이고 리본 한 장은 네 칸(바깥 윗변 · 안쪽 윗변 · 안쪽 아랫변 · 바깥 아랫변)을 낸다.
        #   옛 표는 rungs[0..4] 에 rb1_top·rb1_bot·rb2_top·rb2_bot·card_bot_in 을 그대로 얹어 ref 의
        #   «리본1 안쪽 윗변 264.33» 을 «리본1 아랫변» 으로, «리본1 바깥 아랫변 195.88» 을 «리본2 아랫변»
        #   으로 불렀고, 그 이름으로 Δ 표가 «리본2 윗변 +45.59» 같은 헛값을 찍었다(966 §2-1 은 raw rungs 를
        #   손으로 읽었기에 옳았다 — 사람이 표를 안 믿어서 안 속은 자리다).
        # ⇒ 사다리가 «리본 두 장» 모양일 때만 이름을 붙인다: 여덟 칸이 내림차순이고 테 두께(바깥→안쪽)가
        #   4..14 우리px. 우리 캡처는 창에 라벨·판 잉크가 끼어들어 21 칸이 나오므로 모양이 깨져 이름이
        #   안 붙고 `rungs` 만 남는다 — 그 짝짓기는 DOM 자리를 아는 게이트가 한다(`verify969.js` pickRung()).
        names = ['rb1_top', 'rb1_in_top', 'rb1_in_bot', 'rb1_bot',
                 'rb2_top', 'rb2_in_top', 'rb2_in_bot', 'rb2_bot']
        shaped = (len(rungs) >= 8
                  and all(rungs[i] > rungs[i + 1] for i in range(7))
                  and all(4.0 <= rungs[i] - rungs[i + 1] <= 14.0 for i in (0, 2, 4, 6)))
        out['rungs_shaped'] = shaped
        if shaped:
            for n, key in enumerate(names):
                out[key] = rungs[n]
            out['rb1_h'] = rungs[0] - rungs[3]
            out['rb2_h'] = rungs[4] - rungs[7]
            if len(rungs) > 8:
                out['card_bot_in'] = rungs[8]

    # ── 카드 «바닥 검정 테» 두께 — 원점 편향을 눈에 보이게 하는 곁축 ─────
    #   윗쪽 축은 전부 «바닥 **외곽**선» 이 원점인데(GZ·HA 규약) ref 는 화소, 우리는 DOM 상자에서 온다.
    #   두 원점이 같은 자리를 가리키는지는 **테 두께**가 말해 준다(선언 10 우리px).
    last_up = None
    for i in range(len(prof) - 1):
        if prof[i] > t_blk >= prof[i + 1]:
            last_up = i
    if last_up is not None:
        cin = cross(prof[last_up:], y0 + last_up, t_blk, down=True)
        if cin is not None:
            out['bot_border'] = (cbot - cin) / s
            out['card_bot_inner_img'] = cin

    if not quiet:
        print(f'== {label}   가로창 x {x0}..{x1 - 1}  '
              f'[몸통 {body:.0f} · 알약 {fillv:.0f} · 검정 {dark:.0f}]  알약 {len(out["pills"])}개')
        print(f'   카드 외곽 top {ctop:.2f} · bottom {cbot:.2f} (이미지px)')
        for i, p in enumerate(out['pills']):
            print(f'   알약{i + 1}: 윗변 {p["top_img"]:.2f} · 아랫변 {p["bot_img"]:.2f} (이미지px) → '
                  f'카드바닥에서 {p["top"]:.2f} / {p["bot"]:.2f} · 높이 {p["h"]:.2f} (우리px)')
        if band_bot is not None:
            print(f'   밴드 아랫변 {band_bot:.2f}(이미지px) → 카드바닥에서 {out["band_bot"]:.2f} · '
                  f'밴드↔첫알약 **{out["band_to_p1"]:.2f}**')
        if rb_top is not None:
            mark = '✅ 검정 안' if not rb_bad else '⛔ 창 오염(빨강까지 갔다)'
            print(f'   리본1 윗변 {rb_top:.2f}(이미지px) → 카드바닥에서 **{out["rb_top"]:.2f}** · '
                  f'창끝 y={out["rb_end_y"]} 화소 {out["rb_end_px"]} {mark}')
        if 'gap' in out:
            print(f'   >>> 마지막 알약 아랫변 카드바닥에서 **{out["pills"][-1]["bot"]:.2f}** · '
                  f'틈 **{out["gap"]:.2f} 우리px**')
        if 'pitch' in out:
            print(f'   >>> 알약 높이 {out["ph"]:.2f} · 피치 {out["pitch"]:.2f} · 사이틈 {out["inter"]:.2f}')
        if 'bot_border' in out:
            print(f'   >>> 바닥 검정 테 두께 {out["bot_border"]:.2f} 우리px (선언 10 — 원점 검산)')
        if out.get('rungs'):
            print('   >>> 아래 사다리(카드바닥에서 · 우리px): ' +
                  ' · '.join(f'{v:.2f}' for v in out['rungs']) +
                  '   [선언 rb1 272/196 · rb2 138/62]')
    return out


def ref_card(t=BG_T):
    a = np.asarray(Image.open(REF).convert('RGB')).astype(int)
    H, W, _ = a.shape
    bg = np.array(a[2, W - 3].tolist())
    d = np.abs(a - bg).sum(2)
    rows = [y for y in range(H) if (d[y] > t).sum() > W * 0.40]
    # 두 카드 — 둘째(초록 = 불릿형)가 이 작업의 대상이다.
    runs, st, pv = [], None, None
    for y in rows:
        if st is None:
            st = y
        elif y != pv + 1:
            runs.append((st, pv)); st = y
        pv = y
    if st is not None:
        runs.append((st, pv))
    runs = [r for r in runs if r[1] - r[0] >= 20]
    if len(runs) < 2:
        fail(f'ref 카드 띠를 못 찾았다({runs})', '문턱 --t 를 바꿔 보라')
    y0, y1 = runs[1]
    mid = (y0 + y1) // 2
    xs = [x for x in range(W) if d[mid, x] > t]
    cl, cr = xs[0], xs[-1]
    # 상·하 외곽선은 «바탕 → 카드» 부분화소 교차로(정수 마스크를 안 쓴다 — ⓑ)
    col = d[:, (cl + cr) // 2].astype(float)
    top = cross(col[max(0, y0 - 12):y0 + 12], max(0, y0 - 12), t, down=False)
    bot = cross(col[y1 - 12:min(H, y1 + 12)], y1 - 12, t, down=True)
    if top is None or bot is None:
        fail('ref 카드 상·하 외곽선을 못 찾았다', '문턱 --t 를 바꿔 보라')
    return a, cl, cr, top, bot


def cap_card(png, geo):
    a = np.asarray(Image.open(png).convert('RGB')).astype(int)
    g = json.load(open(geo))
    # 불릿형 = `.pvc` 에 `ban1` 이 **없는** 카드(형을 정하는 것은 CSS 클래스다 — 901 규약)
    cs = [c for c in g['cards'] if 'ban1' not in c.get('cls', []) and c.get('lines')]
    if not cs:
        fail('캡처에 불릿형 카드가 없다', 'node tools/cap151.js <png> --geo 로 다시 찍어라')
    return a, cs, g


def dom_ladder(c):
    """DOM 진실값(우리 캡처 전용) — 화소 절차가 옳은지 대는 자."""
    cb = c['y'] + c['h']
    ls = c['lines']
    o = {'pills': [{'top': cb - l['y'], 'bot': cb - (l['y'] + l['h']), 'h': l['h']} for l in ls]}
    o['rb_top'] = cb - c['rb1']['y']
    o['gap'] = c['rb1']['y'] - (ls[-1]['y'] + ls[-1]['h'])
    o['ph'] = ls[0]['h']
    o['pitch'] = ls[1]['y'] - ls[0]['y'] if len(ls) > 1 else None
    o['inter'] = ls[1]['y'] - (ls[0]['y'] + ls[0]['h']) if len(ls) > 1 else None
    return o


AXES = [('gap', '알약↔리본1 틈'), ('last_bot', '마지막 알약 아랫변 ←카드바닥'),
        ('rb_top', '리본1 윗변 ←카드바닥'), ('ph', '알약 높이'),
        ('pitch', '알약 피치'), ('inter', '알약 사이 틈'), ('band_to_p1', '밴드↔첫 알약'),
        ('rb1_bot', '리본1 아랫변 ←카드바닥'), ('rb1_h', '리본1 띠 높이'),
        ('rb2_top', '리본2 윗변 ←카드바닥'), ('rb2_bot', '리본2 아랫변 ←카드바닥'),
        ('rb2_h', '리본2 띠 높이'), ('bot_border', '바닥 검정 테 두께')]
# ⚠ 969 — 이 여섯 축은 «사다리가 리본 두 장 모양일 때만» 이름이 붙는다(위 `rungs_shaped`).
#   우리 캡처는 모양이 깨지므로 Δ 표에서 그 줄이 **안 찍히는 것이 정상**이다(옛 표는 그 자리에
#   엉뚱한 칸을 짝지어 «리본2 윗변 +45.59» 를 찍었다). 우리 쪽 리본 높이는 `verify969.js` 가 잰다.


def pick(o):
    v = dict(o)
    if o.get('pills'):
        v['last_bot'] = o['pills'][-1]['bot']
    return v


if __name__ == '__main__':
    t = float(sys.argv[sys.argv.index('--t') + 1]) if '--t' in sys.argv else BG_T
    steps = [0.8, 1.0, 1.2] if '--ladder' in sys.argv else [1.0]
    res = {}
    for f in steps:
        tag = '' if f == 1.0 else f'  [문턱 ×{f:.1f}]'
        R = C = None
        if '--ref' in sys.argv:
            a, cl, cr, ct, cb = ref_card(t * f)
            R = ladder(a, cl, cr, ct, cb, 1.0 / K, f'ref 불릿형{tag}')
        if '--cap' in sys.argv:
            png = sys.argv[sys.argv.index('--cap') + 1]
            geo = sys.argv[sys.argv.index('--geo') + 1]
            a, cs, g = cap_card(png, geo)
            cs = [c for c in cs if c['y'] >= 0 and c['y'] + c['h'] <= a.shape[0]]
            if not cs:
                fail('불릿형 카드가 프레임 안에 온전히 안 들어왔다',
                     'cap151.js --crop 이 낸 카드별 크롭을 쓰거나 스크롤 위치를 바꿔라')
            Cfirst = None
            for i, c in enumerate(cs):
                C = ladder(a, c['x'], c['x'] + c['w'] - 1, c['y'], c['y'] + c['h'], 1.0,
                           f'cap {c["id"]}{tag}')
                d = dom_ladder(c)
                dv, cv = pick(d), pick(C)
                print(f'   -- DOM 대조({c["id"]}): ' + ' · '.join(
                    f'{n} {dv.get(k):.2f}↔{cv.get(k):.2f}' if isinstance(dv.get(k), (int, float))
                    and isinstance(cv.get(k), (int, float)) else f'{n} —'
                    for k, n in AXES if k != 'band_to_p1'))
                if i == 0:
                    C['dom'] = d
                    Cfirst = C
            C = Cfirst
        if R and C:
            rv, cv = pick(R), pick(C)
            print(f'\n== Δ 표 (우리 − ref · 우리px){tag}')
            print('   축                              ref      우리       Δ')
            for k, n in AXES:
                if isinstance(rv.get(k), (int, float)) and isinstance(cv.get(k), (int, float)):
                    print(f'   {n:<26} {rv[k]:8.2f} {cv[k]:9.2f} {cv[k] - rv[k]:+8.2f}')
            res[f'x{f:.1f}'] = {'ref': rv, 'cap': cv,
                               'delta': {k: cv[k] - rv[k] for k, _ in AXES
                                         if isinstance(rv.get(k), (int, float))
                                         and isinstance(cv.get(k), (int, float))}}
        elif R:
            res[f'x{f:.1f}'] = {'ref': pick(R)}
        elif C:
            res[f'x{f:.1f}'] = {'cap': pick(C), 'dom': pick(C.get('dom', {}))}
    if '--json' in sys.argv:
        def clean(v):
            if isinstance(v, dict):
                return {a: clean(b) for a, b in v.items()}
            if isinstance(v, (list, tuple)):
                return [clean(x) for x in v]
            if isinstance(v, float) and not np.isfinite(v):
                return None
            return v
        print('@@JSON@@' + json.dumps(clean(res), ensure_ascii=False))
    if not res:
        print(__doc__)
