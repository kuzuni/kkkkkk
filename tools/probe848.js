#!/usr/bin/env node
/* 작업 848 재현 — `tools/verify414.js` 4건이 «수리 전부터» 빨간 이유를 가른다
 *   실행: node tools/probe848.js   → 마지막 줄이 `PROBE848 n/n PASS` 여야 한다.
 *
 * 등재문: «`verify414` 4건이 수리 전부터 빨갛다(27/31) — 기대 상수가 제품을 안 따라갔다 «버그(게이트 부패)»».
 * 338 규칙대로 처방 전에 재현한다. 빨간 넷은 전부 **1600(짧은 프레임) 세로 자리**다:
 *   [1-e] 스트립이 탭바를 덮는 값   기대 164 ↔ 실측 133
 *   [3-e] 블록이 «띠(142..1600) 한가운데»  기대 위≈아래 ↔ 실측 −16 / 47
 *   [3-f] 위가 HUD 잉크(142)를 안 문다     기대 ≥0     ↔ 실측 −16
 *   [3-g] ✕ 가 «HUD 바 ↔ 안내문» 슬롯 한가운데 기대 위≈아래>0 ↔ 실측 30 / −5
 *
 * 가르는 갈래는 둘이다:
 *   ⓐ **자 부패** — 이 팝업의 짧은 프레임 앵커 모드가 등재 이후 **일부러 두 번** 바뀌었고
 *      (754 7회차 «하단 정렬 → 중앙» · 821 «중앙 → 상단 가드 126»), 414 의 네 상수는
 *      그 **앞**(하단 정렬 · 블록 상변 157)의 스냅샷이다 ⇒ 제품 0줄, 자를 821 규약으로 다시 겨눈다.
 *   ⓑ **실재 회귀** — 앵커가 옮겨진 부작용으로 무엇인가가 **실제로 겹친다** ⇒ 제품을 고쳐야 한다.
 *
 * 그래서 이 자는 값을 «재는» 데서 끝내지 않고 **앵커 모드 세 걸음**을 같이 세운다([2]) —
 *   ① 하단 정렬(754 **이전**) : 상변 = frameH − pb − block = 1600 − 16 − 1427 = **157**
 *   ② 중앙(754 7회차)        : 상변 = 126 + (1600 − 126 − 16 − 1427)/2 = **141.5**
 *   ③ 상단 가드(821, 지금)   : 상변 = **126**
 * ①②는 산수로 검산하고 ②는 **821 한 줄을 뗀 사본**으로 실측까지 한다. 자의 기대치(157·164·15/16)는
 * ① 의 값이므로 «제품이 옳던 시절» 이 아니라 **754 가 «하단 정렬이라 결함» 이라고 못박은 모드**의
 * 스냅샷이다 — 그 사이 설계가 **두 번** 갈렸고 둘 다 자기 게이트(`verify821`·`verify826`)를 달고 있다.
 * ⚠ 754 의 줄은 826 이후 기본 규칙의 **사본**이라(index.html 15604 주석) 떼도 아무것도 안 움직인다 —
 *   그래서 ① 은 CSS 수술이 아니라 **산수**로 세운다.
 * 그리고 [3-g] 의 −5px 는 bbox 가 아니라 **픽셀**로 되묻는다([3]) — §3 의 자기 규약이
 * «가려지는 글자 0»([3-c])이므로 물어야 할 것은 «상자가 겹치나» 가 아니라 **«글자를 가리나»** 다.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };
const r1 = (n) => Math.round(n * 10) / 10;

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const SRC = fs.readFileSync(FILE, 'utf8');

/* 821 이 앵커를 옮긴 한 줄 — 못 찾으면 조용히 초록이 되지 않고 그렇게 말하고 죽는다(neg279 처방) */
const A821 = '#app.shortf #blsw .bls{margin-top:0}';
const A821_OFF = '#app.shortf #blsw .bls{}';
/* 짧은 프레임 아래 가드(351 ①) — 산수 검산의 입력. 값이 바뀌면 여기서 티가 난다. */
const PB_SHORT = 16;

const INK = 142;    /* HUD 잉크 끝 = `.pedge` 하변 (351 4회차) */

async function open(browser, file, H) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  await page.click('#sideL .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
  await page.waitForTimeout(700);
  return { ctx, page };
}

async function measure(browser, file, H) {
  const { ctx, page } = await open(browser, file, H);
  const m = await page.evaluate(() => {
    const app = document.getElementById('app');
    const A = app.getBoundingClientRect();
    const q = (s) => document.querySelector(s);
    const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { t: r.top - A.top, b: r.bottom - A.top, l: r.left - A.left, r: r.right - A.left, w: r.width, h: r.height }; };
    const w = document.getElementById('blsw');
    const tb = box(document.getElementById('tabbar'));
    const parts = [...w.children];
    const xEl = w.querySelector('.bls-x');
    if (xEl && !parts.includes(xEl)) parts.push(xEl);
    const kids = parts.map((e) => ({ c: (e.className || e.id || '?').toString().split(' ')[0], ...box(e) }));
    const flow = kids.filter((k) => k.c !== 'bls-x');
    return {
      frameH: A.height, shortf: app.classList.contains('shortf'), open: w.classList.contains('on'),
      inkEnd: q('.pedge') ? box(q('.pedge')).b : null,
      tabTop: tb.t,
      bls: box(q('#blsw .bls')), promo: box(q('#blsw .bls-promo')), x: box(q('#blsw .bls-x')),
      note: box(q('#blsw .bls-note')), top: box(document.getElementById('top')),
      flowTop: Math.min(...flow.map((k) => k.t)), flowBot: Math.max(...flow.map((k) => k.b)),
      coverPromo: Math.max(0, box(q('#blsw .bls-promo')).b - tb.t),
      scrollH: w.scrollHeight, clientH: w.clientHeight,
    };
  });
  await ctx.close();
  /* 414 의 네 축을 그대로 파생한다 */
  m.gTop = m.flowTop - INK;
  m.gBot = m.frameH - m.flowBot;
  m.xUp = m.x.t - m.top.b;
  m.xDn = m.note.t - m.x.b;
  m.band = m.tabTop - INK;
  m.block = m.flowBot - m.flowTop;
  return m;
}

/* [3] ✕ ↔ 안내문 — bbox 가 아니라 **잉크**로 되묻고, 잉크도 «알약 채움» 과 «글자» 를 가른다.
   네 장을 찍는다: A(그대로) · B(✕ 숨김) · C(✕·글자 숨김) · D(✕·알약 통째 숨김)
     ✕ 잉크        = A≠B
     그 아래 글자   = B≠C   ← §3 의 자기 규약([3-c] «가려지는 글자 0»)이 묻는 것
     그 아래 알약   = B≠D
   ⇒ (A≠B)∧(B≠C) 가 «✕ 가 글자를 덮은» 픽셀 · (A≠B)∧(B≠D) 가 «코너 채움까지 포함한» 픽셀이다. */
async function inkCollide(browser, file, H) {
  const { ctx, page } = await open(browser, file, H);
  const clip = await page.evaluate(() => {
    const A = document.getElementById('app').getBoundingClientRect();
    const x = document.querySelector('#blsw .bls-x').getBoundingClientRect();
    const n = document.querySelector('#blsw .bls-note').getBoundingClientRect();
    const l = Math.max(x.left, n.left), r = Math.min(x.right, n.right);
    const t = Math.max(x.top, n.top), b = Math.min(x.bottom, n.bottom);
    return { has: r > l && b > t, x: Math.round(l), y: Math.round(t),
      width: Math.max(1, Math.round(r - l)), height: Math.max(1, Math.round(b - t)),
      relX: Math.round(l - A.left), relY: Math.round(t - A.top) };
  });
  if (!clip.has) { await ctx.close(); return { has: false, both: 0, xInk: 0, noteInk: 0, clip }; }
  const shot = async () => (await page.screenshot({ clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height } })).toString('base64');
  const a = await shot();
  await page.evaluate(() => { document.querySelector('#blsw .bls-x').style.visibility = 'hidden'; });
  await page.waitForTimeout(120);
  const b = await shot();
  const hasTxt = await page.evaluate(() => {
    const t = document.querySelector('#blsw .bls-note>i');
    if (!t) return false;
    t.style.visibility = 'hidden'; return true;
  });
  await page.waitForTimeout(120);
  const c = await shot();
  await page.evaluate(() => {
    const t = document.querySelector('#blsw .bls-note>i');
    if (t) t.style.visibility = '';
    document.querySelector('#blsw .bls-note').style.visibility = 'hidden';
  });
  await page.waitForTimeout(120);
  const d = await shot();
  const res = await page.evaluate(async ([da, db, dc, dd, w, h]) => {
    const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; });
    const [ia, ib, ic, id] = await Promise.all([load(da), load(db), load(dc), load(dd)]);
    const px = (im) => { const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(im, 0, 0); return c.getContext('2d').getImageData(0, 0, w, h).data; };
    const A = px(ia), B = px(ib), C = px(ic), D = px(id);
    const dif = (P, Q, i) => (P[i] !== Q[i] || P[i + 1] !== Q[i + 1] || P[i + 2] !== Q[i + 2]);
    let xInk = 0, txtInk = 0, pillInk = 0, overTxt = 0, overPill = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const cx = dif(A, B, i), ct = dif(B, C, i), cp = dif(B, D, i);
      if (cx) xInk++;
      if (ct) txtInk++;
      if (cp) pillInk++;
      if (cx && ct) overTxt++;
      if (cx && cp) overPill++;
    }
    return { xInk, txtInk, pillInk, overTxt, overPill, total: w * h };
  }, ['data:image/png;base64,' + a, 'data:image/png;base64,' + b, 'data:image/png;base64,' + c,
    'data:image/png;base64,' + d, clip.width, clip.height]);
  await ctx.close();
  return { has: true, clip, hasTxt, ...res };
}

(async () => {
  if (!SRC.includes(A821)) {
    console.error(`probe848: «821 상단 가드 앵커» 자리(\`${A821}\`)를 못 찾았다 — 갈아 끼울 앵커가 옮겨졌다. 갱신할 것.`);
    process.exit(2);
  }
  /* 한 걸음(821)을 되돌린 사본 — 지금의 상변이 «가드에 붙인 것» 임을 실측으로 가른다 */
  const tmp821 = path.join(os.tmpdir(), 'probe848-no821.html');
  fs.writeFileSync(tmp821, SRC.replace(A821, A821_OFF));

  const browser = await launch(chromium);
  const now = await measure(browser, FILE, 1600);
  const mid = await measure(browser, tmp821, 1600);
  const now2280 = await measure(browser, FILE, 2280);
  const mid2280 = await measure(browser, tmp821, 2280);
  const col = await inkCollide(browser, FILE, 1600);
  const colMid = await inkCollide(browser, tmp821, 1600);
  await browser.close();

  /* 앵커 모드 세 걸음의 상변 — ② 만 실측이 있고 ①③ 은 산수다(위 머리말) */
  const topBottom = now.frameH - PB_SHORT - now.block;          /* ① 하단 정렬 = 754 이전 */
  const topCenter = 126 + (now.frameH - 126 - PB_SHORT - now.block) / 2;  /* ② 중앙 = 754 7회차 */
  const coverAt = (t) => t + now.block - now.tabTop;             /* 그 상변에서의 덮임 */

  const line = (t, m) => console.log(`  ${t} │ 블록 ${r1(m.flowTop)}..${r1(m.flowBot)} │ 덮임 ${r1(m.coverPromo)} │ `
    + `위/아래 ${r1(m.gTop)}/${r1(m.gBot)} │ ✕ ${r1(m.x.t)}..${r1(m.x.b)} │ 안내문 상변 ${r1(m.note.t)} │ ✕ 위/아래 ${r1(m.xUp)}/${r1(m.xDn)}`);

  console.log('\n§1 재현 — 1600 에서 verify414 의 네 축을 직접 잰다 ─────────────');
  line('현재         ', now);
  line('821 뺀 사본  ', mid);
  ok(now.open && now.shortf && now.inkEnd === INK,
    `[1-a] 팝업이 열리고 축이 제자리 — shortf ${now.shortf} · 잉크 ${now.inkEnd}`);
  ok(Math.round(now.coverPromo) === 133,
    `[1-b] [1-e] 재현 — 덮임 ${r1(now.coverPromo)}px (자의 기대 164)`);
  ok(Math.round(now.gTop) === -16 && Math.round(now.gBot) === 47,
    `[1-c] [3-e]·[3-f] 재현 — 위 ${r1(now.gTop)} · 아래 ${r1(now.gBot)} (자의 기대 위≈아래 · 둘 다 ≥0)`);
  ok(Math.round(now.xUp) === 30 && Math.round(now.xDn) === -5,
    `[1-d] [3-g] 재현 — ✕ 위 ${r1(now.xUp)} · 아래 ${r1(now.xDn)} (자의 기대 위≈아래 · 둘 다 >0)`);

  console.log('\n§2 갈래 — 네 상수는 «앵커 모드 한 뿌리» 이고, 그 모드가 두 번 갈렸다 ──');
  console.log(`  앵커 세 걸음의 상변 │ ① 하단(754 이전) ${r1(topBottom)} → ② 중앙(754) ${r1(topCenter)} → ③ 가드(821·지금) ${r1(now.flowTop)}`
    + ` │ 그때의 덮임 ${r1(coverAt(topBottom))} → ${r1(coverAt(topCenter))} → ${r1(now.coverPromo)}`);
  ok(Math.round(now.block) === Math.round(mid.block) && Math.round(now.block) === 1427,
    `[2-a] **블록 자체는 한 픽셀도 안 변했다** — ${r1(now.block)} = ${r1(mid.block)} ⇒ 움직인 것은 크기가 아니라 **앵커**다`);
  ok(Math.round(now.flowTop) === 126,
    `[2-b] 지금의 상변은 **상단 가드 126** 이다(821 규약 · verify351 [1-g] 와 같은 값) — ${r1(now.flowTop)}`);
  ok(Math.abs(mid.flowTop - topCenter) < 0.6,
    `[2-c] 821 한 줄을 떼면 **754 의 중앙 정렬**로 돌아간다 — 실측 ${r1(mid.flowTop)} = 산수 ${r1(topCenter)} `
    + `⇒ 지금의 126 은 «중앙» 이 아니라 일부러 가드에 붙인 값이다`);
  /* ⚠ 이 두 항이 이 자의 핵심이다 — 자의 상수가 «옛 제품이 옳던 시절» 이 아니라
     **754 가 «하단 정렬이라 결함» 이라고 못박은 그 모드**의 값임을 산수로 못박는다. */
  ok(Math.round(topBottom) === 157,
    `[2-d] 자의 기대치가 서 있던 자리는 **하단 정렬**이다 — frameH ${now.frameH} − 아래 가드 ${PB_SHORT} − 블록 ${r1(now.block)} = **${r1(topBottom)}** `
    + `(414 주석의 «위 15 ↔ 아래 16» 과 같은 상변) ⇒ 754 7회차가 «하단 정렬 = 결함» 이라고 못박은 그 모드다`);
  ok(Math.round(coverAt(topBottom)) === 164,
    `[2-e] 그 상변에서의 덮임이 **자의 기대 164** 다 — ${r1(coverAt(topBottom))}px ⇒ [1-e] 의 상수는 ① 걸음의 스냅샷이다`);
  ok(Math.round(coverAt(topBottom) - now.coverPromo) === Math.round(topBottom - now.flowTop),
    `[2-f] 덮임의 차 ${r1(coverAt(topBottom) - now.coverPromo)} = 상변의 차 ${r1(topBottom - now.flowTop)} `
    + `⇒ [1-e]·[3-e]·[3-f] 는 **한 값(상변)의 세 얼굴**이다 — 따로 재겨눌 것이 아니라 같이 겨눈다`);
  ok(Math.round(now2280.bls.t) === Math.round(mid2280.bls.t) && Math.round(now2280.bls.t) === 345,
    `[2-g] **음성항** — 긴 프레임(2280)은 821 이 있으나 없으나 같다 (bls 상변 ${r1(now2280.bls.t)} = ${r1(mid2280.bls.t)}) `
    + `⇒ 821 은 .shortf 전용이고 자의 빨강도 1600 에만 있다`);

  console.log('\n§3 [3-g] 의 −5px — §3 의 자기 규약(«가려지는 글자 0»)으로 되묻는다 ──');
  console.log(`  겹침 사각형 ${col.has ? `${col.clip.width}×${col.clip.height} @(${col.clip.relX},${col.clip.relY})` : '없음'}`
    + (col.has ? ` │ ✕ 잉크 ${col.xInk} │ 그 아래 글자 ${col.txtInk} · 알약 ${col.pillInk} │ `
      + `**✕ 가 덮은 글자 ${col.overTxt} · 알약 코너 ${col.overPill}**` : ''));
  ok(col.has, `[3-a] bbox 는 실제로 겹친다 — ${col.has ? `${col.clip.width}×${col.clip.height}` : '겹침 없음'} (자가 잰 −5px 의 실체)`);
  ok(col.hasTxt && col.txtInk === 0,
    `[3-b] **그 띠에는 글자가 애초에 없다** — 겹침 사각형 안 안내문 «글자» 잉크 ${col.txtInk}px `
    + `(글자 노드는 있다: ${col.hasTxt}) ⇒ 겹치는 것은 알약의 둥근 코너 **채움**뿐이다`);
  ok(col.overTxt === 0,
    `[3-c] ⇒ **✕ 가 가리는 글자 0px** — §3 [3-c]«가려지는 글자 0» 과 같은 자 · 알약 코너 채움만 ${col.overPill}px`);
  ok(colMid.overTxt === col.overTxt && Math.round(colMid.clip.height) === Math.round(col.clip.height),
    `[3-d] **음성항** — 821 을 떼도 이 겹침은 그대로다(글자 ${colMid.overTxt} · 높이 ${r1(colMid.clip.height)}) `
    + `⇒ −5px 는 821 이 만든 것이 아니라 **826 이 ✕ 를 그릇 자식으로 옮기며 굳은 상수 관계**다`);

  const fixed = fail === 0;
  console.log(`\n판정 — ${fixed ? '갈래 ⓐ **자 부패** 확정: 제품 0줄, 네 상수를 821·826 규약으로 다시 겨눈다'
    : '갈래 미확정 — 위 실패 항을 먼저 읽어라'}`);
  console.log(`\nPROBE848 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
