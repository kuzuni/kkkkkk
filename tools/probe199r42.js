#!/usr/bin/env node
/* 199 42회차 — **말미 축의 표본 흔들기, 그리고 41회차 자의 수리** (41-8 3번)
 * ─────────────────────────────────────────────────────────────────────────────
 * 41회차는 말미 축을 90일·**12시드** 한 표에서 읽었다. 그 표의 세 수(① −5.6% · ③ ×0.59 ·
 * ② 7.8%)가 시드 표본의 것인지 축의 것인지는 아직 안 갈렸고, 41-8 3번이 그것을 1순위로 적었다:
 *   «말미 축의 표본 흔들기가 아직 없다 — 40회차의 시드 24 실행은 md 만 커밋돼 있어 리플레이가
 *    안 된다. `--days=90 --seeds=24` 로 한 번 더 굽거나 120일에서 말미 벽 4개로 읽어라.»
 *
 * 24시드를 구웠고, **그 실행이 41회차 자의 결함 하나를 잡았다**(아래 [C]) — «배정 p50 이
 * 1개인 정책에도 간격이 찍힌다». 12시드 부지런에서는 배정이 3개라 안 보이던 자리다.
 *
 * 이 자가 하는 일:
 *   [A] 재현 — 41회차의 12시드 세 수가 커밋된 표에서 그대로 나온다 (338 규칙)
 *   [B] ⚑ 표본 흔들기 — 12 → 24 시드에서 부호도 자릿수도 안 바뀐다
 *   [C] ⚑⚑ 자 수리 — 배정 벽 p50 < 2 면 간격은 **미정의**다(13회차 JJ 를 말미 축에 건다)
 *   [D] ⚑ 두 정책이 같은 모양을 낸다 — ③ 의 «말미가 진다» 는 부지런만의 것이 아니다
 *   [E] 창 역량은 시드 수에 걸린다 — 대충이 12시드 «불가» → 24시드 «가능» 으로 열렸다
 *   [R] 되돌림 시험
 *
 * ⚠ 24시드 실행은 **md 만** 커밋한다(39·40회차와 같은 규율 — json 은 6MB 급이다).
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

let OK = 0, NG = 0;
const ck = (name, cond, got) => { if (cond) { OK++; say(`  ✔ ${name}` + (got != null ? ` — ${got}` : '')); }
                                  else { NG++; say(`  ✗ ${name}` + (got != null ? ` — ${got}` : '')); } };

const FILES = {
  s12: '199-bot-2026-09-06-r41-d90-two24-late.md',    /* 두 단 · 90일 · 12시드 (r40 JSON 리플레이) */
  s24: '199-bot-2026-09-06-r42-d90-two24-s24.md',     /* 두 단 · 90일 · 24시드 (이 회차가 구웠다) */
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
  const L = lineOf(s, '말미 몫'), C = lineOf(s, '대조 — **문턱 아래**');
  return {
    printed: /⚑ 말미 몫/.test(L), muted: /말미 몫 — 안 찍는다/.test(L),
    can:     /창 역량 —[^\n]*\*\*판정 가능\*\*/.test(lineOf(s, '창 역량 — 말미 축')),
    lateP50: num(lineOf(s, '창 역량 — 말미 축'), /배정 벽 p50 = (\d+)개/),
    walls:   num(L, /문턱 위 벽 p50 = (\d+)개/),
    seated:  num(L, /그중 배정 (\d+)개/),
    gapUndef:/문턱 위 간격 기하평균 p50 = — \(미정의/.test(L),
    gap:     num(L, /문턱 위 간격 기하평균 p50 = ([\d.]+)/),
    gapPc:   num(L, /배정 칸의 목표 ×[\d.]+ · (-?[\d.]+)%/),
    perWall: num(L, /벽당 ([\d.]+)분\)/),
    lowPer:  num(C, /벽당 ([\d.]+)분\)/),
    ratio:   num(C, /벽당 비 = \*\*×([\d.]+)\*\*/),
    ident:   num(C, /검산 (\d+)\/\d+/), identN: num(C, /검산 \d+\/(\d+)/),
    tail:    num(lineOf(s, '② 말미 한계 수급/일 〔소환 예산 장부'), /목표 270,000의 ([\d.]+)%/),
    seedN:   num(lineOf(txt, '> `node tools/bot199.js'), /--seeds=(\d+)/),
    kappa:   (lineOf(txt, 'calib sha').match(/calib sha ([0-9a-f]+)/) || [])[1],
  };
};

say('# probe199r42 — 말미 축의 표본 흔들기 · 41회차 자의 수리 (41-8 3번)');
say('');
ck('[A0] 표 둘이 전부 있다 (12시드 리플레이 · 24시드 실행)', !!TXT.s12 && !!TXT.s24,
   Object.entries(FILES).map(([k, f]) => `${k}:${TXT[k] ? '✔' : '없다 ' + f}`).join(' · '));
if (!TXT.s12 || !TXT.s24) {
  say('');
  say('_없는 표는 이렇게 만든다(24시드는 md 만 커밋한다 — json 은 6MB 급):_');
  say('```');
  say('node tools/bot199.js --days=90 --seeds=24 --policy=both --calib=docs/review/199-calib-r25.json \\');
  say('  --out=docs/review/199-bot-2026-09-06-r42-d90-two24-s24.md');
  say('```');
  say('');
  say(`RESULT — ${OK} PASS / ${NG} FAIL`);
  process.exit(1);
}

const A = readOf(TXT.s12, '부지런한'), B = readOf(TXT.s24, '부지런한'),
      AC = readOf(TXT.s12, '대충'),    BC = readOf(TXT.s24, '대충');

/* ═══ [A] 재현 ═════════════════════════════════════════════════════════ */
say('');
say('## [A] 재현 — 41회차 12시드 세 수가 그대로다 (338 규칙)');
say('');
ck('[A1] ① 문턱 위 간격 −5.6% (12시드)', Math.abs(A.gapPc + 5.6) <= 0.15, `${f1(A.gapPc)}%`);
ck('[A2] ③ 문턱 위 벽당 24.0분 ↔ 아래 40.7분 · 비 ×0.59 (12시드)',
   Math.abs(A.perWall - 24.0) <= 0.1 && Math.abs(A.ratio - 0.59) <= 0.01,
   `${f1(A.perWall)} ↔ ${f1(A.lowPer)} (×${f2(A.ratio)})`);
ck('[A3] ② 7.8% (12시드)', Math.abs(A.tail - 7.8) <= 0.05, `${f1(A.tail)}%`);
ck('[A4] 두 표가 같은 κ 표로 구워졌다 — 다르면 «같은 자로 잰 비교» 가 아니다',
   !!A.kappa && A.kappa === B.kappa, `${A.kappa} ↔ ${B.kappa}`);
ck('[A5] 시드 수가 12 ↔ 24 다', A.seedN === 12 && B.seedN === 24, `${A.seedN} ↔ ${B.seedN}`);

/* ═══ [B] 표본 흔들기 ═════════════════════════════════════════════════ */
say('');
say('## [B] ⚑ 표본 흔들기 — 12 → 24 시드 (부지런 · 같은 창 · 같은 κ)');
say('');
say('| 축 | 12시드 | 24시드 | Δ |');
say('|---|---|---|---|');
say(`| 문턱 위 벽 p50 (배정) | ${A.walls} (${A.seated}) | ${B.walls} (${B.seated}) | ${B.walls - A.walls} |`);
say(`| ① 문턱 위 간격 | ×${f2(A.gap)} (${f1(A.gapPc)}%) | ×${f2(B.gap)} (${f1(B.gapPc)}%) | ${f1(B.gapPc - A.gapPc)}%p |`);
say(`| ③ 문턱 위 벽당 | ${f1(A.perWall)}분 | ${f1(B.perWall)}분 | ${f1(B.perWall - A.perWall)}분 |`);
say(`| ③ 문턱 아래 벽당 | ${f1(A.lowPer)}분 | ${f1(B.lowPer)}분 | ${f1(B.lowPer - A.lowPer)}분 |`);
say(`| ③ 벽당 비(위÷아래) | ×${f2(A.ratio)} | ×${f2(B.ratio)} | ${f2(B.ratio - A.ratio)} |`);
say(`| ② 말미 수급(목표 대비) | ${f1(A.tail)}% | ${f1(B.tail)}% | ${f1(B.tail - A.tail)}%p |`);
say('');
ck('[B1] ⚑ ① 문턱 위 간격의 부호와 자릿수가 안 바뀐다 (±1%p 안)',
   B.gapPc < 0 && Math.abs(B.gapPc - A.gapPc) <= 1.0, `${f1(A.gapPc)}% → ${f1(B.gapPc)}%`);
ck('[B2] ① 이 여전히 ±15% 안이다 (§0 ① 통과 폭)', Math.abs(B.gapPc) <= 15, `${f1(B.gapPc)}%`);
ck('[B3] 문턱 위 벽·배정 개수가 그대로다 (3개 · 전부 배정)',
   B.walls === A.walls && B.seated === A.seated && B.seated === B.walls, `${B.walls}개 · 배정 ${B.seated}`);
ck('[B4] ⚑ ③ 벽당 비가 그대로다 (±0.05 안) — «말미가 ③ 을 진다» 는 표본 잡음이 아니다',
   Math.abs(B.ratio - A.ratio) <= 0.05 && B.ratio < 1, `×${f2(A.ratio)} → ×${f2(B.ratio)}`);
ck('[B5] ② 가 그대로다 (±0.2%p 안)', Math.abs(B.tail - A.tail) <= 0.2, `${f1(A.tail)}% → ${f1(B.tail)}%`);
ck('[B6] 두 구역 다 여전히 목표(벽당 60분) 미달이다', B.perWall < 60 && B.lowPer < 60,
   `위 ${f1(B.perWall)}분 · 아래 ${f1(B.lowPer)}분`);
ck('[B7] 시드별 항등 «위+아래=전체» 가 24시드에서도 전 시드 참이다',
   B.ident === B.identN && B.identN === 24, `${B.ident}/${B.identN}`);

/* ═══ [C] 자 수리 ═════════════════════════════════════════════════════ */
say('');
say('## [C] ⚑⚑ 자 수리 — 배정 벽 p50 < 2 면 간격은 «미정의» 다 (13회차 JJ 를 말미 축에)');
say('');
say(`24시드 **대충**: 문턱 위 벽 p50 = ${BC.walls}개 · 그중 **배정 ${BC.seated}개** ⇒`
  + ` 간격 ${BC.gapUndef ? '**미정의**(수를 안 찍는다)' : `×${f2(BC.gap)} (${f1(BC.gapPc)}%) ⚠ 찍혔다`}`);
say('');
ck('[C1] ⚑ 대충의 문턱 위 간격이 «미정의» 로 찍힌다 — 배정이 1개다',
   BC.seated < WIN.MIN_LATE && BC.gapUndef === true && !Number.isFinite(BC.gap),
   `배정 ${BC.seated}개 · ${BC.gapUndef ? '미정의' : '수가 찍혔다'}`);
ck('[C2] 그런데 창 역량은 «가능» 이다 — 두 수는 다른 것을 센다(벽 ↔ 배정)',
   BC.can === true && BC.walls >= WIN.MIN_LATE && BC.seated < WIN.MIN_LATE,
   `벽 ${BC.walls}개(가능) · 배정 ${BC.seated}개(간격 미정의)`);
ck('[C3] ③ 은 구간 하나로도 정의되므로 대충에서도 찍힌다 — 축마다 최소 표본이 다르다',
   Number.isFinite(BC.perWall) && Number.isFinite(BC.ratio), `벽당 ${f1(BC.perWall)}분 · ×${f2(BC.ratio)}`);
ck('[C4] 부지런은 배정이 3개라 이 수리에 안 걸린다 (12·24 시드 둘 다 수가 찍힌다)',
   A.seated >= WIN.MIN_LATE && B.seated >= WIN.MIN_LATE && !A.gapUndef && !B.gapUndef);
ck('[C5] 수리가 소스에 있다 — `lateSeatN >= WIN.MIN_LATE` 게이트',
   /lateSeatN >= WIN\.MIN_LATE \? med\(runs\.map\(lateGapOf\)/.test(fs.readFileSync(path.join(ROOT, 'tools', 'bot199.js'), 'utf8')));

/* ═══ [D] 두 정책이 같은 모양 ═════════════════════════════════════════ */
say('');
say('## [D] ⚑ ③ 의 «말미가 진다» 가 두 정책에서 같은 모양이다');
say('');
say('| 정책(24시드) | 문턱 위 벽당 | 문턱 아래 벽당 | 비 |');
say('|---|---|---|---|');
say(`| 부지런 | ${f1(B.perWall)}분 | ${f1(B.lowPer)}분 | **×${f2(B.ratio)}** |`);
say(`| 대충 | ${f1(BC.perWall)}분 | ${f1(BC.lowPer)}분 | **×${f2(BC.ratio)}** |`);
say('');
ck('[D1] 두 정책 다 «위 < 아래» 다', B.ratio < 1 && BC.ratio < 1, `×${f2(B.ratio)} · ×${f2(BC.ratio)}`);
ck('[D2] 두 비가 0.1 안에서 같다 — 정책이 아니라 구역이 만드는 수다',
   Math.abs(B.ratio - BC.ratio) <= 0.1, `Δ${f2(Math.abs(B.ratio - BC.ratio))}`);

/* ═══ [E] 창 역량과 시드 수 ═══════════════════════════════════════════ */
say('');
say('## [E] 창 역량은 시드 수에도 걸린다 — 대충이 12시드 «불가» → 24시드 «가능»');
say('');
ck('[E1] 12시드 대충은 판정 불가였다 (벽 1개)', AC.can === false && AC.lateP50 === 1, `벽 ${AC.lateP50}개`);
ck('[E2] 24시드 대충은 판정 가능이다 (벽 2개)', BC.can === true && BC.lateP50 === 2, `벽 ${BC.lateP50}개`);
ck('[E3] 부지런의 판정은 두 표본에서 안 흔들린다 (둘 다 가능 · 벽 3개)',
   A.can === true && B.can === true && A.lateP50 === 3 && B.lateP50 === 3);

/* ═══ [R] 되돌림 ═════════════════════════════════════════════════════ */
say('');
say('## [R] 되돌림 시험');
say('');
ck('[R1] 판정식 문턱은 2 그대로다', WIN.MIN_LATE === 2, `MIN_LATE=${WIN.MIN_LATE}`);
ck('[R2] ⚑ 수리를 빼면 이 표에 수가 찍힌다 — 대충 절이 그 자리다 (배정 1개인데 간격이 났다)',
   BC.walls >= 2 && BC.seated === 1 && BC.gapUndef === true,
   '수리 전 이 자리에 ×2.13 (+30.9%) 가 찍혀 있었다 — 배정이 둘인 소수 시드만의 값');
ck('[R3] 41회차 표(12시드)는 이 수리로 한 글자도 안 바뀐다 — 부지런 배정 3개',
   Math.abs(A.gapPc + 5.6) <= 0.15 && A.seated === 3);

say('');
say(`RESULT — ${OK} PASS / ${NG} FAIL`);
process.exit(NG ? 1 : 0);
