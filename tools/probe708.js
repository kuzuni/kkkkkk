#!/usr/bin/env node
/* 708 재현 — `tools/verify486.js` 가 `page.evaluate` 예외로 **통째로 죽는다**
 *
 *   node tools/probe708.js
 *
 * 338 규칙(«처방 전에 재현부터»)대로, 등재문이 말한 것을 **찍힌 것으로** 확인한다.
 *   ① 수리 전 자(고정 커밋 `4757c0f` 의 사본)를 실제로 돌려 «즉사» 를 재현한다 —
 *      `[F]` 에서 `ReferenceError: trDeltaTxt is not defined` 가 밖으로 나가고
 *      **`[G]`·`[H]`·`[R]`·`[I]` 는 한 줄도 안 찍히며** 합계 줄(`VERIFY486 …`)조차 없다.
 *      = 앞 절의 초록만 남고 뒤 절은 «한 번도 안 돌았다»(319 가 verify204 에서 겪은 그 모양).
 *   ② 그물(`ev`/`blk`) 자체가 무르지 않은지 — 죽는 평가를 **실제로** 한 번 던져
 *      `{ __err }` 로 잡히고, **그 다음 평가가 계속 돈다**는 것을 같은 페이지에서 확인한다.
 *      (이 항이 없으면 «그물이 있다» 는 말이 소스 읽기로만 남는다.)
 *
 * ⚠ 왜 «내 것이 아닌가» 를 여기서 다시 세지 않는가 — 등재 세션(sess-1457-1518)이
 *   수리 전 트리(`d540ad0` worktree)에서 같은 자리·같은 예외를 이미 대조로 못박았다(338·344 규약).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const BASE = '4757c0f';                 /* 708 착수 직전(= 수리 전) 커밋 — 고정 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d !== undefined ? '   → ' + d : '')); } };

(async () => {
  /* ── ① 수리 전 자를 실제로 돌린다 ─────────────────────────────────────── */
  console.log('[1] 재현 — 수리 전 `verify486.js`(' + BASE + ')는 `[F]` 에서 즉사한다');
  const tmp = path.join(os.tmpdir(), 'probe708-verify486-' + process.pid + '.js');
  let ran = null;
  try {
    const old = execFileSync('git', ['show', BASE + ':tools/verify486.js'], { cwd: ROOT, encoding: 'utf8' });
    /* 자기 자리(tools/)에서 돌아야 `./pwlaunch` 를 찾는다 — 파일만 옆에 놓는다 */
    const side = path.join(ROOT, 'tools', 'verify486.probe708-old.js');
    fs.writeFileSync(side, old);
    try {
      ran = spawnSync(process.execPath, [side], { cwd: ROOT, encoding: 'utf8', timeout: 15 * 60e3 });
    } finally { try { fs.unlinkSync(side); } catch (e) {} }
  } catch (e) {
    ok(false, '수리 전 사본을 못 꺼냈다(' + BASE + ')', String(e.message || e));
  }
  if (ran) {
    const out = (ran.stdout || '') + '';
    const err = (ran.stderr || '') + '';
    ok(ran.status !== 0, '  종료 코드가 0 이 아니다(즉사)', 'status ' + ran.status);
    ok(/trDeltaTxt is not defined/.test(err + out),
      '  예외는 660 이 선언째 지운 `trDeltaTxt`', (err.split('\n')[0] || '').slice(0, 120));
    ok(/\[F\]/.test(out), '  [F] 절까지는 찍혔다(앞 절의 초록만 남는다)');
    /* 절 머리는 `sec()` 가 «\n[X] …» 로만 찍는다 — 그 꼴이 없으면 그 절은 안 돈 것이다 */
    for (const s of ['G', 'H', 'R', 'I'])
      ok(out.indexOf('\n[' + s + '] ') < 0, '  [' + s + '] 는 한 줄도 안 돌았다');
    ok(!/VERIFY486 (PASS|FAIL)/.test(out), '  합계 줄조차 없다 — «몇 개 중 몇 개» 를 아무도 못 읽는다');
  }
  try { fs.unlinkSync(tmp); } catch (e) {}

  /* ── ② 그물 자체 시험 — 죽는 평가 뒤에도 다음 평가가 돈다 ───────────────── */
  console.log('\n[2] 그물(`ev`/`blk`) — 죽는 평가는 `{ __err }` 로 잡히고 뒤 평가는 계속 돈다');
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  const ev = async (fn, arg) => {
    try { return await page.evaluate(fn, arg); }
    catch (e) { return { __err: String((e && e.message) || e).split('\n')[0] }; }
  };
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof trainCardData === 'function');
  const dead = await ev(() => trDeltaTxt(document.body));     /* 660 이 지운 그 함수 */
  ok(!!(dead && dead.__err), '  죽는 평가가 예외 대신 `{ __err }` 로 돌아온다', JSON.stringify(dead));
  ok(/trDeltaTxt/.test((dead && dead.__err) || ''), '  그 안에 무엇이 죽였는지가 적혀 있다', (dead || {}).__err);
  const alive = await ev(() => ({ ok: typeof trainCardData === 'function', n: trainCardData().length }));
  ok(alive && !alive.__err && alive.ok && alive.n === 3,
    '  그리고 **그 다음 평가가 그대로 돈다**(뒤 절이 살아난다)', JSON.stringify(alive));
  await browser.close();

  console.log('\n' + (fail === 0 ? 'PROBE708 PASS ' : 'PROBE708 FAIL ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
