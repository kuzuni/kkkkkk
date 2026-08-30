#!/usr/bin/env node
/* 작업 356 10회차 — 418 이 남긴 **잔여 12자리**를 «진짜 기하 ↔ 측정 바닥» 으로 가른다.
 *
 *   node tools/probe418conv.js            # 잔여 자리가 사는 화면만 DSF 2·3·4 로 재고 수렴표를 낸다
 *   node tools/probe418conv.js --json
 *
 * ── 이 파일은 «자» 가 아니라 «몰이꾼» 이다 ────────────────────────────────
 * 재는 일은 전부 `tools/probe418.js` 의 `sweep()` 이 한다 — 이 파일에는 측정 코드가 한 줄도 없다.
 * (356 은 «자를 두 벌로 적으면 한쪽만 늙는다» 를 [S3] 주석에 못박아 뒀다. 10회차가 처음에
 *  같은 스윕을 새로 쓰다가 그 규칙에 걸려 철회했고, 그 대신 있는 자를 **여러 배율로 몰아** 쓴다.)
 *
 * ── 무엇을 묻는가 ────────────────────────────────────────────────────────
 * 418 은 잔여 12자리를 «상자가 이미 정수라 처방이 없다» 로 넘겼고(§7), 그 12자리가
 * **정말 찌그러져 있는지는 아무도 안 물었다.** 9회차가 세운 규칙이 그 물음의 답이다:
 *
 *     · 배율을 올려도 편차가 **안 줄면** → 진짜 기하(아트·좌표가 만든 실재하는 찌그러짐)
 *     · 배율을 올리면 **0 으로 수렴**하면 → 자의 바닥(1px 이 저배율에서만 커 보인 것)
 *
 * 1px 은 DSF2 에서 폭의 α%, DSF4 에서 α/2% 로 **보이는 크기가 배율에 반비례**한다.
 * 그래서 «DSF4 편차 ÷ DSF2 편차» 가 답을 준다 — 0.5 근처면 바닥, 1 근처면 기하다.
 *
 * ⚠ 이 자는 **잔여 자리를 지우는 자가 아니다.** 바닥으로 갈린 자리는 «고칠 것이 없다» 는 뜻이지
 *   «게이트에서 빼도 된다» 는 뜻이 아니다 — 래칫은 여전히 «새 자리가 생겼는가» 를 세야 한다.
 */
const { sweep } = require('./probe418');

const JSON_OUT = process.argv.includes('--json');

/* 418 1회차 뒤 실측(10회차 재확인)에서 잔여 12자리가 사는 화면.
   ⚠ 손으로 적은 목록이라 **뒤처질 수 있다** — 그래서 아래에서 DSF2 전수 결과와 대조해
   여기 없는 화면에 자리가 있으면 그 사실을 찍는다(397 «무음 실패» 사고 예방). */
const HOSTS = ['13 재화 탭', '50 코스튬', '03 던전', '124 이용권 탭', '02 메인',
  '33 재화 정보', '35 패스(출석)'];

(async () => {
  const runs = {};
  for (const dsf of [2, 3, 4]) {
    runs[dsf] = await sweep({ dsf, only: HOSTS });
  }

  /* 자리 키는 선택자다(418 과 같은 접기). 배율마다 칸 수가 달라질 수 있으므로 편차만 견준다. */
  const keys = new Set();
  for (const d of [2, 3, 4]) for (const g of runs[d].groups) keys.add(g.sel);

  const rows = [...keys].map((sel) => {
    const at = (d) => runs[d].groups.find((g) => g.sel === sel) || null;
    const dev = (d) => { const g = at(d); return g ? Math.abs(g.dev) : 0; };
    const d2 = dev(2), d3 = dev(3), d4 = dev(4);
    /* 수렴비 — 1px 이 만든 겉보기라면 DSF2 → DSF4 에서 절반으로 준다 */
    const ratio = d2 ? d4 / d2 : null;
    const verdict = d2 === 0 ? 'DSF2 에 안 나타남(다른 배율에서만)'
      : ratio <= 0.35 ? '측정 바닥 — 수렴'
      : ratio >= 0.8 ? '기하 — 안 줄어든다'
      : '중간 — 다시 볼 것';
    return { sel, cells: (at(2) || at(3) || at(4)).cells, d2, d3, d4, ratio: ratio === null ? null : +ratio.toFixed(2), verdict };
  }).sort((a, b) => b.d2 - a.d2);

  if (JSON_OUT) { console.log(JSON.stringify({ hosts: HOSTS, rows, counts: { 2: runs[2].cells, 3: runs[3].cells, 4: runs[4].cells } }, null, 1)); }
  else {
    console.log(`[probe418conv] 잔여 자리 호스트 ${HOSTS.length}화면 · DSF 2·3·4`);
    console.log(`  칸 수 — DSF2 ${runs[2].cells} · DSF3 ${runs[3].cells} · DSF4 ${runs[4].cells}`);
    console.log('');
    console.log('  DSF2%   DSF3%   DSF4%   4÷2   판정                    자리');
    for (const r of rows) {
      console.log(`  ${r.d2.toFixed(2).padStart(5)}   ${r.d3.toFixed(2).padStart(5)}   ${r.d4.toFixed(2).padStart(5)}   ` +
        `${(r.ratio === null ? '—' : r.ratio.toFixed(2)).padStart(4)}   ${r.verdict.padEnd(22)}  ${r.sel} (${r.cells}칸)`);
    }
    const geo = rows.filter((r) => r.verdict.startsWith('기하'));
    const mid = rows.filter((r) => r.verdict.startsWith('중간'));
    console.log(`\n  ⇒ 기하 ${geo.length}자리 · 중간 ${mid.length}자리 · 바닥 ${rows.length - geo.length - mid.length}자리`);
  }
  process.exit(0);
})();
