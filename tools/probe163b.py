#!/usr/bin/env python3
"""163 6회차 — knight 아틀라스 **접지발 실측기**(판정 없음, 측정 전용).

실행: python3 tools/probe163b.py

5회차 인계문 1번(«① 프레임별 접지 거리»)에 답하려고 만들었다.
지금 구현은 달리기 프레임을 «LD_STEP(=평균 92px) 갈 때마다 한 장» 으로 뽑는데,
스프라이트의 접지발은 **프레임마다 다른 거리**를 요구한다(비평가 H: f0→f1 126px vs f1→f2 90px = 1.40:1).
그래서 균일 자로는 f0→f1 에서 −26.5% 가 남는다.

여기서 재는 것:
  ① run 프레임별 «바닥에 닿아 있는 잉크» 의 x 중심(프레임 좌표, src px)과 폭
  ② 접지 → 접지 사이가 요구하는 몸의 이동 거리(= 접지발이 프레임 안에서 뒤로 간 만큼)
  ③ 체공 프레임(바닥 잉크 없음) 판별
  ④ idle 0프레임의 **발 스팬 중심** vs `drawHeroTo` 앵커(c0 = 잉크 중심) 편심
     — 인계문 2번(«발 축이 −54px 어긋난다»)의 근거값

좌표계: 프레임 박스(fw×fh) 기준. 아틀라스 항목은 [sx,sy,w,h,ox,oy,fw,fh] 이고
그리기는 발밑을 캔버스 바닥에 맞춘다(dy = (−fh + oy) * SC) — 즉 **바닥선 = 프레임 박스 아래변**이다.
"""
import json
import re
import sys

from pydep937 import Image

SRC = 'assets/atlas-data.js'
ALPHA = 40          # 이 값 이상이면 잉크
BAND = 2            # 바닥선에서 이 픽셀 안쪽까지를 «접지» 로 본다


def atlas():
    s = open(SRC, encoding='utf-8').read()
    i = s.find('knight')
    fs = re.search(r'f:\{(.*?)\},\s*a:\{', s[i:], re.S).group(1)
    frames = json.loads('{' + fs + '}')
    a = re.search(r'a:\{(.*?)\}\s*\}', s[i:], re.S).group(1)
    anims = json.loads('{' + a + '}')
    img = re.search(r'img:"(.*?)"', s[i:]).group(1)
    return frames, anims, img


def rows(im, fr):
    """프레임의 잉크를 «프레임 박스 좌표» 로 돌려준다. y=0 이 박스 위, y=fh−1 이 바닥선."""
    sx, sy, w, h, ox, oy, fw, fh = fr
    px = im.crop((sx, sy, sx + w, sy + h)).load()
    out = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] >= ALPHA:
                out.append((ox + x, oy + y))
    return out, fw, fh


def gate():
    """index.html 의 LD_FEET 표가 **아틀라스 픽셀과 같은지** 다시 잰다.
    (게이트 verify163 은 file:// 캔버스가 tainted 라 픽셀을 못 읽는다 — 그 절반을 여기서 맡는다)"""
    frames, anims, img = atlas()
    im = Image.open(img).convert('RGBA')
    src = open('index.html', encoding='utf-8').read()
    m = re.search(r'var LD_FEET\s*=\s*\[([^\]]*)\]', src)
    ok = fail = 0

    def chk(c, msg, d=''):
        nonlocal ok, fail
        if c:
            ok += 1
            print('  ✓', msg)
        else:
            fail += 1
            print('  ✗', msg, '—', d)

    chk(m is not None, 'index.html 에 LD_FEET 표가 있다')
    got = [float(x) for x in m.group(1).split(',')] if m else []
    run = anims['run']
    chk(len(got) == len(run), f'표 길이 = run 프레임 수 ({len(got)} vs {len(run)})')
    for i, n in enumerate(run):
        ink, fw, fh = rows(im, frames[n])
        b = [x for x, y in ink if y >= fh - 1 - BAND]
        cx = sum(b) / len(b) if b else None
        if i < len(got):
            chk(cx is not None and abs(cx - got[i]) <= .05,
                f'f{i} 접지발 x = 아틀라스 실측 (표 {got[i]} · 실측 {cx:.4f})' if cx is not None else f'f{i} 접지 잉크 있음',
                f'차 {abs(cx - got[i]):.3f}' if cx is not None else '바닥 밴드에 잉크 0')
    # 체공 프레임의 «아트가 이미 들어 놓은 양» — LD_LIFT 와 대조(8회차)
    ml = re.search(r'var LD_LIFT\s*=\s*\[([^\]]*)\]', src)
    chk(ml is not None, 'index.html 에 LD_LIFT 표가 있다')
    lift = [float(x) for x in ml.group(1).split(',')] if ml else []
    for i, n in enumerate(run):
        ink, fw, fh = rows(im, frames[n])
        gap = fh - 1 - max(y for _, y in ink)
        if i < len(lift):
            chk(abs(gap - lift[i]) < .01, f'f{i} 잉크 바닥 간격 = 표 ({lift[i]} · 실측 {gap})', f'차 {abs(gap-lift[i])}')

    # 발 축 편심 — LD_FDX 와 대조
    f0 = frames[anims['idle'][0]]
    ink, fw, fh = rows(im, f0)
    ymax = max(y for _, y in ink)
    feet = [x for x, y in ink if y >= ymax - BAND]
    inkc = (min(x for x, _ in ink) + max(x for x, _ in ink)) / 2
    footc = (min(feet) + max(feet)) / 2
    sc = float(re.search(r'var LD_SC\s*=\s*(\d+)', src).group(1))
    fdx = float(re.search(r'var LD_FDX\s*=\s*(-?\d+(?:\.\d+)?)', src).group(1))
    want = (inkc - footc) * sc
    chk(abs(want - fdx) <= 1, f'LD_FDX = (잉크 중심 − 발 중심) × 배율 (표 {fdx} · 실측 {want:.1f})')
    span = (max(feet) - min(feet) + 1) * sc
    chk(span > 0, f'발 스팬 {span:.0f}px (그림자 코어 기준값)')
    # ★ 잉크 bbox — 6회차 비평 I·J 가 둘 다 «브리핑의 612×600 / 528×504 는 잉크가 아니라 프레임 박스» 라고
    #   실측으로 잡아 줬다(정지 세로가 36px 틀렸다). 이제 여기서 알파 bbox 를 직접 재서 문서·브리핑에 쓴다.
    def ink_box(names):
        w = h = 0
        for n in names:
            ink, fw, fh = rows(im, frames[n])
            w = max(w, max(x for x, _ in ink) - min(x for x, _ in ink) + 1)
            h = max(h, max(y for _, y in ink) - min(y for _, y in ink) + 1)
        return w * sc, h * sc
    rw, rh = ink_box(anims['run'])
    iw, ih = ink_box(anims['idle'])
    print(f'  잉크 실측 — 달리기 최대 {rw:.0f}×{rh:.0f}px · 정지 최대 {iw:.0f}×{ih:.0f}px (배율 {sc:.0f})')
    doc = open('docs/measure/163-로딩화면.md', encoding='utf-8').read()
    chk(f'{rw:.0f} × {rh:.0f}' in doc or f'{rw:.0f}×{rh:.0f}' in doc,
        f'측정표가 달리기 잉크를 실측값({rw:.0f}×{rh:.0f})으로 적고 있다')
    chk(f'{iw:.0f} × {ih:.0f}' in doc or f'{iw:.0f}×{ih:.0f}' in doc,
        f'측정표가 정지 잉크를 실측값({iw:.0f}×{ih:.0f})으로 적고 있다')
    tot = ok + fail
    print(f'\nPROBE163B {ok}/{tot} {"PASS" if fail == 0 else "FAIL"}')
    return 1 if fail else 0


def main():
    if '--gate' in sys.argv:
        return gate()
    frames, anims, img = atlas()
    im = Image.open(img).convert('RGBA')
    print(f'아틀라스 {img} · 잉크 임계 alpha≥{ALPHA} · 접지 밴드 {BAND}px\n')

    run = anims['run']
    print(f'run {len(run)}프레임 — 바닥 밴드 잉크(= 접지발)')
    print(f"{'i':>2} {'프레임':<20}{'접지px':>7}{'x0':>6}{'x1':>6}{'중심x':>8}{'바닥간격':>9}")
    foot = []
    for i, n in enumerate(run):
        ink, fw, fh = rows(im, frames[n])
        if not ink:
            foot.append(None)
            continue
        ymax = max(y for _, y in ink)
        gap = fh - 1 - ymax                       # 바닥선까지 남은 거리(0 이면 딱 닿음)
        band = [x for x, y in ink if y >= fh - 1 - BAND]
        if band:
            cx = sum(band) / len(band)
            foot.append(dict(i=i, n=len(band), x0=min(band), x1=max(band), cx=cx, gap=gap))
            print(f'{i:>2} {n:<20}{len(band):>7}{min(band):>6}{max(band):>6}{cx:>8.1f}{gap:>9}')
        else:
            foot.append(dict(i=i, n=0, gap=gap))
            print(f'{i:>2} {n:<20}{0:>7}{"—":>6}{"—":>6}{"—":>8}{gap:>9}   ← 체공')

    print('\n프레임 사이가 요구하는 몸의 이동(src px · 접지 → 접지 만 확정값)')
    reqs = []
    for i in range(len(run)):
        a, b = foot[i], foot[(i + 1) % len(run)]
        if a and a.get('n') and b and b.get('n'):
            d = a['cx'] - b['cx']
            reqs.append(d)
            print(f'  f{i}→f{(i+1)%len(run)}  {d:+8.2f}   (접지 {a["cx"]:.1f} → {b["cx"]:.1f})')
        else:
            reqs.append(None)
            print(f'  f{i}→f{(i+1)%len(run)}  {"체공 구간 — 자유":>16}')

    fixed = [d for d in reqs if d is not None and d > 0]
    print(f'\n  확정 구간 {len(fixed)}칸 합 {sum(fixed):.2f} src px · 평균 {sum(fixed)/len(fixed):.2f}')
    print(f'  최대/최소 비 {max(fixed)/min(fixed):.2f}:1  ← 균일 자로는 이만큼 어긋난다')

    # idle 0프레임 — 발 스팬 중심 vs c0 앵커
    f0 = frames[anims['idle'][0]]
    ink, fw, fh = rows(im, f0)
    ymax = max(y for _, y in ink)
    feet = [x for x, y in ink if y >= ymax - BAND]
    inkx0, inkx1 = min(x for x, _ in ink), max(x for x, _ in ink)
    c0 = fw / 2 - f0[4] - f0[2] / 2                       # 구현이 쓰는 앵커 보정(잉크 중심 맞추기)
    ink_cx = (inkx0 + inkx1) / 2
    feet_cx = (min(feet) + max(feet)) / 2
    print('\nidle f0 — 축(프레임 박스 좌표, fw=%d)' % fw)
    print(f'  잉크 x {inkx0}..{inkx1} 중심 {ink_cx:.1f}')
    print(f'  발 스팬 x {min(feet)}..{max(feet)} 중심 {feet_cx:.1f} (폭 {max(feet)-min(feet)+1})')
    print(f'  c0 = {c0:.1f} → 그리면 잉크 중심이 캔버스 중앙 · 발 중심은 {feet_cx - ink_cx:+.1f} src px')
    for sc in (12,):
        print(f'  배율 {sc} 환산: 발 축이 캔버스 중앙에서 {(feet_cx - ink_cx) * sc:+.1f} px')

    # 달리기 프레임의 발 스팬(그림자 폭 근거)
    allfeet = []
    for n in run + anims['idle']:
        ink, fw, fh = rows(im, frames[n])
        ymax = max(y for _, y in ink)
        b = [x for x, y in ink if y >= ymax - BAND]
        if b:
            allfeet += [min(b), max(b)]
    print(f'\n  run+idle 전체 발 스팬 x {min(allfeet)}..{max(allfeet)} (폭 {max(allfeet)-min(allfeet)+1} src px)')


if __name__ == '__main__':
    sys.exit(main())
