/* 작업 993 게이트 — `tools/verify795.js` 의 «부하에서 빨개지던» 자리가 닫혔는지 묻는다
 *
 *   node tools/verify993.js
 *   node tools/verify993.js --runs 6      (동시 판수 · 기본 4)
 *
 * **무엇을 고쳤나**: 제품은 연출 노드를 **벽시계 타이머**(`fxBye` = `setTimeout(remove, …)`)로 걷는데
 * `verify795` 는 발화와 읽기를 **서로 다른 `page.evaluate`** 로 나누고 그 사이에 `waitForTimeout(80)`
 * 을 뒀다 — 읽는 시각이 Node 쪽 왕복 지연에 달려 있어, 부하가 걸리면 노드가 **읽기 전에 사라져**
 * 단언이 어긋난 게 아니라 **잴 것이 없어졌다**(`probe993` 이 지연 사다리로 재현 · 동시 6판에서 2판 FAIL).
 * ⇒ «발화 → rAF 두 바퀴 → 읽기» 를 **한 evaluate 안**으로 합치고, 창을 놓치면 다시 쏘고,
 *   끝내 못 재면 «못 쟀다»(**종료 코드 3**, 939 규약)로 답한다 — 빨강으로 위장하지 않는다.
 *
 *   [1] 정직 — 창을 일부러 놓치게 하면(`--stall`) 코드 **3**(못 쟀다)이지 **1**(단언 실패)이 아니다
 *   [2] 평상 — 손잡이 없이 돌리면 그대로 초록(코드 0)
 *   [3] 모양 — 자 안에 «발화 → 벽시계 대기 → 다른 evaluate 로 fx 노드 읽기» 가 없다
 *   [4] 동시 — 여러 판을 겹쳐 돌려도 «잴 것이 없어서» 빨개지는 판이 0
 *   [R] 되돌림 — [3] 의 자가 **옛 모양을 실제로 문다**(합성 표본으로 시험 — 얕은 클론에 안 기댄다)
 *
 * ⚠ 939 규약 — 이 자 자신의 실패는 1(FAIL) · 환경 없음은 2 · 못 쟀다는 3.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const V795 = path.join(__dirname, 'verify795.js');

const argv = process.argv.slice(2);
const argOf = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : d; };
const RUNS = argOf('--runs', 4);

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const blk = t => console.log('\n[' + t);

const run = args => new Promise(res => {
  const c = spawn(process.execPath, [V795].concat(args || []), { cwd: ROOT });
  let out = '';
  c.stdout.on('data', d => out += d); c.stderr.on('data', d => out += d);
  c.on('close', code => res({ code, out }));
});

/* «발화 → 벽시계 대기 → **다른** evaluate 에서 fx 노드 세기» — 993 이 고친 바로 그 모양. */
const SHAPE = /(rwSummonFx|fxFlash\(|fxUpOk|rwGainFx|fxHitEl)[\s\S]{0,300}?waitForTimeout\([\s\S]{0,300}?(evaluate|ev\()[\s\S]{0,300}?fx-(flash|keep)/;

/* [R] 되돌림 표본 — 옛 `verify795` 의 뼈대만 남긴 합성 사본. 얕은 클론(756)에서도 늘 있다. */
const OLD_SHAPE_SAMPLE = `
  await ev(p, FIRE, { ID: 'rl0', KEEP: true });   // rwSummonFx 를 부르는 그 자리
  await p.waitForTimeout(80);
  const K = await ev(p, READ, 'rl0');             // .fx-flash / .fx-keep 를 센다
`;

(async () => {
  console.log('=== verify993 — verify795 의 측정 창이 부하에 안 흔들리는가 ===');

  blk('1] 정직 — 창을 놓치면 «빨강» 이 아니라 «못 쟀다»(코드 3)다');
  const stalled = await run(['--stall', '900']);
  ok(stalled.code === 3, '1-a ★ `--stall 900` 은 종료 코드 **3**(못 쟀다) — 1(단언 실패)이 아니다',
     '코드 ' + stalled.code);
  ok(/측정 실패다\(단언 실패가 아니다\)/.test(stalled.out),
     '1-b ★ 사람이 읽을 한 줄로 «무엇이 안 됐는지 + 할 일» 을 말한다(939 — 자기 실패는 스택이 아니라 한 줄)',
     /연출 노드가 읽기 전에 걷혔다/.test(stalled.out) ? '«연출 노드가 읽기 전에 걷혔다 …»' : '문구 없음');
  ok(!/FAIL B[12]|FAIL H1|FAIL R1/.test(stalled.out),
     '1-c ★ 창을 놓친 판에서 **거짓 빨강을 한 항도 안 낸다** — 등재문의 ⓐⓑⓒ 가 그 거짓 빨강이었다',
     (stalled.out.match(/^ {2}FAIL/gm) || []).length + '건');

  blk('2] 평상 — 손잡이 없이 돌리면 초록');
  const plain = await run([]);
  const score = (plain.out.match(/VERIFY795 (\d+)\/(\d+)/) || [])[0] || '(점수 줄 없음)';
  ok(plain.code === 0, '2-a ★ 손잡이 없는 실행은 코드 0', score);

  blk('3] 모양 — 발화와 읽기 사이에 벽시계 대기가 없다');
  const src = fs.readFileSync(V795, 'utf8');
  ok(!SHAPE.test(src),
     '3-a ★ `verify795` 안에 «발화 → `waitForTimeout` → 다른 evaluate 로 fx 노드 읽기» 가 없다',
     SHAPE.test(src) ? '옛 모양이 남아 있다' : '없다');
  ok(/한 `evaluate` 안으로 합쳤다|SHOT/.test(src) && /requestAnimationFrame/.test(src),
     '3-b ★ 대신 «한 evaluate 안 + rAF» 로 읽는다(창이 페이지 안에서 닫힌다)',
     /const SHOT/.test(src) ? '`SHOT` 한 벌' : '못 찾음');

  blk('R] 되돌림 — [3] 의 자가 옛 모양을 실제로 문다');
  ok(SHAPE.test(OLD_SHAPE_SAMPLE),
     'R1 ★ 같은 정규식이 **옛 모양 합성 표본**에는 걸린다 — [3-a] 가 «항상 참» 을 재는 헛초록이 아니다',
     '합성 표본에 걸림');

  blk('4] 동시 — 겹쳐 돌려도 «잴 것이 없어서» 빨개지는 판이 0');
  const many = await Promise.all(Array.from({ length: RUNS }, () => run([])));
  const red = many.filter(r => r.code === 1), un = many.filter(r => r.code === 3);
  ok(red.length === 0,
     '4-a ★ 동시 ' + RUNS + '판에 단언 실패(코드 1) 0 — 수리 전 같은 부하에서 2/6·4/6 이 빨갰다',
     (RUNS - red.length - un.length) + ' PASS · ' + red.length + ' FAIL · ' + un.length + ' 못 쟀다');

  console.log('\nVERIFY993 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
