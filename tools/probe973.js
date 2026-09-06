#!/usr/bin/env node
/* 작업 973 — `verify356` [S3] 세 항이 빨간 «뿌리» 를 가르는 재현자
 *
 *   node tools/probe973.js --out a.json          # 지금 트리를 재서 낱장까지 저장
 *   node tools/probe973.js --out b.json --cmp a.json   # 재고 나서 a 와 견준다
 *   node tools/probe973.js --cmp a.json --load b.json  # 이미 잰 둘만 견준다(안 돌린다)
 *
 * ── 왜 이 자가 필요한가 ───────────────────────────────────────────────────
 * `verify356` [S3] 이 내는 말은 **집계 세 줄**이다 — «판정 428개(≥480)» · «자리 23개(래칫 22)» ·
 * «등재 안 된 자리 2개». 이 셋으로는 **어느 화면·어느 그림이** 빠졌는지 물을 수 없어서,
 * 등재문(PROGRESS 973)도 갈래를 둘로 남긴 채 «먼저 화면 순회가 다 도는지 보라» 로 끝난다.
 * ⇒ 이 자는 스윕을 **다시 적지 않는다.** `probe418.sweep({rows:true})` 을 그대로 부르고
 *   그 낱장을 «화면별 · 그림별» 로 접어 다음 셋을 갈라 준다:
 *     ⓐ 화면이 안 열렸나(= 그 화면의 노드 수가 통째로 0/급감)
 *     ⓑ 기준표가 그림을 못 쟀나(= `원본비 없음` 이 늘었다 · `srcRef < srcSeen`)
 *     ⓒ 가림·잘림이 늘었나(= `occ` 가 늘었다)
 * ⚠ 판정 스코프의 산수는 `probe418` 한 곳에만 있다 — 여기서 다시 계산하지 않는다.
 */
const fs = require('fs');
const { sweep } = require('./probe418');

const argv = process.argv.slice(2);
const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const OUT = arg('--out');
const CMP = arg('--cmp');
const LOAD = arg('--load');

/* 낱장을 «화면별» · «그림별» 로 접는다 — 접는 규칙은 한 곳에만 적는다(둘을 견줄 때 같은 자여야 한다) */
function fold(R) {
  const byScreen = new Map();
  const bySrc = new Map();
  for (const r of R.rows) {
    const s = byScreen.get(r.screen) || { screen: r.screen, n: 0, judged: 0, outside: 0, occ: 0 };
    s.n++; if (r.judged) s.judged++; if (!r.inScope) s.outside++; if (r.occ) s.occ++;
    byScreen.set(r.screen, s);
    const key = r.src || `(${r.tag})`;
    const v = bySrc.get(key) || { src: key, n: 0, judged: 0, outside: 0, occ: 0, ref: null, fits: new Set() };
    v.n++; if (r.judged) v.judged++; if (!r.inScope) v.outside++; if (r.occ) v.occ++;
    if (r.ref) v.ref = r.ref;
    v.fits.add(r.fit);
    bySrc.set(key, v);
  }
  return {
    tot: { measured: R.measured, judged: R.judged, outside: R.outside, clipped: R.clipped,
      cells: R.cells, sites: R.groups.length, srcSeen: R.srcSeen, srcRef: R.srcRef,
      scrolled: R.scrolled, extraPages: R.extraPages, capped: R.capped, errs: R.errs },
    groups: R.groups.map((g) => ({ sel: g.sel, dev: g.dev, cells: g.cells, screens: g.screens })),
    screens: [...byScreen.values()],
    srcs: [...bySrc.values()].map((v) => ({ ...v, fits: [...v.fits] })),
  };
}

function show(F, title) {
  const t = F.tot;
  console.log(`\n=== ${title} ===`);
  console.log(`  잰 노드 ${t.measured} · 판정 ${t.judged} · 원본비 없음 ${t.outside} · 가려짐·잘림 ${t.clipped}`);
  console.log(`  칸 ${t.cells} · 자리 ${t.sites} · 그림 ${t.srcRef}/${t.srcSeen} 이 기준표에 들어왔다`);
  console.log(`  스크롤 화면 ${t.scrolled} · 더 돈 쪽 ${t.extraPages} · 상한에 걸린 그릇 ${t.capped} · 진입 실패 ${t.errs.length}`);
  const noRef = F.srcs.filter((s) => s.src.endsWith('.svg') || s.src.startsWith('data:') || s.src.includes('/'))
    .filter((s) => !s.ref);
  if (noRef.length) {
    console.log(`  [ⓑ] 기준표가 못 잰 그림 ${noRef.length}종 — 이 그림을 쓰는 노드는 전부 판정 밖이다:`);
    for (const s of noRef.sort((a, b) => b.n - a.n))
      console.log(`      ${String(s.n).padStart(4)}노드  ${s.src.split('/').slice(-1)[0]}  fit=${s.fits.join(',')}`);
  }
}

function diff(A, B) {
  console.log('\n=== 두 실행의 차 (A → B) ===');
  const k = ['measured', 'judged', 'outside', 'clipped', 'cells', 'sites', 'srcSeen', 'srcRef', 'capped'];
  console.log('  ' + k.map((x) => `${x} ${A.tot[x]}→${B.tot[x]}`).join(' · '));

  const am = new Map(A.screens.map((s) => [s.screen, s]));
  const bm = new Map(B.screens.map((s) => [s.screen, s]));
  const names = [...new Set([...am.keys(), ...bm.keys()])];
  const rows = names.map((n) => {
    const a = am.get(n) || { n: 0, judged: 0, outside: 0, occ: 0 };
    const b = bm.get(n) || { n: 0, judged: 0, outside: 0, occ: 0 };
    return { n, dJ: b.judged - a.judged, dN: b.n - a.n, dO: b.outside - a.outside, dC: b.occ - a.occ, a, b };
  }).filter((r) => r.dJ || r.dN).sort((x, y) => Math.abs(y.dJ) - Math.abs(x.dJ));
  console.log(`  화면별 판정 차 — 움직인 화면 ${rows.length}개`);
  for (const r of rows)
    console.log(`      판정 ${r.a.judged}→${r.b.judged} (${r.dJ > 0 ? '+' : ''}${r.dJ}) · 잰 ${r.a.n}→${r.b.n} · ` +
      `원본비없음 ${r.a.outside}→${r.b.outside} · 가림 ${r.a.occ}→${r.b.occ}   ${r.n}`);

  const as = new Map(A.srcs.map((s) => [s.src, s]));
  const bs = new Map(B.srcs.map((s) => [s.src, s]));
  const srcRows = [...new Set([...as.keys(), ...bs.keys()])].map((s) => {
    const a = as.get(s) || { n: 0, judged: 0, outside: 0, ref: null };
    const b = bs.get(s) || { n: 0, judged: 0, outside: 0, ref: null };
    return { s, dJ: b.judged - a.judged, a, b };
  }).filter((r) => r.dJ).sort((x, y) => Math.abs(y.dJ) - Math.abs(x.dJ));
  console.log(`  그림별 판정 차 — 움직인 그림 ${srcRows.length}종`);
  for (const r of srcRows)
    console.log(`      판정 ${r.a.judged}→${r.b.judged} (${r.dJ > 0 ? '+' : ''}${r.dJ}) · 노드 ${r.a.n}→${r.b.n} · ` +
      `기준표 ${r.a.ref ? '○' : '✗'}→${r.b.ref ? '○' : '✗'}   ${r.s.split('/').slice(-1)[0]}`);

  const ag = new Set(A.groups.map((g) => g.sel));
  const bg = new Set(B.groups.map((g) => g.sel));
  const only = (x, y, lab) => {
    const l = [...x].filter((s) => !y.has(s));
    console.log(`  ${lab} ${l.length}자리`);
    for (const s of l) console.log(`      ${s}`);
  };
  only(bg, ag, 'B 에만 있는 자리');
  only(ag, bg, 'A 에만 있는 자리');
}

(async () => {
  let F = null;
  if (LOAD) F = JSON.parse(fs.readFileSync(LOAD, 'utf8'));
  else {
    const R = await sweep({ dsf: 2, rows: true });
    F = fold(R);
  }
  if (OUT) { fs.writeFileSync(OUT, JSON.stringify(F, null, 1)); console.log(`[probe973] 저장 → ${OUT}`); }
  show(F, LOAD || OUT || '이번 실행');
  if (CMP) {
    const A = JSON.parse(fs.readFileSync(CMP, 'utf8'));
    show(A, CMP);
    diff(A, F);
  }
  process.exit(0);
})();
