#!/usr/bin/env node
/* 199 39회차 — **문턱 스윕의 ①③ 손실을 «문턱 탓» 과 «구성 탓» 으로 가른다** (38-7 1번)
 * ─────────────────────────────────────────────────────────────────────────────
 * 38-5 는 `ES_BANDG` 9 → 8(문턱 s360 → s320)을 **30일** 창에서 재고 «총계 축 둘이 나빠진다»
 * (① 벽 간격 기하평균 −9.4% → −12.2% · ③ 순 이동 비중 3.78% → 2.15%)를 찍었다. 그런데
 * 그 두 표는 **구성이 다르다** — 설치값 30일 창에는 문턱 위 배정 벽이 0~1개라 «말미 벽» 이
 * 아예 안 담기고, 스윕 쪽에는 담긴다. 그래서 38-5 는 채택을 미루고 이렇게 적었다:
 *   «①③ 이 나빠진 것이 «문턱 때문» 인지 «창이 말미 벽을 처음 담아서» 인지 이 표로는 안 갈린다.
 *    그 전에는 «문턱을 앞당기면 ③ 이 나빠진다» 를 결론으로 적지 마라.»
 *
 * 이 자가 하는 일 — **같은 창에서 두 설정을 견준다**(33-6 1번의 «120일 표» 와 같은 길):
 *   [A] 재현 — 38-5 의 30일 두 표가 커밋된 md 에서 그대로 다시 나온다 (338 규칙)
 *   [B] 90일 창 2×2 표 — 설정(9 / 8) × 창(30일 / 90일)
 *   [C] ⚑⚑ 본체 — 분해: 구성 효과(설정 고정 · 창만 바꿈) ↔ 문턱 효과(창 고정 · 설정만 바꿈)
 *   [D] 이득도 같이 — «말미 축 판정 가능» 은 창을 늘려서는 못 산다(설치값은 90일에도 판정 불가)
 *   [E] 표본 흔들기 — 시드 12 → 24 에서 값도 부호도 안 바뀐다 (LESSONS A3-ⓑ)
 *   [F] 판정
 *   [R] 되돌림 시험
 *
 * ⚠ 새 봇 실행은 안 한다 — 커밋된 md/json 만 읽는다. 값은 한 줄도 손으로 안 적는다.
 * ⚠ 자는 **봇이 찍은 문장**을 읽는다(두 벌로 다시 계산하지 않는다 — 356-⑬ «자를 두 벌로
 *   적으면 한쪽만 늙는다»). ①·③ 의 정의는 `tools/bot199.js` 한 곳에 있다.
 *
 * 종료 코드: 0 통과 · 1 FAIL.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const RV = path.join(ROOT, 'docs', 'review');

const say = m => console.log(m);
const f1 = v => Number.isFinite(v) ? v.toFixed(1) : '—';
const f2 = v => Number.isFinite(v) ? v.toFixed(2) : '—';
const pp = v => Number.isFinite(v) ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%p' : '—';

let OK = 0, NG = 0;
const ck = (name, cond, got) => { if (cond) { OK++; say(`  ✔ ${name}` + (got != null ? ` — ${got}` : '')); }
                                  else { NG++; say(`  ✗ ${name}` + (got != null ? ` — ${got}` : '')); } };

/* ── 실행 넷(+시드 흔들기 둘) ─────────────────────────────────────────── */
const RUNS = {
  b30: { file: '199-bot-2026-09-06-r36-base.md',            tag: '30일 · 설치값(BANDG 9)', days: 30, bandg: 9 },
  s30: { file: '199-bot-2026-09-06-r38-sw-bandg8.md',       tag: '30일 · 문턱 s320(BANDG 8)', days: 30, bandg: 8 },
  b90: { file: '199-bot-2026-09-06-r39-d90-base.md',        tag: '90일 · 설치값(BANDG 9)', days: 90, bandg: 9 },
  s90: { file: '199-bot-2026-09-06-r39-d90-bandg8.md',      tag: '90일 · 문턱 s320(BANDG 8)', days: 90, bandg: 8 },
  b90b:{ file: '199-bot-2026-09-06-r39-d90-base-s24.md',    tag: '90일 · 설치값 · 시드 24', days: 90, bandg: 9 },
  s90b:{ file: '199-bot-2026-09-06-r39-d90-bandg8-s24.md',  tag: '90일 · 문턱 s320 · 시드 24', days: 90, bandg: 8 },
};

/* 봇 표의 «축 한 줄» 을 그대로 읽는다 — `| 축 이름 | 부지런 | 대충 | 비 |` */
const rowOf = (txt, key) => {
  const line = txt.split('\n').find(l => l.startsWith('|') && l.includes(key));
  if (!line) return null;
  const c = line.split('|').map(s => s.trim());
  return { dil: c[2] || '', cas: c[3] || '' };
};
const num = v => { const m = String(v || '').match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
/* ① 은 «×1.758 / 목표 ×1.815 = -3.2%» 꼴 — 목표 대비 %p 가 판정값이다(목표가 창마다 다르다). */
const gapPc = v => { const m = String(v || '').match(/=\s*(-?\d+(?:\.\d+)?)%/); return m ? parseFloat(m[1]) : NaN; };
const gapAbs = v => { const m = String(v || '').match(/×(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : NaN; };

const K_GAP = '① 벽 간격 기하평균 p50 —';
const K_MOV = '순 이동 비중(%)';
const K_OUT = '① 창 밖 벽 p50 = §0';
const K_CAP = '창 역량 — 말미 축(①문턱위';
const K_STG = '일 스테이지 p50';

const R = {};
for (const [k, r] of Object.entries(RUNS)) {
  const p = path.join(RV, r.file);
  if (!fs.existsSync(p)) { R[k] = null; continue; }
  const txt = fs.readFileSync(p, 'utf8');
  const g = rowOf(txt, K_GAP), m = rowOf(txt, K_MOV), o = rowOf(txt, K_OUT),
        c = rowOf(txt, K_CAP), s = rowOf(txt, K_STG);
  R[k] = {
    ...r,
    gapPcD: g && gapPc(g.dil), gapAbsD: g && gapAbs(g.dil),
    gapPcC: g && gapPc(g.cas), gapAbsC: g && gapAbs(g.cas),
    movD: m && num(m.dil), outD: o && num(o.dil),
    capD: c && c.dil, capC: c && c.cas,
    stgD: s && num(s.dil),
  };
}

say('# probe199r39 — 문턱 스윕의 ①③ 손실: «문턱 탓» 인가 «구성 탓» 인가 (38-7 1번)');
say('');

/* ═══ [A] 재현 ═════════════════════════════════════════════════════════ */
say('## [A] 재현 — 38-5 의 30일 두 표가 커밋된 md 에서 그대로 나온다 (338 규칙)');
say('');
ck('[A0] 실행 여섯이 전부 있다 (30일 둘 · 90일 둘 · 시드 흔들기 둘)',
   Object.keys(RUNS).every(k => R[k]),
   Object.entries(RUNS).map(([k]) => `${k}:${R[k] ? '✔' : '없다'}`).join(' · '));
if (Object.keys(RUNS).some(k => !R[k])) {
  say('');
  say('_없는 실행은 이렇게 만든다(같은 κ 표 — 해시가 같아야 «같은 자로 잰 비교» 다):_');
  say('```');
  say('node tools/bot199.js --days=90 --seeds=12 --policy=both --calib=docs/review/199-calib-r25.json \\');
  say('  --out=docs/review/199-bot-2026-09-06-r39-d90-base.md --json=docs/review/199-bot-2026-09-06-r39-d90-base.json');
  say('# index.html 의 `const ES_BANDG = 9;` 를 8 로 바꾼 뒤 같은 명령(파일 이름만 -bandg8), 끝나면 되돌린다');
  say('```');
  say('');
  say(`RESULT — ${OK} PASS / ${NG} FAIL`);
  process.exit(1);
}
say('| 축(부지런) | 30일 설치값 | 30일 문턱 s320 | 38-5 가 적은 값 |');
say('|---|---|---|---|');
say(`| ① 벽 간격 기하평균 (목표 대비) | ×${f2(R.b30.gapAbsD)} (${f1(R.b30.gapPcD)}%) | ×${f2(R.s30.gapAbsD)} (${f1(R.s30.gapPcD)}%) | ×1.725 (−9.4%) → ×1.672 (−12.2%) |`);
say(`| ③ 순 이동 비중(%) | ${f2(R.b30.movD)} | ${f2(R.s30.movD)} | 3.78 → 2.15 |`);
say(`| ① 창 밖 벽 p50 | ${R.b30.outD} | ${R.s30.outD} | 2 → 3 |`);
say(`| 스테이지 p50 | ${R.b30.stgD} | ${R.s30.stgD} | 376 → 368 |`);
say('');
ck('[A1] 38-5 의 ① 두 값이 그대로다 (−9.4% · −12.2%)',
   Math.abs(R.b30.gapPcD + 9.4) <= 0.15 && Math.abs(R.s30.gapPcD + 12.2) <= 0.15,
   `${f1(R.b30.gapPcD)}% · ${f1(R.s30.gapPcD)}%`);
ck('[A2] 38-5 의 ③ 두 값이 그대로다 (3.78 · 2.15)',
   Math.abs(R.b30.movD - 3.78) <= 0.02 && Math.abs(R.s30.movD - 2.15) <= 0.02,
   `${f2(R.b30.movD)} · ${f2(R.s30.movD)}`);
ck('[A3] 38-5 의 «창 밖 벽 2 → 3» 과 «스테이지 376 → 368» 도 그대로다',
   R.b30.outD === 2 && R.s30.outD === 3 && R.b30.stgD === 376 && R.s30.stgD === 368,
   `벽 ${R.b30.outD}→${R.s30.outD} · s${R.b30.stgD}→s${R.s30.stgD}`);
say('');

/* ═══ [B] 90일 2×2 ═════════════════════════════════════════════════════ */
say('## [B] 같은 자·같은 κ 표로 **창을 90일로 늘려** 두 설정을 다시 읽는다');
say('');
say('| 축(부지런) | 30일 설치값 | 30일 문턱 s320 | **90일 설치값** | **90일 문턱 s320** |');
say('|---|---|---|---|---|');
say(`| ① 벽 간격 기하평균 (목표 대비) | ${f1(R.b30.gapPcD)}% | ${f1(R.s30.gapPcD)}% | **${f1(R.b90.gapPcD)}%** | **${f1(R.s90.gapPcD)}%** |`);
say(`| ③ 순 이동 비중(%) | ${f2(R.b30.movD)} | ${f2(R.s30.movD)} | **${f2(R.b90.movD)}** | **${f2(R.s90.movD)}** |`);
say(`| ① 창 밖 벽 p50 (§0 «없어야 할 벽») | ${R.b30.outD} | ${R.s30.outD} | **${R.b90.outD}** | **${R.s90.outD}** |`);
say(`| 스테이지 p50 | ${R.b30.stgD} | ${R.s30.stgD} | **${R.b90.stgD}** | **${R.s90.stgD}** |`);
say('');
ck('[B1] 90일 창이 두 설정 다 30일보다 멀리 간다 — 창을 실제로 늘렸다는 증거',
   R.b90.stgD > R.b30.stgD && R.s90.stgD > R.s30.stgD,
   `설치값 s${R.b30.stgD}→s${R.b90.stgD} · 문턱8 s${R.s30.stgD}→s${R.s90.stgD}`);
say('');

/* ═══ [C] 본체 — 분해 ═════════════════════════════════════════════════ */
say('## [C] ⚑⚑ 본체 — 손실을 **구성 효과**와 **문턱 효과**로 가른다');
say('');
const dGapWin  = R.b90.gapPcD - R.b30.gapPcD;      /* 설정 고정(설치값) · 창만 30 → 90 */
const dGapWinS = R.s90.gapPcD - R.s30.gapPcD;      /* 설정 고정(문턱8) · 창만 30 → 90 */
const dGap30   = R.s30.gapPcD - R.b30.gapPcD;      /* 창 고정(30일) · 설정만 9 → 8 */
const dGap90   = R.s90.gapPcD - R.b90.gapPcD;      /* 창 고정(90일) · 설정만 9 → 8 */
const rMov30   = R.s30.movD / R.b30.movD;
const rMov90   = R.s90.movD / R.b90.movD;
say('| 효과 | ① 벽 간격 기하평균 | ③ 순 이동 비중 |');
say('|---|---|---|');
say(`| **구성**(설치값 고정 · 30일 → 90일) | ${f1(R.b30.gapPcD)}% → ${f1(R.b90.gapPcD)}% (${pp(dGapWin)}) | ${f2(R.b30.movD)} → ${f2(R.b90.movD)} (×${f2(R.b90.movD / R.b30.movD)}) |`);
say(`| **구성**(문턱8 고정 · 30일 → 90일) | ${f1(R.s30.gapPcD)}% → ${f1(R.s90.gapPcD)}% (${pp(dGapWinS)}) | ${f2(R.s30.movD)} → ${f2(R.s90.movD)} (×${f2(R.s90.movD / R.s30.movD)}) |`);
say(`| **문턱**(30일 고정 · 9 → 8) | ${f1(R.b30.gapPcD)}% → ${f1(R.s30.gapPcD)}% (${pp(dGap30)}) | ${f2(R.b30.movD)} → ${f2(R.s30.movD)} (×${f2(rMov30)}) |`);
say(`| **문턱**(90일 고정 · 9 → 8) | ${f1(R.b90.gapPcD)}% → ${f1(R.s90.gapPcD)}% (**${pp(dGap90)}**) | ${f2(R.b90.movD)} → ${f2(R.s90.movD)} (**×${f2(rMov90)}**) |`);
say('');
ck('[C1] ⚑⚑ ① 손실은 **구성이 만든 착시가 아니다** — 같은 90일 창에서도 문턱을 앞당기면 목표 대비가 내려간다',
   dGap90 < -1.0, `90일 창 ${f1(R.b90.gapPcD)}% → ${f1(R.s90.gapPcD)}% (${pp(dGap90)})`);
ck('[C2] ⚑ 오히려 **같은 창에서 더 크다** — 38-5 의 30일 표는 문턱의 대가를 **작게** 보여 주고 있었다',
   Math.abs(dGap90) > Math.abs(dGap30) + 1.0,
   `30일 ${pp(dGap30)} ↔ 90일 ${pp(dGap90)}`);
ck('[C3] ⚑⚑ ③ 손실은 **창과 무관한 배수**다 — 30일 ×' + f2(rMov30) + ' · 90일 ×' + f2(rMov90) + ' (둘 다 0.5~0.7)',
   rMov30 > 0.5 && rMov30 < 0.7 && rMov90 > 0.5 && rMov90 < 0.7 && Math.abs(rMov90 - rMov30) < 0.12,
   `차 ${f2(Math.abs(rMov90 - rMov30))}`);
ck('[C4] ⚠ 창을 늘리면 ③ 은 **두 설정 다** 준다 — 그 하락은 문턱이 아니라 희석(구성)이다',
   R.b90.movD < R.b30.movD && R.s90.movD < R.s30.movD,
   `설치값 ${f2(R.b30.movD)}→${f2(R.b90.movD)} · 문턱8 ${f2(R.s30.movD)}→${f2(R.s90.movD)}`);
ck('[C5] §0 «없어야 할 벽» 은 90일에서도 늘어난다 (2 → 3) — 문턱 효과이지 창 효과가 아니다',
   R.b90.outD === R.b30.outD && R.s90.outD === R.s30.outD && R.s90.outD > R.b90.outD,
   `90일 ${R.b90.outD} → ${R.s90.outD} (30일도 ${R.b30.outD} → ${R.s30.outD})`);
ck('[C6] 대충 유저에서도 ① 의 부호가 같다 — 정책 하나의 사고가 아니다',
   Number.isFinite(R.b90.gapPcC) && Number.isFinite(R.s90.gapPcC) && R.s90.gapPcC < R.b90.gapPcC - 1.0,
   `90일 대충 ${f1(R.b90.gapPcC)}% → ${f1(R.s90.gapPcC)}%`);
say('');

/* ═══ [D] 이득 ════════════════════════════════════════════════════════ */
say('## [D] 이득도 같은 표에 적는다 — «말미 축 판정 가능» 은 **창을 늘려서는 못 산다**');
say('');
const cap = v => /판정 불가/.test(v || '') ? '⚠ 판정 불가' : '판정 가능';
say('| 실행 | 창 역량 — 말미 축(부지런) | (대충) |');
say('|---|---|---|');
for (const k of ['b30', 's30', 'b90', 's90'])
  say(`| ${RUNS[k].tag} | ${cap(R[k].capD)} | ${cap(R[k].capC)} |`);
say('');
ck('[D1] ⚑ 설치값은 **90일로 늘려도** 말미 축이 판정 불가다 — 창을 사는 것으로는 이 이득을 못 얻는다',
   /판정 불가/.test(R.b90.capD), `90일 설치값 «${String(R.b90.capD).replace(/\s+/g, ' ').slice(0, 60)}…»`);
ck('[D2] 문턱을 앞당기면 90일 창에서 **두 정책 다** 판정 가능이 된다',
   !/판정 불가/.test(R.s90.capD) && !/판정 불가/.test(R.s90.capC),
   `부지런 «${String(R.s90.capD).slice(0, 40)}» · 대충 «${String(R.s90.capC).slice(0, 40)}»`);
say('');

/* ═══ [E] 표본 흔들기 ═════════════════════════════════════════════════ */
say('## [E] 표본을 흔든다 — 시드 12 → 24 (LESSONS A3-ⓑ: 자를 흔들어도 부호가 안 바뀌어야 참이다)');
say('');
say('| 축(부지런 · 90일) | 설치값 12시드 | 설치값 24시드 | 문턱8 12시드 | 문턱8 24시드 |');
say('|---|---|---|---|---|');
say(`| ① 목표 대비 | ${f1(R.b90.gapPcD)}% | ${f1(R.b90b.gapPcD)}% | ${f1(R.s90.gapPcD)}% | ${f1(R.s90b.gapPcD)}% |`);
say(`| ③ 순 이동 비중 | ${f2(R.b90.movD)} | ${f2(R.b90b.movD)} | ${f2(R.s90.movD)} | ${f2(R.s90b.movD)} |`);
say('');
ck('[E1] 시드를 두 배로 늘려도 ① 이 0.5%p 안에서 같다',
   Math.abs(R.b90b.gapPcD - R.b90.gapPcD) <= 0.5 && Math.abs(R.s90b.gapPcD - R.s90.gapPcD) <= 0.5,
   `설치값 Δ${f1(R.b90b.gapPcD - R.b90.gapPcD)}%p · 문턱8 Δ${f1(R.s90b.gapPcD - R.s90.gapPcD)}%p`);
ck('[E2] ③ 도 0.1%p 안에서 같고, 두 표본 다 **문턱8 이 낮다**(부호 불변)',
   Math.abs(R.b90b.movD - R.b90.movD) <= 0.1 && Math.abs(R.s90b.movD - R.s90.movD) <= 0.1
   && R.s90b.movD < R.b90b.movD,
   `24시드 ${f2(R.b90b.movD)} → ${f2(R.s90b.movD)} (×${f2(R.s90b.movD / R.b90b.movD)})`);
say('');

/* ═══ [F] 판정 ════════════════════════════════════════════════════════ */
say('## [F] 판정');
say('');
say('1. 38-7 1번의 물음에 답이 났다 — **문턱 탓이다.** 같은 90일 창에서 두 설정을 견주면');
say(`   ① 은 ${f1(R.b90.gapPcD)}% → ${f1(R.s90.gapPcD)}% (${pp(dGap90)}) 로 30일에서 본 ${pp(dGap30)} 보다 **더 벌어지고**,`);
say(`   ③ 은 창이 30일이든 90일이든 **같은 배수**(×${f2(rMov30)} · ×${f2(rMov90)})로 준다.`);
say('2. 그래서 «문턱을 앞당기면 ③ 이 나빠진다» 를 이제 결론으로 적을 수 있다(38-5 의 유보 해제).');
say('3. ⚠ 다만 ③ 의 **절대값 하락**(3.78 → 1.41)은 문턱이 아니라 **창 희석**이다([C4]) — 두 표를 섞어 읽지 마라.');
say('4. **채택하지 않는다**(제품 0줄) — 이득([D])은 «말미 축을 판정할 수 있게 된다» 와 «문턱 관문의 목표 대비 ×3.04 → ×1.13» 이고,');
say('   대가는 §0 이 직접 채점하는 축 셋(① 간격 · ③ 진폭 · 창 밖 벽)이다. 값을 사는 쪽이 비싸다.');
say('5. 남은 길은 «문턱을 옮기는 것» 이 아니라 **문턱 관문의 장벽 자체를 낮추는 것**이다 — 40회차 몫(39-6).');
say('');

/* ═══ [R] 되돌림 시험 ═════════════════════════════════════════════════ */
say('## [R] 되돌림 시험 — 자가 값을 손으로 안 적었다는 증거');
say('');
{
  /* R1 — 파일에서 읽는다: 없는 파일 이름으로 물으면 못 읽는다(위 [A0] 이 그 자리를 지킨다). */
  const ghost = rowOf('| 아무것도 아닌 표 |', K_GAP);
  ck('[R1] 표가 없으면 축을 못 읽는다 (값이 자 안에 박혀 있지 않다)', ghost === null, '없는 표 → null');
  /* R2 — 짝을 바꿔 읽으면(설치값 ↔ 문턱8) 판정이 뒤집힌다. */
  ck('[R2] 두 실행을 바꿔 읽으면 [C1] 이 빨개진다 — 방향이 데이터에서 온다',
     (R.b90.gapPcD - R.s90.gapPcD) > 1.0, `뒤집으면 ${pp(R.b90.gapPcD - R.s90.gapPcD)}`);
  /* R3 — 같은 설정끼리(창만 다름) 견주면 «문턱 효과» 가 안 나온다 = 축이 섞여 있지 않다. */
  ck('[R3] 같은 설정끼리 창만 바꾼 짝에서는 ① 이 **오히려 좋아진다** — 두 효과가 서로 다른 것이다',
     dGapWin > 1.0, `설치값 30일 → 90일 ${pp(dGapWin)}`);
  /* R4 — κ 표가 같은 자인가(정정9 규약). */
  const sha = k => (fs.readFileSync(path.join(RV, RUNS[k].file), 'utf8').match(/calib sha ([0-9a-f]{12})/) || [])[1];
  const shas = Object.keys(RUNS).map(sha);
  ck('[R4] 여섯 실행이 **같은 κ 표**로 돌았다 (정정9 — 해시가 같아야 견줄 수 있다)',
     shas.every(s => s && s === shas[0]), shas.join(' · '));
}
say('');
say(`RESULT — ${OK} PASS / ${NG} FAIL`);
process.exit(NG ? 1 : 0);
