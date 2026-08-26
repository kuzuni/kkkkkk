#!/usr/bin/env node
/* 125 — 이모지 «잉크 bbox» 실측기
 *
 *   node tools/ink125.js
 *
 * 화폐 이모지를 이미지로 갈아 끼울 때 «이미지를 몇 px 로 둬야 옛 자리를 그대로 차지하는가» 를
 * 정하려면 글리프의 **잉크** 크기가 필요하다(em 박스가 아니다 — 컬러 이모지는 font-size 보다 크게 그려진다).
 * 캔버스에 글자를 찍고 흰 배경이 아닌 픽셀의 bbox 를 재서 돌려준다.
 *
 * 실측(2026-08-26): 🪙 fs46 → 50×51 · 💎 fs42 → 47×42 · 🪙 fs52 → 57×58 · 🔮 fs46 → 43×51
 *   ⇒ 잉크 ≈ font-size × 1.10 (💎 만 가로 1.12 · 세로 1.00 의 «납작한» 글리프)
 *   ⇒ 8방향 text-shadow(2.5px)가 걸린 자리는 실루엣이 잉크 + 5px
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
(async () => {
  const b = await launch(chromium, { args:['--no-sandbox'] });
  const p = await b.newPage();
  await p.setContent('<body style="margin:0;background:#fff"></body>');
  const out = await p.evaluate(() => {
    const measure = (ch, fs, sx) => {
      const c = document.createElement('canvas'); c.width = 300; c.height = 300;
      const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0,0,300,300);
      x.font = fs + 'px "Malgun Gothic",sans-serif'; x.textBaseline = 'middle';
      x.fillText(ch, 100, 150);
      const d = x.getImageData(0,0,300,300).data;
      let x0=1e9,y0=1e9,x1=-1,y1=-1;
      for(let yy=0;yy<300;yy++) for(let xx=0;xx<300;xx++){
        const i=(yy*300+xx)*4;
        if(d[i]<250||d[i+1]<250||d[i+2]<250){ if(xx<x0)x0=xx; if(xx>x1)x1=xx; if(yy<y0)y0=yy; if(yy>y1)y1=yy; }
      }
      return { ch, fs, w:(x1-x0+1)*(sx||1), h:y1-y0+1 };
    };
    return [ measure('🪙',46), measure('💎',42), measure('🪙',52), measure('💎',59,0.86), measure('🔮',46), measure('🪙',33), measure('💎',34) ];
  });
  console.log(JSON.stringify(out));
  await b.close();
})();
