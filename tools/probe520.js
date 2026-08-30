/* 작업 520 재현 프로브 — «코스튬 쪽 + − 표시 없애기» (저장소 주인 지시)
 *
 *   node tools/probe520.js
 *
 * 338·341·350·372·464·498 규칙 — 처방을 따르기 전에 **등재문의 주장이 참인지 제품에게 직접 묻는다.**
 *
 * 주인 원문은 «그 코스튬쪽에 + − 표시 없애셈» 한 줄이고 **어느 «+»·«−» 인지 지목하지 않았다.**
 * 등재문(PROGRESS 520)의 사전 조사는 «코드만 읽은» 것이라 네 자리를 후보로 적어 뒀다:
 *   ① 상세 팝업 [강화] 꾹 누르기 반복 «+1» 플로터(`bindUpHold` → `hbBeat`)
 *   ② 첫 발 `fxUpOk(…, 'Lv. n')` 델타
 *   ③ 카드 격자 [강화](`[data-cosup]`) 의 같은 `fxUpOk`
 *   ④ 효과 줄 «공격 +n% · 체력 +n% · 골드 +n%»(`cosEffTxt`)
 * 그리고 «−» 는 셋 중 하나라고 적었다 — ⓐ 델타 텍스트 ⓑ «·»/진행바가 «−» 로 읽힌 것 ⓒ 못 찾은 «−».
 *
 * 이 자가 묻는 것 — **찍힌 글자**로 전수한다(코드 grep 이 아니라 그려진 텍스트 노드):
 *   [1] 50 코스튬 시트(`#bCos`)에 실제로 그려진 «+»·«−» 전수 (자리·문자열·좌표)
 *   [2] 상세 팝업(`#mbox`) — 보유 칸 / 미보유 칸 각각
 *   [3] 시트 [강화] 1회 · [4] 상세 팝업 [강화] 꾹 누르기 — 연출 레이어(`#fxl`)에 뜨는 글자
 *   [5] 대조 — 같은 «+» 가 다른 시트(장비·스킬·펫)에도 있는가 (주인이 «코스튬쪽» 이라고만 한 것의 뜻)
 *   [6] 콘솔 에러 0
 *
 * ⚑ 재현 기록은 수리 전·후 **같은 뜻**이어야 한다(probe452·455·464·498 규약).
 *   구조 축([5] 대조 · [6])은 수리 전·후 같은 답이고, 갈리는 것은 [1]~[4] 의 **건수**뿐이라 `info` 로 찍는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 페이지 안에 심는 «찍힌 글자» 스캐너 — 텍스트 노드 단위로 걷고, 안 보이는 노드는 뺀다.
   부호는 셋으로 가른다: PLUS(+ ＋) · MINUS(− ﹣ －) · HYPHEN(- 이되 숫자 사이일 때만 = «−» 로 읽힌다). */
const SCANNER = () => {
  window.__scan520 = (sel) => {
    const roots = Array.from(document.querySelectorAll(sel));
    const out = [];
    const vis = el => {
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      }
      const r = el.getBoundingClientRect();
      return r.width >= 1 && r.height >= 1;
    };
    const pathOf = (el, root) => {
      const p = [];
      for (let e = el; e && e !== root.parentElement; e = e.parentElement) {
        let s = e.tagName.toLowerCase();
        if (e.id) s += '#' + e.id;
        if (e.classList && e.classList.length) s += '.' + Array.from(e.classList).join('.');
        p.unshift(s);
        if (p.length >= 3) break;
      }
      return p.join('>');
    };
    roots.forEach(root => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        const t = n.nodeValue;
        if (!t || !t.trim()) continue;
        const plus = (t.match(/[+＋]/g) || []).length;
        const minus = (t.match(/[−﹣－]/g) || []).length;
        const hyph = (t.match(/\d\s*-\s*\d/g) || []).length;
        /* 「가로 막대」 — 진짜 «−» 는 아니지만 화면에서는 «−» 로 읽힐 수 있는 글리프
           (— em dash · – en dash · ― horizontal bar · ‐ hyphen). 부호와 **따로** 센다. */
        const dash = (t.match(/[—–―‐]/g) || []).length;
        if (!plus && !minus && !hyph && !dash) continue;
        const el = n.parentElement;
        if (!el || !vis(el)) continue;
        const r = el.getBoundingClientRect();
        out.push({ txt: t.trim().slice(0, 48), plus, minus, hyph, dash,
                   path: pathOf(el, root), x: Math.round(r.x), y: Math.round(r.y) });
      }
    });
    return out;
  };
};

const show = rows => {
  if (!rows || !rows.length) { info('   (없음)'); return; }
  rows.forEach(r => info('   «' + r.txt + '»',
    '+' + r.plus + ' −' + (r.minus + r.hyph) + ' 막대' + (r.dash || 0)
    + ' · ' + r.path + ' @(' + r.x + ',' + r.y + ')'));
};
const nPlus = rows => (rows || []).reduce((n, r) => n + r.plus, 0);
const nMinus = rows => (rows || []).reduce((n, r) => n + r.minus + r.hyph, 0);
const nDash = rows => (rows || []).reduce((n, r) => n + (r.dash || 0), 0);

async function boot() {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof showCosDetail === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(SCANNER);
  /* 코스튬을 몇 개 쥐어 준다 — 강화가 실제로 되는 상태여야 ①②③ 이 그려진다 */
  await page.evaluate(() => {
    window.step = () => {};
    S.avatars = S.avatars || {};
    AVATARS.slice(0, 4).forEach(a => { S.avatars[a.id] = 1; });
    S.cosLv = S.cosLv || {};
    AVATARS.slice(0, 4).forEach((a, i) => { S.cosLv[a.id] = 10 + i; });
    S.stone = 5e7; S.dia = 5e7; S.gold = 1e12; S.rank = 3;
    save();
  });
  return { browser, page, errs };
}

const openCos = async page => {
  await page.click('.tab[data-t="hero"]', { timeout: 4000, force: true }).catch(() => {});
  await page.waitForTimeout(350);
  await page.evaluate(() => { const e = document.querySelector('#eqTabs [data-eqtab="cos"]'); if (e) e.click(); });
  await page.waitForTimeout(450);
};

(async () => {
  const { browser, page, errs } = await boot();

  /* ------------------------------------------------------------------ */
  blk('[1] 50 코스튬 시트(#bCos) — 찍힌 «+»·«−» 전수');
  await openCos(page);
  const sheet = await ev(page, () => window.__scan520('#bCos'));
  show(sheet);
  info('[1-a] 시트 «+» 개수', nPlus(sheet) + '개 · «−» ' + nMinus(sheet) + '개');
  ok(Array.isArray(sheet), '[1-b] 시트를 실제로 열고 읽었다', '텍스트 노드 ' + (sheet ? sheet.length : '?') + '자리');
  /* ⚑ 주인은 «컨테이너» 가 아니라 «화면» 을 본다 — 시트가 열린 채 프레임 전체를 한 번 더 훑는다.
     코스튬 밖(HUD·탭바·배너)에 «+»·«−» 가 있으면 그것도 «코스튬 화면에서 보이는 부호» 다. */
  const frame = await ev(page, () => window.__scan520('#app'));
  const inSheet = new Set((sheet || []).map(r => r.txt + '@' + r.x + ',' + r.y));
  const outside = (frame || []).filter(r => !inSheet.has(r.txt + '@' + r.x + ',' + r.y));
  info('[1-c] 프레임 전체(#app) — 코스튬 시트가 열린 화면의 부호 전수',
       '«+» ' + nPlus(frame) + '개 · «−» ' + nMinus(frame) + '개');
  info('[1-d] 그중 시트 «밖»(HUD·탭바·배너 …)', outside.length + '자리');
  show(outside);

  /* ------------------------------------------------------------------ */
  blk('[2] 상세 팝업(#mbox) — 보유 칸 / 미보유 칸');
  const own = await ev(page, () => {
    const id = AVATARS.find(a => cosOwn(a.id)).id;
    closeModal(); showCosDetail(id);
    return { id, rows: window.__scan520('#mbox') };
  });
  info('보유 칸 = ' + (own && own.id));
  show(own && own.rows);
  info('[2-a] 보유 칸 «+»', nPlus(own && own.rows) + '개 · «−» ' + nMinus(own && own.rows) + '개');

  const un = await ev(page, () => {
    const a = AVATARS.find(x => !cosOwn(x.id));
    closeModal(); showCosDetail(a.id);
    return { id: a.id, rows: window.__scan520('#mbox') };
  });
  info('미보유 칸 = ' + (un && un.id));
  show(un && un.rows);
  info('[2-b] 미보유 칸 «+»', nPlus(un && un.rows) + '개 · «−» ' + nMinus(un && un.rows) + '개');

  /* 269 — 코스튬 화면의 세 번째 글자판: 시트 헤더 [?] 도움말 팝업. «코스튬쪽» 에 든다. */
  const help = await ev(page, () => { closeModal(); cosHelp(); return window.__scan520('#pop, #popw, #mbody, .mbody'); });
  info('[2-c] [?] 도움말 팝업(`cosHelp`)');
  show(help);
  info('[2-d] 도움말 «+»', nPlus(help) + '개 · «−» ' + nMinus(help) + '개 · 「가로 막대」 ' + nDash(help) + '개');

  /* ------------------------------------------------------------------ */
  blk('[3] 시트 [강화] 1회 — 연출 레이어(#fxl·#fxlc)에 뜨는 글자');
  await ev(page, () => closeModal());
  await openCos(page);
  const up1 = await ev(page, () => {
    const lv0 = cosLvOf(cosSel);
    const b = document.querySelector('#bCos [data-cosup]');
    if (b) b.click();
    return { id: cosSel, lv0 };
  });
  await page.waitForTimeout(180);
  const fx1 = await ev(page, id => ({ rows: window.__scan520('#fxl, #fxlc'), lv1: cosLvOf(id) }), up1 && up1.id);
  show(fx1 && fx1.rows);
  ok(!!(fx1 && up1 && fx1.lv1 > up1.lv0),
     '[3-a] 시트 [강화] 가 **실제로** 올랐다 — 연출 0건이 «안 눌렀다» 가 아님을 못박는다',
     up1 ? up1.id + ' Lv ' + up1.lv0 + ' → ' + (fx1 ? fx1.lv1 : '?') : '');
  info('[3-b] 시트 강화 1회 연출 «+»', nPlus(fx1 && fx1.rows) + '개 · «−» ' + nMinus(fx1 && fx1.rows) + '개'
     + ' (`fxUpOk` 델타 문구는 «Lv. n» — 부호가 없다)');

  /* ------------------------------------------------------------------ */
  blk('[4] 상세 팝업 [강화] 꾹 누르기 — 회당 맥박 플로터');
  const hold = await ev(page, async () => {
    closeModal();
    const id = AVATARS.find(a => cosOwn(a.id)).id;
    showCosDetail(id);
    const b = document.getElementById('mLv');
    if (!b) return { err: 'mLv 없음' };
    const lv0 = cosLvOf(id);
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1000));
    const rows = window.__scan520('#fxl, #fxlc');
    const lv1 = cosLvOf(id);
    dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return { rows, lv0, lv1, beatSel: '#mbox .sk-lv',
             beatTxt: (document.querySelector('#mbox .sk-lv') || {}).textContent };
  });
  if (hold && hold.rows) {
    show(hold.rows);
    info('[4-a] 꾹 누르기 1초 — 레벨', hold.lv0 + ' → ' + hold.lv1);
    info('[4-b] 플로터 «+»', nPlus(hold.rows) + '개 · «−» ' + nMinus(hold.rows) + '개');
    info('[4-c] 맥박 호스트(`bindUpHold` 기본값)', hold.beatSel + ' = «' + String(hold.beatTxt).trim() + '»'
      + '  ⚠ 코스튬은 레벨이 `.sk-gr` 에 앉는다(194) — 기본 호스트는 «보유/착용 중» 알약이다');
    ok(hold.lv1 > hold.lv0, '[4-d] 꾹 누르기가 실제로 반복 강화한다(플로터가 유령이 아니다)',
       '+' + (hold.lv1 - hold.lv0) + 'Lv');
  }

  /* ------------------------------------------------------------------ */
  blk('[5] 대조 — 같은 «+» 가 다른 시트에도 있는가 (주인이 «코스튬쪽» 이라고만 한 것의 뜻)');
  const others = {};
  for (const k of ['eq', 'sk', 'pet']) {
    await ev(page, () => closeModal());
    await page.click('.tab[data-t="hero"]', { timeout: 4000, force: true }).catch(() => {});
    await page.waitForTimeout(300);
    await ev(page, tab => { const e = document.querySelector('#eqTabs [data-eqtab="' + tab + '"]'); if (e) e.click(); }, k);
    await page.waitForTimeout(450);
    const sel = k === 'eq' ? '#eqCards, #bEq' : k === 'sk' ? '#bSk' : '#bPet';
    others[k] = await ev(page, s => window.__scan520(s), sel);
    info('[5-' + k + '] ' + sel, '«+» ' + nPlus(others[k]) + '개 · «−» ' + nMinus(others[k]) + '개'
      + (others[k] && others[k].length ? ' — ' + others[k].slice(0, 3).map(r => '«' + r.txt + '»').join(' ') : ''));
  }
  ok(true, '[5-a] 대조는 판정하지 않는다 — 범위(«코스튬쪽»)를 확정하기 위한 자리다',
     '형제 시트 합계 «+» ' + ['eq', 'sk', 'pet'].reduce((n, k) => n + nPlus(others[k]), 0) + '개');

  /* ------------------------------------------------------------------ */
  blk('[6] 콘솔');
  ok(errs.length === 0, '[6-a] 콘솔 에러 0건', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nPROBE520 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
