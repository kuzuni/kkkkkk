/* 82 게이트 — node tools/verify82.js → 마지막 줄 VERIFY82 PASS
   «04 스킬 · 07 펫 카드: 미획득 항목도 자물쇠 뒤에 아이콘이 비쳐 보여야 함(05 무기 카드 구조)»
   §1 구조: 미보유(.lk) 카드에 .sk-ci(아이콘) + .sk-lock(자물쇠, 아이콘 뒤 형제 = 위에 그려짐)
   §2 스타일: .lk>.sk-ci = opacity .35 + grayscale(1) (brightness(0) 금지) · 보유 카드는 변화 0
   §3 픽셀: 미보유 카드 3장 이상에서 «자물쇠 바깥 영역 평균 밝기(아이콘 표시) > (아이콘 숨김)»
   §4 스킬(#bSk)·펫(#bPet) 양쪽 모두 · 콘솔 에러 0 */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
let fails = [], checks = 0;
const ck = (name, ok, info) => { checks++; console.log((ok ? '  ✓ ' : '  ✗ ') + name + (info ? ' — ' + info : '')); if(!ok) fails.push(name); };

const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.json':'application/json', '.jpg':'image/jpeg' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!p.startsWith(ROOT) || !fs.existsSync(p)){ res.writeHead(204); res.end(); return; }
  const f = fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

/* elementHandle.screenshot 버퍼 → 같은 브라우저의 빈 페이지 canvas 로 디코드해
   «자물쇠 bbox 바깥» 평균 밝기를 잰다 (메인 세션이 이미지를 읽지 않기 위한 수치화) */
async function meanBrightness(decoder, buf, lockRect){
  return decoder.evaluate(async ({ b64, lock }) => {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, d: Array.from(cx.getImageData(0, 0, cv.width, cv.height).data) };
  }, { b64: buf.toString('base64'), lock: lockRect });
}

/* 두 캡처(아이콘 표시/숨김)를 «아이콘 밴드(y 20~116/210) − 자물쇠 bbox» 에서 픽셀 대조.
   카드 바탕이 밝은 색이라 «평균 밝기 상승» 대신 «달라진 픽셀 비율 + 평균 Δ» 로 가시성을 증명한다 */
function diffStats(A, B, lock, bandRel){
  const w = Math.min(A.w, B.w), h = Math.min(A.h, B.h);
  const band = bandRel ? { y0: h * bandRel.y0, y1: h * bandRel.y1 }
                       : { y0: h * 20 / 210, y1: h * 116 / 210 };
  const k = { x0: lock.x0 * w, x1: lock.x1 * w, y0: lock.y0 * h, y1: lock.y1 * h };
  let n = 0, changed = 0, sum = 0, brighterA = 0, brighterB = 0;
  for(let y = Math.ceil(band.y0); y < band.y1; y++) for(let x = 0; x < w; x++){
    if(x >= k.x0 && x <= k.x1 && y >= k.y0 && y <= k.y1) continue; /* 자물쇠 영역 제외 */
    const i = (y * w + x) * 4;
    const la = (A.d[i] + A.d[i+1] + A.d[i+2]) / 3, lb = (B.d[i] + B.d[i+1] + B.d[i+2]) / 3;
    const dd = Math.abs(la - lb); n++; sum += dd;
    if(dd > 8){ changed++; if(la > lb) brighterA++; else brighterB++; }
  }
  return { ratio: changed / n, mean: sum / n, brighterA, brighterB };
}

(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const PORT = srv.address().port;
  const ARGS = { args: [] };
  let browser;
  try { browser = await chromium.launch(ARGS); }
  catch (e) {
    const cand = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean)
      .find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });
    if (!cand) throw e;
    browser = await chromium.launch({ ...ARGS, executablePath: cand });
  }
  const page = await browser.newPage({ viewport: { width: 540, height: 1140 } });
  const errs = [];
  page.on('console', m => { if(m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const decoder = await browser.newPage();

  /* §0 캘리브레이션 — 05 무기 카드(주인이 «이렇게 돼 있으니 같은 구조로» 라고 승인한 기준 구현)의
     잠금 카드 아이콘 가시성을 같은 프로브로 재고, 스킬·펫은 그 중앙값의 절반 이상이면 «같은 수준» 으로 본다.
     (카드 바탕이 밝은 베이지라 절대 밝기 상승 기준은 성립하지 않는다 — review 파일 참조) */
  let floor = 0.015, calTxt = '';
  {
    await page.evaluate(() => { openWeapon(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { window.__ru82 = window.renderUI; window.renderUI = () => {}; });
    const vals = [];
    for(let i = 0; i < 3; i++){
      const bb = await page.locator('#wpnw .wgc.lk').nth(i).boundingBox().catch(() => null);
      if(!bb) continue;
      const clip = { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
      const shown = await page.screenshot({ clip });
      await page.addStyleTag({ content: '.wgc.lk .ic{visibility:hidden!important}' });
      const hidden = await page.screenshot({ clip });
      await page.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); s && s.remove(); });
      /* .wgc 148x158 · .ic top 8 h 100 · .lock 49x55 @ left 50%-25, top 38 */
      const lockRect = { x0: (74 - 34) / 148, x1: (74 + 34) / 148, y0: 28 / 158, y1: 100 / 158 };
      const A = await meanBrightness(decoder, shown, lockRect);
      const B = await meanBrightness(decoder, hidden, lockRect);
      const st0 = diffStats(A, B, lockRect, { y0: 8 / 158, y1: 108 / 158 });
      vals.push(st0.ratio);
    }
    await page.evaluate(() => { window.renderUI = window.__ru82; closeWeapon(); });
    if(vals.length >= 2){
      vals.sort((a, b) => a - b);
      const med = vals[(vals.length / 2) | 0];
      floor = Math.max(0.008, med / 2);
      calTxt = '05 기준 ' + vals.map(v => (v * 100).toFixed(1) + '%').join('·') + ' → 하한 ' + (floor * 100).toFixed(1) + '%';
    }
    ck('§0 캘리브레이션 — 05 무기 잠금 카드 프로브 ≥2장', vals.length >= 2, calTxt || String(vals.length));
  }

  for(const [sub, bodyId, label] of [['sk', 'bSk', '스킬'], ['pet', 'bPet', '펫']]){
    await page.evaluate(s => { gmHero(s); }, sub);
    await page.waitForTimeout(400);
    /* 미보유 카드가 3장 미만이면(진행된 세이브) 뒤쪽 소유를 지워 3장 확보 */
    await page.evaluate(({ s, id }) => {
      const list = s === 'sk' ? SKILLS : PETS;
      let lk = document.querySelectorAll('#' + id + ' .sk-gp .sk-card.lk').length;
      for(let i = list.length - 1; i >= 0 && lk < 3; i--){
        const t = list[i].id;
        if(S.own[t] && !(s === 'sk' ? skillEquipped(t) : petEquipped(t))){ delete S.own[t]; lk++; }
      }
      gmHero(s);
    }, { s: sub, id: bodyId });
    await page.waitForTimeout(400);

    const st = await page.evaluate(id => {
      const out = { lk: [], own: [] };
      document.querySelectorAll('#' + id + ' .sk-gp .sk-card').forEach(c => {
        const ci = c.querySelector('.sk-ci'), lo = c.querySelector('.sk-lock');
        const rec = {
          lk: c.classList.contains('lk'), hasIcon: !!ci, hasLock: !!lo,
          lockAfterIcon: !!(ci && lo) && !!(ci.compareDocumentPosition(lo) & Node.DOCUMENT_POSITION_FOLLOWING),
          op: ci ? +getComputedStyle(ci).opacity : null,
          fil: ci ? getComputedStyle(ci).filter : null,
          iconText: ci ? ci.textContent : ''
        };
        (rec.lk ? out.lk : out.own).push(rec);
      });
      return out;
    }, bodyId);

    ck('§1 ' + label + ' 미보유 카드 ≥3', st.lk.length >= 3, String(st.lk.length));
    ck('§1 ' + label + ' .lk 전 카드에 아이콘+자물쇠, 자물쇠가 아이콘 뒤 형제',
       st.lk.every(r => r.hasIcon && r.hasLock && r.lockAfterIcon && r.iconText.trim().length > 0));
    ck('§2 ' + label + ' .lk>.sk-ci opacity=.35 + grayscale(1)',
       st.lk.every(r => Math.abs(r.op - 0.35) < 0.01 && /grayscale\(1\)/.test(r.fil)),
       st.lk[0] ? st.lk[0].op + ' / ' + st.lk[0].fil : '');
    ck('§2 ' + label + ' brightness(0) 실루엣 금지', st.lk.every(r => !/brightness\(0\)/.test(r.fil)));
    ck('§2 ' + label + ' 보유 카드 변화 0 (아이콘 opacity 1 · filter none · 자물쇠 없음)',
       st.own.every(r => r.hasIcon && !r.hasLock && r.op === 1 && r.fil === 'none'),
       st.own[0] ? st.own[0].op + ' / ' + st.own[0].fil : '(보유 0장)');

    /* §3 픽셀 — 자물쇠 bbox(49x57, left 50%-24.5, top 55 / 카드 178x210)를 뺀 평균 밝기 비교.
       게임 루프가 패널을 재렌더해 element 핸들이 떨어지므로 clip 캡처 + 전역 style 토글로 잰다 */
    let pix = [], okAll = true;
    await page.evaluate(() => { window.__ru82 = window.renderUI; window.renderUI = () => {}; }); /* 캡처 중 재렌더 동결 */
    const boxes = [];
    for(let t = 0; t < 5 && boxes.length < 3; t++){
      boxes.length = 0;
      for(let i = 0; i < 3; i++){
        const bb = await page.locator('#' + bodyId + ' .sk-gp .sk-card.lk').nth(i).boundingBox().catch(() => null);
        if(bb) boxes.push(bb);
      }
      if(boxes.length < 3) await page.waitForTimeout(150);
    }
    for(const bb of boxes){
      const clip = { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
      const shown = await page.screenshot({ clip });
      await page.addStyleTag({ content: '.sk-gp .sk-card.lk .sk-ci{visibility:hidden!important}' });
      const hidden = await page.screenshot({ clip });
      await page.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); s && s.remove(); });
      const lockRect = { x0: (89 - 34) / 178, x1: (89 + 34) / 178, y0: 45 / 210, y1: 122 / 210 };
      const A = await meanBrightness(decoder, shown, lockRect);
      const B = await meanBrightness(decoder, hidden, lockRect);
      const st3 = diffStats(A, B, lockRect);
      pix.push((st3.ratio * 100).toFixed(1) + '%/Δ' + st3.mean.toFixed(2));
      if(!(st3.ratio >= floor)) okAll = false;
    }
    await page.evaluate(() => { window.renderUI = window.__ru82; });
    ck('§3 ' + label + ' 미보유 3장: 자물쇠 바깥 아이콘 밴드에서 아이콘 픽셀이 보임(05 대비 하한 ' + (floor * 100).toFixed(1) + '%)',
       okAll && pix.length === 3, pix.join(' · '));
  }

  ck('콘솔 에러 0', errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  const ok = fails.length === 0;
  console.log((ok ? 'VERIFY82 PASS' : 'VERIFY82 FAIL') + ' (' + (checks - fails.length) + '/' + checks + ')');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); console.log('VERIFY82 FAIL (예외)'); process.exit(1); });
