#!/usr/bin/env node
/* 199 37회차 — **격자에서 읽은 순간값 위에 세운 판정을 다시 읽는다** (36-8 1번)
 * ─────────────────────────────────────────────────────────────────────────────
 * 36 이 찍은 것: 하루 격자의 현(弦) 읽기는 순간 cp 를 **12~65% 낮게** 읽고, 그 편향은
 * 벽 여덟 개 전부에서 같은 쪽이다(잡음이 아니다). 36-8 1번이 그래서 이렇게 적었다 —
 *   «35 이전 회차가 «격자에서 읽은 순간값» 으로 세운 판정을 훑어라. 최소한 **34-2 세 점**과
 *    **31-2 벽 간격 항등식**은 `wrows` 로 다시 읽어야 한다.»
 *
 * 이 자가 하는 일은 셋이다:
 *   [A] 재현 — 옛 실행 셋으로 34-1(=31-2) 의 세 점이 그대로 나오는지 (338 규칙)
 *   [B] ⚑ **입력 감사** — 세 판정(31-2 항등식 · 34-2 분해 · 34-4 α_span)이 각각 무엇을 먹는가.
 *       격자 보간을 먹는 것은 **34-2 분해 하나뿐**이고, 그것이 36 편향에 물리는 유일한 자리다.
 *   [C] ⚑⚑ **본체** — 34-2 의 분해를 **보간 0건**으로 다시 짠다. 벽 시작 행과 이탈 행이
 *       둘 다 있으므로 «벽을 건너며 화력이 실제로 몇 배 됐는가»(G)를 직접 잴 수 있다:
 *
 *         ln(예측/관측) = 〔장벽 항〕 (ln 장벽 − ln G)/α말미
 *                        + 〔α 항〕   ln G × (1/α말미 − 1/α_obs)          … α_obs = ln G / ln(t_이탈/t_벽)
 *
 *       둘 다 **벽 기록 + 제품 파생 상수**만 먹는다(격자 보간 0건 · 합은 항등식으로 전체와 같다).
 *   [D] 장벽 항이 무엇을 재는 계기인가 — «벽이 설 때 이미 있던 여유»(장벽 ÷ G) 이고,
 *       그 크기는 **벽 직전 진행 속도**와 같이 움직인다.
 *   [E] 31-2 의 세 점을 〔36정정A〕(닫힌 식 → 파생 장벽)로 다시 계산한다.
 *
 * ⚠ 손 상수를 하나도 안 든다 — 장벽은 제품 `eScale`·`BOSS_GATE_HP` 에서 관문마다 파생하고
 *    (35 의 닫힌 식 `M2^(폭·(1−RAMP))·GATE` 는 〔36정정A〕 로 근사임이 확정됐다),
 *    옛 실행을 읽을 때는 **그 실행의 트리**(사다리 이전)를 사본으로 만들어 거기서 파생한다.
 * ⚠ 새 봇 실행은 안 한다 — 커밋된 JSON 만 읽는다(자가 시뮬을 품으면 회귀에서 아무도 안 돌린다).
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
const f3 = v => Number.isFinite(v) ? v.toFixed(3) : '—';
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
const withM2 = (src, m2) => m2 == null ? src : src.replace(/const ES_M2\s*=\s*[\d.]+;/, 'const ES_M2   = ' + m2 + ';');
/* 사다리 이전 트리 사본 — 32회차가 `ES_BAND2`·`ES_BANDG` 를 넣기 전의 곡선.
   옛 실행(r28·r31)은 그 트리에서 나온 값이라 장벽도 그 트리에서 파생해야 한다. */
const preLadder = src => src.replace(/const ES_BAND2\b/, 'const ES_BAND2_OFF').replace(/const ES_BANDG\b/, 'const ES_BANDG_OFF');
const mkEC = (m2, ladder, tag) => readEC(withM2(ladder ? SRC : preLadder(SRC), m2), tag);

const EC = mkEC(null, true, 'PROBE199R37');
const barrierAt = (ec, g) => ec.eScale(g) / ec.eScale(g - 1) * (ec.GATE_HP || 1);
const barClosed = (ec, g) => Math.pow(ec.M2, ec.eBandW(g) * (1 - ec.RAMP)) * (ec.GATE_HP || 1);

/* ── 옛 실행 셋 — 34-1 이 읽은 그 파일들(사다리 이전 세대) ─────────────────── */
const OLD = [
  { key: 'base',    file: '199-bot-2026-09-03-r31-base.json',       m2: null,  d31: 14.3, src: '31회차 기준선(설치값)' },
  { key: 'r28base', file: '199-bot-2026-09-03-r28-base.json',       m2: null,  d31: 13.9, src: '28-3 base(설치값 · 다른 세대)' },
  { key: 'm2-1120', file: '199-bot-2026-09-03-r28-sw-m2-1120.json', m2: 1.120, d31: 6.7,  src: '28-3 스윕 — 무릎 위 지수를 내렸다' },
];
/* ── 새 실행 둘 — 36회차가 벽 주변 분 단위 행을 실은 것(`wrows`) ───────────── */
const NEW = [
  { key: 'base',    file: '199-bot-2026-09-06-r36-base.json',       m2: null,  src: '설치값 — 36회차 새 실행' },
  { key: 'm2-1120', file: '199-bot-2026-09-06-r36-sw-m2-1120.json', m2: 1.120, src: '28-3 스윕 재현' },
];
const POLS = ['diligent', 'casual'];
const GATE_STAGE = 360;      /* 31-2·34-2 가 맞힌 그 관문 */
const FITW = [6, 27];        /* 31-2 의 말미 창 — 같은 것을 재려면 같은 창이어야 한다 */

const load = f => { const p = path.join(ROOT, 'docs', 'review', f);
                    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };

/* ── 34-2 와 **같은 자** (같은 것을 재려면 같은 자여야 한다) ───────────────── */
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
const alphaOf = (days, d0, d1) => {
  const pts = days.filter(x => x.d >= d0 && x.d <= d1 && x.cp > 0).map(x => ({ x: Math.log(x.d), y: Math.log(x.cp) }));
  const n = pts.length; if (n < 3) return NaN;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0, sxx = 0;
  pts.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; });
  return sxy / sxx;
};
const cpAt = (days, t) => {                       /* 격자 «현» 읽기 — 36 이 편향을 잰 바로 그 자 */
  for (let i = 1; i < days.length; i++) if (days[i].min >= t && days[i - 1].min <= t) {
    const a = days[i - 1], b = days[i];
    const w = (Math.log(t) - Math.log(a.min)) / (Math.log(b.min) - Math.log(a.min));
    return Math.exp(Math.log(a.cp) + w * (Math.log(b.cp) - Math.log(a.cp)));
  }
  return NaN;
};
const tAtCp = (days, cp) => {                     /* 그 역함수 — 창 밖이면 NaN(외삽 금지) */
  for (let i = 1; i < days.length; i++) if (days[i].cp >= cp && days[i - 1].cp <= cp) {
    const a = days[i - 1], b = days[i];
    const w = (Math.log(cp) - Math.log(a.cp)) / (Math.log(b.cp) - Math.log(a.cp));
    return Math.exp(Math.log(a.min) + w * (Math.log(b.min) - Math.log(a.min)));
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
    if (hit) out.push(hit.minute);
  });
  return med(out);
};

/* ── 벽 모둠 — 36 의 대조군 정의 그대로(관문 · 안 잘린 것 · 표본 절반 이상) ── */
const startRow = (seed, w) => (seed.wrows || []).find(x => x.label === 'S' + w.stage + '@' + w.min + 'm');
const exitRow  = (seed, w) => (seed.wrows || []).find(x => /^W\d+x/.test(x.label) && (w.rows || []).includes(x.label));
const wallsOf = (rep, pol) => {
  const seeds = rep.policies[pol] || [];
  const gateSet = new Set((seeds[0] && seeds[0].gateSet) || []);
  const byStage = new Map();
  seeds.forEach(s => (s.walls || []).forEach(w => {
    if (w.trunc || !gateSet.has(w.stage)) return;
    if (!byStage.has(w.stage)) byStage.set(w.stage, []);
    byStage.get(w.stage).push({ w, seed: s });
  }));
  return { byStage, seedsN: seeds.length };
};

say('# PROBE199R37 — 격자 위에 세운 판정을 다시 읽는다 (199 37회차 · 커밋 JSON 만 · 새 봇 실행 0건)');
say('');
say('- 제품에서 읽은 값 — `ES_RAMP` **' + EC.RAMP + '** · 설치 `ES_M2` **' + EC.M2 + '** · `ES_BAND` **' + EC.BAND
    + '**' + (EC.BAND2 ? ' → 사다리 **' + EC.BAND2 + '**(문턱 s' + EC.SW + ')' : '') + ' · `BOSS_GATE_HP` **' + EC.GATE_HP + '**');
say('- 장벽은 손 상수가 아니다 — 관문마다 `eScale(g)/eScale(g−1)×BOSS_GATE_HP`. 옛 실행은 **사다리 이전 사본**에서 파생한다.');
say('- 말미 창 **D' + FITW[0] + '~D' + FITW[1] + '** · 관문 **s' + GATE_STAGE + '** (31-2·34-2 와 같은 창·같은 관문)');
say('');

const REPO = {}; OLD.forEach(r => { REPO[r.key] = load(r.file); r.ec = mkEC(r.m2, false, 'R37-old-' + r.key); });
const REPN = {}; NEW.forEach(r => { REPN[r.key] = load(r.file); r.ec = mkEC(r.m2, true,  'R37-new-' + r.key); });
const miss = [...OLD.filter(r => !REPO[r.key]).map(r => r.file), ...NEW.filter(r => !REPN[r.key]).map(r => r.file)];
if (miss.length) {
  say('**실행 JSON 이 없다** — ' + miss.map(f => '`docs/review/' + f + '`').join(' · '));
  say('');
  say('PROBE199R37 FAIL — 입력 없음');
  process.exit(1);
}

/* ═══ [A] 재현 ═══════════════════════════════════════════════════════════ */
say('## [A] 재현 — 34-1(=31-2) 의 세 점이 자릿수까지 그대로다 (338 규칙)');
say('');
say('| 실행 | 닫힌 식 장벽 | α(말미) | 벽이 선 시각 | (★) 예측 | 관측 이탈 | Δ | 31-2 가 적은 Δ |');
say('|---|---|---|---|---|---|---|---|');
const A = [];
for (const r of OLD) {
  const rep = REPO[r.key], D = trajOf(rep, 'diligent');
  const a = alphaOf(D, FITW[0], FITW[1]);
  const t0 = wallStartOf(rep, 'diligent', GATE_STAGE);
  const t1 = exitOf(rep, 'diligent', GATE_STAGE);
  const barC = barClosed(r.ec, GATE_STAGE), barD = barrierAt(r.ec, GATE_STAGE);
  const pred = t0 * Math.pow(barC, 1 / a);
  A.push({ ...r, a, t0, t1, barC, barD, pred, d: (pred / t1 - 1) * 100 });
  say(`| ${r.key} | ×${f2(barC)} | ${f2(a)} | ${Math.round(t0).toLocaleString()}분 | **${Math.round(pred).toLocaleString()}분**`
      + ` | ${Math.round(t1).toLocaleString()}분 | **${pc((pred / t1 - 1) * 100)}** | +${r.d31}% |`);
}
say('');
ck('[A1] 세 점이 34-1 의 표를 0.5%p 안에서 재현한다',
   A.every(x => Math.abs(x.d - x.d31) <= 0.5), A.map(x => pc(x.d)).join(' · '));
{
  let n = 0, ok = 0;
  for (const r of NEW) for (const pol of POLS) {
    const { byStage, seedsN } = wallsOf(REPN[r.key], pol);
    for (const [, list] of byStage) { if (list.length < Math.max(2, seedsN / 2)) continue;
      n++; if (list.every(x => startRow(x.seed, x.w) && exitRow(x.seed, x.w))) ok++; }
  }
  ck('[A2] 새 실행 두 개의 벽 모둠마다 «시작 행» 과 «이탈 행» 이 둘 다 있다 (보간 없이 G 를 잴 수 있다)',
     n >= 8 && ok === n, `${ok}/${n}개 모둠`);
}
say('');

/* ═══ [B] 입력 감사 ══════════════════════════════════════════════════════ */
say('## [B] ⚑ 입력 감사 — 36 편향에 물리는 판정은 **하나뿐**이다');
say('');
say('| 판정 | 먹는 입력 | 출처 | 36 편향(격자 현 −12~−65%)에 물리나 |');
say('|---|---|---|---|');
say('| 31-2 항등식 (★) | `t_벽` · `t_이탈` · 장벽 · α(말미) | 벽 기록 · D 행 **기울기** · 제품 파생 | **아니다** — 보간 0건([B1] 흔들기에 3%p 안) |');
say('| 34-4 α_span | 장벽 · `t_벽` · `t_이탈` | 벽 기록 · 제품 파생 | **아니다** — 격자를 아예 안 읽는다 |');
say('| **34-2 분해** | **cp₀(격자 현)** · **cp₀×장벽 에 닿는 시각(격자 역보간)** | **격자 보간 ×2** | **그렇다**([B2] 32.5%p) |');
say('');
{
  /* 31-2 항등식이 격자에서 먹는 것은 «보간» 이 아니라 D 행 **표본의 기울기**(α말미) 하나다.
     ⚠ «안 먹으니까 안 변한다» 는 공허참이다 — 그러니 **실제로 흔들어서** 잰다:
     같은 창을 홀수 날 / 짝수 날로 반씩 잘라 α 를 다시 회귀한다. 격자가 순간값을 낮게 읽는
     36 편향이 기울기까지 옮긴다면 반쪽 둘이 갈릴 것이고, 안 갈리면 항등식은 그 편향과 무관하다. */
  const dA = [], dSpread = [];
  for (const r of OLD) {
    const rep = REPO[r.key], D = trajOf(rep, 'diligent');
    const t0 = wallStartOf(rep, 'diligent', GATE_STAGE), t1 = exitOf(rep, 'diligent', GATE_STAGE);
    const subs = [D, D.filter(x => x.d % 2 === 1), D.filter(x => x.d % 2 === 0)].map(S => alphaOf(S, FITW[0], FITW[1]));
    const ds = subs.map(a => (t0 * Math.pow(barClosed(r.ec, GATE_STAGE), 1 / a) / t1 - 1) * 100);
    dA.push(Math.max(...subs) / Math.min(...subs) - 1);
    dSpread.push(Math.max(...ds) - Math.min(...ds));
  }
  const identWorst = Math.max(...dSpread);

  /* 34-2 분해는 두 입력이 다 보간이다 — 허용 읽기(현·좌2차·우2차)만 갈아도 값이 갈린다. */
  const lagAt = (P, t) => {
    const X = P.map(p => Math.log(p.min)), Y = P.map(p => Math.log(p.cp));
    let s = 0;
    for (let k = 0; k < 3; k++) { let L = 1; for (let j = 0; j < 3; j++) if (j !== k) L *= (Math.log(t) - X[j]) / (X[k] - X[j]); s += Y[k] * L; }
    return Math.exp(s);
  };
  let worst = 0, worstTag = '';
  for (const r of NEW) for (const pol of POLS) {
    const rep = REPN[r.key], D = trajOf(rep, pol), { byStage, seedsN } = wallsOf(rep, pol);
    for (const [stage, list] of byStage) {
      if (list.length < Math.max(2, seedsN / 2)) continue;
      const t0 = med(list.map(x => x.w.min));
      const t1 = med(list.map(x => { const xr = exitRow(x.seed, x.w); return xr ? xr.minute : NaN; }));
      const bar = barrierAt(r.ec, stage);
      let i = -1; for (let k = 1; k < D.length; k++) if (D[k].min >= t0 && D[k - 1].min <= t0) { i = k; break; }
      if (i < 1) continue;
      const reads = [cpAt(D, t0)];
      if (D[i - 2]) reads.push(lagAt([D[i - 2], D[i - 1], D[i]], t0));
      if (D[i + 1]) reads.push(lagAt([D[i - 1], D[i], D[i + 1]], t0));
      const vals = reads.map(cp => { const T = tAtCp(D, cp * bar); return Number.isFinite(T) ? (T / t1 - 1) * 100 : NaN; })
                        .filter(Number.isFinite);
      if (vals.length < 2) continue;
      const sp = Math.max(...vals) - Math.min(...vals);
      if (sp > worst) { worst = sp; worstTag = `${r.key}/${pol} s${stage} ${f1(Math.min(...vals))}~${f1(Math.max(...vals))}%`; }
    }
  }
  ck('[B1] 31-2 항등식은 격자에서 «기울기» 하나만 먹는다 — 표본을 반씩 갈라도 세 점이 3%p 안에서만 움직인다',
     dA.every(v => v <= 0.02) && dSpread.every(v => v <= 3.0),
     'α 변동 ' + dA.map(v => pc(v * 100)).join(' · ') + ' · 세 점 변동 ' + dSpread.map(v => f2(v)).join(' · ') + '%p');
  ck('[B2] ⚑ 34-2 분해는 **허용 읽기를 갈기만 해도** 값이 갈린다 — 같은 종류의 흔들기에서 항등식의 10배 넘게 움직인다',
     worst >= 5 && worst >= identWorst * 10, `분해 최대 폭 ${f1(worst)}%p(${worstTag}) ↔ 항등식 ${f2(identWorst)}%p`);
}
say('');

/* ═══ [C] 본체 — 보간 0건 분해 ═══════════════════════════════════════════ */
say('## [C] ⚑⚑ 본체 — 34-2 의 분해를 **보간 0건**으로 다시 짠다');
say('');
say('> **장벽 항** = (ln 장벽 − ln G) / α말미  ·  **α 항** = ln G × (1/α말미 − 1/α_obs)  ·  α_obs = ln G / ln(t_이탈/t_벽)');
say('> G = 벽을 건너며 화력이 실제로 커진 배수 = `cp(이탈 행) ÷ cp(시작 행)` — **둘 다 봇이 직접 찍은 값**이다.');
say('');
say('| 실행/정책 | 관문 | 벽이 선 날 | 장벽 | **실측 G** | G÷장벽 | α말미 | α_obs | 전체 | **장벽 항** | **α 항** |');
say('|---|---|---|---|---|---|---|---|---|---|---|');
const W = [];
for (const r of NEW) for (const pol of POLS) {
  const rep = REPN[r.key], D = trajOf(rep, pol), aL = alphaOf(D, FITW[0], FITW[1]);
  const { byStage, seedsN } = wallsOf(rep, pol);
  for (const [stage, list] of [...byStage].sort((a, b) => a[0] - b[0])) {
    if (list.length < Math.max(2, seedsN / 2)) continue;
    const per = list.map(({ w, seed }) => {
      const s0 = startRow(seed, w), xr = exitRow(seed, w);
      if (!s0 || !xr || !(s0.cp > 0) || !(xr.cp > 0)) return null;
      const S = (seed.wrows || []).filter(x => (w.rows || []).includes(x.label) && /^S\d+@/.test(x.label))
                                  .sort((a, b) => a.minute - b.minute);
      const spd = (S.length >= 2 && s0.minute > S[0].minute) ? (s0.stage - S[0].stage) / (s0.minute - S[0].minute) : NaN;
      return { t0: w.min, t1: xr.minute, G: xr.cp / s0.cp, spd, slack: NaN };
    }).filter(Boolean);
    if (per.length < 2) continue;
    const bar = barrierAt(r.ec, stage);
    per.forEach(p => { p.slack = bar / p.G; });
    const t0 = med(per.map(p => p.t0)), t1 = med(per.map(p => p.t1)), G = med(per.map(p => p.G));
    const spd = med(per.map(p => p.spd));
    const aObs = Math.log(G) / Math.log(t1 / t0);
    const lnBar = (Math.log(bar) - Math.log(G)) / aL;
    const lnAlp = Math.log(G) * (1 / aL - 1 / aObs);
    const tot = Math.pow(bar, 1 / aL) * t0 / t1 - 1;
    W.push({ run: r.key, pol, stage, t0, t1, bar, G, slack: bar / G, aL, aObs, spd, per,
             tot: tot * 100, barT: (Math.exp(lnBar) - 1) * 100, alT: (Math.exp(lnAlp) - 1) * 100,
             sum: (Math.exp(lnBar + lnAlp) - 1) * 100, n: per.length });
    say(`| ${r.key}/${pol} | s${stage} | D${f2(t0 / 1440)} | ×${f2(bar)} | **×${f2(G)}** | ${f3(G / bar)}`
        + ` | ${f2(aL)} | ${f2(aObs)} | ${pc(tot * 100)} | **${pc((Math.exp(lnBar) - 1) * 100)}** | **${pc((Math.exp(lnAlp) - 1) * 100)}** |`);
  }
}
say('');
ck('[C0] 두 항의 합이 전체 어긋남과 같다 (분해가 항등식이다 · 0.1%p)',
   W.length >= 8 && W.every(x => Math.abs(x.sum - x.tot) < 0.1), `벽 ${W.length}개 · 최대 차 ${f3(Math.max(...W.map(x => Math.abs(x.sum - x.tot))))}%p`);
ck('[C1] ⚑⚑ 34-2 [B2] «장벽 항은 부호가 갈린다 = 계통이 아니다» 가 **뒤집힌다** — 정확 읽기로는 벽 전부 양수다',
   W.every(x => x.barT > 0), `${W.filter(x => x.barT > 0).length}/${W.length} 양수 · ${pc(Math.min(...W.map(x => x.barT)))} ~ ${pc(Math.max(...W.map(x => x.barT)))}`);
{
  /* ⚠ «전부 양수» 라고 쓰면 안 된다 — 한 벽(말미 창과 구간이 거의 겹치는 대충 벽)이 −0.4% 다.
     그 크기는 같은 벽의 장벽 항의 1/200 이하라 «부호가 갈린다» 고 부를 수 있는 값이 아니다.
     문턱을 넓혀 초록으로 만든 것이 아니라, **음수의 크기에 상한을 걸어** 판정을 좁혔다. */
  const neg = W.filter(x => x.alT <= 0);
  ck('[C2] 34-2 [B1] «α 항은 계통» 은 **산다** — 아홉이 양수이고 음수 한 자리는 눈금 안이다',
     W.filter(x => x.alT > 0).length >= W.length - 1
     && neg.every(x => Math.abs(x.alT) <= 1 && Math.abs(x.alT) * 200 <= Math.abs(x.barT)),
     `${W.filter(x => x.alT > 0).length}/${W.length} 양수 · ${pc(Math.min(...W.map(x => x.alT)))} ~ ${pc(Math.max(...W.map(x => x.alT)))}`
     + (neg.length ? ' · 음수 ' + neg.map(x => `${x.run}/${x.pol} s${x.stage} ${pc(x.alT)} (같은 벽 장벽 항 ${pc(x.barT)})`).join(' · ') : ''));
}
{
  const late = W.filter(x => x.stage >= GATE_STAGE);
  ck('[C3] 34-2 [B3] «α 항이 절반 이상» 은 **34-2 가 본 그 자리(말미 관문 벽)에서는 산다**',
     late.length >= 2 && late.every(x => x.alT > x.barT),
     late.map(x => `${x.run}/s${x.stage} α ${pc(x.alT)} > 장벽 ${pc(x.barT)}`).join(' · '));
  const early = W.filter(x => x.barT > x.alT);
  ck('[C4] 그러나 «절반 이상» 은 벽을 안 가리는 말이 아니다 — 이른 벽에서는 장벽 항이 더 크다',
     early.length >= 2, `${early.length}개 벽에서 장벽 항 > α 항 · ` + early.map(x => `${x.run}/${x.pol} s${x.stage}`).join(' · '));
}
say('');

/* ═══ [D] 장벽 항은 «여유» 계기다 ═══════════════════════════════════════ */
say('## [D] 장벽 항이 재는 것 — «벽이 설 때 이미 있던 여유»(장벽 ÷ G)');
say('');
say('모형은 «넘으려면 화력이 ×장벽 이 돼야 한다» 고 말한다. 실측 G 가 그보다 작으면 그만큼');
say('**벽이 설 때 이미 여유가 있었다**(= 직전 관문을 겨우 넘은 상태가 아니었다)는 뜻이다.');
say('');
say('| 실행/정책 | 관문 | 벽 직전 진행 속도 | **여유 = 장벽÷G** | 장벽 항 |');
say('|---|---|---|---|---|');
for (const x of W.slice().sort((a, b) => a.spd - b.spd))
  say(`| ${x.run}/${x.pol} | s${x.stage} | ${f2(x.spd)} 스테이지/분 | **×${f2(x.slack)}** | ${pc(x.barT)} |`);
say('');
{
  const inst = [];
  W.forEach(x => x.per.forEach(p => inst.push(p.slack)));
  ck('[D1] 벽 모둠 p50 의 여유가 **전부 1 이상**이다 — 모형은 요구를 부풀리는 쪽으로만 틀린다',
     W.every(x => x.slack >= 1), `×${f2(Math.min(...W.map(x => x.slack)))} ~ ×${f2(Math.max(...W.map(x => x.slack)))}`);
  ck('[D2] 음성항 — 시드별로는 1 아래가 있다 (그래서 «예외 없이» 라고 쓰면 안 된다)',
     inst.some(v => v < 1) && med(inst) > 1,
     `${inst.filter(v => v < 1).length}/${inst.length} 인스턴스가 <1 (최소 ×${f2(Math.min(...inst))}) · p50 ×${f2(med(inst))}`);
  const slow = W.filter(x => x.spd <= 0.7), fast = W.filter(x => x.spd >= 1.6);
  ck('[D3] ⚑ 여유는 **벽 직전 진행 속도**와 같이 움직인다 — 느린 벽은 1 부근, 빠른 벽은 배수다',
     slow.length >= 3 && fast.length >= 3
     && slow.every(x => x.slack <= 1.5) && fast.every(x => x.slack >= 2.0),
     `느린 ${slow.length}개 ×${slow.map(x => f2(x.slack)).join('/')} ↔ 빠른 ${fast.length}개 ×${fast.map(x => f2(x.slack)).join('/')}`);
  ck('[D4] ⇒ «장벽이 실제로 세운 벽» 은 진행이 이미 느려진 뒤의 벽뿐이다 (여유 ≤ ×1.15 인 벽은 전부 느린 벽)',
     W.filter(x => x.slack <= 1.15).length >= 2 && W.filter(x => x.slack <= 1.15).every(x => x.spd <= 0.7),
     W.filter(x => x.slack <= 1.15).map(x => `${x.run}/s${x.stage} ×${f2(x.slack)} (${f2(x.spd)}/분)`).join(' · '));
}
say('');

/* ═══ [E] 31-2 세 점 재계산 ═════════════════════════════════════════════ */
say('## [E] 31-2 의 세 점을 〔36정정A〕 로 다시 계산한다 (닫힌 식 → 파생 장벽)');
say('');
say('| 실행 | 닫힌 식 | **파생 장벽** | 차 | Δ(31-2) | **Δ(파생)** | α_span(닫힌 식) | **α_span(파생)** | α(말미) |');
say('|---|---|---|---|---|---|---|---|---|');
const E = [];
for (const x of A) {
  const predD = x.t0 * Math.pow(x.barD, 1 / x.a);
  const dD = (predD / x.t1 - 1) * 100;
  const spanC = Math.log(x.barC) / Math.log(x.t1 / x.t0);
  const spanD = Math.log(x.barD) / Math.log(x.t1 / x.t0);
  E.push({ ...x, dD, spanC, spanD });
  say(`| ${x.key} | ×${f2(x.barC)} | **×${f2(x.barD)}** | ${pc((x.barD / x.barC - 1) * 100)} | ${pc(x.d)}`
      + ` | **${pc(dD)}** | ${f2(spanC)} | **${f2(spanD)}** | ${f2(x.a)} |`);
}
say('');
ck('[E1] 옛 트리에서도 닫힌 식이 파생보다 낮다 — 〔36정정A〕 는 사다리 이전 세대에도 해당한다',
   E.every(x => x.barD / x.barC - 1 >= 0.10), E.map(x => pc((x.barD / x.barC - 1) * 100)).join(' · '));
ck('[E2] ⚑ 세 점의 어긋남이 **커진다** (부호는 그대로 · 31-2 의 «+6~14%» 는 낮게 적힌 값이었다)',
   E.every(x => x.dD > x.d) && E.every(x => x.dD > 0), E.map(x => `${pc(x.d)} → ${pc(x.dD)}`).join(' · '));
ck('[E3] 34-4 의 방향은 **산다** — α_span 이 파생 장벽 위에서도 말미 α 보다 크다(세 점 전부)',
   E.every(x => x.spanD > x.a), E.map(x => `${f2(x.a)} → ${f2(x.spanD)} (${pc((x.spanD / x.a - 1) * 100)})`).join(' · '));
ck('[E4] 그러나 α_span 의 **값**이 바뀐다 — 34-4 표를 인용하는 다음 회차는 파생 열을 써야 한다',
   E.some(x => Math.abs(x.spanD - x.spanC) >= 0.05), E.map(x => `${f2(x.spanC)} → ${f2(x.spanD)}`).join(' · '));
say('');

/* ═══ [R] 되돌림 ════════════════════════════════════════════════════════ */
say('## [R] 되돌림 시험 — 두 정정을 되돌리면 34-2·31-2 의 그림이 그대로 돌아온다');
say('');
{
  /* R1 — 격자 현으로 되돌리면 «음수 장벽 항» 이 다시 나온다(34-2 가 본 그 부호). */
  const negs = [];
  for (const r of NEW) for (const pol of POLS) {
    const rep = REPN[r.key], D = trajOf(rep, pol), { byStage, seedsN } = wallsOf(rep, pol);
    for (const [stage, list] of byStage) {
      if (list.length < Math.max(2, seedsN / 2)) continue;
      const t0 = med(list.map(x => x.w.min));
      const t1 = med(list.map(x => { const xr = exitRow(x.seed, x.w); return xr ? xr.minute : NaN; }));
      const cp0 = cpAt(D, t0); if (!Number.isFinite(cp0)) continue;
      const T = tAtCp(D, cp0 * barrierAt(r.ec, stage));
      if (Number.isFinite(T) && T / t1 - 1 < 0) negs.push(`${r.key}/${pol} s${stage} ${pc((T / t1 - 1) * 100)}`);
    }
  }
  ck('[R1] 격자 현으로 되돌리면 34-2 가 본 **음수 장벽 항**이 다시 나온다 (내가 값을 만든 게 아니다)',
     negs.length >= 1, negs.join(' · ') || '없다');
}
ck('[R2] 닫힌 식으로 되돌리면 [E] 의 세 점이 34-1 표로 정확히 돌아간다',
   A.every(x => Math.abs(x.d - x.d31) <= 0.5), A.map(x => pc(x.d)).join(' · '));
{
  /* R3 — 손 상수를 안 든다: 제품 상수를 흔들면 장벽이 따라 움직인다. */
  const shook = readEC(withM2(SRC, 1.200), 'R37-shake');
  ck('[R3] 자가 손 상수를 안 든다 — 제품의 `ES_M2` 를 흔들면 파생 장벽이 따라 움직인다',
     Math.abs(barrierAt(shook, GATE_STAGE) / barrierAt(EC, GATE_STAGE) - 1) > 0.2,
     `×${f2(barrierAt(EC, GATE_STAGE))} → ×${f2(barrierAt(shook, GATE_STAGE))} (ES_M2 1.127 → 1.200)`);
}
say('');

/* ═══ 정리 ══════════════════════════════════════════════════════════════ */
say('## 정리');
say('');
say('1. **36-8 1번을 이행했다** — 세 판정 중 36 편향에 물리는 것은 **34-2 분해 하나**다([B]).');
say('   31-2 항등식과 34-4 α_span 은 입력에 격자 보간이 0건이라 편향과 무관하다.');
say('2. ⚑⚑ **34-2 의 두 결론 중 하나가 뒤집힌다**([C1]) — 보간 0건으로 다시 가르면 장벽 항이');
say('   벽 ' + W.length + '개 **전부 양수**(' + pc(Math.min(...W.map(x => x.barT))) + ' ~ ' + pc(Math.max(...W.map(x => x.barT))) + ')다.');
say('   «장벽 ×66.06 은 이미 맞는 수» 는 **격자가 낮게 읽어 준 값**이었다. α 항이 계통이라는 쪽([C2])은 산다');
say('   (아홉이 양수 · 음수 한 자리는 ' + pc(Math.min(...W.map(x => x.alT))) + ' 로 같은 벽 장벽 항의 1/200 아래다).');
say('3. 장벽 항은 «틀린 장벽» 이 아니라 **«벽이 설 때 이미 있던 여유»** 를 재는 계기다([D]) —');
say('   여유는 벽 직전 진행 속도와 같이 움직이고([D3]), 1 부근인 벽은 진행이 이미 느려진 자리뿐이다([D4]).');
say('   ⇒ 장벽을 견주는 회차는 **그 벽들만** 써야 한다(빠른 벽은 장벽이 아니라 여유를 잰다).');
say('4. 〔36정정A〕 를 옛 실행에 대면 31-2 의 세 점이 ' + E.map(x => `${pc(x.d)}→${pc(x.dD)}`).join(' · ') + ' 로 커진다([E2]).');
say('   34-4 의 방향(α_span > 말미 α)은 살지만 **값이 바뀌므로**([E4]) 다음 회차는 파생 열을 인용해야 한다.');
say('');
gen0Check('199-bot-2026-09-06-r36-base.json');   /* 상수를 실은 실행으로 대조한다(r31 세대 표는 사다리 상수를 안 싣는다) */

say((NG === 0 ? 'PROBE199R37 PASS ' : 'PROBE199R37 FAIL ') + OK + '/' + (OK + NG));
process.exit(NG === 0 ? 0 : 1);
