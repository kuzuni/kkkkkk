#!/usr/bin/env node
/* verify648 — «고정 이름 임시 사본» 전수 수리 (작업 648 · 646 의 나머지 자리)
 *
 *   node tools/verify648.js                 전 절
 *   V648_SKIP_RUN=1 node tools/verify648.js  §1 선언 절만 (수 ms · 빠른 회귀용)
 *   node tools/verify648.js --par <n>        §2 병렬도 (기본 3)
 *
 * ── 이 자가 지키는 것 ──────────────────────────────────────────────────────
 * 646 이 `verify169` 한 자리에서 고친 것 — «임시 사본의 이름이 프로세스마다 같으면
 * 두 워커가 서로의 사본을 지우고 `ENOENT … unlink` 로 즉사한다» — 를 **저장소 전체**로
 * 넓힌 것이 648 이다. 워커가 넷이라 같은 자가 둘 이상 겹치는 일은 실제로 일어난다.
 *
 * ── 무르게 풀지 않았음을 못박는 세 겹 (334·643 규약) ────────────────────────
 *   §1  선언 — 스캐너(`tools/scan648.js`)가 «쓰고 지우는» 도구를 전수로 훑어 고정 이름 0자리.
 *              ⚠ [1-a] 는 스캐너 자신이 **공허하지 않은가**(자리를 실제로 세고 있는가)를 먼저 묻는다.
 *   §2  실동작 — 실제 자를 P병렬로 띄워 ⓐ ENOENT 0건 ⓑ 죽은 프로세스 0 ⓒ 남은 사본 0.
 *   §R  되돌림 — 이름에서 pid 를 뺀 사본을 같은 병렬로 돌리면 **반드시 `ENOENT … unlink`** 가 나야 한다.
 *              안 나면 §2 는 «부하가 약해서 초록» 인 헛자다(646 §R 교훈).
 *              ⚠ 646 처럼 **종료 코드가 아니라 죽는 «문자열»** 로 판정한다 —
 *                 사본이 SyntaxError 로 죽어도 종료 코드는 0 이 아니다.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');
const SKIP_RUN = !!process.env.V648_SKIP_RUN;
const PAR = (() => { const i = process.argv.indexOf('--par'); return i > 0 ? +process.argv[i + 1] : 3; })();

let pass = 0; const fails = [];
const ok = (c, m, note) => { c ? pass++ : fails.push(m); console.log('  ' + (c ? 'ok   ' : 'FAIL ') + m + (note === undefined ? '' : '  [' + note + ']')); };
const section = s => console.log('\n' + s);

/* 주석·문자열 **속**을 공백으로 지우고 코드만 본다.
   ⚠ 646 [1-a] 교훈의 확장 — 주석만 걷으면 `verify571` 의 «`fs.unlinkSync(LOCK)` 문자열을 단언하는 줄» 에
      그대로 걸린다. 그리고 **자리(줄 번호)를 살려야** 실패 메시지가 쓸모 있으므로 길이·줄바꿈을 보존한다. */
const blank = s => s.replace(/[^\n]/g, ' ');
function codeOf(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); const j = e < 0 ? src.length : e + 2; out += blank(src.slice(i, j)); i = j; continue; }
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); const j = e < 0 ? src.length : e; out += blank(src.slice(i, j)); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += c + blank(src.slice(i + 1, j)) + (src[j] === c ? c : ''); i = j + 1; continue;
    }
    /* 정규식 리터럴 — 안에 따옴표·백틱이 들어 있으면(`/[^'"`]/`) 문자열 파서가 통째로 어긋난다.
       «앞의 코드 문자» 로 나눗셈과 가른다(표준 휴리스틱). verify646 이 실제로 그 모양이다. */
    if (c === '/') {
      const prev = out.replace(/\s+$/, '').slice(-1);
      if (prev === '' || '(,=:[!&|?{};+-*%~^'.includes(prev)) {
        let j = i + 1, cls = false;
        while (j < src.length) {
          const k = src[j];
          if (k === '\\') { j += 2; continue; }
          if (k === '\n') break;
          if (k === '[') cls = true; else if (k === ']') cls = false;
          else if (k === '/' && !cls) break;
          j++;
        }
        if (src[j] === '/') { out += '/' + blank(src.slice(i + 1, j)) + '/'; i = j + 1; continue; }
      }
    }
    out += c; i++;
  }
  return out;
}

console.log('VERIFY648 — 고정 이름 임시 사본 전수(646 처방을 저장소 전체로)');

/* ─────────────────────────────────────────────────────────────── */
section('[1] 선언 — 스캐너가 전수를 훑어 고정 이름 0자리');

const scan = require('./scan648.js');   /* 모듈로 부르면 표만 돌려준다 */
const rep = scan.report();

ok(rep.tools >= 100, '[1-a] 전제 — «쓰고 지우는» 도구를 실제로 세고 있다(공허한 스캔이 아니다)', rep.tools + '개');
ok(rep.sites >= 120, '[1-b] 전제 — 임시 사본 자리를 실제로 세고 있다', rep.sites + '자리');
ok(rep.unsafe.length === 0, '[1-c] 고정 이름이 남은 도구 0개',
   rep.unsafe.length ? rep.unsafe.map(r => r.file).join(' ') : '0개');

/* 646 이 이미 고친 두 자리가 되돌아가지 않았는지 — §1 이 그 둘만 보고 초록이 되면 안 되므로 따로 묻는다.
   ⚠ 판정은 스캐너의 «안전» 목록으로 한다 — `grep process.pid` 로 물으면 **주석에 그 낱말만 적어도** 초록이다. */
for (const f of ['verify169.js', 'verify646.js']) {
  ok(rep.safe.includes(f), `[1-d] 646 이 고친 ${f} 가 그대로다(스캐너가 «안전» 으로 센다)`);
}

/* 정리가 맨몸이 아니다 — `fs.unlinkSync(x);` 가 try/catch·existsSync 밖에 있으면 즉사한다(278) */
{
  const bare = [];
  for (const f of fs.readdirSync(TOOLS).filter(x => x.endsWith('.js'))) {
    if (f === 'claim.js') continue;            /* lock 해제는 실패가 보여야 한다 — 감싸지 않는다 */
    const src = fs.readFileSync(path.join(TOOLS, f), 'utf8');
    const c = codeOf(src);
    const re = /(.{0,40})fs\.unlinkSync\(/g; let m;
    while ((m = re.exec(c))) {
      const pre = m[1];
      if (/try\s*\{\s*$/.test(pre)) continue;
      if (/existsSync\([^()]*\)\)\s*$/.test(pre)) continue;
      bare.push(f + ':' + c.slice(0, m.index).split('\n').length);
    }
  }
  ok(bare.length === 0, '[1-e] 맨몸 `unlinkSync` 0곳 (try/catch 또는 존재 확인 안)', bare.join(' ') || '0곳');
}

/* .gitignore — 사본이 pid 를 달고도 무시되는가. 규칙이 없으면 즉사가 남긴 1MB 사본이 커밋에 딸려 간다(646 곁다리) */
{
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  ok(/^\/\.\*\.html$/m.test(gi) && /^\/\.\*\.js$/m.test(gi) && /^\/\.\*\.json$/m.test(gi),
     '[1-f] .gitignore 가 루트 dot 임시 사본을 자리째 덮는다');
  ok(/^tools\/\.\*\.js$/m.test(gi) && /^tools\/\.\*\.html$/m.test(gi),
     '[1-g] .gitignore 가 `tools/` 안 임시 사본도 덮는다');
  ok(/^!\/index\.html$/m.test(gi), '[1-h] 실물 `index.html` 은 되살린다(넓힌 규칙이 제품을 안 가린다)');
}

/* ─────────────────────────────────────────────────────────────── */
const run = (file, args, env) => new Promise(res => {
  const p = spawn('node', [file, ...(args || [])], { cwd: ROOT, env: { ...process.env, ...(env || {}) } });
  let out = '';
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  p.on('close', code => res({ code, out }));
});

/* 저장소 루트·tools 에 남은 임시 사본을 센다 */
const strays = () => [
  ...fs.readdirSync(ROOT).filter(f => /^[._].*\.(html|js|json)$/.test(f) && f !== '.gitignore'),
  ...fs.readdirSync(TOOLS).filter(f => /^[._].*\.(html|js|json)$/.test(f)).map(f => 'tools/' + f),
];

/* §2 의 표본 — 사본을 실제로 쓰고 지우는 자.
   ⚠ 표본은 **그 자체로 초록**이어야 한다. 1회차에 `neg219` 를 골랐다가 [2-b] 가 빨갰는데,
      그것은 병렬 때문이 아니라 그 자가 **원래 빨간 것**(N3·N4 «문자열 없음 — index.html 이 바뀌었다»
      = 게이트 부패 · 652 로 등재)이었다. 빨간 자를 표본으로 쓰면 «무엇이 빨간지» 를 못 가른다.
   ⚠ 무거운 자(전투 60초·전 화면 스윕)도 안 된다 — §2 가 자기 시간에 눌려 못 돈다. */
const SAMPLE = (process.env.V648_SAMPLE || 'tools/neg180.js,tools/neg230.js').split(',');

(async () => {
  section(`[2] 실동작 — 표본 자를 ${PAR}병렬로 띄운다`);
  if (SKIP_RUN) {
    console.log('  –   [2] 건너뜀(V648_SKIP_RUN=1)');
  } else {
    /* ⚠ 시작 전에 남아 있는 사본을 «0이어야 한다» 고 물으면 안 되고, **지워서도 안 된다** —
       다른 워커의 자가 지금 그 사본을 쓰고 있을 수 있고, 지우는 순간 이 자가 바로 646 의 버그가 된다.
       그래서 baseline 으로 **적어 두고**, [2-c] 는 «새로 남은 것이 있는가» 만 묻는다. */
    const before = strays();
    console.log('  –   [2-0] baseline — 시작 전 남아 있던 임시 사본 ' + before.length + '개'
      + (before.length ? ' (남의 실행일 수 있어 건드리지 않는다: ' + before.join(' ') + ')' : ''));
    for (const tool of SAMPLE) {
      const rs = await Promise.all(Array.from({ length: PAR }, () => run(tool)));
      const enoent = rs.filter(r => /ENOENT[\s\S]*unlink/.test(r.out)).length;
      ok(enoent === 0, `[2-a] ${tool} ×${PAR} — «ENOENT … unlink» 0건`, enoent + '건');
      ok(rs.every(r => r.code === 0), `[2-b] ${tool} ×${PAR} — 전부 종료 코드 0`,
         rs.map(r => r.code).join(','));
    }
    const fresh = strays().filter(f => !before.includes(f));
    ok(fresh.length === 0, '[2-c] 이 실행이 새로 남긴 임시 사본 0', fresh.join(' ') || '0개');
  }

  /* ─────────────────────────────────────────────────────────────── */
  section('[R] 되돌림 시험 — pid 를 빼면 반드시 즉사한다');
  if (SKIP_RUN) {
    console.log('  –   [R] 건너뜀(V648_SKIP_RUN=1)');
  } else {
    /* 표본 하나를 «고정 이름 시절» 로 되돌린 사본. 사본 자신의 이름은 부모 pid 로 묶는다
       — 한 판 안의 P개는 서로 겹쳐야 하지만(그게 시험이다) 다른 판과는 겹치면 안 된다(646). */
    const srcPath = path.join(ROOT, SAMPLE[0]);
    const src = fs.readFileSync(srcPath, 'utf8');
    const rev = src.replace(/`(\.[^`\n]*)-\$\{process\.pid\}(\.[a-z]+)`/g, "'$1$2'")
                   .replace(/try \{ fs\.unlinkSync\(([^()]*)\); \} catch \(e\) \{\}/g, 'fs.unlinkSync($1);');
    ok(rev !== src, '[R-0] 전제 — 되돌림 사본이 실제로 달라졌다');
    ok(!/process\.pid/.test(codeOf(rev)), '[R-0b] 전제 — 사본 이름에서 pid 가 실제로 빠졌다');
    const revPath = path.join(TOOLS, `.v648-rev-${process.pid}.js`);
    let rs;
    try {
      fs.writeFileSync(revPath, rev);
      const rel = 'tools/' + path.basename(revPath);
      rs = await Promise.all(Array.from({ length: Math.max(PAR, 3) }, () => run(rel)));
    } finally { try { fs.unlinkSync(revPath); } catch (e) {} }
    const died = rs.filter(r => /ENOENT[\s\S]*unlink/.test(r.out)).length;
    /* ⚠ 종료 코드가 아니라 «죽는 문자열» 로 판정한다 — SyntaxError 로 죽은 사본을
       «성공적으로 재현» 으로 읽는 646 §R 의 함정을 그대로 피한다. */
    ok(!rs.some(r => /SyntaxError/.test(r.out)), '[R-a] 되돌림 사본이 문법으로 죽지 않았다(엉뚱한 이유의 빨강 배제)');
    ok(died > 0, `[R-b] 고정 이름으로 되돌리면 «ENOENT … unlink» 로 즉사한다 — §2 의 초록이 헛것이 아니다`,
       died + '/' + rs.length + ' 즉사');
    /* 되돌림 사본이 «고정 이름» 으로 남긴 것만 치운다 — 남의 pid 사본은 건드리지 않는다(위 [2-0] 와 같은 이유) */
    for (const f of strays()) {
      if (/-\d+\.(html|js|json)$/.test(f)) continue;
      try { fs.unlinkSync(path.join(ROOT, f)); } catch (e) {}
    }
  }

  console.log('\n' + (fails.length ? `VERIFY648 ${pass}/${pass + fails.length} FAIL` : `VERIFY648 ${pass}/${pass} PASS`));
  if (fails.length) { console.log('실패 항목'); fails.forEach((m, i) => console.log('  ' + (i + 1) + '. ' + m)); process.exit(1); }
})();
