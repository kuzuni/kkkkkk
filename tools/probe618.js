#!/usr/bin/env node
/* 작업 618 — 재현 프로브: verify123 §10 「구 세이브 값(골드)은 그대로 = 12345」 가
 * 12739~12783(실행마다 다른 소수)으로 빨간 것이 **어느 구간의 수입인가** 를 가른다(338 규칙 — 처방 전 재현).
 *
 *   node tools/probe618.js
 *
 * 가설(등재문): 시간에 물린 수입이 표본 창에 섞인다 — 오프라인 보상이 1순위 용의자.
 * 대안 가설(이 프로브가 가른다): 오프라인 보상은 lastTime(=d.time, 표본엔 없음)과 «수령 클릭» 이
 * 있어야 지급된다(claimOffline) — 표본은 그 둘 다 없다. 진짜 용의자는 **부팅 즉시 도는 자동 전투**
 * (killEnemy 21982 `S.gold += g`)가 900ms 대기 동안 낸 킬 드랍이다.
 *
 * 프로브 축:
 *   [1] 표본 세이브(시각 없음·gold 12345)로 부팅 → load 직후(S 가 생기는 즉시)와
 *       100ms 간격 12칸의 (gold, totalKills) 시계열 — 골드 증가가 killEnPS 킬 수와 같이 움직이면 전투다.
 *   [2] 오프라인 축 기각 — offPend(수령 전 보류)와 팝업(#offw.on)이 표본 부팅에서 안 생겼는지.
 *   [3] 처방 예행 — rAF 타임스탬프를 고정(dt=0, 제품 loop 의 `(now-last)/1000`)한 부팅에서는
 *       같은 900ms 뒤에도 gold === 12345 · kills === 0 인지(= verify123 §10 에 넣을 그 수리).
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const URL = 'file://' + path.resolve(path.join(__dirname, '..', 'index.html')).replace(/\\/g, '/');

let n = 0; const fails = [];
const chk = (name, cond, got) => {
  n++;
  if (cond) console.log(`  ✓ ${name}` + (got !== undefined ? ` — ${got}` : ''));
  else { fails.push(name); console.log(`  ✗ ${name}` + (got !== undefined ? ` — got ${JSON.stringify(got)}` : '')); }
};
const SAVE = { gold: 12345, dia: 678, stage: 30, best: 30,
  raidBest: { r60: { dmg: 1e6, dps: 2e4 }, r30: { dmg: 5e5, dps: 1e4 }, r120: { dmg: 9e6, dps: 3e4 } } };

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });

  /* ---------- [1]·[2] 그대로 부팅 — 어디서 새는가 ---------- */
  console.log('[1] 표본 부팅 시계열 (gold · totalKills)');
  const c1 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p1 = await c1.newPage();
  await p1.addInitScript((sv) => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify(sv));
  }, SAVE);
  await p1.goto(URL, { waitUntil: 'load' });
  const series = [];
  for (let i = 0; i <= 12; i++) {
    series.push(await p1.evaluate(() => ({
      gold: S.gold, kills: S.totalKills,
      off: !!(typeof offPend !== 'undefined' && offPend),
      pop: !!document.querySelector('#offw.on'),
    })));
    if (i < 12) await p1.waitForTimeout(100);
  }
  series.forEach((s, i) => console.log(`    t≈${i * 100}ms gold=${s.gold} kills=${s.kills} offPend=${s.off} 팝업=${s.pop}`));
  const first = series[0], lastS = series[series.length - 1];
  chk('load 직후 표본 골드는 12345 로 시작한다(주입→load 구간은 결백)', first.gold === 12345 || first.kills > 0,
    `first gold=${first.gold} kills=${first.kills}`);
  chk('900ms 대기 끝에는 골드가 12345 를 넘는다(게이트가 본 그 오염)', lastS.gold > 12345, lastS.gold);
  chk('골드 증가는 킬 수와 같이 움직인다(늘어난 프레임마다 kills 도 늘었다)',
    series.every((s, i) => i === 0 || s.gold === series[i - 1].gold || s.kills > series[i - 1].kills),
    `kills ${first.kills} → ${lastS.kills}`);
  console.log('[2] 오프라인 축 기각');
  chk('offPend(오프라인 보류)가 전 구간 null — 시각 없는 세이브는 오프라인 정산이 없다',
    series.every((s) => !s.off), JSON.stringify(series.map((s) => s.off)));
  chk('오프라인 보상 팝업도 전 구간 닫혀 있다', series.every((s) => !s.pop));
  await c1.close();

  /* ---------- [3] 처방 예행 — rAF 시계 고정 부팅 ---------- */
  console.log('[3] 처방 예행: rAF 타임스탬프 고정(dt=0) 부팅');
  const c2 = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p2 = await c2.newPage();
  const e2 = [];
  p2.on('console', (m) => { if (m.type() === 'error') e2.push(m.text()); });
  p2.on('pageerror', (e) => e2.push(String(e.message || e)));
  await p2.addInitScript((sv) => {
    localStorage.setItem('idle_hunter_save_v4', JSON.stringify(sv));
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf(() => cb(0));   /* loop(now=0) → dt=0 → step(0) = 전투 정지 */
  }, SAVE);
  await p2.goto(URL, { waitUntil: 'load' });
  await p2.waitForTimeout(900);
  const froze = await p2.evaluate(() => ({ gold: S.gold, kills: S.totalKills,
    keys: Object.keys(S.raidBest || {}), arena: S.arena && S.arena.w === 0 && S.arena.l === 0 }));
  chk('시계 고정이면 900ms 뒤에도 골드가 정확히 12345', froze.gold === 12345, froze.gold);
  chk('시계 고정이면 킬 0 — 오염원이 전투 킬 드랍이었다는 대조 증명', froze.kills === 0, froze.kills);
  chk('§10 의 나머지 축(r60 이월·arena 채움)은 시계 고정과 무관하게 그대로 성립',
    froze.keys.length === 1 && froze.keys[0] === 'r60' && froze.arena, JSON.stringify(froze.keys));
  chk('시계 고정 부팅에 콘솔 에러 없음', e2.length === 0, e2.slice(0, 2).join(' | '));
  await c2.close();

  await browser.close();
  console.log(fails.length ? `\nPROBE618 FAIL — ${fails.length}/${n}` : `\nPROBE618 PASS ${n}/${n}`);
  process.exit(fails.length ? 1 : 0);
})();
