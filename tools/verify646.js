/* 작업 646 게이트 — «게이트를 병렬로 돌려도 자기들끼리 죽이지 않는가»
 *
 * 뿌리(2026-09-01 재현): `tools/verify169.js` [E] 가 음성항 사본을 저장소 루트의 **고정 이름**
 * (`.v169-neg1.html` · `-neg2` · `-neg3`)으로 썼다. 같은 자를 둘 이상 동시에 돌리면 먼저 끝난
 * 쪽의 `fs.unlinkSync` 가 **남의 사본을 지워** 다른 쪽이 통째로 죽는다:
 *     Error: ENOENT: no such file or directory, unlink '/…/.v169-neg1.html'
 * 실측 — 3병렬 3회 중 **2회 즉사**(나머지 1회 62/62 PASS) · 단독 실행은 3/3 PASS.
 * 저장소가 게이트 스윕을 `xargs -P` 로 도는 관행(638·639)이라 실제로 물리는 자리다.
 *
 * 이 자는 두 겹으로 잰다.
 *   §1 «선언» — 사본 이름이 프로세스마다 유일하고(pid), 정리가 `try/catch` 안이며,
 *      뽑은 사본마다 `finally` 정리가 짝지어져 있는가. (소스 단언 · 브라우저 안 띄운다)
 *   §2 «실동작» — `verify169` 를 P개 **동시에** 띄워 전부 종료 코드 0 · 전부 PASS 인가.
 *   §R «되돌림 시험» — 고정 이름 + 맨 `unlinkSync` 로 되돌린 사본을 같은 P개로 띄우면
 *      **반드시 ENOENT 로 죽어야** 한다. 안 죽으면 §2 는 «부하가 약해서 초록» 인 헛자다.
 *
 * ⚠ §R 의 사본은 `tools/` 안에 둔다 — `require('./pwlaunch')` 와 `ROOT = ../` 가 그 자리를 전제한다.
 *    그 사본이 뽑는 음성항 사본은 이름을 `.v646rev-neg<n>.html` 로 갈라 **동시에 도는 진짜
 *    verify169(=pid 이름)와 절대 겹치지 않게** 한다.
 *
 * 실행: node tools/verify646.js            (기본 3병렬)
 *       V646_PAR=5 node tools/verify646.js (병렬 수 조정)
 *       V646_SKIP_RUN=1 node tools/verify646.js (§1 만 — 소스 단언, 몇 ms)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(__dirname, 'verify169.js');
const PAR = Math.max(2, parseInt(process.env.V646_PAR || '3', 10) || 3);

let pass = 0, fail = 0;
const ok = (t, d) => { pass++; console.log(`PASS ${t}${d ? ' — ' + d : ''}`); };
const no = (t, d) => { fail++; console.log(`FAIL ${t}${d ? ' — ' + d : ''}`); };
const chk = (c, t, d) => (c ? ok : no)(t, d);

/* 주석 안의 «고정 이름» 인용까지 결함으로 세면 이 자가 자기 설명문에 걸린다.
   블록 주석만 걷어내고 **코드만** 본다(verify169 는 줄 주석을 안 쓴다). */
const decomment = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

const run = (file) => new Promise(res => {
  execFile(process.execPath, [file], { cwd: ROOT, maxBuffer: 1 << 26 },
    (err, stdout, stderr) => res({ code: err ? (err.code == null ? 1 : err.code) : 0, out: stdout || '', errOut: stderr || '' }));
});
const runAll = (file, n) => Promise.all(Array.from({ length: n }, () => run(file)));

/* 저장소 루트에 남은 음성항 사본을 센다(이름 패턴별). */
const strays = (pat) => fs.readdirSync(ROOT).filter(f => pat.test(f));

(async () => {
  /* ================= §1 선언 — 소스 단언 ================= */
  const rawSrc = fs.readFileSync(TARGET, 'utf8');
  const src = decomment(rawSrc);

  const fixed = src.match(/['"`]\.v169-neg\d+\.html['"`]/g) || [];
  chk(fixed.length === 0,
    '1-a 코드에 고정 이름 음성항 사본이 한 자리도 없다',
    fixed.length ? fixed.join(' ') : '0곳');

  const nameExpr = src.match(/\.v169-neg[^'"`]*\.html/g) || [];
  chk(nameExpr.length > 0 && nameExpr.every(s => s.includes('${process.pid}')),
    '1-b 사본 이름이 프로세스마다 유일하다(`process.pid` 를 섞는다)',
    nameExpr.length ? nameExpr.join(' ') : '이름 표현 0곳');

  /* 맨 `fs.unlinkSync(...)` 가 남아 있으면 안 된다 — 정리는 전부 `rmNeg` 를 지난다.
     (rmNeg 안의 한 자리만 허용) */
  const unlinks = src.match(/fs\.unlinkSync\(/g) || [];
  const guarded = /const rmNeg = [\s\S]{0,200}?try \{ fs\.unlinkSync\([\s\S]{0,120}?catch/.test(src);
  chk(unlinks.length === 1 && guarded,
    '1-c 정리는 `try/catch` 한 자리(`rmNeg`)뿐 — 지우기 실패로 즉사하지 않는다(278 처방)',
    `unlinkSync ${unlinks.length}곳 · 감쌈=${guarded}`);

  const writes = (src.match(/fs\.writeFileSync\(NEG\d/g) || []).length;
  const finals = (src.match(/\} finally \{ rmNeg\(NEG\d\); \}/g) || []).length;
  chk(writes > 0 && writes === finals,
    '1-d 뽑은 사본마다 `finally` 정리가 짝지어져 있다(도중에 던져도 안 남는다)',
    `write ${writes}곳 · finally ${finals}곳`);

  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  chk(/^\.v169-neg\*\.html$/m.test(gi),
    '1-e `.gitignore` 가 음성항 사본을 덮는다(즉사가 남긴 index 통째 사본이 커밋에 딸려가지 않게)',
    /^\.v169-neg\*\.html$/m.test(gi) ? '.v169-neg*.html' : '규칙 없음');

  if (process.env.V646_SKIP_RUN) {
    console.log(`\nVERIFY646 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'} (§1 만 — V646_SKIP_RUN)`);
    process.exit(fail ? 1 : 0);
  }

  /* ================= §2 실동작 — P병렬로 진짜 게이트를 돌린다 ================= */
  {
    const rs = await runAll(TARGET, PAR);
    const dead = rs.filter(r => r.code !== 0);
    const enoent = rs.filter(r => /ENOENT[\s\S]*unlink/.test(r.errOut + r.out));
    const passed = rs.filter(r => /VERIFY169 \d+\/\d+ PASS/.test(r.out));
    chk(dead.length === 0, `2-a verify169 ${PAR}병렬 — 죽은 프로세스 0`,
      dead.length ? dead.map(d => `code=${d.code}`).join(' ') : `${PAR}/${PAR} 종료코드 0`);
    chk(enoent.length === 0, '2-b 같은 실행에서 `ENOENT … unlink` 0건',
      `${enoent.length}건`);
    chk(passed.length === PAR, `2-c ${PAR}개 전부 VERIFY169 PASS`,
      rs.map(r => (r.out.match(/VERIFY169 \d+\/\d+ (PASS|FAIL)/) || ['—'])[0]).join(' · '));
    const left = strays(/^\.v169-neg/);
    chk(left.length === 0, '2-d 실행이 끝난 뒤 저장소 루트에 남은 사본 0',
      left.length ? left.join(' ') : '0개');
  }

  /* ================= §R 되돌림 시험 — 고정 이름으로 되돌리면 죽는가 ================= */
  {
    /* ⚑ 이 자 자신도 같은 함정을 밟으면 안 된다 — 되돌림 사본 이름에 **내 pid** 를 섞어
       verify646 을 둘 이상 동시에 돌려도 서로의 사본을 지우지 않게 한다.
       사본이 뽑는 음성항 이름도 마찬가지로 «내 pid» 로 묶는다 — 한 판 안의 P개는 서로
       겹쳐야(그게 시험이다) 하지만 다른 판과는 겹치면 안 된다. */
    const REV = path.join(__dirname, `.v646-rev169-${process.pid}.js`);
    const REVPFX = `.v646rev-${process.pid}-neg`;
    /* 되돌림은 «수리 전 트리» 그대로다: ⓐ 고정 이름 ⓑ `try/finally` 를 걷고 맨 unlinkSync.
       이름만 `.v646rev-neg<n>.html` 로 갈라 동시에 도는 진짜 게이트와 겹치지 않게 한다.
       ⚠ `try {` 를 `{` 로 되돌리는 것을 빼먹으면 사본이 **SyntaxError 로** 죽는다 —
         그것도 «종료 코드 0 아님» 이라 R1 을 대충 쓰면 잘못된 이유로 초록이 된다.
         그래서 R1 은 종료 코드가 아니라 **ENOENT unlink 문자열**로만 판정한다. */
    let rev = rawSrc
      .replace('const negPath = n => path.join(ROOT, `.v169-neg${n}-${process.pid}.html`);',
               'const negPath = n => path.join(ROOT, `' + REVPFX + '${n}.html`);')
      .replace(/\)\);\n    try \{\n/g, '));\n    {\n')
      .replace(/\} finally \{ rmNeg\((NEG\d)\); \}/g, '}\n    fs.unlinkSync($1);');
    const nUnlink = (rev.match(/fs\.unlinkSync\(NEG\d\);/g) || []).length;
    const revOk = rev.includes(REVPFX + '${n}.html') && !/finally \{ rmNeg/.test(rev)
      && !/\n    try \{\n/.test(rev) && nUnlink === 3;
    chk(revOk, 'R0 되돌림 사본 — 고정 이름 + `try/finally` 제거 + 맨 `unlinkSync` 3자리로 갈아 끼웠다',
      `이름=${rev.includes(REVPFX + '${n}.html')} · 남은 try ${/\n    try \{\n/.test(rev)} · 맨 unlink ${nUnlink}곳`);
    fs.writeFileSync(REV, rev);
    try {
      /* 죽는 비율이 2/3 안팎이라 한 판이 통째로 살아남는 일이 있다 — 죽을 때까지 최대 2판. */
      let enoent = 0, rounds = 0, seen = [];
      for (; rounds < 2 && enoent === 0; rounds++) {
        const rs = await runAll(REV, PAR);
        enoent = rs.filter(r => new RegExp('ENOENT[\\s\\S]*unlink[\\s\\S]*' + REVPFX).test(r.errOut + r.out)).length;
        seen.push(`${enoent}/${PAR}`);
      }
      chk(enoent > 0,
        `R1 되돌림 사본을 ${PAR}병렬로 돌리면 «ENOENT … unlink» 로 죽는다(§2 가 헛자가 아니다)`,
        `${rounds}판 — 즉사 ${seen.join(' · ')}`);
    } finally {
      try { fs.unlinkSync(REV); } catch (e) { if (e.code !== 'ENOENT') console.log(`WARN 되돌림 사본 정리 실패 (${e.code})`); }
      for (const f of strays(new RegExp('^' + REVPFX.replace('.', '\\.')))) {
        try { fs.unlinkSync(path.join(ROOT, f)); } catch (_) {}
      }
    }
    const left = strays(new RegExp('^' + REVPFX.replace('.', '\\.')));
    chk(left.length === 0, 'R2 되돌림 시험이 남긴 사본 0(즉사가 남긴 것까지 치웠다)',
      left.length ? left.join(' ') : '0개');
  }

  console.log(`\nVERIFY646 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
