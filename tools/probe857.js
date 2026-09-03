#!/usr/bin/env node
/* 857 재현기 — `verify494` [2] 「30일 1시드 ≤ 120초」 가 **무엇을 재고 있었나**
 *
 *   node tools/probe857.js            전부(≈5분 — [1] 이 캐시 없는 30일 실행이다)
 *   node tools/probe857.js --fast     [1] 을 건너뛴다(그 항과 그것을 쓰는 [3]·[4] 가 빠진다)
 *
 * 등재문(PROGRESS 857)의 가설은 이랬다:
 *   «[2] 는 `--calib` 없이 부르므로 κ 표를 **매번 처음부터** 세운다(CAL_STAGES 19앵커 × CAL_SEC 60초).
 *    그러면 그 문턱은 «봇이 빠른가» 가 아니라 «이 기계에서 κ 를 새로 세우는 데 얼마 걸리는가» 다.»
 *
 * 338 규칙대로 **처방 전에 재현**한다. 이 프로브가 가르는 것은 딱 하나 — **시간을 무엇이 먹는가**:
 *   [1] 등재문 재현     — 캐시 없이 30일 1시드가 실제로 120초를 넘는다
 *   [2] 갈라 재기       — 같은 명령에 캐시만 주면(κ 실측 생략) 같은 시뮬이 몇 초인가
 *   [3] 계량 ↔ 벽시계   — bot199 가 스스로 찍는 `calSec`(857 신설)이 두 실행의 벽시계 차와 맞는가
 *                         (안 맞으면 그 계량을 자의 근거로 쓸 수 없다)
 *   [4] 몫              — 보정이 전체의 몇 %인가 (등재문 «시간은 시뮬이 아니라 보정이 먹는다»)
 *   [5] 시뮬 예산       — 494 등재문이 뜻한 «30일 ≤ 2분» 이 시뮬만으로는 성립하는가
 *   [6] 외삽            — 앵커 **한 개**를 캐시 없이 재고 × 앵커 수 하면 [1] 의 보정 몫이 나오는가
 *                         (= 게이트가 19앵커를 다 사지 않고도 보정 축을 잴 수 있는가)
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FAST = process.argv.includes('--fast');
const { CAL_STAGES, CAL_SEC } = require(path.join(ROOT, 'tools', 'bot199.js'));

let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); c ? pass++ : fail++; };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p857-'));
const run = (args) => {
  const md = path.join(tmp, 'r' + Math.random().toString(36).slice(2) + '.md');
  const js = md.replace(/\.md$/, '.json');
  const t0 = Date.now();
  let code = 0;
  try { execFileSync(process.execPath, [path.join(ROOT, 'tools', 'bot199.js'), ...args, '--out=' + md, '--json=' + js],
                     { cwd: ROOT, stdio: 'pipe', timeout: 20 * 60 * 1000 }); }
  catch (e) { code = e.status == null ? -1 : e.status; }
  const wall = (Date.now() - t0) / 1000;
  const rep = fs.existsSync(js) ? JSON.parse(fs.readFileSync(js, 'utf8')) : null;
  return { wall, code, rep };
};

/* 캐시 표본 — 저장소의 확정 표를 tmp 로 복사해 쓴다(원본을 실행이 덧쓰지 않게).
   ⚠ 여기서 재는 것은 **시간**이지 κ 값이 아니다 — 표가 낡아도 «시뮬이 몇 초인가» 는 성립한다. */
const CACHE_SRC = path.join(ROOT, 'docs', 'review', '199-calib-r25.json');
const cache = path.join(tmp, 'cal.json');
console.log('[0] 표본');
ok(fs.existsSync(CACHE_SRC), 'κ 캐시 표본 존재 — docs/review/199-calib-r25.json');
if (fs.existsSync(CACHE_SRC)) fs.copyFileSync(CACHE_SRC, cache);
ok(CAL_STAGES.length >= 2 && CAL_SEC > 0, `CAL_STAGES ${CAL_STAGES.length}앵커 · CAL_SEC ${CAL_SEC}초 (bot199 가 직접 넘긴 값)`);

/* ── [1] 등재문 재현 — 캐시 없이 30일 1시드 ─────────────────────────── */
console.log('[1] 등재문 재현 — `--days=30 --seeds=1 --policy=diligent` (캐시 없음 · verify494 [2] 와 같은 명령)');
let raw = null;
if (FAST) {
  console.log('       (--fast — 건너뜀)');
} else {
  raw = run(['--days=30', '--seeds=1', '--policy=diligent']);
  ok(raw.code === 0 && raw.rep, `종료 코드 0 (실제 ${raw.code})`);
  ok(raw.wall > 120, `벽시계 ${raw.wall.toFixed(1)}초 > 120초 — 등재문의 빨강이 재현된다`);
  if (raw.rep) ok(raw.rep.calAnchors === CAL_STAGES.length,
                  `이 실행이 κ 앵커 ${raw.rep.calAnchors}개를 **새로 셌다**(= CAL_STAGES ${CAL_STAGES.length}개)`);
}

/* ── [2] 갈라 재기 — 같은 명령 + 캐시 ───────────────────────────────── */
console.log('[2] 갈라 재기 — 같은 명령에 `--calib=<캐시>` 만 더한다');
const hit = run(['--days=30', '--seeds=1', '--policy=diligent', '--calib=' + cache]);
ok(hit.code === 0 && hit.rep, `종료 코드 0 (실제 ${hit.code})`);
ok(!!hit.rep && /^캐시/.test(hit.rep.calFrom || ''), `κ 표를 캐시에서 읽었다 — ${hit.rep ? hit.rep.calFrom : '?'}`);
ok(!!hit.rep && hit.rep.calAnchors === 0 && hit.rep.calSec < 1,
   `보정 몫 ${hit.rep ? hit.rep.calSec.toFixed(2) : '?'}초 · 앵커 ${hit.rep ? hit.rep.calAnchors : '?'}개 — 안 셌다`);
console.log(`       시뮬만 ${hit.wall.toFixed(1)}초 (`
            + `보고서 계량 ${hit.rep ? hit.rep.simSec.toFixed(1) : '?'}초)`);

/* ── [3] 계량 ↔ 벽시계 ──────────────────────────────────────────────── */
console.log('[3] bot199 의 자기 계량(`calSec` · 857 신설)이 두 실행의 벽시계 차와 맞는가');
if (raw && raw.rep) {
  const byWall = raw.wall - hit.wall;                 /* 벽시계 뺄셈이 말하는 보정 몫 */
  const bySelf = raw.rep.calSec;                      /* 실행이 스스로 찍은 보정 몫 */
  const dev = Math.abs(byWall - bySelf) / Math.max(1, bySelf);
  ok(dev <= 0.20, `벽시계 차 ${byWall.toFixed(1)}초 ↔ 자기 계량 ${bySelf.toFixed(1)}초 — 어긋남 ${(dev * 100).toFixed(1)}% ≤ 20%`);
} else console.log('       ([1] 을 건너뛰어 못 잰다)');

/* ── [4] 몫 — 시간을 무엇이 먹는가 ──────────────────────────────────── */
console.log('[4] 몫 — 등재문 «시간은 시뮬이 아니라 보정이 먹는다»');
if (raw && raw.rep) {
  const share = raw.rep.calSec / raw.rep.elapsedSec;
  ok(share >= 0.60, `보정이 전체의 ${(share * 100).toFixed(1)}% ≥ 60% (전체 ${raw.rep.elapsedSec.toFixed(1)}초 · 보정 ${raw.rep.calSec.toFixed(1)}초)`);
} else console.log('       ([1] 을 건너뛰어 못 잰다)');

/* ── [5] 시뮬 예산 — 494 등재문이 뜻한 «30일 ≤ 2분» ─────────────────── */
console.log('[5] 시뮬 예산 — 캐시를 쓰면 494 의 문턱이 성립하는가');
ok(!!hit.rep && hit.rep.simSec <= 120, `시뮬 ${hit.rep ? hit.rep.simSec.toFixed(1) : '?'}초 ≤ 120초`);

/* ── [6] 외삽 — 앵커 한 개로 표 전체를 대신 잴 수 있는가 ────────────── */
console.log('[6] 외삽 — 앵커 한 개(캐시 없음) × 앵커 수 ≈ [1] 의 보정 몫');
const one = run(['--days=1', '--seeds=1', '--policy=casual', '--calstages=' + CAL_STAGES[Math.floor(CAL_STAGES.length / 2)]]);
ok(one.code === 0 && one.rep, `종료 코드 0 (실제 ${one.code})`);
if (one.rep) {
  ok(one.rep.calAnchors === 1 && one.rep.calSecPerAnchor > 0,
     `앵커 1개 실측 — 개당 ${one.rep.calSecPerAnchor.toFixed(1)}초 + 하한 고정비 ${one.rep.calFloorSec.toFixed(1)}초`);
  /* 외삽 = 앵커당 × 앵커 수 + 하한 고정비(앵커 수와 무관 — 857 이 갈라 찍는다) */
  const est = one.rep.calSecPerAnchor * CAL_STAGES.length + one.rep.calFloorSec;
  if (raw && raw.rep) {
    const dev = Math.abs(est - raw.rep.calSec) / raw.rep.calSec;
    ok(dev <= 0.40, `외삽 ${est.toFixed(1)}초 ↔ 실측 ${raw.rep.calSec.toFixed(1)}초 — 어긋남 ${(dev * 100).toFixed(1)}% ≤ 40%`);
  } else console.log(`       외삽 ${est.toFixed(1)}초 (비교할 [1] 이 없다)`);
}

console.log(`\nPROBE857 ${pass}/${pass + fail}`);
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
process.exit(fail === 0 ? 0 : 1);
