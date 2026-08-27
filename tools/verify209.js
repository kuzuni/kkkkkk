/* 게이트 209 — 03 던전 팝업 «탑» 탭 = 「시련의 탑」 (2026-08-27, 저장소 주인 지시)
 *
 * 주인 원문: «던전 팝업에 탭 추가해서 '탑' — 시련의 탑. 소탕 없고, 클리어마다 단계 오르고,
 *             전 단계 재도전 불가, 클리어마다 유물석(→ 기존 재화 «유물조각/rel» 로 해석)».
 *
 * 지시서 [3]-(가) 계열(기능 작업)이라 비평가는 띄우지 않는다. 대신 **버튼을 실제로 눌러**
 * «무엇이 바뀌는지» 를 헤드리스로 확인한다(ROUTINE.md «기능 완성 규칙»).
 *
 * 이 게이트가 지키는 4가지 = 지시 4개다:
 *   ① 입장 제한이 없다 — 입장권(S.dunTk)·던전 카운터를 한 톨도 안 건드린다
 *   ② 클리어하면 층이 오른다 — S.tower +1 이 세이브에 남고 보상(유물조각)이 실제로 들어온다
 *   ③ 이전 층은 재도전할 수 없다 — ◀▶ 잠금 · 클리어 화면 [재도전] 잠금
 *   ④ 소탕이 없다 — [소탕] 은 레이드·아레나와 같은 자물쇠 상태이고 sweepDungeon 이 안 불린다
 *
 *   node tools/verify209.js
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

  /* ---------------- [1] 데이터 · 저장 구조 ---------------- */
  console.log('[1] 데이터 · 저장 구조');
  const st = await p.evaluate(() => ({
    id: TOWER.id, n: TOWER.n,
    req: [1, 2, 5, 10].map(f => TOWER.req(f)),
    rw:  [1, 2, 5, 10].map(f => TOWER.rw(f).rel),
    rwKeys: Object.keys(TOWER.rw(3)),
    inDun: DUNGEONS.some(d => d.id === 'tower'),
    dunIds: DUNGEONS.map(d => d.id),
    uiKeys: Object.keys(DUN_UI),
    stateKeys: Object.keys(DUN_STATE),
    hasUi: !!DUN_UI.tower,
    thk: (DUN_UI.tower || {}).thk, thi: (DUN_UI.tower || {}).thi,
    animExists: !!(ATLAS[(DUN_UI.tower || {}).thk] && ATLAS[(DUN_UI.tower || {}).thk].a
                   && ATLAS[(DUN_UI.tower || {}).thk].a[(DUN_UI.tower || {}).thi]),
    animTaken: Object.keys(DUN_UI).filter(k => k !== 'tower')
                     .some(k => DUN_UI[k].thk === DUN_UI.tower.thk && DUN_UI[k].thi === DUN_UI.tower.thi),
    tower: S.tower, defTower: DEF().tower,
    locked: typeof dunLocked === 'function' ? dunLocked(TOWER) : 'ERR'
  }));
  ok(st.id === 'tower' && st.n === '시련의 탑', 'TOWER 정의 — id/이름 (' + st.id + ' · ' + st.n + ')');
  ok(st.req.every(v => Number.isFinite(v) && v > 0) && st.req.every((v, i) => i === 0 || v > st.req[i - 1]),
     '요구 곡선이 유한·양수·층마다 단조 증가 (' + st.req.map(v => Math.round(v)).join(' → ') + ')');
  ok(st.rw.every(v => Number.isFinite(v) && v > 0) && st.rw.every((v, i) => i === 0 || v > st.rw[i - 1]),
     '보상이 층에 비례해 증가 (' + st.rw.join(' → ') + ')');
  ok(JSON.stringify(st.rwKeys) === '["rel"]', '클리어 보상 = 유물조각(rel) 한 종 (' + st.rwKeys.join(',') + ')');
  /* 90 이 폐기한 «수련의 탑»(= 던전 목록 안의 카드) 과 다른 것임을 여기서 못 박는다.
     목록에 들어가는 순간 입장권·소탕·층 선택이 딸려 와 지시 ①③④ 가 통째로 깨진다. */
  ok(!st.inDun, 'DUNGEONS 에는 없다 — 탑은 전용 탭 콘텐츠다 (' + st.dunIds.join('·') + ')');
  ok(st.hasUi, 'DUN_UI.tower 존재 — 카드 기하·178 보스 스프라이트가 한 소스에서 나온다');
  /* 194-4 — «N종까지만» 은 대개 «그때 N개였다» 는 기록이다. 지키려던 규칙은 «던전마다 UI 가 1개»
     이므로 ⊇ 로 묻고, 던전이 아닌 추가 키는 아래 화이트리스트로만 허용한다. */
  ok(st.dunIds.every(id => st.uiKeys.includes(id))
     && st.uiKeys.filter(k => !st.dunIds.includes(k)).join(',') === 'tower',
     'DUN_UI = DUNGEONS 전부 + 던전 아닌 키는 tower 하나뿐 (' + st.uiKeys.length + '개)');
  ok(st.dunIds.every(id => st.stateKeys.includes(id)) && st.stateKeys.length === st.dunIds.length,
     'DUN_STATE 는 DUNGEONS 와 1:1 그대로 — 탑은 자체 문구를 쓴다 (' + st.stateKeys.length + '개)');
  ok(st.animExists, '썸네일 애니가 아틀라스에 실재한다 (' + st.thk + '/' + st.thi + ')');
  ok(!st.animTaken, '없는 몬스터를 그리지 않되 다른 던전과 포즈가 겹치지 않는다(97 규칙)');
  ok(st.defTower === 1 && st.tower === 1, '신규 세이브 S.tower = 1 (실측 ' + st.tower + ')');
  ok(st.locked === false, '탑은 처음부터 열려 있다 — dunLocked(TOWER) === false');

  /* ---------------- [2] 서브탭 3칸 · 실제 클릭 ---------------- */
  console.log('[2] 03 서브탭 «컨텐츠 · 던전 · 탑»');
  await p.evaluate(() => { closeDunDetail(); openDungeon(); });
  await p.waitForTimeout(400);
  const tabs = await p.$$eval('#dunSub [data-dsub]', els => els.map(e => ({
    k: e.dataset.dsub, txt: e.textContent.trim(), on: e.classList.contains('on') })));
  ok(tabs.length === 3, '서브탭 3칸 (' + tabs.map(t => t.k).join(',') + ')');
  ok(tabs.some(t => t.k === 'tower' && t.txt.indexOf('탑') === 0), '«탑» 칸 존재 (data-dsub="tower")');
  ok(tabs.filter(t => t.k === 'raid' || t.k === 'dun').length === 2, '기존 «컨텐츠»·«던전» 칸이 그대로 남아 있다');
  const sp = await p.$eval('#dunSub', e => e.className);
  ok(/\bsp3\b/.test(sp) && !/\bsp2\b/.test(sp), '공용 부품 3칸 규격(.stabs.sp3) — 실측 "' + sp + '"');
  /* evaluate 로 setDunSub 만 부르면 74·142 계열(«눌림은 뜨는데 동작 안 함»)이 안 잡힌다 → 진짜 클릭 */
  await p.click('#dunSub [data-dsub="tower"]');
  await p.waitForTimeout(350);
  const after = await p.evaluate(() => ({
    sub: dunSub,
    on: [...document.querySelectorAll('#dunSub [data-dsub]')].filter(t => t.classList.contains('on')).map(t => t.dataset.dsub),
    cards: document.querySelectorAll('#dunList .dnc').length,
    tcards: document.querySelectorAll('#dunList [data-tcard]').length,
    dcards: document.querySelectorAll('#dunList [data-dcard]').length,
    rcards: document.querySelectorAll('#dunList [data-rcard]').length
  }));
  ok(after.sub === 'tower' && after.on.join(',') === 'tower', '탭을 누르면 «탑» 만 활성 (실측 ' + after.on.join(',') + ')');
  ok(after.tcards === 1 && after.dcards === 0 && after.rcards === 0,
     '리스트가 탑 카드 1장으로 바뀐다 (탑 ' + after.tcards + ' · 던전 ' + after.dcards + ' · 측정장 ' + after.rcards + ')');

  /* ---------------- [3] 카드 내용 · 레드닷 규칙 ---------------- */
  console.log('[3] 탑 카드');
  const card = await p.evaluate(() => {
    const c = document.querySelector('#dunList [data-tcard]');
    const t = s => { const e = c.querySelector(s); return e ? e.textContent.trim() : null; };
    return { nm: t('.nm'), lv: t('.sp.lv'), tk: t('.sp.tk'), lbA: t('.lb.a'), lbB: t('.lb.b'),
             pill: t('.pill'), sweep: !!c.querySelector('[data-sweep],.sweep'),
             lock: c.classList.contains('lkd'), canvas: !!c.querySelector('canvas.thcv') };
  });
  ok(card.nm === '시련의 탑', '카드 이름 = 시련의 탑 (실측 ' + card.nm + ')');
  ok(card.lbA === '층' && /1$/.test(card.lv || ''), '좌 캡슐 = «층» + 현재 층 1 (실측 ' + card.lbA + '/' + card.lv + ')');
  ok(card.lbB === '입장 제한' && /없음$/.test(card.tk || ''),
     '우 캡슐 = «입장 제한 / 없음» — 입장권 표기가 아니다 (실측 ' + card.lbB + '/' + card.tk + ')');
  ok(/유물조각/.test(card.pill || ''), '보상 알약 = 유물조각 (실측 ' + card.pill + ')');
  ok(!card.sweep, '④ 카드에 소탕 버튼이 없다');
  ok(!card.lock, '잠금 상태가 아니다');
  ok(card.canvas, '썸네일 캔버스(72/97 규격)가 있다');
  const dot = await p.evaluate(() => {
    const read = () => !!document.querySelector('#dunList [data-tcard] .dot');
    const lo = (() => { S.tower = 99; renderTowerPage(); return read(); })();   /* 요구 전투력 >> cp */
    const hi = (() => { S.tower = 1;  renderTowerPage(); return read(); })();
    return { lo, hi, cp: cp(), need1: TOWER.req(1), need99: TOWER.req(99) };
  });
  ok(dot.hi && !dot.lo, '166 레드닷 — 깰 만할 때만 켜진다 (1층 ' + dot.hi + ' · 99층 ' + dot.lo + ')');

  /* ---------------- [4] 04 세부 팝업 — 탑 모드 ---------------- */
  console.log('[4] 04 세부 팝업 (탑 모드)');
  await p.click('#dunList [data-tcard]');
  await p.waitForTimeout(400);
  const dgd = await p.evaluate(() => ({
    open: document.getElementById('dgdw').classList.contains('on'),
    mode: { tower: !!dgdTower, dun: !!dgdDun, raid: !!dgdRaid, arena: !!dgdArena },
    title: document.getElementById('dgdTitle').textContent.trim(),
    lvL: document.getElementById('dgdLvL').textContent.trim(),
    floor: document.getElementById('dgdFloor').textContent.trim(),
    try: document.getElementById('dgdTry').textContent.trim(),
    amt: document.getElementById('dgdAmt').textContent.trim(),
    prev: document.getElementById('dgdPrev').disabled,
    next: document.getElementById('dgdNext').disabled,
    sweepLk: document.getElementById('dgdSweep').classList.contains('lk'),
    sweepOff: document.getElementById('dgdSweep').disabled,
    goOff: document.getElementById('dgdGo').disabled,
    want: fmtCur('rel', TOWER.rw(S.tower).rel)
  }));
  ok(dgd.open, '카드를 누르면 세부 팝업이 열린다');
  ok(dgd.mode.tower && !dgd.mode.dun && !dgd.mode.raid && !dgd.mode.arena,
     '넷 중 탑 모드 하나만 켜진다 (' + JSON.stringify(dgd.mode) + ')');
  ok(dgd.title === '시련의 탑' && dgd.lvL === '층', '제목·라벨이 탑 문구 (' + dgd.title + ' / ' + dgd.lvL + ')');
  ok(dgd.floor === '1', '현재 층 표시 = 1 (실측 ' + dgd.floor + ')');
  ok(dgd.try === '무제한', '① 입장 제한 칸 = «무제한» (실측 ' + dgd.try + ')');
  ok(dgd.amt === dgd.want && dgd.amt !== '', '보상 표기 = TOWER.rw(층) (실측 ' + dgd.amt + ')');
  ok(dgd.prev && dgd.next, '③ ◀▶ 둘 다 잠김 — 현재 층만 도전한다');
  ok(dgd.sweepLk && dgd.sweepOff, '④ [소탕] 은 자물쇠 + 비활성 (레이드·아레나와 같은 상태)');
  ok(!dgd.goOff, '[도전] 은 활성 — 막을 조건이 없다');
  /* ③ 화살표를 실제로 눌러도 층이 안 움직인다(disabled 를 우회하는 코드 경로가 없는지) */
  const arrow = await p.evaluate(() => {
    const f0 = document.getElementById('dgdFloor').textContent.trim();
    document.getElementById('dgdPrev').onclick(); document.getElementById('dgdNext').onclick();
    return { f0, f1: document.getElementById('dgdFloor').textContent.trim(), tower: S.tower };
  });
  ok(arrow.f0 === arrow.f1 && arrow.tower === 1, '③ 핸들러를 직접 불러도 층이 안 바뀐다 (' + arrow.f0 + ' → ' + arrow.f1 + ')');

  /* ---------------- [5] ① 입장 — 입장권·던전 카운터를 안 건드린다 ---------------- */
  console.log('[5] ① 입장 제한 없음');
  const enter = await p.evaluate(() => {
    const tk0 = JSON.stringify(S.dunTk), c0 = S.cnt.dungeon;
    document.getElementById('dgdGo').click();
    const r = { running: !!dunRun, id: dunRun && dunRun.d.id, f: dunRun && dunRun.f,
                need: dunRun && dunRun.need, ttl: document.getElementById('dunTtl').textContent.trim(),
                mode: document.getElementById('app').classList.contains('dunrun'),
                tk1: JSON.stringify(S.dunTk), cnt: S.cnt.dungeon - c0, tk0,
                boss: typeof dunBossType === 'function' ? dunBossType(TOWER).atlas : 'ERR' };
    return r;
  });
  ok(enter.running && enter.id === 'tower' && enter.f === 1, '[도전] → 1층 런이 실제로 시작된다 (' + enter.id + ' ' + enter.f + '층)');
  ok(enter.mode, '#app.dunrun 전투 화면으로 전환된다');
  ok(/시련의 탑 - 1층/.test(enter.ttl), 'HUD 제목이 «시련의 탑 - 1층» (실측 ' + enter.ttl + ')');
  ok(Number.isFinite(enter.need) && enter.need > 0, '요구 피해가 TOWER.req 에서 계산된다 (' + Math.round(enter.need) + ')');
  ok(enter.tk0 === enter.tk1, '① 입장권을 한 장도 안 쓴다 (S.dunTk 불변)');
  ok(enter.cnt === 0, '① 던전 입장 카운터(S.cnt.dungeon)도 안 올린다 — 탑은 던전이 아니다');
  ok(enter.boss === 'elves', '178 던전 보스가 탑에서도 선다 — DUN_UI.tower 아틀라스 (' + enter.boss + ')');

  /* ---------------- [6] ② 실패 → 층 불변 · 같은 층 재도전 가능 ---------------- */
  console.log('[6] ② 실패 처리');
  const failRun = await p.evaluate(() => {
    endDunRun(false, false);                       /* 시간 초과 = 실패 */
    const t = S.tower, pop = document.getElementById('modal').classList.contains('on');
    if (typeof closeModal === 'function') closeModal(); else document.getElementById('modal').classList.remove('on');
    challengeTower();                              /* 같은 층 재도전 */
    const again = { running: !!dunRun, f: dunRun && dunRun.f };
    return { t, pop, again };
  });
  ok(failRun.t === 1, '실패해도 층은 그대로 1 (실측 ' + failRun.t + ')');
  ok(failRun.pop, '실패 안내가 뜬다');
  ok(failRun.again.running && failRun.again.f === 1, '② 실패한 «같은 층» 은 몇 번이든 다시 도전할 수 있다');

  /* ---------------- [7] ② 클리어 → 층 +1 · 유물조각 지급 · 저장 ---------------- */
  console.log('[7] ② 클리어 → 단계 상승 + 보상');
  const clear = await p.evaluate(() => {
    S.relic = 0;
    const want = TOWER.rw(S.tower).rel;
    endDunRun(true, false);                        /* 요구 피해 달성 = 클리어 */
    const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)).tower; } catch (e) { return 'ERR'; } })();
    return { tower: S.tower, relic: S.relic, want, saved,
             clw: document.getElementById('dclw').classList.contains('on'),
             amt: document.getElementById('dclAmt').textContent.trim(),
             tryL: document.getElementById('dclTryL').textContent.trim(),
             re: document.getElementById('dclRe').disabled, nx: document.getElementById('dclNx').disabled };
  });
  ok(clear.tower === 2, '② 클리어 → 층 1 → 2 (실측 ' + clear.tower + ')');
  ok(clear.relic === clear.want && clear.want > 0, '② 유물조각이 실제로 들어온다 (+' + clear.relic + ')');
  ok(clear.saved === 2, '② 진행이 세이브(S)에 남는다 — localStorage 실측 ' + clear.saved);
  ok(clear.clw, '31 클리어 화면이 뜬다');
  ok(clear.amt !== '' && clear.amt !== '0', '클리어 화면 보상 수량 표기 (실측 ' + clear.amt + ')');
  ok(clear.tryL === '♾', '클리어 화면 «남은 횟수» 자리 = ♾ (실측 ' + clear.tryL + ')');
  ok(clear.re && !clear.nx, '③ [재도전] 잠김 · [다음] 활성 — 깬 층은 다시 못 간다');

  /* ---------------- [8] ③ [다음] = 새로 열린 층 ---------------- */
  console.log('[8] ③ 다음 층으로');
  const nx = await p.evaluate(() => {
    document.getElementById('dclNx').click();
    const r = { running: !!dunRun, f: dunRun && dunRun.f, id: dunRun && dunRun.d.id };
    /* ③ [재도전] 핸들러를 직접 불러도 아무 일이 없어야 한다(잠금이 UI 에만 있으면 안 된다) */
    if (dunRun) endDunRun(false, true);
    document.getElementById('dclRe').click();
    r.reRan = !!dunRun;
    if (dunRun) endDunRun(false, true);
    return r;
  });
  ok(nx.running && nx.id === 'tower' && nx.f === 2, '[다음] → 2층 런 시작 (실측 ' + nx.f + '층)');
  ok(!nx.reRan, '③ [재도전] 핸들러를 직접 불러도 런이 안 시작된다');

  /* ---------------- [9] ④ 소탕 경로가 탑에 없다 ---------------- */
  console.log('[9] ④ 소탕 없음');
  const sw = await p.evaluate(() => {
    openTowerDetail();
    const relic0 = S.relic, t0 = S.tower;
    document.getElementById('dgdSweep').onclick();      /* 자물쇠 상태에서 직접 호출 */
    const r = { relic: S.relic - relic0, tower: S.tower - t0,
                srcHasTower: /sweepDungeon\(TOWER\)/.test(document.documentElement.innerHTML) };
    closeDunDetail();
    return r;
  });
  ok(sw.relic === 0 && sw.tower === 0, '④ [소탕] 핸들러를 직접 불러도 보상·층이 안 움직인다');
  ok(!sw.srcHasTower, '④ 소스 어디에도 sweepDungeon(TOWER) 경로가 없다');

  /* ---------------- [10] 일일 리셋과 무관 · 세이브 방어 ---------------- */
  console.log('[10] 영구 진행 · 세이브');
  /* ⚠ `load()` 는 «남은 시각» 을 돌려주고 세이브는 **전역 S 에 심는다** — 반환값에서 층을 읽으면
     언제나 undefined 다(1회차에 실제로 그렇게 짰다가 빨개졌다). 심긴 뒤의 `S.tower` 를 본다. */
  const perm = await p.evaluate(() => {
    S.tower = 7;
    S.daily.date = '1999-01-01';
    dailyCheck();
    const afterDay = S.tower;
    save();
    const bad = [];
    [0, -3, null, NaN, 2.7, '5'].forEach(v => {
      const raw = JSON.parse(localStorage.getItem(KEY));
      raw.tower = v;
      localStorage.setItem(KEY, JSON.stringify(raw));
      load();
      bad.push(S.tower);
    });
    const raw = JSON.parse(localStorage.getItem(KEY));
    delete raw.tower;                                  /* 구 세이브(키 자체가 없음) */
    localStorage.setItem(KEY, JSON.stringify(raw));
    load();
    return { afterDay, bad, old: S.tower };
  });
  ok(perm.afterDay === 7, '일일 리셋(dailyCheck)이 층을 안 건드린다 (실측 ' + perm.afterDay + ')');
  ok(perm.old === 1, '구 세이브(키 없음) → 1 로 채워진다 (실측 ' + perm.old + ')');
  ok(perm.bad.every(v => Number.isInteger(v) && v >= 1),
     '손댄 값(0·음수·null·NaN·소수)이 전부 1 이상 정수로 정화된다 (' + perm.bad.join(',') + ')');

  /* ---------------- [11] 콘솔 에러 ---------------- */
  console.log('[11] 런타임');
  ok(errs.length === 0, '콘솔·페이지 에러 0건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));

  console.log('\nVERIFY209 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL ' + fail : '  ✓ PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
