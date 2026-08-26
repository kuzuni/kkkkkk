/* 126 ② (16회차) — 공용 서브탭 `.stabs > .stab` 의 «활성 : 비활성» **잉크 크기 비**를
 * 레퍼런스와 우리 캡처에서 **같은 코드·같은 임계**로 잰다.
 *
 *   node tools/m126tab.js              # 표
 *   node tools/m126tab.js --json out.json
 *
 * 왜 이 도구가 필요한가 — §24-5 / §24-7 3.
 *   15회차 채점에서 AB 혼자 «10 «비활성» 서브탭 「재화」 높이 +21.4%» 를 들었고 AA 는 비활성을
 *   아예 재지 않아 **2인 일치 미달**로 미반영됐다. 그런데 이 자리는 그냥 넘길 수 없다 —
 *   `.stab.on` 은 14회차가 `scaleY(.937)` 로 **활성만** 눌러 둔 자리라, 만약 ref 가 활성:비활성을
 *   «활성이 더 크게» 구분한다면 우리는 지금 **구분이 없거나 거꾸로** 서 있다.
 *   비평가 한 사람의 단독 관찰을 코드로 승격/기각하기 위해 부품째 잰다.
 *
 * 규약(m126t9·m126sh 와 같다 — LESSONS 21)
 *   - ref 와 우리에 **같은 measure() 를 두 번** 돌린다.
 *   - ref 창 = 우리 요소 bbox 사방 여유 + 세로 **+84**(상태바).
 *   - 임계를 **3단으로 스윕**해 값을 «범위째» 낸다 — LESSONS 126(14회차) 교훈 2
 *     («밝은 글자와 어두운 글자에 같은 절대 임계를 대면 +25% 유령이 난다»).
 *
 * 읽는 법
 *   coreH = 흰 코어 bbox 높이(글자 몸통). ratio = 활성 coreH / 비활성 coreH.
 *   **ref ratio 와 우리 ratio 를 비교하는 것이 이 도구의 목적**이다 — 절대 높이가 아니라 «구분비».
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
const JSON_AT = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();
/* ref 세로 오프셋. 상단 고정 요소는 84(상태바), **하단 고정 요소는 60** — 우리 프레임 2280 과
   ref 콘텐츠 2256 의 24px 차(전투 캔버스가 흡수)가 «아래에서 잰 거리» 에는 그대로 남기 때문이다.
   `#shopCats` 는 하단 고정이라 기본값이 60 이다. `--off N` 으로 바꾼다. (§25-6) */
const OFF = (() => { const i = process.argv.indexOf('--off'); return i > 0 ? +process.argv[i + 1] : 60; })();

/* 10 상점 = 공용 서브탭에 ref 가 있는 유일한 화면(§24-5 / 측정표 §13-3). */
const SCREEN = {
  k: '10-상점', ref: 'docs/ref/10-상점-팝업-소환-탭.jpg',
  steps: ['.tab[data-t="shop"]'],
  sel: '#shopCats > .stab',
};

/* 임계 3단 — 흰 코어 임계(TH)만 흔든다. 근흑(BLK)·탈출(EXIT)은 m126t9 와 같은 값으로 고정. */
const SWEEP = [130, 150, 170];
const P0 = { BLK: 90, EXIT: 110, RAD: 4, MAXD: 16 };

const MEASURE = `
function measure(d, W, H, x0, x1, y0, y1, P) {
  const at = (x, y) => (y * W + x) * 4;
  const isWhite = (x, y) => { const o = at(x, y); return Math.min(d[o], d[o+1], d[o+2]) > P.TH; };
  const isBlk   = (x, y) => { const o = at(x, y); return Math.max(d[o], d[o+1], d[o+2]) < P.BLK; };
  const inW = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const isCore = (x, y) => {
    if (!isWhite(x, y)) return false;
    for (let dy = -P.RAD; dy <= P.RAD; dy++) for (let dx = -P.RAD; dx <= P.RAD; dx++) {
      const xx = x + dx, yy = y + dy;
      if (inW(xx, yy) && isBlk(xx, yy)) return true;
    }
    return false;
  };
  const X0 = Math.max(0, x0), X1 = Math.min(W, x1), Y0 = Math.max(0, y0), Y1 = Math.min(H, y1);
  const core = [];
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) if (isCore(x, y)) core.push([x, y]);
  if (core.length < 6) return { core: null, n: core.length };
  let a = 1e9, b = -1, c = 1e9, e = -1;
  for (const [x, y] of core) { if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > e) e = y; }
  return { core: { x0: a, y0: c, w: b - a + 1, h: e - c + 1 }, n: core.length };
}`;

async function main() {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1400);
  for (const sel of SCREEN.steps) { await page.click(sel, { timeout: 4000, force: true }).catch(() => {}); await page.waitForTimeout(600); }
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(300);

  /* 라벨 잉크 상자 = `.stab > i` (실제 글자 요소). 활성 여부는 `.stab.on` 으로 가른다. */
  const items = await page.evaluate((sel) => {
    const out = [];
    document.querySelectorAll(sel).forEach((el, i) => {
      const gi = el.querySelector('i') || el;
      const r = gi.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      out.push({
        i, text: (gi.textContent || '').trim(), on: el.classList.contains('on'),
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        fs: +getComputedStyle(gi).fontSize.replace('px', ''),
      });
    });
    return out;
  }, SCREEN.sel);

  const shot = (await page.screenshot()).toString('base64');
  const refB64 = fs.readFileSync(path.join(ROOT, SCREEN.ref)).toString('base64');

  const res = await page.evaluate(async ({ shot, refB64, items, SWEEP, P0, OFF, SRC }) => {
    eval(SRC);
    const dec = async (b64, mime) => {
      const blob = await (await fetch(`data:${mime};base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob);
      const cv = new OffscreenCanvas(bmp.width, bmp.height);
      const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0);
      return { d: cx.getImageData(0, 0, bmp.width, bmp.height).data, W: bmp.width, H: bmp.height };
    };
    const A = await dec(shot, 'image/png'), R = await dec(refB64, 'image/jpeg');
    const M = 12;                       /* 창 여유 */
    const out = [];
    for (const it of items) {
      const row = { i: it.i, ours: {}, ref: {} };
      for (const TH of SWEEP) {
        const P = Object.assign({}, P0, { TH });
        const o = measure(A.d, A.W, A.H, it.x - M, it.x + it.w + M, it.y - M, it.y + it.h + M, P);
        /* ref 창 = 같은 창을 세로만 +84 */
        const f = measure(R.d, R.W, R.H, it.x - M, it.x + it.w + M, it.y - M + OFF, it.y + it.h + M + OFF, P);
        row.ours[TH] = o.core ? o.core.h : null;
        row.ref[TH]  = f.core ? f.core.h : null;
        (row.oursW || (row.oursW = {}))[TH] = o.core ? o.core.w : null;
        (row.refW  || (row.refW  = {}))[TH] = f.core ? f.core.w : null;
      }
      out.push(row);
    }
    return out;
  }, { shot, refB64, items, SWEEP, P0, OFF, SRC: MEASURE });

  const rows = res.map((r) => Object.assign({}, items.find((x) => x.i === r.i), r));

  console.log(`\n126 ② 공용 서브탭 «활성 : 비활성» 잉크 높이 — 임계 스윕 ${SWEEP.join('/')} · 근흑 ${P0.BLK}`);
  console.log(`coreH = 흰 코어 bbox 높이. ref 창 = 우리 창 세로 +${OFF} (하단 고정 = 60 · 상단 고정 = 84).\n`);
  const f = (v) => (v == null ? '  —' : String(v).padStart(3));
  console.log('자리          상태   fs   | 우리 coreH ' + SWEEP.map((t) => t).join('/') + ' | ref coreH ' + SWEEP.map((t) => t).join('/'));
  for (const r of rows) {
    console.log(
      (r.text || '').padEnd(12) + ' ' + (r.on ? '활성 ' : '비활성') + ' ' +
      String(r.fs).padStart(4) + '  |   ' + SWEEP.map((t) => f(r.ours[t])).join('/') +
      '        |  ' + SWEEP.map((t) => f(r.ref[t])).join('/'));
  }

  /* ★ 폭도 같이 낸다 — «폭은 맞고 높이만 크다» 인지(→ scaleY) «통째로 크다» 인지(→ fs↓) 를 가른다.
     LESSONS 126(14회차) 교훈 3: 둘은 ③ 에 주는 부작용이 정반대다. */
  console.log('\n같은 창의 «폭»(coreW) — 처방을 가르는 값');
  console.log('자리          상태   | 우리 coreW ' + SWEEP.join('/') + ' | ref coreW ' + SWEEP.join('/'));
  for (const r of rows) {
    console.log(
      (r.text || '').padEnd(12) + ' ' + (r.on ? '활성 ' : '비활성') + ' |   ' +
      SWEEP.map((t) => f(r.oursW && r.oursW[t])).join('/') + '        |  ' +
      SWEEP.map((t) => f(r.refW && r.refW[t])).join('/'));
  }

  /* 구분비 — 활성 coreH / 비활성 coreH (임계별). 비활성이 여럿이면 중앙값을 쓴다. */
  const act = rows.filter((r) => r.on), ina = rows.filter((r) => !r.on);
  const med = (a) => { const b = a.filter((v) => v != null).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : null; };
  console.log('\n구분비 = 활성 coreH / 비활성 coreH (비활성은 중앙값)');
  console.log('임계 |  ref 활성/비활성 = 비   |  우리 활성/비활성 = 비   |  Δ비');
  const summary = [];
  for (const TH of SWEEP) {
    const aR = med(act.map((r) => r.ref[TH])), iR = med(ina.map((r) => r.ref[TH]));
    const aO = med(act.map((r) => r.ours[TH])), iO = med(ina.map((r) => r.ours[TH]));
    const rR = aR && iR ? +(aR / iR).toFixed(3) : null;
    const rO = aO && iO ? +(aO / iO).toFixed(3) : null;
    console.log(
      String(TH).padStart(4) + ' |  ' + f(aR) + '/' + f(iR) + ' = ' + (rR == null ? '  —  ' : rR.toFixed(3)) +
      '   |  ' + f(aO) + '/' + f(iO) + ' = ' + (rO == null ? '  —  ' : rO.toFixed(3)) +
      '   |  ' + (rR != null && rO != null ? ((rO - rR >= 0 ? '+' : '') + (rO - rR).toFixed(3)) : '—'));
    summary.push({ TH, refAct: aR, refIna: iR, ourAct: aO, ourIna: iO, refRatio: rR, ourRatio: rO });
  }
  console.log('\n판정 기준 — ref 비 > 1 이면 «ref 는 활성을 더 크게 그린다».');
  console.log('           우리 비가 ref 비보다 작으면 «우리는 구분이 없거나 거꾸로» 다.');

  if (JSON_AT) fs.writeFileSync(path.join(ROOT, JSON_AT), JSON.stringify({ rows, summary }, null, 1));
  await browser.close();
}
main();
