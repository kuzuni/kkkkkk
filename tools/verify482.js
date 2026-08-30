#!/usr/bin/env node
/* 482 검증 — 05 장비 팝업(무기·방패·목걸이)을 열면 «보유 중 제일 좋은 것» 이 선택돼 있다
 * (저장소 주인 지시 2026-08-30 «장비 같은거 팝업 들어가면 제일 좋은거에 선택 되있는 상태로
 *  해줘야함. 혹은 일괄 강화할때도 강화후에 제일 좋은거 선택 되있는 상태로 되고 장착버튼을
 *  누르면 바로 그거로 장착될수있는식으로 되야함»)
 *
 *   node tools/verify482.js   →  마지막 줄이 `VERIFY482 n/n PASS` 여야 한다.
 *
 * 수리 전 실측(`tools/probe482.js`): 세 부위 전부 열면 «장착 중» 이 선택됐고(최고가 아니다),
 * [일괄 강화] 로 순위가 뒤집혀도 선택이 안 따라갔다. 카드 지정 진입(B)만 원래 옳았다.
 *
 * 척도는 **장착 효과 `equipVal`** 하나다 — [장착] 이 바꾸는 값이 그것이기 때문이고,
 * 등급·티어(260 자리)·강화 레벨을 이미 전부 품는다. 동률은 등급 → 레벨 → 티어로 가른다.
 *
 * 검사 항목:
 *   [A] 열 때 — `openWeapon(null, part)` 직후 `wpnSel` = `equipVal` 최대(보유 중). 세 부위 다.
 *       A4 는 **아래 티어를 레벨로 끌어올려** 위 티어를 넘긴 표본이다(척도가 «표 자리» 가 아니라
 *       `equipVal` 임을 못박는다. 등급 경계는 레벨로 못 넘는다 — 260 «등급 경계 비역전»).
 *   [B] 카드 지정 진입 — `openWeapon(id, part)` 는 그 id 를 그대로 존중한다(자동 재선정 금지).
 *   [C] [일괄 강화] — 강화가 순위를 뒤집으면 선택이 새 최고를 따라간다.
 *   [D] [장착] — 누르면 `S.eqSlot[part]` 가 **선택된 것**이 된다(선택 = 장착 대상).
 *   [E] 자동 장착 0회(263·105 회귀) — 열고·강화하고·닫아도 `S.eqSlot` 은 버튼을 누르기 전엔 불변.
 *   [F] 보유 0 — 그 부위를 하나도 안 가진 세이브에서도 예외 없이 열리고 종전 폴백으로 떨어진다.
 *   [G] 06 장비 슬롯(`#eqCards [data-eqslot]`) → 05 진입도 [A] 와 같다.
 *   [H] 50 코스튬 — 시트를 열면 `cosSel` = 강화 레벨 최고(197 로 효율이 같아 레벨이 유일한 축).
 *       착용(`S.avatar`)은 **안 바뀐다**(263 «착용은 플레이어가 한 것만»).
 *   [I] 07 스킬 · 26 펫 — «선택» 축이 없다는 사실을 자로 못박는다(등재문 ⑤ 전제 기각 · review §4).
 *       나중에 선택을 신설하면 이 항이 빨개져 «482 규칙을 같이 정하라» 고 말한다.
 *   [R] 되돌림 시험 — 무르게 푼 수리가 아님을 못박는다:
 *       R1 `wpnBest` 를 «항상 null» 로 되돌리면 [A] 의 자가 빨개진다.
 *       R2 같은 되돌림에서 [C] 의 자도 빨개진다(선택이 새 최고를 안 따라간다).
 *       R3 `cosBest` 를 «착용 중» 으로 되돌리면 [H] 의 자가 빨개진다.
 *   [X] 콘솔·페이지 에러 0.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const PARTS = ['weapon', 'shield', 'amulet'];
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0].slice(0, 200) }; }
  };

  /* 표본 — 부위마다 보유 5종 · 장착 = 두 번째로 좋은 것.
     ⚠ 보유 목록을 «등급 오름차순 = 값 오름차순» 으로 만들지 않는다. 마지막 칸에 **낮은 등급 +
     높은 레벨** 을 심어 «등급만 보는 자» 와 «equipVal 을 보는 자» 가 갈리게 한다(A4). */
  const seedFn = () => {
    const out = {};
    ['weapon', 'shield', 'amulet'].forEach((k) => {
      const l = EQUIPS.filter((e) => e.slot === k);
      const pick = [l.filter(e => e.g === 0)[0], l.filter(e => e.g === 1)[2],
                    l.filter(e => e.g === 2)[0], l.filter(e => e.g === 2)[3],
                    l.filter(e => e.g === 3)[1]];
      S.own = S.own || {};
      pick.forEach((e, i) => { S.own[e.id] = { n: 0, l: 1 + i }; });
      const rank = pick.slice().sort((a, b) => equipVal(b) - equipVal(a));
      S.eqSlot[k] = rank[1].id;
      out[k] = { best: rank[0].id, bestG: rank[0].g, eq: rank[1].id,
                 own: pick.map(e => ({ id: e.id, g: e.g, lv: oLv(e.id), v: +equipVal(e).toFixed(4) })) };
    });
    return out;
  };
  const seed = await ev(seedFn);
  if (seed.__err) { console.log('표본 주입 실패: ' + seed.__err); process.exit(1); }

  /* ---- [A] 열 때 -------------------------------------------------------- */
  const A = await ev((parts) => parts.map((k) => {
    openWeapon(null, k);
    const l = EQUIPS.filter(e => e.slot === k && has(e.id));
    const best = l.slice().sort((a, b) => equipVal(b) - equipVal(a))[0];
    return { k, sel: wpnSel, best: best.id, cur: wpnCur().id, eq: S.eqSlot[k] };
  }), PARTS);
  if (A.__err) ok(false, 'A 즉사', A.__err);
  else {
    A.forEach((r, i) => ok(r.sel === r.best && r.cur === r.best,
      'A' + (i + 1) + ' ' + r.k + ' — 열면 최고가 선택된다',
      'wpnSel=' + r.sel + ' · 최고=' + r.best + ' · 장착 중=' + r.eq));
  }

  /* A4 — 척도가 «표 자리»(등급 안 티어)가 아니라 **값**임을 못박는 표본.
     같은 등급 안에서 **아래 티어를 강화 레벨로 끌어올려** 위 티어를 넘긴다.
     ⚠ 등급 경계는 레벨로 못 넘는다(260 «등급 경계 비역전» · 등급비 15.19 > lvWear 상한 2.2) —
       그래서 이 표본은 «같은 등급, 티어 한 칸» 이다. 넘길 수 있는 최소 레벨은 자가 직접 찾는다. */
  const A4 = await ev(() => {
    const k = 'weapon';
    const items = EQUIPS.filter(e => e.slot === k && e.g === 2).slice()
      .sort((a, b) => (a.j || 0) - (b.j || 0));
    const top = items[items.length - 1], chal = items[items.length - 2];
    EQUIPS.filter(e => e.slot === k).forEach(e => { delete S.own[e.id]; });
    S.own[top.id] = { n: 0, l: 1 };
    S.own[chal.id] = { n: 0, l: 1 };
    let L = 1;
    while (L < MAX_LEVEL && equipVal(chal) <= equipVal(top)) { S.own[chal.id].l = ++L; }
    S.eqSlot[k] = top.id;
    openWeapon(null, k);
    return { sel: wpnSel, chal: chal.id, chalJ: chal.j || 0, chalLv: L,
             top: top.id, topJ: top.j || 0,
             vChal: +equipVal(chal).toFixed(4), vTop: +equipVal(top).toFixed(4) };
  });
  if (A4.__err) ok(false, 'A4 즉사', A4.__err);
  else {
    ok(A4.vChal > A4.vTop,
      'A4a [전제] 아래 티어가 레벨로 위 티어를 실제로 넘겼다',
      A4.chal + '(j' + A4.chalJ + ' Lv' + A4.chalLv + ') ' + A4.vChal + ' > '
        + A4.top + '(j' + A4.topJ + ' Lv1) ' + A4.vTop);
    ok(A4.sel === A4.chal,
      'A4b 척도는 «티어 자리» 도 «장착 중» 도 아니라 `equipVal` 이다',
      'wpnSel=' + A4.sel + ' (장착 중은 ' + A4.top + ')');
  }

  /* B·C·D·E 를 위해 표본을 원래대로 다시 심는다 */
  await ev(seedFn);

  /* ---- [B] 카드 지정 진입 ------------------------------------------------ */
  const B = await ev((parts) => parts.map((k) => {
    const l = EQUIPS.filter((e) => e.slot === k && has(e.id));
    const worst = l.slice().sort((a, b) => equipVal(a) - equipVal(b))[0];
    openWeapon(worst.id, k);
    return { k, want: worst.id, sel: wpnSel };
  }), PARTS);
  if (B.__err) ok(false, 'B 즉사', B.__err);
  else B.forEach((r, i) => ok(r.sel === r.want,
    'B' + (i + 1) + ' ' + r.k + ' — 카드를 눌러 들어온 경로는 그 카드가 선택된다',
    '요청 ' + r.want + ' → wpnSel=' + r.sel));

  /* ---- [C] 일괄 강화가 순위를 뒤집는 표본 --------------------------------- */
  /* 등급 경계는 레벨로 못 넘으므로(A4 주석) 이 표본도 «같은 등급, 티어 한 칸» 이다.
     도전자만 재료를 갖게 해서 [일괄 강화] 한 번이 **정확히 순위를 뒤집게** 만든다. */
  const C = await ev((parts) => parts.map((k) => {
    const items = EQUIPS.filter(e => e.slot === k && e.g === 2).slice()
      .sort((a, b) => (a.j || 0) - (b.j || 0));
    const top = items[items.length - 1], chal = items[items.length - 2];
    EQUIPS.filter(e => e.slot === k).forEach(e => { delete S.own[e.id]; });
    S.own[top.id] = { n: 0, l: 1 };
    S.own[chal.id] = { n: 0, l: 1 };
    let L = 1;
    while (L < MAX_LEVEL && equipVal(chal) <= equipVal(top)) { S.own[chal.id].l = ++L; }
    S.own[chal.id].l = L - 1;                       /* 한 단계 아래로 되돌리고 */
    S.own[chal.id].n = fragNeed(L - 1);             /* 딱 한 번 오를 재료만 준다 */
    S.own[top.id].n = 0;
    S.eqSlot[k] = top.id;
    const bestOf = () => EQUIPS.filter(e => e.slot === k && has(e.id))
      .slice().sort((a, b) => equipVal(b) - equipVal(a))[0].id;
    openWeapon(null, k);
    const before = wpnSel, bestBefore = bestOf();
    $('wpnBtnUp').onclick();
    return { k, before, after: wpnSel, bestBefore, best: bestOf(),
             chal: chal.id, top: top.id, lv: oLv(chal.id) };
  }), PARTS);
  if (C.__err) ok(false, 'C 즉사', C.__err);
  else C.forEach((r, i) => {
    ok(r.bestBefore === r.top && r.best === r.chal,
      'C' + (i + 1) + 'a ' + r.k + ' — [전제] 이 표본에서 [일괄 강화] 가 실제로 순위를 뒤집는다',
      '최고 ' + r.bestBefore + ' → ' + r.best + ' (' + r.chal + ' Lv' + r.lv + ')');
    ok(r.after === r.best && r.before !== r.after,
      'C' + (i + 1) + 'b ' + r.k + ' — 강화 뒤 선택이 새 최고를 따라간다',
      'wpnSel ' + r.before + ' → ' + r.after);
  });

  /* D·E 는 다시 원래 표본에서 본다 */
  await ev(seedFn);

  /* ---- [D] [장착] 이 선택을 그대로 장착한다 ------------------------------- */
  const D = await ev((parts) => parts.map((k) => {
    openWeapon(null, k);
    const sel = wpnSel, was = S.eqSlot[k];
    $('wpnBtnEq').onclick();
    return { k, sel, was, now: S.eqSlot[k], label: $('wpnBtnEq').textContent.trim() };
  }), PARTS);
  if (D.__err) ok(false, 'D 즉사', D.__err);
  else D.forEach((r, i) => ok(r.now === r.sel && r.was !== r.sel,
    'D' + (i + 1) + ' ' + r.k + ' — [장착] 이 선택한 것을 장착한다',
    r.was + ' → ' + r.now + ' (선택 ' + r.sel + ' · 버튼 «' + r.label + '»)'));

  /* ---- [E] 자동 장착 0회(263·105 회귀) ------------------------------------ */
  const E = await ev(() => {
    /* 장착을 «두 번째로 좋은 것» 으로 되돌려 놓고, 버튼을 안 누르는 동작만 시킨다 */
    const out = [];
    ['weapon', 'shield', 'amulet'].forEach((k) => {
      const l = EQUIPS.filter(e => e.slot === k && has(e.id));
      const rank = l.slice().sort((a, b) => equipVal(b) - equipVal(a));
      S.eqSlot[k] = rank[1].id;
      const was = S.eqSlot[k];
      openWeapon(null, k);            /* 열고 */
      closeWeapon();                  /* 닫고 */
      openWeapon(null, k);
      $('wpnBtnUp').onclick();        /* 일괄 강화하고 */
      const grid = document.querySelector('#wpnGrid [data-wpn]');
      if (grid) grid.click();         /* 카드도 눌러 보고 */
      closeWeapon();
      out.push({ k, was, now: S.eqSlot[k] });
    });
    return out;
  });
  if (E.__err) ok(false, 'E 즉사', E.__err);
  else E.forEach((r, i) => ok(r.now === r.was,
    'E' + (i + 1) + ' ' + r.k + ' — 열고·강화하고·닫아도 장착은 안 바뀐다(263·105)',
    '장착 ' + r.was + ' → ' + r.now));

  /* ---- [F] 보유 0 -------------------------------------------------------- */
  const F = await ev(() => {
    const keep = JSON.stringify(S.own), keepEq = JSON.stringify(S.eqSlot);
    EQUIPS.forEach(e => { if (e.slot === 'shield') delete S.own[e.id]; });
    S.eqSlot.shield = null;
    let err = null;
    try { openWeapon(null, 'shield'); } catch (e) { err = String(e.message || e); }
    const out = { err, sel: wpnSel, cur: wpnCur() ? wpnCur().id : null,
                  best: (typeof wpnBest === 'function' && wpnBest('shield')) ? wpnBest('shield').id : null,
                  cards: document.querySelectorAll('#wpnGrid [data-wpn]').length };
    closeWeapon();
    S.own = JSON.parse(keep); S.eqSlot = JSON.parse(keepEq);
    return out;
  });
  if (F.__err) ok(false, 'F 즉사', F.__err);
  else {
    ok(F.err === null, 'F1 보유 0 부위도 예외 없이 열린다', F.err || '예외 0건');
    ok(F.best === null && F.sel === null, 'F2 보유 0 이면 «최고» 는 없다 → 종전 폴백',
      'wpnBest=' + F.best + ' · wpnSel=' + F.sel + ' · 보유 카드 ' + F.cards + '칸');
    ok(F.cur !== null, 'F3 그래도 `wpnCur()` 은 첫 칸으로 떨어져 렌더가 선다', 'cur=' + F.cur);
  }

  /* ---- [G] 06 슬롯 → 05 진입 -------------------------------------------- */
  const G = await ev(() => {
    closeWeapon();
    goTab('hero'); heroSubGo('eq');
    const n = document.querySelector('#eqCards [data-eqslot="amulet"]');
    if (!n) return { none: true };
    n.click();
    const l = EQUIPS.filter(e => e.slot === 'amulet' && has(e.id));
    return { sel: wpnSel, part: wpnPart, on: $('wpnw').classList.contains('on'),
             best: l.slice().sort((a, b) => equipVal(b) - equipVal(a))[0].id };
  });
  if (G.__err) ok(false, 'G 즉사', G.__err);
  else if (G.none) ok(false, 'G `#eqCards [data-eqslot]` 노드를 못 찾았다');
  else ok(G.on && G.part === 'amulet' && G.sel === G.best,
    'G 06 장비 슬롯 → 05 진입도 최고가 선택된다',
    'part=' + G.part + ' · wpnSel=' + G.sel + ' · 최고=' + G.best);

  /* ---- [H] 50 코스튬 ----------------------------------------------------- */
  const H = await ev(() => {
    closeWeapon();
    /* 보유 3종 · 착용 = 레벨이 «중간» 인 것 → 최고 레벨은 따로 있다 */
    const ids = AVATARS.map(a => a.id);
    const a1 = ids[0], a2 = ids[1], a3 = ids[2];
    S.avatars[a1] = S.avatars[a1] || { l: 1 };
    S.avatars[a2] = S.avatars[a2] || { l: 1 };
    S.avatars[a3] = S.avatars[a3] || { l: 1 };
    S.cosLv = S.cosLv || {};
    S.cosLv[a1] = 1; S.cosLv[a2] = 4; S.cosLv[a3] = 9;
    S.avatar = a2;                                  /* 착용 = 중간 */
    cosSel = a1;                                    /* 지난 번에 다른 것을 골라 둔 상태 */
    /* ⚠ `goTab('hero')` 는 **토글**이다 — 이미 열려 있으면 닫는다(1회차에 여기서 cosSel=null 이 나왔다).
       상태를 직접 세우고 서브탭만 갈아탄다. */
    curTab = 'hero'; heroTab = 'sk'; panelOpen = true; syncPanel();
    heroSubGo('cos');
    const selNode = document.querySelector('#bCos .sk-card.sel');
    return { sel: cosSel, want: a3, worn: S.avatar, wantWorn: a2,
             lv: { a1: cosLvOf(a1), a2: cosLvOf(a2), a3: cosLvOf(a3) },
             node: selNode ? (selNode.dataset.cosit || null) : null };
  });
  if (H.__err) ok(false, 'H 즉사', H.__err);
  else {
    ok(H.sel === H.want, 'H1 코스튬 시트를 열면 강화 레벨 최고가 선택된다',
      'cosSel=' + H.sel + ' · 최고 Lv=' + H.want + '(Lv ' + H.lv.a3 + ') · 착용=' + H.worn + '(Lv ' + H.lv.a2 + ')');
    ok(H.worn === H.wantWorn, 'H2 착용은 안 바뀐다(263 — 착용은 플레이어가 한 것만)',
      'S.avatar=' + H.worn);
    ok(H.node === H.want, 'H3 그려진 `.sel` 카드도 같은 것이다', '.sel=' + H.node);
  }

  /* ---- [I] 07·26 «선택» 축 부재(등재문 ⑤ 전제) ---------------------------- */
  const I = await ev(() => {
    const hasVar = (n) => { try { return eval('typeof ' + n) !== 'undefined'; } catch (_) { return false; } };
    renderSkill(); renderPet();
    return { skVar: hasVar('skSel'), ptVar: hasVar('petSel'), cosVar: hasVar('cosSel'),
             skSel: document.querySelectorAll('#bSk .sel').length,
             ptSel: document.querySelectorAll('#bPet .sel').length };
  });
  if (I.__err) ok(false, 'I 즉사', I.__err);
  else ok(I.skVar === false && I.ptVar === false && I.skSel === 0 && I.ptSel === 0 && I.cosVar === true,
    'I 07·26 에는 «선택» 축이 없다 — 482 는 «선택» 이 있는 두 시트(05·50)에만 걸린다',
    'skSel var=' + I.skVar + ' · petSel var=' + I.ptVar + ' · 그려진 .sel 07:' + I.skSel + ' 26:' + I.ptSel);

  /* ---- [R] 되돌림 시험 ---------------------------------------------------- */
  const R = await ev(() => {
    const out = {};
    const realBest = window.wpnBest, realCos = window.cosBest;
    /* R1·R2 — «최고를 못 찾는» 옛 상태로 되돌린다 */
    window.wpnBest = () => null;
    const l = EQUIPS.filter(e => e.slot === 'weapon' && has(e.id));
    const best = l.slice().sort((a, b) => equipVal(b) - equipVal(a))[0].id;
    openWeapon(null, 'weapon');
    out.r1sel = wpnSel; out.r1best = best;
    /* 도전자에게 재료를 부어 순위를 뒤집을 수 있게 만든다 */
    const sorted = l.slice().sort((a, b) => equipVal(b) - equipVal(a));
    const chal = sorted[1];
    let guard = 0;
    while (equipVal(chal) <= equipVal(sorted[0]) && guard++ < 400) {
      S.own[chal.id].n = fragNeed(oLv(chal.id));
      if (!canLevel(chal)) break;
      levelUp(chal);
    }
    S.own[chal.id].l = Math.max(1, oLv(chal.id) - 1);
    S.own[chal.id].n = fragNeed(oLv(chal.id));
    openWeapon(null, 'weapon');
    $('wpnBtnUp').onclick();
    out.r2sel = wpnSel;
    out.r2best = EQUIPS.filter(e => e.slot === 'weapon' && has(e.id))
      .slice().sort((a, b) => equipVal(b) - equipVal(a))[0].id;
    window.wpnBest = realBest;
    /* R3 — 코스튬 기본을 «착용 중» 으로 되돌린다 */
    window.cosBest = () => cosCur();
    cosSel = null;
    renderCos();
    out.r3sel = cosSel; out.r3worn = cosCur();
    out.r3want = AVATARS.map(a => a.id).filter(id => cosOwn(id))
      .sort((a, b) => cosLvOf(b) - cosLvOf(a))[0];
    window.cosBest = realCos;
    cosSel = null; renderCos();
    out.after = cosSel;
    return out;
  });
  if (R.__err) ok(false, 'R 즉사', R.__err);
  else {
    ok(R.r1sel !== R.r1best, 'R1 `wpnBest` 를 «항상 null» 로 되돌리면 [A] 의 자가 빨개진다',
      'wpnSel=' + R.r1sel + ' ≠ 최고 ' + R.r1best);
    ok(R.r2sel !== R.r2best, 'R2 같은 되돌림에서 [C] 의 자도 빨개진다',
      '강화 뒤 wpnSel=' + R.r2sel + ' ≠ 새 최고 ' + R.r2best);
    ok(R.r3sel === R.r3worn && R.r3sel !== R.r3want,
      'R3 `cosBest` 를 «착용 중» 으로 되돌리면 [H] 의 자가 빨개진다',
      'cosSel=' + R.r3sel + ' = 착용 중 · 최고 Lv 는 ' + R.r3want);
    ok(R.after === R.r3want, 'R4 되돌림을 풀면 곧바로 초록으로 돌아온다', 'cosSel=' + R.after);
  }

  ok(errs.length === 0, 'X1 콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await browser.close();
  const line = 'VERIFY482 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS');
  console.log('\n' + line);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
