#!/usr/bin/env node
/* 834 재현 — 20 종합스탯의 칭호 칩이 «장착 칭호» 를 안 보여준다
 *
 *   node tools/probe834.js            수리 후 트리(초록이어야 한다)
 *   node tools/probe834.js --pre      «수리 전» 을 흉내 낸다(20 의 칩을 손 문자열로 되돌려 놓고 잰다)
 *
 * 338 규칙 — 처방을 따르기 전에 **주인이 본 그림**을 먼저 찍는다. 등재문(PROGRESS 834)의 가설은
 *   ⓐ 19 는 `$('pfTtl').textContent = titleOf().n` 으로 그린다
 *   ⓑ 20 은 같은 칩을 마크업에 손으로 적어 두고(«칭호 없음») 갱신하는 코드가 아예 없다
 * 이고, 이 자는 그 둘을 **화면에서** 확인한다 — 소스 grep 이 아니라 두 팝업을 실제로 열어
 * 칩 문자열을 읽는다(그래야 «갱신 경로가 있는데 안 도는» 경우까지 갈린다).
 *
 * 재현 절차: 칭호 여러 개를 보유시키고 → 19 에서 «골드» 를 장착 → 20 으로 탭을 갈아탄다.
 *   수리 전:  19 «골드»  ·  20 «칭호 없음»   ← [R1] 이 빨강
 *   수리 후:  19 «골드»  ·  20 «골드»
 */
const path = require('path');
const fs = require('fs');
const { chromium } = (() => {
  try { return require('playwright'); } catch (_) {}
  const os = require('os');
  const roots = [path.join(os.homedir(), '.npm', '_npx'), path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx')];
  for (const root of roots) {
    let dirs = []; try { dirs = fs.readdirSync(root); } catch (_) { continue; }
    for (const d of dirs) { const p = path.join(root, d, 'node_modules', 'playwright'); if (fs.existsSync(p)) return require(p); }
  }
  console.error('playwright 를 찾을 수 없다'); process.exit(2);
})();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const PRE = process.argv.includes('--pre');
let pass = 0, fail = 0;
const ok = (m, cond, detail) => {
  if (cond) { pass++; console.log('  ✓ ' + m + (detail ? '  — ' + detail : '')); }
  else { fail++; console.log('  ✗ ' + m + (detail ? '  — ' + detail : '')); }
};

function launchOpts(){
  for (const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean))
    { try { if (fs.existsSync(p)) return { executablePath: p }; } catch (_) {} }
  return {};
}

/* 20 의 칩 라벨 — id 가 붙었으면 그것으로, 아니면 마크업 자리(`.spc-rib>b>i`)로 읽는다.
   ⚠ 두 갈래를 다 두는 이유: 이 자는 «수리 전» 도 재야 하고, 수리 전에는 id 가 없다. */
const CHIP20 = '#specw .spc-rib > b > i';
const CHIP19 = '#pfTtl';

(async () => {
  const browser = await chromium.launch(Object.assign({ args: ['--no-sandbox'] }, launchOpts()));
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.evaluate(() => { if (typeof closeOfflineReward === 'function') closeOfflineReward(); });

  /* --pre — 수리를 되돌린 상태를 만든다: 20 의 칩을 손 문자열로 굳혀 놓고 재갱신 경로를 끊는다.
     («수리 전 사본을 고정 SHA 로 꺼내기» 는 얕은 클론에서 창 밖이면 못 판다 — 756. 이 자는
      제품 함수 한 곳만 감싸므로 SHA 가 필요 없다.) */
  if (PRE) await page.evaluate(sel => {
    const el = document.querySelector(sel);
    const orig = window.renderSpec;
    window.renderSpec = function(){ const r = orig.apply(this, arguments); if (el) el.textContent = '칭호 없음'; return r; };
  }, CHIP20);

  console.log('[0] 무대 — 칭호를 보유시키고 19 에서 «골드» 를 장착한다' + (PRE ? '  (--pre: 수리 전 흉내)' : ''));
  const stage = await page.evaluate(() => {
    step = () => {};
    S.rank = 0;                                   /* 폴백(계급)과 장착값이 **다른** 자리를 고른다 */
    S.titles = { 0:1, 1:1, 2:1 };                 /* 브론즈·실버·골드 보유 */
    S.titleEq = null;
    save();
    openProfile();
    const before = ($('pfTtl') || {}).textContent;
    const changed = titleEquip(2);                /* 골드 */
    return { before, changed, want: RANKS[2].n, idx: titleIdx() };
  });
  ok('[0a] 장착 전 19 칩 = 계급 폴백 «' + RANKS0(stage.before) + '»', stage.before === '브론즈', String(stage.before));
  ok('[0b] `titleEquip(2)` 가 실제로 바꿨다', stage.changed === true && stage.idx === 2, 'titleIdx=' + stage.idx);

  console.log('[1] 19 프로필 — 장착 칭호를 그린다(등재문 ⓐ)');
  const t19 = await page.evaluate(sel => (document.querySelector(sel) || {}).textContent, CHIP19);
  ok('[1a] 19 칩 = «골드»', t19 === '골드', String(t19));

  console.log('[2] 20 종합스탯 — 탭을 갈아탄 뒤의 칩(등재문 ⓑ · 주인이 본 그림)');
  await page.evaluate(() => { document.querySelector('.pf-tgl>.lb').click(); });
  await page.waitForTimeout(120);
  const st = await page.evaluate(sel => ({
    open: $('specw').classList.contains('on'),
    pfOpen: $('pfw').classList.contains('on'),
    t20: (document.querySelector(sel) || {}).textContent
  }), CHIP20);
  ok('[2a] 20 이 열려 있고 19 는 닫혔다', st.open === true && st.pfOpen === false, 'spec=' + st.open + ' pf=' + st.pfOpen);
  ok('[R1] **재현 축** — 20 칩이 19 와 같은 문자열이다', st.t20 === t19,
     '19 «' + t19 + '» ↔ 20 «' + st.t20 + '»');
  ok('[R2] 20 칩이 손 문자열 «칭호 없음» 이 아니다', st.t20 !== '칭호 없음', String(st.t20));

  console.log('[3] 되돌아가기 — 칭호를 바꾸면 20 도 따라온다(한 번 맞은 값이 굳지 않는다)');
  const again = await page.evaluate(sel => {
    $('spcProfTab').click();                      /* 20 → 19 */
    titleEquip(1);                                /* 실버 */
    document.querySelector('.pf-tgl>.lb').click();/* 19 → 20 */
    return { t19: ($('pfTtl') || {}).textContent, t20: (document.querySelector(sel) || {}).textContent };
  }, CHIP20);
  ok('[3a] 19 칩 = «실버»', again.t19 === '실버', String(again.t19));
  ok('[3b] 20 칩 = «실버»', again.t20 === '실버', String(again.t20));

  console.log('[4] 폴백 — 고른 적 없는 세이브는 두 화면 다 «계급» 을 보여준다(706 폴백 보존)');
  const fb = await page.evaluate(sel => {
    S.titleEq = null; S.rank = 1; save();
    $('spcProfTab').click(); renderProfile();
    const a = ($('pfTtl') || {}).textContent;
    document.querySelector('.pf-tgl>.lb').click();
    return { t19: a, t20: (document.querySelector(sel) || {}).textContent };
  }, CHIP20);
  ok('[4a] 19 = 계급 «실버»', fb.t19 === '실버', String(fb.t19));
  ok('[4b] 20 = 계급 «실버»', fb.t20 === '실버', String(fb.t20));

  console.log('[5] 콘솔·페이지 에러');
  ok('[5a] 에러 0건', errs.length === 0, errs.join(' | ') || '없음');

  await browser.close();
  console.log('\nPROBE834 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

function RANKS0(v){ return v === undefined ? '?' : v; }
