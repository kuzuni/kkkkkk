#!/usr/bin/env node
/* 작업 548 — 530 이 «상시로» 드러낸 3자리를 **그 자리에서** 시험한다 (측정 전용 · 판정은 verify356.js [S3])
 *
 *   node tools/probe548.js            # 전 시험(11회 스윕 · 10분 안팎)
 *   node tools/probe548.js --case A   # A/B/C 한 자리만
 *
 * ── 무엇을 묻는가 ───────────────────────────────────────────────────────
 * 530 이 스윕을 결정적으로 만들자 «가려짐» 이 47~52 → 19 로 줄고, 옛 자가 뜨고 지며 놓치던
 * 세 자리가 매 실행 나오게 됐다. PROGRESS 548 의 처방은 **418 §5 방식**이다 —
 * «정수 상자로 바꾸면 편차가 사라지는가» 를 그 자리에서 시험하고,
 *   · 사라지면 소수 상자 결함이라 **닫는다**(제품 수리 + `KNOWN_SITES` 에서 뺀다)
 *   · 안 사라지면 좌표·아트·AA 몫이라 **그대로 두고 «왜 남는가» 를 적는다**.
 *
 * ── 이 자가 더하는 축 둘 ────────────────────────────────────────────────
 * ⓐ **«몇 %» 가 아니라 «몇 device px»** — 편차 %는 잉크가 작을수록 커진다(입장권은 잉크가 53px
 *    이라 1px 이 1.9% 다). 그래서 `ref` 종횡비로 **기대 폭**을 되돌려 `Δw` 를 px 로 찍는다.
 *    |Δw| < 1px 이면 그것은 기하가 아니라 **자의 바닥**이다(래스터가 한 축을 1px 더 먹는 그 1px).
 * ⓑ **DSF 수렴**(356 9회차 규칙) — 배율을 올려 편차가 0 으로 수렴하면 자의 바닥,
 *    안 줄면 기하다. DSF2·3·4 를 같은 자리에서 잰다.
 *
 * ⚠ 스윕·정지·정규화는 **`probe418` 것을 그대로 가져다 쓴다**(530 규칙 — 두 벌로 적으면 한쪽만 늙는다).
 * ⚠ `PROBE418_CSS` 는 `sweep()` 이 **페이지마다 읽는다** — 그래서 여기서는 호출 직전에 세우고 지운다.
 */
const { sweep } = require('./probe418');

const argv = process.argv.slice(2);
const ONLY_CASE = argv.includes('--case') ? argv[argv.indexOf('--case') + 1] : null;
/* 한 시험만 다시 돌릴 때(쉼표로 여럿): `--id C-r50,C-r51` */
const ONLY_ID = argv.includes('--id') ? argv[argv.indexOf('--id') + 1].split(',') : null;

/* 530 §8 이 등재한 세 자리 (PROGRESS 548) */
const SITES = {
  A: { sel: 'div#shopList>div.cn-wrap>div.cn-a2>div.gm>img.cic',
       lab: '13 재화 — 평생광고 배너 보석 묶음(`.cn-a2>.gm` 3장 중 가운데)', screen: '13 재화' },
  B: { sel: 'div#shopList>div.cn-wrap>div.cn-cd.alert>div.pn>em>img.cic',
       lab: '13 재화 — 광고 카드 «가격» 알약 아이콘(`.cn-cd.alert>.pn`)', screen: '13 재화' },
  C: { sel: 'div#dunList>div.dnc.bgm-dia>div.sp.tk>em>img.cic',
       lab: '03 던전 — 다이아 던전 입장권(`.dnc.bgm-dia>.sp.tk`)', screen: '03 던전' },
};

/* 시험 목록. `css` 는 `PROBE418_CSS` 로 그 자리에 심는 처방이다. */
const CASES = [
  /* ── 바닥값: 세 자리 그대로 ── */
  { id: 'base2', screen: '13 재화', dsf: 2, css: '', want: ['A', 'B'], why: '바닥값(DSF2)' },
  { id: 'base3', screen: '13 재화', dsf: 3, css: '', want: ['A', 'B'], why: 'DSF 수렴 시험' },
  { id: 'base4', screen: '13 재화', dsf: 4, css: '', want: ['A', 'B'], why: 'DSF 수렴 시험' },
  { id: 'dun2', screen: '03 던전', dsf: 2, css: '', want: ['C'], why: '바닥값(DSF2)' },
  { id: 'dun3', screen: '03 던전', dsf: 3, css: '', want: ['C'], why: 'DSF 수렴 시험' },
  { id: 'dun4', screen: '03 던전', dsf: 4, css: '', want: ['C'], why: 'DSF 수렴 시험' },

  /* ── A: «형제가 덮는가» — `.gm` 은 세 장이 상자째 겹쳐 있다(110·96·106 이 한 176px 칸 안).
         형제를 숨기고 다시 재서 편차가 형제 몫인지 아닌지 가른다. 상자는 이미 정수 96 이라
         418 §5 의 «정수 상자» 처방은 여기서 쓸 것이 없다 — 물음이 다르다. ── */
  { id: 'A-nosib', screen: '13 재화', dsf: 2, want: ['A'], why: 'A: 형제 두 장(110·106)을 숨긴다',
    css: '.cn-a2>.gm>.cic:nth-child(1),.cn-a2>.gm>.cic:nth-child(3){opacity:0!important}' },
  { id: 'A-alone', screen: '13 재화', dsf: 2, want: ['A'], why: 'A: 형제 + 배너 글자(`em`·`.no`)까지 숨긴다',
    css: '.cn-a2>.gm>.cic:nth-child(1),.cn-a2>.gm>.cic:nth-child(3),.cn-a2>em,.cn-a2>.no{opacity:0!important}' },

  /* ── B: 상자는 이미 정수 120 이다. 418 §5 처럼 **어느 정수인가**를 물어 본다(위·아래 각 1px). ── */
  { id: 'B-119', screen: '13 재화', dsf: 2, want: ['B'], why: 'B: 상자 120 → 119',
    css: '.cn-cd .pn>em>.cic{width:119px!important;height:119px!important}' },
  { id: 'B-121', screen: '13 재화', dsf: 2, want: ['B'], why: 'B: 상자 120 → 121',
    css: '.cn-cd .pn>em>.cic{width:121px!important;height:121px!important}' },

  /* ── A: 상자는 정수 96 이지만 418 §5 의 «어느 정수인가» 를 여기서도 물어 본다(위·아래 각 1px).
         형제는 숨긴 채로 — 안 그러면 형제 몫과 섞인다. ── */
  { id: 'A-95', screen: '13 재화', dsf: 2, want: ['A'], why: 'A: 상자 96 → 95 (형제 숨김)',
    css: '.cn-a2>.gm>.cic:nth-child(1),.cn-a2>.gm>.cic:nth-child(3){opacity:0!important}' +
         '.cn-a2>.gm>.cic:nth-child(2){width:95px!important;height:95px!important}' },
  { id: 'A-97', screen: '13 재화', dsf: 2, want: ['A'], why: 'A: 상자 96 → 97 (형제 숨김)',
    css: '.cn-a2>.gm>.cic:nth-child(1),.cn-a2>.gm>.cic:nth-child(3){opacity:0!important}' +
         '.cn-a2>.gm>.cic:nth-child(2){width:97px!important;height:97px!important}' },

  /* ── C: ⚠ **1회차의 첫 시험은 틀렸다.** 이 자리는 부모 `em` 이 `transform:scale(.8269)` 를 걸고 있어
         **선언 상자(60.4688) ≠ 그려지는 상자(50.0016)** 다. `width:50px` 로 심으면 그려지는 상자가
         50 이 아니라 **41.35** 가 되어 «정수 상자 시험» 이 아니라 «크기를 줄이는 시험» 이 된다
         (실측: 51px 을 심었더니 상자가 42.1719 로 찍혔다 — 그것이 이 오측의 증거다).
       ⇒ 물어야 할 것은 **그려지는 상자**이므로 선언값을 배율로 나눠 심는다: 선언 = 목표 ÷ .8269. ── */
  { id: 'C-r49', screen: '03 던전', dsf: 2, want: ['C'], why: 'C: 그려지는 상자 50.0016 → 49',
    css: '.dnc .sp.tk>em>.cic{width:59.2575px!important;height:59.2575px!important}' },
  { id: 'C-r50', screen: '03 던전', dsf: 2, want: ['C'], why: 'C: 그려지는 상자 50.0016 → 50.0000',
    css: '.dnc .sp.tk>em>.cic{width:60.4668px!important;height:60.4668px!important}' },
  { id: 'C-r51', screen: '03 던전', dsf: 2, want: ['C'], why: 'C: 그려지는 상자 50.0016 → 51',
    css: '.dnc .sp.tk>em>.cic{width:61.6761px!important;height:61.6761px!important}' },
];

/* 편차 %를 **device px** 로 되돌린다 — 이것이 «자의 바닥인가» 를 가르는 축이다.
   dev = (w/h)/ref − 1  ⇒  ref = (w/h)/(1+dev)  ⇒  기대 폭 = ref × h. */
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
  console.log(`[probe548] 시험 ${runs.length}건 — 530 §8 의 3자리를 418 §5 방식으로 그 자리에서 시험한다\n`);

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
        /* 문턱(0.5%) 아래로 내려갔거나 «가려짐» 으로 판정 밖으로 나갔다 — 둘은 다른 말이라 같이 찍는다 */
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

  console.log('\n[probe548] 요약');
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
