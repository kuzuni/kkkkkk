/* 작업 999 게이트 — «`cap710` 시트 좌하단 블록이 다섯 판에 한 판꼴로 갈린다» 가 닫혔는지 본다
 *
 *   node tools/verify999.js
 *   node tools/verify999.js --runs 6        (기본 4 — [2] 판 수)
 *
 * ⚑ **뿌리는 «그림» 이 아니라 «부스러기» 였다.** 996 이 씨앗·`orbitAng`·시계 셋을 핀으로 박고도
 *   남던 그 블록은, `cap710` 이 규격을 뽑으려고 17종을 두 번씩 실제로 시전하면서 남긴
 *   **떠오르는 피해 숫자 한 장**(`nums`)이다 — `clearFx` 가 여덟 배열을 치우면서 이것만 빠뜨렸다.
 *   그 글자는 마지막 줄 `rico` 칸 상자 안(월드 988.28, 958)에 `fillText` 로 찍히고,
 *   **값이 판마다 갈린다**(«44.2A» ↔ «34.7A» · `raw` 44,234 ↔ 34,691). 값이 갈리는 이유는
 *   하네스의 마지막 안 잡힌 자유도 — **용사 자리**가 부팅 1.2초의 rAF 프레임 수만큼 흔들리기 때문이다.
 *
 * ⚑ **되돌림 시험을 운에 안 맡긴다.** 원래 증상은 «다섯 판에 한 판» 이라 사본을 두 판 찍어서는
 *   «안 갈렸다» 가 수리의 증거가 못 된다(338 이 경고한 «이미 참인 것을 굳힌 게이트» 의 사촌이다).
 *   그래서 [3]·[R] 은 `CAP710_HERO` 손잡이로 **용사를 두 자리에 손으로 세워** 인과를 직접 민다:
 *     [3] 수리된 자 — 두 자리의 시트가 **화소 동일**(자리가 시트를 못 흔든다).
 *     [R] `nums` 를 목록에서 뺀 임시 사본 — 같은 두 자리가 **실제로 갈리고**, 갈린 화소가
 *         **전부 999 블록 안**이다(= 이 자가 겨눈 그 자리가 맞다).
 *
 * ⚠ 캡처는 커밋하지 않는다(2026-08-30 이력 정리) — 전부 임시 폴더에 찍고 지운다.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const PNG = require('./png913').PNG();

const CAP = path.resolve(__dirname, 'cap710.js');
const SRC = fs.readFileSync(CAP, 'utf8');

/* 999 잔여 블록 — 996 이 `probe996`·`verify996` 에 적어 둔 자리 그대로(실측 bbox x 1..87 · y 1838..1927) */
const RESID = { x1: 90, y0: 1830 };

const args = process.argv.slice(2);
const argv = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const RUNS = Number(argv('--runs') || 4);

/* 용사를 세울 두 자리 — 부팅 드리프트의 실측 폭 안에서 고른 값이다(실측 boot x 857~1077) */
const HERO_A = '860,1380', HERO_B = '1080,1640';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'verify999-'));
const clean = () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} };

let pass = 0, fail = 0;
const ok = (name, cond, note) => {
  if (cond) { pass++; console.log('  [OK]   ' + name + (note ? ' — ' + note : '')); }
  else { fail++; console.log('  [FAIL] ' + name + (note ? ' — ' + note : '')); }
};

/* ── 임시 사본 — `nums` 를 clearFx 목록에서 뺀다(수리 전 상태) ───────────────── */
const CUT_NUMS = /rings,\s*\n\s*nums, corpses\]/;
function revertedTool() {
  if (!CUT_NUMS.test(SRC)) {
    console.error('verify999 — clearFx 의 `nums, corpses` 를 cap710 에서 못 찾았다 (자가 낡았다)');
    clean(); process.exit(3);
  }
  const p = path.join(tmp, 'cap710-nonums.js');
  /* 사본은 임시 폴더에 산다 — `./pwlaunch` 와 `__dirname` 이 거기서는 다른 곳을 가리키므로
     둘 다 이 자의 폴더로 못박고 옮긴다(probe996 과 같은 방식). */
  const body = SRC.replace(CUT_NUMS, 'rings]')
                  .replace(/require\('\.\//g, "require('" + __dirname.replace(/\\/g, '\\\\') + "/")
                  .replace(/__dirname/g, JSON.stringify(__dirname));
  fs.writeFileSync(p, body);
  return p;
}

function shoot(tool, out, env) {
  execFileSync(process.execPath, [tool, out], {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: Object.assign({}, process.env, env || {}),
    cwd: path.resolve(__dirname, '..')
  });
  return PNG.sync.read(fs.readFileSync(out));
}

/* 두 장의 차이를 «999 블록 안/밖» 으로 갈라 센다 — 996 규약(지우지 않고 갈라 찍는다) */
function diff(a, b) {
  if (a.width !== b.width || a.height !== b.height) return { bad: true };
  let inn = 0, out = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      const i = (y * a.width + x) * 4;
      if (Math.abs(a.data[i] - b.data[i]) > 8 || Math.abs(a.data[i + 1] - b.data[i + 1]) > 8 ||
          Math.abs(a.data[i + 2] - b.data[i + 2]) > 8) {
        if (x <= RESID.x1 && y >= RESID.y0) inn++; else out++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return { inn, out, box: (inn + out) ? [x0, x1, y0, y1] : null };
}

(async () => {
  console.log('VERIFY999 — cap710 좌하단 블록 결정성 (블록 x ≤ ' + RESID.x1 + ' · y ≥ ' + RESID.y0 + ')');

  /* ── [1] 선언 ────────────────────────────────────────────────── */
  console.log('[1] 선언 — 수리가 «부스러기를 치우는» 꼴로 서 있는가');
  const clearLine = /const clearFx = \(\) => \{ for \(const a of \[([^\]]*)\]\) a\.length = 0; \};/.exec(SRC);
  ok('[1-a] cap710 에 clearFx 목록이 있다', !!clearLine);
  const list = clearLine ? clearLine[1].replace(/\s+/g, ' ').trim() : '';
  ok('[1-b] 목록에 `nums` 가 있다 (999 의 수리 자체)', /\bnums\b/.test(list), list);
  ok('[1-c] 목록에 `corpses` 가 있다 (같은 부류 · 오늘은 그림 Δ0)', /\bcorpses\b/.test(list));
  ok('[1-d] 여덟 배열이 그대로 남아 있다 (996 의 결과를 안 지웠다)',
     ['shots', 'ghosts', 'bolts', 'zones', 'booms', 'drones', 'parts', 'rings'].every(n => new RegExp('\\b' + n + '\\b').test(list)));
  ok('[1-e] 996 의 세 손잡이가 그대로 서 있다 (씨앗·orbitAng·시계)',
     /Math\.random = \(\) =>/.test(SRC) && /orbitAng = ORB;/.test(SRC) && /performance\.now = \(\) => 1e6;/.test(SRC));
  ok('[1-f] `CAP710_HERO` 기본은 «안 건드림»(null) — 시트 기본 동작 불변',
     /const HERO = \(\(\) => \{[\s\S]*?if \(v === undefined \|\| v === ''\) return null;/.test(SRC));
  ok('[1-g] 용사 핀이 규격 시전 «앞» 에 선다',
     SRC.indexOf('if (HERO) { player.x = HERO.x; player.y = HERO.y; }') > 0 &&
     SRC.indexOf('if (HERO) { player.x = HERO.x; player.y = HERO.y; }') < SRC.indexOf('const specA = castAll('));

  /* ── [2] 실측 — 같은 트리 N판이 화소 동일 ───────────────────────── */
  console.log('[2] 실측 — 같은 트리 ' + RUNS + '판');
  const shots = [];
  for (let i = 0; i < RUNS; i++) shots.push(shoot(CAP, path.join(tmp, 'run' + i + '.png')));
  let worstIn = 0, worstOut = 0;
  for (let i = 1; i < shots.length; i++) {
    const d = diff(shots[0], shots[i]);
    if (d.bad) { worstIn = worstOut = -1; break; }
    worstIn = Math.max(worstIn, d.inn); worstOut = Math.max(worstOut, d.out);
  }
  ok('[2-a] 999 블록 «안» 흔들림 0 (수리 전에는 다섯 판에 한 판꼴로 86~1,505)', worstIn === 0, '최대 ' + worstIn);
  ok('[2-b] 999 블록 «밖» 흔들림 0 (996 이 세운 자리를 안 되돌렸다)', worstOut === 0, '최대 ' + worstOut);

  /* ── [3] 자리 무관 — 용사를 두 자리에 세워도 시트가 같다 ──────────── */
  console.log('[3] 자리 무관 — CAP710_HERO 두 자리 (' + HERO_A + ' ↔ ' + HERO_B + ')');
  const fa = shoot(CAP, path.join(tmp, 'heroA.png'), { CAP710_HERO: HERO_A });
  const fb = shoot(CAP, path.join(tmp, 'heroB.png'), { CAP710_HERO: HERO_B });
  const df = diff(fa, fb);
  ok('[3-a] 두 자리의 시트가 화소 동일 — 용사 자리가 시트를 못 흔든다',
     !df.bad && df.inn === 0 && df.out === 0, '안 ' + df.inn + ' · 밖 ' + df.out);
  ok('[3-b] 손잡이가 기본 시트를 안 바꾼다 (핀 없이 찍은 판과도 동일)',
     !diff(shots[0], fa).bad && diff(shots[0], fa).inn === 0 && diff(shots[0], fa).out === 0);

  /* ── [R] 되돌림 시험 — `nums` 를 빼면 실제로 갈린다 ───────────────── */
  console.log('[R] 되돌림 — clearFx 에서 `nums` 를 뺀 임시 사본');
  const rv = revertedTool();
  const ra = shoot(rv, path.join(tmp, 'revA.png'), { CAP710_HERO: HERO_A });
  const rb = shoot(rv, path.join(tmp, 'revB.png'), { CAP710_HERO: HERO_B });
  const dr = diff(ra, rb);
  ok('[R-a] 수리를 되돌리면 두 자리가 실제로 갈린다 (안 갈리면 이 자는 아무것도 안 지킨다)',
     !dr.bad && dr.inn > 0, '안 ' + (dr.inn || 0) + ' 화소');
  ok('[R-b] 갈린 화소가 전부 999 블록 «안» 이다 (겨눈 자리가 맞다)',
     !dr.bad && dr.out === 0, '밖 ' + (dr.out || 0) + ' 화소' + (dr.box ? ' · bbox x ' + dr.box[0] + '..' + dr.box[1] + ' y ' + dr.box[2] + '..' + dr.box[3] : ''));
  ok('[R-c] 수리된 자는 같은 두 자리에서 안 갈린다 (같은 조건 대조)',
     !df.bad && df.inn === 0);

  clean();
  console.log('VERIFY999 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { clean(); console.error(e); process.exit(1); });
