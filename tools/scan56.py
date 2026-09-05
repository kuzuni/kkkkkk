#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scan56.py — 56 절전 모드 «잉크 bbox» 스캐너 겸 대조기.

레퍼런스도 캡처도 «검정 바탕 + 흰 잉크» 라서 **같은 스캐너로 둘 다 잴 수 있다.**
그래서 이 스크립트 하나로 레퍼런스 실측치(측정표 §3)와 우리 구현을 같은 방법으로 재고 바로 대조한다
(LESSONS 52-① — 어긋나면 «누구를 믿나» 가 아니라 «같은 방법으로 다시 재서» 가른다).

사용법 (repo 루트에서):
  python3 tools/scan56.py bands <img> [dy]        # 잉크 행 밴드 목록 (dy: ref 는 -84, 캡처는 0)
  python3 tools/scan56.py ink <img> <x0> <y0> <x1> <y1> [th]   # 영역 안 잉크 bbox
  python3 tools/scan56.py cmp <capture.png>       # 측정표 §3 목표치 ↔ 캡처 실측 대조표
  python3 tools/scan56.py px <img> <x> <y>
모든 y 는 **프레임 좌표**(= 레퍼런스 y − 84)로 출력한다.
"""
import sys
from pydep937 import Image

REF = 'docs/ref/56-절전모드.jpg'

def load(p):
    im = Image.open(p).convert('RGB')
    dy = -84 if p.endswith('.jpg') else 0        # 레퍼런스만 상태바 84px 을 걷어낸다
    return im, im.load(), im.size[0], im.size[1], dy

def ink_box(px, W, H, x0, y0, x1, y1, th=40):
    """영역 안에서 max(R,G,B) > th 인 픽셀의 bbox (이미지 좌표계)."""
    bx0, by0, bx1, by1, n = 10**9, 10**9, -1, -1, 0
    for y in range(max(0, y0), min(H, y1)):
        for x in range(max(0, x0), min(W, x1)):
            r, g, b = px[x, y]
            if max(r, g, b) > th:
                n += 1
                if x < bx0: bx0 = x
                if x > bx1: bx1 = x
                if y < by0: by0 = y
                if y > by1: by1 = y
    if n == 0: return None
    return (bx0, by0, bx1 - bx0 + 1, by1 - by0 + 1, n)

def bands(path, th=10):
    im, px, W, H, dy = load(path)
    rows = []
    for y in range(H):
        hit = 0
        for x in range(0, W, 2):
            r, g, b = px[x, y]
            if max(r, g, b) > th: hit += 1
        rows.append(hit)
    out, y = [], 0
    while y < H:
        if rows[y] > 0:
            s = y
            while y < H and rows[y] > 0: y += 1
            out.append((s, y - 1))
        else: y += 1
    print(f'{path}  {W}x{H}  (frame y = img y {dy:+d})')
    for s, e in out:
        print(f'  band img y {s}..{e}   frame y {s+dy}..{e+dy}   h {e-s+1}')

# 측정표 §3 의 목표치 — (이름, 프레임 x, 프레임 y, w, h, 스캔영역 프레임 x0,y0,x1,y1, 임계)
TARGETS = [
    ('A 배터리 그룹',   967.5,   28.5,  84,  46,  (930,   10, 1080,   95), 40),
    ('A `10%` 잉크',    983.0,   40.0,  47,  21,  (975,   34, 1040,   66), 40),
    ('B 시계',          347.0,  624.0, 386, 115,  (200,  580,  900,  755), 40),
    ('C 날짜',          410.0,  764.0, 260,  38,  (300,  740,  800,  830), 40),
    ('D 스컬 배지',     368.0, 1031.0,  58,  56,  (330, 1010,  432, 1100), 12),
    ('D `STAGE N`',     438.0, 1041.0, 204,  34,  (432, 1010,  720, 1100), 40),
    ('E 패널',          239.5, 1128.0, 601, 351,  (200, 1100,  880, 1500), 25),
    ('E1 라벨 방치시간',360.0, 1196.0, 108,  27,  (356, 1180,  620, 1240), 70),
    ('E1 값',           621.0, 1199.0, 139,  21,  (600, 1180,  790, 1240), 70),
    ('E2 라벨 처치수',  360.0, 1290.0, 183,  26,  (356, 1274,  700, 1334), 70),
    ('E3 라벨 골드',    360.0, 1384.0, 125,  26,  (356, 1368,  700, 1428), 70),
    ('E3 값',           723.0, 1386.0,  37,  22,  (700, 1368,  790, 1428), 70),
    ('F 해제 안내',     385.0, 2040.0, 312,  43,  (300, 2010,  800, 2110), 25),
]

def cmp(path):
    im, px, W, H, dy = load(path)
    print(f'{path}  {W}x{H}\n')
    print(f'{"요소":<18}{"항목":<6}{"목표":>9}{"실측":>9}{"Δ":>8}')
    print('-' * 52)
    bad = 0
    for nm, tx, ty, tw, th_, (sx0, sy0, sx1, sy1), thr in TARGETS:
        b = ink_box(px, W, H, int(sx0 - dy * 0), int(sy0 - dy), int(sx1), int(sy1 - dy), thr)
        if not b:
            print(f'{nm:<18}{"—":<6}{"":>9}{"없음":>9}'); bad += 1; continue
        bx, by, bw, bh, n = b
        by += dy
        for k, t, v in (('x', tx, bx), ('y', ty, by), ('w', tw, bw), ('h', th_, bh)):
            d = v - t
            flag = '' if abs(d) <= 3 else ('  ‹' + ('크다' if d > 0 else '작다') + '›')
            if abs(d) > 3: bad += 1
            print(f'{nm if k == "x" else "":<18}{k:<6}{t:>9.1f}{v:>9.1f}{d:>+8.1f}{flag}')
        print()
    print(f'허용(±3px) 밖 항목: {bad}')

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(0)
    if a[0] == 'bands': bands(a[1], int(a[2]) if len(a) > 2 else 10)
    elif a[0] == 'cmp': cmp(a[1])
    elif a[0] == 'ink':
        im, px, W, H, dy = load(a[1])
        x0, y0, x1, y1 = [int(v) for v in a[2:6]]
        th = int(a[6]) if len(a) > 6 else 40
        b = ink_box(px, W, H, x0, y0 - dy, x1, y1 - dy, th)
        if not b: print('잉크 없음')
        else: print(f'x {b[0]}  y(frame) {b[1]+dy}  w {b[2]}  h {b[3]}  px {b[4]}')
    elif a[0] == 'px':
        im, px, W, H, dy = load(a[1])
        x, y = int(a[2]), int(a[3])
        print(px[x, y - dy])
