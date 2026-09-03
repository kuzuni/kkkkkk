#!/usr/bin/env node
/* probe863 — `verify758` [U4] 「채택 창의 ⓑ 정상성이 문턱(15%)에 붙지 않는다」가 1.8%p 로
 * 빨간 자리의 **재현기**. 338 규칙대로 처방 전에 등재문의 가설부터 갈랐다.
 *
 * 등재문(PROGRESS 863)은 두 갈래를 남겼다:
 *   ① 창 사다리를 다시 재고 규약 ⓑ 문턱 15% 의 근거를 실측으로 다시 세운다
 *   ② 정상성 정의(vs W⌊/2⌋)가 «축 구성이 바뀐» 표에서 무엇을 재는지 먼저 확인한다
 *      — 축이 바뀌면 W7↔W14 차가 커지는 것이 당연할 수 있고, 그렇다면 **자가 잴 것을 잘못 고른 것**이다.
 * 이 자의 답은 **②** 다. 그리고 ⛔ «문턱을 넓혀 초록으로 만드는 길» 은 한 칸도 안 썼다
 * (857 처방 — 문턱은 그대로 두고 «무엇을 재는가» 를 간다).
 *
 * ⚑ **시뮬을 한 번도 안 돌린다** — 판정에 쓰는 커밋된 스냅(`docs/review/199-bot-*.json`) 넷만 읽는다.
 *   그래서 이 자는 제품 변경으로 흔들리지 않고, 회귀로 몇 번을 돌려도 같은 수를 낸다.
 *
 * 사용: node tools/probe863.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

/* ── bot199 의 장부 규약 사본 (읽기 전용 — 여기서 값을 새로 정하지 않는다) ────────────── */
const ONCE_KEYS = ['시작(신규 지급)', '가이드미션', '우편', '우편(1회성)', '출석(1일차 환영)'];
const FINITE_KEYS = ['패스'];
const TAIL_STAT_MAX = 0.15;      /* 규약 ⓑ 문턱 — 863 이 **한 칸도 안 건드린 값** */
const U4_MARGIN = 0.02;          /* verify758 [U4] 여유 — 이것도 안 건드렸다 */
const WCAND = [3, 7, 14, 29];
const halfOf = (w) => { const c = WCAND.filter(x => x < w); return c.length ? c[c.length - 1] : 1; };

const SNAPS = [
  ['r26',       'docs/review/199-bot-2026-09-03-r26.json'],
  ['r26-base',  'docs/review/199-bot-2026-09-03-r26-base.json'],
  ['r801-post', 'docs/review/199-bot-2026-09-02-r801-post.json'],
  ['r30-after', 'docs/review/199-bot-2026-09-03-r30-after.json'],
];
const CUR_MD = path.join(ROOT, 'docs/review/199-bot-2026-09-03-r30-after.md');

/* ⚠ bot199 의 `med` 는 **위쪽 중앙값**(`w[floor(n/2)]`)이지 두 중앙의 평균이 아니다(1501행).
   초판이 평균 중앙값을 써서 [1b] 가 7.6% ↔ 표 7.8% 로 0.2%p 어긋났다 — 표가 틀린 게 아니라
   **자가 다른 정의를 썼다**. 대조하려면 정의부터 같아야 한다. */
const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : 0; };
const fmt = (n) => Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : String(n);
const pc = (x) => Number.isFinite(x) ? (100 * x).toFixed(1) + '%' : '—';

const R = [];
const yes = (n, pass, got) => R.push({ n, pass: !!pass, got: got == null ? String(!!pass) : String(got) });
const note = (n, got) => R.push({ n, pass: true, got: String(got), obs: true });

const load = (rel) => { const p = path.join(ROOT, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const dayOf = (r, d) => r.rows.filter((x) => x.label === 'D' + d)[0];
const V = (s) => s.inAll - s.outNS;                       /* mode='summon' — [E4] 가 쓰는 장부 */
const sumK = (s, ks) => ks.reduce((a, k) => a + ((s.inBy && s.inBy[k]) || 0), 0);

/* bot199 `tailSplit(pol,'summon',W)` 의 사본 — 같은 수가 나오는지 [1] 이 대조한다. */
function tailSplit(j, pol, W) {
  const days = j.days, span = days - Math.max(1, days - W);
  if (span <= 0 || !j.policies[pol]) return null;
  const A = [], F = [], O = [], C = [];
  for (const r of j.policies[pol]) {
    const end = dayOf(r, days), w0 = dayOf(r, Math.max(1, days - W));
    if (!end || end.inAll == null || !w0 || !end.inBy || !w0.inBy) continue;
    const full = (V(end) - V(w0)) / span;
    const fin = (sumK(end, FINITE_KEYS) - sumK(w0, FINITE_KEYS)) / span;
    const once = (sumK(end, ONCE_KEYS) - sumK(w0, ONCE_KEYS)) / span;
    A.push(full); F.push(fin); O.push(once); C.push(full - fin - once);
  }
  return C.length ? { W, span, full: med(A), fin: med(F), once: med(O), cont: med(C) } : null;
}
/* 옛 규약 자 ⓑ' — 장부 정상성(두 정책 중 최악) */
function statOf(j, w) {
  let worst = 0;
  for (const pol of Object.keys(j.policies)) {
    const a = tailSplit(j, pol, w), b = tailSplit(j, pol, halfOf(w));
    if (!a || !b || !(a.cont > 0)) return null;
    worst = Math.max(worst, Math.abs(a.cont - b.cont) / a.cont);
  }
  return worst;
}
const statPolOf = (j, pol, w) => {
  const a = tailSplit(j, pol, w), b = tailSplit(j, pol, halfOf(w));
  return (a && b && a.cont > 0) ? Math.abs(a.cont - b.cont) / a.cont : null;
};
/* 새 규약 자 ⓑ — 정책 대조 정상성 */
function rstatOf(j, w) {
  const ratio = (ww) => {
    const d = tailSplit(j, 'diligent', ww), c = tailSplit(j, 'casual', ww);
    return (d && c && d.cont > 0 && c.cont > 0) ? d.cont / c.cont : null;
  };
  const a = ratio(w), b = ratio(halfOf(w));
  return (a == null || b == null) ? null : Math.abs(a - b) / a;
}
/* 규약대로 창을 고른다. `narrowOk` 를 켜면 «가장 좁은 후보 배제» 를 끈다(§R 이 쓴다). */
function pick(j, fn, narrowOk) {
  const cand = WCAND.filter((w) => w < j.days).map((w) => ({ w, st: fn(j, w) })).filter((x) => x.st != null);
  const ok = cand.filter((x) => x.st <= TAIL_STAT_MAX && (narrowOk || x.w !== WCAND[0]));
  return { cand, pick: ok.length ? ok[ok.length - 1] : null };
}

const snaps = SNAPS.map(([k, rel]) => [k, load(rel)]).filter(([, j]) => j && j.policies);
const cur = (snaps.filter(([k]) => k === 'r30-after')[0] || [])[1];
const r26 = (snaps.filter(([k]) => k === 'r26')[0] || [])[1];

console.log('PROBE863 — verify758 [U4] «문턱 여유 1.8%p» 의 뿌리\n');
yes('[0] [전제] 판정에 쓰는 커밋 스냅을 넷 다 읽었다 (하나라도 없으면 아래는 아무것도 못 잰다)',
    snaps.length === SNAPS.length && !!cur && !!r26, snaps.map(([k]) => k).join(' · '));

/* ── [1] 사다리 재계산 — 표를 믿지 않고 스냅에서 직접 짓는다 ─────────────────────── */
console.log('\n[1] 창 사다리 — 커밋 스냅에서 직접 지은 값 ↔ 커밋된 [E4] 표');
if (cur) {
  const mdTxt = fs.existsSync(CUR_MD) ? fs.readFileSync(CUR_MD, 'utf8') : '';
  const ladder = WCAND.map((w) => `W${w} ⓑ${pc(rstatOf(cur, w))} / ⓑ'${pc(statOf(cur, w))}`).join(' · ');
  note('[1a] r30-after 사다리 (ⓑ 정책 대조 / ⓑ\' 장부)', ladder);
  /* 표가 스스로 적은 채택 행의 두 수를 자가 다시 지어 대조한다 */
  const row = mdTxt.split('\n').filter((l) => /^\|\s*\*\*W\d+\*\*\s*✅/.test(l))[0] || '';
  const c = row.split('|').map((s) => s.trim());
  const tW = Number((c[1] || '').replace(/[^\d]/g, '')), tSt = parseFloat(c[7]), tSt0 = parseFloat(c[8]);
  const mine = tW ? rstatOf(cur, tW) : null;
  yes('[1b] 표의 채택 행 ⓑ 값을 **자가 다시 지어도 같다** (±0.15%p — 표 반올림 폭)',
      tW && mine != null && Math.abs(100 * mine - tSt) <= 0.15,
      `표 W${tW} ${tSt}% ↔ 재계산 ${pc(mine)}`);
  yes('[1c] [전제] 채택 창이 **W14** 다 (아래 [6] 이 «판정 줄 Δ0» 를 주장하는 근거)', tW === 14, 'W' + tW);
  note('[1d] 표의 ⓑ\' 관측 칸(부지런) — 옛 «최악 합본» 이면 13.2, 정책별이면 6.4', tSt0 + '%');
}

/* ── [2] ⛔ 등재문 ② 확인 — 비는 올랐는데 **어긋남은 줄었다** ────────────────────── */
console.log('\n[2] 등재문 ② — 비가 오른 것은 말미가 나빠져서인가, 분모가 얇아져서인가');
if (cur && r26) {
  const a26 = tailSplit(r26, 'casual', 14), b26 = tailSplit(r26, 'casual', 7);
  const a30 = tailSplit(cur, 'casual', 14), b30 = tailSplit(cur, 'casual', 7);
  const abs26 = Math.abs(a26.cont - b26.cont), abs30 = Math.abs(a30.cont - b30.cont);
  const rel26 = abs26 / a26.cont, rel30 = abs30 / a30.cont;
  yes('[2a] ⚑ **절대 어긋남은 줄었다** — 대충 |cont(W14) − cont(W7)| 이 r26 → r30 에서 작아진다',
      abs30 < abs26, `${fmt(abs26)}/일 → ${fmt(abs30)}/일 (${(100 * (abs30 / abs26 - 1)).toFixed(1)}%)`);
  yes('[2b] ⚑ **그런데 옛 자(ⓑ\')는 올랐다** — 같은 두 세대에서 비가 커진다 (자와 실재가 반대 방향)',
      rel30 > rel26, `${pc(rel26)} → ${pc(rel30)} (+${(100 * (rel30 / rel26 - 1)).toFixed(0)}%)`);
  yes('[2c] 뿌리는 **분모** — 대충 지속 장부(cont W14)가 그 사이 얇아졌다',
      a30.cont < a26.cont, `${fmt(a26.cont)}/일 → ${fmt(a30.cont)}/일 (${(100 * (a30.cont / a26.cont - 1)).toFixed(1)}%)`);
  /* 얇아진 자리를 이름으로 지목한다 — 30회차 이관 `OFF_DIA_PM` 10 → 2.7 */
  const axisOf = (j, pol, w, k) => {
    const days = j.days, span = days - Math.max(1, days - w);
    return med(j.policies[pol].map((r) => {
      const e = dayOf(r, days), z = dayOf(r, days - w);
      return ((e.inBy[k] || 0) - (z.inBy[k] || 0)) / span;
    }));
  };
  const off26 = axisOf(r26, 'casual', 14, '오프라인'), off30 = axisOf(cur, 'casual', 14, '오프라인');
  yes('[2d] 얇아진 것은 **완전히 평평한 축**이다 — 오프라인(하루하루 같은 수)이 대충 지속 장부에서 차지하던 몫',
      off30 < off26 * 0.5,
      `${fmt(off26)}/일 (장부의 ${pc(off26 / a26.cont)}) → ${fmt(off30)}/일 (${pc(off30 / a30.cont)})`);
  note('[2e] ⇒ 판정문', '«말미가 13% 만큼 안 정상» 이 아니라 «평평한 축을 깎아 분모가 30% 얇아졌다» 가 실재다');
}

/* ── [3] 어긋남의 임자 — 축 하나가 거의 전부다 ──────────────────────────────────── */
console.log('\n[3] W7 ↔ W14 어긋남의 축별 분해 (대충 · 두 세대)');
if (cur && r26) {
  const axisGap = (j, pol) => {
    const days = j.days;
    const slope = (w, k) => {
      const span = days - Math.max(1, days - w);
      return med(j.policies[pol].map((r) => {
        const e = dayOf(r, days), z = dayOf(r, days - w);
        return ((e.inBy[k] || 0) - (z.inBy[k] || 0)) / span;
      }));
    };
    const keys = new Set();
    for (const r of j.policies[pol]) Object.keys(dayOf(r, days).inBy).forEach((k) => keys.add(k));
    const out = [];
    for (const k of keys) {
      if (ONCE_KEYS.includes(k) || FINITE_KEYS.includes(k)) continue;
      out.push({ k, d: slope(14, k) - slope(7, k) });
    }
    out.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    return out;
  };
  for (const [nm, j] of [['r26', r26], ['r30-after', cur]]) {
    const g = axisGap(j, 'casual');
    const tot = g.reduce((a, b) => a + Math.abs(b.d), 0);
    const top = g[0];
    yes(`[3-${nm}] 어긋남의 임자는 **축 하나(던전)** 다 — 절대 몫의 ≥ 80% (${nm})`,
        top.k === '던전' && Math.abs(top.d) / tot >= 0.80,
        g.slice(0, 3).map((x) => `${x.k} ${x.d >= 0 ? '+' : ''}${fmt(x.d)} (${pc(Math.abs(x.d) / tot)})`).join(' · '));
  }
}

/* ── [4] 던전은 «추세» 가 아니라 «맥박» 이다 ─────────────────────────────────────── */
console.log('\n[4] 던전 축의 모양 — 창은 기울기가 아니라 «맥박 개수» 를 센다');
if (cur) {
  const pulseDays = (r) => {
    const out = [];
    for (let d = 2; d <= cur.days; d++) {
      const a = dayOf(r, d), b = dayOf(r, d - 1);
      if (a && b && ((a.inBy['던전'] || 0) - (b.inBy['던전'] || 0)) > 1000) out.push(d);
    }
    return out;
  };
  for (const pol of ['casual', 'diligent']) {
    const runs = cur.policies[pol];
    const zeroShare = med(runs.map((r) => {
      let z = 0; for (let d = 17; d <= cur.days; d++) {
        const a = dayOf(r, d), b = dayOf(r, d - 1);
        if (((a.inBy['던전'] || 0) - (b.inBy['던전'] || 0)) <= 1000) z++;
      } return z / 14;
    }));
    yes(`[4a-${pol}] 말미 14칸 중 던전이 **0 인 날이 ≥ 70%** (연속 수급이 아니라 맥박)`,
        zeroShare >= 0.70, `0인 날 ${pc(zeroShare)} (14칸 중 ${Math.round(zeroShare * 14)}칸)`);
    /* 창 기울기 = (맥박 수 × 맥박 크기) ÷ 창 길이 — 정확히 그렇다면 «위상» 만 본 것이다 */
    const r0 = runs[0];
    const cnt = (w) => pulseDays(r0).filter((d) => d > cur.days - w).length;
    note(`[4b-${pol}] 시드0 맥박 날 · 창별 맥박 수`, `${pulseDays(r0).join(',')}  ⇒ W3 ${cnt(3)}개 · W7 ${cnt(7)}개 · W14 ${cnt(14)}개`);
  }
  /* 시드 풀링으로 안 지워진다 — 위상이 시드마다 같다 */
  const spread = (pol) => {
    const last = cur.policies[pol].map((r) => { const p = pulseDays(r); return p[p.length - 1]; });
    return Math.max(...last) - Math.min(...last);
  };
  yes('[4c] ⚑ 시드 12개의 **위상이 같다** — 마지막 맥박 날의 폭이 ≤ 2일 (시드 풀링으로 못 지운다)',
      spread('casual') <= 2 && spread('diligent') <= 2,
      `대충 폭 ${spread('casual')}일 · 부지런 폭 ${spread('diligent')}일`);
}

/* ── [5] 옛 표는 정책별 칸에 «두 정책 중 최악» 을 실었다 ─────────────────────────── */
console.log('\n[5] 27~30회차 표의 ⓑ\' 칸 — 정책별인가 합본인가');
if (cur) {
  const dOwn = statPolOf(cur, 'diligent', 14), cOwn = statPolOf(cur, 'casual', 14), joint = statOf(cur, 14);
  yes('[5a] 두 정책의 **자기 값이 다르다** — 그러니 정책별 표에 같은 수가 실리면 그것은 합본이다',
      Math.abs(dOwn - cOwn) > 0.03, `부지런 ${pc(dOwn)} · 대충 ${pc(cOwn)} · 최악(합본) ${pc(joint)}`);
  yes('[5b] 합본은 **대충 쪽**이다 (옛 표의 «부지런 13.2%» 는 부지런의 수가 아니었다)',
      Math.abs(joint - cOwn) < 1e-9, `${pc(joint)} = 대충 ${pc(cOwn)} ≠ 부지런 ${pc(dOwn)}`);
}

/* ── [6] 새 자로 갈아도 **채택 창이 안 움직인다** — 판정 줄 Δ0 ───────────────────── */
console.log('\n[6] 새 규약 자(ⓑ 정책 대조) — 커밋 스냅 넷 전부에서 채택 창이 그대로인가');
{
  let allSame = true; const lines = [];
  for (const [k, j] of snaps) {
    const o = pick(j, statOf, true).pick, n = pick(j, rstatOf).pick;
    const same = !!o && !!n && o.w === n.w;
    if (!same) allSame = false;
    lines.push(`${k}: 구 W${o ? o.w : '—'} → 신 W${n ? n.w : '—'}${same ? '' : ' ⚠'} (여유 ${n ? (100 * (TAIL_STAT_MAX - n.st)).toFixed(1) + '%p' : '—'})`);
  }
  yes('[6a] ⚑ **채택 창이 네 세대 전부에서 그대로다** — 그러므로 ④ 판정 줄([T1] 1.964)은 Δ0 이고 밸런스 계수는 0줄이다',
      allSame, lines.join(' · '));
  const nCur = pick(cur, rstatOf).pick;
  yes('[6b] 그 채택 창의 여유가 [U4] 기준(≥ 2%p)을 **문턱을 안 넓히고** 넘는다',
      !!nCur && (TAIL_STAT_MAX - nCur.st) >= U4_MARGIN,
      nCur ? `W${nCur.w} · 대조 정상성 ${pc(nCur.st)} · 여유 ${(100 * (TAIL_STAT_MAX - nCur.st)).toFixed(1)}%p (문턱 ${pc(TAIL_STAT_MAX)} 불변)` : '(못 골랐다)');
}

/* ── §R 되돌림 시험 — 무르게 푼 수리가 아님을 세 겹으로 못박는다 ─────────────────── */
console.log('\n[R] 되돌림 시험 — 새 자가 «아무거나 통과시키는 자» 가 아닌가');
if (cur) {
  /* R1 — 옛 자로 되돌리면 [U4] 가 그 자리에서 다시 빨개진다 */
  const oldPick = pick(cur, statOf, true).pick;
  const oldMargin = oldPick ? TAIL_STAT_MAX - oldPick.st : NaN;
  yes('[R1] `rstatOf` → `statOf` 로 되돌리면 [U4] 가 **그 자리에서 다시 빨갛다** (여유 < 2%p)',
      !!oldPick && oldMargin < U4_MARGIN,
      oldPick ? `W${oldPick.w} 여유 ${(100 * oldMargin).toFixed(1)}%p < ${(100 * U4_MARGIN).toFixed(0)}%p` : '(못 골랐다)');
  /* R2 — 새 자도 후보를 실제로 떨어뜨린다(전원 통과면 자가 아니다) */
  const cand = WCAND.filter((w) => w < cur.days).map((w) => ({ w, st: rstatOf(cur, w) })).filter((x) => x.st != null);
  const rej = cand.filter((x) => x.st > TAIL_STAT_MAX);
  yes('[R2] 새 자도 후보를 **떨어뜨린다** — 넷 중 ≥ 2개가 문턱 밖 (전원 통과면 «자» 가 아니다)',
      rej.length >= 2, cand.map((x) => `W${x.w} ${pc(x.st)}${x.st > TAIL_STAT_MAX ? ' ✗' : ' ✓'}`).join(' · '));
  /* R3 — «가장 좁은 후보 배제» 가 실제로 일을 한다(안 하면 규약에 있을 이유가 없다) */
  const w3 = rstatOf(cur, WCAND[0]);
  yes(`[R3] «가장 좁은 후보 W${WCAND[0]} 배제» 는 **실동작한다** — 그 창의 대조 정상성이 문턱 안이라 배제가 없으면 채택 후보가 된다`,
      w3 != null && w3 <= TAIL_STAT_MAX,
      `W${WCAND[0]} 대조 ${pc(w3)} ≤ ${pc(TAIL_STAT_MAX)} — 배제 없이는 W14 가 떨어질 때 3칸 창이 뽑힌다`);
  /* R4 — 문턱도 여유도 안 넓혔다는 것을 소스로 못박는다 */
  const botSrc = fs.readFileSync(path.join(ROOT, 'tools/bot199.js'), 'utf8');
  const vSrc = fs.readFileSync(path.join(ROOT, 'tools/verify758.js'), 'utf8');
  const mT = botSrc.match(/const\s+TAIL_STAT_MAX\s*=\s*([\d.]+)/);
  yes('[R4] ⚑ **문턱(15%)도 [U4] 여유(2%p)도 한 칸 안 넓혔다** — 갈아 낸 것은 «무엇을 재는가» 뿐이다 (857 처방)',
      !!mT && Number(mT[1]) === TAIL_STAT_MAX && /stat <= 13 && e4C\.stat <= 13/.test(vSrc.replace(/e4D\./, '')),
      `TAIL_STAT_MAX = ${mT ? mT[1] : '?'} · verify758 [U4] 문턱식 «≤ 13» 그대로`);
}

/* ── 결과 ─────────────────────────────────────────────────────────────────────── */
let pass = 0, fail = 0;
console.log('');
for (const r of R) {
  if (r.obs) { console.log(`  · ${r.n}  →  ${r.got}`); pass++; continue; }
  if (r.pass) { pass++; console.log(`  ✅ ${r.n} — ${r.got}`); }
  else { fail++; console.log(`  ❌ ${r.n} — ${r.got}   (기대 true)`); }
}
console.log(`\nPROBE863 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
