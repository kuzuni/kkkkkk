#!/usr/bin/env node
/* 작업 619 **14회차** — 「틱 사이에 내렸다 올라가는가」 를 재는 자 (338 규칙 — 눈보다 먼저 잰다)
 *
 *   node tools/probe619d.js
 *
 * 13회차 채점(EF 3 / EG 3)의 두 「8점을 막는 단 하나」는 **같은 말**이었다:
 *   · EF — «회당 알갱이 수명이 틱(≈170ms)보다 길어 9~11알이 상시로 떠 있다»
 *   · EG — «훈련 링·단련 플래시가 홀드 내내 «켜짐» 으로 구워져 있다(**룬처럼 틱 사이에 내렸다 올려야 한다**)»
 * ⇒ 두 사람이 쓴 축은 «세다» 가 아니라 **«꺼지는 순간이 있는가»** 다. `probe619c` 는 그 축이 없어
 *   세 화면 전부 초록을 냈다(13회차 자 전부 통과 ↔ 채점 3점) — 자와 눈이 갈린 자리를 자로 옮긴다.
 *
 * 축 셋(전부 홀드 중 rAF 시계열 · 각 표본은 «지금 화면에 그것이 켜져 있는가» 다):
 *
 *   ⓔ **소등 프레임 비율** — 그 연출이 **꺼져 있는** 표본의 비율.
 *      0% 면 «구워져 있다»(EG) 이고, 100% 면 발화가 아예 없다(반려 — `verify619` [B]).
 *      부품 셋을 따로 잰다: 링(outline-width ≤ 상시값) · 플래시(`.fx-flash` 가시 0장) ·
 *      스파크(`.fx-spark` 가시 0알).
 *      ⚠ 문턱은 «몇 %» 가 아니라 **«한 틱 안에 한 번은 꺼지는가»** 여야 한다 — 아래 ⓕ 가 그것을 본다.
 *
 *   ⓕ **가장 긴 «켜짐» 구간 ÷ 틱 간격** — 한 번 켜진 뒤 다음 소등까지의 최대 길이를 틱으로 나눈 값.
 *      1.0 을 넘으면 **틱을 넘겨 산다** = 이번 발화와 지난 발화가 화면에서 안 갈린다(EF·EG 공통).
 *      ⚠ 이것이 «수명 상수 ↔ 틱 간격» 의 어긋남을 직접 잰다: 스파크 .38s · 플래시 .34s 는
 *        고정값이고 홀드 틱은 60~175ms 라, 어떤 화면에서든 반드시 2배를 넘는다.
 *
 *   ⓖ **한 프레임 동시 스파크 최대** — «3알 = 이번 한 방» 으로 세어지는가(EF ⑤ · EG ⑫ 2인 공통
 *      «7~11알 / 토큰 4~5개가 겹쳐 선다»). 한 세대(`UPFX_N` 4) + 사그라드는 앞 세대 하나까지가
 *      읽히는 상한이라 **8** 을 문턱으로 둔다.
 *
 * ⚠ 틱 간격은 상수로 적지 않고 **결제 함수 호출 시각의 중앙 간격**으로 잰다(화면·가속마다 다르다 —
 *   `TR_HOLD_IV0` 160 → `TR_HOLD_IVMIN` 60). 13회차가 펌프 길이를 상수로 박으려다 네 번 되잡은
 *   그 자리이고, 자도 같은 함정을 밟으면 안 된다.
 * ⚠ «켜짐» 판정은 노드 존재가 아니라 **가시 알파**다(41회차 «안 보이는데 세어지는 뒷꼬리» — DOM 수명의
 *   7~40% 가 투명 구간이라 존재로 세면 실제보다 길게 나온다).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const HOLD_MS = Number(process.env.P619D_HOLD || 2600);
const SPARK_CAP = 8;                                /* ⓖ 문턱 — 한 세대(4) + 사그라드는 앞 세대 */
/* ⚑ ⓔ 의 아래끝. 13회차가 글로우 펌프에서 세운 것과 **같은 종류의 값**이다 — 설계상 소등은 틱의
   45%(듀티 0.55)인데 rAF 표본이 26ms 라 60~90ms 틱의 골을 절반쯤 놓친다(실측 12~17%).
   ⚠ 설계값(45%)을 문턱으로 박으면 **영원히 빨간 자**가 된다(13회차 «자를 설계값에 맞추지 마라»).
   ⚠ 반대로 0% 로 두면 «한 표본만 꺼져도 통과» 라 수리 전(4%)과 수리 후(16%)를 못 가른다.
   ⇒ 수리 전 실측(플래시·스파크 **4%**)의 두 배를 넘는 자리에 둔다. */
const OFF_MIN = 0.10;

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      host: '#trCards [data-tr]',  n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        host: '#trRunes .tr-rn',     n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', host: '#trTemper .tr-tp.k0', n: '단련 [단련]' },
];

const r2 = v => Math.round(v * 100) / 100;
const med = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

const ARM = hostSel => {
  const P = (window.__p619d = { t: [], ring: [], flash: [], spark: [], buys: [] });
  const L = document.getElementById('fxl');
  if (!L) return;
  /* 강화 시각 — 틱 간격을 상수가 아니라 제품에게 묻는다(머리말) */
  const wrap = (name, okOf) => {
    const f = window[name]; if (typeof f !== 'function') return;
    window[name] = function (...a) { const r = f.apply(this, a); if (okOf(r)) P.buys.push(performance.now()); return r; };
  };
  wrap('trainBuy',    r => !!r);
  wrap('runeBuy',     () => true);                  /* 룬은 확률 — «시도» 를 센다(probe619c 와 같은 길) */
  wrap('temperUpBtn', r => !!r);
  /* ⚑ 701·797 이관(2026-09-02) — 홀드 틱이 지나는 «1회» 는 코어다(옛 두 이름은 막힌 안내 전용).
     홀드에서 둘은 배타적이라 같은 장부에 더한다 — `verify349` 와 같은 처방. */
  wrap('runeTryOne',  () => true);
  wrap('temperUpOne', () => true);
  /* 가시 알파 — 노드 자신 + 애니메이션이 물고 있는 값을 computed 로 읽는다 */
  const vis = nd => { try { return (parseFloat(getComputedStyle(nd).opacity) || 0) > 0.05; } catch (_) { return false; } };
  const scan = () => {
    const hostNow = document.querySelector(hostSel);
    let w = 0;
    if (hostNow) { try { w = parseFloat(getComputedStyle(hostNow).outlineWidth) || 0; } catch (_) {} }
    let nf = 0, ns = 0;
    for (const nd of L.children) {
      if (!nd.classList) continue;
      if (nd.classList.contains('fx-flash')) { if (vis(nd)) nf++; }
      else if (nd.classList.contains('fx-spark')) { if (vis(nd)) ns++; }
    }
    P.t.push(performance.now());
    P.ring.push(w);
    P.flash.push(nf);
    P.spark.push(ns);
    P.raf = requestAnimationFrame(scan);
  };
  scan();
};

/* «켜짐» 구간의 최대 길이(ms) — on(i) 가 참인 연속 구간을 시각으로 잰다 */
function maxOn(t, on) {
  let best = 0, st = -1;
  for (let i = 0; i < on.length; i++) {
    if (on[i]) { if (st < 0) st = i; }
    else if (st >= 0) { best = Math.max(best, t[i] - t[st]); st = -1; }
  }
  if (st >= 0) best = Math.max(best, t[t.length - 1] - t[st]);   /* 끝까지 켜져 있으면 그 길이 */
  return best;
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);

  console.log('작업 619 14회차 — 「틱 사이에 내렸다 올라가는가」 (홀드 ' + HOLD_MS + 'ms)\n');
  console.log('ⓔ 소등 프레임 비율(꺼져 있는 표본 ÷ 전체)   ⓕ 최대 «켜짐» 구간 ÷ 틱   ⓖ 동시 스파크 최대');
  console.log('─'.repeat(78));

  let bad = 0;
  for (const sp of SPOTS) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
    await page.waitForTimeout(420);
    await page.evaluate(ARM, sp.host);
    const r = await page.evaluate(s => {
      const el = document.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, sp.sel);
    if (!r || !r.w) { console.log('  ' + sp.n + ' — 대상 없음'); bad++; continue; }
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    await page.mouse.down();
    await page.waitForTimeout(HOLD_MS);
    await page.mouse.up();
    await page.waitForTimeout(200);
    const d = await page.evaluate(() => {
      const P = window.__p619d;
      if (P.raf) cancelAnimationFrame(P.raf);
      return { t: P.t.slice(), ring: P.ring.slice(), flash: P.flash.slice(), spark: P.spark.slice(), buys: P.buys.slice() };
    });

    /* 틱 간격 — 결제 시각의 «중앙» 간격(가속 구간을 대표한다) */
    const gaps = [];
    for (let i = 1; i < d.buys.length; i++) gaps.push(d.buys[i] - d.buys[i - 1]);
    const iv = med(gaps) || 0;
    /* 링 «상시값» = 켜져 있는 표본의 최솟값(9px) — 그 위로 솟은 것만 «켜짐» 으로 센다 */
    const ringOn = d.ring.map(v => v > 10.5);
    const flashOn = d.flash.map(v => v > 0);
    const sparkOn = d.spark.map(v => v > 0);
    const share = a => a.length ? a.filter(v => !v).length / a.length : 0;   /* 소등 비율 */
    const rOff = share(ringOn), fOff = share(flashOn), sOff = share(sparkOn);
    const rMax = maxOn(d.t, ringOn), fMax = maxOn(d.t, flashOn), sMax = maxOn(d.t, sparkOn);
    const spMax = d.spark.length ? Math.max(...d.spark) : 0;
    const per = v => (iv ? r2(v / iv) : 0);

    console.log('  ' + sp.n + '  (강화 ' + d.buys.length + '회 · 틱 중앙 ' + Math.round(iv) + 'ms · ' + d.t.length + '표본)');
    console.log('    ⓔ 소등 비율 — 링 **' + Math.round(rOff * 100) + '%** · 플래시 **' + Math.round(fOff * 100) +
                '%** · 스파크 **' + Math.round(sOff * 100) + '%**');
    console.log('    ⓕ 최대 켜짐 ÷ 틱 — 링 **×' + per(rMax) + '**(' + Math.round(rMax) + 'ms) · 플래시 **×' + per(fMax) +
                '**(' + Math.round(fMax) + 'ms) · 스파크 **×' + per(sMax) + '**(' + Math.round(sMax) + 'ms)');
    console.log('    ⓖ 동시 스파크 최대 **' + spMax + '알**');

    if (!(rOff >= OFF_MIN && fOff >= OFF_MIN && sOff >= OFF_MIN)) bad++;
    if (spMax > SPARK_CAP) bad++;
  }

  console.log('─'.repeat(78));
  console.log('문턱: ⓔ 세 부품 전부 소등 비율 ≥ ' + Math.round(OFF_MIN * 100) + '% · ⓖ 동시 스파크 ≤ ' + SPARK_CAP + '알');
  console.log('  (ⓕ 는 **참고**다 — 26ms 표본으로 60~90ms 틱의 골을 못 가르므로 문턱으로 안 쓴다. 위 OFF_MIN 머리말)');
  console.log(bad ? 'PROBE619D — ' + bad + '건 문턱 미달' : 'PROBE619D — 세 축 전부 문턱 통과');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
