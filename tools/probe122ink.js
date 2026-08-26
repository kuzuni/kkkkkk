/* 작업 122 — 들썩(bob) «잉크» 진폭 측정기 (16회차 신설)
 *
 * 왜 필요한가.
 *   §18 은 `getComputedStyle().rotate / .translate` 를 읽어 5칸 전부 «−6.0px» 로 **통과**한다.
 *   그런데 14회차 비평가 AJ 는 아이콘 **잉크**를 재서 −5.13 ~ −7.61px 를 얻었다(사양 −6.0).
 *   둘 다 맞다 — 서로 «다른 것» 을 재고 있다. 선언값은 translate 한 축이지만,
 *   화면에 보이는 잉크는 **들썩(translate) + 숨쉬기(scale) 가 동시에** 민다:
 *
 *     scale(s) 는 `transform-origin` 을 중심으로 늘리므로, 잉크 중심이 원점에서 d 만큼
 *     떨어져 있으면 잉크 중심을 **(s−1)·d** 만큼 밀어낸다.
 *
 *   `.cart` 는 274×204 상자에 `line-height:204px` 로 이모지를 앉힌 것이라 **잉크 중심이
 *   상자 중심(= 기본 origin 50% 50%)과 어긋나 있다.** 그래서 숨쉬기 4% 가 들썩에 얹혀
 *   칸마다 다른 부호·크기로 진폭을 흔든다. 비평가가 잰 산포 −5.13~−7.61 이 그 값이다.
 *
 * 재는 법 (비평가가 재는 바로 그 표본에서).
 *   ① 칸마다 `.cart` 의 **애니메이션을 끈 상태**의 rect 로 «고정» 클립을 만든다.
 *      (프레임마다 변형된 rect 를 따라가면 움직임이 그대로 상쇄돼 0 이 나온다.)
 *   ② 캡처 격자 t = 80,400,…,2640ms (320ms · 비평가에게 준 것과 같은 격자) 에서 찍는다.
 *   ③ **`.cart` 말고는 전부 애니메이션을 끈다.** 첫 판에서 이걸 안 했더니 칸1·칸3 이
 *      48~57px 로 나왔다 — 배경 빛입자(`jz122Rise`)·헤더 스윕·글로우가 같은 클립 안에서
 *      움직여 centroid 를 통째로 끌고 다닌 것이다(이모지는 1~3px 밖에 안 움직인다).
 *      끄지 않는 것은 `.cart` 자신의 두 애니메이션(숨쉬기·들썩)뿐 — **그 둘의 결합**이 잰다.
 *   ④ **배경 플레이트와의 차분**으로 잉크를 뽑는다. `.cart` 까지 숨긴 판을 칸마다 한 장 찍어 두고
 *      (숨겨도 레이아웃은 그대로다) 각 정지 프레임에서 화소별 색거리를 잰다 — 배경이 **정확히**
 *      상쇄되므로 남는 것은 이모지가 칠한 화소뿐이다. 그 위에서 centroid 를 낸다.
 *
 *      ⚑ 두 번째 실패에서 배운 것: «클립의 최빈 루마를 바탕으로 보고 |L−최빈|>T» 는 못 쓴다.
 *        바탕이 평탄하지 않아(카드 안 220 · 카드 밖 다른 값) 마스크 87k/115k 가 **배경**이었고,
 *        최빈값 선거가 실행마다 카드 안↔밖으로 뒤집혀 마스크 화소 수가 **40k ↔ 90k 로 두 배**
 *        튀었다. 그때 나온 «칸4 15.42px» 는 이모지가 아니라 **마스크가 움직인 값**이다.
 *        (같은 임계로 두 번 돌려 칸1 이 4.80 → 9.19 로 달라진 것이 그 증거였다.)
 *   ④ 칸별로 centroid y 의 (최대 − 최소) = «격자에서 읽히는 잉크 세로 진폭».
 *      들썩 사양이 translateY −6px 이고 origin 이 잉크 중심에 있으면 이 값은 6.0 이어야 한다
 *      (scale 도 rotate 도 자기 중심을 기준으로 돌면 centroid 를 못 민다).
 *      x 진폭은 회전이 잉크 중심 밖을 돌 때만 생기므로 «0 에 가까울수록 좋다» 는 진단값이다.
 *
 * 실행: node tools/probe122ink.js
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const STOPS = [80, 400, 720, 1040, 1360, 1680, 2000, 2320, 2640];
const PAD = 34;   /* ±6px 이동 + 4% 확대(≈±5.5) + 3° 회전(≈±10) 을 다 담고도 남는 여유 */

const seek = (p, ms) => p.evaluate(t => {
  document.getAnimations().forEach(a => {
    const jz = /^jz122/.test(a.animationName || '');
    try {
      if (jz) { a.pause(); a.currentTime = t; }
      else if ((a.effect && a.effect.getComputedTiming().iterations) === Infinity) a.cancel();
      else a.finish();
    } catch (_) { try { a.cancel(); } catch (__) {} }
  });
}, ms);

/* 122 상시 연출만 잠깐 끄고 «변형 없는» 레이아웃 rect 를 읽는다 */
const FREEZE_CSS = '#shopList .cart{animation-name:none!important}';
/* 측정 내내 켜 두는 것 — `.cart` 말고는 **안 보이게** 한다.
   ⚑ 첫 판은 «다른 애니메이션만 끄기» 로 했는데 실패했다. 임계 마스크가 클립의 93%(110129/118592)를
      «잉크» 로 세어(카드 면이 최빈 루마 근처가 아니다) centroid 가 사실상 클립 중심에 못 박혔고,
      칸3 은 진폭이 **정확히 0.00px** 로 나왔다 — 이모지가 안 움직인 것이 아니라 **안 보인 것**이다.
   `visibility` 는 **레이아웃도 변형도 안 건드린다** — `.cart` 의 위치·scale·rotate 는 그대로다.
   그래서 «이모지만 남은 평탄한 바탕» 이 되고, 임계 마스크가 비로소 잉크만 센다. */
const ISOLATE_CSS = [
  '#shopList *,#shopList *::before,#shopList *::after{visibility:hidden!important}',
  '#shopList .cart,#shopList .cart *,#shopList .cart::before,#shopList .cart::after{visibility:visible!important}',
].join('\n');
const setCss = (p, c) => p.evaluate(x => {
  let s = document.getElementById('p122ink');
  if (!s) { s = document.createElement('style'); s.id = 'p122ink'; document.head.appendChild(s); }
  s.textContent = x;
}, c);

/* 배경 플레이트를 페이지 안에 심어 둔다(칸마다 한 번) */
async function setPlate(p, box) {
  const b64 = (await p.screenshot({ clip: box })).toString('base64');
  await p.evaluate(async src => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res; img.onerror = () => rej(new Error('PNG 디코딩 실패'));
      img.src = 'data:image/png;base64,' + src;
    });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    window.__plate = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    window.__plateW = c.width; window.__plateH = c.height;
  }, b64);
}

/* 클립 하나에서 잉크 중심을 낸다 — 배경 플레이트 대비 색거리 마스크의 centroid */
async function centroid(p, box, thr) {
  const b64 = (await p.screenshot({ clip: box })).toString('base64');
  return await p.evaluate(async ([src, T]) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res; img.onerror = () => rej(new Error('PNG 디코딩 실패'));
      img.src = 'data:image/png;base64,' + src;
    });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const pl = window.__plate;
    if (!pl || c.width !== window.__plateW || c.height !== window.__plateH) return null;
    let sw = 0, sx = 0, sy = 0, mn = 0, mx = 0, my = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      /* 배경과의 색거리 — 배경이 정확히 상쇄되므로 남는 것은 이모지가 칠한 화소뿐이다 */
      const w = Math.abs(d[i] - pl[i]) + Math.abs(d[i + 1] - pl[i + 1]) + Math.abs(d[i + 2] - pl[i + 2]);
      sw += w; sx += w * x; sy += w * y;
      if (w > T) { mn++; mx += x; my += y; }
    }
    if (!mn || !sw) return null;
    return { x: mx / mn, y: my / mn, n: mn, wx: sx / sw, wy: sy / sw };
  }, [b64, thr]);
}

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(700);
  await p.evaluate(() => { openShopPage(); shopCat = 'summon'; setShopCatTabs('summon'); renderShopPage(); });
  await p.waitForTimeout(500);

  const nCards = await p.evaluate(() => document.querySelectorAll('#shopList .shp-card .cart').length);
  console.log('소환 카드 ' + nCards + '칸 · 격자 ' + STOPS.join('/') + 'ms');
  const THR = +(process.argv[2] || 80);
  /* --nobreathe — 숨쉬기(첫 애니메이션)만 끄고 들썩만 남긴다. 두 항을 가르는 결정 실험이다:
     여기서 진폭이 6.00 으로 떨어지면 초과분은 전부 «숨쉬기가 잉크를 민 것» 이고,
     그대로 7.5 면 초과분은 들썩 자신(또는 자) 안에 있다. */
  const NOB = process.argv.includes('--nobreathe');
  const NOB_CSS = NOB ? '\n#shopList .shp-card:nth-child(odd) .cart{animation-name:none,jz122Bob!important}'
    + '\n#shopList .shp-card:nth-child(even) .cart{animation-name:none,jz122BobR!important}' : '';
  console.log('잉크 임계 = 배경 플레이트 대비 색거리 > ' + THR + (NOB ? '   [숨쉬기 OFF]' : '') + '\n');

  const rows = [];
  for (let i = 0; i < nCards; i++) {
    /* ① 애니메이션을 끈 상태의 rect → 고정 클립 */
    await setCss(p, FREEZE_CSS);
    await p.waitForTimeout(60);
    const box = await p.evaluate(([idx, pad]) => {
      const e = document.querySelectorAll('#shopList .shp-card .cart')[idx];
      if (!e) return null;
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      const x = Math.round(r.x) - pad, y = Math.round(r.y) - pad;
      const w = Math.round(r.width) + pad * 2, h = Math.round(r.height) + pad * 2;
      if (x < 0 || y < 0 || x + w > innerWidth || y + h > innerHeight) return null;
      return { x, y, width: w, height: h };
    }, [i, PAD]);
    if (!box) { await setCss(p, ''); console.log('칸' + (i + 1) + ' — 화면 밖, 건너뜀'); continue; }
    /* 배경 플레이트 — `.cart` 까지 숨겨서 한 장. 숨겨도 레이아웃은 그대로다. */
    await setCss(p, ISOLATE_CSS + NOB_CSS + '\n#shopList .cart{visibility:hidden!important}');
    await p.waitForTimeout(60);
    await setPlate(p, box);
    await setCss(p, ISOLATE_CSS);
    await p.waitForTimeout(60);

    /* «쉬는 자세» 의 잉크 중심 — 이것이 곧 `transform-origin` 이 앉아야 할 자리다.
       애니메이션을 끈 상태(변형 없음)에서 재고, 요소 상자 중심과의 차를 낸다. */
    await setCss(p, ISOLATE_CSS + '\n#shopList .cart{animation-name:none!important}');
    await p.waitForTimeout(60);
    const rest = await centroid(p, box, THR);
    const geo = await p.evaluate(idx => {
      const e = document.querySelectorAll('#shopList .shp-card .cart')[idx];
      const cs2 = getComputedStyle(e);
      return { ow: e.offsetWidth, oh: e.offsetHeight, org: cs2.transformOrigin };
    }, i);
    await setCss(p, ISOLATE_CSS + NOB_CSS);
    await p.waitForTimeout(60);

    const cs = [];
    for (const t of STOPS) {
      await seek(p, t);
      /* 선언값도 같이 읽어 둔다 — §18 이 보는 바로 그 값이라, 잉크와 어긋나면
         그 차이가 «숨쉬기가 잉크를 민 양» 이다(이 회차가 찾는 것). */
      const dec = await p.evaluate(idx => {
        const e = document.querySelectorAll('#shopList .shp-card .cart')[idx];
        const s = getComputedStyle(e);
        return {
          ty: parseFloat((s.translate || '').split(' ')[1] || '0') || 0,
          rot: parseFloat(s.rotate) || 0,
          sc: parseFloat(s.scale) || 1,
        };
      }, i);
      const c = await centroid(p, box, THR);
      if (c) cs.push({ t, ...c, ...dec });
    }
    if (cs.length < STOPS.length) { console.log('칸' + (i + 1) + ' — 표본 부족'); continue; }
    const ys = cs.map(c => c.y), xs = cs.map(c => c.x), wys = cs.map(c => c.wy);
    const ay = Math.max(...ys) - Math.min(...ys), ax = Math.max(...xs) - Math.min(...xs);
    const awy = Math.max(...wys) - Math.min(...wys);
    rows.push({ i: i + 1, ay, ax, awy });
    const tys = cs.map(c => c.ty);
    const aty = Math.max(...tys) - Math.min(...tys);
    rows[rows.length - 1].aty = aty;
    console.log('칸' + (i + 1) + '  세로 잉크 진폭 ' + ay.toFixed(2) + 'px   vs 선언 translateY 진폭 '
      + aty.toFixed(2) + 'px   (차 ' + (ay - aty >= 0 ? '+' : '') + (ay - aty).toFixed(2) + 'px)');
    console.log('      잉크 y = ' + ys.map(v => v.toFixed(1)).join(' '));
    console.log('      선언 ty = ' + tys.map(v => v.toFixed(1)).join(' ')
      + ' · rot = ' + cs.map(c => c.rot.toFixed(2)).join(' ')
      + ' · scale = ' + cs.map(c => c.sc.toFixed(3)).join(' '));
    console.log('      가로 진폭 ' + ax.toFixed(2) + 'px · 가중 centroid ' + awy.toFixed(2)
      + 'px · 클립 ' + (box.width * box.height) + '화소');
    /* ⚑ 마스크 화소 수를 **정지마다** 찍는다 — 이 수가 흔들리면 centroid 이동은
       «잉크가 움직인 것» 이 아니라 «무엇을 잉크로 셀지가 바뀐 것» 이다(측정 실패). */
    console.log('      마스크 n = ' + cs.map(c => c.n).join(' '));
    if (rest) {
      /* 클립 좌표 → 요소 좌표. 클립은 rect 를 PAD 만큼 넓힌 것이므로 rest.y − PAD 가 요소 안 y.
         요소 상자 높이 oh 의 절반이 지금의 origin y(50%) 이다. */
      const inkY = rest.y - PAD, halfH = geo.oh / 2;
      /* 클립 폭은 «변형된» rect 폭(= scaleX 가 이미 걸린 값)이라 요소 중심은 클립 중심이다 */
      const dx = rest.x - box.width / 2, dy = inkY - halfH;
      console.log('      쉬는 잉크 중심 — 상자 중심에서 dx ' + (dx >= 0 ? '+' : '') + dx.toFixed(1)
        + 'px · dy ' + (dy >= 0 ? '+' : '') + dy.toFixed(1) + 'px  (현재 origin ' + geo.org + ')');
      /* 회전 ±3° 가 잉크 중심을 세로로 미는 양 = |dx|·sin3° × 2(양끝) */
      console.log('      → 회전이 세로로 미는 예측량 ' + (Math.abs(dx) * Math.sin(3 * Math.PI / 180) * 2).toFixed(2)
        + 'px · 숨쉬기(4%)가 미는 예측량 ' + (Math.abs(dy) * 0.04).toFixed(2) + 'px');
    }
  }

  if (rows.length) {
    const ays = rows.map(r => r.ay);
    console.log('\n세로 진폭 산포 ' + Math.min(...ays).toFixed(2) + ' ~ ' + Math.max(...ays).toFixed(2)
      + 'px (사양 6.00 · 편차 ' + (Math.max(...ays) - Math.min(...ays)).toFixed(2) + 'pp)');
    console.log('가로 진폭 최대 ' + Math.max(...rows.map(r => r.ax)).toFixed(2) + 'px (0 에 가까울수록 좋다)');
  }
  await b.close();
})();
