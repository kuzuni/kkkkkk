/* 126 ②-2 게이트 — 52 메뉴 칸 라벨의 «흰 채움» 잉크가 레퍼런스 크기인지 픽셀로 센다.
 *
 *   node tools/m126lbl.js
 *
 * 왜 필요한가: 5회차가 회수한 것(`--lf` 24 → 29)은 **폰트 상수 한 줄**이라, 다음 세션이 ③ 의
 * `font-size` 8단 스냅을 돌리다 이 자리를 도로 24 로 내려도 아무도 모른다. 4회차가 «흰 덧획을
 * 1.6px → .025em 으로 낮추고 폰트 보정은 안 되돌린» 것과 정확히 같은 사고가 반복된다.
 *
 * 기준값 — `docs/measure/52-메뉴팝업.md` §3 의 **오염되지 않은 칸만** 쓴다.
 * 그 표의 «우편»·«랭킹»·«게임 라운지» 는 레퍼런스 쪽에서 뒤 HUD(보스 HP 바·해골 마커·적 HP 바)가
 * 칸 위로 그려진 표본이라 대조에 쓰면 안 된다(측정표가 ※ 로 표시해 뒀다).
 *
 * 재는 법 — `tools/m126ink.js` 와 같은 차분 마스크다. 요소를 `visibility:hidden` 하기 «전/후» 를
 * 찍어 달라진 픽셀만 잉크로 잡고, 그중 `min(rgb) > 150` 인 것이 «흰 채움» 이다.
 * ⚠ 아무것도 안 바꾸고 찍은 잡음 기준선(N)을 반드시 빼라 — 부모의 드롭섀도·연출이 계속 다시 그려져서
 *   기준선 없이는 창 전체를 잉크로 읽는다(5회차에 실제로 202px 이 나왔다).
 * ⚠ 높이는 «절전» 만 예외로 느슨하다 — 🔋 아이콘(`--dy:2px`)이 라벨과 겹치는 폭이 그 칸만 넓어
 *   차분이 아이콘 하단을 같이 문다. 폭은 다른 칸과 같은 기준으로 본다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

/* [라벨, ref 흰 잉크 w, h, 폭 허용오차, 높이 허용오차] */
const REF = [
  ['길라잡이', 71, 19, 4, 3],
  ['가방', 45, 24, 4, 3],
  ['절전', 42, 23, 4, 6],   /* 높이 ±6 — 위 주석의 아이콘 겹침 */
  ['설정', 43, 24, 4, 3],
];
/* ref 대조가 불가능한 칸(오염 표본 · ref 없음) — «깨끗한 칸들과 같은 계열인가» 만 본다. */
const PEER = ['우편', '랭킹', '패스'];

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  console.log(`  ${cond ? '✓' : '✗'} ${name}  — ${detail}`);
  cond ? pass++ : fail++;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForTimeout(1400);
  await page.click('#menub', { force: true }).catch(() => {});
  await page.waitForTimeout(800);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
  await page.waitForTimeout(300);

  const labels = await page.evaluate(() => Array.from(document.querySelectorAll('#mnw .mn-l')).map((e, i) => {
    e.setAttribute('data-lbl', String(i));
    return { i, t: e.textContent.trim() };
  }));

  const measure = async (i) => {
    const sel = `[data-lbl="${i}"]`;
    const box = await page.evaluate((s) => {
      const e = document.querySelector(s); const r = e.getBoundingClientRect();
      return { x: Math.max(0, Math.floor(r.left - 20)), y: Math.max(0, Math.floor(r.top - 20)), w: Math.ceil(r.width + 40), h: Math.ceil(r.height + 40) };
    }, sel);
    const clip = { x: box.x, y: box.y, width: box.w, height: box.h };
    const shot = async () => (await page.screenshot({ clip })).toString('base64');
    const a = await shot();
    await page.waitForTimeout(90);
    const n = await shot();
    await page.evaluate((s) => { document.querySelector(s).style.visibility = 'hidden'; }, sel);
    await page.waitForTimeout(90);
    const b = await shot();
    await page.evaluate((s) => { document.querySelector(s).style.visibility = ''; }, sel);
    return page.evaluate(async ({ a, b, n }) => {
      const load = (x) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = 'data:image/png;base64,' + x; });
      const [A, B, N] = await Promise.all([load(a), load(b), load(n)]);
      const px = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
      const da = px(A), db = px(B), dn = px(N), W = A.width, H = A.height, TH = 18;
      const d = (u, v, o) => Math.abs(u[o] - v[o]) + Math.abs(u[o + 1] - v[o + 1]) + Math.abs(u[o + 2] - v[o + 2]);
      let lo = 1e9, hi = -1e9, top = 1e9, bot = -1e9, c = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        if (d(da, db, o) < TH) continue;
        if (d(da, dn, o) >= TH) continue;
        if (Math.min(da[o], da[o + 1], da[o + 2]) <= 150) continue;
        c++; if (x < lo) lo = x; if (x > hi) hi = x; if (y < top) top = y; if (y > bot) bot = y;
      }
      return c < 6 ? null : { w: hi - lo + 1, h: bot - top + 1 };
    }, { a, b, n });
  };

  console.log('126 ②-2 — 52 메뉴 라벨 흰 잉크 대조 (ref = 측정표 §3 의 오염 안 된 칸)\n');
  const got = {};
  for (const L of labels) got[L.t] = await measure(L.i);

  for (const [t, rw, rh, tw, th] of REF) {
    const g = got[t];
    if (!g) { ok(`«${t}» 잉크 검출`, false, '잉크 미검출'); continue; }
    ok(`«${t}» 폭 ${rw}±${tw}`, Math.abs(g.w - rw) <= tw, `실측 ${g.w} (ref ${rw}, Δ${(g.w - rw > 0 ? '+' : '') + (g.w - rw)} = ${((g.w / rw - 1) * 100).toFixed(1)}%)`);
    ok(`«${t}» 높이 ${rh}±${th}`, Math.abs(g.h - rh) <= th, `실측 ${g.h} (ref ${rh}, Δ${(g.h - rh > 0 ? '+' : '') + (g.h - rh)})`);
  }

  /* 오염 표본 칸 — ref 대신 «깨끗한 2자 칸의 폭 범위» 안에 드는지 본다. */
  const clean2 = REF.filter(([t]) => t !== '길라잡이').map(([t]) => got[t]).filter(Boolean);
  const loW = Math.min(...clean2.map((x) => x.w)) - 5, hiW = Math.max(...clean2.map((x) => x.w)) + 5;
  for (const t of PEER) {
    const g = got[t];
    if (!g) { ok(`«${t}» 잉크 검출`, false, '잉크 미검출'); continue; }
    ok(`«${t}» 폭이 깨끗한 칸 계열(${loW}~${hiW})`, g.w >= loW && g.w <= hiW,
      `실측 ${g.w} — ref 표본이 HUD 에 오염돼 직접 대조 불가(측정표 §3 ※)`);
  }

  /* 5회차 이전 상태로 돌아갔는지 한 번에 걸러내는 항목 — 그때는 전부 34~37 이었다. */
  const allW = Object.values(got).filter(Boolean).map((x) => x.w);
  const small = allW.filter((w) => w < 40).length;
  ok('«4회차 폰트 상수(--lf 24)» 로 회귀하지 않았다', small === 0,
    `폭 40px 미만인 라벨 ${small}칸 (4회차에는 2자 라벨이 전부 34~37 이었다)`);

  await browser.close();
  console.log(`\nM126LBL ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
