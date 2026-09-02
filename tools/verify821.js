#!/usr/bin/env node
/* 게이트 — 작업 821 「34 축복 팝업 그릇(`.bls`)의 프레임 곡선이 `.shortf` 경계에서 끊기지 않는다」
 *
 *   node tools/verify821.js
 *
 * 지키는 약속 셋:
 *   §1 연속 — 인접 프레임 사이 상변 이동이 «정당한 기울기»(긴 프레임의 중앙 정렬 = Δ프레임 ÷ 2)를 안 넘는다.
 *   §2 자리 — 1842 이하는 상단 가드 126 · 그 위는 126 + (frameH − 1842)/2. 긴 프레임 3종은 Δ0px.
 *   §3 짝  — 821 은 `.shortf` 문턱(1842)을 **안 옮겼다**: ✕ 가 코너로 가는 프레임과 423 의
 *            «스트립이 닫는다» 가 여전히 같은 조건에 묶여 있다(둘이 갈리면 «나가는 길» 이 사라진다).
 *   §R 되돌림 시험 — 무르게 푼 수리가 아님을 못박는다. 821 의 한 줄을 뗀 사본에서 계단이 되살아나고,
 *            등재문의 처방(문턱 1842 → 1712) 사본에서도 **같은 크기의 계단이 자리만 옮긴다**.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'index.html');
const FIX = '  #app.shortf #blsw .bls{margin-top:0}\n';
const R_X = '  #app.shortf .bls-x{position:absolute;top:134px;right:45px;margin:0}';
const R_PROMO = '  #app.shortf #blsw .bls-promo{margin-bottom:auto}';
const R_PE = '  #app.shortf #blsw .bls-promo{pointer-events:none}\n  #app.shortf #blsw .bls-promo>.gb{pointer-events:auto}';
const TOGGLE = "  app.classList.toggle('shortf', frameH < 1842);";

let pass = 0, fail = 0;
const ok = (m, d) => { pass++; console.log('  ok  ' + m + (d ? ' — ' + d : '')); };
const no = (m, d) => { fail++; console.log('FAIL  ' + m + (d ? ' — ' + d : '')); };
const t = (c, m, d) => (c ? ok(m, d) : no(m, d));
const r1 = (n) => Math.round(n * 10) / 10;
const eq = (m, got, want, tol) => t(Math.abs(got - want) <= (tol === undefined ? 0.6 : tol), m, `${r1(got)} (기대 ${want})`);

function src() {
  const s = fs.readFileSync(SRC, 'utf8');
  for (const [n, k] of [['821 한 줄', FIX], ['351 ✕ 코너', R_X], ['754 auto', R_PROMO], ['423 스트립', R_PE], ['shortf 토글', TOGGLE]]) {
    if (!s.includes(k)) { console.error(`verify821: «${n}» 자리를 못 찾았다. 자를 고쳐라.`); process.exit(3); }
  }
  return s;
}
function tmp(name, text) {
  const f = path.join(os.tmpdir(), 'verify821-' + name + '.html');
  fs.writeFileSync(f, text);
  return 'file://' + f;
}

/* 경계를 사이에 둔 1px 이웃이 있어야 «계단» 을 잴 수 있다. */
const SWEEP = [1600, 1711, 1712, 1841, 1842, 1843, 1920, 2280, 2600];

async function measure(browser, url, hs) {
  const out = {};
  for (const H of hs) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    await page.click('#sideL .ibtn[data-pop="bless"]', { force: true }).catch(() => {});
    await page.waitForTimeout(450);
    out[H] = await page.evaluate(() => {
      const el = document.getElementById('app');
      const app = el.getBoundingClientRect();
      const w = document.getElementById('blsw');
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
        return { t: r.top - app.top, b: r.bottom - app.top, l: r.left - app.left, r: r.right - app.left }; };
      return { frameH: Math.round(app.height), shortf: el.classList.contains('shortf'), open: w.classList.contains('on'),
        bls: box('.bls'), x: box('.bls-x'), promo: box('.bls-promo'),
        over: w.scrollHeight - w.clientHeight,
        promoPE: getComputedStyle(document.querySelector('.bls-promo')).pointerEvents };
    });
    out[H].errs = errs;
    await ctx.close();
  }
  return out;
}

/* 인접 1px 이웃의 계단 중 가장 큰 것 */
function worstStep(M) {
  const hs = Object.keys(M).map(Number).sort((a, b) => a - b);
  let w = { d: -1 };
  for (let i = 1; i < hs.length; i++) {
    if (hs[i] - hs[i - 1] > 1) continue;
    const d = Math.abs(M[hs[i]].bls.t - M[hs[i - 1]].bls.t);
    if (d > w.d) w = { d, from: hs[i - 1], to: hs[i], a: M[hs[i - 1]].bls.t, b: M[hs[i]].bls.t };
  }
  return w;
}

(async () => {
  const S = src();
  const browser = await launch(chromium);
  console.log('== VERIFY821 — 34 축복 팝업 그릇의 프레임 연속성 ==\n');
  const M = await measure(browser, 'file://' + SRC, SWEEP);

  t(SWEEP.every((h) => M[h].open && M[h].bls), '[0] 아홉 프레임 모두 축복 팝업이 열린다',
    SWEEP.map((h) => h + (M[h].open ? '✓' : '✗')).join(' '));

  /* ---- §1 연속 ---- */
  console.log('\n§1 연속 — `.bls` 상변');
  console.log('    ' + SWEEP.map((h) => `${h}:${r1(M[h].bls.t)}`).join(' · '));
  const w = worstStep(M);
  t(w.d <= 0.6, '[1-a] `.shortf` 경계에 계단이 없다',
    `가장 큰 인접 계단 ${w.from}→${w.to} : ${r1(w.a)} → ${r1(w.b)} = ${r1(w.d)}px`);
  /* 전 구간 단조 비감소 — «짧을수록 위» 가 뒤집히면(역주행) 754 가 고친 병이 되돌아온 것이다. */
  const hs = SWEEP.slice().sort((a, b) => a - b);
  const mono = hs.every((h, i) => i === 0 || M[h].bls.t >= M[hs[i - 1]].bls.t - 0.6);
  t(mono, '[1-b] 프레임이 길수록 상변이 내려가지 않는다(754 역주행 회귀)',
    hs.map((h) => `${h}:${r1(M[h].bls.t)}`).join(' '));
  /* 기울기 상한 — 1842 위는 중앙 정렬이라 Δ프레임의 정확히 절반이다. */
  eq('[1-c] 1842→1843 기울기 = Δ프레임 ÷ 2', M[1843].bls.t - M[1842].bls.t, 0.5);
  eq('[1-d] 1920→2280 기울기 = Δ프레임 ÷ 2', M[2280].bls.t - M[1920].bls.t, 180);

  /* ---- §2 자리 ---- */
  console.log('\n§2 자리');
  for (const h of [1600, 1711, 1712, 1841, 1842]) eq(`[2-a:${h}] 상변이 상단 가드 126`, M[h].bls.t, 126);
  eq('[2-b] 1920 상변(9:16 — 선언 밖)', M[1920].bls.t, 165);
  eq('[2-c] 2280 상변(기준 9:19 — 선언 밖)', M[2280].bls.t, 345);
  eq('[2-d] 2600 상변(선언 밖)', M[2600].bls.t, 505);
  t(SWEEP.every((h) => M[h].over <= 1), '[2-e] 전 프레임에서 블록이 프레임에 들어온다(351 회수분 유지)',
    SWEEP.map((h) => `${h}:${M[h].over}`).join(' '));
  t(SWEEP.every((h) => M[h].x.t >= 0 && M[h].x.b <= M[h].frameH + 0.6),
    '[2-f] 전 프레임에서 ✕ 가 프레임 안', SWEEP.map((h) => `${h}:${r1(M[h].x.t)}..${r1(M[h].x.b)}`).join(' '));
  t(M[1600].x.t >= 126 - 0.6, '[2-g] 1600 ✕ 가 HUD 가드(126) 아래', `top ${r1(M[1600].x.t)}`);

  /* ---- §3 짝(351·423 과 같은 문턱) ---- */
  console.log('\n§3 짝 — `.shortf` 문턱은 1842 그대로');
  t(M[1841].shortf === true && M[1842].shortf === false,
    '[3-a] 문턱이 1842 다(821 은 문턱을 안 옮겼다)', `1841 ${M[1841].shortf} · 1842 ${M[1842].shortf}`);
  t(M[1600].x.t < M[1600].bls.t + 60 && M[1712].x.t < M[1712].bls.t + 60,
    '[3-b] 짧은 프레임에서 ✕ 는 팝업 우상단 코너(351)',
    `1600 ✕ ${r1(M[1600].x.t)} / .bls ${r1(M[1600].bls.t)} · 1712 ✕ ${r1(M[1712].x.t)}`);
  t(M[1842].x.t > M[1842].promo.b && M[1920].x.t > M[1920].promo.b,
    '[3-c] 긴 프레임에서 ✕ 는 흐름 그대로(스트립 아래)',
    `1842 ✕ ${r1(M[1842].x.t)} > 스트립 하변 ${r1(M[1842].promo.b)}`);
  t(SWEEP.every((h) => (M[h].promoPE === 'none') === M[h].shortf),
    '[3-d] 423 의 «스트립이 닫는다» 가 ✕ 와 **같은 프레임**에서만 켜진다',
    SWEEP.map((h) => `${h}:${M[h].shortf ? 'shortf' : '-'}/${M[h].promoPE}`).join(' '));

  /* ---- §R 되돌림 시험 ---- */
  console.log('\n§R 되돌림 시험');
  const RH = [1841, 1842, 1711, 1712, 1920, 2280];
  const R1 = await measure(browser, tmp('revert', S.replace(FIX, '')), RH);
  const w1 = worstStep(R1);
  t(w1.d > 60, '[R-a] 821 의 한 줄을 빼면 경계 계단이 되살아난다',
    `${w1.from}→${w1.to} : ${r1(w1.a)} → ${r1(w1.b)} = ${r1(w1.d)}px`);
  t(Math.abs(R1[1920].bls.t - M[1920].bls.t) < 0.6 && Math.abs(R1[2280].bls.t - M[2280].bls.t) < 0.6,
    '[R-b] 되돌려도 긴 프레임은 같다 — 이 한 줄은 `.shortf` 안에서만 산다',
    `1920 ${r1(R1[1920].bls.t)} · 2280 ${r1(R1[2280].bls.t)}`);

  const moved = S.replace(FIX, '')
    .replace(R_X, R_X.replace('#app.shortf ', '#app.shortf2 '))
    .replace(R_PROMO, R_PROMO.replace('#app.shortf ', '#app.shortf2 '))
    .replace(R_PE, R_PE.split('\n').map((l) => l.replace('#app.shortf ', '#app.shortf2 ')).join('\n'))
    .replace(TOGGLE, TOGGLE + "\n  app.classList.toggle('shortf2', frameH < 1712);");
  const R2 = await measure(browser, tmp('moved', moved), RH);
  const w2 = worstStep(R2);
  t(w2.d > 60,
    '[R-c] 등재문의 처방(문턱 1842 → 1712)으로는 계단이 **자리만 옮긴다**',
    `${w2.from}→${w2.to} : ${r1(w2.a)} → ${r1(w2.b)} = ${r1(w2.d)}px`);
  t(Math.abs(R2[1841].bls.t - R2[1842].bls.t) < 0.6,
    '[R-d] (그 사본에서 1842 의 계단이 사라지는 것 자체는 맞다 — 등재문이 본 데까지)',
    `1841 ${r1(R2[1841].bls.t)} ↔ 1842 ${r1(R2[1842].bls.t)}`);

  const errs = SWEEP.map((h) => M[h].errs).flat();
  t(errs.length === 0, '[4] 콘솔 런타임 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\nVERIFY821 ${fail === 0 ? 'PASS' : 'FAIL'} ${pass}/${pass + fail}`);
  process.exit(fail === 0 ? 0 : 1);
})();
