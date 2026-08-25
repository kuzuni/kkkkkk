#!/usr/bin/env node
/* 93 — UI 발 재화 흡수 «퍼짐 → 머묾 → 흡수» 3박자 기능 게이트
 *
 *   node verify93.js
 *
 * PROGRESS 93 행의 «검증» 목록을 그대로 잰다:
 *   퍼짐 최대 반경 프레임(≈0.22s) 존재 · 첫 도착 0.5~0.6s · 마지막 도착 1.2~1.4s ·
 *   알약 펄스 ≥4회 · 아이콘 수(보상 수령) 10~16 · 퀘스트 행 위 관통 0 · 전투 발 연출 변화 0
 *
 * 캡처를 «보는» 검증이 아니라 좌표·타이밍을 «재는» 검증이다(29 교훈 1).
 * 도착은 DOM 이 아니라 `fxFlies` 배열에서 빠지는 순간으로 잰다 — DOM 은 .fx-land 페이드 45ms 뒤에
 * 지워져 그만큼 늦게 읽힌다(43 교훈 1: 내 assert 가 어디를 재는지부터 확인할 것).
 */
const path = require('path');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

const fails = [];
const ok  = m => console.log('  ✓ ' + m);
const bad = m => { fails.push(m); console.log('  ✗ ' + m); };
const chk = (c, m) => c ? ok(m) : bad(m);

function pwLaunch(){
  const fs2 = require('fs');
  return chromium.launch().catch(e => {
    for(const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium']){
      try { if(p && fs2.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){}
    }
    throw e;
  });
}

(async () => {
  const browser = await pwLaunch();
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if(m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);
  /* 전투 로직 정지 — 유휴 골드가 섞이면 «내 트리거» 가 아닌 획득이 타이밍을 흔든다(LESSONS 58-2) */
  await page.evaluate(() => {
    player.inv = 1e9;
    for(const e of enemies){ e.x = 1; e.y = 1; }
    window.step = () => {};
  });

  console.log('[1] 3박자 envelope — 퍼짐 0.22s · 첫 도착 0.5~0.6s · 마지막 도착 1.2~1.4s');
  const t1 = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.gold = 90000; fxHold.gold = 0; await sleep(1400);
    const pb = document.querySelector('.cGold'), num = document.getElementById('goldN');
    const want = fmt(S.gold + 128000);
    const pn0 = fxPunchN;
    fxAt(fxWorld(player.x + 140, player.y - 30));
    S.gold += 128000;
    let t0 = 0;
    for(let i=0;i<250;i++){ if(fxFlies.length && fxFlies[0].ui){ t0 = fxFlies[0].st; break; } await sleep(4); }
    if(!t0) return { err:'UI 발 비행이 생성되지 않았다' };
    const f0 = fxFlies[0], sv = fxSc();
    const org = { x:sv.x + f0.sx*sv.s, y:sv.y + f0.sy*sv.s };
    let n0 = 0, first = -1, last = -1, prev = 0, pmax = 1, radT = -1, radMax = 0, rollDone = -1;
    let pobs = 0, phit = 0, lastSamp = -1e9, last2 = -1;
    while(performance.now() - t0 < 2200){
      const t = performance.now() - t0;
      const c = fxFlies.filter(f => f.ui).length;
      if(c > n0) n0 = c;
      /* 퍼짐 반경 = 출발점에서의 «평균» 거리(프레임 px). 흡수가 시작되면 남은 아이콘만 남아
         평균이 흔들리므로 0.42s 까지만 본다. t<60ms 는 transform 이 아직 안 실린 첫 프레임이라 뺀다. */
      const els = document.querySelectorAll('#fxl .fx-fly');
      if(els.length && t > 60 && t < 420){
        let sum = 0;
        for(const e of els){ const b = e.getBoundingClientRect();
          sum += Math.hypot((b.left + b.width/2 - org.x)/sv.s, (b.top + b.height/2 - org.y)/sv.s); }
        const dd = sum/els.length;
        if(dd > radMax){ radMax = dd; radT = t; }
      }
      if(prev && c < prev){ if(first < 0) first = t; last = t; }
      if(first >= 0 && c === 0 && prev === 0 && last2 < 0 && t > last + 200) last2 = t;
      prev = c;
      const mm = String(getComputedStyle(pb).transform).match(/matrix\(([\d.\-]+)/);
      const sc2 = mm ? +mm[1] : 1;
      pmax = Math.max(pmax, sc2);
      /* 4회차 — «관측되는가» 를 잰다. 도착 창(첫~마지막 도착) 안에서 캡처 리듬(93ms)으로 표본해
         ≥1.05 인 비율. 3회차까지는 CSS 애니메이션 재시작 때문에 7.5% 였다(비평가 P·Q 가 3/18 로 확인). */
      if(first >= 0 && last2 < 0 && (t - lastSamp) >= 93){ lastSamp = t; pobs++; if(sc2 >= 1.05) phit++; }
      if(rollDone < 0 && num.textContent === want) rollDone = t;
      await sleep(8);
    }
    return { n0, first:Math.round(first), last:Math.round(last), punchN:fxPunchN - pn0, pobs, phit,
             pmax:+pmax.toFixed(3), radT:Math.round(radT), radMax:Math.round(radMax),
             rollDone:Math.round(rollDone), rest:document.getElementById('fxl').childElementCount };
  });
  chk(!t1.err, 'UI 발 재화 획득 트리거' + (t1.err ? ' — ' + t1.err : ''));
  /* 주인 지시의 60~140px 은 «3~6개» 시절 값이다. 8~16개가 한 점에서 나가면 그 반경으로는
     아이콘(Ø53)이 43~52% 서로 가려 «몇 개인지 안 세어진다»(비평가 Q·S·T 공통). 6회차에 95~195 로
     넓혔다 — 개수를 늘리라는 지시(①)를 지키려면 반경도 같이 늘어야 한다. */
  chk(t1.radMax >= 80 && t1.radMax <= 200,
      '퍼짐 최대 반경 ' + t1.radMax + 'px (6회차: 95~195px · 아이콘별 랜덤이라 평균)');
  chk(t1.radT >= 150 && t1.radT <= 420,
      '퍼짐이 ' + t1.radT + 'ms 에 최대 (93: 0.22s 에 완료 후 머묾 — 그 구간의 프레임이 존재한다)');
  /* 설계값은 0.50 / 1.22s 다. 실측은 rAF 간격(이 컨테이너 32~42ms)만큼 뒤에 잡힌다. */
  chk(t1.first >= 500 && t1.first <= 600, '첫 도착 ' + t1.first + 'ms (93: 0.5~0.6s)');
  chk(t1.last >= 1200 && t1.last <= 1400, '마지막 도착 ' + t1.last + 'ms (93: 1.2~1.4s)');
  chk(t1.punchN >= 4, '알약 펄스 ' + t1.punchN + '회 (93: ≥4회 — «톡톡» 이 찰진 핵심)');
  chk(t1.pmax >= 1.06, '펄스 최대 확대 ×' + t1.pmax + ' (93: 폭을 줄이고 횟수를 늘린다)');
  chk(t1.pobs >= 5 && t1.phit/Math.max(1,t1.pobs) >= 0.6,
      '도착 창에서 알약이 커져 보이는 표본 ' + t1.phit + '/' + t1.pobs
      + ' = ' + Math.round(100*t1.phit/Math.max(1,t1.pobs)) + '% (캡처 리듬 93ms · ≥60%)');
  chk(t1.rollDone >= t1.first && t1.rollDone <= 1550,
      '숫자 롤링이 ' + t1.rollDone + 'ms 에 끝난다 — 첫 도착부터 마지막 도착까지 코인과 같이 오른다');
  chk(t1.rest === 0, '연출이 끝나면 레이어가 비워진다 (잔여 ' + t1.rest + ')');

  console.log('[2] 보상 수령 — 아이콘 수 · 퀘스트 행 위 관통 0');
  const t2 = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    /* 잔고를 세 자리로 둔다 — 128K 로 두면 보상 +400 이 `fmt` 축약에 삼켜져 «숫자가 한 번도
       안 바뀐다»(비평가 K ① 감점 1위). 도착이 숫자로 드러나는지도 여기서 같이 잰다. */
    S.dia = 300; S.gold = 900; fxHold.dia = 0; fxHold.gold = 0; await sleep(1700);
    S.quest.kill.base = -1e9;
    openQuest('rep'); await sleep(350);
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { err:'보상 받기 버튼 없음' };
    const row = b.closest('.qs-r'), par = row && row.parentElement;
    const sibs = par ? [].slice.call(par.children).filter(c => c !== row && c.getBoundingClientRect) : [];
    /* «관통» 판정은 **딤이 안 걸린** 형제 행만 본다. 리스트 하단 → 우상단 HUD 라 형제 행 위를
       지나는 것은 기하학적으로 불가피하고(58 11회차), 그래서 지나가는 동안 형제 행을 딤 처리해
       «저 퀘스트도 완료됐나» 오독을 없애는 것이 이 저장소의 처방이다. 93 은 3박자로 길어진
       연출 내내 그 딤이 유지되는지(FXSOLO 1360 = 마지막 도착 + 100ms)를 지킨다. */
    const gn = document.getElementById('goldN'), seen = new Set();
    b.click();
    let n0 = 0, cross = 0, frames = 0, per = { gold:0, dia:0 };
    for(let i=0;i<170;i++){
      /* 보상은 골드·다이아가 «같이» 들어와 묶음이 둘이다 — 개수는 **재화별**로 센다 */
      for(const k of ['gold','dia']){
        const c2 = fxFlies.filter(f => f.ui && f.cur === k).length;
        per[k] = Math.max(per[k], c2); n0 = Math.max(n0, c2);
      }
      seen.add(gn.textContent);
      const els = document.querySelectorAll('#fxl .fx-fly');
      if(els.length){
        frames++;
        for(const e of els){
          const r = e.getBoundingClientRect();
          const cx = r.left + r.width/2, cy = r.top + r.height/2;
          for(const c2 of sibs){
            if(c2.classList && c2.classList.contains('fx-dim')) continue;   /* 딤 중이면 오독 대상이 아니다 */
            const q = c2.getBoundingClientRect();
            if(!q.width || !q.height) continue;
            if(cx >= q.left && cx <= q.right && cy >= q.top && cy <= q.bottom){ cross++; break; }
          }
        }
      }
      await sleep(10);
    }
    await sleep(400);
    closeModal();
    return { n0, per, steps:seen.size, cross, frames, sibs:sibs.length };
  });
  chk(!t2.err, '퀘스트 «보상 받기» 클릭' + (t2.err ? ' — ' + t2.err : ''));
  /* 93 ① — 보상 수령은 골드·다이아가 «같이» 들어오는 경로라 **각자 상한 절반(8)** 이 맞다.
     한 재화만 들어오는 경로(획득·미션)는 [1] 에서 8~16 으로 따로 잰다. */
  chk(t2.per.gold === 8 && t2.per.dia === 8,
      '보상 수령 — 골드 ' + t2.per.gold + ' · 다이아 ' + t2.per.dia + ' (93 ①: 동시면 각자 상한 절반 8)');
  chk(t2.steps >= 4, '골드 카운터가 도착에 맞춰 ' + t2.steps + '단계로 오른다 (축약 표기에 삼켜지지 않는다)');
  chk(t2.sibs > 0, '형제 퀘스트 행 ' + t2.sibs + '개를 기준으로 잰다');
  chk(t2.cross === 0, '딤이 안 걸린 퀘스트 행 위 관통 ' + t2.cross
      + '회 (93 ④: 0 — 3박자 내내 형제 행 딤이 유지된다)');

  console.log('[2b] 2회차 회귀 — 궤적이 패널 «바깥» 으로 나간다(딤 무시) · 정지 프레임 0 · 숫자가 코인을 안 앞선다');
  const t2b = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.dia = 300; S.gold = 4e5; fxHold.dia = 0; fxHold.gold = 0; await sleep(1600);
    S.quest.kill.base = -1e9;
    openQuest('rep'); await sleep(400);
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { err:'보상 받기 버튼 없음' };
    const row = b.closest('.qs-r'), par = row && row.parentElement;
    const sibs = par ? [].slice.call(par.children).filter(c => c !== row) : [];
    const boxes = sibs.map(c => c.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
    const dn = document.getElementById('diaN');
    const d0 = S.dia;
    b.click();
    /* «딤이 걸려 있어도» 관통 0 이어야 한다 — 2회차의 3차 베지에가 실제로 패널 밖으로 나가는지 */
    let cross = 0, froze = 0, samp = 0, prev = new Map(), tot = 0, worstLead = -1;
    const where = [];
    let off = 0, backs = 0, worstLag = -1;
    let f3state = new Map(), f3prev = new Map();
    /* 정지 판정은 **렌더 프레임 단위**로 재야 한다 — 10ms 폴링은 rAF(이 컨테이너 32~42ms)보다
       빨라서 «아직 안 그려진 같은 좌표» 를 정지로 오독한다(43 교훈 1: 내 assert 부터 의심할 것). */
    const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
    for(let i=0;i<70;i++){
      const els = document.querySelectorAll('#fxl .fx-fly');
      if(fxFlies.filter(f => f.ui && f.cur === 'dia').length) tot = Math.max(tot, fxFlies.filter(f => f.ui && f.cur === 'dia').length);
      const cur = new Map();
      f3prev = f3state; f3state = new Map();
      for(const f of fxFlies) if(f.ui && f.el) f3state.set(f.el, f.t >= f.ha ? 'abs' : 'pre');
      for(const e of els){
        /* 착지한 아이콘(.fx-land2)은 알약 중심에 95ms 머무는 것이 «설계» 다 — 정지 판정에서 뺀다 */
        const landed = e.classList.contains('fx-land2') || e.classList.contains('fx-land');
        const r = e.getBoundingClientRect();
        const cx = r.left + r.width/2, cy = r.top + r.height/2;
        if(!landed) cur.set(e, [cx, cy]);
        const p = prev.get(e);
        if(p && !landed){ samp++; if(Math.abs(cx - p[0]) < 0.5 && Math.abs(cy - p[1]) < 0.5) froze++; }
        if(landed) continue;                              /* 알약 위 = 형제 행 밖이므로 관통 판정도 제외 */
        /* 5회차 — «중심» 이 아니라 **아이콘 상자**가 프레임 안에 있어야 한다(비평가 S ③:
           중심 1064 = 폭의 37% 가 화면 밖). 좌우 어느 쪽이든 1px 라도 잘리면 센다. */
        if(r.right > 1080.5 || r.left < -0.5) off++;
        const pv = prev.get(e);
        /* 머묾→흡수 전환 프레임은 세지 않는다 — 부유 사인이 위쪽(−7px)에 있다가 흡수 시작점(ay)으로
           돌아오는 것이라 «역주행» 이 아니다. **직전 프레임도 흡수** 였을 때만 센다. */
        if(pv && cy > pv[1] + 1.5 && f3state.get(e) === 'abs' && f3prev.get(e) === 'abs') backs++;
        for(const q of boxes) if(cx >= q.left && cx <= q.right && cy >= q.top && cy <= q.bottom){
          cross++; if(where.length < 6) where.push(Math.round(cx) + ',' + Math.round(cy) + '@' + i);
          break; }
      }
      prev = cur;
      /* 숫자 진행률이 도착 진행률을 앞서면 안 된다(H ④). 다이아 묶음으로 잰다. */
      if(tot){
        const flying = fxFlies.filter(f => f.ui && f.cur === 'dia').length;
        const arrived = (tot - flying)/tot;
        const shown = parseFloat(String(dn.textContent).replace(/[^\d.]/g, '')) || 0;
        const kk = String(dn.textContent).indexOf('K') >= 0 ? 1000 : 1;
        const prog = Math.max(0, Math.min(1, (shown*kk - d0)/Math.max(1, S.dia - d0)));
        if(arrived < 1){
          worstLead = Math.max(worstLead, prog - arrived);
          worstLag  = Math.max(worstLag,  arrived - prog);
        }
      }
      await nextFrame();
    }
    await sleep(500);
    closeModal();
    return { cross, froze, samp, tot, where, off, backs, worstLag:+worstLag.toFixed(3), worstLead:+worstLead.toFixed(3),
             boxes:boxes.map(r => [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]) };
  });
  chk(!t2b.err, '2회차 회귀 트리거' + (t2b.err ? ' — ' + t2b.err : ''));
  /* 4회차 — «딤을 무시하고» 세도 **0** 이다. 3회차까지 1~4프레임 남던 스침(x940~948 · 행 우변 949)은
     탈출 목표(FX3_OUTM 90→176)와 최대 x 상한(FRAME_W−34→−8)을 올려 곡선 전체를 오른쪽으로 민 것으로
     없어졌다. 1회차 151회 → 4회차 0회. (딤 기준 0 은 위 [2] 의 하드 요건으로 따로 지킨다) */
  /* 5회차 — 상한을 1 → 4 로 되돌린다. **아이콘이 프레임 밖으로 잘리는 것을 없애는 대가**다.
     4회차는 최대 x 를 FRAME_W−8 까지 밀어 관통을 1 로 눌렀는데, 그러면 아이콘 중심이 1072 라
     폭의 34~37% 가 화면 밖으로 잘린 채 645ms 를 난다(비평가 S ③ 실측 8프레임 연속).
     상한을 FRAME_W−40 으로 내리면 잘림은 0 이 되고 스침이 4프레임으로 는다.
     **기하학적 벽**: 행 카드 우변 949 + 아이콘 반경 27 = 976 부터, 중심 상한 1041 까지 **65px** 뿐인데
     골드 알약은 x583 — 행 x 범위 «안» 이다. 내려오는 마지막 구간이 그 65px 복도를 통과하는 것은
     제어점을 어떻게 잡아도 없앨 수 없다(수치 탐색: 최선 K2 0.75 에서도 표본의 4.5%).
     그래서 저장소의 처방은 딤이고, 그 «딤 기준 0» 이 위 [2] 의 하드 요건이다. 잘림(항상 보임) 과
     스침(딤 위, 4프레임) 중 잘림을 없애는 쪽이 맞다. */
  chk(t2b.cross <= 1, '형제 퀘스트 행 위 관통 ' + t2b.cross + '회 — **딤을 무시하고** 세도 ≤1 (1회차 151 · 5회차 4 · 6회차 두 구간 경로)'
      + (t2b.cross ? ' · 지점 ' + (t2b.where || []).join(' / ') + ' · 행 ' + JSON.stringify(t2b.boxes) : ''));
  chk(t2b.samp > 200 && t2b.froze/t2b.samp <= 0.02,
      '정지 프레임 ' + t2b.froze + '/' + t2b.samp + ' = '
      + (t2b.samp ? (100*t2b.froze/t2b.samp).toFixed(1) : '-') + '% (렌더 프레임 기준 ≤2%)');
  chk(t2b.backs === 0, '흡수 중 «아래로» 되돌아가는 프레임 ' + t2b.backs
      + '회 (3회차: 수평 슬링으로 낙차 0 — 2회차는 최대 54px 내려갔다)');
  chk(t2b.off === 0, '아이콘이 프레임 밖으로 잘리는 프레임 ' + t2b.off + '회 (중심이 아니라 **상자** 기준 · FX3_XCAP = FRAME_W−40)');
  chk(t2b.worstLead <= 0.10,
      '숫자가 도착보다 최대 ' + Math.round(t2b.worstLead*100) + '%p 앞선다 (도착 계단 — ≤10%p)');
  /* 5회차 — «앞서지 않는다» 만 재면 «아예 안 오른다» 를 못 잡는다. 4회차가 정확히 그랬다:
     도착 87.5% 인데 숫자 0%(비평가 R ①). 뒤처짐도 같이 잰다. */
  chk(t2b.worstLag <= 0.20,
      '숫자가 도착보다 최대 ' + Math.round(t2b.worstLag*100) + '%p 뒤처진다 (≤20%p — 4회차는 87.5%p 였다)');

  console.log('[3] 전투 발(킬 골드)은 변화 0 — 개수 3~6 · #fxlc · 0.8초 안');
  const t3 = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    document.querySelectorAll('#fxl .fx-fly, #fxlc .fx-fly').forEach(e => e.remove());
    fxFlies.length = 0;
    S.gold = 5e5; fxHold.gold = 0;
    await sleep(1900);                                 /* 대입 자체가 «증가» 라 UI 발 3박자(1.28s)가 먼저 돈다 */
    document.querySelectorAll('#fxl .fx-fly, #fxlc .fx-fly').forEach(e => e.remove());
    fxFlies.length = 0;
    const t0 = performance.now();
    fxAt(fxWorld(player.x, player.y), 'combat');
    S.gold += 4000;
    let n0 = 0, ui = 0, lc = 0, l = 0, last = -1, prev = 0;
    while(performance.now() - t0 < 1500){
      const c = fxFlies.filter(f => !f.ui).length;
      n0 = Math.max(n0, c);
      ui += fxFlies.filter(f => f.ui).length;
      lc = Math.max(lc, document.querySelectorAll('#fxlc .fx-fly').length);
      l  = Math.max(l,  document.querySelectorAll('#fxl .fx-fly').length);
      if(prev && c < prev) last = performance.now() - t0;
      prev = c;
      await sleep(8);
    }
    return { n0, ui, lc, l, last:Math.round(last) };
  });
  chk(t3.n0 >= 3 && t3.n0 <= 6, '전투 발 아이콘 ' + t3.n0 + '개 (77 이전 그대로 3~6개)');
  chk(t3.ui === 0, '전투 발에는 3박자가 안 붙는다 (ui 태그 관측 ' + t3.ui + ')');
  chk(t3.lc > 0 && t3.l === 0, '팝업 «아래» 레이어 #fxlc 에 그린다 (fxlc ' + t3.lc + ' · fxl ' + t3.l + ')');
  chk(t3.last > 0 && t3.last <= 800, '전투 발 마지막 도착 ' + t3.last + 'ms (현행 속도 유지 ≤800ms)');

  console.log('[4] 골드·다이아 동시 — 각자 상한 절반');
  const t4 = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    document.querySelectorAll('#fxl .fx-fly, #fxlc .fx-fly').forEach(e => e.remove());
    fxFlies.length = 0;
    S.gold = 1e6; S.dia = 1000; fxHold.gold = 0; fxHold.dia = 0; await sleep(1500);
    fxAt({ x:540, y:1400 });
    S.gold += 5e6; S.dia += 5000;
    let g = 0, d = 0, tot = 0;
    for(let i=0;i<120;i++){
      g = Math.max(g, fxFlies.filter(f => f.ui && f.cur === 'gold').length);
      d = Math.max(d, fxFlies.filter(f => f.ui && f.cur === 'dia').length);
      tot = Math.max(tot, fxFlies.length);
      await sleep(8);
    }
    await sleep(1600);
    return { g, d, tot, rest:fxFlies.length };
  });
  chk(t4.g > 0 && t4.d > 0, '두 재화가 같이 난다 (골드 ' + t4.g + ' · 다이아 ' + t4.d + ')');
  chk(t4.g <= 16 && t4.d <= 16, '각 묶음 ≤16개');
  chk(t4.tot <= 32, '공중 총합 ' + t4.tot + '개 ≤ FXFLY_MAX 32');
  chk(Math.min(t4.g, t4.d) <= 8, '뒤 묶음은 상한 절반(8) 로 줄인다 — 작은 쪽 ' + Math.min(t4.g, t4.d) + '개');
  chk(t4.rest === 0, '연출이 끝나면 잔여 0');

  await browser.close();
  if(errs.length){ console.log('\n콘솔/런타임 에러:'); errs.slice(0,10).forEach(e => bad(e)); }
  console.log('\n' + (fails.length ? 'VERIFY93 FAIL — ' + fails.length + '건' : 'VERIFY93 PASS'));
  process.exit(fails.length ? 1 : 0);
})();
