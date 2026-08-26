#!/usr/bin/env node
/* 93 14회차 — **하네스 자체를 잰다.** (LESSONS «작업 93»: 하네스의 실시간성도 측정 대상이다)
 *
 * 증상: `cap93.js` 가 +62ms·+188ms 로 라벨한 프레임에 코인이 **한 개도 없다**(비평가 AM 이
 *   «사각 234ms» 로 1순위 감점, 11회차는 «스폰 지연 182ms» 로 게임 코드를 고쳤다).
 *   그런데 같은 빌드를 DOM 으로 재면 16/16 이 **46ms** 부터 opacity 1 · 폭 38~45px 이고,
 *   `page.screenshot()` 를 트리거 +98ms 에 직접 찍으면 그 자리에 금색 화소가 **128 → 6968** 개다.
 *   → 게임은 그리는데 **스크린캐스트 프레임의 시각 라벨이 틀렸다**는 뜻이다.
 *
 * 재는 법: 페이지에 «색으로 시각을 쓰는 시계» 를 붙인다. rAF 마다 좌상단 200×200 블록의
 *   배경색을 `rgb(v, 255-v, 40)` 로 칠하고 `v = round(경과ms / 8)` 로 둔다(0~2040ms).
 *   그 다음 cap93 과 **똑같이** CDP 스크린캐스트를 받아, 프레임마다
 *     ⓐ metadata.timestamp 로 계산한 라벨 시각 (= cap93 이 믿는 값)
 *     ⓑ 블록 색에서 디코드한 **실제 그려진 시각**
 *   을 나란히 찍는다. ⓐ−ⓑ 가 «라벨 오차» 다.                                                  */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const URL = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
const OUT = path.resolve(__dirname, 'docs', 'review', '_h93');
function pwLaunch(){ const fs2 = require('fs'); return chromium.launch().catch(e => {
  for(const p of [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium']){ try { if(p && fs2.existsSync(p)) return chromium.launch({ executablePath:p }); } catch(_){} }
  throw e; }); }

(async () => {
  fs.rmSync(OUT, { recursive:true, force:true }); fs.mkdirSync(OUT, { recursive:true });
  const browser = await pwLaunch();
  const ctx = await browser.newContext({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil:'load' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { player.inv = 1e9; for(const e of enemies){ e.x = 1; e.y = 1; } window.step = () => {}; });

  const cdp = await ctx.newCDPSession(page);
  const buf = [];
  cdp.on('Page.screencastFrame', async (e) => {
    buf.push({ t: e.metadata.timestamp * 1000, data: e.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }); } catch(_){}
  });
  /* cap93 과 같은 설정 */
  await cdp.send('Page.startScreencast', { format:'jpeg', quality:55, everyNthFrame:1 });

  /* 색 시계 + 트리거 */
  const t0 = await page.evaluate(async () => {
    S.gold = 0; fxSeen.gold = 0; fxDisp.gold = 0; fxAcc.gold = 0; fxHold.gold = 0;
    await new Promise(r => setTimeout(r, 600));
    const c = document.createElement('div');
    c.id = 'h93clock';
    /* ⚠ `#wrap` 계열에 transform 이 걸려 있으면 body 아래의 position:fixed 는 그 요소 기준이 된다.
       (실제로 첫 시도가 이것 때문에 화면 밖으로 밀려 HUD 색을 읽었다) → **documentElement 에 붙인다.** */
    c.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:200px;z-index:2147483647;background:#000;pointer-events:none';
    document.documentElement.appendChild(c);
    const t = Date.now(), p0 = performance.now();
    (function tick(){
      const v = Math.max(0, Math.min(255, Math.round((performance.now() - p0) / 8)));
      c.style.background = `rgb(${v},${255-v},40)`;
      if(performance.now() - p0 < 2100) requestAnimationFrame(tick);
    })();
    /* 시계를 먼저 한 프레임 돌린 뒤 트리거한다 */
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const tTrig = Date.now();
    fxAt(fxWorld(player.x + 12, player.y - 20));
    S.gold += 128000;
    return { t:tTrig, p0off:tTrig - t };     /* 시계 원점 대비 트리거 시각(ms) */
  });
  await page.waitForTimeout(2000);
  await cdp.send('Page.stopScreencast').catch(() => {});
  await browser.close();

  buf.forEach((f, i) => fs.writeFileSync(path.join(OUT, `f${String(i).padStart(3,'0')}.jpg`), Buffer.from(f.data, 'base64')));
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({
    trig: t0.t, clockOffset: t0.p0off,
    frames: buf.map((f, i) => ({ i, label: Math.round(f.t - t0.t) }))
  }, null, 1));
  console.log(`프레임 ${buf.length}장 → ${OUT}`);
  console.log(`트리거는 색시계 원점 +${t0.p0off}ms 지점이다 (디코드값 v → 실제시각 = v*8 − ${t0.p0off} ms, 트리거 기준)`);
})().catch(e => { console.error('probe93j 실패:', e.message); process.exit(1); });
