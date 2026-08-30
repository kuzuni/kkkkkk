#!/usr/bin/env node
/* 게이트 — 작업 464 「죽은 껍데기 클래스 `rl16` 을 다섯 `remove()` 목록에서 걷어낸다」
 *          (2026-08-30 등재 — 455 재현 곁다리 «버그(죽은 식별자)»)
 *
 *   node tools/verify464.js
 *
 * 지키는 성질: **`rl16` 은 제품에서 사라졌고, 살아 있는 껍데기 넷은 한 칸도 안 다쳤다.**
 *   [A] 폐기 식별자 — 주석을 걷어낸 «제품 줄» 에 `rl16` **0건**(277 계열 스캔).
 *       ⚠ 이름이 되살아나려면 **`add` 하는 곳부터** 만들어야 한다 — 그 순서를 [A3] 이 못박는다.
 *   [B] 무르게 풀지 않았다 — 다섯 자리의 `remove()` 목록이 **rl16 만 빠진 그대로**다.
 *       (목록을 통째로 줄이거나 살아 있는 이름을 같이 흘리면 여기가 빨개진다.)
 *   [C] 실동작 — 껍데기 4종이 열릴 때 붙고 `closeModal()` 이 전부 뗀다. 룰렛은 껍데기 없이 열린다.
 *   [D] 그림 Δ0 — 껍데기별 `.mbox` 상자가 **수리 전 사본과 소수점까지 같다**.
 *   [R] 되돌림 시험 — `rl16` 을 다섯 목록에 **도로 끼운 사본**에서 [A] 가 빨개진다.
 *       (334·338 교훈 — 이 절이 없으면 «이미 참인 것을 굳힌 게이트» 다.)
 *       같은 사본이 [D] 의 «Δ0px» 를 재는 기준이기도 하다 — 되돌림 사본이 곧 «수리 전 트리» 다.
 *
 * ⚑ 재현 근거는 `tools/probe464.js` — `add` 0건 · `.rl16` CSS 규칙 **0/2650** ·
 *   열린 모달에 손으로 붙였다 떼도 bbox **Δ0.00px**(= 다섯 목록의 `remove` 는 이미 no-op 이었다).
 *
 * [3]-(가) 기계적 검증: 레퍼런스 대조가 아니라 «식별자·상자» 판정이라 비평가를 띄우지 않는다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 껍데기 — [클래스, 여는 코드, 화면] · 16 룰렛은 껍데기 override 가 없어 대조군이다(464 가 그 이름을 지웠다) */
const SHELLS = [
  ['ml69', 'openMail()', '69 우편함'],
  ['q22', 'openQuest()', '22 퀘스트'],
  ['at70', 'openAttend()', '70 출석'],
  ['sk8', 'showSkillDetail(Object.keys(SK)[0])', '08 스킬 세부'],
];

async function boot(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 1e5, best: 40 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof closeModal === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  return { ctx, page, errs };
}

const run = (page, src) => ev(page, s => { try { (0, eval)(s); } catch (e) { return { __err: String(e.message || e) }; } return 1; }, src);

/* 껍데기별 `.mbox` 상자를 한 트리에서 전부 잰다 — [D] 가 두 트리의 이 표를 맞대 본다.
   ⚠ 1회차 함정 — `getBoundingClientRect` 만 보면 **60 쥬시 열림 연출(scale)** 이 섞여 두 트리가
     서로 다른 프레임에서 찍힌다(실측 q22 902.69×1504.81 ↔ 898×1497 = 연출 0.5% 지점).
     ⇒ ① 잣대는 **레이아웃 상자**(offset* — transform 무관, verify345 가 쓰는 축)로 잡고,
        ② 그려진 상자는 «두 표본이 같아질 때까지» 기다려(연출 종료) 참고로만 찍는다. */
async function boxes(page) {
  const out = {};
  const snap = () => ev(page, () => {
    const m = document.getElementById('modal'), b = m.querySelector('.mbox');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { cls: [...m.classList].filter(c => !c.startsWith('jz-')).sort().join(' '),
      lx: b.offsetLeft, ly: b.offsetTop, lw: b.offsetWidth, lh: b.offsetHeight,
      x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
  });
  for (const [cls, open] of SHELLS) {
    await run(page, 'closeModal()');
    await page.waitForTimeout(160);
    await run(page, open);
    let cur = null, prev = null;
    for (let i = 0; i < 20; i++) {                       /* 연출이 멎을 때까지 — 최대 2.4초 */
      await page.waitForTimeout(120);
      prev = cur; cur = await snap();
      if (prev && cur && prev.w === cur.w && prev.h === cur.h && prev.x === cur.x && prev.y === cur.y) break;
    }
    out[cls] = cur;
  }
  await run(page, 'closeModal()');
  await page.waitForTimeout(160);
  return out;
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');       /* 277 계열 — 주석을 걷어낸 «제품 줄» */

  blk('[A] 폐기 식별자 — 제품 줄에 `rl16` 이 없다');
  {
    const hits = (code.match(/rl16/g) || []).length;
    ok(hits === 0, '★ [A1] 주석을 걷어낸 제품 줄에 `rl16` **0건** (277 «폐기 식별자» 스캔)', hits + '건');
    const adds = (code.match(/classList\.add\([^)]{0,120}rl16/g) || []).length;
    ok(adds === 0, '★ [A2] `classList.add(…rl16)` **0건** — 켜는 곳이 없는 이름은 다시 목록에 넣지 않는다', adds + '건');
    const removes = (code.match(/remove\([^)]{0,140}rl16/g) || []).length;
    ok(removes === 0, '[A3] `remove(…rl16)` **0건** (수리 전 5건) — 되살리려면 `add` 를 **먼저** 만들 것', removes + '건');
    const css = (code.match(/\.rl16[^a-zA-Z0-9_-]/g) || []).length;
    ok(css === 0, '[A4] `.rl16` 를 쓰는 CSS 선택자 0건 — 이름이 나르는 규격이 애초에 없었다', css + '건');
    /* 문서에는 «죽은 이름이었다» 는 기록이 남아 있어야 한다(333 — 자리를 비우지 않는다) */
    ok(/rl16/.test(src), '[A5] 주석·기록에는 남긴다 — 다음 세션이 «룰렛 전용 껍데기가 있다» 고 다시 읽지 않도록',
      (src.match(/rl16/g) || []).length + '건(주석)');
  }

  blk('[B] 무르게 풀지 않았다 — 살아 있는 넷은 그대로다');
  {
    /* ⚑ 465 이관 — 이 절은 원래 «다섯 자리에 흩어진 remove 목록이 rl16 만 빠진 그대로인가» 를
       자리마다 물었다. 465 가 그 다섯 목록을 **선언 한 줄 + 함수 하나**(`MODAL_SHELLS`·`modalShell()`)
       로 모았으므로, 같은 뜻(«살아 있는 넷은 한 칸도 안 다쳤고 목록이 통째로 사라지지도 않았다»)을
       **새 모양 위에서** 묻는다. 자리를 비우지 않는 이관이다(333 처방 · LESSONS 328). */
    const decl = /const\s+MODAL_SHELLS\s*=\s*\[([^\]]*)\]/.exec(code);
    ok(!!decl, '★ [B1] 껍데기 목록은 선언 한 줄이다 — `const MODAL_SHELLS = […]`', decl ? decl[0] : '없음');
    const live = ['sk8', 'q22', 'ml69', 'at70'];
    const inDecl = decl ? live.filter(c => decl[1].includes("'" + c + "'")) : [];
    ok(inDecl.length === live.length,
      '★ [B2] 살아 있는 껍데기 **넷이 전부** 그 목록에 있다(464 가 지운 것은 rl16 하나뿐)',
      inDecl.join(',') + ' — ' + inDecl.length + '/' + live.length + '종');
    ok(!!decl && !/rl16/.test(decl[1]),
      '★ [B3] 그 목록에 `rl16` 이 **없다** — 이름이 목록으로 모였다고 죽은 이름이 따라 들어오지 않았다',
      decl ? (/rl16/.test(decl[1]) ? '있다' : '없다') : 'n/a');
    /* 목록을 실제로 읽는 자리 — 여기가 0 이면 «선언만 있고 아무도 안 쓴다» 가 된다 */
    const uses = (code.match(/MODAL_SHELLS/g) || []).length;
    ok(uses >= 2, '★ [B4] 그 목록을 **읽는 자리**가 있다(선언 + 사용) — 목록이 장식이 아니다', uses + '건');
    /* ⚠ `remove('on'` 을 통째로 세면 34건이다 — 오버레이 스물아홉 개가 각자 자기 `on` 을 뗀다
       (verify455 [E] 가 같은 함정을 적어 뒀다). 465 뒤로 «껍데기를 떼는 줄» 은 `modalShell()` 안 하나다. */
    const scattered = (code.match(/remove\([^)]{0,140}'sk8'/g) || []).length;
    ok(scattered === 0,
      '[B5] 껍데기 이름을 **직접** 떼는 자리는 0곳이다(465 — 수리 전 5곳에 흩어져 있었고 서로 비대칭이었다)',
      scattered + '곳');
    const fn = /function\s+modalShell\s*\([^)]*\)\s*\{[\s\S]{0,400}?\}/.exec(code);
    ok(!!fn && /classList\.remove\(\s*\.\.\.MODAL_SHELLS\s*\)/.test(fn[0]),
      '[B6] 떼는 일은 `modalShell()` 이 목록을 펼쳐서 한다(하드코딩 0)', fn ? '있다' : '없다');
  }

  const browser = await launch(chromium);
  const b = await boot(browser, 'file://' + SRC);

  blk('[C] 실동작 — 붙고, 닫으면 떨어진다');
  {
    for (const [cls, open, name] of SHELLS) {
      await run(b.page, 'closeModal()');
      await b.page.waitForTimeout(140);
      await run(b.page, open);
      await b.page.waitForTimeout(280);
      const on = await ev(b.page, () => [...document.getElementById('modal').classList].filter(c => !c.startsWith('jz-')).join(' '));
      ok(String(on || '').split(' ').includes(cls) && String(on).split(' ').includes('on'),
        '[C-' + cls + '] ' + name + ' — 열면 껍데기 `' + cls + '` + `on` 이 붙는다', 'class="' + on + '"');
    }
    await run(b.page, 'closeModal()');
    await b.page.waitForTimeout(300);
    const off = await ev(b.page, () => [...document.getElementById('modal').classList].filter(c => !c.startsWith('jz-')).join(' '));
    ok(!/\b(on|sk8|q22|ml69|at70)\b/.test(String(off || '')),
      '★ [C-close] `closeModal()` 이 가시성 스위치와 껍데기 넷을 전부 뗀다 (464 가 목록을 안 망가뜨렸다)',
      'class="' + off + '"');

    await run(b.page, 'openRoulette()');
    await b.page.waitForTimeout(280);
    const rou = await ev(b.page, () => [...document.getElementById('modal').classList].filter(c => !c.startsWith('jz-')).join(' '));
    ok(String(rou || '').split(' ').includes('on') && !/rl16|sk8|q22|ml69|at70/.test(String(rou || '')),
      '★ [C-rou] 16 룰렛은 **껍데기 없이** A5 기본 규격으로 열린다 (이 화면이 그 이름을 안 쓴다는 실물 증거)',
      'class="' + rou + '"');
    await run(b.page, 'closeModal()');
    ok(b.errs.length === 0, '[C-err] 콘솔·페이지 에러 0', b.errs.slice(0, 2).join(' | ') || '없음');
  }

  const now = await boxes(b.page);

  blk('[R] 되돌림 시험 — `rl16` 을 도로 끼운 사본 (= 수리 전 트리)');
  {
    /* ⚑ 465 이관 — 되돌릴 자리도 «흩어진 다섯 목록» 에서 **선언 한 줄**로 옮겨졌다.
       뜻은 그대로다: 죽은 이름을 도로 끼운 사본에서 [A] 가 빨개지는가. */
    let rev = src.replace(/const\s+MODAL_SHELLS\s*=\s*\[\s*'sk8'/, "const MODAL_SHELLS = ['rl16', 'sk8'");
    const revCode = rev.replace(/\/\*[\s\S]*?\*\//g, '');
    const revHits = (revCode.match(/rl16/g) || []).length;
    ok(revHits > 0 && rev !== src, '[R0] 전제 — 사본 편집이 실제로 먹었다 (313 교훈: 전제부터 단언한다)', '제품 줄 rl16 ' + revHits + '건');
    ok(revHits > 0 && (code.match(/rl16/g) || []).length === 0,
      '★ [R1] 사본에서는 [A1]·[B3] 이 **빨개진다** ⇒ [A] 는 이미 참인 것을 굳힌 항이 아니다', '사본 ' + revHits + '건 ↔ 현재 0건');

    /* ⚠ 사본은 **저장소 루트**에 둔다 — index.html 이 자산을 상대 경로로 물어 /tmp 에 두면 404 다(verify455 [R] 주의) */
    const tmp = path.resolve(__dirname, '..', '.v464-neg.html');
    fs.writeFileSync(tmp, rev);
    try {
      const b2 = await boot(browser, 'file://' + tmp);
      const before = await boxes(b2.page);
      let dmax = 0, worst = '';
      for (const [cls] of SHELLS) {
        const a = before[cls], c = now[cls];
        if (!a || !c) { ok(false, '[D-' + cls + '] 상자를 못 쟀다', String(!!a) + '/' + String(!!c)); continue; }
        const d = Math.max(Math.abs(a.lx - c.lx), Math.abs(a.ly - c.ly), Math.abs(a.lw - c.lw), Math.abs(a.lh - c.lh));
        const dp = Math.max(Math.abs(a.x - c.x), Math.abs(a.y - c.y), Math.abs(a.w - c.w), Math.abs(a.h - c.h));
        if (d > dmax) { dmax = d; worst = cls; }
        ok(d === 0, '★ [D-' + cls + '] 수리 전 사본과 `.mbox` **레이아웃 상자**가 정수까지 같다 (Δ0px)',
          'now ' + c.lw + '×' + c.lh + ' @' + c.lx + ',' + c.ly + ' ↔ before ' + a.lw + '×' + a.lh + ' @' + a.lx + ',' + a.ly
          + ' · 그려진 상자 Δ' + dp.toFixed(2) + 'px');
      }
      ok(dmax === 0, '★ [D-max] 껍데기 4종 통틀어 최대 Δ **0.00px** — 464 는 그림을 한 픽셀도 안 바꿨다',
        'Δmax=' + dmax + (worst ? 'px (' + worst + ')' : 'px'));
      ok(b2.errs.length === 0, '[R2] 사본 경로도 에러 0', b2.errs.slice(0, 2).join(' | ') || '없음');
      await b2.ctx.close();
    } finally {
      fs.unlinkSync(tmp);
    }
  }

  await browser.close();
  console.log('\nVERIFY464 ' + (fail ? 'FAIL — ' + fail + '건' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
