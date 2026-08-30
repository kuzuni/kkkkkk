/* 작업 455 재현 프로브 — «룰렛이 도는 동안 팝업이 닫힌다»
 *
 *   node tools/probe455.js
 *
 * 338·341·350·372 규칙 — 처방을 따르기 전에 **등재문의 주장이 참인지 제품에게 직접 묻는다.**
 * (338·341 은 여기서 등재문이 기각됐고, 350·363 은 확인됐다. 어느 쪽인지는 제품만 안다.)
 *
 * 등재문(PROGRESS 455)의 주장:
 *   ⓐ 딤 탭 경로(`$('modal').onclick` ~34149)에 `rouSpinning` 가드가 **없다**
 *      ⇒ 회전 3.6초 + 되감기 260ms 동안 딤을 누르면 팝업이 닫힌다.
 *   ⓑ 닫아도 보상은 «안 증발한다» — rAF 의 `gone()`(181)이 즉시 결판내고 `roulFinish` 가 지급한다.
 *   ⓒ 다만 **결과를 못 본다** — `#rouRes` 의 «획득! …» 이 안 보이는 DOM 에 쓰인다.
 *   ⓓ `fxAt(hub)` 가 «사라진 노드» 를 가리킨다.
 *   ⓔ 딤 탭 말고도 `closeModal()` 직접 호출·`gmCloseAll()` 경로가 같이 열려 있다.
 *
 * 이 자가 추가로 묻는 것(등재문이 안 본 축 — 처방 ③ 의 «fx 가 끝날 때까지» 를 정하는 근거):
 *   ⓕ 잠가야 할 창은 실제로 몇 ms 인가(회전 시작 → `rouSpinning=false`).
 *   ⓖ `roulFinish` 가 끝난 **뒤** 재화 비행(158/181 fx)이 아직 공중에 있는가 —
 *      있다면 처방 ③(«fx 끝까지 잠근다»)에 근거가 있고, 없다면 그 조항은 이미 참인 것을 굳히는 셈이다.
 *   ⓗ `rouPend` 는 `giveReward` **전**에 −1 이 된다(25777) ⇒ 처방 ① 의 `rouPend>=0` 만으로는
 *      «지급이 끝난 뒤» 를 못 덮는 한 프레임이 있는가.
 *
 * ⚑ **재현 기록은 수리 전·후 «같은 뜻» 이어야 한다**(probe452 규약). 그래서 결손 축은
 *   «닫혔다» 를 단언하지 않고 **«닫힘 여부가 잠금 유무와 일치한다»** 를 단언한다 —
 *   잠금이 없는 트리(수리 전)에서는 «닫힌다» 가, 있는 트리(수리 후)에서는 «안 닫힌다» 가 참이다.
 *   측정값(ⓕⓖⓗ)은 트리와 무관하므로 그대로 찍는다. 수리 전 실행 결과는
 *   `docs/review/455-룰렛닫기잠금.md` §2 에 원문 그대로 보존돼 있다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

async function boot(browser, save) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(Object.assign({ gold: 5e7, dia: 0, best: 40 }, save || {}))]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRoulette === 'function');
  await page.waitForTimeout(900);
  /* 전투 캔버스를 멈춘다 — 킬마다 도는 `fxAt(e,'combat')` 이 ⓖ 의 fx 계측을 오염시킨다 */
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  return { ctx, page, errs };
}

/* 딤(=`#modal` 자신)이 실제로 잡히는 좌표를 **제품에게 물어서** 고른다.
   상수로 박으면 팝업 규격이 바뀌는 날 조용히 «본문을 눌렀다» 로 바뀐다(368 처방). */
const dimPoint = page => page.evaluate(() => {
  const m = document.getElementById('modal');
  const r = m.getBoundingClientRect();
  for (let y = r.top + 8; y < r.bottom - 8; y += 6) {
    const el = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(y));
    if (el === m) return { x: Math.round(r.left + r.width / 2), y: Math.round(y) };
  }
  return null;
});

const snap = page => page.evaluate(() => ({
  on: document.getElementById('modal').classList.contains('on'),
  rl16: document.getElementById('modal').classList.contains('rl16'),   /* 464 — 제품에서 지운 죽은 이름 · 항상 false 인 대조 축 */
  spinning: rouSpinning,
  pend: rouPend,
  dia: S.dia,
  spins: S.daily.spins,
  res: (document.getElementById('rouRes') || {}).textContent || null,
  resConnected: !!document.getElementById('rouRes'),
  flies: (typeof fxFlies !== 'undefined') ? fxFlies.length : null
}));

(async () => {
  const browser = await launch(chromium);
  /* 이 트리에 455 잠금이 들어 있는가 — 기대값을 여기서 한 번만 가른다 */
  const b0 = await boot(browser);
  const LOCK = await ev(b0.page, () => typeof rouLocked === 'function');
  await b0.ctx.close();
  const W1 = LOCK ? '안 닫는다' : '닫는다';
  console.log('\n[i] 이 트리의 455 잠금: ' + (LOCK ? '있음(rouLocked) — 기대 «회전 중 안 닫힘»'
                                                : '없음 — 기대 «회전 중 닫힘»(수리 전 재현)'));

  /* ══ [1] ⓐ 회전 중 딤 탭 ═══════════════════════════════════════════════ */
  blk('[1] ⓐ 회전 중 딤 탭 — 팝업이 닫히는가');
  const b1 = await boot(browser);
  let t1 = {};
  {
    await ev(b1.page, () => { S.daily.spins = ROUL_TRY; S.dia = 0; uiDirty = true; renderUI(); openRoulette(); });
    await b1.page.waitForTimeout(400);
    const pt = await dimPoint(b1.page);
    ok(!!pt, '딤(#modal 자신)이 잡히는 좌표가 있다', pt ? pt.x + ',' + pt.y : 'null');
    await b1.page.click('#rouBtn');
    await b1.page.waitForTimeout(600);              /* 회전 한복판 */
    const mid = await snap(b1.page);
    ok(mid.spinning === true, '전제 — 이 순간 회전 중이다', 'rouSpinning=' + mid.spinning + ' · rouPend=' + mid.pend);
    if (pt) await b1.page.mouse.click(pt.x, pt.y);
    await b1.page.waitForTimeout(120);
    const after = await snap(b1.page);
    t1 = { mid, after };
    ok(after.on === !!LOCK,
       '★ ⓐ 회전 중 딤 탭 — 이 트리는 «' + W1 + '»',
       '#modal.on = ' + after.on + ' (잠금 ' + (LOCK ? '있음' : '없음') + ')');
  }

  /* ══ [2] ⓑⓒⓓ 닫고 난 뒤 — 지급·결과 표시·fx 출발점 ═════════════════════ */
  blk('[2] ⓑⓒⓓ 닫힌 뒤 지급은 되는가 / 결과는 보이는가');
  {
    await b1.page.waitForTimeout(600);
    /* 잠금이 있으면 회전이 끝날 때까지 기다렸다 잰다 — 두 트리에서 «지급은 반드시 일어난다» 는 같다 */
    if (LOCK) await b1.page.waitForFunction(() => !rouSpinning, null, { timeout: 15000 });
    await b1.page.waitForTimeout(400);
    const s = await snap(b1.page);
    ok(s.dia > 0 && s.spins === 4,
       'ⓑ 보상은 어느 트리에서도 증발하지 않는다 (수리 전 = 181 `gone()` 즉시 결판 · 수리 후 = 끝까지 회전)',
       'dia=' + s.dia + ' · spins=' + s.spins);
    ok(s.pend === -1, 'ⓑ 미지급 표식(rouPend)도 정리됐다 — 이중 지급 없음', 'rouPend=' + s.pend);
    ok(/획득!/.test(s.res || '') && s.on === !!LOCK,
       '★ ⓒ 결손의 본체 — «획득! …» 이 **보이는 팝업 안**에 쓰였는가 (수리 전엔 닫힌 뒤에 쓰인다)',
       '#modal.on=' + s.on + ' · #rouRes=«' + String(s.res).trim().slice(0, 30) + '»');
    /* ⓓ — 지급 순간 허브가 붙어 있었는지. `roulFinish` 를 감싸서 그 프레임의 진실을 잡는다. */
    const hub = await ev(b1.page, () => {
      const h = document.querySelector('#modal .rlt-hub') || document.getElementById('rouDisc');
      return { found: !!h, connected: h ? h.isConnected : null,
               visible: h ? (h.getBoundingClientRect().width > 0) : null };
    });
    ok(!!hub && hub.found && hub.visible === !!LOCK,
       'ⓓ fx 출발점(`.rlt-hub`)이 그려지는 노드인가 — 수리 전엔 «문서엔 있으나 안 그려지는» 자리에서 재화가 난다',
       hub ? 'found=' + hub.found + ' · connected=' + hub.connected + ' · width>0=' + hub.visible : 'null');
  }
  await b1.ctx.close();

  /* ══ [3] ⓔ 딤 말고 다른 닫는 길 ═══════════════════════════════════════ */
  blk('[3] ⓔ 딤 말고 다른 닫는 길도 열려 있는가');
  {
    for (const [name, call] of [['closeModal() 직접', 'closeModal()'], ['gmCloseAll()', 'gmCloseAll()']]) {
      const b = await boot(browser);
      await ev(b.page, () => { S.daily.spins = ROUL_TRY; S.dia = 0; uiDirty = true; renderUI(); openRoulette(); });
      await b.page.waitForTimeout(300);
      await b.page.click('#rouBtn');
      await b.page.waitForTimeout(500);
      const before = await snap(b.page);
      await ev(b.page, c => { eval(c); }, call);
      await b.page.waitForTimeout(80);
      const after = await snap(b.page);
      ok(before.spinning === true && after.on === !!LOCK,
         '★ ⓔ 회전 중 `' + name + '` — 이 트리는 «' + W1 + '» (문이 `closeModal()` 하나임을 못박는다)',
         '회전중=' + before.spinning + ' → #modal.on=' + after.on);
      await b.ctx.close();
    }
  }

  /* ══ [4] ⓕⓖⓗ 잠글 창의 길이 · 지급 뒤 fx ═════════════════════════════ */
  blk('[4] ⓕⓖⓗ 잠글 창은 몇 ms 인가 / 지급 뒤 fx 는 공중에 있는가');
  {
    const b = await boot(browser);
    await ev(b.page, () => { S.daily.spins = ROUL_TRY; S.dia = 0; uiDirty = true; renderUI(); openRoulette(); });
    await b.page.waitForTimeout(300);
    /* `roulFinish` 를 감싸 «지급 직전/직후» 의 프레임을 그대로 기록한다(제품은 안 건드린다) */
    await ev(b.page, () => {
      window.__log = { t0: 0, finAt: 0, pendAtGive: null, fliesAfter: [], hubAtFin: null };
      const rawGive = window.giveReward, rawFin = window.roulFinish;
      window.giveReward = function (r) { window.__log.pendAtGive = rouPend; return rawGive.apply(this, arguments); };
      window.roulFinish = function (i) {
        const r = rawFin.apply(this, arguments);
        window.__log.finAt = performance.now();
        const h = document.querySelector('#modal .rlt-hub');
        window.__log.hubAtFin = h ? h.isConnected : null;
        const sample = () => {
          const dt = performance.now() - window.__log.finAt;
          window.__log.fliesAfter.push([Math.round(dt), fxFlies.length]);
          if (dt < 2200) setTimeout(sample, 100);
        };
        sample();
        return r;
      };
      window.__log.t0 = performance.now();
    });
    await b.page.click('#rouBtn');
    await b.page.waitForFunction(() => !rouSpinning && window.__log.finAt > 0, null, { timeout: 15000 });
    const dur = await ev(b.page, () => Math.round(window.__log.finAt - window.__log.t0));
    ok(dur > 3600 && dur < 5000,
       'ⓕ 잠가야 할 창 = 회전 ' + 3600 + 'ms + 되감기 260ms + rAF 여유',
       '실측 ' + dur + 'ms');
    const lg = await ev(b.page, () => { const l = window.__log; return { pendAtGive: l.pendAtGive, hub: l.hubAtFin }; });
    ok(lg && lg.pendAtGive === -1,
       '★ ⓗ `rouPend` 는 `giveReward` **전**에 이미 −1 이다 ⇒ 처방 ① 의 `rouPend>=0` 만으로는 «지급이 끝난 뒤» 를 못 덮는다',
       'giveReward 진입 시 rouPend=' + (lg ? lg.pendAtGive : '?'));
    await b.page.waitForTimeout(2500);
    const fl = await ev(b.page, () => window.__log.fliesAfter);
    const inAir600 = (fl || []).filter(r => r[0] >= 550 && r[0] <= 700).map(r => r[1]);
    const peak = Math.max(0, ...(fl || []).map(r => r[1]));
    const lastAir = (fl || []).filter(r => r[1] > 0).map(r => r[0]).pop() || 0;
    ok(peak > 0,
       'ⓖ 지급 뒤 재화 비행(fxFlies)이 실제로 뜬다',
       '최대 동시 ' + peak + '개 · 마지막으로 공중에 있던 시점 +' + lastAir + 'ms');
    ok(lastAir > 600,
       '★ ⓖ 비행은 +600ms 를 **넘어서** 계속된다 ⇒ 처방 ③ 의 «fx 끝까지» 는 600 상수 하나로는 안 덮인다',
       '+600ms 부근 공중 ' + JSON.stringify(inAir600) + ' · 마지막 +' + lastAir + 'ms · 표본 ' + JSON.stringify(fl));
    await b.ctx.close();
  }

  /* ══ [5] 정지 뒤에는 정상적으로 닫혀야 한다(수리 후에도 참이어야 할 음성항) ══ */
  blk('[5] 정지 뒤 딤 탭은 그대로 닫힌다 (수리가 넘지 말아야 할 선)');
  {
    const b = await boot(browser);
    await ev(b.page, () => { S.daily.spins = ROUL_TRY; S.dia = 0; uiDirty = true; renderUI(); openRoulette(); });
    await b.page.waitForTimeout(300);
    await b.page.click('#rouBtn');
    await b.page.waitForFunction(() => !rouSpinning, null, { timeout: 15000 });
    await b.page.waitForTimeout(2500);
    const pt = await dimPoint(b.page);
    if (pt) await b.page.mouse.click(pt.x, pt.y);
    await b.page.waitForTimeout(120);
    const s = await snap(b.page);
    ok(s.on === false, '정지·지급·비행이 끝난 뒤 딤 탭은 닫는다', '#modal.on=' + s.on);
    await b.ctx.close();
  }

  await browser.close();
  console.log('\n══ probe455 ' + pass + '/' + (pass + fail) + (fail ? '  ❌ ' + fail + '건' : '  ✅') + ' ══');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
