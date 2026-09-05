#!/usr/bin/env node
/* 작업 912 재현자 — `verify754` `[17] 프레임 5종 전부 측정됐다` 플레이키
 *
 *   node tools/probe912.js              → §1 무주입 재현 + §R 주입 시험
 *   node tools/probe912.js --n 12       → §1 판 수
 *   node tools/probe912.js --only R     → §R 만
 *
 * ── 무엇을 묻는가 ──────────────────────────────────────────────────────────
 * 910 회귀에서 `verify754` 가 **47/48**(빠진 항 = `[17] … 실패 9:13.3+`)이었고 같은 트리에서
 * 곧바로 다시 돌리니 **60/60** 이었다. 등재문의 실마리는 총항 수가 **48 ↔ 60** 으로 갈린다는 것 —
 * 측정이 null 이면 `if (bad.length) continue` 가 §1~§4 열두 항을 통째로 건너뛴다.
 *
 * ⚑ **§1 은 무주입으로는 재현되지 않는다**(이 자의 실측: 3축 스윕 — 부팅 대기 150~650ms ·
 *   정착 대기 0~380ms · 판 수 12 — 에서 실패 0). 그래서 이 자의 본체는 §R 이다:
 *   «늦게 뜬다/안 뜬다» 를 **주입**해서 옛 경로와 새 경로가 무엇을 하는지 갈라 보인다.
 *
 *   ⓐ 안 떴다(트리거가 던졌다)  ⓑ 안 떴다(호스트 숨음)  ⓒ 떴는데 «보이는 자식» 0
 *
 * ── §R 주입 시험(수리가 무르지 않다는 증거) ────────────────────────────────
 *   R1 «1500ms 늦게 뜸»  → 옛 경로 실패 / 새 경로 통과   (고정 380ms 가 뿌리였음)
 *   R2 «영영 안 뜸»      → 둘 다 실패, 단 새 경로는 **이유를 말한다** (무르게 안 풀었다)
 *   R3 «첫 판만 실패»    → 옛 경로 실패 / 새 경로 재시도로 통과
 *
 * ⚠ 판정은 안 한다(338 규칙 — 재현이 먼저다). 마지막 줄이 `PROBE912 …`.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const sarg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const N = arg('n', 8);
const BOOT = arg('wait', 650);    /* verify754 의 옛 고정 대기 — 부팅 */
const AFTER = arg('after', 380);  /* verify754 의 고정 대기 — 정착(새 경로도 그대로 쓴다) */
const ONLY = sarg('only', '');
const FRAME_H = 1600;             /* 9:13.3+ — 빨개진 프레임 */
const HOST = '#statw', GRP = '.st-grp';
const OPEN = `openStatUp({ic:'⚔️',desc:'훈련 11 단계 달성 공격력 30% 증가'})`;

/* verify754 의 MEASURE 가 null 을 내는 조건과 **같은 식** — 다르면 다른 것을 재게 된다 */
const DIAG = `() => {
  const vis = (e) => { const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const H = document.querySelector('${HOST}'), G = document.querySelector('${GRP}');
  const cs = H ? getComputedStyle(H) : null;
  const kids = G ? [...G.querySelectorAll('*')] : [];
  return { host: !!H, grp: !!G, hostVis: H ? vis(H) : false,
           disp: cs ? cs.display : '', op: cs ? cs.opacity : '',
           kids: kids.length, kidsVis: kids.filter(vis).length,
           hostAnim: H && H.getAnimations ? H.getAnimations().length : -1,
           grpAnim: G && G.getAnimations ? G.getAnimations({ subtree: true }).length : -1 };
}`;

/* 주입 — «떴는데 늦게/영영 안 보인다» 를 트리거를 건드리지 않고 만든다.
   (트리거를 감싸면 감싸기 자체가 경주라 무엇을 쟀는지 흐려진다) */
const FAULT = (ms) => `(() => {
  const st = document.createElement('style');
  st.textContent = '${HOST}.on{display:none!important}';
  const put = () => { (document.head || document.documentElement).appendChild(st);
    ${ms > 0 ? `setTimeout(() => st.remove(), ${ms});` : ''} };
  if (document.head) put(); else document.addEventListener('DOMContentLoaded', put);
})()`;

const why = (d, threw, opened) => !d ? '진단 실패'
  : threw ? `ⓐ 트리거가 던졌다 «${threw}»`
  : !d.host || !d.grp ? `ⓑ 노드 없음`
  /* ⚠ 옛 경로에는 «열림 대기» 가 아예 없다 — 없는 것을 «시간초과» 로 적으면 두 경로가
     같은 일을 하다 갈린 것처럼 읽힌다(그 없음이 바로 뿌리다). */
  : !d.hostVis ? `ⓑ 호스트가 안 떴다(display:${d.disp} · 열림대기 ${opened === null ? '없음' : opened ? '통과' : '시간초과'})`
  : `ⓒ 떴는데 «보이는 자식» 0`;

/* ── 한 판 ────────────────────────────────────────────────────────────────
   mode 'old' = 수리 전 경로(고정 650 → 트리거 삼킴 → 고정 380)
   mode 'new' = 수리 후 경로(준비 대기 → 트리거 → 열림 대기 → 정착 380)      */
async function one(browser, mode, faultMs) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: FRAME_H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const cerr = [];
  page.on('pageerror', (e) => cerr.push(String(e.message).split('\n')[0].slice(0, 70)));
  if (faultMs !== null) await page.addInitScript(FAULT(faultMs));
  await page.goto(URL, { waitUntil: 'load' });

  if (mode === 'old') await page.waitForTimeout(BOOT);
  else await page.waitForFunction(() => typeof window.openStatUp === 'function', null, { timeout: 20000 }).catch(() => {});

  let threw = '';
  if (mode === 'old') { await page.evaluate(`try{ ${OPEN} }catch(e){}`); }
  else { try { await page.evaluate(OPEN); } catch (e) { threw = String(e.message).split('\n')[0].slice(0, 70); } }

  let opened = null;
  if (mode === 'new') {
    opened = await page.waitForFunction(([host, grp]) => {
      const vis = (e) => { const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
      const H = document.querySelector(host), G = document.querySelector(grp);
      if (!H || !G || !vis(H)) return false;
      return [...G.querySelectorAll('*')].some(vis);
    }, [HOST, GRP], { timeout: 5000 }).then(() => true).catch(() => false);
  }
  await page.waitForTimeout(AFTER);

  /* 두 경로가 공유하는 대기 — 애니가 끝났는지(무한 반복 제외) */
  await page.evaluate(async (grp) => {
    const g = document.querySelector(grp);
    if (!g) return;
    const as = (g.getAnimations ? g.getAnimations({ subtree: true }) : [])
      .filter((a) => { const t = (a.effect && a.effect.getTiming) ? a.effect.getTiming() : {}; return t.iterations !== Infinity; });
    await Promise.all(as.map((a) => a.finished.catch(() => {})));
  }, GRP);

  const d = await page.evaluate(`(${DIAG})()`);
  await ctx.close();
  const nul = !d.host || !d.grp || !d.hostVis || d.kidsVis === 0;
  return { nul, d, threw, opened, cerr, why: nul ? why(d, threw, opened) : '' };
}

/* 새 경로의 재시도(verify754 의 openRetry 와 같은 규칙 — 3판) */
async function retryNew(browser, faultFor) {
  for (let t = 1; t <= 3; t++) {
    const r = await one(browser, 'new', faultFor(t));
    if (!r.nul) return { ok: true, t, why: t > 1 ? `${t}판째에 읽힘` : '' };
    if (t === 3) return { ok: false, t, why: r.why };
  }
}

(async () => {
  const browser = await launch(chromium);
  let line = '';
  try {
    if (ONLY !== 'R') {
      console.log('\n── §1 무주입 재현 — 옛 경로 그대로 ' + '─'.repeat(30));
      const tally = { ok: 0, a: 0, b: 0, c: 0 };
      for (let i = 1; i <= N; i++) {
        const r = await one(browser, 'old', null);
        const tag = !r.nul ? 'ok' : r.why[0] === 'ⓐ' ? 'a' : r.why[0] === 'ⓑ' ? 'b' : 'c';
        tally[tag === 'ok' ? 'ok' : tag]++;
        console.log(`  #${String(i).padStart(2)}  ${r.nul ? 'X ' + r.why : 'ok'}` +
          `  display=${r.d.disp} 자식 ${r.d.kidsVis}/${r.d.kids} 애니 호스트${r.d.hostAnim}/묶음${r.d.grpAnim}` +
          (r.cerr[0] ? `  콘솔«${r.cerr[0]}»` : ''));
      }
      console.log(`  → 실패 ${tally.a + tally.b + tally.c}/${N} (ⓐ${tally.a} ⓑ${tally.b} ⓒ${tally.c})`);
      line += `§1 무주입 ${tally.a + tally.b + tally.c}/${N} 실패`;
    }

    console.log('\n── §R 주입 시험 — 옛 경로 ↔ 새 경로 ' + '─'.repeat(28));
    /* R1 늦게 뜸 */
    {
      const o = await one(browser, 'old', 1500);
      const n = await one(browser, 'new', 1500);
      console.log(`  R1 «1500ms 늦게 뜸»   옛: ${o.nul ? 'X ' + o.why : 'ok'}`);
      console.log(`                        새: ${n.nul ? 'X ' + n.why : 'ok (열림대기가 받았다)'}`);
      line += ` · R1 옛${o.nul ? 'X' : 'o'}/새${n.nul ? 'X' : 'o'}`;
    }
    /* R2 영영 안 뜸 — 새 경로도 빨개져야 한다(무르게 푼 수리가 아님) */
    {
      const o = await one(browser, 'old', 0);
      const n = await retryNew(browser, () => 0);
      console.log(`  R2 «영영 안 뜸»       옛: ${o.nul ? 'X ' + (o.why || '이유 없음') : 'ok'}`);
      console.log(`                        새: ${n.ok ? 'ok(!! 무른 수리다)' : 'X ' + n.why}`);
      line += ` · R2 옛X/새${n.ok ? 'o(무름)' : 'X(이유 말함)'}`;
    }
    /* R3 첫 판만 실패 — 재시도가 받는가 */
    {
      const o = await one(browser, 'old', 0);
      const n = await retryNew(browser, (t) => (t === 1 ? 0 : null));
      console.log(`  R3 «첫 판만 실패»     옛: ${o.nul ? 'X ' + o.why : 'ok'}`);
      console.log(`                        새: ${n.ok ? 'ok — ' + (n.why || '1판') : 'X ' + n.why}`);
      line += ` · R3 옛${o.nul ? 'X' : 'o'}/새${n.ok ? 'o' : 'X'}`;
    }
  } finally { await browser.close(); }
  console.log(`\nPROBE912 ${line}`);
  process.exit(0);
})();
