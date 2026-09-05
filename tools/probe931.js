/* 재현·전수 931 — 사슬 밖 44 를 «장치가 실제로 뜻을 갖는가» 로 가른다
 *
 *   node tools/probe931.js               — 갈래별 표
 *   node tools/probe931.js --list A      — 그 갈래의 파일 이름만 (한 줄에 하나)
 *   node tools/probe931.js --json        — 기계가 읽을 꼴
 *
 * 왜 이 자가 있나 —
 *   925 가 «화소를 재는 자» 를 0 으로 만든 뒤(308/308) 남은 여집합이 **44** 다. 이 44 는 화소를
 *   안 재므로 918/922 걷개도 907 깃발도 **하나도 안 걸린다** — 그런데 291 정착과 731 소실
 *   차단기는 화소와 무관한 장치다. 931 등재문이 못박은 것은 «전부 갈아 끼워라» 가 아니라
 *   **«갈아 끼운 뒤 각 자의 판정이 «장치 없는 세상» 에서 굳었는지 대조하라»** 이고, 그 대조는
 *   갈래를 나눠야 뜻이 있다. 갈래를 손으로 적으면 다음에 자가 늘 때 아무도 안 센다(907 교훈)
 *   ⇒ **판별기로 적는다.** 규칙은 세 부품의 «실제 관문» 을 그대로 읽는다(402 «사본을 지운다»):
 *     · 291 — `settle291.enabled()` 와 같은 규칙(entry 가 `verify*.js`) **∧** 250ms 이상 고정 대기가 있다
 *              (`MIN_WAIT` 미만만 있는 자는 장치가 붙어도 한 번도 안 돈다)
 *     · 731 — 페이지 안에서 도는 코드가 있다(`page.evaluate`/`$eval` 계열) — 삼킬 것이 있어야 차단기가 뜻을 갖는다
 *     · 918/922 — `shell918.qualifies(entry)`
 *     · 907 — entry 가 `verify*.js` **∧** `raster907.qualifies(entry)`
 *
 * 갈래 —
 *   A  731만        — entry 가 verify 가 아니라 291 이 안 붙고, evaluate 는 쓴다 (probe*·bisect*·fnchk*)
 *   B  731 + 291    — verify* 이고 250ms 이상 대기와 evaluate 를 둘 다 쓴다 — **타이밍이 바뀔 수 있는 유일한 갈래**
 *   C  731만(verify) — verify* 지만 250ms 이상 대기가 없어 291 이 실제로는 한 번도 안 돈다
 *   D  장치 무의미   — evaluate 도 없고 291 도 안 붙는다. 세상은 안 바뀌지만 **다음에 evaluate 를 쓰면
 *                      자동으로 차단기를 받는다** 는 것이 사슬에 넣는 값이다
 *   E  push 게이트   — `smoke.js`. 지시서 [6] 이 push 전 필수 게이트로 못박은 자라 **맨 마지막**에 손댄다
 *
 * 갈래는 «위험» 순이 아니라 «무엇이 바뀌는가» 순이다 — B 만 타이밍을 건드리므로 전후 대조의
 * 회수(929: 플레이키한 자는 1회씩으로는 안 된다)를 거기에 몰아야 한다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { classifyFile } = require('./verify925');
const shell918 = require('./shell918');
const raster907 = require('./raster907');
const settle291 = require('./settle291');

const TOOLS = __dirname;

/* 페이지 안에서 도는 코드 — 731 차단기가 삼킬 것이 있는가.
   `page.evaluate` · `page.$eval` · `page.$$eval` · `frame.evaluate` 전부 같은 자리로 들어온다. */
const RE_EVAL = /\.\$\$?eval\s*\(|\.evaluate(?:Handle)?\s*\(/;

/* 고정 대기 — 291 은 `page.waitForTimeout(n)` 직후에만 돈다(`MIN_WAIT` 이상일 때). */
function waits(src) {
  return [...src.matchAll(/waitForTimeout\s*\(\s*(\d+)\s*\)/g)].map(m => +m[1]);
}

/* 한 자의 «장치 지도» — 소스만 보고 낸다(브라우저 없이 물을 수 있다). */
function devices(file) {
  const full = path.join(TOOLS, file);
  const src = fs.readFileSync(full, 'utf8');
  const isVerify = /^verify.*\.js$/.test(file);
  const w = waits(src);
  const longWait = w.some(n => n >= settle291.MIN_WAIT);
  return {
    file,
    isVerify,
    maxWait: w.length ? Math.max(...w) : 0,
    nLongWait: w.filter(n => n >= settle291.MIN_WAIT).length,
    d291: isVerify && longWait,
    d731: RE_EVAL.test(src),
    d918: shell918.qualifies(full),
    d907: isVerify && raster907.qualifies(full),
  };
}

function branch(d) {
  if (d.file === 'smoke.js') return 'E';          /* push 게이트 — 맨 마지막 */
  if (d.d291) return 'B';                          /* 타이밍이 바뀔 수 있는 유일한 갈래 */
  if (d.d731) return d.isVerify ? 'C' : 'A';
  return 'D';
}

/* 사슬 밖 전수 — 목록을 적지 않는다(925 [2] 와 같은 꼴: 판별기가 센다). */
function census() {
  const out = [];
  for (const f of fs.readdirSync(TOOLS).filter(x => x.endsWith('.js')).sort()) {
    let cls;
    try { cls = classifyFile(path.join(TOOLS, f)); } catch (_) { continue; }
    if (cls !== 'bypass') continue;
    const d = devices(f);
    d.branch = branch(d);
    out.push(d);
  }
  return out;
}

const BRANCH_NAME = {
  A: '731만 (probe·bisect·fnchk — 291 은 entry 가 verify 가 아니라 안 붙는다)',
  B: '731 + 291 (verify* · 250ms 이상 대기 — 타이밍이 바뀔 수 있는 유일한 갈래)',
  C: '731만 (verify* 지만 250ms 이상 대기가 없어 291 이 안 돈다)',
  D: '장치 무의미 (evaluate 없음 · 291 안 붙음 — 사슬에 넣는 값은 «다음 자를 위한 것»)',
  E: 'push 게이트 (smoke.js — 맨 마지막)',
};

module.exports = { census, devices, branch, RE_EVAL, waits };

if (require.main !== module) return;

const argv = process.argv.slice(2);
const rows = census();

if (argv[0] === '--json') {
  console.log(JSON.stringify(rows, null, 2));
} else if (argv[0] === '--list') {
  const b = String(argv[1] || '').toUpperCase();
  for (const r of rows) if (r.branch === b) console.log(r.file);
} else {
  console.log('PROBE931 — 사슬 밖 ' + rows.length + '자를 «장치가 뜻을 갖는가» 로 가른다\n');
  console.log('  파일             291  731  918  907  maxWait  갈래');
  console.log('  ' + '-'.repeat(58));
  for (const r of rows) {
    const y = v => (v ? ' Y ' : ' . ');
    console.log('  ' + r.file.padEnd(16) + y(r.d291) + '  ' + y(r.d731) + '  ' +
      y(r.d918) + '  ' + y(r.d907) + '  ' + String(r.maxWait).padStart(6) + '   ' + r.branch);
  }
  console.log('');
  for (const b of ['A', 'B', 'C', 'D', 'E']) {
    const n = rows.filter(r => r.branch === b).length;
    console.log('  갈래 ' + b + '  ' + String(n).padStart(2) + '자 — ' + BRANCH_NAME[b]);
  }
  const d918 = rows.filter(r => r.d918).length, d907 = rows.filter(r => r.d907).length;
  console.log('\n  ⚑ 918/922 걷개 ' + d918 + '자 · 907 깃발 ' + d907 +
    '자 — 등재문의 «화소를 안 재서 걷개는 필요 없다» 가 실측으로 참이다.');
}
