#!/usr/bin/env node
/* 작업 764 재현 — `verify429` [F2] 가 «닫힘 연출이 아직 채우고 있는 프레임» 을 잰다.
 *
 * 등재문(PROGRESS 764)의 가설: `showItem()` **직후** `readParts()` 가 애니메이션 프레임을
 * 잡아 `.sk-db` 가 750×290 대신 ×0.9401 **등방**으로 읽힌다 — 값 `705.07×272.63`.
 *
 * 이 자는 «게이트가 빨개지나» 가 아니라 **그 배율을 무엇이 만드는가** 를 직접 본다
 * (291·353 이 세운 방식 — 병 자체를 보고, 게이트의 빨강은 그 증상으로만 센다).
 *
 * 찾은 것 — 가설은 맞고 **자리가 하나 옮겨졌다**: 배율은 «지금 여는» 연출(`jzBoxIn` 0% = scale .92)
 * 이 아니라 **직전 닫기가 아직 채우고 있는** `jzBoxOut`(`to{scale:.94}` · `both`) 이다.
 *   `.94` × 750 = **705.0** · `.94` × 290 = **272.6** — 등재문의 값과 소수점까지 같다.
 * 그래서 «등방» 이었고, F1(유물↔펫 **상대** 비교)은 둘 다 같이 눌려 초록이었다.
 *
 * 왜 실행마다 갈리나 — `jzClose()` 가 `.jz-c` 를 **애니메이션이 끝날 때** 떼는데(41189),
 * 게이트의 [D] 블록은 **동기** `page.evaluate` 라 그 안에서는 프레임이 한 장도 안 흐른다.
 * 그러니 [D] 가 시작된 **시각**만이 값을 정한다:
 *   · 직전 닫기로부터 0~40ms  → `jzBoxOut` 0% (scale 1) → 750  (초록)
 *   · 직전 닫기로부터 50~170ms → 채우는 중 (scale 1 → .94) → 747…705  (빨강)
 *   · 180ms 이상               → 연출이 끝나 클래스가 걷혔다 → 750  (초록)
 * 부하가 [C] 꼬리와 [D] 사이의 왕복을 그 창 안으로 밀어 넣을 때만 빨개진다 = «플레이키».
 *
 *   [1] 위상 스윕 — `showItem()` 뒤 ms 별 `.sk-db` 실측(배율원을 이름으로 찍는다)
 *   [2] 게이트 모양 — «닫고 g ms 뒤 [D] 와 같은 동기 블록» 을 g 를 훑으며 (병)
 *   [3] 처방 — 같은 g 에서 **정착(`jzBox…` 끝나기를 기다림) 뒤** 재면 전 구간 750 (약)
 *
 * 실행: node tools/probe764.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const GAPS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 200, 300];

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForTimeout(900);

  /* 게이트 [D] 와 같은 상태 — 유물 전종을 소환 경로로 보유시킨다 */
  await page.evaluate(() => {
    closeModal();
    S.relic = 1e7;
    for (let i = 0; i < 400 && RELICS.some((r) => !has(r.id)); i++) summonRelic(true);
    const pet = PETS[0].id; S.own[pet] = S.own[pet] || { n: 0, l: 1 };
  });

  /* ── [1] 위상 스윕 — 배율원을 이름으로 ───────────────────────────── */
  console.log('[1] 위상 스윕 — showItem() 뒤 ms 별 `.sk-db` (기대 750×290)');
  const sweep = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const read = () => {
      const el = document.querySelector('#mbox .sk-db');
      const r = el.getBoundingClientRect();
      const anims = (document.getAnimations ? document.getAnimations() : [])
        .filter((a) => a.playState === 'running' && /^jzBox/.test(a.animationName || ''))
        .map((a) => a.animationName + '@' + Math.round(a.currentTime || 0));
      return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), anims };
    };
    const rows = [];
    for (const ms of [0, 8, 16, 32, 64, 96, 128, 160, 200, 240]) {
      closeModal(); await wait(120);
      showItem(RELICS[0].id);
      if (ms) await wait(ms);
      rows.push(Object.assign({ ms }, read()));
    }
    closeModal();
    return rows;
  });
  for (const r of sweep) {
    console.log('   t+' + String(r.ms).padStart(3) + 'ms  ' + r.w + '×' + r.h
      + (r.anims.length ? '   ' + r.anims.join(',') : ''));
  }
  ok(sweep.some((r) => Math.abs(r.w - 750) > 1 && r.anims.some((a) => /^jzBox/.test(a))),
    '1-a 배율을 만드는 것은 `jzBox…` 연출이다(이름으로 확인)',
    sweep.filter((r) => Math.abs(r.w - 750) > 1).map((r) => 't+' + r.ms + ' ' + r.w).join(' · ') || '없음');

  /* ── [2] 게이트 모양 (병) · [3] 정착 뒤 (약) ─────────────────────── */
  console.log('\n[2][3] «닫고 g ms 뒤 [D] 와 같은 동기 블록» — 정착 전(병) ↔ 정착 후(약)');
  const rows = [];
  for (const gap of GAPS) {
    const v = await page.evaluate(async (g) => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      /* 게이트 [C] 꼬리 — 팝업을 한 번 열었다 닫는다 */
      closeModal(); await wait(400);
      showItem(RELICS[0].id); await wait(400);
      closeModal();
      await wait(g);
      /* ---- 여기부터 [D] 와 같은 «동기» 블록 (프레임이 한 장도 안 흐른다) ---- */
      closeModal();
      showItem(RELICS[0].id);
      const raw = document.querySelector('#mbox .sk-db').getBoundingClientRect();
      const cls = document.getElementById('modal').className;
      /* ---- 처방: `verify429` 가 실제로 쓰는 `settleBox` 와 **같은 본체** ----
         ⚠ «한 번 기다리고 2 rAF» 로는 못 닫는다 — 닫힘이 끝나는 그 프레임에 **열림이 붙어서**
         이번엔 `jzBoxIn` 0%(scale .92 = 690)를 잡는다. 그래서 «두 프레임 연속으로 돌 것이
         없을 때만» 끝낸다(공용 `settle291` 사다리를 안 쓴 이유는 게이트 쪽 주석 ⓐⓑ). */
      const pend = () => (document.getAnimations ? document.getAnimations() : [])
        .filter((a) => /^jzBox/.test(a.animationName || '') && a.playState !== 'finished');
      const t0 = performance.now();
      for (let quiet = 0; quiet < 2 && performance.now() - t0 < 1500;) {
        const P = pend();
        if (P.length) { await Promise.all(P.map((a) => a.finished.catch(() => 0))); quiet = 0; }
        else quiet++;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      const fixed = document.querySelector('#mbox .sk-db').getBoundingClientRect();
      closeModal();
      return { raw: +raw.width.toFixed(2), fixed: +fixed.width.toFixed(2), cls };
    }, gap);
    rows.push(Object.assign({ gap }, v));
    console.log('   gap ' + String(gap).padStart(3) + 'ms → 정착 전 ' + String(v.raw).padStart(6)
      + '  ·  정착 후 ' + String(v.fixed).padStart(6)
      + (/jz-c/.test(v.cls) ? '   (`.jz-c` 가 아직 붙어 있다)' : ''));
  }
  const bad = rows.filter((r) => Math.abs(r.raw - 750) > 1);
  ok(bad.length > 0, '2-a 정착 전에는 750 이 아닌 창이 있다(= 플레이키의 정체)',
    bad.length ? bad.map((r) => 'g' + r.gap + ' ' + r.raw).join(' · ') : '재현 실패 — 창이 안 잡혔다');
  ok(bad.every((r) => /jz-c/.test(r.cls)), '2-b 그 창에서는 예외 없이 `.jz-c`(닫힘 연출)가 붙어 있다',
    bad.map((r) => 'g' + r.gap).join(',') || '—');
  ok(Math.min(...bad.map((r) => r.raw)) < 710,
    '2-c 최저값이 등재문의 705.07 대(= scale .94 = `jzBoxOut` 종점)까지 내려간다',
    bad.length ? '최저 ' + Math.min(...bad.map((r) => r.raw)) : '—');
  ok(rows.every((r) => Math.abs(r.fixed - 750) <= 1),
    '3-a 정착 뒤에는 g 전 구간에서 750 이다(처방이 창을 닫는다)',
    rows.map((r) => r.fixed).filter((w) => Math.abs(w - 750) > 1).join(',') || 'Δ≤1px · ' + GAPS.length + '개 전부');

  ok(errs.length === 0, '4-a 페이지 에러 0', errs.slice(0, 2).join(' | '));

  await browser.close();
  console.log('\nPROBE764 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
