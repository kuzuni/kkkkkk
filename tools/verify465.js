/* 게이트 — 작업 465 「모달 껍데기 목록을 한 곳으로 모은다」
 *
 *   node tools/verify465.js
 *
 * 지키는 성질: **모달 껍데기(치수 override)는 «한 번에 하나» 이고, 그 이름 목록이 사는 곳은 한 곳이다.**
 *   [A] 모양 — 선언 `MODAL_SHELLS` 한 줄 + 그것을 펼쳐 쓰는 `modalShell()` 하나.
 *       껍데기 이름을 **직접** 켜거나 떼는 자리가 제품에 0곳(수리 전 add 6곳 · remove 목록 5곳).
 *   [B] 실동작 — 껍데기 여섯 오프너를 굴려 «열면 자기 껍데기 + on» (전제).
 *   [C] 갈아타기 전수 행렬(6×5 = 30 경로) — 닫지 않고 갈아타도 껍데기는 **정확히 하나**.
 *       (수리 전 12/30 이 겹쳤다 — `probe465` [2].)
 *   [D] 345 닫힘 연출 도중 갈아타기 전수 행렬 — 되살아난 껍데기가 안 남는다.
 *       `verify345` §4-① 이 물던 것의 **전 경로판**이다(그쪽은 ml69 → q22 한 쌍).
 *   [E] 그림 Δ0px — 깨끗이 연 여섯 화면의 `.mbox` 레이아웃 상자가 수리 전 사본과 정수까지 같다.
 *       (465 는 «겹쳤을 때» 만 바꾼다 — 정상 경로는 한 픽셀도 안 움직인다.)
 *   [R] 되돌림 시험 — 오프너의 remove 목록을 **수리 전 비대칭 모양으로 되돌린 사본**에서
 *       [C]·[D] 가 실제로 빨개진다(무르게 푼 수리가 아님을 못박는다 · 334 처방).
 *
 * ⚠ 겹침은 지금 **«잠복»** 이다 — 모달이 열려 있는 동안 딤이 다른 오프너 버튼을 전부 덮는다
 *   (`probe465` [5]). 그래도 고치는 이유는 겹침의 값이 크기 때문이다: 22 퀘스트 → 08 유물 세부에서
 *   본문 높이 739 → **1379**(Δ640px). 밟을 수 있게 되는 순간 곧바로 실해다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : '  FAIL') + '  ' + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·   ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

const SHELLS = ['sk8', 'q22', 'ml69', 'at70'];
const OPENERS = [
  ['69 우편함',      'openMail()',                           'ml69'],
  ['22 퀘스트',      'openQuest()',                          'q22'],
  ['70 출석',        'openAttend()',                         'at70'],
  ['08 스킬 세부',   'showSkillDetail(Object.keys(SK)[0])',  'sk8'],
  ['08 유물 세부',   'showItem(RELICS[0].id)',               'sk8'],
  ['08 코스튬 세부', "showCosDetail('av2')",                 'sk8'],
];

async function boot(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 1e5, best: 40 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof closeModal === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  return { page, ctx, errs };
}

const run = (page, src) => ev(page, s => { try { (0, eval)(s); } catch (e) { return { __err: String(e.message || e) }; } return 1; }, src);
const cls = page => ev(page, () => [...document.getElementById('modal').classList].filter(c => !c.startsWith('jz-')).join(' '));

/* 갈아타기 전수 — mid=true 면 닫힘 연출 «도중» 에 갈아탄다. 겹친 경로 목록을 돌려준다. */
async function matrix(page, mid) {
  const bad = [];
  for (const [nameA, openA] of OPENERS) {
    for (const [nameB, openB, shellB] of OPENERS) {
      if (nameA === nameB) continue;
      await run(page, 'closeModal()');
      await page.waitForTimeout(320);                 /* 345 닫힘 연출(0.12s)이 끝난 «깨끗한» 기준선 */
      const ra = await run(page, openA);
      await page.waitForTimeout(mid ? 220 : 160);
      if (mid) { await run(page, 'closeModal()'); await page.waitForTimeout(50); }
      const rb = await run(page, openB);
      await page.waitForTimeout(320);
      if ((ra && ra.__err) || (rb && rb.__err)) { bad.push({ p: nameA + ' → ' + nameB, got: 'OPENER-ERR' }); continue; }
      const got = String(await cls(page) || '');
      const on = SHELLS.filter(s => got.split(' ').includes(s));
      if (!(on.length === 1 && on[0] === shellB)) bad.push({ p: nameA + (mid ? ' ✕ → ' : ' → ') + nameB, got });
    }
  }
  return bad;
}

/* 깨끗이 연 여섯 화면의 `.mbox` 레이아웃 상자(464-③ — getBoundingClientRect 는 연출을 같이 잰다) */
async function boxes(page) {
  const out = {};
  for (const [name, open] of OPENERS) {
    await run(page, 'closeModal()');
    await page.waitForTimeout(320);
    const r = await run(page, open);
    await page.waitForTimeout(320);
    if (r && r.__err) continue;
    out[name] = await ev(page, () => {
      const m = document.getElementById('modal'), bx = m.querySelector('.mbox'), bd = m.querySelector('.mbody');
      return { cls: [...m.classList].filter(c => !c.startsWith('jz-')).join(' '),
        w: bx ? bx.offsetWidth : -1, h: bx ? bx.offsetHeight : -1,
        x: bx ? bx.offsetLeft : -1, y: bx ? bx.offsetTop : -1,
        dh: bd ? bd.offsetHeight : -1 };
    });
  }
  return out;
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');       /* 277 계열 — 주석을 걷어낸 «제품 줄» */

  blk('[A] 모양 — 껍데기 이름이 사는 곳은 한 곳이다');
  {
    const decl = /const\s+MODAL_SHELLS\s*=\s*\[([^\]]*)\]/.exec(code);
    ok(!!decl, '★ [A1] 선언 `const MODAL_SHELLS = […]` 이 있다', decl ? decl[0] : '없음');
    const inDecl = decl ? SHELLS.filter(c => decl[1].includes("'" + c + "'")) : [];
    ok(inDecl.length === SHELLS.length, '★ [A2] 살아 있는 껍데기 넷이 전부 그 목록에 있다',
      inDecl.join(',') + ' — ' + inDecl.length + '/' + SHELLS.length + '종');
    const fn = /function\s+modalShell\s*\([^)]*\)\s*\{[\s\S]{0,500}?\n\}/.exec(code);
    ok(!!fn && /classList\.remove\(\s*\.\.\.MODAL_SHELLS\s*\)/.test(fn[0]),
      '★ [A3] `modalShell()` 이 목록을 **펼쳐서** 뗀다(하드코딩 0)', fn ? '있다' : '없다');
    ok(!!fn && /classList\.add\(\s*cls\s*\)/.test(fn[0]),
      '[A4] 그리고 인자로 받은 껍데기 하나만 켠다', fn ? '있다' : '없다');
    /* ★ 결손 축 — 흩어진 자리가 하나라도 남으면 비대칭이 다시 자란다 */
    const addRe = /classList\.add\(([^)]*)\)/g;
    let m, adds = [];
    while ((m = addRe.exec(code))) { const s = SHELLS.find(x => m[1].includes("'" + x + "'")); if (s) adds.push(s); }
    ok(adds.length === 0, '★ [A5] 껍데기 이름을 **직접 켜는** 자리 0곳 (수리 전 6곳 — 그중 3곳은 남의 껍데기를 하나도 안 뗐다)',
      adds.length + '곳' + (adds.length ? ' — ' + adds.join(',') : ''));
    const rems = (code.match(/remove\([^)]{0,140}'(sk8|q22|ml69|at70)'/g) || []).length;
    ok(rems === 0, '★ [A6] 껍데기 이름이 든 **흩어진 remove 목록** 0건 (수리 전 5건 · 서로 비대칭)', rems + '건');
    const uses = (code.match(/modalShell\(/g) || []).length;
    ok(uses >= 8, '[A7] 껍데기를 세우는 자리는 전부 그 함수를 지난다(선언 1 + 호출 8: 닫기·공용·오프너 6)', uses + '건');
  }

  const browser = await launch(chromium);
  const b = await boot(browser, 'file://' + SRC);

  blk('[B] 전제 — 깨끗이 열면 «자기 껍데기 + on» 이다');
  const now = await boxes(b.page);
  {
    for (const [name, open, shell] of OPENERS) {
      const x = now[name];
      if (!x) { ok(false, '[B-' + name + '] 오프너 실패'); continue; }
      const on = x.cls.split(' ');
      ok(on.includes(shell) && on.includes('on') && SHELLS.filter(s => on.includes(s)).length === 1,
        '[B] ' + name + ' — 열면 `' + shell + '` + `on` 뿐이다',
        'class="' + x.cls + '" · mbox ' + x.w + '×' + x.h + ' · mbody h' + x.dh);
    }
  }

  blk('[C] 갈아타기 전수 — 닫지 않고 갈아타도 껍데기는 하나');
  const badC = await matrix(b.page, false);
  {
    for (const x of badC.slice(0, 6)) info('겹침', x.p + ' ⇒ class="' + x.got + '"');
    ok(badC.length === 0, '★ [C] 전 경로 30개에서 겹침 **0건** (수리 전 12건)',
      '겹치는 경로 ' + badC.length + '/' + (OPENERS.length * (OPENERS.length - 1)) + '개');
  }

  blk('[D] 닫힘 연출 도중 갈아타기 전수 (345 §4-① 의 전 경로판)');
  const badD = await matrix(b.page, true);
  {
    for (const x of badD.slice(0, 6)) info('겹침', x.p + ' ⇒ class="' + x.got + '"');
    ok(badD.length === 0, '★ [D] 연출 도중 전환 30경로에서 겹침 **0건** (수리 전 12건)',
      '겹치는 경로 ' + badD.length + '/' + (OPENERS.length * (OPENERS.length - 1)) + '개');
  }

  blk('[E]·[R] 수리 전 사본 — 그림 Δ0px · 되돌리면 [C]·[D] 가 빨개진다');
  {
    /* 수리 전 모양으로 되돌린 사본: 오프너가 «자기 것만» 켜고 남의 껍데기는 일부만 뗀다 */
    let rev = src
      .replace("const m = modalShell('at70');", "const m = $('modal');\n  m.classList.remove('sk8', 'q22');\n  m.classList.add('at70');")
      .replace("const m = modalShell('ml69');", "const m = $('modal');\n  m.classList.remove('sk8', 'q22');\n  m.classList.add('ml69');")
      .replace("const m = modalShell('q22');", "const m = $('modal');\n  m.classList.remove('sk8', 'ml69');\n  m.classList.add('q22');")
      .split("modalShell('sk8').classList.add('on');").join("$('modal').classList.add('on', 'sk8');");
    const revCode = rev.replace(/\/\*[\s\S]*?\*\//g, '');
    const scattered = (revCode.match(/remove\([^)]{0,140}'(sk8|q22|ml69|at70)'/g) || []).length;
    ok(rev !== src && scattered === 3,
      '[R0] 전제 — 사본 편집이 실제로 먹었다(흩어진 remove 목록 3건이 되살아났다 · 313 교훈)', scattered + '건');

    /* ⚠ 사본은 **저장소 루트**에 둔다 — index.html 이 자산을 상대 경로로 물어 /tmp 에 두면 404 다 */
    const tmp = path.resolve(__dirname, '..', `.v465-neg-${process.pid}.html`);
    fs.writeFileSync(tmp, rev);
    try {
      const b2 = await boot(browser, 'file://' + tmp);

      const before = await boxes(b2.page);
      let dmax = 0, worst = '';
      for (const [name] of OPENERS) {
        const a = before[name], c = now[name];
        if (!a || !c) { ok(false, '[E-' + name + '] 상자를 못 쟀다'); continue; }
        const d = Math.max(Math.abs(a.w - c.w), Math.abs(a.h - c.h), Math.abs(a.x - c.x), Math.abs(a.y - c.y), Math.abs(a.dh - c.dh));
        if (d > dmax) { dmax = d; worst = name; }
      }
      ok(dmax === 0, '★ [E] 깨끗이 연 여섯 화면의 `.mbox` 상자가 수리 전 사본과 정수까지 같다 — **465 는 정상 경로를 한 픽셀도 안 바꿨다**',
        'Δmax=' + dmax + 'px' + (worst ? ' (' + worst + ')' : ''));

      const rc = await matrix(b2.page, false);
      ok(rc.length > 0, '★ [R1] 사본에서는 [C] 가 **빨개진다** — 자가 실제로 이 축을 잰다',
        '사본 겹침 ' + rc.length + '/30개' + (rc.length ? ' — 예: ' + rc[0].p + ' ⇒ "' + rc[0].got + '"' : ''));
      const rd = await matrix(b2.page, true);
      ok(rd.length > 0, '★ [R2] 사본에서는 [D] 도 **빨개진다** (345 §4-① 을 전 경로로 넓힌 축이 공허하지 않다)',
        '사본 겹침 ' + rd.length + '/30개');
      ok(b2.errs.length === 0, '[R3] 사본 경로도 콘솔 에러 0', b2.errs.slice(0, 2).join(' | ') || '없음');
      await b2.ctx.close();
    } finally {
      try { fs.unlinkSync(tmp); } catch (e) {}
    }
  }

  blk('[F] 콘솔');
  ok(b.errs.length === 0, '[F] 콘솔·페이지 에러 0', b.errs.slice(0, 2).join(' | ') || '없음');

  await browser.close();
  console.log('\nVERIFY465 ' + (pass + fail ? pass + '/' + (pass + fail) : '') + '  ' + (fail ? '✗ FAIL ' + fail + '건' : '✓ PASS'));
  process.exit(fail ? 1 : 0);
})();
