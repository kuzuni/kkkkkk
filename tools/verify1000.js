/* 1000 게이트 — **`probe792r15` 가 적는 수는 판을 넘어 안 흔들린다** (2026-09-06, sess-1727-3239 루틴 워커 B)
 *
 *   node tools/verify1000.js
 *
 * ── 무엇을 지키나 ─────────────────────────────────────────────────────────
 * 등재(1000)는 «`(기록) 종:시전각` 줄이 판마다 갈린다 — 판정 줄은 안 흔들린다» 였다.
 * 지금은 잠복이지만(점수 20/20 불변), **자가 적는 수가 흔들리면 그 수로는 아무것도 못 견준다** —
 * 다음 회차가 «r15 는 −1.467 이라 적었는데 지금은 −1.445 다» 를 결함으로 읽는 자리가 그것이다.
 *
 * ── 뿌리(실측) ────────────────────────────────────────────────────────────
 * 부팅 프레임 수는 **벽시계**를 탄다(928-②) — `goto` 뒤 1100ms 동안 제품의 제 루프가 판마다 다른
 * 프레임 수로 돈다. ⚠ 여기서 한 겹 더 들어간다: `spawnStage()` 는 용사의 **x·y 를 WORLD 중심으로
 * 되돌려 준다**(실측 세 판 모두 정확히 960 · 1536) — 그래서 «자리는 이미 못박혀 있다» 로 읽힌다.
 * 새는 것은 **속도**다(부팅 직후 vx 49.99 / 141.86 / 91.33 · vy 189.6 / −180.3 / −207.3).
 * 그 vx·vy 가 바로 다음 `step()` 에서 용사를 옮기고(자리 (961.2,1538.9)/(962.2,1533.3)/(960.0,1534.2)),
 * 조준각 `atan2(표적 − 용사)` 가 그만큼 갈린다.
 *
 * ── 이 자의 절 ────────────────────────────────────────────────────────────
 *   §1 소스 계약 — 못박기가 **한 곳**(`seatPlayer`)에 있고 발을 만드는 길이 그 곳을 지난다
 *   §2 결정성   — 프로세스 **3판**의 stdout 이 바이트 동일(928-① «판을 묻는 자리»)
 *   §3 흡수     — 서로 다른 두 «부팅 속도»(결정적 주입)에서 출력이 같다
 *   §R 되돌림   — 못박기를 빼면 그 두 판이 **갈린다**(안 그러면 무엇을 해도 초록인 자다)
 * ⚠ §R 의 재료로 **자연 표류를 쓰지 않는다**(928-④) — 두 판이 우연히 가까이 서면 시험 자신이
 *   플레이키가 된다. `P1000_KICK` 으로 **같은 크기를 결정적으로** 민다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HERE = __dirname;
const PROBE = path.join(HERE, 'probe792r15.js');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const note = m => console.log('  (기록) ' + m);

const run = (env) => {
  try {
    return execFileSync(process.execPath, [PROBE],
      { cwd: path.resolve(HERE, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
        env: Object.assign({}, process.env, env || {}), timeout: 180000 });
  } catch (e) { return (e.stdout || '') + '\n[[비정상 종료]] ' + (e.status === undefined ? e.message : 'code ' + e.status); }
};
const angLine = s => (s.split('\n').find(l => l.includes('종:시전각')) || '').trim();

/* ── §1 소스 계약 ── */
console.log('\n§1 소스 계약 — 못박기는 한 곳에 있고, 발을 만드는 길이 그 곳을 지난다');
const src = fs.readFileSync(PROBE, 'utf8');
{
  const seat = /const seatPlayer = \(\) => \{[\s\S]{0,400}?\};/.exec(src);
  ok(!!seat, '`seatPlayer()` 가 선언돼 있다');
  const body = seat ? seat[0] : '';
  ok(/player\.x\s*=\s*WORLD\.w\s*\/\s*2/.test(body) && /player\.y\s*=\s*WORLD\.h\s*\/\s*2/.test(body),
     '자리 두 값(x·y)을 못박는다');
  ok(/player\.vx\s*=\s*0/.test(body) && /player\.vy\s*=\s*0/.test(body),
     '**속도 두 값(vx·vy)도** 못박는다 — 새는 것이 이쪽이라 빼면 병이 그대로다(928-②)');
  /* 못박기가 `putFoe` 안에서 불린다 = 발을 만드는 모든 자리가 그 곳을 지난다 */
  const putFoe = /const putFoe = [\s\S]*?\n    \};/.exec(src);
  ok(!!putFoe && /seatPlayer\(\);/.test(putFoe[0]),
     '`putFoe()` 가 표적을 세운 뒤 `seatPlayer()` 를 부른다(준비 루프의 `step` 이 옮긴 것까지 되돌린다)');
  /* 사본 금지 — 같은 네 줄이 다른 데 또 적혀 있으면 한쪽만 고쳐지는 자리가 된다(402 «사본을 지운다») */
  const copies = (src.match(/player\.vx\s*=\s*0\s*;\s*player\.vy\s*=\s*0/g) || []).length;
  ok(copies === 1, `못박기 사본 ${copies}벌 — 한 벌뿐이다(§3 화소 자도 같은 곳을 쓴다)`);
  ok(/P1000_KICK/.test(src) && /P1000_NOPIN/.test(src),
     '결정적 손잡이 둘이 있다(§3·§R 이 자연 표류를 안 쓰기 위한 것)');
}

/* ── §2 결정성 — 프로세스 3판 ── */
console.log('\n§2 결정성 — 손 안 댄 3판의 stdout 이 바이트 동일한가');
const plain = [run(), run(), run()];
ok(plain.every(s => /PROBE792R15 \d+\/\d+ PASS/.test(s)), '3판 모두 PASS 로 끝난다');
note('시전각 줄 — ' + plain.map(angLine).map(l => l.replace('(기록) 종:시전각(rad) — ', '')).join('\n           ↔ '));
ok(plain[1] === plain[0] && plain[2] === plain[0],
   '3판 stdout **바이트 동일** — 1000 등재문이 잰 «한 줄만 갈린다» 가 닫혔다');
const uniqAng = new Set(plain.map(angLine));
ok(uniqAng.size === 1, `«종:시전각» 줄의 값 갈래 ${uniqAng.size}개 — 하나여야 한다`);

/* ── §3 흡수 — 부팅 속도를 결정적으로 주입해도 같은 수가 나온다 ── */
console.log('\n§3 흡수 — 서로 다른 «부팅 속도» 두 판(결정적 주입)');
const KA = '600,-400', KB = '-500,700';
const kA = run({ P1000_KICK: KA }), kB = run({ P1000_KICK: KB });
ok(/PASS/.test(kA) && /PASS/.test(kB), `주입 두 판이 모두 PASS (vx,vy = ${KA} ↔ ${KB})`);
ok(angLine(kA) === angLine(kB),
   '주입이 서로 반대여도 시전각이 **같다** — 못박기가 부팅 속도를 통째로 흡수한다');
ok(angLine(kA) === angLine(plain[0]),
   '그 값이 손 안 댄 판의 값과도 같다 — 흡수한 자리가 곧 기본 자리다');

/* ── §R 되돌림 시험 ── */
console.log('\n§R 되돌림 시험 — 못박기를 빼면 그 두 판이 갈리는가');
const nA = run({ P1000_KICK: KA, P1000_NOPIN: '1' }), nB = run({ P1000_KICK: KB, P1000_NOPIN: '1' });
ok(/PASS/.test(nA) && /PASS/.test(nB), '못박기를 빼도 점수는 그대로 PASS — 이 병은 «판정» 이 아니라 «기록값» 이다(잠복)');
note('못박기 없음 — ' + angLine(nA).replace('(기록) 종:시전각(rad) — ', '') +
     '\n              ↔ ' + angLine(nB).replace('(기록) 종:시전각(rad) — ', ''));
ok(angLine(nA) !== angLine(nB),
   '못박기 없이는 두 판이 **갈린다** — §2·§3 의 초록이 «아무것도 안 하는 자» 의 초록이 아니다');

console.log(`\nVERIFY1000 ${pass}/${pass + fail} ` + (fail ? 'FAIL' : 'PASS'));
process.exit(fail ? 1 : 0);
