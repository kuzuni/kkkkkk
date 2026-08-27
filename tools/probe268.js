/* 작업 268 사전 측정 — 08 상세 껍데기 `.sk-ic`(149x149, font-size 86) 안에서
   «지금 그 자리를 차지하고 있는 이모지 잉크» 의 bbox 를 잰다.

   174 의 규칙 그대로다: 펫 그림을 스프라이트 캔버스로 바꿀 때 캔버스 크기는 «칸 박스» 가 아니라
   «이모지 잉크 박스» 여야 한다(칸 박스를 쓰면 종횡이 먼 dragon/robo 가 림을 뚫는다).
   그래서 `PET_TH.det` 를 정하기 전에 08 `.sk-ic` 안의 폴백 이모지(🐉🐦🤖) 잉크를 먼저 잰다.
   비교용으로 장비·유물 아이콘 몇 개도 같이 잰다(같은 자리를 쓰는 다른 계열).

   실행: node tools/probe268.js */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForFunction(() => typeof PETS !== 'undefined' && PETS.length > 0);
  await p.waitForTimeout(1200);

  const out = await p.evaluate(() => {
    /* `.sk-ic` 와 픽셀까지 같은 임시 박스를 만들어 이모지를 하나씩 앉히고 잉크를 잰다.
       (실제 팝업을 열면 이모지가 캔버스로 바뀔 수도 있어 «이모지 자리» 를 못 잰다) */
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;opacity:0;pointer-events:none';
    const box = document.createElement('div');
    box.className = 'sk-ic';
    host.appendChild(box); document.body.appendChild(host);

    const cs = getComputedStyle(box);
    const meta = { w: box.offsetWidth, h: box.offsetHeight, fs: cs.fontSize, align: cs.alignItems };

    /* 잉크 측정은 캔버스에 같은 폰트로 다시 그려서 한다 — DOM 글리프의 알파를 직접 못 읽으므로
       `.sk-ic` 가 실제로 쓰는 font-size/font-family 를 그대로 옮겨 2D 컨텍스트에서 잰다. */
    const cv = document.createElement('canvas');
    cv.width = 400; cv.height = 400;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;

    const ink = (ch) => {
      g.clearRect(0, 0, 400, 400);
      g.font = font;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      g.fillText(ch, 200, 200);
      const d = g.getImageData(0, 0, 400, 400).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
      for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) {
        if (d[(y * 400 + x) * 4 + 3] < 8) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
        n++;
      }
      return n ? { w: x1 - x0 + 1, h: y1 - y0 + 1, px: n } : null;
    };

    const pets = Object.keys(UPR_FB).map(k => ({ k, ch: UPR_FB[k], ink: ink(UPR_FB[k]) }));
    const eqs = SLOTS.map(s => ({ k: 'equip:' + s.k, ch: s.ic, ink: ink(s.ic) }));
    const eqi = EQUIPS.slice(0, 6).map(e => ({ k: 'eq:' + e.id, ch: e.ic, ink: ink(e.ic) }));
    const rls = RELICS.map(r => ({ k: 'rl:' + r.id, ch: r.ic, ink: ink(r.ic) }));
    host.remove();
    return { meta, rows: [...pets, ...eqs, ...eqi, ...rls] };
  });

  console.log('.sk-ic 박스', out.meta);
  console.log('');
  console.log('키'.padEnd(16), '글리프', '잉크 w×h'.padStart(12), '픽셀'.padStart(8));
  out.rows.forEach(r => console.log(
    r.k.padEnd(16), (r.ch || '').padEnd(5),
    r.ink ? (r.ink.w + '×' + r.ink.h).padStart(12) : '(없음)'.padStart(12),
    r.ink ? String(r.ink.px).padStart(8) : ''));

  const pets = out.rows.filter(r => ['dragon', 'bird', 'robo'].includes(r.k) && r.ink);
  if (pets.length) {
    const w = Math.max(...pets.map(r => r.ink.w)), h = Math.max(...pets.map(r => r.ink.h));
    console.log('\n펫 폴백 이모지 잉크 최대 — w ' + w + ' · h ' + h + '  → PET_TH.det 후보 { w:' + w + ', h:' + h + ' }');
  }
  await browser.close();
})();
