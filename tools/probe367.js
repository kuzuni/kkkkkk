/* 367 재현·실측 — 행운 룰렛 «앞 3회 무료 · 뒤 2회 광고»
 *
 *   node tools/probe367.js
 *
 * 338·341·350 규칙: 처방을 따르기 전에 **재현**부터 한다. 등재문의 처방은 셋을 전제한다 —
 *   ⓐ 지금 5회가 «전부 무료» 인가                      → [1] 회차별 라벨·뱃지를 5번 다 눌러 찍는다
 *   ⓑ ▶AD 뱃지를 얹을 «빈 자리» 가 버튼 안에 있는가     → [2] 버튼·라벨 잉크·`.updot` 실측
 *   ⓒ 124(광고 제거)·190 규약을 이 화면이 이미 아는가   → [3] `#app.noads` 아래 룰렛 표식 수
 *
 * 회전 3.9초를 기다리지 않으려고 `roulSpinTo` 를 «즉시 결판» 로 갈아 끼운다(원판을 떼면
 * `roulSpinTo` 의 `gone()` 경로가 그대로 `roulFinish` 를 부른다 — 181 이 세운 보증이다).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const r2 = n => Math.round(n * 100) / 100;

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, best: 40 })]);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof openRoulette === 'function');
  await p.waitForTimeout(900);
  await p.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* 회전 대기 없이 결판내는 사본 — 지급·차감 경로는 제품 그대로 지나간다 */
  await p.evaluate(() => { window.__spinTo = roulSpinTo; window.roulSpinTo = idx => { roulFinish(idx); }; });

  const snap = () => p.evaluate(() => {
    const ink = el => { if (!el) return null; const r = document.createRange(); r.selectNodeContents(el);
      const b = r.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
    const bt = document.getElementById('rouBtn');
    const br = bt ? bt.getBoundingClientRect() : null;
    const lb = bt ? bt.querySelector('b') : null;
    const li = ink(lb);
    const dot = bt ? bt.querySelector('.updot') : null;
    const dr = dot ? dot.getBoundingClientRect() : null;
    const ad = bt ? bt.querySelector('.ad,.adbadge,.rou-ad') : null;
    const ar = ad ? ad.getBoundingClientRect() : null;
    const g = document.getElementById('rouGuide');
    return {
      spins: S.daily.spins,
      total: (typeof ROUL_TRY !== 'undefined' ? ROUL_TRY : ROUL_FREE),
      free: ROUL_FREE, ad: (typeof ROUL_AD !== 'undefined' ? ROUL_AD : 0),
      guide: g ? g.textContent.trim() : null,
      label: lb ? lb.textContent : null,
      disabled: bt ? bt.disabled : null,
      alert: bt ? bt.classList.contains('alert') : null,
      btn: br ? { x: br.x, y: br.y, w: br.width, h: br.height } : null,
      labInk: li && br ? { x: li.x - br.x, y: li.y - br.y, w: li.w, h: li.h } : null,
      dot: dr && br ? { x: dr.x - br.x, y: dr.y - br.y, w: dr.width, h: dr.height } : null,
      adBadge: ar && br ? { cls: ad.className, x: ar.x - br.x, y: ar.y - br.y, w: ar.width, h: ar.height,
                            shown: getComputedStyle(ad).display !== 'none' } : null,
      noads: document.getElementById('app').classList.contains('noads')
    };
  });

  /* ---- [1] 회차별 — 5회를 다 눌러 «무료 / 광고» 갈래가 실제로 갈리는지 ---- */
  await p.evaluate(() => { S.pass.noAds = false; if (typeof syncNoAds === 'function') syncNoAds();
                           S.daily.spins = (typeof ROUL_TRY !== 'undefined' ? ROUL_TRY : ROUL_FREE); openRoulette(); });
  await p.waitForTimeout(250);
  const s0 = await snap();
  console.log('[상수] ROUL_FREE ' + s0.free + ' · ROUL_AD ' + s0.ad + ' · 하루 총 ' + s0.total + '회');
  console.log('[1] 회차별 라벨·▶AD 뱃지 (광고 제거 이용권 없음)');
  console.log('  회차 | 남은 | 버튼 라벨              | ▶AD | 레드닷 | 안내줄');
  const rows = [];
  for (let i = 1; i <= s0.total; i++) {
    const s = await snap();
    rows.push(s);
    console.log('   ' + i + '   |  ' + s.spins + '   | ' + String(s.label).padEnd(22)
      + ' |  ' + (s.adBadge && s.adBadge.shown ? 'O' : '-') + '  |   ' + (s.alert ? 'O' : '-')
      + '    | ' + s.guide);
    await p.evaluate(() => spinRoulette());
    await p.waitForTimeout(120);
  }
  const after = await snap();
  console.log('   소진|  ' + after.spins + '   | ' + String(after.label).padEnd(22)
    + ' |  ' + (after.adBadge && after.adBadge.shown ? 'O' : '-') + '  |   ' + (after.alert ? 'O' : '-')
    + '    | ' + after.guide);
  const adRounds = rows.filter(r => r.adBadge && r.adBadge.shown).length;
  console.log('  → ▶AD 를 요구하는 회차: ' + adRounds + ' / ' + s0.total
    + (adRounds === 0 ? '   ⇒ 지금은 «5회 전부 무료» (등재문 ⓐ 확인)' : ''));

  /* ---- [2] 버튼 안 빈 자리 — ▶AD 뱃지를 어디에 놓을 수 있나 ---- */
  const g = rows[0];
  console.log('\n[2] [룰렛 돌리기] 버튼 기하 (모달 본문 기준 아님 — 버튼 좌상단 기준)');
  console.log('  버튼   ' + r2(g.btn.w) + '×' + r2(g.btn.h) + ' @ 화면 x' + r2(g.btn.x) + ' y' + r2(g.btn.y));
  console.log('  라벨 잉크 x' + r2(g.labInk.x) + '~' + r2(g.labInk.x + g.labInk.w)
    + ' y' + r2(g.labInk.y) + '~' + r2(g.labInk.y + g.labInk.h) + '  (' + r2(g.labInk.w) + '×' + r2(g.labInk.h) + ')');
  if (g.dot) console.log('  레드닷 x' + r2(g.dot.x) + ' y' + r2(g.dot.y) + ' ' + r2(g.dot.w) + '×' + r2(g.dot.h)
    + ' (321 — 우상단 24,24)');
  console.log('  좌측 빈 폭 = 라벨 좌변 ' + r2(g.labInk.x) + 'px  ·  우측 빈 폭 = '
    + r2(g.btn.w - (g.labInk.x + g.labInk.w)) + 'px');

  /* ---- [3] 124 규약 — 광고 제거 이용권을 켜면 이 화면의 표식이 사라지나 ---- */
  await p.evaluate(() => { S.pass.noAds = true; if (typeof syncNoAds === 'function') syncNoAds();
                           S.daily.spins = 1; openRoulette(); });
  await p.waitForTimeout(200);
  const na = await snap();
  console.log('\n[3] 124 광고 제거 이용권 보유 (남은 1회 = 광고 구간)');
  console.log('  #app.noads ' + na.noads + ' · 라벨 «' + na.label + '» · ▶AD '
    + (na.adBadge ? (na.adBadge.shown ? '보임(위반)' : '숨김') : '노드 없음'));

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
})();
