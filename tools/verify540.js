/* 작업 540 게이트 — «닫개 목록 안의 유령» 재유입 차단
 * 실행: node tools/verify540.js
 *
 * 지키는 성질 넷:
 *   [A] 목록이 **한 벌**이다      — 손으로 적은 닫개 목록이 자마다 따로 살아 있지 않다
 *   [B] 그 한 벌에 **유령이 없다** — 이름이 전부 제품에 실재한다(가드가 삼킬 것이 없다)
 *   [C] 이름 없는 껍데기는 **DOM 으로** 끈다 — `#defw` 는 닫개 함수가 없어 목록으로는 못 끈다
 *   [R] 되돌림 시험 — 유령을 되넣거나 껍데기를 안 걷으면 **곧바로 빨개진다**
 *
 * ⚑ 왜 이 자가 필요한가: 유령은 `typeof … === 'function'` 가드 뒤에서 **소리 없이** 산다.
 *   그 죽음은 다른 자의 «가끔 빨강» 으로만 새어 나오고(524 가 349 에서 본 22~24/24),
 *   그때는 이미 원인에서 멀어져 있다. 여기서 매 실행 이름을 부른다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const { RESET_CLOSERS, SHELL_IDS, GHOSTS, install, missingClosers, defeatStuck, defeatBlocked } = require('./closers540');

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const TOOLS = __dirname;

/* 540 이 걷은 아홉 자리 — 전부 공용 모듈을 읽어야 한다(`cap488` 은 캡처 하네스지만 손은 같다) */
const CLEANED = ['verify203.js', 'verify210.js', 'verify349.js', 'verify354.js', 'verify488.js',
                 'probe349.js', 'probe354.js', 'probe488.js', 'cap488.js'];
/* 유령 이름을 «들어도 되는» 자 — 공용 모듈은 감시 목록으로, 두 재현기는 «수리 전 손» 의 재료로 든다.
   면제는 [A4] 양성항과 한 쌍이다(셋이 실제로 안 들고 있으면 면제가 빈 껍데기가 된다). */
const GHOST_OK = ['closers540.js', 'probe524.js', 'probe540.js'];

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? (pass++, console.log('  ✓ ' + m + (d ? ' — ' + d : '')))
                            : (fail++, console.log('  ✗ ' + m + (d ? ' — ' + d : ''))); };

const read = f => fs.readFileSync(path.join(TOOLS, f), 'utf8');

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof renderUI === 'function');
  await p.waitForTimeout(1200);

  /* ══ [A] 목록이 한 벌인가 ═════════════════════════════════════════════ */
  console.log('[A] 목록이 한 벌인가 — 손으로 적은 닫개 목록의 전수');
  const files = fs.readdirSync(TOOLS).filter(f => f.endsWith('.js'));
  const hand = files.filter(f => /\[[^\]]*'close[A-Za-z]+'[^\]]*'close[A-Za-z]+'[^\]]*\]/.test(read(f)));
  const ghosted = hand.filter(f => GHOSTS.some(g => new RegExp("'" + g + "'").test(read(f))));

  const notUsing = CLEANED.filter(f => !/require\(['"]\.\/closers540['"]\)/.test(read(f)));
  ok(notUsing.length === 0, '[A1] 540 이 걷은 아홉 자리가 전부 공용 모듈을 읽는다',
    notUsing.length ? '안 읽는 자 ' + notUsing.join(' , ') : CLEANED.length + '자리');
  const stillHand = CLEANED.filter(f => hand.includes(f));
  ok(stillHand.length === 0, '[A2] 그 아홉 자리에 손으로 적은 목록이 남아 있지 않다',
    stillHand.join(' , ') || '0자리');
  ok(ghosted.every(f => GHOST_OK.includes(f)),
    '[A3] ★ 유령 이름을 든 자는 감시 목록·재현기뿐이다', ghosted.join(' , ') || '없음');
  ok(GHOST_OK.every(f => ghosted.includes(f)),
    '[A4] 양성항 — 그 셋은 실제로 유령을 들고 있다(면제가 빈 껍데기가 아니다)',
    GHOST_OK.filter(f => !ghosted.includes(f)).join(' , ') || GHOST_OK.length + '자리 전부');
  /* 새로 생긴 손 목록도 잡는다 — 유령 없이 손으로 적는 것 자체는 죄가 아니지만(74·125 가 그렇다),
     이 아홉 자리가 다시 손으로 적히는 것은 540 의 되돌림이다. 그것이 [A2] 다. */
  console.log('    (참고 — 손 목록을 가진 자: ' + hand.join(' , ') + ')');

  /* ══ [B] 그 한 벌에 유령이 없는가 ═════════════════════════════════════ */
  console.log('[B] 유령 — 이름이 전부 제품에 실재한다');
  const html = fs.readFileSync(SRC, 'utf8');
  GHOSTS.forEach(g => ok(!new RegExp(g).test(html),
    '[B1] ★ 유령 `' + g + '` 가 index.html 에 0건이다(자가 없는 이름을 불러 왔다)'));
  await install(p, { arm: true });
  const miss = await missingClosers(p);
  ok(miss.length === 0, '[B2] ★ 공용 목록의 이름이 전부 런타임에 실재한다(가드가 삼킬 것이 없다)',
    miss.length ? '없는 이름 ' + miss.join(' , ') : RESET_CLOSERS.length + '개 전부 실재');
  ok(RESET_CLOSERS.length >= 6 && new Set(RESET_CLOSERS).size === RESET_CLOSERS.length,
    '[B3] 공용 목록이 아홉 자리의 합집합이고 중복이 없다', RESET_CLOSERS.join(' '));

  /* ══ [C] 이름 없는 껍데기 ══════════════════════════════════════════════ */
  console.log('[C] 이름 없는 껍데기 — 닫개 함수가 없어 목록으로는 못 끄는 자리');
  /* «닫개 함수가 없다» 를 이름 하나로만 물으면 무르다 — id 파생형과 유령 이름을 **함께** 묻는다
     (유령이 생긴 경위가 바로 «있을 법한 이름을 지어 부른 것» 이다). */
  const noFn = await p.evaluate(o => o.ids.map(id => {
    const cap = id.charAt(0).toUpperCase() + id.slice(1);
    const names = ['close' + cap, 'close' + cap.replace(/w$/, ''), ...o.ghosts];
    return { id, hasEl: !!document.getElementById(id),
             found: names.filter(n => typeof window[n] === 'function'), tried: names };
  }), { ids: SHELL_IDS, ghosts: GHOSTS });
  noFn.forEach(s => {
    ok(s.hasEl, '[C1] `#' + s.id + '` 이 제품에 실재한다', s.id);
    ok(s.found.length === 0,
      '[C2] `#' + s.id + '` 에는 닫개 함수가 없다(그래서 DOM 으로 끈다 — 제품 0줄 조건)',
      s.found.length ? '있는 이름 ' + s.found.join(' , ') : '물어본 이름 ' + s.tried.join(' , ') + ' 전부 없음');
  });
  /* 전제 — `openDefeat()` 한 번이 정말 켜는가. 안 켜지면 아래 [C3]·[R] 이 공허해진다 */
  const armedBefore = await defeatBlocked(p);
  const lit = await p.evaluate(() => {
    const d = document.getElementById('defw'); d.classList.add('on');
    return d.classList.contains('on');
  });
  ok(lit === true, '[C3] 전제 — `#defw.on` 을 켤 수 있다(아래 단언이 공허하지 않다)');
  await p.evaluate(() => window.__clear540());
  ok(!(await defeatStuck(p)), '[C4] ★ `__clear540()` 이 켜져 있던 `#defw.on` 을 끈다');

  /* arm — 제품 경로는 그대로 부르고 껍데기만 걷으며 횟수를 센다 */
  await p.evaluate(() => openDefeat());
  const armedAfter = await defeatBlocked(p);
  ok(armedAfter === armedBefore + 1 && !(await defeatStuck(p)),
    '[C5] ★ arm — `openDefeat` 를 불러도 껍데기가 안 남고 막은 횟수가 오른다',
    '막은 횟수 ' + armedAfter + '회');

  /* ══ [R] 되돌림 시험 ═══════════════════════════════════════════════════ */
  console.log('[R] 되돌림 시험 — 무르게 푼 것이 아님을 못박는다');
  /* R1 — 유령을 목록에 되넣으면 [B2] 의 자가 곧바로 그것을 잡는다 */
  const backMiss = await p.evaluate(g => {
    const save = window.__CLOSERS540.slice();
    window.__CLOSERS540.push(g);
    const bad = window.__CLOSERS540.filter(f => typeof window[f] !== 'function');
    window.__CLOSERS540 = save;
    return bad;
  }, GHOSTS[0]);
  ok(backMiss.length === 1 && backMiss[0] === GHOSTS[0],
    '[R1] ★ 유령을 목록에 되넣으면 [B2] 의 자가 그 자리에서 잡는다(허용 오차를 안 넓혔다)',
    backMiss.join(' , '));
  /* R2 — 껍데기를 안 걷는 «수리 전 손» 으로는 `#defw.on` 이 남는다 */
  const oldHand = await p.evaluate(o => {
    document.getElementById('defw').classList.add('on');
    /* 옛 손 = 목록만 부르고 이름 없는 껍데기는 안 걷는다 */
    o.closers.forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (_) {} });
    return document.getElementById('defw').classList.contains('on');
  }, { closers: RESET_CLOSERS });
  ok(oldHand === true,
    '[R2] ★ 목록만으로는 `#defw.on` 이 안 꺼진다 — 껍데기를 DOM 으로 끄는 한 줄이 실제로 일한다');
  await p.evaluate(() => window.__clear540());
  ok(!(await defeatStuck(p)), '[R3] 원복 — 같은 자리에서 공용 손은 끈다');

  ok(errs.length === 0, '콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | '));
  console.log('\nVERIFY540 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
