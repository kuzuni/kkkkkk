/* 작업 465 재현 프로브 — «모달 껍데기 목록 5곳이 서로 비대칭»
 *
 *   node tools/probe465.js
 *
 * 338·341·350·372 규칙 — 처방을 따르기 전에 **등재문의 주장이 참인지 제품에게 직접 묻는다.**
 * (338·341 은 여기서 등재문이 기각됐고, 350·363·455·464 는 확인됐다. 어느 쪽인지는 제품만 안다.)
 *
 * 등재문(PROGRESS 465)의 주장:
 *   ⓐ `openAttend()` 는 `ml69` 를, `openMail()`·`openQuest()` 는 `at70` 을 안 뗀다 ⇒ 닫지 않고
 *      갈아타면 껍데기가 **둘** 붙는다(`probe464` [6] 이 세 경로를 이미 찍었다).
 *   ⓑ 사람이 밟을 수 있는 포인터 경로는 없다 ⇒ «잠복»(463 규약).
 *   ⓒ 처방 후보 ⓐ = 껍데기 이름을 **상수 하나**로 모아 모든 자리가 그것을 읽는다.
 *
 * 이 자가 **추가로** 묻는 것 — 등재문이 «다섯 목록» 이라고 부른 것의 실제 크기:
 *   ⓓ 껍데기를 **켜는**(`classList.add`) 자리는 몇 곳이고, 그중 몇 곳이 «남의 껍데기» 를 떼는가.
 *      (등재문은 세 경로만 셌다 — `sk8` 을 켜는 세 자리는 **아무것도 안 뗀다**.)
 *   ⓔ 갈아타기 **전수 행렬**(켜는 자리 n × n)에서 껍데기가 둘 이상 남는 경로 수.
 *   ⓕ 겹치면 그림이 실제로 달라지는가 — 겹친 프레임의 **레이아웃 상자**(offsetW/H · LESSONS 464-③:
 *      `getBoundingClientRect` 는 60 쥬시 연출을 같이 잰다)를 «깨끗이 연» 상자와 맞댄다.
 *   ⓖ 밟을 수 있는 길 — 모달이 열린 동안 다른 오프너 버튼이 포인터에 잡히는가(464 [6-b] 재실행) +
 *      **모달 본문 안에서** 다른 껍데기 오프너를 부르는 핸들러가 있는가(소스 스캔).
 *
 * ⚑ 결손 축은 [2]·[3] 이다 — **수리 전 빨강 · 수리 후 초록**이 이 자의 존재 이유다.
 *   나머지 축([1] 소스 모양 · [4] 겹침 비용 · [5] 도달성)은 두 트리에서 같은 뜻으로 읽힌다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC;
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {                 /* 319 — 예외는 그 블록만 빨갛게 */
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

const SHELLS = ['sk8', 'q22', 'ml69', 'at70'];

/* 껍데기를 켜는 자리 전수 — [이름, 여는 코드, 붙는 껍데기] */
const OPENERS = [
  ['69 우편함',        'openMail()',                                'ml69'],
  ['22 퀘스트',        'openQuest()',                               'q22'],
  ['70 출석',          'openAttend()',                              'at70'],
  ['08 스킬 세부',     'showSkillDetail(Object.keys(SK)[0])',       'sk8'],
  ['08 유물 세부',     'showItem(RELICS[0].id)',                    'sk8'],
  ['08 코스튬 세부',   "showCosDetail('av2')",                      'sk8'],
];

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 1e5, best: 40 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof closeModal === 'function');
  await page.waitForTimeout(900);
  /* 전투 캔버스를 멈춘다 — 킬 연출이 계측을 흔든다 */
  await page.evaluate(() => { window.step = () => {}; const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; });
  return { page, errs };
}

const run = (page, src) => ev(page, s => { try { (0, eval)(s); } catch (e) { return { __err: String(e.message || e) }; } return 1; }, src);
const cls = page => ev(page, () => [...document.getElementById('modal').classList].filter(c => !c.startsWith('jz-')).join(' '));

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '');       /* 277 계열 — 주석을 걷어낸 «제품 줄» */

  blk('[1] 소스 — 껍데기를 «켜는» 자리와 그 자리가 떼는 목록(ⓓ)');
  {
    /* add 하는 줄을 전수로 잡고, 그 줄 **앞 400자** 안의 remove 목록을 본다 */
    const addRe = /classList\.add\(([^)]*)\)/g;
    let m, sites = [], full = 0, partial = 0, none = 0;
    while ((m = addRe.exec(code))) {
      const shell = SHELLS.find(s => m[1].includes("'" + s + "'"));
      if (!shell) continue;
      const before = code.slice(Math.max(0, m.index - 400), m.index);
      const rem = /classList\.remove\(([^)]*)\)|\bremove\(([^)]*)\)/g;
      let r, last = null;
      while ((r = rem.exec(before))) last = (r[1] || r[2] || '');
      const removed = SHELLS.filter(s => (last || '').includes("'" + s + "'"));
      const missing = SHELLS.filter(s => s !== shell && !removed.includes(s));
      sites.push({ shell, removed, missing });
      if (!removed.length) none++; else if (missing.length) partial++; else full++;
    }
    info('[1-a] 껍데기 이름을 **직접** 켜는 자리', sites.length + '곳' + (sites.length ? ' — ' + sites.map(s => s.shell + '(뗌:' + (s.removed.join(',') || '없음') + ')').join(' · ') : ''));
    info('[1-b] 그중 남의 껍데기를 전부 떼는 곳', '전부뗌 ' + full + '곳 · 일부만 ' + partial + '곳 · 하나도 안 뗌 ' + none + '곳'
      + (sites.length ? '  ⇒ 목록이 흩어져 있고 서로 비대칭이다' : ''));
    const listCnt = (code.match(/remove\([^)]{0,140}'sk8'/g) || []).length;
    info('[1-c] 껍데기 이름이 든 remove 목록 줄 수(464 [B] 가 세는 축)', listCnt + '건');
    /* ★ 결손 축 — «목록이 낡을 자리» 가 몇 곳인가. 흩어진 목록이 하나라도 있으면 다시 비대칭이 된다. */
    const decl = /const\s+MODAL_SHELLS\s*=\s*\[([^\]]*)\]/.exec(code);
    const declared = decl ? SHELLS.filter(s => decl[1].includes("'" + s + "'")) : [];
    ok(sites.length === 0 && listCnt === 0 && declared.length === SHELLS.length,
      '★ [1-d] 껍데기 이름을 켜고 끄는 자리는 **한 곳**뿐이다 — 선언 `MODAL_SHELLS` + `modalShell()`',
      '흩어진 add ' + sites.length + '곳 · 흩어진 remove 목록 ' + listCnt + '건 · 선언 ' + declared.length + '/' + SHELLS.length + '종');
  }

  const browser = await launch(chromium);
  const b = await boot(browser);

  blk('[2] 실동작 — 닫지 않고 갈아타는 전수 행렬(ⓔ)');
  const bad = [];
  {
    for (const [nameA, openA, shellA] of OPENERS) {
      for (const [nameB, openB, shellB] of OPENERS) {
        if (nameA === nameB) continue;
        await run(b.page, 'closeModal()');
        await b.page.waitForTimeout(320);            /* 345 닫힘 연출(0.12s)이 끝난 뒤라야 «깨끗한» 기준선이다 */
        const ra = await run(b.page, openA);
        await b.page.waitForTimeout(160);
        const rb = await run(b.page, openB);                 /* 닫지 않고 바로 갈아탄다 */
        await b.page.waitForTimeout(160);
        if ((ra && ra.__err) || (rb && rb.__err)) { info('[2] ' + nameA + ' → ' + nameB + ' 오프너 실패', (ra && ra.__err) || (rb && rb.__err)); continue; }
        const got = String(await cls(b.page) || '');
        const on = SHELLS.filter(s => got.split(' ').includes(s));
        if (!(on.length === 1 && on[0] === shellB)) bad.push({ p: nameA + ' → ' + nameB, got, on: on.join('+') });
      }
    }
    const total = OPENERS.length * (OPENERS.length - 1);
    for (const x of bad.slice(0, 8)) info('[2-a] 겹침', x.p + '  ⇒ class="' + x.got + '"');
    ok(bad.length === 0,
      '★ [2-b] 갈아탄 뒤 껍데기는 **정확히 하나**(= 나중에 연 화면의 것) — 전 경로 ' + total + '개',
      '겹치는 경로 ' + bad.length + '/' + total + '개');
  }

  blk('[2-c] 실동작 — 닫는 «중»(345 연출 0.12s)에 갈아타는 경로');
  {
    /* 345 `jzShellBack()` 은 닫힘 연출 동안 껍데기를 **되살린다**(균등 축소를 위해).
       그 사이에 다른 껍데기를 열면 `done()` 은 «연 쪽» 의 것이라 안 떼므로, 되살아난 껍데기를
       떼는 것은 **오프너의 remove 목록** 하나뿐이다 ⇒ 목록이 비대칭이면 여기서 그대로 남는다.
       (`verify345` §4-① 은 이 자리를 ml69 → q22 **한 쌍**으로만 물었다.) */
    const bad2 = [];
    for (const [nameA, openA] of OPENERS) {
      for (const [nameB, openB, shellB] of OPENERS) {
        if (nameA === nameB) continue;
        await run(b.page, 'closeModal()');
        await b.page.waitForTimeout(320);
        const ra = await run(b.page, openA);
        await b.page.waitForTimeout(220);
        await run(b.page, 'closeModal()');
        await b.page.waitForTimeout(50);                 /* 연출 한복판 — 껍데기가 되살아나 있다 */
        const rb = await run(b.page, openB);
        await b.page.waitForTimeout(320);                /* 연출이 끝나 done() 까지 지난 뒤에 읽는다 */
        if ((ra && ra.__err) || (rb && rb.__err)) continue;
        const got = String(await cls(b.page) || '');
        const on = SHELLS.filter(s => got.split(' ').includes(s));
        if (!(on.length === 1 && on[0] === shellB)) bad2.push({ p: nameA + ' ✕ → ' + nameB, got });
      }
    }
    for (const x of bad2.slice(0, 6)) info('[2-c] 닫는 중 전환 겹침', x.p + '  ⇒ class="' + x.got + '"');
    ok(bad2.length === 0,
      '★ [2-d] 닫힘 연출 도중에 갈아타도 껍데기는 **정확히 하나**(345 §4-① 의 전 경로판)',
      '겹치는 경로 ' + bad2.length + '/' + (OPENERS.length * (OPENERS.length - 1)) + '개');
  }

  blk('[3] 회귀 — 하나만 열었을 때는 원래 껍데기 하나뿐이다(전제)');
  {
    let clean = 0;
    for (const [name, open, shell] of OPENERS) {
      await run(b.page, 'closeModal()');
      await b.page.waitForTimeout(320);
      const r = await run(b.page, open);
      await b.page.waitForTimeout(200);
      if (r && r.__err) { info('[3] ' + name + ' 오프너 실패', r.__err); continue; }
      const got = String(await cls(b.page) || '');
      const on = SHELLS.filter(s => got.split(' ').includes(s));
      if (on.length === 1 && on[0] === shell && got.split(' ').includes('on')) clean++;
      else info('[3-x] ' + name, 'class="' + got + '"');
    }
    ok(clean === OPENERS.length, '[3-a] 깨끗이 연 여섯 자리는 «자기 껍데기 + on» 뿐이다',
      clean + '/' + OPENERS.length + '곳');
  }

  blk('[4] 겹치면 그림이 달라지는가 — 레이아웃 상자로 잰다(ⓕ · LESSONS 464-③)');
  {
    const box = async () => ev(b.page, () => {
      const m = document.getElementById('modal'), bx = m.querySelector('.mbox');
      const bd = m.querySelector('.mbody');
      return { cls: [...m.classList].filter(c => !c.startsWith('jz-')).join(' '),
        mw: m.offsetWidth, mh: m.offsetHeight,
        bw: bx ? bx.offsetWidth : -1, bh: bx ? bx.offsetHeight : -1,
        dh: bd ? bd.offsetHeight : -1 };
    });
    const keys = ['mw', 'mh', 'bw', 'bh', 'dh'];
    const fmt = x => x ? 'modal ' + x.mw + '×' + x.mh + ' · mbox ' + x.bw + '×' + x.bh + ' · mbody h' + x.dh : 'null';
    /* 깨끗한 여섯 자리의 기준선을 먼저 잡는다 */
    const base = {};
    for (const [name, open, shell] of OPENERS) {
      await run(b.page, 'closeModal()'); await b.page.waitForTimeout(320);
      const r = await run(b.page, open); await b.page.waitForTimeout(320);
      if (r && r.__err) continue;
      base[name] = await box();
      info('[4-a] 깨끗한 ' + name, 'class="' + base[name].cls + '" · ' + fmt(base[name]));
    }
    /* [2] 가 찍은 겹침 경로마다 «겹친 상자 ↔ 그 화면의 깨끗한 상자» 를 맞댄다 */
    let worst = 0, worstP = '';
    for (const x of bad) {
      const [nameA, nameB] = x.p.split(' → ');
      const A = OPENERS.find(o => o[0] === nameA), B = OPENERS.find(o => o[0] === nameB);
      if (!A || !B || !base[nameB]) continue;
      await run(b.page, 'closeModal()'); await b.page.waitForTimeout(320);
      await run(b.page, A[1]); await b.page.waitForTimeout(200);
      await run(b.page, B[1]); await b.page.waitForTimeout(320);
      const s = await box();
      if (!s) continue;
      const d = keys.reduce((a, k) => Math.max(a, Math.abs(s[k] - base[nameB][k])), 0);
      if (d > worst) { worst = d; worstP = x.p + ' (' + fmt(s) + ')'; }
    }
    info('[4-b] 겹친 경로 ' + bad.length + '개의 상자 Δmax(깨끗한 같은 화면 대비)', worst + 'px' + (worstP ? '  ← ' + worstP : ''));
    info('[4-c] 판정', worst > 0
      ? '**겹치면 규격이 실제로 어긋난다** — 밟을 수 있게 되는 순간 곧바로 실해다'
      : '겹쳐도 상자는 같다(CSS 우선순위상 나중 껍데기가 이긴다) ⇒ 지금은 «잠복» · 수리는 Δ0px');
    await run(b.page, 'closeModal()');
  }

  blk('[5] 밟을 수 있는 길이 있는가(ⓖ · 463 «잠복» 규약 · 464 [6-b] 재실행)');
  {
    await run(b.page, 'closeModal()'); await b.page.waitForTimeout(320);
    await run(b.page, 'openAttend()'); await b.page.waitForTimeout(260);
    const reach = await ev(b.page, () => {
      const out = [];
      const tryEl = (sel, label) => {
        const el = document.querySelector(sel);
        if (!el) return out.push({ label, hit: 'no-node' });
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return out.push({ label, hit: 'no-box' });
        const t = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
        out.push({ label, hit: t === el || el.contains(t) ? 'REACHABLE' : (t ? (t.id || t.className || t.tagName) : 'null') });
      };
      tryEl('.side .ibtn[data-pop="attend"]', '사이드 출석');
      tryEl('.side .ibtn[data-pop="quest"]', '사이드 퀘스트');
      tryEl('#menub', '▦ 메뉴 버튼(우편 진입)');
      return out;
    });
    const reachable = (reach || []).filter(r => r.hit === 'REACHABLE');
    ok(reachable.length === 0,
      '★ [5-a] 모달이 열린 동안 다른 오프너 버튼은 포인터에 **안 잡힌다**(딤이 전면을 덮는다)',
      (reach || []).map(r => r.label + ':' + r.hit).join(' · '));
    /* 모달 **본문 안**에서 다른 껍데기를 켜는 핸들러가 있으면 딤과 무관하게 밟힌다 */
    const inBody = (code.match(/\$\('mbox'\)[\s\S]{0,4000}?(openMail|openAttend|openQuest)\(\)/g) || []).length;
    const gm = (code.match(/gmCloseAll\(\)/g) || []).length;
    info('[5-b] 모달 본문 재렌더 경로가 부르는 오프너(자기 자신 재렌더 — 껍데기가 안 바뀐다)', inBody + '건');
    info('[5-c] 화면 이동 경로는 `gmCloseAll()` 이 `closeModal()` 을 먼저 부른다', gm + '건');
    await run(b.page, 'closeModal()');
  }

  blk('[6] 콘솔');
  ok(b.errs.length === 0, '[6] 콘솔·페이지 에러 0', b.errs.slice(0, 2).join(' | ') || '없음');

  await browser.close();
  console.log('\nPROBE465 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
