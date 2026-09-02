#!/usr/bin/env node
/* 작업 619 **13회차** — 이번 회차 처방 세 건을 «수치» 로 재는 자 (338 규칙 — 눈보다 먼저 잰다)
 *
 *   node tools/probe619c.js
 *
 * 12회차가 남긴 인계문의 세 갈래를 그대로 축으로 세운다.
 *
 *   ⓐ **스파크 잉크 스필**(ED ③ · EE ④⑩ «호스트 밖 13~20px» ↔ 12회차 자 «bbox 기준 0px») —
 *      두 사람이 잰 것은 «입자 중심» 이 아니라 **보이는 액자 밖으로 나온 잉크**다. 그래서 이 자는
 *      중심이 아니라 **찍힌 사각형**(getBoundingClientRect)을 호스트 bbox 에 대고, 사방 중 가장 많이
 *      나간 양을 적는다(350 «찍힌 픽셀» 규칙). 13회차 처방(`inM` = 가둠 상자를 sz/2 안으로)이 들었으면
 *      **최대 스필이 0** 이 된다.
 *
 *   ⓑ **홀드 글로우 틱 펌프**(ED·EE 2인 공통 「8점을 막는 단 하나」의 처방 축 — EB ②) —
 *      «훈련 회당 신호가 수치 없이 새 사건으로 읽히는가» 를 호스트 `outline-width` 의 시계열로 잰다.
 *      ⚠⚠ **«봉우리 수 ÷ 강화 수 = 1.00» 은 이 화면에서 «잴 수 없는 자» 다** — 13회차가 그것부터
 *        확인했다. 홀드 틱은 `TR_HOLD_ACCEL` 로 **60ms 까지 빨라지는데**(TR_HOLD_IVMIN) 60ms 는
 *        60fps 에서 **3.6 프레임**이다. 봉우리와 골이 각각 최소 2프레임은 실려야 세지는데 3.6 프레임
 *        안에 둘 다 넣을 수 없다 ⇒ 어떤 처방을 해도 그 비는 0.3~0.8 사이에서 표본 오차로 흔들린다
 *        (13회차 실측: 듀티 0.92 에서 0.48~0.79 · 0.62 에서 0.30~0.39 — **처방의 좋고 나쁨이 아니라
 *        샘플러의 한계**다). ⇒ 자를 «사건 수» 가 아니라 **«두 상태를 오가는가»** 로 바꿔 세운다:
 *        ⑴ 봉우리가 실제로 서는가(최대 = 17px) ⑵ 바닥이 그대로인가(상시 = 9px — 9회차가 올려 둔 값을
 *        되내리지 않았다는 증거) ⑶ **봉우리가 실린 프레임 비율이 중간대(12~70%)** 인가(= 상시 켜짐도
 *        아니고 한 프레임 스침도 아니다). 봉우리 구간 수는 참고로만 적는다.
 *      ⚠ 아래끝이 12% 인 것은 **실측이 설계값과 다르기 때문**이다(자를 설계값에 맞추면 영원히 빨갛다):
 *        설계상 봉우리는 틱의 44%(사이클 0.80 × 봉우리 몫 0.55)인데 프레임에 실리는 것은 **16~29%**
 *        이고 실행마다 흔들린다. 뿌리는 홀드 중 **통짜 렌더가 호스트 노드를 갈면 그 위에서 돌던 펌프가
 *        노드째 사라진다**는 것이다(다음 틱이 새 노드에 다시 단다 — 619 8회차가 `fxHoldMark` 를 틱마다
 *        부르는 그 이유). 그림에서는 «봉우리가 한 틱 걸러 실린다» 로 나타난다.
 *        ⚠ 20% 로 박으면 **같은 트리에서 통과·미달이 갈리는 플레이키 문턱**이 된다(13회차 실측
 *          16·19·22·25·29% — 635 가 등재한 «확률 축에 절대 문턱» 과 같은 병이다).
 *      ⚠ 수치(«+N»/«−N»)는 세지 않는다 — 583·`verify488` [F3] 이 금지한 축이다(12회차 인계문).
 *
 *   ⓒ **줄기를 넘는 플로터 최소거리**(ED ⑧ · EE ⑦ «룬 «−13» 두 장이 5~10px») —
 *      11회차 가드는 «같은 줄기» 만 봐서 룬의 두 띠(`--hb-y:248` / `--hb-y2:224` = 24px)를 못 봤다.
 *      이 자는 **서로 다른 줄기**의 동시 생존 쌍 중 세로가 글리프 높이(34) 안인 것만 골라 Δx 최솟값을
 *      적는다 — 세로로 충분히 갈린 호스트(단련 96px · 훈련 70px)는 애초에 표본이 안 잡힌다.
 *
 * 수리 전·후 비교는 호출자 몫이다(`git stash`) — 이 자는 «지금 트리» 만 잰다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const HOLD_MS = Number(process.env.P619C_HOLD || 2600);
const INK_H = 34;                                   /* index.html `HB_INK_H` 와 같은 값(글리프 토큰) */

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      host: '#trCards [data-tr]',  n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        host: '#trRunes .tr-rn',     n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', host: '#trTemper .tr-tp.k0', n: '단련 [단련]' },
];

const r2 = v => Math.round(v * 100) / 100;
const med = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

/* 홀드 동안 매 프레임 훑는 관찰자 — 함수를 감싸지 않고 **찍힌 노드**만 본다 */
const ARM = hostSel => {
  const P = (window.__p619c = { spill: [], pumps: [], ow: [], edge: [], cross: [], buys: 0 });
  const L = document.getElementById('fxl');
  const host = document.querySelector(hostSel);
  if (!L || !host) return;
  const seen = new WeakSet();
  const rr = v => Math.round(v * 100) / 100;         /* 페이지 안에는 노드 쪽 헬퍼가 없다 */
  let prevW = null;
  /* ⓑ 강화 횟수는 **결제 함수**를 감싸 센다(`probe619` ⓐ 와 같은 길) — 상태 키를 손으로 적으면
     세 화면이 서로 다른 자리에 값을 두어 «강화 0회» 로 읽힌다(13회차 1차 시도가 그랬다). */
  const wrap = (name, okOf) => {
    const f = window[name]; if (typeof f !== 'function') return;
    window[name] = function (...a) { const r = f.apply(this, a); if (okOf(r)) P.buys++; return r; };
  };
  wrap('trainBuy',    r => !!r);
  wrap('runeBuy',     () => true);                   /* 룬은 확률이라 «시도» 를 센다(실패 틱도 발화 대상) */
  wrap('temperUpBtn', r => !!r);
  /* ⚑ 701·797 이관(2026-09-02) — 홀드 틱이 지나는 «1회» 는 코어 `runeTryOne`·`temperUpOne` 이다
     (옛 두 이름은 «막힌 첫 누름의 안내» 로만 남았다). 홀드에서 둘은 배타적이라 같은 장부에 더한다. */
  wrap('runeTryOne',  () => true);
  wrap('temperUpOne', () => true);
  const scan = () => {
    /* ⚠ 호스트 노드는 **매 프레임 다시 찾는다** — 홀드 중 통짜 렌더가 노드를 갈면 처음 잡은 참조는
       화면에서 떨어진 사본이 되고, 그 위의 애니메이션 값을 읽어 «상시 17px» 같은 헛수치가 나온다
       (13회차 1차 시도가 그랬다 · 619 8회차가 `fxHoldMark` 를 셀렉터로 다시 찾게 한 것과 같은 이유). */
    const hostNow = document.querySelector(hostSel) || host;
    /* ⓐ 잉크 스필 — 새로 붙은 스파크만 (한 알을 두 번 안 센다) */
    const hb = hostNow.getBoundingClientRect();
    for (const nd of L.querySelectorAll('.fx-spark')) {
      if (seen.has(nd)) continue;
      seen.add(nd);
      const b = nd.getBoundingClientRect();
      if (!b.width) continue;
      P.spill.push(Math.max(hb.left - b.left, b.right - hb.right, hb.top - b.top, b.bottom - hb.bottom));
    }
    /* ⓑ 글로우 봉우리 — outline-width 시계열의 «상시값 위로 솟은» 구간 수 */
    const cs = getComputedStyle(hostNow);
    const w = parseFloat(cs.outlineWidth) || 0;
    P.ow.push(rr(w));
    /* ⚑ 13회차 2차 — **링이 바깥으로 자라지 않는가.** `outline-offset` 은 링의 안쪽 변이고 링은 거기서
       바깥으로 두께만큼 뻗으므로 «바깥 변 = offset + width» 다. 이 값이 0 을 넘으면 링이 호스트
       테두리 **밖**으로 나가 형제 UI(훈련 알림 배지 · 옆 카드 · 아래 행)를 덮는다 — 1차 채점의
       두 비평가가 그것을 세 자리에서 찍었다. 홀드 전 프레임의 **최댓값**을 적는다. */
    if (w > 0) P.edge.push(rr((parseFloat(cs.outlineOffset) || 0) + w));
    if (prevW !== null && w > 10.5 && prevW <= 10.5) P.pumps.push(rr(w));
    if (w > 10.5 && P.pumps.length) P.pumps[P.pumps.length - 1] = Math.max(P.pumps[P.pumps.length - 1], rr(w));
    prevW = w;
    /* ⓒ 줄기를 넘는 쌍 — 세로가 글리프 높이 안인 것만 */
    const res = [], pay = [];
    for (const nd of L.querySelectorAll('.fx-plus.hb')) {
      const x = parseFloat(nd.style.left), y = parseFloat(nd.style.top);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      (nd.classList.contains('dn') ? pay : res).push({ x, y });
    }
    for (const a of res) for (const b of pay)
      if (Math.abs(a.y - b.y) < 34) P.cross.push(Math.abs(a.x - b.x));
    P.raf = requestAnimationFrame(scan);
  };
  scan();
};

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

  console.log('작업 619 13회차 — 처방 3건 실측 (홀드 ' + HOLD_MS + 'ms)\n');
  console.log('ⓐ 스파크 잉크 스필(호스트 bbox 밖으로 나온 px · 사방 최대)');
  console.log('ⓑ 홀드 글로우 틱 펌프(outline-width 봉우리 수 ÷ 강화 수)');
  console.log('ⓒ 줄기를 넘는 플로터 최소거리(세로 ' + INK_H + 'px 안인 쌍만)');
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
    await page.waitForTimeout(300);
    const d = await page.evaluate(() => {
      const P = window.__p619c;
      if (P.raf) cancelAnimationFrame(P.raf);
      return { spill: P.spill.slice(), pumps: P.pumps.slice(), ow: P.ow.slice(), edge: P.edge.slice(), cross: P.cross.slice(), buys: P.buys };
    });

    const spMax = d.spill.length ? Math.max(...d.spill) : 0;
    const spOut = d.spill.filter(v => v > 0.5).length;
    const owMax = d.ow.length ? Math.max(...d.ow) : 0;
    const owBase = med(d.ow.filter(v => v > 0));
    const ratio = d.buys ? d.pumps.length / d.buys : 0;
    const hiShare = d.ow.length ? d.ow.filter(v => v > 10.5).length / d.ow.length : 0;
    const crMin = d.cross.length ? Math.min(...d.cross) : null;
    const edgeMax = d.edge.length ? Math.max(...d.edge) : 0;

    console.log('  ' + sp.n);
    console.log('    ⓐ 스파크 ' + d.spill.length + '알 · **최대 스필 ' + r2(spMax) + 'px** · 밖으로 나온 알 ' + spOut + '개');
    console.log('    ⓑ 봉우리 실린 프레임 **' + Math.round(hiShare * 100) + '%**(' + d.ow.length + '표본) · ' +
                'outline 상시 **' + owBase + 'px** → 최대 **' + owMax + 'px** · (참고: 봉우리 구간 ' +
                d.pumps.length + '회 ÷ 강화 ' + d.buys + '회 = ' + r2(ratio) + ')');
    console.log('    ⓓ 링 바깥 변(offset + width) 최대 **' + r2(edgeMax) + 'px** — 0 이하라야 호스트 안이다');
    console.log('    ⓒ 줄기 넘는 동시 생존 쌍 ' + d.cross.length + '개 · **최소 Δx ' +
                (crMin === null ? '표본 없음' : r2(crMin) + 'px') + '**');
    if (spMax > 0.5) bad++;
    if (!(owMax >= 16.5 && owBase === 9 && hiShare >= 0.12 && hiShare <= 0.70)) bad++;
    if (edgeMax > 0) bad++;
    if (crMin !== null && crMin < INK_H) bad++;
  }

  console.log('─'.repeat(78));
  console.log('문턱: ⓐ 최대 스필 = 0px · ⓑ 최대 17px · 상시 9px · 봉우리 프레임 12~70% · ' +
              'ⓒ 최소 Δx ≥ ' + INK_H + 'px(글리프 높이) 또는 표본 없음 · ⓓ 링 바깥 변 ≤ 0px');
  console.log(bad ? 'PROBE619C — 문턱 미달 ' + bad + '건' : 'PROBE619C — 세 축 전부 문턱 통과');
  await browser.close();
  process.exit(0);
})();
