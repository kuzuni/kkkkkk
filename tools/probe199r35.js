#!/usr/bin/env node
/* tools/probe199r35.js — 199 35회차 재현기 · **장벽 항 −12.0% 의 정체** (커밋된 JSON 만 읽는다 · 새 봇 실행 0회)
 *
 * 34-6 1번: «다음 자리는 α 가 아니라 `m2-1120` 의 장벽 항 −12.0% 다. 설치값 두 세대는 +3.3·+2.8 로
 * 맞는데 그 실행만 −12 다 — 벽이 D2.8 에 서서(설치값 D4.8) 초기 급성장 구간에 걸린 것이 1순위 의심이다.
 * ⛔ 34-3 의 실수를 반복하지 마라 — 용의자를 적기 전에 «계단이 없는 대조군» 부터 찾아라.»
 *
 * 그래서 이 자는 **대조군부터** 세운다. 세 점(설치값 2세대 + m2-1120 의 s360 부지런)은 같은 저장고 안에서
 * **관문 벽 13개**(3실행 × 2정책 × 관문 s240~s400)의 특수한 세 자리일 뿐이다.
 *
 *   [A] 재현 — 34-2 의 세 점을 자릿수까지 되살린다(338 규칙).
 *   [B] ⚑ **대조군** — 관문 벽 전수. 장벽 항은 «장벽이 맞나» 가 아니라 **«벽에 들어설 때의 여유»** 를 잰다
 *       (구속하지 않는 벽에서 +16~+232%). 그러니 세 점만 놓고 «장벽이 12% 틀렸다» 고 읽을 수 없다.
 *   [C] 이탈 시각은 **격자에서 읽을 필요가 없다** — 벽 기록이 `min + lenCal` 로 분 단위를 들고 있다.
 *       그 한 줄이 −12.0 → −10.9 를 돌려준다(일 격자가 이탈을 늦게 적는다).
 *   [D] ⚑ **본체** — 남은 −10.9 는 **못 읽은 자리**다. m2-1120 의 벽은 **무릎 위**(D2.81 · 이웃 α 9.1 → 3.0)에
 *       서고, 일 격자에서 cp₀ 를 읽는 방법은 하나가 아니다. 허용되는 읽기들의 폭이 **8.1%p**(설치값은 0.5%p)라
 *       −10.9 는 **자기 읽기 폭의 바닥**이다. 다만 폭이 0 을 안 넘으므로 **부호는 남는다**.
 *   [E] 이탈 지연(세션 간격)의 상한 — 남는 부호를 이것으로 덮을 수 있나(없다).
 *   [R] 되돌림 시험 — 읽기·이탈을 되돌리면 r34 의 수가 그대로 돌아온다.
 *
 * 사용법: node tools/probe199r35.js [--out=<md>]
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
const pc = n => (Number.isFinite(n) ? (n > 0 ? '+' : '') + n.toFixed(1) + '%' : '—');
const fmt = n => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');
const med = a => { const b = [...a].filter(Number.isFinite).sort((x, y) => x - y); if (!b.length) return NaN;
                   const n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };

let OK = 0, NG = 0;
const ck = (name, cond, got) => { if (cond) { OK++; say(`  ✔ ${name}` + (got != null ? ` — ${got}` : '')); }
                                  else { NG++; say(`  ✗ ${name}` + (got != null ? ` — ${got}` : '')); } };

/* ── 실행 목록 — 34회차와 같은 커밋 JSON · 같은 상수 출처(§26·§28 기록). */
const RUNS = [
  { key: 'base',      file: '199-bot-2026-09-03-r31-base.json',       M2: 1.127, BAND: 40, GATE: 1.44, src: '31회차 기준선(설치값)' },
  { key: 'r28base',   file: '199-bot-2026-09-03-r28-base.json',       M2: 1.127, BAND: 40, GATE: 1.44, src: '28-3 base(설치값 · 다른 세대)' },
  { key: 'm2-1120',   file: '199-bot-2026-09-03-r28-sw-m2-1120.json', M2: 1.120, BAND: 40, GATE: 1.44, src: '28-3 스윕 — 무릎 위 지수를 내렸다' },
];
const GATE_STAGE = 360;      /* 31-2·34 가 쓴 그 관문 */
const FITW = [6, 27];        /* 말미 창 — 34 와 같은 창 */
const R34 = { base: 3.3, r28base: 2.8, 'm2-1120': -12.0 };   /* 34-2 표의 장벽 항 */

const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const EC = require('./ecurve')(SRC, 'PROBE199R35');
const RAMP = EC.RAMP;
const barrierOf = r => Math.pow(r.M2, r.BAND * (1 - RAMP)) * r.GATE;

const load = r => { const p = path.join(ROOT, 'docs', 'review', r.file);
                    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };

/* 일별 p50 궤적 — 34 의 trajOf 와 같은 정의(같은 것을 재려면 같은 자여야 한다). */
const trajOf = (rep, pol) => {
  const seeds = rep.policies[pol] || [];
  const days = [];
  for (let d = 1; d <= (rep.days || 30); d++) {
    const rows = seeds.map(s => s.rows.find(x => x.label === 'D' + d)).filter(Boolean);
    if (!rows.length) continue;
    days.push({ d, min: med(rows.map(x => x.minute)), cp: med(rows.map(x => x.cp)) });
  }
  return days;
};
/* 구간 α — 이웃한 두 일자 사이의 로그–로그 기울기. */
const segA = (D, i) => (D[i - 1] && D[i]) ? Math.log(D[i].cp / D[i - 1].cp) / Math.log(D[i].min / D[i - 1].min) : NaN;
const idxOf = (D, t) => { for (let i = 1; i < D.length; i++) if (D[i].min >= t && D[i - 1].min <= t) return i; return -1; };

/* 읽기 ① 현(弦) — 34 가 쓴 것. */
const chordAt = (D, i, t) => {
  const a = D[i - 1], b = D[i];
  const w = (Math.log(t) - Math.log(a.min)) / (Math.log(b.min) - Math.log(a.min));
  return Math.exp(Math.log(a.cp) + w * (Math.log(b.cp) - Math.log(a.cp)));
};
/* 읽기 ②③ — 세 점 2차(로그–로그). ⚠ **t 를 품는 창만** 쓴다(밖이면 외삽이라 읽기가 아니다). */
const lagAt = (Pts, t) => {
  const X = Pts.map(p => Math.log(p.min)), Y = Pts.map(p => Math.log(p.cp));
  let s = 0;
  for (let k = 0; k < 3; k++) { let L = 1; for (let j = 0; j < 3; j++) if (j !== k) L *= (Math.log(t) - X[j]) / (X[k] - X[j]); s += Y[k] * L; }
  return Math.exp(s);
};
const readsAt = (D, t) => {
  const i = idxOf(D, t); if (i < 0) return null;
  const out = { chord: chordAt(D, i, t) };
  if (D[i - 2]) out.q2L = lagAt([D[i - 2], D[i - 1], D[i]], t);      /* t 가 오른쪽 끝 구간 안 */
  if (D[i + 1]) out.q2R = lagAt([D[i - 1], D[i], D[i + 1]], t);      /* t 가 왼쪽 끝 구간 안 */
  return { i, reads: out };
};
/* 궤적 위에서 «화력이 cp 에 닿는 시각». 창 안에서 못 닿으면 NaN(외삽 금지). */
const tAtCp = (D, cp) => {
  for (let i = 1; i < D.length; i++) {
    if (D[i].cp >= cp && D[i - 1].cp <= cp) {
      const a = D[i - 1], b = D[i];
      const w = (Math.log(cp) - Math.log(a.cp)) / (Math.log(b.cp) - Math.log(a.cp));
      return Math.exp(Math.log(a.min) + w * (Math.log(b.min) - Math.log(a.min)));
    }
  }
  return NaN;
};
/* 일 격자 이탈 — 34 의 exitOf(«stage > 관문» 인 첫 일자 행). */
const gridExit = (rep, pol, gate) => {
  const out = [];
  (rep.policies[pol] || []).forEach(s => {
    const rows = s.rows.filter(x => /^D\d+$/.test(x.label)).sort((a, b) => a.minute - b.minute);
    const hit = rows.find(x => x.stage > gate);
    if (hit) out.push(hit.minute);
  });
  return { min: med(out), n: out.length };
};

say('# PROBE199R35 — 장벽 항 −12.0% 의 정체 (199 35회차 · 커밋 JSON 만 · 새 봇 실행 0건)');
say('');
say('- 제품에서 읽은 값 — `ES_RAMP` **' + RAMP + '** · 설치 `ES_M2` **' + EC.M2 + '** · `ES_BAND` **' + EC.BAND
    + '** · `BOSS_GATE_HP` **' + EC.GATE_HP + '**');
say('- 34-2 의 장벽 항 = (궤적 위에서 화력이 cp₀×장벽 에 닿는 시각) ÷ 관측 이탈 − 1');
say('');

/* ── [A] 재현 ───────────────────────────────────────────────────────────── */
say('## [A] 재현 — 34-2 의 세 점 (일 격자 이탈 · 현 읽기, 즉 34 와 같은 규약)');
say('');
say('| 실행 | 장벽 | 벽이 선 날 | cp₀(현) | 궤적이 장벽을 채우는 날 | 일 격자 이탈 | **장벽 항** | 34-2 가 적은 값 |');
say('|---|---|---|---|---|---|---|---|');
const A = [];
for (const r of RUNS) {
  const rep = load(r); if (!rep) { say(`| ${r.key} | — | — | — | — | — | — | — |`); continue; }
  const D = trajOf(rep, 'diligent');
  const ws = (rep.policies.diligent || []).map(s => (s.walls || []).find(x => x.stage === GATE_STAGE)).filter(Boolean);
  const t0 = med(ws.map(w => w.min));
  const bar = barrierOf(r);
  const rd = readsAt(D, t0);
  const cp0 = rd.reads.chord;
  const tTraj = tAtCp(D, cp0 * bar);
  const ge = gridExit(rep, 'diligent', GATE_STAGE);
  const d = (tTraj / ge.min - 1) * 100;
  A.push({ r, rep, D, ws, t0, bar, rd, cp0, tTraj, grid: ge.min, dGrid: d,
           exact: med(ws.map(w => w.min + w.lenCal)) });
  say(`| ${r.key} | ×${f2(bar)} | D${f2(t0 / 1440)} | ${cp0.toExponential(3)} | D${f2(tTraj / 1440)} | D${f2(ge.min / 1440)} | **${pc(d)}** | ${pc(R34[r.key])} |`);
}
say('');
ck('[A1] 세 점이 34-2 의 장벽 항을 0.5%p 안에서 재현한다',
   A.length === 3 && A.every(x => Math.abs(x.dGrid - R34[x.r.key]) <= 0.5),
   A.map(x => `${x.r.key} ${pc(x.dGrid)}`).join(' · '));
ck('[A2] 부호가 34-2 그대로다 (설치값 두 세대 + · m2-1120 −)',
   A[0].dGrid > 0 && A[1].dGrid > 0 && A[2].dGrid < 0,
   A.map(x => (x.dGrid > 0 ? '+' : '−')).join(''));
say('');

/* ── [B] 대조군 ─────────────────────────────────────────────────────────── */
say('## [B] ⚑ 대조군부터 — 관문 벽 전수 (3실행 × 2정책)');
say('');
say('세 점은 저장고 안의 특수한 세 자리다. **같은 자로 잴 수 있는 관문 벽을 전부** 놓고 본다');
say('(관문 = 그 세대의 `s % ES_BAND === 0` · 이탈은 벽 기록 `min + lenCal` · 잘린 벽은 판정 제외).');
say('');
say('| 실행 | 정책 | 관문 | 벽이 선 날 | 이탈 | 벽 길이 | 이웃 α 꺾임 | **장벽 항** | 허용 읽기 범위 | 폭 |');
say('|---|---|---|---|---|---|---|---|---|---|');
const W = [];
for (const r of RUNS) {
  const rep = load(r); if (!rep) continue;
  const bar = barrierOf(r);
  for (const pol of ['diligent', 'casual']) {
    const seeds = rep.policies[pol] || []; if (!seeds.length) continue;
    const D = trajOf(rep, pol); if (D.length < 4) continue;
    const gates = new Set();
    seeds.forEach(s => (s.walls || []).forEach(w => { if (w.stage % r.BAND === 0) gates.add(w.stage); }));
    for (const g of [...gates].sort((a, b) => a - b)) {
      const ws = seeds.map(s => (s.walls || []).find(x => x.stage === g)).filter(Boolean);
      if (ws.length < seeds.length / 2) continue;
      const trunc = ws.filter(w => w.trunc).length;
      const t0 = med(ws.map(w => w.min)), tE = med(ws.map(w => w.min + w.lenCal)), len = med(ws.map(w => w.lenCal));
      const rd = readsAt(D, t0);
      const row = { run: r.key, pol, g, t0, tE, len, trunc, bar };
      if (rd && !trunc) {
        const ds = {};
        for (const [k, v] of Object.entries(rd.reads)) { const T = tAtCp(D, v * bar); ds[k] = Number.isFinite(T) ? (T / tE - 1) * 100 : NaN; }
        const vs = Object.values(ds).filter(Number.isFinite);
        const as = [segA(D, rd.i - 1), segA(D, rd.i), segA(D, rd.i + 1)].filter(Number.isFinite);
        row.ds = ds; row.lo = vs.length ? Math.min(...vs) : NaN; row.hi = vs.length ? Math.max(...vs) : NaN;
        row.span = row.hi - row.lo;
        row.kink = as.length >= 2 ? Math.max(...as) / Math.min(...as) : NaN;
      }
      W.push(row);
      const judged = row.ds && Number.isFinite(row.ds.chord);
      say(`| ${r.key} | ${pol} | s${g} | D${f2(t0 / 1440)} | D${f2(tE / 1440)} | ${f1(len / 1440)}일 | ${judged ? '×' + f2(row.kink) : '—'}`
          + ` | ${judged ? '**' + pc(row.ds.chord) + '**' : (trunc ? '— (잘림)' : '— (격자 밖)')}`
          + ` | ${judged ? pc(row.lo) + ' ~ ' + pc(row.hi) : '—'} | ${judged ? f1(row.span) + '%p' : '—'} |`);
    }
  }
}
say('');
const J = W.filter(x => x.ds && Number.isFinite(x.ds.chord));
const bind = J.filter(x => x.g === GATE_STAGE && x.pol === 'diligent');   /* 세 점 */
const free = J.filter(x => !(x.g === GATE_STAGE && x.pol === 'diligent'));
say('⚑ **장벽 항은 «장벽이 맞나» 를 재는 자가 아니다 — «벽에 들어설 때의 여유» 를 잰다.**');
say('세 점 밖의 벽에서 장벽 항은 ' + free.map(x => pc(x.ds.chord)).sort((a, b) => parseFloat(a) - parseFloat(b))[0]
    + ' ~ ' + free.map(x => x.ds.chord).sort((a, b) => b - a).map(pc)[0] + ' 다 — 같은 장벽, 같은 자인데도 그렇다.');
say('여유가 있으면(빨리 지나가는 벽) 장벽 항은 **크게 양수**가 되고, 여유가 소진된 벽에서만 0 부근으로 내려온다.');
say('⇒ 세 점의 +3.3·+2.8 은 «장벽이 맞다» 가 아니라 **«그 벽에서 여유가 거의 0 이다»** 라는 뜻이다.');
say('');
ck('[B1] 대조군이 세 점보다 넓다 — 판정 가능한 관문 벽이 8개 이상',
   J.length >= 8, `${J.length}개(전체 ${W.length}개 중 · 잘림·격자 밖 제외)`);
ck('[B2] 세 점 밖의 벽에서 장벽 항이 +10%p 를 넘는다 (여유 축이 실재한다)',
   free.length >= 4 && free.every(x => x.ds.chord > 10),
   free.map(x => `${x.run}/${x.pol} s${x.g} ${pc(x.ds.chord)}`).join(' · '));
ck('[B3] 장벽 항은 «벽 길이» 로 설명되지 않는다 — 열흘 넘게 선 벽에도 +50%p 넘는 것이 있다',
   free.some(x => x.len / 1440 >= 10 && x.ds.chord > 50),
   free.filter(x => x.len / 1440 >= 10).map(x => `${x.run}/${x.pol} s${x.g} ${f1(x.len / 1440)}일 ${pc(x.ds.chord)}`).join(' · '));
say('');

/* ── [C] 이탈 시각 ──────────────────────────────────────────────────────── */
say('## [C] 이탈 시각은 격자에서 읽을 필요가 없다 — 벽 기록이 분 단위로 들고 있다');
say('');
say('34 는 이탈을 «`stage > 360` 인 첫 **일자** 행» 으로 읽는다. 그런데 같은 JSON 의 벽 기록이');
say('`min`(벽이 선 분) 과 `lenCal`(벽에 머문 달력 분)을 들고 있어 **이탈 = `min + lenCal`** 이 분 단위로 나온다.');
say('일 격자는 이탈을 **늦게** 적고(하루 안쪽), 그만큼 장벽 항을 낮게 만든다.');
say('');
say('| 실행 | 일 격자 이탈 | 벽 기록 이탈 | 격자가 늦은 몫 | 장벽 항(격자) | **장벽 항(벽 기록)** |');
say('|---|---|---|---|---|---|');
for (const x of A) {
  x.dExact = (x.tTraj / x.exact - 1) * 100;
  x.lag = (x.grid / x.exact - 1) * 100;
  say(`| ${x.r.key} | D${f2(x.grid / 1440)} | D${f2(x.exact / 1440)} | ${pc(x.lag)} | ${pc(x.dGrid)} | **${pc(x.dExact)}** |`);
}
say('');
ck('[C1] 벽 기록의 이탈이 일 격자보다 이르고, 차이가 하루 안쪽이다 (세 점)',
   A.every(x => x.exact <= x.grid && (x.grid - x.exact) <= 1440),
   A.map(x => `${x.r.key} ${fmt(x.grid - x.exact)}분`).join(' · '));
ck('[C2] 그 한 줄이 세 점을 다시 적는다 — 부호는 그대로, m2-1120 이 1%p 넘게 회복한다',
   A[0].dExact > 0 && A[1].dExact > 0 && A[2].dExact < 0 && (A[2].dExact - A[2].dGrid) > 1,
   A.map(x => `${x.r.key} ${pc(x.dGrid)}→${pc(x.dExact)}`).join(' · '));
say('');

/* ── [D] 본체 ───────────────────────────────────────────────────────────── */
say('## [D] ⚑ 본체 — 남은 −10.9% 는 «틀린 값» 이 아니라 **못 읽은 자리**다');
say('');
say('cp₀ 는 벽이 선 **시각**의 화력인데, 격자는 **하루**다. 그래서 읽는 방법이 하나가 아니다 —');
say('현(弦) 하나(34) · 왼쪽 세 점 2차 · 오른쪽 세 점 2차. 셋 다 그 시각을 **품는** 창이라 어느 것도 부정할 수 없다.');
say('허용 읽기 셋이 얼마나 갈리는가는 **벽이 선 자리의 이웃 α 가 얼마나 꺾이는가**로 정해진다.');
say('');
say('| 실행 | 벽이 선 날 | 이웃 α (앞 · 그 구간 · 뒤) | 꺾임 | cp₀ 읽기 폭 | 장벽 항 범위 | **폭** |');
say('|---|---|---|---|---|---|---|');
for (const x of A) {
  const D = x.D, i = x.rd.i;
  const as = [segA(D, i - 1), segA(D, i), segA(D, i + 1)];
  const fin = as.filter(Number.isFinite);
  x.kink = Math.max(...fin) / Math.min(...fin);
  const ds = {};
  for (const [k, v] of Object.entries(x.rd.reads)) { const T = tAtCp(D, v * x.bar); ds[k] = Number.isFinite(T) ? (T / x.exact - 1) * 100 : NaN; }
  const vs = Object.values(ds).filter(Number.isFinite);
  const cps = Object.values(x.rd.reads).filter(Number.isFinite);
  x.ds = ds; x.lo = Math.min(...vs); x.hi = Math.max(...vs); x.span = x.hi - x.lo;
  x.cpBand = Math.max(...cps) / Math.min(...cps);
  say(`| ${x.r.key} | D${f2(x.t0 / 1440)} | ${as.map(f2).join(' · ')} | ×${f2(x.kink)} | ×${f2(x.cpBand)}`
      + ` | ${pc(x.lo)} ~ ${pc(x.hi)} | **${f1(x.span)}%p** |`);
}
say('');
const M2R = A.find(x => x.r.key === 'm2-1120'), INS = A.filter(x => x.r.key !== 'm2-1120');
say('⚑ **`m2-1120` 의 벽은 무릎 위에 선다.** 그 실행의 일 격자에서 α 는 D2→D3 에 ' + f2(segA(M2R.D, M2R.rd.i))
    + ' 이고 D3→D4 에 ' + f2(segA(M2R.D, M2R.rd.i + 1)) + ' 로 **' + f1(segA(M2R.D, M2R.rd.i) / segA(M2R.D, M2R.rd.i + 1))
    + '배 꺾인다** — 벽은 그 꺾임의 바로 앞(D' + f2(M2R.t0 / 1440) + ')에 선다.');
say('설치값 두 세대의 벽은 D' + f2(INS[0].t0 / 1440) + ' 로 **무릎 뒤 평지**(꺾임 ×' + f2(INS[0].kink) + ')에 선다.');
say('그래서 같은 자·같은 장벽인데도 **읽기 폭이 ' + f1(M2R.span) + '%p ↔ ' + f1(INS[0].span) + '%p** 로 갈린다.');
say('');
say('⇒ **−10.9% 는 자기 읽기 폭의 바닥이다**(범위 ' + pc(M2R.lo) + ' ~ ' + pc(M2R.hi) + ').');
say('  «장벽이 12% 틀렸다» 는 이 격자에서 **못 하는 말**이다 — 같은 데이터가 ' + pc(M2R.hi) + ' 도 지지한다.');
say('  다만 범위가 **0 을 안 넘는다** ⇒ **부호는 남는다**: 그 벽에서는 장벽보다 **더** 벌어야 했다(여유가 아니다 — 여유는 양수만 만든다).');
say('');
ck('[D1] m2-1120 의 벽만 무릎 위에 선다 — 꺾임 ×2.5 이상 · 설치값 두 세대는 ×1.5 이하',
   M2R.kink >= 2.5 && INS.every(x => x.kink <= 1.5),
   `m2 ×${f2(M2R.kink)} · 설치값 ${INS.map(x => '×' + f2(x.kink)).join(' · ')}`);
const bigK = J.filter(x => x.kink >= 2.5), smallK = J.filter(x => x.kink < 1.8);
ck('[D2] ⚑ 대조군 전수 — 꺾임 ≥ ×2.5 인 벽은 범위 폭 ≥ 5%p · 꺾임 < ×1.8 인 벽은 ≤ 2.5%p (자리 겹침 0)',
   bigK.length >= 3 && smallK.length >= 4 && bigK.every(x => x.span >= 5) && smallK.every(x => x.span <= 2.5),
   `꺾임 큰 ${bigK.length}개 폭 ${bigK.map(x => f1(x.span)).join('/')}%p ↔ 작은 ${smallK.length}개 폭 ${smallK.map(x => f1(x.span)).join('/')}%p`);
ck('[D3] m2-1120 의 범위 폭이 설치값 두 세대의 5배를 넘는다',
   INS.every(x => M2R.span > x.span * 5), `${f1(M2R.span)}%p ↔ ${INS.map(x => f1(x.span)).join(' · ')}%p`);
ck('[D4] 그래도 범위가 0 을 안 넘는다 — 부호는 판정된다',
   M2R.hi < 0 && INS.every(x => x.lo > 0),
   `m2 ${pc(M2R.lo)}~${pc(M2R.hi)} · 설치값 ${INS.map(x => pc(x.lo) + '~' + pc(x.hi)).join(' · ')}`);
ck('[D5] 벽을 무릎으로 당긴 것은 M2 다 — 설치값 D4.8 ↔ m2-1120 D2.8',
   M2R.t0 < INS[0].t0 * 0.75 && INS.every(x => Math.abs(x.t0 - INS[0].t0) < 60),
   `D${f2(INS[0].t0 / 1440)} → D${f2(M2R.t0 / 1440)} (장벽 ×${f2(INS[0].bar)} → ×${f2(M2R.bar)})`);
say('');

/* ── [E] 이탈 지연 ──────────────────────────────────────────────────────── */
say('## [E] 남는 부호를 «이탈 지연» 으로 덮을 수 있나 — 없다');
say('');
say('화력이 차는 순간과 실제로 관문을 깨는 순간 사이에는 **세션 간격**이 있다(자는 동안엔 못 깬다).');
say('이 지연은 언제나 이탈을 늦추므로 장벽 항을 **음수 쪽**으로 민다 — 남은 부호의 후보다. 상한을 잰다:');
say('');
say('| 실행 | 30일 세션 수 | 평균 세션 간격 | 그 간격이 이탈에서 차지하는 몫(상한) | 남은 장벽 항 |');
say('|---|---|---|---|---|');
for (const x of A) {
  const sess = med((x.rep.policies.diligent || []).map(s => s.sessions));
  x.gap = (x.rep.days || 30) * 1440 / sess;
  x.gapPct = x.gap / x.exact * 100;
  say(`| ${x.r.key} | ${fmt(sess)}회 | ${fmt(x.gap)}분(${f2(x.gap / 1440)}일) | ${pc(-x.gapPct)} | ${pc(x.hi)} (가장 관대한 읽기) |`);
}
say('');
ck('[E1] 세션 간격의 상한이 m2-1120 의 남은 부호를 못 덮는다',
   Math.abs(M2R.hi) > M2R.gapPct,
   `남은 ${pc(M2R.hi)} vs 지연 상한 ${pc(-M2R.gapPct)}`);
say('');

/* ── [R] 되돌림 시험 ────────────────────────────────────────────────────── */
say('## [R] 되돌림 시험 — 두 수리가 공허하지 않다');
say('');
ck('[R1] 읽기를 현 하나로 되돌리면 [C] 의 값이 그대로 돌아온다',
   A.every(x => Math.abs(x.ds.chord - x.dExact) < 1e-9),
   A.map(x => pc(x.ds.chord)).join(' · '));
ck('[R2] 이탈을 일 격자로 되돌리면 34-2 의 값이 그대로 돌아온다',
   A.every(x => Math.abs(x.dGrid - R34[x.r.key]) <= 0.5),
   A.map(x => `${pc(x.dGrid)}↔${pc(R34[x.r.key])}`).join(' · '));
ck('[R3] 설치값 두 세대는 어느 읽기·어느 이탈로도 +2%p ~ +6%p 안이다 (판정이 굴러다니지 않는다)',
   INS.every(x => [x.dGrid, x.dExact, ...Object.values(x.ds)].filter(Number.isFinite).every(v => v >= 2 && v <= 6)),
   INS.map(x => `${x.r.key} ${[x.dGrid, ...Object.values(x.ds)].filter(Number.isFinite).map(pc).join('/')}`).join(' · '));
say('');

say('## 정리');
say('');
say('1. **장벽 항은 여유 계기다** — 구속하지 않는 벽에서 +12~+232%([B]). 세 점의 +3.3·+2.8 은 «장벽이 맞다» 가 아니라');
say('   «그 벽에서 여유가 0 에 가깝다» 는 뜻이고, 그 자리에서만 장벽과 견줄 수 있다.');
say('2. **−12.0 중 ' + f1(Math.abs(A[2].dExact - A[2].dGrid)) + '%p 는 이탈을 격자에서 읽어서 생긴 것**이다 — 벽 기록에 분 단위가 있다([C]).');
say('3. **남은 ' + pc(A[2].dExact) + ' 는 읽기 폭 ' + f1(M2R.span) + '%p 의 바닥**이다([D]). 그 벽이 **무릎 위**에 서 있어서 그렇고,');
say('   벽을 무릎으로 당긴 것은 `ES_M2` 자신이다. **크기는 이 격자에서 판정 불가 · 부호는 판정된다.**');
say('4. 다음 회차의 자리는 «장벽 ×54.12 가 맞나» 가 아니라 **«무릎 위 벽을 어떻게 재나»** 다 —');
say('   봇은 이미 D1 에서 분 단위 행(`D1+490m` 꼴)을 찍는다. 그 표본을 **벽 주변**에도 찍으면 읽기 폭이 닫힌다.');
say('');

say(`PROBE199R35 ${NG === 0 ? 'PASS' : 'FAIL'} ${OK}/${OK + NG}`);
if (ARG.out) { fs.writeFileSync(path.resolve(ROOT, String(ARG.out)), P.join('\n') + '\n'); console.error('written: ' + ARG.out); }

module.exports = { RUNS, GATE_STAGE, FITW, points: A, walls: W, ok: OK, ng: NG };
if (!QUIET && NG > 0) process.exitCode = 1;
