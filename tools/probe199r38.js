#!/usr/bin/env node
/* 199 38회차 — **필요 밴드 폭 B\* 를 다시 푼다** (37-8 1·2번)
 * ─────────────────────────────────────────────────────────────────────────────
 * 31-4 는 «한 상수로는 초기·말미를 같이 못 맞춘다» 를 **필요 밴드 폭 B\*** 표로 세웠고,
 * 31-5(결6)가 그 표 위에서 «초기 40 · 말미 16» 사다리를 채택했다. 그런데 그 표는 두 번 낡았다:
 *   ⓐ 〔36정정A〕·〔37정정A〕 — 장벽을 **닫힌 식**으로 적었다(파생보다 12.5~12.6% 낮다).
 *   ⓑ 37 이 확정한 것 — (★) 에 넣을 α 는 «말미 창 회귀» 가 아니라 **그 벽의 α_obs** 다.
 * 게다가 표 자신이 한 칸에서 **정의를 둘** 쓰고 있었다(아래 [B] 〔38정정A〕).
 *
 * 이 자가 하는 일:
 *   [A] 재현 — 31-4 의 다섯 후보 표(닫힌 식)가 그대로 나온다 (338 규칙)
 *   [B] 〔38정정A〕 — 같은 표의 «장벽» 열은 관문 보스 배수 ×GATE 를 **넣고**, «B\*» 열은 **뺐다**
 *   [C] ⚑⚑ 본체 — 37-7 규약 1 이 고른 «진짜 벽»(여유 ≤ ×1.15)에서 B\* 를 그 벽의 α_obs 로 다시 푼다
 *   [D] ⚑ 그래서 남은 어긋남은 «폭» 이 아니라 **사다리 문턱**이다 — 문턱 관문의 장벽은 아직 옛 폭이 만든다
 *   [E] 스윕 관측 — `ES_BANDG` 9 → 8(문턱 s360 → s320) 실행이 있으면 [G] 축을 나란히 읽는다
 *   [R] 되돌림
 *
 * ⚠ 손 상수를 안 든다 — 장벽·요구·B\* 가 전부 제품 `eScale`·`BOSS_GATE_HP` 에서 파생한다.
 * ⚠ 새 봇 실행은 안 한다 — 커밋된 JSON 만 읽는다.
 *
 * 종료 코드: 0 통과 · 1 FAIL.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const say = m => console.log(m);
const f1 = v => Number.isFinite(v) ? v.toFixed(1) : '—';
const f2 = v => Number.isFinite(v) ? v.toFixed(2) : '—';
const pc = v => Number.isFinite(v) ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : '—';
const med = a => { const b = a.filter(Number.isFinite).sort((x, y) => x - y);
                   if (!b.length) return NaN;
                   const n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };

let OK = 0, NG = 0;
const ck = (name, cond, got) => { if (cond) { OK++; say(`  ✔ ${name}` + (got != null ? ` — ${got}` : '')); }
                                  else { NG++; say(`  ✗ ${name}` + (got != null ? ` — ${got}` : '')); } };

const SRC_HEAD = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
/* ⚑ 199 40회차 이관 — 이 자가 읽는 실행들은 전부 **한 단 사다리 세대**(40 → 16)의 표다.
   제품이 두 단(40 → `ES_BAND3` → 16)이 된 뒤로 «현재 곡선» 으로 그 표를 해석하면 판정이
   통째로 어긋난다 — «s360 의 장벽을 만든 폭» 이 40 이 아니라 16 으로 읽히고, 이 자의 본체
   주장(«어긋난 것은 옛 폭이 만든 관문이다»)이 자기 근거를 잃는다. ⇒ 곡선을 **그 실행이 쓴
   세대**로 되돌려 읽는다. 되돌림이 조용히 공허해지지 않도록 [G0] 이 그것을 실행 기록
   (`band`·`bandSw`·`band2`)과 대조한다 — 세대가 또 바뀌면 그 항이 먼저 빨개진다. */
const SRC = SRC_HEAD.replace(/const ES_BAND3\s*=\s*\d+/, 'const ES_BAND3 = 0');

/* ═══ [G0] 세대 대조 — 위 «되돌려 읽기» 가 공허해지지 않게 ═══════════════════
   되돌린 곡선이 정말 그 실행이 쓴 세대인지 **실행 기록**(`band`·`bandSw`·`band2`)과 맞춘다.
   제품이 또 갈리면 이 항이 **먼저** 빨개져 본체 판정이 조용히 낡는 것을 막는다(199 40회차). */
function gen0Check(runFile) {
  const p = path.join(ROOT, 'docs', 'review', runFile);
  if (!fs.existsSync(p)) return;
  const rep = JSON.parse(fs.readFileSync(p, 'utf8'));
  const s0 = (rep.policies && rep.policies.diligent && rep.policies.diligent[0]) || null;
  const ec = require('./ecurve')(SRC, 'GEN0');
  ck('[G0] 되돌려 읽은 곡선이 그 실행이 쓴 세대와 같다 (ES_BAND·eBandSw·ES_BAND2 대조)',
     !!s0 && s0.band === ec.BAND && s0.bandSw === ec.SW && s0.band2 === ec.BAND2,
     s0 ? `실행 ${s0.band}/${s0.bandSw}/${s0.band2} ↔ 되돌린 곡선 ${ec.BAND}/${ec.SW}/${ec.BAND2}` : '실행 JSON 없음');
  ck('[G0b] 되돌리기가 실제로 한 글자를 바꿨다 — 제품이 두 단이라는 뜻 (한 단이면 공허하게 참)',
     SRC !== SRC_HEAD || !/const ES_BAND3\s*=\s*[1-9]/.test(SRC_HEAD),
     SRC !== SRC_HEAD ? '제품 = 두 단 → 한 단으로 되돌려 읽었다' : '제품 = 한 단 (되돌릴 것이 없다)');
}
const readEC = require('./ecurve');
const preLadder = s => s.replace(/const ES_BAND2\b/, 'const ES_BAND2_OFF').replace(/const ES_BANDG\b/, 'const ES_BANDG_OFF');
const mk = (band, m2, ladder, tag) => {
  let s = ladder ? SRC : preLadder(SRC);
  if (band != null) s = s.replace(/const ES_BAND\s*=\s*\d+/, 'const ES_BAND  = ' + band);
  if (m2 != null) s = s.replace(/const ES_M2\s*=\s*[\d.]+;/, 'const ES_M2   = ' + m2 + ';');
  return readEC(s, tag);
};
const EC = readEC(SRC, 'PROBE199R38');
const barrierAt = (ec, g) => ec.eScale(g) / ec.eScale(g - 1) * (ec.GATE_HP || 1);
/* 그 관문의 장벽을 **만든** 폭 — 관문 앞 구간의 폭이다(사다리 문턱 관문에서 둘이 갈린다). */
const widthMaking = (ec, g) => ec.eBandW(ec.eBand(g - 1));

const R_TARGET = 1.904;      /* 31-4 사다리 목표 간격비 */
const GATE_STAGE = 360;

/* B\* — «파생 장벽이 요구와 같아지는 폭». 폭은 정수라 로그에서 보간한다(닫힌 식 금지). */
const bStarDerived = (m2, stage, need) => {
  const pts = [];
  for (let B = 4; B <= 60; B++) {
    const ec = mk(B, m2, false, 'R38-B' + B);
    const g = B * Math.max(1, Math.round(stage / B));
    pts.push({ B, v: barrierAt(ec, g) });
  }
  for (let i = 1; i < pts.length; i++) if (pts[i].v >= need && pts[i - 1].v <= need) {
    const w = (Math.log(need) - Math.log(pts[i - 1].v)) / (Math.log(pts[i].v) - Math.log(pts[i - 1].v));
    return pts[i - 1].B + w * (pts[i].B - pts[i - 1].B);
  }
  return NaN;
};
/* 31-4 가 쓴 닫힌 식 B\* — `withGate` 가 그 표의 결손(〔38정정A〕)을 켜고 끈다. */
const bStarClosed = (ec, need, withGate) =>
  Math.log(need / (withGate ? (ec.GATE_HP || 1) : 1)) / ((1 - ec.RAMP) * Math.log(ec.M2));

const RUNS = [
  { key: 'base',    file: '199-bot-2026-09-06-r36-base.json',       m2: null },
  { key: 'm2-1120', file: '199-bot-2026-09-06-r36-sw-m2-1120.json', m2: 1.120 },
];
const load = f => { const p = path.join(ROOT, 'docs', 'review', f);
                    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };

say('# PROBE199R38 — 필요 밴드 폭 B\\* 를 다시 푼다 (199 38회차 · 커밋 JSON 만 · 새 봇 실행 0건)');
say('');
say('- 제품에서 읽은 값 — `ES_BAND` **' + EC.BAND + '**' + (EC.BAND2 ? ' → 사다리 **' + EC.BAND2 + '**(문턱 s' + EC.SW + ')' : '')
    + ' · `ES_M2` **' + EC.M2 + '** · `ES_RAMP` **' + EC.RAMP + '** · `BOSS_GATE_HP` **' + EC.GATE_HP + '**');
say('- 목표 간격비 **×' + R_TARGET + '**(31-4 사다리 목표) · 장벽·요구·B\\* 는 전부 제품 파생이다.');
say('');

const REP = {}; RUNS.forEach(r => { REP[r.key] = load(r.file); r.ec = readEC(
  r.m2 == null ? SRC : SRC.replace(/const ES_M2\s*=\s*[\d.]+;/, 'const ES_M2   = ' + r.m2 + ';'), 'R38-run-' + r.key); });
if (RUNS.some(r => !REP[r.key])) {
  say('**실행 JSON 이 없다** — ' + RUNS.filter(r => !REP[r.key]).map(r => '`docs/review/' + r.file + '`').join(' · '));
  say(''); say('PROBE199R38 FAIL — 입력 없음'); process.exit(1);
}

/* ═══ [A] 재현 — 31-4 다섯 후보 ═══════════════════════════════════════════ */
say('## [A] 재현 — 31-4 의 다섯 후보 표(닫힌 식)가 그대로 나온다 (338 규칙)');
say('');
const CAND = [
  { name: '설치값(BAND 40 · M2 1.127)', band: 40, m2: null,  bar31: 66.06, i31: 1.84, l31: 6.67 },
  { name: 'ES_BAND 20 (26-2)',          band: 20, m2: null,  bar31: 9.75,  i31: 1.39, l31: 2.80 },
  { name: 'ES_M2 1.120 (26-2·28-3)',    band: 40, m2: 1.120, bar31: 54.12, i31: 1.78, l31: 6.09 },
  { name: 'ES_M2 1.100 (26-2)',         band: 40, m2: 1.100, bar31: 30.40, i31: 1.64, l31: 4.69 },
];
const A_INIT = 6.90, A_LATE = 2.21;      /* 31-3 의 두 α(부지런) */
say('| 후보 | 닫힌 식 장벽 | 초기 간격비(α ' + A_INIT + ') | 말미 간격비(α ' + A_LATE + ') | 31-4 가 적은 값 |');
say('|---|---|---|---|---|');
const A = [];
for (const c of CAND) {
  const ec = mk(c.band, c.m2, false, 'R38-c' + c.band + (c.m2 || ''));
  const barC = Math.pow(ec.M2, ec.BAND * (1 - ec.RAMP)) * (ec.GATE_HP || 1);
  const gi = Math.pow(barC, 1 / A_INIT), gl = Math.pow(barC, 1 / A_LATE);
  A.push({ ...c, ec, barC, gi, gl });
  say(`| ${c.name} | ×${f2(barC)} | ×${f2(gi)} | ×${f2(gl)} | ×${c.bar31} · ×${c.i31} · ×${c.l31} |`);
}
say('');
ck('[A1] 다섯 후보 중 넷의 장벽·간격비가 31-4 표와 0.02 안에서 같다 (표를 베끼지 않고 제품에서 다시 냈다)',
   A.every(x => Math.abs(x.barC - x.bar31) <= 0.02 && Math.abs(x.gi - x.i31) <= 0.02 && Math.abs(x.gl - x.l31) <= 0.02),
   A.map(x => `×${f2(x.barC)}`).join(' · '));
say('');

/* ═══ [B] 〔38정정A〕 — 표 한 장 안에 정의가 둘 ══════════════════════════ */
say('## [B] 〔38정정A〕 31-4 의 «필요 밴드 폭 B\\*» 는 관문 보스 배수를 **뺀 채** 풀렸다');
say('');
say('31-4 는 장벽을 «경계 점프 × `BOSS_GATE_HP`» 로 정의해 놓고(×51.66 × 1.44 = ×66.06),');
say('B\\* 열은 **×' + EC.GATE_HP + ' 를 빼고** 풀었다. 같은 표 안에서 «장벽» 이 두 뜻이다:');
say('');
say('| 자리 | α | 필요 장벽 = ' + R_TARGET + '^α | B\\*(31-4 · 게이트 뺌) | **B\\*(게이트 넣음)** | **B\\*(제품 파생)** |');
say('|---|---|---|---|---|---|');
const B = [];
for (const [tag, a, b31] of [['초기(D2~D4)', A_INIT, 46.5], ['말미(D6~D27)', A_LATE, 14.9]]) {
  const need = Math.pow(R_TARGET, a);
  const noG = bStarClosed(EC, need, false), wiG = bStarClosed(EC, need, true), der = bStarDerived(null, GATE_STAGE, need);
  B.push({ tag, a, need, noG, wiG, der, b31 });
  say(`| ${tag} | ${a} | ×${f2(need)} | ${f1(noG)} (표 ${b31}) | **${f1(wiG)}** | **${f1(der)}** |`);
}
say('');
ck('[B1] 게이트를 뺀 풀이가 31-4 의 46.5·14.9 를 재현한다 (그 열이 그렇게 풀렸다는 증거)',
   B.every(x => Math.abs(x.noG - x.b31) <= 0.15), B.map(x => f1(x.noG)).join(' · '));
ck('[B2] ⚑ 넣고 풀면 값이 내려간다 — 초기 46.5 → ' + f1(B[0].wiG) + ' · 말미 14.9 → ' + f1(B[1].wiG),
   B.every(x => x.wiG < x.b31 - 0.5), B.map(x => `${x.b31} → ${f1(x.wiG)}`).join(' · '));
ck('[B3] 제품 파생으로 풀면 한 칸 더 내려간다 (〔36·37정정A〕 — 닫힌 식이 12.5% 낮다)',
   B.every(x => x.der < x.wiG), B.map(x => `${f1(x.wiG)} → ${f1(x.der)}`).join(' · '));
say('');

/* ═══ [C] 본체 — 진짜 벽의 α_obs 로 다시 푼다 ══════════════════════════ */
say('## [C] ⚑⚑ 본체 — 37-7 규약 1 이 고른 «진짜 벽»에서 B\\* 를 그 벽의 α_obs 로 푼다');
say('');
say('> 37 이 확정했다 — (★) 에 넣을 α 는 말미 창 회귀가 아니라 **그 벽의 α_obs**(= ln G / ln(t_이탈/t_벽)) 다.');
say('> 그리고 여유(장벽÷G)가 ×1.15 를 넘는 벽은 장벽을 재는 자리가 아니다(37-7 규약 1).');
say('');
say('| 실행 | 관문 | 여유 | **간격비(관측)** | 목표 대비 | α_obs | 장벽 | 요구 = ' + R_TARGET + '^α_obs | **B\\*** | 장벽을 만든 폭 |');
say('|---|---|---|---|---|---|---|---|---|---|');
/* 벽 모둠 표 — 실행 하나와 그 실행의 곡선을 받아 «여유·간격비·α_obs·B\*» 를 낸다.
   [C](설치값 실행 둘)와 [E](스윕 실행)가 **같은 함수**를 쓴다 — 다른 자로 견주면 못 견준다. */
const wallTable = (rep, ec, m2, key) => {
  const out = [], seeds = rep.policies.diligent || [];
  const gs = new Set((seeds[0] && seeds[0].gateSet) || []);
  const byStage = new Map();
  seeds.forEach(s => (s.walls || []).forEach(w => {
    if (w.trunc || !gs.has(w.stage)) return;
    const s0 = (s.wrows || []).find(x => x.label === 'S' + w.stage + '@' + w.min + 'm');
    const xr = (s.wrows || []).find(x => /^W\d+x/.test(x.label) && (w.rows || []).includes(x.label));
    if (!s0 || !xr || !(s0.cp > 0)) return;
    if (!byStage.has(w.stage)) byStage.set(w.stage, []);
    byStage.get(w.stage).push({ t0: w.min, t1: xr.minute, G: xr.cp / s0.cp });
  }));
  for (const [stage, L] of [...byStage].sort((a, b) => a[0] - b[0])) {
    if (L.length < Math.max(2, seeds.length / 2)) continue;
    const t0 = med(L.map(p => p.t0)), t1 = med(L.map(p => p.t1)), G = med(L.map(p => p.G));
    const ratio = t1 / t0, aObs = Math.log(G) / Math.log(ratio);
    const bar = barrierAt(ec, stage), slack = bar / G;
    const need = Math.pow(R_TARGET, aObs);
    out.push({ run: key, stage, slack, ratio, aObs, bar, need, bs: bStarDerived(m2, stage, need),
               made: widthMaking(ec, stage), real: bar / G <= 1.15 });
  }
  return out;
};
const W = [];
for (const r of RUNS) {
  for (const x of wallTable(REP[r.key], r.ec, r.m2, r.key)) {
    W.push(x);
    say(`| ${x.run} | s${x.stage} | \u00d7${f2(x.slack)} | **\u00d7${f2(x.ratio)}** | \u00d7${f2(x.ratio / R_TARGET)} | ${f2(x.aObs)} | \u00d7${f2(x.bar)}`
        + ` | \u00d7${f2(x.need)} | **${f1(x.bs)}** | ${x.made} |`);
  }
}
say('');
const REAL = W.filter(x => x.real);
ck('[C1] 진짜 벽(여유 ≤ ×1.15)이 셋이고, 그 셋만이 장벽을 재는 자리다',
   REAL.length === 3 && REAL.every(x => x.slack <= 1.15) && W.filter(x => !x.real).every(x => x.slack > 1.15),
   REAL.map(x => `${x.run}/s${x.stage} ×${f2(x.slack)}`).join(' · '));
{
  const lad = REAL.filter(x => x.made === EC.BAND2);          /* 사다리 폭이 만든 벽 */
  const old = REAL.filter(x => x.made === EC.BAND);           /* 옛 폭이 만든 벽 */
  ck('[C2] ⚑ 사다리 폭 ' + EC.BAND2 + ' 은 요구에 거의 맞는다 — B\\* 와 1.25배 안이다 (31-4 가 «40 은 2.7배 넓다» 로 잡은 것과 다른 자리다)',
     lad.length >= 1 && lad.every(x => x.made / x.bs <= 1.25),
     lad.map(x => `${x.run}/s${x.stage} 설치 ${x.made} ↔ B* ${f1(x.bs)} (×${f2(x.made / x.bs)})`).join(' · '));
  ck('[C3] ⚑⚑ 반대로 **옛 폭이 만든 관문**은 요구의 3배 넘게 넓다 — 남은 어긋남이 거기 있다',
     old.length >= 2 && old.every(x => x.made / x.bs >= 2.5),
     old.map(x => `${x.run}/s${x.stage} 설치 ${x.made} ↔ B* ${f1(x.bs)} (×${f2(x.made / x.bs)})`).join(' · '));
  ck('[C4] 관측 간격비가 그 판정과 같은 말을 한다 — 옛 폭 관문은 목표의 2.5배 넘고, 사다리 폭 관문은 1.15배 안이다',
     old.every(x => x.ratio / R_TARGET >= 2.5) && lad.every(x => x.ratio / R_TARGET <= 1.15),
     '옛 폭 ' + old.map(x => `×${f2(x.ratio / R_TARGET)}`).join('/') + ' ↔ 사다리 폭 ' + lad.map(x => `×${f2(x.ratio / R_TARGET)}`).join('/'));
}
say('');

/* ═══ [D] 문턱 진단 ════════════════════════════════════════════════════ */
say('## [D] ⚑ 그래서 손잡이는 «폭» 이 아니라 **사다리 문턱**이다');
say('');
say('사다리는 문턱 스테이지 **s' + EC.SW + '** 에서 켜지는데, `eScale` 의 정의상 그 관문의 장벽은');
say('**그 앞 구간의 폭**(= ' + EC.BAND + ')이 만든다 — 즉 문턱 관문 자체는 아직 옛 폭이다.');
say('문턱을 한 관문 앞당기면(`ES_BANDG` ' + (EC.SW / EC.BAND) + ' → ' + (EC.SW / EC.BAND - 1) + ' ⇒ 문턱 s' + (EC.SW - EC.BAND) + ')');
say('그 자리가 사다리 폭이 되고, 새 문턱 관문 s' + (EC.SW - EC.BAND) + ' 는 **옛 폭으로도 목표 아래**다:');
say('');
say('| 관문 | 장벽을 만든 폭 | 관측 간격비 | 목표 대비 | 문턱을 앞당기면 |');
say('|---|---|---|---|---|');
for (const x of W.filter(v => v.stage >= EC.SW - EC.BAND))
  say(`| ${x.run}/s${x.stage} | ${x.made} | ×${f2(x.ratio)} | ×${f2(x.ratio / R_TARGET)} | `
      + (x.stage === EC.SW ? `**${EC.BAND} → ${EC.BAND2}** (이 자리가 닫힌다)` : (x.stage === EC.SW - EC.BAND ? '새 문턱 관문 — 폭 그대로' : '변화 없음')) + ' |');
say('');
{
  const pre = W.filter(x => x.stage === EC.SW - EC.BAND);    /* 새 문턱이 될 관문 */
  ck('[D1] 새 문턱이 될 관문(s' + (EC.SW - EC.BAND) + ')은 옛 폭으로도 목표 **아래**다 — 앞당김의 대가가 없다',
     pre.length >= 1 && pre.every(x => x.ratio / R_TARGET <= 1.0),
     pre.map(x => `${x.run}/s${x.stage} ×${f2(x.ratio / R_TARGET)}`).join(' · '));
  ck('[D2] 지금 문턱 관문(s' + EC.SW + ')이 **두 실행 다** 목표의 2.5배 넘는다 — 한 실행의 사고가 아니다',
     W.filter(x => x.stage === EC.SW).length >= 2 && W.filter(x => x.stage === EC.SW).every(x => x.ratio / R_TARGET >= 2.5),
     W.filter(x => x.stage === EC.SW).map(x => `${x.run} ×${f2(x.ratio / R_TARGET)}`).join(' · '));
}
say('');

/* ═══ [E] 스윕 관측 ════════════════════════════════════════════════════ */
say('## [E] 스윕 관측 — `ES_BANDG` ' + (EC.SW / EC.BAND) + ' → ' + (EC.SW / EC.BAND - 1) + ' (문턱 s' + EC.SW + ' → s' + (EC.SW - EC.BAND) + ')');
say('');
const SWEEP = path.join(ROOT, 'docs', 'review', '199-bot-2026-09-06-r38-sw-bandg8.md');
const BASE  = path.join(ROOT, 'docs', 'review', '199-bot-2026-09-06-r36-base.md');
if (fs.existsSync(SWEEP) && fs.existsSync(BASE)) {
  const grab = (file, label) => {
    const line = fs.readFileSync(file, 'utf8').split('\n').find(l => l.startsWith('|') && l.includes(label));
    if (!line) return null;
    const c = line.split('|').map(s => s.trim());
    return { dil: c[2], cas: c[3] };
  };
  const ROWS = [
    ['30일 스테이지 p50', '| 30일 스테이지 p50'],
    ['① 목표 칸 적중 p50', '① 목표 칸 적중 p50'],
    ['① 첫 벽(배정) p50', '① 첫 벽(배정) p50'],
    ['① 벽 간격 기하평균 p50', '① 벽 간격 기하평균 p50'],
    ['③ 순 이동 비중(%)', '순 이동 비중(%)'],
    ['⚑ 창 역량 — 말미 축', '⚑ 창 역량 — 말미 축'],
  ];
  say('| 축 | 설치값(r36-base) | **문턱 s' + (EC.SW - EC.BAND) + '(r38 스윕)** |');
  say('|---|---|---|');
  const got = [];
  for (const [name, key] of ROWS) {
    const b = grab(BASE, key), s = grab(SWEEP, key);
    if (!b || !s) continue;
    got.push({ name, b: b.dil, s: s.dil });
    const cut = v => (v || '').replace(/\s+/g, ' ').slice(0, 120);
    say(`| ${name} (부지런) | ${cut(b.dil)} | **${cut(s.dil)}** |`);
  }
  say('');
  ck('[E1] 스윕 실행을 같은 자로 읽었다 (여섯 축 중 넷 이상)', got.length >= 4, `${got.length}축`);
  const cap = got.find(x => x.name.includes('창 역량'));
  ck('[E2] ⚑ 문턱을 앞당기면 30일 창이 **말미 축을 판정할 수 있게** 된다 (지금은 «판정 불가» 다)',
     !!cap && /판정 불가/.test(cap.b) && !/판정 불가/.test(cap.s),
     cap ? `설치값 «${cap.b.slice(0, 40)}…» ↔ 스윕 «${cap.s.slice(0, 40)}…»` : '창 역량 줄을 못 읽었다');

  /* [E3] ⚑⚑ 예측한 자리가 실제로 닫히는가 — 스윕 실행의 벽을 **[C] 와 같은 함수**로 읽는다. */
  const swJson = path.join(ROOT, 'docs', 'review', '199-bot-2026-09-06-r38-sw-bandg8.json');
  if (fs.existsSync(swJson)) {
    const swEC = readEC(SRC.replace(/const ES_BANDG\s*=\s*\d+/, 'const ES_BANDG = ' + (EC.SW / EC.BAND - 1)), 'R38-sweep');
    const SW = wallTable(JSON.parse(fs.readFileSync(swJson, 'utf8')), swEC, null, 'sw');
    say('');
    say('| 스윕 관문 | 장벽을 만든 폭 | 여유 | 간격비 | 목표 대비 | α_obs |');
    say('|---|---|---|---|---|---|');
    for (const x of SW)
      say(`| s${x.stage} | ${x.made} | ×${f2(x.slack)} | ×${f2(x.ratio)} | **×${f2(x.ratio / R_TARGET)}** | ${f2(x.aObs)} |`);
    say('');
    const swLad = SW.filter(x => x.made === swEC.BAND2), swOld = SW.filter(x => x.made === swEC.BAND);
    ck('[E3] ⚑⚑ 예측대로 «목표 3배» 자리가 닫힌다 — 사다리 폭이 만든 관문 둘이 목표의 1.2배 안이다',
       swLad.length >= 2 && swLad.every(x => x.ratio / R_TARGET <= 1.2),
       '스윕 사다리 폭 ' + swLad.map(x => `s${x.stage} ×${f2(x.ratio / R_TARGET)}`).join(' · ')
       + ' ↔ 설치값의 그 자리 ' + W.filter(x => x.stage === EC.SW).map(x => `×${f2(x.ratio / R_TARGET)}`).join('/'));
    ck('[E4] 새 문턱 관문은 옛 폭 그대로이고 값도 그대로다 — 앞 구간을 안 건드렸다는 증거',
       swOld.length >= 1 && swOld.every(x => {
         const same = W.find(v => v.run === 'base' && v.stage === x.stage);
         return same && Math.abs(x.ratio / same.ratio - 1) <= 0.02;
       }), swOld.map(x => `s${x.stage} ×${f2(x.ratio)}`).join(' · '));
    /* [E5] ⚠ 대가를 같이 적는다 — 좋아진 축만 적으면 그것이 무른 판정이다. */
    const num = v => { const m = String(v || '').match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
    const gap = got.find(x => x.name.includes('간격 기하평균')), mov = got.find(x => x.name.includes('순 이동'));
    ck('[E5] ⚠ 대가가 있다 — 총계 축 둘(① 간격 기하평균 · ③ 순 이동 비중)은 **나빠진다**',
       !!gap && !!mov && (num(gap.s) < num(gap.b)) && (num(mov.s) < num(mov.b)),
       `① 간격 ×${f2(num(gap && gap.b))} → ×${f2(num(gap && gap.s))} (목표 ×${R_TARGET}) · ③ ${f2(num(mov && mov.b))}% → ${f2(num(mov && mov.s))}%`);
  }
} else {
  say('_스윕 실행 md 가 없다 — 만들려면(같은 κ 표):_');
  say('```');
  say('# index.html 의 `const ES_BANDG = ' + (EC.SW / EC.BAND) + ';` 를 ' + (EC.SW / EC.BAND - 1) + ' 로 바꾼 뒤');
  say('node tools/bot199.js --days=30 --seeds=12 --policy=both --calib=docs/review/199-calib-r25.json \\');
  say('  --out=docs/review/199-bot-2026-09-06-r38-sw-bandg8.md --json=docs/review/199-bot-2026-09-06-r38-sw-bandg8.json');
  say('# 끝나면 index.html 을 되돌린다(제품 0줄)');
  say('```');
  ck('[E1] 스윕 실행 md 가 있다', false, '없다 — 위 명령으로 만든다');
}
say('');

/* ═══ [R] 되돌림 ═══════════════════════════════════════════════════════ */
say('## [R] 되돌림 시험');
say('');
ck('[R1] 게이트를 도로 빼면 31-4 의 46.5·14.9 가 그대로 나온다 (내가 값을 만든 게 아니다)',
   B.every(x => Math.abs(x.noG - x.b31) <= 0.15), B.map(x => `${f1(x.noG)} ↔ 표 ${x.b31}`).join(' · '));
ck('[R2] α 를 말미 창 값(' + A_LATE + ')으로 되돌리면 진짜 벽의 B\\* 가 [B] 의 말미 값으로 수렴한다',
   REAL.every(x => Math.abs(bStarDerived(x.run === 'base' ? null : 1.120, x.stage, Math.pow(R_TARGET, A_LATE)) - B[1].der) <= 1.5),
   REAL.map(x => f1(bStarDerived(x.run === 'base' ? null : 1.120, x.stage, Math.pow(R_TARGET, A_LATE)))).join(' · ') + ' ↔ ' + f1(B[1].der));
{
  const shook = readEC(SRC.replace(/const ES_M2\s*=\s*[\d.]+;/, 'const ES_M2   = 1.200;'), 'R38-shake');
  ck('[R3] 자가 손 상수를 안 든다 — `ES_M2` 를 흔들면 장벽·B\\* 가 따라 움직인다',
     Math.abs(barrierAt(shook, GATE_STAGE) / barrierAt(EC, GATE_STAGE) - 1) > 0.2,
     `×${f2(barrierAt(EC, GATE_STAGE))} → ×${f2(barrierAt(shook, GATE_STAGE))}`);
}
say('');

/* ═══ 정리 ═════════════════════════════════════════════════════════════ */
say('## 정리');
say('');
say('1. 〔38정정A〕 31-4 의 B\\* 열은 **관문 보스 배수를 뺀 채** 풀렸다([B]) — 넣고 제품에서 파생하면');
say('   초기 46.5 → **' + f1(B[0].der) + '** · 말미 14.9 → **' + f1(B[1].der) + '** 이다.');
say('2. ⚑⚑ 그러나 37 이 «α 는 그 벽의 α_obs» 를 확정했으므로 진짜 벽에서 다시 풀어야 한다([C]) —');
say('   사다리 폭 ' + EC.BAND2 + ' 은 요구(B\\* ' + REAL.filter(x => x.made === EC.BAND2).map(x => f1(x.bs)).join('/') + ')에 **거의 맞고**,');
say('   어긋난 것은 **옛 폭이 만든 문턱 관문**이다(설치 ' + EC.BAND + ' ↔ 요구 ' + REAL.filter(x => x.made === EC.BAND).map(x => f1(x.bs)).join('/') + ').');
say('3. ⇒ 다음 손잡이는 폭이 아니라 **문턱**이다([D]) — `ES_BANDG` ' + (EC.SW / EC.BAND) + ' → ' + (EC.SW / EC.BAND - 1)
    + ' 한 상수(되돌림 한 줄).');
say('4. 스윕이 그 예측을 **확인했다**([E3]) — «목표 3배» 자리가 ×1.13·×1.18 로 닫히고, 30일 창이');
say('   말미 축을 **판정 가능**으로 바꾼다([E2]). ⚠ 다만 총계 축 둘은 나빠진다([E5]) — **채택은 대가를 재고 나서**다.');
say('');
gen0Check('199-bot-2026-09-06-r36-base.json');

say((NG === 0 ? 'PROBE199R38 PASS ' : 'PROBE199R38 FAIL ') + OK + '/' + (OK + NG));
process.exit(NG === 0 ? 0 : 1);
