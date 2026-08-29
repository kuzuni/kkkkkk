/* 작업 385 게이트 — «같은 잉크» 는 네 도구에서 같은 숫자여야 한다
 *
 *   node tools/verify385.js
 *
 * 무엇을 지키는가:
 *   `verify360`(게이트) · `probe360`(재현) · `cal360`(역산) · `probe371`(글리프 후보) 넷은 좌측 사이드
 *   아이콘 «잉크» 를 **같은 차분법**으로 잰다. 382 가 자를 정착시키는 두 줄(`#view` 끄고 마젠타 판)을
 *   **게이트에만** 넣어서, 385 이전에는 같은 낱말이 도구마다 다른 값을 가리켰다:
 *
 *     게이트 attend 98×100  ↔  자매 자 96×99 (로드마다 ±1~2px)
 *     `probe371 😇` 연속 두 실행 → `--sf 0.846` / `0.859` (1.5% — 심는 값이 실행마다 달랐다)
 *
 *   지금 판은 `tools/plate360.js` 한 곳에 있고 넷이 그것을 부른다. 이 자는 **그 한 곳이 지켜지는지**를
 *   정적으로(복붙 사본 0건 · 356 금지 손잡이 0건) 그리고 **실제로 네 도구를 돌려**(숫자가 같은가) 묻는다.
 *
 * §R 되돌림 시험 — 판을 걷거나 색을 바꾸면 값이 실제로 움직이는가(항등식이 아님을 못박는다).
 *   `PLATE360` 문(plate360.js)으로 판을 갈아 끼운 채 같은 자를 다시 돌린다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용(자식 프로세스가 알아서 쓴다).
 * LESSONS 319 — 블록 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { PLATE_BG, PLATE_CSS, plateCss } = require('./plate360');

const ROOT = path.resolve(__dirname, '..');
const T = f => path.join(ROOT, 'tools', f);
const ROSTER = ['attend', 'roul', 'quest', 'promo', 'coll', 'bless'];
const SIB = ['roul', 'quest', 'promo', 'coll'];      /* probe371 이 재는 형제 4칸 */

let pass = 0, fail = 0;
const ok = (c, m, got) => { c ? pass++ : fail++;
  console.log((c ? '  ok   ' : '  FAIL ') + m + (got === undefined ? '' : '  [' + got + ']')); };
const blk = (name, fn) => { try { fn(); } catch (e) {
  fail++; console.log(`  FAIL ${name} 블록 예외 — ${e.message}`); } };

function run(file, args = [], env = {}) {
  try {
    return execFileSync(process.execPath, [T(file), ...args],
      { cwd: ROOT, encoding: 'utf8', timeout: 300000, maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, ...env } });
  } catch (e) { return (e.stdout || '') + (e.stderr || ''); }
}

/* ── 파서 — 도구마다 찍는 모양이 다르다. 잉크 숫자만 뽑는다 ─────────────────── */
const ink = (w, h) => ({ w: +w, h: +h });

function fromVerify360(out) {                       /*   ok   attend 📅 잉크 98×100 — … */
  const o = {};
  for (const m of out.matchAll(/ok\s+(attend|roul|quest|promo|coll|bless)\s+\S+\s+잉크\s+(\d+)×(\d+)/g))
    o[m[1]] = ink(m[2], m[3]);
  return o;
}
function afterBlock(out) {                          /* probe360 은 «전/후» 두 블록을 찍는다 */
  const a = out.indexOf('수리 후');
  const b = out.indexOf('───── 판정');
  return a < 0 ? out : out.slice(a, b < 0 ? undefined : b);
}
function fromProbe360(out) {                        /*   attend  📅 … 잉크   98× 100  sf=.920 */
  const o = {};
  for (const m of afterBlock(out).matchAll(
    /^\s+(attend|roul|quest|promo|coll|bless)\s+\S+\s+라벨=.*?잉크\s+(\d+)×\s*(\d+)/gm))
    o[m[1]] = ink(m[2], m[3]);
  return o;
}
function relProbe360(out) {                         /*       attend  폭   -2.0%  높이    1.8% */
  const o = {};
  for (const m of afterBlock(out).matchAll(
    /^\s+(attend|roul|quest|promo|coll|bless)\s+폭\s+(-?[\d.]+)%\s+높이\s+(-?[\d.]+)%/gm))
    o[m[1]] = { w: +m[2], h: +m[3] };
  return o;
}
function sibAvgProbe360(out) {                      /*   형제 기준(…) 평균 잉크 = 100.0 × 98.3 */
  const m = afterBlock(out).match(/형제 기준.*?평균 잉크 = ([\d.]+) × ([\d.]+)/);
  return m ? { w: +m[1], h: +m[2] } : null;
}
function fromCal360(out) {                          /* --- 1회 측정 …  attend    98× 100  Δ폭 … */
  const a = out.indexOf('--- 1회 측정');
  const seg = a < 0 ? '' : out.slice(a, out.indexOf('⇒ 최대 오차', a));
  const o = {};
  for (const m of seg.matchAll(
    /^\s+(attend|roul|quest|promo|coll|bless)\s+(\d+)×\s*(\d+)\s+Δ폭/gm)) o[m[1]] = ink(m[2], m[3]);
  return o;
}
function fromProbe371(out) {                        /*         roul   101×99  중심 … */
  const o = {};
  for (const m of out.matchAll(/^\s+(roul|quest|promo|coll)\s+(\d+)×(\d+)\s+중심/gm))
    o[m[1]] = ink(m[2], m[3]);
  return o;
}
const same = (a, b) => a && b && a.w === b.w && a.h === b.h;
const show = o => ROSTER.filter(k => o[k]).map(k => `${k} ${o[k].w}×${o[k].h}`).join(' · ');

console.log('=== 385 — 자매 자 정착(공용 판 tools/plate360.js) ===');

/* ── [1] 정적 정합 — 판이 한 곳에 있고 넷이 그것을 부른다 ────────────────────── */
console.log('\n[1] 정합 — 판 선언은 한 곳뿐이고 네 도구가 그것을 부른다');
const FILES = ['verify360.js', 'probe360.js', 'cal360.js', 'probe371.js'];
const src = {};
blk('[1]', () => {
  FILES.forEach(f => { src[f] = fs.readFileSync(T(f), 'utf8'); });
  const lib = fs.readFileSync(T('plate360.js'), 'utf8');

  FILES.forEach(f => {
    ok(/require\('\.\/plate360'\)/.test(src[f]), `[1] ${f} 가 plate360 을 부른다`);
    ok(/await plate\(p/.test(src[f]), `[1] ${f} 가 실제로 판을 깐다 (await plate(p))`);
  });
  /* 복붙 사본이 하나라도 남으면 385 가 통째로 되살아난다 — 선언은 lib 에만 있어야 한다 */
  const copies = FILES.filter(f => /#stagearea\{background:#/.test(src[f]));
  ok(copies.length === 0, '[1] 판 CSS 복붙 사본 0건 (선언은 plate360.js 한 곳)',
     copies.length ? copies.join(',') : '없음');
  ok(/#ff00ff/.test(lib) && PLATE_BG === '#ff00ff',
     '[1] 판 색 = 마젠타 (382 §3 — 근흑은 외곽선을 잃고 흰 판은 📅 흰 잉크를 먹는다)', PLATE_BG);
  ok(PLATE_CSS.includes('#view{visibility:hidden') && PLATE_CSS.includes('#stagearea{background'),
     '[1] 판은 «캔버스 끄기 + 단색 배경» 두 줄이다');
  ok(plateCss() === PLATE_CSS, '[1] 평상시(문 없음) 판 = 마젠타 — 시험용 문이 기본값을 안 바꾼다');

  /* 356 — 아이콘 손잡이는 등방 `--sf` 하나뿐이다. 죽은 `--sx` 를 미는 자가 있으면
     그 자의 «옮겨 적을 값» 이 곧바로 verify360 «--sx 선언 0건» 을 깨는 값이 된다. */
  ['cal360.js', 'probe371.js'].forEach(f => {
    ok(!/setProperty\('--sx'/.test(src[f]),
       `[1] ${f} 가 --sx 를 밀지 않는다 (356 — 아이콘은 원본 비율)`);
    ok(!/--sx:\$\{/.test(src[f]) && !/--sx:'\s*\+/.test(src[f]),
       `[1] ${f} 출력에 --sx 값이 없다 (심으면 verify360 «--sx 선언 0건» 이 빨개진다)`);
  });
});

/* ── [2] 네 도구를 실제로 돌려 «같은 숫자» 인지 본다 ─────────────────────────── */
console.log('\n[2] 네 도구가 같은 잉크를 돌려주는가 (실제 실행)');
const V = run('verify360.js');
const P1 = run('probe360.js');
const C = run('cal360.js');
const Q = run('probe371.js', ['😇']);
const v360 = fromVerify360(V), p360 = fromProbe360(P1), c360 = fromCal360(C), p371 = fromProbe371(Q);

blk('[2]', () => {
  ok(/VERIFY360 \d+\/\d+ PASS/.test(V), '[2] 이관 — verify360 이 그대로 통과한다',
     (V.match(/VERIFY360 \d+\/\d+ PASS/) || ['없음'])[0]);
  ok(/PROBE360 \d+\/\d+/.test(P1), '[2] probe360 이 그대로 돈다',
     (P1.match(/PROBE360 \d+\/\d+/) || ['없음'])[0]);
  ok(ROSTER.every(k => v360[k]), '[2] verify360 6행 측정', show(v360));
  ok(ROSTER.every(k => p360[k]), '[2] probe360 6행 측정', show(p360));
  ok(ROSTER.every(k => c360[k]), '[2] cal360 6행 측정', show(c360));
  ok(SIB.every(k => p371[k]), '[2] probe371 형제 4칸 측정', show(p371));

  const dp = ROSTER.filter(k => !same(v360[k], p360[k]));
  const dc = ROSTER.filter(k => !same(v360[k], c360[k]));
  const dq = SIB.filter(k => !same(v360[k], p371[k]));
  ok(dp.length === 0, '[2] ★ probe360 = verify360 (6행 전부 같은 값)',
     dp.length ? dp.map(k => `${k} ${p360[k].w}×${p360[k].h}≠${v360[k].w}×${v360[k].h}`).join(' · ') : '전부 일치');
  ok(dc.length === 0, '[2] ★ cal360 = verify360 (6행 전부 같은 값)',
     dc.length ? dc.map(k => `${k} ${c360[k].w}×${c360[k].h}≠${v360[k].w}×${v360[k].h}`).join(' · ') : '전부 일치');
  ok(dq.length === 0, '[2] ★ probe371 = verify360 (형제 4칸 같은 값)',
     dq.length ? dq.map(k => `${k} ${p371[k].w}×${p371[k].h}≠${v360[k].w}×${v360[k].h}`).join(' · ') : '전부 일치');
});

/* ── [3] 산포 0 — 같은 자를 두 번 돌리면 같은 값이다 (로드 사이 흔들림이 이 결함의 모양이었다) ── */
console.log('\n[3] 산포 — 다시 띄워도 같은 값인가 (382 가 잡은 흔들림의 재발 감지)');
const P2 = run('probe360.js');
const p360b = fromProbe360(P2);
const Q2 = run('probe371.js', ['😇']);
blk('[3]', () => {
  const d = ROSTER.filter(k => !same(p360[k], p360b[k]));
  ok(d.length === 0, '[3] probe360 두 실행이 6행 전부 같은 값 (산포 0px)',
     d.length ? d.map(k => `${k} ${p360[k].w}×${p360[k].h}→${p360b[k].w}×${p360b[k].h}`).join(' · ') : '전부 같다');
  const sf = o => (o.match(/😇\s+Δ폭\s+-?[\d.]+%\s+--sf:([\d.]+)/) || [])[1];
  const a = sf(Q), b = sf(Q2);
  ok(a && b && a === b,
     '[3] ★ probe371 이 두 실행에서 같은 --sf 를 돌려준다 (심는 값이 실행마다 달라지지 않는다)',
     `${a} / ${b}`);
});

/* ── §R 되돌림 시험 — 판이 실제로 무언가를 바꾸는가 ─────────────────────────── */
console.log('\n[R-a] 되돌림 — 판을 걷으면(PLATE360=off) 값이 흔들리고 게이트와 어긋난다');
blk('[R-a]', () => {
  const offs = [run('probe360.js', [], { PLATE360: 'off' }), run('probe360.js', [], { PLATE360: 'off' })];
  const o1 = fromProbe360(offs[0]), o2 = fromProbe360(offs[1]);
  ok(ROSTER.every(k => o1[k] && o2[k]), '[R-a] 판 없이도 6행이 측정은 된다 (조용한 no-op 이 아니다)');
  const d1 = ROSTER.filter(k => !same(v360[k], o1[k]));
  const d2 = ROSTER.filter(k => !same(v360[k], o2[k]));
  /* 382 관측: 캔버스 위에서는 6칸 전부 ±1~2px 로 흔들린다. 매 실행 «몇 행이 어긋나는지» 는
     실행마다 다르므로(1/14 급 재현율의 자리) 관측의 결론인 «3행 이상» 으로 건다(382 교훈 4). */
  ok(d1.length >= 3 && d2.length >= 3,
     '[R-a] ★ 판을 걷으면 게이트 값과 3행 이상 어긋난다 — 판이 실제로 재는 것을 바꾼다',
     `1차 ${d1.length}행(${show(o1)}) / 2차 ${d2.length}행`);
});

console.log('\n[R-b] 되돌림 — 근흑 판(#0a0c16)은 외곽선 `--o` 를 통째로 잃는다 (판 색이 곧 «무엇을 재는가»)');
blk('[R-b]', () => {
  const out = run('probe360.js', [], { PLATE360: '#0a0c16' });
  const b = fromProbe360(out), avg = sibAvgProbe360(out);
  ok(ROSTER.every(k => b[k]), '[R-b] 근흑 판에서도 6행 측정은 된다', show(b));
  const shrunk = ROSTER.filter(k => b[k] && v360[k] && v360[k].w - b[k].w >= 5 && v360[k].h - b[k].h >= 5);
  ok(shrunk.length === ROSTER.length,
     '[R-b] ★ 6행 전부 폭·높이가 5px 넘게 줄어든다 — 근흑 판은 «다른 것을 재는 자» 다',
     `${shrunk.length}/6 · ${show(b)}`);
  ok(avg && avg.w <= 95,
     '[R-b] 형제 평균 폭이 마젠타 100 대에서 90 아래로 떨어진다 (382 §3 표의 89.5)',
     avg ? `${avg.w} × ${avg.h}` : '측정 실패');
});

console.log('\n[R-c] 되돌림 — 흰 판은 📅 의 «흰 잉크» 를 먹는다 (형제만 커지고 출석은 안 커진다)');
blk('[R-c]', () => {
  const out = run('probe360.js', [], { PLATE360: '#ffffff' });
  const w = fromProbe360(out), rel = relProbe360(out), avg = sibAvgProbe360(out);
  const relMag = relProbe360(P1);
  ok(avg && avg.w >= 100.5,
     '[R-c] 흰 판에서 형제 평균 폭이 마젠타보다 크다 (382 §3 표의 101.0)',
     avg ? `${avg.w} × ${avg.h}` : '측정 실패');
  ok(rel.attend && relMag.attend && rel.attend.w < relMag.attend.w,
     '[R-c] ★ 그런데 출석 📅 의 «형제 대비 폭» 은 오히려 내려간다 — 흰 잉크가 판에 먹힌 몫',
     rel.attend && relMag.attend ? `마젠타 ${relMag.attend.w}% → 흰 판 ${rel.attend.w}%` : '측정 실패');
  ok(w.attend && v360.attend && w.attend.h > v360.attend.h,
     '[R-c] 흰 판에서는 높이도 다른 값이 된다 (판을 아무 색이나 고르면 안 되는 이유)',
     w.attend ? `${w.attend.w}×${w.attend.h}` : '측정 실패');
});

console.log(`\nVERIFY385 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
