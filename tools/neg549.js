#!/usr/bin/env node
/* 작업 549 되돌림 시험 — «단계를 실제로 넘기고 있는가».
 *
 *   node tools/neg549.js
 *
 * 549 는 `verify86` 247행 · `verify193` 524행의 죽은 인자(`PRB_STEPS[i].unlock` → `undefined`)를
 * 값으로 갈고, 그 뒤를 덮던 `prbStep = i; renderProbInfo();` 줄을 걷어냈다.
 * 무르게 푼 수리가 아님은 **두 겹**으로 못박는다:
 *
 *   [S] 소스 래칫 — 죽은 인자와 덮어쓰기 줄이 두 자에 다시 들어오면 빨개진다.
 *   [R] 되돌림   — 인자만 `.unlock` 으로 되돌린 **진짜 게이트 사본**을 실제로 돌려
 *                  그 절이 빨개지는지 본다. 안 빨개지면 인자는 여전히 죽은 것이다.
 *
 * ⚠ [R] 은 사본을 `tools/` 안에 만든다(두 자가 `require('./pwlaunch')` 를 쓴다). 끝나면 지운다.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOLS = __dirname;
let pass = 0, fail = 0;
const ok = (c, msg, extra) => {
  (c ? pass++ : fail++);
  console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + msg + (extra === undefined ? '' : '  [' + extra + ']'));
};

const SITES = [
  { f: 'verify86.js',  tag: 'VERIFY86',  need: '11 확률 팝업이 전 단계에 걸쳐 27종을 모두 표기' },
  { f: 'verify193.js', tag: 'VERIFY193', need: '11 확률 팝업이 전 단계에 걸쳐 27종 표기' },
];

/* 주석은 빼고 «도는 코드» 만 본다 — 549 가 두 자에 남긴 경위 주석이 옛 표기를 글자 그대로 인용한다.
   (`//` 는 안 건드린다: `file://` 같은 문자열을 삼킨다) */
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, ' ');

/* ── [S] 소스 래칫 ── */
console.log('[S] 소스 래칫 — 죽은 인자·덮어쓰기 줄이 다시 들어오면 빨개진다 (주석 제외 — 277 «폐기 식별자» 방식)');
for (const s of SITES) {
  const src = code(fs.readFileSync(path.join(TOOLS, s.f), 'utf8'));
  ok(!/PRB_STEPS(_EQ)?\s*\[[^\]]*\]\s*\.unlock/.test(src),
     s.f + ' — `PRB_STEPS[i].unlock` 0건 (250 이후 숫자 배열이라 `undefined` 다)');
  ok(/PRB_STEPS(_EQ)?\.forEach\(\s*lv\s*=>/.test(src) && /openProbInfo\(\s*'skill'\s*,\s*lv\s*\)/.test(src),
     s.f + ' — 단계를 «값 인자» 하나로 넘긴다 (`verify75` 246행과 같은 꼴)');
  ok(!/prbStep\s*=\s*i\s*;\s*renderProbInfo\(\)/.test(src),
     s.f + ' — 덮어쓰기 줄 `prbStep = i; renderProbInfo();` 0건 (단계를 정하는 곳은 하나뿐)');
}
/* 저장소 전수 — 같은 함정이 다른 자에 남아 있지 않은가.
   ⚠ 자는 `tools/` 와 저장소 루트 **두 곳**에 산다(`verify75.js` 가 루트다 — 549 의 선례가 거기 있다). */
const ROOT = path.resolve(TOOLS, '..');
const files = []
  .concat(fs.readdirSync(TOOLS).filter(f => f.endsWith('.js')).map(f => path.join(TOOLS, f)))
  .concat(fs.readdirSync(ROOT).filter(f => f.endsWith('.js')).map(f => path.join(ROOT, f)));
const strays = files.filter(f => !/(neg|probe)549\.js$/.test(f)
  && /PRB_STEPS(_EQ)?\s*\[[^\]]*\]\s*\.unlock/.test(code(fs.readFileSync(f, 'utf8'))))
  .map(f => path.relative(ROOT, f));
ok(strays.length === 0, 'tools/ + 루트 전수 — 같은 함정 0건 (' + files.length + '개 자)',
   strays.join(', ') || '없음');

/* ── [R] 되돌림 ── */
console.log('[R] 되돌림 — 인자만 `.unlock` 으로 되돌린 사본은 그 절이 빨개져야 한다');
for (const s of SITES) {
  const orig = fs.readFileSync(path.join(TOOLS, s.f), 'utf8');
  const bad = orig.replace(/openProbInfo\(\s*'skill'\s*,\s*lv\s*\)/, "openProbInfo('skill', lv.unlock)");
  if (bad === orig) { ok(false, s.f + ' — 되돌릴 자리를 못 찾았다 (치환 0건)'); continue; }
  const tmp = path.join(TOOLS, '__neg549_' + s.f);
  fs.writeFileSync(tmp, bad);
  let out = '', code = 0;
  try {
    out = execFileSync(process.execPath, [tmp], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    code = e.status === undefined ? -1 : e.status;
    out = (e.stdout || '') + (e.stderr || '');
  } finally { try { fs.unlinkSync(tmp); } catch (e) {} }

  const line = out.split('\n').find(l => l.includes(s.need)) || '';
  const red = /^\s*✗/.test(line);
  ok(code !== 0, s.f + ' 되돌림 사본이 실패로 끝난다 (종료 코드 ' + code + ')');
  ok(red, s.f + ' — 빨개진 항이 바로 그 «확률 팝업 전 단계» 항이다',
     line.trim().slice(0, 96) || '(그 항을 못 찾음)');
  const m = out.match(new RegExp(s.tag + '\\s+(\\d+)\\/(\\d+)'));
  if (m) console.log('       ' + s.tag + ' 되돌림 사본 = ' + m[1] + '/' + m[2]);
}

console.log('\nNEG549 ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL' : '  ✓ PASS'));
process.exit(fail ? 1 : 0);
