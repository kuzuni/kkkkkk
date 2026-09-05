/* 작업 148 — 가이드 미션 배너 L1 «[미션-n]» · L3 «(0/10)» 의 글리프 어간을 ref 값으로 «푼다».
   실행: node tools/solve148.js [반복수]

   방법 — 어간을 «런» 으로 재면 두 글자가 붙은 순간 경계가 사라져 되먹임이 끊긴다.
   그래서 **글리프 하나만 남기고 형제를 `visibility:hidden` 으로 지운 뒤** 각자의 잉크 bbox 를 따로 잰다
   (54 가 `.rk-ch{visibility:hidden}` 로 쓴 것과 같은 수법). 그러면 겹쳐 있어도 어간이 음수로 정확히 나온다.
   어간 = 다음 잉크좌단 − 이전 잉크우단 − 1.

   ref(측정표 61 §2-3, 가로 1:1):
     L1 `[`714-723 · `미`727-750 · `션`755-778 · `-`785-797 · 숫자 803- · `]`863-873
        → 어간 [→미 3 · 미→션 4 · 션→- 6 · -→숫자 5 · 숫자→] 3
     L3 `(`741-748 · `0`753-769 · `/`775-784 · `1`789-796 · `0`801-818 · `)`821-829
        → 어간 4 · 5 · 4 · 4 · 2
   `미`·`션` 사이는 같은 `<i>` 안이라 margin 이 아니라 `letter-spacing` 으로 민다. */
const path = require('path');
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 (옛 require 는 스택 트레이스 + 코드 1) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const TGT1 = { g1: 3, g2: 4, g3: 6, g4: 5, g5: 3 };
const TGT3 = { g1: 4, g2: 5, g3: 4, g4: 4, g5: 2 };
/* ref 총 잉크 폭 — L1 은 ref 문자열이 `[미션-227]`(160) 이라 우리 `[미션-1]` 로 환산했다:
   `[`10 +3 +`미`24 +4 +`션`24 +6 +`-`13 +5 +`1`8(=ref L3 의 `1`) +3 +`]`11 = **111**.
   L3 는 ref 가 그대로 `(0/10)` = 741..829 = **89**. */
const W1 = 111, W3 = 89;

/* 배너 바탕은 반투명 검정이라 뒤 전투 씬의 색이 그대로 비친다 — «유채 화소 = 글자» 가 성립하지 않는다.
   그래서 **전 글리프를 숨긴 기준 컷과의 차분**으로 잉크를 잡는다. 글리프가 그린 화소만 남는다.
   차분에는 검정 외곽선도 포함되므로, «색 잉크» 만 보려면 밝기 조건을 같이 건다. */
function inkBoxDiff(buf, base) {
  const img = PNG.sync.read(buf), b0 = PNG.sync.read(base);
  const W = img.width, H = img.height;
  let x0 = 1e9, x1 = -1;
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      const R = img.data[i], G = img.data[i+1], B = img.data[i+2];
      const r0 = b0.data[i], g0 = b0.data[i+1], bb0 = b0.data[i+2];
      const d = Math.abs(R - r0) + Math.abs(G - g0) + Math.abs(B - bb0);
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      /* 차분이 있고 **그 화소가 색 잉크(민트·주황·흰)** 인 것만 = 외곽선은 뺀다 */
      if (d > 40 && mx > 120 && (mx - mn > 40 || mx > 200)) { if (x < x0) x0 = x; if (x > x1) x1 = x; break; }
    }
  return x1 < 0 ? null : [x0, x1];
}

(async () => {
  const N = +(process.argv[2] || 8);
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => {
    gmCloseAll(); closeModal(); Object.assign(S, DEF());
    S.guide.idx = 0; S.guide.gv = GUIDE_V; S.guide.prog = -1; gmBase(GUIDE[0]);
    GUIDE[0].goal = 10; uiDirty = true; renderUI(); drawTuto();
    /* 배너 바탕이 반투명이라 전투 씬이 비치고, 씬은 매 프레임 움직인다 →
       차분 계측이 «배경 변화» 를 잉크로 오인한다. 캔버스를 지워 바탕을 정지시킨다. */
    document.getElementById('view').style.visibility = 'hidden';
    /* ⚠ 게임 루프가 매 프레임 `drawTuto()` 로 배너 innerHTML 을 다시 쓴다 →
       내가 넣은 글리프 분해 span 과 inline visibility 가 통째로 날아간다. 계측 동안만 얼린다. */
    window.drawTuto = () => {}; window.renderUI = () => {}; window.drawHUD = window.drawHUD && (() => {});
  });
  await p.waitForTimeout(250);

  /* 현행값에서 출발한다 (index.html 과 같은 수 — 148 이 넣은 값).
     148 이전(버그 상태)은 P1{-1,-1,-4,-4,0,0,0,-3,-3,1.31} · P3{1,1,2,1,-1,-1,1.4} 였다. */
  const P1 = { bl: 0, br: 1.25, il: -1.75, ir: -0.5, ils: 5, sl: 3.5, sr: 3.25, el: 0.25, er: -2, sx: 1.12 };
  const P3 = { bl: 2.25, br: -1, sl: 4.5, sr: 2.25, el: 0.25, er: 0.25, sx: 1.155 };
  /* `--fix1 bl,br,il,ir,ils,sl,sr,el,er --fix3 bl,br,sl,sr,el,er` 로 값을 고정하고
     되먹임 없이 N 번 «같은 값을 반복 계측» 한다(잉크 계측의 흔들림을 본다). */
  const argv = process.argv.slice(2);
  const grab = k => { const i = argv.indexOf(k); return i < 0 ? null : argv[i+1].split(',').map(Number); };
  const f1 = grab('--fix1'), f3 = grab('--fix3');
  if (f1) [P1.bl, P1.br, P1.il, P1.ir, P1.ils, P1.sl, P1.sr, P1.el, P1.er, P1.sx] = f1;
  if (f3) [P3.bl, P3.br, P3.sl, P3.sr, P3.el, P3.er, P3.sx] = f3;
  const FROZEN = !!(f1 || f3);
  /* `--nosx` : 부모 scaleX 는 그대로 두고 margin(어간)만 푼다 — 글리프별 잉크 폭을 따로 손봤을 때 쓴다. */
  const NOSX = argv.includes('--nosx');

  const apply = async () => {
    await p.evaluate(({ P1, P3 }) => {
      let st = document.getElementById('s148');
      if (!st) { st = document.createElement('style'); st.id = 's148'; document.head.appendChild(st); }
      st.textContent = `
        #tuto.todo .tbtn{transform:translateZ(0) translateX(-50%) scaleX(${P1.sx}) !important}
        #tuto.todo .tpg {transform:translateZ(0) translateX(-50%) scaleX(${P3.sx}) !important}
        #tuto.todo .tbtn b{margin:0 ${P1.br}px 0 ${P1.bl}px !important}
        #tuto.todo .tbtn i{margin:0 ${P1.ir}px 0 ${P1.il}px !important;letter-spacing:${P1.ils}px !important}
        #tuto.todo .tbtn s{margin:0 ${P1.sr}px 0 ${P1.sl}px !important}
        #tuto.todo .tbtn em{margin:0 ${P1.er}px 0 ${P1.el}px !important}
        #tuto.todo .tpg b{margin:0 ${P3.br}px 0 ${P3.bl}px !important}
        #tuto.todo .tpg s{margin:0 ${P3.sr}px 0 ${P3.sl}px !important}
        #tuto.todo .tpg em{margin:0 ${P3.er}px 0 ${P3.el}px !important}`;
    }, { P1, P3 });
    await p.waitForTimeout(120);
  };

  /* 한 요소만 남기고 형제를 지운 뒤 그 요소의 잉크 좌·우단을 잰다. */
  const measure = async (host, idxs) => {
    const clip = await p.evaluate((host) => {
      const el = document.querySelector(host), b = el.getBoundingClientRect();
      return { x: Math.round(b.x) - 40, y: Math.round(b.y) - 10,
               width: Math.round(b.width) + 80, height: Math.round(b.height) + 20 };
    }, host);
    await p.evaluate((host) => {
      [...document.querySelector(host).children].forEach(k => k.style.visibility = 'hidden');
    }, host);
    await p.waitForTimeout(40);
    const base = await p.screenshot({ clip });
    const res = [];
    for (const i of idxs) {
      await p.evaluate(({ host, i }) => {
        const kids = [...document.querySelector(host).children];
        kids.forEach((k, j) => k.style.visibility = (j === i ? 'visible' : 'hidden'));
      }, { host, i });
      await p.waitForTimeout(40);
      const bx = inkBoxDiff(await p.screenshot({ clip }), base);
      res.push(bx ? [bx[0] + clip.x, bx[1] + clip.x] : null);
    }
    await p.evaluate((host) => {
      [...document.querySelector(host).children].forEach(k => k.style.visibility = '');
    }, host);
    return res;
  };

  /* `미`·`션` 은 같은 <i> 안이라 형제 숨기기로 못 가른다 → <i> 안의 두 글자를 Range 로 임시 분해한다. */
  const splitI = async () => p.evaluate(() => {
    const el = document.querySelector('#tuto .tbtn i');
    if (el.dataset.split) return;
    el.dataset.split = '1';
    el.innerHTML = [...el.textContent].map(c => '<span data-g>' + c + '</span>').join('');
  });
  const measureI = async () => {
    const clip = await p.evaluate(() => {
      const el = document.querySelector('#tuto .tbtn'), b = el.getBoundingClientRect();
      return { x: Math.round(b.x) - 40, y: Math.round(b.y) - 10,
               width: Math.round(b.width) + 80, height: Math.round(b.height) + 20 };
    });
    await p.evaluate(() => {
      [...document.querySelector('#tuto .tbtn').children].forEach(k => k.style.visibility = 'hidden');
    });
    await p.waitForTimeout(40);
    const base = await p.screenshot({ clip });
    const res = [];
    for (const i of [0, 1]) {
      await p.evaluate((i) => {
        const kids = [...document.querySelector('#tuto .tbtn').children];
        kids.forEach((k, j) => k.style.visibility = (j === 1 ? 'visible' : 'hidden'));
        [...document.querySelector('#tuto .tbtn i').children]
          .forEach((g, j) => g.style.visibility = (j === i ? 'visible' : 'hidden'));
      }, i);
      await p.waitForTimeout(40);
      const bx = inkBoxDiff(await p.screenshot({ clip }), base);
      res.push(bx ? [bx[0] + clip.x, bx[1] + clip.x] : null);
    }
    await p.evaluate(() => {
      [...document.querySelector('#tuto .tbtn').children].forEach(k => k.style.visibility = '');
      [...document.querySelector('#tuto .tbtn i').children].forEach(g => g.style.visibility = '');
    });
    return res;
  };

  await splitI();
  const gapOf = (a, b) => (a && b) ? b[0] - a[1] - 1 : NaN;

  for (let it = 1; it <= N; it++) {
    await apply();
    /* L1 자식 순서: 0=`[`(b) 1=`미션`(i) 2=`-`(s) 3=숫자(em) 4=`]`(b) */
    const m1 = await measure('#tuto .tbtn', [0, 2, 3, 4]);
    const mi = await measureI();
    const g = {
      g1: gapOf(m1[0], mi[0]), g2: gapOf(mi[0], mi[1]), g3: gapOf(mi[1], m1[1]),
      g4: gapOf(m1[1], m1[2]), g5: gapOf(m1[2], m1[3]),
    };
    /* L3 자식 순서: 0=`(` 1=`0` 2=`/` 3=`10`(em) 4=`)`  ← em 안에 `1`+`0` 이 함께 있다 */
    const m3 = await measure('#tuto .tpg', [0, 1, 2, 3, 4]);
    const h = {
      g1: gapOf(m3[0], m3[1]), g2: gapOf(m3[1], m3[2]), g3: gapOf(m3[2], m3[3]),
      g5: gapOf(m3[3], m3[4]),
    };
    console.log(`\n#${it} L1 어간 ${JSON.stringify(g)}  (목표 ${JSON.stringify(TGT1)})`);
    console.log(`    P1 ${JSON.stringify(P1)}`);
    console.log(`#${it} L3 어간 ${JSON.stringify(h)}  (목표 g1 ${TGT3.g1} g2 ${TGT3.g2} g3 ${TGT3.g3} g5 ${TGT3.g5})`);
    console.log(`    P3 ${JSON.stringify(P3)}`);
    /* 총 잉크 폭·중심도 같이 본다 — 어간을 벌리면 줄이 넓어져 ref 총폭에서 멀어질 수 있다. */
    const span = a => (a[0] && a[a.length-1]) ? [a[0][0], a[a.length-1][1]] : null;
    const s1 = span([m1[0], mi[0], mi[1], m1[1], m1[2], m1[3]]);
    const s3 = span(m3);
    if (s1) console.log(`    L1 총잉크 ${s1[0]}..${s1[1]} (w${s1[1]-s1[0]+1} · 중심 ${((s1[0]+s1[1])/2).toFixed(1)} · ref 중심 793.5)`);
    if (s3) console.log(`    L3 총잉크 ${s3[0]}..${s3[1]} (w${s3[1]-s3[0]+1} · ref w89 · 중심 ${((s3[0]+s3[1])/2).toFixed(1)} · ref 중심 785)`);
    if (it === N || FROZEN) { if (it === N) break; else continue; }
    /* ① 먼저 «글리프 잉크 폭» 을 ref 로 맞춘다 — 부모 scaleX 를 «총 잉크 − 어간 합» 비율로 민다.
       어간이 음수인 채로 총폭만 맞춰 온 것이 이 버그의 뿌리다(잉크는 넓고 어간은 −). */
    const inkSum = (s, gs) => (s ? s[1] - s[0] + 1 : NaN) - gs.reduce((a, b) => a + (isFinite(b) ? b : 0), 0);
    const refInk1 = W1 - (TGT1.g1 + TGT1.g2 + TGT1.g3 + TGT1.g4 + TGT1.g5);
    /* L3 의 `10` 은 한 `<em>` 이라 `1`↔`0` 어간(ref 4)은 따로 못 잰다 → «잉크» 쪽에 넣고 ref 도 같이 넣는다. */
    const refInk3 = W3 - (TGT3.g1 + TGT3.g2 + TGT3.g3 + TGT3.g5);
    const i1 = inkSum(s1, [g.g1, g.g2, g.g3, g.g4, g.g5]);
    const i3 = inkSum(s3, [h.g1, h.g2, h.g3, h.g5]);
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    if (!NOSX && isFinite(i1) && i1 > 0) P1.sx = +clamp(P1.sx * Math.pow(refInk1 / i1, 0.6), 0.8, 1.6).toFixed(3);
    if (!NOSX && isFinite(i3) && i3 > 0) P3.sx = +clamp(P3.sx * Math.pow(refInk3 / i3, 0.6), 0.8, 1.6).toFixed(3);
    const step = (cur, tgt, sc) => (tgt - cur) / 2 / sc;
    const r = v => Math.round(v * 4) / 4;
    if (isFinite(g.g1)) { const d = step(g.g1, TGT1.g1, P1.sx); P1.br = r(P1.br + d); P1.il = r(P1.il + d); }
    if (isFinite(g.g2)) { P1.ils = r(P1.ils + (TGT1.g2 - g.g2) / P1.sx / 0.78); }
    if (isFinite(g.g3)) { const d = step(g.g3, TGT1.g3, P1.sx); P1.ir = r(P1.ir + d); P1.sl = r(P1.sl + d); }
    if (isFinite(g.g4)) { const d = step(g.g4, TGT1.g4, P1.sx); P1.sr = r(P1.sr + d); P1.el = r(P1.el + d); }
    if (isFinite(g.g5)) { const d = step(g.g5, TGT1.g5, P1.sx); P1.er = r(P1.er + d); P1.bl = r(P1.bl + d); }
    if (isFinite(h.g1)) { P3.br = r(P3.br + (TGT3.g1 - h.g1) / P3.sx); }
    if (isFinite(h.g2)) { P3.sl = r(P3.sl + (TGT3.g2 - h.g2) / P3.sx); }
    if (isFinite(h.g3)) { const d = step(h.g3, TGT3.g3, P3.sx); P3.sr = r(P3.sr + d); P3.el = r(P3.el + d); }
    if (isFinite(h.g5)) { const d = step(h.g5, TGT3.g5, P3.sx); P3.er = r(P3.er + d); P3.bl = r(P3.bl + d); }
  }
  await b.close();
})();
