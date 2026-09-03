#!/usr/bin/env node
/* tools/probe199r29.js — 199 29회차 재현기 (판정 없음 · 측정만 · 새 봇 실행 0회)
 *
 * 28-5 2번: «주인 결정 표(27-8 5번 · AAW 1순위 — 두 회차째 미이행)를 이번에 만들어라.
 *            표는 «어느 손잡이가 ④ 를 창 안으로 넣는가» 가 아니라
 *            **«④ 창을 이 세대에서 지킬 수 있는가»** 를 물어야 한다.»
 *
 * 무엇을 재는가 (전부 커밋된 r28 JSON 위에서 — 28-4 가 그러라고 커밋했다)
 *   [A] 재현 — 27-3 규약(말미 정상 장부 · 창 W14)을 r28-base 에서 다시 세운다.
 *       28-3 표의 «④ W14 = 1.371» 과 자릿수까지 맞아야 이 아래가 성립한다.
 *   [B] ⚑ **척도 불변성** — 758 축(총 유입 ×k)을 밟으면 ④ 비가 어디로 가는가.
 *       k 를 흔들며 교차일 두 개와 그 비를 직접 계산한다.
 *   [C] ⚑ **비의 상한** — k→0 극한에서 비는 «말미 정상 기울기의 비» 로 수렴한다.
 *       그 극한값과 k 를 전 구간 흔들어 얻는 최대값을 같이 찍는다(§0 창 1.8~2.0 과 대조).
 *   [D] 축 분해 — 말미 창 W14 의 정상 기울기를 축별로 갈라 «부지런 − 대충» 을 잰다.
 *       비를 넓히는 축(부지런 쪽)과 좁히는 축(대충 쪽·평평한 축)을 갈라 목록으로 찍는다.
 *   [E] 역산 — 비 1.8 · 2.0 을 만들려면 각 정책의 말미 기울기가 얼마여야 하는가.
 *
 * 사용법: node tools/probe199r29.js [--json=docs/review/199-bot-2026-09-03-r28-base.json] [--w=14]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const ARG = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; });

/* ⚠ 세 상수는 `bot199.js` 와 **같은 값**이어야 한다(표 두 벌 금지 — 정정9 계보). */
const GOAL_DIA = 27205000;          /* 결2 ⓐ — ④ 의 과녁(2,720.5만) */
const ONCE_KEYS = ['시작(신규 지급)', '가이드미션', '우편', '우편(1회성)', '출석(1일차 환영)'];
const FINITE_KEYS = ['패스'];
const BAND = [1.8, 2.0];            /* §0 ④ 판정 창 */

const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const fmt = n => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '∞');
const f1 = n => (Number.isFinite(n) ? n.toFixed(1) : '∞');
const f3 = n => (Number.isFinite(n) ? n.toFixed(3) : '∞');
const pct = n => (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%';

/* ⚑ `verify758` [V] 가 이 파일을 **모듈로 불러** 같은 수를 쓴다(표 두 벌 금지 — 정정9 계보).
   불려 온 자리에서는 인쇄하지 않고 맨 끝의 `module.exports` 로만 답한다. */
const QUIET = require.main !== module;
const P = [];
const say = s => { P.push(s); if (!QUIET) console.log(s); };

const jf = ARG.json ? String(ARG.json) : 'docs/review/199-bot-2026-09-03-r28-base.json';
const rep = JSON.parse(fs.readFileSync(path.resolve(ROOT, jf), 'utf8'));
const DAYS = rep.days;
const W = ARG.w ? Number(ARG.w) : 14;
const POLS = ['diligent', 'casual'];
const KO = { diligent: '부지런', casual: '대충' };

const dayOf = (r, d) => r.rows.filter(x => x.label === 'D' + d)[0];
/* 판정 장부 = 소환 예산(결2 ⓐ) — 유입 − 소환 외 씽크 */
const v = s => s.inAll - (s.outNS || 0);
const byKeys = (s, keys) => keys.reduce((a, k) => a + ((s.inBy && s.inBy[k]) || 0), 0);

say(`# probe199r29 — ④ 창을 이 세대에서 지킬 수 있는가 (표: ${jf} · ${DAYS}일 · 시드 ${rep.seeds || Object.keys(rep.policies.diligent).length} · 창 W${W})`);
say('');

/* ────────────────────────────────────────────────────────────────────
   [A] 재현 — 27-3 규약(말미 정상 장부 · 창 W14)
   ──────────────────────────────────────────────────────────────────── */
function perSeed(pol) {
  const out = [];
  for (const r of Object.values(rep.policies[pol])) {
    const end = dayOf(r, DAYS), w0 = dayOf(r, Math.max(1, DAYS - W));
    if (!end || end.inAll == null || !w0 || !end.inBy || !w0.inBy) continue;
    const span = DAYS - Math.max(1, DAYS - W);
    const full = (v(end) - v(w0)) / span;
    const fin = (byKeys(end, FINITE_KEYS) - byKeys(w0, FINITE_KEYS)) / span;
    const once = (byKeys(end, ONCE_KEYS) - byKeys(w0, ONCE_KEYS)) / span;
    const cont = full - fin - once;
    /* 758 축은 «유입만» 을 누른다(씽크는 그대로) — 그래서 유입·씽크를 갈라 둔다. */
    const contIn = (end.inAll - w0.inAll) / span - fin - once;
    const contOut = ((end.outNS || 0) - (w0.outNS || 0)) / span;
    out.push({ seed: r.seed, r, v30: v(end), in30: end.inAll, out30: (end.outNS || 0), full, fin, once, cont, contIn, contOut, end, w0, span });
  }
  return out;
}
const S = {}; POLS.forEach(p => { S[p] = perSeed(p); });

/* 교차일 — bot199 `crossOf`/`tailSplit` 과 **같은 순서**로 판다:
   ① 측정 창(1..days) 안에서 실제로 과녁을 지나는 날을 먼저 찾고
   ② 못 지났을 때만 말미 정상 기울기로 외삽한다(cross = days + (T − v(days)) / cont).
   ⚠ ① 을 빼고 ② 만 쓰면 k 가 큰 자리에서 **교차일이 30 아래로**, 끝내 음수로 내려가
   비가 뒤집힌다(초판이 그랬다 — k=16 에서 −51.0일). 그 수는 «더 빨리 지났다» 가 아니라
   **자가 사정거리 밖에서 외삽한 인공물**이다.
   `mulIn` 은 758 축(자유 유입 ×k)을 대수로 얹는 손잡이다(아래 [B]). */
const crossOf = (pol, mulIn) => {
  const k = mulIn == null ? 1 : mulIn;
  const xs = S[pol].map(s => {
    for (let d = 1; d <= DAYS; d++) {
      const row = dayOf(s.r, d);
      if (row && row.inAll * k - (row.outNS || 0) >= GOAL_DIA) return d;   /* ① 창 안 실측 */
    }
    const cont = s.contIn * k - s.contOut, v30 = s.in30 * k - s.out30;
    return cont > 0 ? DAYS + (GOAL_DIA - v30) / cont : Infinity;           /* ② 외삽 */
  });
  return med(xs);
};

say('## [A] 재현 — 27-3 규약(말미 정상 장부 · 창 W' + W + ')');
say('');
say('| 정책 | v(30) 소환 예산 p50 | 전체 기울기 | 유한(패스) | 일회성 | **정상 기울기** | **교차일 p50** |');
say('|---|---|---|---|---|---|---|');
POLS.forEach(p => {
  const a = S[p];
  say(`| ${KO[p]} | ${fmt(med(a.map(x => x.v30)))} | ${fmt(med(a.map(x => x.full)))} | ${fmt(med(a.map(x => x.fin)))} | ${fmt(med(a.map(x => x.once)))} | **${fmt(med(a.map(x => x.cont)))}** | **${f1(crossOf(p))}** |`);
});
const R0 = crossOf('casual') / crossOf('diligent');
const contD = med(S.diligent.map(x => x.cont)), contC = med(S.casual.map(x => x.cont));
say('');
say(`⇒ **④ 비 = ${f3(R0)}** (§0 창 ${BAND[0]}~${BAND[1]} · **창 밖 ${pct(R0 / BAND[0] - 1)}**) · 28-3 표의 «1.371» 과 대조: ${f3(R0)}`);
say(`⇒ 말미 정상 기울기의 비 **cont(부지런)/cont(대충) = ${f3(contD / contC)}**`);
say('');

/* ────────────────────────────────────────────────────────────────────
   [B] 척도 불변성 — 758 축(총 유입 ×k)을 밟으면 ④ 비가 어디로 가는가
   ──────────────────────────────────────────────────────────────────── */
say('## [B] ⚑⚑ 척도 불변성 — 758 축(자유 유입 ×k)은 ④ 비를 창 안으로 못 넣는다');
say('');
say('| k (총 유입 배수) | 부지런 교차일 | 대충 교차일 | **④ 비** | §0 창 |');
say('|---|---|---|---|---|');
const KS = [0.01, 0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32];
for (const k of KS) {
  const cd = crossOf('diligent', k), cc = crossOf('casual', k), r = cc / cd;
  const tag = (r >= BAND[0] && r <= BAND[1]) ? '**창 안**' : `창 밖 ${pct(r / BAND[0] - 1)}`;
  say(`| ${k === 0.5 ? '**0.5 = 758 과녁**' : '×' + k} | ${f1(cd)} | ${f1(cc)} | **${f3(r)}** | ${tag} |`);
}
say('');

/* ────────────────────────────────────────────────────────────────────
   [C] 비의 상한 — k 전 구간 최대값과 k→0 극한
   ──────────────────────────────────────────────────────────────────── */
/* ⚠ 상한은 «자가 외삽으로 답을 내는 구간» 안에서만 뜻이 있다 — 두 정책 중 한쪽이라도
   측정 창 안(≤ 30일)에서 과녁을 지나면 그 점의 비는 **자의 해상도(하루)**가 지배한다.
   그 구간을 따로 표시하고 상한은 외삽 구간에서 찾는다. */
let best = { r: -1, k: 0 }, bestAny = { r: -1, k: 0 };
for (let i = 0; i <= 6000; i++) {
  const k = Math.pow(10, -3 + i * 6 / 6000);
  const cd = crossOf('diligent', k), cc = crossOf('casual', k), r = cc / cd;
  if (!Number.isFinite(r)) continue;
  if (r > bestAny.r) bestAny = { r, k };
  if (cd > DAYS && cc > DAYS && r > best.r) best = { r, k };
}
const limit = contD / contC;   /* k→0 극한 — v30 항이 사라지고 기울기 비만 남는다 */
/* ⚑ 초판은 «척도로는 창에 못 넣는다» 로 적었고 **그것이 틀렸다** — 외삽 구간 최대가 1.875 로
   창 하한 1.8 을 넘는다(`verify758` [V2] 가 즉시 빨개져 잡았다). 옳은 문장은 한 겹 아래다:
   **척도 축은 ④ 의 두 과녁을 «동시에» 못 준다.** ④ 는 비(1.8~2.0)와 **절대 도달일**
   (부지런 100일 ±10 · 대충 180~200일)을 같이 요구하는데, 비가 창에 닿는 자리에서
   부지런 교차일은 절대 창 아래로 한참 내려간다. 아래 두 수가 그것을 찍는다. */
const ABSW = [90, 110];      /* §0 ④ 절대 창 — 부지런 100일 ±10 */
let kHitRatio = null, kInAbs = { r: -1, k: 0, cd: 0, cc: 0 };
for (let i = 0; i <= 6000; i++) {
  const k = Math.pow(10, -3 + i * 6 / 6000);
  const cd = crossOf('diligent', k), cc = crossOf('casual', k), r = cc / cd;
  if (!Number.isFinite(r)) continue;
  if (cd > DAYS && cc > DAYS && r >= BAND[0] && kHitRatio == null) kHitRatio = { k, r, cd, cc };
  if (cd >= ABSW[0] && cd <= ABSW[1] && r > kInAbs.r) kInAbs = { r, k, cd, cc };
}
say('## [C] ⚑⚑ 비의 상한 — 척도 손잡이로 얻을 수 있는 최대치');
say('');
say(`- k 를 1/1000 ~ 1000 전 구간 흔들었을 때 **외삽 구간의 최대 ④ 비 = ${f3(best.r)}** (k = ${best.k.toFixed(3)})`);
say(`- (참고 — 측정 창 안 구간까지 포함한 최대는 ${f3(bestAny.r)} (k = ${bestAny.k.toFixed(3)}) 이지만 그 자리는 교차일이 ≤ ${DAYS}일이라 **자의 해상도(하루)가 지배한다** — 판정에 쓰지 마라)`);
say(`- k→0 극한 = **말미 정상 기울기의 비 ${f3(limit)}** (v(30) 항이 과녁 대비 사라진다)`);
say(`- §0 창 하한 ${BAND[0]} 까지 **${pct(BAND[0] / best.r - 1)}** — 즉 척도 축은 비 창에 **닿기는 한다**.`);
say('');
say(`⚑⚑ **그러나 두 과녁을 동시에는 못 준다.** ④ 는 비(${BAND[0]}~${BAND[1]})와 **절대 도달일**(부지런 ${ABSW[0]}~${ABSW[1]}일)을 같이 요구한다:`);
say('');
say('| 자리 | k | 부지런 교차일 | 대충 교차일 | ④ 비 | 절대 창 |');
say('|---|---|---|---|---|---|');
if (kHitRatio) say(`| 비가 창 하한에 닿는 자리 | ${kHitRatio.k.toFixed(2)} | **${f1(kHitRatio.cd)}일** | ${f1(kHitRatio.cc)}일 | **${f3(kHitRatio.r)}** | **창 밖 ${pct(kHitRatio.cd / ABSW[0] - 1)}** |`);
if (kInAbs.r > 0) say(`| 부지런이 절대 창 안인 자리(비 최대) | ${kInAbs.k.toFixed(2)} | ${f1(kInAbs.cd)}일 | ${f1(kInAbs.cc)}일 | **${f3(kInAbs.r)}** | 창 안 — 비가 ${pct(kInAbs.r / BAND[0] - 1)} |`);
say('');
say('⇒ **④ 를 두 반쪽으로 갈라야 27-8 5번의 질문에 답이 나온다.**');
say('');
say(`- **④-절대(도달일)** — 동시 만족 **불가능**. 절대 창은 유입 **×${kInAbs.k.toFixed(2)}** 를 요구하고 758 은 **×0.5** 를 요구한다 (**${(kInAbs.k / 0.5).toFixed(1)}배** 어긋난다).`);
say(`  ⚑ 그런데 이 충돌은 **주인이 758 에서 이미 닫았다** — «도달일은 관측값으로만 보고»(758 등재문). ⇒ 남는 판정은 **비 하나**다.`);
say(`- **④-비** — 동시 만족 **가능**. 758 축은 비를 안 움직인다(k=0.5 에서 ${f3(crossOf('casual', 0.5) / crossOf('diligent', 0.5))} ↔ 현행 ${f3(R0)} = ${pct(crossOf('casual', 0.5) / crossOf('diligent', 0.5) / R0 - 1)}).`);
say(`  비를 움직이는 축은 **부지런 ↔ 대충의 말미 정상 수급 격차** 하나이고, 그 격차는 **총량을 안 늘리고도** 벌릴 수 있다([G]).`);
say('');

/* ────────────────────────────────────────────────────────────────────
   [D] 축 분해 — 말미 창의 정상 기울기를 축별로
   ──────────────────────────────────────────────────────────────────── */
const axisRate = (pol, key) => med(Object.values(rep.policies[pol]).map(r => {
  const end = dayOf(r, DAYS), w0 = dayOf(r, Math.max(1, DAYS - W));
  if (!end || !w0 || !end.inBy || !w0.inBy) return 0;
  return (((end.inBy[key] || 0) - (w0.inBy[key] || 0))) / (DAYS - Math.max(1, DAYS - W));
}));
const KEYS = [...new Set(POLS.flatMap(p => Object.values(rep.policies[p]).flatMap(r => {
  const end = dayOf(r, DAYS); return end && end.inBy ? Object.keys(end.inBy) : [];
})))].filter(k => !ONCE_KEYS.includes(k) && !FINITE_KEYS.includes(k));

say('## [D] 축 분해 — 말미 창 W' + W + ' 의 정상 기울기(일당 p50)를 축별로');
say('');
say('| 축 | 부지런 | 대충 | 차(부지런−대충) | 방향 |');
say('|---|---|---|---|---|');
const rows = KEYS.map(k => ({ k, d: axisRate('diligent', k), c: axisRate('casual', k) }))
                 .map(x => ({ ...x, gap: x.d - x.c }))
                 .sort((a, b) => b.gap - a.gap);
for (const x of rows) {
  const dir = x.gap > 0 ? '**넓힌다**' : (x.gap < 0 ? '_좁힌다_' : '평평(중립)');
  say(`| ${x.k} | ${fmt(x.d)} | ${fmt(x.c)} | ${x.gap >= 0 ? '+' : ''}${fmt(x.gap)} | ${dir} |`);
}
const sumD = rows.reduce((a, x) => a + x.d, 0), sumC = rows.reduce((a, x) => a + x.c, 0);
say(`| **합(축)** | ${fmt(sumD)} | ${fmt(sumC)} | ${sumD - sumC >= 0 ? '+' : ''}${fmt(sumD - sumC)} | — |`);
say(`| _대조: 시드별 p50 정상 기울기_ | _${fmt(contD)}_ | _${fmt(contC)}_ | _${fmt(contD - contC)}_ | ⚠ med(Σ) ≠ Σ med (E3 각주) |`);
say('');

/* 넓히는 축만 남기고 좁히는 축을 0 으로 두면 비가 어디까지 가는가 — 상한 감각 */
const posD = rows.filter(x => x.gap > 0).reduce((a, x) => a + x.d, 0);
const posC = rows.filter(x => x.gap > 0).reduce((a, x) => a + x.c, 0);
say(`- 격차를 **넓히는 축만** 남기면 기울기 비는 ${f3(posD / Math.max(1, posC))} (부지런 ${fmt(posD)} / 대충 ${fmt(posC)})`);
say(`- 격차를 **좁히는·평평한 축**(대충에게 같거나 더 주는 축)의 몫: 부지런 ${fmt(sumD - posD)} / 대충 ${fmt(sumC - posC)}`);
say('');

/* ────────────────────────────────────────────────────────────────────
   [E] 역산 — 창 1.8 · 2.0 을 만들려면
   ──────────────────────────────────────────────────────────────────── */
say('## [E] 역산 — §0 창(1.8~2.0)에 넣으려면 말미 정상 기울기가 얼마여야 하는가');
say('');
say('| 목표 비 | ⓐ 대충을 눌러서 (부지런 고정) | ⓑ 부지런을 올려서 (대충 고정) |');
say('|---|---|---|');
for (const target of BAND) {
  /* 교차일 비 ≈ (T − v30_c)/cont_c ÷ (T − v30_d)/cont_d 를 target 으로 푼다(30일 항 포함 수치해). */
  const solve = (which) => {
    let lo = 0.02, hi = 50;
    for (let i = 0; i < 200; i++) {
      const m = (lo + hi) / 2;
      const cd = med(S.diligent.map(s => DAYS + (GOAL_DIA - s.v30) / (s.cont * (which === 'd' ? m : 1))));
      const cc = med(S.casual.map(s => DAYS + (GOAL_DIA - s.v30) / (s.cont * (which === 'c' ? m : 1))));
      const r = cc / cd;
      if (which === 'c') { if (r < target) hi = m; else lo = m; }      /* 대충을 누를수록(m↓) 비↑ */
      else { if (r < target) lo = m; else hi = m; }                    /* 부지런을 올릴수록(m↑) 비↑ */
    }
    return (lo + hi) / 2;
  };
  const mc = solve('c'), mdl = solve('d');
  say(`| **${target.toFixed(1)}** | 대충 ×${mc.toFixed(3)} (${fmt(contC)} → ${fmt(contC * mc)}/일 · ${pct(mc - 1)}) | 부지런 ×${mdl.toFixed(3)} (${fmt(contD)} → ${fmt(contD * mdl)}/일 · ${pct(mdl - 1)}) |`);
}
say('');
say(`⚠ ⓑ(부지런을 올린다)는 **758 과녁(총 유입 ×1/2)과 정면으로 부딪힌다** — 유입을 늘리는 방향이다.`);
say(`⚠ ⓐ(대충을 누른다)는 758 과 **같은 방향**이다(유입을 줄인다).`);
say('');

/* ────────────────────────────────────────────────────────────────────
   [F] 실제로 돌릴 수 있는 길 ① — «정책 평평» 축을 깎는다
   ⚠ [E] 의 ⓐⓑ 는 **한 정책의 기울기만** 흔든다. 제품의 상수는 그렇게 안 움직인다 —
      상수 하나를 내리면 두 정책이 **같이** 내려간다. 그래서 [E] 는 감각이고 [F] 가 처방이다.
   ──────────────────────────────────────────────────────────────────── */
const FLAT_TOL = 0.05;   /* 두 정책 차이가 5% 이내면 «정책 평평»(로그인만 하면 나오는 몫) */
const flat = rows.filter(x => Math.abs(x.gap) <= FLAT_TOL * Math.max(x.d, x.c) && x.c > 0);
const OWNER_FIXED = ['출석'];   /* 739 주인 확정 상수 — 손대면 지시 위반 */
const flatFree = flat.filter(x => !OWNER_FIXED.includes(x.k));
const poolD = flat.reduce((a, x) => a + x.d, 0), poolC = flat.reduce((a, x) => a + x.c, 0);
const freeD = flatFree.reduce((a, x) => a + x.d, 0), freeC = flatFree.reduce((a, x) => a + x.c, 0);

say('## [F] 처방 ① — «정책 평평» 축(로그인만 하면 나오는 몫)을 깎는다');
say('');
say(`정책 평평(차 ≤ ${(FLAT_TOL * 100).toFixed(0)}%) 축: **${flat.map(x => x.k).join(' · ')}**`);
say(`- 이 몫: 부지런 **${fmt(poolD)}**/일 (정상 기울기의 ${(poolD / contD * 100).toFixed(1)}%) · 대충 **${fmt(poolC)}**/일 (**${(poolC / contC * 100).toFixed(1)}%**)`);
say(`- 그중 **주인 확정 상수**(${OWNER_FIXED.join('·')} · 739)를 빼고 손댈 수 있는 몫: 부지런 ${fmt(freeD)} · 대충 **${fmt(freeC)}**/일`);
say('');
say('| 목표 비 | 평평 축에서 걷어내야 할 몫(대충 기준/일) | 손댈 수 있는 몫 대비 | 판정 |');
say('|---|---|---|---|');
for (const target of BAND) {
  /* 평평 축을 α 만큼 남기면 D' = D − (1−α)poolD · C' = C − (1−α)poolC · 비 = D'/C' */
  /* D − x·(poolD/poolC) = target·(C − x)  — 평평 축을 «대충 기준 x/일» 만큼 걷는다
     (같은 상수를 내리면 부지런은 그 축의 몫 비 g = poolD/poolC 만큼 같이 잃는다). */
  const g = poolD / poolC;
  const x = (contD - target * contC) / (g - target);
  const okFree = x > 0 && x <= freeC;
  const okAll = x > 0 && x <= poolC;
  say(`| **${target.toFixed(1)}** | ${fmt(x)}/일 (평평 몫의 ${(x / poolC * 100).toFixed(1)}%) | ${fmt(freeC)}/일 → **${(x / freeC * 100).toFixed(1)}%** | ${okFree ? '가능' : (okAll ? '⚠ 주인 확정 상수(출석)까지 건드려야 가능' : '**불가능**')} |`);
}
/* 손댈 수 있는 몫을 통째로 걷었을 때 얻는 비 */
const rFree = (contD - freeD) / (contC - freeC);
const rAll = (contD - poolD) / (contC - poolC);
say('');
say(`- 손댈 수 있는 평평 축(${flatFree.map(x => x.k).join('·')})을 **통째로 0 으로** 해도 비는 **${f3(rFree)}** — 창 하한까지 ${pct(BAND[0] / rFree - 1)} 모자란다.`);
say(`- 주인 확정 상수(${OWNER_FIXED.join('·')})까지 **전부** 0 으로 하면 **${f3(rAll)}** (창 ${rAll >= BAND[0] && rAll <= BAND[1] ? '안' : '밖'}).`);
say('');

/* ────────────────────────────────────────────────────────────────────
   [G] 실제로 돌릴 수 있는 길 ② — 총량을 안 늘리고 «평평 → 플레이량» 으로 옮긴다
   ──────────────────────────────────────────────────────────────────── */
say('## [G] ⚑ 처방 ② — 총량을 안 늘리고 **평평 축 → 플레이량 축**으로 옮긴다 (758 과 안 부딪히는 유일한 길)');
say('');
say('평평 축에서 x/일 을 걷어 **플레이량 축**(퀘스트(업적)·던전 — 대충이 부지런의 β 배만 받는 축)에 같은 양을 넣는다.');
say('부지런의 말미 수급은 그대로 두고(총 유입 불변) 대충만 내려간다 ⇒ 758 과 **같은 방향**이다.');
say('');
const betaOf = (k) => { const r = rows.find(x => x.k === k); return r && r.d > 0 ? r.c / r.d : 0; };
const BETAS = [
  { k: '퀘스트(일일)', b: betaOf('퀘스트(일일)') },
  { k: '퀘스트(업적)', b: betaOf('퀘스트(업적)') },
  { k: '던전', b: betaOf('던전') },
];
say('| 받는 축 | 대충 몫 β (대충/부지런) | 목표 1.8 에 필요한 이관량 | 목표 2.0 | 손댈 수 있는 평평 몫 ' + fmt(freeC) + '/일 대비 |');
say('|---|---|---|---|---|');
for (const B of BETAS) {
  const g = poolD / poolC;
  /* 평평에서 대충 기준 x 를 걷으면 부지런은 g·x 를 잃고, 받는 축에 부지런 기준 g·x 를 넣으면
     대충은 β·g·x 를 받는다 ⇒ D' = D · C' = C − x + β·g·x */
  const need = (t) => {
    const den = 1 - B.b * g;
    return den > 0 ? (contC - contD / t) / den : Infinity;
  };
  const x18 = need(1.8), x20 = need(2.0);
  say(`| ${B.k} | ${B.b.toFixed(3)} | ${fmt(x18)}/일 | ${fmt(x20)}/일 | **${Number.isFinite(x18) ? (x18 / freeC * 100).toFixed(1) + '%' : '—'}** / ${Number.isFinite(x20) ? (x20 / freeC * 100).toFixed(1) + '%' : '—'} |`);
}
say('');

if (ARG.out) {
  fs.writeFileSync(path.resolve(ROOT, String(ARG.out)), P.join('\n') + '\n');
  console.error('written: ' + ARG.out);
}

/* ⚑ 자(`verify758` [V])가 읽는 면. **값을 여기서 다시 계산하지 않는다** — 위에서 인쇄한
   것과 글자 그대로 같은 변수를 넘긴다(같은 자 하나). */
module.exports = {
  json: jf, days: DAYS, W, band: BAND, goal: GOAL_DIA,
  contD, contC,
  crossD: crossOf('diligent'), crossC: crossOf('casual'), ratio: R0,
  ratioAt: k => crossOf('casual', k) / crossOf('diligent', k),
  crossAt: (pol, k) => crossOf(pol, k),
  scaleMax: best.r, scaleMaxK: best.k, scaleLimit: limit,
  absW: ABSW, kHitRatio, kInAbs,
  axes: rows, flat, flatFree, poolD, poolC, freeD, freeC,
  ratioFlatFreeZero: rFree, ratioFlatAllZero: rAll,
  /* [G] 이관 — 받는 축 β 에서 목표 비 t 에 필요한 이관량(대충 기준/일) */
  moveNeed: (beta, t) => { const g = poolD / poolC, den = 1 - beta * g; return den > 0 ? (contC - contD / t) / den : Infinity; },
  betaOf,
};
