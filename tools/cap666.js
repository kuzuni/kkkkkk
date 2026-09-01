/* 작업 666 — 연출 연속 프레임 캡처 하네스 (지시서 [3]-(다): 정지 1장이 아니라 연속 프레임)
 *
 *   node tools/cap666.js [라운드]          기본 r1
 *   → docs/shots/666-<라운드>-<n>.png  (캡처는 커밋 금지 — .gitignore `docs/shots/`)
 *   → 정답표는 stdout 으로 낸다(사람이 읽는 근거는 docs/review/666-*.md 에 옮겨 적는다)
 *
 * 방식은 58 의 `cap58b.js` 를 그대로 따른다(31~42회차가 세운 «강제 합성 + 얼리기 네 겹»):
 *   ① 표본마다 페이지를 새로 열고 ② 89 유물 페이지를 세팅하고 ③ 소환 버튼을 눌러 트리거한 뒤
 *   ④ 목표 시각까지 rAF 로 진행시키고 ⑤ 페이지를 얼리고(rAF·CSS 애니·타이머) ⑥ 찍는다.
 * 얼리기가 없으면 스크린샷이 300~600ms 걸리는 동안 입자가 더 날아가거나 지워져
 * «표와 그림이 다른» 캡처가 나온다(58 36·41회차가 세 라운드를 태운 자리).
 *
 * ⚠ 시드를 고정한다 — 버스트 퍼짐과 유물 10종 추첨이 표본마다 달라지면 프레임 열이 «튄다».
 * ⚠ 트리거는 실제 사용자 경로다(`#rwBasin` pointerdown → pointerup) — 함수를 직접 부르지 않는다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const fs = require('fs');

const ROUND = process.argv[2] || 'r1';
const OUT = path.resolve(__dirname, '../docs/shots');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
/* 표본 시각 — **봉투에 맞춘다**(58 32회차 «씬마다 간격이 달라야 한다»). 이 연출의 길이는
   `FXSPARK_MS` 380ms 하나이고 마지막 60ms 는 페이드 꼬리라 1회차 표본 360·440·560 은
   «보이는 것 0» 이었다. 0~340ms 를 여덟 장으로 고르게 덮는다. */
const STOPS = [0, 40, 80, 130, 180, 240, 290, 340];
const SEED = 20260902;

async function shot(T, idx) {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript((sd) => {
    try { localStorage.clear(); } catch (e) {}
    const _st = window.setTimeout, _si = window.setInterval;
    const ids = { t: new Set(), i: new Set() };
    window.__capIds = ids;
    window.setTimeout = function (...a) { const id = _st.apply(window, a); ids.t.add(id); return id; };
    window.setInterval = function (...a) { const id = _si.apply(window, a); ids.i.add(id); return id; };
    let s = sd >>> 0;
    Math.random = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, SEED);
  await p.goto(URL);
  await p.waitForTimeout(1100);

  /* 세팅 — 게임 로직만 세운다(LESSONS 58-2). 재화는 `fxSeen` 스냅샷을 같이 맞춰
     «세팅이 낸 획득 연출» 이 트리거 연출과 겹치지 않게 한다(cap58b 32회차 함정). */
  await p.evaluate(() => {
    if (typeof window.step === 'function') { window.__step = window.step; window.step = () => {}; }
    S.relic = 250000; S.gold = 128000; S.dia = 4200;
    try { fxSeen.gold = S.gold; fxSeen.dia = S.dia; fxSeen.relic = S.relic; } catch (e) {}
    /* 몇 종은 이미 가진 상태 — «새 유물» 과 «Lv+1» 이 둘 다 그림에 있을 수 있게 */
    try { RELICS.slice(0, 4).forEach(r => { S.own[r.id] = { n: 0, l: 3 }; }); } catch (e) {}
    uiDirty = true; if (typeof renderUI === 'function') renderUI();
    openRelw();
  });
  await p.waitForTimeout(600);
  /* 연출 레이어가 빈 상태에서 출발한다 */
  await p.waitForFunction(() => document.querySelectorAll('#fxl > *').length === 0, null, { timeout: 5000 }).catch(() => {});

  const info = await p.evaluate(async (T) => {
    const el = document.getElementById('rwBasin');
    const r = el.getBoundingClientRect();
    const t0 = performance.now();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));   /* 단발 — 홀드 반복은 안 섞는다 */
    /* ⚑ **시간은 «기다려서» 가 아니라 «감아서» 맞�춘다.** 1회차에 cap58b 식으로 rAF 로 기다렸더니
       목표 280ms 표본이 실제 857ms 에 얼었다(러너의 rAF 가 렌더 부하에 밀린다) — 입자 수명이
       380ms 라 뒤 세 장이 통째로 빈 그림이었다. 이 화면의 연출은 **전부 CSS 애니메이션**이라
       (`.fx-spark` 는 인라인 `animation-duration`, 플래시도 같다) `currentTime` 을 직접 감으면
       그 시각의 그림이 **정확히** 나온다. 캡처 하네스가 시각을 흐리면 정답표가 거짓이 된다(58 36회차). */
    window.requestAnimationFrame = () => 0;
    try { const ids = window.__capIds; if (ids) { ids.t.forEach(clearTimeout); ids.i.forEach(clearInterval); } } catch (e) {}
    window.setTimeout = () => 0; window.setInterval = () => 0;
    let at = 0;
    try { document.getAnimations().forEach(a => { a.pause(); try { a.currentTime = T; at = T; } catch (e) {} }); } catch (e) {}
    /* 정답표 — «보이는 노드» 만 센다(불투명도 0.06 · 최소변 6px 미만은 뺀다 — cap58b 41·42회차) */
    const vis = n => { const cs = getComputedStyle(n), bb = n.getBoundingClientRect();
      return +cs.opacity > 0.06 && Math.min(bb.width, bb.height) >= 6; };
    const L = [...document.querySelectorAll('#fxl > *')].filter(vis);
    const kind = n => { const c = (n.className || '') + '';
      return /fx-cic/.test(c) ? '아이콘' : /fx-spark/.test(c) ? '구슬' : /fx-plus|fx-delta/.test(c) ? '글자'
           : /fx-flash/.test(c) ? '플래시' : /fx-toast/.test(c) ? '토스트' : '기타'; };
    const cnt = {};
    L.forEach(n => { const k = kind(n); cnt[k] = (cnt[k] || 0) + 1; });
    const ic = L.filter(n => /fx-cic/.test((n.className || '') + ''));
    const bb = ic.map(n => n.getBoundingClientRect());
    const spread = bb.length ? Math.round(Math.max(...bb.map(b => Math.hypot(
      b.x + b.width / 2 - (r.x + r.width / 2), b.y + b.height / 2 - (r.y + r.height / 2))))) : 0;
    const size = bb.length ? Math.round(bb.reduce((s, b) => s + b.width, 0) / bb.length) : 0;
    const out = bb.filter(b => { const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      return cx < r.x || cx > r.x + r.width || cy < r.y || cy > r.y + r.height; }).length;
    return { at: Math.round(at), cnt, icon: ic.length, spread, size, outside: out,
             basin: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
  }, T);

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, '666-' + ROUND + '-' + idx + '.png');
  await p.screenshot({ path: file });
  await b.close();
  return { T, file, info, errs: errs.length };
}

(async () => {
  const rows = [];
  for (let i = 0; i < STOPS.length; i++) rows.push(await shot(STOPS[i], i + 1));
  console.log('\n# 666 ' + ROUND + ' 정답표 — 단발 소환 1회 (트리거 = 0ms · 시드 ' + SEED + ')\n');
  console.log('| # | t(ms) | 실제 | 아이콘 | 구슬 | 글자 | 플래시 | 토스트 | 최대 반경 | 평균 크기 | 버튼 밖 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  rows.forEach((r, i) => {
    const c = r.info.cnt || {};
    console.log('| ' + (i + 1) + ' | ' + r.T + ' | ' + r.info.at + ' | ' + (c['아이콘'] || 0) + ' | ' + (c['구슬'] || 0)
      + ' | ' + (c['글자'] || 0) + ' | ' + (c['플래시'] || 0) + ' | ' + (c['토스트'] || 0)
      + ' | ' + r.info.spread + 'px | ' + r.info.size + 'px | ' + r.info.outside + ' |');
  });
  console.log('\n버튼(#rwBasin) 상자: ' + JSON.stringify(rows[0].info.basin));
  console.log('콘솔 에러: ' + rows.reduce((s, r) => s + r.errs, 0) + '건');
  console.log('캡처: ' + path.join(OUT, '666-' + ROUND + '-*.png'));
})();
