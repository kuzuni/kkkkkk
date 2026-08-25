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
      await sleep(16);
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
    let peak = 0;
    for(let i=0;i<60;i++){ fxBurst({x:540,y:1200}, '#fff', 14); peak = Math.max(peak, document.getElementById('fxl').childElementCount); }
    await sleep(1400);
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
        await sleep(16);
      }
      return saw ? Math.round(min) : -1;
    });
    chk(d >= 0 && d <= 6, w + '×' + h + ' — 최근접 ' + d + 'px');
  }

  await browser.close();
  if(errs.length){ console.log('\n콘솔/런타임 에러:'); errs.slice(0,10).forEach(e => bad(e)); }
  console.log('\n' + (fails.length ? 'VERIFY58 FAIL — ' + fails.length + '건' : 'VERIFY58 PASS'));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('verify58 실패:', e.message); process.exit(1); });
