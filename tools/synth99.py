#!/usr/bin/env python3
# 99 스킬 시전음 합성기 — python3 tools/synth99.py [--out assets/audio]
#
# 지시서(작업 99 ②): CC0 소스에 whoosh/zap/throw 가 없으면 numpy 로 합성한 wav 를
# 78 과 같은 경로(soundfile/libsndfile)로 ogg(Vorbis) + mp3 2벌로 인코딩한다.
# 78 팩 3종(Kenney Interface · Junkala 512 · SketchyLogic NES)의 공개 미러에는
# UI 클릭·폭발·징글만 들어 있고 휘두름/전격/투척 계열이 없어 전량 자체 합성했다.
# 합성물은 CC0 로 배포한다(assets/audio/CREDITS.md «자체 합성» 절).
#
# 레벨 규약(98): 스킬 시전음은 «전투 반복음» 분류라 최종 목표가 창100ms RMS −26 dBFS 다.
# index.html 의 AU_GAIN 이 0.25~0.35(지시서 ④) 안에 떨어지도록 파일 자체는
# 창RMS −15.5 dBFS(= −26 + 20log10(1/0.30)) · 피크 ≤ −1 dBFS 로 굽는다.
import argparse, os, math
from pydep937 import np
import soundfile as sf

SR = 44100
WIN = 0.100                 # 98 과 같은 100ms 창
TARGET_WRMS = -15.5         # 파일 자체 목표(게인 0.30 을 곱하면 −26)
PEAK_CEIL = -1.0

rng = np.random.default_rng(9909)   # 재현 가능한 합성


def t(dur):
    return np.arange(int(SR * dur)) / SR


def env(n, a, d, curve=2.0):
    """어택 a초 · 디케이 d초 지수 감쇠 포락선"""
    x = np.arange(n) / SR
    at = np.clip(x / max(a, 1e-6), 0, 1)
    dc = np.exp(-np.maximum(0, x - a) / max(d, 1e-6) * curve)
    return at * dc


def biquad(x, b, a):
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
        x2, x1 = x1, x[i]
        y2, y1 = y1, v
        y[i] = v
    return y


def bp_sweep(x, f0, f1, q=1.4):
    """중심 주파수가 f0→f1 로 훑는 밴드패스(샘플마다 계수 갱신 — 1차 근사)"""
    n = len(x)
    f = np.geomspace(max(f0, 20), max(f1, 20), n)
    y = np.zeros(n)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(n):
        w = 2 * math.pi * f[i] / SR
        al = math.sin(w) / (2 * q)
        c = math.cos(w)
        a0 = 1 + al
        b0, b1, b2 = al / a0, 0.0, -al / a0
        a1, a2 = (-2 * c) / a0, (1 - al) / a0
        v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1 = x1, x[i]
        y2, y1 = y1, v
        y[i] = v
    return y


def lp(x, fc):
    w = math.exp(-2 * math.pi * fc / SR)
    y = np.zeros_like(x)
    prev = 0.0
    for i in range(len(x)):
        prev = (1 - w) * x[i] + w * prev
        y[i] = prev
    return y


def noise(n):
    return rng.standard_normal(n)


# ---------------------------------------------------------------- 계열 7종
def s_whoosh():
    """검기·멀티검기·폭풍의 칼날·흡혈의 검 — 칼 휘두름(공기 가르는 소리)"""
    d = 0.22
    n = len(t(d))
    x = noise(n)
    y = bp_sweep(x, 700, 2900, q=1.1) + 0.5 * bp_sweep(x, 2600, 900, q=2.2)
    y *= env(n, 0.012, 0.055, 2.4)
    return y


def s_throw():
    """표창·돌팔매·화살·부메랑·천벌의 창 — 투척(짧은 tk + 날아가는 스위시)"""
    d = 0.18
    n = len(t(d))
    x = np.arange(n) / SR
    tick = np.sin(2 * math.pi * np.cumsum(np.geomspace(900, 300, n)) / SR) * env(n, 0.001, 0.012, 3.0)
    swish = bp_sweep(noise(n), 3200, 1100, q=1.6) * env(n, 0.006, 0.045, 2.2)
    return 0.8 * tick + 0.9 * swish


def s_ice():
    """얼음창·서리 연쇄 — 빙결 슬라이드(고음 글리산도 + 서걱이는 결정음)"""
    d = 0.30
    n = len(t(d))
    f = np.geomspace(1500, 3400, n)
    tone = np.sin(2 * math.pi * np.cumsum(f) / SR) * env(n, 0.008, 0.075, 2.0)
    tone += 0.4 * np.sin(2 * math.pi * np.cumsum(f * 1.5) / SR) * env(n, 0.010, 0.045, 2.6)
    shim = bp_sweep(noise(n), 4200, 6800, q=3.0) * env(n, 0.004, 0.050, 2.0)
    return 0.9 * tone + 0.5 * shim


def s_zap():
    """연쇄 번개 — 전격(거친 버즈 + 고역 크래클)"""
    d = 0.20
    n = len(t(d))
    x = np.arange(n) / SR
    buzz = np.sign(np.sin(2 * math.pi * np.cumsum(np.geomspace(320, 120, n)) / SR))
    buzz *= (0.6 + 0.4 * (rng.random(n) < 0.5))          # 불규칙 AM — 스파크
    buzz = lp(buzz, 2600) * env(n, 0.002, 0.045, 2.6)
    crack = bp_sweep(noise(n), 5200, 3000, q=2.0) * env(n, 0.001, 0.028, 3.2)
    return 0.85 * buzz + 0.7 * crack


def s_cast():
    """화염구·운석·심판의 빛·창세의 폭발 — 둔탁한 발사(저역 스윕 + 바람 소리)"""
    d = 0.26
    n = len(t(d))
    f = np.geomspace(190, 48, n)
    body = np.sin(2 * math.pi * np.cumsum(f) / SR) * env(n, 0.006, 0.075, 2.0)
    air = lp(noise(n), 900) * env(n, 0.004, 0.040, 2.6)
    return 1.0 * body + 0.45 * air


def s_bubble():
    """맹독 안개 — 부글거리는 장판(짧은 상승 블립 6알)"""
    d = 0.42
    n = len(t(d))
    y = np.zeros(n)
    starts = [0.00, 0.055, 0.105, 0.170, 0.245, 0.325]
    f0s = [220, 330, 260, 400, 300, 480]
    for s0, f0 in zip(starts, f0s):
        i0 = int(s0 * SR)
        m = min(int(0.075 * SR), n - i0)
        if m <= 0:
            continue
        f = np.geomspace(f0, f0 * 3.2, m)
        blip = np.sin(2 * math.pi * np.cumsum(f) / SR) * env(m, 0.003, 0.016, 2.4)
        y[i0:i0 + m] += blip
    y += 0.12 * lp(noise(n), 700) * env(n, 0.02, 0.16, 1.4)
    return y


def s_chime():
    """기합·치유·신속·수호·광란 — 버프 차임(짧은 3음 상승)"""
    d = 0.40
    n = len(t(d))
    y = np.zeros(n)
    for k, (f, s0, g) in enumerate([(784, 0.000, 1.0), (988, 0.045, 0.9), (1319, 0.090, 0.8)]):
        i0 = int(s0 * SR)
        m = n - i0
        x = np.arange(m) / SR
        v = (np.sin(2 * math.pi * f * x) + 0.35 * np.sin(2 * math.pi * f * 2 * x)) * env(m, 0.006, 0.085, 1.8)
        y[i0:] += g * v
    return y


SOUNDS = {
    'skwhoosh': (s_whoosh, '검기 계열 휘두름'),
    'skthrow':  (s_throw,  '투척 계열'),
    'skice':    (s_ice,    '빙결 계열'),
    'skzap':    (s_zap,    '전격 계열'),
    'skcast':   (s_cast,   '폭발·투사 발사'),
    'skbubble': (s_bubble, '독 장판'),
    'skchime':  (s_chime,  '버프·치유'),
}


def wrms_db(y):
    w = int(SR * WIN)
    if len(y) <= w:
        return 20 * math.log10(max(1e-12, float(np.sqrt(np.mean(y ** 2)))))
    p = np.cumsum(np.concatenate([[0.0], y ** 2]))
    best = float(np.max(p[w:] - p[:-w]))
    return 20 * math.log10(max(1e-12, math.sqrt(best / w)))


def peak_db(y):
    return 20 * math.log10(max(1e-12, float(np.max(np.abs(y)))))


def bake(y):
    """창RMS 를 목표로 맞추고, 크레스트가 커서 피크가 −1 을 넘으면 소프트 리미터로 눌러 재조정"""
    y = y - float(np.mean(y))
    y = y / max(1e-9, float(np.max(np.abs(y))))
    for _ in range(24):
        g = 10 ** ((TARGET_WRMS - wrms_db(y)) / 20)
        y = y * g
        if peak_db(y) <= PEAK_CEIL:
            break
        lim = 10 ** (PEAK_CEIL / 20)
        y = lim * np.tanh(y / lim)          # 소프트 리미터 — 크레스트만 깎는다
    # 클릭 방지 — 양끝 2ms 페이드
    f = int(0.002 * SR)
    y[:f] *= np.linspace(0, 1, f)
    y[-f:] *= np.linspace(1, 0, f)
    if peak_db(y) > PEAK_CEIL:              # 안전 실링
        y *= 10 ** ((PEAK_CEIL - peak_db(y)) / 20)
    return y.astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio'))
    a = ap.parse_args()
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)
    print('name'.ljust(11) + 'dur(s)'.rjust(8) + 'peak'.rjust(8) + 'wrms'.rjust(8)
          + 'ogg(B)'.rjust(9) + 'mp3(B)'.rjust(9))
    for name, (fn, desc) in SOUNDS.items():
        y = bake(fn())
        sf.write(os.path.join(out, name + '.ogg'), y, SR, format='OGG', subtype='VORBIS')
        sf.write(os.path.join(out, name + '.mp3'), y, SR, format='MP3', subtype='MPEG_LAYER_III')
        so = os.path.getsize(os.path.join(out, name + '.ogg'))
        sm = os.path.getsize(os.path.join(out, name + '.mp3'))
        print(name.ljust(11) + f'{len(y)/SR:8.3f}' + f'{peak_db(y):8.2f}' + f'{wrms_db(y):8.2f}'
              + f'{so:9d}' + f'{sm:9d}')


if __name__ == '__main__':
    main()
