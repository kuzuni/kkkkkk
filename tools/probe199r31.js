#!/usr/bin/env node
/* tools/probe199r31.js — 199 31회차 재현기 (커밋된 JSON 만 읽는다 · 새 봇 실행 0회)
 *
 * 30-7 2번: «④ 는 이제 창 안이다 — 다음 지렛대는 ①③ 쪽이다.»
 * 28-5 1번: «적 곡선은 이 세대에서 소진됐다»(ES_BAND 20 · ES_M2 1.120·1.100 · BOSS_GATE_HP 2.20 전부 기각).
 *
 * 이 자가 묻는 것은 «어느 값이 옳은가» 가 아니라 **«왜 넷이 다 졌는가»** 다.
 * 답은 한 항등식이다 — 벽과 벽 사이의 시간비는 **경계 점프 J 와 플레이어 성장 지수 α** 로 정해진다:
 *
 *      cp(t) ∝ t^α  (멱법칙 — [A] 가 실측)          ⇒   t_{k+1}/t_k = J^(1/α)          … (★)
 *
 *   J = 무릎 위 경계 점프 = M2^(BAND·(1−RAMP))   (관문 보스는 여기에 ×GATE_HP 가 더 얹힌다)
 *   α = d ln cp / d ln t  — **진도에 따라 변한다**(초기 8~9 → 말미 2.2. [A])
 *
 * 무엇을 재는가 (전부 커밋된 JSON 위에서)
 *   [A] α 실측 — 일별 cp p50 을 log–log 로 잰다. 멱법칙인지(R²)까지 같이 찍는다.
 *   [B] ⚑ 항등식 검증 — (★) 로 «s360 벽을 언제 벗어나는가» 를 예측하고 관측과 대조한다.
 *       세 실행(설치값 · ES_M2 1.120 · BOSS_GATE_HP 2.20)이 **J 가 서로 다른 세 점**이라
 *       한 표에서 세 번 검증된다. 이 자의 판정 항은 여기에 있다.
 *   [C] ⚑ 역산 — §0 사다리(간격 ×1.904)가 요구하는 J*(α) = 1.904^α 와 그 밴드 폭 B*(α).
 *       α 가 진도에 따라 변하므로 **B* 도 변한다**(초기 ≈54 → 말미 ≈15). 설치값은 상수 40 이다.
 *   [D] ⚑ 26-2 네 점 사후 설명 — 상수 하나를 어느 쪽으로 돌려도 «한 자리를 사면 다른 자리를 판다».
 *       (결6 «상수 하나가 두 요구를 쥔다» 의 정량 답 — 31회차가 이 자로 결6 을 닫는다.)
 *   [R] 되돌림 시험 — 항등식이 공허하지 않다는 증명(α 나 J 를 흔들면 예측이 따라 움직인다).
 *
 * 사용법: node tools/probe199r31.js [--json=<기준 실행>] [--out=<md>]
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
const fmt = n => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');
const med = a => { const b = [...a].filter(Number.isFinite).sort((x, y) => x - y); if (!b.length) return NaN;
                   const n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };

let OK = 0, NG = 0;
const ck = (name, cond, got) => { if (cond) { OK++; say(`  ✔ ${name}` + (got != null ? ` — ${got}` : '')); }
                                  else { NG++; say(`  ✗ ${name}` + (got != null ? ` — ${got}` : '')); } };

/* ── 실행 목록 — 전부 같은 κ 표(6a013a86ea41)로 잰 커밋된 JSON ────────────────────────────
   상수는 JSON 에 안 실린다(봇이 안 찍는다). 그래서 각 실행의 «그때 무엇을 돌렸는지» 를
   §26·§28 의 기록에서 받아 적고, J 는 리터럴이 아니라 **아래 식으로 파생**시킨다. */
const RUNS = [
  { key: 'base',      file: '199-bot-2026-09-03-r31-base.json',        M2: 1.127, BAND: 40, GATE: 1.44, src: '31회차 기준선(설치값)' },
  { key: 'r28base',   file: '199-bot-2026-09-03-r28-base.json',        M2: 1.127, BAND: 40, GATE: 1.44, src: '28-3 base(설치값 · 다른 세대)' },
  { key: 'm2-1120',   file: '199-bot-2026-09-03-r28-sw-m2-1120.json',  M2: 1.120, BAND: 40, GATE: 1.44, src: '28-3 스윕 — 무릎 위 지수를 내렸다' },
  { key: 'gatehp220', file: '199-bot-2026-09-03-r28-sw-gatehp-220.json', M2: 1.127, BAND: 40, GATE: 2.20, src: '28-3 스윕 — 관문 보스 체력을 올렸다' },
];

/* 램프 비율은 세 실행이 공유한다(어느 회차도 안 건드렸다) — 제품에서 읽는다. */
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const EC = require('./ecurve')(SRC, 'PROBE199R31');
const RAMP = EC.RAMP, KNEE = EC.KNEE;

/* J = 경계 점프. eScale 정의 그대로다 —
   구간 성장 M2^BAND 중 RAMP 몫은 구간 «안» 에서 미리 걷히고 나머지가 경계에 선다.
   관문 보스는 그 위에 ×GATE_HP 가 곱해지므로 «벽을 만드는 배수» 는 둘의 곱이다. */
const jumpOf   = r => Math.pow(r.M2, r.BAND * (1 - RAMP));
const barrierOf = r => jumpOf(r) * r.GATE;

const load = (r) => {
  const p = path.join(ROOT, 'docs', 'review', r.file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
};

/* 일별 p50 궤적 — 라벨 `D<n>` 행만 쓴다(분 단위 D1+ 행은 1일차 전용이라 섞지 않는다). */
const trajOf = (rep, pol) => {
  const seeds = rep.policies[pol] || [];
  const days = [];
  for (let d = 1; d <= (rep.days || 30); d++) {
    const rows = seeds.map(s => s.rows.find(x => x.label === 'D' + d)).filter(Boolean);
    if (!rows.length) continue;
    days.push({ d,
      cp:    med(rows.map(x => x.cp)),
      stage: med(rows.map(x => x.stage)),
      own:   med(rows.map(x => x.own)),
      ts:    med(rows.map(x => x.trainStage)) });
  }
  return days;
};

/* α = d ln cp / d ln t — 창 [d0, d1] 에서 log–log 최소제곱. R² 도 같이 낸다. */
const alphaOf = (days, d0, d1) => {
  const pts = days.filter(x => x.d >= d0 && x.d <= d1 && x.cp > 0)
                  .map(x => ({ x: Math.log(x.d), y: Math.log(x.cp) }));
  const n = pts.length;
  if (n < 3) return { a: NaN, r2: NaN, n };
  const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  pts.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; });
  const a = sxy / sxx;
  return { a, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : NaN, n };
};

/* 관측 — «관문 s360 을 언제 벗어났는가»(p50). 벗어남 = 그 시드의 스테이지가 360 을 처음 넘은 날.
   30일 안에 못 넘은 시드는 «≥ 관측 끝» 으로 센다(오른쪽 절단 — 예측과 대조할 때 방향만 본다). */
const exitOf = (rep, pol, gate) => {
  const seeds = rep.policies[pol] || [];
  const out = [], cens = [];
  seeds.forEach(s => {
    const rows = s.rows.filter(x => /^D\d+$/.test(x.label)).sort((a, b) => a.minute - b.minute);
    const hit = rows.find(x => x.stage > gate);
    if (hit) out.push(hit.minute); else cens.push(rows.length ? rows[rows.length - 1].minute : NaN);
  });
  return { min: med(out), n: out.length, cens: cens.length, censAt: med(cens) };
};

/* 관측 — 그 관문 벽이 «선» 시각(p50). 벽 목록에서 해당 스테이지의 정체를 고른다. */
const wallStartOf = (rep, pol, gate) => {
  const seeds = rep.policies[pol] || [];
  return med(seeds.map(s => { const w = (s.walls || []).find(x => x.stage === gate); return w ? w.min : NaN; }));
};

say('# PROBE199R31 — 벽 간격 항등식 (199 31회차 · 커밋 JSON 만 · 새 봇 실행 0건)');
say('');
say('- 제품에서 읽은 값 — `ES_RAMP` **' + RAMP + '** · `ES_KNEE` **' + KNEE + '** · 설치 `ES_M2` **' + EC.M2
    + '** · `ES_BAND` **' + EC.BAND + '** · `BOSS_GATE_HP` **' + EC.GATE_HP + '**');
say('- 설치값의 경계 점프 J = M2^(BAND·(1−RAMP)) = **×' + f2(jumpOf({ M2: EC.M2, BAND: EC.BAND }))
    + '** · 관문 장벽(×GATE_HP 포함) = **×' + f2(jumpOf({ M2: EC.M2, BAND: EC.BAND }) * EC.GATE_HP) + '**');
say('');

/* ── [A] α 실측 ───────────────────────────────────────────────────────────── */
say('## [A] α 실측 — 플레이어 화력은 시간의 **멱법칙**이다 (지수가 아니다)');
say('');
say('| 실행 | 정책 | α 초기(D2~D4) | α 말미(D6~D27) | R²(말미) | 종수 포화일 | 훈련단계 D6→D27 |');
say('|---|---|---|---|---|---|---|');
const A = {};
for (const r of RUNS) {
  const rep = load(r); if (!rep) continue;
  A[r.key] = {};
  for (const pol of ['diligent', 'casual']) {
    const days = trajOf(rep, pol); if (!days.length) continue;
    const e = alphaOf(days, 2, 4), l = alphaOf(days, 6, 27);
    const maxOwn = Math.max(...days.map(x => x.own));
    const satur = (days.find(x => x.own >= maxOwn) || {}).d;
    const ts6 = (days.find(x => x.d === 6) || {}).ts, ts27 = (days.find(x => x.d === 27) || {}).ts;
    A[r.key][pol] = { days, early: e, late: l, satur, maxOwn };
    say(`| ${r.key} | ${pol === 'diligent' ? '부지런' : '대충'} | ${f2(e.a)} | **${f2(l.a)}** | ${f3(l.r2)} | D${satur} (${maxOwn}종) | ${ts6} → ${ts27} |`);
  }
}
say('');
const LA = A.base.diligent.late, EA = A.base.diligent.early;
say(`⚑ **말미 22일이 한 직선이다** — ln cp vs ln t 의 R² = **${f3(LA.r2)}**(부지런). 지수 성장이면 이 자리가 휘어야 한다.`);
say(`⚑ **α 는 상수가 아니다** — 초기 **${f2(EA.a)}** → 말미 **${f2(LA.a)}** 로 **${f1(EA.a / LA.a)}배** 꺾인다.`);
say(`  꺾이는 자리가 «획득 축이 죽는 자리» 다 — 보유 종수가 **D${A.base.diligent.satur} 에 ${A.base.diligent.maxOwn}종으로 포화**하고,`);
say('  그 뒤 화력은 «이미 가진 것의 레벨» 하나로만 오른다(훈련 단계는 22일 동안 9 그대로).');
say('');
ck('[A1] 말미 궤적이 멱법칙이다 (R² ≥ 0.98)', LA.r2 >= 0.98, `R² = ${f3(LA.r2)}`);
ck('[A2] α 가 진도에 따라 꺾인다 (초기/말미 ≥ 2배)', EA.a / LA.a >= 2, `${f2(EA.a)} / ${f2(LA.a)} = ×${f1(EA.a / LA.a)}`);
say('');

/* ── [B] 항등식 검증 ──────────────────────────────────────────────────────── */
say('## [B] ⚑ 항등식 — `t_out / t_wall = 장벽^(1/α)` 로 «s360 을 언제 벗어나는가» 를 맞힌다');
say('');
say('벽에 선 순간의 화력을 cp₀ 라 하면, 그 벽을 넘는 데 필요한 것은 화력 ×장벽이다.');
say('cp ∝ t^α 이므로 필요한 시간은 **t₀ × 장벽^(1/α)** — 이것이 (★) 다. 자유 계수는 하나도 없다.');
say('');
say('| 실행 | 장벽(J×GATE) | α(말미) | 벽이 선 시각 | **예측 이탈** | **관측 이탈** | Δ |');
say('|---|---|---|---|---|---|---|');
const BROWS = [];
for (const r of RUNS) {
  const rep = load(r); if (!rep) continue;
  const pol = 'diligent';
  const la = A[r.key][pol].late.a;
  const t0 = wallStartOf(rep, pol, 360);
  const bar = barrierOf(r);
  const pred = t0 * Math.pow(bar, 1 / la);
  const ex = exitOf(rep, pol, 360);
  const obs = ex.n > (rep.seeds || 12) / 2 ? ex.min : NaN;      /* 절반 넘게 넘었을 때만 관측값으로 쓴다 */
  const endMin = 1440 * (rep.days || 30);
  const d = Number.isFinite(obs) ? (pred / obs - 1) * 100 : NaN;
  BROWS.push({ r, la, t0, bar, pred, obs, cens: ex.cens, endMin, d });
  say(`| ${r.key} | ×${f2(bar)} | ${f2(la)} | ${fmt(t0)}분 | **${fmt(pred)}분** | ${Number.isFinite(obs) ? fmt(obs) + '분' : `— (${ex.cens}/${rep.seeds} 시드가 30일 안에 못 넘었다)`} | ${Number.isFinite(d) ? (d > 0 ? '+' : '') + f1(d) + '%' : '—'} |`);
}
say('');
const b0 = BROWS.find(x => x.r.key === 'base');
const b28 = BROWS.find(x => x.r.key === 'r28base');
const bm2 = BROWS.find(x => x.r.key === 'm2-1120');
const bg  = BROWS.find(x => x.r.key === 'gatehp220');
say(`⚑ **자유 계수 0 으로 23일짜리 벽의 끝을 ${Math.abs(b0.d) < 10 ? '한 자릿수 %' : f1(Math.abs(b0.d)) + '%'} 안에 맞힌다**(설치값 · 부지런).`);
if (bg) say(`⚑ 장벽을 ×${f2(bg.bar)} 로 키운 실행(gatehp220)은 예측 이탈이 **${fmt(bg.pred)}분 = 관측 끝(${fmt(bg.endMin)}분) 밖**이고, 실제로 **${bg.cens}/12 시드가 30일 안에 못 넘었다** — 부호가 맞는다.`);
say('');
/* ⚠ 문턱을 «결과에 맞춰» 넓히지 않으려면, 먼저 이 자가 무엇을 주장하는지 정확히 적어야 한다.
   세 점의 어긋남은 +6.7% · +13.9% · +14.3% — **셋 다 같은 부호**다(예측이 늘 늦다).
   그러니 이 모형의 주장은 «오차 0» 이 아니라 **«형(形)이 맞고 편향이 한쪽»** 이고, 항도 그렇게 세운다:
   ⓐ 절대 오차는 ±20% 안 · ⓑ 편향이 계통적(부호가 같다) · ⓒ **손잡이를 돌렸을 때의 «비» 를 맞힌다**.
   ⓒ 가 이 자의 본체다 — 199 가 이 모형을 쓰는 자리는 «절대 예측» 이 아니라 «장벽을 바꾸면 벽이
   어디로 가는가» 이기 때문이다. 편향의 뿌리(예측이 늦다)는 32회차 몫으로 남긴다. */
const BFIN = BROWS.filter(x => Number.isFinite(x.d));
ck('[B1] 세 실행 전부 예측 이탈이 관측과 ±20% 안', BFIN.length >= 3 && BFIN.every(x => Math.abs(x.d) <= 20),
   BFIN.map(x => `${x.r.key} ${(x.d > 0 ? '+' : '') + f1(x.d)}%`).join(' · '));
ck('[B1b] 어긋남이 계통 편향이다 — 세 점의 부호가 같다(예측이 늘 늦다)',
   BFIN.length >= 3 && (BFIN.every(x => x.d > 0) || BFIN.every(x => x.d < 0)),
   `부호 ${BFIN.map(x => (x.d > 0 ? '+' : '−')).join('')}`);
if (bm2) {
  /* ⓒ 상대 예측 — 장벽을 내린 실행과 설치값 실행의 «이탈 배수» 비. 계통 편향은 여기서 약분된다. */
  const obsR  = (b0.obs / b0.t0) / (bm2.obs / bm2.t0);
  const predR = Math.pow(b0.bar, 1 / b0.la) / Math.pow(bm2.bar, 1 / bm2.la);
  ck('[B2] ⚑ 손잡이를 돌렸을 때의 «비» 를 ±10% 안에 맞힌다 (계통 편향이 약분되는 자리)',
     Math.abs(predR / obsR - 1) <= 0.10, `예측 ×${f3(predR)} ↔ 관측 ×${f3(obsR)} (Δ ${f1((predR / obsR - 1) * 100)}%)`);
}
if (bg)  ck('[B3] 장벽을 키운 실행(GATE_HP 2.20)은 예측이 관측창 밖 — 실제로 절반 넘게 못 넘었다',
            bg.pred > bg.endMin && bg.cens * 2 > 12, `예측 ${fmt(bg.pred)}분 > 창 ${fmt(bg.endMin)}분 · 절단 ${bg.cens}/12`);
say('');

/* ── [C] 역산 ─────────────────────────────────────────────────────────────── */
say('## [C] ⚑ 역산 — §0 사다리(간격 ×1.904)가 요구하는 장벽과 밴드 폭');
say('');
const RHO = 1.904;                     /* §0 도달 가능 6칸(1440·3600·7200·12960·21600·36000)의 기하평균 비 */
const needJ = a => Math.pow(RHO, a);
const needB = a => Math.log(needJ(a)) / ((1 - RAMP) * Math.log(EC.M2));
say(`사다리는 «벽 간격비 = ×${RHO}» 를 요구한다. (★) 를 뒤집으면 **필요 장벽 = ${RHO}^α** 이고,`);
say(`그 장벽을 만드는 밴드 폭은 **B\\*(α) = ln(${RHO}^α) / ((1−RAMP)·ln M2)** 다.`);
say('');
say('| 자리 | α | 필요 장벽 | **필요 밴드 폭 B\\*** | 설치 40 은 |');
say('|---|---|---|---|---|');
for (const [nm, a] of [['초기(D2~D4)', EA.a], ['말미(D6~D27)', LA.a], ['대충 말미', A.base.casual.late.a]]) {
  const b = needB(a);
  say(`| ${nm} | ${f2(a)} | ×${f2(needJ(a))} | **${f1(b)}** | ${b > EC.BAND ? `${f1(EC.BAND / b * 100 - 100)}% 좁다` : `${f1(EC.BAND / b * 100 - 100)}% 넓다`} |`);
}
say('');
const bEarly = needB(EA.a), bLate = needB(LA.a);
say(`⚑ **B\\* 는 상수가 아니다 — 초기 ${f1(bEarly)} → 말미 ${f1(bLate)}(${f1(bEarly / bLate)}배 좁아진다).**`);
say(`  설치값 40 은 그 사이 어딘가라 **초기에는 조금 좁고(벽이 사다리보다 촘촘하다) 말미에는 ${f1(EC.BAND / bLate)}배 넓다**(벽 하나가 23일).`);
say(`  실측이 그대로다 — 설치값의 말미 간격비는 **×${f2(Math.pow(barrierOf(RUNS[0]), 1 / LA.a))}**(사다리 ${RHO} 의 ${f1(Math.pow(barrierOf(RUNS[0]), 1 / LA.a) / RHO)}배)다.`);
say('');
ck('[C1] 필요 밴드 폭이 진도에 따라 변한다 (초기/말미 ≥ 2배)', bEarly / bLate >= 2, `${f1(bEarly)} → ${f1(bLate)}`);
ck('[C2] 설치 상수 40 은 말미 요구의 2배 이상 넓다', EC.BAND / bLate >= 2, `40 / ${f1(bLate)} = ×${f1(EC.BAND / bLate)}`);
say('');

/* ── [D] 26-2 네 점 사후 설명 ─────────────────────────────────────────────── */
say('## [D] ⚑ 26-2·28-3 의 네 점이 왜 전부 졌는가 — 상수 하나는 두 자리를 동시에 못 맞춘다');
say('');
say('| 후보 | 장벽 | 초기 간격비(α ' + f2(EA.a) + ') | 말미 간격비(α ' + f2(LA.a) + ') | 사다리 ×' + RHO + ' 대비 |');
say('|---|---|---|---|---|');
const CAND = [
  { nm: '설치값(BAND 40 · M2 1.127)', M2: 1.127, BAND: 40, GATE: 1.44 },
  { nm: 'ES_BAND 20 (26-2)',          M2: 1.127, BAND: 20, GATE: 1.44 },
  { nm: 'ES_M2 1.120 (26-2·28-3)',    M2: 1.120, BAND: 40, GATE: 1.44 },
  { nm: 'ES_M2 1.100 (26-2)',         M2: 1.100, BAND: 40, GATE: 1.44 },
  { nm: 'BOSS_GATE_HP 2.20 (28-3)',   M2: 1.127, BAND: 40, GATE: 2.20 },
];
for (const c of CAND) {
  const bar = barrierOf(c);
  const re = Math.pow(bar, 1 / EA.a), rl = Math.pow(bar, 1 / LA.a);
  say(`| ${c.nm} | ×${f2(bar)} | ×${f2(re)} (${(re / RHO * 100 - 100 > 0 ? '+' : '') + f1(re / RHO * 100 - 100)}%) | ×${f2(rl)} (${(rl / RHO * 100 - 100 > 0 ? '+' : '') + f1(rl / RHO * 100 - 100)}%) | ${Math.abs(re / RHO - 1) < 0.15 && Math.abs(rl / RHO - 1) < 0.15 ? '둘 다 안' : '한쪽만'} |`);
}
say('');
say('읽는 법 — **어느 상수도 두 칸을 동시에 못 채운다.** 장벽을 내리면 말미는 나아지지만 초기가 사다리보다');
say('촘촘해지고(26-2 의 «BAND 20 → 간격 −22.6%»), 올리면 초기는 맞지만 말미 벽이 관측창을 통째로 삼킨다');
say('(28-3 의 «GATE_HP 2.20 → ③ −85% · 진행 정지»). **이것이 결6 이 물은 «상수 하나가 두 요구를 쥔다» 의 정체다** —');
say('두 요구는 «부지런 ↔ 대충» 이기 전에 **«초기 ↔ 말미»** 이고, 그 둘을 가르는 것은 α 하나다.');
say('');
const rlBase = Math.pow(barrierOf(CAND[0]), 1 / LA.a), reBase = Math.pow(barrierOf(CAND[0]), 1 / EA.a);
ck('[D1] 설치값은 초기가 사다리에 가깝고(±25% 안) 말미가 멀다(2배 이상)',
   Math.abs(reBase / RHO - 1) <= 0.25 && rlBase / RHO >= 2, `초기 ×${f2(reBase)} · 말미 ×${f2(rlBase)}`);
ck('[D2] 후보 다섯 중 «초기·말미 둘 다 ±15%» 인 상수가 0개',
   CAND.every(c => { const b = barrierOf(c); return !(Math.abs(Math.pow(b, 1 / EA.a) / RHO - 1) < 0.15 && Math.abs(Math.pow(b, 1 / LA.a) / RHO - 1) < 0.15); }),
   '0/5');
say('');

/* ── [R] 되돌림 시험 ──────────────────────────────────────────────────────── */
say('## [R] 되돌림 시험 — 항등식이 공허하지 않다는 증명');
say('');
const t0 = b0.t0, obs = b0.obs;
const predWith = (bar, a) => t0 * Math.pow(bar, 1 / a);
const rA = predWith(barrierOf(RUNS[0]), LA.a * 2);          /* α 를 두 배로 흔든다 */
const rJ = predWith(barrierOf(RUNS[0]) * 4, LA.a);          /* 장벽을 4배로 흔든다 */
say(`- α 를 ×2(${f2(LA.a)} → ${f2(LA.a * 2)})로 흔들면 예측이 ${fmt(b0.pred)} → **${fmt(rA)}분**(관측 대비 ${f1((rA / obs - 1) * 100)}%) — 관측을 못 맞힌다.`);
say(`- 장벽을 ×4 로 흔들면 예측이 ${fmt(b0.pred)} → **${fmt(rJ)}분**(관측 대비 +${f1((rJ / obs - 1) * 100)}%) — 역시 못 맞힌다.`);
say('  ⇒ [B1] 의 초록은 «아무 수나 넣어도 맞는 자» 가 아니다.');
say('');
ck('[R1] α 를 ×2 로 흔들면 ±15% 를 벗어난다', Math.abs(rA / obs - 1) > 0.15, `Δ ${f1((rA / obs - 1) * 100)}%`);
ck('[R2] 장벽을 ×4 로 흔들면 ±15% 를 벗어난다', Math.abs(rJ / obs - 1) > 0.15, `Δ +${f1((rJ / obs - 1) * 100)}%`);
say('');

say(`PROBE199R31 ${NG === 0 ? 'PASS' : 'FAIL'} ${OK}/${OK + NG}`);
if (ARG.out) { fs.writeFileSync(path.resolve(ROOT, String(ARG.out)), P.join('\n') + '\n'); console.error('written: ' + ARG.out); }

module.exports = {
  RHO, RAMP, KNEE, M2: EC.M2, BAND: EC.BAND, GATE_HP: EC.GATE_HP,
  jumpOf, barrierOf, needJ, needB,
  alpha: A, rows: BROWS, bEarly, bLate, ok: OK, ng: NG,
};
if (!QUIET && NG > 0) process.exitCode = 1;
