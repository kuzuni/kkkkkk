#!/usr/bin/env node
/* 58 UI 연출 공용 모듈 — 기능 체크 (T2 «기능 완성 규칙»: 버튼별 «눌렀을 때 무엇이 바뀌는지» 헤드리스 확인)
 *
 *   node verify58.js
 *
 * 캡처를 «보는» 검증이 아니라 DOM·좌표·타이밍을 «재는» 검증이다(29 교훈 1: 화면으로는 부호 버그를 못 잡는다).
 */
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

const fails = [];
const ok  = m => console.log('  ✓ ' + m);
const bad = m => { fails.push(m); console.log('  ✗ ' + m); };
const chk = (c, m) => c ? ok(m) : bad(m);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if(m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    player.inv = 1e9;
    for(const e of enemies){ e.x = 1; e.y = 1; }
    /* 전투 로직을 통째로 멈춘다 — 자동 전투가 계속 골드를 벌면 «감소에는 연출을 안 건다»·«잔여 0»
       같은 항목이 내 트리거가 아닌 전투 획득 때문에 흔들린다(41 교훈 4 «검사 절차가 유휴 루프에 오염된다»).
       draw()/fxTick() 은 그대로 돌아 연출은 실제와 똑같이 재생된다. */
    window.step = () => {};
  });

  console.log('[1] 레이어 · 입력 비차단');
  const lay = await page.evaluate(() => {
    const l = document.getElementById('fxl'); if(!l) return null;
    const cs = getComputedStyle(l);
    const r = l.getBoundingClientRect();
    const under = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    return { pe:cs.pointerEvents, z:+cs.zIndex, w:Math.round(r.width), h:Math.round(r.height),
             under: under ? (under.id || under.className || under.tagName) : null };
  });
  chk(!!lay, '#fxl 존재');
  chk(lay && lay.pe === 'none', '입력 비차단 — pointer-events:none (실측 ' + (lay && lay.pe) + ')');
  chk(lay && lay.z >= 42, '최상위 z-index ' + (lay && lay.z) + ' (현재 최대 오버레이 41 위)');
  chk(lay && lay.w === 1080, '프레임 전체를 덮는다 ' + (lay && lay.w) + '×' + (lay && lay.h));
  chk(lay && String(lay.under).indexOf('fxl') < 0, '레이어 한가운데 히트테스트가 아래 요소로 통과 → ' + (lay && lay.under));

  console.log('[2] 재화 획득 — 비행 · 도착 · 알약 튐 · +n');
  const fly = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const pill = document.querySelector('.cGold');
    /* 구현이 겨냥하는 «꽂히는 자리» 는 알약 상자 중심이 아니라 알약의 코인 아이콘 중심이다
       (.cbox i 는 left:-31/top:-8 로 알약 왼쪽에 걸쳐 있다). 기준을 구현과 같은 곳으로 맞춘다. */
    const pr = (pill.querySelector('i') || pill).getBoundingClientRect();
    const target = { x: pr.left + pr.width/2, y: pr.top + pr.height/2 };
    const g0 = S.gold;
    fxAt(fxWorld(player.x + 140, player.y - 30));
    S.gold += 128000;
    await sleep(230);
    const n0 = document.querySelectorAll('#fxl .fx-fly').length;
    /* 시작 위치가 «출발점» 근처인지 */
    const f0 = document.querySelector('#fxl .fx-fly').getBoundingClientRect();
    let punch = 0, minD = 1e9, t0 = performance.now(), lastSeen = 0, plusTxt = null;
    while(performance.now() - t0 < 1600){
      const els = document.querySelectorAll('#fxl .fx-fly');
      if(els.length) lastSeen = performance.now() - t0;
      for(const e of els){
        const r = e.getBoundingClientRect();
        minD = Math.min(minD, Math.hypot(r.left + r.width/2 - target.x, r.top + r.height/2 - target.y));
      }
      if(pill.classList.contains('fx-punch')) punch++;
      const pl = document.querySelector('#fxl .fx-plus');
      if(pl && !plusTxt) plusTxt = pl.textContent;      /* 0.8초 뒤 스스로 사라지므로 «도는 동안» 잡는다 */
      await sleep(8);
    }
    return { n0, punch, minD:Math.round(minD), lastSeen:Math.round(lastSeen),
             startY:Math.round(f0.top), plusTxt, g0, g1:S.gold };
  });
  chk(fly.n0 >= 3 && fly.n0 <= 8, '아이콘 ' + fly.n0 + '개 (58: 3~8개)');
  chk(fly.minD <= 6, 'HUD 골드 알약에 «정확히» 도착 — 최근접 ' + fly.minD + 'px');
  chk(fly.punch > 0, '도착 순간 알약이 튄다 (.fx-punch 관측 ' + fly.punch + '프레임)');
  chk(fly.lastSeen >= 300 && fly.lastSeen <= 800, '연출 길이 ' + fly.lastSeen + 'ms (58: 300~800ms)');
  chk(!!fly.plusTxt, '`+n` 플로팅 텍스트 — "' + fly.plusTxt + '"');

  console.log('[3] 숫자 롤링 (뚝 바뀌지 않는다)');
  const roll = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const el = document.getElementById('goldN');
    S.gold = 0; await sleep(500);
    const before = el.textContent;
    S.gold = 5e8;
    const seen = new Set();
    for(let i=0;i<40;i++){ seen.add(el.textContent); await sleep(16); }
    await sleep(700);
    return { before, steps: seen.size, after: el.textContent, want: fmt(S.gold) };
  });
  chk(roll.steps >= 5, '중간 단계 ' + roll.steps + '개를 거쳐 오른다 (' + roll.before + ' → ' + roll.after + ')');
  chk(roll.after === roll.want, '최종값이 실제 보유량과 일치 — ' + roll.after + ' / ' + roll.want);

  console.log('[4] 소모(감소) 에는 연출을 걸지 않는다');
  const dec = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    /* 대입 자체가 «증가» 라 그 연출이 끝날 때까지 기다린 뒤에 감소를 잰다(41 교훈 4 의 검사 절차 판) */
    S.gold = 1e9; await sleep(1400);
    document.querySelectorAll('#fxl .fx-fly').forEach(e => e.remove());
    S.gold -= 5e8; await sleep(400);
    return document.querySelectorAll('#fxl .fx-fly').length;
  });
  chk(dec === 0, '골드 감소 후 비행 아이콘 ' + dec + '개');

  console.log('[5] 퀘스트 완료 — 체크 · 버스트 · 토스트 · 재화 비행');
  const q = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.quest.kill.base = -1e9;
    openQuest('rep');
    await sleep(300);
    const d0 = S.dia;
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { err:'보상 받기 버튼 없음' };
    b.click();
    await sleep(120);
    const r = { chk: !!document.querySelector('#fxl .fx-check'),
                spark: document.querySelectorAll('#fxl .fx-spark').length,
                toast: document.querySelector('#fxl .fx-toast') ? document.querySelector('#fxl .fx-toast').textContent : null,
                d0, d1:S.dia };
    await sleep(300);
    r.fly = document.querySelectorAll('#fxl .fx-fly').length;
    await sleep(1600);
    r.toastGone = !document.querySelector('#fxl .fx-toast');
    closeModal();
    return r;
  });
  chk(!q.err, '퀘스트 «보상 받기» 클릭' + (q.err ? ' — ' + q.err : ''));
  chk(q.d1 > q.d0, '다이아 실제 지급 ' + q.d0 + ' → ' + q.d1);
  chk(q.chk, '체크 스트로크 드로잉 생성');
  chk(q.spark > 0, '버스트 파티클 ' + q.spark + '개');
  chk(q.toast === '퀘스트 완료', '상단 토스트 "' + q.toast + '"');
  chk(q.fly > 0, '이어서 재화 비행 ' + q.fly + '개 (보상 → 재화 획득 연결)');
  chk(q.toastGone, '토스트가 스스로 사라진다');

  console.log('[6] 강화 성공 — 대상 카드 흰 플래시 + 성공 파티클');
  const up = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.gold = 1e13; openTrain(); await sleep(400);
    const c = document.querySelector('#trw [data-tr]');
    if(!c) return { err:'훈련 카드 없음' };
    const before = lv(c.dataset.tr);
    const want = fxRect(c);                            /* 클릭 «전»에 잰다 — renderTrain() 이 카드를 재렌더해 detach 시킨다 */
    c.click();
    await sleep(60);
    /* 플래시는 스스로 scale(1.045) 로 커지는 중이라 getBoundingClientRect 로 재면 그만큼 커 보인다
       (43 교훈 1 «내가 쓴 assert 도 어디를 기준으로 쟀는지 먼저 확인»). 인라인 style 의 «기하» 로 잰다. */
    const f = document.querySelector('#fxl .fx-flash');
    const out = { before, after: lv(c.dataset.tr),
      spark: document.querySelectorAll('#fxl .fx-spark').length,
      dx: f ? Math.round(Math.abs(parseFloat(f.style.left) - want.x)) : -1,
      dw: f ? Math.round(Math.abs(parseFloat(f.style.width) - want.w)) : -1,
      dh: f ? Math.round(Math.abs(parseFloat(f.style.height) - want.h)) : -1 };
    await sleep(500);
    out.gone = !document.querySelector('#fxl .fx-flash');
    closeTrain();
    return out;
  });
  chk(!up.err, '훈련 카드 클릭' + (up.err ? ' — ' + up.err : ''));
  chk(up.after > up.before, '실제 레벨 상승 ' + up.before + ' → ' + up.after);
  chk(up.dx <= 1 && up.dw <= 1 && up.dh <= 1,
      '플래시가 카드 bbox 와 일치 (Δx ' + up.dx + ' · Δw ' + up.dw + ' · Δh ' + up.dh + ')');
  chk(up.spark > 0, '성공 파티클 ' + up.spark + '개');
  chk(up.gone, '플래시가 0.5초 안에 사라진다');

  console.log('[7] 파티클 상한 · 정리');
  const cap = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    window.step = () => {};                            /* 전투 골드가 계속 새 비행을 만들면 «잔여» 를 못 잰다 */
    await sleep(1200);
    let peak = 0;
    for(let i=0;i<60;i++){ fxBurst({x:540,y:1200}, '#fff', 14); peak = Math.max(peak, document.getElementById('fxl').childElementCount); }
    await sleep(1600);
    return { peak, rest: document.getElementById('fxl').childElementCount };
  });
  chk(cap.peak <= 120, 'DOM 파티클 상한 준수 — 최대 ' + cap.peak + '개 (FXMAX 120)');
  chk(cap.rest === 0, '연출이 끝나면 레이어가 비워진다 (잔여 ' + cap.rest + ')');

  console.log('[8] 화면비 회귀 — 9:16 · 9:21 에서도 알약에 정확히 도착');
  for(const [w, h] of [[1080,1920],[1080,2520]]){
    await page.setViewportSize({ width:w, height:h });
    await page.waitForTimeout(400);
    const d = await page.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      player.inv = 1e9;
      for(const e of enemies){ e.x = 1; e.y = 1; }
      document.querySelectorAll('#fxl .fx-fly').forEach(e => e.remove());
      const pb = document.querySelector('.cGold');
      const pill = (pb.querySelector('i') || pb).getBoundingClientRect();
      const t = { x:pill.left + pill.width/2, y:pill.top + pill.height/2 };
      fxAt(fxWorld(player.x, player.y));
      S.gold += 90000;
      let min = 1e9, saw = 0;
      /* «비행이 끝날 때까지» 본다 — 고정 프레임 수로 자르면 디바운스 지연에 잘려 중간값을 잰다 */
      for(let i=0;i<180;i++){
        const els = document.querySelectorAll('#fxl .fx-fly');
        if(els.length) saw = 1;
        for(const e of els){
          const r = e.getBoundingClientRect();
          min = Math.min(min, Math.hypot(r.left + r.width/2 - t.x, r.top + r.height/2 - t.y));
        }
        if(saw && !els.length) break;
        await sleep(8);
      }
      return saw ? Math.round(min) : -1;
    });
    chk(d >= 0 && d <= 6, w + '×' + h + ' — 최근접 ' + d + 'px');
  }

  console.log('[9b] 강화 플래시 — «보이는가» 를 대비·지연·지속으로 잰다');
  const fl = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const rgba = c => { const m = (String(c).match(/[\d.]+/g) || [0,0,0,1]).map(Number);
      return { r:m[0], g:m[1], b:m[2], a: m.length > 3 ? m[3] : 1 }; };
    S.gold = 1e13; openTrain(); await sleep(500);
    const card = document.querySelector('#trw [data-tr]');
    const cardC = rgba(getComputedStyle(card).backgroundColor);
    const t0 = Date.now();
    card.click();
    /* «언제부터 언제까지 보이는가» — 10ms 폴링으로 opacity 궤적을 그대로 뜬다.
       누적 sleep 은 매번 오버슈트해서 «t=66ms» 같은 라벨이 실제로는 150ms 다(5회차에 이걸로 오진했다). */
    let first = -1, last = -1, peak = 0, flashL = null;
    for(let i=0;i<80;i++){
      const f = document.querySelector('#fxl .fx-flash');
      if(f){
        const op = +getComputedStyle(f).opacity;
        if(flashL === null) flashL = rgba(getComputedStyle(f).backgroundColor);
        if(op > 0.7){ if(first < 0) first = Date.now() - t0; last = Date.now() - t0; }
        peak = Math.max(peak, op);
      }
      await sleep(10);
    }
    /* 워시가 카드 위에 얹혔을 때 «채널별» 로 얼마나 움직이는가.
       휘도만 재면 크림(252) 위의 금색 워시(218)가 «Δ34, 안 보임» 으로 오판된다 — 실제로 눈에 띄는
       것은 파랑 채널 242 → 132 의 색 이동이다. 최대 채널 변화량으로 잰다. */
    let dmax = 0;
    if(flashL) for(const k of ['r','g','b'])
      dmax = Math.max(dmax, Math.abs((flashL.a*flashL[k] + (1 - flashL.a)*cardC[k]) - cardC[k]));
    closeTrain();
    return { first, last, peak:+peak.toFixed(2),
             cardRGB: [cardC.r, cardC.g, cardC.b].join(','), compDelta: Math.round(dmax) };
  });
  chk(fl.first >= 0 && fl.first <= 140, '클릭 후 ' + fl.first + 'ms 에 보이기 시작 (재렌더를 기다리지 않는다)');
  chk(fl.last - fl.first >= 150, 'opacity≥0.7 로 ' + (fl.last - fl.first) + 'ms 유지 (한 프레임 스치지 않는다)');
  chk(fl.compDelta >= 45, '카드(rgb ' + fl.cardRGB + ') 위 최대 채널 변화 ' + fl.compDelta + ' (≥45 여야 «플래시»로 읽힌다)');

  console.log('[9] 알약이 «끝까지» 튄다 · 숫자 롤링이 0.8초 안에 끝난다');
  await page.setViewportSize({ width:1080, height:2280 });
  await page.waitForTimeout(500);
  const t9 = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9;
    for(const e of enemies){ e.x = 1; e.y = 1; }
    window.step = () => {};                            /* 전투가 계속 골드를 벌면 «끝났나» 를 못 잰다 */
    /* 앞 항목이 S.gold 를 1e13 으로 올려놨다 — 그대로 두면 +128K 를 더해도 fmt 문자열이
       «10.0T» 로 같아서 «롤링이 0ms 에 끝났다» 는 거짓 통과가 난다(43 교훈 1: 내 assert 부터 의심할 것). */
    S.gold = 90000; fxHold.gold = 0;
    await sleep(1200);
    const pill = document.querySelector('.cGold'), num = document.getElementById('goldN');
    const base = pill.getBoundingClientRect().width;
    const want = fmt(S.gold + 128000);
    const t0 = performance.now();
    fxAt(fxWorld(player.x + 140, player.y - 30));
    S.gold += 128000;
    let peak = base, doneAt = -1, movedAt = -1, prev = num.textContent;
    while(performance.now() - t0 < 1600){
      peak = Math.max(peak, pill.getBoundingClientRect().width);
      if(movedAt < 0 && num.textContent !== prev) movedAt = performance.now() - t0;
      if(doneAt < 0 && num.textContent === want) doneAt = performance.now() - t0;
      await sleep(16);
    }
    return { grow: +(peak/base).toFixed(3), doneAt: Math.round(doneAt), movedAt: Math.round(movedAt), want,
             now: num.textContent };
  });
  chk(t9.grow >= 1.10, '알약 최대 확대 ×' + t9.grow + ' (58: scale 1.15→1)');
  chk(t9.movedAt >= 150, '숫자는 코인이 도착한 «뒤에» 오르기 시작 — ' + t9.movedAt + 'ms');
  chk(t9.doneAt > 0 && t9.doneAt <= 800, '롤링 완료 ' + t9.doneAt + 'ms (58: ≤800ms) → ' + t9.now);

  console.log('[10] 6회차 지적 — 확대가 옆 카드를 안 넘는다 · 튐 고원 · 토스트 즉시성 · 보상 롤링 완주');
  const t10 = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const sc = el => { const m = String(getComputedStyle(el).transform).match(/matrix\(([\d.\-]+)/); return m ? +m[1] : 1; };
    /* (가) 플래시 오버레이의 최대 확대 — 훈련 카드 폭 326, 카드 간격 16px 라 1.05(+16px)가 상한이다 */
    S.gold = 1e13; openTrain(); await sleep(500);
    const card = document.querySelector('#trw [data-tr]');
    const cardW = card.getBoundingClientRect().width;
    card.click();
    let fmax = 1;
    for(let i=0;i<50;i++){
      const f = document.querySelector('#fxl .fx-flash');
      if(f) fmax = Math.max(fmax, sc(f));
      await sleep(10);
    }
    closeTrain();
    /* (나) 알약 튐이 «고원» 인가 — ≥1.12 로 머무는 시간 */
    await sleep(400);
    const pill = document.querySelector('.cGold');
    S.gold = 90000; fxHold.gold = 0; await sleep(1200);
    const base = pill.getBoundingClientRect().width;
    const tq = Date.now();
    fxAt(fxWorld(player.x, player.y)); S.gold += 128000;
    /* «샘플 1개 = 10ms» 로 세면 안 된다 — `sleep(10)` 은 evaluate 오버헤드로 실제 20~25ms 다.
       경과 시각을 매번 다시 읽어 «≥1.12 였던 구간» 의 실제 길이를 적분한다
       (43 교훈 1: 내가 쓴 assert 부터 어디를 기준으로 쟀는지 확인할 것). */
    let hi = 0, pmax = 1, prevT = Date.now(), wasHi = false;
    for(let i=0;i<130;i++){
      const w = pill.getBoundingClientRect().width / base;
      const nowT = Date.now();
      pmax = Math.max(pmax, w);
      if(wasHi) hi += nowT - prevT;
      wasHi = w >= 1.12; prevT = nowT;
      await sleep(10);
    }
    /* (다)(라) 퀘스트 — 토스트가 얼마나 빨리 뜨나 · 다이아 롤링이 0.8초 안에 끝나나 */
    S.quest.kill.base = -1e9; openQuest('rep'); await sleep(350);
    const dn = document.getElementById('diaN');
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { fmax:+fmax.toFixed(3), cardW:Math.round(cardW), hi, pmax:+pmax.toFixed(3), err:'퀘스트 버튼 없음' };
    const t0 = Date.now();
    b.click();
    const want = () => fmt(S.dia);
    let toastAt = -1, diaDone = -1;
    for(let i=0;i<120;i++){
      const to = document.querySelector('#fxl .fx-toast');
      if(toastAt < 0 && to && +getComputedStyle(to).opacity >= 0.9) toastAt = Date.now() - t0;
      if(diaDone < 0 && dn.textContent === want()) diaDone = Date.now() - t0;
      await sleep(10);
    }
    closeModal();
    return { fmax:+fmax.toFixed(3), cardW:Math.round(cardW), hi, pmax:+pmax.toFixed(3), toastAt, diaDone };
  });
  chk(!t10.err, '퀘스트 트리거' + (t10.err ? ' — ' + t10.err : ''));
  chk(t10.fmax <= 1.06, '플래시 최대 확대 ×' + t10.fmax + ' — 카드 폭 ' + t10.cardW
      + 'px, 카드 간격 16px 라 ×1.06 을 넘으면 옆 카드를 침범한다');
  chk(t10.pmax >= 1.12, '알약 최대 확대 ×' + t10.pmax);
  chk(t10.hi >= 90, '알약이 ×1.12 이상으로 ' + t10.hi + 'ms 유지 (봉우리가 뾰족하면 안 보인다)');
  /* 하한은 «연출» 이 아니라 클릭 핸들러(claim + openQuest 재렌더) 비용이다 — 같은 프레임에 그려지므로
     실제 «데이터가 먼저 바뀌는» 갭은 없다. 페이드인만 최대한 당겨 놓고 150ms 로 둔다. */
  chk(t10.toastAt >= 0 && t10.toastAt <= 150, '토스트가 ' + t10.toastAt + 'ms 에 완전히 뜬다 (데이터 교체와 같은 프레임)');
  chk(t10.diaDone >= 0 && t10.diaDone <= 800, '보상 다이아 롤링 완료 ' + t10.diaDone + 'ms (≤800ms)');

  await browser.close();
  if(errs.length){ console.log('\n콘솔/런타임 에러:'); errs.slice(0,10).forEach(e => bad(e)); }
  console.log('\n' + (fails.length ? 'VERIFY58 FAIL — ' + fails.length + '건' : 'VERIFY58 PASS'));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('verify58 실패:', e.message); process.exit(1); });
