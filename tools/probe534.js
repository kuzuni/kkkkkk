#!/usr/bin/env node
/* 작업 534 — `verify41.js` 게이트 부패 수리의 **되돌림 시험**(§R).
 *
 *   node tools/probe534.js
 *
 * 534 는 제품을 0줄 고치고 자만 고쳤다. 그런 수리는 언제나 «무르게 푼 것 아니냐» 를 묻게 되므로
 * (117·368 처방), 고친 세 항목이 **결함 앞에서는 여전히 빨간지**를 사본으로 직접 확인한다.
 * 사본은 `index.html` 을 문자열로 갈아 임시 파일에 떨구고 그 파일을 연다 — 원본은 안 건드린다.
 *
 *   [A] 표기 축 — `renderPcb()` 를 죽인 사본에서, 바가 상태를 «따라잡을 때까지(≤2s)» 를 물어도
 *       끝내 안 맞는다. (= 폴링으로 바꾼 것이 «아무거나 통과» 가 아니다)
 *   [B] 표기 규약 축 — 골드를 `fmt`(콤마)로 그리는 사본에서 «150·188 규약» 항이 빨개진다.
 *       (= 자를 `fmtCur` 디스패처에 맡긴 뒤에도 규약이 뒤집히면 잡힌다)
 *   [C] 기하 축 — 알약 펄스(`fx-punch`)를 **영구**로 건 사본에서 «펄스 없는 프레임 기다리기» 가
 *       2초를 다 쓰고도 부푼 값(≈×1.17)을 그대로 들고 나온다. (= 기다리기가 결함을 안 가린다)
 *   [E] 픽셀 회귀 축 — [3] 을 «얼린» 것이 결함을 가리지는 않는가(같은 파일 0px · 실제 이동은 잡힘).
 *   [D] 이름 축 — 제품에 `openRelicPage` 는 0건이고 `openRelw` 가 실재한다(130·133 과 같은 확인).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { py } = require('./pydep937');   // 937 — 파이썬 자가 «없음» 이면 «한 줄 + 코드 2»

const SRC = path.resolve(__dirname, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

function variant(tag, edit) {
  const cur = fs.readFileSync(SRC, 'utf8');
  const out = edit(cur);
  const p = path.join(os.tmpdir(), `probe534.${tag}.html`);
  fs.writeFileSync(p, out);
  return { file: p, changed: out !== cur };
}

async function openDun(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + file);
  await page.waitForTimeout(900);
  await page.evaluate(() => openDungeon());
  await page.waitForTimeout(500);
  return { ctx, page };
}

/* verify41 [1] 과 **같은 자**(같은 폴링·같은 예상식)를 여기서도 쓴다 — 자가 다르면 시험이 아니다 */
async function settleGold(page) {
  for (let i = 0; i < 20; i++) {
    const r = await page.evaluate(() => ({
      bar: document.getElementById('dunw').querySelector('.pcb-g>b').textContent,
      exp: fmtCur('gold', S.gold),
    }));
    if (r.bar === r.exp) return { ...r, tries: i + 1 };
    await page.waitForTimeout(100);
  }
  return { ...(await page.evaluate(() => ({
    bar: document.getElementById('dunw').querySelector('.pcb-g>b').textContent,
    exp: fmtCur('gold', S.gold),
  }))), tries: 20 };
}

(async () => {
  const browser = await launch(chromium);

  /* ---------- [A] 표기 축 — renderPcb 정지 ---------- */
  {
    const v = variant('nopcb', (s) => s.replace('function renderPcb(){', 'function renderPcb(){ return;'));
    ok(v.changed, '[A0] 사본 생성 — renderPcb() 를 즉시 return 으로');
    const { ctx, page } = await openDun(browser, v.file);
    await page.evaluate(() => { claimAllMail(); });
    const r = await settleGold(page);
    ok(r.bar !== r.exp, '[A1] 바가 상태를 안 따라가면 2초 폴링으로도 안 맞는다',
      `바 ${r.bar} ≠ ${r.exp} (${r.tries}회 시도)`);
    await ctx.close();
  }

  /* ---------- [B] 표기 규약 축 — 골드를 콤마로 ---------- */
  {
    const FOLD = /^\d+(\.\d+)?[A-Z]+$/;
    const v = variant('comma', (s) => s.replace("const g = fmtG(fxVal('gold')), d = fmt(fxVal('dia'));",
      "const g = fmt(fxVal('gold')), d = fmt(fxVal('dia'));"));
    ok(v.changed, '[B0] 사본 생성 — renderPcb 의 골드만 fmt(콤마)로');
    const { ctx, page } = await openDun(browser, v.file);
    await page.evaluate(() => { claimAllMail(); });
    await page.waitForTimeout(1500);
    const bar = await page.evaluate(() => document.getElementById('dunw').querySelector('.pcb-g>b').textContent);
    ok(!FOLD.test(bar), '[B1] 150·188 규약 항이 콤마 표기를 잡아낸다', `바 ${bar}`);
    await ctx.close();
  }

  /* ---------- [C] 기하 축 — 펄스를 영구로 ---------- */
  {
    /* 사본이 아니라 **살아 있는 페이지**에 건다 — CSS 로 넣으면 뒤에 오는 `.pcb-p` 선언과 같은
       특이도라 어느 쪽이 이기는지가 파일 순서에 달리고, 시험이 «내 주입이 먹었나» 를 묻게 된다.
       펄스의 실체는 인라인이 아니라 애니메이션이지만, 자가 보는 것은 computed transform 이므로
       «멎지 않는 펄스» 와 같은 자리를 만든다. */
    const { ctx, page } = await openDun(browser, SRC);
    await page.evaluate(() => {
      document.querySelectorAll('.pcb-p').forEach((e) => { e.style.transform = 'scale(1.17)'; });
    });
    ok(await page.evaluate(() => getComputedStyle(document.querySelector('#dunw .pcb-g')).transform !== 'none'),
      '[C0] 알약에 영구 scale(1.17) — 멎지 않는 펄스와 같은 자리');
    let r = null;
    for (let i = 0; i < 20; i++) {
      r = await page.evaluate(() => {
        const a = document.getElementById('app').getBoundingClientRect();
        const sc = a.width / 1080;
        const ps = [...document.getElementById('dunw').querySelectorAll('.pcb-p')];
        const q = ps[0].getBoundingClientRect();
        return { w: Math.round(q.width / sc), h: Math.round(q.height / sc),
          pulsing: ps.some((e) => e.getAnimations().some((an) => an.playState === 'running')) };
      });
      if (!r.pulsing) break;
      await page.waitForTimeout(100);
    }
    ok(r.w !== 254 || r.h !== 49, '[C1] 알약이 실제로 부풀어 있으면 자가 그 값을 그대로 들고 빨개진다',
      `알약 ${r.w}×${r.h} (기대 254×49 · 기다리기가 결함을 안 가린다)`);
    await ctx.close();
  }

  /* ---------- [E] 픽셀 회귀 축 — 얼린 것이 «가린» 것은 아닌가 ---------- */
  {
    /* verify41 [3] 과 **같은 처방**으로 두 장을 찍는 로컬 사본. 같은 파일 두 장은 0 이어야 하고,
       02 메인을 실제로 흔든 사본은 그래도 잡혀야 한다 — 둘 다여야 «얼렸지 안 가렸다» 가 된다. */
    const shot = async (file) => {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto('file://' + file);
      await page.waitForTimeout(60);
      await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
      await page.waitForTimeout(900);
      await page.evaluate(() => {
        document.head.insertAdjacentHTML('beforeend',
          '<style>*,*::before,*::after{animation-play-state:paused!important;transition:none!important}</style>');
        document.getAnimations().forEach((a) => { try { a.currentTime = 0; a.pause(); } catch (_) {} });
        const el = document.getElementById('view'); if (el) el.style.visibility = 'hidden';
        S.nick = 'U_FIXED';
        ['nickN', 'cpN', 'hpT', 'chapN'].forEach((id) => { const e = document.getElementById(id); if (e) e.textContent = 'X'; });
      });
      await page.waitForTimeout(120);
      await page.evaluate(() => { document.getAnimations().forEach((a) => { try { a.currentTime = 0; a.pause(); } catch (_) {} }); });
      const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 2280 } });
      await ctx.close();
      return png;
    };
    const root = path.resolve(__dirname, '..');
    const nd = (a, b) => parseInt(py([path.join(root, 'pxdiff41.py'), a, b],
      { cwd: root }).toString().trim().split(' ')[0], 10);
    const p1 = path.join(os.tmpdir(), 'probe534.e1.png'), p2 = path.join(os.tmpdir(), 'probe534.e2.png');
    fs.writeFileSync(p1, await shot(SRC)); fs.writeFileSync(p2, await shot(SRC));
    const same = nd(p1, p2);
    ok(same === 0, '[E1] 같은 파일 두 장 = 0px (얼리기 전에는 685px 이 달랐다)', `${same}px`);

    /* 02 메인을 실제로 흔든다 — 탭바를 5px 내린다(41 과 무관한 자리라 «가림» 시험으로 알맞다) */
    const v = variant('shift', (s) => s.replace('#tabbar{flex:none;height:180px;', '#tabbar{flex:none;height:180px;margin-left:5px;'));
    ok(v.changed, '[E0] 사본 생성 — #tabbar 를 5px 옆으로');
    const p3 = path.join(os.tmpdir(), 'probe534.e3.png');
    fs.writeFileSync(p3, await shot(v.file));
    const moved = nd(p1, p3);
    ok(moved > 0, '[E2] 02 메인이 실제로 바뀌면 얼린 대조도 잡아낸다', `${moved}px`);
  }

  /* ---------- [D] 이름 축 ---------- */
  {
    const s = fs.readFileSync(SRC, 'utf8');
    ok((s.match(/openRelicPage/g) || []).length === 0, '[D1] 제품에 `openRelicPage` 0건');
    ok(/function openRelw\(\)/.test(s), '[D2] 현재 이름은 `openRelw()` 다');
    const gates = ['verify41.js', 'cap41.js'].map((f) => path.resolve(__dirname, '..', f));
    const left = gates.filter((f) => fs.readFileSync(f, 'utf8').includes('openRelicPage'));
    ok(left.length === 0, '[D3] 41 계열 자·캡처 도구에 옛 이름 잔재 0건', left.join(' '));
    ok(!fs.readFileSync(gates[0], 'utf8').includes("'relicw'"), '[D4] `verify41` 에 `#relicw` 잔재 0건');
  }

  await browser.close();
  console.log(`\n${fail === 0 ? 'PROBE534 PASS' : 'PROBE534 FAIL'} (${pass}/${pass + fail})`);
  process.exit(fail === 0 ? 0 : 1);
})();
