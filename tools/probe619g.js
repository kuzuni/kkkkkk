#!/usr/bin/env node
/* 작업 619 **17회차** — 16회차가 남긴 1·2순위를 **실좌표**로 재는 자 (338 · 350 규칙)
 *
 *   node tools/probe619g.js
 *
 * 16회차 채점(EL 3 / EM 2)은 자 넷이 전부 초록인데 점수가 15회차(EJ 6 / EK 3)보다 내려갔다.
 * 두 비평가의 「단 하나」가 **같은 뿌리**를 가리켰고(EL «플래시 하드 에지가 호스트 «안» 콘텐츠
 * 위에 떨어진다» · EM «링·워시가 행 콘텐츠보다 위 레이어»), 16회차가 배지 패치를 만들며
 * **호스트가 틱마다 최대 25.5px 움직인다**는 것을 처음 쟀다. 그런데 `fxFlash` 는 만들 때
 * 호스트 rect 로 **한 번 찍고 끝**이다 — 이 자는 그 «어긋남» 이 실재하는지부터 묻는다.
 *
 * 축 둘:
 *
 *   ⓜ **회당 플래시 ↔ 호스트 어긋남**(17회차 1순위).
 *      살아 있는 `.fx-flash` 의 상자 중심과 **그 순간** 호스트 중심의 거리를 홀드 내내 rAF 로 잰다.
 *      `pin()` 은 상자를 사방으로 **대칭**으로 들이므로(좌우·상하 같은 값) **중심은 안 움직인다**
 *      — 즉 이 거리는 «따라가는가» 만 재는 깨끗한 축이고, 따라가면 0 이다.
 *      ⚠ `@keyframes fxFlash` 의 `scale(1.06)` 은 transform 이라 `getBoundingClientRect` 에
 *        반영된다. 그런데 그것도 **중심 대칭 확대**라 중심은 그대로다 — 그래서 «폭» 이 아니라
 *        **중심**을 축으로 골랐다(폭으로 재면 애니 위상이 잡음으로 섞인다).
 *      ⚠ 호스트 rect 는 매 프레임 **다시** 읽는다 — 621 이 틱마다 카드를 눌렀다 폈다 하므로
 *        스폰 시각의 rect 로 재면 어긋남이 통째로 안 보인다(그것이 16회차가 놓친 자리다).
 *
 *   ⓝ **룬 알갱이가 호스트 상변 위로 얼마나 나가나**(17회차 2순위 · **2인 공통 신규**).
 *      EL «패널 액자보다 49px 위 · 탭 버튼 위 715px» · EM «57px 위 · 582px».
 *      probe619f ⓙ 와 **같은 축·같은 산수**인데 화면만 룬이다 — 16회차가 단련에 건 클램프를
 *      룬은 **안 탄다**(룬은 호스트 밖 화폐 아이콘이 없어 `fxSpendFrom` 의 ③ 폴백으로 간다).
 *      ⚠ ⓙ 와 같이 **잉크**로 잰다(상자는 잉크보다 6.2% 크다 — `FX3_GINK` ÷ 상자 = 0.938).
 *      ⚠ 기준은 **누르기 전 정적 상변**이다(probe619f 규약) — 살아 있는 rect 로 재면 621 눌림
 *        왕복이 «스프라이트가 올라갔다» 로 둔갑한다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const HOLD_MS = Number(process.env.P619G_HOLD || 2600);
const INK_RATIO = 0.938;                             /* probe619f 와 같은 값(FX3_GINK ÷ 상자) */

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      host: '#trCards [data-tr]',  n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        host: '#trRunes .tr-rn',     n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', host: '#trTemper .tr-tp.k0', n: '단련 [단련]' },
];

const r2 = v => Math.round(v * 100) / 100;

const WATCH = (page, hostSel, ms, inkRatio, hostTop0) => page.evaluate(([hostSel, ms, INK_RATIO, TOP0]) => new Promise(res => {
  const host = document.querySelector(hostSel);
  const L = document.getElementById('fxl');
  const out = { fxN: 0, fxSum: 0, fxMax: 0, fxFrames: 0, frames: 0,
                szSum: 0, szMax: 0, fxN2: 0, fxMax2: 0,
                spdRise: 0, spdInk: 0, spdN: 0, spdInkLive: 0 };
  if (!host) return res(out);
  const t0 = performance.now();
  const rect = el => el.getBoundingClientRect();
  /* ⚠⚠ **rAF 등록 순서가 축을 흔든다 — 16회차 ⑶ⓒ 가 이미 밟은 함정이다.**
     추적(`follow`)과 이 자(`tick`)는 **같은 프레임의 rAF 큐**에 있고 순서는 등록 순이다.
     자가 먼저면 상자는 아직 **직전 프레임**의 호스트 자리이고, 추적이 먼저면 이번 프레임 자리다
     — 브라우저는 rAF 를 **다 돌린 뒤** 합성하므로 **실제로 찍히는 프레임에서는 둘이 같다**.
     1차 시도가 이것을 안 갈라 단련 0.02px · 훈련 8.02px 로 화면마다 딴 답을 냈다(둘 다 추적은 켜져
     있었다). ⇒ 축을 «이번 프레임 **또는** 직전 프레임의 호스트와 맞는가» 로 세운다 — 한 프레임
     안에 있으면 합성 시점엔 일치다. 추적이 꺼져 있으면 **둘 다** 어긋나므로 헛초록이 아니다
     (수리 전 값이 그 음성 대조다: 훈련 8.02 · 룬 11.59 · 단련 6.01 이 홀드 내내 유지). */
  const prev = new Map(), seen = new WeakSet();
  const tick = () => {
    const hb = rect(host);                       /* ⚠ 매 프레임 다시 읽는다 — 621 왕복이 여기 산다 */
    out.frames++;
    if (L) {
      /* ⓜ — 플래시 중심 ↔ **자기 호스트** 중심 거리.
         ⚠ 호스트는 화면마다 다른 노드다(룬은 `.rd` 몸통, 훈련은 카드) — 그래서 셀렉터가 아니라
           그 장이 스스로 들고 있는 `__fxHost` 에게 묻는다. 1차 시도는 셀렉터로 걸러 룬이
           **표본 0** 이 됐다(헛초록의 반대 = 헛빨강). */
      let hit = 0;
      for (const nd of L.querySelectorAll('.fx-flash')) {
        const b = rect(nd); if (!b.width) continue;
        const hostEl = nd.__fxHost;
        if (!hostEl || !hostEl.isConnected) continue;
        if (hostEl !== host && !host.contains(hostEl) && !hostEl.contains(host)) continue;
        const g = rect(hostEl); if (!g.width) continue;
        const p = prev.get(hostEl) || g;                  /* 직전 프레임의 같은 호스트 */
        const gap = q => Math.hypot((b.left + b.right) / 2 - (q.left + q.right) / 2,
                                    (b.top + b.bottom) / 2 - (q.top + q.bottom) / 2);
        const d = Math.min(gap(g), gap(p));               /* 한 프레임 안이면 합성 시점엔 일치 */
        /* 크기 어긋남 — 상자는 스폰 시각의 w·h 로 굳어 있고 호스트는 621 로 틱마다 커졌다 작아진다.
           ⚠ **바닥이 0 이 아니다** — `@keyframes fxFlash` 가 상자를 `scale(1.06)` 까지 부풀리는 것은
             **의도한 연출**이고 `getBoundingClientRect` 는 그 transform 을 반영한다. 즉 이 값은
             추적이 완벽해도 봉우리에서 `FXFLASH_PEAK − 1` = **6%** 까지 뜬다. 그래서 이 축은
             기록만 하고 판정에 안 쓴다(문턱을 6% 아래로 두면 영원히 빨간 자가 된다). */
        const szOf = q => Math.max(Math.abs(b.width / q.width - 1), Math.abs(b.height / q.height - 1));
        const sz = Math.min(szOf(g), szOf(p));
        out.fxN++; out.fxSum += d; if (d > out.fxMax) out.fxMax = d;
        out.szSum += sz; if (sz > out.szMax) out.szMax = sz;
        /* ⚠ **스폰 프레임을 갈라 센다.** 그 프레임에는 `follow` 가 아직 한 번도 안 돌았으므로
           상자는 `fxFlash` 머리에서 읽은 rect 그대로다 — 추적의 품질이 아니라 «스폰 시각의
           정확도» 를 재는 자리다. 둘을 섞으면 한 프레임짜리 값이 최악값을 통째로 지배한다. */
        if (seen.has(nd)) { out.fxN2++; if (d > out.fxMax2) out.fxMax2 = d; }
        else seen.add(nd);
        hit = 1;
      }
      out.fxFrames += hit;
      /* 다음 프레임이 «직전» 으로 쓸 값 — 호스트별로 따로 둔다(화면마다 노드가 다르다) */
      for (const nd of L.querySelectorAll('.fx-flash')) {
        const hostEl = nd.__fxHost;
        if (hostEl && hostEl.isConnected) prev.set(hostEl, rect(hostEl));
      }
      /* ⓝ — 알갱이 잉크가 호스트 상변 위로 나간 양(최댓값) */
      for (const nd of L.querySelectorAll('.fx-spd')) {
        const b = rect(nd); if (!b.width) continue;
        out.spdN++;
        const inkPad = b.height * (1 - INK_RATIO) / 2;
        /* 기준선 둘 중 «덜 나간» 쪽 — 호스트가 621 왕복·488 맥박으로 정적선 위아래를 오가므로
           한 기준만 쓰면 호스트의 움직임이 알갱이의 침범으로 둔갑한다(verify619 [L5] 머리말). */
        const rise = Math.min((TOP0 != null ? TOP0 : hb.top) - b.top, hb.top - b.top);
        if (rise > out.spdRise) out.spdRise = rise;
        if (rise - inkPad > out.spdInk) out.spdInk = rise - inkPad;
        /* ⚠ **기준선을 둘 다 찍는다.** 위 값은 «누르기 전 정적 상변»(probe619f 규약) 기준이라
           621 눌림 왕복으로 호스트가 그 선 위로 올라간 프레임에서는 알갱이가 가만히 있어도
           «나갔다» 로 읽힌다. 아래는 **그 순간의 살아 있는 상변** 기준 — 둘의 차가 곧 호스트
           흔들림 몫이라, 잔차가 알갱이 것인지 호스트 것인지를 이 두 값이 갈라 준다. */
        const riseL = hb.top - b.top;
        if (riseL - inkPad > out.spdInkLive) out.spdInkLive = riseL - inkPad;
      }
    }
    if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res(out);
  };
  requestAnimationFrame(tick);
}), [hostSel, ms, inkRatio, hostTop0]);

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

  console.log('작업 619 17회차 — 16회차 1·2순위 (홀드 ' + HOLD_MS + 'ms)\n');
  console.log('ⓜ 회당 플래시 ↔ 호스트 어긋남 · ⓝ 룬 알갱이 상변 이탈');
  console.log('─'.repeat(78));

  const R = {};
  for (const sp of SPOTS) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
    await page.waitForTimeout(420);
    const tb = await page.evaluate(s => {
      const el = document.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, sp.sel);
    if (!tb) { console.log('  ' + sp.n + ' — 대상 없음'); continue; }
    const top0 = await page.evaluate(s => { const e = document.querySelector(s);
      return e ? e.getBoundingClientRect().top : null; }, sp.host);
    await page.mouse.move(tb.x + tb.w / 2, tb.y + tb.h / 2);
    await page.mouse.down();
    const o = await WATCH(page, sp.host, HOLD_MS, INK_RATIO, top0);
    await page.mouse.up();
    await page.waitForTimeout(500);
    R[sp.id] = o;

    const avg = o.fxN ? o.fxSum / o.fxN : 0;
    console.log('  ' + sp.n);
    const szAvg = o.fxN ? o.szSum / o.fxN : 0;
    console.log('    ⓜ 플래시 중심 어긋남 — 평균 **' + r2(avg) + 'px** · 최악 **' + r2(o.fxMax) + 'px**'
              + '  (표본 ' + o.fxN + ' · 플래시가 뜬 프레임 ' + o.fxFrames + '/' + o.frames + ')');
    console.log('       ↳ 스폰 프레임 제외 — 최악 **' + r2(o.fxMax2) + 'px** (표본 ' + o.fxN2 + ')');
    console.log('       크기 어긋남 — 평균 **' + r2(szAvg * 100) + '%** · 최악 **' + r2(o.szMax * 100) + '%**');
    if (sp.id === 'rune') {
      console.log('    ⓝ 알갱이 **잉크**가 행 상변 위로 **' + r2(Math.max(0, o.spdInk)) + 'px**'
                + '  (상자 기준 ' + r2(Math.max(0, o.spdRise)) + 'px · 표본 ' + o.spdN
                + ' · EL 49px / EM 57px)');
      console.log('       ↳ 살아 있는 상변 기준 잉크 **' + r2(Math.max(0, o.spdInkLive)) + 'px**'
                + '  (정적 기준과의 차 = 621 호스트 흔들림 몫)');
    }
  }

  console.log('─'.repeat(78));
  /* 문턱 — 「따라간다」 는 0 에 가까워야 한다. 봉우리 위상 잡음을 감안해 2px. */
  let bad = 0;
  const say = (k, ok, s) => { console.log('  ' + (ok ? '✓' : '✗') + ' ' + k + ' ' + s); if (!ok) bad++; };
  for (const sp of SPOTS) {
    const o = R[sp.id]; if (!o) { bad++; continue; }
    say('ⓜ', o.fxN2 > 0 && o.fxMax2 <= 2, sp.n + ' — 플래시가 호스트를 따라간다(스폰 프레임 제외 최악 ≤2px · 표본 ' + o.fxN2 + ')');
  }
  /* ⚠ ⓝ 은 **판정에 안 쓴다 — 아직 안 닫힌 자리라서다.** 17회차가 ② 와 같은 클램프를 ③ 에
     걸어 봤고(잉크 이탈 25~44px → 0px), 그 대가로 룬 출발이 **도착 타일 «안»** 으로 들어가
     비행이 107 → 57px 이 됐다(`verify583` [D-rune-0] 이 빨개진다). 되돌렸고, 고르는 것은
     18회차의 설계 판단이다. 그때까지 이 축은 **재기만** 한다 — 통과로 세면 «해결됨» 으로 읽힌다. */
  const rn = R.rune;
  console.log('  · ⓝ 룬 알갱이 잉크 상변 이탈 **' + r2(Math.max(0, rn ? rn.spdInk : 0))
            + 'px** (참고 — 판정 제외 · EL 49 / EM 57 · 18회차 몫)');
  console.log(bad ? 'PROBE619G — ' + bad + '건 문턱 미달' : 'PROBE619G — 추적 축(ⓜ) 세 화면 전부 문턱 통과');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
