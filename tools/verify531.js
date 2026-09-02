#!/usr/bin/env node
/* 게이트 531 — 「레드닷을 **놓는 순간** 상시 점등이 되는 자리가 없다」 (2026-08-31)
 *
 *   node tools/verify531.js
 *
 * 166 ⓔ · 202 §3 · 283 · 294 · 325 · 516 · 519 로 일곱 번 난 계열이다. 앞의 일곱은 전부
 * «사고가 난 뒤» 짝 두 줄로 닫았고, 그 사이 워커 한 세션씩을 태웠다. 이 자는 사고를 **먼저** 잡는다.
 *
 * ⚑ 이 자의 핵심은 «무엇을 재는가» 다 — 함정을 **셀렉터 모양**으로 세면 두 쪽으로 틀린다
 *   (`tools/probe531.js` 가 `scan519 [2]` 대비 허수 12 · 누락 12 를 찍었다). 그래서 여기서는
 *   `#app` 안 id 요소마다 **진짜 닷(`<s class="updot">` …)을 심어 보고 display 를 읽는다.**
 *   심는 자리가 곧 «다음 워커가 닷을 놓을 자리» 이므로, 이 자가 초록이면 그 워커는 함정을 안 밟는다.
 *
 * 절 구성 — 넷이 서로를 받친다. 하나라도 빼면 헛초록이 난다:
 *   [A] 정적 — 짝이 «`<s>` 꼴 · `.alert` 축» 으로 적혀 있다
 *   [B] 심어서 잰 함정 0자리 (본체 · 래칫)
 *   [C] 무르게 풀지 않았다 — «노드를 만들거나 말거나» 로 켜는 살아 있는 닷은 그대로 보인다
 *   [R] 되돌림 — 짝을 걷으면 함정이 돌아오고, 짝을 «클래스 꼴» 로 적으면 상점 리본이 죽는다
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = 'file://' + path.join(ROOT, 'index.html');
const CODE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m + (d ? ' — ' + d : '')); };

/* 심어서 재는 자 — probe531 [1] 과 **같은 식**이다(자와 재현이 같은 눈금을 써야 대조가 선다).
   ⚠ 조상의 살아 있는 축(.alert 등)을 먼저 뗀다 — 안 떼면 «제 몫을 하는» 자리(#menub 우편 배지)가
     함정으로 오독된다. ⚠ 점등은 축이 «상자» 에 오는 꼴과 «화면 자신» 에 오는 꼴이 둘 다 있다.
   ⚠ 이 문자열 안에는 백틱을 쓰지 마라 — 템플릿 리터럴이 그 자리에서 끝난다. */
const PLANT = `(() => {
  const DOTS = [{ c:'updot', host:'' }, { c:'bdg', host:'stab' }, { c:'dot', host:'cltab' }];
  const GATE = ['alert','on','fresh','mnon'];
  const strip = el => {
    const undo = [];
    for (let n = el; n; n = n.parentElement)
      GATE.forEach(c => { if (n.classList && n.classList.contains(c)) { n.classList.remove(c); undo.push([n, c]); } });
    return () => undo.forEach(([n, c]) => n.classList.add(c));
  };
  const rows = [];
  /* 자식을 못 받는 요소는 건너뛴다 — <input> 같은 void/replaced 요소는 appendChild 가 통해도
     그 자식이 렌더 트리에 안 들어가서 getComputedStyle 이 늘 none 을 준다. 안 걸러 내면
     #chIn(채팅 입력칸)이 «.alert 를 붙여도 안 켜진다» 는 허수로 빨개진다. */
  const VOID = ['INPUT','IMG','CANVAS','BR','HR','TEXTAREA','SELECT','VIDEO','IFRAME','EMBED','OBJECT','SVG'];
  document.querySelectorAll('#app [id]').forEach(host => {
    if (VOID.indexOf(host.tagName) >= 0) return;
    const bad = [];
    const restore = strip(host);
    DOTS.forEach(({ c, host: hc }) => {
      const box = document.createElement('i');
      box.style.position = 'relative';
      if (hc) box.className = hc;
      const dot = document.createElement('s');
      dot.className = c;
      box.appendChild(dot); host.appendChild(box);
      const off = getComputedStyle(dot).display;
      box.classList.add('alert');
      let on = getComputedStyle(dot).display;
      if (on === 'none') {
        box.classList.remove('alert'); host.classList.add('alert');
        on = getComputedStyle(dot).display; host.classList.remove('alert');
      }
      /* 세 번째 축 — «지금 고른 탭»(.stab.on) 에 닷을 놓아도 켜지면 안 된다.
         .on 은 «선택» 이지 «알림» 이 아니다. 살아 있는 노드로는 못 잰다(짝 목록 안에는
         .alert 없이 .on 만 붙은 배지가 오늘 하나도 없다) — 그래서 여기서 심어서 잰다. */
      box.className = (hc ? hc + ' ' : '') + 'stab on';
      host.appendChild(box);
      const onAxis = getComputedStyle(dot).display;
      box.remove();
      if (off !== 'none') bad.push({ c, why: 'off:' + off });
      else if (on === 'none') bad.push({ c, why: 'on:none' });
      else if (onAxis !== 'none') bad.push({ c, why: 'onaxis:' + onAxis });
    });
    restore();
    if (bad.length) rows.push({ id: host.id, bad });
  });
  const ids = new Set(rows.map(r => r.id));
  rows.forEach(r => {
    let root = true;
    for (let n = document.getElementById(r.id).parentElement; n; n = n.parentElement)
      if (n.id && ids.has(n.id)) { root = false; break; }
    r.root = root;
  });
  return rows;
})`;

/* 살아 있는 닷 — «노드를 만들거나 말거나» 로 켜는 자리 두 종류. 짝을 무르게(넓게) 적으면 여기가 죽는다. */
const LIVE = `(async () => {
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const click = sel => { const n = document.querySelector(sel); if (!n) return false;
    n.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); n.click(); return true; };
  const out = { dun: 0, dunOn: 0, ribbon: 0, ribbonOn: 0, selTab: 0, selTabOn: 0 };

  /* 03 던전 — 341 카드 «입장 가능» 닷. .dnc .dot 은 display 선언이 아예 없고 노드 유무로 켠다. */
  click('.tab[data-t="adv"]'); for (let i = 0; i < 10; i++) await raf();
  for (const sub of ['raid', 'tower', 'dun']) {
    click('#dunSub [data-dsub="' + sub + '"]'); for (let i = 0; i < 10; i++) await raf();
    document.querySelectorAll('#dunList .dnc > s.dot').forEach(d => {
      out.dun++; if (getComputedStyle(d).display !== 'none') out.dunOn++;
    });
  }

  /* 10 상점 «패스» — 배너 리본은 <div class=bdg> 로, 레드닷과 **클래스 이름만** 같은 다른 부품이다 */
  if (typeof closeAllModals === 'function') { try { closeAllModals(); } catch (e) {} }
  click('.tab[data-t="shop"]'); for (let i = 0; i < 10; i++) await raf();
  click('#shopCats [data-cat="pass"]'); for (let i = 0; i < 12; i++) await raf();
  document.querySelectorAll('#shopList div.bdg').forEach(b => {
    out.ribbon++; if (getComputedStyle(b).display !== 'none') out.ribbonOn++;
  });

  /* 고른 서브탭(.stab.on) 의 배지는 «알림» 이 아니다 — .on 을 점등 축에 넣으면 여기가 켜진다.
     ⚠ 짝 목록 «안» 의 화면에서 재야 한다(#trw · #shopw). #dunw 는 목록 밖이라 아무 일도 안 일어난다. */
  const selCount = sel => document.querySelectorAll(sel).forEach(b => {
    if (b.parentElement.classList.contains('alert') || b.classList.contains('alert')) return;
    out.selTab++; if (getComputedStyle(b).display !== 'none') out.selTabOn++;
  });
  selCount('#shopCats .stab.on > s.bdg');
  click('.tab[data-t="grow"]'); for (let i = 0; i < 12; i++) await raf();
  selCount('#trSubs .stab.on > s.bdg');
  return out;
})`;

/* 824 — `#upCnt` 안에는 **살아 있는 `<s>`** 가 있다(782 «밀어서 더 보기», index.html 27574).
   짝을 `#upCnt s` 처럼 넓게 적으면 그 안내문이 통째로 꺼지므로, 리본([C2])과 같은 꼴의 «무르게
   풀지 않았다» 항이 하나 더 필요하다. 넘치는 판을 만들려고 세이브를 심고 버튼을 누르는 대신
   제품 함수(`openUpAll`)를 **직접** 부른다 — 재는 것은 «그 `<s>` 가 보이는가» 하나뿐이라
   경로가 짧을수록 자가 덜 흔들린다(783 «자는 자기 결함이 넷»).
   ⚠ 칸 수는 «넉넉히» 가 아니라 **넘치는 판**이어야 한다 — 2280 프레임에서 27칸(스킬 전종)은
     5행이 통째로 보여 `over` 가 거짓이고 그 안내문이 아예 안 그려진다(1차 실행이 «노드 없음»
     으로 빨갰다). 그래서 세 목록을 다 이어 붙인다(170칸 · sh 5211 > ch 1614). */
const UPNOTE = `(() => {
  const cat = [];
  if (typeof SKILLS !== 'undefined') cat.push(...SKILLS);
  if (typeof PETS !== 'undefined') cat.push(...PETS);
  if (typeof EQUIPS !== 'undefined') cat.push(...EQUIPS);
  const ups = cat.map(it => ({ it, from: 1, to: 2 }));
  const opened = typeof openUpAll === 'function' ? openUpAll(ups) : false;
  const cnt = document.getElementById('upCnt');
  const s = cnt && cnt.querySelector('s');
  return {
    opened, n: ups.length,
    many: !!(document.getElementById('upw') || {}).classList
       && document.getElementById('upw').classList.contains('many'),
    has: !!s, txt: (s && s.textContent) || '',
    disp: s ? getComputedStyle(s).display : 'none'
  };
})`;

async function open(browser, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  if (css !== undefined) {
    await page.addInitScript(c => addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style'); st.id = 'rev531'; st.textContent = c;
      document.head.appendChild(st);
    }), css);
  }
  await page.goto(SRC);
  await page.waitForFunction(() => typeof S !== 'undefined');
  await page.waitForTimeout(600);
  return { page, errs, ctx };
}

/* 짝을 «없애는» 되돌림 — 제품 규칙을 CSSOM 에서 지운다(파일은 안 건드린다) */
const KILL_PAIR = `(() => {
  let n = 0;
  for (const sh of document.styleSheets) {
    let rs; try { rs = sh.cssRules; } catch (e) { continue; }
    for (let i = rs.length - 1; i >= 0; i--) {
      const r = rs[i];
      if (r.selectorText && /s\\.updot,\\s*s\\.bdg,\\s*s\\.dot/.test(r.selectorText)) { sh.deleteRule(i); n++; }
    }
  }
  return n;
})`;

(async () => {
  const browser = await launch(chromium);
  console.log('\n=== verify531 — 「레드닷을 놓는 순간 상시 점등이 되는 자리가 없다」');

  /* ── [A] 정적 ─────────────────────────────────────────────────────────────── */
  const off = CODE.match(/:is\(#bSk[^)]*\)\s*:is\(s\.updot,s\.bdg,s\.dot\)\{display:none\}/);
  const on = CODE.match(/:is\(#bSk[^)]*\)\s*\.alert>:is\(s\.updot,s\.bdg,s\.dot\)\{display:block\}/);
  ok(!!off, '[A1] 짝의 «꺼짐» 줄이 있다 — `:is(<스코프>) :is(s.updot,s.bdg,s.dot){display:none}`');
  ok(!!on, '[A2] 짝의 «켜짐» 줄이 있다 — 같은 스코프 · `.alert>` 축');
  const ids = off ? (off[0].match(/#[\w-]+/g) || []) : [];
  /* 자리 수는 **자라도록 설계된 값**이다 — 새 화면이 «축 없이 켜지는» 재료를 들고 오면 [B1]·[B2] 가
     먼저 빨개지고, 그 id 를 짝에 더한 뒤 여기를 같이 올린다(824 에서 23 → 24 = `#upCnt`).
     그래서 이 항은 «몇 자리인가» 가 아니라 «[B] 가 고른 목록과 짝이 같은 것을 보는가» 를 묻는다. */
  ok(ids.length === 24, '[A3] 스코프 24자리 — probe531 [1] 이 «심어서» 고른 목록 (824: `#upCnt` 편입)', ids.length + '자리');
  ok(!/:is\([^)]*\)\s*:is\(\.updot/.test(CODE) && !/\.alert>:is\(\.updot,\.bdg/.test(CODE),
    '[A4] 짝을 **클래스 꼴**(`.bdg`)로 적지 않았다 — 상점 배너 리본 `<div class="bdg">` 을 안 건드리려면 `<s>` 꼴이어야 한다');
  ok(!/:is\(#bSk[^)]*\)\s*:is\(\.on|\.on>:is\(s\.updot/.test(CODE),
    '[A5] `.on` 을 점등 축으로 쓰지 않았다 — `.stab.on` 은 «고른 탭» 이지 «알림» 이 아니다');
  ok(!ids.includes('#dunw'),
    '[A6] `#dunw` 는 목록에 **없다** — 341 던전 카드 닷은 `display` 선언 없이 «노드 유무» 로 켜는 자리라 짝이 그것을 끈다');
  ok(ids.includes('#upCnt'),
    '[A7] `#upCnt` 는 목록에 **있다**(824) — 726 «총 N건 강화» 헤더의 `.upr-cnt s{display:inline-block}` 은 클래스 급이라 `.updot{display:none}` 을 이긴다');

  /* ── [B] 심어서 잰 함정 0자리 (본체) ────────────────────────────────────────── */
  const h = await open(browser);
  const rows = await h.page.evaluate(PLANT + '()');
  const roots = rows.filter(r => r.root);
  ok(rows.length === 0, '[B1] `#app` 안 id 요소 전수 — 닷을 심어도 «축 없이 켜지는» 자리 0',
    rows.length ? rows.slice(0, 6).map(r => '#' + r.id + '(' + r.bad.map(b => b.c + ' ' + b.why).join(',') + ')').join(' · ') : '0자리');
  ok(roots.length === 0, '[B2] 그중 root 0자리 (래칫 — 새 화면이 생겨도 여기가 늘면 빨강)', roots.length + '자리');

  /* 부팅 시점 «실제» 닷 노드도 축을 떼면 전부 꺼져 있어야 한다(scan519 [1] 을 게이트로 승격) */
  const boot = await h.page.evaluate(`(() => {
    const GATE = ['alert','on','fresh','off','lk','close','mnon'];
    let n = 0, bad = [];
    document.querySelectorAll('.updot, .bdg, s.dot').forEach(el => {
      if (el.tagName !== 'S') return;
      const undo = [];
      for (let m = el; m; m = m.parentElement)
        GATE.forEach(c => { if (m.classList && m.classList.contains(c)) { m.classList.remove(c); undo.push([m, c]); } });
      n++;
      if (getComputedStyle(el).display !== 'none') bad.push(el.className);
      undo.forEach(([m, c]) => m.classList.add(c));
    });
    return { n, bad };
  })()`);
  ok(boot.bad.length === 0, '[B3] 부팅 시점 `<s>` 레드닷 ' + boot.n + '개 — 축을 떼면 전부 꺼짐',
    boot.bad.slice(0, 4).join(' / ') || '0건');

  /* ── [C] 무르게 풀지 않았다 ──────────────────────────────────────────────────── */
  const live = await h.page.evaluate(LIVE + '()');
  ok(live.dun > 0 && live.dunOn === live.dun,
    '[C1] 341 던전 카드 «입장 가능» 닷은 그대로 보인다 (짝을 `#dunw` 까지 넓히면 여기가 꺼진다)',
    live.dunOn + '/' + live.dun + '개 보임');
  ok(live.ribbon > 0 && live.ribbonOn === live.ribbon,
    '[C2] 10 상점 배너 리본 `<div class="bdg">` 은 그대로 보인다 (짝을 클래스 꼴로 적으면 여기가 꺼진다)',
    live.ribbonOn + '/' + live.ribbon + '장 보임');
  const onAxisBad = rows.filter(r => r.bad.some(b => /^onaxis/.test(b.why)));
  ok(onAxisBad.length === 0,
    '[C3] «지금 고른 탭»(`.stab.on`) 에 닷을 심어도 안 켜진다 — `.on` 은 «선택» 이지 «알림» 이 아니다',
    onAxisBad.length + '자리');
  const note = await h.page.evaluate(UPNOTE + '()');
  ok(note.opened && note.has && /밀어서/.test(note.txt) && note.disp !== 'none',
    '[C4] `#upCnt` 의 «밀어서 더 보기» `<s>`(782)는 그대로 보인다 — 짝이 세 클래스만 집기 때문이다(824)',
    (note.has ? '"' + note.txt + '" display:' + note.disp : '노드 없음') + ' · ' + note.n + '칸');
  ok(h.errs.length === 0, '[X] 콘솔 에러 0건', h.errs.slice(0, 3).join(' / '));
  await h.ctx.close();

  /* ── [R] 되돌림 ─────────────────────────────────────────────────────────────── */
  const hR = await open(browser);
  const killed = await hR.page.evaluate(KILL_PAIR + '()');
  const revRows = await hR.page.evaluate(PLANT + '()');
  ok(killed === 2, '[R0] 되돌림 사본이 짝 두 줄을 실제로 지웠다', killed + '줄');
  ok(revRows.filter(r => r.root).length > 0,
    '[R1] 짝을 걷으면 함정이 **돌아온다** — 이 항이 «이미 참인 것을 굳힌 헛초록» 이 아님을 못박는다',
    revRows.filter(r => r.root).length + '자리 재발');
  await hR.ctx.close();

  /* R2 — 짝을 «클래스 꼴» 로 적은 사본: 상점 배너 리본이 죽는다(= `<s>` 꼴이 왜 필요한지) */
  const clsPair = ids.join(',');
  const hR2 = await open(browser,
    `:is(${clsPair}) :is(.updot,.bdg,s.dot){display:none}\n:is(${clsPair}) .alert>:is(.updot,.bdg,s.dot){display:block}`);
  const live2 = await hR2.page.evaluate(LIVE + '()');
  ok(live2.ribbon > 0 && live2.ribbonOn < live2.ribbon,
    '[R2] 짝을 **클래스 꼴**로 적은 사본에서는 상점 배너 리본이 꺼진다 — [A4]·[C2] 가 허수가 아니다',
    live2.ribbonOn + '/' + live2.ribbon + '장만 보임');
  await hR2.ctx.close();

  /* R3 — `.on` 을 점등 축에 넣은 사본: 고른 서브탭 배지가 켜진다.
     ⚠ 여기가 **특이성 한 칸**에 걸린다 — `:is(.alert,.on)>…`(1,2,1) 이라야 `#trw .stab>.bdg`(1,2,0) 를
     이긴다. `:is(.on)>…`(1,1,1) 로 적으면 아무 일도 안 일어나 이 되돌림이 헛초록이 된다(1차 실행). */
  const hR3 = await open(browser,
    `:is(${clsPair}) :is(.alert,.on)>:is(s.updot,s.bdg,s.dot){display:block}`);
  const rows3 = await hR3.page.evaluate(PLANT + '()');
  const bad3 = rows3.filter(r => r.bad.some(b => /^onaxis/.test(b.why)));
  ok(bad3.length > 0,
    '[R3] `.on` 을 점등 축에 넣은 사본에서는 «고른 탭» 에 심은 닷이 켜진다 — [A5]·[C3] 가 허수가 아니다',
    bad3.length + '자리 점등');
  await hR3.ctx.close();

  /* R4 — **등재문 처방 ⓐ 를 적힌 그대로** 적용한 사본: 짝 목록에 `#dunw` 가 들어간다
     (`scan519 [2]` 가 모양으로 골라 준 23자리에 그것이 있다). 341 던전 카드 닷이 꺼진다. */
  const hR4 = await open(browser,
    `:is(${clsPair},#dunw) :is(s.updot,s.bdg,s.dot){display:none}\n`
    + `:is(${clsPair},#dunw) .alert>:is(s.updot,s.bdg,s.dot){display:block}`);
  const live4 = await hR4.page.evaluate(LIVE + '()');
  ok(live4.dun > 0 && live4.dunOn === 0,
    '[R4] 등재문 처방 ⓐ 대로 `#dunw` 까지 넓힌 사본에서는 341 던전 카드 닷이 **전부 꺼진다** — [A6]·[C1] 가 허수가 아니다',
    live4.dunOn + '/' + live4.dun + '개만 보임');
  await hR4.ctx.close();

  /* R5 — 824 의 짝을 «태그 꼴»(`#upCnt s`)로 넓게 적은 사본: 782 안내문이 꺼진다.
     [C4] 가 «이미 참인 것을 굳힌 헛초록» 이 아님을 못박는다 — [R2]([A4] 클래스 꼴)와 같은 짝이다.
     ⚠ 특이성 — 주입한 `#upCnt s`(1,0,1) 는 `.upr-cnt s`(0,1,1) 를 이긴다. */
  const hR5 = await open(browser,
    `:is(${clsPair}) s{display:none}\n:is(${clsPair}) .alert>s{display:block}`);
  const note5 = await hR5.page.evaluate(UPNOTE + '()');
  ok(note5.has && note5.disp === 'none',
    '[R5] 짝을 **태그 꼴**(`#upCnt s`)로 넓힌 사본에서는 «밀어서 더 보기» 가 꺼진다 — [C4] 가 허수가 아니다',
    (note5.has ? 'display:' + note5.disp : '노드 없음'));
  await hR5.ctx.close();

  await browser.close();
  console.log('\nVERIFY531 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
