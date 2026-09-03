/* 작업 846 공용 부품 — **애니메이션 시간으로 걷는 덮임 표본기**
 *
 * 왜 있나: `verify818` 의 덮임 축([B2]~[B4]·[R1]~[R3])은 «홀드하는 동안 벽시계로 표본을 뜬다» 였다.
 * 그 자는 러너 속도에 **두 겹으로** 흔들린다 —
 *   ⓐ 표본마다 CDP 왕복이 있어 실측 간격이 ×1 에서 이미 39~54ms(지시 16ms)이고 ×6 에서 340~680ms 다.
 *   ⓑ 겹침의 정도는 홀드 틱 사슬(setTimeout)이 정하므로 **러너가 정한다**(825 가 [C] 에서 만난 그 축).
 *      ⚑ **872 정정(2026-09-03)** — 여기 있던 괄호 «한 세대만으로는 봉우리가 1.5~2.9% 로 5% 문턱 아래다» 는
 *        **846 당시 알 크기의 값**이고 지금은 거짓이다. 단련·룬 각 15판 실측이 **30/30 판 전부 문턱 위**
 *        (단련 8.7~16.4% · 룬 16.1~38.3%)다 — 838 계열이 알 크기·사거리를 키운 뒤의 자리.
 *        ⇒ «덮임 = 세대 겹침» 은 더 이상 근거가 아니다. 표본기를 바꾼 이유는 ⓐ(표본 수) 하나로 충분하고,
 *        그 이유는 `probe846` [1]·[2] 가 러너 곡선으로 그대로 세운다(**이 파일의 코드는 0줄 변경**).
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
 *
 * ⚑⚑ 870 — **«버튼 밖» 축(`out`)의 기준 상자를 «표본 시각» 에서 «그 알이 태어난 시각» 으로 옮겼다.**
 *   `verify818` [C1] 이 같은 트리에서 2판에 1판 빨갛던 뿌리다(574·709·825·854·855 계열의 «자 플레이키»).
 *   재현(`probe870`)이 갈래를 한 번에 갈랐다 — 룬 6판에서 **표본 시각 자 3판 빨강 · 태생 시각 자 0판**이고
 *   밖으로 읽힌 알은 예외 없이 **0.12~0.92px** 만 나갔는데 **태생 상자로는 13.9~14.8px 안**이었다.
 *   기계는 621 눌림이다 — 홀드 중 버튼 상자가 **쉼 ↔ 눌림 ↔ 되튐** 으로 흔들리고(단련 실측 폭
 *   468.4~505.9 · top 1154.2~1174.8 = **20.6px 진폭**), 제품은 «그 알을 낳던 순간의 상자»(`fxRect(t)`)에
 *   가두는데 이 표본기는 «finish() 를 부른 순간의 상자» 하나로 전부를 쟀다. 그 순간이 눌림 봉우리면
 *   쉬는 상자 안에서 끝난 알이 통째로 «밖» 으로 읽힌다 — **제비뽑기**다.
 *   ⚠ **제품을 무르게 푼 것이 아니다.** 묻는 것은 그대로 «알이 자기 버튼 안에서 났고 그 안에서 끝나는가»
 *     이고, 제품이 실제로 지키는 그 상자에 자를 댄 것뿐이다. 밖에 난 알은 여전히 빨갛다 —
 *     `arg.inject` 되돌림(아래)이 그것을 못박는다(`verify818` [C1r]).
 *   ⚠ 눌림 진폭은 **기록으로만** 남긴다(`outNow`·`hbSwing` · LESSONS 239-① «흔들리는 양은 표에 기록으로만»).
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
 *             ⚑ **872** — 이 줄이 이미 «한 판으로는 못 묻는다» 를 적어 두고 있었는데 `probe846` [3a] 만
 *               한 판으로 묻고 있었다. 그 자리는 **G판 중앙값**으로 고쳤다(872). 이 상수(`gens`)를 줄이는
 *               자를 새로 쓸 때는 같은 함정을 밟는다 — **분포로 묻고 한 판으로 묻지 마라.**
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

  const gens = [], gbox = [];              /* 870 — 세대마다 «태어난 순간» 의 호스트 상자를 같이 적는다 */
  const hbox = () => { const b = host.getBoundingClientRect();
                       return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height }; };
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
    /* ⚑ 870 — 같은 프레임이라 이 상자가 곧 제품이 가둠에 쓴 `fxRect(t)` 의 상자다
       (콜백은 발화가 알을 **동기로** 붙인 직후의 마이크로태스크에서 돈다). */
    gbox.push(hbox());
    if (gens.length < arg.gens) return;
    done = true; mo.disconnect();
    finish();
  });
  mo.observe(L, { childList: true });
  setTimeout(() => { if (!done) { done = true; mo.disconnect(); finish(); } }, arg.timeout || 9000);

  function finish() {
    if (!gens.length) { guarded = false; Element.prototype.remove = origRemove; res(null); return; }
    /* ⚑ 870 되돌림(`arg.inject`) — **버튼 밖에 알 한 알을 우리 손으로 낳는다.** 태생 상자 자가
       무르게 푼 것이 아님을 못박는 자리다(`verify818` [C1r]): 이 알이 있으면 `out` 은 반드시 ≥1 이다.
       `position:fixed` 라 클라이언트 좌표 그대로 앉고, 애니메이션이 없어 아래 시간 걷기에 안 흔들린다. */
    let injected = 0;
    if (arg.inject) {
      const hb0 = gbox[0], off = Number(arg.inject.dx) || 30;
      const nd = document.createElement('s');
      nd.className = 'fx-spark';
      nd.style.cssText = 'position:fixed;margin:0;width:10px;height:10px;animation:none;'
        + 'left:' + (hb0.right + off) + 'px;top:' + ((hb0.top + hb0.bottom) / 2) + 'px';
      /* ⚠ 이 알은 «밖» 축(`out`)만 보라고 넣은 것이다 — 되돌림 판을 도는 홀드에서는 밀도·덮임 기록값
         (`eggs`·`peak`·`max`)에 이 한 알이 섞인다. 판정에 쓰는 자리는 `out` 하나뿐이라 값이 안 흔들린다. */
      nd.__inj = true; L.appendChild(nd); gens[0].push(nd); injected = 1;
    }
    /* 밀도·수명 값에는 이 알을 안 섞는다 — 되돌림은 «밖» 축 하나만 건드린다 */
    const all = [].concat.apply([], gens).filter(nd => !nd.__inj);
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
    let frames = 0, max = 0, n05 = 0, n25 = 0, out = 0, outNow = 0, peak = 0, sum = 0;
    const rects = [];
    for (let tt = 0; tt <= end + 1e-6; tt += step) {
      const rs = [], rg = [];                          /* 870 — 알마다 «자기 세대» 를 같이 들고 다닌다 */
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
          if (b.width && b.height) { rs.push({ left: b.left, right: b.right, top: b.top, bottom: b.bottom }); rg.push(g); }
        }
      }
      if (!rs.length) continue;
      frames++; sum += rs.length;
      if (rs.length > peak) peak = rs.length;
      const c = cov(ink, rs);
      if (c > max) max = c;
      if (c >= 0.05) n05++;
      if (c >= 0.25) n25++;
      /* ⚑ 870 — 판정 자는 **그 알의 태생 상자**(`gbox[g]`)다. 표본 시각 상자(`hb`)로 잰 값은
         눌림 위상이 정하는 제비뽑기라 **기록으로만** 남긴다(위 머리말 · LESSONS 239-①). */
      const hb = host.getBoundingClientRect();
      let o = 0, oN = 0;
      for (let ri = 0; ri < rs.length; ri++) {
        const e = rs[ri], hg = gbox[rg[ri]] || hb;
        const cx = (e.left + e.right) / 2, cy = (e.top + e.bottom) / 2;
        if (cx < hg.left || cx > hg.right || cy < hg.top || cy > hg.bottom) o++;
        if (cx < hb.left || cx > hb.right || cy < hb.top || cy > hb.bottom) oN++;
      }
      if (o > out) out = o;
      if (oN > outNow) outNow = oN;
      if (rects.length < (arg.rects | 0) && ink)
        rects.push({ ink: { left: ink.left, top: ink.top, width: ink.width, height: ink.height }, eggs: rs });
    }
    const alive = all.filter(nd => nd.isConnected).length;
    guarded = false; Element.prototype.remove = origRemove;
    /* 잡은 세대와 그 사이에 가드가 붙잡아 둔 나머지를 **전부** 걷는다 — 다음 홀드의 첫 표본에 섞이면
       816 의 함정이다(`hold()` 이 «비고 다 지고 시작한다» 로 막는 그 자리). */
    for (const nd of [...L.children]) if (/fx-spark/.test(nd.className + '')) { try { nd.remove(); } catch (_) {} }
    /* 870 — 눌림이 홀드 중 상자를 얼마나 흔들었는가(기록 전용). 이 폭이 곧 옛 자의 제비뽑기 크기다. */
    const sw = k => { const v = gbox.map(b => b[k]); return [Math.min.apply(null, v), Math.max.apply(null, v)]; };
    res({ frames, max, n05, n25, out, outNow, peak, eggs: frames ? sum / frames : 0,
          gens: gens.length, per: gens.length ? all.length / gens.length : 0,
          life, step, tick, alive, rects, injected,
          hbSwing: { left: sw('left'), top: sw('top'), w: sw('w'), h: sw('h') } });
  }
});

module.exports = { COV_RUN, NAIVE_COV };
