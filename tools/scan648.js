#!/usr/bin/env node
/* 648 — «고정 이름 임시 사본» 자리 전수 스캔 (646 처방의 스코프 자).
   찾는 것: 도구가 **쓰고(write) 지우는(unlink/rm)** 임시 경로인데 이름이
   프로세스마다 같은 자리. 두 프로세스가 겹치면 서로의 사본을 지운다(646).
   판정은 «이름에 process.pid 가 섞였는가» 하나다. */
const fs = require('fs'), path = require('path');
const DIR = path.join(path.resolve(__dirname, '..'), 'tools');

/* 경로를 만드는 표현 — path.join(...) / path.resolve(...) 의 인자 전체를 본다 */
const PATHCALL = /path\.(?:join|resolve)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;

function lastArg(args) {
  /* 최상위 콤마로 갈라 마지막 인자만 돌려준다(괄호·따옴표 안의 콤마는 무시) */
  let d = 0, q = null, last = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') d--;
    else if (c === ',' && d === 0) last = i + 1;
  }
  return args.slice(last).trim();
}

function sites(src) {
  const out = [];
  let m;
  PATHCALL.lastIndex = 0;
  while ((m = PATHCALL.exec(src))) {
    const args = m[1];
    const arg = lastArg(args);
    const lits = [...arg.matchAll(/(['"`])((?:[^'"`\\\n]|\\.)*)\1/g)].map(x => x[2]);
    if (!lits.length) continue;
    const name = lits.join('');          /* 조각을 이어 붙인 이름(변수 조각은 빠진다) */
    if (!/\.(html|js|json|txt)$/.test(name)) continue;
    /* 이름의 **첫 조각**이 파일명의 머리다 — `'verify' + id + '.js'` 는 실물 이름이라 임시 사본이 아니다 */
    const head = lits[0].split('/').pop();
    const looksTemp = /^[._]/.test(head)
      || (/^index\./.test(head) && /(revert|before|neg|rev|noguard|zero|nogate|noclamp|nosweep|old|pre|cut|tmp)/i.test(name));
    if (!looksTemp) continue;
    if (/(^|\/)(index\.html|\.gitignore)$/.test(name)) continue;
    out.push({ name: arg.replace(/\s+/g, ' '), idx: m.index, safe: /process\.pid/.test(arg) });
  }
  return out;
}

function report() {
  const rows = [];
  for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.js')).sort()) {
    const src = fs.readFileSync(path.join(DIR, f), 'utf8');
    /* 쓰고 지우는 도구만 — 읽기만 하는 도구는 겹쳐도 안전하다 */
    if (!/write(File)?Sync|createWriteStream/.test(src)) continue;
    if (!/unlinkSync|rmSync/.test(src)) continue;
    const s = sites(src);
    if (!s.length) continue;
    rows.push({ f, sites: s, line: i => src.slice(0, i).split('\n').length });
  }
  const unsafe = rows.map(r => ({ file: r.f, hits: r.sites.filter(x => !x.safe), line: r.line }))
                     .filter(r => r.hits.length);
  const safe = rows.filter(r => r.sites.every(x => x.safe)).map(r => r.f);
  let sites_n = 0; rows.forEach(r => sites_n += r.sites.length);
  return { tools: rows.length, sites: sites_n, safe, unsafe };
}

module.exports = { report, sites };

if (require.main === module) {
  const rep = report();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(rep.unsafe.map(r => ({ file: r.file, names: r.hits.map(h => h.name) })), null, 1));
  } else {
    console.log('== 648 스캔 — 쓰고 지우는 도구 ' + rep.tools + '개 · 임시 사본 자리 ' + rep.sites + '자리');
    console.log('== 안전(이름에 pid): ' + rep.safe.length + '개');
    let n = 0; rep.unsafe.forEach(r => n += r.hits.length);
    console.log('== 고정 이름 남음: 파일 ' + rep.unsafe.length + ' · 자리 ' + n);
    rep.unsafe.forEach(r => console.log('  ' + r.file.padEnd(20) + r.hits.map(h => `${h.name}@${r.line(h.idx)}`).join('  ')));
  }
  process.exitCode = rep.unsafe.length ? 1 : 0;
}
