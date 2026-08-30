/* 작업 482 재현 프로브 — «팝업을 열면 제일 좋은 것이 선택돼 있어야 한다»
 *
 *   node tools/probe482.js
 *
 * 주인 원문: «장비 같은거 팝업 들어가면 제일 좋은거에 선택 되있는 상태로 해줘야함.
 *            혹은 일괄 강화할때도 강화후에 제일 좋은거 선택 되있는 상태로 되고
 *            장착버튼을 누르면 바로 그거로 장착될수있는식으로 되야함».
 *
 * 이 파일은 «고쳤다» 를 재는 게이트(`verify482.js`)가 아니라 **무엇이 어떻게 어긋나는가**를
 * 눈으로 보는 자리다(338 규칙 — 처방을 따르기 전에 먼저 재현한다. 338·341·464·473 은
 * 여기서 등재문 가설이 기각되거나 절반만 참으로 좁혀졌다).
 *
 * 등재문의 가설은 넷이고 각각 축을 따로 잰다:
 *   A 05 팝업을 «그냥» 열면 선택 = «지금 장착 중인 것»(제일 좋은 것이 아니다)
 *   B 카드를 눌러 들어온 경로는 그 카드가 선택된다(이건 바뀌면 안 되는 쪽)
 *   C [일괄 강화] 로 순위가 뒤집혀도 선택이 안 따라간다
 *   D 06 장비 슬롯 → 05 진입도 A 와 같은 경로다
 *   E 50 코스튬 시트의 `cosSel` 기본값
 *   F 07 스킬 · 26 펫 시트에 «선택» 상태가 실재하는가(등재문 ⑤ 의 전제)
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const PARTS = ['weapon', 'shield', 'amulet'];

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? pass++ : fail++; };

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

  /* 표본 세이브 — 부위마다 «보유 5종 · 장착 = 두 번째로 좋은 것».
     보유 5종은 등급을 흩어 골라(같은 등급 안 자리 j 도 흩는다) «등급만 보면 안 된다» 를 만든다. */
  const seed = await ev((parts) => {
    const out = {};
    parts.forEach((k) => {
      const l = EQUIPS.filter((e) => e.slot === k);
      /* 등급 0·1·2·3 에서 골라 온다 — 등급이 낮아도 티어·레벨로 뒤집히는 표본이 필요하다 */
      const pick = [l.filter(e => e.g === 0)[0], l.filter(e => e.g === 0)[4],
                    l.filter(e => e.g === 1)[2], l.filter(e => e.g === 2)[0],
                    l.filter(e => e.g === 2)[3]].filter(Boolean);
      S.own = S.own || {};
      pick.forEach((e, i) => { S.own[e.id] = { n: 0, l: 1 + i }; });
      const val = (e) => equipVal(e);
      const rank = pick.slice().sort((a, b) => val(b) - val(a));
      S.eqSlot[k] = rank[1].id;                       /* 장착 = 두 번째로 좋은 것 */
      out[k] = { own: pick.map(e => e.id), best: rank[0].id, eq: rank[1].id,
                 vals: rank.map(e => ({ id: e.id, v: +val(e).toFixed(6), lv: oLv(e.id) })) };
    });
    return out;
  }, PARTS);

  if (seed.__err) { console.log('표본 주입 실패: ' + seed.__err); process.exit(1); }

  console.log('작업 482 재현 — 05 장비 팝업 «제일 좋은 것» 선택\n');
  console.log('[표본] 부위마다 보유 5종 · 장착 = 두 번째로 좋은 것');
  PARTS.forEach((k) => {
    console.log('  ' + k + ' : 최고 ' + seed[k].best + ' (equipVal ' + seed[k].vals[0].v + ')'
      + ' · 장착 ' + seed[k].eq + ' (' + seed[k].vals[1].v + ')');
  });

  /* ---- A 그냥 열기 ------------------------------------------------------ */
  console.log('\n[A] openWeapon(null, part) — 열었을 때 선택된 것');
  const A = await ev((parts) => parts.map((k) => {
    openWeapon(null, k);
    return { k, sel: wpnSel, cur: wpnCur().id, eq: S.eqSlot[k] };
  }), PARTS);
  if (A.__err) ok(false, 'A 즉사: ' + A.__err);
  else A.forEach((r, i) => {
    const b = seed[r.k].best;
    console.log('  ' + r.k + ' : wpnSel=' + r.sel + ' · 최고=' + b + (r.sel === b ? '  (일치)' : '  ← 최고가 아니다'));
    ok(!!r.sel, r.k + ' — 축이 실측된다(선택 = ' + r.sel + (r.sel === b ? ' = 최고)' : ' ≠ 최고 ' + b + ')'));
  });

  /* ---- B 카드 지정 진입 ------------------------------------------------- */
  console.log('\n[B] openWeapon(id, part) — 카드를 눌러 들어온 경로(바뀌면 안 되는 쪽)');
  const B = await ev((parts) => parts.map((k) => {
    const l = EQUIPS.filter((e) => e.slot === k && has(e.id));
    const target = l[0];
    openWeapon(target.id, k);
    return { k, want: target.id, sel: wpnSel };
  }), PARTS);
  if (B.__err) ok(false, 'B 즉사: ' + B.__err);
  else B.forEach((r) => ok(r.sel === r.want, r.k + ' — 지정한 카드(' + r.want + ')가 선택된다'));

  /* ---- C 일괄 강화로 순위가 뒤집히는 표본 -------------------------------- */
  console.log('\n[C] [일괄 강화] — 강화가 순위를 뒤집을 때 선택이 따라가는가');
  const C = await ev((parts) => parts.map((k) => {
    const l = EQUIPS.filter((e) => e.slot === k && has(e.id));
    /* 지금 최고 바로 아래를 «강화만으로 최고» 가 되도록 재료를 붓는다 */
    const sorted = l.slice().sort((a, b) => equipVal(b) - equipVal(a));
    const top = sorted[0], chal = sorted[1];
    let guard = 0;
    while (equipVal(chal) <= equipVal(top) && guard++ < 400) {
      S.own[chal.id].n = fragNeed(oLv(chal.id));
      if (!canLevel(chal)) break;
      levelUp(chal);
    }
    S.own[chal.id].n = fragNeed(oLv(chal.id));         /* 버튼이 실제로 할 일이 남게 한다 */
    openWeapon(null, k);
    const before = wpnSel;
    $('wpnBtnUp').onclick();
    const after = wpnSel;
    const best = l.slice().sort((a, b) => equipVal(b) - equipVal(a))[0].id;
    return { k, before, after, best, chal: chal.id, top: top.id };
  }), PARTS);
  if (C.__err) ok(false, 'C 즉사: ' + C.__err);
  else C.forEach((r) => {
    console.log('  ' + r.k + ' : 강화 전 선택=' + r.before + ' → 강화 후 선택=' + r.after
      + ' · 새 최고=' + r.best + (r.after === r.best ? '  (따라감)' : '  ← 안 따라감'));
    ok(r.before !== r.best || r.after === r.best,
       r.k + ' — 축이 실측된다(강화 후 선택 ' + (r.after === r.best ? '= 새 최고)' : '≠ 새 최고 ' + r.best + ')'));
  });

  /* ---- D 06 슬롯 → 05 진입 --------------------------------------------- */
  console.log('\n[D] 06 장비 슬롯 클릭 → 05 진입');
  const D = await ev(() => {
    goTab('hero'); heroSubGo('eq');
    const n = document.querySelector('#eqCards [data-eqslot="weapon"]');
    if (!n) return { none: true };
    n.click();
    return { sel: wpnSel, part: wpnPart, on: $('wpnw').classList.contains('on') };
  });
  if (D.__err) ok(false, 'D 즉사: ' + D.__err);
  else if (D.none) ok(false, 'D — `#eqCards [data-eqslot]` 노드를 못 찾았다');
  else {
    console.log('  wpnSel=' + D.sel + ' · 최고=' + seed.weapon.best + ' · 팝업 on=' + D.on);
    ok(D.on === true, '06 → 05 진입이 실제로 열린다(선택 = ' + D.sel
       + (D.sel === seed.weapon.best ? ' = 최고)' : ' ≠ 최고 ' + seed.weapon.best + ')'));
  }

  /* ---- E 50 코스튬 cosSel 기본값 ---------------------------------------- */
  console.log('\n[E] 50 코스튬 — `cosSel` 기본값');
  const E = await ev(() => {
    /* 착용 중이 아닌 코스튬을 하나 더 갖게 만든다(레벨도 더 높게) */
    const ids = AVATARS.map(a => a.id).filter(id => id !== 'av0');
    const other = ids[0];
    S.avatars[other] = S.avatars[other] || { l: 1 };
    S.avatar = 'av0';
    cosSel = null;
    renderCos();
    return { cur: cosCur(), sel: cosSel, other,
             lvCur: typeof cosLvOf === 'function' ? cosLvOf(cosCur()) : null,
             lvOther: typeof cosLvOf === 'function' ? cosLvOf(other) : null,
             owned: AVATARS.filter(a => cosOwn(a.id)).length };
  });
  if (E.__err) ok(false, 'E 즉사: ' + E.__err);
  else {
    console.log('  착용=' + E.cur + '(Lv ' + E.lvCur + ') · cosSel=' + E.sel
      + ' · 보유 ' + E.owned + '종 · 다른 보유 ' + E.other + '(Lv ' + E.lvOther + ')');
    ok(!!E.sel, '코스튬 기본 선택이 실측된다(cosSel = ' + E.sel
       + (E.sel === E.cur ? ' = 착용 중)' : ' ≠ 착용 중 ' + E.cur + ')'));
  }

  /* ---- F 07·26 에 «선택» 상태가 실재하는가 ------------------------------ */
  console.log('\n[F] 07 스킬 · 26 펫 — «선택» 상태가 실재하는가(등재문 ⑤ 의 전제)');
  const F = await ev(() => {
    const out = {};
    renderSkill(); renderPet(); renderCos();
    /* 스크립트 최상위 `let` 은 window 속성이 아니다 — 맨 식별자로 물어야 한다(1회차 오독) */
    const hasVar = (n) => { try { return eval('typeof ' + n) !== 'undefined'; } catch (_) { return false; } };
    out.skSelVar = hasVar('skSel');
    out.ptSelVar = hasVar('petSel');
    out.cosSelVar = hasVar('cosSel');
    out.skSelNode = document.querySelectorAll('#bSk .sel').length;
    out.ptSelNode = document.querySelectorAll('#bPet .sel').length;
    out.cosSelNode = document.querySelectorAll('#bCos .sel').length;
    /* 시트 하단 버튼이 «선택 카드» 를 대상으로 하는가 */
    out.skBtns = [...document.querySelectorAll('#bSk .sk-btn')].map(b => b.textContent.trim());
    out.ptBtns = [...document.querySelectorAll('#bPet .sk-btn')].map(b => b.textContent.trim());
    out.cosBtns = [...document.querySelectorAll('#bCos .sk-btn')].map(b => b.textContent.trim());
    return out;
  });
  if (F.__err) ok(false, 'F 즉사: ' + F.__err);
  else {
    console.log('  전역 선택 변수 — skSel:' + F.skSelVar + ' · petSel:' + F.ptSelVar + ' · cosSel:' + F.cosSelVar);
    console.log('  그려진 `.sel` 노드 — 07:' + F.skSelNode + ' · 26:' + F.ptSelNode + ' · 50:' + F.cosSelNode);
    console.log('  하단 버튼 — 07:[' + F.skBtns.join(', ') + '] · 26:[' + F.ptBtns.join(', ')
      + '] · 50:[' + F.cosBtns.join(', ') + ']');
    ok(F.cosSelVar === true, '50 코스튬에는 «선택»(cosSel)이 있다');
    ok(F.skSelVar === false && F.ptSelVar === false,
       '07·26 에는 «선택» 상태가 없다 — 카드는 곧바로 08 상세를 연다');
  }

  console.log('\n콘솔 에러 ' + errs.length + '건' + (errs.length ? ' : ' + errs.slice(0, 3).join(' | ') : ''));
  console.log('\nPROBE482 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
