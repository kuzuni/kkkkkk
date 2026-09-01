/* 683 2회차 — «자와 눈이 다른 값을 낸다» 를 가르는 자 (471 교훈 · 350 «찍힌 픽셀» 처방)
 *
 *   node tools/probe683b.js [파일…]        기본 docs/shots/683-r1-B1.png 외 전부
 *
 * 1회차 채점에서 비평가 둘이 **독립으로** 같은 말을 했다: «B1(420ms) 프레임에 획득 알이 한 개도
 * 안 찍혔는데 하네스 정답표는 6알이라고 적었다 — 계측기부터 틀렸다».
 * 제품을 고치기 전에 **어느 쪽이 옳은지** 먼저 가른다(471: 두 자가 다르면 «왜 다른가» 가 먼저다).
 *
 * 방법 — 350 처방 그대로 **찍힌 PNG 를 페이지로 되돌려** 캔버스에서 읽는다.
 *   ① PNG 를 data URL 로 캔버스에 그리고 ② 10칸 카드 상자마다 «배경과 다른 픽셀» 을 센다
 *   ③ 같은 프레임의 «당첨 카드» 와 «나머지 아홉 칸» 을 대조한다(대조군이 있어야 «다르다» 가 뜻이 있다).
 * 카드 자리는 손으로 안 적는다 — `RW_POS`·격자 기하를 제품에서 그대로 읽어 프레임 좌표로 만든다.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SHOTS = path.resolve(__dirname, '../docs/shots');
const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');

const files = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(SHOTS).filter(f => /^683-r1-[AB]\d+\.png$/.test(f)).sort()
      .map(f => path.join(SHOTS, f));

(async () => {
  const browser = await launch(chromium);
  const p = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForFunction(() => typeof openRelw === 'function');
  await p.waitForTimeout(800);
  /* 카드 상자를 제품에게 묻는다(손으로 안 적는다) */
  const boxes = await p.evaluate(() => {
    S.relic = 1e9; openRelw();
    const out = {};
    for (const el of document.querySelectorAll('#rwGrid [data-rw]')) {
      const b = el.getBoundingClientRect();
      out[el.getAttribute('data-rw')] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    }
    return out;
  });
  console.log('카드 상자(화면 px):');
  for (const k of Object.keys(boxes)) console.log('  ' + k + ' ' + JSON.stringify(boxes[k]));

  console.log('\n각 프레임 — 카드 상자 안 «밝은 잉크» 픽셀 수(L>200 & 배경과 Δ>40)');
  console.log('| 파일 | ' + Object.keys(boxes).join(' | ') + ' | 최대 칸 |');
  console.log('|---|' + Object.keys(boxes).map(() => '---').join('|') + '|---|');
  for (const f of files) {
    const buf = fs.readFileSync(f);
    const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
    const res = await p.evaluate(async ({ url, boxes }) => {
      const img = new Image();
      await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const out = {};
      for (const k of Object.keys(boxes)) {
        const b = boxes[k];
        const d = g.getImageData(b.x, b.y, b.w, b.h).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          if (L > 200) n++;
        }
        out[k] = n;
      }
      return out;
    }, { url: dataUrl, boxes });
    const ks = Object.keys(boxes);
    const vals = ks.map(k => res[k]);
    const mx = ks[vals.indexOf(Math.max(...vals))];
    console.log('| ' + path.basename(f) + ' | ' + vals.join(' | ') + ' | **' + mx + '** |');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
