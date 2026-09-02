#!/usr/bin/env node
/* 작업 772 게이트 — 「전 화면 스윕은 **스크롤 아래**도 본다」
 *
 *   node tools/verify772.js
 *
 * 등재문(2026-09-01, 750 3회차 곁다리 관측): `scan356`/`probe418` 스윕이 «스크롤 아래» 를
 * 한 번도 안 본다 — `COLLECT` 의 가시 조건(`r.top > innerHeight` …)이 뷰포트 밖 노드를
 * 통째로 건너뛰므로, 스크롤 그릇을 가진 화면은 **첫 쪽만** 감시 대상이었다.
 * 실측(`node tools/probe772.js`, 71화면): 뷰포트 안 842 · **밖 249(22.8%)** · 구멍 19/71 화면.
 *
 * 지킬 것:
 *   [S] 선언 — `probe418` 에 쪽 루프의 세 부품이 살아 있다(중복 가드 · 쪽 한정 SETOPA · 실행 때 쪽 수 판기)
 *   [A] 켠 판 — 쪽을 실제로 넘겼고, «스크롤 아래» 노드를 실제로 쟀다
 *   [B] 끈 판(되돌림 `PROBE418_NOSCROLL=1`) — 스크롤 아래를 **0개** 잰다 = 772 이전의 스윕
 *   [C] 첫 쪽 불변 + **중복 집계 0** — `판정(켠) = 판정(끈) + 스크롤아래판정(켠)` 이 산수로 닫힌다
 *   [D] 스코프가 줄지 않았다 — 끈 판에서 나온 자리가 켠 판에 **전부** 있다
 *   [E] 상한을 조용히 안 자른다 — 상한에 걸린 그릇을 `capped` 로 세고 `pots` 가 이름을 댄다
 *
 * ⚑ **왜 [C] 가 이 자의 본체인가.** 쪽을 넘기는 스윕은 두 가지로 조용히 틀릴 수 있다 —
 *   ⓐ 모든 쪽에 걸치는 노드(머리글·탭바)를 쪽마다 다시 세어 «칸» 을 부풀리거나,
 *   ⓑ 첫 쪽의 값이 달라져 750 까지의 래칫이 통째로 흔들리거나.
 *   [C] 의 항등식은 그 둘을 **한 줄로** 막는다: 부풀면 왼쪽이 커지고, 첫 쪽이 변하면 오른쪽이 변한다.
 *
 * ⚠ **되돌림을 전 화면으로 돌리지 마라**(750-④ 규율) — 두 벌 사이의 물음은 하나뿐인데 값은 두 배다.
 *   그래서 이 자는 구멍이 가장 큰 두 화면만 쓴다: **13 재화 탭**(`#shopList` 1740→4852 · 3쪽) 과
 *   **35 패스(출석)**(`#psList` 1389→23212 · 원래 17쪽 → 상한 4쪽). 뒤엣것이 [E] 의 표본이다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { sweep } = require('./probe418');

const ONLY = ['13 재화 탭', '35 패스(출석)'];

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d !== undefined && d !== '' ? '  [' + d + ']' : '')); };
const info = (m, d) => console.log('  ·    ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = (t) => console.log('\n[' + t + ']');

(async () => {
  /* ---------- [S] 선언 ----------
     쪽 루프는 세 부품이 **같이** 있어야 옳다. 하나만 빠져도 값은 나오는데 뜻이 달라지므로
     («중복 집계» · «남의 잉크 오염» · «손으로 적은 쪽 수»), 소스에서 셋을 각각 묻는다. */
  blk('S 선언 — 쪽 루프의 세 부품');
  const src = fs.readFileSync(path.resolve(__dirname, 'probe418.js'), 'utf8');
  ok(/if \(el\.hasAttribute\('data-p418'\)\) continue;/.test(src),
    'S1 COLLECT 에 중복 가드 — 앞 쪽에서 이미 잰 노드는 다시 안 센다');
  ok(/const SETOPA = \(\[ids, v\]\)/.test(src),
    'S2 SETOPA 가 «이번 쪽 것만» 끈다 — 앞 쪽 노드가 차분에 섞이지 않는다');
  ok(/Math\.ceil\(sh \/ ch\)/.test(src),
    'S3 쪽 수를 실행 때 판다(scrollHeight/clientHeight) — 손으로 적은 상수가 아니다');

  /* ---------- 두 벌 ---------- */
  blk('A 켠 판 — 쪽을 넘기고 스크롤 아래를 잰다');
  const ON = await sweep({ dsf: 2, only: ONLY });
  ok(ON.errs.length === 0, 'A0 표본 두 화면 전부 진입', ON.errs.join(' / ') || '실패 0건');
  ok(ON.scrolled === 2, 'A1 두 화면 다 쪽이 둘 이상이다', `쪽 넘긴 화면 ${ON.scrolled}개 · 더 돈 쪽 ${ON.extraPages}개`);
  ok(ON.belowFold > 0, 'A2 ★ «스크롤 아래» 노드를 실제로 쟀다', `${ON.belowFold}개 (판정 ${ON.belowJudged})`);
  ok(ON.belowJudged > 0, 'A3 그중 판정까지 간 노드가 있다 — 재기만 하고 버리지 않는다', String(ON.belowJudged));
  for (const p of ON.pots) info('그릇', p);

  blk('B 끈 판(되돌림) — PROBE418_NOSCROLL 이 772 이전의 스윕을 돌려준다');
  const OFF = await sweep({ dsf: 2, only: ONLY, noscroll: true });
  ok(OFF.errs.length === 0, 'B0 같은 두 화면 전부 진입', OFF.errs.join(' / ') || '실패 0건');
  ok(OFF.belowFold === 0, 'B1 ★ 끄면 «스크롤 아래» 를 0개 잰다 = 이 처방이 실제로 일을 한다',
    `켠 판 ${ON.belowFold} ↔ 끈 판 ${OFF.belowFold}`);
  ok(OFF.scrolled === 0 && OFF.extraPages === 0, 'B2 끈 판은 쪽을 한 장도 안 넘긴다',
    `화면 ${OFF.scrolled} · 쪽 ${OFF.extraPages}`);

  /* ---------- [C] 항등식 ---------- */
  blk('C 첫 쪽 불변 + 중복 집계 0');
  ok(ON.judged === OFF.judged + ON.belowJudged,
    'C1 ★ 판정(켠) = 판정(끈) + 스크롤아래판정(켠) — 산수가 닫힌다',
    `${ON.judged} = ${OFF.judged} + ${ON.belowJudged}`);
  /* ⚠ C2 는 **±1 을 준다.** C1 과 달리 `measured` 는 «판정 스코프 밖» 노드까지 세는데,
     그 축의 잉크는 6px 바닥(`ink.w >= 6`)에 걸린 노드가 실행마다 들락거릴 수 있다 —
     772 1회차의 전 화면 완주가 실제로 `806 ↔ 805` 로 하나 어긋났다(판정 축 `518 = 317 + 201` 은
     **정확히** 닫혔다). 그 하나를 «중복 집계» 로 읽으면 이 자가 문턱 플레이키가 된다(825 계열).
     ⇒ **정확히 닫혀야 하는 축은 C1 이고**, C2 는 «부풀지 않았는가» 를 자릿수로 묻는다. */
  ok(Math.abs(ON.measured - (OFF.measured + ON.belowFold)) <= 1,
    'C2 잰 노드도 같은 산수로 닫힌다(±1 — 판정 밖 6px 바닥 몫) — 모든 쪽에 걸치는 노드를 두 번 안 센다',
    `${ON.measured} ↔ ${OFF.measured} + ${ON.belowFold} = ${OFF.measured + ON.belowFold}`);
  ok(ON.cells >= OFF.cells,
    'C3 칸은 늘기만 한다 — 넓힌 스코프가 옛 칸을 지우지 않았다', `켠 ${ON.cells} ↔ 끈 ${OFF.cells}`);

  /* ---------- [D] 스코프 ---------- */
  blk('D 스코프가 줄지 않았다');
  const onSel = new Set(ON.groups.map((g) => g.sel));
  const lost = OFF.groups.map((g) => g.sel).filter((s) => !onSel.has(s));
  ok(lost.length === 0, 'D1 ★ 끈 판에서 나온 자리가 켠 판에 전부 있다',
    lost.length ? '사라진 자리: ' + lost.join(' / ') : `끈 판 ${OFF.groups.length}자리 전부 보존`);
  const fresh = ON.groups.filter((g) => g.screens.every((s) => s.includes('↓')));
  info('처음 본 자리(전부 «↓» 쪽에서만 나왔다)', fresh.length ? fresh.map((g) => `${g.dev > 0 ? '+' : ''}${g.dev}% ${g.sel}`).join(' / ') : '0개');
  ok(fresh.length === ON.groups.length - OFF.groups.length,
    'D2 늘어난 자리는 전부 «↓» 쪽 몫이다 — 첫 쪽에서 새 자리가 생기지 않았다',
    `자리 ${OFF.groups.length} → ${ON.groups.length} (처음 본 자리 ${fresh.length})`);

  /* ---------- [E] 상한 ---------- */
  blk('E 상한을 조용히 안 자른다');
  ok(ON.maxpg === 4, 'E1 상한은 4쪽이다(실측이 고른 값 — 19화면 중 18화면이 4쪽 이내)', String(ON.maxpg));
  ok(ON.capped >= 1, 'E2 ★ 상한에 걸린 그릇을 세어 돌려준다 — 35 패스 사다리(#psList 17쪽)가 그 자리다',
    `capped ${ON.capped}`);
  ok(ON.pots.some((p) => p.includes('상한에 걸림')), 'E3 그릇 목록이 «상한에 걸림 — 원래 n쪽» 으로 이름을 댄다',
    ON.pots.find((p) => p.includes('상한에 걸림')) || 'n/a');

  console.log('\nVERIFY772 ' + pass + '/' + (pass + fail) + (fail ? '  ← FAIL ' + fail : '  PASS'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
