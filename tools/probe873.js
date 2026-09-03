#!/usr/bin/env node
/* 작업 873 재현기 — 「`verify838` 의 자가 **시드를 고정하고도** 실행마다 흔들린다」
 *
 *   node tools/probe873.js            §1 뿌리 + §2 처방 (약 30초)
 *   node tools/probe873.js --load     위 + §3 부하 재현(동시 4실행 × 2 · 약 40초 더)
 *   node tools/probe873.js --run <burn> <0|1>     (내부용 — §3 이 자기를 자식으로 부른다)
 *
 * ⚑ **조용히 한 줄로 돌리면 이 결함은 안 보인다.** 무변경 트리를 순차로 다섯 번 돌리면 다섯 번이
 *   소수점까지 같다 — 등재문(838 7회차)의 «5회에 C1 ×3.20~3.69» 는 **다른 것을 재고 있었다**:
 *   그 회차는 채점·캡처와 자를 같이 돌리던 중이었고, 이 저장소의 루틴 워커는 **넷이 동시에** 돈다.
 *   ⇒ 재현 조건은 «반복» 이 아니라 **러너 부하**다(§3 이 동시 4실행으로 그것을 만든다).
 *
 * 뿌리(§1): `travel838.js` 는 `addInitScript` 로 `Math.random` 을 고정 시드 PRNG 로 갈아 끼우지만
 *   **페이지 머리에서 한 번만** 심는다. 트리거까지 가는 900+700ms 동안 게임 루프·파티클·적 스폰이
 *   난수를 몇 번 쓰는지는 **프레임 수**에 달렸으므로, 버스트는 수열의 **다른 자리**에서 시작한다.
 *   이 자는 그 «다른 자리» 를 `burn`(트리거 전 난수 k 회 선소비)으로 **결정적으로** 흉내 낸다.
 * 처방(§2): `cap681.js` 가 이미 지키는 규약 — «난수는 **트리거 직전**에 다시 심는다»(LESSONS 666-⑧).
 *   재시드가 있으면 burn 이 0 이든 5003 이든 **한 자리도 안 바뀐다**.
 *
 * 게이트는 `tools/verify873.js` 다(이 자와 같은 손잡이를 쓴다 — 402 «두 벌 금지»).
 */
'use strict';
const path = require('path');
const { spawnSync } = require('child_process');
const { runScene, SCENES } = require('./travel838');

const p2 = n => Math.round(n * 100) / 100;
const AX = ['n', 'A1', 'A2', 'A4', 'A3', 'C1', 'C2', 'C3', 'E2', 'maxD', 'rE'];

/* 씬 결과 → 게이트가 보는 축만 뽑는다(`verify838` [A][C][E] 와 같은 산수) */
function axes(A) {
  const arcNeed = A.n * 2 * Math.asin(Math.min(1, (A.maxD / 2) / Math.max(1e-9, A.rE))) * 180 / Math.PI;
  return { n: A.n, A1: p2(A.body), A2: p2(A.bodyMed), A4: p2(A.bodyMin), A3: p2(A.net),
           C1: p2(A.growth), C2: p2(A.iouPeak), C3: p2(A.fanGap), E2: p2(arcNeed),
           maxD: p2(A.maxD), rE: p2(A.rE) };
}

function table(rows, label) {
  console.log('  ' + ['조건'.padEnd(22), ...AX.map(k => k.padStart(8))].join(''));
  rows.forEach(r => console.log('  ' + [String(r.lab).padEnd(22), ...AX.map(k => String(r.v[k]).padStart(8))].join('')));
  const amp = AX.map(k => {
    const v = rows.map(r => r.v[k]), mn = Math.min(...v), mx = Math.max(...v);
    return { k, mn, mx, pct: mn ? p2((mx - mn) / mn * 100) : 0 };
  });
  console.log('  ' + ('진폭% ' + label).padEnd(22) + amp.map(a => String(a.pct).padStart(8)).join(''));
  return amp;
}

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };

/* 자식 한 판 — §3 이 이 모드를 동시에 여럿 띄운다 */
async function child(burn, rs) {
  const A = await runScene(SCENES[0], null, { burn, reseed: !!rs });
  process.stdout.write('#JSON#' + JSON.stringify(A.err ? { err: A.err } : axes(A)) + '\n');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === '--run') return child(+argv[1] || 0, +argv[2]);

  console.log('# PROBE873 — `travel838` 의 자가 흔들린다(시드를 고정하고도)\n');
  const BURNS = [0, 997, 5003];

  console.log('§1 뿌리 — **재시드 없음**(현행 규약 밖). 트리거 전 난수 소비량만 바뀌어도 값이 갈린다');
  const legacy = [];
  for (const b of BURNS) {
    const A = await runScene(SCENES[0], null, { burn: b, reseed: false });
    if (A.err) { ok(false, '§1 표본을 못 얻었다', A.err); return done(); }
    legacy.push({ lab: 'burn ' + b + ' · 재시드 ✗', v: axes(A) });
  }
  const ampL = table(legacy, '(재시드 ✗)');
  const movedL = ampL.filter(a => a.pct > 0).map(a => a.k);
  ok(movedL.length > 0, '[1a] 재시드가 없으면 «트리거 전 소비량» 만으로 축이 갈린다 — 갈린 축 ' + movedL.length + '개',
     movedL.join(' ') + ' · 최대 진폭 ' + Math.max(...ampL.map(a => a.pct)) + '%');

  console.log('\n§2 처방 — **트리거 직전 재시드**(`cap681.js` 규약 · LESSONS 666-⑧). 같은 흔듦에 안 움직인다');
  const fixed = [];
  for (const b of BURNS) {
    const A = await runScene(SCENES[0], null, { burn: b, reseed: true });
    if (A.err) { ok(false, '§2 표본을 못 얻었다', A.err); return done(); }
    fixed.push({ lab: 'burn ' + b + ' · 재시드 ✓', v: axes(A) });
  }
  const ampF = table(fixed, '(재시드 ✓)');
  ok(ampF.every(a => a.pct === 0), '[2a] 재시드가 있으면 **열한 축 전부 진폭 0** — 갈린 축 '
     + ampF.filter(a => a.pct > 0).length + '개', BURNS.join(' / ') + ' 세 판이 소수점까지 같다');

  if (argv.includes('--load')) {
    console.log('\n§3 부하 재현 — 동시 4실행(등재문이 «5회» 로 본 그 흔들림의 실제 조건)');
    const self = path.join(__dirname, 'probe873.js');
    const fire = (rs) => {
      const kids = Array.from({ length: 4 }, () =>
        spawnSync(process.execPath, [self, '--run', '0', String(rs)], { encoding: 'utf8', timeout: 180000 }));
      return kids.map(k => { const m = /#JSON#(.*)/.exec(k.stdout || ''); return m ? JSON.parse(m[1]) : { err: 'no-output' }; });
    };
    for (const rs of [0, 1]) {
      const got = fire(rs);
      if (got.some(g => g.err)) { ok(false, '§3 자식이 표본을 못 얻었다 (재시드 ' + (rs ? '✓' : '✗') + ')', got.map(g => g.err).join(' ')); continue; }
      const amp = table(got.map((v, i) => ({ lab: '동시 #' + (i + 1) + ' · 재시드 ' + (rs ? '✓' : '✗'), v })), rs ? '(재시드 ✓)' : '(재시드 ✗)');
      const moved = amp.filter(a => a.pct > 0);
      if (rs) ok(moved.length === 0, '[3b] 재시드 ✓ — 동시 4실행이 **전부 같은 값**', '갈린 축 ' + moved.length + '개');
      else ok(moved.length > 0, '[3a] 재시드 ✗ — 동시 4실행이 갈린다(등재문이 본 그 얼굴) — 갈린 축 ' + moved.length + '개',
              moved.map(a => a.k + ' ' + a.mn + '~' + a.mx).join(' · ') || '이 러너에선 안 갈렸다(부하 부족)');
    }
  } else {
    console.log('\n(§3 부하 재현은 `--load` 로 켠다 — 동시 4실행 × 2)');
  }
  done();
}

function done() {
  console.log('\nPROBE873 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
}

main();
