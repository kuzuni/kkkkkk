/* 243 게이트 — «스프라이트가 자기 그림자 위에 선다»(가로 잉크 앵커 `xo`).
   178 이 세로(`yo` = 발밑 여백)로 고친 것의 가로 짝이라, 재는 법도 178 과 같다:
   기대값을 손으로 박지 않고 **런타임 상태**(`ATLAS`·`ETYPE`·`PET_SP`·`player`)에서 읽는다
   (212-① · LESSONS 185-①).

   여기서 재는 것은 «그린 결과»다 — 산술로 낸 오프셋이 아니라, 실제 `drawShadow`/`drawFrame`/
   `drawFrameC` 를 캔버스에 그려 픽셀 bbox 를 읽는다. 그래야 트림·플립·배율을 다 통과한 값이 된다.

   §1 그림자 위에 선다 — 적 6종 + 플레이어 + 펫: 그림자 중심 ↔ 스프라이트 잉크 중심
   §2 방향 전환 — flip 을 켜도 잉크가 순간이동하지 않는다(고치기 전 기사 249px · 28 보스 210px)
   §3 그리기 전용 — drawFrame 은 `e.x`·`e.y`·`r`·`flip` 을 한 글자도 안 바꾼다(178 `yo` 규약)
   §4 움직임 보존 — 빠진 것은 «캐릭터마다 상수 하나» 뿐이다(애니 안·사이 움직임은 그대로)
   §5 178 회귀 — 세로(발밑)는 한 px 도 안 건드렸다
   §6 콘솔 에러 0

   실행: node tools/verify243.js
   ⚠ file:// 로 열면 스프라이트가 캔버스를 오염시켜 getImageData 가 SecurityError 다 — http 로 띄운다.
   127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용. */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path'), fs = require('fs'), http = require('http');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log('  ok   ' + m); };
const no = (m) => { fail++; console.log('  FAIL ' + m); };
const is = (m, got, want) => (got === want ? ok : no)(m + ' = ' + JSON.stringify(got)
  + (got === want ? '' : ' (기대 ' + JSON.stringify(want) + ')'));
const le = (m, got, lim) => {
  if (got == null || !isFinite(got)) return no(m + ' — 값 없음(' + got + ')');
  (Math.abs(got) <= lim ? ok : no)(m + ' = ' + (+got).toFixed(1) + ' (허용 ±' + lim.toFixed(1) + ')');
};

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

(async () => {
  await new Promise(r => srv.listen(0, r));
  const browser = await launch(chromium);
  const bctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await bctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:' + srv.address().port + '/index.html');
  await page.waitForTimeout(1400);

  /* 캔버스에 «그리는 함수» 를 태우고 잉크 bbox 를 돌려주는 자 — 한 evaluate 안에서 그리고 바로 읽으므로
     rAF 루프(draw())가 끼어들지 못한다. 배율은 «화면에 들어오는 한 크게» 잡아 1px 양자화를 줄인다. */
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
      return x1>=x0 ? { cx:(x0+x1)/2, cy:(y0+y1)/2, w:x1-x0+1, h:y1-y0+1, x0, x1, y0, y1 } : null;
    }
    /* 그 아트가 화면에 들어오는 가장 큰 정수 배율 — 실전 배율(0.15~4.8)로 재면 잉크가 수십 px 이라
       1px 양자화가 허용치를 먹어 버린다. 보정은 배율에 정비례하므로 크게 재면 «비율» 이 정확해진다. */
    function bigScale(fr){ return Math.max(1, Math.min(Math.floor((W*0.8)/fr[6]), Math.floor((H*0.6)/fr[7]))); }
  `;

  /* ---------- §0 캐릭터 묶음 ---------- */
  const groups = await page.evaluate(() => {
    const out = [];
    for (const key of Object.keys(ATLAS)) {
      const A = ATLAS[key];
      if (!A || !A.a) continue;
      const m = (typeof frameXo === 'function' ? frameXo(key, A) : {}), seen = {};   /* 옛 트리에는 없다 — 즉사 대신 xo 0 으로 재고 §1·§2 가 빨개진다(242 «즉사라 몇 건이 진짜 빨간지조차 모른다») */
      for (const g of Object.keys(A.a)) {
        const f0 = A.f[A.a[g][0]];
        if (!f0) continue;
        const ck = f0[6] + 'x' + f0[7], v = m[A.a[g][0]] || 0;
        (seen[ck] || (seen[ck] = { cell: ck, xo: v, anims: [] })).anims.push(g);
      }
      for (const ck in seen) out.push(Object.assign({ key }, seen[ck]));
    }
    return out;
  });
  console.log('\n[0] 캐릭터 묶음(논리 칸이 같은 애니 = 한 캐릭터) — 묶음마다 상수 xo 하나');
  for (const g of groups) console.log('     ' + (g.key + ' ' + g.cell).padEnd(20)
    + 'xo ' + String(g.xo).padStart(7) + '   ' + g.anims.join(' '));
  is('§0 묶음이 캐릭터 수만큼 갈렸다(elves 는 blue/green/미사일 2 = 4묶음)',
    groups.filter(g => g.key === 'elves').length, 4);

  /* ---------- §1 그림자 위에 선다 ---------- */
  console.log('\n[1] 그림자 중심 ↔ 스프라이트 잉크 중심 (서 있는 자세 · 실전 배율의 관계식 그대로)');
  const stand = await page.evaluate(new Function(HARNESS + `
    const out = [];
    /* 적 — draw() 의 렌더 그대로: drawShadow(e.x, e.y, r*0.85) 와 drawFrame(atlas, walk0, e.x, e.y+yo, scale) */
    for(const tk of Object.keys(ETYPE)){
      const T = ETYPE[tk], A = ATLAS[T.atlas];
      if(!A || !A.a || !A.a[T.walk]) continue;
      const fn = A.a[T.walk][0], fr = A.f[fn];
      const sc = bigScale(fr);
      for(const flip of [false, true]){
        const s = ink(() => drawShadow(AX, AY, Math.max(6, T.r*0.85*sc/Math.max(sc,1))));
        const g = ink(() => drawFrame(T.atlas, fn, AX, AY, sc, flip, 1, null));
        if(s && g) out.push({ who:'적 '+tk+'('+T.name+')', flip, dx:g.cx - s.cx, w:g.w, sc });
      }
    }
    /* 플레이어 — draw() 는 drawShadow(player.x, player.y, 15) 와 drawFrame('knight', curFrame(player), …, 1.0)
       ⚑ 446 — 표본은 «그 순간의 자세»(curFrame 을 그대로 읽는 것)가 아니라 **쉬는 자세**다. 적은
       T.walk[0], 펫은 sp.anim[0] 으로 처음부터 쉬는 자세에 고정돼 있는데 플레이어만 살아 있는
       프레임을 뽑아 달리기·공격 자세가 섞였고(재적재마다 3~5종), 그 자세들의 앞뒤 내지름은 §4 가
       «살아 있어야 한다» 고 단언하는 바로 그 움직임이라 판정이 동전 던지기가 됐다
       (probe446 [1]·[2] — 착지 가능한 프레임의 16/22 가 허용 밖, 같은 트리에서 실행마다 빨강 0~3건).
       자세는 손으로 박지 않고 **제품에게 묻는다** — 제품이 «안 움직일 때» 거는 그 호출 그대로
       (index.html 20443 «else setAnim(player,'knight','idle',8,true)» · 33796 부팅). */
    {
      const A = ATLAS.knight;
      const sav = { anim:player.anim, akey:player.akey, at:player.at, afps:player.afps, aloop:player.aloop };
      setAnim(player, 'knight', 'idle', 8, true); player.at = 0;  /* setAnim 은 같은 애니면 곧장 되돌아간다 — at 은 따로 0 */
      const fn = curFrame(player) || A.a.idle[0], fr = A.f[fn], sc = bigScale(fr);
      Object.assign(player, sav);                                  /* 재는 것 말고는 아무것도 안 바꾼다(§3 규약) */
      for(const flip of [false, true]){
        const s = ink(() => drawShadow(AX, AY, 15));
        const g = ink(() => drawFrame('knight', fn, AX, AY, sc, flip, 1, null));
        if(s && g) out.push({ who:'플레이어', flip, dx:g.cx - s.cx, w:g.w, sc, frame:fn });
      }
    }
    /* 펫 — drawShadow(p.x, p.y+26, 9) + drawFrameC(sp, fr, p.x, p.y, scale) → 가로 중심은 둘 다 p.x */
    for(const k of Object.keys(PET_SP)){
      const sp = PET_SP[k], A = ATLAS[k];
      if(!A || !A.a || !A.a[sp.anim]) continue;
      const fn = A.a[sp.anim][0], fr = A.f[fn], sc = bigScale(fr);
      for(const flip of [false, true]){
        const s = ink(() => drawShadow(AX, AY, 9));
        const g = ink(() => drawFrameC(k, fn, AX, AY, sc, flip, 1, null));
        if(s && g) out.push({ who:'펫 '+k, flip, dx:g.cx - s.cx, w:g.w, sc });
      }
    }
    return out;
  `));
  for (const r of stand) {
    /* 허용치는 «잉크 폭의 3% 또는 3px 중 큰 쪽» — 아트 자체의 비대칭 여백(dragon·boom 1~2%)은 앵커 문제가 아니다 */
    const lim = Math.max(3, r.w * 0.03);
    le('§1 ' + (r.who + (r.flip ? ' flip' : '')).padEnd(24) + ' Δx(잉크중심−그림자중심, ×' + r.sc + ')', r.dx, lim);
  }

  /* ⚑ 446 — 표본이 «흔들리지 않는 자세» 라는 것 자체를 항으로 세운다. 안 세우면 다음 세션이
     `curFrame(player)` 로 되돌려 놓아도 자는 조용히 초록·빨강을 오간다(그게 446 이 등재된 경위다). */
  const plFrame = (stand.find(r => r.who === '플레이어') || {}).frame;
  const idle0 = await page.evaluate(() => ATLAS.knight.a.idle[0]);
  is('§1 플레이어 표본 = 제품이 «안 움직일 때» 거는 쉬는 자세의 0프레임(446 — 살아 있는 프레임이 아니다)',
    plFrame, idle0);

  /* ⚑ 446 되돌림 시험 — 표본을 제자리에 놓은 것이 «자를 무르게 푼 것» 이 아님을 못박는다.
     그 쉬는 자세의 `xo` 를 0 으로(=243 수리 전) 되돌리면 같은 항이 허용을 크게 넘어야 한다.
     ⚠ 기대값을 손으로 박지 않는다 — 지금 허용치와 그때 값을 그 자리에서 견준다(212-①). */
  const rev = await page.evaluate(new Function(HARNESS + `
    const A = ATLAS.knight, fn = A.a.idle[0], fr = A.f[fn], sc = bigScale(fr);
    const m = frameXo('knight', A), keep = Object.assign({}, m);
    const at = () => { const s = ink(() => drawShadow(AX, AY, 15));
      const g = ink(() => drawFrame('knight', fn, AX, AY, sc, false, 1, null));
      return { dx: g.cx - s.cx, w: g.w }; };
    const now = at();
    for(const k in m) m[k] = 0;
    const off = at();
    Object.assign(m, keep);
    return { now, off, back: at(), sc };
  `));
  (Math.abs(rev.off.dx) > Math.max(3, rev.off.w * 0.03) ? ok : no)(
    '§1 되돌림 — knight `xo` 를 빼면 그 쉬는 자세가 허용을 넘는다(자는 여전히 243 을 지킨다) — Δx '
    + rev.off.dx.toFixed(1) + ' > ±' + Math.max(3, rev.off.w * 0.03).toFixed(1));
  is('§1 되돌림 뒤 원복 — 값이 되돌아온다(자가 제품을 더럽히지 않았다)', rev.back.dx, rev.now.dx);

  /* ---------- §2 방향 전환 순간이동 ---------- */
  console.log('\n[2] 방향을 트는 순간의 순간이동 = |Δx(정) − Δx(역)| (고치기 전: 기사 249 · 28 보스 210)');
  const flips = {};
  for (const r of stand) (flips[r.who] || (flips[r.who] = {}))[r.flip ? 'f' : 'n'] = r;
  for (const who of Object.keys(flips)) {
    const a = flips[who].n, b = flips[who].f;
    if (!a || !b) continue;
    le('§2 ' + who.padEnd(24) + ' 순간이동(잉크폭 ' + a.w + ')', a.dx - b.dx, Math.max(6, a.w * 0.08));
  }

  /* ---------- §3 그리기 전용 ---------- */
  console.log('\n[3] 그리기 전용 — 상태·판정은 한 글자도 안 바뀐다(178 `yo` 규약)');
  const pure = await page.evaluate(() => {
    localStorage.clear(); Object.assign(S, DEF());
    S.own.slash = { n: 0, l: 1 }; S.eqSkill = ['slash']; S.stage = 5; S.best = 5; S.guide.idx = 99;
    if (typeof dunRun !== 'undefined' && dunRun) endDunRun(false, true);
    spawnStage();
    for (let k = 0; k < 120; k++) step(1 / 60);
    const e = enemies[0];
    const snap = (o) => o ? { x: o.x, y: o.y, r: o.r, flip: o.flip, hp: o.hp } : null;
    const b0 = { p: snap(player), e: snap(e) };
    for (let k = 0; k < 8; k++) {
      if (e) drawFrame(e.T.atlas, curFrame(e), e.x, e.y, e.T.scale, e.flip, 1, null);
      drawFrame('knight', curFrame(player), player.x, player.y, 1.0, player.flip, 1, null);
    }
    const b1 = { p: snap(player), e: snap(e) };
    /* 보정표는 순수 함수여야 한다 — 두 번 부르면 같은 객체(캐시)여야 하고 값도 같다 */
    const A = ATLAS.knight, has = typeof frameXo === 'function';
    const m1 = has ? frameXo('knight', A) : null, m2 = has ? frameXo('knight', A) : {};
    return { same: JSON.stringify(b0) === JSON.stringify(b1), hadEnemy: !!e,
             cached: has && m1 === m2, xoIdle: has ? m1[A.a.idle[0]] : null };
  });
  is('§3 적이 실제로 있었다(빈 표본이 아니다)', pure.hadEnemy, true);
  is('§3 drawFrame 을 8번 불러도 x·y·r·flip·hp 가 그대로', pure.same, true);
  is('§3 frameXo 는 아틀라스마다 한 번만 계산(캐시)', pure.cached, true);
  is('§3 기사 xo = idle 0프레임 잉크 중심 보정', pure.xoIdle, 12.5);

  /* ---------- §4 움직임 보존 ---------- */
  console.log('\n[4] 빠진 것은 «캐릭터마다 상수 하나» 뿐 — 애니 안·사이의 진짜 움직임은 살아 있다');
  const move = await page.evaluate(new Function(HARNESS + `
    const A = ATLAS.knight, sc = bigScale(A.f[A.a.idle[0]]);
    const at = (fn) => ink(() => drawFrame('knight', fn, AX, AY, sc, false, 1, null)).cx - AX;
    const idle0 = at(A.a.idle[0]), atkB0 = at(A.a.attack_B[0]);
    /* 기사 attack_B 는 «내밀고 시작하는» 애니라 idle 보다 앞(오른쪽)에 있어야 한다 */
    const E = ATLAS.elves, esc = bigScale(E.f[E.a.green_idle[0]]);
    const eat = (fn) => ink(() => drawFrame('elves', fn, AX, AY, esc, false, 1, null)).cx - AX;
    const gStand = eat(E.a.green_idle[0]);
    const gDown  = eat(E.a.green_die[E.a.green_die.length-1]);
    return { idle0, atkB0, sc, gStand, gDown, esc };
  `));
  (move.atkB0 - move.idle0 > move.sc * 2 ? ok : no)(
    '§4 기사 attack_B 0프레임이 idle 보다 앞으로 나가 있다 — Δ '
    + (move.atkB0 - move.idle0).toFixed(1) + 'px (×' + move.sc + ' · 기대 > ' + (move.sc * 2) + ')');
  (move.gStand - move.gDown > move.esc * 30 ? ok : no)(
    '§4 elves die 마지막 프레임은 옆으로 눕는다(중심이 왼쪽으로 간다) — Δ '
    + (move.gStand - move.gDown).toFixed(1) + 'px (×' + move.esc + ' · 기대 > ' + (move.esc * 30) + ')');

  /* ---------- §5 178 세로 회귀 ---------- */
  /* 옛 그리기(보정 없는 원식)를 그 자리에서 재현해 **같은 프레임끼리** 견준다.
     «발밑 여백 = (fr[7]−fr[5]−fr[3])×배율» 로 재려 했다가 12건이 어긋났는데, 이는 제품이 아니라
     자가 틀린 것이었다 — 아틀라스 트림이 프레임마다 딱 맞는 게 아니라 애니 단위라 잉크 아래에
     빈 줄이 남는 프레임이 있다(knight fall_loop 0.6px). 옛 경로와 직접 견주면 그 전제가 필요 없다. */
  console.log('\n[5] 178 회귀 — 옛 그리기와 견주어 세로·크기는 그대로, 가로만 상수 xo 만큼 옮겼다');
  const vert = await page.evaluate(new Function(HARNESS + `
    const out = [];
    for(const key of Object.keys(ATLAS)){
      const A = ATLAS[key];
      if(!A || !A.image || !A.a) continue;
      const xoM = (typeof frameXo === 'function' ? frameXo(key, A) : {});
      for(const g of Object.keys(A.a)){
        const fn = A.a[g][0], fr = A.f[fn];
        if(!fr) continue;
        const sc = bigScale(fr);
        const now = ink(() => drawFrame(key, fn, AX, AY, sc, false, 1, null));
        const old = ink(() => {                       /* 243 이전의 원식 — 논리 프레임 가운데 앵커 */
          ctx.save(); ctx.translate(AX, AY);
          ctx.drawImage(A.image, fr[0], fr[1], fr[2], fr[3],
            -fr[6]*sc/2 + fr[4]*sc, -fr[7]*sc + fr[5]*sc, fr[2]*sc, fr[3]*sc);
          ctx.restore();
        });
        if(now && old) out.push({ key, g, sc,
          dy0: now.y0 - old.y0, dy1: now.y1 - old.y1, dw: now.w - old.w, dh: now.h - old.h,
          dx: now.cx - old.cx, want: (xoM[fn] || 0) * sc });
      }
    }
    return out;
  `));
  /* 세로는 정확히 0 이어야 한다(xo 는 y 를 안 건드린다). 가로 크기는 ±1px 허용 —
     xo 가 반 px 인 아트(elves green −72.5)는 그린 자리가 반 px 밀려 안티에일리어싱 가장자리 화소가
     한 줄 늘거나 준다. 그건 앵커가 아니라 래스터화다. */
  const vbadY = vert.filter(v => v.dy0 || v.dy1 || Math.abs(v.dw) > 1 || Math.abs(v.dh) > 1);
  (vbadY.length === 0 ? ok : no)('§5 세로 위치는 그대로(Δ0) · 잉크 크기 Δ ≤ 1px — 애니 ' + vert.length
    + '개' + (vbadY.length ? ' (어긋남 ' + vbadY.length + '건: '
      + vbadY.slice(0, 3).map(v => v.key + '/' + v.g + ' dy' + v.dy0 + '/' + v.dy1 + ' dw' + v.dw).join(', ') + ')' : ''));
  const vbadX = vert.filter(v => Math.abs(v.dx - v.want) > 1.01);
  (vbadX.length === 0 ? ok : no)('§5 가로 이동량 = xo × 배율(문서화된 상수) — 애니 ' + vert.length
    + '개' + (vbadX.length ? ' (어긋남 ' + vbadX.length + '건: '
      + vbadX.slice(0, 3).map(v => v.key + '/' + v.g + ' ' + v.dx.toFixed(1) + '≠' + v.want.toFixed(1)).join(', ') + ')' : ''));

  /* ---------- §6 콘솔 ---------- */
  console.log('');
  is('§6 콘솔 에러 0건', errs.length, 0);
  if (errs.length) console.log('    ' + errs.slice(0, 5).join('\n    '));

  console.log('\nVERIFY243  ' + pass + '/' + (pass + fail) + (fail ? '  ✗ FAIL ' + fail + '건' : '  ✓ PASS'));
  await browser.close();
  srv.close();
  process.exit(fail ? 1 : 0);
})();
