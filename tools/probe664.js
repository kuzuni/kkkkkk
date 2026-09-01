#!/usr/bin/env node
/* 작업 664 — 「미개방 장비·코스튬·펫도 선택 가능 + 실정보 표시, 장착만 비활성」 **재현**
 * (338 규칙 — 처방 전에 제품에게 먼저 묻는다. 등재문의 «선택 불가/정보 은닉» 이 어느 시트에서
 *  실제로 참인지, 시트마다 병이 같은지 다른지를 가른다.)
 *
 *   node tools/probe664.js
 *
 * 세 시트를 각각 따로 잰다 — 등재문은 셋을 «마찬가지» 로 묶었지만 부품이 다르다:
 *   [A] 장비 05 팝업(`#wpnw` · 06 부위 슬롯이 오프너) — `.wgc` 카드의 `data-wpn` 유무 =
 *       «클릭이 애초에 안 걸리는가». 그리고 미보유 칸을 골랐을 때 상단 패널의 수치.
 *   [B] 펫 26 시트(`#bPet`) — 카드는 눌리는데 **08 세부 팝업**(`showItem`)이 무엇을 가리는가
 *       (제목 «???» · 설명 «아직 획득하지 못했습니다» · 표 «—» · 보유 효과 «0%»).
 *   [C] 코스튬 50 시트(`#bCos`) — 87·82 규약으로 이미 열려 있는지(대조군).
 *   [D] 유물 89 — [B] 와 **같은 함수**(`showItem`)를 지나는 네 번째 계열이다. 공용 부품이면
 *       한 곳에서 열린다(662·664 위임 규약 메모) — 그 사실을 여기서 못박는다.
 *
 * 수리 전/후 **같은 명령**으로 돌려 대조한다(338·344 규칙).
 *
 * ── 1회차(수리 전) 실측 — PROBE664 PASS 16/16 = **등재문 전항 확인** ────────
 *   [A] 무기 부위 실아이템 **36** 중 `data-wpn` **0칸**(부팅 세이브 보유 0) ⇒ 미보유 칸은
 *       **클릭이 아예 안 걸린다**(핸들러가 `[data-wpn]` 만 본다 · 31567). 강제 선택시키면
 *       이름 «낡은 손도끼» · 등급 «일반» 은 **이미 나오는데** 보유 효과 «+0.0%»(참값 **1.84%**) ·
 *       장착 효과 «+0.0%»(참값 **9.88%**) — 즉 **은닉된 것은 이름이 아니라 수치**다.
 *       [장착] 은 `.off` 로 막히는데 눌러도 **아무 말이 없다**(반려 피드백 0건).
 *   [B] 미보유 펫 세부 — 제목 **«???»** · 설명 «아직 획득하지 못했습니다…» · 표 피해량 **«—»**
 *       (참값 19.16) · 보유 효과 **«공격 +0% 골드 +0%»**(참 공격 2.00%) ·
 *       [장착] disabled(라벨은 그냥 «장착» 이라 **이유를 말하지 않는다**).
 *   [C] 코스튬 — 미보유도 이름(«수련 기사»)·그림·획득 조건이 이미 보이고
 *       [착용]은 «🔒 승급전에서 획득해야 착용합니다» 토스트로 반려한다 ⇒ **664 가 요구하는
 *       꼴이 저장소 안에 이미 있다**(87·82·182 규약). 나머지 두 시트를 여기에 맞추면 된다.
 *   [D] 유물 — [B] 와 **같은 함수·같은 분기**에서 같은 은닉(제목 «???» · 설명 · 보유 효과 «+0%»).
 *
 * ⚠ 이 자를 고치는 다음 세션이 두 번 걸린 함정 둘(둘 다 «제품은 멀쩡한데 자가 조용한» 꼴):
 *   ① `fxToast` 는 스택 **4장**이 차면 조용히 큐로 빠진다 → 반려 피드백을 재기 전에 자리를 비운다.
 *   ② `wpnSel`·`cosSel` 은 `let` 전역이라 **`window.` 로는 안 잡힌다**(`window.cosSel = …` 은
 *      다른 변수를 만든다). evaluate 안에서 **맨이름으로** 대입해야 진짜 선택이 바뀐다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? ' — ' + d : '')); };

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + SRC);
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof showItem === 'function');
  await p.waitForTimeout(900);

  const r = await p.evaluate(async () => {
    const raf = () => new Promise(res => requestAnimationFrame(() => res()));
    const wait = async n => { for (let i = 0; i < n; i++) await raf(); };
    window.step = () => {};                       /* 배경 전투 정지(512 규약) */
    const tx = sel => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };
    const out = {};

    /* ── [A] 장비 05 팝업 ───────────────────────────────────────── */
    goTab('hero'); heroSubGo('eq'); await wait(6);
    openWeapon(null, 'weapon'); await wait(6);
    const cards = [...document.querySelectorAll('#wpnGrid .wgc')];
    /* «실아이템 칸» = 더미 잠금칸이 아닌 칸. 더미는 부위 기본 아이콘을 쓰고 진행바가 0/2 다.
       실아이템 수는 소스(EQUIPS)에서 직접 센다 — 마크업 추론보다 흔들리지 않는다. */
    const realN = EQUIPS.filter(e => e.slot === 'weapon').length;
    out.A = {
      cardN: cards.length,
      realN,
      clickable: cards.filter(c => c.dataset.wpn).length,
      ownedN: EQUIPS.filter(e => e.slot === 'weapon' && has(e.id)).length,
      lockedCards: cards.filter(c => c.classList.contains('lk')).length
    };
    /* 미보유 무기를 하나 골라 강제 선택 → 상단 패널이 무엇을 말하나 */
    const unown = EQUIPS.find(e => e.slot === 'weapon' && !has(e.id));
    out.A.unownId = unown ? unown.id : null;
    if (unown) {
      /* 카드 클릭이 실제로 먹는지부터 — 클릭 «후» 선택이 바뀌었나 */
      const before = wpnSel;
      const card = cards.find(c => (c.querySelector('.ic') || {}).innerHTML === unown.ic);
      if (card) { card.click(); await wait(4); }
      out.A.clickChangedSel = (wpnSel === unown.id);
      out.A.selBefore = before;
      wpnSel = unown.id; renderWpn(); await wait(4);
      out.A.name = tx('#wpnName'); out.A.grade = tx('#wpnGrade'); out.A.lv = tx('#wpnLv');
      out.A.ownV = tx('#wpnOwnV'); out.A.eqV = tx('#wpnEqV');
      out.A.icHTML = ($('wpnIc').innerHTML || '').slice(0, 40);
      out.A.btnEq = tx('#wpnBtnEq');
      out.A.btnEqOff = $('wpnBtnEq').classList.contains('off');
      /* 반려 피드백 — 미보유 상태로 [장착] 을 눌렀을 때 토스트가 뜨는가
         (⚠ 스택 4장 상한 때문에 재기 전에 자리를 비운다 — [C] 절 주석 참조) */
      document.querySelectorAll('#fxl .fx-toast').forEach(n => n.remove());
      const nBefore = document.querySelectorAll('#fxl .fx-toast').length;
      $('wpnBtnEq').click(); await wait(6);
      out.A.rejectFeedback = document.querySelectorAll('#fxl .fx-toast').length > nBefore;
      out.A.rejectTxt = [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent).pop() || null;
      out.A.stillNotEquipped = S.eqSlot.weapon !== unown.id;
      /* 실수치 — 데이터에서 파생하면 무엇이 나오는가(은닉된 값의 «참값») */
      out.A.trueOwn = (ownVal(unown) * 100).toFixed(2) + '%';
      out.A.trueEq = (equipVal(unown) * 100).toFixed(2) + '%';
    }
    closeWeapon(); await wait(3);

    /* ── [B] 펫 26 시트 ─────────────────────────────────────────── */
    heroSubGo('pet'); await wait(6);
    const upet = PETS.find(x => !has(x.id));
    out.B = { unownId: upet ? upet.id : null };
    if (upet) {
      const pc = document.querySelector('#bPet [data-ptit="' + upet.id + '"]');
      out.B.cardClickable = !!pc;
      if (pc) { pc.click(); await wait(6); }
      out.B.popupOn = !!document.querySelector('.sk8.on, #sk8.on');
      out.B.title = tx('#mtitle');
      out.B.desc = tx('#mbox .sk-db');
      out.B.cell = tx('#mbox .sk-ct .vl .nt');
      out.B.own = tx('#mbox .sk-ow .v');
      const e = document.getElementById('mEq');
      out.B.btnEq = e ? e.textContent.trim() : null;
      out.B.btnEqDisabled = e ? e.disabled : null;
      out.B.trueOwn = (ownVal(upet) * 100).toFixed(2) + '%';
      out.B.trueDmg = petDmg(upet);
      closeModal && closeModal();
      await wait(3);
    }

    /* ── [C] 코스튬 50 시트(대조군) ─────────────────────────────── */
    heroSubGo('cos'); await wait(6);
    const uav = AVATARS.find(a => !cosOwn(a.id));
    out.C = { unownId: uav ? uav.id : null };
    if (uav) {
      const cc = document.querySelector('#bCos [data-cosit="' + uav.id + '"]');
      out.C.cardClickable = !!cc;
      cosSel = uav.id; renderCos(); await wait(4);
      /* [착용] 반려 피드백 — **세부 팝업을 열기 전에** 잰다(팝업 껍데기가 시트 위를 덮으면
         같은 노드를 다시 잡아야 해서 «눌렀는데 조용하다» 는 헛측정이 난다 — 1회차에 실제로 그랬다) */
      /* ⚠ `fxToast` 는 스택 4장이 차면 **조용히 큐로 빠진다**(38328 `if(stack > 3) return`).
         앞 절([A]·[B])이 남긴 토스트가 그 자리를 먹고 있으면 «반려 피드백 0건» 이라는
         헛측정이 난다 — 재는 순간 자리를 비운다(1회차에 실제로 이것에 걸렸다). */
      document.querySelectorAll('#fxl .fx-toast').forEach(n => n.remove());
      const nBefore = document.querySelectorAll('#fxl .fx-toast').length;
      const wb = document.querySelector('#bCos [data-coswear]');
      if (wb) { wb.click(); await wait(8); }
      out.C.rejectFeedback = document.querySelectorAll('#fxl .fx-toast').length > nBefore;
      out.C.rejectTxt = [...document.querySelectorAll('#fxl .fx-toast')].map(e => e.textContent).pop() || null;
      out.C.stillNotWorn = cosCur() !== uav.id;
      showCosDetail(uav.id); await wait(5);
      out.C.title = tx('#mtitle');
      out.C.desc = tx('#mbox .sk-db');
    }

    /* ── [D] 유물 89 — showItem 의 네 번째 계열 ─────────────────── */
    const url = RELICS.find(x => !has(x.id));
    out.D = { unownId: url ? url.id : null };
    if (url) {
      showItem(url.id); await wait(5);
      out.D.title = tx('#mtitle');
      out.D.desc = tx('#mbox .sk-db');
      out.D.own = tx('#mbox .sk-ow .v');
      closeModal && closeModal(); await wait(3);
    }
    return out;
  });

  console.log('\n=== [A] 장비 05 팝업(무기 부위) ===');
  console.log('  카드 칸 ' + r.A.cardN + ' · 실아이템 ' + r.A.realN + ' · 보유 ' + r.A.ownedN
    + ' · `data-wpn`(클릭 가능) **' + r.A.clickable + '**  · `.lk` 잠금표시 ' + r.A.lockedCards);
  console.log('  미보유 표본 ' + r.A.unownId + ' — 클릭으로 선택이 바뀌나: ' + r.A.clickChangedSel);
  console.log('  강제 선택 후 표시 — 이름 ' + JSON.stringify(r.A.name) + ' · 등급 ' + JSON.stringify(r.A.grade)
    + ' · ' + JSON.stringify(r.A.lv));
  console.log('    보유 효과 ' + JSON.stringify(r.A.ownV) + ' (참값 ' + r.A.trueOwn + ')'
    + ' · 장착 효과 ' + JSON.stringify(r.A.eqV) + ' (참값 ' + r.A.trueEq + ')');
  console.log('    [장착] ' + JSON.stringify(r.A.btnEq) + ' off=' + r.A.btnEqOff
    + ' · 눌렀을 때 반려 피드백 ' + r.A.rejectFeedback);
  ok(r.A.clickable === r.A.ownedN && r.A.clickable < r.A.realN,
    '[A-1] 미보유 장비 칸은 클릭이 안 걸린다(등재문 «선택 불가» 확인)',
    'data-wpn ' + r.A.clickable + '/' + r.A.realN);
  ok(r.A.clickChangedSel === false, '[A-2] 미보유 카드를 눌러도 선택이 안 바뀐다');
  ok(/\+0\.?0*%/.test(r.A.ownV || '') && /\+0\.?0*%/.test(r.A.eqV || ''),
    '[A-3] 미보유 선택 시 보유·장착 효과가 둘 다 0 으로 은닉된다',
    r.A.ownV + ' / ' + r.A.eqV);
  ok(r.A.stillNotEquipped, '[A-4] 미보유는 장착되지 않는다(수리 후에도 지켜야 할 축)');
  ok(r.A.rejectFeedback === false, '[A-5] 미보유 [장착] 을 눌러도 **아무 말이 없다**(반려 피드백 0건)');

  console.log('\n=== [B] 펫 26 → 08 세부 ===');
  console.log('  미보유 표본 ' + r.B.unownId + ' · 카드 클릭 가능 ' + r.B.cardClickable + ' · 팝업 ' + r.B.popupOn);
  console.log('  제목 ' + JSON.stringify(r.B.title));
  console.log('  설명 ' + JSON.stringify((r.B.desc || '').slice(0, 70)));
  console.log('  표 «피해량» ' + JSON.stringify(r.B.cell) + ' (참값 ' + r.B.trueDmg + ')');
  console.log('  보유 효과 ' + JSON.stringify(r.B.own) + ' (참 공격 ' + r.B.trueOwn + ')');
  console.log('  [장착] ' + JSON.stringify(r.B.btnEq) + ' disabled=' + r.B.btnEqDisabled);
  ok(r.B.cardClickable === true, '[B-1] 펫 카드 자체는 미보유도 이미 눌린다(병이 «클릭» 이 아니다)');
  ok(r.B.title === '???', '[B-2] 미보유 펫 세부 제목이 «???» 로 은닉된다', JSON.stringify(r.B.title));
  ok(/획득하지 못했습니다/.test(r.B.desc || ''), '[B-3] 설명이 실설명이 아니라 «아직 획득하지 못했습니다» 로 대체된다');
  ok((r.B.cell || '').trim() === '—', '[B-4] 표 «피해량» 칸이 «—» 로 은닉된다');
  ok(/\+0%/.test(r.B.own || ''), '[B-5] 보유 효과가 «+0%» 로 은닉된다', r.B.own);
  ok(r.B.btnEqDisabled === true, '[B-6] [장착] 은 이미 비활성이다(수리 후에도 지켜야 할 축)');
  ok(!/미보유|획득/.test(r.B.btnEq || ''), '[B-7] 그런데 버튼 라벨이 **이유를 말하지 않는다**', JSON.stringify(r.B.btnEq));

  console.log('\n=== [C] 코스튬 50(대조군) ===');
  console.log('  미보유 표본 ' + r.C.unownId + ' · 카드 클릭 가능 ' + r.C.cardClickable);
  console.log('  제목 ' + JSON.stringify(r.C.title) + ' · 설명 ' + JSON.stringify((r.C.desc || '').slice(0, 50)));
  console.log('  [착용] 반려 피드백 ' + r.C.rejectFeedback + ' ' + JSON.stringify(r.C.rejectTxt) + ' · 착용 안 됨 ' + r.C.stillNotWorn);
  ok(r.C.cardClickable === true && r.C.title !== '???' && !!r.C.title,
    '[C-1] 코스튬은 이미 «선택 가능 + 실명 표시» 다(87·82 규약 — 여기가 세 시트의 본보기)');
  ok(r.C.rejectFeedback === true && r.C.stillNotWorn === true,
    '[C-2] 코스튬 [착용] 은 «막고 + 이유를 말한다»(664 ③ 이 요구하는 꼴이 이미 있다)');

  console.log('\n=== [D] 유물 89 — showItem 의 네 번째 계열 ===');
  console.log('  미보유 표본 ' + r.D.unownId + ' · 제목 ' + JSON.stringify(r.D.title)
    + ' · 보유 효과 ' + JSON.stringify(r.D.own));
  ok(r.D.title === '???' && /획득하지 못했습니다/.test(r.D.desc || ''),
    '[D-1] 유물도 **같은 함수·같은 분기**에서 은닉된다(공용 부품 ⇒ 한 곳에서 열린다)');

  console.log('\n  콘솔 에러 ' + errs.length + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  ok(errs.length === 0, '[E] 콘솔 에러 0건');

  await b.close();
  console.log('\nPROBE664 ' + (fail ? 'FAIL' : 'PASS') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
