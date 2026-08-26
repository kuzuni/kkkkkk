/* 58 23회차 — 비평가 AN·AP 가 **독립적으로** 낸 ① 축 최대 감점을 코드로 다시 잰다.
   두 사람 다 «quest f2(t=79) 와 f3(t=185) 가 바이트 단위로 동일하고, 퍼짐이 스폰 +86ms 기준
   293ms 늦은 f5(379) 에야 처음 보인다» 고 적었다. 정답표는 t=185 에 비행 아이콘 16개라고
   적어 놓았으므로 **셋 중 하나가 틀렸다**: 게임 / 정답표 / 캡처.
   → 여기서 «요소가 몇 개 있나» 가 아니라 **«화면에 그려지는가»**(opacity · transform · 크기)를
     10ms 간격으로 찍는다. 22회차 교훈: «비평가 둘이 같은 걸 적으면 대개 하네스가 원인이다». */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  const out = await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.dia = 300; S.gold = 4e5; fxHold.dia = 0; fxHold.gold = 0; await sleep(1600);
    S.quest.kill.base = -1e9;
    openQuest('rep'); await sleep(400);
    const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!btn) return { err:'보상 받기 버튼 없음' };
    const t0 = performance.now();
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true, cancelable:true }));
    btn.dispatchEvent(new PointerEvent('pointerup', { bubbles:true, cancelable:true }));
    btn.click();
    const rows = [];
    for(let i=0;i<60;i++){
      const els = document.querySelectorAll('#fxl .fx-fly');
      let vis = 0, opSum = 0, minOp = 9, maxOp = -1, box = null;
      for(const e of els){
        const cs = getComputedStyle(e);
        const op = parseFloat(cs.opacity);
        const r = e.getBoundingClientRect();
        opSum += op; minOp = Math.min(minOp, op); maxOp = Math.max(maxOp, op);
        if(op > 0.02 && r.width > 1 && r.height > 1){
          vis++;
          box = box ? { x0:Math.min(box.x0, r.left), y0:Math.min(box.y0, r.top),
                        x1:Math.max(box.x1, r.right), y1:Math.max(box.y1, r.bottom) }
                    : { x0:r.left, y0:r.top, x1:r.right, y1:r.bottom };
        }
      }
      rows.push({ t:Math.round(performance.now() - t0), n:els.length, vis,
        minOp:els.length ? +minOp.toFixed(2) : null, maxOp:els.length ? +maxOp.toFixed(2) : null,
        w: box ? Math.round(box.x1 - box.x0) : 0, h: box ? Math.round(box.y1 - box.y0) : 0 });
      await sleep(10);
    }
    return { rows, FX3_SPREAD, FX3_HOLD0, FX3_HOLD1 };
  });
  if(out.err){ console.log(out.err); await b.close(); return; }
  console.log('t(ms) 요소수 보이는수 최소op 최대op 뭉치w×h   (퍼짐 ' + out.FX3_SPREAD + 's · 머묾 ' + out.FX3_HOLD0 + '~' + out.FX3_HOLD1 + 's)');
  for(const r of out.rows) if(r.t % 20 < 12)
    console.log(String(r.t).padStart(5) + String(r.n).padStart(6) + String(r.vis).padStart(8)
      + String(r.minOp).padStart(8) + String(r.maxOp).padStart(8) + '  ' + r.w + '×' + r.h);
  await b.close();
})();
