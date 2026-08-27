/* 225 진단 — `tools/verify82.js` §3 «스킬 미보유 3장 중 1장이 0.0%» 의 갈래 가르기
 *
 *   ⓐ 제품 회귀 — 그 스킬 아이콘이 자물쇠에 «실제로» 완전히 가려짐(82 규칙 위반)
 *   ⓑ 게이트 부패 — §3 이 자물쇠보다 **넓은 패딩 사각형**을 빼서, 자물쇠 옆으로는 보이는데도 0 이 됨
 *
 * 판정은 추론이 아니라 실측으로 한다(LESSONS 214-①). 카드마다
 *   · 어떤 스킬인지(`data-skit` · 이름 · `ic` 글자)
 *   · 아이콘 잉크의 **실제 bbox**(표시/숨김 차분 픽셀의 최소·최대 x,y — 카드 좌상단 기준 px)
 *   · §3 의 «게이트 패딩 사각형»(x 중심±34 · y 45~122) 으로 잰 ratio
 *   · **진짜 자물쇠 bbox**(49x57 @ left 50%−24.5 · top 55) 로 잰 ratio
 *   · 밴드(y 20~116) 밖으로 새는 잉크량
 * 을 찍는다. 두 ratio 가 갈리면 ⓑ, 둘 다 0 이면 ⓐ.
 *
 * 실행: node tools/probe225.js            (스킬)
 *       node tools/probe225.js pet        (펫)
 */
const fs = require('fs'), path = require('path'), http = require('http');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const ROOT = path.resolve(__dirname, '..');
const SUB = (process.argv[2] === 'pet') ? 'pet' : 'sk';
const BODY = SUB === 'pet' ? 'bPet' : 'bSk';
const N = +(process.argv[3] || 6);

const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.json':'application/json', '.jpg':'image/jpeg' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!p.startsWith(ROOT) || !fs.existsSync(p)){ res.writeHead(204); res.end(); return; }
  const f = fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

async function pixels(decoder, buf){
  return decoder.evaluate(async ({ b64 }) => {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, d: Array.from(cx.getImageData(0, 0, cv.width, cv.height).data) };
  }, { b64: buf.toString('base64') });
}

/* 차분 픽셀(|Δ밝기|>8)을 카드 좌표(CSS px)로 되돌려 bbox·개수를 낸다.
   캡처는 devicePixelRatio 배율이 붙을 수 있으므로 bb.width 로 나눠 정규화한다. */
function diffMap(A, B){
  const w = Math.min(A.w, B.w), h = Math.min(A.h, B.h);
  const pts = [];
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
    const i = (y * w + x) * 4;
    const la = (A.d[i] + A.d[i+1] + A.d[i+2]) / 3, lb = (B.d[i] + B.d[i+1] + B.d[i+2]) / 3;
    if(Math.abs(la - lb) > 8) pts.push([x, y]);
  }
  return { w, h, pts };
}

/* rect 는 «정규화(0~1)» 좌표. 밴드 안 · rect 밖 픽셀의 changed/total 비율 */
function ratioOutside(map, rect, band){
  const { w, h, pts } = map;
  const k = { x0: rect.x0 * w, x1: rect.x1 * w, y0: rect.y0 * h, y1: rect.y1 * h };
  const b = { y0: band.y0 * h, y1: band.y1 * h };
  let n = 0;
  for(let y = Math.ceil(b.y0); y < b.y1; y++) for(let x = 0; x < w; x++){
    if(x >= k.x0 && x <= k.x1 && y >= k.y0 && y <= k.y1) continue;
    n++;
  }
  let changed = 0;
  for(const [x, y] of pts){
    if(y < b.y0 || y >= b.y1) continue;
    if(x >= k.x0 && x <= k.x1 && y >= k.y0 && y <= k.y1) continue;
    changed++;
  }
  return { ratio: changed / n, changed, n };
}

(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const PORT = srv.address().port;
  const browser = await launch(chromium, { args: [] });
  const page = await browser.newPage({ viewport: { width: 540, height: 1140 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const decoder = await browser.newPage();

  /* verify82 §3 과 **같은 순서**로 상태를 만든다 */
  await page.evaluate(s => { gmHero(s); }, SUB);
  await page.waitForTimeout(400);
  await page.evaluate(({ s, id }) => {
    const list = s === 'sk' ? SKILLS : PETS;
    let lk = document.querySelectorAll('#' + id + ' .sk-gp .sk-card.lk').length;
    for(let i = list.length - 1; i >= 0 && lk < 3; i--){
      const t = list[i].id;
      if(S.own[t] && !(s === 'sk' ? skillEquipped(t) : petEquipped(t))){ delete S.own[t]; lk++; }
    }
    gmHero(s);
  }, { s: SUB, id: BODY });
  await page.waitForTimeout(400);

  const meta = await page.evaluate(({ id, s, n }) => {
    const list = s === 'sk' ? SKILLS : PETS;
    const out = [];
    document.querySelectorAll('#' + id + ' .sk-gp .sk-card.lk').forEach((c, i) => {
      if(i >= n) return;
      const ci = c.querySelector('.sk-ci'), lo = c.querySelector('.sk-lock');
      const tid = c.dataset.skit || c.dataset.ptit;
      const it = list.find(x => x.id === tid) || {};
      const cr = c.getBoundingClientRect();
      const ir = ci ? ci.getBoundingClientRect() : null;
      const lr = lo ? lo.getBoundingClientRect() : null;
      const cs = ci ? getComputedStyle(ci) : null;
      out.push({
        i, id: tid, name: it.name || '', ic: it.ic || '',
        icText: ci ? JSON.stringify(ci.textContent) : null,
        hasCanvas: !!(ci && ci.querySelector('canvas')),
        fs: cs ? cs.fontSize : null, lh: cs ? cs.lineHeight : null,
        card: { w: +cr.width.toFixed(1), h: +cr.height.toFixed(1) },
        ciRel: ir ? { x: +(ir.x - cr.x).toFixed(1), y: +(ir.y - cr.y).toFixed(1),
                      w: +ir.width.toFixed(1), h: +ir.height.toFixed(1) } : null,
        lockRel: lr ? { x: +(lr.x - cr.x).toFixed(1), y: +(lr.y - cr.y).toFixed(1),
                        w: +lr.width.toFixed(1), h: +lr.height.toFixed(1) } : null
      });
    });
    return out;
  }, { id: BODY, s: SUB, n: N });

  await page.evaluate(() => { window.__ru225 = window.renderUI; window.renderUI = () => {}; });

  console.log('== 225 probe — ' + (SUB === 'sk' ? '스킬 #bSk' : '펫 #bPet') + ' 미보유 카드 ' + meta.length + '장 ==');
  for(const m of meta){
    const bb = await page.locator('#' + BODY + ' .sk-gp .sk-card.lk').nth(m.i).boundingBox().catch(() => null);
    if(!bb){ console.log(JSON.stringify({ ...m, err: 'no bbox' })); continue; }
    const clip = { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
    const shown = await page.screenshot({ clip });
    await page.addStyleTag({ content: '.sk-gp .sk-card.lk .sk-ci{visibility:hidden!important}' });
    const hidden = await page.screenshot({ clip });
    await page.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); s && s.remove(); });
    const A = await pixels(decoder, shown), B = await pixels(decoder, hidden);
    const map = diffMap(A, B);
    const sx = map.w / bb.width, sy = map.h / bb.height;   /* 캡처 px → 카드 CSS px */
    let ink = null;
    if(map.pts.length){
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for(const [x, y] of map.pts){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
      ink = { x0: +(x0 / sx).toFixed(1), x1: +(x1 / sx).toFixed(1),
              y0: +(y0 / sy).toFixed(1), y1: +(y1 / sy).toFixed(1),
              w: +((x1 - x0 + 1) / sx).toFixed(1), h: +((y1 - y0 + 1) / sy).toFixed(1) };
    }
    const band = { y0: 20 / 210, y1: 116 / 210 };
    const gateRect = { x0: (89 - 34) / 178, x1: (89 + 34) / 178, y0: 45 / 210, y1: 122 / 210 };
    /* 진짜 자물쇠 bbox — 실측된 lockRel 을 카드 크기로 정규화(없으면 CSS 공칭값) */
    const L = m.lockRel || { x: 89 - 24.5, y: 55, w: 49, h: 57 };
    const trueRect = { x0: L.x / m.card.w, x1: (L.x + L.w) / m.card.w,
                       y0: L.y / m.card.h, y1: (L.y + L.h) / m.card.h };
    const g = ratioOutside(map, gateRect, band);
    const t = ratioOutside(map, trueRect, band);
    const full = ratioOutside(map, { x0: 2, x1: 2, y0: 2, y1: 2 }, { y0: 0, y1: 1 }); /* 카드 전체 */
    console.log(JSON.stringify({
      i: m.i, id: m.id, name: m.name, ic: m.ic, icText: m.icText, canvas: m.hasCanvas,
      fs: m.fs, card: m.card, ci: m.ciRel, lock: m.lockRel,
      잉크bbox: ink, 잉크픽셀수: map.pts.length,
      게이트패딩ratio: +(g.ratio * 100).toFixed(2) + '%',
      진짜자물쇠ratio: +(t.ratio * 100).toFixed(2) + '%',
      카드전체ratio: +(full.ratio * 100).toFixed(2) + '%'
    }));
  }
  await page.evaluate(() => { window.renderUI = window.__ru225; });
  if(errs.length) console.log('콘솔 에러: ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
})();
