#!/usr/bin/env node
/* 25 (06 장비 팝업 개정) 회귀 검증 — `node verify25.js`
 *
 * `docs/review/25-장비카드1개3슬롯.md` §2 좌표표 · §3 연결표 · 시각 검수 D1/D5/D8 을 그대로 재현한다.
 * 06 을 다시 손대는 세션(2차 폴리시 라운드·50 코스튬 탭)은 손대기 «전/후» 로 한 번씩 돌려
 * 회귀 0 을 확인할 것. 통과하면 VERIFY PASS, 하나라도 어긋나면 어긋난 값과 함께 exit 1.
 * (smoke.js 는 «깨졌나» 만 보고 좌표는 안 본다 — 그래서 이게 따로 있다) */
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, 'node_modules', 'playwright'));
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

const fails = [];
const fail = (m) => { fails.push(m); console.log('  X ' + m); };
const ok = (m) => console.log('  o ' + m);

(async () => {
  /* smoke.js 와 같은 폴백 — 번들 브라우저가 없는 러너에서는 /opt/pw-browsers/chromium 을 쓴다 */
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const p2 = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p2)) throw e;
    console.log('[i] 번들 브라우저 없음 → ' + p2 + ' 사용');
    browser = await chromium.launch({ executablePath: p2 });
  }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  // 영웅 탭 → 장비 화면
  await page.click('.tab[data-t="hero"]');
  await page.waitForTimeout(500);
  const on = await page.evaluate(() => document.getElementById('eqw').classList.contains('on'));
  if (!on) fail('#eqw 가 열리지 않았다'); else ok('#eqw 열림');

  /* --- §2 좌표: .eqp 패널 local 좌표 기준 --- */
  const geo = await page.evaluate(() => {
    const scale = document.getElementById('app').getBoundingClientRect().width / 1080;
    const base = document.querySelector('#eqw .eqp').getBoundingClientRect();
    const B = document.getElementById('eqw').getBoundingClientRect();
    const R = (sel, root) => {
      const e = (root || document).querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect();
      return [Math.round((r.left - base.left) / scale), Math.round((r.top - base.top) / scale),
              Math.round(r.width / scale), Math.round(r.height / scale)];
    };
    const all = (sel) => [...document.querySelectorAll(sel)].map(e => {
      const r = e.getBoundingClientRect();
      return [Math.round((r.left - base.left) / scale), Math.round((r.top - base.top) / scale),
              Math.round(r.width / scale), Math.round(r.height / scale)];
    });
    const pr = document.querySelector('#eqw .eqp').getBoundingClientRect();
    // 프레임 밖으로 나간 #eqw 요소
    const app = document.getElementById('app').getBoundingClientRect();
    let out = 0;
    document.querySelectorAll('#eqw *').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.left < app.left - 1 || r.top < app.top - 1 || r.right > app.right + 1 || r.bottom > app.bottom + 1) out++;
    });
    return {
      eqp: [0, 0, Math.round(pr.width / scale), Math.round(pr.height / scale)],
      eqc: R('#eqw .eqc'), sky: R('#eqw .eqc .sky'), gnd: R('#eqw .eqc .gnd'),
      rb: R('#eqw .eqrb'), rbText: (document.querySelector('#eqw .eqrb b i') || {}).textContent,
      slots: all('#eqw .eqsl'), badges: all('#eqw .eqbd'),
      badgeIc: [...document.querySelectorAll('#eqw .eqbd em')].map(e => e.textContent),
      il: R('#eqw .eqil'),
      sta: R('#eqw .eqst.a'), stb: R('#eqw .eqst.b'),
      sw: R('#eqw .eqic.sw'), hp: R('#eqw .eqic.hp'),
      nLock: document.querySelectorAll('#eqw .eqlk').length,
      nBand: document.querySelectorAll('#eqw .band').length,
      nCards: document.querySelectorAll('#eqw .eqrb').length,
      // 알약이 아이콘보다 앞에(=아래에) 있는가: DOM 순서 확인
      order: [...document.querySelectorAll('#eqCards > div')].map(e => e.className),
      out,
    };
  });

  const eq = (name, got, want) => {
    const g = JSON.stringify(got), w = JSON.stringify(want);
    if (g === w) ok(name + ' = ' + g); else fail(name + ' : 기대 ' + w + ' / 실측 ' + g);
  };
  eq('.eqp', geo.eqp, [0, 0, 1080, 1584]);
  eq('.eqc', geo.eqc, [34, 134, 1013, 1284]);
  eq('.sky', geo.sky, [34, 134, 1013, 1284]);
  eq('.gnd', geo.gnd, [34, 1014, 1013, 404]);
  eq('이름 리본', geo.rb, [174, 167, 359, 105]);
  if (geo.rbText === '용사') ok('리본 텍스트 = 용사'); else fail('리본 텍스트 = ' + geo.rbText);
  if (geo.nCards === 1) ok('카드 1장'); else fail('카드 ' + geo.nCards + '장');
  eq('슬롯 1·2·3', geo.slots, [[724, 256, 228, 228], [724, 656, 228, 228], [724, 1056, 228, 228]]);
  eq('부위 뱃지 1·2·3', geo.badges, [[704, 237, 78, 78], [704, 637, 78, 78], [704, 1037, 78, 78]]);
  console.log('  · 뱃지 아이콘 = ' + JSON.stringify(geo.badgeIc));
  eq('일러스트(2회차)', geo.il, [45, 495, 640, 831]);
  eq('스탯 알약 A', geo.sta, [165, 1330, 181, 49]);
  eq('스탯 알약 B', geo.stb, [425, 1330, 182, 49]);
  eq('검 아이콘', geo.sw, [121, 1317, 69, 74]);
  eq('하트 아이콘', geo.hp, [369, 1326, 65, 54]);
  if (geo.nLock === 0 && geo.nBand === 0) ok('.eqlk 0개 / .band 0개');
  else fail('.eqlk ' + geo.nLock + ' / .band ' + geo.nBand);
  const ordOK = geo.order.join(',').indexOf('eqst a') < geo.order.join(',').indexOf('eqic sw');
  if (ordOK) ok('D1: 알약 → 아이콘 순서 (아이콘이 위)'); else fail('D1: 아이콘이 알약에 가려진다 ' + JSON.stringify(geo.order));
  // §2 파생값
  const gapRibIl = geo.il[1] - (geo.rb[1] + geo.rb[3]);
  const pct = Math.round(gapRibIl / geo.eqc[3] * 100);
  console.log('  · 리본 하단 → 일러스트 상단 gap ' + gapRibIl + 'px (' + pct + '% of 카드) — 기대 223 / 17%');
  if (gapRibIl === 223 && pct === 17) ok('D5 gap(2회차 박스 기준 223 = 17.4%) 일치'); else fail('D5 gap 불일치');
  const gapPill = geo.sta[1] - (geo.il[1] + geo.il[3]);
  console.log('  · 일러스트 박스 하단 → 스탯 알약 상단 gap ' + gapPill + 'px — 기대 4 (D8, ref 와 동일)');
  if (gapPill === 4) ok('D8 gap 일치'); else fail('D8 gap 불일치 ' + gapPill);
  const top = geo.slots[0][1] - 134 - 6, bot = geo.eqc[3] - (geo.slots[2][1] - 134 + 228);
  console.log('  · 슬롯 블록 여백 상 ' + (geo.slots[0][1] - geo.eqc[1]) + ' / 하 ' + (geo.eqc[1] + geo.eqc[3] - geo.slots[2][1] - 228) + ' — 기대 116 / 128');
  if (geo.out === 0) ok('프레임 밖 #eqw 요소 0건'); else fail('프레임 밖 요소 ' + geo.out + '건');

  /* --- §3 연결 검증 --- */
  console.log('[3] 진입·연결');
  const parts = [['weapon', '무기', '공격력'], ['shield', '방패', '최대 체력'], ['amulet', '목걸이', '체력 재생']];
  for (const [k, title, label] of parts) {
    await page.evaluate(() => { eqPageOn = true; syncEquipPage(); });
    await page.click(`#eqCards [data-eqslot="${k}"]`);
    await page.waitForTimeout(350);
    const r = await page.evaluate(() => ({
      on: document.getElementById('wpnw').classList.contains('on'),
      part: typeof wpnPart !== 'undefined' ? wpnPart : null,
      text: document.getElementById('wpnw').innerText.replace(/\s+/g, ' ').slice(0, 300),
      cells: document.querySelectorAll('#wpnw .wpg .wpc, #wpnw .wpgrid > *').length,
    }));
    if (r.on && r.part === k && r.text.includes(title) && r.text.includes(label))
      ok(`${title} 슬롯 → #wpnw 열림 · wpnPart=${k} · 라벨 «${label}»`);
    else fail(`${title} 슬롯 실패: on=${r.on} part=${r.part} text=${r.text.slice(0, 160)}`);
    await page.keyboard.press('Escape').catch(() => {});
    await page.evaluate(() => { const w = document.getElementById('wpnw'); w.classList.remove('on'); eqPageOn = true; syncEquipPage(); });
    await page.waitForTimeout(200);
  }

  // 부위별 장착 미간섭
  const indep = await page.evaluate(() => {
    const before = JSON.parse(JSON.stringify(S.eqSlot));
    const list = EQUIPS.filter(e => e.slot === 'shield');
    const pick = list.find(e => e.id !== before.shield);
    if (!pick) return { skip: true };
    S.own[pick.id] = Math.max(1, S.own[pick.id] || 1);
    openWeapon(pick.id, 'shield');
    wpnSel = pick.id;
    S.eqSlot.shield = pick.id;
    return { ok: S.eqSlot.weapon === before.weapon && S.eqSlot.amulet === before.amulet, before, after: JSON.parse(JSON.stringify(S.eqSlot)) };
  });
  if (indep.skip) console.log('  · 방패 후보 1종뿐 — 미간섭 테스트 생략');
  else if (indep.ok) ok('부위별 장착 미간섭 (무기·목걸이 유지) ' + JSON.stringify(indep.after));
  else fail('부위 간섭 발생 ' + JSON.stringify(indep));

  // 서브탭
  await page.evaluate(() => { document.getElementById('wpnw').classList.remove('on'); heroTab = 'eq'; S.heroTab = 'eq'; syncPanel(); renderUI(); });
  await page.waitForTimeout(300);
  for (const [sel, want] of [['[data-eqtab="pet"]', 'pet'], ['[data-eqtab="sk"]', 'sk']]) {
    await page.evaluate(() => { heroTab = 'eq'; S.heroTab = 'eq'; eqPageOn = true; syncPanel(); syncEquipPage(); renderUI(); });
    await page.waitForTimeout(250);
    await page.click('#eqTabs ' + sel);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({
      heroTab, eqwOn: document.getElementById('eqw').classList.contains('on'),
      bodyOn: [...document.querySelectorAll('#panel .pbody')].filter(e => e.classList.contains('on') || getComputedStyle(e).display !== 'none').map(e => e.id),
    }));
    if (r.heroTab === want && !r.eqwOn) ok(`서브탭 → heroTab=${want} · #eqw 닫힘 · body=${JSON.stringify(r.bodyOn)}`);
    else fail(`서브탭 ${want} 실패: ` + JSON.stringify(r));
  }

  if (errs.length) errs.forEach(e => fail('콘솔 ' + e)); else ok('콘솔 에러·경고 0건');

  await ctx.close(); await browser.close();
  console.log(fails.length ? '\nVERIFY FAIL (' + fails.length + ')' : '\nVERIFY PASS');
  process.exit(fails.length ? 1 : 0);
})();
