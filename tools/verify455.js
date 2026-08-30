#!/usr/bin/env node
/* 게이트 — 작업 455 「16 행운 룰렛 — 돌리는 중에는 팝업을 못 닫는다 · 보상까지 다 받은 뒤에만 닫힘」
 *          (저장소 주인 지시 2026-08-30 — «룰렛 돌리고 결과 아직 안나왓을떄 해당 룰렛팝업 못닫게 해줘.
 *            룰렛에서 보상까지 다 받고나서 닫을수있게해»)
 *
 *   node tools/verify455.js
 *
 * 지키는 성질: **원판이 도는 동안과 보상이 날아가는 동안에는 어떤 경로로도 안 닫히고,
 *              그 둘이 끝나면 예전과 똑같이 딤 탭 하나로 닫힌다.**
 *   [A] 판정식 — 잠금은 `rouLocked()` **한 곳**이고 항은 셋(회전 · 미지급 · 지급 뒤 비행)이다.
 *       상수 둘(MIN/MAX)은 «비행이 아직 안 떴다/영영 안 끝난다» 의 앞뒤 울타리일 뿐이다.
 *   [B] 실동작 잠금 — 회전 중 **진짜 포인터 딤 탭** · `closeModal()` · `gmCloseAll()` · `gmPage()`
 *       넷 다 팝업을 못 닫는다. (등재문이 적은 `menuGo` 는 저장소에 없는 이름이라 `gmPage` 로 잰다 — §N2)
 *   [C] 해제 — 정지 + 재화 비행이 끝나면 딤 탭이 **닫는다**. 잠금은 영구가 아니다.
 *   [D] 기능 완성 규칙 — 잠긴 채 회전이 끝나면 지급은 **정확히 1회**이고 `S`·표기에 반영된다.
 *   [E] 문은 하나다 — 제품에서 `#modal` 의 `on` 을 떼는 곳이 `closeModal()` 밖에 없다(소스 스캔).
 *       이 항이 빨개지면 새 우회로가 생긴 것이고 [B] 는 그것을 못 본다.
 *   [F] 스코프 — 룰렛이 아닌 모달은 룰렛이 도는 중이어도 그대로 닫힌다(잠금이 공용 팝업을 안 오염시킨다).
 *   [G] 소프트락 없음 — 비행이 어떤 이유로 안 끝나도 `ROUL_PAY_MAX` 뒤에는 반드시 닫힌다.
 *   [R] 되돌림 시험 — 가드 한 줄을 뺀 사본에서 [B] 가 **빨개져야** 한다.
 *       (338·334 교훈 — 이 항이 없으면 «이미 참인 것을 굳힌 게이트» 다.)
 *
 * §N — 등재문에서 **재현이 고친 것 셋**(상세 `docs/review/455-룰렛닫기잠금.md` §3):
 *   N1 등재문은 껍데기를 `rl16` 이라 했지만 그 클래스는 **`add` 하는 곳이 저장소에 없다**
 *      (remove 목록·주석뿐) ⇒ 그것으로 «지금 룰렛인가» 를 물으면 판정이 영원히 거짓이다.
 *      제품에게 묻는 축(`#modal.on` + `#rouDisc`)으로 갈았고, [A5] 가 그 사실을 못박는다.
 *   N2 등재문의 `menuGo` 도 없는 이름이다.
 *   N3 처방 ①③(«rouPend 두 항이면 충분» · «fxAt 600 상수 재사용»)은 실측으로 둘 다 모자랐다 —
 *      `rouPend` 는 `giveReward` **앞**에서 −1 이 되고, 비행은 지급 뒤 **+1193ms** 까지 간다.
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «상태 → 닫힘 여부» 판정이라 비평가를 띄우지 않는다.
 * ⚠ 회전은 3.9초다. [B] 는 **진짜 회전 + 진짜 포인터**로 재고(267 [F]·verify367 [B] 와 같은 자리),
 *   나머지는 그 창 안에서 호출만 바꿔 가며 잰다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SRC = path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 60 - t.length)));
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

async function boot(browser, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify(Object.assign({ gold: 5e7, dia: 0, best: 40 }, opts.save || {}))]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(opts.url || URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openRoulette === 'function');
  await page.waitForTimeout(900);
  /* 전투 캔버스를 멈춘다 — 킬 드랍이 [D] 의 재화 계산을, `fxAt(e,'combat')` 이 비행 계측을 오염시킨다 */
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  return { ctx, page, errs };
}

/* 딤(=`#modal` 자신)이 실제로 잡히는 좌표를 **제품에게 물어서** 고른다 —
   상수로 박으면 팝업 규격이 바뀌는 날 조용히 «본문을 눌렀다» 로 바뀐다(368 처방). */
const dimPoint = page => page.evaluate(() => {
  const m = document.getElementById('modal');
  const r = m.getBoundingClientRect();
  for (let y = r.top + 8; y < r.bottom - 8; y += 6) {
    const el = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(y));
    if (el === m) return { x: Math.round(r.left + r.width / 2), y: Math.round(y) };
  }
  return null;
});
const modalOn = page => page.evaluate(() => document.getElementById('modal').classList.contains('on'));
const openRou = page => page.evaluate(() => { S.daily.spins = ROUL_TRY; S.dia = 0; uiDirty = true; renderUI(); openRoulette(); });
/* 회전이 완전히 끝나고 잠금이 풀릴 때까지 — 시간을 상수로 박지 않고 제품에게 묻는다 */
const untilFree = page => page.waitForFunction(
  () => typeof rouLocked === 'function' ? !rouLocked() : !rouSpinning, null, { timeout: 20000 });

(async () => {
  const browser = await launch(chromium);

  /* ══ [A] 판정식은 한 곳이고 항은 셋이다 ════════════════════════════════ */
  blk('[A] 판정식 — 잠금은 `rouLocked()` 한 곳');
  const b = await boot(browser);
  {
    const a = await ev(b.page, () => ({
      isFn: typeof rouLocked === 'function',
      src: String(rouLocked).replace(/\s+/g, ' '),
      min: typeof ROUL_PAY_MIN === 'number' ? ROUL_PAY_MIN : null,
      max: typeof ROUL_PAY_MAX === 'number' ? ROUL_PAY_MAX : null,
      idle: rouLocked()
    }));
    ok(!!a && a.isFn, '★ [A1] 잠금 판정은 `rouLocked()` 함수 하나다');
    ok(!!a && /rouSpinning/.test(a.src) && /rouPend/.test(a.src) && /fxFlies/.test(a.src),
       '★ [A2] 항이 셋이다 — 회전(`rouSpinning`) · 미지급(`rouPend`) · 지급 뒤 비행(`fxFlies`)',
       a ? a.src.slice(0, 140) : 'null');
    ok(!!a && a.idle === false, '[A3] 아무것도 안 돌 때는 안 잠긴다 (기본은 «닫힌다»)', 'rouLocked()=' + (a && a.idle));
    ok(!!a && a.min > 0 && a.max > a.min,
       '[A4] 울타리 상수 둘 — MIN(비행이 아직 안 뜬 공백) < MAX(안 끝나도 반드시 푸는 상한)',
       'MIN=' + (a && a.min) + ' · MAX=' + (a && a.max));
    /* §N1 — 등재문이 지목한 `rl16` 이 죽은 이름임을 게이트가 기억한다. 되살아나면 이 항이 알려 준다. */
    const srcTxt = fs.readFileSync(SRC, 'utf8');
    const adds = (srcTxt.match(/classList\.add\([^)]{0,80}rl16/g) || []).length;
    ok(adds === 0,
       '★ [A5] §N1 — `rl16` 은 여전히 «add 하는 곳이 없는» 죽은 이름이다 ⇒ 껍데기로 룰렛을 물으면 안 된다',
       'classList.add(…rl16) ' + adds + '건');
  }

  /* ══ [B] 회전 중에는 어떤 경로로도 안 닫힌다 ═══════════════════════════ */
  blk('[B] 회전 중 잠금 — 딤 탭 · closeModal · gmCloseAll · gmPage');
  {
    await openRou(b.page);
    await b.page.waitForTimeout(400);
    const pt = await dimPoint(b.page);
    ok(!!pt, '[B0] 전제 — 딤(#modal 자신)이 잡히는 좌표가 있다', pt ? pt.x + ',' + pt.y : 'null');

    await b.page.click('#rouBtn');                       /* 진짜 클릭 · 진짜 3.9초 회전 */
    await b.page.waitForTimeout(500);
    const st = await ev(b.page, () => ({ s: rouSpinning, p: rouPend, l: rouLocked() }));
    ok(!!st && st.s === true && st.l === true,
       '[B1] 전제 — 이 순간 회전 중이고 잠겨 있다',
       'rouSpinning=' + (st && st.s) + ' · rouPend=' + (st && st.p) + ' · rouLocked=' + (st && st.l));

    if (pt) await b.page.mouse.click(pt.x, pt.y);
    await b.page.waitForTimeout(100);
    ok(await modalOn(b.page) === true,
       '★ [B2] 회전 중 **진짜 포인터 딤 탭** — 안 닫힌다 (주인 지시 본문)');

    const r1 = await ev(b.page, () => closeModal());
    ok(r1 === false && await modalOn(b.page) === true,
       '★ [B3] 회전 중 `closeModal()` 직접 호출 — 안 닫히고 «안 닫았다»(false)를 돌려준다',
       'closeModal()=' + r1);

    await ev(b.page, () => gmCloseAll());
    ok(await modalOn(b.page) === true,
       '★ [B4] 회전 중 `gmCloseAll()`(길라잡이 «이동» 경로) — 안 닫힌다');

    /* ⚠ `gmPage()` 는 **별도 컨텍스트**에서 잰다 — 이 자리에서 부르면 목적 페이지(`#collw`)가
       딤 위에 열린 채 남아 [C1] 의 딤 좌표를 가린다(1회차에 [C1] 이 그것 때문에 빨갰다). */
    const bg = await boot(browser);
    await openRou(bg.page);
    await bg.page.waitForTimeout(300);
    await bg.page.click('#rouBtn');
    await bg.page.waitForTimeout(500);
    const afterPage = await ev(bg.page, () => {
      gmPage('collw', () => openColl21());
      return { on: document.getElementById('modal').classList.contains('on'), spinning: rouSpinning };
    });
    ok(!!afterPage && afterPage.on === true && afterPage.spinning === true,
       '★ [B5] §N2 — 회전 중 `gmPage()` — 안 닫히고 회전도 안 끊긴다 (등재문의 `menuGo` 는 없는 이름이라 이 자리로 잰다)',
       afterPage ? '#modal.on=' + afterPage.on + ' · rouSpinning=' + afterPage.spinning : 'null');
    await bg.ctx.close();

    /* 회전은 끊기지 않고 제 길이를 다 돈다 — 잠금이 rAF 를 건드리지 않았다는 증거 */
    await untilFree(b.page);
    ok(true, '[B6] 잠긴 채로도 회전은 제 길이를 다 돌고 스스로 풀린다 (rAF·`gone()` 를 안 건드렸다)');
  }

  /* ══ [C]·[D] 풀린 뒤 — 닫히고, 지급은 정확히 1회 ══════════════════════ */
  blk('[C][D] 해제 · 지급 정확히 1회');
  {
    const paid = await ev(b.page, () => ({
      dia: S.dia, spins: S.daily.spins,
      res: (document.getElementById('rouRes') || {}).textContent || '',
      cnt: (document.getElementById('rouCnt') || {}).textContent || '',
      pend: rouPend, locked: rouLocked()
    }));
    ok(!!paid && paid.dia > 0 && paid.spins === 4,
       '★ [D1] 잠긴 채 끝난 회전도 **정확히 1회** 지급·차감됐다 (기능 완성 규칙 — S 에 반영)',
       'S.dia=' + (paid && paid.dia) + ' · S.daily.spins=' + (paid && paid.spins));
    ok(!!paid && /획득!/.test(paid.res),
       '★ [D2] 결과 문구가 **보이는 팝업 안**에 쓰였다 (455 가 되찾은 것 — 수리 전엔 닫힌 뒤에 쓰였다)',
       '#rouRes=«' + (paid ? paid.res.trim().slice(0, 24) : '') + '»');
    ok(!!paid && paid.pend === -1 && paid.locked === false,
       '[D3] 미지급 표식도 정리되고 잠금도 풀렸다', 'rouPend=' + (paid && paid.pend) + ' · rouLocked=' + (paid && paid.locked));
    ok(!!paid && /4 \/ 5/.test(paid.cnt), '[D4] 표기(«n / 5»)도 따라왔다', '#rouCnt=«' + (paid ? paid.cnt.trim() : '') + '»');

    const pt = await dimPoint(b.page);
    if (pt) await b.page.mouse.click(pt.x, pt.y);
    await b.page.waitForTimeout(120);
    ok(await modalOn(b.page) === false,
       '★ [C1] 정지·지급·비행이 끝나면 딤 탭이 **닫는다** — 잠금은 영구가 아니다 (267 «딤 탭 = 닫기» 회귀)');

    /* 이중 지급이 없다 — 닫고 난 뒤에도 값이 안 움직인다(pagehide 안전망이 한 번 더 주지 않는다) */
    await b.page.waitForTimeout(400);
    const after = await ev(b.page, () => ({ dia: S.dia, pend: rouPend }));
    ok(!!after && after.dia === paid.dia && after.pend === -1,
       '★ [D5] 닫은 뒤에도 값이 안 움직인다 — 이중 지급 0 (181 안전망과 안 부딪힌다)',
       'dia ' + (paid && paid.dia) + ' → ' + (after && after.dia));
    ok(b.errs.length === 0, '[D6] 콘솔·페이지 에러 0', b.errs.slice(0, 2).join(' | ') || '없음');
  }

  /* ══ [E] 문은 하나다 — 소스 스캔 ═══════════════════════════════════════ */
  blk('[E] `#modal` 의 `on` 을 떼는 곳이 `closeModal()` 하나인가');
  {
    const src = fs.readFileSync(SRC, 'utf8');
    /* 주석을 걷어낸 «제품 줄» 에서만 센다 — 277 «폐기 식별자» 계열 스캔과 같은 처방 */
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
    /* ⚠ 1회차 — `remove('on'` 을 통째로 세면 **30건**이다: 팝업·페이지 스물아홉 개가 각자
       자기 `on` 을 뗀다(`$('upw')`·`$('relw')`·… 전부 `#modal` 이 아니다). 자를 «모달» 로 좁힌다.
       ⓐ 껍데기 목록을 떼는 줄이 하나뿐인가(= `closeModal()` 의 그 줄)
       ⓑ `#modal` 을 **직접 집어** `on` 을 떼는 자리가 밖에 없는가 */
    const shell = (code.match(/remove\(\s*'on',\s*'sk8',\s*'rl16',\s*'q22',\s*'ml69',\s*'at70'\s*\)/g) || []).length;
    ok(shell === 1,
       '★ [E1a] 모달 껍데기를 떼는 줄은 **1건**(= `closeModal()` 안)뿐이다',
       shell + '건');
    const direct = code.split(/[;\n]/).filter(t => /modal/.test(t) && /remove\(\s*'on'/.test(t)).length;
    ok(direct === 0,
       '★ [E1b] `#modal` 을 직접 집어 `on` 을 떼는 자리가 `closeModal()` 밖에 **0건** — 우회로가 생기면 여기가 빨개진다',
       direct + '건');
    const guard = /function closeModal\(\)\s*\{[\s\S]{0,320}?rouLocked\(\)[\s\S]{0,80}?return false/.test(code);
    ok(guard, '★ [E2] 그 한 문 안에 455 가드가 들어 있다 (`rouLocked()` → `return false`)');
  }

  /* ══ [F] 스코프 — 룰렛이 아닌 모달은 그대로 닫힌다 ═══════════════════════ */
  blk('[F] 스코프 — 잠금이 공용 팝업을 오염시키지 않는다');
  {
    const b2 = await boot(browser);
    await openRou(b2.page);
    await b2.page.waitForTimeout(300);
    await b2.page.click('#rouBtn');
    await b2.page.waitForTimeout(500);
    /* 회전 중에 **다른 팝업**을 띄운다 — `showModal` 이 본문을 갈아 끼우면 `#rouDisc` 가 사라진다 */
    const swapped = await ev(b2.page, () => {
      showModal('<h2>시험</h2><p>455 스코프 시험</p>');
      return { hasDisc: !!document.querySelector('#modal #rouDisc'), spinning: rouSpinning, locked: rouLocked() };
    });
    ok(!!swapped && swapped.hasDisc === false,
       '[F1] 전제 — 다른 팝업이 본문을 갈아 끼워 원판(`#rouDisc`)이 모달에서 사라졌다',
       swapped ? '#rouDisc=' + swapped.hasDisc + ' · rouSpinning=' + swapped.spinning : 'null');
    const closed = await ev(b2.page, () => closeModal());
    ok(closed === true && await modalOn(b2.page) === false,
       '★ [F2] 룰렛이 **아닌** 모달은 (룰렛 상태와 무관하게) 그대로 닫힌다 — 잠금 스코프가 룰렛에만 붙어 있다',
       'closeModal()=' + closed);
    /* 그래도 보상은 증발하지 않는다 — 181 의 `gone()` 이 여전히 산다 */
    await b2.page.waitForTimeout(900);
    const rw = await ev(b2.page, () => ({ dia: S.dia, pend: rouPend }));
    ok(!!rw && rw.dia > 0 && rw.pend === -1,
       '[F3] 그 경우에도 보상은 증발하지 않는다 (181 `gone()` 무수정 회귀)',
       'S.dia=' + (rw && rw.dia) + ' · rouPend=' + (rw && rw.pend));
    await b2.ctx.close();
  }

  /* ══ [G] 소프트락 없음 ═════════════════════════════════════════════════ */
  blk('[G] 소프트락 없음 — 비행이 안 끝나도 상한에서 반드시 풀린다');
  {
    const b3 = await boot(browser);
    await openRou(b3.page);
    await b3.page.waitForTimeout(300);
    /* «영영 안 끝나는 비행» 을 만든다 — `fxFlies` 에 `ui` 발 한 개를 박아 두고 시간을 흘린다.
       상한(MAX)이 없으면 팝업은 이 상태로 영원히 안 닫힌다. */
    await b3.page.click('#rouBtn');
    await untilFree(b3.page);
    const stuck = await ev(b3.page, () => {
      rouPayT = performance.now();                       /* 지급 직후로 되돌린다 */
      fxFlies.push({ ui: true, __v455: true });          /* 착지하지 않는 유령 비행 */
      return { locked: rouLocked(), max: ROUL_PAY_MAX };
    });
    ok(!!stuck && stuck.locked === true,
       '[G1] 전제 — 유령 비행 한 개만으로도 잠긴다 (판정이 실제로 `fxFlies` 를 본다)');
    await b3.page.waitForTimeout((stuck ? stuck.max : 2000) + 250);
    const freed = await ev(b3.page, () => ({ locked: rouLocked(), flies: fxFlies.filter(f => f.__v455).length }));
    ok(!!freed && freed.locked === false && freed.flies === 1,
       '★ [G2] 유령 비행이 **그대로 있는데도** 상한 뒤에는 풀린다 — 소프트락이 구조적으로 불가능하다',
       'rouLocked=' + (freed && freed.locked) + ' · 유령 비행 ' + (freed && freed.flies) + '개 잔존');
    await b3.ctx.close();
  }

  /* ══ [R] 되돌림 시험 — 가드를 뺀 사본은 [B] 가 빨개진다 ═══════════════ */
  blk('[R] 되돌림 시험 — 가드 한 줄을 뺀 사본');
  {
    const src = fs.readFileSync(SRC, 'utf8');
    const GUARD = "  if(m.classList.contains('on') && m.querySelector('#rouDisc') && rouLocked()) return false;\n";
    const rev = src.replace(GUARD, '');
    ok(rev !== src, '[R0] 전제 — 사본 편집이 실제로 먹었다 (313 교훈: 전제부터 단언한다)',
       '가드 줄 ' + (rev !== src ? '제거됨' : '못 찾음'));
    /* ⚠ 사본은 **저장소 루트**에 둔다 — index.html 이 이미지를 상대 경로로 물어 /tmp 에 두면 404 다
       (verify367 [R] 이 같은 주의를 적어 뒀다). */
    const tmp = path.resolve(__dirname, '..', '.v455-neg.html');
    fs.writeFileSync(tmp, rev);
    try {
      const b4 = await boot(browser, { url: 'file://' + tmp });
      await openRou(b4.page);
      await b4.page.waitForTimeout(400);
      const pt = await dimPoint(b4.page);
      await b4.page.click('#rouBtn');
      await b4.page.waitForTimeout(500);
      const spinning = await ev(b4.page, () => rouSpinning);
      ok(spinning === true, '[R1] 전제 — 사본에서도 회전은 똑같이 시작된다', 'rouSpinning=' + spinning);
      if (pt) await b4.page.mouse.click(pt.x, pt.y);
      await b4.page.waitForTimeout(120);
      ok(await modalOn(b4.page) === false,
         '★ [R2] 가드를 뺀 사본에서는 회전 중 딤 탭이 **닫는다** ⇒ [B2] 가 실제로 이 축을 잰다',
         '#modal.on=' + await modalOn(b4.page));
      /* 판정식(rouLocked)은 남겨 뒀는데도 닫힌다 — 잠그는 것은 «판정» 이 아니라 «그 문에 건 가드» 다 */
      const stillFn = await ev(b4.page, () => typeof rouLocked === 'function');
      ok(stillFn === true,
         '[R3] 사본에도 `rouLocked()` 는 그대로 있다 — 닫힘을 막는 것은 판정이 아니라 **`closeModal()` 의 가드**임을 가른다');
      ok(b4.errs.length === 0, '[R4] 사본 경로도 에러 0', b4.errs.slice(0, 2).join(' | ') || '없음');
      await b4.ctx.close();
    } finally {
      fs.unlinkSync(tmp);
    }
  }

  await b.ctx.close();
  await browser.close();
  console.log('\nVERIFY455 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL ' + fail + '건' : '  ✓ PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
