/* 369 게이트 — 08 세부 팝업의 종류 이름이 «펫» 이다 (173 «펫 전수 통일» 이 놓친 파생 문자열)
 *
 *   node tools/verify369.js
 *
 * 왜 `verify173` A1 만으로는 모자란가:
 *   A1 은 **소스 문자열 grep**(«주석 밖 «동료» 0건»)이다. 173 이 이 자리를 놓친 이유가 바로
 *   «소스를 화면 목록으로 돌았다» 인데, 같은 자를 한 번 더 대는 것으로는 **화면에 무엇이 찍히는지**를
 *   못 묻는다(문자열을 다른 방식으로 조립하면 grep 은 조용하다). 그래서 이 게이트는 화면을 띄워
 *   **찍힌 텍스트**를 읽는다 — 소스 항([1])은 회귀 표지로만 남긴다.
 *
 *   [1] 소스   — `kindN` 항이 '펫' · 안내문이 '펫은' · 주석 밖 «동료» 0건
 *   [2] 화면   — 펫 08 팝업(보유·미보유) 알약 «펫 설명» · 미보유 안내 «펫 소환으로 획득하세요» · «동료» 0건
 *   [3] 대조   — 장비·유물 계열은 라벨이 안 바뀐다(«장비 설명» · «유물 설명»)
 *   [4] 기하   — 라벨이 3글자 → 2글자로 줄어든 뒤에도 **가운데 정렬**이 유지되고 넘침이 0
 *                (A1 교훈 «advance 보다 좁은 박스» — 넘침이 아니라 중심이 문제가 되는 자리다)
 *   [R] 되돌림 — 두 자리를 **각각** 되돌린 사본에서 화면 «동료» 가 되살아난다(무르게 푼 수리가 아님)
 *   [J] 콘솔   — 에러 0
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const KEY = 'idle_hunter_save_v4';
const r2 = n => Math.round(n * 100) / 100;

let pass = 0, fail = 0;
const ok = (c, n, v) => { if (c) { pass++; console.log('  ✓   ' + n + (v === undefined ? '' : ' = ' + v)); }
                          else { fail++; console.log('  ✗   ' + n + (v === undefined ? '' : ' = ' + v)); } };

/* 08 세부 팝업을 열어 «찍힌» 것만 돌려준다 */
const READ = (id, own) => {
  if (own) S.own[id] = { l: 3, f: 0 }; else delete S.own[id];
  showItem(id);
  const sl = document.querySelector('#mbox .sk-sl'), slb = sl && sl.querySelector('b');
  const db = document.querySelector('#mbox .sk-db'), dbp = db && db.querySelector('p');
  const rng = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect(); };
  const sb = sl && sl.getBoundingClientRect(), si = slb && rng(slb);
  const txt = document.getElementById('mbox').innerText || '';
  const r = {
    label: slb ? slb.textContent : null,
    desc: dbp ? dbp.innerText.replace(/\n/g, ' ') : null,
    dongryo: (txt.match(/동료/g) || []).length,
    labelOver: slb ? slb.scrollWidth - slb.clientWidth : 0,
    descOver: db ? db.scrollHeight - db.clientHeight : 0,
    inkW: si ? si.width : 0,
    dx: sb && si ? (si.x + si.width / 2) - (sb.x + sb.width / 2) : 0
  };
  closeModal && closeModal();
  return r;
};

async function boot(url) {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, best: 40 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof showItem === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  const read = (id, own) => page.evaluate(new Function('a', 'return (' + READ.toString() + ')(a[0], a[1])'), [id, own]);
  const ids = await page.evaluate(() => ({ pet: PETS[0].id, equip: Object.keys(EQ)[0], relic: RELICS[0].id }));
  return { browser, page, read, ids, errs };
}

/* 주석(/* … *\/ · // · <!-- -->)을 걷어낸 소스 — verify173 A1 과 같은 자를 쓴다 */
function strip(src) {
  return src.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const KIND_NEW = "const kindN = cat === 'pet' ? '펫' :";
  const NOTE_NEW = "+ '펫은 최대 <em>3마리</em>까지 장착합니다.'";

  console.log('[1] 소스 — 종류 이름과 안내문');
  ok(src.indexOf(KIND_NEW) >= 0, '1-1 `kindN` 의 pet 항이 «펫»');
  ok(src.indexOf(NOTE_NEW) >= 0, '1-2 안내문이 «펫은 최대 3마리»(조사까지 바뀐다)');
  const dong = (strip(src).match(/동료/g) || []).length;
  ok(dong === 0, '1-3 주석 밖 «동료» 0건(verify173 A1 과 같은 자)', dong);

  const A = await boot(URL);
  const petOwn = await A.read(A.ids.pet, true), petNo = await A.read(A.ids.pet, false);
  const eqOwn = await A.read(A.ids.equip, true), rlNo = await A.read(A.ids.relic, false);

  console.log('[2] 화면 — 펫 08 세부 팝업');
  ok(petOwn.label === '펫 설명', '2-1 보유 알약 라벨', '"' + petOwn.label + '"');
  ok(petNo.label === '펫 설명', '2-2 미보유 알약 라벨', '"' + petNo.label + '"');
  ok(/펫은 최대 3마리까지 장착합니다/.test(petOwn.desc || ''), '2-3 보유 안내문 «펫은 최대 3마리»');
  ok(/펫 소환으로 획득하세요/.test(petNo.desc || ''), '2-4 미보유 안내문 «펫 소환으로 획득하세요»');
  ok(petOwn.dongryo === 0 && petNo.dongryo === 0, '2-5 팝업 텍스트 «동료» 0건(보유/미보유)',
    petOwn.dongryo + '/' + petNo.dongryo);

  console.log('[3] 대조 — 장비·유물 계열은 불변');
  ok(eqOwn.label === '장비 설명', '3-1 장비 알약 라벨', '"' + eqOwn.label + '"');
  ok(rlNo.label === '유물 설명', '3-2 유물 알약 라벨', '"' + rlNo.label + '"');
  ok(/유물 소환으로 획득하세요/.test(rlNo.desc || ''), '3-3 유물 미보유 안내문 불변');

  console.log('[4] 기하 — 라벨이 3글자 → 2글자로 줄어도 가운데를 지킨다');
  ok([petOwn, petNo, eqOwn, rlNo].every(r => r.labelOver <= 0), '4-1 알약 라벨 넘침 0',
    [petOwn, petNo, eqOwn, rlNo].map(r => r.labelOver).join('/'));
  ok([petOwn, petNo, eqOwn, rlNo].every(r => r.descOver <= 0), '4-2 본문 넘침 0(`.sk-db{overflow:hidden}` — 잘림은 조용하다)',
    [petOwn, petNo, eqOwn, rlNo].map(r => r.descOver).join('/'));
  ok(Math.abs(petOwn.dx) <= 2, '4-3 펫 알약 잉크 중심 dx ≤ 2px', r2(petOwn.dx));
  ok(petOwn.inkW < eqOwn.inkW, '4-4 «펫 설명» 잉크가 «장비 설명» 보다 좁다(글자 수가 준 것이 맞다)',
    r2(petOwn.inkW) + ' < ' + r2(eqOwn.inkW));

  console.log('[J] 콘솔');
  ok(A.errs.length === 0, 'J1 콘솔·페이지 에러 0', A.errs.slice(0, 2).join(' | ') || 0);
  await A.browser.close();

  /* ── [R] 되돌림 시험 — 두 자리를 각각 되돌린 사본에서 화면 «동료» 가 되살아난다 ── */
  console.log('\n[R] 되돌림 시험 — 되돌린 **사본**에서는 위 항이 빨개져야 한다(원본은 안 건드린다)');
  const REV = [
    ['R1 `kindN` 을 «동료» 로 되돌리면 알약이 «동료 설명» 이 된다',
     KIND_NEW, "const kindN = cat === 'pet' ? '동료' :", r => r.label === '동료 설명' && r.dongryo > 0],
    ['R2 안내문을 «동료는» 으로 되돌리면 본문에 «동료» 가 되살아난다',
     NOTE_NEW, "+ '동료는 최대 <em>3마리</em>까지 장착합니다.'", r => /동료는 최대/.test(r.desc || '') && r.dongryo > 0]
  ];
  for (const [name, from, to, want] of REV) {
    const tmp = path.resolve(__dirname, '..', `.tmp-369-revert-${process.pid}.html`);
    fs.writeFileSync(tmp, src.replace(from, to));
    try {
      const B = await boot('file://' + tmp.replace(/\\/g, '/'));
      const r = await B.read(B.ids.pet, true);
      await B.browser.close();
      ok(want(r), name, '"' + r.label + '" · 동료 ' + r.dongryo);
    } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
  }

  const total = pass + fail;
  console.log('\nVERIFY369 ' + pass + '/' + total + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); console.log('\nVERIFY369 FAIL (예외)'); process.exit(1); });
