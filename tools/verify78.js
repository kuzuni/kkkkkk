/* 78 오디오 게이트 — node tools/verify78.js → 마지막 줄 VERIFY78 PASS
   §A CREDITS.md 대조 + 용량 예산   (파일 시스템)
   §B ctx 경로(http): 버퍼 22개 로드 · sfx 20종 예외 0 · 설정 토글 → gain 0/1 · 볼륨 → master ·
      BGM main 자동 시작 · bgmSet('boss') 전환 · BGM 토글 정지 · 콘솔 에러 0
   §C el 폴백(file://): auMode 'el' · sfx 예외 0 · 콘솔 에러 0 */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const AUD = path.join(ROOT, 'assets', 'audio');
let fails = [], checks = 0;
const ck = (name, ok, info) => { checks++; console.log((ok ? '  ✓ ' : '  ✗ ') + name + (info ? ' — ' + info : '')); if(!ok) fails.push(name); };

/* ---------- §A ---------- */
const files = fs.readdirSync(AUD).filter(f => /\.(ogg|mp3|m4a)$/.test(f));
const credits = fs.readFileSync(path.join(AUD, 'CREDITS.md'), 'utf8');
const missing = files.filter(f => !credits.includes(f.replace(/\.(ogg|mp3)$/, '')) && !credits.includes(f));
ck('§A CREDITS.md 에 전 파일 등재 (' + files.length + '개)', missing.length === 0, missing.join(','));
let tot = 0, overS = [], overB = [];
for(const f of files){
  const sz = fs.statSync(path.join(AUD, f)).size; tot += sz;
  if(f.startsWith('bgm_')){ if(sz > 1.5 * 1024 * 1024) overB.push(f); }
  else if(sz > 50 * 1024) overS.push(f);
}
ck('§A SFX ≤50KB', overS.length === 0, overS.join(','));
ck('§A BGM ≤1.5MB', overB.length === 0, overB.join(','));
ck('§A 총량 ≤4MB', tot <= 4 * 1024 * 1024, (tot / 1048576).toFixed(2) + 'MB');
const SFX_N = 20, BGM_N = 2;
ck('§A 파일 수 = SFX 20×2 + BGM 2', files.length === SFX_N * 2 + BGM_N, String(files.length));

/* ---------- 서버 ---------- */
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png', '.ogg':'audio/ogg',
               '.mp3':'audio/mpeg', '.json':'application/json', '.jpg':'image/jpeg' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if(!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory() && !fs.existsSync(path.join(p, 'index.html'))){
    res.writeHead(204); res.end(); return;
  }
  const f = fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

(async () => {
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const PORT = srv.address().port;
  /* smoke.js 와 같은 폴백 — 번들 브라우저가 없으면 /opt/pw-browsers/chromium 을 쓴다 */
  const ARGS = { args: ['--autoplay-policy=no-user-gesture-required'] };
  let browser;
  try { browser = await chromium.launch(ARGS); }
  catch (e) {
    const cand = [process.env.PW_CHROMIUM, '/opt/pw-browsers/chromium'].filter(Boolean)
      .find(p => { try { return fs.existsSync(p); } catch (_) { return false; } });
    if (!cand) throw e;
    browser = await chromium.launch({ ...ARGS, executablePath: cand });
  }

  /* ---------- §B ctx (http) ---------- */
  {
    const page = await browser.newPage({ viewport: { width: 540, height: 1140 } });
    const errs = [];
    page.on('console', m => { if(m.type() === 'error') errs.push(m.text().slice(0, 120)); });
    page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
    await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load' });
    await page.mouse.click(270, 400);                       /* 첫 제스처 → auInit */
    await page.waitForTimeout(300);
    ck('§B auMode = ctx', await page.evaluate(() => auMode) === 'ctx');
    const loaded = await page.waitForFunction(() => Object.keys(auBuf).length >= 22, null, { timeout: 20000 })
      .then(() => true).catch(() => false);
    ck('§B 버퍼 22개 로드(SFX 20 + BGM 2)', loaded,
       String(await page.evaluate(() => Object.keys(auBuf).length)));
    const r = await page.evaluate(() => {
      const out = { thrown: [] };
      for(const n of AU_SFX){ try{ auLast[n] = 0; sfx(n); }catch(e){ out.thrown.push(n + ':' + e); } }
      return out;
    });
    ck('§B sfx() 20종 예외 0', r.thrown.length === 0, r.thrown.join(','));
    const g = await page.evaluate(() => {
      const o = {};
      S.opt.sfx = false; auApply(); o.sfxOff = auSfxG.gain.value;
      S.opt.sfx = true;  auApply(); o.sfxOn  = auSfxG.gain.value;
      S.opt.bgm = false; auApply(); o.bgmOff = auBgmG.gain.value;
      S.opt.bgm = true;  auApply(); o.bgmOn  = auBgmG.gain.value;
      S.opt.vol = 50;    auApply(); o.m50    = auMaster.gain.value;
      S.opt.vol = 100;   auApply(); o.m100   = auMaster.gain.value;
      return o;
    });
    ck('§B SFX 토글 → auSfxG.gain 0/1', g.sfxOff === 0 && g.sfxOn === 1, JSON.stringify(g));
    ck('§B BGM 토글 → auBgmG.gain 0/1', g.bgmOff === 0 && g.bgmOn === 1);
    ck('§B 볼륨 50/100 → master 0.5/1', Math.abs(g.m50 - 0.5) < 1e-6 && g.m100 === 1);
    const bgmMain = await page.waitForFunction(() => bgmCur === 'main' && !!bgmNode, null, { timeout: 8000 })
      .then(() => true).catch(() => false);
    ck('§B BGM main 자동 시작(제스처 후)', bgmMain, await page.evaluate(() => bgmCur));
    ck('§B bgmSet(boss) 전환', await page.evaluate(() => { bgmSet('boss'); return bgmCur; }) === 'boss');
    ck('§B BGM 토글 off → 정지', await page.evaluate(() => { S.opt.bgm = false; auApply(); return bgmCur; }) === '');
    ck('§B 콘솔 에러 0', errs.length === 0, errs.slice(0, 3).join(' | '));
    await page.close();
  }

  /* ---------- §C el 폴백 (file://) ---------- */
  {
    const page = await browser.newPage({ viewport: { width: 540, height: 1140 } });
    const errs = [];
    page.on('console', m => { if(m.type() === 'error') errs.push(m.text().slice(0, 120)); });
    page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
    await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'load' });
    await page.mouse.click(270, 400);
    await page.waitForTimeout(300);
    ck('§C auMode = el (file://)', await page.evaluate(() => auMode) === 'el');
    const r = await page.evaluate(() => {
      const out = { thrown: [], els: Object.keys(auEl).length };
      for(const n of AU_SFX){ try{ auLast[n] = 0; sfx(n); }catch(e){ out.thrown.push(n + ':' + e); } }
      try{ bgmApply(); out.bgm = bgmCur; }catch(e){ out.thrown.push('bgm:' + e); }
      return out;
    });
    ck('§C <audio> 요소 20개', r.els === 20, String(r.els));
    ck('§C sfx()·bgmApply() 예외 0', r.thrown.length === 0, r.thrown.join(','));
    ck('§C BGM main (el 경로)', r.bgm === 'main', String(r.bgm));
    await page.waitForTimeout(500);
    ck('§C 콘솔 에러 0', errs.length === 0, errs.slice(0, 3).join(' | '));
    await page.close();
  }

  await browser.close(); srv.close();
  console.log('');
  console.log(fails.length === 0 ? 'VERIFY78 PASS (' + checks + '/' + checks + ')'
                                 : 'VERIFY78 FAIL — ' + fails.length + '건: ' + fails.join(' / '));
  process.exit(fails.length ? 1 : 0);
})();
