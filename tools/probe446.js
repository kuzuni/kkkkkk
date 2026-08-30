/* 작업 446 재현 자 — «`verify243` §1·§2 «플레이어» 3건이 왜 빨간가» 를 찍힌 픽셀로 가른다.
 *
 * 등재문(PROGRESS 446)의 주장:
 *   §1 «플레이어» Δx −19.5(허용 ±14.1) · §1 flip +19.5 · §2 순간이동 −39.0(허용 ±37.5) 이 **결정적으로** 빨갛고,
 *   §1 flip 짝이 부호만 반대로 정확히 같은 값이라 뿌리는 «앵커가 상수만큼 밀린 것» 이다.
 *   갈래 둘 — ⓐ 243 이후 누가 knight 앵커를 밀었다 / ⓑ 자의 허용치가 낡았다.
 *
 * 338 규칙 — 처방 전에 재현부터. 이 자가 재는 것 넷:
 *   [1] **표본이 무엇이었나** — `verify243` §1 은 플레이어만 `curFrame(player)`, 즉 «그 순간 서 있던 자세»
 *       를 뽑는다(적은 `T.walk[0]`, 펫은 `sp.anim[0]` 으로 **쉬는 자세에 고정**돼 있다). 같은 조건으로
 *       페이지를 N번 다시 띄워 무엇이 뽑히는지 센다.
 *   [2] **프레임별 Δx 표** — knight 전 프레임의 (잉크중심 − 그림자중심)·허용치·판정. 뽑히는 프레임에 따라
 *       초록·빨강이 갈리는지, 아니면 전부 빨간지(= ⓐ 진짜 앵커 밀림)를 가른다.
 *   [3] **쉬는 자세로 고정하면** — 제품이 스스로 선언한 쉬는 자세(`setAnim(player,'knight','idle',8,true)`
 *       — index.html 20443·33796)로 몰고 잰 값. 결정적인가, 허용 안인가.
 *   [4] **되돌림** — knight 의 `xo` 를 0 으로 되돌리면(=243 수리 전) 그 쉬는 자세가 다시 빨개지는가.
 *       [3] 이 초록인 것이 «자를 무르게 푼 것» 이 아니라 «표본을 제자리에 놓은 것» 임은 이 항이 못박는다.
 *
 * 실행: node tools/probe446.js            (N=6)
 *       node tools/probe446.js --n 12     (표본 수를 늘려서)
 *       node tools/probe446.js --all      (프레임별 표 전부)
 *
 * ⚠ file:// 로 열면 스프라이트가 캔버스를 오염시켜 getImageData 가 SecurityError 다 — http 로 띄운다.
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path'), fs = require('fs'), http = require('http');

const ROOT = path.resolve(__dirname, '..');
const SHOW_ALL = process.argv.includes('--all');
const NARG = process.argv.indexOf('--n');
const N = NARG > 0 && process.argv[NARG + 1] ? Math.max(2, +process.argv[NARG + 1]) : 6;

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  FAIL ' + m); };
const is = (m, got, want) => (got === want ? ok : no)(m + ' = ' + JSON.stringify(got)
  + (got === want ? '' : ' (기대 ' + JSON.stringify(want) + ')'));

const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png', '.svg':'image/svg+xml',
               '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.json':'application/json', '.jpg':'image/jpeg',
               '.woff2':'font/woff2', '.ttf':'font/ttf', '.css':'text/css' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(204); res.end(); return; }
  const f = fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

/* verify243 §1 과 **같은** 자 — 캔버스에 그리고 잉크 bbox 를 읽는다(산술 오프셋이 아니다). */
const HARNESS = `
  const W = cvs.width, H = cvs.height;
  const AX = Math.round(W/2), AY = Math.round(H*0.72);
  function ink(fn){
    ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,W,H);
    fn();
    const d = ctx.getImageData(0,0,W,H).data;
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for(let y=0;y<H;y++){ const r=y*W*4;
      for(let x=0;x<W;x++) if(d[r+x*4+3] > 8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
    ctx.restore();
    return x1>=x0 ? { cx:(x0+x1)/2, cy:(y0+y1)/2, w:x1-x0+1, h:y1-y0+1 } : null;
  }
  function bigScale(fr){ return Math.max(1, Math.min(Math.floor((W*0.8)/fr[6]), Math.floor((H*0.6)/fr[7]))); }
  /* verify243 §1 의 허용치 그대로 — 잉크 폭의 3% 또는 3px 중 큰 쪽 */
  function lim1(w){ return Math.max(3, w*0.03); }
  function measure(fn, flip){
    const A = ATLAS.knight, fr = A.f[fn], sc = bigScale(fr);
    const s = ink(() => drawShadow(AX, AY, 15));
    const g = ink(() => drawFrame('knight', fn, AX, AY, sc, !!flip, 1, null));
    return { fn, sc, dx: g.cx - s.cx, w: g.w, lim: lim1(g.w) };
  }
`;

(async () => {
  await new Promise(r => srv.listen(0, r));
  const browser = await launch(chromium);
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const open = async () => {
    const bctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
    const page = await bctx.newPage();
    await page.goto(url);
    await page.waitForTimeout(1400);            /* verify243 과 같은 대기 */
    return { bctx, page };
  };

  /* ---------- [2]~[4] 한 페이지에서 ----------
     ⚠ 순서 — 표([2])를 **먼저** 만든다. [1] 의 판정을 «이번 N회에서 실제로 빨강이 나왔나» 로 쓰면
     그 판정 자체가 자기가 고발하는 병(표본이 흔들린다)에 걸린다. 그래서 [1] 은 «무엇이 뽑혔나» 만
     관측하고, 초록·빨강이 갈린다는 말은 [2] 의 전수 표로 못박는다. */
  const { bctx, page } = await open();
  const T = await page.evaluate(new Function(HARNESS + `
    const A = ATLAS.knight, out = { frames: [] };
    for(const g of Object.keys(A.a)) for(const fn of A.a[g]){
      const m = measure(fn, false);
      out.frames.push({ g, fn, dx: m.dx, w: m.w, lim: m.lim, red: Math.abs(m.dx) > m.lim });
    }
    /* [3] 제품이 스스로 선언한 쉬는 자세로 몰고 잰다 — 새 상수 없이 제품에게 묻는다 */
    const sav = { anim: player.anim, akey: player.akey, at: player.at, afps: player.afps, aloop: player.aloop };
    setAnim(player, 'knight', 'idle', 8, true); player.at = 0;
    out.restFn = curFrame(player);
    out.rest  = measure(out.restFn, false);
    out.restF = measure(out.restFn, true);
    /* [4] 되돌림 — xo 를 0 으로(243 수리 전 상태) 하고 같은 쉬는 자세를 잰다 */
    const m = frameXo('knight', A), keep = Object.assign({}, m);
    for(const k in m) m[k] = 0;
    out.revert = measure(out.restFn, false);
    Object.assign(m, keep);
    out.restored = measure(out.restFn, false);
    Object.assign(player, sav);
    return out;
  `));

  await bctx.close();

  console.log('\n[2] knight 프레임별 Δx(잉크중심 − 그림자중심) — 뽑히기만 하면 자가 그 값을 그대로 쓴다');
  const byG = {};
  for (const f of T.frames) (byG[f.g] || (byG[f.g] = [])).push(f);
  for (const g of Object.keys(byG)) {
    const arr = byG[g], red = arr.filter(f => f.red).length;
    console.log('     ' + g.padEnd(12) + '프레임 ' + String(arr.length).padStart(2)
      + ' · Δx ' + Math.min(...arr.map(f => f.dx)).toFixed(1) + ' ~ ' + Math.max(...arr.map(f => f.dx)).toFixed(1)
      + ' · 허용 밖 ' + red + '건');
    if (SHOW_ALL) for (const f of arr)
      console.log('        ' + f.fn.padEnd(24) + 'Δx ' + String(f.dx).padStart(7)
        + '  (±' + f.lim.toFixed(1) + ')  ' + (f.red ? '빨강' : '초록'));
  }
  const runAtk = T.frames.filter(f => /^(run|attack_)/.test(f.g));
  const runAtkRed = runAtk.filter(f => f.red).length;
  (runAtkRed > 0 ? ok : no)('[2-a] 달리기·공격 자세에는 허용 밖 프레임이 실재한다(그래서 표본이 흔들리면 자가 흔들린다) — '
    + runAtkRed + '/' + runAtk.length + '건');
  const idleAll = T.frames.filter(f => f.g === 'idle');
  is('[2-b] 쉬는 자세(idle) 프레임은 전부 허용 안 — 허용 밖 건수', idleAll.filter(f => f.red).length, 0);

  console.log('\n[3] 제품이 선언한 쉬는 자세로 몰고 잰 값(setAnim(player,\'knight\',\'idle\',8,true) · index.html 20443·33796)');
  console.log('     표본 = ' + T.restFn + ' · Δx ' + T.rest.dx + ' / flip ' + T.restF.dx
    + ' (허용 ±' + T.rest.lim.toFixed(1) + ') · 순간이동 ' + (T.rest.dx - T.restF.dx).toFixed(1)
    + ' (허용 ±' + Math.max(6, T.rest.w * 0.08).toFixed(1) + ')');
  is('[3-a] 쉬는 자세 표본은 아틀라스가 말하는 idle 0프레임이다', T.restFn, T.frames.find(f => f.g === 'idle').fn);
  (Math.abs(T.rest.dx) <= T.rest.lim ? ok : no)('[3-b] 그 자세는 그림자 위에 선다 — Δx ' + T.rest.dx
    + ' (허용 ±' + T.rest.lim.toFixed(1) + ')');
  (Math.abs(T.rest.dx - T.restF.dx) <= Math.max(6, T.rest.w * 0.08) ? ok : no)(
    '[3-c] flip 순간이동도 허용 안 — ' + (T.rest.dx - T.restF.dx).toFixed(1));

  console.log('\n[4] 되돌림 — knight 의 xo 를 0 으로(243 수리 전) 하면 그 쉬는 자세가 다시 빨개지는가');
  console.log('     xo=0 Δx ' + T.revert.dx + ' (허용 ±' + T.revert.lim.toFixed(1) + ') → 원복 Δx ' + T.restored.dx);
  (Math.abs(T.revert.dx) > T.revert.lim ? ok : no)('[4-a] xo 를 빼면 쉬는 자세가 허용을 넘는다(자는 여전히 243 을 지킨다) — Δx '
    + T.revert.dx + ' > ±' + T.revert.lim.toFixed(1));
  is('[4-b] 원복하면 다시 초록 — Δx', T.restored.dx, T.rest.dx);

  /* ---------- [1] 표본이 무엇이었나 ---------- */
  console.log('\n[1] `verify243` §1 이 플레이어에게서 뽑는 표본 — «그 순간 서 있던 자세»(curFrame) 를 ' + N + '회 재적재');
  const byFn = {};
  for (const f of T.frames) byFn[f.fn] = f;
  const seen = [];
  for (let i = 0; i < N; i++) {
    const o = await open();
    const r = await o.page.evaluate(() => ({
      fn: curFrame(player) || ATLAS.knight.a.idle[0], anim: player.anim, at: +player.at.toFixed(2) }));
    seen.push(r);
    const t = byFn[r.fn] || {};
    console.log('     #' + String(i + 1).padStart(2) + '  ' + r.fn.padEnd(22)
      + 'Δx ' + String(t.dx).padStart(7) + '  (허용 ±' + (t.lim || 0).toFixed(1) + ')  '
      + (t.red ? '빨강' : '초록'));
    await o.bctx.close();
  }
  const kinds = [...new Set(seen.map(s => s.fn))];
  const anims = [...new Set(seen.map(s => s.anim))];
  const restAnim = T.frames.find(f => f.fn === T.restFn).g;
  console.log('     ⇒ 뽑힌 프레임 ' + kinds.length + '종(' + kinds.join(' · ') + ') · 자세 ' + anims.join(' · ')
    + ' · 그중 빨강 ' + seen.filter(s => (byFn[s.fn] || {}).red).length + '/' + N);
  is('[1-a] 자는 «서 있는 자세» 를 잰다고 적어 두고 쉬는 자세(' + restAnim + ')를 한 번도 안 뽑았다 — 뽑힌 횟수',
    seen.filter(s => s.anim === restAnim).length, 0);
  /* 착지 가능한 자세들의 프레임을 [2] 표에서 꺼내 «초록도 빨강도 있다» 를 못박는다 — 이번 실행의 운이 아니다 */
  const land = T.frames.filter(f => anims.includes(f.g));
  const lr = land.filter(f => f.red).length;
  (lr > 0 && lr < land.length ? ok : no)('[1-b] 그 자세들이 갖는 프레임에는 초록도 빨강도 있다(표본 하나에 판정이 걸린다) — 빨강 '
    + lr + '/' + land.length + '건 · 자세 ' + anims.join(' · '));

  console.log('\nPROBE446  ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL ' + fail + '건' : '  ✓ PASS'));
  await browser.close();
  srv.close();
  process.exit(fail ? 1 : 0);
})();
