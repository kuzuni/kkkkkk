/* 작업 58 — 43회차 프로브 «퇴장 계조» + «지불 반응»  (2인 공통ㅂ · ㅅ)
 *
 *  ⓐ 공통ㅂ — 체크 배지(`.fx-check`)·토스트(`.fx-toast`)의 **퇴장에 중간 알파 프레임이 있는가**.
 *     비평가의 자와 같게 **95ms 격자**로 훑고, 「완전 불투명(≥.92)도 아니고 소멸(≤.06)도 아닌」
 *     표본을 «중간 알파» 로 센다. 42차 실측은 둘 다 **0장**이었다.
 *  ⓑ 공통ㅅ — 강화(upg)에서 재화를 쓸 때 HUD 알약이 반응하는가.
 *     `.fx-pay` 펄스의 배율 궤적과 `−n`(`.fx-plus.pay`) 노드를 20ms 격자로 찍는다.
 *
 *   node tools/p58ay.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

async function boot(b, open) {
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof fxToast === 'function', null, { timeout: 20000 });
  await p.evaluate(() => {
    if (typeof window.step === 'function') { window.__step = window.step; window.step = () => {}; }
    S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; } catch (e) {}
    S.totalKills = 999999; S.best = 999; S.summons = 99999; S.upgrades = 99999;
    try { QUESTS.forEach(q => { S.quest[q.id].s = 0; S.quest[q.id].base = 0; }); } catch (e) {}
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
  });
  if (open) { await p.evaluate((o) => window[o](), open); await p.waitForTimeout(500); }
  return { p, errs };
}
const opa = 'el => { const cs = getComputedStyle(el); return +cs.opacity; }';

(async () => {
  const b = await launch(chromium);

  /* ── ⓐ 퀘스트 «모두 받기» — 체크 배지 · 토스트 퇴장 ── */
  {
    const { p, errs } = await boot(b, 'openQuest');
    const rows = await p.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const t0 = performance.now();
      document.getElementById('qAll').click();
      const out = [];
      for (let i = 0; i < 17; i++) {
        const target = t0 + i * 95;
        while (performance.now() < target) await new Promise(r => requestAnimationFrame(r));
        const rd = (sel) => { const n = document.querySelector(sel); return n ? +(+getComputedStyle(n).opacity).toFixed(3) : null; };
        out.push({ t: Math.round(performance.now() - t0), chk: rd('.fx-check'), toast: rd('.fx-toast') });
      }
      return out;
    });
    const mid = (k) => rows.filter(r => r[k] != null && r[k] > 0.06 && r[k] < 0.92).length;
    console.log('── 퇴장 계조 (95ms 격자 17표본, 42차 자와 동일) ──');
    console.log('  t(ms) : ' + rows.map(r => String(r.t).padStart(5)).join(''));
    console.log('  체크  : ' + rows.map(r => (r.chk == null ? '    —' : r.chk.toFixed(2).padStart(5))).join(''));
    console.log('  토스트: ' + rows.map(r => (r.toast == null ? '    —' : r.toast.toFixed(2).padStart(5))).join(''));
    console.log('  중간 알파 표본 — 체크 **' + mid('chk') + '장** · 토스트 **' + mid('toast') + '장** (42차 실측 둘 다 0장 · 요구 ≥1)');
    if (errs.length) console.log('  ⚠ 에러 ' + errs.length + '건: ' + errs.slice(0, 2).join(' | '));
    await p.context().close();
  }

  /* ── ⓑ 강화(upg) — 지불 반응 ── */
  {
    const { p, errs } = await boot(b, 'openTrain');
    const rows = await p.evaluate(async () => {
      const pill = () => document.getElementById('goldN').closest('.cbox');
      const sc = (el) => { const m = getComputedStyle(el).transform;
        if (!m || m === 'none') return 1; const v = m.match(/matrix\(([^,]+)/); return v ? +(+v[1]).toFixed(4) : 1; };
      const c = document.querySelector('#trCards [data-tr="atk"]') || document.querySelector('#trCards .tr-card');
      const g0 = S.gold;
      const t0 = performance.now();
      c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      const out = [];
      for (let i = 0; i < 30; i++) {
        const target = t0 + i * 20;
        while (performance.now() < target) await new Promise(r => requestAnimationFrame(r));
        const m = document.querySelector('.fx-plus.pay');
        out.push({ t: Math.round(performance.now() - t0), s: sc(pill()),
          minus: m ? m.textContent : null, mo: m ? +(+getComputedStyle(m).opacity).toFixed(2) : null });
      }
      return { out, spent: g0 - S.gold };
    });
    const ss = rows.out.map(r => r.s);
    const txt = rows.out.map(r => r.minus).filter(Boolean)[0];
    console.log('\n── 지불 반응 (upg · 20ms 격자 30표본) ──');
    console.log('  실제 소모 ' + rows.spent + ' 골드');
    console.log('  알약 배율: min **' + Math.min(...ss) + '** · max ' + Math.max(...ss)
      + ' (42차 «8프레임 전부 동일» = 1.0000)');
    console.log('  «−n» 플로터: ' + (txt ? '**' + txt + '**' : '없음')
      + ' · 가시 표본 ' + rows.out.filter(r => r.mo != null && r.mo > 0.06).length + '장');
    if (errs.length) console.log('  ⚠ 에러 ' + errs.length + '건: ' + errs.slice(0, 2).join(' | '));
    await p.context().close();
  }
  await b.close();
})();
