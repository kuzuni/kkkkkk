#!/usr/bin/env node
/* 199 43회차 — **말미 축을 «벽 4개» 창에서 읽는다, 그리고 잔차의 부호가 뒤집힌다** (42-6 3번)
 * ─────────────────────────────────────────────────────────────────────────────
 * 42-6 **3번**이 1순위였다:
 *   «120일 창에서 말미 벽 4개로 읽는 길이 아직 남아 있다(33-3 의 120일 줄) — 24시드가 열어 준
 *    것은 표본이지 창이 아니다. 배정 벽이 넷이면 ① 간격이 **세 구간**의 기하평균이 되어
 *    지금(두 구간)보다 튼튼하다.»
 *
 * 그 창을 구웠다(120일 · 24시드 · 같은 κ · 같은 제품). 배정 벽은 넷이 됐고,
 * **그 자리에서 ① 말미 잔차의 부호가 바뀐다** — 90일 **−5.2%** → 120일 **+1.5%**.
 *
 * ⚑⚑ 이것이 이 회차의 본체인 이유: 41-8 1번·42-6 1번이 그 −5.2% **위에** 처방을 세워 뒀다
 * («전이 폭 24 를 좁히면 말미 간격이 **더 음수**가 되니 그 수를 같이 들고 가라»).
 * 잔차가 +1.5% 면 그 문장의 부호가 반대다 — 좁히는 쪽이 0 을 향한다.
 * 32-4·33-3 이 겪은 것과 같은 모양이다: **창이 겨우 담는 축의 수는 판정이 아니라 그림자다.**
 *
 * 이 자가 하는 일:
 *   [A] 재현 — 42회차의 90일 세 수가 커밋된 표에서 그대로 나온다 (338 규칙)
 *   [B] ⚑⚑ 본체 — 배정 3 → 4(구간 2 → 3) 에서 ① 잔차가 부호를 바꾼다 + 그 분해
 *   [C] 창 전체 ① 은 33-4 의 단조 추세를 두 단 사다리에서도 잇는다
 *   [D] ③ — 문턱 **아래**는 창이 늘어도 비트 동일, 늘어난 것은 **위**뿐이다
 *   [E] ② — 창 이름(W)이 다르면 그 수는 «제품» 이 아니라 «창» 을 잰다
 *   [F] 대충 — 배정 2 는 «정의됨» 이지 «튼튼함» 이 아니다(구간이 **하나**다)
 *   [R] 되돌림 시험 — 제품 0줄 · 처방의 근거가 바뀐 자리를 못박는다
 *
 * ⚠ 두 실행 다 **md 만** 커밋한다(39·40·42회차와 같은 규율 — json 은 6MB 급이다).
 *   그래서 이 자는 그 표의 **문장**을 읽는다. 다시 구우려면 [A0] 이 명령을 찍는다.
 *
 * 종료 코드: 0 통과 · 1 FAIL.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const RV = path.join(ROOT, 'docs', 'review');
const WIN = require('./win199');

const say = m => console.log(m);
const f1 = v => Number.isFinite(v) ? v.toFixed(1) : '—';
const f2 = v => Number.isFinite(v) ? v.toFixed(2) : '—';
const f3 = v => Number.isFinite(v) ? v.toFixed(3) : '—';

let OK = 0, NG = 0;
const ck = (name, cond, got) => { if (cond) { OK++; say(`  ✔ ${name}` + (got != null ? ` — ${got}` : '')); }
                                  else { NG++; say(`  ✗ ${name}` + (got != null ? ` — ${got}` : '')); } };

const FILES = {
  d90:  '199-bot-2026-09-06-r42-d90-two24-s24.md',    /* 두 단 · 90일  · 24시드 (42회차가 구웠다) */
  d120: '199-bot-2026-09-06-r43-d120-two24-s24.md',   /* 두 단 · 120일 · 24시드 (이 회차가 구웠다) */
};
const TXT = {};
for (const [k, f] of Object.entries(FILES)) {
  const p = path.join(RV, f);
  TXT[k] = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

const sect = (txt, pol) => {
  if (!txt) return '';
  const head = `## [C] 날짜별 — ${pol} 유저`;
  const i = txt.indexOf(head);
  if (i < 0) return '';
  const j = txt.indexOf('## [C] 날짜별 —', i + head.length);
  return txt.slice(i, j < 0 ? txt.length : j);
};
const lineOf = (txt, key) => (txt || '').split('\n').find(l => l.includes(key)) || '';
const num = (s, re) => { const m = String(s || '').match(re); return m ? parseFloat(m[1]) : NaN; };

const readOf = (txt, pol) => {
  const s = sect(txt, pol);
  const L = lineOf(s, '말미 몫'), C = lineOf(s, '대조 — **문턱 아래**'), H = lineOf(s, '① 축 — 목표 칸 적중');
  return {
    can:      /창 역량 —[^\n]*\*\*판정 가능\*\*/.test(lineOf(s, '창 역량 — 말미 축')),
    lateP50:  num(lineOf(s, '창 역량 — 말미 축'), /배정 벽 p50 = (\d+)개/),
    walls:    num(L, /문턱 위 벽 p50 = (\d+)개/),
    seated:   num(L, /그중 배정 (\d+)개/),
    gapUndef: /문턱 위 간격 기하평균 p50 = — \(미정의/.test(L),
    gap:      num(L, /문턱 위 간격 기하평균 p50 = ([\d.]+)/),
    gapT:     num(L, /배정 칸의 목표 ×([\d.]+)/),
    gapPc:    num(L, /배정 칸의 목표 ×[\d.]+ · ([+-]?[\d.]+)%/),
    upSum:    num(L, /③ 문턱 위 실오르막 합 p50 = (\d+)분/),
    upSeg:    num(L, /구간 (\d+)개 · 벽당/),
    perWall:  num(L, /벽당 ([\d.]+)분\)/),
    lowSum:   num(C, /실오르막 합 p50 = (\d+)분/),
    lowSeg:   num(C, /\(구간 (\d+)개/),
    lowPer:   num(C, /벽당 ([\d.]+)분\)/),
    ratio:    num(C, /벽당 비 = \*\*×([\d.]+)\*\*/),
    ident:    num(C, /검산 (\d+)\/\d+/), identN: num(C, /검산 \d+\/(\d+)/),
    hitN:     num(H, /목표 칸 적중 p50 = (\d+)\//), hitD: num(H, /목표 칸 적중 p50 = \d+\/(\d+)/),
    nullB:    num(H, /널 기준선 ([\d.]+) 대비/), overNull: num(H, /대비 ([+-][\d.]+)칸/),
    outWall:  num(H, /창 밖 벽 p50 = (\d+)\*\*/),
    inLad:    num(H, /사다리 안 (\d+) · 사다리 밖/), outLad: num(H, /사다리 안 \d+ · 사다리 밖 (\d+)/),
    /* 창 전체 ① — 요약 대조표의 한 줄(정책 열은 부지런이 먼저다) */
    allGapPc: num(lineOf(txt, '① 벽 간격 기하평균 p50 — 목표'), /×[\d.]+ \/ 목표 ×[\d.]+ = (-?[\d.]+)%/),
    tailW:    num(lineOf(s, '② 말미 한계 수급/일 〔소환 예산 장부'), /창 W(\d+)/),
    tail:     num(lineOf(s, '② 말미 한계 수급/일 〔소환 예산 장부'), /목표 270,000의 ([\d.]+)%/),
    days:     num(lineOf(txt, '> `node tools/bot199.js'), /--days=(\d+)/),
    seedN:    num(lineOf(txt, '> `node tools/bot199.js'), /--seeds=(\d+)/),
    kappa:    (lineOf(txt, 'calib sha').match(/calib sha ([0-9a-f]+)/) || [])[1],
  };
};

say('# probe199r43 — 말미 축을 «벽 4개» 창에서 읽는다 · ① 잔차의 부호 반전 (42-6 3번)');
say('');
ck('[A0] 표 둘이 전부 있다 (90일 24시드 · 120일 24시드)', !!TXT.d90 && !!TXT.d120,
   Object.entries(FILES).map(([k, f]) => `${k}:${TXT[k] ? '✔' : '없다 ' + f}`).join(' · '));
if (!TXT.d90 || !TXT.d120) {
  say('');
  say('_없는 표는 이렇게 만든다(md 만 커밋한다 — json 은 6MB 급):_');
  say('```');
  say('node tools/bot199.js --days=120 --seeds=24 --policy=both --calib=docs/review/199-calib-r25.json \\');
  say('  --out=docs/review/199-bot-2026-09-06-r43-d120-two24-s24.md');
  say('```');
  say('');
  say(`RESULT — ${OK} PASS / ${NG} FAIL`);
  process.exit(1);
}

const A = readOf(TXT.d90, '부지런한'), B = readOf(TXT.d120, '부지런한'),
      AC = readOf(TXT.d90, '대충'),    BC = readOf(TXT.d120, '대충');

/* ═══ [A] 재현 ═════════════════════════════════════════════════════════ */
say('');
say('## [A] 재현 — 42회차 90일 세 수가 커밋된 표에서 그대로다 (338 규칙)');
say('');
ck('[A1] ① 문턱 위 간격 −5.2% (90일 · 24시드)', Math.abs(A.gapPc + 5.2) <= 0.15, `${f1(A.gapPc)}%`);
ck('[A2] ③ 문턱 위 벽당 24.0분 ↔ 아래 40.3분 · 비 ×0.60 (90일)',
   Math.abs(A.perWall - 24.0) <= 0.1 && Math.abs(A.lowPer - 40.3) <= 0.1 && Math.abs(A.ratio - 0.60) <= 0.01,
   `${f1(A.perWall)} ↔ ${f1(A.lowPer)} (×${f2(A.ratio)})`);
ck('[A3] ② 7.8% (90일 · 창 W22)', Math.abs(A.tail - 7.8) <= 0.05 && A.tailW === 22, `${f1(A.tail)}% · W${A.tailW}`);
ck('[A4] ⚑ 두 표가 같은 κ 표로 구워졌다 — 다르면 «같은 자로 잰 비교» 가 아니다 (정정9)',
   !!A.kappa && A.kappa === B.kappa, `${A.kappa} ↔ ${B.kappa}`);
ck('[A5] 시드 수가 둘 다 24 다 — 이 회차가 바꾼 것은 **창 하나**다',
   A.seedN === 24 && B.seedN === 24, `${A.seedN} ↔ ${B.seedN}`);
ck('[A6] 창이 90 ↔ 120 일이다', A.days === 90 && B.days === 120, `${A.days}일 ↔ ${B.days}일`);

/* ═══ [B] 본체 ═════════════════════════════════════════════════════════ */
say('');
say('## [B] ⚑⚑ 본체 — 배정 3 → 4(구간 2 → 3)에서 ① 잔차가 **부호를 바꾼다** (부지런)');
say('');
say('| 축 | 90일 | 120일 | Δ |');
say('|---|---|---|---|');
say(`| 문턱 위 벽 p50 (배정) | ${A.walls} (${A.seated}) | ${B.walls} (${B.seated}) | +${B.walls - A.walls} (+${B.seated - A.seated}) |`);
say(`| ① 간격 구간 수 (= 배정 − 1) | ${A.seated - 1} | ${B.seated - 1} | +${B.seated - A.seated} |`);
say(`| ① 관측 기하평균 | ×${f2(A.gap)} | ×${f2(B.gap)} | ×${f3(B.gap / A.gap)} |`);
say(`| ① 배정 칸의 목표 | ×${f3(A.gapT)} | ×${f3(B.gapT)} | ×${f3(B.gapT / A.gapT)} |`);
say(`| **① 잔차** | **${f1(A.gapPc)}%** | **+${f1(B.gapPc)}%** | ${f1(B.gapPc - A.gapPc)}%p |`);
say('');
ck('[B1] ⚑ 42-6 3번이 요구한 자리에 왔다 — 배정 벽 4개 = 간격 **세 구간**',
   B.seated === 4 && B.seated - 1 === 3, `배정 ${B.seated}개 · 구간 ${B.seated - 1}개`);
ck('[B2] ⚑⚑ 잔차의 부호가 바뀐다 — 90일 음수 · 120일 양수',
   A.gapPc < 0 && B.gapPc > 0, `${f1(A.gapPc)}% → +${f1(B.gapPc)}%`);
ck('[B3] 그리고 목표에 **더 가까워졌다** (|잔차| 가 준다)',
   Math.abs(B.gapPc) < Math.abs(A.gapPc), `|${f1(A.gapPc)}| → |${f1(B.gapPc)}|`);
ck('[B4] 두 창 다 §0 ① 통과 폭(±15%) 안이다 — 이 반전은 «통과/미달» 이 아니라 **방향**의 문제다',
   Math.abs(A.gapPc) <= 15 && Math.abs(B.gapPc) <= 15, `${f1(A.gapPc)}% · +${f1(B.gapPc)}%`);
/* 분해 — 분자와 분모가 각각 얼마나 내렸나 */
const rNum = B.gap / A.gap, rDen = B.gapT / A.gapT;
ck('[B5] ⚑ 분해 — 창을 늘리면 **분모(목표)가 분자(관측)보다 더 내려간다**',
   rDen < rNum && rNum < 1, `분자 ×${f3(rNum)} · 분모 ×${f3(rDen)}`);
ck('[B6] 그 분해가 잔차 반전과 산술로 맞는다 (±0.6%p)',
   Math.abs((rNum / rDen) - ((1 + B.gapPc / 100) / (1 + A.gapPc / 100))) <= 0.006,
   `분자/분모 ×${f3(rNum / rDen)} ↔ 잔차비 ×${f3((1 + B.gapPc / 100) / (1 + A.gapPc / 100))}`);
ck('[B7] 뿌리는 목표 칸 사다리다 — 말미 칸의 비가 초기보다 작다(달력 1440…144000분)',
   /1440 · 3600 · 7200 · 12960 · 21600 · 36000 · 57600 · 93600 · 144000분/.test(TXT.d120),
   '120일 창이 마지막 칸(144000분 = 100일 · 비 1.538)을 새로 문다');

/* ═══ [C] 창 전체 ① ═══════════════════════════════════════════════════ */
say('');
say('## [C] 창 전체 ① — 33-4 의 «창이 역량을 얻을수록 오차가 준다» 를 두 단 사다리에서도 잇는다');
say('');
say('| 창 | 창 전체 ① 잔차 | 적중 (널 대비) | 창 밖 벽 |');
say('|---|---|---|---|');
say(`| 90일 | ${f1(A.allGapPc)}% | ${A.hitN}/${A.hitD} (+${f2(A.overNull)}칸) | ${A.outWall} (안 ${A.inLad} · 밖 ${A.outLad}) |`);
say(`| 120일 | ${f1(B.allGapPc)}% | ${B.hitN}/${B.hitD} (+${f2(B.overNull)}칸) | ${B.outWall} (안 ${B.inLad} · 밖 ${B.outLad}) |`);
say('');
ck('[C1] ⚑ 창 전체 ① 잔차의 절대값이 준다 (33-4 의 추세 — 한 단 −9.4 → −3.2 → −0.1)',
   Math.abs(B.allGapPc) < Math.abs(A.allGapPc), `${f1(A.allGapPc)}% → ${f1(B.allGapPc)}%`);
ck('[C2] 적중은 두 창 다 널 기준선 위다 — 창을 늘려도 «난수 이하» 로 안 떨어진다',
   A.overNull > 0 && B.overNull > 0 && B.hitN > A.hitN,
   `${A.hitN}/${A.hitD} (+${f2(A.overNull)}) → ${B.hitN}/${B.hitD} (+${f2(B.overNull)})`);
ck('[C3] §0 의 «없어야 할 벽» 은 2 그대로다 — 창을 늘려도 안 는다 (전부 사다리 안)',
   B.outWall === A.outWall && B.outWall === 2 && B.outLad === 0, `${A.outWall} → ${B.outWall} (밖 ${B.outLad})`);
ck('[C4] ⚠ 말미 잔차와 창 전체 잔차는 **부호가 다르다** — 둘을 한 수로 인용하지 마라',
   B.gapPc > 0 && B.allGapPc < 0, `말미 +${f1(B.gapPc)}% · 창 전체 ${f1(B.allGapPc)}%`);

/* ═══ [D] ③ ═══════════════════════════════════════════════════════════ */
say('');
say('## [D] ③ — 문턱 **아래**는 창이 늘어도 비트 동일하고, 늘어난 것은 **위**뿐이다');
say('');
say('| 구역 | 90일 | 120일 |');
say('|---|---|---|');
say(`| 문턱 위 (합 · 구간 · 벽당) | ${A.upSum}분 · ${A.upSeg}개 · ${f1(A.perWall)}분 | ${B.upSum}분 · ${B.upSeg}개 · ${f1(B.perWall)}분 |`);
say(`| 문턱 아래 (합 · 구간 · 벽당) | ${A.lowSum}분 · ${A.lowSeg}개 · ${f1(A.lowPer)}분 | ${B.lowSum}분 · ${B.lowSeg}개 · ${f1(B.lowPer)}분 |`);
say(`| 벽당 비(위÷아래) | ×${f2(A.ratio)} | ×${f2(B.ratio)} |`);
say('');
ck('[D1] ⚑ 문턱 아래가 두 창에서 **한 자리도 안 다르다** — 창은 말미만 보탠다(내부 정합)',
   A.lowSum === B.lowSum && A.lowSeg === B.lowSeg && Math.abs(A.lowPer - B.lowPer) <= 0.05,
   `${A.lowSum}분 · ${A.lowSeg}개 · ${f1(A.lowPer)}분 (두 창 동일)`);
ck('[D2] 문턱 위 구간이 2 → 5 로 는다', B.upSeg > A.upSeg && B.upSeg === 5, `${A.upSeg} → ${B.upSeg}개`);
ck('[D3] ⚑ «말미가 ③ 을 진다» 가 더 긴 창에서도 참이고 조금 더 깊다',
   B.ratio < 1 && B.ratio < A.ratio, `×${f2(A.ratio)} → ×${f2(B.ratio)}`);
ck('[D4] 두 구역 다 여전히 «벽당 ≥60분» 미달이다 — 되돌린다고 60분이 되지 않는다 (41-4)',
   B.perWall < 60 && B.lowPer < 60, `위 ${f1(B.perWall)}분 · 아래 ${f1(B.lowPer)}분`);
ck('[D5] 시드별 항등 «위+아래=전체» 가 두 창에서 전 시드 참이다 (18회차 정정C 규약)',
   A.ident === A.identN && B.ident === B.identN && A.identN === 24 && B.identN === 24,
   `${A.ident}/${A.identN} · ${B.ident}/${B.identN}`);

/* ═══ [E] ② ═══════════════════════════════════════════════════════════ */
say('');
say('## [E] ② — 창 이름(W)이 다르면 그 수는 «제품» 이 아니라 «창» 을 잰다');
say('');
ck('[E1] 두 표의 말미 창 W 가 다르다 (W22 ↔ W30) — 같은 이름의 수가 아니다',
   A.tailW === 22 && B.tailW === 30, `W${A.tailW} ↔ W${B.tailW}`);
ck('[E2] ② 말미 수급이 7.8% → 11.4% 로 **오른다**',
   Math.abs(B.tail - 11.4) <= 0.05 && B.tail > A.tail, `${f1(A.tail)}% → ${f1(B.tail)}%`);
ck('[E3] ⚠ 그래도 §0 과녁(목표의 100%)에서는 한참 아래다 — 758·801 이후의 상태다',
   B.tail < 20, `${f1(B.tail)}%`);

/* ═══ [F] 대충 ════════════════════════════════════════════════════════ */
say('');
say('## [F] 대충 — 배정 2 는 «정의됨» 이지 «튼튼함» 이 아니다 (구간이 **하나**다)');
say('');
ck('[F1] 90일 대충은 배정 1 이라 간격이 «미정의» 였다 (42-2 의 수리)',
   AC.seated === 1 && AC.gapUndef === true, `배정 ${AC.seated}개 · 미정의`);
ck('[F2] 120일 대충은 배정 2 라 수가 찍힌다 — 그러나 구간은 **하나**다',
   BC.seated === 2 && !BC.gapUndef && Number.isFinite(BC.gap),
   `배정 ${BC.seated}개 · 구간 ${BC.seated - 1}개 · ×${f2(BC.gap)} (+${f1(BC.gapPc)}%)`);
ck('[F3] ⚠ 그 한 구간의 잔차는 부지런의 세 구간보다 **한 자릿수 크다** — 구간 수를 같이 적어라',
   Math.abs(BC.gapPc) > 5 * Math.abs(B.gapPc), `대충 +${f1(BC.gapPc)}% (구간 1) ↔ 부지런 +${f1(B.gapPc)}% (구간 3)`);
ck('[F4] 두 정책 다 창 역량은 «판정 가능» 이다 — 역량(벽)과 간격(배정)은 다른 것을 센다 (42-2 [C2])',
   B.can === true && BC.can === true, `부지런 벽 ${B.lateP50} · 대충 벽 ${BC.lateP50}`);

/* ═══ [R] 되돌림 ══════════════════════════════════════════════════════ */
say('');
say('## [R] 되돌림 시험 — 제품 0줄, 바뀐 것은 «처방의 근거» 다');
say('');
const REV = fs.readFileSync(path.join(RV, '199-최종밸런스.md'), 'utf8');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'latin1');
ck('[R1] 41-8 1번·42-6 1번이 그 −5.2%(−5.6%) 위에 처방을 세워 뒀다 — 그 문장이 문서에 있다',
   /폭을 좁히면 이 수가 더 음수가 된다/.test(REV), '42-6 1번 «폭을 좁히면 이 수가 더 음수가 된다»');
ck('[R2] ⚑ 이 창의 수로 다시 쓰면 그 문장의 부호가 반대다 — 좁히는 쪽이 0 을 향한다',
   B.gapPc > 0, `말미 잔차 +${f1(B.gapPc)}% ⇒ 좁히면 0 쪽으로 (90일 수로는 반대였다)`);
ck('[R3] 제품은 한 글자도 안 건드렸다 — 두 단 사다리 상수 그대로',
   /const ES_BAND3 = 24;/.test(IDX) && /const ES_BAND2 = 16;/.test(IDX) && /const ES_BAND  = 40;/.test(IDX),
   'ES_BAND 40 · ES_BAND3 24 · ES_BAND2 16');
ck('[R4] 판정식 문턱은 2 그대로다 (42회차 수리를 안 흔들었다)', WIN.MIN_LATE === 2, `MIN_LATE=${WIN.MIN_LATE}`);
ck('[R5] 두 표의 문턱이 같은 s344 다 — 격자를 안 바꿨으니 «같은 구역» 을 견준 것이다',
   /문턱 s344 위/.test(TXT.d90) && /문턱 s344 위/.test(TXT.d120), 's344 ↔ s344');

say('');
say(`RESULT — ${OK} PASS / ${NG} FAIL`);
process.exit(NG ? 1 : 0);
