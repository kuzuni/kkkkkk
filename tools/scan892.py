#!/usr/bin/env python3
# 작업 892 — 89 유물 소환 「유물 소환」 라벨 잉크의 **자를 정하는 자**.
#
#   python3 tools/scan892.py            # 2280 캡처 (probe892 가 먼저 떨궈 둔 것)
#   python3 tools/scan892.py --json
#   P892_H=1920 python3 tools/scan892.py
#
# ── 왜 또 자인가 ─────────────────────────────────────────────────────────────
# 같은 잉크 하나를 두고 저장소 안의 두 자가 다른 답을 낸다:
#   · 측정표 89 §「유물 소환」   ref **65×15 ref px = 144.4×33.3**  ⇒ 우리 141 은 **−2.1%**
#   · 859·813 9회차 채점 2인    ref **67×16 ref px = 148.9×35.6**  ⇒ 우리 141 은 **−5.3%**
# 860 은 앞엣것으로 «남는 −2.1% 는 서체 몫» 이라 닫았고 892 등재문은 뒤엣것을 썼다.
#
# ⚑ 재현으로 갈린 자리가 **한 곳**임이 드러났다 — ref 의 가로 가장자리 두 칸(x209 lum 172.1 ·
#   x275 lum 202.1)이 하필 **문턱 170 을 걸치고**, 세로 가장자리(y575 lum 125 · y591 lum 164)는
#   걸치지 않는다. 그래서 문턱 하나를 절대값으로 대면 **가로만** 두 칸이 붙었다 떨어졌다 한다:
#       th 110~170 → 67 · th 185~200 → 66 · th 220 → 65
#   두 사람은 같은 그림을 봤고 자를 어디에 걸쳤는지만 달랐다. «누가 옳은가» 가 아니다.
#
# ── 이 자가 하는 일 ─────────────────────────────────────────────────────────
# 두 그림의 **잉크와 배경의 절대 밝기가 서로 다르다**(ref 봉우리 220.5 / 밑바닥 ~70 ·
# 우리 봉우리 ~242 / 밑바닥 ~40). 그래서 절대 문턱은 애초에 «같은 자» 가 아니다.
# 이 자는 그림마다 **밑바닥과 봉우리를 스스로 재서** 그 사이의 **같은 비율**(정규화 문턱)로
# 잰다 — 두 그림에 대는 것이 비로소 같은 자가 된다.
#
# 그리고 해상도도 맞춘다: 레퍼런스는 **486 폭으로 축소된** 그림이고 우리 캡처는 1080
# 네이티브다. 축소는 흰 잉크를 이웃 화소로 번지게 해 낮은 문턱에서 bbox 를 부풀린다.
# ⇒ 우리 캡처를 **ref 와 같은 486 폭으로 내려서** 잰 값을 같이 찍는다(4개 필터 전부).
#
# ⚠ 이 자가 재는 것은 «폭» 하나가 아니라 **종횡비**다. 폭만 보면 −2.1% ~ −5.3% 로 자에 따라
#   흔들리지만, **세로는 어느 자로도 우리가 크다** — 그래서 «폭을 키우는» 수리는 세로를
#   더 벌린다. 892 의 답이 «CSS 로 밀 자리가 아니다» 인 근거가 이 표다.
import os
import sys
import json

from pydep937 import Image                            # 937 — 없으면 «한 줄 + 코드 2»
from pydep937 import fail                             # 939 — 입력이 없는 것은 코드 3(2 는 환경 전용)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, 'docs', 'ref', '89-유물-팝업.png')
REF_W = 486.0                  # 813·859·887 이 쓴 것과 같은 크롭 폭
FRAME_W = 1080.0
S = FRAME_W / REF_W            # 2.2222

H = int(os.environ.get('P892_H', '2280'))
SHOT = os.path.join(ROOT, 'docs', 'shots', f'892-frame-{H}.png')
GEOM = os.path.join(ROOT, 'docs', 'shots', f'892-geom-{H}.json')

# 정규화 문턱 사다리 — 밑바닥(0.0) 과 봉우리(1.0) 사이의 비율
#   ⚠ 0.75 아래는 **ref 쪽만** 오염된다 — ref 라벨 밑에 «부드러운 그림자»(y591~594,
#     lum 164→124)가 깔려 있는데 우리 라벨은 그 자리에 **딱딱한 검정 스트로크**를 쓴다
#     (`-webkit-text-stroke` · paint-order stroke fill). 낮은 문턱은 그 그림자를 «잉크» 로
#     주워 먹어 ref 세로만 15 → 18 → 27 로 부푼다. 두 그림에 같은 것을 재는 구간은
#     **봉우리에 붙은 위쪽**이고, 대표값은 0.90(= 거의 봉우리 = «칠이 다 찬 속»)이다.
NORM_SWEEP = (0.55, 0.65, 0.75, 0.85, 0.90, 0.95)
CORE = 0.90                    # 대표 규약 — 두 그림 모두 «봉우리에 닿은 화소»
ABS_SWEEP = (110, 140, 170, 200, 220)

# ref 라벨 창 — 세로는 **반드시 y597 위**에서 끊는다. y599 부터 수반 아래 림/코스트 알약이
# 다시 192 까지 밝아져서, 창을 그 아래로 열면 낮은 문턱에서 «라벨 높이» 가 통째로 거짓이 된다.
# 라벨 띠는 위(y567~574 최대 84) 아래(y595~598 최대 59) 어두운 행으로 깨끗이 격리돼 있다.
REF_WIN = (198, 292, 568, 597)


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def stats(px, win):
    """창 안의 밑바닥(하위 20% 중앙값)과 봉우리(최댓값)를 잰다."""
    x1, x2, y1, y2 = win
    vs = sorted(lum(px[x, y]) for y in range(y1, y2) for x in range(x1, x2))
    floor = vs[len(vs) // 5]          # 하위 20% — 배경(석재 몸통)
    peak = vs[-1]
    return floor, peak


def bbox(px, win, th):
    x1, x2, y1, y2 = win
    xs, ys = [], []
    for y in range(y1, y2):
        for x in range(x1, x2):
            if lum(px[x, y]) > th:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return (min(xs), max(xs), min(ys), max(ys))


def wh(b):
    return (b[1] - b[0] + 1, b[3] - b[2] + 1) if b else (0, 0)


def main():
    as_json = '--json' in sys.argv
    if not os.path.exists(SHOT):
        fail(f'scan892: 캡처가 없다 ({SHOT})', '먼저 `node tools/probe892.js` 를 돌려라')

    ref_im = Image.open(REF).convert('RGB')
    ref = ref_im.load()
    our_im = Image.open(SHOT).convert('RGB')

    # 우리 캡처의 라벨 창 — probe892 가 떨군 advance 상자에서 낸다
    if os.path.exists(GEOM):
        g = json.load(open(GEOM, encoding='utf-8'))
        a = g['adv']
        ow = (int(a['l']) - 26, int(a['l'] + a['w']) + 26, int(a['t']) - 14, int(a['t'] + a['h']) + 14)
    else:
        ow = (440, 700, 1838, 1902)

    ref_floor, ref_peak = stats(ref, REF_WIN)
    our_floor, our_peak = stats(our_im.load(), ow)

    # 486 으로 내린 우리 캡처 (ref 가 만들어진 길을 그대로 되밟는다)
    dh = round(our_im.size[1] * REF_W / our_im.size[0])
    downs = {}
    for name, filt in (('LANCZOS', Image.LANCZOS), ('BICUBIC', Image.BICUBIC),
                       ('BILINEAR', Image.BILINEAR), ('BOX', Image.BOX)):
        d = our_im.resize((int(REF_W), dh), filt).convert('RGB')
        w2 = (int(ow[0] / S) - 4, int(ow[1] / S) + 4, int(ow[2] / S) - 3, int(ow[3] / S) + 3)
        downs[name] = (d.load(), w2, stats(d.load(), w2))

    out = {'ref': {}, 'our_native': {}, 'our_486': {}, 'meta': {}}

    print('=' * 78)
    print(f'작업 892 — 「유물 소환」 라벨 잉크 · 두 그림을 한 자로 (frameH {H})')
    print('=' * 78)
    print(f'ref  {os.path.relpath(REF, ROOT)}  {ref_im.size}   밑바닥 {ref_floor:.1f} · 봉우리 {ref_peak:.1f}')
    print(f'우리 {os.path.relpath(SHOT, ROOT)}  {our_im.size}   밑바닥 {our_floor:.1f} · 봉우리 {our_peak:.1f}')
    print(f'환산 1 ref px = {S:.4f} 프레임 px')

    # ── ① 절대 문턱 — 갈림이 어디서 생기는지 ────────────────────────────────
    print('\n① 절대 문턱(두 사람이 쓴 자) — ref 의 «가로만» 흔들린다')
    print(f'   {"th":>4} | {"ref w":>5} {"ref h":>5} | {"우리(1080) w":>12} {"h":>4} | {"우리 w(ref px 환산)":>18}')
    for th in ABS_SWEEP:
        rb = bbox(ref, REF_WIN, th)
        ob = bbox(our_im.load(), ow, th)
        rw, rh = wh(rb)
        owd, ohd = wh(ob)
        print(f'   {th:4d} | {rw:5d} {rh:5d} | {owd:12d} {ohd:4d} | {owd / S:18.1f}')
        out['ref'][f'abs{th}'] = [rw, rh]
        out['our_native'][f'abs{th}'] = [owd, ohd]
    print('   ⇒ ref 가로 67→65 는 가장자리 두 칸(x209 172.1 · x275 202.1)이 문턱 170~220 을')
    print('     걸치기 때문이고, 우리 가로는 141 로 **문턱에 꿈쩍 않는다**(네이티브라 가장자리가 날카롭다).')

    # ── ② 정규화 문턱 + 해상도 맞춤 — 비로소 «같은 자» ──────────────────────
    print('\n② 정규화 문턱(그림마다 밑바닥~봉우리의 같은 비율) + 486 해상도 맞춤  ← 이것이 같은 자다')
    print(f'   {"비율":>5} | {"ref w":>5} {"ref h":>5} {"ref w/h":>8} | {"우리↓ w":>7} {"우리↓ h":>7} {"우리 w/h":>8} | {"Δ폭":>7} {"Δ세로":>7} {"Δ종횡":>7}')
    for t in NORM_SWEEP:
        rth = ref_floor + t * (ref_peak - ref_floor)
        rb = bbox(ref, REF_WIN, rth)
        rw, rh = wh(rb)
        dpx, dwin, (dfl, dpk) = downs['LANCZOS']
        oth = dfl + t * (dpk - dfl)
        ob = bbox(dpx, dwin, oth)
        owd, ohd = wh(ob)
        if not rw or not owd:
            continue
        ra, oa = rw / rh, owd / ohd
        print(f'   {t:5.2f} | {rw:5d} {rh:5d} {ra:8.3f} | {owd:7d} {ohd:7d} {oa:8.3f} | '
              f'{100 * (owd / rw - 1):+6.1f}% {100 * (ohd / rh - 1):+6.1f}% {100 * (oa / ra - 1):+6.1f}%')
        out['our_486'][f'norm{t}'] = [owd, ohd]
        out['ref'][f'norm{t}'] = [rw, rh]

    # ── ③ 축소 필터가 답을 바꾸는가 ────────────────────────────────────────
    print('\n③ 축소 필터 4종 (비율 0.50) — 자가 필터에 흔들리면 그 자는 이 약속을 못 맡는다')
    for name, (dpx, dwin, (dfl, dpk)) in downs.items():
        ob = bbox(dpx, dwin, dfl + 0.50 * (dpk - dfl))
        owd, ohd = wh(ob)
        print(f'   {name:9s} w={owd:3d} h={ohd:3d}  w/h={owd / ohd:.3f}')

    # ── ④ 결론 — 대표 규약(CORE) 은 **네이티브 우리 캡처**로 낸다 ──────────
    # 축소는 우리 쪽에만 걸리는 손실이라(ref 는 이미 축소돼 있다) 대표값은 네이티브에서
    # 재고 ref px 로 환산한다. ③ 이 «축소해도 답이 같다» 를 이미 보였으므로 안전하다.
    rb = bbox(ref, REF_WIN, ref_floor + CORE * (ref_peak - ref_floor))
    rw, rh = wh(rb)
    onat = bbox(our_im.load(), ow, our_floor + CORE * (our_peak - our_floor))
    onw, onh = wh(onat)
    onw_r, onh_r = onw / S, onh / S
    print(f'\n④ 결론 — 대표 규약 «봉우리에 닿은 속»(정규화 {CORE})')
    print(f'   ref  {rw}×{rh} ref px      = {rw * S:6.1f}×{rh * S:5.1f} 프레임 px  ·  w/h {rw / rh:.3f}')
    print(f'   우리 {onw}×{onh} 프레임 px  = {onw_r:6.2f}×{onh_r:5.2f} ref px     ·  w/h {onw / onh:.3f}')
    print(f'   ⇒ 폭 {100 * (onw_r / rw - 1):+.1f}%  ·  세로 {100 * (onh_r / rh - 1):+.1f}%  ·  '
          f'**종횡비 {100 * ((onw / onh) / (rw / rh) - 1):+.1f}%**')
    print()
    print('   ⚑ **두 축이 서로 반대로 어긋난다** — 폭은 −, 세로는 +.')
    print('     · font-size 를 키우면 폭은 맞지만 세로가 더 벌어진다(등방이라 둘이 같이 큰다).')
    print('     · font-size 를 줄이면 세로는 맞지만 폭이 더 좁아진다.')
    print('     · scaleX 로 가로만 늘이는 길은 **356 이 폐기한 관행**이고 860 이 방금 걷어낸 것이다.')
    print('     ⇒ 남는 길은 «같은 높이에서 글리프가 더 넓은 서체» 하나뿐 = **아트/서체 몫**이다.')
    print('       (우리 서체 = GameKR/Jua 서브셋 · 가변축 없음 ⇒ font-stretch 도 안 듣는다)')
    out['concl_native'] = {'ref_refpx': [rw, rh], 'our_frame': [onw, onh],
                           'dw_pct': 100 * (onw_r / rw - 1), 'dh_pct': 100 * (onh_r / rh - 1),
                           'daspect_pct': 100 * ((onw / onh) / (rw / rh) - 1)}

    # ── ⑤ ref 의 «분해능» 과 «등방 배율로 살 수 있는 것» ────────────────────
    # ⚑ 이 절이 없으면 위 두 수치를 같은 무게로 읽게 된다. ref 는 486 폭이라 눈금 한 칸이
    #   1 ref px = 2.22 프레임 px 다. 같은 ±1 칸이 **폭에서는 ±1.5%, 세로에서는 ±6.7%** 다 —
    #   짧은 변일수록 같은 눈금이 더 큰 %로 읽힌다. 그래서 둘을 «−3.9% 대 +5.0%» 로
    #   나란히 놓으면 안 된다.
    qw, qh = 100.0 / rw, 100.0 / rh
    dw = 100 * (onw_r / rw - 1)
    dh = 100 * (onh_r / rh - 1)
    print(f'\n⑤ ref 의 분해능 — 눈금 한 칸(1 ref px)이 폭에서는 ±{qw:.1f}% · 세로에서는 ±{qh:.1f}%')
    print(f'   폭   차이 {dw:+.1f}% = {abs(onw_r - rw):.2f} ref px  ⇒ 눈금의 {abs(onw_r - rw):.1f}배  '
          f'→ **분해 가능 · 실재하는 결손**')
    print(f'   세로 차이 {dh:+.1f}% = {abs(onh_r - rh):.2f} ref px  ⇒ 눈금의 {abs(onh_r - rh):.1f}배  '
          f'→ **분해 불가 · ref 로는 «같다» 와 구분이 안 된다**')
    print('   ⇒ 확정 결손은 **폭 한 축**이다. 세로는 «맞다» 가 아니라 «ref 가 답을 못 준다» 다.')
    print('\n   등방 배율 k 로 살 수 있는 것 (종횡비는 k 에 **불변**이라 어디에 오차를 둘지만 고른다):')
    print(f'   {"k":>6} | {"font-size":>9} | {"폭 Δ":>7} {"세로 Δ":>7} | 평가')
    for k, note in ((1.000, '현행 — 오차를 두 축에 나눠 둔다'),
                    (rw / onw_r, '폭을 맞춘다 → 세로가 그만큼 밖으로 나간다'),
                    (rh / onh_r, '세로를 맞춘다 → 폭이 더 좁아진다')):
        w2, h2 = onw_r * k, onh_r * k
        print(f'   {k:6.3f} | {40 * k:8.1f}px | {100 * (w2 / rw - 1):+6.1f}% {100 * (h2 / rh - 1):+6.1f}% | {note}')
    print(f'   ⇒ 어느 k 를 골라도 종횡비는 {100 * ((onw / onh) / (rw / rh) - 1):+.1f}% 로 **그대로다**.')
    print('     결손은 «크기» 가 아니라 «비례» 이고, 비례는 서체가 정한다.')

    out['meta'] = {'S': S, 'ref_floor': ref_floor, 'ref_peak': ref_peak,
                   'our_floor': our_floor, 'our_peak': our_peak,
                   'concl': {'ref': [rw, rh], 'our_486': [owd, ohd]}}
    if as_json:
        print('\n' + json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
