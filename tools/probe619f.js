#!/usr/bin/env node
/* 작업 619 **16회차** — 15회차가 남긴 세 지적을 **찍힌 픽셀·실좌표**로 재는 자 (338 · 350 규칙)
 *
 *   node tools/probe619f.js
 *
 * 15회차 채점(EJ 6 / EK 3)이 남긴 「8점을 막는 단 하나」 둘과, 두 회차 연속 무시된 지적 하나 —
 * 셋 다 «고쳤다» 를 눈으로만 말하지 않게 축을 세운다. 배지 축(ⓘ)은 `probe619e` 가 이미 갖고
 * 있으므로 여기서는 **안 겹치는 셋**만 잰다.
 *
 * 축 셋:
 *
 *   ⓙ **단련 알갱이 침범 깊이** — EK 「단 하나」(EK 의 단련 3점을 혼자 만든 자리).
 *      «비용 단련석» 알갱이(`.fx-spd`)의 **잉크 상단**이 호스트(단련 행) 상변보다 얼마나 위인가.
 *      EK 실측 **32px 위** · 위 패널에 잉크 1,029px. 0 이면 «행 footprint 안» 이다.
 *      ⚠ 노드 rect 가 아니라 **잉크**로 잰다 — `.fx-fly` 는 `translate(-50%,-50%) scale()` 로 앉아
 *        있어 상자와 그려지는 자리가 다르다(`getBoundingClientRect` 는 변형을 반영하므로 그것을 쓰되,
 *        **가장 위로 간 표본**을 홀드 내내 추적한다 — 한 프레임만 보면 제일 높이 뜬 순간을 놓친다).
 *
 *   ⓚ **룬 몸통 워시** — EJ 「단 하나」이자 **세 회차 연속 2인 공통**(EH ⑧ · EI ⑧ · EJ).
 *      «회당 플래시가 룬 몸통에 서는가» 를 «효과 행(`.rd`) 위에 `.fx-flash` 가 겹치는 프레임 비율» 로 잰다.
 *      15회차까지는 플래시가 `.ri`(200×200 아이콘)에 있어 이 값이 **0** 이었다(비평가 warm 1.0~1.2).
 *      ⚠ **«크면 좋다» 가 아니다** — 9회차가 998×700 패널 통짜 워시를 «전면 워시» 로 잡혔으므로
 *        플래시 면적 ÷ 패널 면적도 같이 찍어 **4% ↔ 100% 사이**에 있는지 본다(16회차 목표 ≈21%).
 *
 *   ⓛ **훈련 «+n» 플로터 가림율** — EJ ④(14·15회차 연속 지적인데 한 글자도 안 들어갔다).
 *      살아 있는 `.fx-plus` 상자를 `.fx-spark` 가 덮는 넓이 비율. 0% 가 «안 가린다» 다.
 *      ⚠ 플로터는 스파크보다 **뒤에** 태어나므로(fxUpOk 순서) 매 프레임 «지금 둘 다 떠 있는» 순간만
 *        표본으로 센다 — 없는 프레임을 0% 로 세면 헛초록이 된다(표본 수를 같이 찍는다).
 *
 * ⚠ 전부 **홀드 중 rAF 시계열**이다(probe619d 규약) — 고정 대기 한 장으로는 봉우리를 놓친다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const HOLD_MS = Number(process.env.P619F_HOLD || 2600);
/* 알갱이 잉크 ÷ 상자 — `FX3_GINK`(108.3) ÷ 상자(115.5 = ics 55 × FX3_FLYS 2.1). 상수 신설이 아니라
   저장소가 이미 적어 둔 두 값의 비다(35252 «= 55 × 2.10 × 0.938» 의 그 0.938). */
const INK_RATIO = 0.938;

const SPOTS = [
  { id: 'train',  tab: 'train',  sel: '#trCards [data-tr]',      host: '#trCards [data-tr]',  n: '23 훈련 카드' },
  { id: 'rune',   tab: 'rune',   sel: '#trRunes .rbt.b1',        host: '#trRunes .tr-rn',     n: '룬 [강화]' },
  { id: 'temper', tab: 'temper', sel: '#trTemper .tr-tp.k0 .tb', host: '#trTemper .tr-tp.k0', n: '단련 [단련]' },
];

const r2 = v => Math.round(v * 100) / 100;

/* 홀드 중 rAF 로 돌며 세 축의 표본을 모은다(페이지 안에서 — 왕복 지연이 봉우리를 놓치지 않게) */
const WATCH = (page, hostSel, ms, inkRatio, hostTop0) => page.evaluate(([hostSel, ms, INK_RATIO, TOP0]) => new Promise(res => {
  const host = document.querySelector(hostSel);
  const L = document.getElementById('fxl');
  const out = { spdRise: 0, spdInk: 0, spdN: 0, rdHit: 0, rdArea: 0, panelArea: 0, frames: 0,
                plusN: 0, plusCov: 0, plusMax: 0 };
  if (!host) return res(out);
  const t0 = performance.now();
  const rect = el => el.getBoundingClientRect();
  const ov = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
                     * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const tick = () => {
    const hb = rect(host);
    out.frames++;
    if (L) {
      /* ⓙ — 알갱이가 호스트 상변 위로 얼마나 올라갔나(최댓값).
         ⚠ **상자가 아니라 잉크로 잰다** — EK 가 캡처에서 «찍힌 픽셀» 로 센 값이 그것이고(350 규칙),
            `.fx-spd` 상자는 잉크보다 크다: 실측 상자 115.5 = `ics 55 × FX3_FLYS 2.1` · 잉크는 그
            **93.8%**(`FX3_GINK` 108.3) 라 사방으로 **3.6px** 씩 빈 테두리가 있다. 상자로 재면
            «보이지도 않는 3px» 이 영원히 빨간 자를 만든다. 둘 다 찍어 남긴다. */
      for (const nd of L.querySelectorAll('.fx-spd')) {
        const b = rect(nd); if (!b.width) continue;
        out.spdN++;
        const inkPad = b.height * (1 - INK_RATIO) / 2;
        /* ⚠ 기준은 **누르기 전 정적 상변**(TOP0)이다 — 위 «단련석» 패널은 안 움직이는데
           호스트는 60 누름 스프링(`jz-up`)·621 눌림 왕복이 홀드 «중» 에 몇 px 씩 흔든다
           (625 머리말). 살아 있는 rect 로 재면 그 흔들림이 «스프라이트가 올라갔다» 로 둔갑한다. */
        const rise = (TOP0 != null ? TOP0 : hb.top) - b.top;   /* + 면 «패널 쪽으로 나갔다»(상자) */
        if (rise > out.spdRise) out.spdRise = rise;
        if (rise - inkPad > out.spdInk) out.spdInk = rise - inkPad;
      }
      /* ⓚ — 효과 행 위에 플래시가 겹치는 프레임 */
      const rd = host.querySelector('.rd');
      if (rd) {
        const rb = rect(rd); let hit = 0, fa = 0;
        for (const nd of L.querySelectorAll('.fx-flash')) {
          const b = rect(nd);
          if (ov(b, rb) > 0) hit = 1;
          fa = Math.max(fa, b.width * b.height);
        }
        out.rdHit += hit;
        if (fa) { out.rdArea = Math.max(out.rdArea, fa); out.panelArea = hb.width * hb.height; }
      }
      /* ⓛ — 플로터를 스파크가 덮는 넓이 비율(둘 다 떠 있는 프레임만) */
      const plus = [...L.querySelectorAll('.fx-plus')].filter(n => {
        const b = rect(n); return b.width && b.right > hb.left && b.left < hb.right
                                          && b.bottom > hb.top && b.top < hb.bottom; });
      const sp = [...L.querySelectorAll('.fx-spark')].map(rect).filter(b => b.width);
      if (plus.length && sp.length) {
        for (const p of plus) {
          const pb = rect(p), area = pb.width * pb.height; if (!area) continue;
          let cov = 0; for (const s of sp) cov += ov(s, pb);
          const f = Math.min(1, cov / area);
          out.plusN++; out.plusCov += f; if (f > out.plusMax) out.plusMax = f;
        }
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

  console.log('작업 619 16회차 — 15회차가 남긴 세 지적 (홀드 ' + HOLD_MS + 'ms)\n');
  console.log('ⓙ 단련 알갱이 침범 · ⓚ 룬 몸통 워시 · ⓛ 훈련 플로터 가림율');
  console.log('─'.repeat(78));

  let bad = 0;
  const R = {};
  for (const sp of SPOTS) {
    await page.evaluate(k => { if (!$('trw').classList.contains('on')) openTrain(); setTrSub(k); renderTrain(); }, sp.tab);
    await page.waitForTimeout(420);
    const tb = await page.evaluate(s => {
      const el = document.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height };
    }, sp.sel);
    if (!tb) { console.log('  ' + sp.n + ' — 대상 없음'); bad++; continue; }
    const top0 = await page.evaluate(s => { const e = document.querySelector(s);
      return e ? e.getBoundingClientRect().top : null; }, sp.host);   /* 누르기 전 정적 상변 */
    await page.mouse.move(tb.x + tb.w / 2, tb.y + tb.h / 2);
    await page.mouse.down();
    const o = await WATCH(page, sp.host, HOLD_MS, INK_RATIO, top0);
    await page.mouse.up();
    await page.waitForTimeout(500);
    R[sp.id] = o;

    console.log('  ' + sp.n);
    if (sp.id === 'temper') {
      console.log('    ⓙ 알갱이 **잉크**가 행 상변 위로 **' + r2(Math.max(0, o.spdInk)) + 'px**'
                + '  (상자 기준 ' + r2(Math.max(0, o.spdRise)) + 'px · 표본 ' + o.spdN
                + ' · EK 15회차 실측 32px)');
    }
    if (sp.id === 'rune') {
      const pct = o.frames ? o.rdHit / o.frames : 0;
      const fa = o.panelArea ? o.rdArea / o.panelArea : 0;
      console.log('    ⓚ 효과 행 위 플래시 프레임 **' + r2(pct * 100) + '%**'
                + ' · 플래시 면적 ÷ 패널 **' + r2(fa * 100) + '%**  (15회차까지 0% / 4%)');
    }
    if (sp.id === 'train') {
      const avg = o.plusN ? o.plusCov / o.plusN : 0;
      console.log('    ⓛ 플로터 가림 평균 **' + r2(avg * 100) + '%** · 최악 ' + r2(o.plusMax * 100) + '%'
                + '  (표본 ' + o.plusN + ' · EJ ④ 15회차 «100%»)');
      if (!o.plusN) console.log('    ⚠ 표본 0 — 둘이 같이 뜬 프레임이 없다(헛초록 방지: 판정 보류)');
    }
  }

  console.log('─'.repeat(78));
  /* 문턱 — 셋 다 «비평가가 실제로 쓴 수» 를 그대로 옮긴 것이다 */
  const t = R.temper, r = R.rune, n = R.train;
  const okJ = t && Math.max(0, t.spdInk) <= 1;                       /* 행 footprint 안 — 잉크 기준 */
  const okK = r && r.frames && (r.rdHit / r.frames) >= 0.25
                && (r.panelArea ? r.rdArea / r.panelArea : 0) <= 0.5;  /* 서되 «전면» 은 아니다 */
  const okL = n && n.plusN > 0 && (n.plusCov / n.plusN) <= 0.25;
  const say = (k, ok, s) => console.log('  ' + (ok ? '✓' : '✗') + ' ' + k + ' ' + s);
  say('ⓙ', okJ, '단련 알갱이가 행 상변을 안 넘는다(≤1px)');
  say('ⓚ', okK, '룬 몸통(효과 행)에 회당 워시가 선다(≥25% 프레임) · 패널의 ≤50%');
  say('ⓛ', okL, '훈련 플로터 가림 평균 ≤ 25%');
  bad += [okJ, okK, okL].filter(v => !v).length;
  console.log(bad ? 'PROBE619F — ' + bad + '건 문턱 미달' : 'PROBE619F — 세 축 전부 문턱 통과');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
