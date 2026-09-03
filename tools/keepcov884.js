/* 작업 884 공용 부품 — 「`--burst-keep` 신고가 **가격 잉크의 덮임**을 지우는가」를 재는 자
 *
 *   const { runKeep, GRID, SEED } = require('./keepcov884');
 *   const st = await runKeep('none');      // 816 이전 사본(구멍 0개)
 *   const st = await runKeep(null);        // 제품 선언 그대로
 *
 * `probe816`(재현)과 `verify816`(게이트)이 **같은 자**를 쓴다(402 «두 벌 금지» · `envelope681`·`travel838` 선례).
 *
 * ⚑ **왜 새 자인가**(884) — 옛 자는 «1400ms 홀드를 벽시계로 성기게 훑어 최댓값» 이었다. 그 자에는
 *   판정과 무관한 제비뽑기가 셋 들어 있다:
 *     ⓐ **표본 시각** — `page.evaluate` 왕복이 16ms 요청에 실제 33ms 라 41~45표본뿐이고, 덮임은
 *        연속 곡선이라 봉우리를 «잡느냐 마느냐» 가 운이다.
 *     ⓑ **세대 위상** — 홀드는 380ms 짜리 세대를 겹쳐 낳는데 어느 위상에서 겹치는지가 러너 부하에 달렸다.
 *     ⓒ 난수 — 873 이 지운 그것. **이 자리에서는 ⓒ 를 지워도 진폭이 안 준다**(884 §2 실측:
 *        시드 고정 전 10.0~23.3% · 트리거 직전 재시드까지 해도 10.0~16.8%).
 *   ⇒ 884 는 ⓐⓑ 를 **구조적으로** 없앤다 — 단발 버스트 한 세대를 낳고, 애니를 멈춘 뒤
 *      `currentTime` 을 **감아서** 수명 전 구간을 촘촘히(5ms) 훑는다(`cap681` 규약 · 58 36회차).
 *      난수도 같이 고정한다(873) — 그래야 «같은 그림» 을 재는 것이 된다.
 *
 * ⚠ **위상은 살린 채 잰다**(`currentTime = T` — 지연을 안 눕힌다). 이 자가 묻는 것은 «봉투» 가 아니라
 *   «지금 화면에서 숫자가 가려지는가» 라, 알마다 걸린 음(−) 지연(`FXSPARK_JIT`)이 곧 보여야 할 그림이다
 *   (`envelope681` 의 `SAMPLE` 이 그 반대편 — 봉투를 재려고 지연을 눕힌다. `cap681` 머리말 8회차 주석).
 * ⚠ 잉크 상자는 **트리거 전**(쉼 상태)에 잡는다 — 621 눌림이 누르는 동안 버튼을 왕복시켜
 *   상자로 재면 판정이 제비뽑기가 된다(871 이 [C1] 에서 같은 함정을 지운 자리).
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SEED = 20260902;                 /* travel838·cap681 과 같은 시드 */
/* ⚑ 872·882 교훈 — **한 시드는 제비뽑기 한 번**이다. 자를 결정적으로 만든 대가로 «그 한 판이
   우연히 안 덮이는 판이면?» 이 남으므로, 판정은 **고정 시드 여덟 판**에서 같이 본다.
   목록이 고정이라 값은 여전히 한 자리도 안 흔들린다(진폭 0 · `verify884` [A]). */
const SEEDS = [20260902, 1, 7, 42, 1234, 99991, 20260903, 555555];
const STEP = 5;                        /* 수명 훑는 간격(ms) — 380ms 수명에 77표본 */
const CARD = '#trCards [data-tr]';
const BTN  = CARD + ' .cb';

/* 페이지 안에서 도는 표본기 — 인자는 직렬화되므로 클로저를 안 쓴다. */
const RUN = ({ btnSel, sd, step }) => {
  /* ── 시드 재심기(873) — 트리거 **직전**이라 게임 루프가 앞에서 몇 번 뽑았든 수열 자리가 같다 ── */
  let s = sd >>> 0;
  Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  const el = document.querySelector(btnSel);
  if (!el) return { err: '호스트 없음: ' + btnSel };

  /* ── 잉크 상자는 **트리거 전**(쉼 상태)에 잡는다 ────────────────────────── */
  const inkOf = (host, sel) => {
    const nd = host && host.querySelector(sel); if (!nd) return null;
    let has = false; for (const n of nd.childNodes) if (n.nodeType === 3 && n.textContent.trim()) has = true;
    if (has) { const rg = document.createRange(); rg.selectNodeContents(nd); return rg.getBoundingClientRect(); }
    return nd.getBoundingClientRect();
  };
  const rect = r => r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom,
                          width: r.width, height: r.height } : null;
  const ink = { num: rect(inkOf(el, 'i')), coin: rect(inkOf(el, 's')) };
  const box = rect(el.getBoundingClientRect());

  /* ── 단발 버스트 한 세대 ────────────────────────────────────────────────
     홀드 반복을 안 섞는다(`cap681` 과 같은 규약) — 세대가 겹치는 순간 위상이 제비뽑기가 된다. */
  const oldBye = window.fxBye; window.fxBye = () => {};     /* 애니 끝에 걷히지 않게 잠근다 */
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

  const L = document.getElementById('fxl');
  const nodes = L ? [...L.children].filter(nd => /fx-spark/.test(nd.className + '')) : [];
  if (!nodes.length) { window.fxBye = oldBye; return { err: '알이 안 태어났다', ink, box }; }

  /* 수명 = 알이 신고한 애니 길이(상수를 손으로 안 적는다) */
  const dur = (() => {
    const an = nodes[0].getAnimations()[0];
    const t = an && an.effect && an.effect.getTiming().duration;
    return typeof t === 'number' && t > 0 ? t : 380;
  })();

  const anims = [];
  for (const nd of nodes) for (const a of nd.getAnimations()) { try { a.pause(); anims.push(a); } catch (e) {} }

  /* ── 덮임 = 잉크 상자를 1px 격자로 훑어 «알 하나라도 덮은 칸» 의 비율 ────────
     겹치는 알을 두 번 세지 않는다(옛 자와 **같은 산수** — 자리만 결정적으로 옮겼다). */
  const cov = (ib, eggs) => {
    if (!ib || !ib.width || !ib.height) return 0;
    const x0 = Math.floor(ib.left), y0 = Math.floor(ib.top);
    const w = Math.ceil(ib.width), h = Math.ceil(ib.height);
    let n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x0 + x + 0.5, py = y0 + y + 0.5;
      for (const e of eggs) if (px > e.left && px < e.right && py > e.top && py < e.bottom) { n++; break; }
    }
    return n / (w * h);
  };

  const rows = [];
  for (let T = 0; T <= dur; T += step) {
    for (const a of anims) { try { a.currentTime = T; } catch (e) {} }
    const eggs = [];
    for (const nd of nodes) {
      const b = nd.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) eggs.push(b);
    }
    rows.push({ T, n: eggs.length, num: cov(ink.num, eggs), coin: cov(ink.coin, eggs) });
  }

  for (const a of anims) { try { a.cancel(); } catch (e) {} }   /* 페이지를 망가뜨린 채 끝내지 않는다 */
  for (const nd of nodes) nd.remove();
  window.fxBye = oldBye;
  return { dur, eggs: nodes.length, ink, box, rows };
};

function digest(r, key) {
  const v = r.rows.map(x => x[key]);
  const n05 = r.rows.filter(x => x[key] >= 0.05).length;
  const n25 = r.rows.filter(x => x[key] >= 0.25).length;
  return { max: Math.max(0, ...v), n05, n25,
           pct05: n05 / r.rows.length, pct25: n25 / r.rows.length };
}

/* 한 판 = «페이지를 새로 열고 → 신고를 `keep` 으로 놓고 → 단발 버스트 한 세대를 결정적으로 훑는다».
 *   keep: 'none'(816 이전 사본) · 'i'·'s,i' 등 주입값 · null(제품 선언 그대로)
 *   opts.src   되돌림 사본 경로(기본 ../index.html)
 *   opts.seed  기본 SEED
 *   opts.step  기본 STEP(ms)
 */
async function runKeep(keep, opts) {
  const o = opts || {};
  const seed = (o.seed === undefined ? SEED : o.seed) >>> 0;
  const step = o.step || STEP;
  const URL = 'file://' + path.resolve(o.src || path.join(__dirname, '../index.html')).replace(/\\/g, '/');
  const b = await launch(chromium);
  const errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + String(e.message || e)));
    await page.addInitScript((sd) => {
      try { localStorage.clear(); } catch (e) {}
      let s = sd >>> 0;
      Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }, seed);
    await page.goto(URL);
    await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
      if (S.temper) S.temper.pts = 1e6;
      const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';  /* 전투 캔버스 제외 */
      openTrain();
    });
    await page.waitForTimeout(400);
    await page.evaluate(({ sel, v }) => {
      for (const c of document.querySelectorAll(sel))
        if (v === null) c.style.removeProperty('--burst-keep'); else c.style.setProperty('--burst-keep', v);
    }, { sel: BTN, v: keep === undefined ? null : keep });
    /* 앞 판의 알이 남아 있으면 첫 표본에 섞인다 — 비고 다 지고 시작한다 */
    await page.waitForFunction(() => {
      const L = document.getElementById('fxl');
      return !L || ![...L.children].some(nd => /fx-spark/.test(nd.className + ''));
    }, null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(120);

    const r = await page.evaluate(RUN, { btnSel: BTN, sd: seed, step });
    if (!r || r.err) return { err: (r && r.err) || '표본 없음', errs };
    const num = digest(r, 'num'), coin = digest(r, 'coin');
    return { keep: keep === null || keep === undefined ? '(제품 선언)' : keep,
             dur: r.dur, eggs: r.eggs, frames: r.rows.length, ink: r.ink, box: r.box,
             rows: r.rows, num, coin, errs };
  } finally { await b.close(); }
}

/* 표본 열(`rows`)을 **성긴 격자**로 다시 읽는다 — `step` ms 간격 · 위상 `offset`.
 * 873 의 `burn` 과 같은 «자 자신의 결함을 재는 손잡이» 다(제품과 무관): 옛 자가 왜 흔들렸는지를
 * 반복 실행이 아니라 **결정적으로** 보인다(`probe884` [3]·[4] · `verify884` [R]).
 * ⚠ `runKeep(..., {step:1})` 로 뜬 1ms 표본에서만 뜻이 있다(성긴 열을 더 성기게 읽으면 칸이 빈다). */
function grid(rows, step, offset) {
  const r = rows.filter(x => x.T % step === (offset % step));
  const v = r.map(x => x.num);
  return { n: r.length, max: v.length ? Math.max(...v) : 0,
           n05: r.filter(x => x.num >= 0.05).length, n25: r.filter(x => x.num >= 0.25).length };
}

/* 고정 시드 여덟 판을 같은 자로 굴려 «판마다» 와 «판을 가로지른» 값을 낸다.
 * 판정은 **최솟값**으로 한다 — «어느 판에서도 덮인다» 가 물어야 할 문장이기 때문이다
 * (평균은 한 판이 0 이어도 초록이 될 수 있다). */
async function sweep(keep, opts) {
  const o = opts || {};
  const seeds = o.seeds || SEEDS;
  const per = [];
  for (const sd of seeds) {
    const st = await runKeep(keep, Object.assign({}, o, { seed: sd }));
    if (st.err) return { err: st.err + ' (시드 ' + sd + ')', per };
    st.seed = sd; per.push(st);
  }
  const mx = per.map(s => s.num.max), n5 = per.map(s => s.num.n05);
  const cmx = per.map(s => s.coin.max);
  return {
    keep: per[0].keep, per, seeds,
    frames: per[0].frames, eggs: per[0].eggs,
    covered: per.filter(s => s.num.max > 0).length,      /* 숫자가 조금이라도 덮인 판의 수 */
    maxMin: Math.min(...mx), maxMax: Math.max(...mx),
    n05Min: Math.min(...n5), n05Max: Math.max(...n5),
    coinMin: Math.min(...cmx), coinMax: Math.max(...cmx),
    errs: per.reduce((a, s) => a.concat(s.errs || []), [])
  };
}

module.exports = { runKeep, sweep, grid, digest, SEED, SEEDS, STEP, CARD, BTN };
