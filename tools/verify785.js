/* 작업 785 게이트 — «홀드 표본 문턱이 러너 틱 속도에서 떨어졌는가»
 *
 *   node tools/verify785.js
 *
 * 등재문(PROGRESS 785)이 요구한 것 둘:
 *   ⓐ 전제를 «시간» 이 아니라 **«버스트 수»** 로 — 채울 때까지 누르고 상한에서 끊는다
 *   ⓑ 그 대기 자를 **`tools/` 공용 부품**으로 빼서 같은 문턱을 쓰는 자들이 같이 읽는다
 *      (`verify683` [B2] · `verify666` [B1] · `verify682` [B0] · `verify619` [B1])
 *   ⚠ **문턱을 내리는 길은 반려다** — [A3] 이 네 문턱을 숫자로 못박는다.
 *
 * ⚑ 이 자는 **브라우저를 안 띄운다.** 부품의 계약(«언제 떼는가»)은 기계 속도의 함수이므로
 *   진짜 러너로 재면 그날 기분에 답이 달라진다 — 그것이 785 가 고치는 병 그 자체다.
 *   ⇒ **틱 속도를 인자로 갖는 가짜 page** 로 빠르고 결정적으로 잰다.
 *   찍힌 픽셀 쪽 증명(실제 유물 소환 · CPU ×8 느린 기계 A/B)은 `node tools/probe785.js` 가 한다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { holdUntil } = require('./holdburst');

const T = f => fs.readFileSync(path.resolve(__dirname, f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const blk = t => console.log('\n[' + t);

/* ── 가짜 page — «1초에 rate 번» 틱하는 기계 ──────────────────────────────
   누르고 있는 동안만 표본이 는다(제품의 홀드와 같은 뜻). `evaluate` 는 무엇을 세라고 하든
   이 기계의 표본 수를 돌려준다 — 재는 것은 «세는 식» 이 아니라 **«언제 떼는가»** 다. */
function fakePage(rate, opt) {
  const o = Object.assign({ evalMs: 0 }, opt || {});
  let downAt = null, held = 0;
  const n = () => Math.floor(((downAt ? Date.now() - downAt : 0) + held) / (1000 / rate));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  return {
    ticks: n,
    mouse: {
      move: async () => {},
      down: async () => { downAt = Date.now(); },
      up: async () => { if (downAt) { held += Date.now() - downAt; downAt = null; } }
    },
    evaluate: async () => { if (o.evalMs) await sleep(o.evalMs); return n(); },
    waitForTimeout: sleep
  };
}
const AT = { x: 100, y: 100 };

(async () => {
  /* ── [A] 선언 — 네 자가 한 부품을 읽고, 문턱은 한 칸도 안 내려갔다 ──────── */
  blk('A] 선언 — 공용 부품 하나 · 손으로 적은 «시간만» 홀드 0건 · 문턱 불변');
  const HB = T('holdburst.js');
  ok(/module\.exports = \{ holdUntil/.test(HB) && /need/.test(HB) && /maxMs/.test(HB),
     'A1 공용 부품 `tools/holdburst.js` 가 «표본 수(`need`) + 상한(`maxMs`)» 계약으로 서 있다');

  /* ⚑ 796(2026-09-02) — 표는 «바닥(래칫)» 이지 «정답» 이 아니다(아래 A3 참조).
     `probe666.js` 를 다섯째 식구로 넣었다 — 785 때 넷만 옮기고 **혼자 남아** 손으로 적은
     `HOLD = 1500` 을 쓰고 있었고, 그래서 그 자의 [2-a] 가 러너 속도에 붙어 4회 중 1회 빨갰다. */
  const USERS = { 'verify683.js': 6, 'verify666.js': 4, 'verify682.js': 4, 'verify619.js': 8, 'probe666.js': 4 };
  const srcs = {};
  for (const f of Object.keys(USERS)) srcs[f] = T(f);
  const noReq = Object.keys(USERS).filter(f => !/require\('\.\/holdburst'\)/.test(srcs[f]));
  ok(noReq.length === 0, 'A2 ★ 같은 문턱을 쓰는 자 넷이 **그 부품을 읽는다**(등재문 처방 ⓑ)',
     noReq.length ? '안 읽는 자: ' + noReq.join(', ') : Object.keys(USERS).join(', '));

  /* ⚠ **문턱을 내리는 길은 반려다**(등재문) — 표본이 적으면 그 위에 선 통계 항이 헛초록이 된다.
     683 [D4](3연속 방향) · 666 [E1](분모) · 682 [B1](쌍 비교) · 619 [B2](비율)가 그 위에 서 있다. */
  const thr = {
    'verify683.js': /V683_NEED \|\| (\d+)/,
    'verify666.js': /\{ need: (\d+), minMs: HOLD_MS \}/,
    'verify682.js': /NEED = (\d+)/,
    'verify619.js': /V619_NEED \|\| (\d+)/,
    'probe666.js': /NEED = (\d+)/
  };
  /* ⚑ 796 — 이 항은 «내려갔는가» 를 묻는 래칫인데 **같은가**(===)로 적혀 있었다.
     그래서 «올린다» 도 똑같이 빨개졌다 — 786 이 [R4] 의 표본 굶주림을 고치려고 682 의 문턱을
     4 → 12 로 **올리는** 순간 이 자가 막아선다. 래칫의 뜻대로 **바닥(≥)** 으로 고쳤다:
     내려가면 빨갛고, 올라가면 초록이되 그 값이 기록에 남는다(아래 실제 값 출력). */
  const low = [], now = [];
  for (const f of Object.keys(USERS)) {
    const m = srcs[f].match(thr[f]);
    const v = m ? Number(m[1]) : NaN;
    now.push(f.replace(/\.js$/, '') + '=' + (m ? m[1] : '?') + (v > USERS[f] ? '(바닥 ' + USERS[f] + ' 위)' : ''));
    if (!m || !(v >= USERS[f])) low.push(f + ' = ' + (m ? m[1] : '못 찾음') + '(바닥 ' + USERS[f] + ')');
  }
  ok(low.length === 0, 'A3 ★ **문턱은 한 칸도 안 내려갔다**(334 규약 · 내리면 [D4]·[E1] 이 헛초록이 된다 · 796 — 올리는 것은 허용)',
     low.length ? low.join(' · ') : now.join(' · '));

  /* 손으로 적은 «N밀리초만 누른다» 사본이 남아 있으면 그 자는 다시 러너 속도에 붙는다.
     ⚠ [R3]/tap 처럼 **일부러** 짧게 누르는 자리(되돌림 시험)는 홀드가 아니므로 여기서 안 센다. */
  const hand = Object.keys(USERS).filter(f => /while \(Date\.now\(\) - t0 < ms\)/.test(srcs[f]));
  ok(hand.length === 0, 'A4 ★ 자 안에 «시간만 재는» 홀드 사본 0건 — 죽은 사본을 남기지 않았다(295-②·399·460)',
     hand.length ? hand.join(', ') : '0건');

  /* ── [B] 계약 — «표본이 차면 뗀다 · 상한에서 끊는다 · 바닥은 지킨다» ───── */
  blk('B] 계약 — 기계 속도가 달라도 **같은 표본**을 받아낸다');
  const slow = fakePage(1.5);                       /* 클라우드 러너 실측대(1.3~1.9회/초) */
  const S = await holdUntil(slow, { at: AT, need: 6, maxMs: 20000, count: () => 0, mode: 'mouse', settleMs: 10 });
  ok(S.n >= 6 && S.reached, 'B1 ★ 느린 기계(1.5회/초)에서도 문턱 6 을 채운다', S.note);
  ok(S.ms >= 3500, 'B2 채우려고 **실제로 더 눌렀다**(고정 3000ms 였으면 4회에서 끊겼다)', S.ms + 'ms');

  const fast = fakePage(12);                        /* 제품 설계대(6~16회/초) */
  const F = await holdUntil(fast, { at: AT, need: 6, maxMs: 20000, count: () => 0, mode: 'mouse', settleMs: 10 });
  ok(F.n >= 6 && F.reached, 'B3 빠른 기계(12회/초)에서도 같은 문턱을 채운다', F.note);
  ok(F.ms < S.ms, 'B4 ★ **누른 시간이 기계 속도를 따라간다** — 문턱이 시간에서 떨어졌다는 뜻',
     '빠름 ' + F.ms + 'ms ↔ 느림 ' + S.ms + 'ms');

  const FM = await holdUntil(fastFloor(), { at: AT, need: 6, minMs: 1500, maxMs: 20000, count: () => 0, mode: 'mouse', settleMs: 10 });
  ok(FM.ms >= 1500, 'B5 `minMs` 바닥이 지켜진다 — 빠른 기계에서 종전 «고정 시간» 만큼은 누른다(회귀 안전판)', FM.note);

  const C = await holdUntil(fakePage(1.5), { at: AT, need: 9999, maxMs: 2500, count: () => 0, mode: 'mouse', settleMs: 10 });
  ok(!C.reached && C.ms < 6000, 'B6 ★ 도달 불가한 표본이면 **상한에서 끊고** `reached=false` 로 알린다(무한정 안 누른다)', C.note);

  /* ── [R] 되돌림 — 옛 «고정 시간» 자로 되돌리면 같은 기계에서 표본이 굶는다 ─ */
  blk('R] 되돌림 — 이 부품이 «아무것도 안 하고 초록» 인 자가 아니다');
  const old = fakePage(1.5);
  await old.mouse.down(); await old.waitForTimeout(3000); await old.mouse.up();   /* 753 이전의 자 */
  ok(old.ticks() < 6, 'R1 ★ 옛 «고정 3000ms» 자는 같은 기계에서 문턱 6 을 못 채운다 — [B1] 이 재는 것이 실재한다',
     old.ticks() + '회 / 6');
  const old6 = fakePage(1.5);
  await old6.mouse.down(); await old6.waitForTimeout(6000); await old6.mouse.up();  /* 753 이 민 값 */
  ok(true, 'R2 관측 — 753 의 6000ms 는 이 속도에서 겨우 찬다(더 느려지면 다시 빨개진다 = 785 의 뿌리)',
     old6.ticks() + '회 / 6');
  const dead = await holdUntil(fakePage(0), { at: AT, need: 6, maxMs: 1200, count: () => 0, mode: 'mouse', settleMs: 10 });
  ok(!dead.reached && dead.n === 0, 'R3 표본이 아예 안 나는 기계면 초록으로 안 읽는다(헛초록 방지)', dead.note);

  console.log('\nVERIFY785 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

function fastFloor() { return fakePage(12); }
