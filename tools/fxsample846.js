/* 작업 846 공용 부품 — **애니메이션 시간으로 걷는 덮임 표본기**
 *
 * 왜 있나: `verify818` 의 덮임 축([B2]~[B4]·[R1]~[R3])은 «홀드하는 동안 벽시계로 표본을 뜬다» 였다.
 * 그 자는 러너 속도에 **두 겹으로** 흔들린다 —
 *   ⓐ 표본마다 CDP 왕복이 있어 실측 간격이 ×1 에서 이미 39~54ms(지시 16ms)이고 ×6 에서 340~680ms 다.
 *   ⓑ 덮임은 **세대가 겹칠 때** 생기는데(한 세대만으로는 봉우리가 1.5~2.9% 로 5% 문턱 아래다),
 *      겹침의 정도는 홀드 틱 사슬(setTimeout)이 정하므로 **러너가 정한다**(825 가 [C] 에서 만난 그 축).
 * 그래서 ×4·×6 에서 되돌림 시험 [R1]·[R2] 가 «≥5% 표본 0개» 로 뒤집힌다(846 등재문).
 * ⚑ **값이 «안 덮인다» 로 바뀐 것이 아니라 표본이 사라진 것**이고, `probe846` [1] 이 그 곡선을 그린다.
 *
 * ⚠ 등재문의 처방 갈래 ⓑ(«페이지 안 rAF 로 옮긴다»)는 **재현이 기각했다** — ×6 에서는 rAF 자신이
 *   2.9fps(간격 345ms)라 왕복을 0회로 만들어도 표본이 9개뿐이다(`probe846` [2]). 왕복은 절반의 원인이고
 *   나머지 절반인 ⓑ(겹침)는 어떤 «벽시계 표본기» 로도 못 고친다.
 *
 * ⇒ 처방은 갈래 ⓐ(«개수와 덮음을 따로 돈다»)를 한 겹 더 밀어붙인 것이다: 덮임은 **벽시계로 재지 않는다.**
 *   제품이 실제로 낳은 알을 잡아 그 **CSS 애니메이션을 멈추고 `currentTime` 을 우리가 민다**(695 `freeze` 선례).
 *   세대 겹침도 러너에게 묻지 않고 **제품의 상수**로 다시 만든다 — 세대 간격은 [C] 가 쓰는 그 값
 *   (`TR_HOLD_IV0` 160ms = 제품의 **가장 성긴** 홀드 틱 = 가장 적게 겹치는, 가장 보수적인 자리)이고
 *   수명은 알 자신의 애니메이션에서 읽는다(손 상수 금지).
 *   ⇒ 표본 수는 우리가 정한 스텝 수로 **고정**되고, 러너는 식에서 빠진다.
 *
 * ⚠ 눈금은 한 칸도 안 바뀐다 — 덮임은 816·818 과 같은 «1px 격자의 중심이 어느 알 안에 있는가» 다
 *   (행마다 x 구간을 합쳐 세므로 비용만 줄고 값은 같다 · `probe846` [3] 이 소박한 이중 루프와 대조한다).
 * ⚠ 338 — «함수를 불렀는가» 가 아니라 화면에 실제로 놓인 알의 상자를 센다. 알은 제품이 낳은 그 노드다.
 */

/* 816·818 의 원래 자(소박한 이중 루프) — 등가 대조용으로만 쓴다 */
const NAIVE_COV = (ink, eggs) => {
  if (!ink || !ink.width || !ink.height) return 0;
  const x0 = Math.floor(ink.left), y0 = Math.floor(ink.top);
  const w = Math.ceil(ink.width), h = Math.ceil(ink.height);
  let n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x0 + x + 0.5, py = y0 + y + 0.5;
    for (const e of eggs) if (px > e.left && px < e.right && py > e.top && py < e.bottom) { n++; break; }
  }
  return n / (w * h);
};

/* 페이지 안에서 도는 덮임 표본기.
 *   arg = { sel:{host,num}, gens, tick, step, timeout, rects }
 *   gens  = 잡을 세대 수. 겹침은 `tick`·`life` 가 정하므로(380 ÷ 160 ⇒ 최대 3겹) 이 수는 **표본 수**다 —
 *           옛 자의 «홀드 몇 초» 자리를 대신하고, 러너는 «몇 개를 얻는가» 가 아니라 «얼마나 기다리는가» 만 정한다.
 *           ⚠ 알의 방향(`--dx/--dy`)이 발화마다 무작위라 세대가 적으면 «덮는 세대» 를 통째로 못 뽑는다
 *             (3세대에서 단련 봉우리가 12.5% ↔ 4.0% 로 갈렸다 — 러너가 아니라 제비뽑기다).
 *   tick  = 세대 간격(ms · 제품 상수 `TR_HOLD_IV0`)
 *   step  = 애니메이션 시간 스텝(ms)
 *   rects = 등가 대조용으로 남길 원본 상자 프레임 수(판정에는 안 쓴다)
 * 반환 = { frames, max, n05, n25, out, peak, eggs, gens, life, step, alive }
 */
const COV_RUN = (arg) => new Promise(res => {
  const sel = arg.sel;
  const host = document.querySelector(sel.host);
  const L = document.getElementById('fxl');
  if (!host || !L) { res(null); return; }

  const inkOf = el => {
    if (!el) return null;
    let has = false; for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) has = true;
    if (has) { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); }
    return el.getBoundingClientRect();
  };
  /* 816 의 자와 픽셀 단위로 같은 값 — 행마다 x 구간을 합쳐 «중심이 안에 든» 정수 x 를 센다 */
  const cov = (ink, eggs) => {
    if (!ink || !ink.width || !ink.height || !eggs.length) return 0;
    const x0 = Math.floor(ink.left), y0 = Math.floor(ink.top);
    const w = Math.ceil(ink.width), h = Math.ceil(ink.height);
    let n = 0;
    for (let y = 0; y < h; y++) {
      const py = y0 + y + 0.5;
      const iv = [];
      for (const e of eggs) if (py > e.top && py < e.bottom) iv.push([e.left, e.right]);
      if (!iv.length) continue;
      iv.sort((p, q) => p[0] - q[0]);
      let a = iv[0][0], b = iv[0][1];
      for (let i = 1; i <= iv.length; i++) {
        if (i < iv.length && iv[i][0] <= b) { if (iv[i][1] > b) b = iv[i][1]; continue; }
        const lo = Math.max(0, Math.floor(a - x0 - 0.5) + 1);
        const hi = Math.min(w - 1, Math.ceil(b - x0 - 0.5) - 1);
        if (hi >= lo) n += hi - lo + 1;
        if (i < iv.length) { a = iv[i][0]; b = iv[i][1]; }
      }
    }
    return n / (w * h);
  };

  const gens = [];
  let done = false;
  /* ⚑ 가드는 **첫 알이 나기 전에** 건다 — `fxBye` 의 제거 타이머는 알 나이 380ms 즈음에 터지므로,
     세 세대를 다 모은 뒤에 걸면 **첫 세대는 이미 걷힌 뒤**다(빈 상자라 궤적이 통째로 빠진다).
     범위는 이 표본기가 사는 동안의 `.fx-spark` 뿐이고, 끝나면 되돌린 뒤 우리 손으로 전부 지운다.
     ⚠ 제품 코드는 한 글자도 안 건드린다 — 자의 관측 창을 여는 것뿐이다. */
  const origRemove = Element.prototype.remove;
  let guarded = true;
  Element.prototype.remove = function () {
    if (guarded && this.nodeType === 1 && /fx-spark/.test(this.className + '')) return;
    return origRemove.call(this);
  };
  const mo = new MutationObserver(recs => {
    if (done) return;
    const born = [];
    for (const r of recs) for (const nd of r.addedNodes)
      if (nd.nodeType === 1 && /fx-spark/.test(nd.className + '')) born.push(nd);
    if (!born.length) return;
    gens.push(born);                       /* 한 콜백 = 한 발화(제품이 cnt 알을 동기로 붙인다) */
    if (gens.length < arg.gens) return;
    done = true; mo.disconnect();
    finish();
  });
  mo.observe(L, { childList: true });
  setTimeout(() => { if (!done) { done = true; mo.disconnect(); finish(); } }, arg.timeout || 9000);

  function finish() {
    if (!gens.length) { guarded = false; Element.prototype.remove = origRemove; res(null); return; }
    const all = [].concat.apply([], gens);
    let life = 0;
    const anims = gens.map(g => {
      const A = [];
      for (const nd of g) for (const a of nd.getAnimations()) {
        a.pause(); A.push(a);
        try {
          const tm = a.effect.getTiming();
          const d = (Number(tm.delay) || 0) + (Number(tm.duration) || 0);   /* 수명은 알에게 묻는다 */
          if (d > life) life = d;
        } catch (_) {}
      }
      return A;
    });
    if (!(life > 0)) life = 380;                                            /* 폴백 = `FXSPARK_MS` */
    const ink = inkOf(host.querySelector(sel.num));
    const tick = arg.tick, step = arg.step;
    const end = (gens.length - 1) * tick + life;
    let frames = 0, max = 0, n05 = 0, n25 = 0, out = 0, peak = 0, sum = 0;
    const rects = [];
    for (let tt = 0; tt <= end + 1e-6; tt += step) {
      const rs = [];
      for (let g = 0; g < gens.length; g++) {
        const lt = tt - g * tick;
        if (lt < 0 || lt > life) continue;              /* 아직 안 났거나 이미 걷힌 세대 — 안 센다 */
        for (const a of anims[g]) { try { a.currentTime = lt; } catch (_) {} }
      }
      for (let g = 0; g < gens.length; g++) {
        const lt = tt - g * tick;
        if (lt < 0 || lt > life) continue;
        for (const nd of gens[g]) {
          const b = nd.getBoundingClientRect();
          if (b.width && b.height) rs.push({ left: b.left, right: b.right, top: b.top, bottom: b.bottom });
        }
      }
      if (!rs.length) continue;
      frames++; sum += rs.length;
      if (rs.length > peak) peak = rs.length;
      const c = cov(ink, rs);
      if (c > max) max = c;
      if (c >= 0.05) n05++;
      if (c >= 0.25) n25++;
      const hb = host.getBoundingClientRect();
      let o = 0;
      for (const e of rs) {
        const cx = (e.left + e.right) / 2, cy = (e.top + e.bottom) / 2;
        if (cx < hb.left || cx > hb.right || cy < hb.top || cy > hb.bottom) o++;
      }
      if (o > out) out = o;
      if (rects.length < (arg.rects | 0) && ink)
        rects.push({ ink: { left: ink.left, top: ink.top, width: ink.width, height: ink.height }, eggs: rs });
    }
    const alive = all.filter(nd => nd.isConnected).length;
    guarded = false; Element.prototype.remove = origRemove;
    /* 잡은 세대와 그 사이에 가드가 붙잡아 둔 나머지를 **전부** 걷는다 — 다음 홀드의 첫 표본에 섞이면
       816 의 함정이다(`hold()` 이 «비고 다 지고 시작한다» 로 막는 그 자리). */
    for (const nd of [...L.children]) if (/fx-spark/.test(nd.className + '')) { try { nd.remove(); } catch (_) {} }
    res({ frames, max, n05, n25, out, peak, eggs: frames ? sum / frames : 0,
          gens: gens.length, per: gens.length ? all.length / gens.length : 0,
          life, step, tick, alive, rects });
  }
});

module.exports = { COV_RUN, NAIVE_COV };
