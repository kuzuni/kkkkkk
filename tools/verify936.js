#!/usr/bin/env node
/* 작업 936 게이트 — «측정 상자를 움직이는 제품 상태에 매단 자» 인구를 0 으로 지킨다
 *
 *   node tools/verify936.js  [--fast]      (--fast = [5] 실측 A/B 를 건너뛴다)
 *
 * ── 무엇을 지키는가 ──────────────────────────────────────────────────────
 * 928 은 `verify856` **한 자**에서 «상자가 `player.x` 에 매달려 판마다 흔들린다» 를 고쳤고,
 * 936 등재문이 물은 것은 «같은 꼴이 몇이냐 — 아무도 안 셌다» 였다. 처방은 907 과 같다:
 * 조건을 `tools/pin936.js` 한곳에 적고 **세는 쪽(probe936)·지키는 쪽(이 자)**이 그것을 읽는다.
 * 그래서 새 자가 조건을 갖추는 순간 **자동으로** 이 자가 빨개진다 — 빠질 자리가 없다.
 *
 * 절:
 *   [1] 인구      — ①∧②∧③ 을 갖췄는데 아무 말도 없는 자 **0**
 *   [2] 예외 래칫 — 예외는 «파일 안에 이유를 적은» 둘뿐이고 이름까지 못박는다
 *   [3] 못박음    — 936 이 고친 8자가 여전히 파생 **앞에서** 못박는다(되돌아가면 빨강)
 *   [4] 되돌림    — 그 줄을 뺀 사본을 판별기가 **HIT 로 잡는다**([1] 이 «무엇을 해도 초록» 이 아니다)
 *   [5] 실측      — 안 못박은 사본의 판간 산포 > 못박은 자(≥3배) · 실증은 `probe936`
 *   [6] 판별기    — 조건을 하나씩 뺀 인공 표본에서 판정이 꺼진다(①만·②만·③ 못박음)
 *
 * ⚠ 문턱을 올려 닫지 않았다 — 고친 것은 «어느 자리에서 재는가» 한 줄씩이고, 각 자의 상자 크기·
 *   문턱·표본 구성은 한 글자도 안 건드렸다(회귀 `verify710` 14/14 · `verify792` 25/25 ·
 *   `verify864` 8/8 · `verify541` 68/68 이 그 증거다).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const pin = require('./pin936');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = __dirname;
const FAST = process.argv.includes('--fast');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

/* 936 이 못박은 자 — 이름을 적어 두는 이유는 «되돌아가면 빨개지게» 다(래칫). */
const PINNED = ['probe710.js', 'probe792.js', 'probe864.js', 'probe865.js',
                'size541lib.js', 'verify710.js', 'verify792.js', 'verify864.js'];
/* 928 이 이미 고쳐 둔 자 — 같은 조건을 같은 이름으로 지킨다. */
const PINNED_928 = ['verify856.js', 'probe928.js'];
/* 예외 — 상자가 «플레이어 자신의 그림» 이라 못박으면 재는 것이 사라지는 자(파일에 이유가 있다). */
const EXEMPT = ['probe523.js', 'verify79.js'];

console.log('VERIFY936 — 측정 상자를 움직이는 상태에 매단 자 인구\n');

/* ── [1] 인구 ── */
const rows = pin.scanDir(TOOLS);
const hits = rows.filter(r => r.hit);
ok(hits.length === 0,
   '[1a] ①∧②∧③ 인데 아무 말도 없는 자 ' + hits.length + '자 (0 이라야 한다)' +
   (hits.length ? ' — ' + hits.map(r => r.file).join(' · ') : ''));
ok(rows.filter(r => r.pixel).length >= 12,
   '[1b] 인구조사가 실제로 돈다 — ① 파생 ' + rows.length + '자 중 ② 화소 상자 ' +
   rows.filter(r => r.pixel).length + '자 (≥ 12)');

/* ── [2] 예외 래칫 ── */
const exNames = rows.filter(r => r.raw && r.exempt).map(r => r.file).sort();
ok(exNames.join(',') === EXEMPT.join(','),
   '[2a] 선언된 예외는 둘뿐이고 이름이 같다 — [' + exNames.join(' · ') + ']');
ok(exNames.every(n => (pin.classify(n, TOOLS).reason || '').length >= 20),
   '[2b] 예외마다 **이유가 파일 안에** 있다 (자동 승인이 아니라 적어 둔 말이다)');

/* ── [3] 못박음 ── */
for (const f of PINNED.concat(PINNED_928)) {
  const r = pin.classify(f, TOOLS);
  ok(r.pixel && r.pinned,
     '[3] `' + f + '` 이 파생(' + r.derivAt + ') **앞**에서 못박는다 — 못박기@' + r.lastPin +
     (r.moveAfterPin >= 0 ? ' ⚠ 그 뒤 step@' + r.moveAfterPin : ''));
}

/* ── [4] 되돌림 시험 ── */
const V710 = fs.readFileSync(path.join(TOOLS, 'verify710.js'), 'utf8');
const unpinned = V710.replace(/[ \t]*\/\* ⚑ 936 —[\s\S]*?\*\/\n[ \t]*player\.x = WORLD\.w \/ 2;[^\n]*\n/, '');
ok(unpinned !== V710, '[4a] 되돌림 재료를 만들었다 — `verify710` 에서 936 이 넣은 줄만 뺀다');
const cUn = pin.classifySource(unpinned, 'verify710.js');
ok(cUn.hit === true,
   '[4b] 못박기를 빼면 판별기가 **HIT 로 잡는다** — 파생@' + cUn.derivAt + ' 못박기@' + cUn.lastPin +
   ' step@' + cUn.moveAfterPin + ' (안 잡히면 [1] 은 «무엇을 해도 초록» 이다)');
const cOn = pin.classifySource(V710, 'verify710.js');
ok(cOn.hit === false && cOn.pinned === true, '[4c] 원본은 그대로 초록이다 (되돌림만 빨갛다)');

/* ── [5] 실측 A/B ── */
if (FAST) {
  console.log('  [건너뜀] [5] 실측 A/B — `--fast`');
} else {
  let ab = null;
  try {
    const txt = execFileSync(process.execPath, [path.join(TOOLS, 'probe936.js'), '--n', '2', '--json'],
                             { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
    ab = JSON.parse(txt.trim().split('\n').filter(l => l.startsWith('{')).pop());
  } catch (e) {
    ok(false, '[5] `probe936` 이 즉사했다 — ' + String((e && e.message) || e).split('\n')[0].slice(0, 160));
  }
  if (ab) {
    ok(ab.pinned.pass, '[5a] 못박은 `verify710` 이 2판 다 PASS');
    ok(ab.loose.worst.pct >= 3 * (ab.pinned.worst.pct || 0.001) && ab.loose.worst.pct >= 1,
       '[5b] 안 못박은 사본의 판간 산포가 더 크다 — 사본 ' + ab.loose.worst.k + ' ' +
       ab.loose.worst.pct + '% ↔ 지금 자 ' + ab.pinned.worst.k + ' ' + ab.pinned.worst.pct + '%');
    ok(ab.pinned.worst.pct <= 2,
       '[5c] 못박은 자의 산포가 2% 이하다 — 최악 ' + ab.pinned.worst.k + ' ' + ab.pinned.worst.pct + '%');
  }
}

/* ── [6] 판별기 자기 시험 — 조건 하나씩 ── */
const BASE = [
  'async function m(){ await page.evaluate(() => {',
  '  spawnStage(); step(1/60); draw(); const ox = camOx, oy = camOy;',
  '  const CX = Math.round(player.x + ox + 70), CY = Math.round(player.y + oy - 22), R = 60;',
  '  const bx = Math.round((CX - R) * SC), by = Math.round((CY - R) * SC);',
  '  const grab = () => ctx.getImageData(bx, by, 2 * R * SC, 2 * R * SC).data;',
  '  return grab().length; }); }',
].join('\n');
ok(pin.classifySource(BASE, 't.js').hit === true, '[6a] 표본(①∧②∧③)을 HIT 로 잡는다');
ok(pin.classifySource(BASE.replace('player.x + ox + 70', 'ox + 70')
                          .replace('player.y + oy - 22', 'oy - 22'), 't.js').hit === false,
   '[6b] ① 을 빼면(상자가 player 와 무관) 안 잡는다');
ok(pin.classifySource(BASE.replace(/const grab[^\n]*\n/, '  const grab = () => bx + by;\n'), 't.js').hit === false,
   '[6c] ② 를 빼면(화소를 안 잰다) 안 잡는다 — 좌표를 값으로만 쓰는 자(114 계열)가 여기 든다');
ok(pin.classifySource(BASE.replace('  const CX =', '  player.x = WORLD.w/2; player.y = WORLD.h/2;\n  const CX ='),
                      't.js').hit === false, '[6d] ③ 을 채우면(파생 앞에서 못박으면) 안 잡는다');
ok(pin.classifySource(BASE.replace('  const CX =', '  player.x = WORLD.w/2;\n  step(1/60);\n  const CX ='),
                      't.js').hit === true, '[6e] 못박고 **다시 step 을 돌면** 도로 잡는다(순서를 본다)');
ok(pin.classifySource('/* 936-예외: 상자가 플레이어 자신의 그림을 따라간다 — 자기상쇄 */\n' + BASE, 't.js').hit === false &&
   pin.classifySource('/* 936-예외: 상자가 플레이어 자신의 그림을 따라간다 — 자기상쇄 */\n' + BASE, 't.js').raw === true,
   '[6f] 예외 선언은 «없는 것» 이 아니라 «밝힌 것» 이다 — raw 는 참인 채 hit 만 꺼진다');

console.log('\nVERIFY936 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
process.exit(fail ? 1 : 0);
