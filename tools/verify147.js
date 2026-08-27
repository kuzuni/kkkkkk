/*
 * 작업 147 게이트 — 54 랭킹 시상대 캐릭터 스프라이트 배율.
 *
 * 147 은 «잉크가 ref 대비 −36~40% 인데 정수 배율 제약 때문에 못 키운다» 는 설계 판단 작업이었다.
 * 실측이 내린 답: **상한을 정하는 것은 «단상 폭» 이 아니라 «타이틀 명판 침범»** 이고, 그 아래에서
 * 가장 큰 정수 배율은 2·3위 **sc7** 이다(1위는 단상이 34px 높아 sc6 이 상한 — 11회차가 이미 확정).
 * 그래서 이 게이트는 «배율이 7 이다» 만 보지 않고, **왜 7 인지(=8 은 명판을 덮는다)** 를 같이 못 박는다.
 *
 *   [A] 배율·규격 — rkPodDraw 가 1위 sc6 / 2·3위 sc7, 상자 = 캔버스 1:1 · 위치 고정
 *   [B] 접지·잉크 — 발밑 = 단상 윗면(448/482/492), 잉크·몸통 상단이 실측표 값
 *   [C] 클리핑 0 — 잉크가 캔버스 좌/우/상 모서리에 닿지 않는다(바닥만 닿는다 = 발밑 앵커)
 *   [D] 명판 침범 0 — 스프라이트 잉크가 `.rk-title` 아래로 넘어오지 않는다  ← 상한의 근거
 *   [E] 음성 게이트 — 같은 자리에 sc8 을 그리면 명판을 실제로 덮는다(상한이 «있다» 는 증명)
 *   [F] 프레임 안 — 잉크가 x 0..1080 을 벗어나지 않는다
 *
 * getImageData 를 쓰므로 --allow-file-access-from-files 로 띄운다(verify80.js 와 같다).
 * 사용: node tools/verify147.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, name, extra) => {
  if (c) { pass++; console.log('PASS ' + name + (extra ? ' — ' + extra : '')); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
};

/* 실측 기대값 — index.html `.rk-ch.c2` 주석의 표와 같은 출처(tools/probe147.js / probe147b.js) */
const SPEC = [
  { k: 1, sc: 6, w: 395, h: 315, top: 133, left: 343, foot: 448, ink: 178, body: 202 },
  { k: 2, sc: 7, w: 336, h: 322, top: 160, left: 47,  foot: 482, ink: 167, body: 195 },
  { k: 3, sc: 7, w: 336, h: 322, top: 170, left: 698, foot: 492, ink: 177, body: 205 },
];

(async () => {
  const args = ['--allow-file-access-from-files'];
  let browser;
  try { browser = await launch(chromium, { args }); }
  catch (e) {
    const p = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
    if (!fs.existsSync(p)) throw e;
    browser = await launch(chromium, { executablePath: p, args });
  }
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));

  await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { S.best = 50; openRank(); });
  await page.waitForTimeout(800);

  /* [A] 배율 — 소스가 아니라 «실제로 그려진 잉크 높이» 로 역산한다(선언만 보면 순환 논증이다).
     잉크 높이 = fr[3]×sc 이고 idle 의 fr[3] 은 45~46 이라 sc = round(h/45.5) 로 유일하게 갈린다. */
  const R = await page.evaluate(() => {
    const app = document.getElementById('app').getBoundingClientRect();
    const s = app.width / 1080;
    const F = r => ({ x: (r.left - app.left) / s, y: (r.top - app.top) / s, w: r.width / s, h: r.height / s });
    const t = F(document.querySelector('#rkw .rk-title').getBoundingClientRect());
    const rows = [1, 2, 3].map(k => {
      const cv = document.getElementById('rkCh' + k);
      const box = F(cv.parentNode.getBoundingClientRect());
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, bt = -1, n = 0;
      for (let y = 0; y < cv.height; y++) {
        let cnt = 0;
        for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 8) {
          cnt++; n++;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; y1 = y;
        }
        if (cnt >= 100 && bt < 0) bt = y;
      }
      return { k, cw: cv.width, ch: cv.height, box, x0, x1, y0, y1, bt, n,
               pix: getComputedStyle(cv).imageRendering };
    });
    return { title: t, rows };
  });

  for (const s of SPEC) {
    const r = R.rows[s.k - 1];
    const inkH = r.y1 - r.y0 + 1;
    const sc = Math.round(inkH / 45.5);
    ok(sc === s.sc, `A1-${s.k} ${s.k}위 실제 배율 sc${s.sc}(잉크 높이로 역산)`, `잉크 h${inkH} → sc${sc}`);
    ok(r.cw === s.w && r.ch === s.h, `A2-${s.k} 캔버스 규격 ${s.w}x${s.h}`, r.cw + 'x' + r.ch);
    ok(Math.round(r.box.w) === s.w && Math.round(r.box.h) === s.h,
       `A3-${s.k} 상자 = 캔버스 1:1(비정수 CSS 스케일 금지)`, Math.round(r.box.w) + 'x' + Math.round(r.box.h));
    ok(Math.round(r.box.x) === s.left && Math.round(r.box.y) === s.top,
       `A4-${s.k} 상자 위치 ${s.left},${s.top}`, Math.round(r.box.x) + ',' + Math.round(r.box.y));
    ok(r.pix === 'pixelated', `A5-${s.k} pixelated`, r.pix);

    /* [B] 접지·잉크 상단 */
    const footY = Math.round(r.box.y + r.y1 + 1);
    ok(Math.abs(footY - s.foot) <= 4, `B1-${s.k} 발밑 = 단상 윗면 ${s.foot}±4`, '실측 ' + footY);
    const inkTop = Math.round(r.box.y + r.y0);
    ok(Math.abs(inkTop - s.ink) <= 3, `B2-${s.k} 잉크 상단 ${s.ink}±3`, '실측 ' + inkTop);
    const bodyTop = Math.round(r.box.y + r.bt);
    ok(r.bt >= 0 && Math.abs(bodyTop - s.body) <= 4, `B3-${s.k} 몸통(행당 100화소) 상단 ${s.body}±4`, '실측 ' + bodyTop);
    ok(r.n > 20000, `B4-${s.k} 잉크량`, r.n + 'px');

    /* [C] 클리핑 0 — 바닥만 닿는다 */
    ok(r.x0 > 0 && r.x1 < r.cw - 1 && r.y0 > 0,
       `C1-${s.k} 잉크가 캔버스에 안 잘림(좌/우/상 여유)`, `x ${r.x0}..${r.x1}/${r.cw - 1} · y0 ${r.y0}`);

    /* [F] 프레임 안 */
    const fx0 = Math.round(r.box.x + r.x0), fx1 = Math.round(r.box.x + r.x1);
    ok(fx0 >= 0 && fx1 <= 1080, `F1-${s.k} 잉크가 프레임 안`, `x ${fx0}..${fx1}`);
  }

  /* [D] 명판 침범 0 — 여기가 배율 상한의 근거다 */
  const T = R.title;
  const D = await page.evaluate(t => {
    let leak = 0, lx0 = 1e9, lx1 = -1;
    const app = document.getElementById('app').getBoundingClientRect(), s = app.width / 1080;
    for (const k of [1, 2, 3]) {
      const cv = document.getElementById('rkCh' + k);
      const b = cv.parentNode.getBoundingClientRect();
      const bx = (b.left - app.left) / s, by = (b.top - app.top) / s;
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      for (let y = 0; y < cv.height; y++) {
        if (by + y >= t.y + t.h) break;
        for (let x = 0; x < cv.width; x++) {
          const fx = bx + x;
          if (fx < t.x || fx > t.x + t.w) continue;
          if (d[(y * cv.width + x) * 4 + 3] > 8) { leak++; if (fx < lx0) lx0 = fx; if (fx > lx1) lx1 = fx; }
        }
      }
    }
    return { leak, lx0, lx1 };
  }, T);
  ok(D.leak === 0, 'D1 스프라이트 잉크의 타이틀 명판 침범 0',
     `명판 x ${Math.round(T.x)}..${Math.round(T.x + T.w)} 하단 ${Math.round(T.y + T.h)} · 침범 ${D.leak}px`);

  /* [E] 음성 게이트 — 한 단계 위(sc8)는 실제로 명판을 덮는다. 이게 «sc7 이 상한» 의 증명이고,
     나중에 누가 «왜 8 이 아니냐» 며 올리면 이 항목이 먼저 빨개진다. */
  const E = await page.evaluate(t => {
    const app = document.getElementById('app').getBoundingClientRect(), s = app.width / 1080;
    const frames = ATLAS.knight.a.idle;
    const out = {};
    for (const c of [{ k: 2, cx: 215, foot: 482, flip: true }, { k: 3, cx: 866, foot: 492, flip: false }]) {
      const cv = document.createElement('canvas');
      cv.width = 79 * 8; cv.height = 63 * 8;
      let leak = 0;
      for (const fk of frames) {
        drawHeroTo(cv, { avatar: 'av0', frame: fk, scale: 8, flip: c.flip });
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        for (let y = 0; y < cv.height; y++) {
          const fy = c.foot - (cv.height - y);
          if (fy >= t.y + t.h) break;
          for (let x = 0; x < cv.width; x++) {
            const fx = c.cx + (x - cv.width / 2);
            if (fx < t.x || fx > t.x + t.w) continue;
            if (d[(y * cv.width + x) * 4 + 3] > 8) leak++;
          }
        }
      }
      out[c.k] = leak;
    }
    return out;
  }, T);
  ok(E[2] > 0 || E[3] > 0, 'E1 sc8 은 명판을 덮는다(= sc7 이 정수 배율 상한)', `2위 ${E[2]}px · 3위 ${E[3]}px`);

  /* [G] 회귀 — 1위는 이번에 손대지 않았다 */
  ok(R.rows[0].cw === 395 && R.rows[0].ch === 315, 'G1 1위(c1) 규격 불변 395x315',
     R.rows[0].cw + 'x' + R.rows[0].ch);
  ok(errs.length === 0, 'G2 콘솔 에러 0건', errs.slice(0, 2).join(' | '));

  console.log('----');
  console.log(`VERIFY147 ${fail ? 'FAIL' : 'PASS'} ${pass}/${pass + fail}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
