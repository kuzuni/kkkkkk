/* 작업 671 — 재화 아이콘 «색 잉크 ÷ 실루엣» 등방 게이트.
 *
 *   node tools/verify671.js
 *
 * 무엇을 지키나 ────────────────────────────────────────────────────────────
 * 644 가 아트 15장의 «실루엣 ÷ 캔버스» 를 1.0000 으로 통일한 뒤에도 한 프레임 안에서
 * 코인 65.3 ↔ 젬 59.06 = **비 1.106** 이 남았다(411·356 눈금 ≤1.05 초과). 671 이 그 뿌리를 물었고
 * `probe671` 이 등재문을 **반만 맞다고 정정**했다 — 결손은 «젬의 검은 테가 얇다» 가 아니라
 * **테가 축마다 다르다** 였다:
 *
 *      cur-dia.svg  색÷실루엣  가로 .848 · 세로 .973  (비대칭 1.147)
 *      cur-gold.svg 색÷실루엣  가로 .875 · 세로 .875  (등방)
 *      ref(03 던전) 코인 .891/.877 · 젬 .875/.877     (등방)
 *
 *   ⓐ 가로 — 좌우 꼭짓점이 뾰족해 straddle stroke 가 2/sin(θ/2) = 2.6 씩 파고든다
 *   ⓑ 세로 — 면 분할선(#0E6E96 2.5)이 위·아래 꼭짓점에서 **검정 테 위로 삐져나온다**
 *
 * 처방은 테를 두르는 방식 하나다 — 실루엣을 **몸통의 1.0714배 자리에 4폭 라운드 조인**으로 따로 깔고,
 * 몸통은 stroke 없이 얹고, 면 분할선은 **몸통으로 클립**한다. 몸통 path·색은 한 자도 안 바꿨다.
 * ⇒ 색 잉크 = 몸통 bbox = 실루엣의 .875 **두 축 모두** ⇒ 코인과 **같은 상자(65.3)** 가
 *   코인과 **같은 잉크**를 낸다 ⇒ 프레임 안 덩치 비 1.106 → **1.000**.
 *
 * 절 ───────────────────────────────────────────────────────────────────────
 *   [A] 아트 — 두 장의 «색÷실루엣» 이 ref 값(.875)에 붙고 축 비대칭이 ≤1.03
 *   [B] 자리 — HUD·03·10·89 의 코인·젬 상자가 **한 값**(65.3)이다
 *   [C] 잉크 — 03 던전에서 실제로 그려진 색 잉크 덩치 최대÷최소 ≤ 1.05 (411·356 눈금)
 *   [R] 되돌림 — 옛 테 규격(straddle stroke)으로 되돌린 사본은 [A] 가 잡는다 ·
 *                상자를 59.06 으로 되돌린 사본은 [C] 눈금이 깨진다
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) { pass++; console.log('  PASS ' + name + ' — ' + got); }
  else { fail++; console.log('  FAIL ' + name + ' — ' + got); }
};
const near = (name, got, want, tol) =>
  ok(name + ' (기대 ' + want + ', Δ≤' + tol + ')', Math.abs(got - want) <= tol,
    (+got.toFixed(4)) + '  Δ' + (got - want >= 0 ? '+' : '') + (+(got - want).toFixed(4)));

const IDX = 'file://' + path.resolve(__dirname, '../index.html');
const ART = (n) => path.resolve(__dirname, '../assets/ui/cur-' + n + '.svg');
const REF_Y_OFF = 84;

/* verify340 과 같은 창·마스크 — 자를 새로 만들면 값이 갈린다(402 «표 두 벌» 교훈) */
const WIN = { gold: { x: 488, y: 99, w: 82, h: 82 }, dia: { x: 789, y: 99, w: 82, h: 82 } };
const MASKS = {
  gold: '(r,g,b) => r > 150 && g > 110 && b < 130 && r - b > 60',
  dia:  '(r,g,b) => b > 130 && b - r > 40 && g > 90',
};
/* ref 실측(340 §1 이 매 실행 다시 재서 못박는 값) */
const REF_RATIO = { gold: 0.875, dia: 0.875 };
const RATIO_TOL = 0.02;     /* 512px 래스터 AA + ref JPEG 반올림 몫 */
const ANISO = 1.03;         /* 축 비대칭 상한 — ref 는 1.002 */
const GAUGE = 1.05;         /* 411·356 «덩치 최대÷최소» 눈금 */
const BOX = 65.3;

/* 아트 단독 렌더 — 알파 = 실루엣 · 색 마스크 = 색 잉크 */
const ART_SRC = `async ({ href, N, mask }) => {
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = href; });
  const c = document.createElement('canvas'); c.width = N; c.height = N;
  const g = c.getContext('2d'); g.clearRect(0, 0, N, N); g.drawImage(im, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N).data;
  const m = eval('(' + mask + ')');
  const acc = () => ({ lo: 1e9, hi: -1e9, top: 1e9, bot: -1e9, n: 0 });
  const add = (o, x, y) => { o.n++; if (x < o.lo) o.lo = x; if (x > o.hi) o.hi = x; if (y < o.top) o.top = y; if (y > o.bot) o.bot = y; };
  const put = (o) => ({ w: o.hi - o.lo + 1, h: o.bot - o.top + 1 });
  const sil = acc(), col = acc();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const o = (y * N + x) * 4;
    if (d[o+3] < 128) continue;
    add(sil, x, y);
    if (m(d[o], d[o+1], d[o+2])) add(col, x, y);
  }
  if (sil.n < 20 || col.n < 20) return null;
  const s = put(sil), c2 = put(col);
  return { rw: c2.w / s.w, rh: c2.h / s.h, sil: s, col: c2 };
}`;

const SCAN_SRC = `(A, B, W, H, mask) => {
  const acc = () => ({ lo: 1e9, hi: -1e9, top: 1e9, bot: -1e9, n: 0 });
  const add = (o, x, y) => { o.n++; if (x < o.lo) o.lo = x; if (x > o.hi) o.hi = x; if (y < o.top) o.top = y; if (y > o.bot) o.bot = y; };
  const put = (o) => ({ w: o.hi - o.lo + 1, h: o.bot - o.top + 1 });
  const sil = acc(), col = acc();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, r = A[o], g = A[o+1], b = A[o+2];
    if ((Math.abs(r - B[o]) + Math.abs(g - B[o+1]) + Math.abs(b - B[o+2])) < 18) continue;
    add(sil, x, y);
    if (mask(r, g, b)) add(col, x, y);
  }
  return { sil: sil.n > 20 ? put(sil) : null, col: col.n > 20 ? put(col) : null };
}`;

async function artRatio(page, svgText, mask) {
  const href = 'data:image/svg+xml;base64,' + Buffer.from(svgText, 'utf8').toString('base64');
  return page.evaluate(eval('(' + ART_SRC + ')'), { href, N: 512, mask });
}

async function capInk(page, kind, sel) {
  const w = WIN[kind];
  await page.evaluate(() => {
    if (document.getElementById('v671-freeze')) return;
    const s = document.createElement('style'); s.id = 'v671-freeze';
    s.textContent = '.pcb-p>b{visibility:hidden!important}.pcb-p,.pcb-p>i,.pcb-p>i>.cic{animation:none!important;transition:none!important}';
    document.head.appendChild(s);
  });
  await page.waitForTimeout(120);
  const clip = { x: w.x, y: w.y - REF_Y_OFF, width: w.w, height: w.h };
  const on = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate((s) => { document.querySelector(s).style.visibility = 'hidden'; }, sel);
  await page.waitForTimeout(120);
  const off = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate((s) => { document.querySelector(s).style.visibility = ''; }, sel);
  await page.waitForTimeout(60);
  return page.evaluate(async ({ on, off, MASK, SCAN_SRC }) => {
    const load = async (s) => { const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/png;base64,' + s; });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      return { d: g.getImageData(0, 0, im.width, im.height).data, W: im.width, H: im.height }; };
    const A = await load(on), B = await load(off);
    return eval('(' + SCAN_SRC + ')')(A.d, B.d, A.W, A.H, eval('(' + MASK + ')'));
  }, { on, off, MASK: MASKS[kind], SCAN_SRC });
}

(async () => {
  const browser = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  const srcDia = fs.readFileSync(ART('dia'), 'utf8'), srcGold = fs.readFileSync(ART('gold'), 'utf8');
  try {
    await page.goto(IDX);
    await page.waitForTimeout(900);

    /* ── [A] 아트 — 색 잉크가 실루엣의 몇 할인가 (자리와 무관한 아트 자신의 규격) ── */
    console.log('\n[A] 아트 규격 — 색÷실루엣이 두 축 모두 ref .875 에 붙는가');
    const a = { gold: await artRatio(page, srcGold, MASKS.gold), dia: await artRatio(page, srcDia, MASKS.dia) };
    for (const k of ['gold', 'dia']) {
      if (!a[k]) { ok('[A] ' + k + ' 아트 측정', false, '안 그려진다'); continue; }
      near('[A] cur-' + k + '.svg 색÷실루엣 가로', a[k].rw, REF_RATIO[k], RATIO_TOL);
      near('[A] cur-' + k + '.svg 색÷실루엣 세로', a[k].rh, REF_RATIO[k], RATIO_TOL);
      const an = Math.max(a[k].rw, a[k].rh) / Math.min(a[k].rw, a[k].rh);
      ok('[A] cur-' + k + '.svg 축 비대칭 ≤ ' + ANISO + ' (등방 — 정사각 상자 안에서 한 축만 맞추면 다른 축이 벌어진다)',
        an <= ANISO, an.toFixed(3));
    }
    /* 파일 자체의 선언 — 671 이 «어떻게» 등방을 얻었는지가 지워지면 여기가 먼저 빨갛다 */
    ok('[A] 젬 실루엣은 몸통 뒤에 따로 깔린다 (straddle stroke 아님 — 그것이 가로 .848 의 뿌리였다)',
      /d="M19\.143 2h25\.714/.test(srcDia), (/(<path d="M19[^"]*")/.exec(srcDia) || ['—'])[0].slice(0, 46));
    ok('[A] 면 분할선이 몸통으로 클립된다 (테 위로 삐져나오면 세로가 .973 으로 부푼다)',
      /clip-path="url\(#diaBody\)"/.test(srcDia), /clip-path/.test(srcDia) ? '있다' : '없다');
    ok('[A] 몸통 path 는 644 이전부터 그대로다 (671 은 테만 다시 둘렀다 — 356 등방 규약)',
      /M20 4h24l16 18-28 38L4 22z/.test(srcDia), '몸통 4..60');

    /* ── [B] 자리 — 코인·젬이 한 상자다 ── */
    console.log('\n[B] 자리 — 같은 아트 규격이면 상자도 한 값이어야 한다(644 가 남긴 비 1.106 을 닫는다)');
    await page.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
    await page.waitForTimeout(1700);
    await page.evaluate(() => { try { msgT = 0; } catch (e) {} const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });
    await page.waitForTimeout(250);
    /* ⚠ 시트는 «열려 있는 동안» 재야 한다 — 닫힌 시트의 rect 는 0 이라 비가 NaN 이 된다.
       한 evaluate 안에서 탭을 갈아타면 앞 시트가 닫히므로 자리마다 따로 잰다. */
    const RD = '(s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [+b.width.toFixed(2), +b.height.toFixed(2)]; }';
    const grab = (sels) => page.evaluate(({ sels, RD }) => {
      const R = eval('(' + RD + ')'); const o = {};
      for (const k in sels) o[k] = R(sels[k]);
      return o;
    }, { sels, RD });
    const boxes = await grab({
      hudG: '#top .curs .cGold i>.cic', hudD: '#top .curs .cbox[data-cur="dia"] i>.cic',
      dunG: '#dunw .pcb-g img.cic', dunD: '#dunw .pcb-d img.cic',
    });
    await page.evaluate(() => { const t = document.querySelector('#tabbar [data-t="shop"]'); t && t.click(); });
    await page.waitForTimeout(700);
    Object.assign(boxes, await grab({ shopG: '#shopw .pcb-g img.cic', shopD: '#shopw .pcb-d img.cic' }));
    await page.evaluate(() => { try { openRelw(); } catch (e) {} });
    await page.waitForTimeout(700);
    Object.assign(boxes, await grab({ relG: '#relw .pcb-g img.cic', relD: '#relw .pcb-d img.cic' }));
    for (const [nm, g, d] of [['HUD', 'hudG', 'hudD'], ['03 던전', 'dunG', 'dunD'],
                              ['10 상점', 'shopG', 'shopD'], ['89 유물', 'relG', 'relD']]) {
      const G = boxes[g], D = boxes[d];
      if (!G || !D) { ok('[B] ' + nm + ' 표본', false, JSON.stringify([G, D])); continue; }
      ok('[B] ' + nm + ' 코인 = 젬 = ' + BOX + ' (671 — 한 값)',
        Math.abs(G[0] - BOX) <= 1 && Math.abs(D[0] - BOX) <= 1 && Math.abs(G[0] - D[0]) <= 0.5,
        G[0] + ' / ' + D[0] + ' = 비 ' + (Math.max(G[0], D[0]) / Math.min(G[0], D[0])).toFixed(3));
    }

    /* ── [C] 잉크 — 실제로 그려진 덩치가 눈금 안인가 ── */
    console.log('\n[C] 03 던전 실측 잉크 — 411·356 «덩치 최대÷최소 ≤ ' + GAUGE + '»');
    await page.evaluate(() => { document.querySelector('#tabbar [data-t="adv"]').click(); });
    await page.waitForTimeout(900);
    const cap = { gold: await capInk(page, 'gold', '#dunw .pcb-g>i'), dia: await capInk(page, 'dia', '#dunw .pcb-d>i') };
    const gw = cap.gold.col.w, dw = cap.dia.col.w, gh = cap.gold.col.h, dh = cap.dia.col.h;
    ok('[C] 색 잉크 가로 최대÷최소 ≤ ' + GAUGE, Math.max(gw, dw) / Math.min(gw, dw) <= GAUGE,
      'gold ' + gw + ' · dia ' + dw + ' = ' + (Math.max(gw, dw) / Math.min(gw, dw)).toFixed(3));
    ok('[C] 색 잉크 세로 최대÷최소 ≤ ' + GAUGE, Math.max(gh, dh) / Math.min(gh, dh) <= GAUGE,
      'gold ' + gh + ' · dia ' + dh + ' = ' + (Math.max(gh, dh) / Math.min(gh, dh)).toFixed(3));
    const gs = cap.gold.sil.w, ds = cap.dia.sil.w;
    ok('[C] 실루엣 가로 최대÷최소 ≤ ' + GAUGE + ' (수리 전 66 ÷ 59 = 1.119)',
      Math.max(gs, ds) / Math.min(gs, ds) <= GAUGE,
      'gold ' + gs + ' · dia ' + ds + ' = ' + (Math.max(gs, ds) / Math.min(gs, ds)).toFixed(3));

    /* ── [R] 되돌림 시험 — 무르게 푼 수리가 아님을 두 방향에서 못박는다 ── */
    console.log('\n[R] 되돌림 시험');
    /* R-1 — 옛 테 규격(몸통에 straddle stroke 4 · 클립 없음 · 캔버스 2 2 60 60)으로 되돌린 사본 */
    const OLD_DIA = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 60 60" width="64" height="64" shape-rendering="geometricPrecision">'
      + '<path d="M20 4h24l16 18-28 38L4 22z" fill="#2FA7D8" stroke="#000" stroke-width="4" stroke-linejoin="round"/>'
      + '<path d="M20 4l-6 18 18 38 18-38-6-18z" fill="#67D8F7" stroke="#0E6E96" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<path d="M14 22h36" stroke="#0E6E96" stroke-width="2.5"/>'
      + '<path d="M20 4l12 18L44 4" fill="none" stroke="#0E6E96" stroke-width="2.5" stroke-linejoin="round"/>'
      + '<path d="M22 24l6 24-14-26z" fill="#CFF6FF" opacity=".9"/></svg>';
    const oldR = await artRatio(page, OLD_DIA, MASKS.dia);
    const oldAn = oldR && Math.max(oldR.rw, oldR.rh) / Math.min(oldR.rw, oldR.rh);
    ok('[R-1] 옛 테 규격 사본은 [A] 축 비대칭에서 빨개진다 (수리 전 1.147)',
      !!oldR && oldAn > ANISO, oldR ? 'w ' + oldR.rw.toFixed(3) + ' · h ' + oldR.rh.toFixed(3) + ' = ' + oldAn.toFixed(3) : '—');
    ok('[R-1b] 그 사본은 가로가 ref .875 에서 벗어난다 (그것이 상자를 못 모으던 이유다)',
      !!oldR && Math.abs(oldR.rw - REF_RATIO.dia) > RATIO_TOL, oldR ? oldR.rw.toFixed(3) : '—');
    /* R-2 — 상자를 644 값(59.06)으로 되돌린 사본: [C] 눈금이 깨진다 */
    await page.addStyleTag({ content: '#dunw .pcb-d>i>.cic{width:59.06px!important;height:59.06px!important}' });
    await page.waitForTimeout(200);
    const bad = await capInk(page, 'dia', '#dunw .pcb-d>i');
    ok('[R-2] 상자를 59.06 으로 되돌린 사본은 [C] 가로 눈금이 깨진다',
      Math.max(gw, bad.col.w) / Math.min(gw, bad.col.w) > GAUGE,
      'gold ' + gw + ' · dia ' + bad.col.w + ' = ' + (Math.max(gw, bad.col.w) / Math.min(gw, bad.col.w)).toFixed(3));
    await page.evaluate(() => { const s = document.querySelectorAll('style'); s[s.length - 1].remove(); });
    await page.waitForTimeout(200);
    const back = await capInk(page, 'dia', '#dunw .pcb-d>i');
    ok('[R-3] 주입을 걷어내면 다시 초록 (술어를 무르게 푼 것이 아니다)',
      Math.max(gw, back.col.w) / Math.min(gw, back.col.w) <= GAUGE,
      'dia ' + back.col.w);

    console.log('\n[E] 콘솔');
    ok('[E] 콘솔 에러 0건', errs.length === 0, errs.length + '건' + (errs[0] ? ' — ' + errs[0].slice(0, 140) : ''));
  } catch (e) {
    fail++; console.log('  FAIL 실행 — ' + e.message);
  } finally {
    await browser.close();
  }
  console.log('\nVERIFY671 ' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
