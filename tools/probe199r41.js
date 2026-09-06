#!/usr/bin/env node
/* 199 41회차 — **채택한 두 단을 «말미 창» 에서 읽는다** (40-11 1번)
 * ─────────────────────────────────────────────────────────────────────────────
 * 33회차가 §0-2 에 축 이름 셋을 세워 뒀다 — «① 문턱 위 간격·적중 · ③ 문턱 위 진폭 ·
 * ② 말미 한계 수급». 그런데 그 몫을 **재는 줄은 표에 한 줄도 없었다**: 33-3 이 잰 세 창이
 * 전부 «판정 불가»(30일 0개 · 90일 1개 · 120일만 4개)라 잴 것이 없었기 때문이다.
 * 40회차의 두 단 사다리가 **같은 90일 창에서** 문턱 위 벽을 3개로 열었고(40-4 [D5]),
 * 그래서 이 회차의 1순위는 «새 스윕» 이 아니라 **이미 커밋된 `r40-d90-two24` 를 그 축으로
 * 다시 읽기»** 다(봇 시뮬 0건 — 리플레이만).
 *
 * 이 자가 하는 일:
 *   [A] 재현 — 40-4 헤드라인(①③②·창 역량)이 리플레이 표에서 그대로 나온다 (338 규칙)
 *   [B] 리플레이 무결 — 새 표는 커밋된 r40 표와 **출처 줄과 말미 몫 줄 말고는 한 글자도 안 다르다**
 *   [C] ⚑⚑ 본체 — ① 문턱 위 간격: 배정 칸의 목표 대비 몇 %인가 (창 전체 값과 다른 수인가)
 *   [D] ⚑ ③ 문턱 위 진폭 — 40-4 의 유일한 대가(③)가 **어느 구역에 있는가**
 *   [E] ② 말미 한계 수급 — 두 실행 대조(두 단이 이 축을 안 판다)
 *   [F] 음성 대조 — 같은 창의 한 단(base)은 «판정 불가» 라 그 줄이 **안 찍힌다**
 *   [R] 되돌림 시험 — 판정식을 무르게 하면(MIN_LATE 1) 못 보는 창이 판정으로 새어 나온다
 *
 * ⚠ 새 봇 시뮬은 안 한다 — 커밋된 JSON 을 `--replay` 로 다시 접은 표만 읽는다.
 * ⚠ 값을 손으로 안 적는다 — ①③②·문턱·말미 몫의 정의는 전부 `tools/bot199.js` 한 곳이고
 *   이 자는 **봇이 찍은 문장**을 읽는다(356-⑬ «자를 두 벌로 적으면 한쪽만 늙는다»).
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
  two:  '199-bot-2026-09-06-r41-d90-two24-late.md',   /* 두 단 · 90일 · 12시드 (r40 JSON 리플레이) */
  base: '199-bot-2026-09-06-r41-d90-base-late.md',    /* 한 단 · 90일 · 12시드 (r39 JSON 리플레이) */
  r40:  '199-bot-2026-09-06-r40-d90-two24.md',        /* 40회차가 커밋한 원표 — 무결 대조용 */
};
const TXT = {};
for (const [k, f] of Object.entries(FILES)) {
  const p = path.join(RV, f);
  TXT[k] = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

/* 정책 절 하나를 잘라 낸다 — 부지런/대충이 같은 문장 꼴을 쓰므로 절을 안 가르면 서로의 수를 읽는다. */
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

/* 봇이 찍은 말미 몫 줄에서 수를 읽는다(자가 아니라 «표를 읽는» 쪽이다). */
const lateOf = (txt, pol) => {
  const s = sect(txt, pol);
  const L = lineOf(s, '말미 몫');
  const C = lineOf(s, '대조 — **문턱 아래**');
  return {
    printed: /⚑ 말미 몫/.test(L),
    muted:   /말미 몫 — 안 찍는다/.test(L),
    sw:      num(L, /문턱 s(\d+)/),
    walls:   num(L, /문턱 위 벽 p50 = (\d+)개/),
    seated:  num(L, /그중 배정 (\d+)개/),
    unseat:  num(L, /미배정 (\d+)개/),
    gap:     num(L, /문턱 위 간격 기하평균 p50 = ([\d.]+)/),
    gapT:    num(L, /배정 칸의 목표 ×([\d.]+)/),
    gapPc:   num(L, /목표 ×[\d.]+ · (-?[\d.]+)%/),
    faceSum: num(L, /③ 문턱 위 실오르막 합 p50 = (-?\d+)분/),
    faceCnt: num(L, /구간 (\d+)개/),
    perWall: num(L, /벽당 ([\d.]+)분\)/),
    lowSum:  num(C, /실오르막 합 p50 = (\d+)분/),
    lowCnt:  num(C, /구간 (\d+)개/),
    lowPer:  num(C, /벽당 ([\d.]+)분\)/),
    ident:   num(C, /검산 (\d+)\/\d+/),
    identN:  num(C, /검산 \d+\/(\d+)/),
    ratio:   num(C, /벽당 비 = \*\*×([\d.]+)\*\*/),
    /* 창 전체(문턱 아래·위를 합친) 축 — 대조군 */
    can:     /창 역량 —[^\n]*\*\*판정 가능\*\*/.test(lineOf(s, '창 역량 — 말미 축')),
    lateP50: num(lineOf(s, '창 역량 — 말미 축'), /배정 벽 p50 = (\d+)개/),
    allGap:  num(lineOf(s, '① 축 — 목표 칸 적중'), /벽 간격 기하평균 p50 = ([\d.]+)/),
    allGapPc:num(lineOf(s, '① 축 — 목표 칸 적중'), /목표 ×[\d.]+ · (-?[\d.]+)%/),
    hit:     num(lineOf(s, '① 축 — 목표 칸 적중'), /적중 p50 = (\d+)\//),
    allFace: num(lineOf(s, '실오르막 합(벽 사이'), /p50 = (\d+)분/),
    allPer:  num(lineOf(s, '실오르막 합(벽 사이'), /합÷구간 ([\d.]+)분/),
    movePc:  num(lineOf(s, '실오르막 합(벽 사이'), /의 ([\d.]+)% — ③ 의 축/),
    tail:    num(lineOf(s, '② 말미 한계 수급/일 〔소환 예산 장부'), /목표 270,000의 ([\d.]+)%/),
    /* ⚠ 천 단위 쉼표를 안 떼면 `parseFloat('20,930')` 이 **20** 이다(자릿수가 셋 날아간다). */
    tailAbs: (() => { const m = lineOf(s, '② 말미 한계 수급/일 〔소환 예산 장부').match(/\| ([\d,]+) \(보간/);
                      return m ? parseFloat(m[1].replace(/,/g, '')) : NaN; })(),
  };
};

say('# probe199r41 — 채택한 두 단을 «말미 창» 에서 읽는다 (40-11 1번)');
say('');

ck('[A0] 표 셋이 전부 있다 (두 단 리플레이 · 한 단 리플레이 · r40 원표)',
   !!TXT.two && !!TXT.base && !!TXT.r40,
   Object.entries(FILES).map(([k, f]) => `${k}:${TXT[k] ? '✔' : '없다 ' + f}`).join(' · '));
if (!TXT.two || !TXT.base || !TXT.r40) {
  say('');
  say('_없는 표는 이렇게 만든다(시뮬 없음 — 커밋된 JSON 을 그대로 다시 접는다):_');
  say('```');
  say('node tools/bot199.js --replay=docs/review/199-bot-2026-09-06-r40-d90-two24.json \\');
  say('  --out=docs/review/199-bot-2026-09-06-r41-d90-two24-late.md');
  say('node tools/bot199.js --replay=docs/review/199-bot-2026-09-06-r39-d90-base.json \\');
  say('  --out=docs/review/199-bot-2026-09-06-r41-d90-base-late.md');
  say('```');
  say('');
  say(`RESULT — ${OK} PASS / ${NG} FAIL`);
  process.exit(1);
}

const T = lateOf(TXT.two, '부지런한'), TC = lateOf(TXT.two, '대충'),
      B = lateOf(TXT.base, '부지런한'), BC = lateOf(TXT.base, '대충');

/* ═══ [A] 재현 (338 규칙) ═══════════════════════════════════════════════ */
say('## [A] 재현 — 40-4 헤드라인이 리플레이 표에서 그대로 나온다');
say('');
say('| 축(부지런) | 두 단(리플레이) | 한 단(리플레이) | 40-4 가 적은 값 |');
say('|---|---|---|---|');
say(`| ① 벽 간격 기하평균 (목표 대비) | ×${f2(T.allGap)} (${f1(T.allGapPc)}%) | ×${f2(B.allGap)} (${f1(B.allGapPc)}%) | ×1.759 (−3.1%) ↔ ×1.758 (−3.2%) |`);
say(`| ① 목표 칸 적중 p50 | ${T.hit}/8 | ${B.hit}/8 | 4/8 ↔ 3/8 |`);
say(`| ③ 순 이동 비중(%) | ${f2(T.movePc)} | ${f2(B.movePc)} | 1.05 ↔ 1.41 |`);
say(`| ② 소환 예산 장부 말미(목표의 %) | ${f1(T.tail)} | ${f1(B.tail)} | 7.8 ↔ 7.7 |`);
say(`| 창 역량(문턱 위 벽 p50) | ${T.can ? '판정 가능' : '판정 불가'} (${T.lateP50}) | ${B.can ? '판정 가능' : '판정 불가'} (${B.lateP50}) | 판정 가능(3) ↔ 판정 불가 |`);
say('');
ck('[A1] ① 간격 두 값이 40-4 그대로다 (−3.1% ↔ −3.2%)',
   Math.abs(T.allGapPc + 3.1) <= 0.15 && Math.abs(B.allGapPc + 3.2) <= 0.15,
   `${f1(T.allGapPc)}% ↔ ${f1(B.allGapPc)}%`);
ck('[A2] ① 적중이 40-4 그대로다 (4/8 ↔ 3/8)', T.hit === 4 && B.hit === 3, `${T.hit} ↔ ${B.hit}`);
ck('[A3] ③ 순 이동 비중이 40-4 그대로다 (1.05 ↔ 1.41)',
   Math.abs(T.movePc - 1.05) <= 0.02 && Math.abs(B.movePc - 1.41) <= 0.02,
   `${f2(T.movePc)} ↔ ${f2(B.movePc)}`);
ck('[A4] ② 말미 수급이 40-4 그대로다 (7.8% ↔ 7.7%)',
   Math.abs(T.tail - 7.8) <= 0.05 && Math.abs(B.tail - 7.7) <= 0.05, `${f1(T.tail)}% ↔ ${f1(B.tail)}%`);
ck('[A5] 창 역량이 40-4 그대로다 (두 단 가능 3 · 한 단 불가)',
   T.can === true && T.lateP50 === 3 && B.can === false, `두 단 ${T.lateP50}개 · 한 단 ${B.can ? '가능' : '불가'}`);

/* ═══ [B] 리플레이 무결 ═══════════════════════════════════════════════ */
say('');
say('## [B] 리플레이 무결 — 새 표는 r40 원표와 «출처 줄 + 말미 몫 줄» 말고는 같다');
say('');
const strip = t => t.split('\n')
  .filter(l => !/^> `node tools\/bot199\.js/.test(l))       /* 출처 줄(리플레이 표식) */
  .filter(l => !/말미 몫/.test(l))                           /* 41회차가 새로 넣은 줄 */
  .filter(l => !/대조 — \*\*문턱 아래\*\*/.test(l))
  .join('\n').replace(/\n{3,}/g, '\n\n');
ck('[B1] 두 단 리플레이 표의 나머지가 r40 원표와 한 글자도 안 다르다',
   strip(TXT.two) === strip(TXT.r40),
   `${strip(TXT.two).length}자 ↔ ${strip(TXT.r40).length}자`);
ck('[B2] 새 줄은 표마다 정확히 정책 수(2)만큼 늘었다 — 절마다 하나',
   (TXT.two.match(/말미 몫/g) || []).length === 2 && (TXT.base.match(/말미 몫/g) || []).length === 2,
   `두 단 ${(TXT.two.match(/말미 몫/g) || []).length}줄 · 한 단 ${(TXT.base.match(/말미 몫/g) || []).length}줄`);

/* ═══ [C] 본체 — ① 문턱 위 ═══════════════════════════════════════════ */
say('');
say('## [C] ⚑⚑ 본체 — ① 문턱 위 간격·적중 (33회차가 «판정 불가» 로 막아 둔 첫 축)');
say('');
say('| 항 | 값 |');
say('|---|---|');
say(`| 문턱 | s${T.sw} (첫 «좁은» 관문 = eBandSw + ES_BAND3) |`);
say(`| 문턱 위 벽 p50 | ${T.walls}개 (배정 ${T.seated} · 미배정 ${T.unseat}) |`);
say(`| **문턱 위 간격 기하평균** | **×${f2(T.gap)}** (배정 칸의 목표 ×${f2(T.gapT)} · **${f1(T.gapPc)}%**) |`);
say(`| 창 전체 간격(대조) | ×${f2(T.allGap)} (목표 대비 ${f1(T.allGapPc)}%) |`);
say('');
ck('[C1] 말미 몫 줄이 실제로 찍혔다 (창 역량 «판정 가능» 이므로)', T.printed === true && T.muted !== true);
ck('[C2] 문턱이 40회차 두 단의 s344 다 (한 단 표기 s336 이 아니다)', T.sw === 344, `s${T.sw}`);
ck('[C3] 문턱 위 벽 수가 창 역량 줄의 수와 같다 (자가 둘이 아니다)',
   T.walls === T.lateP50 && T.walls === 3, `말미 몫 ${T.walls}개 ↔ 창 역량 ${T.lateP50}개`);
ck('[C4] 말미 벽이 전부 배정됐다 — «창 밖 벽» 이 이 구역에 없다',
   T.seated === T.walls && T.unseat === 0, `배정 ${T.seated}/${T.walls}`);
ck('[C5] ⚑ 문턱 위 간격이 배정 칸의 목표에서 ±15% 안이다 (§0 ① 통과 폭)',
   Number.isFinite(T.gapPc) && Math.abs(T.gapPc) <= 15, `${f1(T.gapPc)}% (×${f2(T.gap)} ↔ 목표 ×${f2(T.gapT)})`);
ck('[C6] ⚑ 문턱 위 값이 창 전체 값과 «다른 수» 다 — 새 축이 실제로 잘려 있다',
   Math.abs(T.gap - T.allGap) > 0.2 && Math.abs(T.gapT - 1.815) > 0.2,
   `문턱 위 ×${f2(T.gap)} / 목표 ×${f2(T.gapT)} ↔ 창 전체 ×${f2(T.allGap)} / 목표 ×1.815`);
ck('[C7] 말미 간격이 창 전체보다 목표에서 더 멀다 — 남은 어긋남은 말미 쪽이다',
   Math.abs(T.gapPc) > Math.abs(T.allGapPc), `말미 ${f1(T.gapPc)}% ↔ 전체 ${f1(T.allGapPc)}%`);

/* ═══ [D] 본체 — ③ 문턱 위 진폭 ═══════════════════════════════════════ */
say('');
say('## [D] ⚑ ③ 문턱 위 진폭 — 40-4 의 유일한 대가가 «어느 구역» 에 있는가');
say('');
say('| 구역 | 실오르막 합 p50 | 구간 | 벽당 | 목표 |');
say('|---|---|---|---|---|');
say(`| 문턱 s${T.sw} **위** | ${T.faceSum}분 | ${T.faceCnt}개 | **${f1(T.perWall)}분** | ≥60분 급 |`);
say(`| 문턱 **아래** | ${T.lowSum}분 | ${T.lowCnt}개 | ${f1(T.lowPer)}분 | ≥60분 급 |`);
say(`| 창 전체(대조) | ${T.allFace}분 | ${T.faceCnt + T.lowCnt}개 | ${f1(T.allPer)}분 | ≥60분 급 |`);
say('');
ck('[D1] 시드별 항등 «위 + 아래 = 전체 구간» 이 전 시드에서 참이다',
   T.ident === T.identN && T.identN >= 12, `${T.ident}/${T.identN}`);
ck('[D2] ⚑ 문턱 위 벽당 순 이동이 문턱 아래보다 작다 — ③ 의 대가는 말미가 진다',
   T.perWall < T.lowPer && T.ratio < 1, `위 ${f1(T.perWall)}분 ↔ 아래 ${f1(T.lowPer)}분 (×${f2(T.ratio)})`);
ck('[D3] 두 구역 다 목표(벽당 60분)에 못 미친다 — 말미만의 문제가 아니다',
   T.perWall < 60 && T.lowPer < 60, `위 ${f1(T.perWall)}분 · 아래 ${f1(T.lowPer)}분`);
ck('[D4] 벽당 비가 표에 찍혀 있다 (p50 뺄셈이 아니라 제 자로 잰 값)',
   Number.isFinite(T.ratio), `×${f2(T.ratio)}`);

/* ═══ [E] ② 말미 한계 수급 ═══════════════════════════════════════════ */
say('');
say('## [E] ② 말미 한계 수급 — 두 단이 이 축을 파는가');
say('');
say('| 실행 | 소환 예산 장부 말미/일 | 목표 270,000 대비 |');
say('|---|---|---|');
say(`| 두 단 | ${Number.isFinite(T.tailAbs) ? T.tailAbs.toLocaleString('en-US') : '—'} | ${f1(T.tail)}% |`);
say(`| 한 단 | ${Number.isFinite(B.tailAbs) ? B.tailAbs.toLocaleString('en-US') : '—'} | ${f1(B.tail)}% |`);
say('');
ck('[E1] ② 는 두 단에서 안 낮아진다 (한 단 이상)', T.tail >= B.tail, `${f1(T.tail)}% ↔ ${f1(B.tail)}%`);
ck('[E3] 절대값도 두 단이 한 단 이상이다 (쉼표를 뗀 수로 읽는다)',
   Number.isFinite(T.tailAbs) && Number.isFinite(B.tailAbs) && T.tailAbs >= B.tailAbs && T.tailAbs > 1000,
   `${T.tailAbs} ↔ ${B.tailAbs}`);
ck('[E2] 두 값의 차가 0.5%p 안이다 — 두 단은 ② 축을 사실상 안 건드린다',
   Math.abs(T.tail - B.tail) <= 0.5, `Δ${f1(T.tail - B.tail)}%p`);

/* ═══ [F] 음성 대조 ═══════════════════════════════════════════════════ */
say('');
say('## [F] 음성 대조 — «판정 불가» 인 창에서는 이 줄이 수를 안 찍는다 (§0-2)');
say('');
ck('[F1] 한 단(부지런)은 말미 몫 줄이 «안 찍는다» 로 나온다', B.muted === true && !Number.isFinite(B.gap),
   B.muted ? '안 찍는다' : '수가 찍혔다');
ck('[F2] 두 단의 «대충» 정책도 같은 창에서 판정 불가라 수를 안 찍는다',
   TC.muted === true && !Number.isFinite(TC.gap), TC.muted ? '안 찍는다' : '수가 찍혔다');
ck('[F3] 한 단의 «대충» 도 마찬가지', BC.muted === true, BC.muted ? '안 찍는다' : '수가 찍혔다');
ck('[F4] 안 찍는 줄이 «왜 못 보는지» 를 데리고 다닌다 (문턱·개수·규약)',
   /문턱 s\d+ 위 배정 벽 \d+개/.test(lineOf(sect(TXT.base, '부지런한'), '말미 몫'))
   && /§0-2/.test(lineOf(sect(TXT.base, '부지런한'), '말미 몫')));
ck('[F5] 한 단 표의 문턱은 한 단 세대의 s376 이다 (제품을 따라가지 않는다 — 40-9 규약 6)',
   B.sw === 376, `s${B.sw}`);

/* ═══ [R] 되돌림 시험 ═════════════════════════════════════════════════ */
say('');
say('## [R] 되돌림 시험 — 판정식을 무르게 하면 못 보는 창이 판정으로 샌다');
say('');
ck('[R1] 판정식 문턱은 2 그대로다 (간격의 정의)', WIN.MIN_LATE === 2, `MIN_LATE=${WIN.MIN_LATE}`);
ck('[R2] 벽 1개는 «판정 불가» 다 — 한 단 90일이 그 자리다',
   WIN.judge({ sw: 376, late: 1 }).can === false);
ck('[R3] 벽 2개부터 «판정 가능» 이다', WIN.judge({ sw: 344, late: 2 }).can === true);
ck('[R4] 사다리가 없으면 «해당 없음» 이지 «판정 불가» 가 아니다',
   WIN.judge({ sw: 0, late: 0 }).can === null);
/* ⚑ 이 자가 무르게 풀리지 않았음을 표 자신이 굽는다 — 말미 줄이 없는 표는 [C1] 이 빨개지고,
   «판정 불가» 인데 수가 찍힌 표는 [F1]~[F3] 이 빨개진다. 둘은 서로의 음성 대조다. */
ck('[R5] 두 표가 서로의 음성 대조다 — 하나는 찍고(가능) 하나는 안 찍는다(불가)',
   T.printed === true && B.muted === true && T.can === true && B.can === false);

say('');
say(`RESULT — ${OK} PASS / ${NG} FAIL`);
process.exit(NG ? 1 : 0);
