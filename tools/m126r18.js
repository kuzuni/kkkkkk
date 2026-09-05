/* 126 18회차 자체 계측 — «움직여야 할 변만 움직였는가»(§20-8) 를 요소 단위로 확인한다.
 *   node tools/m126r18.js
 * 전체 화면 캡처를 서로 빼는 방법은 이 게임에서 **못 쓴다** — 전투 캔버스·HUD 숫자가 매 프레임 달라져
 * 두 캡처의 diff bbox 가 항상 화면 전체로 나온다(18회차에 실제로 확인). 그래서 요소를 `clip` 으로
 * 따로 찍어 그 안에서만 잰다.
 * 잰다:
 *   ⓐ 02 하단 내비 「영웅」 — 좌/우/위/아래 검정 띠 (좌만 얇아지고 나머지는 불변이어야 한다)
 *   ⓑ 10 상점 활성탭 「소환」 — 좌/우/위/아래 검정 띠 (4변 전부 얇아져야 한다)
 *   ⓒ 22 「보상 받기」·「모두 받기」 — 안쪽 «밝은 림» 좌·우 폭 (0 → 6 이어야 한다)
 * 자: 잉크 코어에서 바깥으로 «코어→검정» / «검정→배경» 50% 교차를 선형보간. 포맷 편향에 둔감하다.
 */
const path = require('path'), fs = require('fs'), os = require('os');
const { execFileSync } = require('child_process');
const { py } = require('./pydep937');   // 937 — 파이썬 자가 «없음» 이면 «한 줄 + 코드 2»
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'm126r18-'));
const PAD = 14;

const PY = `
import sys, json, os
sys.path.insert(0, ${JSON.stringify(__dirname)})
from pydep937 import Image                            # 937 — 없으면 «한 줄 + 코드 2»
fn, mode = sys.argv[1], sys.argv[2]
im = Image.open(fn).convert("RGB"); px = im.load(); W, H = im.size
def lum(p): return 0.299*p[0] + 0.587*p[1] + 0.114*p[2]

def band(vals, i0, step, core, bg):
    """코어(>=core)에서 바깥으로: 코어->검정 50% 교차 a, 검정->배경 50% 교차 b. |b-a| = 띠 두께."""
    n = len(vals); i = i0
    a = None; prev = vals[i]
    lo = core * 0.5
    while 0 <= i + step < n:
        cur = vals[i + step]
        if prev > lo >= cur:
            a = i + step * ((prev - lo) / (prev - cur) if prev != cur else 0.0); break
        prev = cur; i += step
    if a is None: return None
    hi = bg * 0.5
    j = int(a) if step > 0 else int(a) + 1
    j = max(0, min(n - 1, j)); prev = vals[j]
    while 0 <= j + step < n:
        cur = vals[j + step]
        if prev <= hi < cur:
            return abs((j + step * ((hi - prev) / (cur - prev) if cur != prev else 0.0)) - a)
        prev = cur; j += step
    return None

if mode == "ring":
    core = float(sys.argv[3]); bg = float(sys.argv[4])
    ys = [y for y in range(H) if any(lum(px[x, y]) >= core for x in range(W))]
    xs = [x for x in range(W) if any(lum(px[x, y]) >= core for y in range(H))]
    if not ys or not xs: print(json.dumps({"err": "no core"})); raise SystemExit
    ymid = ys[len(ys)//2]; xmid = xs[len(xs)//2]
    rowv = [lum(px[x, ymid]) for x in range(W)]
    colv = [lum(px[xmid, y]) for y in range(H)]
    rx = [x for x in range(W) if rowv[x] >= core]
    cy = [y for y in range(H) if colv[y] >= core]
    L = band(rowv, rx[0], -1, core, bg); R = band(rowv, rx[-1], +1, core, bg)
    T = band(colv, cy[0], -1, core, bg); B = band(colv, cy[-1], +1, core, bg)
    f = lambda v: None if v is None else round(v, 2)
    print(json.dumps({"L": f(L), "R": f(R), "T": f(T), "B": f(B),
                      "dx": f(None if None in (L, R) else R - L),
                      "dy": f(None if None in (T, B) else B - T)}))

if mode == "rim":
    """행마다 좌->우: 첫 검정 런 직후 밝은(190~235) 런, 마지막 검정 런 직전 밝은 런."""
    from collections import Counter
    cl, cr = Counter(), Counter()
    for y in range(int(H*0.30), int(H*0.70)):
        v = [lum(px[x, y]) for x in range(W)]
        i = 0
        while i < W and v[i] > 60: i += 1
        while i < W and v[i] <= 60: i += 1
        k = 0
        while i + k < W and 190 <= v[i + k] <= 235: k += 1
        cl[k] += 1
        j = W - 1
        while j >= 0 and v[j] > 60: j -= 1
        while j >= 0 and v[j] <= 60: j -= 1
        k = 0
        while j - k >= 0 and 190 <= v[j - k] <= 235: k += 1
        cr[k] += 1
    print(json.dumps({"L": cl.most_common(1)[0][0], "R": cr.most_common(1)[0][0]}))
`;

function measure(png, mode, a, b) {
  const args = ['-c', PY, png, mode];
  if (a !== undefined) args.push(String(a), String(b));
  return JSON.parse(py(args, { encoding: 'utf8' }));
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});

  const shot = async (sel, name, idx = 0) => {
    const box = await page.evaluate(([s, i]) => {
      const el = document.querySelectorAll(s)[i]; if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }, [sel, idx]);
    if (!box || box.width < 2) return null;
    const clip = { x: Math.max(0, box.x - PAD), y: Math.max(0, box.y - PAD),
                   width: box.width + PAD * 2, height: box.height + PAD * 2 };
    const p = path.join(OUT, name + '.png');
    await page.screenshot({ path: p, clip });
    return p;
  };

  const res = {};

  /* ⓐ 02 하단 내비 「영웅」 라벨 — 면이 어두우므로 core 200 / bg 55 */
  {
    const p = await shot('.tab .tl', 'nav');
    if (p) res['02 내비 「영웅」'] = measure(p, 'ring', 200, 55);
  }

  /* ⓒ 22 버튼 안쪽 밝은 림 */
  await page.click('.side .ibtn[data-pop="quest"]', { force: true }).catch(() => {});
  await page.waitForTimeout(800);
  {
    const p = await shot('.qs-b', 'bosang');
    if (p) res['22 「보상 받기」 밝은 림'] = measure(p, 'rim');
    const q = await shot('.qs-all', 'modu');
    if (q) res['22 「모두 받기」 밝은 림'] = measure(q, 'rim');
  }

  /* ⓑ 10 상점 활성탭 「소환」 — 알약 면이 어두우므로 core 185 / bg 50 */
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
  await page.click('.tab[data-t="shop"]', { force: true }).catch(() => {});
  await page.waitForTimeout(900);
  {
    const p = await shot('#shopCats .stab.on>i', 'summon');
    if (p) res['10 활성탭 「소환」'] = measure(p, 'ring', 185, 50);
    const q = await shot('#shopCats .stab:not(.on)>i', 'jaehwa');
    if (q) res['10 비활성 「재화」(불변이어야)'] = measure(q, 'ring', 185, 50);
  }

  console.log('== M126R18 ==');
  for (const [k, v] of Object.entries(res)) console.log(' ', k, JSON.stringify(v));
  await browser.close();
})();
