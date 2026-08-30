/* 525 재현 — node tools/probe525.js
   «26 펫 미보유 카드에서 자물쇠 바깥 아이콘 픽셀이 0.0%» (verify82 §3, 36칸 중 22칸 FAIL)
   338 규칙: 처방 전에 «찍힌 픽셀» 로 재현하고 등재문의 세 가설을 갈라낸다.
     ⓐ 흐림 3겹(grayscale+opacity .35)이 대비를 하한 밑으로 눌렀다
     ⓑ pet6_* 등 원본이 어두워 면색과 붙는다
     ⓒ 자 쪽 마스크(자물쇠 bbox+2px · 아이콘 상자 밴드)가 492 의 새 크기에서 헛짚는다
   재는 것: 칸마다 ① 캔버스 잉크 bbox(캔버스 픽셀 직접) ② 그 잉크가 자물쇠+2 밖에 몇 px 남는가
            ③ 화면에 찍힌 픽셀로 «표시/숨김» 차분(게이트와 같은 자) — 스킬 칸과 나란히. */
const fs = require('fs'), path = require('path'), http = require('http');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
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

(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const PORT = srv.address().port;
  let browser;
  try { browser = await launch(chromium, { args: [] }); }
  catch (e) {
    const cand = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean)
      .find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });
    if(!cand) throw e;
    browser = await launch(chromium, { args: [], executablePath: cand });
  }
  const page = await browser.newPage({ viewport: { width: 540, height: 1140 } });
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(700);

  const out = {};
  for(const [sub, bodyId, label] of [['sk', 'bSk', '스킬'], ['pet', 'bPet', '펫']]){
    await page.evaluate(s => { gmHero(s); }, sub);
    await page.waitForTimeout(400);
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

    out[sub] = await page.evaluate(id => {
      const rows = [];
      document.querySelectorAll('#' + id + ' .sk-gp .sk-card.lk').forEach(c => {
        const ci = c.querySelector('.sk-ci'), lo = c.querySelector('.sk-lock');
        if(!ci || !lo) return;
        const cr = c.getBoundingClientRect(), ir = ci.getBoundingClientRect(), lr = lo.getBoundingClientRect();
        const cv = ci.querySelector('canvas');
        const rec = { id: c.dataset.ptit || c.dataset.skit || '?',
                      card: [+cr.width.toFixed(1), +cr.height.toFixed(1)],
                      ci: [+(ir.x - cr.x).toFixed(1), +(ir.y - cr.y).toFixed(1), +ir.width.toFixed(1), +ir.height.toFixed(1)],
                      lock: [+(lr.x - cr.x).toFixed(1), +(lr.y - cr.y).toFixed(1), +lr.width.toFixed(1), +lr.height.toFixed(1)],
                      kind: cv ? 'canvas' : 'text', txt: cv ? '' : ci.textContent.trim() };
        if(cv){
          const vr = cv.getBoundingClientRect();
          rec.cv = [+(vr.x - cr.x).toFixed(1), +(vr.y - cr.y).toFixed(1), +vr.width.toFixed(1), +vr.height.toFixed(1)];
          rec.cvpx = [cv.width, cv.height];
          try{
            const g = cv.getContext('2d');
            const d = g.getImageData(0, 0, cv.width, cv.height).data;
            let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
            for(let y = 0; y < cv.height; y++) for(let x = 0; x < cv.width; x++){
              if(d[(y * cv.width + x) * 4 + 3] > 8){ n++; if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
            }
            rec.inkN = n;
            rec.ink = n ? [x0, y0, x1 - x0 + 1, y1 - y0 + 1] : null;
            /* 잉크 bbox 를 카드 좌표로 (캔버스 CSS 크기 = 픽셀 크기라고 가정하지 않는다) */
            if(n){
              const sx = vr.width / cv.width, sy = vr.height / cv.height;
              rec.inkCard = [ +((vr.x - cr.x) + x0 * sx).toFixed(1), +((vr.y - cr.y) + y0 * sy).toFixed(1),
                              +((x1 - x0 + 1) * sx).toFixed(1), +((y1 - y0 + 1) * sy).toFixed(1) ];
              /* 자물쇠+2 밖 · 아이콘 상자 밴드 안에 남는 잉크 픽셀 수(캔버스 픽셀 단위) */
              const M = 2;
              const kx0 = lr.x - M, kx1 = lr.x + lr.width + M, ky0 = lr.y - M, ky1 = lr.y + lr.height + M;
              const by0 = ir.y, by1 = ir.y + ir.height;
              let outN = 0;
              for(let y = 0; y < cv.height; y++) for(let x = 0; x < cv.width; x++){
                if(d[(y * cv.width + x) * 4 + 3] <= 8) continue;
                const px = vr.x + x * sx, py = vr.y + y * sy;
                if(py < by0 || py >= by1) continue;
                if(px >= kx0 && px <= kx1 && py >= ky0 && py <= ky1) continue;
                outN++;
              }
              rec.inkOutBand = outN;
            }
          }catch(e){ rec.err = String(e).slice(0, 80); }
        }
        rows.push(rec);
      });
      return rows;
    }, bodyId);
    console.log('\n== ' + label + ' 미보유 칸 ' + out[sub].length + '장 ==');
    for(const r of out[sub].slice(0, 40)){
      console.log('  ' + r.id.padEnd(9) + ' ' + r.kind
        + ' ci=' + JSON.stringify(r.ci) + ' lock=' + JSON.stringify(r.lock)
        + (r.cv ? ' cv=' + JSON.stringify(r.cv) + ' px=' + JSON.stringify(r.cvpx)
                + ' ink=' + JSON.stringify(r.ink) + ' inkCard=' + JSON.stringify(r.inkCard)
                + ' 자물쇠밖밴드안=' + r.inkOutBand : ' txt=' + r.txt) + (r.err ? ' ERR ' + r.err : ''));
    }
  }

  const petRows = out.pet || [];
  const cvRows = petRows.filter(r => r.kind === 'canvas');
  ck('펫 미보유 칸이 캔버스다', cvRows.length > 0, cvRows.length + '/' + petRows.length + '칸');
  ck('캔버스에 그려진 잉크가 있다(전 칸)', cvRows.every(r => r.inkN > 0),
     '잉크 0인 칸 ' + cvRows.filter(r => !r.inkN).length);
  const zero = cvRows.filter(r => (r.inkOutBand || 0) === 0);
  ck('잉크가 «자물쇠+2 밖 · 아이콘 상자 밴드 안» 에 남는다(전 칸)', zero.length === 0,
     zero.length + '칸이 0 (' + zero.slice(0, 6).map(r => r.id).join(',') + ')');
  const over = cvRows.filter(r => r.cv && (r.cv[1] < r.ci[1] - 0.5 || r.cv[1] + r.cv[3] > r.ci[1] + r.ci[3] + 0.5));
  ck('캔버스가 아이콘 상자(.sk-ci) 세로를 넘지 않는다', over.length === 0,
     over.length + '칸 넘침' + (over[0] ? ' 예: ' + over[0].id + ' cv=' + JSON.stringify(over[0].cv) + ' ci=' + JSON.stringify(over[0].ci) : ''));

  /* ── §2 게이트와 «같은 자» 를 그대로 돌려 본다 — 어느 스크롤 페이지에서 0 이 나오는지 */
  {
    const decoder = await browser.newPage();
    const dec = async buf => decoder.evaluate(async b64 => {
      const img = new Image();
      await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = 'data:image/png;base64,' + b64; });
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
      return { w: img.width, h: img.height, d: Array.from(cx.getImageData(0, 0, cv.width, cv.height).data) };
    }, buf.toString('base64'));
    await page.evaluate(s => { gmHero(s); }, 'pet');
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.__ru = window.renderUI; window.renderUI = () => {}; });
    const scSel = '#bPet .sk-gp', cdSel = '#bPet .sk-gp .sk-card.lk';
    /* 두 번 잰다 — 덮개 없이(=자동 플레이가 안 죽었을 때) / 18 패배 화면을 씌우고(=죽었을 때).
       등재 증상(«36칸 중 22칸이 0.0%/Δ0.00»)이 어느 쪽에서 나오는지가 이 재현의 답이다. */
    const runs = [];
    for(const cover of [false, true]){
    await page.evaluate(c => { const d = document.getElementById('defw'); c ? d.classList.add('on') : d.classList.remove('on'); }, cover);
    await page.waitForTimeout(200);
    console.log('\n-- ' + (cover ? '덮개 있음(#defw.on)' : '덮개 없음') + ' --');
    const bag = [];
    await page.evaluate(cs => { document.querySelectorAll(cs).forEach((c, i) => c.setAttribute('data-p525', i)); }, cdSel);
    const geo = await page.evaluate(sc => { const e = document.querySelector(sc); return { ch: e.clientHeight, sh: e.scrollHeight, r: e.getBoundingClientRect().toJSON() }; }, scSel);
    console.log('\n== §2 스크롤러 ' + JSON.stringify(geo) + ' viewport 1140 ==');
    const step = Math.max(40, geo.ch - 20), pages = Math.max(1, Math.ceil(geo.sh / step) + 1);
    const seen = new Set();
    for(let p = 0; p < pages; p++){
      await page.evaluate(({ sc, t }) => { const e = document.querySelector(sc); e.scrollTop = t; }, { sc: scSel, t: p * step });
      await page.waitForTimeout(140);
      const pick = await page.evaluate(({ sc, cs }) => {
        const e = document.querySelector(sc), sr = e.getBoundingClientRect(), list = [];
        document.querySelectorAll(cs).forEach(c => {
          const r = c.getBoundingClientRect();
          if(r.y < sr.y + 1 || r.y + r.height > sr.y + sr.height - 1) return;
          const lo = c.querySelector('.sk-lock'), ic = c.querySelector('.sk-ci');
          if(!lo || !ic) return;
          const lr = lo.getBoundingClientRect(), ir = ic.getBoundingClientRect();
          list.push({ key: c.getAttribute('data-p525'), id: c.dataset.ptit || c.getAttribute('data-p525'),
                      x: r.x, y: r.y, w: r.width, h: r.height, lx: lr.x, ly: lr.y, lw: lr.width, lh: lr.height,
                      iy: ir.y, ih: ir.height });
        });
        return { sr: { x: sr.x, y: sr.y, w: sr.width, h: sr.height }, list };
      }, { sc: scSel, cs: cdSel });
      const fresh = pick.list.filter(c => !seen.has(c.key));
      if(!fresh.length){ console.log('  page ' + p + ' scrollTop=' + (p * step) + ' 새 칸 0'); continue; }
      const clip = { x: pick.sr.x, y: pick.sr.y, width: pick.sr.w, height: pick.sr.h };
      const shown = await page.screenshot({ clip });
      const nBefore = await page.evaluate(() => document.querySelectorAll('style').length);
      await page.addStyleTag({ content: '.sk-gp .sk-card.lk .sk-ci{visibility:hidden!important}' });
      const nAfter = await page.evaluate(() => document.querySelectorAll('style').length);
      const hidden = await page.screenshot({ clip });
      const removed = await page.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); const t = s ? s.textContent.slice(0, 40) : ''; s && s.remove(); return t; });
      const A = await dec(shown), B = await dec(hidden);
      let diffAll = 0;
      for(let i = 0; i < A.d.length; i += 4) if(Math.abs(A.d[i] - B.d[i]) > 8) diffAll++;
      const sx = A.w / clip.width, sy = A.h / clip.height;
      const line = [];
      for(const c of fresh){
        seen.add(c.key);
        const M = 2;
        const x0 = Math.round((c.x - pick.sr.x) * sx), x1 = Math.round((c.x + c.w - pick.sr.x) * sx);
        const by0 = (c.iy - pick.sr.y) * sy, by1 = (c.iy + c.ih - pick.sr.y) * sy;
        const k = { x0: (c.lx - M - pick.sr.x) * sx, x1: (c.lx + c.lw + M - pick.sr.x) * sx,
                    y0: (c.ly - M - pick.sr.y) * sy, y1: (c.ly + c.lh + M - pick.sr.y) * sy };
        let n = 0, ch2 = 0;
        for(let y = Math.ceil(by0); y < by1; y++) for(let x = x0; x < x1; x++){
          if(x >= k.x0 && x <= k.x1 && y >= k.y0 && y <= k.y1) continue;
          if(x < 0 || y < 0 || x >= A.w || y >= A.h) continue;
          const i = (y * A.w + x) * 4;
          const la = (A.d[i] + A.d[i+1] + A.d[i+2]) / 3, lb = (B.d[i] + B.d[i+1] + B.d[i+2]) / 3;
          n++; if(Math.abs(la - lb) > 8) ch2++;
        }
        const rt = n ? ch2 / n : 0;
        bag.push({ id: c.id, ratio: rt });
        line.push(c.id + ' ' + (rt * 100).toFixed(1) + '%(n=' + n + ')');
      }
      console.log('  page ' + p + ' scrollTop=' + (p * step) + ' clip=' + JSON.stringify(clip)
        + ' shot=' + A.w + 'x' + A.h + ' 전체차분픽셀=' + diffAll + ' style ' + nBefore + '→' + nAfter
        + ' 지운것="' + removed.replace(/\n/g, ' ') + '"');
      console.log('     ' + line.join(' · '));
    }
    runs.push({ cover, bag });
    }
    await page.evaluate(() => { document.getElementById('defw').classList.remove('on'); });
    await page.evaluate(() => { window.renderUI = window.__ru; });
    await decoder.close();

    const FL = 0.012;                                  /* verify82 §0 이 05 표본에서 뽑은 하한 */
    const clean = runs.find(r => !r.cover).bag, cov = runs.find(r => r.cover).bag;
    const cU = clean.filter(r => r.ratio < FL), vU = cov.filter(r => r.ratio < FL);
    console.log('\n== 판정 ==');
    console.log('  덮개 없음: ' + clean.length + '칸 · 하한 미달 ' + cU.length + '칸 · 최저 '
      + (clean.length ? (Math.min(...clean.map(r => r.ratio)) * 100).toFixed(1) : '-') + '%');
    console.log('  덮개 있음: ' + cov.length + '칸 · 하한 미달 ' + vU.length + '칸 · 최저 '
      + (cov.length ? (Math.min(...cov.map(r => r.ratio)) * 100).toFixed(1) : '-') + '%');
    ck('덮개가 없으면 전 칸이 하한 이상 — 제품(아이콘 가시성)은 정상이다 [ⓐⓑ 기각]',
       clean.length >= 3 && cU.length === 0, '미달 ' + cU.length + '칸');
    ck('덮개를 씌우면 등재 증상이 그대로 재현된다(하한 미달 칸이 생긴다) [뿌리 = 자동 플레이의 18 패배 화면]',
       vU.length > 0, '미달 ' + vU.length + '칸 (등재문 관측 22칸)');
  }

  await browser.close(); srv.close();
  console.log((fails.length ? 'PROBE525 FAIL' : 'PROBE525 PASS') + ' (' + (checks - fails.length) + '/' + checks + ')');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
