#!/usr/bin/env node
/* 717 게이트 — 103 채팅 리스트에 등장 애니가 **0건**이어야 한다
 *              (주인 지시 2026-09-02 03:40 «다 안뜨게 해줘야함 애니메이션»)
 *
 *   node tools/verify717.js
 *
 * ⚑ 이 자가 지키는 것은 두 가지다 — 하나만 지키면 다음 분기에 되살아난다:
 *   ① 채팅 줄에는 등장 애니가 **안 붙는다**(열기 · 새 메시지 유입 · 스크롤 · 재개폐 전 구간)
 *   ② 그러나 부품(`jzStagger`/`jzStagGo`/`@keyframes jzSt`)은 **살아 있다** — 카드 격자 여럿이
 *      그대로 쓰므로 호출부만 뗀 것이다(659 규약). 부품째 지우면 [F] 가 빨개진다.
 *
 * ⚠ 자는 «클래스 이름» 이 아니라 **실제로 등록된 애니메이션**(`Element.getAnimations()`)과
 *   **0~800ms 전 구간의 계산값**(opacity·scale)을 같이 센다. 이름만 세면 다른 이름의 등장
 *   연출이 얹혔을 때 헛초록이 된다(LESSONS 60-3 «이름 충돌»).
 * ⚠ §R 되돌림 시험이 이 자의 안전핀이다 — `jz-x` 표시를 떼면 스태거가 **되살아나야** 한다.
 *   안 되살아나면 [B]~[D] 는 «이미 참인 것» 을 굳힌 헛초록이다(338 교훈).
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const URL = 'file://' + path.join(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const open = async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof openChat === 'function' && typeof chSend === 'function'
    && document.getElementById('chList'));
  await page.waitForTimeout(1200);            /* 부팅 전이가 가라앉은 뒤에 연다(350 교훈) */
  return { page, errs };
};

/* 브라우저 안에서 «전 구간 전이» 를 세는 공용 조각 — 문자열로 넘겨 여러 절이 같은 자를 쓴다 */
const SCAN = `async (ms) => {
  const kids = [...document.getElementById('chList').children];
  let anim = 0, moved = 0, minOp = 1, minSc = 1;
  for (const k of kids) anim += k.getAnimations().length;
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    for (const k of kids) {
      const cs = getComputedStyle(k);
      const op = parseFloat(cs.opacity);
      const sc = cs.scale === 'none' ? 1 : parseFloat(String(cs.scale).split(' ')[0]);
      const tr = cs.transform;
      if (op < minOp) minOp = op;
      if (sc < minSc) minSc = sc;
      if (op < 0.999 || Math.abs(sc - 1) > 0.001 || (tr && tr !== 'none' && tr !== 'matrix(1, 0, 0, 1, 0, 0)')) moved++;
      anim += k.getAnimations().length;
    }
    await new Promise(r => setTimeout(r, 40));
  }
  return { n: kids.length, anim, moved, minOp, minSc,
           jzd: kids.filter(k => k.style.getPropertyValue('--jzd')).length,
           jzx: kids.filter(k => k.classList.contains('jz-x')).length };
}`;

(async () => {
  /* ── [A] 선언(소스) ─────────────────────────────────────────────────────── */
  const row = /return '<div class="ch-row([^']*)'/.exec(SRC);
  ok(!!row && /\bjz-x\b/.test(row[1] || ''), '[A1] `chRowHTML` 이 줄마다 «손대지 마라» 표시 `jz-x` 를 단다',
     row ? '선언 «ch-row' + row[1] + '»' : 'chRowHTML 의 행 선언을 못 찾았다');

  /* ② 부품은 살아 있어야 한다 — 호출부만 뗀 것이다(659) */
  ok(/function jzStagger\s*\(/.test(SRC) && /function jzStagGo\s*\(/.test(SRC)
     && /@keyframes jzSt\{/.test(SRC) && /\.jz-st\{animation:jzSt/.test(SRC),
     '[A2] 부품 `jzStagger`/`jzStagGo`/`@keyframes jzSt`/`.jz-st` 는 그대로 살아 있다(부품째 지우지 않았다)',
     'jzStagger ' + /function jzStagger\s*\(/.test(SRC) + ' · jzStagGo ' + /function jzStagGo\s*\(/.test(SRC)
     + ' · keyframes ' + /@keyframes jzSt\{/.test(SRC));

  /* ③ 주인이 본 «하단 4개» 를 만든 상수 20 — 다른 격자의 예산이라 이 작업은 안 건드렸다.
        (채팅을 상수로 푸는 길은 «종수가 늘면 똑같이 잘린다» — 726 교훈과 같은 자리다.) */
  ok(/jzStagGo\(kids,\s*Math\.min\(kids\.length,\s*20\)\)/.test(SRC),
     '[A3] 스태거 상한 상수 20 은 그대로 — 채팅을 상수로 풀지 않았다(다른 격자 예산 불변)',
     '`Math.min(kids.length, 20)` ' + /jzStagGo\(kids,\s*Math\.min\(kids\.length,\s*20\)\)/.test(SRC));

  ok(!/\.ch-row[^{}]*\{[^{}]*animation:/.test(SRC) && !/\.ch-row[^{}]*\{[^{}]*transition:/.test(SRC),
     '[A4] `.ch-row` CSS 자체에도 animation/transition 선언이 없다',
     'animation ' + /\.ch-row[^{}]*\{[^{}]*animation:/.test(SRC)
     + ' · transition ' + /\.ch-row[^{}]*\{[^{}]*transition:/.test(SRC));

  const browser = await launch(chromium);
  const { page, errs } = await open(browser);

  /* ── [B] 열기 ───────────────────────────────────────────────────────────── */
  const b = await page.evaluate(async (scan) => {
    openChat();
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    return await (0, eval)('(' + scan + ')')(800);
  }, SCAN);
  ok(b.n >= 3, '[B0] 열림 — `#chList` 에 채팅 줄이 실제로 그려진다(빈 목록으로 초록을 받지 않는다)', '행 ' + b.n);
  ok(b.jzx === b.n, '[B1] 열림 — 모든 줄에 `jz-x` 표시가 붙어 있다', b.jzx + '/' + b.n + '행');
  ok(b.anim === 0, '[B2] 열림 — `#chList` 자식에 등록된 애니메이션 0건', '누적 ' + b.anim + '건');
  ok(b.moved === 0, '[B3] 열림 — 0~800ms 전 구간 opacity 1 · scale 1 · transform none (전이 0프레임)',
     '전이 ' + b.moved + ' · 최저 opacity ' + b.minOp.toFixed(3) + ' · 최저 scale ' + b.minSc.toFixed(3));
  ok(b.jzd === 0, '[B4] 열림 — 스태거 지연 `--jzd` 가 한 줄도 안 꽂힌다', '--jzd ' + b.jzd + '행');

  /* ── [C] 새 메시지 유입 ─────────────────────────────────────────────────── */
  const c = await page.evaluate(async (scan) => {
    const before = document.getElementById('chList').children.length;
    document.getElementById('chIn').value = '게이트 유입 시험';
    chSend();
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    const s = await (0, eval)('(' + scan + ')')(500);
    const kids = [...document.getElementById('chList').children];
    return Object.assign(s, { before,
      lastText: (kids[kids.length - 1].textContent || '').includes('게이트 유입 시험') });
  }, SCAN);
  ok(c.n === c.before + 1 && c.lastText, '[C1] 유입 — 전송한 줄이 목록 끝에 실제로 붙는다(기능 불변)',
     '행 ' + c.before + '→' + c.n + ' · 끝줄 본문 ' + c.lastText);
  ok(c.jzx === c.n, '[C2] 유입 — 새로 그려진 줄에도 `jz-x` 가 붙는다(재렌더가 표시를 잃지 않는다)',
     c.jzx + '/' + c.n + '행');
  ok(c.anim === 0 && c.moved === 0, '[C3] 유입 — 새 메시지 뒤에도 애니 0건 · 전이 0프레임',
     '애니 ' + c.anim + ' · 전이 ' + c.moved);

  /* ── [D] 스크롤 · 재개폐 ────────────────────────────────────────────────── */
  const d = await page.evaluate(async (scan) => {
    const L = document.getElementById('chList');
    L.scrollTop = 0;                                  /* 맨 위로 — «스크롤 유입분» 가설이 노리던 자리 */
    await new Promise(r => requestAnimationFrame(r));
    const top = await (0, eval)('(' + scan + ')')(400);
    L.scrollTop = L.scrollHeight;
    await new Promise(r => requestAnimationFrame(r));
    const bot = await (0, eval)('(' + scan + ')')(400);
    closeChat();
    await new Promise(r => setTimeout(r, 450));
    openChat();
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    const re = await (0, eval)('(' + scan + ')')(800);
    const L2 = document.getElementById('chList');
    return { top, bot, re, atBottom: Math.abs(L2.scrollTop + L2.clientHeight - L2.scrollHeight) < 4 };
  }, SCAN);
  ok(d.top.anim === 0 && d.top.moved === 0, '[D1] 스크롤 — 맨 위로 올려도 애니 0건 · 전이 0프레임',
     '애니 ' + d.top.anim + ' · 전이 ' + d.top.moved);
  ok(d.bot.anim === 0 && d.bot.moved === 0, '[D2] 스크롤 — 다시 바닥으로 내려도 애니 0건 · 전이 0프레임',
     '애니 ' + d.bot.anim + ' · 전이 ' + d.bot.moved);
  ok(d.re.anim === 0 && d.re.moved === 0, '[D3] 재개폐 — 닫았다 다시 열어도 애니 0건 · 전이 0프레임',
     '애니 ' + d.re.anim + ' · 전이 ' + d.re.moved);
  ok(d.atBottom, '[D4] 재개폐 — 여전히 «최신 줄이 바닥» 인 상태로 열린다(103 규약 불변)', '바닥 ' + d.atBottom);

  /* ── [E] 표시 내용 불변 ─────────────────────────────────────────────────── */
  const e = await page.evaluate(() => {
    const kids = [...document.getElementById('chList').children];
    return {
      n: kids.length,
      av: kids.filter(k => k.querySelector('.ch-av canvas')).length,
      nm: kids.filter(k => k.querySelector('.ch-nm .ch-nk')).length,
      tm: kids.filter(k => k.querySelector('.ch-tm') && /^\d\d:\d\d$/.test(k.querySelector('.ch-tm').textContent)).length,
      body: kids.filter(k => k.querySelector('.ch-bb') || k.querySelector('.ch-cd')).length,
      vs: kids.filter(k => k.classList.contains('vs')).length,
      row: kids.filter(k => k.classList.contains('ch-row')).length,
    };
  });
  ok(e.row === e.n && e.av === e.n && e.nm === e.n && e.tm === e.n && e.body === e.n,
     '[E1] 불변 — 모든 줄이 아바타·닉·시각·본문을 그대로 그린다(표시 내용 0줄 변경)',
     '행 ' + e.n + ' · 아바타 ' + e.av + ' · 닉 ' + e.nm + ' · 시각 ' + e.tm + ' · 본문 ' + e.body);
  ok(e.vs === 1, '[E2] 불변 — 대전 결과 카드 줄(`.ch-row.vs`)도 그대로 1행', 'vs ' + e.vs + '행');

  /* ── [F] 부품 불변(런타임) ──────────────────────────────────────────────
     소스에 선언이 남아 있는 것만으로는 «돈다» 를 증명하지 못한다 —
     같은 문법의 격자를 하나 만들어 `jzStagger` 를 직접 불러 본다. */
  const f = await page.evaluate(async () => {
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-9999px;top:0;width:300px;height:300px';
    host.innerHTML = '<div class="vg717"></div><div class="vg717"></div><div class="vg717"></div>';
    document.body.appendChild(host);
    jzStagger(host);
    await new Promise(r => requestAnimationFrame(r));
    const n = [...host.children].filter(k => k.getAnimations().some(a => a.animationName === 'jzSt')).length;
    host.remove();
    return n;
  });
  ok(f === 3, '[F] 부품 불변 — 같은 문법의 격자에는 `jzStagger` 가 여전히 `jzSt` 를 건다(호출부만 뗐다)',
     'jzSt 붙은 칸 ' + f + '/3');

  /* ── [R] 되돌림 시험 ────────────────────────────────────────────────────
     `jz-x` 를 떼고 다시 열면 스태거가 되살아나야 한다. 안 되살아나면 위가 전부 헛초록이다. */
  const r = await page.evaluate(async () => {
    closeChat();
    await new Promise(r => setTimeout(r, 450));
    openChat();                                       /* 먼저 렌더시키고 */
    await new Promise(r => setTimeout(r, 450));
    [...document.getElementById('chList').children].forEach(el => el.classList.remove('jz-x'));
    closeChat();
    await new Promise(r => setTimeout(r, 450));
    document.getElementById('chw').classList.add('on');   /* 재렌더 없이 «열림» 만 태운다 */
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    const kids = [...document.getElementById('chList').children];
    return { n: kids.length, anim: kids.filter(k => k.getAnimations().length).length };
  });
  ok(r.anim > 0, '[R] 되돌림 — `jz-x` 를 떼면 스태거가 되살아난다(이 자는 헛초록이 아니다)',
     '표시 제거 후 애니 ' + r.anim + '행 / ' + r.n);

  ok(errs.length === 0, '[G] 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '없음');

  await page.context().close();
  await browser.close();
  console.log('\nverify717: ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
