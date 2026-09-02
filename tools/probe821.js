#!/usr/bin/env node
/* 재현기 — 작업 821 「34 축복 팝업이 `.shortf` 경계(1842)에서 그릇 위치가 계단으로 튄다」
 *
 *   node tools/probe821.js
 *
 * 338·341·402·414 규칙: **처방을 따르기 전에 재현한다.** 이 자는 제품을 안 고친다 — 값만 찍는다.
 * 세 트리를 같은 자로 재서 나란히 놓는다:
 *
 *   [1] 수리 전 — 821 의 한 줄(`#app.shortf #blsw .bls{margin-top:0}`)을 뗀 사본.
 *       등재문이 «32.5px» 이라고 적은 그 계단이 **인접 프레임에서는 얼마인가** 를 잰다.
 *   [2] 지금 트리 — 계단이 정말 0 인가.
 *   [3] **등재문의 처방 사본** — «조건을 1842 → 1712 로 좁힌다» 를 그대로 만든 트리
 *       (축복 팝업의 `.shortf` 세 규칙만 `.shortf2`(frameH < 1712) 로 옮긴다).
 *       등재문은 이것으로 «계단이 사라진다» 고 적었다. 그 문장을 픽셀로 되묻는다.
 *
 * 왜 [3] 이 이 재현의 본체인가: 계단을 만드는 것은 «✕ 가 흐름에 있나» 가 아니라
 * «✕ 가 비운 143px 을 auto 둘이 반씩 먹나» 다. 그렇다면 문턱을 옮겨도 계단은 자리만 옮긴다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'index.html');

/* 821 이 넣은 한 줄. 못 찾으면 조용히 초록이 되지 않고 그렇게 말하고 죽는다(neg279·probe423 처방). */
const FIX = '  #app.shortf #blsw .bls{margin-top:0}\n';
/* 등재문이 «같이 옮겨야 한다» 고 지목한 세 자리(351 ✕ 코너 · 754 auto 물림 · 423 스트립 닫힘). */
const R_X = '  #app.shortf .bls-x{position:absolute;top:134px;right:45px;margin:0}';
const R_PROMO = '  #app.shortf #blsw .bls-promo{margin-bottom:auto}';
const R_PE = '  #app.shortf #blsw .bls-promo{pointer-events:none}\n  #app.shortf #blsw .bls-promo>.gb{pointer-events:auto}';
const TOGGLE = "  app.classList.toggle('shortf', frameH < 1842);";

function src() {
  const s = fs.readFileSync(SRC, 'utf8');
  for (const [n, k] of [['FIX', FIX], ['R_X', R_X], ['R_PROMO', R_PROMO], ['R_PE', R_PE], ['TOGGLE', TOGGLE]]) {
    if (!s.includes(k)) {
      console.error(`probe821: «${n}» 자리를 못 찾았다 — 821·351·423 의 규칙이 바뀌었다. 자를 고쳐라.`);
      process.exit(3);
    }
  }
  return s;
}
function tmp(name, text) {
  const f = path.join(os.tmpdir(), 'probe821-' + name + '.html');
  fs.writeFileSync(f, text);
  return 'file://' + f;
}

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const r1 = (n) => Math.round(n * 10) / 10;

/* 인접한 두 프레임을 골랐다 — 계단은 «1841 ↔ 1920» 이 아니라 **경계를 사이에 둔 1px 차이**에서 잰다. */
const SWEEP = [1600, 1660, 1700, 1711, 1712, 1750, 1800, 1841, 1842, 1843, 1900, 1920, 2000, 2280, 2600];

async function measure(browser, url, hs) {
  const out = {};
  for (const H of hs) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.click('#sideL .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
    await page.waitForTimeout(500);
    out[H] = await page.evaluate(() => {
      const el = document.getElementById('app');
      const app = el.getBoundingClientRect();
      const w = document.getElementById('blsw');
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
        return { t: r.top - app.top, b: r.bottom - app.top, l: r.left - app.left, r: r.right - app.left }; };
      return { frameH: Math.round(app.height), shortf: el.classList.contains('shortf'),
        shortf2: el.classList.contains('shortf2'),
        bls: box('.bls'), x: box('.bls-x'), promo: box('.bls-promo'),
        over: w ? (w.scrollHeight - w.clientHeight) : null };
    });
    out[H].errs = errs;
    await ctx.close();
  }
  return out;
}

/* 인접 쌍의 «계단» — 1842 위쪽 기울기는 (Δ프레임)/2 가 정당하므로 그만큼은 빼고 잰다. */
function steps(M) {
  const hs = Object.keys(M).map(Number).sort((a, b) => a - b);
  let worst = { d: -1 };
  const rows = [];
  for (let i = 1; i < hs.length; i++) {
    const a = M[hs[i - 1]], b = M[hs[i]];
    if (hs[i] - hs[i - 1] > 1) continue;          /* 1px 이웃만 «경계» 다 */
    const d = Math.abs(b.bls.t - a.bls.t);
    rows.push(`${hs[i - 1]}→${hs[i]} ${r1(a.bls.t)}→${r1(b.bls.t)} (Δ${r1(b.bls.t - a.bls.t)})`);
    if (d > worst.d) worst = { d, from: hs[i - 1], to: hs[i], a: a.bls.t, b: b.bls.t };
  }
  return { worst, rows };
}

(async () => {
  const S = src();
  const browser = await launch(chromium);
  console.log('== probe821 — 34 축복 팝업 그릇 상변의 프레임 곡선 ==\n');

  /* ---- [1] 수리 전 ---- */
  const before = await measure(browser, tmp('before', S.replace(FIX, '')), SWEEP);
  console.log('[1] 수리 전 — `.bls` 상변');
  console.log('    ' + SWEEP.map((h) => `${h}:${r1(before[h].bls.t)}`).join(' · '));
  const sB = steps(before);
  ok(sB.worst.d > 60,
    '[1-a] 수리 전에는 경계에 **계단**이 있다',
    `가장 큰 인접 계단 ${sB.worst.from}→${sB.worst.to} : ${r1(sB.worst.a)} → ${r1(sB.worst.b)} = ${r1(sB.worst.d)}px`);
  ok(r1(before[1841].bls.t) === 197.5 && r1(before[1842].bls.t) === 126,
    '[1-b] 계단은 `.shortf` 경계(1841↔1842)에 있다',
    `1841 ${r1(before[1841].bls.t)} ↔ 1842 ${r1(before[1842].bls.t)}`);
  ok(r1(Math.abs(before[1841].bls.t - before[1920].bls.t)) === 32.5,
    '[1-c] 등재문의 «32.5px» 은 1841 을 **인접하지 않은** 1920 과 견준 값이다',
    `1841 ${r1(before[1841].bls.t)} ↔ 1920 ${r1(before[1920].bls.t)} = 32.5 · 실제 불연속은 ${r1(sB.worst.d)}`);
  ok(before[1600].over <= 1 && before[1841].over <= 1,
    '[1-d] 수리 전에도 블록은 프레임에 들어온다(351 이 회수한 뒤라 넘침이 아니다)',
    `1600 넘침 ${before[1600].over} · 1841 넘침 ${before[1841].over}`);

  /* ---- [2] 지금 트리 ---- */
  const now = await measure(browser, 'file://' + SRC, SWEEP);
  console.log('\n[2] 지금 트리 — `.bls` 상변');
  console.log('    ' + SWEEP.map((h) => `${h}:${r1(now[h].bls.t)}`).join(' · '));
  const sN = steps(now);
  ok(sN.worst.d <= 0.6, '[2-a] 지금은 경계 계단이 0 이다',
    `가장 큰 인접 계단 ${sN.worst.from}→${sN.worst.to} = ${r1(sN.worst.d)}px`);
  ok(SWEEP.filter((h) => h <= 1842).every((h) => Math.abs(now[h].bls.t - 126) < 0.6),
    '[2-b] 1842 이하는 상변이 상단 가드 126 에 붙는다',
    SWEEP.filter((h) => h <= 1842).map((h) => `${h}:${r1(now[h].bls.t)}`).join(' '));
  ok([[1920, 165], [2280, 345], [2600, 505]].every(([h, v]) => Math.abs(now[h].bls.t - v) < 0.6),
    '[2-c] 긴 프레임은 Δ0px — 선언이 안 붙는다',
    `1920 ${r1(now[1920].bls.t)} · 2280 ${r1(now[2280].bls.t)} · 2600 ${r1(now[2600].bls.t)}`);

  /* ---- [3] 등재문의 처방(문턱 1842 → 1712) ---- */
  const moved = S.replace(FIX, '')
    .replace(R_X, R_X.replace('#app.shortf ', '#app.shortf2 '))
    .replace(R_PROMO, R_PROMO.replace('#app.shortf ', '#app.shortf2 '))
    .replace(R_PE, R_PE.split('\n').map((l) => l.replace('#app.shortf ', '#app.shortf2 ')).join('\n'))
    .replace(TOGGLE, TOGGLE + "\n  app.classList.toggle('shortf2', frameH < 1712);");
  const mv = await measure(browser, tmp('moved', moved), SWEEP);
  console.log('\n[3] 등재문 처방(문턱 1712) — `.bls` 상변');
  console.log('    ' + SWEEP.map((h) => `${h}:${r1(mv[h].bls.t)}`).join(' · '));
  const sM = steps(mv);
  ok(mv[1711].shortf2 === true && mv[1712].shortf2 === false,
    '[3-a] 사본이 정말 문턱 1712 로 돈다', `1711 shortf2 ${mv[1711].shortf2} · 1712 ${mv[1712].shortf2}`);
  ok(Math.abs(mv[1841].bls.t - mv[1842].bls.t) < 0.6,
    '[3-b] 1842 의 계단은 사라진다 — 등재문이 본 것은 여기까지다',
    `1841 ${r1(mv[1841].bls.t)} ↔ 1842 ${r1(mv[1842].bls.t)}`);
  ok(sM.worst.d > 60,
    '[3-c] ⚑ **그러나 같은 크기의 계단이 1712 로 자리만 옮긴다** — 문턱 이동은 답이 아니다',
    `${sM.worst.from}→${sM.worst.to} : ${r1(sM.worst.a)} → ${r1(sM.worst.b)} = ${r1(sM.worst.d)}px (수리 전 ${r1(sB.worst.d)}px)`);
  ok(mv[1750].shortf === true && mv[1750].shortf2 === false,
    '[3-d] 게다가 1712~1841 은 «✕ 는 흐름에 · `.shortf` 는 켜진» 구멍이 된다 — 423 짝이 갈린다',
    `1750 shortf ${mv[1750].shortf} / shortf2 ${mv[1750].shortf2} · ✕ 상변 ${r1(mv[1750].x.t)}`);

  /* ---- 콘솔 에러 ---- */
  const allErrs = [...SWEEP.map((h) => now[h].errs)].flat();
  ok(allErrs.length === 0, '[4] 콘솔 런타임 에러 0건', allErrs.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nPROBE821 ${fail === 0 ? 'PASS' : 'FAIL'} ${pass}/${pass + fail}`);
  process.exit(fail === 0 ? 0 : 1);
})();
