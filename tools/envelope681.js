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
  /* ⚑ 8회차 — 알마다 **음(−) 지연**이 걸린다(`FXSPARK_JIT`). 이 자가 재는 것은 «곡선» 이지
     «화면» 이 아니므로 재기 전에 **지연을 0 으로 눕힌다** — 그러면 `currentTime` 이 곧 봉투 위상이다.
     ⚠ `currentTime = T + delay` 로 맞추는 길은 **막혀 있다**: 지연이 −33ms 면 위상 0 의 `currentTime`
       이 −33ms 라 타임라인 **앞**이고, `fill:forwards` 는 앞을 안 채우므로 그 자리에서 잰 값은
       애니가 아니라 **요소의 밑 스타일**(scale 1 · α1)이다 — 8회차에 실제로 [B1]·[B2]·[B11]·[B12] 가
       «출생 100% · 봉우리 0ms» 로 빨개진 자리다.
     화면(벽시계)은 `SPREAD`·`cap681`·`ink681` 이 지연을 **살린 채** `currentTime = T` 로 잰다. */
  nodes.forEach(nd => { try { nd.style.animationDelay = '0s'; } catch (_) {} });
  nodes.forEach(nd => nd.getAnimations().forEach(a => { try { a.pause(); anims.push(a); } catch (_) {} }));
  /* ⚑ 6회차 — `steps` 에 **시각 배열**을 주면 그 시각들에서 잰다(균등 격자 대신 «캡처 격자»).
     [B12] 는 비평가가 보는 여덟 장 **바로 그 시각**의 이웃 델타를 물어야 하는데, 균등 19ms 격자로
     보간하면 봉우리(68.4ms)가 57·76ms 두 표본 사이로 뭉개져 70→110ms 가 −10.1% 대신 −6.9% 로
     읽힌다(자가 만든 유령 — 619 20회차 계열). 시각을 직접 주면 그 뭉갬이 구조적으로 안 생긴다. */
  const times = Array.isArray(steps) ? steps.slice()
    : Array.from({ length: steps + 1 }, (_, i) => dur * i / steps);
  const rows = [];
  for (let i = 0; i < times.length; i++) {
    const T = times[i];
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
    /* ⚑ 4회차 — «퇴장이 시작되는 시각» 은 **봉우리 뒤**에서 찾는다. 4회차가 출생 알파 온셋(α.60 → 1)을
       넣자 종전 판정(«처음으로 α<1 인 표본»)이 **탄생을 퇴장으로 읽어** 퇴장 폭이 380ms 로 부풀었다.
       ⇒ α 가 **제 봉우리에 머문 마지막** 시각을 퇴장의 시작으로 본다.
       ⚑⚑ 6회차 — 판정을 «α ≥ 0.995» 에서 **«봉우리 α 에서 0.005 안»** 으로 옮겼다(같은 뜻, 다른 글자).
       6회차 곡선은 알파 고원을 **한 점**(18% = 68.4ms)으로 좁혔는데 표본 격자(19ms)가 그 점을 안 밟아
       실측 최대가 0.99 가 됐고, 그러자 «0.995 이상인 마지막 표본» 이 **하나도 없어** fadeStart 가 0 으로,
       퇴장 폭이 **380ms** 로 읽혔다 — [B5] 가 초록인데 **아무것도 안 재는 헛초록**이다(그 항이 지키는
       것은 «퇴장이 계조인가» 이지 «α 가 1 에 닿았는가» 가 아니다). 봉우리 기준은 고원이 한 점이든
       한 구간이든 같은 것을 재고, 옛 곡선(고원 190ms)에서도 190ms 로 종전과 같은 값을 낸다. */
    fadeStart: (() => { const mx = Math.max(...rel.map(r => r.op));
      let last = 0; for (let i = 0; i < rel.length; i++) if (rel[i].op >= mx - 0.005) last = rel[i].T; return last; })(),
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
    /* ⚑ 3회차 — **재가속 비**. `ease-out` 이 «마디마다» 걸리면 마디 경계에서 속도가 0 으로 죽었다가
       다시 서므로, 방사형 버스트인데 앞머리가 가장 느려진다(2회차 비평 CI 가 봉투 역산으로 잡은 자리).
       구간속도의 «직전 대비 최대 증가 배수» 로 잰다 — 1 에 가까우면 단조 감속이다.
       ⚠ 첫 구간은 «정지 → 출발» 이라 당연히 오르므로 뺀다(그것은 탄생이지 재가속이 아니다). */
    reaccel: (() => {
      const v = rel.slice(1).map((r, i) => (r.mv - rel[i].mv) / Math.max(1e-9, r.T - rel[i].T));
      let m = 0;
      for (let i = 2; i < v.length; i++) m = Math.max(m, v[i] / Math.max(v[i - 1], 1e-9));
      return m;
    })(),
    line: rel.map(r => Math.round(r.T) + 'ms s' + r.s.toFixed(2) + '/α' + r.op.toFixed(2)
                       + '/이동' + (r.mv * 100).toFixed(0) + '%').join(' · '),
  };
}

/* ⚑ 6회차 신설 — **캡처 격자의 이웃 델타**. 5회차 비평 2인(CN·CO)이 «정점이 한 장이 아니라 고원»
   을 같이 짚었고, 그 지적은 **여덟 장 사이의 크기 차** 하나로 잰다(지각 임계 7~8% — 28~30px
   스프라이트 · 4·5회차 비평이 반복해 쓴 값).
   ⚠ 정규화는 «격자 안에서의 제 최대» 다 — `tools/ink681.js`(잉크 자)와 **같은 정규화**라야 두 자의
   수를 나란히 놓을 수 있다(6회차에 그 둘이 ~2%p 안에서 겹치는 것을 확인했다). */
function gridSteps(env) {
  const wMax = env.rows[0].per.map((_, i) => Math.max(...env.rows.map(r => r.per[i].w)));
  const s = env.rows.map(r => r.per.reduce((a, p, i) => a + p.w / wMax[i], 0) / r.per.length);
  const out = [];
  for (let i = 1; i < env.rows.length; i++) {
    out.push({ from: Math.round(env.rows[i - 1].T), to: Math.round(env.rows[i].T),
               d: (s[i] - s[i - 1]) / Math.max(1e-9, s[i - 1]) });
  }
  return { s, steps: out, peak: s.indexOf(Math.max(...s)) };
}

/* ⚑ 8회차 신설 — **위상 지터 자**. 7회차 비평 2인이 «동시 전멸» 을 각각 «살아 있는 알들의 알파
   편착 175ms 0.9% · 250ms 3.1% · 320ms 6.3%»(CR) · «알파 산포가 전 프레임 ≤0.06 · 70ms 는 0.00»(CS)
   로 실측했다. 그 축을 그대로 자로 세운다.
   ⚠ `SAMPLE` 과 **반대로** 감는다 — `SAMPLE` 은 «봉투» 를 재려고 알끼리 위상을 일부러 맞추지만
     (그래야 «동시» 가 아니라 «곡선» 이 보인다), 이 자는 바로 그 «동시» 를 재므로 **벽시계**로 감고
     알마다 제 지연을 그대로 살린다. 두 자가 같은 페이지에서 서로 다른 것을 재는 것이 맞다. */
const SPREAD = (times) => {
  const L = document.getElementById('fxl');
  if (!L) return null;
  const nodes = [...L.querySelectorAll('.fx-spark')].filter(n => /fxSpark/.test(getComputedStyle(n).animationName));
  if (!nodes.length) return null;
  window.__oldBye681s = window.fxBye; window.fxBye = () => {};
  const anims = [];
  nodes.forEach(nd => nd.getAnimations().forEach(a => { try { a.pause(); anims.push({ a, nd,
    d: (a.effect && a.effect.getTiming().delay) || 0 }); } catch (_) {} }));
  const rows = times.map(T => {
    anims.forEach(x => { try { x.a.currentTime = T; } catch (_) {} });
    const ops = nodes.map(nd => parseFloat(getComputedStyle(nd).opacity) || 0);
    return { T, ops };
  });
  anims.forEach(x => { try { x.a.cancel(); } catch (_) {} });
  nodes.forEach(nd => nd.remove());
  window.fxBye = window.__oldBye681s;
  return { n: nodes.length, delays: anims.map(x => Math.round(x.d * 10) / 10), rows };
};

/* 표본 → «알들이 같은 시계를 쓰는가». 산포는 **살아 있는 알**(α>0.02)에서만 잰다 —
   이미 꺼진 알을 섞으면 «편차가 크다» 가 «다 꺼졌다» 와 구별이 안 된다. */
function spreadOf(sp) {
  return sp.rows.map(r => {
    const live = r.ops.filter(o => o > 0.02);
    if (live.length < 2) return { T: r.T, n: live.length, range: 0, sd: 0, mean: 0 };
    const mean = live.reduce((a, b) => a + b, 0) / live.length;
    const sd = Math.sqrt(live.reduce((a, b) => a + (b - mean) * (b - mean), 0) / live.length);
    return { T: r.T, n: live.length, range: Math.max(...live) - Math.min(...live), sd, mean };
  });
}

module.exports = { SAMPLE, summarize, gridSteps, SPREAD, spreadOf };
