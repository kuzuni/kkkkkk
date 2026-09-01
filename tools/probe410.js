#!/usr/bin/env node
/* 재현기 — 작업 410 「`#panel` 을 닫자마자 다시 열면 시트가 0×0 으로 뜬다」
 *
 *   node tools/probe410.js
 *
 * 338·341·350 규칙: **처방 전에 재현한다.** 등재문(403·404 §8)이 세운 가설은 셋이다.
 *   ⓐ 뿌리는 `offC()` 의 `el.style.display = inl` — 닫을 때의 inline 값을 연출이 끝난 뒤 되돌린다.
 *   ⓑ `el.__jzGen` 세대 가드는 «연출 도중 또 닫힐 때» 만 막고 «다시 열릴 때» 는 안 막는다.
 *   ⓒ 회피는 250ms 대기(= 닫힘 연출 길이)다.
 * 여기에 등재문이 **직접 명령한 축**을 하나 더 세운다:
 *   ⓓ ⚠ «사용자 도달성부터 재라» — 실제 손가락(탭 클릭)으로 나는가, 창은 몇 ms 인가.
 * 그리고 처방의 크기를 정하려면 하나 더 필요하다:
 *   ⓔ 22개 오버레이 중 **inline display 로 여닫는 것이 몇 개인가**(= 같은 결함을 갖는 자리의 수).
 *
 * ⚠ 이 자는 **«수리 전» 사본**에서 돈다 — `index.html` 의 수리 두 자리를 되돌린 임시 파일을 만들어
 *   거기에 붙는다(`verify348` §R 방식). 그래야 수리가 들어간 «뒤» 에도 재현 기록으로 계속 돈다.
 *   처음 이 자를 돌린 것은 수리 전 트리(`index.html` 무수정)였고, 그때와 **같은 값**이 나온다.
 *   갈아 끼울 자리를 못 찾으면 그렇게 말하고 죽는다(neg279 처방 — 조용히 초록이 되지 않는다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const SRC = path.resolve(__dirname, '..', 'index.html');
const KEY = 'idle_hunter_save_v4';
const W = 1080, H = 2280;

/* 수리를 되돌리는 두 자리 — `tools/verify410.js` 와 같은 문자열이다(한쪽만 바뀌면 둘 다 빨개진다) */
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

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const px = n => Math.round(n * 100) / 100;

/* «시트가 화면에 실제로 차지한 상자» 를 한 번 뜬다. 규칙(computed height)과 상자를 **따로** 본다 —
   등재문의 핵심이 «규칙은 맞았는데 상자가 0×0» 이기 때문이다. */
const SNAP = `
window.__pnl = function(){
  var el = document.getElementById('panel');
  var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  return { w: r.width, h: r.height, disp: cs.display, cssH: cs.height,
           inl: el.style.display, busy: !!el.__jzBusy, gen: el.__jzGen || 0,
           body: !!document.querySelector('#bSkill.on, #bPet.on, #bCos.on') };
};`;

(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const hasNew = src.includes(DSP_NEW) && src.includes(MO_NEW);
  const hasOld = src.includes('el.style.display = inl;');
  if (!hasNew && !hasOld) {
    console.log('  NO   [전제] 갈아 끼울 자리를 못 찾았다 — `jzClose`/MutationObserver 가 바뀌었다. 이 재현기를 먼저 고쳐라.');
    console.log('\nPROBE410 0/1 — FAIL 1');
    process.exit(1);
  }
  /* 상대 경로 자산 때문에 사본은 반드시 같은 폴더에 둔다(probe350 함정) */
  const preSrc = hasNew ? src.replace(DSP_NEW, DSP_OLD).replace(MO_NEW, MO_OLD) : src;
  const prePath = path.join(path.dirname(SRC), `.probe410-pre-${process.pid}.html`);
  fs.writeFileSync(prePath, preSrc);
  process.on('exit', () => { try { fs.unlinkSync(prePath); } catch (e) {} });
  const URL = 'file://' + prePath;
  console.log('[i] «수리 전» 사본에서 돈다 — ' + (hasNew ? '수리 두 자리를 되돌렸다' : 'index.html 이 아직 수리 전이다'));

  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} },
    [KEY, JSON.stringify({ gold: 5e7, dia: 12000, best: 40 })]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof goTab === 'function');
  await page.waitForTimeout(900);
  await page.evaluate(() => { const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden'; window.step = () => {}; });
  await page.addScriptTag({ content: SNAP });

  const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  /* 닫힌 상태로 되돌린다 — 회차 사이에 상태가 새면 뒤 축이 통째로 거짓말을 한다 */
  const reset = async () => {
    await page.evaluate(() => { panelOpen = false; syncPanel(); });
    await page.waitForTimeout(400);
  };

  /* ── [1] 등재문 그대로의 재현 (프로그램 경로) ─────────────────────────────
     스킬 시트를 연 뒤 닫고 «곧바로» 동료로 연다. 159 가 여는 순간 서브탭을 장비로 리셋하므로
     연 «뒤에» heroSubGo 로 옮긴다(403·404 §7-2 가 verify51 에서 고친 것과 같은 순서). */
  console.log('\n── [1] 등재문 재현 — 닫고 «곧바로» 다시 연다 ──');
  await reset();
  await page.evaluate(() => { goTab('hero'); heroSubGo('sk'); });
  await page.waitForTimeout(500);
  const opened = await page.evaluate(() => window.__pnl());
  console.log('  연 직후          : ' + px(opened.w) + '×' + px(opened.h) + '  display=' + opened.disp + '  규칙 height=' + opened.cssH);

  await page.evaluate(() => { panelOpen = false; syncPanel(); });     /* 닫는다(연출 0.12s 시작) */
  await settle();
  await page.evaluate(() => { goTab('hero'); heroSubGo('pet'); });    /* 연출 도중에 다시 연다 */
  await page.waitForTimeout(400);                                     /* offC 가 지나가고도 남는 시간 */
  const broke = await page.evaluate(() => window.__pnl());
  console.log('  닫고 곧바로 재열기: ' + px(broke.w) + '×' + px(broke.h) + '  display=' + broke.disp
            + '  규칙 height=' + broke.cssH + '  inline=' + JSON.stringify(broke.inl) + '  본문 on=' + broke.body);

  ok(broke.body === true,
     '[1-a] «다시 열린 쪽» 은 자기 일을 다 했다 — 본문(#bPet)이 `on` 이고 규칙 height 도 살아 있다',
     '규칙 height=' + broke.cssH);
  ok(broke.w === 0 && broke.h === 0,
     '★ [1-b] 그런데 시트가 화면에 차지한 상자는 **0×0** 이다 — 등재문 재현 성공',
     px(broke.w) + '×' + px(broke.h) + ' · display=' + broke.disp);
  ok(broke.disp === 'none' && broke.inl === 'none',
     '★ [1-c] 가린 것은 규칙이 아니라 **inline `display:none`** 이다 — 가설 ⓐ 가 가리키는 그 값이다',
     'computed=' + broke.disp + ' · inline=' + JSON.stringify(broke.inl));

  /* ── [2] 뿌리 못박기 — 그 한 줄이 «언제» 덮어쓰는가 ────────────────────────
     다시 연 «직후» 에는 멀쩡하고, 닫힘 연출이 끝나는 순간 사라진다면 범인은 offC 하나다. */
  console.log('\n── [2] 타임라인 — 다시 연 뒤 10ms 간격으로 상자를 뜬다 ──');
  await reset();
  await page.evaluate(() => { goTab('hero'); heroSubGo('sk'); });
  await page.waitForTimeout(500);
  const tl = await page.evaluate(async () => {
    const out = [];
    panelOpen = false; syncPanel();                       /* 닫는다 */
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    goTab('hero'); heroSubGo('pet');                      /* 연출 도중 다시 연다 */
    const t0 = performance.now();
    for (let i = 0; i < 40; i++) {
      const s = window.__pnl();
      out.push({ t: Math.round(performance.now() - t0), h: s.h, inl: s.inl, busy: s.busy });
      await new Promise(r => setTimeout(r, 10));
    }
    return out;
  });
  const first = tl[0], live = tl.filter(s => s.h > 0), dead = tl.filter(s => s.h === 0);
  const flip = tl.findIndex(s => s.h === 0);
  console.log('  0ms          : h=' + px(first.h) + '  inline=' + JSON.stringify(first.inl) + '  busy=' + first.busy);
  if (flip > 0) console.log('  뒤집힌 순간  : t=' + tl[flip].t + 'ms  h=' + px(tl[flip - 1].h) + ' → 0  inline='
                          + JSON.stringify(tl[flip - 1].inl) + ' → ' + JSON.stringify(tl[flip].inl));
  console.log('  살아 있던 표본 ' + live.length + '/40 · 죽은 표본 ' + dead.length + '/40');

  ok(first.h > 0,
     '★ [2-a] 다시 연 «직후» 에는 멀쩡하다 — 여는 쪽은 한 번도 틀린 적이 없다',
     'h=' + px(first.h) + ' · inline=' + JSON.stringify(first.inl));
  ok(flip > 0 && tl[flip].inl === 'none' && tl[flip - 1].inl !== 'none',
     '★ [2-b] 사라지는 순간에 **inline display 가 되돌아간다** — 뿌리는 `offC()` 의 그 한 줄이다(가설 ⓐ 확인)',
     flip > 0 ? 't=' + tl[flip].t + 'ms 에 ' + JSON.stringify(tl[flip - 1].inl) + ' → "none"' : '뒤집힘 없음');
  ok(dead.length > 0 && flip > 0 && tl[flip].t <= 300,
     '[2-c] 덮어쓰기는 닫힘 연출 길이(0.12s) 언저리에 온다 — 300ms 안',
     flip > 0 ? tl[flip].t + 'ms' : '-');

  /* ── [3] 세대 가드가 «다시 열림» 을 못 막는다는 것(가설 ⓑ) ──────────────
     연출 도중에 **또 닫으면** 세대가 올라 앞 offC 가 무력해진다 = 가드가 «닫힘» 에만 걸려 있다.
     같은 자리에서 «다시 열림» 은 세대를 한 칸도 못 올린다. */
  console.log('\n── [3] `__jzGen` 은 «다시 열림» 을 안 센다 ──');
  await reset();
  await page.evaluate(() => { goTab('hero'); heroSubGo('sk'); });
  await page.waitForTimeout(500);
  const gen = await page.evaluate(async () => {
    const el = document.getElementById('panel');
    panelOpen = false; syncPanel();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const g0 = el.__jzGen || 0;
    goTab('hero'); heroSubGo('pet');                      /* 다시 «열었다» */
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { g0, g1: el.__jzGen || 0, busy: !!el.__jzBusy };
  });
  console.log('  닫힘 연출 세대 ' + gen.g0 + ' → 다시 연 뒤 ' + gen.g1 + '  (busy=' + gen.busy + ')');
  ok(gen.g1 === gen.g0,
     '★ [3] 다시 열어도 세대가 그대로다 — 세대 가드는 «또 닫힐 때» 전용이다(가설 ⓑ 확인)',
     gen.g0 + ' → ' + gen.g1);
  ok(gen.busy === true,
     '[3-b] 그 사이 `__jzBusy` 가 서 있어 MutationObserver 가 «다시 열림» 자체를 **한 번도 안 본다**',
     'busy=' + gen.busy);

  /* ── [4] ⓓ 사용자 도달성 — «손가락 몇 번이 창 안에 들어가는가» ─────────────
     #panel 을 «연출과 함께» 닫는 경로는 탭바뿐이다(서브탭 전환은 jzHush 라 연출이 없다).
     다시 여는 경로는 둘이고 **길이가 다르다**:
       · 탭바로 다시 열기 = 손가락 **3번**(영웅 ✕ → 영웅 → 서브탭. 159 가 여는 순간 장비로 리셋한다)
       · 가이드 미션 배너(`#tuto` → gmGo → gmHero) = 손가락 **2번**  ← 최단 경로
     둘 다 실제 클릭으로 재고, 창 폭은 [4-c] 가 따로 잰다. */
  console.log('\n── [4] 사용자 도달성 — 실제 클릭 ──');

  /* 최단 경로를 재려면 배너가 «영웅으로 보내는 미션» 이어야 한다. GUIDE 에서 그 미션을 찾아 세운다.
     ⚠ **완료된 미션을 세우면 안 된다** — `gmGo()` 는 `gmReady()` 면 이동이 아니라 **수령**을 한다
     (부팅 세이브는 스킬이 이미 장착돼 있어 이 미션이 처음부터 완료 상태였고, 그래서 1회차에
     «10칸 전부 안 열림» 이 나왔다). 목표를 비워 «미완» 으로 만든 뒤에 세운다. */
  const gmOk = await page.evaluate(() => {
    const i = GUIDE.findIndex(m => m.n === '스킬 장착하기');
    if (i < 0) return false;
    S.eqSkill = [];                       /* 미완으로 되돌린다 — 그래야 배너가 «이동» 을 한다 */
    S.guide.idx = i; gmStart(); uiDirty = true; renderUI();
    return !gmReady() && typeof (gmCur() || {}).go === 'function';
  });
  const two = [];
  if (gmOk) {
    for (const d of [0, 20, 40, 60, 80, 100, 130, 160, 200, 300]) {
      await reset();
      await page.evaluate(() => { goTab('hero'); heroSubGo('sk'); });
      await page.waitForTimeout(420);
      await page.click('#tabbar .tab[data-t="hero"]');       /* 손가락 ① — ✕ 칸(닫기) */
      if (d) await page.waitForTimeout(d);
      await page.click('#tuto');                             /* 손가락 ② — 가이드 미션 배너 */
      await page.waitForTimeout(500);
      const s = await page.evaluate(() => window.__pnl());
      two.push({ d, h: s.h, body: s.body });
      console.log('  2탭 · 지연 ' + String(d).padStart(3) + 'ms : h=' + px(s.h) + (s.h === 0 ? '   ← 0×0' : ''));
    }
  }
  const bad2 = two.filter(r => r.h === 0 && r.body);
  /* ★ 여기가 이 자의 «기각» 이다 — 등재문이 재라고 한 축의 답은 **«손가락으로는 안 난다»** 였다.
     뿌리는 기하다: 닫히는 시트(`#panel` 하단 1484px)가 **배너 자신을 덮고 있다**(#tuto y=1779).
     연출이 도는 동안 그 탭은 시트가 먹으므로, 창 안에서 배너를 누르는 것 자체가 불가능하다.
     ⇒ 이 결함은 «빠른 두 번 탭» 이 아니라 **코드가 닫자마자 여는 경로**에서 난다(아래 [4-d]). */
  ok(gmOk && bad2.length === 0,
     '★ [4-a] 실제 손가락 2탭(✕ → 가이드 미션 배너)으로는 **안 난다** — 닫히는 시트가 배너를 덮어 그 탭이 창 안에 못 들어간다',
     gmOk ? '10칸 전부 정상(0×0 ' + bad2.length + '건) · 시트 하단 1484 가 배너 y=1779 를 덮는다'
          : '가이드 미션 «스킬 장착하기» 를 못 세웠다(완료 상태면 배너는 이동이 아니라 수령을 한다)');

  /* 탭바 경로(손가락 3번 — 영웅 ✕ → 영웅 → 서브탭)도 재 본다. 탭바는 안 덮이지만 «세 번» 이 창보다 길다. */
  const three = [];
  for (const d of [0, 40, 80]) {
    await reset();
    await page.evaluate(() => { goTab('hero'); heroSubGo('sk'); });
    await page.waitForTimeout(420);
    await page.click('#tabbar .tab[data-t="hero"]');
    if (d) await page.waitForTimeout(d);
    await page.click('#tabbar .tab[data-t="hero"]');
    await page.evaluate(() => heroSubGo('pet'));
    await page.waitForTimeout(450);
    const s = await page.evaluate(() => window.__pnl());
    three.push({ d, h: s.h });
  }
  console.log('  3탭(탭바) : ' + three.map(r => r.d + 'ms=' + (r.h === 0 ? '0×0' : 'ok')).join(' · '));
  ok(three.every(r => r.h > 0),
     '[4-b] 탭바 3탭 경로도 안 난다 — 창(≈140ms)보다 손가락 세 번이 길다',
     three.map(r => r.d + 'ms h=' + px(r.h)).join(' · '));

  /* [4-c] 창 폭 — 손가락 수와 무관한 «순수한» 값. 재열기를 프로그램으로 넣어 경계를 훑는다. */
  const win = [];
  for (const d of [0, 40, 80, 110, 140, 170, 200, 260]) {
    await reset();
    await page.evaluate(() => { goTab('hero'); heroSubGo('sk'); });
    await page.waitForTimeout(420);
    await page.evaluate(async (ms) => {
      panelOpen = false; syncPanel();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (ms) await new Promise(r => setTimeout(r, ms));
      goTab('hero'); heroSubGo('pet');
    }, d);
    await page.waitForTimeout(500);
    const s = await page.evaluate(() => window.__pnl());
    win.push({ d, h: s.h });
  }
  console.log('  창 폭 스윕 : ' + win.map(r => r.d + 'ms=' + (r.h === 0 ? '0×0' : 'ok')).join(' · '));
  const winBad = win.filter(r => r.h === 0);
  ok(winBad.length > 0 && win[win.length - 1].h > 0,
     '★ [4-c] 그러나 **코드가 여는 경로에서는 100% 난다** — 창은 «닫힘 연출이 도는 동안» 이고 상수가 아니라 연출 길이가 정한다',
     '0×0 인 지연 ' + winBad.map(r => r.d).join('/') + 'ms · 마지막 260ms 는 멀쩡');
  /* [4-d] 그 «코드가 여는 경로» 는 가정이 아니다 — 저장소의 자 하나가 실제로 여기에 걸려 있었다. */
  const v51 = require('fs').readFileSync(path.resolve(__dirname, '..', 'verify51.js'), 'utf8');
  ok(/410 이 그 대기를 걷어냈다/.test(v51),
     '[4-d] 실제로 걸린 자리가 있다 — `verify51.js` [2차] 가 이 결함 때문에 «250ms 대기» 로 비켜 가 있었다(410 이 그 대기를 걷어냈다)',
     /410 이 그 대기를 걷어냈다/.test(v51) ? '대기 제거됨 — 이제 그 절이 410 의 회귀를 잡는다' : 'verify51 이 아직 250ms 로 비켜 간다');

  /* ── [5] ⓔ 노출 범위 — inline display 로 여닫는 오버레이는 몇 개인가 ────────
     이것이 처방의 크기를 정한다. `offC` 는 «닫을 때의 inline 값» 을 되돌리므로,
     inline 이 '' 인 오버레이(클래스로 여닫는 것)는 되돌려도 아무 일이 없다. */
  console.log('\n── [5] 노출 범위 — 22개 오버레이의 «보일 때 display» 와 여닫는 손잡이 ──');
  const scope = await page.evaluate(() => {
    const out = [];
    for (const id of JZ_OVID) {
      const el = document.getElementById(id);
      if (!el) continue;
      out.push({ id, inl: el.style.display, disp: getComputedStyle(el).display });
    }
    return out;
  });
  const inlIds = scope.filter(s => s.inl !== '').map(s => s.id);
  console.log('  inline display 를 쓰는 오버레이 : ' + (inlIds.length ? inlIds.join(', ') : '없음'));
  ok(inlIds.length === 1 && inlIds[0] === 'panel',
     '★ [5] inline display 로 여닫는 오버레이는 **`#panel` 하나**다 — 결함이 사는 자리도 하나다',
     inlIds.join(', ') + ' (' + inlIds.length + '/' + scope.length + ')');

  /* «보일 때의 display» 값 목록 — 처방이 클래스로 그 값을 대신 세우려면 이 집합을 덮어야 한다. */
  const seen = {};
  await page.evaluate(() => { panelOpen = false; syncPanel(); });
  await page.waitForTimeout(300);
  for (const id of ['panel', 'modal', 'dunw', 'shopw', 'trw', 'eqw', 'ciw', 'psw', 'chw', 'relw', 'sumw', 'statw']) {
    const d = await page.evaluate(i => {
      const el = document.getElementById(i); if (!el) return null;
      const prev = el.style.display, pc = el.className;
      el.style.display = '';                 /* 규칙이 정하는 값을 본다 */
      el.classList.add('on');
      const d = getComputedStyle(el).display;
      el.className = pc; el.style.display = prev;
      return d;
    }, id);
    if (d) seen[d] = (seen[d] || 0) + 1;
  }
  console.log('  «떠 있을 때» display 값 분포 : ' + Object.entries(seen).map(([k, v]) => k + '×' + v).join(' · '));
  ok(Object.keys(seen).every(d => ['flex', 'block', 'grid'].includes(d)),
     '[5-b] 그 값은 flex·block·grid 안에 있다 — 클래스 세 개로 덮을 수 있다',
     Object.keys(seen).join(', '));

  ok(errs.length === 0, '[6] 콘솔 에러 0건', errs.length ? errs[0] : '0건');

  console.log('\nPROBE410 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
