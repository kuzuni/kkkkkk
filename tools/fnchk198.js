/* 작업 274 — 기능 체크 표. `node tools/fnchk198.js`
 *
 * T2 «기능 완성 규칙»(주인 지시 2026-08-25)이 요구하는 «버튼별 — 눌렀을 때 무엇이 바뀌는지» 를
 * 헤드리스 실측으로 한 줄씩 찍는다. **읽기 전용** — 제품도 게이트도 고치지 않는다.
 * 판정은 `verify119` 가 하고, 이 파일은 review 문서에 붙일 «표» 를 만든다.
 *
 * 성질은 «유물 소환 비용» 하나라 파일은 그대로 두고 기대만 옮겼다(198 «시작가 1» → **274 «고정 100»**).
 * 실제 버튼(#rwBasin)을 눌러 가격 표시 · 유물석 잔액 · 누적 횟수 · 세이브(localStorage) 가
 * 같이 움직이는지 — 그리고 **가격만은 안 움직이는지** 본다. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';

const snap = () => ({
  cost: relicCost(),
  표시: document.querySelector('#rwCost b').textContent,
  유물석: S.relic,
  타화면: (() => { try { renderSt(); const m = document.getElementById('bSt').innerText
                 .match(/유물조각\s*([\d,.]+[A-Za-z]*)/); return m ? m[1] : '?'; } catch (e) { return '?'; } })(),
  누적: S.cnt.sumRelic | 0,
  보유종: Object.keys(S.own || {}).filter(k => /^rl/.test(k)).length,
  lack: document.getElementById('rwCost').classList.contains('lack'),
});
const saved = () => {
  try { const j = JSON.parse(localStorage.getItem('idle_hunter_save_v4') || '{}');
        return { relic: j.relic, sumRelic: j.cnt && j.cnt.sumRelic }; } catch (e) { return null; }
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(k => { try { localStorage.removeItem(k); } catch (e) {} }, KEY);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof relicCost === 'function');
  await p.waitForTimeout(1000);
  await p.addScriptTag({ content: 'window.__snap = ' + snap.toString() + '; window.__saved = ' + saved.toString() + ';' });

  const line = (t, o) => console.log(t.padEnd(26) + JSON.stringify(o, null, 0));

  /* ① 신규 세이브로 유물 페이지 열기 — 가격이 100 인가 */
  line('① 유물 페이지 열기', await p.evaluate(() => { S.relic = 1000; openRelw(); renderRelw(); return window.__snap(); }));

  /* ② [소환] 1회 실클릭 — 100 만 빠지고 다음 가격도 100 그대로 */
  await p.dispatchEvent('#rwBasin', 'pointerdown');
  await p.waitForTimeout(80);
  await p.dispatchEvent('#rwBasin', 'pointerup');
  await p.waitForTimeout(150);
  line('② #rwBasin 1회 클릭', await p.evaluate(() => window.__snap()));

  /* ③ 다시 1회 — 사다리가 없는지(여전히 100 인지) */
  await p.dispatchEvent('#rwBasin', 'pointerdown');
  await p.waitForTimeout(80);
  await p.dispatchEvent('#rwBasin', 'pointerup');
  await p.waitForTimeout(150);
  line('③ 한 번 더 클릭', await p.evaluate(() => window.__snap()));

  /* ④ 세이브(S)에 반영됐는가 — 다른 화면이 아니라 저장소를 본다 */
  line('④ localStorage 세이브', await p.evaluate(() => { save(); return window.__saved(); }));

  /* ⑤ 홀드 연속 소환 — 잔액이 다음 1회분에 못 미치면 스스로 멈추는가 */
  await p.evaluate(() => { S.relic = 100 * 3 + 50; S.cnt.sumRelic = 0; S.own = {}; renderRelw(); });
  await p.dispatchEvent('#rwBasin', 'pointerdown');
  try { await p.waitForFunction(() => typeof rwHold === 'undefined' || !rwHold, null, { timeout: 15000 }); } catch (e) {}
  await p.dispatchEvent('#rwBasin', 'pointerup');
  line('⑤ 예산 350 으로 홀드', await p.evaluate(() => window.__snap()));

  /* ⑥ 유물석 99 — 비용 100 을 못 내면 실패하고 lack 이 켜지는가 */
  line('⑥ 유물석 99 에서 클릭', await p.evaluate(() => {
    S.relic = 99; S.cnt.sumRelic = 0; S.own = {}; renderRelw();
    const got = summonRelic(true);
    return Object.assign({ 소환결과: got === null ? 'null(실패)' : '성공' }, window.__snap());
  }));

  /* ⑦ 구 세이브 — 이미 37회 소환한 유저도 100 (역산하지 않는다) */
  line('⑦ 구 세이브 sumRelic 37', await p.evaluate(() => {
    S.relic = 1e5; S.cnt.sumRelic = 37; renderRelw(); return window.__snap();
  }));

  /* ⑧ 61 가이드 미션 «유물 1회 소환하기» 가 같은 카운터로 진행되는가 */
  line('⑧ 미션 카운터', await p.evaluate(() => {
    S.relic = 1e5; S.cnt.sumRelic = 0; S.own = {};
    const before = S.cnt.sumRelic; summonRelic(true);
    return { 미션전: before, 미션후: S.cnt.sumRelic, cost: relicCost() };
  }));

  console.log('\n콘솔/런타임 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();
