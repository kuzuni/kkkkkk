#!/usr/bin/env node
/* 작업 601 — [S3] ③ 이름표가 새로 뱉은 **두 자리**를 그 자리에서 시험한다 (측정 전용 · 판정은 verify356.js [S3])
 *
 *   node tools/probe601.js            # 전 시험
 *   node tools/probe601.js --case A   # A/B 한 자리만
 *   node tools/probe601.js --id A-52,A-54
 *
 * ── 무엇을 묻는가 ───────────────────────────────────────────────────────
 * 548 이 놓은 자(`tools/probe548.js`)를 그대로 이어 쓴다 — 물음도 같다:
 *   · 편차를 **device px** 로 되돌린다(`Δw`). |Δw| < 1px 이면 기하가 아니라 자의 바닥이다.
 *   · **DSF 수렴**(356 9회차) — 배율을 올려 편차가 0 으로 가면 자의 바닥, 안 줄면 기하다.
 *   · **418 §5** — «상자를 다른 정수로 바꾸면 편차가 사라지는가».
 *
 * ── 이 자가 더하는 축 하나: «좌표» ──────────────────────────────────────
 * A 는 **상자가 이미 정수 53** 이다(`TR_CUR_PX = 53` 을 `curIc()` 이 인라인으로 박는다).
 * 418 이 «소수 상자» 를 닫은 뒤 남는 갈래는 **소수 좌표**인데(`.ps-bx` 가 그 선례 — 상자는 정수
 * 88 인데 행 y 가 1003.5), 548 의 `CASES` 에는 그 축을 묻는 시험이 없다. A 는 버튼 안
 * `text-align:center` 로 놓인 인라인 이미지라 x 가 **491.5625** 에 앉는다 ⇒ `position:relative;left`
 * 로 x 만 정수로 밀어 «좌표 몫인가» 를 가른다. 크기·자리는 한 픽셀도 안 움직이는 시험이다.
 *
 * ⚠ 스윕·정지·정규화는 `probe418` 것을 그대로 쓴다(530 규칙 — 두 벌로 적으면 한쪽만 늙는다).
 * ⚠ `PROBE418_CSS` 는 `sweep()` 이 페이지마다 읽는다 — 호출 직전에 세우고 지운다.
 */
const { sweep } = require('./probe418');

const argv = process.argv.slice(2);
const ONLY_CASE = argv.includes('--case') ? argv[argv.indexOf('--case') + 1] : null;
const ONLY_ID = argv.includes('--id') ? argv[argv.indexOf('--id') + 1].split(',') : null;

const SITES = {
  /* 584 가 키운 룬 [강화] 버튼 안 화폐(`curIc('rstone', TR_CUR_PX)`) */
  A: { sel: 'div#trRunes>div.tr-rn>span.rbt.b1.no>i>img.cic',
       lab: '23 룬 — [강화] 버튼 안 룬강화석(584 `TR_CUR_PX = 53`)', screen: '23 룬' },
  /* 585 가 배율을 올린 03 던전 재화 알약 — **잠금이 안 걸린** 유물 던전 칸.
     이미 등재된 `.dnc.bgm-rel.lkd>.pill` 과 같은 부품의 다른 상태다. */
  B: { sel: 'div#dunList>div.dnc.bgm-rel>div.pill>em>img.cic',
       lab: '03 던전 — 유물 던전(해금) 재화 알약(585 `scale(1.14664)`)', screen: '03 던전' },
};

const CASES = [
  /* ── 바닥값 + DSF 수렴 ── */
  { id: 'A-base2', screen: '23 룬', dsf: 2, css: '', want: ['A'], why: '바닥값(DSF2)' },
  { id: 'A-base3', screen: '23 룬', dsf: 3, css: '', want: ['A'], why: 'DSF 수렴 시험' },
  { id: 'A-base4', screen: '23 룬', dsf: 4, css: '', want: ['A'], why: 'DSF 수렴 시험' },

  /* ── A: 418 §5 «어느 정수인가» — 상자 53 의 위·아래 정수.
         ⚠ `curIc()` 이 인라인 style 로 박으므로 `!important` 가 있어야 이긴다. ── */
  { id: 'A-52', screen: '23 룬', dsf: 2, want: ['A'], why: 'A: 상자 53 → 52',
    css: '#trRunes .rbt>i>.cic{width:52px!important;height:52px!important}' },
  { id: 'A-54', screen: '23 룬', dsf: 2, want: ['A'], why: 'A: 상자 53 → 54',
    css: '#trRunes .rbt>i>.cic{width:54px!important;height:54px!important}' },
  /* ── A: «좌표» 축. x 491.5625 → 492.0000 (Δ+0.4375px · 크기 불변) ── */
  { id: 'A-xint', screen: '23 룬', dsf: 2, want: ['A'], why: 'A: x 만 정수로(491.5625 → 492)',
    css: '#trRunes .rbt>i>.cic{position:relative;left:0.4375px}' },
  /* ── A: 좌표를 반대쪽 정수로도 밀어 본다(한쪽만 재면 «우연히 좋아진 자리» 를 못 가른다) ── */
  { id: 'A-xint2', screen: '23 룬', dsf: 2, want: ['A'], why: 'A: x 만 정수로(491.5625 → 491)',
    css: '#trRunes .rbt>i>.cic{position:relative;left:-0.5625px}' },

  /* ── B: 바닥값 + DSF 수렴 ── */
  { id: 'B-base2', screen: '03 던전', dsf: 2, css: '', want: ['B'], why: '바닥값(DSF2)' },
  { id: 'B-base3', screen: '03 던전', dsf: 3, css: '', want: ['B'], why: 'DSF 수렴 시험' },
  { id: 'B-base4', screen: '03 던전', dsf: 4, css: '', want: ['B'], why: 'DSF 수렴 시험' },
  /* ── B: 548 §4-C 와 같은 함정 — 부모 `em` 이 `scale(1.14664)` 라 **선언 상자 ≠ 그려지는 상자**다.
         그려지는 상자 54.4833 을 54·55 로 맞추려면 선언값을 배율로 나눠 심는다. ── */
  { id: 'B-r54', screen: '03 던전', dsf: 2, want: ['B'], why: 'B: 그려지는 상자 54.4833 → 54',
    css: '.dnc .pill>em>.cic{width:47.0968px!important;height:47.0968px!important}' },
  { id: 'B-r55', screen: '03 던전', dsf: 2, want: ['B'], why: 'B: 그려지는 상자 54.4833 → 55',
    css: '.dnc .pill>em>.cic{width:47.9690px!important;height:47.9690px!important}' },
];

/* 편차 %를 device px 로 되돌린다(548 과 같은 식) — dev = (w/h)/ref − 1 ⇒ 기대 폭 = ref × h */
function deltaPx(inkStr, devPct) {
  const m = /^(\d+)×(\d+)$/.exec(inkStr);
  if (!m) return null;
  const w = +m[1], h = +m[2];
  const ref = (w / h) / (1 + devPct / 100);
  return { w, h, expW: ref * h, dw: w - ref * h };
}

(async () => {
  const wanted = (c) => (!ONLY_CASE || c.want.includes(ONLY_CASE.toUpperCase())) &&
    (!ONLY_ID || ONLY_ID.includes(c.id));
  const runs = CASES.filter(wanted);
  console.log(`[probe601] 시험 ${runs.length}건 — [S3] ③ 이름표가 낸 2자리를 418 §5 · 548 방식으로 시험한다\n`);

  const out = [];
  for (const c of runs) {
    if (c.css) process.env.PROBE418_CSS = c.css; else delete process.env.PROBE418_CSS;
    const R = await sweep({ dsf: c.dsf, only: [c.screen] });
    delete process.env.PROBE418_CSS;
    if (R.errs.length) { console.log(`  [!] ${c.id} — 화면 진입 실패: ${R.errs.join(' / ')}`); continue; }
    for (const k of c.want) {
      const g = R.groups.find((z) => z.sel === SITES[k].sel);
      const row = { case: c.id, why: c.why, site: k, dsf: c.dsf,
        judged: R.judged, clipped: R.clipped, cells: R.cells, sites: R.groups.length };
      if (!g) {
        Object.assign(row, { dev: null, ink: null, box: null, note: '문턱 밖(≤0.5%) 또는 가려짐' });
      } else {
        const d = deltaPx(g.ink, g.dev);
        Object.assign(row, { dev: g.dev, ink: g.ink, box: g.box, cellsHere: g.cells,
          dw: d ? +d.dw.toFixed(2) : null, expW: d ? +d.expW.toFixed(2) : null });
      }
      out.push(row);
      const dv = row.dev == null ? '   —  ' : `${row.dev > 0 ? '+' : ''}${row.dev}%`;
      const dw = row.dw == null ? '' : ` · Δw ${row.dw > 0 ? '+' : ''}${row.dw}px${Math.abs(row.dw) < 1 ? ' (1px 미만 = 자의 바닥)' : ''}`;
      console.log(`  ${c.id.padEnd(9)} ${k}  DSF${c.dsf}  ${dv.padStart(7)}  ` +
        `잉크 ${(row.ink || '-').padEnd(8)} 상자 ${(row.box || '-').padEnd(19)}${dw}`);
      if (row.note) console.log(`             ↳ ${row.note} (그 실행의 판정 ${row.judged} · 가려짐 ${row.clipped} · 칸 ${row.cells} · 자리 ${row.sites})`);
      else console.log(`             ↳ ${c.why} (그 실행의 판정 ${row.judged} · 가려짐 ${row.clipped} · 칸 ${row.cells} · 자리 ${row.sites})`);
    }
  }

  console.log('\n[probe601] 요약');
  for (const k of Object.keys(SITES)) {
    if (ONLY_CASE && k !== ONLY_CASE.toUpperCase()) continue;
    const mine = out.filter((r) => r.site === k);
    if (!mine.length) continue;
    console.log(`  ${k} — ${SITES[k].lab}`);
    for (const r of mine) {
      console.log(`      ${r.case.padEnd(9)} ${r.dev == null ? '판정 밖/문턱 아래' :
        `${r.dev > 0 ? '+' : ''}${r.dev}%  Δw ${r.dw > 0 ? '+' : ''}${r.dw}px`}   ${r.why}`);
    }
  }
  if (argv.includes('--json')) console.log('\n' + JSON.stringify(out, null, 1));
  process.exit(0);
})();
