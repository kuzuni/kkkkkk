#!/usr/bin/env node
/* 작업 912 재현자 — `verify754` `[17] 프레임 5종 전부 측정됐다` 플레이키
 *
 *   node tools/probe912.js            → 기본 12판
 *   node tools/probe912.js --n 24     → 판 수
 *   node tools/probe912.js --wait 650 → 부팅 대기(ms) 스윕용
 *
 * ── 무엇을 묻는가(등재문 처방 ⓒ) ────────────────────────────────────────────
 * `verify754` 의 `open1()` 은 트리거를 **`try{…}catch(e){}` 로 감싸 삼킨다**.
 * 그래서 «측정 실패» 한 줄만 남고 **왜** 실패했는지가 안 남는다. 이 자는 같은 순서를
 * 그대로 밟되 삼키지 않고 세 갈래를 **갈라서** 찍는다:
 *
 *   ⓐ 안 떴다(트리거가 던졌다)  — 부팅이 안 끝나 `openStatUp` 이 아직 없다
 *   ⓑ 안 떴다(트리거는 조용)    — 호스트가 `display:none` 인 채다
 *   ⓒ 떴는데 못 읽었다          — 호스트는 보이는데 `.st-grp` 의 «보이는 자식» 이 0
 *
 * ⚠ 판정은 안 한다(338 규칙 — 재현이 먼저다). 마지막 줄이 `PROBE912 실패 k/n`.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const N = arg('n', 12);
const BOOT = arg('wait', 650);   /* verify754 의 고정 대기 — 부팅 */
const AFTER = arg('after', 380); /* verify754 의 고정 대기 — 트리거 뒤 정착 */
const FRAME_H = 1600;            /* 9:13.3+ — 빨개지는 프레임 */
const OPEN = `openStatUp({ic:'⚔️',desc:'훈련 11 단계 달성 공격력 30% 증가'})`;

/* verify754 의 MEASURE 를 «왜 null 인가» 까지 말하도록 넓힌 사본 */
const DIAG = `() => {
  const app = document.getElementById('app');
  const A = app.getBoundingClientRect();
  const vis = (e) => { const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const H = document.querySelector('#statw'), G = document.querySelector('.st-grp');
  const cs = H ? getComputedStyle(H) : null;
  const kids = G ? [...G.querySelectorAll('*')] : [];
  return {
    frameH: Math.round(A.height),
    host: !!H, grp: !!G,
    hostCls: H ? (H.className || '').toString() : '',
    disp: cs ? cs.display : '', visb: cs ? cs.visibility : '', op: cs ? cs.opacity : '',
    hostBox: H ? [Math.round(H.getBoundingClientRect().width), Math.round(H.getBoundingClientRect().height)] : null,
    hostVis: H ? vis(H) : false,
    kids: kids.length, kidsVis: kids.filter(vis).length,
    /* 게이트의 애니 대기는 «.st-grp 서브트리» 만 본다 — 호스트(#statw) 자신에게 걸린
       연출은 그 스코프 밖이다. 측정 순간 아직 도는 것이 있으면 여기 찍힌다.
       ⚠ 이 블록은 템플릿 문자열 안이다 — 백틱을 쓰면 문자열이 거기서 끊긴다. */
    hostAnim: H && H.getAnimations ? H.getAnimations().map((a) => (a.animationName || a.constructor.name) + ':' + a.playState) : [],
    grpAnim: G && G.getAnimations ? G.getAnimations({ subtree: true }).map((a) => (a.animationName || '?') + ':' + a.playState) : [],
  };
}`;

(async () => {
  const browser = await launch(chromium);
  const tally = { ok: 0, a: 0, b: 0, c: 0 };
  const rows = [];
  try {
    for (let i = 1; i <= N; i++) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: FRAME_H }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const cerr = [];
      page.on('pageerror', (e) => cerr.push(String(e.message).slice(0, 90)));
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForTimeout(BOOT);

      /* 트리거 직전에 «부팅이 끝났는가» 를 먼저 묻는다 — 이것이 ⓐ 를 가르는 자다 */
      const ready = await page.evaluate(() => ({
        fn: typeof window.openStatUp,
        host: !!document.querySelector('#statw'),
      }));

      /* ⚠ 삼키지 않는다 — 던진 것을 그대로 받는다 */
      let threw = '';
      try { await page.evaluate(OPEN); } catch (e) { threw = String(e.message).split('\n')[0].slice(0, 90); }
      await page.waitForTimeout(AFTER);

      /* ⚠ verify754 의 «애니가 끝났는지» 대기를 **그대로** 밟는다 — 이 자가 빼먹으면
         재현이 게이트와 다른 것을 잰다. 스코프가 `.st-grp` 라는 것까지 같다(그게 요점이다). */
      await page.evaluate(async (grp) => {
        const g = document.querySelector(grp);
        if (!g) return;
        const as = (g.getAnimations ? g.getAnimations({ subtree: true }) : [])
          .filter((a) => { const t = (a.effect && a.effect.getTiming) ? a.effect.getTiming() : {}; return t.iterations !== Infinity; });
        await Promise.all(as.map((a) => a.finished.catch(() => {})));
      }, '.st-grp');

      const d = await page.evaluate(`(${DIAG})()`);
      /* verify754 의 판정과 **같은 식** — m 이 null 이 되는 조건 셋 */
      const nullish = !d.host || !d.grp || !d.hostVis || d.kidsVis === 0;
      let tag = 'ok';
      if (nullish) {
        if (threw || ready.fn !== 'function') tag = 'ⓐ';
        else if (!d.hostVis) tag = 'ⓑ';
        else tag = 'ⓒ';
      }
      tally[tag === 'ok' ? 'ok' : tag === 'ⓐ' ? 'a' : tag === 'ⓑ' ? 'b' : 'c']++;
      rows.push({ i, tag, fn: ready.fn, threw, disp: d.disp, kids: d.kids, kidsVis: d.kidsVis, cerr: cerr[0] || '' });
      console.log(
        `  #${String(i).padStart(2)}  ${tag === 'ok' ? 'ok ' : 'X' + tag}  openStatUp=${ready.fn}` +
        `  display=${d.disp || '—'} op=${d.op} 보임=${d.hostVis ? 'Y' : 'N'}  자식 ${d.kidsVis}/${d.kids}` +
        `  호스트애니[${d.hostAnim.join(',') || '—'}]  묶음애니[${d.grpAnim.join(',') || '—'}]` +
        (threw ? `  던짐«${threw}»` : '') + (cerr[0] ? `  콘솔«${cerr[0]}»` : ''));
      await ctx.close();
    }
  } finally { await browser.close(); }

  const bad = tally.a + tally.b + tally.c;
  console.log(`\n  갈래  ⓐ 안 떴다(트리거가 던졌다) ${tally.a} · ⓑ 안 떴다(호스트 숨음) ${tally.b} · ⓒ 떴는데 못 읽었다 ${tally.c}`);
  console.log(`\nPROBE912 실패 ${bad}/${N} (부팅 대기 ${BOOT}ms · 프레임 ${FRAME_H})`);
  process.exit(0);
})();
