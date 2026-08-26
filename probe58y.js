/* 58 26회차 — 25차 비평 2인 공통 ③(«씬 C 델타 플로터가 카드 라벨을 100% 덮는다»
   AS ④-1 «플로터 x[122,277] y[1664,1711] 이 라벨 x[159,237] y[1669,1705] 를 100% 포함» ·
   AT ④-1 «f7(550ms) 완전 중첩») + 그 부작용(AS ④-2 · AT ④-2 «`.fx-hush` 가 라벨을 뒤로 문 게
   아니라 지웠다 — 초록 채도 픽셀 949 → 0»).
   **고치기 전에** 훈련 카드의 «아이콘 없는 띠» 안에서 라벨·수치 잉크가 실제로 어디를 쓰는지,
   그리고 플로터가 그 안에서 어디에 설 수 있는지를 DOM 에서 직접 잰다. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.resolve(__dirname, 'index.html'));
  await pg.waitForTimeout(1500);
  console.log(JSON.stringify(await pg.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    player.inv = 1e9; window.step = () => {};
    S.gold = 1e12; fxSeen.gold = S.gold; fxDisp.gold = S.gold; fxAcc.gold = 0;
    openTrain();
    await sleep(500);
    const card = document.querySelector('#trCards .tr-card');
    if (!card) return { err: '훈련 카드 없음' };
    const R = e => { const r = e.getBoundingClientRect(); return { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1) }; };
    const q = s => { const e = card.querySelector(s); return e ? R(e) : null; };
    const cr = R(card);
    const out = {
      card: cr,
      /* 카드 기준 좌표(카드 좌상단을 0,0 으로) — 배치를 정할 때 쓰는 값 */
      rel: {},
      box: { ch: q('.ch'), ci: q('.ci'), cv: q('.cv'), cn: q('.cn'), cb: q('.cb') },
      ink: { cv: q('.cv i'), cn: q('.cn i') },
      txt: { cv: (card.querySelector('.cv i') || {}).textContent, cn: (card.querySelector('.cn i') || {}).textContent },
      deltaTxt: trDeltaTxt(card)
    };
    for (const k in out.box) if (out.box[k]) out.rel[k] = { x: +(out.box[k].x - cr.x).toFixed(1), y: +(out.box[k].y - cr.y).toFixed(1), w: out.box[k].w, h: out.box[k].h };
    for (const k in out.ink) if (out.ink[k]) out.rel['ink_' + k] = { x: +(out.ink[k].x - cr.x).toFixed(1), y: +(out.ink[k].y - cr.y).toFixed(1), w: out.ink[k].w, h: out.ink[k].h };

    /* 실제 트리거 — 플로터 rect 를 애니메이션 내내 모으고, 라벨 잉크와의 겹침을 잰다 */
    const btn = card.querySelector('.cb');
    const rc = btn.getBoundingClientRect();
    const pe = t => new PointerEvent(t, { bubbles: true, cancelable: true, clientX: rc.left + rc.width / 2, clientY: rc.top + rc.height / 2 });
    btn.dispatchEvent(pe('pointerdown')); btn.dispatchEvent(pe('pointerup')); btn.click();
    const frames = [];
    for (let i = 0; i < 50; i++) {
      const d = document.querySelector('#fxl .fx-delta');
      const c2 = document.querySelector('#trCards .tr-card');
      const lab = c2 && c2.querySelector('.cn i');
      if (d && lab) {
        const dr = d.getBoundingClientRect(), lr = lab.getBoundingClientRect();
        const ox = Math.max(0, Math.min(dr.right, lr.right) - Math.max(dr.left, lr.left));
        const oy = Math.max(0, Math.min(dr.bottom, lr.bottom) - Math.max(dr.top, lr.top));
        frames.push({ t: i * 14, d: R(d), labOpacity: +getComputedStyle(lab.parentNode).opacity,
                      ovlXpct: +(100 * ox / lr.width).toFixed(1), ovlYpct: +(100 * oy / lr.height).toFixed(1) });
      }
      await sleep(14);
    }
    out.frames = frames;
    out.overlapFrames = frames.filter(f => f.ovlXpct > 0 && f.ovlYpct > 0).length;
    out.hushMinOpacity = frames.length ? Math.min(...frames.map(f => f.labOpacity)) : null;
    return out;
  }), null, 1));
  await b.close();
})();
