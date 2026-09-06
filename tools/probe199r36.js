#!/usr/bin/env node
/* 199 36회차 — **벽 주변 분 단위 행이 읽기 폭을 닫는가** (35-7 1번)
 * ─────────────────────────────────────────────────────────────────────────────
 * 35-4 는 `m2-1120` 의 장벽 항 −10.9% 를 **값이 아니라 범위**(−11.9 ~ −3.8%, 폭 8.1%p)로 되돌렸다.
 * 이유는 밸런스가 아니라 **자**였다 — cp₀ 는 «벽이 선 **시각**» 의 화력인데 봇의 격자는 «하루» 라,
 * 그 시각을 품는 창이 셋(현·왼쪽 2차·오른쪽 2차)이고 셋 다 정당했다. 35-7 1번이 처방이다:
 *   «봇은 이미 D1 에서 분 단위 행을 찍는다. 같은 표본을 **벽이 선 시각 주변**에도 찍으면 폭이 닫힌다.
 *    ⚠ 이건 봇 변경 + 새 실행이라 커밋 JSON 만으로는 못 한다.»
 *
 * 이 자는 그 새 실행 둘(`…-r36-base` · `…-r36-sw-m2-1120`)을 읽어 다음을 판정한다:
 *   [A] 봇이 실제로 벽 주변을 찍었나 — 벽마다 시작·안·이탈 행이 있고, 시작 행이 **그 분** 그 스테이지다
 *   [B] 격자 읽기 폭 — 35-4 의 자를 새 실행에 그대로 대 본다(꺾임 ↔ 폭의 관계가 재현되는가)
 *   [C] ⚑ **본체** — 정확 읽기(벽 시작 행의 cp)로 폭이 **0 으로 닫힌다**
 *   [D] 격자가 그 자리에서 얼마나 틀렸나 — 무릎 위 벽에서 현(弦) 읽기의 cp₀ 오차
 *   [E] 장벽 항 — 이제 «범위» 가 아니라 **한 값**이다. 부호(35-4)가 살아남는가
 *   [R] 되돌림 시험 — 벽 행을 안 보면 35-4 의 폭이 그대로 돌아온다
 *
 * ⚠ **장벽은 손으로 안 적는다** — 제품의 `eScale`·`BOSS_GATE_HP` 에서 관문마다 파생한다
 *    (`tools/ecurve.js`). 35 의 닫힌 식 `M2^(BAND·(1−RAMP))·GATE` 는 «폭이 한 숫자» 이던 시절의
 *    근사라 32회차 사다리 위에서는 관문마다 폭이 다르다 — 자가 상수를 들면 조용히 낡는다(LESSONS 168-③).
 * ⚠ 새 봇 실행은 **안 한다**(커밋된 JSON 만 읽는다) — 자가 5분짜리 시뮬을 품으면 회귀에서 아무도 안 돌린다.
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

/* ── 실행 둘 — 36회차가 **같은 κ 표**(6a013a86ea41)로 새로 돌린 것. ── */
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
const mkEC = (m2, tag) => require('./ecurve')(
  m2 == null ? SRC : SRC.replace(/const ES_M2\s*=\s*[\d.]+;/, 'const ES_M2   = ' + m2 + ';'), tag);
const EC = mkEC(null, 'PROBE199R36');

const RUNS = [
  { key: 'base',     file: '199-bot-2026-09-06-r36-base.json',       m2: null,  src: '설치값 — 36회차 새 실행' },
  { key: 'm2-1120',  file: '199-bot-2026-09-06-r36-sw-m2-1120.json', m2: 1.120, src: '28-3 스윕 재현 — 무릎 위 지수를 내렸다' },
];
const POLS = ['diligent', 'casual'];

const load = r => { const p = path.join(ROOT, 'docs', 'review', r.file);
                    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };

/* ── 35 와 같은 자 (같은 것을 재려면 같은 자여야 한다) ─────────────────────── */
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
const segA = (D, i) => (D[i - 1] && D[i]) ? Math.log(D[i].cp / D[i - 1].cp) / Math.log(D[i].min / D[i - 1].min) : NaN;
const idxOf = (D, t) => { for (let i = 1; i < D.length; i++) if (D[i].min >= t && D[i - 1].min <= t) return i; return -1; };
const chordAt = (D, i, t) => {
  const a = D[i - 1], b = D[i];
  const w = (Math.log(t) - Math.log(a.min)) / (Math.log(b.min) - Math.log(a.min));
  return Math.exp(Math.log(a.cp) + w * (Math.log(b.cp) - Math.log(a.cp)));
};
const lagAt = (P, t) => {
  const X = P.map(p => Math.log(p.min)), Y = P.map(p => Math.log(p.cp));
  let s = 0;
  for (let k = 0; k < 3; k++) { let L = 1; for (let j = 0; j < 3; j++) if (j !== k) L *= (Math.log(t) - X[j]) / (X[k] - X[j]); s += Y[k] * L; }
  return Math.exp(s);
};
const readsAt = (D, t) => {
  const i = idxOf(D, t); if (i < 0) return null;
  const reads = { chord: chordAt(D, i, t) };
  if (D[i - 2]) reads.q2L = lagAt([D[i - 2], D[i - 1], D[i]], t);
  if (D[i + 1]) reads.q2R = lagAt([D[i - 1], D[i], D[i + 1]], t);
  return { i, reads };
};
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

/* ── 관문 벽 모으기 — 35-2 의 대조군 정의 그대로(전수) ────────────────────── */
const wallsOf = (rep, pol) => {
  const seeds = rep.policies[pol] || [];
  const gateSet = new Set((seeds[0] && seeds[0].gateSet) || []);
  const byStage = new Map();
  seeds.forEach((s, si) => (s.walls || []).forEach(w => {
    if (w.trunc || !gateSet.has(w.stage)) return;            /* 13회차 규약 — 잘린 정체는 벽이 아니다 */
    if (!byStage.has(w.stage)) byStage.set(w.stage, []);
    byStage.get(w.stage).push({ w, si, seed: s });
  }));
  return { gateSet, byStage };
};
/* 벽 시작 행 — 봇이 라벨을 `S<stage>@<min>m` 로 적는다(36회차). 시드별로 되찾는다. */
const startRow = (seed, w) => (seed.wrows || []).find(x => x.label === 'S' + w.stage + '@' + w.min + 'm');
/* 장벽 = 제품 곡선이 그 관문에서 요구하는 화력 점프(체력 계단 × 관문 보스 배수). */
const barrierAt = (ec, gate) => ec.eScale(gate) / ec.eScale(gate - 1) * (ec.GATE_HP || 1);

say('# PROBE199R36 — 벽 주변 분 단위 행이 읽기 폭을 닫는다 (199 36회차)');
say('');
say('- 제품에서 읽은 값 — `ES_RAMP` **' + EC.RAMP + '** · 설치 `ES_M2` **' + EC.M2 + '** · `ES_BAND` **' + EC.BAND
    + '**' + (EC.BAND2 ? ' → 사다리 **' + EC.BAND2 + '**(문턱 s' + EC.SW + ')' : '') + ' · `BOSS_GATE_HP` **' + EC.GATE_HP + '**');
say('- 장벽은 손 상수가 아니다 — 관문마다 `eScale(g)/eScale(g−1)×BOSS_GATE_HP` 로 파생한다.');
say('- 장벽 항 = (궤적 위에서 화력이 cp₀×장벽 에 닿는 시각) ÷ (벽 기록 이탈 `min+lenCal`) − 1  〔35-6 규약 2〕');
say('');

const REP = {};
for (const r of RUNS) { REP[r.key] = load(r); r.ec = mkEC(r.m2, 'PROBE199R36-' + r.key); }
const missing = RUNS.filter(r => !REP[r.key]);
if (missing.length) {
  say('**실행 JSON 이 없다** — ' + missing.map(r => '`docs/review/' + r.file + '`').join(' · '));
  say('');
  say('  다시 만들려면(각 30일·12시드·both · 같은 κ 표):');
  say('  ```');
  say('  node tools/bot199.js --days=30 --seeds=12 --policy=both --calib=docs/review/199-calib-r25.json \\');
  say('    --out=docs/review/199-bot-2026-09-06-r36-base.md --json=docs/review/199-bot-2026-09-06-r36-base.json');
  say('  # ES_M2 를 1.120 으로 바꾼 뒤 같은 명령(--out/--json 만 `-sw-m2-1120` 으로) · 끝나면 되돌린다');
  say('  ```');
  say('');
  say('PROBE199R36 FAIL — 입력 없음');
  process.exit(1);
}

/* ── [A] 봇이 벽 주변을 찍었나 ───────────────────────────────────────────── */
say('## [A] 재현 — 봇이 벽마다 «시작 · 안 · 이탈» 을 찍는다');
say('');
say('| 실행 | 정책 | 벽(관문·안 잘린 것) | 벽 주변 행 | 시작 행이 그 분 그 스테이지 |');
say('|---|---|---|---|---|');
let aAll = 0, aStart = 0, aBad = 0, aIn = 0, aOut = 0;
for (const r of RUNS) for (const pol of POLS) {
  const rep = REP[r.key], { byStage } = wallsOf(rep, pol);
  let n = 0, nr = 0, ok = 0;
  for (const [, list] of byStage) for (const { w, seed } of list) {
    n++; nr += (w.rows || []).length;
    const s0 = startRow(seed, w);
    if (s0 && s0.minute === w.min && s0.stage === w.stage) ok++; else aBad++;
    aIn += (w.rows || []).filter(l => /^W\d+\+/.test(l)).length;
    aOut += (w.rows || []).filter(l => /^W\d+x/.test(l)).length;
  }
  aAll += n; aStart += ok;
  say(`| ${r.key} | ${pol} | ${n}개 | ${nr}행 | ${ok}/${n} |`);
}
say('');
ck('[A1] 관문 벽이 네 표에 모두 있다 (대조군이 선다)', aAll >= 12, `${aAll}개`);
ck('[A2] 벽마다 시작 행이 있고 그 행의 분·스테이지가 벽 기록과 같다', aBad === 0 && aStart === aAll, `${aStart}/${aAll}`);
ck('[A3] 벽 안 표본과 이탈 행도 찍힌다', aIn > 0 && aOut >= aAll, `안 ${aIn}행 · 이탈 ${aOut}행`);
say('');

/* ── [B0] 장벽 — 35 의 닫힌 식은 근사였다 ────────────────────────────────── */
say('## [B0] 〔36정정A〕 장벽의 닫힌 식 `M2^(폭·(1−RAMP))·GATE` 는 **근사**다');
say('');
say('35(그리고 34·31)는 장벽을 닫힌 식으로 적었다. 그 식은 `eSmooth` 의 선형 항 `(1+K(a−1))` 과');
say('구간 안 상승면의 `(폭−1)/폭` 보정을 버린다 — 제품에게 직접 물으면 관문마다 다르게 어긋난다.');
say('');
say('| 실행 | 관문 | 닫힌 식(35 자) | **파생(제품 `eScale`)** | 차 |');
say('|---|---|---|---|---|');
const barClosed = (ec, g) => Math.pow(ec.M2, ec.eBandW(g) * (1 - ec.RAMP)) * (ec.GATE_HP || 1);
let b0max = 0;
for (const r of RUNS) for (const g of [280, 320, 360]) {
  const c = barClosed(r.ec, g), d = barrierAt(r.ec, g);
  b0max = Math.max(b0max, Math.abs(d / c - 1) * 100);
  say(`| ${r.key} | s${g} | ×${f2(c)} | **×${f2(d)}** | ${pc((d / c - 1) * 100)} |`);
}
say('');
ck('[B0] 두 자가 실제로 갈린다 — 그러니 자가 닫힌 식을 들고 있으면 안 된다', b0max >= 5, `최대 ${f1(b0max)}%`);
say('');

/* ── [B]~[E] 벽별 표 ─────────────────────────────────────────────────────── */
say('## [B]~[E] 벽 전수 — 격자 읽기(35) ↔ 벽 시작 행(36)');
say('');
say('| 실행/정책 | 관문 | 벽이 선 날 | 장벽 | 그 구간 cp 배수 | 이웃 α 꺾임 | 격자 장벽 항 범위 | 폭 | **정확 cp₀** | **현 읽기 오차** | **정확 장벽 항** |');
say('|---|---|---|---|---|---|---|---|---|---|---|');
const J = [];
for (const r of RUNS) for (const pol of POLS) {
  const rep = REP[r.key], { byStage } = wallsOf(rep, pol);
  const D = trajOf(rep, pol);
  const seedsN = (rep.policies[pol] || []).length;
  /* 세션당 활성 분 — **표를 베끼지 않고** 실행에서 되찾는다(활성 분 ÷ 세션 수). */
  const actMin = Math.round(med((rep.policies[pol] || []).map(s => s.amin / s.sessions)));
  for (const [stage, list] of [...byStage].sort((a, b) => a[0] - b[0])) {
    if (list.length < Math.max(2, seedsN / 2)) continue;      /* 표본이 절반 미만인 벽은 p50 이 아니다 */
    const t0 = med(list.map(x => x.w.min));
    const exit = med(list.map(x => x.w.min + x.w.lenCal));
    const bar = barrierAt(r.ec, stage);
    const rd = readsAt(D, t0);
    if (!rd) continue;
    /* 정확 읽기 — 시드마다 «그 시드의 벽이 선 그 분» 의 cp 를 봇이 직접 찍었다(36회차 벽 행). */
    const cpEx = med(list.map(x => { const s0 = startRow(x.seed, x.w); return s0 ? s0.cp : NaN; }));
    const as = [segA(D, rd.i - 1), segA(D, rd.i), segA(D, rd.i + 1)].filter(Number.isFinite);
    const kink = Math.max(...as) / Math.min(...as);
    const grow = D[rd.i].cp / D[rd.i - 1].cp;                 /* 그 현이 가로지르는 cp 배수 */
    const ds = {};
    for (const [k, v] of Object.entries(rd.reads)) { const T = tAtCp(D, v * bar); ds[k] = Number.isFinite(T) ? (T / exit - 1) * 100 : NaN; }
    const vs = Object.values(ds).filter(Number.isFinite);
    const cps = Object.values(rd.reads).filter(Number.isFinite);
    const lo = vs.length ? Math.min(...vs) : NaN, hi = vs.length ? Math.max(...vs) : NaN;
    const cpBand = Math.max(...cps) / Math.min(...cps);
    const tEx = tAtCp(D, cpEx * bar);
    const dEx = Number.isFinite(tEx) ? (tEx / exit - 1) * 100 : NaN;
    const err = (rd.reads.chord / cpEx - 1) * 100;
    /* 벽이 세션의 몇 번째 활성 분에 섰나 — 편향의 부호를 설명하는 축([D]). */
    const posSess = med(list.map(x => x.w.amin % actMin));
    J.push({ run: r.key, pol, stage, t0, exit, bar, kink, grow, lo, hi, span: hi - lo,
             cpBand, cpEx, dEx, err, n: list.length, posSess, actMin });
    say(`| ${r.key}/${pol} | s${stage} | D${f2(t0 / 1440)} | ×${f2(bar)} | ×${f1(grow)} | ×${f2(kink)}`
        + ` | ${pc(lo)} ~ ${pc(hi)} | ${f1(hi - lo)}%p | ${cpEx.toExponential(3)} | **${pc(err)}** | **${pc(dEx)}** |`);
  }
}
say('');
say('> «정확 장벽 항» 의 `—` 는 **창 밖**이다 — 정확 cp₀ 가 현 읽기보다 커서 `cp₀×장벽` 을 30일 안에 못 채운다.');
say('> 격자 읽기가 그 자리에서 값을 «낸» 것 자체가 편향의 결과다.');
say('');

const KNEE = J.filter(x => x.kink >= 2.5);      /* 무릎 위 벽 */
const FLAT = J.filter(x => x.kink < 1.8);       /* 무릎 뒤 평지 벽 */
ck('[B1] 35-4 의 «꺾임 ↔ 폭» 관계가 새 실행에서도 산다',
   KNEE.length >= 1 && FLAT.length >= 3
   && KNEE.every(x => !(x.span < 5)) && FLAT.every(x => !(x.span > 2.5)),
   `꺾임 큰 ${KNEE.length}개 ${KNEE.map(x => f1(x.span)).join('/')}%p ↔ 평지 ${FLAT.length}개 ${FLAT.map(x => f1(x.span)).join('/')}%p`);
say('');

/* ── [C] 본체 ───────────────────────────────────────────────────────────── */
say('## [C] ⚑⚑ 본체 — 35-4 가 «폭» 이라 부른 것 밑에 **편향**이 있었다');
say('');
say('벽이 선 그 분을 봇이 직접 찍으므로 정확 cp₀ 는 **읽기가 하나**다(폭 0). 그런데 그 값을 놓고 보면');
say('격자의 현(弦) 읽기가 **예외 없이 낮다** — ' + J.length + '개 벽 전부. 한쪽으로만 틀리는 것은 잡음이 아니라 편향이고,');
say('35-4 의 «허용 읽기 셋» 은 그 편향을 통째로 놓친 채 셋 사이의 **잡음**만 재고 있었다.');
say('');
ck('[C1] 정확 cp₀ 가 벽마다 하나 있다 — 읽기 폭이 구조적으로 0 이다',
   J.length >= 6 && J.every(x => Number.isFinite(x.cpEx)), `${J.length}개 벽`);
ck('[C2] ⚑ 격자 현 읽기가 **예외 없이** 낮다 (부호가 한쪽) — 잡음이 아니라 편향이다',
   J.length >= 6 && J.every(x => x.err < 0),
   `${J.filter(x => x.err < 0).length}/${J.length} 음수 · ${f1(Math.min(...J.map(x => x.err)))} ~ ${f1(Math.max(...J.map(x => x.err)))}%`);
{
  const srt = J.slice().sort((a, b) => a.grow - b.grow);
  const loG = srt.slice(0, 3), hiG = srt.slice(-3);
  ck('[C3] 편향의 크기는 «그 현이 가로지르는 cp 배수» 와 함께 커진다 — 무릎이 아니라 **하루의 성장폭**이 축이다',
     med(hiG.map(x => Math.abs(x.err))) > med(loG.map(x => Math.abs(x.err))) * 1.5,
     `배수 작은 셋 |오차| p50 ${f1(med(loG.map(x => Math.abs(x.err))))}% (×${f1(med(loG.map(x => x.grow)))}) ↔ 큰 셋 ${f1(med(hiG.map(x => Math.abs(x.err))))}% (×${f1(med(hiG.map(x => x.grow)))})`);
}
ck('[C4] 편향은 무릎 위/평지를 안 가린다 — 평지 벽도 10% 넘게 낮게 읽힌다',
   FLAT.length >= 3 && FLAT.every(x => x.err < -10),
   FLAT.map(x => pc(x.err)).join(' · '));
say('');

/* ── [D] 왜 한쪽으로만 틀리나 ────────────────────────────────────────────── */
say('## [D] 편향의 기계 — 벽시계 위의 cp 는 **계단**이다');
say('');
say('⚠ 먼저 **기각한 용의자** — «벽이 세션 앞머리에 선다» 는 틀렸다(34-3 의 실수를 되풀이하지 않으려고 먼저 쟀다).');
say('벽의 세션 내 위치 p50 은 세션 길이의 **' + f1(100 * med(J.map(x => x.posSess / x.actMin))) + '%' + '** 로, 앞머리에 몰려 있지 않다:');
say('');
say('| 실행/정책 | 관문 | 세션당 활성 분 | 벽의 세션 내 위치(활성 분) | 앞머리 몫 |');
say('|---|---|---|---|---|');
for (const x of J)
  say(`| ${x.run}/${x.pol} | s${x.stage} | ${x.actMin}분 | ${f1(x.posSess)}분 | ${f1(100 * x.posSess / x.actMin)}% |`);
say('');
say('실제 기계는 더 아래다 — **cp 는 활성 창에서만 오른다**(부지런은 하루 1440분 중 ' + med(J.filter(x => x.pol === 'diligent').map(x => x.actMin * 4)) + '분).');
say('그래서 벽시계 위의 cp 는 계단이고, 하루 격자의 현은 그 계단을 **가로질러** 그어진다.');
say('1일차 10분 행으로 그 집중도를 직접 잰다 — 하루 상승의 90% 를 담는 데 필요한 10분 칸의 몫:');
say('');
say('| 실행 | 정책 | 10분 칸 | 그 칸들이 덮는 하루 몫 | 상승 90% 를 담는 칸 | 그 몫 |');
say('|---|---|---|---|---|---|');
const CONC = [];
for (const r of RUNS) for (const pol of POLS) {
  const seeds = REP[r.key].policies[pol] || [];
  const sh = [];
  for (const s of seeds) {
    const d1 = (s.day1 || []).slice().sort((a, b) => a.minute - b.minute);
    if (d1.length < 10) continue;
    const st = [];
    for (let i = 1; i < d1.length; i++) st.push(Math.max(0, Math.log(d1[i].cp / d1[i - 1].cp)));
    const tot = st.reduce((a, b) => a + b, 0); if (!(tot > 0)) continue;
    const srt = st.slice().sort((a, b) => b - a);
    let acc = 0, k = 0; while (acc < 0.9 * tot && k < srt.length) acc += srt[k++];
    sh.push({ k, n: st.length, cov: d1.length * 10 / 1440 });
  }
  if (!sh.length) continue;
  const kk = med(sh.map(x => x.k)), nn = med(sh.map(x => x.n)), cov = med(sh.map(x => x.cov));
  CONC.push({ run: r.key, pol, k: kk, n: nn, share: kk / nn, cov });
  say(`| ${r.key} | ${pol} | ${nn}칸 | **${f1(100 * cov)}%** | ${kk}칸 | ${f1(100 * kk / nn)}% |`);
}
say('');
ck('[D1] ⚑ 하루 격자가 가로지르는 벽시계의 **80% 이상에 표본이 하나도 없다** — cp 는 활성 창에서만 오른다',
   CONC.length >= 2 && CONC.every(x => x.cov <= 0.2),
   CONC.map(x => `${x.run}/${x.pol} 덮는 몫 ${f1(100 * x.cov)}%`).join(' · '));
ck('[D2] 그 표본 안에서도 상승이 몰린다 — 90% 를 담는 데 칸의 절반이 안 든다',
   CONC.every(x => x.share < 0.5),
   CONC.map(x => `${x.run}/${x.pol} ${f1(100 * x.share)}%`).join(' · '));
ck('[D3] ⚑ 기각 — «세션 앞머리» 는 축이 아니다 (p50 이 1/3 을 넘는다)',
   med(J.map(x => x.posSess / x.actMin)) >= 1 / 3,
   `세션 내 위치 p50 ${f1(100 * med(J.map(x => x.posSess / x.actMin)))}%`);
say('');

/* ── [E] 장벽 항 — 한 값 + 부호 ─────────────────────────────────────────── */
say('## [E] ⚑⚑ 장벽 항 — 35-4 의 «부호는 판정된다» 가 **뒤집힌다**');
say('');
say('| 실행/정책 | 관문 | 35 자(격자) 범위 | 폭 | **36 자(벽 시작 행)** | 35 범위 안인가 |');
say('|---|---|---|---|---|---|');
for (const x of J)
  say(`| ${x.run}/${x.pol} | s${x.stage} | ${pc(x.lo)} ~ ${pc(x.hi)} | ${f1(x.span)}%p | **${pc(x.dEx)}** | `
      + (Number.isFinite(x.dEx) && Number.isFinite(x.lo) && x.dEx >= x.lo - 1e-9 && x.dEx <= x.hi + 1e-9 ? '✔ 안'
         : Number.isFinite(x.dEx) ? '**✖ 위로 밖**' : '**✖ 창 밖(더 크다)**') + ' |');
say('');
ck('[E1] ⚑ 정확 값이 격자 세 읽기의 띠 **안에 든 벽이 하나도 없다** — 격자는 참값을 품지도 못했다',
   J.every(x => !(Number.isFinite(x.dEx) && Number.isFinite(x.lo) && x.dEx >= x.lo - 1e-9 && x.dEx <= x.hi + 1e-9)),
   `${J.length}개 전부 위쪽(또는 창 밖)`);
const M2K = J.filter(x => x.run === 'm2-1120' && x.kink >= 2.5);
ck('[E2] ⚑⚑ 35-4 가 «판정된다» 고 적은 **음수 부호가 살아남지 못한다** — 무릎 위 벽이 정확 읽기로 양수다',
   M2K.length >= 1 && M2K.every(x => !(x.dEx < 0)),
   M2K.map(x => `s${x.stage} 격자 ${pc(x.lo)}~${pc(x.hi)} → 정확 ${pc(x.dEx)}`).join(' · '));
ck('[E3] 정확 읽기에서는 **모든 관문 벽이 여유 쪽**이다 — 장벽보다 덜 벌어도 되는 자리뿐이다',
   J.every(x => !Number.isFinite(x.dEx) || x.dEx > 0),
   J.map(x => `s${x.stage}${x.run === 'base' ? 'b' : 'm'} ${pc(x.dEx)}`).join(' · '));
say('');

/* ── [R] 되돌림 시험 ────────────────────────────────────────────────────── */
say('## [R] 되돌림 시험 — 벽 행을 안 보면 35 의 그림이 그대로 돌아온다');
say('');
{
  const m2s360 = J.find(x => x.run === 'm2-1120' && x.pol === 'diligent' && x.stage === 360);
  ck('[R1] 벽 시작 행을 무시하고 현으로 되돌리면 35-4 의 그 벽이 다시 «음수를 품는 범위» 가 된다',
     !!m2s360 && m2s360.lo < 0 && m2s360.span >= 5,
     m2s360 ? `m2-1120/diligent s360 D${f2(m2s360.t0 / 1440)} · 격자 ${pc(m2s360.lo)}~${pc(m2s360.hi)}(폭 ${f1(m2s360.span)}%p) ↔ 정확 ${pc(m2s360.dEx)}` : '없다');
}
ck('[R2] 정확 cp₀ 는 «현» 과 다른 수다 — 같은 수면 벽 행이 아무 것도 안 바꾼 것이다',
   J.some(x => Math.abs(x.err) > 1),
   '현 읽기 오차 최대 ' + f1(Math.max(...J.map(x => Math.abs(x.err)))) + '%');
ck('[R3] 벽 주변 행이 벽 밖 표본을 안 건드린다 — 하루 격자(D 행) 수가 종전과 같다',
   RUNS.every(r => POLS.every(p => (REP[r.key].policies[p] || []).every(s =>
     s.rows.filter(x => /^D\d+$/.test(x.label)).length === (REP[r.key].days || 30)))),
   'D 행 ' + (REP.base.days || 30) + '개/시드');
say('');

/* ── 정리 ───────────────────────────────────────────────────────────────── */
say('## 정리');
say('');
say('1. **35-7 1번을 이행했다** — 봇이 벽마다 «앞 구간 시작 3개 · 벽이 선 그 분 · 벽 안 10활성분 표본 · 이탈» 을 찍는다([A]).');
say('   관문 벽 ' + aAll + '개 전부에 시작 행이 있고, 그 행의 분·스테이지가 벽 기록과 일치한다.');
say('2. ⚑⚑ **읽기 폭은 닫혔는데, 그 밑에서 편향이 나왔다.** 정확 cp₀ 는 폭이 0 이고([C1]),');
say('   격자의 현 읽기는 ' + J.length + '개 벽 **전부** 낮다(' + f1(Math.min(...J.map(x => x.err))) + ' ~ ' + f1(Math.max(...J.map(x => x.err))) + '%, [C2]).');
say('   축은 무릎이 아니라 **그 하루의 성장폭**이고([C3]), 기계는 **cp 가 활성 창에서만 오른다**는 것이다([D1] — 하루 격자가 가로지르는 벽시계의 ' + f1(100 * (1 - Math.max(...CONC.map(x => x.cov)))) + '% 에 표본이 아예 없다).');
say('3. ⚑⚑ **35-4 의 «부호는 판정된다» 가 뒤집힌다**([E2]) — 무릎 위 벽의 장벽 항이 음수가 아니라 양수다.');
say('   35-7 2번(«부호는 이미 판정됐다 — 후보는 cp 와 실제 격파력의 괴리»)은 **철회**한다: 그 음수는');
say('   장벽이 아니라 **자**가 만든 것이었다(하루 격자가 세션 계단을 가로지른 몫).');
say('4. 〔36정정A〕 장벽의 닫힌 식은 근사다([B0]) — 자는 제품 `eScale` 에서 관문마다 파생해야 한다.');
say('');
gen0Check('199-bot-2026-09-06-r36-base.json');

say((NG === 0 ? 'PROBE199R36 PASS ' : 'PROBE199R36 FAIL ') + OK + '/' + (OK + NG));
process.exit(NG === 0 ? 0 : 1);
