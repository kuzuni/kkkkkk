#!/usr/bin/env node
/* 199 40회차 — **두 단 사다리**(40 → ES_BAND3 24 → ES_BAND2 16) (39-8 1번)
 * ─────────────────────────────────────────────────────────────────────────────
 * 39-8 1번이 남긴 후보다: «남은 길은 문턱을 옮기는 것이 아니라 문턱 관문의 장벽을 낮추는 것이다.
 * 폭을 한 번에 40 → 16 으로 떨어뜨리지 않는 두 단 사다리(예 40 → 24 → 16)».
 *
 * 뿌리(38-4): `eScale` 의 정의상 **문턱 관문의 장벽은 그 앞 구간의 폭이 만든다.**
 *   · 한 단(문턱 s360) — s360 을 만든 폭이 아직 40 이라 그 관문 하나가 목표의 **×3.04**
 *   · 문턱을 통째로 앞당기면(`ES_BANDG` 9 → 8) 그 자리는 닫히지만 말미 벽이 한 칸 더 촘촘해져
 *     ①③ 을 판다(39-2 — 같은 90일 창에서 ① −3.2% → −11.5% · ③ ×0.61)
 *   · 두 단 — 문턱은 s320 으로 내려가되 그 위 **한 구간만** 전이 폭 24 다.
 *     ⇒ 말미 격자는 s360 위에서 한 단과 **같은 앵커**로 돌아온다(아래 [F]).
 *
 * 이 자가 하는 일:
 *   [A] 재현 — 38-3 벽 모둠 표와 39-2 분해표가 커밋된 표에서 그대로 나온다 (338 규칙)
 *   [B] 예측 — 제품 파생 장벽으로 세 격자의 관문·«장벽을 만든 폭»·목표 대비를 먼저 적는다
 *   [C] ⚑⚑ 본체 — 세 실행의 **관측** 벽 모둠: ×3.04 자리가 s344 의 ×1.55 로 내려앉았는가
 *   [D] 헤드라인 3자 대조 — ①③④ 와 창 역량 (같은 창 90일 · 같은 κ · 같은 시드 수)
 *   [E] 표본 흔들기 — 시드 12 → 24 에서 부호·자릿수가 안 바뀐다
 *   [F] ⚑ 두 단이 바꾼 것은 **[s320, s360) 한 구간뿐**이다 (s360 위는 한 단과 비트 동일)
 *   [R] 되돌림 — `ES_BAND3 = 0` 한 줄이면 39회차 곡선이 그대로 돌아온다
 *
 * ⚠ 손 상수를 안 든다 — 격자·장벽·목표 대비가 전부 제품 `eScale`·`BOSS_GATE_HP` 파생이다.
 * ⚠ 새 봇 실행은 안 한다 — 커밋된 JSON·md 만 읽는다.
 *
 * 종료 코드: 0 통과 · 1 FAIL.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const readEC = require('./ecurve');

const say = m => console.log(m);
const f1 = v => Number.isFinite(v) ? v.toFixed(1) : '—';
const f2 = v => Number.isFinite(v) ? v.toFixed(2) : '—';
const med = a => { const b = a.filter(Number.isFinite).sort((x, y) => x - y);
                   if (!b.length) return NaN;
                   const n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };

let OK = 0, NG = 0;
const ck = (name, cond, got) => { if (cond) { OK++; say(`  ✔ ${name}` + (got != null ? ` — ${got}` : '')); }
                                  else { NG++; say(`  ✗ ${name}` + (got != null ? ` — ${got}` : '')); } };

const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
/* 세 격자를 **제품 한 벌에서** 굽는다 — 손으로 다시 적으면 그 사본이 다음 세대에 조용히 낡는다. */
const oneStep = s => s.replace(/const ES_BAND3\s*=\s*\d+/, 'const ES_BAND3 = 0');
const EC_TWO  = readEC(SRC, 'R40-two');                                       /* 설치본 — 두 단 */
const EC_ONE  = readEC(oneStep(SRC), 'R40-one');                              /* 39회차 한 단 */
const EC_G8   = readEC(oneStep(SRC).replace(/const ES_BANDG\s*=\s*\d+/, 'const ES_BANDG = 8'), 'R40-g8');

const R_TARGET = 1.904;                       /* 31-4 사다리 목표 간격비 */
const barrierAt = (ec, g) => ec.eScale(g) / ec.eScale(g - 1) * (ec.GATE_HP || 1);
const widthMaking = (ec, g) => ec.eBandW(ec.eBand(g - 1));    /* 그 관문의 장벽을 **만든** 폭 */
const gatesIn = (ec, lo, hi) => { const g = []; for (let s = lo; s <= hi; s++) if (ec.isGate(s)) g.push(s); return g; };

const load = f => { const p = path.join(ROOT, 'docs', 'review', f);
                    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const loadMd = f => { const p = path.join(ROOT, 'docs', 'review', f);
                      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };

/* 벽 모둠 표 — **38-3([C])이 쓴 함수 그대로**다. 다른 자로 견주면 못 견딘다(39-6 규약 3). */
const wallTable = (rep, ec, key) => {
  const out = [], seeds = (rep && rep.policies && rep.policies.diligent) || [];
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
    const ratio = t1 / t0, bar = barrierAt(ec, stage);
    out.push({ run: key, stage, slack: bar / G, ratio, rel: ratio / R_TARGET,
               aObs: Math.log(G) / Math.log(ratio), made: widthMaking(ec, stage) });
  }
  return out;
};

const RUNS = [
  { key: 'base(한 단 · 문턱 s360)',  ec: EC_ONE, json: '199-bot-2026-09-06-r39-d90-base.json',   md: '199-bot-2026-09-06-r39-d90-base.md' },
  { key: 'bandg8(한 단 · 문턱 s320)', ec: EC_G8,  json: '199-bot-2026-09-06-r39-d90-bandg8.json', md: '199-bot-2026-09-06-r39-d90-bandg8.md' },
  { key: '**two24(두 단 40→24→16)**', ec: EC_TWO, json: '199-bot-2026-09-06-r40-d90-two24.json', md: '199-bot-2026-09-06-r40-d90-two24.md' },
];

say('# PROBE199R40 — 두 단 사다리 (199 40회차 · 새 봇 실행 0건 · 커밋된 표만 읽는다)');
say('');
say('- 제품 — `ES_BAND` **' + EC_TWO.BAND + '** → 전이 `ES_BAND3` **' + EC_TWO.BAND3 + '**(s' + EC_TWO.SW + '..)'
    + ' → 말미 `ES_BAND2` **' + EC_TWO.BAND2 + '**(s' + EC_TWO.SW2 + '..) · `ES_RAMP` ' + EC_TWO.RAMP
    + ' · `BOSS_GATE_HP` ' + EC_TWO.GATE_HP);
say('- 목표 간격비 **×' + R_TARGET + '** · 세 격자는 제품 한 벌에서 구웠다(손 사본 0).');
say('');

const W = {};
for (const r of RUNS) W[r.key] = wallTable(load(r.json), r.ec, r.key);
if (RUNS.some(r => !W[r.key].length)) {
  say('**실행 JSON 이 없다** — ' + RUNS.filter(r => !W[r.key].length).map(r => '`docs/review/' + r.json + '`').join(' · '));
  say(''); say('PROBE199R40 FAIL — 입력 없음'); process.exit(1);
}

/* ═══ [A] 재현 (338 규칙) ═══════════════════════════════════════════════ */
say('## [A] 재현 — 38-3 의 «진짜 벽» 과 39-2 의 90일 두 값이 그대로 나온다');
say('');
{
  const b = W[RUNS[0].key].find(x => x.stage === 360);
  ck('[A1] 38-3 이 적은 s360(폭 40 이 만든 관문) — 목표 대비 ×3.04 · α_obs 2.42',
     !!b && Math.abs(b.rel - 3.04) <= 0.03 && Math.abs(b.aObs - 2.42) <= 0.03,
     b ? `×${f2(b.rel)} · α_obs ${f2(b.aObs)} · 만든 폭 ${b.made}` : '없다');
  const g8 = W[RUNS[1].key].filter(x => x.stage > 320);
  ck('[A2] 38-5 이 적은 문턱 s320 스윕의 사다리 폭 관문들 — 전부 목표의 1.2배 안',
     g8.length >= 2 && g8.every(x => x.rel <= 1.2 && x.made === EC_G8.BAND2),
     g8.map(x => `s${x.stage} ×${f2(x.rel)}`).join(' · '));
  const num = (md, key) => { const l = (md || '').split('\n').find(x => x.startsWith('|') && x.includes(key));
                             const m = l && l.split('|')[2].match(/-?\d+(?:\.\d+)?%/g); return m ? parseFloat(m[m.length - 1]) : NaN; };
  const a = num(loadMd(RUNS[0].md), '① 벽 간격 기하평균 p50'), c = num(loadMd(RUNS[1].md), '① 벽 간격 기하평균 p50');
  ck('[A3] 39-2 의 90일 ① 두 값이 커밋된 표에서 그대로 나온다 (설치값 −3.2% ↔ 문턱8 −11.5%)',
     Math.abs(a - -3.2) <= 0.15 && Math.abs(c - -11.5) <= 0.15, `${a}% ↔ ${c}%`);
}
say('');

/* ═══ [B] 예측 ═════════════════════════════════════════════════════════ */
say('## [B] 예측 — 제품 파생 장벽으로 세 격자를 먼저 적는다 (관측 전에)');
say('');
const A_LATE = 2.45;      /* 38-3 의 «진짜 벽» 셋 α_obs 2.42~2.57 의 가운데 */
say('| 격자 | s320~s460 관문 | (개수) | 전이·말미 관문의 목표 대비(α ' + A_LATE + ') |');
say('|---|---|---|---|');
const PRED = {};
for (const r of RUNS) {
  const g = gatesIn(r.ec, 321, 460);
  const cells = g.map(s => { const b = barrierAt(r.ec, s);
                             return { s, made: widthMaking(r.ec, s), rel: Math.pow(b, 1 / A_LATE) / R_TARGET }; });
  PRED[r.key] = cells;
  say(`| ${r.key} | ${g.join(' ')} | ${g.length} | ` + cells.map(c => `s${c.s}[w${c.made}] ×${f2(c.rel)}`).join(' · ') + ' |');
}
say('');
/* ⚠ 밀도는 **창이 실제로 밟는 끝까지**로 센다 — 무한대로 세면 두 격자가 둘 다 주기 16 이라
   같은 수로 수렴한다(s600 에서 25 대 25). 90일 부지런 p50 끝이 s392 이므로 s400 까지가 그 자리다.
   이 한 줄을 안 적으면 다음 회차가 «두 단도 문턱8 만큼 촘촘하다» 를 무한대 표에서 읽는다. */
const REACH = 400;
const nGate = ec => gatesIn(ec, 1, REACH).length;
ck('[B1] ⚑ 창이 밟는 끝(s' + REACH + ')까지 두 단은 관문을 **한 칸만** 늘린다 — 문턱8 은 두 칸 늘린다',
   nGate(EC_TWO) === nGate(EC_ONE) + 1 && nGate(EC_G8) === nGate(EC_ONE) + 2,
   `한 단 ${nGate(EC_ONE)} → 두 단 ${nGate(EC_TWO)} · 문턱8 ${nGate(EC_G8)}`);
ck('[B2] ⚑ 두 단에는 «폭 40 이 만든 말미 관문» 이 한 칸도 없다 (한 단에는 그것이 ×3 짜리로 하나 있다)',
   PRED[RUNS[2].key].every(c => c.made < EC_TWO.BAND) && PRED[RUNS[0].key].some(c => c.made === EC_TWO.BAND),
   '두 단 만든 폭 ' + [...new Set(PRED[RUNS[2].key].map(c => c.made))].join('/') +
   ' ↔ 한 단 ' + [...new Set(PRED[RUNS[0].key].map(c => c.made))].join('/'));
say('');

/* ═══ [C] 본체 — 관측 ══════════════════════════════════════════════════ */
say('## [C] ⚑⚑ 본체 — 관측된 벽 모둠 (같은 90일 창 · 같은 κ · 12시드 · 38-3 과 같은 함수)');
say('');
say('| 실행 | 관문 | 장벽을 만든 폭 | 여유 | 간격비(관측) | **목표 대비** | α_obs |');
say('|---|---|---|---|---|---|---|');
for (const r of RUNS) for (const x of W[r.key])
  say(`| ${r.key} | s${x.stage} | ${x.made} | ×${f2(x.slack)} | ×${f2(x.ratio)} | **×${f2(x.rel)}** | ${f2(x.aObs)} |`);
say('');
{
  const two = W[RUNS[2].key].filter(x => x.stage >= EC_TWO.SW2);      /* 두 단의 전이·말미 관문 */
  const worstTwo = Math.max(...two.map(x => x.rel));
  const worstOne = Math.max(...W[RUNS[0].key].filter(x => x.stage >= 340).map(x => x.rel));
  /* 문턱은 38-3 이 쓴 그 값이다 — «목표의 2.5배 넘는 관문» 이 장벽을 재는 자리의 결손 기준이었다. */
  ck('[C1] ⚑⚑ «목표 2.5배 넘는 관문» 이 사라졌다 — 한 단에는 하나 있고 두 단에는 **없다**',
     worstOne >= 2.5 && worstTwo < 1.7,
     `한 단 최악 ×${f2(worstOne)}(s360) → 두 단 최악 ×${f2(worstTwo)}`);
  const mid = two.find(x => x.made === EC_TWO.BAND3);
  ck('[C2] 전이 폭이 만든 관문이 실재하고, [B] 의 예측과 5% 안에서 같다',
     !!mid && Math.abs(mid.rel / PRED[RUNS[2].key].find(c => c.s === mid.stage).rel - 1) <= 0.05,
     mid ? `s${mid.stage}[w${mid.made}] 예측 ×${f2(PRED[RUNS[2].key].find(c => c.s === mid.stage).rel)} ↔ 관측 ×${f2(mid.rel)}` : '없다');
  const pre = W[RUNS[2].key].filter(x => x.stage <= EC_TWO.SW);       /* 문턱 아래 + 문턱 앵커 자신 */
  const preOne = W[RUNS[0].key].filter(x => x.stage <= EC_TWO.SW);
  ck('[C3] 문턱 아래 관문과 문턱 앵커는 한 칸도 안 움직였다 — 두 단이 초기를 안 건드렸다는 관측 증거',
     pre.length >= 3 && pre.every(x => { const o = preOne.find(v => v.stage === x.stage);
                                         return o && Math.abs(x.ratio / o.ratio - 1) <= 0.02; }),
     pre.map(x => `s${x.stage} ×${f2(x.ratio)}`).join(' · '));
}
say('');

/* ═══ [D] 헤드라인 3자 대조 ════════════════════════════════════════════ */
say('## [D] 헤드라인 3자 대조 (부지런 · 90일 · 12시드 · 같은 κ `6a013a86ea41`)');
say('');
const grab = (md, key) => { const l = (md || '').split('\n').find(x => x.startsWith('|') && x.includes(key));
                            if (!l) return null; const c = l.split('|').map(s => s.trim()); return { dil: c[2], cas: c[3] }; };
const numOf = v => { const m = String(v || '').match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
const ROWS = [
  ['① 벽 간격 기하평균(목표 대비)', '① 벽 간격 기하평균 p50'],
  ['① 목표 칸 적중 p50',           '① 목표 칸 적중 p50 〔'],
  ['① 창 밖 벽 p50(= 없어야 할 벽)', '① 창 밖 벽 p50'],
  ['③ 순 이동 비중(%)',            '순 이동 비중(%)'],
  ['⚑ 창 역량 — 말미 축',           '⚑ 창 역량 — 말미 축(①문턱위'],
];
const MD = {}; RUNS.forEach(r => MD[r.key] = loadMd(r.md));
say('| 축(부지런) | ' + RUNS.map(r => r.key).join(' | ') + ' |');
say('|---|---|---|---|');
const D = {};
for (const [name, key] of ROWS) {
  const cells = RUNS.map(r => { const g = grab(MD[r.key], key); return g ? g.dil.replace(/\s+/g, ' ').slice(0, 70) : '—'; });
  D[name] = cells;
  say(`| ${name} | ${cells.join(' | ')} |`);
}
say('');
{
  const gap = D['① 벽 간격 기하평균(목표 대비)'].map(v => { const m = String(v).match(/-?\d+(?:\.\d+)?%/); return m ? parseFloat(m[0]) : NaN; });
  ck('[D1] ⚑⚑ ① 간격 기하평균 — 두 단은 **한 단 그대로**다 (문턱8 이 −8.3%p 판 자리를 안 판다)',
     Math.abs(gap[2] - gap[0]) <= 0.5 && gap[1] < gap[0] - 5,
     `한 단 ${gap[0]}% · 문턱8 ${gap[1]}% · 두 단 ${gap[2]}%`);
  const hit = D['① 목표 칸 적중 p50'].map(v => numOf(v));
  ck('[D2] ⚑ ① 목표 칸 적중이 한 칸 는다 (한 단·문턱8 둘 다 3/8 → 두 단 4/8)',
     hit[2] > hit[0] && hit[2] > hit[1], `한 단 ${hit[0]}/8 · 문턱8 ${hit[1]}/8 · 두 단 ${hit[2]}/8`);
  const out = D['① 창 밖 벽 p50(= 없어야 할 벽)'].map(v => numOf(v));
  ck('[D3] ① «없어야 할 벽» 은 한 단과 같다 (문턱8 은 한 개 더 낸다)',
     out[2] === out[0] && out[1] > out[0], `한 단 ${out[0]} · 문턱8 ${out[1]} · 두 단 ${out[2]}`);
  const mv = D['③ 순 이동 비중(%)'].map(v => numOf(v));
  ck('[D4] ⚠ 대가는 ③ 하나다 — 그리고 문턱8 이 낸 대가보다 **작다** (관문이 한 칸만 늘어서다)',
     mv[2] < mv[0] && mv[2] > mv[1],
     `한 단 ${mv[0]}% → 두 단 ${mv[2]}% (×${f2(mv[2] / mv[0])}) ↔ 문턱8 ${mv[1]}% (×${f2(mv[1] / mv[0])})`);
  const cap = D['⚑ 창 역량 — 말미 축'];
  ck('[D5] ⚑ 33회차가 «판정 불가» 로 막아 둔 자리가 열린다 (문턱8 이 산 이득을 값 없이 산다)',
     /판정 불가/.test(cap[0]) && !/판정 불가/.test(cap[2]),
     `한 단 «${String(cap[0]).slice(0, 24)}…» → 두 단 «${String(cap[2]).slice(0, 34)}…»`);
}
say('');

/* ═══ [E] 표본 흔들기 ══════════════════════════════════════════════════ */
say('## [E] 표본 흔들기 — 시드 12 → 24');
say('');
{
  const s24 = loadMd('199-bot-2026-09-06-r40-d90-two24-s24.md');
  const g12 = grab(MD[RUNS[2].key], '① 벽 간격 기하평균 p50'), g24 = grab(s24, '① 벽 간격 기하평균 p50');
  const h12 = grab(MD[RUNS[2].key], '① 목표 칸 적중 p50 〔'), h24 = grab(s24, '① 목표 칸 적중 p50 〔');
  const m12 = grab(MD[RUNS[2].key], '순 이동 비중(%)'), m24 = grab(s24, '순 이동 비중(%)');
  ck('[E1] ① 간격이 소수 첫째 자리에서 안 흔들린다', !!g24 &&
     Math.abs(parseFloat(String(g12.dil).match(/-?\d+(?:\.\d+)?%/)[0]) - parseFloat(String(g24.dil).match(/-?\d+(?:\.\d+)?%/)[0])) <= 0.2,
     g24 ? `12시드 ${String(g12.dil).match(/-?\d+(?:\.\d+)?%/)[0]} ↔ 24시드 ${String(g24.dil).match(/-?\d+(?:\.\d+)?%/)[0]}` : 's24 표 없음');
  ck('[E2] ① 적중·③ 순 이동도 그대로다', !!h24 && numOf(h12.dil) === numOf(h24.dil) && Math.abs(numOf(m12.dil) - numOf(m24.dil)) <= 0.05,
     h24 ? `적중 ${numOf(h12.dil)} ↔ ${numOf(h24.dil)} · ③ ${numOf(m12.dil)} ↔ ${numOf(m24.dil)}` : 's24 표 없음');
  /* ⚠ 12시드에서 «대충 창 밖 벽 0 → 1» 이 대가로 보였는데 24시드에서 0 이다 — 표본 잡음이었다. */
  const c12 = grab(MD[RUNS[2].key], '① 창 밖 벽 p50'), c24 = grab(s24, '① 창 밖 벽 p50');
  ck('[E3] ⚑ 12시드가 대충 유저에 보여 준 «없어야 할 벽 +1» 은 **표본 잡음**이다 (24시드에서 0)',
     !!c24 && numOf(c24.cas) === 0, c24 ? `대충 12시드 ${numOf(c12.cas)} → 24시드 ${numOf(c24.cas)}` : 's24 표 없음');
}
say('');

/* ═══ [F] 두 단이 바꾼 범위 ════════════════════════════════════════════ */
say('## [F] ⚑ 두 단이 바꾼 것은 **[s' + EC_TWO.SW + ', s' + (EC_TWO.BAND * EC_TWO.BANDG) + ') 한 구간뿐**이다');
say('');
{
  const diff = [], same = [];
  for (let s = 1; s <= 600; s++) {
    const a = EC_TWO.eScale(s), b = EC_ONE.eScale(s);
    (Math.abs(a / b - 1) > 1e-12 ? diff : same).push(s);
  }
  const lo = Math.min(...diff), hi = Math.max(...diff);
  ck('[F1] ⚑ 두 곡선이 갈리는 칸이 정확히 [s' + EC_TWO.SW + ', s' + (EC_TWO.BAND * EC_TWO.BANDG) + ') 안에만 있다',
     lo >= EC_TWO.SW && hi < EC_TWO.BAND * EC_TWO.BANDG,
     `갈리는 칸 s${lo}..s${hi} (${diff.length}칸) · 나머지 ${same.length}칸은 비트 동일`);
  ck('[F2] 그래서 말미 격자는 한 단과 **같은 앵커**로 돌아온다 — 말미 벽 밀도가 안 늘어난다',
     gatesIn(EC_TWO, EC_TWO.BAND * EC_TWO.BANDG, 600).join() === gatesIn(EC_ONE, EC_ONE.BAND * EC_ONE.BANDG, 600).join(),
     's' + (EC_TWO.BAND * EC_TWO.BANDG) + ' 위 관문 ' + gatesIn(EC_TWO, EC_TWO.BAND * EC_TWO.BANDG, 600).length + '칸 일치');
  ck('[F3] 늘어난 관문은 **정확히 한 칸**(전이 구간이 만든 s' + EC_TWO.SW2 + ')이다',
     gatesIn(EC_TWO, 1, 600).length - gatesIn(EC_ONE, 1, 600).length === 1
     && EC_TWO.isGate(EC_TWO.SW2) && !EC_ONE.isGate(EC_TWO.SW2),
     `한 단 ${gatesIn(EC_ONE, 1, 600).length}칸 → 두 단 ${gatesIn(EC_TWO, 1, 600).length}칸`);
}
say('');

/* ═══ [R] 되돌림 ═══════════════════════════════════════════════════════ */
say('## [R] 되돌림 시험');
say('');
{
  /* 되돌림본을 **자가 따로 푼 한 단 식**과 맞춘다 — 같은 리더로 두 번 읽으면 항등식이라 공허하다. */
  const oneBand = s => s < EC_ONE.BAND * EC_ONE.BANDG
    ? Math.max(1, EC_ONE.BAND * Math.floor(s / EC_ONE.BAND))
    : EC_ONE.BAND * EC_ONE.BANDG + EC_ONE.BAND2 * Math.floor((s - EC_ONE.BAND * EC_ONE.BANDG) / EC_ONE.BAND2);
  const oneW = a => a < EC_ONE.BAND * EC_ONE.BANDG ? EC_ONE.BAND : EC_ONE.BAND2;
  const oneScale = s => { const a = oneBand(s), w = oneW(a);
    return EC_ONE.eSmooth(a) * Math.pow(EC_ONE.eSmooth(a + w) / EC_ONE.eSmooth(a), EC_ONE.RAMP * (s - a) / w); };
  const S_ALL = []; for (let s = 1; s <= 600; s++) S_ALL.push(s);
  ck('[R1] `ES_BAND3` 를 0 으로 되돌리면 39회차 한 단 곡선이 그대로 돌아온다 (한 줄 되돌림 — 32회차 규율)',
     EC_ONE.SW === EC_ONE.BAND * EC_ONE.BANDG && !EC_ONE.BAND3
     && S_ALL.every(s => Math.abs(EC_ONE.eScale(s) / oneScale(s) - 1) < 1e-12),
     `되돌림본 문턱 s${EC_ONE.SW} · 전이 없음 · s1..s600 전 칸이 한 단 식과 1e-12 안`);
}
{
  const shook = readEC(SRC.replace(/const ES_BAND3\s*=\s*\d+/, 'const ES_BAND3 = 32'), 'R40-shake');
  ck('[R2] 자가 손 상수를 안 든다 — 전이 폭을 흔들면 격자·장벽이 따라 움직인다',
     shook.SW2 !== EC_TWO.SW2 && Math.abs(barrierAt(shook, shook.SW2) / barrierAt(EC_TWO, EC_TWO.SW2) - 1) > 0.2,
     `전이 24 → 32 : 말미 시작 s${EC_TWO.SW2} → s${shook.SW2} · 전이 관문 장벽 ×${f2(barrierAt(EC_TWO, EC_TWO.SW2))} → ×${f2(barrierAt(shook, shook.SW2))}`);
}
ck('[R3] 전이 폭은 두 폭 **사이**다 — 밖이면 «두 단» 이 아니라 다른 한 단이다',
   EC_TWO.BAND2 < EC_TWO.BAND3 && EC_TWO.BAND3 < EC_TWO.BAND,
   `${EC_TWO.BAND2} < ${EC_TWO.BAND3} < ${EC_TWO.BAND}`);
say('');

/* ═══ 정리 ═════════════════════════════════════════════════════════════ */
say('## 정리');
say('');
say('1. 39-8 1번의 후보가 **값을 냈다** — ×3.04 짜리 문턱 관문이 s' + EC_TWO.SW2 + ' 의 ×1.55 로 내려앉는다([C1]).');
say('2. 그런데 39-2 가 문턱8 에서 잰 대가 셋 중 **둘이 안 따라온다** — ① 간격은 한 단 그대로([D1]),');
say('   «없어야 할 벽» 도 한 단 그대로([D3]). 뿌리는 [F] 다: 두 단이 바꾸는 것은 **한 구간**이고');
say('   말미 격자는 s' + (EC_TWO.BAND * EC_TWO.BANDG) + ' 위에서 한 단과 **같은 앵커**로 돌아온다.');
say('3. 남는 대가는 ③ 하나이고 문턱8 의 것보다 작다([D4]) — 관문이 정확히 한 칸만 늘기 때문이다([F3]).');
say('4. 덤으로 ① 적중이 한 칸 늘고([D2]) 33회차가 막아 둔 **말미 축 판정**이 열린다([D5]).');
say('');
say((NG === 0 ? 'PROBE199R40 PASS ' : 'PROBE199R40 FAIL ') + OK + '/' + (OK + NG));
process.exit(NG === 0 ? 0 : 1);
