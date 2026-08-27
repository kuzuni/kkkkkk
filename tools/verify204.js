/* 게이트 204 — 던전 입장권 개편 (2026-08-27, 저장소 주인 지시)
 *
 *   ① 매일 리필 폐지 → «출석마다 던전별 +DUN_TRY 적립»(안 쓰면 누적, 3/2 · 5/2 식)
 *   ② 10 상점 재화 탭에서 다이아 → 던전별 입장권 교환
 *
 * 지시서 [3]-(가) 계열(기능 작업)이라 비평가는 띄우지 않는다. 대신 **버튼을 실제로 눌러**
 * «무엇이 바뀌는지» 를 헤드리스로 확인한다(ROUTINE.md «기능 완성 규칙»).
 *
 *   node tools/verify204.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  /* ---------------- [1] 상수·저장 구조 ---------------- */
  console.log('[1] 상수 · 저장 구조');
  const st = await p.evaluate(() => ({
    tries: DUN_TRY, triesOld: DUN_TRY_OLD,
    ids: DUNGEONS.map(d => d.id),
    tkKeys: Object.keys(S.dunTk || {}),
    tkVals: DUNGEONS.map(d => S.dunTk[d.id]),
    dailyHasDun: Object.prototype.hasOwnProperty.call(S.daily, 'dun'),
    defHasDun: Object.prototype.hasOwnProperty.call(DEF().daily, 'dun'),
    prices: DUNGEONS.map(d => dunExPrice(d.id))
  }));
  ok(st.tries === 2, 'DUN_TRY === 2 (표기 분모 = 출석 1회 적립량) — 실측 ' + st.tries);
  ok(st.triesOld === 3, 'DUN_TRY_OLD === 3 (구 세이브 승계 전용) — 실측 ' + st.triesOld);
  ok(!st.defHasDun && !st.dailyHasDun, 'S.daily.dun 폐기 — DEF()·현 세이브 둘 다 키 없음');
  ok(st.ids.every(id => st.tkKeys.includes(id)) && st.tkKeys.length === st.ids.length,
     'S.dunTk 키 ' + st.ids.length + '개, DUNGEONS 와 1:1 (' + st.tkKeys.join('·') + ')');
  ok(st.tkVals.every(v => v === 2), '신규 세이브 초기 입장권 = 2장/던전 (실측 ' + st.tkVals.join(',') + ')');
  ok(st.prices.every(v => Number.isFinite(v) && v > 0 && v % 10 === 0),
     '교환가 ' + st.ids.length + '종 전부 유한·양수·10 단위 (' + st.prices.join(' · ') + ')');

  /* ---------------- [2] ① 일일 리셋이 더는 입장권을 건드리지 않는다 ---------------- */
  console.log('[2] ① 매일 리필 폐지');
  const rs = await p.evaluate(() => {
    const d = DUNGEONS[0].id;
    S.dunTk[d] = 7;                       /* 분모(2)를 넘겨 쌓아 둔 상태 */
    const spins0 = S.daily.spins;
    S.daily.spins = 0;
    S.daily.date = '1999-01-01';          /* 날짜를 갈아 «다음 날» 을 만든다 */
    dailyCheck();
    return { left: S.dunTk[d], spins: S.daily.spins, spins0, refilled: S.daily.date !== '1999-01-01' };
  });
  ok(rs.refilled, '날짜가 바뀌면 dailyCheck() 가 실제로 돈다(룰렛 ' + rs.spins + '회 충전 — 대조군)');
  ok(rs.left === 7, '자정을 넘겨도 입장권은 그대로 7장 — 리셋도, 상한 깎임도 없다 (실측 ' + rs.left + ')');

  /* ---------------- [3] ① 출석 수령마다 던전별 +2 적립 ---------------- */
  console.log('[3] ① 출석마다 +' + st.tries + ' 적립 (누적)');
  const at = await p.evaluate(() => {
    DUNGEONS.forEach(d => S.dunTk[d.id] = 0);
    S.att.date = '';                                    /* 오늘 아직 안 받은 상태 */
    claimAttend(null);
    const a = DUNGEONS.map(d => S.dunTk[d.id]);
    const twice = (() => { claimAttend(null); return DUNGEONS.map(d => S.dunTk[d.id]); })();
    S.att.date = '';                                    /* «다음 날» 출석 */
    claimAttend(null);
    const b = DUNGEONS.map(d => S.dunTk[d.id]);
    return { a, twice, b, saved: (() => { try { return JSON.parse(localStorage.getItem(KEY)).dunTk[DUNGEONS[0].id]; } catch (e) { return 'ERR'; } })() };
  });
  ok(at.a.every(v => v === 2), '출석 1회 → 던전 전부 +2 (실측 ' + at.a.join(',') + ')');
  ok(JSON.stringify(at.twice) === JSON.stringify(at.a), '같은 날 두 번째 수령은 무시 — S.att.date 가 막는다');
  ok(at.b.every(v => v === 4), '다음 날 출석 → 안 쓴 2장 위에 누적되어 4장 (실측 ' + at.b.join(',') + ')');
  ok(at.saved === 4, '적립이 세이브(S)에 저장됐다 — localStorage 실측 ' + at.saved);

  /* ---------------- [4] ① 입장이 입장권을 소모한다 · 0 이면 막힌다 ---------------- */
  console.log('[4] ① 소모 · 소진 차단');
  const use = await p.evaluate(() => {
    const d = DUNGEONS.find(x => !dunLocked(x));
    S.dunTk[d.id] = 2; S.dun[d.id] = 3; S.cp = null;
    const c0 = S.cnt.dungeon;
    challengeDungeon(d);
    const after = { left: S.dunTk[d.id], cnt: S.cnt.dungeon - c0, running: !!dunRun };
    if (typeof endDunRun === 'function') endDunRun(false, true);
    S.dunTk[d.id] = 0;
    const c1 = S.cnt.dungeon;
    challengeDungeon(d);
    const blocked = { left: S.dunTk[d.id], cnt: S.cnt.dungeon - c1, running: !!dunRun };
    if (dunRun && typeof endDunRun === 'function') endDunRun(false, true);
    return { id: d.id, after, blocked };
  });
  ok(use.after.left === 1 && use.after.cnt === 1, '도전 1회 → 입장권 2 → 1 · 던전 카운터 +1 (실측 ' + use.after.left + ')');
  ok(use.after.running, '입장권이 있으면 던전 런이 실제로 시작된다');
  ok(use.blocked.left === 0 && use.blocked.cnt === 0 && !use.blocked.running,
     '0장이면 도전이 막힌다 — 차감도 런도 없음');

  const sw = await p.evaluate(() => {
    const d = DUNGEONS.find(x => !dunLocked(x));
    S.dunTk[d.id] = 3; S.dun[d.id] = 3;
    const g0 = S.gold, r0 = S.relic, di0 = S.dia, s0 = S.stone;
    sweepDungeon(d);
    const got = (S.gold - g0) + (S.relic - r0) + (S.dia - di0) + (S.stone - s0);
    if (typeof closeDunClear === 'function') closeDunClear();
    return { left: S.dunTk[d.id], got };
  });
  ok(sw.left === 2, '소탕도 입장권 1장을 쓴다 (3 → ' + sw.left + ')');
  ok(sw.got > 0, '소탕 보상이 실제 재화로 들어온다 (+' + Math.round(sw.got) + ')');

  /* ---------------- [5] ② 상점 재화 탭 — 다이아 → 입장권 교환 ---------------- */
  console.log('[5] ② 다이아 → 던전별 입장권 교환');
  await p.evaluate(() => { openShopPage(null, 'coin'); });
  await p.waitForTimeout(400);
  const cards = await p.evaluate(() => {
    const els = [...document.querySelectorAll('[data-dunex]')];
    return { n: els.length, ids: els.map(e => e.dataset.dunex),
             wrapH: parseInt(getComputedStyle(document.querySelector('.cn-wrap')).height, 10),
             lastBottom: (() => { const c = [...document.querySelectorAll('.cn-cd.dtk')].pop();
               return c ? c.offsetTop + c.offsetHeight : -1; })(),
             note: (document.querySelector('.cn-tknt i') || {}).textContent || '' };
  });
  ok(cards.n === st.ids.length, '재화 탭에 던전 ' + st.ids.length + '개 교환 칸이 다 있다 (실측 ' + cards.n + ')');
  ok(JSON.stringify(cards.ids) === JSON.stringify(st.ids), '칸 순서 = DUNGEONS 순서 (' + cards.ids.join('·') + ')');
  ok(cards.lastBottom > 0 && cards.wrapH > cards.lastBottom,
     '껍데기 높이가 마지막 칸을 담는다 — wrap ' + cards.wrapH + ' > 칸 바닥 ' + cards.lastBottom);
  ok(/\+2/.test(cards.note) && /3\/2/.test(cards.note),
     '«N/2 의 N 이 분모를 넘는 것이 정상» 안내가 화면에 있다 — “' + cards.note + '”');

  /* 부족 → 안내만, 차감 없음 */
  const poor = await p.evaluate(async () => {
    const id = DUNGEONS[0].id, pr = dunExPrice(id);
    S.dia = pr - 1; S.dunTk[id] = 0; renderCoinPage($('shopList'));
    document.querySelector('[data-dunex="' + id + '"]').click();
    return { dia: S.dia, tk: S.dunTk[id], want: pr };
  });
  ok(poor.dia === poor.want - 1 && poor.tk === 0, '다이아가 모자라면 차감·지급 둘 다 없다');

  /* 충분 → 즉시 지급 + 차감 + 저장 + 다른 화면 반영 */
  const buy = await p.evaluate(async () => {
    const id = DUNGEONS[0].id, pr = dunExPrice(id);
    S.dia = pr * 3; S.dunTk[id] = 0; renderCoinPage($('shopList'));
    const d0 = S.dia;
    document.querySelector('[data-dunex="' + id + '"]').click();
    const saved = JSON.parse(localStorage.getItem(KEY));
    return { id, pr, spent: d0 - S.dia, tk: S.dunTk[id], savedTk: saved.dunTk[id], savedDia: saved.dia };
  });
  ok(buy.spent === buy.pr, '교환 시 다이아가 정가만큼 나간다 (' + buy.pr + ' 실측 ' + buy.spent + ')');
  ok(buy.tk === 1, '입장권이 즉시 +1 (실측 ' + buy.tk + ')');
  ok(buy.savedTk === 1 && buy.savedDia === S_diaOf(buy), '결과가 세이브에 반영된다 (dunTk ' + buy.savedTk + ')');
  function S_diaOf(b) { return b.pr * 3 - b.pr; }

  /* 산 입장권이 03 카드 · 04 세부 · 53 가방에 그대로 보인다 */
  const shows = await p.evaluate(async () => {
    const id = DUNGEONS[0].id, d = DUNGEONS.find(x => x.id === id);
    S.dunTk[id] = 5;                       /* 분모(2)를 넘긴 상태 — «5/2» 가 나와야 한다 */
    openDungeon(); renderDunPage();
    const card = [...document.querySelectorAll('[data-dcard="' + id + '"] .sp.tk i')].map(e => e.textContent)[0] || '';
    openDunDetail(d);
    const detail = ($('dgdTry') || {}).textContent || '';
    closeDunDetail && closeDunDetail();
    const bag = bagUse().filter(r => r.n.indexOf(d.n) === 0).map(r => r.q);
    return { card, detail, bag };
  });
  ok(shows.card === '5/2', '03 던전 카드가 «5/2» 로 분모를 넘겨 표시한다 (실측 “' + shows.card + '”)');
  ok(shows.detail === '5/2', '04 세부 팝업도 «5/2» (실측 “' + shows.detail + '”)');
  ok(shows.bag.length === 1 && shows.bag[0] === 5, '53 가방 소모품 탭에 입장권 5장 (실측 ' + shows.bag.join(',') + ')');

  /* ---------------- [6] 구 세이브 승계 ---------------- */
  console.log('[6] 구 세이브 승계 (S.daily.dun → S.dunTk)');
  const mig = await p.evaluate(() => {
    const today0 = today();
    /* `load()` 는 전역 S 를 갈아 끼우고 «마지막 저장 시각» 을 돌려준다 — 결과는 S 에서 읽는다 */
    /* `load()` 는 전역 S 를 **갈아 끼우고** «마지막 저장 시각» 을 돌려준다 — 결과는 그때그때
       S 에서 스냅숏으로 떠 둔다(같은 객체를 넷이 나눠 가지면 마지막 세이브 값만 남는다). */
    const mk = (o, pick) => { localStorage.setItem(KEY, JSON.stringify(o)); load(); return pick(S); };
    /* ⓐ 오늘자 구 세이브 — 남은 횟수 그대로 승계 */
    const a = mk({ daily: { date: today0, dun: { gold: 1, dia: 0, relic1: 3 } }, dun: { gold: 4 } },
      s => ({ gold: s.dunTk.gold, dia: s.dunTk.dia, relic1: s.dunTk.relic1,
              hasDaily: !!(s.daily && s.daily.dun), floor: s.dun.gold,
              nan: DUNGEONS.filter(x => !Number.isFinite(s.dunTk[x.id])).map(x => x.id) }));
    /* ⓑ 지난 날짜 구 세이브 — 옛 규칙이면 접속 시 리필(3)을 받았을 몫 */
    const b = mk({ daily: { date: '1999-01-01', dun: { gold: 1 } } }, s => s.dunTk.gold);
    /* ⓒ 90 이전 세이브 — `relic` 키가 relic1 로 이사 */
    const c = mk({ daily: { date: today0, dun: { relic: 2 } } }, s => s.dunTk.relic1);
    /* ⓓ 이미 개편된 세이브 — 멱등, dunTk 가 진실 */
    const d = mk({ dunTk: { gold: 9 }, daily: { date: today0, dun: { gold: 1 } } }, s => s.dunTk.gold);
    return { a, b, c, d };
  });
  ok(mig.a.gold === 1 && mig.a.dia === 0 && mig.a.relic1 === 3, 'ⓐ 오늘자 세이브 — 잔여 횟수 그대로 (1·0·3)');
  ok(mig.a.floor === 4, 'ⓐ 던전 층(S.dun)은 손대지 않는다 (4층 유지)');
  ok(!mig.a.hasDaily, 'ⓐ 승계 후 S.daily.dun 은 지워진다 — 죽은 값이 세이브에 안 남는다');
  ok(mig.a.nan.length === 0, 'ⓐ S.dunTk 에 NaN/undefined 0건' + (mig.a.nan.length ? ' — ' + mig.a.nan.join(',') : ''));
  ok(mig.b === 3, 'ⓑ 날짜 지난 세이브 — 옛 리필분 3장 (실측 ' + mig.b + ')');
  ok(mig.c === 2, 'ⓒ 90 이전 `relic` 잔여 2 → relic1 로 이사 (실측 ' + mig.c + ')');
  ok(mig.d === 9, 'ⓓ 이미 dunTk 가 있으면 그것이 진실 — 멱등 (실측 ' + mig.d + ')');

  console.log('');
  ok(errs.length === 0, '콘솔 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  console.log('\nVERIFY204 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
