/* 작업 148 회귀 게이트 — «가이드 미션 배너의 글자가 서로 먹지 않는다».
   실행: node tools/verify148.js     (PASS 면 exit 0)

   무엇을 지키는가 — 이 버그는 «총폭은 ref 와 맞는데 잉크가 넓고 어간이 음수» 였다.
   그래서 총폭만 재는 게이트로는 절대 안 잡힌다. **글리프별 잉크 bbox** 를 따로 재서
   ① 어간이 전부 양수(=융착 없음) ② 어간이 ref 값 ±2 ③ 총 잉크 폭이 ref ±4 를 동시에 본다.
   계측 방법은 `tools/solve148.js` 와 같다(형제 `visibility:hidden` + 기준컷 차분). */
const path = require('path');
const PNG = require('./png913').PNG();   /* 913 — 없으면 «pngjs 없음» + 코드 2 (옛 require 는 스택 트레이스 + 코드 1) */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const REF1 = [3, 4, 6, 5, 3], W1 = 111;      /* `[미션-1]` — 측정표 61 §2-3 환산 */
const REF3 = [4, 5, 4, 2],    W3 = 89;       /* `(0/10)`  — 측정표 61 §2-3 그대로 */
const TOL_G = 2, TOL_W = 4;

function inkBoxDiff(buf, base) {
  const img = PNG.sync.read(buf), b0 = PNG.sync.read(base);
  const W = img.width, H = img.height;
  let x0 = 1e9, x1 = -1;
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      const R = img.data[i], G = img.data[i+1], B = img.data[i+2];
      const d = Math.abs(R - b0.data[i]) + Math.abs(G - b0.data[i+1]) + Math.abs(B - b0.data[i+2]);
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      if (d > 40 && mx > 120 && (mx - mn > 40 || mx > 200)) { if (x < x0) x0 = x; if (x > x1) x1 = x; break; }
    }
  return x1 < 0 ? null : [x0, x1];
}

let pass = 0, fail = 0;
const chk = (name, ok, got, want) => {
  (ok ? pass++ : fail++);
  console.log(`  ${ok ? '✓' : '✗'} ${name}  ${got}${want !== undefined ? '  (기대 ' + want + ')' : ''}`);
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => {
    gmCloseAll(); closeModal(); Object.assign(S, DEF());
    S.guide.idx = 0; S.guide.gv = GUIDE_V; S.guide.prog = -1; gmBase(GUIDE[0]);
    GUIDE[0].goal = 10; uiDirty = true; renderUI(); drawTuto();
    document.getElementById('view').style.visibility = 'hidden';
    window.drawTuto = () => {}; window.renderUI = () => {};
  });
  await p.waitForTimeout(250);
  await p.evaluate(() => {
    const el = document.querySelector('#tuto .tbtn i');
    el.innerHTML = [...el.textContent].map(c => '<span>' + c + '</span>').join('');
  });

  const measure = async (host, idxs, inner) => {
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
      await p.evaluate(({ host, i, inner }) => {
        const kids = [...document.querySelector(host).children];
        if (inner === null || typeof i === 'number') {
          kids.forEach((k, j) => k.style.visibility = (j === i ? 'visible' : 'hidden'));
        } else {
          kids.forEach((k, j) => k.style.visibility = (j === inner.host ? 'visible' : 'hidden'));
          [...document.querySelector(host).children[inner.host].children]
            .forEach((g, j) => g.style.visibility = (j === i.g ? 'visible' : 'hidden'));
        }
      }, { host, i, inner });
      await p.waitForTimeout(40);
      const bx = inkBoxDiff(await p.screenshot({ clip }), base);
      res.push(bx ? [bx[0] + clip.x, bx[1] + clip.x] : null);
    }
    return res;
  };

  console.log('== VERIFY148 — 가이드 미션 배너 글리프 융착 게이트 ==');
  /* L1: 0=`[` · 1=<i>(미·션) · 2=`-` · 3=숫자 · 4=`]` */
  const a = await measure('#tuto .tbtn', [0, 2, 3, 4]);
  const ii = await measure('#tuto .tbtn', [{ g: 0 }, { g: 1 }], { host: 1 });
  await p.evaluate(() => {
    [...document.querySelector('#tuto .tbtn').children].forEach(k => k.style.visibility = '');
    [...document.querySelector('#tuto .tbtn i').children].forEach(g => g.style.visibility = '');
  });
  const seq1 = [a[0], ii[0], ii[1], a[1], a[2], a[3]];
  const seq3 = await measure('#tuto .tpg', [0, 1, 2, 3, 4]);
  await p.evaluate(() => {
    [...document.querySelector('#tuto .tpg').children].forEach(k => k.style.visibility = '');
  });

  const gapsOf = s => s.slice(1).map((v, i) => (v && s[i]) ? v[0] - s[i][1] - 1 : NaN);
  const g1 = gapsOf(seq1);
  const g3 = gapsOf(seq3);
  const span = s => (s[0] && s[s.length-1]) ? s[s.length-1][1] - s[0][0] + 1 : NaN;

  const names1 = ['[→미', '미→션', '션→-', '-→숫자', '숫자→]'];
  const names3 = ['(→0', '0→/', '/→10', '10→)'];
  g1.forEach((v, i) => chk(`L1 어간 ${names1[i]}`, v >= 1 && Math.abs(v - REF1[i]) <= TOL_G, v + 'px', REF1[i]));
  g3.forEach((v, i) => chk(`L3 어간 ${names3[i]}`, v >= 1 && Math.abs(v - REF3[i]) <= TOL_G, v + 'px', REF3[i]));
  chk('L1 어간 전부 양수(융착 없음)', g1.every(v => v >= 1), g1.join('/'));
  chk('L3 어간 전부 양수(융착 없음)', g3.every(v => v >= 1), g3.join('/'));
  chk('L1 총 잉크 폭', Math.abs(span(seq1) - W1) <= TOL_W, span(seq1) + 'px', W1);
  chk('L3 총 잉크 폭', Math.abs(span(seq3) - W3) <= TOL_W, span(seq3) + 'px', W3);
  /* `<s>` 의 기본 취소선이 살아 있으면 스트로크가 얹혀 슬래시를 가로로 자른다(148 ②).
     어간 계측으로는 절대 안 잡히므로 계산 스타일을 직접 본다. */
  const deco = await p.evaluate(() => ['#tuto .tbtn s', '#tuto .tpg s']
    .map(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).textDecorationLine : 'MISSING'; }));
  chk('`<s>` 취소선 꺼짐 (L1 하이픈)', deco[0] === 'none', deco[0], 'none');
  chk('`<s>` 취소선 꺼짐 (L3 슬래시)', deco[1] === 'none', deco[1], 'none');
  chk('콘솔/런타임 에러', errs.length === 0, errs.length + '건', 0);

  await b.close();
  console.log(`\nVERIFY148 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail ? 1 : 0);
})();
