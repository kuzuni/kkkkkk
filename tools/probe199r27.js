#!/usr/bin/env node
/* tools/probe199r27.js — 199 27회차 재현기 (판정 없음 · 측정만)
 *
 * 26-10 1번: «④ 장부를 «패스 제외» 로 네 표 전부 다시 읽어라. 새 실행이 필요 없다 — 표는 이미 있다.»
 *
 * 무엇을 재는가
 *   ⓐ **유한 트랙 제외 기울기** — 말미 창 W 의 기울기에서 «30일 창 안에 소진되는 축»(패스)을 뺀다.
 *      누적(v(30))은 그대로 둔다 — 패스로 실제로 번 다이아는 실재하기 때문이다.
 *      바뀌는 것은 **앞으로의 기울기**뿐이다: cross = 30 + (T − v(30)) / slope_cont.
 *   ⓑ **정상성(定常) 자** — 26-6 1번 ⓑ 가 요구한 «W 와 W/2 의 기울기 차»를 두 장부에서 다 잰다.
 *      유한 트랙이 섞여 있으면 창을 넓힐수록 기울기가 무너진다(그 붕괴가 곧 «유한» 의 서명이다).
 *   ⓒ **대수(algebra) 근사의 오차** — 스윕 셋은 JSON 이 없어 공표 p50 으로만 다시 읽을 수 있다.
 *      base 에서 «시드별 정확 계산» ↔ «공표 p50 대수» 를 나란히 재서 그 오차를 상한으로 얹는다.
 *
 * 사용법: node tools/probe199r27.js [--json=docs/review/199-bot-2026-09-03-r26-base.json]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const ARG = {};
process.argv.slice(2).forEach(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; });

const GOAL_DIA = 27205000;          /* 결2 ⓐ — ④ 의 과녁(2,720.5만) */
const ONCE_KEYS = ['시작(신규 지급)', '가이드미션', '우편', '우편(1회성)', '출석(1일차 환영)'];
/* ⚑ 27회차 신설 — **유한 트랙**: 30일 창 안에 «남은 분량» 이 줄어드는 축.
   일회성(ONCE_KEYS)은 «한 번 주고 끝» 이라 말미 창에서 이미 0 이지만, 패스는 창 안에서
   **0 이 아닌 기울기로 잡히면서도** 트랙(493 패스 길이)이 끝나면 사라진다 — 말미 창이
   «지속 수급» 이 아니라 «아직 안 끝났음» 을 재게 만드는 유일한 축이다(26-8). */
const FINITE_KEYS = ['패스'];

/* ⚠ **`bot199.js` 와 같은 정의를 써야 한다**(표 두 벌 금지). 초판은 `floor((n−1)/2)`(아래쪽
   가운데)를 썼는데 자는 `floor(n/2)`(위쪽 가운데)라, 시드 12개에서 **한 순서통계량**이 어긋나
   같은 표를 읽고도 부지런 교차일이 903.0 ↔ 공표 906.7 로 갈렸다(−0.41%). 결론은 안 바뀌지만
   «같은 자로 잰 비교» 가 아니게 된다(정정9 계보). */
const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const medI = a => { const s = a.slice().sort((x, y) => x - y); if (!s.length) return 0; const m = (s.length - 1) / 2; return (s[Math.floor(m)] + s[Math.ceil(m)]) / 2; };
const fmt = n => Math.round(n).toLocaleString('en-US');
const f2 = n => n.toFixed(2);
const f3 = n => n.toFixed(3);

const P = [];
const say = s => { P.push(s); console.log(s); };

const jf = ARG.json ? String(ARG.json) : 'docs/review/199-bot-2026-09-03-r26-base.json';
const rep = JSON.parse(fs.readFileSync(path.resolve(ROOT, jf), 'utf8'));
const DAYS = rep.days;

const dayOf = (r, d) => r.rows.filter(x => x.label === 'D' + d)[0];
/* 판정 장부 = 소환 예산(결2 ⓐ) — 유입 − 소환 외 씽크 */
const vSummon = s => s.inAll - (s.outNS || 0);
const vIn = s => s.inAll;
const byKeys = (s, keys) => keys.reduce((a, k) => a + ((s.inBy && s.inBy[k]) || 0), 0);

/* 시드별: 말미 창 W 의 기울기(전체 / 유한 트랙 제외)와 그것이 미는 교차일 */
function perSeed(pol, W, mode) {
  const v = mode === 'in' ? vIn : vSummon;
  const out = [];
  for (const r of rep.policies[pol]) {
    const end = dayOf(r, DAYS), w0 = dayOf(r, Math.max(1, DAYS - W));
    if (!end || end.inAll == null || !w0) continue;
    const span = DAYS - Math.max(1, DAYS - W);
    const full = (v(end) - v(w0)) / span;
    const fin = (byKeys(end, FINITE_KEYS) - byKeys(w0, FINITE_KEYS)) / span;
    const once = (byKeys(end, ONCE_KEYS) - byKeys(w0, ONCE_KEYS)) / span;
    const cont = full - fin - once;
    const rest = GOAL_DIA - v(end);
    out.push({
      seed: r.seed, span, full, fin, once, cont,
      crossFull: full > 0 ? DAYS + rest / full : Infinity,
      crossCont: cont > 0 ? DAYS + rest / cont : Infinity,
      v30: v(end),
    });
  }
  return out;
}

const POLS = [['diligent', '부지런'], ['casual', '대충']];

say('# probe199r27 — ④ 판정 장부의 «유한 트랙 제외» 재현 (판정 없음)');
say('');
say(`표본 \`${jf}\` · ${DAYS}일 · 시드 ${rep.seeds} · calib sha ${rep.calHash || '—'}`);
say('');

/* ── [A] W7 · 판정 장부(소환 예산) — 시드별 정확 계산 ─────────────────────── */
say('## [A] W7 · 소환 예산 장부 — 시드별 정확 계산 (p50)');
say('');
say('| 정책 | 말미 기울기 **전체** | 그중 **패스** | **지속**(패스·일회성 제외) | 교차일 전체 | **교차일 지속** |');
say('|---|---|---|---|---|---|');
const A = {};
for (const [pol, nm] of POLS) {
  const s = perSeed(pol, 7, 'summon');
  A[pol] = {
    full: med(s.map(x => x.full)), fin: med(s.map(x => x.fin)), cont: med(s.map(x => x.cont)),
    crossFull: med(s.map(x => x.crossFull)), crossCont: med(s.map(x => x.crossCont)),
    crossFullI: medI(s.map(x => x.crossFull)), crossContI: medI(s.map(x => x.crossCont)),
    v30: med(s.map(x => x.v30)), n: s.length,
  };
  const a = A[pol];
  say(`| ${nm} | ${fmt(a.full)} | ${fmt(a.fin)} (${(100 * a.fin / a.full).toFixed(1)}%) | **${fmt(a.cont)}** | ${a.crossFull.toFixed(1)} | **${a.crossCont.toFixed(1)}** |`);
}
const rFull = A.casual.crossFull / A.diligent.crossFull;
const rCont = A.casual.crossCont / A.diligent.crossCont;
const rSlopeFull = A.diligent.full / A.casual.full;
const rSlopeCont = A.diligent.cont / A.casual.cont;
say('');
say(`**④ 비(교차일)** — 전체 **${f3(rFull)}** · 지속 **${f3(rCont)}** 〔§0 창 1.8~2.0〕`);
say(`**기울기 비**(26-8 이 «비» 로 쓴 수) — 전체 **${f3(rSlopeFull)}** · 지속 **${f3(rSlopeCont)}**`);
say('');

/* ── [B] 정상성 — W 와 W/2 의 기울기 차 (26-6 1번 ⓑ) ────────────────────── */
say('## [B] 정상성(定常) — 창 W 와 W/2 의 기울기 차 〔26-6 1번 ⓑ 의 자〕');
say('');
say('| 정책 | 장부 | W3 | W7 | W14 | W29 | **W7 vs W3** | **W14 vs W7** | **W29 vs W14** |');
say('|---|---|---|---|---|---|---|---|---|');
const WS = [3, 7, 14, 29];
const STAT = {};
for (const [pol, nm] of POLS) {
  for (const [key, lab] of [['full', '전체'], ['cont', '지속(유한 제외)']]) {
    const vals = WS.map(w => med(perSeed(pol, w, 'summon').map(x => x[key])));
    const d = (a, b) => (b > 0 ? ((a - b) / b * 100).toFixed(1) + '%' : '—');
    STAT[pol + '/' + key] = vals;
    say(`| ${nm} | ${lab} | ${fmt(vals[0])} | ${fmt(vals[1])} | ${fmt(vals[2])} | ${fmt(vals[3])} | ${d(vals[1], vals[0])} | ${d(vals[2], vals[1])} | ${d(vals[3], vals[2])} |`);
  }
}
say('');
say('_읽는 법: «지속» 줄이 창을 넓혀도 평평하면 그 창은 정상 구간이다. «전체» 줄만 무너지면 무너뜨린 것은 유한 트랙이다._');
say('');

/* ── [C] 대수 근사의 오차 (스윕 셋에 얹을 상한) ──────────────────────────── */
say('## [C] 공표 p50 «대수» ↔ 시드별 정확 — 오차 (스윕 셋에 얹을 상한)');
say('');
say('대수식: `cross_cont ≈ 30 + (cross_full − 30) × slope_full / slope_cont` — 공표 표의 p50 세 수만으로 푼다.');
say('');
say('| 정책 | 정확(시드별 p50) | 대수(공표 p50) | 오차 |');
say('|---|---|---|---|');
let maxErr = 0;
for (const [pol, nm] of POLS) {
  const a = A[pol];
  const alg = DAYS + (a.crossFull - DAYS) * (a.full / a.cont);
  const err = (alg - a.crossCont) / a.crossCont * 100;
  maxErr = Math.max(maxErr, Math.abs(err));
  say(`| ${nm} | ${a.crossCont.toFixed(1)} | ${alg.toFixed(1)} | **${err >= 0 ? '+' : ''}${err.toFixed(2)}%** |`);
}
const algRatio = (DAYS + (A.casual.crossFull - DAYS) * (A.casual.full / A.casual.cont)) /
                 (DAYS + (A.diligent.crossFull - DAYS) * (A.diligent.full / A.diligent.cont));
say('');
say(`비(대수) **${f3(algRatio)}** ↔ 비(정확) **${f3(rCont)}** — 어긋남 **${((algRatio - rCont) / rCont * 100).toFixed(2)}%**`);
say(`⇒ 스윕 셋(JSON 없음)에 얹을 오차 상한 = **±${Math.max(maxErr, Math.abs((algRatio - rCont) / rCont * 100)).toFixed(1)}%**`);
say('');

/* ── [D] 30일 창 안에서 패스가 언제 마르는가 (유한 트랙의 직접 증거) ────── */
say('## [D] 유한 트랙의 직접 증거 — 패스 유입의 날짜별 기울기 (시드 p50 · 5일 구간)');
say('');
say('| 정책 | D1~5 | D6~10 | D11~15 | D16~20 | D21~25 | D26~30 |');
say('|---|---|---|---|---|---|---|');
for (const [pol, nm] of POLS) {
  const segs = [];
  for (let a = 0; a < 30; a += 5) {
    const vals = [];
    for (const r of rep.policies[pol]) {
      const s1 = dayOf(r, a === 0 ? 1 : a), s2 = dayOf(r, a + 5);
      if (!s2) continue;
      const lo = a === 0 ? 0 : byKeys(s1, FINITE_KEYS);
      vals.push((byKeys(s2, FINITE_KEYS) - lo) / (a === 0 ? 5 : 5));
    }
    segs.push(med(vals));
  }
  say(`| ${nm} | ${segs.map(fmt).join(' | ')} |`);
}
say('');

/* ── [E] 창 W 를 고르는 표 — 지속 장부의 교차일과 ④ 비 ──────────────────── */
say('## [E] 창 W 별 — **지속 장부**의 교차일과 ④ 비 〔W 규약이 고르는 대상〕');
say('');
say('| W | 부지런 기울기 | 대충 기울기 | 부지런 교차일 | 대충 교차일 | **④ 비** | ⓑ 정상성(W↔⌈W/2⌉ 최악) |');
say('|---|---|---|---|---|---|---|');
const HALF = { 3: 1, 7: 3, 14: 7, 29: 14 };
const contAt = {};
for (const w of WS) {
  const d = perSeed('diligent', w, 'summon'), c = perSeed('casual', w, 'summon');
  const dc = med(d.map(x => x.cont)), cc = med(c.map(x => x.cont));
  const dx = med(d.map(x => x.crossCont)), cx = med(c.map(x => x.crossCont));
  contAt[w] = { dc, cc, dx, cx, ratio: dx > 0 ? cx / dx : 0 };
  const h = HALF[w];
  const dh = med(perSeed('diligent', h, 'summon').map(x => x.cont));
  const ch = med(perSeed('casual', h, 'summon').map(x => x.cont));
  const st = Math.max(Math.abs(dc - dh) / dc, Math.abs(cc - ch) / cc) * 100;
  contAt[w].stat = st;
  say(`| **W${w}** | ${fmt(dc)} | ${fmt(cc)} | ${dx.toFixed(1)} | ${cx.toFixed(1)} | **${f3(contAt[w].ratio)}** | ${st.toFixed(1)}% (vs W${h}) |`);
}
say('');
say('_ⓐ 는 W ≤ 29(1일차 1회성 지급을 한 칸도 안 문다) · ⓑ 는 이 표의 마지막 칸이 문턱 이내._');
say('');

/* ── [F] 유한 트랙은 «말라서» 가 아니라 «덩어리로» 들어온다 (창 위상 민감도) ─ */
say('## [F] 유한 트랙의 창 **위상** 민감도 — 패스 기울기가 창마다 몇 배로 갈리는가');
say('');
say('| 정책 | W3 | W7 | W14 | W29 | 최대÷최소 |');
say('|---|---|---|---|---|---|');
for (const [pol, nm] of POLS) {
  const v = WS.map(w => med(perSeed(pol, w, 'summon').map(x => x.fin)));
  const pos = v.filter(x => x > 0);
  const sw = pos.length ? (Math.max(...v) / Math.max(1e-9, Math.min(...v))) : 0;
  say(`| ${nm} | ${fmt(v[0])} | ${fmt(v[1])} | ${fmt(v[2])} | ${fmt(v[3])} | ${v.includes(0) ? '∞ (0 을 문다)' : '×' + f2(sw)} |`);
}
say('');

if (ARG.out) { fs.writeFileSync(path.resolve(ROOT, String(ARG.out)), P.join('\n') + '\n'); }
