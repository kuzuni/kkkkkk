/* 작업 681 공용 부품 — 「공용 `.fx-spark` 봉투를 **그려진 것**으로 재는 자」
 *
 *   const { SAMPLE, summarize } = require('./envelope681');
 *
 * `probe681`(재현)과 `verify681`(게이트)이 **같은 자**를 쓴다(402 «두 벌 금지»).
 * 자를 두 벌로 적으면 재현이 찍은 수치와 게이트가 지키는 수치가 조용히 갈린다.
 *
 * ⚠ CSS 문자열이 아니라 **브라우저가 그린 상자·알파**를 읽는다 — `getAnimations()` 를 멈추고
 *   `currentTime` 을 옮기므로 rAF 타이밍·캡처 지연에 안 흔들린다(`verify753` [G] 와 같은 방식).
 * ⚠ 전용 봉투(`fxRlic` — 753 유물 획득 알)는 **대상이 아니다**: `animationName` 으로 걸러 낸다.
 */

/* 페이지 안에서 도는 표본기. 인자는 직렬화되므로 클로저를 안 쓴다. */
const SAMPLE = (steps) => {
  const L = document.getElementById('fxl');
  if (!L) return null;
  const nodes = [...L.querySelectorAll('.fx-spark')].filter(n => /fxSpark/.test(getComputedStyle(n).animationName));
  if (!nodes.length) return null;
  window.__oldBye681 = window.fxBye; window.fxBye = () => {};   /* 애니 끝에 걷히지 않게 잠근다 */
  const sc = (() => { const a = document.getElementById('app');
    if (!a) return 1; const r = a.getBoundingClientRect(); return r.width / (a.offsetWidth || r.width) || 1; })();
  const dur = (() => { const an = nodes[0].getAnimations()[0];
    const t = an && an.effect && an.effect.getTiming().duration; return typeof t === 'number' ? t : 380; })();
  const anims = [];
  nodes.forEach(nd => nd.getAnimations().forEach(a => { try { a.pause(); anims.push(a); } catch (_) {} }));
  const rows = [];
  for (let i = 0; i <= steps; i++) {
    const T = dur * i / steps;
    anims.forEach(a => { try { a.currentTime = T; } catch (_) {} });   /* 알끼리 위상이 갈리면 «동시» 를 못 잰다 */
    rows.push({ T, per: nodes.map(nd => { const b = nd.getBoundingClientRect();
      return { w: b.width / sc, op: parseFloat(getComputedStyle(nd).opacity) || 0,
               cx: (b.x + b.width / 2) / sc, cy: (b.y + b.height / 2) / sc }; }) });
  }
  anims.forEach(a => { try { a.cancel(); } catch (_) {} });          /* 페이지를 망가뜨린 채 끝내지 않는다 */
  nodes.forEach(nd => nd.remove());
  window.fxBye = window.__oldBye681;
  return { dur, n: nodes.length, rows };
};

/* 표본 → 사람이 읽는 수치. 크기는 **알마다 제 최대 대비**로 정규화한다
   (알은 크기가 제각각이라 절대 px 로 섞으면 «탄생 박자» 가 크기 차에 묻힌다). */
function summarize(env) {
  const wMax = env.rows[0].per.map((_, i) => Math.max(...env.rows.map(r => r.per[i].w)));
  const rel = env.rows.map(r => ({
    T: r.T,
    s: r.per.reduce((a, p, i) => a + p.w / wMax[i], 0) / r.per.length,
    op: r.per.reduce((a, p) => a + p.op, 0) / r.per.length,
  }));
  const at = (T) => {
    const t = Math.max(0, Math.min(T, env.dur));
    for (let i = 1; i < rel.length; i++) if (rel[i].T >= t) {
      const a = rel[i - 1], b = rel[i], f = (t - a.T) / Math.max(1e-9, b.T - a.T);
      return { s: a.s + (b.s - a.s) * f, op: a.op + (b.op - a.op) * f };
    }
    return rel[rel.length - 1];
  };
  /* α 가 문턱 아래로 내려가는 시각(표본 사이는 선형 보간) */
  const under = (th) => {
    for (let i = 1; i < rel.length; i++) if (rel[i].op < th) {
      const a = rel[i - 1], b = rel[i];
      return a.T + (b.T - a.T) * ((a.op - th) / Math.max(1e-9, a.op - b.op));
    }
    return env.dur;
  };
  const peak = rel.reduce((b, r) => (r.s > b.s + 1e-6 ? r : b), rel[0]);
  /* ⚑ 2회차 신설 — **이동 진행률**. 비평 2인이 «45~150ms 가 정지로 읽힌다» 를 같이 짚었는데,
     크기·알파만 재는 자로는 그 자리가 «고원» 으로만 보이고 **왜** 정지인지가 안 보인다.
     알마다 «태어난 자리에서 지금까지의 거리 ÷ 제 최대 거리» 를 재 평균한다(알마다 사거리가
     달라 절대 px 로 섞으면 큰 알이 표를 지배한다). */
  const d0 = env.rows[0].per;
  const dist = (i, r) => Math.hypot(r.per[i].cx - d0[i].cx, r.per[i].cy - d0[i].cy);
  const dMax = d0.map((_, i) => Math.max(...env.rows.map(r => dist(i, r))) || 1);
  rel.forEach((r, k) => { r.mv = d0.reduce((a, _, i) => a + dist(i, env.rows[k]) / dMax[i], 0) / d0.length; });
  const mvAt = (T) => {
    const t = Math.max(0, Math.min(T, env.dur));
    for (let i = 1; i < rel.length; i++) if (rel[i].T >= t) {
      const a = rel[i - 1], b = rel[i], f = (t - a.T) / Math.max(1e-9, b.T - a.T);
      return a.mv + (b.mv - a.mv) * f;
    }
    return rel[rel.length - 1].mv;
  };
  /* 가장 긴 «아무것도 안 변하는» 구간 — 크기·알파·이동이 셋 다 표본 간 th 미만으로만 변하는 연속 구간 */
  const stillest = (th = 0.02) => {
    let best = 0, run = 0;
    for (let i = 1; i < rel.length; i++) {
      const a = rel[i - 1], b = rel[i];
      const quiet = Math.abs(b.s - a.s) < th && Math.abs(b.op - a.op) < th && Math.abs(b.mv - a.mv) < th;
      run = quiet ? run + (b.T - a.T) : 0;
      if (run > best) best = run;
    }
    return best;
  };
  return {
    dur: env.dur, n: env.n, rel, at,
    s0: rel[0].s,                                            /* 출생 크기(제 최대 대비) */
    bornFull: env.rows[0].per.filter((p, i) => p.w >= wMax[i] - 0.01).length,  /* 첫 프레임에 이미 최대인 알 */
    peakT: peak.T,                                           /* 최대 크기에 닿는 시각 */
    fadeStart: (() => { for (let i = 0; i < rel.length; i++) if (rel[i].op < 0.995) return rel[i - 1] ? rel[i - 1].T : rel[i].T; return env.dur; })(),
    tail35: env.dur - under(0.35),                           /* «흐린 얼룩» 구간 */
    tail50: env.dur - under(0.5),
    ink: (T) => { const v = at(T); return v.op * v.s * v.s; },
    /* ⚑ 2회차 — **«큰 채로 흐린» 구간**. 꼬리를 시간으로만 재면 «얼룩을 줄여라» 와 «컷이 되지 마라»
       가 서로를 지운다(1회차 비평 2인이 각각 한쪽씩 짚었다). 실제 결함은 «알파가 낮은데 알은 아직
       크다» 이므로 그 둘을 **한 조건**으로 묶어 잰다(문턱은 등재문의 α≤0.35 와 «제 최대의 60%»). */
    smudge: (() => { let ms = 0;
      for (let i = 1; i < rel.length; i++) { const a = rel[i - 1], b = rel[i];
        if ((a.op <= 0.35 && a.s >= 0.6) || (b.op <= 0.35 && b.s >= 0.6)) ms += (b.T - a.T) * 0.5
          + ((a.op <= 0.35 && a.s >= 0.6) && (b.op <= 0.35 && b.s >= 0.6) ? (b.T - a.T) * 0.5 : 0); }
      return ms; })(),
    /* α≤0.35 인 표본에서 알이 얼마나 큰가(최댓값) — 낮을수록 «작아지며 사라진다» */
    faintMaxS: Math.max(0, ...rel.filter(r => r.op <= 0.35 && r.op > 0).map(r => r.s)),
    mvAt, still: stillest(),                                 /* 이동 진행률 · 가장 긴 «정지» 구간(ms) */
    line: rel.map(r => Math.round(r.T) + 'ms s' + r.s.toFixed(2) + '/α' + r.op.toFixed(2)
                       + '/이동' + (r.mv * 100).toFixed(0) + '%').join(' · '),
  };
}

module.exports = { SAMPLE, summarize };
