/* 82 게이트 — node tools/verify82.js → 마지막 줄 VERIFY82 PASS
   «04 스킬 · 07 펫 카드: 미획득 항목도 자물쇠 뒤에 아이콘이 비쳐 보여야 함(05 무기 카드 구조)»
   §1 구조: 미보유(.lk) 카드에 .sk-ci(아이콘) + .sk-lock(자물쇠, 아이콘 뒤 형제 = 위에 그려짐)
   §2 스타일: .lk>.sk-ci = opacity .35 + grayscale(1) (brightness(0) 금지) · 보유 카드는 변화 0
   §3 픽셀: 미보유 카드 3장 이상에서 «자물쇠 바깥 영역 평균 밝기(아이콘 표시) > (아이콘 숨김)»
   §4 스킬(#bSk)·펫(#bPet) 양쪽 모두 · 콘솔 에러 0 */
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

/* ── 225: 재는 자를 «DOM 실측» 으로 바꾼다 ────────────────────────────────────
   옛 §0·§3 은 제외 사각형을 손으로 적었다 — 카드 178x210 기준 x 중심±34 · y 45~122.
   진짜 자물쇠는 49x57 @ (중심±24.5 · y 55~112) 이라, 그 패딩은 **좌우 9.5px · 상하 10px**
   더 넓다. 그 몫이 그대로 «아이콘이 보이는 자리» 였고, 잉크가 작은 아이콘
   (🔻 48.7x42.6 · 🔥 44.5x59.7 — 자물쇠보다 작다)은 통째로 삼켜져 **0%** 가 됐다.
   → 제외 사각형은 그 카드의 `.sk-lock`/`.lock` **bbox + 2px**(안티에일리어싱 몫)로 잰다.
   밴드도 «20~116» 같은 상수가 아니라 그 카드 **아이콘 상자의 rect** 를 쓴다.
   (LESSONS 221-① «게이트가 빨간 이유는 단언이 낡았다 말고 재는 법이 틀렸다도 있다») */
function cardStats(A, B, c, sr, sx, sy){
  const M = 2;                                    /* 자물쇠 테두리 안티에일리어싱 여유 */
  const x0 = Math.round((c.x - sr.x) * sx), x1 = Math.round((c.x + c.w - sr.x) * sx);
  const by0 = (c.iy - sr.y) * sy, by1 = (c.iy + c.ih - sr.y) * sy;   /* 아이콘 상자 = 밴드 */
  const k = { x0: (c.lx - M - sr.x) * sx, x1: (c.lx + c.lw + M - sr.x) * sx,
              y0: (c.ly - M - sr.y) * sy, y1: (c.ly + c.lh + M - sr.y) * sy };
  let n = 0, changed = 0, sum = 0, mx = 0;
  for(let y = Math.ceil(by0); y < by1; y++) for(let x = x0; x < x1; x++){
    if(x >= k.x0 && x <= k.x1 && y >= k.y0 && y <= k.y1) continue;   /* 자물쇠 영역 제외 */
    if(x < 0 || y < 0 || x >= A.w || y >= A.h) continue;
    const i = (y * A.w + x) * 4;
    const la = (A.d[i] + A.d[i+1] + A.d[i+2]) / 3, lb = (B.d[i] + B.d[i+1] + B.d[i+2]) / 3;
    const dd = Math.abs(la - lb); n++; sum += dd; if(dd > mx) mx = dd;
    if(dd > 8) changed++;
  }
  return { ratio: n ? changed / n : 0, mean: n ? sum / n : 0, max: mx, n };
}

/* 잠금 카드를 **전부** 잰다(옛 §3 은 앞에서 3장만 봤다 — 그 창 밖에 있던 «안 보이는 칸» 을
   통째로 놓쳤고, 그래서 225 는 «한 칸» 으로 등재됐다. 실제로는 23칸 중 5칸이었다).
   칸마다 두 번 찍으면 59칸 = 118장이라 느리므로 **스크롤 페이지 단위로 두 장씩**만 찍고
   그 안에 통째로 들어와 있는 칸들을 잘라서 잰다. 스크롤러 밖으로 잘린 칸은 다음 페이지에서 잡는다
   (`.sk-gp` 는 `overflow:hidden auto` 라 «rect 는 멀쩡한데 화면에는 없는» 칸이 생긴다). */
async function scanLocked(page, decoder, o){
  await page.evaluate(cs => {
    document.querySelectorAll(cs).forEach((c, i) => c.setAttribute('data-v82', i));
  }, o.cardSel);
  const geo = await page.evaluate(sc => {
    const e = document.querySelector(sc); if(!e) return null;
    return { ch: e.clientHeight, sh: e.scrollHeight };
  }, o.scroller);
  if(!geo) return [];
  const step = Math.max(40, geo.ch - 20);
  const pages = Math.max(1, Math.ceil(geo.sh / step) + 1);
  const seen = new Set(), out = [];
  for(let p = 0; p < pages; p++){
    await page.evaluate(({ sc, t }) => { const e = document.querySelector(sc); if(e) e.scrollTop = t; },
                        { sc: o.scroller, t: p * step });
    await page.waitForTimeout(140);
    const pick = await page.evaluate(({ sc, cs, ls, is }) => {
      const e = document.querySelector(sc), sr = e.getBoundingClientRect();
      const list = [];
      document.querySelectorAll(cs).forEach(c => {
        const r = c.getBoundingClientRect();
        if(r.y < sr.y + 1 || r.y + r.height > sr.y + sr.height - 1) return;   /* 잘린 칸 제외 */
        const lo = c.querySelector(ls), ic = c.querySelector(is);
        if(!lo || !ic) return;
        const lr = lo.getBoundingClientRect(), ir = ic.getBoundingClientRect();
        list.push({ key: c.getAttribute('data-v82'),
                    id: c.dataset.skit || c.dataset.ptit || c.getAttribute('data-v82'),
                    x: r.x, y: r.y, w: r.width, h: r.height,
                    lx: lr.x, ly: lr.y, lw: lr.width, lh: lr.height,
                    iy: ir.y, ih: ir.height });
      });
      return { sr: { x: sr.x, y: sr.y, w: sr.width, h: sr.height }, list };
    }, { sc: o.scroller, cs: o.cardSel, ls: o.lockSel, is: o.iconSel });
    const fresh = pick.list.filter(c => !seen.has(c.key));
    if(!fresh.length) continue;
    const clip = { x: pick.sr.x, y: pick.sr.y, width: pick.sr.w, height: pick.sr.h };
    const shown = await page.screenshot({ clip });
    await page.addStyleTag({ content: o.hideCss });
    const hidden = await page.screenshot({ clip });
    await page.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); s && s.remove(); });
    const A = await meanBrightness(decoder, shown), B = await meanBrightness(decoder, hidden);
    const sx = A.w / clip.width, sy = A.h / clip.height;
    for(const c of fresh){ seen.add(c.key); out.push({ id: c.id, ...cardStats(A, B, c, pick.sr, sx, sy) }); }
  }
  await page.evaluate(sc => { const e = document.querySelector(sc); if(e) e.scrollTop = 0; }, o.scroller);
  return out;
}

/* (225) 옛 `diffStats` — «상수로 적은 자물쇠 패딩 + 상수 밴드» 로 재던 함수는 지웠다.
   판정 규칙 자체(«아이콘 표시/숨김 두 캡처에서 달라진 픽셀 비율»)는 `cardStats` 가 그대로 잇고,
   달라진 것은 **어디를 빼고 재느냐** 뿐이다(상수 패딩 → DOM 실측 자물쇠 bbox+2px). */

(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const PORT = srv.address().port;
  const ARGS = { args: [] };
  let browser;
  try { browser = await launch(chromium, ARGS); }
  catch (e) {
    const cand = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean)
      .find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });
    if (!cand) throw e;
    browser = await launch(chromium, { ...ARGS, executablePath: cand });
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
    /* 225 — 스킬·펫과 **같은 자**(자물쇠 bbox+2px · 아이콘 상자 밴드)로 재야 «같은 수준» 비교가 성립한다.
       (LESSONS A3-ⓔ «마스크가 다르면 다른 것을 잰다» — 자가 다르면 두 값은 비교 대상이 아니다) */
    const cal = await scanLocked(page, decoder, {
      scroller: '#wpnGrid', cardSel: '#wpnw .wgc.lk', lockSel: '.lock', iconSel: '.ic',
      hideCss: '.wgc.lk .ic{visibility:hidden!important}'
    });
    const vals = cal.map(r => r.ratio);
    await page.evaluate(() => { window.renderUI = window.__ru82; closeWeapon(); });
    if(vals.length >= 2){
      vals.sort((a, b) => a - b);
      const med = vals[(vals.length / 2) | 0];
      floor = Math.max(0.008, med / 2);
      const pc = v => (v * 100).toFixed(1) + '%';
      calTxt = '05 기준 ' + vals.length + '칸 최저 ' + pc(vals[0]) + ' · 중앙 ' + pc(med)
             + ' · 최고 ' + pc(vals[vals.length - 1]) + ' → 하한 ' + pc(floor);
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
          iconText: ci ? ci.textContent : '',
          /* 174 — 펫 아이콘이 이모지에서 **스프라이트 캔버스**가 됐다(주인 지시 «펫 그림 = 전투 씬 그대로»).
             «글자가 있다» 는 자가 그 자리에서 죽는다 — 82 가 지키려는 것은 «미보유 칸에도 그림이 있다» 이므로
             축을 «글자 또는 캔버스» 로 옮긴다(212-①. 지우지 않고 옮겨 심는다). 캔버스가 정말 그려졌는지는
             §3 픽셀 검사와 `tools/verify174.js` 가 따로 본다. */
          iconArt: !!ci && (ci.textContent.trim().length > 0 || !!ci.querySelector('canvas'))
        };
        (rec.lk ? out.lk : out.own).push(rec);
      });
      return out;
    }, bodyId);

    ck('§1 ' + label + ' 미보유 카드 ≥3', st.lk.length >= 3, String(st.lk.length));
    ck('§1 ' + label + ' .lk 전 카드에 아이콘(글자 또는 캔버스)+자물쇠, 자물쇠가 아이콘 뒤 형제',
       st.lk.every(r => r.hasIcon && r.hasLock && r.lockAfterIcon && r.iconArt),
       st.lk.filter(r => !r.iconArt).length + '칸이 빈 아이콘');
    ck('§2 ' + label + ' .lk>.sk-ci opacity=.35 + grayscale(1)',
       st.lk.every(r => Math.abs(r.op - 0.35) < 0.01 && /grayscale\(1\)/.test(r.fil)),
       st.lk[0] ? st.lk[0].op + ' / ' + st.lk[0].fil : '');
    ck('§2 ' + label + ' brightness(0) 실루엣 금지', st.lk.every(r => !/brightness\(0\)/.test(r.fil)));
    ck('§2 ' + label + ' 보유 카드 변화 0 (아이콘 opacity 1 · filter none · 자물쇠 없음)',
       st.own.every(r => r.hasIcon && !r.hasLock && r.op === 1 && r.fil === 'none'),
       st.own[0] ? st.own[0].op + ' / ' + st.own[0].fil : '(보유 0장)');

    /* §3 픽셀 — «자물쇠 bbox(DOM 실측)+2px 을 뺀 아이콘 상자» 에서 아이콘 표시/숨김 픽셀 대조.
       게임 루프가 패널을 재렌더해 element 핸들이 떨어지므로 clip 캡처 + 전역 style 토글로 잰다.
       225 — 옛 §3 은 **앞에서 3장만** 봤다. 그 창 밖의 «안 보이는 칸» 은 영원히 초록이라,
       23칸 중 5칸이 사라진 채로 게이트가 통과하고 있었다 → 이제 **전 칸**을 잰다. */
    await page.evaluate(() => { window.__ru82 = window.renderUI; window.renderUI = () => {}; }); /* 캡처 중 재렌더 동결 */
    const rows = await scanLocked(page, decoder, {
      scroller: '#' + bodyId + ' .sk-gp', cardSel: '#' + bodyId + ' .sk-gp .sk-card.lk',
      lockSel: '.sk-lock', iconSel: '.sk-ci',
      hideCss: '.sk-gp .sk-card.lk .sk-ci{visibility:hidden!important}'
    });
    await page.evaluate(() => { window.renderUI = window.__ru82; });
    rows.sort((a, b) => a.ratio - b.ratio);
    const under = rows.filter(r => !(r.ratio >= floor));
    const pc = r => r.id + ' ' + (r.ratio * 100).toFixed(1) + '%/Δ' + r.mean.toFixed(2);
    ck('§3 ' + label + ' 미보유 카드 **전 칸**: 자물쇠 바깥 아이콘 상자에서 아이콘 픽셀이 보임(05 대비 하한 '
       + (floor * 100).toFixed(1) + '%)',
       rows.length >= 3 && under.length === 0,
       rows.length + '칸 · 최저 ' + rows.slice(0, 3).map(pc).join(' · ')
       + (under.length ? ' | ✗ 미달 ' + under.length + '칸: ' + under.map(r => r.id).join(',') : ''));
  }

  ck('콘솔 에러 0', errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  const ok = fails.length === 0;
  console.log((ok ? 'VERIFY82 PASS' : 'VERIFY82 FAIL') + ' (' + (checks - fails.length) + '/' + checks + ')');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); console.log('VERIFY82 FAIL (예외)'); process.exit(1); });
