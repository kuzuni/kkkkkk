#!/usr/bin/env node
/* 게이트 — 작업 410 「`#panel` 을 닫자마자 다시 열면 시트가 0×0 으로 뜬다」
 *
 *   node tools/verify410.js
 *
 * 재현·뿌리 확인은 `tools/probe410.js`(수리 전 사본에서 돈다). 여기는 **수리가 살아 있는가**를 묻는다.
 *
 *   [전제] 수리 두 자리가 index.html 에 있다 — 없으면 아래 전부가 헛초록이다.
 *   [A]    SCOPE — 22개 오버레이의 «뜰 때 display» 가 전부 `JZ_DSP` 표 안에 있다.
 *          (probe410 [5-b] 이관. 새 오버레이가 표 밖 display 로 뜨면 닫힘 연출이 **다른 배치로** 축소된다)
 *   [B]    범위 — inline display 로 여닫는 오버레이는 `#panel` 하나다(결함이 살던 자리).
 *   [1]    본체 — 닫힘 연출 도중 다시 열면 시트가 산다. 지연 6칸을 전부 본다.
 *   [2]    불변식 — jz 는 닫는 동안 inline display 를 **한 번도 안 쓴다**(되돌릴 값을 안 만든다).
 *   [3]    음성항 — 그냥 닫으면 그대로 닫힌다. 강제 표시 클래스도 안 남는다(누수 0).
 *   [4]    연출이 실제로 보인다 — 닫힘 도중 상자가 살아 있다(클래스가 inline `display:none` 을 이긴다).
 *   [5]    다시 열린 쪽에 **여는 연출이 붙는다**(`jz-o`) — 취소 경로가 연출까지 넘긴다.
 *   [§R]   되돌림 시험 — 수리를 걷어낸 사본에서는 [1] 이 **빨개진다**. 무르게 푼 수리가 아님의 증명.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const SRC = path.resolve(__dirname, '..', 'index.html');
const W = 1080, H = 2280;
const KEY = 'idle_hunter_save_v4';

let pass = 0, fail = 0;
const is = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const no = m => { fail++; console.log('  NO   ' + m); };
const px = n => Math.round(n * 100) / 100;

/* ── 되돌림 시험용 «수리 전» 사본 ────────────────────────────────────────────
   갈아 끼울 자리 두 곳. 못 찾으면 [전제] 가 빨개진다(neg279 처방 — 조용히 넘어가지 않는다). */
const DSP_NEW = `function jzDispOn(el, disp){
  const c = JZ_DSP[disp] || 'jz-df';
  el.__jzDsp = c;
  el.classList.add(c);
}
function jzDispOff(el){
  if(!el.__jzDsp) return;
  el.classList.remove(el.__jzDsp);
  el.__jzDsp = '';
}`;
const DSP_OLD = `function jzDispOn(el, disp){ el.style.display = disp; }
function jzDispOff(el){ el.style.display = el.__jzInl0; }`;
const MO_NEW = `      if(el.__jzBusy){
        const inl = el.style.display;
        if(m.attributeName === 'style' && inl && inl !== 'none' && inl !== el.__jzInl0 && el.__jzCancel){
          el.__jzCancel();
          el.__jzVis = true;
          el.__jzOpT = performance.now();
          let d = 'flex'; try { d = getComputedStyle(el).display; } catch(_){}
          el.__jzLast = d;
          if(!jzQuiet) jzOpen(el);
        }
        continue;
      }`;
const MO_OLD = `      if(el.__jzBusy) continue;`;

const SNAP = `
window.__pnl = function(){
  var el = document.getElementById('panel');
  var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  return { w: r.width, h: r.height, disp: cs.display, cssH: cs.height, inl: el.style.display,
           busy: !!el.__jzBusy, cls: el.className,
           body: !!document.querySelector('#bSkill.on, #bPet.on, #bCos.on') };
};`;

/* 한 페이지에서 «닫고 d ms 뒤에 다시 연다» 를 한 번 돌고 결과 상자를 돌려준다 */
async function cycle(page, d) {
  await page.evaluate(() => { panelOpen = false; syncPanel(); });
  await page.waitForTimeout(420);
  await page.evaluate(() => { goTab('hero'); heroSubGo('sk'); });
  await page.waitForTimeout(420);
  await page.evaluate(async (ms) => {
    panelOpen = false; syncPanel();                       /* 닫는다 — 연출 시작 */
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (ms) await new Promise(r => setTimeout(r, ms));
    goTab('hero'); heroSubGo('pet');                      /* 연출 «도중» 에 다시 연다 */
  }, d);
  await page.waitForTimeout(500);                          /* offC 가 지나가고도 남는 시간 */
  return page.evaluate(() => window.__pnl());
}

async function boot(ctx, url) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  await page.addScriptTag({ content: SNAP });
  return { page, errs };
}

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');

  /* ── [전제] ── */
  console.log('[전제] 수리가 index.html 에 살아 있는가');
  const hasDsp = src.includes(DSP_NEW), hasMo = src.includes(MO_NEW);
  const hasCss = /\.jz-df\{display:flex!important\}/.test(src);
  is(hasDsp, '[전제-a] `jzDispOn`/`jzDispOff` 가 클래스로 display 를 세운다 (inline 을 안 쓴다)');
  is(hasMo, '[전제-b] MutationObserver 가 닫힘 도중의 «다시 열림» 을 본다 (`__jzCancel`)');
  is(hasCss, '[전제-c] 강제 표시 규칙 `.jz-df/.jz-db/.jz-dg` 가 있다');
  if (!hasDsp || !hasMo || !hasCss) {
    console.log('\nVERIFY410 FAIL — 수리가 사라졌거나 갈아 끼울 자리가 바뀌었다. 아래를 돌 이유가 없다.');
    process.exit(1);
  }

  const revPath = path.join(path.dirname(SRC), `.verify410-rev-${process.pid}.html`);
  fs.writeFileSync(revPath, src.replace(DSP_NEW, DSP_OLD).replace(MO_NEW, MO_OLD));
  process.on('exit', () => { try { fs.unlinkSync(revPath); } catch (e) {} });

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, best: 40 })]);

  const { page, errs } = await boot(ctx, 'file://' + SRC);

  /* ── [A] SCOPE ── */
  console.log('\n[A] SCOPE — 오버레이가 뜰 때의 display 가 전부 `JZ_DSP` 표 안에 있는가');
  const scope = await page.evaluate(() => {
    const tbl = Object.keys(JZ_DSP), out = [];
    for (const id of JZ_OVID) {
      const el = document.getElementById(id); if (!el) continue;
      const pd = el.style.display, pc = el.className;
      el.style.display = ''; el.classList.add('on');
      const d = getComputedStyle(el).display;
      el.className = pc; el.style.display = pd;
      out.push({ id, d });
    }
    return { tbl, out };
  });
  const outside = scope.out.filter(s => !scope.tbl.includes(s.d));
  const dist = {};
  for (const s of scope.out) dist[s.d] = (dist[s.d] || 0) + 1;
  console.log('  표 : ' + scope.tbl.join(', ') + '   실측 분포 : ' + Object.entries(dist).map(([k, v]) => k + '×' + v).join(' · '));
  is(outside.length === 0,
     '★ [A] ' + scope.out.length + '개 오버레이 전부 표 안의 display 로 뜬다 — 닫힘 연출이 배치를 안 바꾼다',
     outside.length ? '표 밖 : ' + outside.map(s => s.id + '=' + s.d).join(', ') : '표 밖 0건');

  /* ── [B] 범위 ── */
  const inlIds = await page.evaluate(() => JZ_OVID
    .map(id => ({ id, inl: (document.getElementById(id) || {}).style && document.getElementById(id).style.display }))
    .filter(s => s.inl).map(s => s.id));
  is(inlIds.length === 1 && inlIds[0] === 'panel',
     '[B] inline display 로 여닫는 오버레이는 `#panel` 하나다 (결함이 살던 자리 = 하나)',
     inlIds.join(', ') || '없음');

  /* ── [1] 본체 ── */
  console.log('\n[1] 닫힘 연출 도중 다시 열면 시트가 산다 (지연 스윕)');
  const rows = [];
  for (const d of [0, 20, 60, 120, 187, 250]) {
    const s = await cycle(page, d);
    rows.push({ d, s });
    console.log('  지연 ' + String(d).padStart(3) + 'ms : ' + px(s.w) + '×' + px(s.h)
              + '  display=' + s.disp + '  inline=' + JSON.stringify(s.inl) + '  본문 on=' + s.body);
  }
  const alive = rows.filter(r => r.s.h > 0 && r.s.disp !== 'none');
  is(alive.length === rows.length,
     '★ [1-a] 지연 ' + rows.length + '칸 전부 시트가 살아 있다 (수리 전에는 0ms~187ms 가 0×0 이었다)',
     alive.length + '/' + rows.length + ' · 높이 ' + rows.map(r => px(r.s.h)).join('/'));
  is(rows.every(r => r.s.h === rows[0].s.h && r.s.w === 1080),
     '[1-b] 그 상자는 지연과 무관하게 같다 — 규칙(1484)이 그대로 화면에 나온다',
     rows.map(r => px(r.s.w) + '×' + px(r.s.h)).join(' · '));
  is(rows.every(r => r.s.body),
     '[1-c] 다시 열린 본문(#bPet)도 `on` 이다 — 여는 쪽은 내내 옳았다');
  is(rows.every(r => !/jz-df|jz-db|jz-dg|jz-c\b/.test(r.s.cls)),
     '[1-d] 다시 열린 뒤 닫힘 연출 흔적(`jz-c`·강제 표시 클래스)이 한 개도 안 남는다',
     rows.map(r => r.s.cls.trim() || '(없음)').join(' | ').slice(0, 120));

  /* ── [2] 불변식 — 닫는 동안 inline 을 안 만진다 ── */
  console.log('\n[2] 불변식 — jz 는 닫는 동안 inline display 를 한 번도 안 쓴다');
  await page.evaluate(() => { panelOpen = false; syncPanel(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => { goTab('hero'); heroSubGo('sk'); });
  await page.waitForTimeout(420);
  const inv = await page.evaluate(async () => {
    const el = document.getElementById('panel'), seen = [];
    panelOpen = false; syncPanel();
    for (let i = 0; i < 30; i++) {
      seen.push({ inl: el.style.display, busy: !!el.__jzBusy, h: el.getBoundingClientRect().height });
      await new Promise(r => setTimeout(r, 10));
    }
    return seen;
  });
  const busy = inv.filter(s => s.busy);
  is(inv.every(s => s.inl === 'none'),
     '★ [2-a] 닫는 내내 inline 은 닫은 쪽이 적은 `none` 그대로다 — 되돌릴 값 자체가 없다',
     '표본 ' + inv.length + '개 · 값 ' + [...new Set(inv.map(s => JSON.stringify(s.inl)))].join(', '));
  is(busy.length > 0 && busy.some(s => s.h > 0),
     '★ [2-b] 그런데도 연출 도중 상자는 살아 있다 — 강제 표시 클래스가 inline `display:none` 을 이긴다',
     '연출 표본 ' + busy.length + '개 중 높이>0 이 ' + busy.filter(s => s.h > 0).length + '개');

  /* ── [3] 음성항 — 그냥 닫으면 그대로 닫힌다 ── */
  await page.waitForTimeout(500);
  const closed = await page.evaluate(() => window.__pnl());
  console.log('\n[3] 음성항 — 그냥 닫았을 때');
  is(closed.h === 0 && closed.disp === 'none',
     '[3-a] 연출이 끝나면 그대로 닫힌다 (0×0 · display:none)',
     px(closed.w) + '×' + px(closed.h) + ' · ' + closed.disp);
  is(!/jz-df|jz-db|jz-dg/.test(closed.cls),
     '[3-b] 강제 표시 클래스가 안 남는다 — 누수 0',
     closed.cls.trim() || '(클래스 없음)');

  /* ── [4]·[5] 다시 열린 쪽에 여는 연출이 붙는가 ── */
  console.log('\n[4] 취소 경로가 «여는 연출» 까지 넘긴다');
  await page.evaluate(() => { goTab('hero'); heroSubGo('sk'); });
  await page.waitForTimeout(420);
  const reo = await page.evaluate(async () => {
    const el = document.getElementById('panel');
    panelOpen = false; syncPanel();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    goTab('hero'); heroSubGo('pet');
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { cls: el.className, gen: el.__jzGen || 0, busy: !!el.__jzBusy,
             h: el.getBoundingClientRect().height };
  });
  console.log('  다시 연 직후 class="' + reo.cls.trim() + '"  busy=' + reo.busy + '  h=' + px(reo.h));
  is(/jz-o/.test(reo.cls) || reo.h > 0,
     '★ [4-a] 닫힘이 취소되고 «열린 상태» 로 넘어간다 (`jz-o` 또는 살아 있는 상자)',
     reo.cls.trim());
  is(reo.busy === false,
     '[4-b] `__jzBusy` 가 풀린다 — 다음 개폐를 MutationObserver 가 다시 본다',
     'busy=' + reo.busy);
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => window.__pnl());
  is(after.h > 0 && after.inl === 'flex',
     '★ [4-c] 그리고 그 뒤로도 살아 있다 — 늦게 오는 offC 가 못 덮어쓴다(세대 가드가 «다시 열림» 에도 선다)',
     px(after.w) + '×' + px(after.h) + ' · inline=' + JSON.stringify(after.inl));

  is(errs.length === 0, '[5] 콘솔/페이지 오류 0건', errs.length ? errs[0].slice(0, 120) : '0건');
  await page.close();

  /* ── [§R] 되돌림 시험 ── */
  console.log('\n[R] 되돌림 시험 — 수리를 걷어낸 사본에서는 [1] 이 빨개져야 한다');
  const rev = await boot(ctx, 'file://' + revPath);
  /* ⚠ 344·372·392 교훈 — **경계에 단언을 세우지 마라.** 창은 닫힘 연출 길이(`.jz-c.jz-sh2`
     = `jzSheetOut .13s`)이고 rAF 두 번(≈32ms)이 이미 그 안을 먹는다. 그래서 판정은 창 «한복판»
     (0·20ms)에서만 하고, 경계(60~160ms)는 **기록만** 한다 — 그 자리는 회차마다 뒤집힌다. */
  const sweep = [];
  for (const d of [0, 20, 60, 120, 200, 400]) sweep.push({ d, s: await cycle(rev.page, d) });
  for (const r of sweep)
    console.log('  사본 지연 ' + String(r.d).padStart(3) + 'ms : ' + px(r.s.w) + '×' + px(r.s.h)
              + '  display=' + r.s.disp + (r.s.h === 0 ? '   ← 0×0' : ''));
  const r0 = sweep[0].s, r20 = sweep[1].s, r400 = sweep[sweep.length - 1].s;
  const brk = sweep.filter(r => r.s.h === 0).map(r => r.d);
  is(r0.h === 0 && r0.disp === 'none',
     '★ [R-a] 사본(수리 전)은 0×0 으로 뜬다 — 이 게이트는 헛초록이 아니다',
     px(r0.w) + '×' + px(r0.h) + ' · ' + r0.disp);
  is(r0.body === true && parseFloat(r0.cssH) > 0,
     '[R-b] 사본에서도 규칙(height)과 본문은 멀쩡하다 — 가린 것은 inline 하나였다',
     '규칙 height=' + r0.cssH + ' · 본문 on=' + r0.body);
  is(r20.h === 0,
     '[R-c] 창 한복판(20ms)도 그렇다 — 한 점이 아니라 구간이다',
     px(r20.h) + 'px · 0×0 인 지연 ' + (brk.length ? brk.join('/') + 'ms' : '없음'));
  is(r400.h > 0,
     '[R-d] 사본도 연출이 끝난 뒤(400ms)에 열면 멀쩡하다 — 창은 연출 길이만큼이었다(403·404 §8 의 «250ms 회피»)',
     px(r400.w) + '×' + px(r400.h));
  is(rev.errs.length === 0, '[R-e] 사본 콘솔/페이지 오류 0건', rev.errs.length ? rev.errs[0].slice(0, 120) : '0건');

  console.log('\nVERIFY410 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
