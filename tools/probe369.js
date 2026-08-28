/* 369 재현·실측 — 08 세부 팝업의 «동료» 파생 문자열 2건이 화면에 무엇을 그리는가
 *
 *   node tools/probe369.js            현행 상태를 잰다
 *
 * 338 규칙: 등재문의 처방(«두 문자열을 «펫» 으로 바꾸면 끝»)을 따르기 전에 먼저 재현한다.
 * 등재문은 두 자리를 «헤더·안내문» 이라고만 적었지만 `kindN` 은 소스에서 **세 곳**이 쓴다
 * (23497 미보유 안내 · 23546 알약 «… 설명»). 그래서 이 프로브가 세는 것은 «소스 몇 줄» 이 아니라
 * **화면에 실제로 찍히는 문자열과 그 상자**다:
 *   [1] `.sk-sl` 알약 — 라벨 텍스트 · 잉크 bbox · 상자 중심과의 dx (A1 교훈: advance 보다 좁은 박스)
 *   [2] `.sk-db` 본문 — 문구 · 줄 수 · 넘침(overflow:hidden 이라 «잘림» 은 조용하다)
 *   [3] 팝업 전체 innerText 안 «동료» 건수 (계열 4종 × 보유/미보유)
 *
 * 표본은 4계열 전부다 — 펫만 보면 «장비/유물은 원래 안 바뀐다» 를 증명하지 못한다.
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
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof showItem === 'function');
  await p.waitForTimeout(900);
  await p.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });

  /* 표본 — 계열 4종 × 보유/미보유. 유물은 미보유 안내문이 kindN 을 먹는 자리라 둘 다 본다. */
  const cases = await p.evaluate(() => {
    const pick = { pet: PETS[0].id, equip: EQUIPS ? EQUIPS[0].id : Object.keys(EQ)[0], relic: RELICS[0].id };
    return pick;
  }).catch(async () => await p.evaluate(() => ({ pet: PETS[0].id, equip: Object.keys(EQ)[0], relic: RELICS[0].id })));

  const rows = [];
  for (const [cat, id] of Object.entries(cases)) {
    for (const own of [true, false]) {
      const r = await p.evaluate(([id, own]) => {
        if (own) S.own[id] = { l: 3, f: 0 }; else delete S.own[id];
        showItem(id);
        const ink = el => { if (!el) return null; const r = document.createRange(); r.selectNodeContents(el);
          const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
        const box = el => { if (!el) return null; const b = el.getBoundingClientRect();
          return { x: b.x, y: b.y, w: b.width, h: b.height }; };
        const sl = document.querySelector('#mbox .sk-sl'), slb = sl && sl.querySelector('b');
        const db = document.querySelector('#mbox .sk-db'), dbp = db && db.querySelector('p');
        const slBox = box(sl), slInk = ink(slb);
        const txt = (document.getElementById('mbox').innerText || '');
        return {
          label: slb ? slb.textContent : null,
          slBox, slInk,
          dx: slBox && slInk ? (slInk.x + slInk.w / 2) - (slBox.x + slBox.w / 2) : null,
          labelOver: slb ? slb.scrollWidth - slb.clientWidth : null,
          desc: dbp ? dbp.innerText.replace(/\n/g, ' | ') : null,
          descBox: box(dbp), dbBox: box(db),
          descOver: db ? db.scrollHeight - db.clientHeight : null,
          dongryo: (txt.match(/동료/g) || []).length,
          pet: (txt.match(/펫/g) || []).length
        };
      }, [id, own]);
      await p.evaluate(() => closeModal && closeModal());
      await p.waitForTimeout(120);
      rows.push({ cat, own, ...r });
    }
  }

  let pass = 0, fail = 0;
  const ok = (c, n, v) => { if (c) { pass++; console.log('  ✓   ' + n + ' = ' + v); } else { fail++; console.log('  ✗   ' + n + ' = ' + v); } };

  console.log('[1] «… 설명» 알약 (.sk-sl) — 라벨 · 잉크 · 중심 dx');
  for (const r of rows.filter(x => x.own)) {
    console.log('   ' + r.cat + ' : 라벨 "' + r.label + '" · 잉크 ' + r2(r.slInk.w) + '×' + r2(r.slInk.h)
      + ' · 상자 ' + r2(r.slBox.w) + '×' + r2(r.slBox.h) + ' · 중심 dx ' + r2(r.dx)
      + ' · 넘침 ' + r.labelOver);
  }
  console.log('[2] 본문 (.sk-db) — 문구 · 넘침');
  for (const r of rows) {
    console.log('   ' + r.cat + (r.own ? ' 보유  ' : ' 미보유') + ' : ' + r.desc);
    console.log('              본문 ' + r2(r.descBox.w) + '×' + r2(r.descBox.h)
      + ' / 상자 안쪽 ' + r2(r.dbBox.h) + ' · 넘침 ' + r.descOver + 'px');
  }
  console.log('[3] 팝업 innerText 안 «동료» 건수');
  for (const r of rows) console.log('   ' + r.cat + (r.own ? ' 보유  ' : ' 미보유') + ' : 동료 ' + r.dongryo + ' · 펫 ' + r.pet);

  console.log('');
  console.log('[P] 판정');
  const petRows = rows.filter(r => r.cat === 'pet');
  ok(petRows.every(r => r.dongryo === 0), 'P1 펫 팝업(보유·미보유) «동료» 0건',
    petRows.map(r => r.dongryo).join('/'));
  ok(rows.every(r => r.dongryo === 0), 'P2 4계열 전부 «동료» 0건', rows.map(r => r.dongryo).join('/'));
  ok(rows.every(r => r.descOver <= 0), 'P3 본문 넘침 0 (overflow:hidden — 잘림은 조용하다)',
    rows.map(r => r.descOver).join('/'));
  ok(rows.every(r => r.labelOver <= 0), 'P4 알약 라벨 넘침 0', rows.map(r => r.labelOver).join('/'));
  ok(rows.filter(r => r.own).every(r => Math.abs(r.dx) <= 2), 'P5 알약 잉크 중심 dx ≤ 2px',
    rows.filter(r => r.own).map(r => r2(r.dx)).join('/'));
  ok(errs.length === 0, 'P6 콘솔·페이지 에러 0', errs.length);

  console.log('');
  console.log('PROBE369 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
