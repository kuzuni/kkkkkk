/* 작업 755 재현·회귀자 — `verify712.js` 의 `bare()` 가 «영영 안 끝나는 자» 로 되돌아가지 않는지 잰다.
   실행: node tools/probe755.js   → 마지막 줄이 `PROBE755 n/n PASS` 여야 한다.

   뿌리(재현으로 확정 · 등재문 정정 1건):
     옛 `bare()` 는 정규식 교체 4연발이었다 — ① «따옴표를 품은 정규식»
     (`tools/verify385.js` 125행 `/--sx:'\s*\+/`)에서 문자열 패스가 그 따옴표를 다음
     따옴표와 짝지어 **뒤를 통째로 엉키게** 하고, ② 정규식 리터럴 패턴
     `(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+` 의 문자클래스 갈래가 **줄을 넘어**
     되짚을 수 있어, 엉킨 꼬리의 `[` 다발 위에서 지수 폭발했다(200줄 3.9초 → 전체 무한).
     ⚠ 등재문의 «187행 쉼표 빠진 태그드 템플릿» 은 현행 트리에서 재현되지 않는다 —
     186행에 쉼표가 있고 `node --check` 도 통과한다. 방아쇠는 125행의 따옴표-정규식이다.

   절:
     [1] 표식 — verify712 의 `bare:begin/end` 사이에서 함수를 꺼낼 수 있다.
     [2] 뜻 — 스캐너가 «주석 밖 식별자 읽기» 만 잡는다(표본 10 — 옛 자가 무너지던
         «따옴표를 품은 정규식» 표본 포함).
     [3] 속도 — 그 함수가 verify385 전문을 자식 프로세스에서 8초 안에 걷는다
         (되돌리면 여기서 timeout = 깨끗한 빨강. 인프로세스로 재면 프로브 자신이 멎는다).
     [4] 되돌림 — 옛 정규식 4연발 사본은 같은 입력에서 실제로 8초를 넘긴다(kill).
         이 항이 없으면 [3] 은 «원래 빠른 입력» 위의 헛자다(338 규약). */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m, d === undefined ? '' : '— ' + d); } };

const TOOLS = __dirname;
const V712 = fs.readFileSync(path.join(TOOLS, 'verify712.js'), 'utf8');
const T385 = path.join(TOOLS, 'verify385.js');

/* ── [1] 표식 추출 ─────────────────────────────────────────────── */
console.log('[1] verify712 에서 bare() 를 꺼낸다');
const mBeg = V712.indexOf('/* bare:begin'), mEnd = V712.indexOf('/* bare:end */');
ok(mBeg >= 0 && mEnd > mBeg, '[1a] bare:begin / bare:end 표식이 있다');
const body = mBeg >= 0 && mEnd > mBeg
  ? V712.slice(V712.indexOf('\n', mBeg) + 1, mEnd) : '';
let bare = null;
try { bare = new Function(body + '\nreturn bare;')(); } catch (e) { }
ok(typeof bare === 'function', '[1b] 꺼낸 몸통이 함수로 선다', bare === null ? '평가 실패' : '');
if (typeof bare !== 'function') { console.log(`\nPROBE755 ${pass}/${pass + fail} FAIL`); process.exit(1); }

/* ── [2] 뜻 — 잡을 것과 안 잡을 것 ─────────────────────────────── */
console.log('\n[2] 스캐너가 «주석 밖 식별자» 만 잡는다 (표본 10)');
const SAMPLES = [
  ["const x = 'OFF_MAX_H';", false, "'…' 문자열은 접힌다"],
  ['if (/OFF_MAX_H/.test(s)) {}', false, '정규식 리터럴은 접힌다'],
  ['let y = 1; // OFF_MAX_H 이관 메모', false, '꼬리 줄 주석도 주석이다'],
  ['/* OFF_MAX_H */ let y = 1;', false, '블록 주석은 걷힌다'],
  ['const v = OFF_MAX_H * 60;', true, '맨 식별자는 잡힌다'],
  ['const s = `cap ${OFF_MAX_H} h`;', true, '`${…}` 보간 안 식별자도 잡힌다 (페이지 코드를 템플릿으로 빚는 자)'],
  ['const s = `cap ${"OFF_MAX_H"} h`;', false, '보간 안 문자열은 접힌다'],
  ["ok(!/--sx:'\\s*\\+/.test(f), 'OFF_MAX_H 라는 글자'.slice(0));", false,
    '★ 따옴표를 품은 정규식 뒤의 문자열 — 옛 자가 무너지던 자리(verify385 125행 꼴)'],
  ['const a = b / OFF_MAX_H / c;', true, '나눗셈 사이의 식별자가 정규식으로 안 접힌다'],
  ['return /OFF_MAX_H/;', false, '키워드 뒤 / 는 정규식이다'],
];
for (const [s, want, name] of SAMPLES) {
  let got = null;
  try { got = /OFF_MAX_H/.test(bare(s)); } catch (e) { }
  ok(got === want, `[2] ${name}`, `got ${got}`);
}

/* ── 자식 프로세스 재기 — 되돌리면 프로브가 아니라 자식이 죽는다 ── */
const tmps = [];
function timeChild(tag, fnBody) {
  const p = path.join(TOOLS, `.p755-${tag}-${process.pid}.js`);
  fs.writeFileSync(p, `
    const fs = require('fs');
    ${fnBody}
    const t = fs.readFileSync(${JSON.stringify(T385)}, 'utf8');
    const t0 = Date.now();
    const r = bare(t);
    console.log('ms=' + (Date.now() - t0) + ' hit=' + /OFF_MAX_H/.test(r) + ' tail=' + /process\\.exit/.test(r));
  `);
  tmps.push(p);
  try {
    const out = execFileSync(process.execPath, [p], { encoding: 'utf8', timeout: 8000, stdio: ['ignore', 'pipe', 'pipe'] });
    const m = out.match(/ms=(\d+) hit=(\w+) tail=(\w+)/);
    return m ? { ms: +m[1], hit: m[2] === 'true', tail: m[3] === 'true' } : { err: '출력 형식' };
  } catch (e) {
    return { timeout: true, err: String(e.code || e.status || e.message).split('\n')[0] };
  }
}

/* ── [3] 속도 — 현행 bare 가 verify385 전문을 걷는다 ───────────── */
console.log('\n[3] 현행 bare() × verify385 전문 (옛 자가 영영 안 끝나던 입력)');
const now = timeChild('now', body);
ok(!now.timeout && now.ms < 8000, '[3a] 8초 안에 끝난다 (되돌리면 여기가 timeout 으로 빨갛다)',
   now.timeout ? `안 끝남(${now.err})` : `${now.ms}ms`);
ok(now.hit === false, '[3b] 그리고 verify385 를 오독하지 않는다 (OFF_MAX_H 히트 0)');
ok(now.tail === true, '[3c] 125행 뒤 꼬리가 코드로 남아 있다 (`process.exit` 가 접히지 않았다 — 엉킴 0)');

/* ── [4] 되돌림 — 옛 4연발 사본은 같은 입력에서 실제로 멎는다 ──── */
console.log('\n[4] 되돌림 — 옛 정규식 4연발 사본 (제자리 확인 · 프로브가 헛자가 아님)');
const OLD = `
  const nude = t => t.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').replace(/^\\s*\\/\\/[^\\n]*$/gm, '');
  const bare = t => nude(t)
    .replace(/'(?:\\\\.|[^'\\\\])*'/g, "''")
    .replace(/"(?:\\\\.|[^"\\\\])*"/g, '""')
    .replace(/\`(?:\\\\.|[^\`\\\\])*\`/g, '\`\`')
    .replace(/\\/(?![*\\/])(?:\\\\.|\\[(?:\\\\.|[^\\]\\\\])*\\]|[^\\/\\\\\\n])+\\/[gimsuy]*/g, '/RE/');
`;
const old = timeChild('old', OLD);
ok(old.timeout === true, '[4] ★ 옛 사본은 8초를 넘겨 kill 된다 — [3] 이 재는 위험이 실재한다',
   old.timeout ? '' : `끝나 버림(${old.ms}ms — 입력이 물러졌다, 표본을 다시 볼 것)`);

for (const p of tmps) { try { fs.unlinkSync(p); } catch (e) { } }
console.log(`\nPROBE755 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
