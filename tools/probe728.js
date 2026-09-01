#!/usr/bin/env node
/* 재현기 728 — 「`tools/verify664.js` §4-c·§5-a·§5-b·[R3] 4건이 왜 빨간가」
 *
 *   node tools/probe728.js
 *
 * 338 규칙 — 처방 전에 «등재문의 가설» 을 제품에게 직접 물어 확인/기각한다.
 * 등재문 가설(2026-09-01, sess-1622-4733): 「662 가 «미보유 스킬 세부» 를 실제로 열었는데
 * 664 의 자는 아직 «닫혀 있어야 한다» 를 단언한다 — 축이 뒤집혔다」.
 *
 * 이 자가 묻는 것 넷:
 *   [1] §5-a — 662 가 지운 «미보유 대체문» 이 정말 소스에서 사라졌는가(자의 정규식이 헛도는가).
 *   [2] §5-b — 미보유 스킬 세부가 정말 «실명» 으로 열리는가(제품이 옳은 쪽인가).
 *   [3] [R3] — 되돌림 사본의 치환 4자리가 **각자 걸렸는가**. ⚑ 여기가 뿌리 후보다:
 *       `String.replace(문자열, …)` 은 **첫 자리 하나만** 바꾸는데, 662 가 `showSkillDetail`
 *       에서 `own ? it.n : '???'` 가드를 걷어내면서 `$('mtitle').textContent = it.n;` 이
 *       **스킬 함수에 먼저** 생겼다 → 펫(`showItem`) 자리를 겨눈 치환이 스킬 자리를 맞는다.
 *   [4] §4-c — 보유 칸 [장착] 뒤에 뜨는 토스트가 «반려» 인가 아닌가(= 자의 축이 넓은가,
 *       제품이 새로 깨진 것인가). 토스트 **문면**을 그대로 찍는다.
 *
 * 127 — 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const RAW = fs.readFileSync(SRC, 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d === undefined ? '' : ' — ' + d)); };
const blkT = t => console.log('\n=== ' + t + ' ===');

/* verify664 의 §4 회귀 표본과 **같은 세이브**를 만든다(자와 다른 상태를 보면 재현이 아니다) */
const SETUP = `
  S.guide.idx = 99;
  var w = EQUIPS.filter(function(e){ return e.slot === 'weapon'; })[0];
  if(w) S.own[w.id] = { n: 5, l: 3 };
  var p0 = PETS[0]; if(p0) S.own[p0.id] = { n: 5, l: 2 };
  S.gold = 1e12; S.dia = 1e9;
  if(typeof markDirty === 'function') markDirty();
  if(typeof renderUI === 'function') renderUI();`;

const SCAN = `(async function(){
  var raf = function(){ return new Promise(function(r){ requestAnimationFrame(function(){ r(); }); }); };
  var wait = async function(n){ for(var i=0;i<n;i++) await raf(); };
  var tx = function(s){ var e = document.querySelector(s); return e ? e.textContent.trim() : null; };
  var allT = function(){ return [].slice.call(document.querySelectorAll('#fxl .fx-toast'))
                                    .map(function(n){ return n.textContent.trim(); }); };
  var clearT = function(){ document.querySelectorAll('#fxl .fx-toast').forEach(function(n){ n.remove(); }); };
  window.step = function(){};
  var o = { err:null };
  try {
    /* ── [2] 미보유 스킬 세부 — 제목·설명·상태 딱지 ── */
    var us = SKILLS.filter(function(x){ return !has(x.id); })[0];
    o.sk = { id: us && us.id, trueName: us && us.n };
    if(us){
      showSkillDetail(us.id); await wait(6);
      o.sk.title = tx('#mtitle');
      o.sk.desc  = tx('#mbox .sk-db p');
      o.sk.unTag = tx('#mbox .sk-db p .sk-un');
      o.sk.dmg   = tx('#mbox .sk-ct .vl .nt');
      o.sk.own   = tx('#mbox .sk-ow .v');
      if(typeof closeModal === 'function') closeModal(); await wait(3);
    }
    /* ── 미보유 펫 세부 — 664 가 연 자리(축이 갈렸는지 대조군) ── */
    var up = PETS.filter(function(x){ return !has(x.id); })[0];
    o.pet = { id: up && up.id, trueName: up && up.n };
    if(up){ showItem(up.id); await wait(6); o.pet.title = tx('#mtitle');
      if(typeof closeModal === 'function') closeModal(); await wait(3); }

    /* ── [4] 보유 칸 [장착] 직후의 토스트 문면 ── */
    goTab('hero'); heroSubGo('eq'); await wait(6);
    openWeapon(null, 'weapon'); await wait(6);
    var mine = EQUIPS.filter(function(e){ return e.slot === 'weapon' && has(e.id); })[0];
    o.own = { id: mine && mine.id };
    if(mine){
      wpnSel = mine.id; renderWpn(); await wait(3);
      S.eqSlot.weapon = null;
      clearT();
      o.own.cpBefore = (typeof cp === 'function') ? cp() : null;
      $('wpnBtnEq').click(); await wait(6);
      o.own.toastsAt6  = allT();
      await wait(30);
      o.own.toastsAt36 = allT();
      o.own.equipped = S.eqSlot.weapon === mine.id;
      o.own.cpAfter = (typeof cp === 'function') ? cp() : null;
    }
    closeWeapon(); await wait(3);
  } catch(e){ o.err = String(e && e.stack || e); }
  return o;
})`;

/* verify664 [R] 이 쓰는 치환표 — **그대로** 옮겨 온다(자와 다른 표를 쓰면 재현이 아니다) */
const REVERTS = [
  ["        +  (real ? ' data-wpn=\"' + real.id + '\"' : '')",
   "        +  (mine ? ' data-wpn=\"' + real.id + '\"' : '')", 'R1 장비 칸 클릭 대상'],
  ["  $('wpnOwnV').innerHTML  = '<i>+' + wpct(ownVal(cur)) + '</i>';",
   "  $('wpnOwnV').innerHTML  = '<i>+' + wpct(own ? ownVal(cur) : 0) + '</i>';", 'R2 보유 효과 강제 0'],
  ["  $('mtitle').textContent = it.n;",
   "  $('mtitle').textContent = own ? it.n : '???';", 'R3 제목 «???»'],
  ["      + (own ? (eq ? '해제' : '장착') : '미보유') + '</b></button>'",
   "      + (eq ? '해제' : '장착') + '</b></button>'", 'R4 버튼 라벨'],
];

async function scan(browser, src) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 2280 });
  await page.goto('file://' + src);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof showItem === 'function');
  await page.waitForTimeout(1200);
  await page.evaluate(new Function(SETUP));
  await page.waitForTimeout(300);
  const o = await page.evaluate(SCAN + '()');
  return { page, o };
}

/* 함수 경계를 문자열로 잰다 — «그 줄이 어느 함수 안인가» 를 재현이 직접 답해야 한다 */
const at = s => RAW.indexOf(s);
const fnSkill = at('function showSkillDetail(id){');
const fnItem  = at('function showItem(id){');
const lineOf = i => i < 0 ? -1 : RAW.slice(0, i).split('\n').length;
const inWhich = i => (i < 0 ? '없음' : (i > fnItem ? 'showItem(664)' : (i > fnSkill ? 'showSkillDetail(662)' : '그 앞')));

(async () => {
  const browser = await launch(chromium);
  let tmp = null;
  try {
    const { page, o } = await scan(browser, SRC);
    if (o.err) ok(false, '[스캔] 페이지 안 측정이 예외 없이 끝났다', o.err.slice(0, 200));

    blkT('[1] §5-a — 662 가 지운 «미보유 대체문» 이 소스에 남아 있는가');
    const oldDesc = "const desc = (own ? it.d : '아직 획득하지 못했습니다.<br>스킬 소환으로 획득하세요.')";
    ok(RAW.indexOf(oldDesc) < 0,
      '[1-a] 자(§5-a)가 찾는 옛 분기가 소스에 **없다** — 그래서 §5-a 가 빨갛다(제품이 옳다)');
    ok(RAW.indexOf('  const desc = skillDescText(it)') >= 0,
      '[1-b] 그 자리를 662 의 `skillDescText(it)` 파생이 대신하고 있다');
    ok(RAW.indexOf('아직 획득하지 못했습니다.<br>스킬 소환으로 획득하세요.') < 0,
      '[1-c] 대체문 문자열 자체가 제품에 0건이다');

    blkT('[2] §5-b — 미보유 스킬 세부가 실제로 «실명» 으로 열린다');
    ok(o.sk && o.sk.title === o.sk.trueName,
      '[2-a] 미보유 스킬 제목이 실명이다(자는 «???» 를 요구한다 = 축이 뒤집혔다)',
      JSON.stringify(o.sk && o.sk.title) + ' ↔ ' + JSON.stringify(o.sk && o.sk.trueName));
    ok(o.sk && !/\?/.test(o.sk.title || '?'),
      '[2-b] 그 제목에 «?» 가 0건이다(verify662 [A] 가 쓰는 같은 자)');
    ok(o.sk && /🔒/.test(o.sk.unTag || ''),
      '[2-c] 그런데 «지금은 없다» 상태는 안 잃었다 — `.sk-un` 딱지가 살아 있다',
      JSON.stringify((o.sk && o.sk.unTag || '').slice(0, 40)));
    ok(o.pet && o.pet.title === o.pet.trueName,
      '[2-d] 펫(664 자리)도 실명이다 — 두 자리가 같은 규약이다',
      JSON.stringify(o.pet && o.pet.title));

    blkT('[3] [R3] — 되돌림 치환 4자리가 «각자» 걸리는가(뿌리 후보)');
    const idx = REVERTS.map(([a, , tag]) => ({ tag, i: at(a), n: RAW.split(a).length - 1 }));
    idx.forEach(x => console.log('       · ' + x.tag + ' : 출현 ' + x.n + '회 · 첫 자리 '
      + (x.i < 0 ? '없음' : lineOf(x.i) + '행 (' + inWhich(x.i) + ')')));
    const r3 = idx[2];
    ok(r3.i >= 0, '[3-a] R3 이 겨눈 문자열은 소스에 있다');
    ok(r3.n === 2,
      '[3-b] ⚑ 그런데 그 문자열이 **두 자리**에 있다 — 662 가 스킬 함수의 가드를 걷어내며 같은 줄을 만들었다',
      r3.n + '회');
    ok(inWhich(r3.i) === 'showSkillDetail(662)',
      '[3-c] ⚑ 그리고 **첫 자리가 스킬 함수**다 — `String.replace` 는 첫 자리만 바꾸므로 R3 은 662 구간을 되돌린다',
      lineOf(r3.i) + '행 (' + inWhich(r3.i) + ')');
    /* 실증 — 자와 같은 치환표로 사본을 만들어 «펫 제목이 안 바뀐다» 를 눈으로 확인한다 */
    let old = RAW;
    REVERTS.forEach(([a, b]) => { old = old.replace(a, b); });
    tmp = path.join(ROOT, `index.probe728-revert-${process.pid}.html`);
    fs.writeFileSync(tmp, old);
    const r = await scan(browser, tmp);
    ok(r.o.pet && r.o.pet.title === r.o.pet.trueName,
      '[3-d] ⚑ 실증 — 되돌림 사본에서도 **펫 제목은 실명 그대로**다(치환이 딴 자리를 맞았다)',
      JSON.stringify(r.o.pet && r.o.pet.title));
    ok(r.o.sk && r.o.sk.title === '???',
      '[3-e] 대신 **스킬 제목이 «???»** 로 되돌아갔다 — 맞은 자리가 662 구간임을 못박는다',
      JSON.stringify(r.o.sk && r.o.sk.title));
    await r.page.close();

    blkT('[4] §4-c — 보유 칸 [장착] 뒤 토스트의 «문면»');
    const t36 = (o.own && o.own.toastsAt36) || [];
    console.log('       · 6프레임 뒤 : ' + JSON.stringify((o.own && o.own.toastsAt6) || []));
    console.log('       · 36프레임 뒤: ' + JSON.stringify(t36));
    ok(o.own && o.own.equipped === true, '[4-a] 보유 칸 [장착] 은 실제로 장착된다(제품은 정상)');
    ok(t36.length > 0, '[4-b] 그런데 토스트가 **뜬다** — 자(§4-c)는 «0장» 을 요구한다', t36.length + '장');
    ok(t36.length > 0 && t36.every(t => !/🔒|미보유|획득하세요/.test(t)),
      '[4-c] ⚑ 그 토스트는 «반려» 가 아니다 — 자의 축이 «모든 토스트» 로 넓다',
      JSON.stringify(t36));
    ok(t36.some(t => /전투력/.test(t)),
      '[4-d] 문면이 «⚔️ 전투력» 이다 — 324/684/685 가 세운 산 연출이 §4-c 에 걸린 것',
      JSON.stringify(t36.filter(t => /전투력/.test(t))));
    await page.close();
  } finally {
    if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp);
    await browser.close();
  }
  const tot = pass + fail;
  console.log(`\nPROBE728 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
