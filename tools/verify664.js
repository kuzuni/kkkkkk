#!/usr/bin/env node
/* 작업 664 — 「미개방 장비·코스튬·펫: 선택 가능 + 실정보 표시 · **장착만** 비활성」 게이트
 * (주인 지시 2026-09-02 00:25~00:27 — «미개방 정보 공개» 규약. 스킬 07/08 은 662 몫이라 여기서 안 센다.)
 *
 *   node tools/verify664.js
 *
 * 절 구성 — «세 시트 전수» 가 이 자의 본체다(한 시트만 보면 610 꼴 구멍이 난다):
 *   §전제  재현기가 잡은 상태를 이 자도 같은 눈으로 보는가(표본이 진짜 «미보유» 인가).
 *   §1 선택  미개방 카드가 **눌리고 선택이 실제로 바뀐다** — 장비(05) · 펫(26) · 코스튬(50) 전수.
 *   §2 정보  세부에 **실명·실수치**가 뜬다 — «???»·«—»·«강제 0%» 0건. 수치는 **데이터 파생**이라
 *            자가 소스 상수를 베끼지 않고 제품 함수(`ownVal`·`equipVal`·`petDmg`)와 대조한다.
 *   §3 장착  **장착/착용/출전만** 막힌다 + **반려 피드백**이 있다(라벨 또는 토스트).
 *   §4 회귀  보유 칸 동작 불변 — 이름·수치·[장착] 실동작·강화 경로가 종전 그대로.
 *   §5 스코프 **대상 축이 갈려 있다** — 스킬은 662 · 장비·펫·코스튬은 664(한 규약, 두 구간).
 *            ⚠ 728(2026-09-01)로 방향을 뒤집어 갈아 끼웠다: 662 가 완료돼 미보유 스킬도 실명으로
 *            열린다. 옛 축(«스킬은 아직 «???» 다»)은 이제 «662 를 되돌려라» 와 같은 말이었다.
 *   §R 되돌림 옛 은닉을 도로 심은 **소스 사본**에서 §1·§2·§3 이 실제로 빨개진다
 *            — 이 절이 없으면 «축이 애초에 안 걸려 초록» 과 구별할 수 없다(334·368 규약).
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

/* 728 — 두 함수의 경계를 **소스에서 잰다.** §5-d 와 §R 이 같은 좌표를 쓴다:
   §5-d 는 «두 구간이 갈려 있다» 를 말하고, §R 은 그 경계 **뒤에만** 치환을 건다. */
const SKILL_AT   = RAW.indexOf('function showSkillDetail(id){');
const ITEM_AT    = RAW.indexOf('function showItem(id){');
const MTITLE_HITS = RAW.split("  $('mtitle').textContent = it.n;").length - 1;
const lineOf = i => (i < 0 ? -1 : RAW.slice(0, i).split('\n').length);

/* 세 시트의 «미보유 한 칸» 을 실제로 열어 화면이 무엇을 말하는지 통째로 걷어 온다.
   ⚠ `wpnSel`·`cosSel` 은 `let` 전역이라 **맨이름으로** 대입해야 한다(`window.` 는 딴 변수를 만든다 —
     `probe664` 가 이 함정에 걸렸다). ⚠ `fxToast` 는 스택 4장이 차면 조용히 큐로 빠지므로
     반려 피드백을 재기 전에 자리를 비운다. */
const SCAN = `(async function(){
  var raf = function(){ return new Promise(function(r){ requestAnimationFrame(function(){ r(); }); }); };
  var wait = async function(n){ for(var i=0;i<n;i++) await raf(); };
  var tx = function(s){ var e = document.querySelector(s); return e ? e.textContent.trim() : null; };
  var toasts = function(){ return document.querySelectorAll('#fxl .fx-toast').length; };
  var clearT = function(){ document.querySelectorAll('#fxl .fx-toast').forEach(function(n){ n.remove(); }); };
  var lastT = function(){ var a = [].slice.call(document.querySelectorAll('#fxl .fx-toast'));
                          return a.length ? a[a.length-1].textContent.trim() : null; };
  var allT  = function(){ return [].slice.call(document.querySelectorAll('#fxl .fx-toast'))
                                   .map(function(n){ return n.textContent.trim(); }); };
  window.step = function(){};                      /* 배경 전투 정지(512 규약) */
  var o = { err:null };
  try {
    /* ── 장비 05(무기 부위) ─────────────────────────────────────── */
    goTab('hero'); heroSubGo('eq'); await wait(6);
    openWeapon(null, 'weapon'); await wait(6);
    var un = EQUIPS.filter(function(e){ return e.slot === 'weapon' && !has(e.id); })[0];
    var mine = EQUIPS.filter(function(e){ return e.slot === 'weapon' && has(e.id); })[0];
    o.eq = { unId: un && un.id, ownId: mine && mine.id,
             realN: EQUIPS.filter(function(e){ return e.slot === 'weapon'; }).length };
    var cards = [].slice.call(document.querySelectorAll('#wpnGrid .wgc'));
    o.eq.clickable = cards.filter(function(c){ return c.dataset.wpn; }).length;
    o.eq.dummyClickable = cards.filter(function(c){ return c.dataset.wpn && !c.querySelector('.lv'); }).length;
    if(un){
      var card = document.querySelector('#wpnGrid [data-wpn="' + un.id + '"]');
      o.eq.cardFound = !!card;
      wpnSel = mine ? mine.id : null; renderWpn(); await wait(3);
      if(card) { document.querySelector('#wpnGrid [data-wpn="' + un.id + '"]').click(); await wait(5); }
      o.eq.selAfterClick = (typeof wpnSel === 'string') ? wpnSel : null;
      o.eq.picked = (o.eq.selAfterClick === un.id);
      o.eq.name = tx('#wpnName'); o.eq.grade = tx('#wpnGrade'); o.eq.lv = tx('#wpnLv');
      o.eq.ownV = tx('#wpnOwnV'); o.eq.eqV = tx('#wpnEqV');
      o.eq.icLen = ($('wpnIc').innerHTML || '').length;
      o.eq.lockShown = !!document.querySelector('#wpnGrid [data-wpn="' + un.id + '"] .lock');
      /* 데이터 파생 대조 — 자가 상수를 베끼지 않는다 */
      o.eq.trueOwn = ownVal(un); o.eq.trueEq = equipVal(un);
      /* ③ 장착 차단 + 반려 피드백 */
      clearT(); var t0 = toasts();
      $('wpnBtnEq').click(); await wait(8);
      o.eq.rejected = toasts() > t0; o.eq.rejectTxt = lastT();
      o.eq.notEquipped = S.eqSlot.weapon !== un.id;
      o.eq.btnOff = $('wpnBtnEq').classList.contains('off');
    }
    /* §4 회귀 — 보유 칸은 종전 그대로 골라지고 실제로 장착된다 */
    if(mine){
      wpnSel = mine.id; renderWpn(); await wait(3);
      o.eq.ownName = tx('#wpnName'); o.eq.ownOwnV = tx('#wpnOwnV'); o.eq.ownEqV = tx('#wpnEqV');
      o.eq.ownTrueOwn = ownVal(mine); o.eq.ownTrueEq = equipVal(mine);
      S.eqSlot.weapon = null;
      clearT();
      $('wpnBtnEq').click(); await wait(6);
      o.eq.ownEquipWorks = S.eqSlot.weapon === mine.id;
      /* 728 — 개수가 아니라 **문면**을 걷어 온다. 여기서 «0장» 을 요구하면 324/684/685 의
         산 연출(«⚔️ 전투력 +N» — 장착으로 cp 가 오르니 정상)이 이 항을 빨갛게 만든다.
         §4-c 가 묻는 것은 «반려가 항상 뜨는가» 이므로 **반려 문면만** 센다. */
      o.eq.ownToasts = allT();
    }
    closeWeapon(); await wait(3);

    /* ── 펫 26 → 08 세부 ────────────────────────────────────────── */
    heroSubGo('pet'); await wait(6);
    var up = PETS.filter(function(x){ return !has(x.id); })[0];
    var mp = PETS.filter(function(x){ return has(x.id); })[0];
    o.pet = { unId: up && up.id, ownId: mp && mp.id };
    if(up){
      var pc = document.querySelector('#bPet [data-ptit="' + up.id + '"]');
      o.pet.cardFound = !!pc;
      if(pc){ pc.click(); await wait(6); }
      o.pet.popupOn = !!document.querySelector('.sk8.on');
      o.pet.title = tx('#mtitle');
      o.pet.desc = tx('#mbox .sk-db');
      o.pet.descLines = (($('mbox').querySelector('.sk-db p') || {}).innerHTML || '').split(/<br\\s*\\/?>/i).length;
      o.pet.cell = tx('#mbox .sk-ct .vl .nt');
      o.pet.own = tx('#mbox .sk-ow .v');
      o.pet.icLen = (($('mbox').querySelector('.sk-ic') || {}).innerHTML || '').length;
      var e1 = document.getElementById('mEq');
      o.pet.btn = e1 ? e1.textContent.trim() : null;
      o.pet.btnDisabled = e1 ? e1.disabled : null;
      o.pet.trueName = up.n; o.pet.trueDmg = petDmg(up); o.pet.trueOwn = ownVal(up);
      o.pet.trueEqV = petEquipVal(up);
      /* 실제로 눌러도 장착이 안 되는가(disabled 는 클릭이 안 먹는 것이 정상) */
      if(e1) e1.click(); await wait(4);
      o.pet.notEquipped = S.eqPet.indexOf(up.id) < 0;
      /* 카드의 빠른 장착 뱃지도 미보유엔 없다 */
      o.pet.quickBadge = !!document.querySelector('#bPet [data-pteq="' + up.id + '"]');
      if(typeof closeModal === 'function') closeModal();
      await wait(3);
    }
    if(mp){
      var pc2 = document.querySelector('#bPet [data-ptit="' + mp.id + '"]');
      if(pc2){ pc2.click(); await wait(6); }
      o.pet.ownTitle = tx('#mtitle');
      var e2 = document.getElementById('mEq');
      o.pet.ownBtn = e2 ? e2.textContent.trim() : null;
      o.pet.ownBtnDisabled = e2 ? e2.disabled : null;
      if(typeof closeModal === 'function') closeModal();
      await wait(3);
    }

    /* ── 코스튬 50 ──────────────────────────────────────────────── */
    heroSubGo('cos'); await wait(6);
    var ua = AVATARS.filter(function(a){ return !cosOwn(a.id); })[0];
    o.cos = { unId: ua && ua.id };
    if(ua){
      var cc = document.querySelector('#bCos [data-cosit="' + ua.id + '"]');
      o.cos.cardFound = !!cc;
      cosSel = null; renderCos(); await wait(3);
      var before = cosSel;
      var cc2 = document.querySelector('#bCos [data-cosit="' + ua.id + '"]');
      if(cc2){ cc2.click(); await wait(5); }
      o.cos.picked = (cosSel === ua.id) && (before !== ua.id || true);
      o.cos.selMarked = !!document.querySelector('#bCos [data-cosit="' + ua.id + '"].sel');
      clearT(); var t2 = toasts();
      var wb = document.querySelector('#bCos [data-coswear]');
      if(wb){ wb.click(); await wait(8); }
      o.cos.rejected = toasts() > t2; o.cos.rejectTxt = lastT();
      o.cos.notWorn = cosCur() !== ua.id;
      cosSel = ua.id; renderCos(); await wait(3);
      showCosDetail(ua.id); await wait(5);
      o.cos.title = tx('#mtitle');
      o.cos.desc = tx('#mbox .sk-db');
      o.cos.trueName = ua.n;
      if(typeof closeModal === 'function') closeModal();
      await wait(3);
    }

    /* ── 유물 89 — showItem 을 공유하는 네 번째 계열(같이 열렸는지) ── */
    var ur = RELICS.filter(function(x){ return !has(x.id); })[0];
    o.rel = { unId: ur && ur.id };
    if(ur){
      showItem(ur.id); await wait(5);
      o.rel.title = tx('#mtitle'); o.rel.trueName = ur.n;
      o.rel.desc = tx('#mbox .sk-db');
      if(typeof closeModal === 'function') closeModal();
      await wait(3);
    }

    /* ── 스킬 07/08 — **662 의 구간**. 664 가 대신 열지 않았음을 여기서 지킨다 ──
       ⚠ 728(2026-09-01) 로 축이 뒤집혔다: 662 가 완료돼 미보유 스킬도 **실명**으로 열린다.
         옛 축(«아직 «???» 다»)은 이제 «662 를 되돌려라» 와 같은 말이라 방향만 뒤집어 갈아 끼웠다. */
    var us = SKILLS.filter(function(x){ return !has(x.id); })[0];
    o.sk = { unId: us && us.id, trueName: us && us.n };
    if(us){ showItem(us.id); await wait(5); o.sk.title = tx('#mtitle');
      o.sk.desc  = tx('#mbox .sk-db p');
      o.sk.unTag = tx('#mbox .sk-db p .sk-un');
      if(typeof closeModal === 'function') closeModal(); await wait(2); }
  } catch(e){ o.err = String(e && e.stack || e); }
  return o;
})`;

/* 표본을 만든다 — 무기·펫을 «일부만» 보유한 세이브라야 «보유 ↔ 미보유» 를 한 화면에서 가른다.
   ⚠ 상태는 손으로 적은 사전이 아니라 실제 표(EQUIPS·PETS)의 **첫 칸**으로 만든다 —
     표가 늘어도 자가 따라간다(402 «표 두 벌» 부패 예방). */
const SETUP = `
  S.guide.idx = 99;
  var w = EQUIPS.filter(function(e){ return e.slot === 'weapon'; })[0];
  if(w) S.own[w.id] = { n: 5, l: 3 };
  var p0 = PETS[0]; if(p0) S.own[p0.id] = { n: 5, l: 2 };
  S.gold = 1e12; S.dia = 1e9;
  if(typeof markDirty === 'function') markDirty();
  if(typeof renderUI === 'function') renderUI();`;

async function scan(browser, src) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setViewportSize({ width: 1080, height: 2280 });
  await page.goto('file://' + src);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof showItem === 'function');
  await page.waitForTimeout(1200);
  await page.evaluate(new Function(SETUP));
  await page.waitForTimeout(300);
  const o = await page.evaluate(SCAN + '()');
  return { page, o, errs };
}

/* 728 — «반려 피드백» 의 문면 자. §3-b(미보유에서 뜬다)와 §4-c(보유에서 안 뜬다)가 **한 자**를
   쓰게 묶는다 — 두 항이 각자 다른 눈으로 세면 한쪽이 부패해도 다른 쪽이 안 알려 준다. */
const REJECT = /🔒|미보유|획득하세요|착용합니다/;

/* 725 이관 — 표기가 «+n%» 에서 «×N배» 로 갔다. 이 자는 «적힌 수 = 실값» 을 묻는 자이므로
   **읽는 축만** 옮긴다(배율 = 1 + 효과값). 허용 오차도 그 축으로 환산한다(0.15%p = 0.0015배).
   ⚠ 무르게 풀지 않으려고 «수를 못 찾으면 거짓» 은 그대로 둔다 — 표기가 통째로 사라져도 빨갛다. */
const pctNear = (txt, v) => {
  if (txt == null) return false;
  const m = String(txt).match(/-?[\d,]+(?:\.\d+)?/);
  if (!m) return false;
  return Math.abs(parseFloat(m[0].replace(/,/g, '')) - (1 + v)) <= 0.0015;
};

(async () => {
  const browser = await launch(chromium);
  let tmp = null, tmp2 = null;
  try {
    const { page, o, errs } = await scan(browser, SRC);
    if (o.err) ok(false, '[스캔] 페이지 안 측정이 예외 없이 끝났다', o.err.slice(0, 200));

    blkT('§전제 — 표본이 진짜 «보유 ↔ 미보유» 로 갈려 있다');
    ok(!!o.eq && !!o.eq.unId && !!o.eq.ownId, '[전제-1] 무기 부위에 미보유·보유 표본이 둘 다 있다',
      o.eq ? o.eq.unId + ' / ' + o.eq.ownId : '없음');
    ok(!!o.pet && !!o.pet.unId && !!o.pet.ownId, '[전제-2] 펫에 미보유·보유 표본이 둘 다 있다',
      o.pet ? o.pet.unId + ' / ' + o.pet.ownId : '없음');
    ok(!!o.cos && !!o.cos.unId, '[전제-3] 코스튬에 미보유 표본이 있다', o.cos && o.cos.unId);
    ok(o.eq && o.eq.lockShown === true,
      '[전제-4] 그 미보유 장비 칸은 여전히 **자물쇠로 잠금을 말한다**(정보를 열되 상태는 안 감춘다)');

    blkT('§1 선택 — 미개방 카드가 눌리고 선택이 실제로 바뀐다(세 시트 전수)');
    ok(o.eq && o.eq.clickable === o.eq.realN,
      '§1-a 05 장비: 실아이템 **전 칸**이 클릭 대상이다(보유분만이 아니다)',
      o.eq ? o.eq.clickable + '/' + o.eq.realN + '칸' : '측정 실패');
    ok(o.eq && o.eq.cardFound === true, '§1-b 05 장비: 미보유 칸에 `data-wpn` 이 붙어 있다', o.eq && o.eq.unId);
    ok(o.eq && o.eq.picked === true,
      '§1-c 05 장비: 미보유 칸을 누르면 **선택이 그 칸으로 옮겨 간다**',
      o.eq ? '선택 → ' + o.eq.selAfterClick : '측정 실패');
    ok(o.pet && o.pet.cardFound === true && o.pet.popupOn === true,
      '§1-d 26 펫: 미보유 카드가 08 세부를 연다');
    ok(o.cos && o.cos.picked === true && o.cos.selMarked === true,
      '§1-e 50 코스튬: 미보유 카드가 선택되고 `.sel` 표시가 붙는다');

    blkT('§2 정보 — 실명·실수치가 뜬다(«???»·«—»·강제 0% 0건 · 수치는 데이터 파생)');
    ok(o.eq && !!o.eq.name && !/\?/.test(o.eq.name), '§2-a 05 장비: 이름이 실물이다', JSON.stringify(o.eq && o.eq.name));
    ok(o.eq && pctNear(o.eq.ownV, o.eq.trueOwn),
      '§2-b 05 장비: **보유 효과**가 `ownVal()` 그대로다(강제 0 아님)',
      o.eq ? o.eq.ownV + ' ↔ ×' + (1 + o.eq.trueOwn).toFixed(4) + '배' : '');
    ok(o.eq && pctNear(o.eq.eqV, o.eq.trueEq),
      '§2-c 05 장비: **장착 효과**가 `equipVal()` 그대로다(강제 0 아님)',
      o.eq ? o.eq.eqV + ' ↔ ' + (o.eq.trueEq * 100).toFixed(2) + '%' : '');
    ok(o.eq && o.eq.icLen > 0 && !!o.eq.grade, '§2-d 05 장비: 아이콘·등급도 실물이다', o.eq && o.eq.grade);
    ok(o.pet && o.pet.title === o.pet.trueName,
      '§2-e 26 펫: 세부 제목이 **«???» 가 아니라 실명**이다',
      o.pet ? JSON.stringify(o.pet.title) + ' ↔ ' + JSON.stringify(o.pet.trueName) : '');
    ok(o.pet && !/획득하지 못했습니다/.test(o.pet.desc || '') && /따라다니며/.test(o.pet.desc || ''),
      '§2-f 26 펫: 설명이 **실설명**이다(«아직 획득하지 못했습니다» 대체문 0건)');
    ok(o.pet && o.pet.descLines === 3,
      '§2-g 26 펫: 그 설명이 여전히 **3줄**이다(485 규약 — `.sk-db` 750×290 을 안 넘긴다)',
      o.pet && o.pet.descLines + '줄');
    ok(o.pet && (o.pet.cell || '').trim() !== '—' && String(o.pet.cell || '').length > 0,
      '§2-h 26 펫: 표 «피해량» 이 «—» 가 아니다', JSON.stringify(o.pet && o.pet.cell));
    ok(o.pet && pctNear((o.pet.own || '').split('골드')[0], o.pet.trueOwn * 0.6),
      '§2-i 26 펫: 보유 효과 «공격» 이 `ownVal()×0.6` 그대로다(강제 0 아님)',
      o.pet ? o.pet.own + ' ↔ ' + (o.pet.trueOwn * 0.6 * 100).toFixed(2) + '%' : '');
    ok(o.pet && o.pet.icLen > 0, '§2-j 26 펫: 아이콘이 그려진다(82 규칙 — 미보유도 무엇인지 보인다)');
    ok(o.cos && o.cos.title === o.cos.trueName,
      '§2-k 50 코스튬: 세부 제목이 실명이다(87 규약 — 원래부터 옳던 자리, 회귀로 지킨다)',
      JSON.stringify(o.cos && o.cos.title));
    ok(o.rel && o.rel.title === o.rel.trueName,
      '§2-l 89 유물: `showItem` 을 공유하는 네 번째 계열도 같이 열렸다(공용 부품 = 한 곳)',
      JSON.stringify(o.rel && o.rel.title));
    ok(o.rel && /미보유/.test(o.rel.desc || ''),
      '§2-m 89 유물: 버튼 행이 없는 계열이라 **설명 줄이** 미보유를 말한다(상태를 안 잃었다)');

    blkT('§3 장착 — «장착/착용/출전만» 막히고, 막힌 이유를 말한다');
    ok(o.eq && o.eq.notEquipped === true, '§3-a 05 장비: 미보유는 [장착] 을 눌러도 장착되지 않는다');
    ok(o.eq && o.eq.rejected === true && REJECT.test(o.eq.rejectTxt || ''),
      '§3-b 05 장비: 그리고 **반려 피드백**이 뜬다(종전 0건 · §4-c 와 같은 문면 자)',
      JSON.stringify(o.eq && o.eq.rejectTxt));
    ok(o.eq && o.eq.btnOff === true, '§3-c 05 장비: 버튼이 «못 누르는 색»(`.off`)으로 남아 있다');
    ok(o.pet && o.pet.btnDisabled === true && o.pet.notEquipped === true,
      '§3-d 26 펫: [장착] 이 비활성이고 실제로 장착되지 않는다');
    ok(o.pet && /미보유/.test(o.pet.btn || ''),
      '§3-e 26 펫: **버튼 라벨이 이유를 말한다**(설명 상자에서 걷어낸 상태가 여기로 왔다)',
      JSON.stringify(o.pet && o.pet.btn));
    ok(o.pet && o.pet.quickBadge === false,
      '§3-f 26 펫: 카드의 빠른 장착 뱃지는 미보유에 안 붙는다(종전 그대로)');
    ok(o.cos && o.cos.rejected === true && o.cos.notWorn === true
       && REJECT.test(o.cos.rejectTxt || ''),
      '§3-g 50 코스튬: [착용] 이 막히고 토스트로 이유를 말한다(182 선례 — 회귀로 지킨다)',
      JSON.stringify(o.cos && o.cos.rejectTxt));

    blkT('§4 회귀 — 보유 칸 동작이 한 칸도 안 바뀌었다');
    ok(o.eq && pctNear(o.eq.ownOwnV, o.eq.ownTrueOwn) && pctNear(o.eq.ownEqV, o.eq.ownTrueEq),
      '§4-a 05 장비: 보유 칸의 두 수치가 종전 식 그대로다',
      o.eq ? o.eq.ownOwnV + ' / ' + o.eq.ownEqV : '');
    ok(o.eq && o.eq.ownEquipWorks === true,
      '§4-b 05 장비: 보유 칸 [장착] 은 **실제로 장착된다**(반려 분기가 산 길을 안 막았다)');
    ok(o.eq && Array.isArray(o.eq.ownToasts) && o.eq.ownToasts.every(t => !REJECT.test(t)),
      '§4-c 05 장비: 보유 칸에서는 **반려** 토스트가 안 뜬다(반려가 «항상» 뜨면 그건 새 결함이다)',
      JSON.stringify(o.eq && o.eq.ownToasts));
    ok(o.pet && o.pet.ownBtnDisabled === false && /장착|해제/.test(o.pet.ownBtn || ''),
      '§4-d 26 펫: 보유 칸 [장착] 라벨·활성이 종전 그대로다', JSON.stringify(o.pet && o.pet.ownBtn));
    ok(o.eq && o.eq.dummyClickable === 0,
      '§4-e 05 장비: **더미 칸**(그 등급에 아이템이 없는 빈자리)은 여전히 클릭 대상이 아니다');
    /* ⚑ 728 — §4-c 를 «모든 토스트» 에서 «반려 토스트» 로 좁혔다. **무르게 푼 것이 아님**을
       자가 스스로 못박는다: 같은 자(REJECT)가 산 반려 문면은 잡고 산 연출 문면은 안 잡는가.
       이 항이 초록이면 «반려가 보유 칸에 새면 §4-c 는 그대로 빨개진다» 가 성립한다. */
    ok(REJECT.test(o.eq && o.eq.rejectTxt || '')
       && ((o.eq && o.eq.ownToasts) || []).length > 0
       && !((o.eq && o.eq.ownToasts) || []).some(t => REJECT.test(t)),
      '§4-f 그 문면 자는 **가른다** — 산 반려문(§3-b)은 잡고, 산 연출문(324/684/685)은 안 잡는다',
      JSON.stringify(o.eq && o.eq.rejectTxt) + ' ↔ ' + JSON.stringify(o.eq && o.eq.ownToasts));

    /* ── §5 스코프 ────────────────────────────────────────────────────
       728(2026-09-01) 로 **축을 갈라 적었다.** 이 절의 원뜻은 «664 가 남의 구간을 대신 열지
       않았다» 인데, 그것을 «스킬은 아직 «???» 다» 로 재고 있었다. 662(주인 지시 2026-09-02
       00:20)가 완료되면서 그 표현이 뒤집혔고 — 남은 옛 축은 «662 를 되돌려라» 와 같은 말이다
       (333 «두 게이트가 서로 반대를 단언» 과 같은 꼴 · 나중 지시가 옳다).
       ⚠ 그렇다고 항을 지우면 이 절의 뜻이 통째로 사라진다. 그래서 **대상 축**으로 다시 적는다:
         «미개방 정보 공개» 규약은 한 벌이고, **스킬은 662 가 · 장비·펫·코스튬은 664 가** 연다.
       ⚑ §5-b 의 «가려짐» 자는 `verify662` [A](`/\?/.test(title)`)에서 **빌려 왔다** — 두 자가
         같은 칸을 각자 다른 눈으로 세면 다음 번복에서 또 갈라진다(728 등재문 경고). */
    blkT('§5 스코프 — 대상 축: 스킬 = 662 · 장비·펫·코스튬 = 664 (한 규약, 두 구간)');
    ok(RAW.indexOf("'아직 획득하지 못했습니다.<br>스킬 소환으로 획득하세요.'") < 0
       && RAW.indexOf('  const desc = skillDescText(it)') >= 0,
      '§5-a `showSkillDetail` 의 미보유 대체문이 **되살아나지 않았다**(662 가 연 자리 — 되심으면 빨개진다)');
    ok(o.sk && !!o.sk.title && !/\?/.test(o.sk.title) && o.sk.title === o.sk.trueName,
      '§5-b 그래서 미보유 **스킬** 제목은 **실명**이다 — 662 가 연 자리(verify662 [A] 와 같은 자)',
      JSON.stringify(o.sk && o.sk.title) + ' ↔ ' + JSON.stringify(o.sk && o.sk.trueName));
    ok(o.sk && /🔒/.test(o.sk.unTag || ''),
      '§5-c 열되 **상태는 안 잃었다** — 스킬 설명에 `.sk-un` 딱지가 남아 있다(§전제-4·§2-m 과 같은 꼴)',
      JSON.stringify((o.sk && o.sk.unTag || '').slice(0, 34)));
    ok(SKILL_AT > 0 && ITEM_AT > SKILL_AT && MTITLE_HITS === 2,
      '§5-d 두 자리는 **다른 함수**다 — `showSkillDetail`(662) · `showItem`(664). 664 는 제 구간만 고쳤다',
      'showSkillDetail ' + lineOf(SKILL_AT) + '행 · showItem ' + lineOf(ITEM_AT)
      + '행 · 제목 줄 ' + MTITLE_HITS + '자리');

    blkT('§6 에러');
    ok(errs.length === 0, '§6-a 콘솔·페이지 에러 0건', errs.slice(0, 2).join(' | ') || '없음');
    await page.close();

    /* ── §R 되돌림 ───────────────────────────────────────────────── */
    blkT('§R 되돌림 — 옛 은닉을 도로 심으면 §1·§2·§3 이 실제로 빨개진다');
    /* ⚑ 728 — 치환은 **`showItem` 부터의 꼬리에만** 건다.
       옛 사본은 `RAW.replace('  $(\'mtitle\').textContent = it.n;', …)` 였는데,
       662 가 `showSkillDetail` 의 `own ? it.n : '???'` 가드를 걷어내면서 **똑같은 줄이
       스킬 함수에 먼저** 생겼다(28272행 ↔ 28443행). `String.replace(문자열, …)` 은 첫 자리
       하나만 바꾸므로 R3 은 **662 의 구간을 되돌리고** 펫 제목은 실명 그대로였다 —
       그래서 [R3] 이 «되돌려도 안 빨개진다» 로 빨갰다(`probe728` [3-c]~[3-e] 가 실증).
       뿌리는 «표본이 낡았다» 가 아니라 «치환이 딴 자리를 맞았다» 였다. */
    const subs = [
      ["        +  (real ? ' data-wpn=\"' + real.id + '\"' : '')",
       "        +  (mine ? ' data-wpn=\"' + real.id + '\"' : '')", 'R1 칸 클릭'],
      /* 725 이관 — `wpct` 는 선언째 사라졌다(표기 한 벌 `fmtEff` 로 모임). 되돌림이 재현하는
         결손(미보유를 0 으로 눌러 적기)은 그대로다. */
      ["  $('wpnOwnV').innerHTML  = '<i>' + fmtEff(ownVal(cur)) + '</i>';",
       "  $('wpnOwnV').innerHTML  = '<i>' + fmtEff(own ? ownVal(cur) : 0) + '</i>';", 'R2 보유 효과'],
      ["  $('mtitle').textContent = it.n;",
       "  $('mtitle').textContent = own ? it.n : '???';", 'R3 제목'],
      ["      + (own ? (eq ? '해제' : '장착') : '미보유') + '</b></button>'",
       "      + (eq ? '해제' : '장착') + '</b></button>'", 'R4 버튼 라벨'],
    ];
    const head = RAW.slice(0, ITEM_AT);
    let body = RAW.slice(ITEM_AT);
    const hits = subs.map(([a, b]) => {
      const n = body.split(a).length - 1;
      if (n === 1) body = body.split(a).join(b);
      return n;
    });
    const old = head + body;
    /* ⚑ 개수를 세는 것이 [R0] 의 본체다 — «넷 중 셋만 걸려도 초록» 이던 것이 이번 부패를
       조용히 통과시켰다(옛 [R0] 은 `old !== RAW` 하나였다 · 334·537 «개수가 아니라 목록»). */
    ok(hits.join('/') === '1/1/1/1',
      '[R0] 되돌림 치환 **네 자리가 각자 꼭 한 번씩** 걸렸다(하나라도 헛돌면 빨강)',
      subs.map((s, i) => s[2] + ':' + hits[i]).join(' · '));
    ok(old.slice(SKILL_AT, ITEM_AT).indexOf("  $('mtitle').textContent = it.n;") >= 0,
      '[R0-b] 그리고 **662 의 구간(`showSkillDetail`)은 사본에서도 안 건드려졌다** — 되돌린 것은 664 뿐이다');
    tmp = path.join(ROOT, `index.verify664-revert-${process.pid}.html`);
    fs.writeFileSync(tmp, old);
    const r = await scan(browser, tmp);
    if (r.o.err) ok(false, '[R] 되돌림 사본 측정이 예외 없이 끝났다', r.o.err.slice(0, 160));
    ok(r.o.eq && r.o.eq.clickable < r.o.eq.realN,
      '[R1] 되돌린 사본에서는 미보유 장비 칸이 다시 클릭 대상이 아니다(§1-a 가 빨개진다)',
      r.o.eq ? r.o.eq.clickable + '/' + r.o.eq.realN + '칸' : '');
    ok(r.o.eq && !pctNear(r.o.eq.ownV, r.o.eq.trueOwn),
      '[R2] 되돌린 사본에서는 보유 효과가 다시 강제 0 이다(§2-b 가 빨개진다)',
      r.o.eq && r.o.eq.ownV);
    ok(r.o.pet && r.o.pet.title === '???',
      '[R3] 되돌린 사본에서는 펫 제목이 다시 «???» 다(§2-e 가 빨개진다)',
      JSON.stringify(r.o.pet && r.o.pet.title));
    ok(r.o.pet && !/미보유/.test(r.o.pet.btn || ''),
      '[R4] 되돌린 사본에서는 버튼 라벨이 다시 이유를 안 말한다(§3-e 가 빨개진다)',
      JSON.stringify(r.o.pet && r.o.pet.btn));
    /* ⚑ 음성항 — 되돌려도 **안 바뀌는** 축이 있어야 «사본이 통째로 딴 것» 이 아님이 선다 */
    ok(r.o.cos && r.o.cos.title === r.o.cos.trueName,
      '[R5] 그런데 코스튬은 되돌림 사본에서도 실명이다 — 664 이전부터 옳던 자리라는 증거');
    ok(r.o.sk && r.o.sk.title === r.o.sk.trueName,
      '[R6] **스킬**도 되돌림 사본에서 실명 그대로다 — 이 사본이 되돌린 것은 664 구간뿐이라는 증거(§5-d 와 한 벌)',
      JSON.stringify(r.o.sk && r.o.sk.title));
    await r.page.close();

    /* ── §R2 되돌림(662 쪽) ──────────────────────────────────────────
       728 — §5 의 **새 방향**이 무르지 않음을 못박는다. 662 가 연 자리를 도로 닫은 사본에서
       §5-a·§5-b·§5-c 가 실제로 빨개져야 한다. 치환표는 `verify662` 의 `revert()` 에서
       **그대로 빌려 왔다** — 두 자가 다른 표를 쓰면 되돌림 시험이 서로 거짓이 된다. */
    blkT('§R2 되돌림(662) — 스킬 쪽을 도로 닫으면 §5-a·§5-b·§5-c 가 실제로 빨개진다');
    const skHead = RAW.slice(0, ITEM_AT), skTail = RAW.slice(ITEM_AT);
    const s2 = [
      ["  $('mtitle').textContent = it.n;",
       "  $('mtitle').textContent = own ? it.n : '???';"],
      ['  const desc = skillDescText(it)',
       "  const desc = (own ? skillDescText(it) : '아직 획득하지 못했습니다.<br>스킬 소환으로 획득하세요.')"],
    ];
    let h2 = skHead;
    const h2n = s2.map(([a, b]) => { const n = h2.split(a).length - 1; if (n === 1) h2 = h2.split(a).join(b); return n; });
    /* 셋째 자리 — 662 가 **덧붙인** 상태 딱지(`.sk-un`)를 걷어낸다. 앞 두 치환만으로는
       딱지가 살아남아 «되돌렸는데 §5-c 는 초록» 이 된다(1회차에 실제로 그랬다) —
       옛 세계에는 이 줄이 없었으므로 되돌림은 여기까지 가야 참이다. */
    const UN_A = h2.indexOf('+ (own ? \'\' : \'<span class="sk-un">');
    const UN_B = UN_A < 0 ? -1 : h2.indexOf("</span>');", UN_A);
    if (UN_B > 0) h2 = h2.slice(0, UN_A) + ';' + h2.slice(UN_B + "</span>');".length);
    ok(h2n.join('/') === '1/1' && UN_B > 0,
      '[R2-0] 662 되돌림 치환 **세 자리**가 각자 꼭 한 번씩 걸렸다(`showItem` 앞 구간에서만)',
      h2n.join('/') + ' · sk-un 딱지 ' + (UN_B > 0 ? '걷어냄' : '못 찾음'));
    tmp2 = path.join(ROOT, `index.verify664-revert662-${process.pid}.html`);
    fs.writeFileSync(tmp2, h2 + skTail);
    const r2 = await scan(browser, tmp2);
    if (r2.o.err) ok(false, '[R2] 662 되돌림 사본 측정이 예외 없이 끝났다', r2.o.err.slice(0, 160));
    ok(h2.indexOf("'아직 획득하지 못했습니다.<br>스킬 소환으로 획득하세요.'") >= 0,
      '[R2-a] 그 사본에는 옛 대체문이 되살아나 있다(§5-a 가 빨개진다)');
    ok(r2.o.sk && r2.o.sk.title === '???',
      '[R2-b] 그리고 미보유 스킬 제목이 다시 «???» 다(§5-b 가 빨개진다)',
      JSON.stringify(r2.o.sk && r2.o.sk.title));
    ok(r2.o.sk && !/🔒/.test(r2.o.sk.unTag || ''),
      '[R2-c] `.sk-un` 상태 딱지도 사라진다(§5-c 가 빨개진다)',
      JSON.stringify(r2.o.sk && r2.o.sk.unTag));
    /* 음성항 — 662 를 되돌려도 **펫은 안 바뀐다**(두 구간이 정말 갈려 있다는 증거 · §5-d 와 한 벌) */
    ok(r2.o.pet && r2.o.pet.title === r2.o.pet.trueName,
      '[R2-d] 그런데 **펫은 그 사본에서도 실명**이다 — 664 구간은 662 되돌림에 안 딸려 간다',
      JSON.stringify(r2.o.pet && r2.o.pet.title));
    await r2.page.close();
  } finally {
    if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp);
    if (tmp2 && fs.existsSync(tmp2)) fs.unlinkSync(tmp2);
    await browser.close();
  }

  const tot = pass + fail;
  console.log(`\nVERIFY664 ${pass}/${tot} ` + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
