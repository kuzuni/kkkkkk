#!/usr/bin/env node
/* 작업 560 — 재현자(338 규칙): `verify471` [R] 되돌림 시험이 «두 읽기가 같다» 로 죽는가.
 *
 * [R] 은 `probe471` 을 두 벌 돌려서 같은 호스트(35 패스 탭 `#psBar .pt`)의 **상자**를 견준다:
 *   ⓐ 수리 후  = 드레인 있음            → «멎은 상자»(CSS height 166)
 *   ⓑ 드레인 없음 + 등장 애니 강제 얼림  → `jzPgIn`(scale .985) 한복판의 줄어든 상자
 * 등재문(560)은 ⓑ 가 ⓐ 와 **같은 289×166** 으로 나와 «드레인이 무엇을 막는지» 를 증명 못 한다고 적었다.
 *
 * 이 자는 그 한 쌍을 N 회 반복해 **결정적으로 죽었는가 · 플레이키인가**를 가른다.
 * 재는 것은 [R] 이 재는 것과 정확히 같다(같은 라벨 · 같은 두 환경 · 같은 실행 경로).
 *
 *   node tools/probe560.js [N]      기본 N=5
 *   node tools/probe560.js 5 --json
 */
const { execFileSync } = require('child_process');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const PT = '35 패스 탭 #psBar .pt>.bdg';
const N = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '5', 10);
const JSONOUT = process.argv.includes('--json');

const probe = (extraEnv) => {
  const out = execFileSync('node', [path.join(__dirname, 'probe471.js'), '--json'],
    { env: { ...process.env, ...(extraEnv || {}) }, cwd: ROOT,
      maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' });
  return JSON.parse(out.slice(out.indexOf('[\n')));
};

const rows = [];
for (let i = 0; i < N; i++) {
  const good = probe().find(r => r.label === PT);
  const negp = probe({ P471_NODRAIN: '1', P471_FORCEANIM: '1' }).find(r => r.label === PT);
  const dh = good && negp ? Math.round((good.hh - negp.hh) * 100) / 100 : null;
  const dw = good && negp ? Math.round((good.hw - negp.hw) * 100) / 100 : null;
  /* [R] 의 판정식과 한 글자도 다르지 않게 */
  const pass = !!(good && negp && good.hh - negp.hh > 1.5 && good.hw - negp.hw > 1.5);
  rows.push({ i: i + 1, good: good && (good.hw + '×' + good.hh), neg: negp && (negp.hw + '×' + negp.hh),
    dw, dh, drainedGood: good && good.drained, drainedNeg: negp && negp.drained,
    froze: negp && negp.froze, pass });
  if (!JSONOUT) console.log(`  ${i + 1}/${N}  수리 후 ${rows[i].good}  ↔  드레인 없음 ${rows[i].neg}` +
    `   Δ ${dw}×${dh}   얼린 애니 ${rows[i].froze}   ${pass ? 'PASS' : 'FAIL'}`);
}
const fails = rows.filter(r => !r.pass).length;
if (JSONOUT) { console.log(JSON.stringify(rows, null, 1)); }
else {
  console.log('\nPROBE560 ' + (N - fails) + '/' + N + ' PASS · 빨강 ' + fails +
    (fails === 0 ? '  ⇒ 이 트리에서는 [R] 이 살아 있다' :
     fails === N ? '  ⇒ 결정적으로 죽었다' : '  ⇒ 플레이키'));
}
process.exit(0);
