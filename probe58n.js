/* 58 23회차 진단 — 흡수 leg1 «수평 주행 y» 가 지나는 밴드를 프레임 좌표로 실측한다.
   22회차 핸드오프가 «행 사이 여백(1156~1176)에서 수평 탈출» 을 처방했지만, 그 처방은
   verify93 [2b] 의 «흡수 중 아래로 되돌아가는 프레임 0» 을 고려하지 않았다 —
   흡수가 시작된 뒤 y 를 내리면 그 게이트가 먼저 깨진다.
   → 여기서 «출발 행 안에서 콘텐츠가 없는 밴드» 를 찾는다(퍼짐(a) 단계에 내려가면
     흡수 전이므로 backs 판정 대상이 아니고, 형제 행도 안 건드린다). */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport:{ width:1080, height:2280 }, deviceScaleFactor:1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  const out = await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    S.quest.kill.base = -1e9;
    openQuest('rep'); await sleep(450);
    const btn = document.querySelector('#mbox [data-q="kill"]:not([disabled])');
    if(!btn) return { err:'보상 받기 버튼 없음' };
    const row = btn.closest('.qs-r');
    const R = fxRect(row);
    const rows = [].slice.call(row.parentElement.children).map(c => fxRect(c)).filter(Boolean);
    /* 행 안 «콘텐츠» 후손의 프레임 좌표 bbox */
    const kids = [];
    for(const el of row.querySelectorAll('*')){
      const r = fxRect(el);
      if(!r || r.w < 4 || r.h < 4) continue;
      const cs = getComputedStyle(el);
      if(cs.visibility === 'hidden' || cs.opacity === '0') continue;
      kids.push({ cls:(el.className || el.tagName) + '', x:Math.round(r.x), y:Math.round(r.y),
                  w:Math.round(r.w), h:Math.round(r.h), b:Math.round(r.y + r.h) });
    }
    /* 행 세로 1px 마다 «콘텐츠가 덮는 x 구간» 이 있는지 — 없는 줄이 탈출 밴드다 */
    const free = [];
    for(let y = Math.round(R.y); y < Math.round(R.y + R.h); y++){
      let hit = false;
      for(const k of kids){ if(y >= k.y && y < k.b){ hit = true; break; } }
      if(!hit) free.push(y);
    }
    /* 연속 구간으로 묶기 */
    const bands = [];
    for(const y of free){
      const last = bands[bands.length - 1];
      if(last && y === last[1] + 1) last[1] = y; else bands.push([y, y]);
    }
    /* 퍼짐 끝점 ay 가 실제로 어디에 떨어지는지 — 현재 상수로 표본 200개 */
    const src = fxPt(btn);
    const sam = [];
    for(let i=0;i<200;i++){
      const a = FX3_PA0 + ((i + 0.5)/200)*(FX3_PA1 - FX3_PA0);
      const rr = FX3_PR0 + ((i*7)%200 + 0.5)/200*(FX3_PR1 - FX3_PR0);
      sam.push(src.y + Math.sin(a)*rr);
    }
    sam.sort((p,q) => p - q);
    return {
      row:{ x:Math.round(R.x), y:Math.round(R.y), w:Math.round(R.w), h:Math.round(R.h), b:Math.round(R.y + R.h) },
      rows: rows.map(r => Math.round(r.y) + '~' + Math.round(r.y + r.h)),
      pitch: rows.length > 1 ? Math.round(rows[1].y - rows[0].y) : null,
      kids: kids.sort((p,q) => p.y - q.y),
      bands: bands.filter(bd => bd[1] - bd[0] >= 3).map(bd => bd[0] + '~' + bd[1] + ' (' + (bd[1]-bd[0]+1) + 'px)'),
      src:{ x:Math.round(src.x), y:Math.round(src.y) },
      ayMin: Math.round(sam[0]), ayMed: Math.round(sam[100]), ayMax: Math.round(sam[199]),
      fan:{ PA0:FX3_PA0, PA1:FX3_PA1, PR0:FX3_PR0, PR1:FX3_PR1 }
    };
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
