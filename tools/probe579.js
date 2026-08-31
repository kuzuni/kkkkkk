#!/usr/bin/env node
/* 작업 579 — 「대조군 23 훈련 카드의 `jz-dn`(누름 축소)이 488 `jz-hb`(맥박)에 캐스케이드로 진다」 **재현**
 * (338 규칙 — 처방을 따르기 전에 제품에게 먼저 묻는다. 338·341 은 등재문 가설이 기각됐던 자리다.)
 *
 *   node tools/probe579.js
 *
 * 등재문은 491 8회차 계측에서 «클래스는 `tr-card jz-dn fx-hit jz-hb` 인데
 * `getComputedStyle(card).scale` 이 `none`» 을 봤다고 적었다. 그 한 표본은 «어느 순간» 이지
 * «얼마나» 가 아니다. 이 재현이 가르는 것은 셋이다 — 셋을 한 항으로 묶으면 처방을 못 고른다:
 *   ⓐ **캐스케이드가 정말 하나만 고르는가**(둘 다 `animation` 단축이면 뒤가 이긴다)
 *   ⓑ **홀드가 도는 동안 몇 %의 프레임에서 누름이 사라지는가**(«한 표본» 이 아니라 듀티 사이클)
 *   ⓒ **화면에서 실제로 안 줄어드는가**(computed 값이 아니라 **실측 bbox 비** — 350·491 처방)
 *
 * 층:
 *   [A] 소스   — `.jz-dn`·`.jz-hb`·`.jz-hbx`·`.jz-up` 이 각각 `animation` 단축인가 · 선언 순서
 *   [B] 정적   — 훈련 카드에 두 클래스를 **손으로** 붙여 승자·`scale`·bbox 비를 잰다(위상 없는 자)
 *   [C] 실동작 — 진짜 pointerdown 홀드 1.3초를 rAF 로 전수 표본 → «누름이 살아 있는 프레임 %»
 *   [D] 대조   — 룬 [강화] 버튼(«누른 것 ≠ 호스트» — 맥박은 카드가 받는다)에 같은 자를 댄다
 *   [E] 뗌     — pointerup 뒤 `jzUp` 스프링이 제때 도는가(맥박이 그 자리도 먹는다면 여기서 보인다)
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
/* `P579_SRC=<파일>` 로 다른 판본(수리 전 사본 등)을 겨눌 수 있다 — «수리 전/뒤» 를 같은 자로 잰다 */
const SRC_FILE = process.env.P579_SRC ? path.resolve(process.env.P579_SRC) : path.join(ROOT, 'index.html');
const URL = 'file://' + SRC_FILE.replace(/\\/g, '/');
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? '  ok  ' : 'FAIL  ') + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const p2 = n => Math.round(n * 100) / 100;
const p4 = n => Math.round(n * 10000) / 10000;

/* 카드 한 장을 홀드하며 rAF 로 전수 표본을 모은다(왕복 evaluate 로는 위상을 못 잡는다) */
async function holdSample(page, sel, ms, tail) {
  tail = tail || 500;
  const rest = await page.evaluate(s => {
    const el = document.querySelector(s); if (!el) return null;
    const r = (typeof jzRestRect === 'function') ? jzRestRect(el) : el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, sel);
  if (!rest) return null;
  const cx = rest.x + rest.w / 2, cy = rest.y + rest.h / 2;
  await page.evaluate(([s, ms]) => {
    window.__s579 = [];
    const t0 = window.__t579 = performance.now();
    const tick = () => {
      const el = document.querySelector(s);
      const t = performance.now() - t0;
      if (el) {
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        window.__s579.push({ t, cls: el.className, an: cs.animationName, sc: cs.scale,
                             tf: cs.transform, fil: cs.filter, w: r.width, h: r.height, y: r.y });
      }
      if (t < ms) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [sel, ms + tail]);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  const upAt = await page.evaluate(() => performance.now() - window.__t579);
  await page.mouse.up();
  await page.waitForTimeout(tail + 120);
  const s = await page.evaluate(() => window.__s579);
  return { rest, s, upAt };
}

/* 표본 한 줄이 «눌려 있는가» — **누름의 값이 그 프레임에 실제로 적용됐는가**를 축으로 삼는다.
   ⚠ 폭 비를 축으로 쓰면 안 된다(1회차에 그렇게 썼다가 잘못 읽었다): 누름은 이제 맥박(`transform`
     scale 1.02)·첫 발 팝(`fx-hit` 1.05)과 **곱해지므로**, 제대로 눌린 프레임의 폭 비가
     .94×1.05 = **0.987** 까지 올라간다. «폭이 안 줄었다» 와 «누름이 사라졌다» 는 다른 말이다.
   ⇒ computed `scale` 이 누름 값(.94)을 들고 있는가로 묻는다 — 등재문이 본 증상(`scale: none`)의
     정확한 반대말이고, 다른 어휘의 배율과 무관하다. 폭 비는 표에 같이 찍어 눈으로 검산한다. */
const isDown = row => row.sc && row.sc !== 'none' && parseFloat(row.sc) <= 0.96;

(async () => {
  const src = fs.readFileSync(SRC_FILE, 'utf8');
  if (SRC_FILE !== path.join(ROOT, 'index.html')) console.log('[i] 판본: ' + SRC_FILE);
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);

  /* ── [A] 소스 층 — 누가 `animation` 단축을 쓰는가 ─────────────────────────── */
  console.log('\n[A] 소스 — 같은 노드에 얹히는 부품 중 `animation` 단축을 쓰는 것');
  const RULES = [
    { k: 'jz-dn',  re: /\.jz-dn\{([^}]*)\}/,  n: '누름(60)' },
    { k: 'jz-up',  re: /\.jz-up\{([^}]*)\}/,  n: '뗌 스프링(60)' },
    { k: 'jz-hb',  re: /\.jz-hb\{([^}]*)\}/,  n: '회당 맥박·성공(488)' },
    { k: 'jz-hbx', re: /\.jz-hbx\{([^}]*)\}/, n: '회당 맥박·실패(488)' },
    { k: 'jz-hdn', re: /\.jz-hdn\{([^}]*)\}/, n: '호스트 눌림(491 7회차)' },
  ];
  const decl = {};
  for (const r of RULES) {
    const m = src.match(r.re);
    const body = m ? m[1] : null;
    const at = m ? src.slice(0, m.index).split('\n').length : 0;
    decl[r.k] = { body, at, anim: !!(body && /(^|;)\s*animation:/.test(body)) };
    console.log('  .' + r.k.padEnd(7) + ' @' + String(at).padEnd(6)
      + (decl[r.k].anim ? 'animation 단축' : '정적 값       ') + '  ' + (body || '(없음)').slice(0, 62)
      + '   ' + r.n);
  }
  ok(decl['jz-hb'].anim && decl['jz-hbx'].anim && decl['jz-hb'].at > decl['jz-dn'].at,
     '[A-a] 전제 — 맥박 둘은 `animation` 단축이고 `.jz-dn` 보다 **뒤에** 선언된다(같은 특이성 0,1,0)',
     'jz-dn @' + decl['jz-dn'].at + ' < jz-hb @' + decl['jz-hb'].at);
  ok(!decl['jz-dn'].anim,
     '[A-b] ★ `.jz-dn` 은 `animation` 단축을 **안 쓴다** — 그 자리는 488 맥박의 임자다',
     decl['jz-dn'].body || '(없음)');
  ok(!decl['jz-hdn'].anim,
     '[A-c] 491 7회차가 같은 병을 겪은 `.jz-hdn` 은 **정적 값**으로 갈아 놨다(선례)',
     decl['jz-hdn'].body || '(없음)');

  /* ── 상태: 23 훈련 팝업을 열고 «지금 살 수 있게» ─────────────────────────── */
  await page.evaluate(() => {
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6; S.tstone = 1e6;
    openTrain(); setTrSub('train'); renderTrain();
  });
  await page.waitForTimeout(400);

  /* ── [B] 정적 층 — 위상을 없애고 캐스케이드만 묻는다 ─────────────────────── */
  console.log('\n[B] 정적 — 훈련 카드에 클래스를 손으로 붙여 «승자» 를 묻는다 (위상 없음)');
  const B = await page.evaluate(() => {
    const el = document.querySelector('#trCards [data-tr]'); if (!el) return null;
    const read = () => { const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      return { an: cs.animationName, sc: cs.scale, tf: cs.transform, w: r.width }; };
    el.classList.remove('jz-dn', 'jz-hb', 'jz-hbx');
    const rest = read();
    el.classList.add('jz-dn');
    return new Promise(res => setTimeout(() => {
      const dn = read();
      el.classList.add('jz-hb');
      const both = read();
      el.classList.remove('jz-hb'); el.classList.add('jz-hbx');
      const bothx = read();
      el.classList.remove('jz-dn', 'jz-hb', 'jz-hbx');
      res({ rest, dn, both, bothx });
    }, 140));                                     /* 램프(0.06s)가 끝난 뒤에 읽는다 — 위상 제거 */
  });
  if (!B) { ok(false, '[B] 훈련 카드를 못 찾았다'); }
  else {
    const row = (n, o) => console.log('  ' + n.padEnd(18) + 'animationName=' + String(o.an).padEnd(10)
      + ' scale=' + String(o.sc).padEnd(6) + ' w=' + p2(o.w).toString().padEnd(8)
      + '×' + p4(o.w / B.rest.w));
    row('rest', B.rest); row('+jz-dn', B.dn); row('+jz-dn+jz-hb', B.both); row('+jz-dn+jz-hbx', B.bothx);
    ok(Math.abs(B.dn.w / B.rest.w - 0.94) < 0.01,
       '[B-a] 전제 — `jz-dn` 하나면 폭이 .94 배다',
       'an=' + B.dn.an + ' scale=' + B.dn.sc + ' ×' + p4(B.dn.w / B.rest.w));
    ok(B.both.sc !== 'none' && Math.abs(B.both.w / B.rest.w - 0.94 * 1.02) < 0.01,
       '[B-b] ★★ 맥박을 같이 붙여도 누름이 산다 — `scale`(.94)과 맥박 `transform`(1.02)이 **곱해진다**',
       'an=' + B.both.an + ' scale=' + B.both.sc + ' ×' + p4(B.both.w / B.rest.w));
    ok(B.bothx.sc !== 'none' && Math.abs(B.bothx.w / B.rest.w - 0.94) < 0.01,
       '[B-c] ★ 실패 맥박(`jz-hbx`, 가로 −10px)과 겹쳐도 누름 폭은 .94 그대로다',
       'an=' + B.bothx.an + ' scale=' + B.bothx.sc + ' ×' + p4(B.bothx.w / B.rest.w));
  }

  /* ── [C] 실동작 층 — 홀드 1.3초 전수 표본 ────────────────────────────────── */
  console.log('\n[C] 실동작 — 훈련 카드 홀드 1.3초 (rAF 전수 표본 · 실측 bbox 비)');
  const C = await holdSample(page, '#trCards [data-tr]', 1300);
  if (!C) ok(false, '[C] 훈련 카드 홀드 표본을 못 얻었다');
  else {
    const s = C.s, restW = C.rest.w;
    /* ⚠ 램프 구간은 빼고 센다 — 누름은 종전 애니(0.06s)와 같은 길이로 «들어가는» 중이고,
       그 두어 프레임은 수리 전에도 뒤에도 .94 가 아니다(대조군 [D] 도 같은 값이 빠진다).
       램프의 끝(120ms)부터가 «누르고 있는 동안» 이다. */
    const RAMP = 100;                                     /* 램프 0.06s + rAF 두 프레임 여유 */
    const t0dn = (s.find(r => /(^| )jz-dn( |$)/.test(r.cls)) || { t: 0 }).t;
    const dnCls = s.filter(r => /(^| )jz-dn( |$)/.test(r.cls) && r.t >= t0dn + RAMP);
    const down = dnCls.filter(isDown);
    const hb = dnCls.filter(r => /(^| )jz-hb(x)?( |$)/.test(r.cls));
    const dutyAll = dnCls.length ? down.length / dnCls.length * 100 : 0;
    const hbDown = hb.filter(isDown);
    const miss = dnCls.filter(r => !isDown(r));
    if (miss.length) console.log('  ↯ 누름이 빠진 프레임: '
      + miss.slice(0, 6).map(r => Math.round(r.t) + 'ms(scale=' + r.sc + ' an=' + r.an + ')').join(' · '));
    console.log('  표본 ' + s.length + '장 · `jz-dn` 이 붙은 프레임 ' + dnCls.length
      + '장 · 그중 맥박(`jz-hb`/`jz-hbx`)이 같이 붙은 프레임 ' + hb.length + '장');
    console.log('  폭 비 최소 ' + p4(Math.min(...s.map(r => r.w)) / restW)
      + ' · 최대 ' + p4(Math.max(...s.map(r => r.w)) / restW) + ' (rest ' + p2(restW) + 'px)');
    /* 20 표본만 눈으로 — 위상이 보인다 */
    console.log('  t(ms)  누름 맥박  animationName  scale    폭비');
    for (const r of s.filter((_, i) => i % Math.max(1, Math.floor(s.length / 18)) === 0)) {
      console.log('  ' + String(Math.round(r.t)).padStart(5)
        + '   ' + (/(^| )jz-dn( |$)/.test(r.cls) ? 'O' : '·')
        + '   ' + (/(^| )jz-hb(x)?( |$)/.test(r.cls) ? 'O' : '·')
        + '    ' + String(r.an).padEnd(14) + String(r.sc).padEnd(8) + p4(r.w / restW));
    }
    ok(dnCls.length > 10, '[C-a] 홀드 동안 `jz-dn` 클래스는 계속 붙어 있다(«클래스는 있다»)',
       dnCls.length + '/' + s.length + '장');
    ok(hb.length > 0, '[C-b] 그 프레임 중 상당수에 488 맥박이 겹친다', hb.length + '장');
    ok(hb.length ? hbDown.length === hb.length : false,
       '[C-c] ★★ 맥박이 겹친 프레임도 **전부** 누름 값(scale .94)을 들고 있다',
       hbDown.length + '/' + hb.length + '장이 눌림');
    console.log('  ⇒ 「누름이 살아 있는 프레임」 ' + p2(dutyAll) + '% (' + down.length + '/' + dnCls.length + ')');
    ok(dutyAll >= 99, '[C-d] ★ 램프 뒤 홀드 내내 누름이 살아 있다(100% · 수리 전 11.1%)',
       p2(dutyAll) + '%');
  }

  /* ── [D] 대조 — 누른 것 ≠ 호스트(룬 [강화] 버튼) ─────────────────────────── */
  console.log('\n[D] 대조 — 룬 [강화] 버튼(맥박은 카드 `.tr-rn` 이 받는다)');
  await page.evaluate(() => { setTrSub('rune'); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain(); });
  await page.waitForTimeout(420);
  const D = await holdSample(page, '#trRunes .rbt.b1', 1300);
  if (!D) ok(false, '[D] 룬 [강화] 버튼 표본을 못 얻었다');
  else {
    const s = D.s, restW = D.rest.w;
    const t0dn = (s.find(r => /(^| )jz-dn( |$)/.test(r.cls)) || { t: 0 }).t;
    const dnCls = s.filter(r => /(^| )jz-dn( |$)/.test(r.cls) && r.t >= t0dn + 100);
    const down = dnCls.filter(isDown);
    const duty = dnCls.length ? down.length / dnCls.length * 100 : 0;
    console.log('  표본 ' + s.length + '장 · `jz-dn` ' + dnCls.length + '장 · 누름이 살아 있는 프레임 '
      + p2(duty) + '% · 폭비 최소 ' + p4(Math.min(...s.map(r => r.w)) / restW));
    ok(duty >= 99, '[D-a] 대조 — 맥박을 안 받는 버튼은 수리 전에도 뒤에도 누름이 유지된다',
       p2(duty) + '%');
  }

  /* ── [E] 뗌 — 스프링이 제때 도는가 ([C] 표본의 «뗀 뒤» 꼬리를 읽는다) ─────── */
  console.log('\n[E] 뗌 — 훈련 카드에서 손을 뗀 뒤 `jzUp`(1.04 오버슈트) 스프링');
  if (C) {
    const tail = C.s.filter(r => r.t >= C.upAt);
    const up = tail.filter(r => /(^| )jz-up( |$)/.test(r.cls));
    const upAnim = up.filter(r => r.an === 'jzUp');
    const restW = C.rest.w;
    const over = tail.filter(r => r.w / restW > 1.005);
    console.log('  뗀 뒤 표본 ' + tail.length + '장 · `jz-up` 클래스 ' + up.length
      + '장 · 그중 `jzUp` 가 실제로 도는 프레임 ' + upAnim.length + '장'
      + ' · 1.005배를 넘는(오버슈트) 프레임 ' + over.length + '장');
    if (up.length) {
      const lost = up.filter(r => r.an !== 'jzUp');
      console.log('  ⇒ `jz-up` 이 붙었는데 `jzUp` 가 **안 도는** 프레임 ' + lost.length + '장'
        + (lost.length ? ' (승자: ' + [...new Set(lost.map(r => r.an))].join(',') + ')' : ''));
      ok(lost.length === 0, '[E-a] ★ 뗌 스프링이 맥박에 안 진다 — `jz-up` 프레임의 승자는 전부 `jzUp`',
         lost.length + '/' + up.length + '장이 밀림');
    } else ok(false, '[E-a] 뗀 뒤 `jz-up` 표본이 0장', '표본 ' + tail.length + '장');
  }

  console.log('\n[Z] 콘솔 에러 ' + errs.length + '건' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  ok(errs.length === 0, '[Z] 재현 중 콘솔 에러 0');

  console.log('\nPROBE579 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
