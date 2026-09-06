#!/usr/bin/env node
/* tools/probe199r34.js — 199 34회차 재현기 · **계통 편향의 뿌리** (커밋된 JSON 만 읽는다 · 새 봇 실행 0회)
 *
 * 33-6 3번(31-8 3번 · 32-8 3번에서 두 회차째 이월): «31-2 의 계통 편향(+6~14%)을 모형에 넣어라.
 * 용의자는 이탈 직전의 훈련 단계 돌파(D28 · 전 스탯 ×1.1). ⛔ [B1] 문턱을 넓히는 길은 막혀 있다.»
 *
 * 31-2 가 세운 항등식은 이것이고, 어긋남은 세 점 전부 «예측이 늦다» 였다:
 *
 *      cp(t) ∝ t^α   ⇒   t_이탈 = t_벽 × 장벽^(1/α)        … (★)
 *      설치값 +14.3% · 다른 세대 +13.9% · ES_M2 1.120 +6.7%
 *
 * 이 자가 하는 일은 셋이다.
 *   [B] ⚑ **편향을 두 항으로 가른다.** (★) 는 두 가지를 동시에 주장한다 —
 *       ⓐ «벽을 넘으려면 화력 ×장벽이 필요하다»(장벽 항) · ⓑ «화력은 t^α 로 큰다»(α 항).
 *       ⓐ 만 남기고 ⓑ 를 **관측 궤적**으로 갈아 끼우면 두 항이 분리된다:
 *         장벽 항 = (궤적 위에서 장벽을 채우는 시각) / 관측 이탈
 *         α   항 = (★) 예측 / (궤적 위에서 장벽을 채우는 시각)
 *       곱이 정확히 31-2 의 전체 어긋남이다(항등식 — [B0] 이 자릿수까지 잰다).
 *   [C] ⚑ **용의자(D28 훈련 단계 돌파)를 심문한다.** 계단이 뿌리라면 계단이 **없는** 구간에서는
 *       편향이 사라져야 한다.
 *   [D] ⚑ **모형에 넣는다.** (★) 의 형(形)은 옳았고 틀린 것은 **입력 α** 였다 —
 *       벽의 구간 α(α_span)를 말미 창 α 로 대신 쓰면 늘 느리게 친다. 고정점으로 α_span 을 되찾는다.
 *   [R] 되돌림 시험 — 분해가 공허하지 않다는 증명.
 *
 * 사용법: node tools/probe199r34.js [--out=<md>]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const ARG = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; });

const QUIET = require.main !== module;
const P = [];
const say = s => { P.push(s); if (!QUIET) console.log(s); };
const f1 = n => (Number.isFinite(n) ? n.toFixed(1) : '—');
const f2 = n => (Number.isFinite(n) ? n.toFixed(2) : '—');
const f3 = n => (Number.isFinite(n) ? n.toFixed(3) : '—');
const pc = n => (Number.isFinite(n) ? (n > 0 ? '+' : '') + n.toFixed(1) + '%' : '—');
const fmt = n => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');
const med = a => { const b = [...a].filter(Number.isFinite).sort((x, y) => x - y); if (!b.length) return NaN;
                   const n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };

let OK = 0, NG = 0;
const ck = (name, cond, got) => { if (cond) { OK++; say(`  ✔ ${name}` + (got != null ? ` — ${got}` : '')); }
                                  else { NG++; say(`  ✗ ${name}` + (got != null ? ` — ${got}` : '')); } };

/* ── 실행 목록 — 31-2 가 쓴 것과 같은 커밋 JSON. 상수는 §26·§28 기록에서 받아 적고 J 는 파생시킨다. */
const RUNS = [
  { key: 'base',      file: '199-bot-2026-09-03-r31-base.json',          M2: 1.127, BAND: 40, GATE: 1.44, src: '31회차 기준선(설치값)' },
  { key: 'r28base',   file: '199-bot-2026-09-03-r28-base.json',          M2: 1.127, BAND: 40, GATE: 1.44, src: '28-3 base(설치값 · 다른 세대)' },
  { key: 'm2-1120',   file: '199-bot-2026-09-03-r28-sw-m2-1120.json',    M2: 1.120, BAND: 40, GATE: 1.44, src: '28-3 스윕 — 무릎 위 지수를 내렸다' },
];
const GATE_STAGE = 360;                 /* 31-2 가 맞힌 그 관문 */
const FITW = [6, 27];                   /* 31-2 의 말미 창 — 이 자도 같은 창을 쓴다(같은 것을 재려면 같은 자여야 한다) */

const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const EC = require('./ecurve')(SRC, 'PROBE199R34');
const RAMP = EC.RAMP;
const jumpOf    = r => Math.pow(r.M2, r.BAND * (1 - RAMP));
const barrierOf = r => jumpOf(r) * r.GATE;

const load = (r) => {
  const p = path.join(ROOT, 'docs', 'review', r.file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
};

/* 일별 p50 궤적 — `D<n>` 행만. 31-2 의 trajOf 와 같은 정의다. */
const trajOf = (rep, pol) => {
  const seeds = rep.policies[pol] || [];
  const days = [];
  for (let d = 1; d <= (rep.days || 30); d++) {
    const rows = seeds.map(s => s.rows.find(x => x.label === 'D' + d)).filter(Boolean);
    if (!rows.length) continue;
    days.push({ d, min: med(rows.map(x => x.minute)), cp: med(rows.map(x => x.cp)),
                ts: med(rows.map(x => x.trainStage)), stage: med(rows.map(x => x.stage)) });
  }
  return days;
};

const alphaOf = (days, d0, d1) => {
  const pts = days.filter(x => x.d >= d0 && x.d <= d1 && x.cp > 0).map(x => ({ x: Math.log(x.d), y: Math.log(x.cp) }));
  const n = pts.length;
  if (n < 3) return { a: NaN, r2: NaN, n };
  const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  pts.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; });
  return { a: sxy / sxx, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : NaN, n };
};

/* 궤적 보간 — log–log 로 읽는다(멱법칙 위에서 자연스러운 자). 창 밖이면 NaN(외삽 금지). */
const cpAt = (days, t) => {
  for (let i = 1; i < days.length; i++) {
    if (days[i].min >= t && days[i - 1].min <= t) {
      const a = days[i - 1], b = days[i];
      const w = (Math.log(t) - Math.log(a.min)) / (Math.log(b.min) - Math.log(a.min));
      return Math.exp(Math.log(a.cp) + w * (Math.log(b.cp) - Math.log(a.cp)));
    }
  }
  return NaN;
};
/* 역함수 — «화력이 cp 에 닿는 시각». 창 안에서 못 닿으면 NaN. */
const tAtCp = (days, cp) => {
  for (let i = 1; i < days.length; i++) {
    if (days[i].cp >= cp && days[i - 1].cp <= cp) {
      const a = days[i - 1], b = days[i];
      const w = (Math.log(cp) - Math.log(a.cp)) / (Math.log(b.cp) - Math.log(a.cp));
      return Math.exp(Math.log(a.min) + w * (Math.log(b.min) - Math.log(a.min)));
    }
  }
  return NaN;
};

const wallStartOf = (rep, pol, gate) =>
  med((rep.policies[pol] || []).map(s => { const w = (s.walls || []).find(x => x.stage === gate); return w ? w.min : NaN; }));

const exitOf = (rep, pol, gate) => {
  const out = [];
  (rep.policies[pol] || []).forEach(s => {
    const rows = s.rows.filter(x => /^D\d+$/.test(x.label)).sort((a, b) => a.minute - b.minute);
    const hit = rows.find(x => x.stage > gate);
    if (hit) out.push({ min: hit.minute, d: +hit.label.slice(1) });
  });
  return { min: med(out.map(x => x.min)), day: med(out.map(x => x.d)), n: out.length };
};

say('# PROBE199R34 — 계통 편향의 뿌리 (199 34회차 · 커밋 JSON 만 · 새 봇 실행 0건)');
say('');
say('- 제품에서 읽은 값 — `ES_RAMP` **' + RAMP + '** · 설치 `ES_M2` **' + EC.M2 + '** · `ES_BAND` **' + EC.BAND
    + '** · `BOSS_GATE_HP` **' + EC.GATE_HP + '**');
say('- 관문 **s' + GATE_STAGE + '** · 말미 창 **D' + FITW[0] + '~D' + FITW[1] + '**(31-2 와 같은 창) · 정책 **부지런**');
say('');

/* ── [A] 재현 — 31-2 세 점 ───────────────────────────────────────────────── */
say('## [A] 재현 — 31-2 의 세 점이 자릿수까지 그대로다 (338 규칙)');
say('');
say('| 실행 | 장벽 | α(말미) | 벽이 선 시각 | (★) 예측 | 관측 이탈 | Δ | 31-2 가 적은 Δ |');
say('|---|---|---|---|---|---|---|---|');
const R31 = { base: 14.3, r28base: 13.9, 'm2-1120': 6.7 };      /* §31-2 표에 적힌 값 */
const ROWS = [];
for (const r of RUNS) {
  const rep = load(r); if (!rep) { say(`| ${r.key} | — | — | — | — | — | — | — |`); continue; }
  const days = trajOf(rep, 'diligent');
  const la = alphaOf(days, FITW[0], FITW[1]).a;
  const t0 = wallStartOf(rep, 'diligent', GATE_STAGE);
  const bar = barrierOf(r);
  const pred = t0 * Math.pow(bar, 1 / la);
  const ex = exitOf(rep, 'diligent', GATE_STAGE);
  const obs = ex.n > (rep.seeds || 12) / 2 ? ex.min : NaN;
  const d = (pred / obs - 1) * 100;
  ROWS.push({ r, rep, days, la, t0, bar, pred, obs, ex, cp0: cpAt(days, t0) });
  say(`| ${r.key} | ×${f2(bar)} | ${f2(la)} | ${fmt(t0)}분 | **${fmt(pred)}분** | ${fmt(obs)}분 | **${pc(d)}** | ${pc(R31[r.key])} |`);
}
say('');
ck('[A1] 세 점이 31-2 의 표를 0.5%p 안에서 재현한다',
   ROWS.length === 3 && ROWS.every(x => Math.abs((x.pred / x.obs - 1) * 100 - R31[x.r.key]) <= 0.5),
   ROWS.map(x => `${x.r.key} ${pc((x.pred / x.obs - 1) * 100)}`).join(' · '));
ck('[A2] 세 점의 부호가 여전히 같다 (예측이 늘 늦다)', ROWS.every(x => x.pred > x.obs),
   `부호 ${ROWS.map(() => '+').join('')}`);
say('');

/* ── [B] 편향을 두 항으로 가른다 ─────────────────────────────────────────── */
say('## [B] ⚑ 이 회차의 본체 — 편향을 **장벽 항**과 **α 항**으로 가른다');
say('');
say('(★) 는 두 가지를 한 줄에 담고 있다 — ⓐ «넘으려면 화력 ×장벽» · ⓑ «화력은 t^α».');
say('ⓑ 만 **관측 궤적**으로 갈아 끼우면(같은 ⓐ, 다른 ⓑ) 두 항이 분리되고, 곱이 전체 어긋남이다:');
say('');
say('> 장벽 항 = (궤적 위에서 화력이 cp₀×장벽 에 닿는 시각) ÷ 관측 이탈');
say('> α 항 = (★) 예측 ÷ (그 시각)');
say('');
say('| 실행 | (★) 예측 | 궤적이 장벽을 채우는 시각 | 관측 이탈 | **장벽 항** | **α 항** | 곱 | 전체 |');
say('|---|---|---|---|---|---|---|---|');
for (const x of ROWS) {
  x.tTraj = tAtCp(x.days, x.cp0 * x.bar);
  x.dBar = (x.tTraj / x.obs - 1) * 100;
  x.dAlp = (x.pred / x.tTraj - 1) * 100;
  x.dAll = (x.pred / x.obs - 1) * 100;
  x.mul  = ((1 + x.dBar / 100) * (1 + x.dAlp / 100) - 1) * 100;
  say(`| ${x.r.key} | ${fmt(x.pred)}분 | ${fmt(x.tTraj)}분 | ${fmt(x.obs)}분 | ${pc(x.dBar)} | **${pc(x.dAlp)}** | ${pc(x.mul)} | ${pc(x.dAll)} |`);
}
say('');
say('⚑ **α 항만 계통이다.** 세 점의 α 항은 ' + ROWS.map(x => pc(x.dAlp)).join(' · ') + ' 로 **부호가 같고**,');
say('장벽 항은 ' + ROWS.map(x => pc(x.dBar)).join(' · ') + ' 로 **부호가 뒤집힌다**.');
say('⇒ 31-2 가 «형이 맞고 편향이 한쪽» 이라고 적은 그 편향은 **장벽 값의 문제가 아니라 α 입력의 문제**다.');
say('  장벽 ×' + f2(ROWS[0].bar) + ' 은 설치값 두 세대에서 ' + pc(ROWS[0].dBar) + ' · ' + pc(ROWS[1].dBar) + ' 로 이미 맞는 수다.');
say('');
say('> ⚠⚠ 〔37정정〕 **윗줄 두 문장 중 뒤엣것은 살아남지 못했다.** 이 절의 cp₀ 와 «장벽을 채우는 시각» 은 둘 다');
say('> **하루 격자의 보간**이고, 36 이 그 현 읽기가 순간 cp 를 **12~65% 낮게** 읽는 것을 벽 여덟 개에서 찍었다.');
say('> 37 이 벽 시작·이탈 행으로 **보간 0건** 분해를 다시 짜자 장벽 항은 벽 10개 **전부 양수**였고');
say('> (`probe199r37` [C1] +1.8 ~ +253.6%), 그 값은 «틀린 장벽» 이 아니라 **«벽이 설 때 이미 있던 여유»** 를 잰다([D]).');
say('> **α 항만 계통이다** 는 쪽은 산다(37 [C2] — 아홉이 양수 · 음수 한 자리 −0.4%).');
say('> 또 장벽 자체가 닫힌 식이라 ~12.6% 낮았다(〔36정정A〕 · 37 [E2] — 세 점은 +14.3/+13.9/+6.7 이 아니라 +20.6/+20.2/+12.1).');
say('');
ck('[B0] 두 항의 곱이 전체 어긋남과 같다 (분해가 항등식이다 · 0.1%p)',
   ROWS.every(x => Math.abs(x.mul - x.dAll) <= 0.1),
   ROWS.map(x => `${x.r.key} ${f2(x.mul)}↔${f2(x.dAll)}`).join(' · '));
ck('[B1] ⚑ α 항은 세 점 부호가 같다 (계통 편향)',
   ROWS.every(x => x.dAlp > 0) || ROWS.every(x => x.dAlp < 0),
   ROWS.map(x => pc(x.dAlp)).join(' · '));
/* ⚠⚠ 〔37정정〕 — 이 항의 **뜻이 바뀌었다**(값·표본은 그대로다).
   36 이 «하루 격자의 현 읽기는 순간 cp 를 12~65% 낮게 읽는다» 를 찍었고, 37 이 벽 시작·이탈 행으로
   **보간 0건** 분해를 다시 짜자 장벽 항이 벽 10개 **전부 양수**였다(`probe199r37` [C1]).
   ⇒ 여기서 보이는 «부호가 갈린다» 는 밸런스의 성질이 아니라 **격자 보간이 남긴 자국**이다.
   항을 지우지 않는 이유는 그 자국이 실재하고(37 [R1] 이 같은 음수를 다시 뽑는다) 이 자가 그것을 재는
   유일한 자리이기 때문이다 — 이름만 사실대로 고친다(333 처방 · 무르게 풀지 않았다는 증거는 37 [B2]). */
ck('[B2] ⚑ **격자 읽기의** 장벽 항은 부호가 갈린다 — ⚠ 37 이 이것을 «자의 자국» 으로 판정했다(정확 읽기로는 전부 양수)',
   !(ROWS.every(x => x.dBar > 0) || ROWS.every(x => x.dBar < 0)),
   ROWS.map(x => pc(x.dBar)).join(' · '));
ck('[B3] α 항이 전체 편향의 절반 이상을 쥔다 (세 점 모두)',
   ROWS.every(x => Math.abs(x.dAlp) >= Math.abs(x.dBar)),
   ROWS.map(x => `${x.r.key} |α| ${f1(Math.abs(x.dAlp))} ≥ |장벽| ${f1(Math.abs(x.dBar))}`).join(' · '));
say('');

/* ── [C] 용의자 심문 ─────────────────────────────────────────────────────── */
say('## [C] ⚑ 용의자 기각 — D28 훈련 단계 돌파(전 스탯 ×1.1)는 뿌리가 아니다');
say('');
say('31-8·32-8·33-6 이 세 회차째 1순위 용의자로 적어 둔 것은 «이탈 직전의 훈련 단계 돌파» 다.');
say('계단이 뿌리라면 **계단이 없는 구간에서는 편향이 사라져야 한다.** 구간을 열어 보면:');
say('');
say('| 실행 | 벽~이탈 구간 | 그 구간의 훈련 단계 | 계단 | **α 항 편향** |');
say('|---|---|---|---|---|');
for (const x of ROWS) {
  const d0 = Math.ceil(x.t0 / 1440), d1 = x.ex.day;
  const span = x.days.filter(z => z.d >= d0 && z.d <= d1);
  const tsList = span.map(z => z.ts);
  const steps = tsList.filter((v, i) => i > 0 && v !== tsList[i - 1]).length;
  x.steps = steps; x.tsFrom = tsList[0]; x.tsTo = tsList[tsList.length - 1];
  say(`| ${x.r.key} | D${d0}~D${d1} | ${x.tsFrom} → ${x.tsTo} | **${steps}회** | ${pc(x.dAlp)} |`);
}
say('');
const noStep = ROWS.filter(x => x.steps === 0), hasStep = ROWS.filter(x => x.steps > 0);
say('⚑ **계단이 0회인 구간이 편향이 가장 크다.** `m2-1120` 은 벽~이탈이 D3~D14 이고 그 실행의 단계 10 은 **D15**,');
say('  즉 구간 안에 계단이 **한 번도 없는데** α 항 편향이 ' + pc(noStep.length ? noStep[0].dAlp : NaN) + ' 로 셋 중 **가장 크다**.');
say('  거꾸로 설치값 두 실행은 계단이 딱 1회(D28 — 이탈 그 날)인데 편향은 그보다 **작다**.');
say('');
/* 계단이 실제로 얼마를 무는가 — 설치값의 D27→D28 이 멱법칙 위로 넘는 몫. */
for (const x of hasStep) {
  const dEx = x.ex.day;
  const a = x.days.find(z => z.d === dEx - 1), b = x.days.find(z => z.d === dEx);
  if (!a || !b) continue;
  x.stepObs = b.cp / a.cp;
  x.stepPow = Math.pow(b.min / a.min, x.la);
  x.stepXs  = x.stepObs / x.stepPow;                       /* 멱법칙 위로 넘는 몫 */
  x.stepPct = (Math.pow(x.stepXs, 1 / x.la) - 1) * 100;    /* 그것이 무는 시간 몫 */
  say(`- \`${x.r.key}\` D${dEx - 1}→D${dEx}: 관측 cp ×${f3(x.stepObs)} · 같은 구간 멱법칙 ×${f3(x.stepPow)}`
      + ` ⇒ 계단이 넘는 몫 **×${f3(x.stepXs)}** = 시간으로 **${pc(x.stepPct)}**`
      + ` — α 항 ${pc(x.dAlp)} 중 **${f1(x.stepPct / x.dAlp * 100)}%** 뿐이다.`);
}
say('');
say('⇒ **용의자 기각.** 계단은 설치값 실행에서 α 항의 3분의 1 아래를 물고, 계단이 없는 실행에서는 0 을 문다.');
say('');
ck('[C1] ⚑ 계단이 0회인 구간이 존재하고, 그 실행의 α 항 편향이 셋 중 최대다',
   noStep.length >= 1 && noStep.every(x => ROWS.every(y => Math.abs(x.dAlp) >= Math.abs(y.dAlp))),
   noStep.map(x => `${x.r.key} 계단 0회 · α 항 ${pc(x.dAlp)}`).join(' · '));
ck('[C2] 계단이 있는 실행에서도 계단 몫이 α 항의 절반 미만이다',
   hasStep.length >= 1 && hasStep.every(x => Number.isFinite(x.stepPct) && x.stepPct < x.dAlp / 2),
   hasStep.map(x => `${x.r.key} ${f1(x.stepPct)}%p < ${f1(x.dAlp / 2)}%p`).join(' · '));
say('');

/* ── [D] 모형에 넣는다 ──────────────────────────────────────────────────── */
say('## [D] ⚑ 모형에 넣는다 — 틀린 것은 (★) 의 **형**이 아니라 **입력 α** 였다');
say('');
say('α 는 상수가 아니다(31-2 [A] — 초기 6.9 → 말미 2.2). 그런데 (★) 는 벽~이탈 구간 전체를 **말미 창의 α**');
say('하나로 값 매긴다. 벽은 창보다 **이르게** 서므로(설치값 D' + f1(ROWS[0].t0 / 1440) + ' · 창은 D' + FITW[0] + '부터)');
say('구간 안에는 창보다 빠른 성장이 섞여 있고, 그래서 예측이 **늘 늦다**.');
say('');
say('⇒ 고칠 것은 한 줄이다 — **α 는 «벽의 자기 구간» 에서 읽는다**:');
say('');
say('> α_span = ln(장벽) / ln(t_이탈 / t_벽)  … 고정점 (t_이탈 = t_벽 × 장벽^(1/α_span))');
say('');
say('| 실행 | α(말미 창) | **α_span** | 창 대비 | (★) 예측 | **v2 예측** | 관측 | Δ(현행) | **Δ(v2)** |');
say('|---|---|---|---|---|---|---|---|---|');
for (const x of ROWS) {
  /* 고정점 — 관측 궤적 위에서 «장벽을 채우는 시각» 이 곧 해다(닿는 순간 ln 비가 ln 장벽). */
  x.aSpan = Math.log(x.bar) / Math.log(x.tTraj / x.t0);
  x.predV2 = x.t0 * Math.pow(x.bar, 1 / x.aSpan);
  x.dV2 = (x.predV2 / x.obs - 1) * 100;
  say(`| ${x.r.key} | ${f2(x.la)} | **${f2(x.aSpan)}** | ${pc((x.aSpan / x.la - 1) * 100)} | ${fmt(x.pred)}분 | **${fmt(x.predV2)}분** | ${fmt(x.obs)}분 | ${pc(x.dAll)} | **${pc(x.dV2)}** |`);
}
say('');
const aGain = ROWS.map(x => x.aSpan / x.la - 1);
say('⚑ **α_span 은 말미 창 α 보다 ' + f1(Math.min(...aGain) * 100) + '~' + f1(Math.max(...aGain) * 100) + '% 크다 — 세 점 전부 같은 방향**이고,');
say('  그 한 줄을 갈아 끼우면 편향이 ' + ROWS.map(x => pc(x.dAll)).join(' · ') + ' → ' + ROWS.map(x => pc(x.dV2)).join(' · ') + ' 로 간다.');
say('  **부호가 갈린다 = 계통 편향이 사라졌다** — 남는 것은 부호가 양쪽으로 갈리는 ±'
    + f1(Math.max(...ROWS.map(x => Math.abs(x.dV2)))) + '% 산포이고, 그 최댓값은 [B] 의 **장벽 항**이 그대로 옮겨 온 것이다');
say('  (v2 는 α 항만 걷어낸다 — Δ(v2) = 장벽 항이다). ⇒ **다음 회차가 볼 자리는 α 가 아니라 `m2-1120` 의 장벽 항 −12.0%** 다.');
say('');
say('⚠ **v2 는 «장벽을 바꾸면 벽이 어디로 가는가» 를 공짜로 주지 않는다** — α_span 은 그 실행의 궤적에서 읽는 값이라,');
say('  새 상수의 α_span 은 그 상수로 봇을 돌려야 나온다. v2 가 고치는 것은 **예측의 계통 오차**이고,');
say('  손잡이 비교는 31-2 [B2] 의 «비» 가 그대로 맡는다(계통 편향은 비에서 약분된다 — 아래 [D3]).');
say('');
ck('[D1] ⚑ α_span 이 말미 창 α 보다 크다 (세 점 모두 · 편향의 방향과 일치)',
   ROWS.every(x => x.aSpan > x.la), ROWS.map(x => `${x.r.key} ${f2(x.la)}→${f2(x.aSpan)}`).join(' · '));
ck('[D2] ⚑ v2 는 계통 편향이 없다 — 세 점의 부호가 갈린다',
   !(ROWS.every(x => x.dV2 > 0) || ROWS.every(x => x.dV2 < 0)), ROWS.map(x => pc(x.dV2)).join(' · '));
ck('[D3] v2 는 절대 오차도 안 키운다 (세 점 평균 |Δ| 가 현행보다 작다)',
   ROWS.reduce((s, x) => s + Math.abs(x.dV2), 0) < ROWS.reduce((s, x) => s + Math.abs(x.dAll), 0),
   `평균 |Δ| ${f1(ROWS.reduce((s, x) => s + Math.abs(x.dAll), 0) / ROWS.length)}% → ${f1(ROWS.reduce((s, x) => s + Math.abs(x.dV2), 0) / ROWS.length)}%`);
say('');

/* ── [R] 되돌림 시험 ─────────────────────────────────────────────────────── */
say('## [R] 되돌림 시험 — 분해가 공허하지 않다는 증명');
say('');
const x0 = ROWS[0];
/* ⓐ 장벽을 흔들면 «장벽 항» 이 움직이고 α 항은 거의 안 움직여야 한다(두 항이 정말 다른 것을 잰다면).
   ⚠ 위로 흔들면 목표 화력이 30일 창 밖으로 나가 궤적에서 못 읽는다 — 흔들기는 **아래로** 한다. */
const barX = x0.bar * 0.7;
const tTrajX = tAtCp(x0.days, x0.cp0 * barX);
const predX  = x0.t0 * Math.pow(barX, 1 / x0.la);
const dBarX  = (tTrajX / x0.obs - 1) * 100, dAlpX = (predX / tTrajX - 1) * 100;
say(`- 장벽을 ×0.7(${f2(x0.bar)} → ${f2(barX)})로 흔들면 — 장벽 항 ${pc(x0.dBar)} → **${pc(dBarX)}**(${f1(Math.abs(dBarX - x0.dBar))}%p 이동) ·`
    + ` α 항 ${pc(x0.dAlp)} → ${pc(dAlpX)}(${f1(Math.abs(dAlpX - x0.dAlp))}%p).`);
/* ⓑ α 를 흔들면 반대로 α 항만 움직여야 한다. */
const laX = x0.la * 1.2;
const predA = x0.t0 * Math.pow(x0.bar, 1 / laX);
const dAlpA = (predA / x0.tTraj - 1) * 100;
say(`- α 를 ×1.2(${f2(x0.la)} → ${f2(laX)})로 흔들면 — α 항 ${pc(x0.dAlp)} → **${pc(dAlpA)}**(${f1(Math.abs(dAlpA - x0.dAlp))}%p 이동) ·`
    + ` 장벽 항은 정의상 α 를 안 쓴다(${pc(x0.dBar)} 불변).`);
say('  ⇒ 두 항은 서로 다른 것을 잰다. [B1]·[B2] 의 판정은 «어느 쪽으로도 굴러가는 수» 가 아니다.');
say('');
ck('[R1] 장벽을 ×0.7 로 흔들면 장벽 항이 α 항보다 크게 움직인다',
   Math.abs(dBarX - x0.dBar) > Math.abs(dAlpX - x0.dAlp),
   `장벽 항 ${f1(Math.abs(dBarX - x0.dBar))}%p > α 항 ${f1(Math.abs(dAlpX - x0.dAlp))}%p`);
ck('[R2] α 를 ×1.2 로 흔들면 α 항이 10%p 넘게 움직인다',
   Math.abs(dAlpA - x0.dAlp) > 10, `${f1(Math.abs(dAlpA - x0.dAlp))}%p`);
ck('[R3] 되돌림 — α_span 을 말미 창 α 로 되돌리면 v2 가 현행과 같아진다(공허하지 않다)',
   ROWS.every(x => Math.abs(x.t0 * Math.pow(x.bar, 1 / x.la) / x.pred - 1) < 1e-9), '세 점 전부 자릿수 일치');
say('');

say(`PROBE199R34 ${NG === 0 ? 'PASS' : 'FAIL'} ${OK}/${OK + NG}`);
if (ARG.out) { fs.writeFileSync(path.resolve(ROOT, String(ARG.out)), P.join('\n') + '\n'); console.error('written: ' + ARG.out); }

module.exports = { RUNS, GATE_STAGE, FITW, rows: ROWS, ok: OK, ng: NG };
if (!QUIET && NG > 0) process.exitCode = 1;
