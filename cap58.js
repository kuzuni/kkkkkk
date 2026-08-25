#!/usr/bin/env node
/* 58 UI 연출 — 연속 프레임 캡처 (ROUTINE [3]-(다): 트리거 직후 80~100ms 간격 6~8장)
 *
 *   node cap58.js [라운드]      # 기본 r2 → docs/review/58-<라운드>-<씬>-<n>.png
 *
 * ⚠ **`page.screenshot()` 로는 연출을 채점할 수 없다** (2026-08-25, 1회차가 이걸로 통째로 날아갔다).
 *   이 컨테이너에서 1080×2280 한 장에 **337~629ms** 가 걸린다. «90ms 간격» 이라고 적어 놓아도
 *   실제 간격은 430~720ms 라, 0.3~0.8초짜리 연출이 8프레임 중 1~2장에만 걸린다.
 *   비평가 2명이 독립적으로 «연출 없음 · 0점» 을 냈는데 틀린 것은 구현이 아니라 **캡처 절차**였다
 *   (04 교훈 1 «캡처 상태가 다르면 그 회차 비평은 통째로 무효»).
 *   → **CDP Page.startScreencast** 로 렌더된 프레임을 «타임스탬프째로» 받아 두고,
 *      트리거 기준 0·90·…·630ms 에 가장 가까운 8장을 골라 저장한다. 실제 오차도 같이 찍는다.
 *
 * 결정성(41 교훈 4 · 42 교훈 1·2 · 28 교훈 3):
 *   - rAF 가 도는 것을 먼저 확인하고 주입한다. 주입이 안 붙으면 스스로 throw.
 *   - 적은 «비우지» 말고 멀리 주차(비우면 파도 클리어로 상태가 리셋된다) + player.inv 로 넉백 제거.
 *   - `step()` 을 무력화해 게임 로직을 정지시킨다 — 캔버스의 스킬 이펙트·경험치·자동 레벨업이
 *     프레임마다 달라지면 «연출 때문에 바뀐 것» 과 구분이 안 된다. draw()/fxTick() 은 그대로 돈다.
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');

const ROUND = process.argv[2] || 'r2';
const OUT = path.resolve(__dirname, 'docs', 'review');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const WANT = [0, 90, 180, 270, 360, 450, 540, 630];      /* 트리거 기준 목표 시각(ms) */

/* ── 스크린캐스트 수집기 ── */
function recorder(cdp){
  const buf = [];
  cdp.on('Page.screencastFrame', async (e) => {
    buf.push({ t: e.metadata.timestamp * 1000, data: e.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }); } catch(_){}
  });
  return buf;
}
function pick(buf, t0, tag){
  const rel = buf.map(f => ({ dt: f.t - t0, data: f.data })).filter(f => f.dt >= -60);
  if(rel.length < WANT.length) throw new Error(`${tag}: 렌더 프레임이 ${rel.length}장뿐이다 — 스크린캐스트 실패`);
  const out = [];
  for(const w of WANT){
    let best = rel[0];
    for(const f of rel) if(Math.abs(f.dt - w) < Math.abs(best.dt - w)) best = f;
    out.push({ want:w, got:Math.round(best.dt), data:best.data });
  }
  out.forEach((f, i) => fs.writeFileSync(path.join(OUT, `58-${ROUND}-${tag}-${i+1}.png`), Buffer.from(f.data, 'base64')));
  const worst = Math.max(...out.map(f => Math.abs(f.got - f.want)));
  console.log(`  ✓ ${tag}: 8장 · 실제 t = ${out.map(f => f.got).join(', ')}ms (목표 대비 최대 ±${worst}ms, 원본 ${rel.length}프레임)`);
  return worst;
}

async function ensureLoop(page){
  const ok = await page.evaluate(() => new Promise(res => {
    let n = 0;
    const t = setInterval(() => { if(++n > 40){ clearInterval(t); res(false); } }, 25);
    const s = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => { clearInterval(t); res(performance.now() - s < 500); }));
  }));
  if(!ok) throw new Error('rAF 루프가 돌지 않는다 — 캡처가 결정적이지 않다');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if(m.type() === 'error') errs.push(m.text()); });

  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);
  await ensureLoop(page);

  /* 게임을 «정지» 시킨다 — 연출만 움직이게 */
  await page.evaluate(() => {
    player.inv = 1e9;
    for(const e of enemies){ e.x = 1; e.y = 1; }        /* 배열을 비우면 파도 클리어 (42 교훈 1) */
    parts.length = 0; nums.length = 0; shots.length = 0; zones.length = 0; booms.length = 0; bolts.length = 0;
    window.step = () => {};                            /* 로직 정지 — 렌더·fx 는 계속 돈다 */
  });
  await page.waitForTimeout(400);

  const cdp = await ctx.newCDPSession(page);
  const buf = recorder(cdp);
  await cdp.send('Page.startScreencast', { format:'png', maxWidth:1080, maxHeight:2280, everyNthFrame:1 });
  await page.waitForTimeout(300);

  const run = async (tag, trigger, waitMs) => {
    buf.length = 0;
    const t0 = await page.evaluate(trigger);
    if(t0 && t0.err) throw new Error(`${tag}: ${t0.err}`);
    await page.waitForTimeout(waitMs || 1100);
    return pick(buf, t0.t, tag);
  };

  /* ── 씬 1: 재화 획득 (전투 드랍 지점 → HUD 골드 알약) ── */
  /* 실제 획득 경로와 같은 «S 증가» 로 트리거하되, t0 는 «비행이 시작된 순간» 으로 잡는다 —
     fxWatch 의 묶음 디바운스(180ms) 만큼 앞이 비면 8프레임의 앞 두 장이 정지 화면으로 낭비된다. */
  await run('gain', async () => {
    const p = fxWorld(player.x + 120, player.y - 40);
    fxAt(p);
    S.gold += 128000;
    const t0 = await new Promise(res => {
      const iv = setInterval(() => { if(document.querySelector('#fxl .fx-fly')){ clearInterval(iv); res(Date.now()); } }, 8);
      setTimeout(() => { clearInterval(iv); res(0); }, 1500);
    });
    return t0 ? { t:t0 } : { err:'비행 아이콘이 생성되지 않았다 — 트리거 실패' };
  });

  /* ── 씬 2: 보상 수령 (퀘스트) ── */
  await page.evaluate(() => { S.quest.kill.base = -1e9; openQuest('rep'); });
  await page.waitForTimeout(400);
  await run('quest', () => {
    const b = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!b) return { err:'퀘스트 «보상 받기» 버튼을 찾지 못했다' };
    b.click();                                         /* 페이지 안에서 resolve+click (25 교훈 5) */
    return { t: Date.now() };
  }, 1400);

  /* ── 씬 3: 강화 성공 (훈련 카드) ── */
  await page.evaluate(() => { closeModal(); S.gold = 1e13; openTrain(); });
  await page.waitForTimeout(500);
  await run('upg', () => {
    const c = document.querySelector('#trw [data-tr]');
    if(!c) return { err:'훈련 카드를 찾지 못했다' };
    c.click();
    return { t: Date.now() };
  });

  await cdp.send('Page.stopScreencast').catch(() => {});
  await browser.close();
  if(errs.length){ console.log('콘솔 에러:'); errs.slice(0,8).forEach(e => console.log('  ! ' + e)); process.exit(1); }
  console.log('\ncap58 OK — docs/review/58-' + ROUND + '-*.png');
})().catch(e => { console.error('cap58 실패:', e.message); process.exit(1); });
