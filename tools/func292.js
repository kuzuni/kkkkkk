/* 292 기능 체크 — «진짜 포인터 클릭» 으로 주인 보고 경로를 그대로 걷는다.
 *   node tools/func292.js   → 마지막 줄 `FUNC292 PASS n/n` + 기능 체크 표(마크다운)
 *
 * 주인 보고: «가방에는 재화 즉 화폐들만 들어 있으면 됨. 그리고 클릭 시 세부정보 팝업 떠야 함.
 *            재화 클릭 시 세부정보 팝업 뜨라고 했었는데 메인에 골드 버튼 클릭하면 뜨던데 가방에서는 안 뜨네»
 * 그래서 걷는 길도 주인이 걸은 길 그대로다: ▦ 메뉴 → 가방 → 칸을 손으로 누른다.
 * evaluate 로 openCurInfo() 를 직접 부르지 않는다 — 그건 «연결» 이 아니라 «함수 호출» 만 증명한다(LESSONS 65-②).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

let pass = 0, total = 0;
const rows = [];
const chk = (name, cond, extra) => {
  total++;
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else console.log('  ✗ ' + name + (extra ? ' — ' + extra : ''));
};
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1400);

  /* 실제 보유 상태를 만든다 — «준비 중» 이 아니라 진짜 게임 값을 읽는지 보려는 것이다 */
  await page.evaluate(() => {
    S.gold = 1234567; S.dia = 52340; S.relic = 500; S.stone = 40; S.rstone = 30; S.tstone = 20; S.mileage = 6;
    S.own = {}; if (S.daily) S.daily.spins = 3;
    if (S.dunTk) DUNGEONS.forEach((d) => { S.dunTk[d.id] = 5; });
    uiDirty = true;
  });

  /* ---- ① ▦ 메뉴 → 가방 (진짜 클릭) ---- */
  console.log('[①] ▦ 메뉴 → 가방');
  await page.locator('#menub').click();
  await page.waitForTimeout(300);
  await page.locator('#mnw [data-mn="bag"]').click();
  await page.waitForTimeout(400);
  chk('가방이 열린다', await page.evaluate(() => document.getElementById('bagw').classList.contains('on')));

  const cells = await page.evaluate(() =>
    [...document.querySelectorAll('#bagGrid .bg53-c:not(.em)')].map((e) =>
      ({ n: e.dataset.bagn, k: e.dataset.cur, q: e.dataset.bagq, shown: e.querySelector('.ifq').textContent })));
  console.log('    칸: ' + JSON.stringify(cells));
  chk('화폐 7종만 들어 있다', cells.length === 7 && cells.every((c) => c.k), JSON.stringify(cells));
  chk('소모품(입장권·소환권·룰렛)이 안 들어 있다',
    !cells.some((c) => /입장권|무료 소환|룰렛/.test(c.n || '')), JSON.stringify(cells.map((c) => c.n)));
  await page.screenshot({ path: path.resolve(__dirname, '../docs/review/292-r1-가방.png'), clip: { x: 0, y: 0, width: 1080, height: 2280 } });

  /* ---- ② 칸을 하나씩 «손으로» 누른다 ---- */
  console.log('[②] 칸 클릭 → 33 재화 정보 팝업 (전수)');
  for (const c of cells) {
    const sel = '#bagGrid .bg53-c[data-cur="' + c.k + '"]';
    await page.locator(sel).click();
    await page.waitForTimeout(180);
    const st = await page.evaluate(() => {
      const w = document.getElementById('ciw');
      const b = w.querySelector('.ci').getBoundingClientRect();
      return { on: w.classList.contains('on'), key: curInfoKey,
               title: document.getElementById('ciTitle').textContent,
               have: document.getElementById('ciHave').textContent,
               desc: document.getElementById('ciDesc').innerText.trim().slice(0, 30),
               ways: [...document.querySelectorAll('#ciWays>div')].map((d) => d.innerText.replace(/\s+/g, ' ').trim()),
               vis: b.width > 0 && b.height > 0 && b.top >= 0,
               bag: document.getElementById('bagw').classList.contains('on') };
    });
    const good = st.on && st.key === c.k && st.vis && st.bag && st.ways.length > 0 && /^보유: /.test(st.have);
    chk('«' + c.n + '» 칸 → 33 팝업 (제목 «' + st.title + '» · ' + st.have + ' · 획득처 ' + st.ways.length + '줄)',
      good, JSON.stringify(st));
    rows.push('| ' + c.n + ' (`' + c.k + '`) | 칸 수량 «' + c.shown + '» | ' + (good ? '33 팝업이 가방 **위**에 뜬다' : '**실패**')
      + ' | ' + st.title + ' / ' + st.have + ' / 획득처 ' + st.ways.length + '줄 | 가방은 뒤에 열린 채 |');
    if (c.k === 'gold') {
      await page.screenshot({ path: path.resolve(__dirname, '../docs/review/292-r1-골드팝업.png'), clip: { x: 0, y: 0, width: 1080, height: 2280 } });
    }
    /* 딤을 눌러 33 만 닫는다 */
    await page.mouse.click(30, 60);
    await page.waitForTimeout(150);
    const back = await page.evaluate(() => ({
      ci: document.getElementById('ciw').classList.contains('on'),
      bag: document.getElementById('bagw').classList.contains('on') }));
    chk('«' + c.n + '» — 팝업만 닫히고 가방으로 돌아온다', !back.ci && back.bag, JSON.stringify(back));
  }

  /* ---- ③ 값이 바뀌면 팝업도 따라온다(«준비 중» 목업이 아님을 못 박는다) ---- */
  console.log('[③] 실제 게임 값 연동');
  await page.locator('#bagGrid .bg53-c[data-cur="dia"]').click();
  await page.waitForTimeout(150);
  const live = await page.evaluate(() => {
    const before = document.getElementById('ciHave').textContent;
    S.dia += 10000; renderCurInfo();
    return { before, after: document.getElementById('ciHave').textContent, dia: S.dia };
  });
  chk('다이아를 늘리면 팝업 보유량이 따라 바뀐다 (' + live.before + ' → ' + live.after + ')',
    live.before !== live.after && live.after === '보유: ' + live.dia.toLocaleString('en-US'), JSON.stringify(live));
  rows.push('| (연동 확인) | `S.dia += 10000` | 팝업 재렌더 | ' + live.before + ' → ' + live.after + ' | 목업 아님 |');
  await page.mouse.click(30, 60);
  await page.waitForTimeout(250);
  chk('연동 확인 뒤 33 만 닫힌다', await page.evaluate(() => !document.getElementById('ciw').classList.contains('on')
    && document.getElementById('bagw').classList.contains('on')));

  /* ---- ④ 가방을 닫으면 원래대로 ---- */
  console.log('[④] 닫기');
  const before4 = await page.evaluate(() => ({
    ci: document.getElementById('ciw').classList.contains('on'),
    bag: document.getElementById('bagw').classList.contains('on'),
    at: (document.elementFromPoint(30, 60) || {}).id || '-' }));
  await page.mouse.click(30, 60);
  await page.waitForTimeout(300);
  chk('딤을 누르면 가방이 닫힌다',
    await page.evaluate(() => !document.getElementById('bagw').classList.contains('on')),
    '클릭 직전 상태 ' + JSON.stringify(before4));

  /* ---- ⑤ 저장 구조 — 292 는 세이브를 건드리지 않는다 ---- */
  const save = await page.evaluate(() => {
    save && save();
    const raw = localStorage.getItem('idle_hunter_save_v4');
    const o = JSON.parse(raw || '{}');
    return { has: !!raw, keys: Object.keys(o).length, dia: o.dia, bagKeys: Object.keys(o).filter((k) => /bag/i.test(k)) };
  }).catch(() => ({ has: false }));
  chk('세이브 키에 가방 상태가 새로 안 생겼다(저장 구조 불변)',
    save.has && save.bagKeys.length === 0, JSON.stringify(save));

  chk('콘솔 에러 0건', errs.length === 0, errs.join(' | '));
  await browser.close();

  console.log('\n### 기능 체크 표 (지시서 «기능 완성 규칙»)\n');
  console.log('| 누른 것 | 상태 | 무엇이 바뀌는가 | 팝업 내용 | 부작용 |');
  console.log('|---|---|---|---|---|');
  rows.forEach((r) => console.log(r));
  console.log('\n' + (pass === total ? 'FUNC292 PASS ' : 'FUNC292 FAIL ') + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})();
