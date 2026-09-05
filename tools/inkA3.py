#!/usr/bin/env python3
"""작업 A3 상단 HUD — 텍스트·아이콘 «잉크 bbox» 스캐너 (레퍼런스 ↔ 캡처, 완전히 같은 마스크).

126 이 시스템 서체를 웹폰트 `GameKR` 로 갈아끼우면서 **같은 font-size 가 다른 잉크 크기**를 낸다
(작업 13 이 6회차에 −13~19% 축소를 잡아냈다). A3 는 1차 라운드(2026-08-24)에 옛 서체 기준으로
fs 를 맞춰 놓았으므로 웹폰트 교체 뒤의 실제 잉크를 다시 재야 한다.

각 항목에 대해 출력한다:
    ref(w×h) · cap(w×h) · Δ% · **fs 배수 = ref_h/cap_h** · **sx 배수 = (ref_w/cap_w)/(fs 배수)**

창은 측정표(docs/measure/A3-상단HUD.md)의 ref 잉크 bbox 에 ±pad 를 준 것이고,
레퍼런스·캡처에 **똑같은 창(캡처는 y−84)** 과 **똑같은 임계**를 쓴다.

실행: python3 tools/inkA3.py [캡처경로]      (기본 docs/review/A3-r6.png)
"""
import sys
from pydep937 import np
from pydep937 import Image

REF = 'docs/ref/02-기본-메인-화면.jpg'
CAP = sys.argv[1] if len(sys.argv) > 1 else 'docs/review/A3-r6.png'
DY = 84
PAD = 10

ref = np.asarray(Image.open(REF).convert('RGB')).astype(np.int16)
cap = np.asarray(Image.open(CAP).convert('RGB')).astype(np.int16)

WHITE = ('흰', lambda w: w.min(axis=2) >= 200)
LIME = ('연두', lambda w: (w[:, :, 1] >= 210) & (w[:, :, 2] < 175) & (w[:, :, 0] > 130))
WARM = ('주황', lambda w: (w[:, :, 0] >= 150) & (w[:, :, 1] <= 200) & (w[:, :, 2] <= 110))
YEL = ('노랑', lambda w: (w[:, :, 0] > 195) & (w[:, :, 1] > 140) & (w[:, :, 2] < 125))
BLUE = ('파랑', lambda w: (w[:, :, 2] > 185) & (w[:, :, 1] > 135) & (w[:, :, 0] < 135))

#  이름,                     ref 잉크 bbox(x,y,w,h) — 측정표 값,   마스크,  pad
ITEMS = [
    ('닉네임 U_178750…',      (201, 103, 169, 16), WHITE, 8),
    ('칭호/계급',             (230, 141,  73, 21), WHITE, 9),
    ('전투력 1.33B',          (200, 183,  84, 25), LIME,  10),
    ('전투력 🔥',             (153, 176,  36, 37), WARM,   8),
    ('골드 39.20A',           (639, 127, 118, 25), WHITE, 12),
    ('젬 1,300',              (911, 127,  87, 28), WHITE, 12),
    ('코인 아이콘',           (552, 108,  63, 63), YEL,    8),
    ('젬 아이콘',             (812, 108,  63, 63), BLUE,   8),
]


def bb(img, y0, y1, x0, x1, pred):
    y0 = max(0, y0); x0 = max(0, x0)
    y1 = min(img.shape[0], y1); x1 = min(img.shape[1], x1)
    if y1 <= y0 or x1 <= x0:
        return None
    m = pred(img[y0:y1, x0:x1])
    if not m.any():
        return None
    ys, xs = np.where(m)
    return (int(x0 + xs.min()), int(y0 + ys.min()),
            int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1))


print('캡처:', CAP)
print('%-20s %-12s %-12s %-16s %-8s %-8s %s'
      % ('요소', 'ref(w×h)', 'cap(w×h)', 'Δw% / Δh%', 'fs×', 'sx×', 'Δx/Δy'))
print('-' * 100)
mult = {}
for name, (x, y, w, h), (mn, pred), pad in ITEMS:
    br = bb(ref, y - pad, y + h + pad, x - pad, x + w + pad, pred)
    bc = bb(cap, y - pad - DY, y + h + pad - DY, x - pad, x + w + pad, pred)
    if br is None or bc is None:
        print('%-20s %-12s %-12s  창 밖(마스크 0)' % (name, br, bc))
        continue
    dw = (bc[2] - br[2]) / br[2] * 100
    dh = (bc[3] - br[3]) / br[3] * 100
    fs = br[3] / bc[3]
    sx = (br[2] / bc[2]) / fs
    mult[name] = (fs, sx)
    dx = bc[0] - br[0]
    dy = (bc[1] + DY) - br[1]
    flag = '  <<' if (abs(dw) >= 4 or abs(dh) >= 4 or abs(dx) >= 4 or abs(dy) >= 4) else ''
    print('%-20s %-12s %-12s %+6.1f / %+6.1f   %-8.4f %-8.4f %+d/%+d%s'
          % (name, '%dx%d' % (br[2], br[3]), '%dx%d' % (bc[2], bc[3]),
             dw, dh, fs, sx, dx, dy, flag))
print('-' * 100)
if mult:
    txt = [v[0] for k, v in mult.items() if '아이콘' not in k]
    if txt:
        print('텍스트 fs 배수 중앙값 %.4f  (min %.4f / max %.4f)'
              % (float(np.median(txt)), min(txt), max(txt)))

# ---------------------------------------------------------------------------
# 게이트 모드 — `python3 tools/inkA3.py <캡처> --gate`
#
# 2차 폴리시 라운드 6회차에 잡은 회귀를 **다시는 조용히 넘어가지 않게** 박는다:
# 작업 126 이 서체를 `GameKR` 로 갈아끼우자 A3 의 fs 값이 전부 옛 서체 기준이 되어
# **잉크 «높이» 만 +12~26% 로 넘쳤다**(폭은 맞아 있어서 폭만 보면 정상으로 보였다).
# 서체·이모지·SVG 자산 중 무엇이 바뀌어도 이 게이트가 먼저 빨개진다.
#
# 판정은 «ref 대비 몇 %» 로 한다. 허용치가 항목마다 다른 이유는 본문 주석에 적었다.
#   (name, 폭 허용%, 높이 허용%)
GATE = {
    '닉네임 U_178750…': (5, 8),
    '칭호/계급':        (6, 8),   # 폭 +4.2% 는 rankN 이 .ptitle 자신이라 안쪽 span 이 없어 미조치(7회차)
    '전투력 1.33B':     (5, 8),
    '전투력 🔥':        (8, 8),
    '골드 39.20A':      (5, 8),
    # 「1,300」: ref h28 = 숫자 25 + 쉼표 내림 3. GameKR 쉼표는 안 내려간다 → 높이만 느슨하게.
    # 이 항목을 fs 로 메우면 골드가 +12% 로 도로 넘친다(측정표 «서체 대기» 참고).
    '젬 1,300':         (6, 18),
    # 코인: 9회차에 HUD 한정으로 박스를 63 → 65.3 으로 키웠다. **여기 마스크와 비평가 마스크는
    # 서로 다른 것을 잰다** — 비평가들의 «채도/R−B» 마스크는 주황 림(#C97B1E)까지 «금색 원판» 으로
    # 세어 이제 ref 57 과 Δ0 이고, 이 파일의 '노랑'(R>195,G>140,B<125) 마스크는 G=120 인 주황 림을
    # 떨궈 **안쪽 밝은 코어만** 재므로 여전히 −7% 다. 둘 다 맞는 값이고 재는 대상이 다를 뿐이다.
    # 남은 7% 는 cur-gold.svg 의 주황 림(125 자산)이라 A3 가 못 없앤다 → 9%로 둔다
    # (9회차 전에는 −10.5% 였으니 이 상한은 그때로 되돌아가는 것도 잡는다).
    '코인 아이콘':      (9, 9),
    '젬 아이콘':        (8, 13),
}
# 238 — 게이트의 **0번 관문: 이 캡처가 폭을 잴 수 있는 캡처인가.**
# 잉크 «폭» 은 글자 수가 같을 때만 비교된다. 실제 게임은 칭호 대신 계급(「브론즈」·3글자)을 쓰고
# 숫자도 우리 표기(「39.2A」·5글자)라, `A3_REFSTR=1` 없이 찍은 캡처를 이 게이트에 물리면
# 레퍼런스(「칭호 없음」5글자 · 「39.20A」6글자)와의 **글자 수 차이**가 그대로 «폭 −29.6% / −19.0% 결함»
# 으로 나온다 — 작업 238 로 등재된 4건 중 3건이 그것이었고, CSS 는 한 줄도 안 틀렸다.
# 나머지 1건(«전투력 폭 +13.4% = scaleX 가 13% 넓다»)도 같은 뿌리다: `capA3.js` 가 화면이 쓰는
# `fmtB`(→`1.33B`) 대신 `fmt`(→`1,330,000`·9글자)로 덮어써서 창(pad 10 = 104px)이 **잘라 잰** 폭이었다.
# 그래서 사이드카(`A3-r*.json`)의 문자열을 먼저 대조한다 — 틀리면 «어느 문자열이 무엇이어야 하는지»
# 이름을 대고 빨개진다. 표기 규약(150·188 계열)이 또 바뀌어 `capA3.js` 만 낡아도 여기서 먼저 잡힌다.
REFSTR = {'nick': 'U_1787501115822', 'rank': '칭호 없음',
          'cp': '1.33B', 'gold': '39.20A', 'dia': '1,300'}


def sidecar_check(cap_path):
    """(ok 건수, 실패 목록, 사이드카 있었나) — 사이드카가 없으면 (0, [], False)."""
    import json
    import os
    side = cap_path[:-4] + '.json' if cap_path.endswith('.png') else cap_path + '.json'
    if not os.path.exists(side):
        return 0, [], False
    with open(side, encoding='utf-8') as f:
        meta = json.load(f)
    fails = []
    ok = 0
    if not meta.get('refstr'):
        fails.append('캡처가 측정 모드가 아니다 — `A3_REFSTR=1 node tools/capA3.js <회차>` 로 다시 찍어라'
                     ' (폭은 글자 수가 같아야만 비교된다)')
    else:
        ok += 1
    got = meta.get('text') or {}
    for key, want in REFSTR.items():
        have = got.get(key)
        if have != want:
            fails.append('캡처 문자열 %s = %r 인데 레퍼런스는 %r — 글자 수가 다르면 «폭» 은 못 잰다'
                         ' (capA3.js 가 화면과 다른 포매터를 쓰고 있는지 볼 것)' % (key, have, want))
        else:
            ok += 1
    return ok, fails, True


if '--gate' in sys.argv:
    bad = []
    ok = 0
    print()
    print('== VERIFYA3 게이트 ==')
    s_ok, s_bad, s_has = sidecar_check(CAP)
    if s_has:
        ok += s_ok
        bad += s_bad
    else:
        print('  ⚠ 사이드카(%s.json) 없음 — 문자열 대조를 건너뛴다.' % CAP[:-4])
        print('    폭 지적이 나오면 **결함이라고 믿기 전에** `A3_REFSTR=1 node tools/capA3.js <회차>` 로'
              ' 다시 찍어서 재현되는지부터 볼 것(작업 238).')
    for name, (x, y, w, h), (mn, pred), pad in ITEMS:
        br = bb(ref, y - pad, y + h + pad, x - pad, x + w + pad, pred)
        bc = bb(cap, y - pad - DY, y + h + pad - DY, x - pad, x + w + pad, pred)
        tw, th = GATE.get(name, (5, 8))
        if br is None or bc is None:
            bad.append('%s: 마스크 0' % name)
            continue
        dw = abs(bc[2] - br[2]) / br[2] * 100
        dh = abs(bc[3] - br[3]) / br[3] * 100
        for axis, d, lim in (('폭', dw, tw), ('높이', dh, th)):
            if d > lim:
                bad.append('%s %s %.1f%% > 허용 %d%%' % (name, axis, d, lim))
            else:
                ok += 1
    n = ok + len(bad)
    print('VERIFYA3 %d/%d %s' % (ok, n, 'PASS' if not bad else 'FAIL'))
    for b in bad:
        print('  ✗', b)
    sys.exit(0 if not bad else 1)
