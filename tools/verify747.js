#!/usr/bin/env node
/* 747 게이트 — 12 소환 결과 팝업, 배수 토글 바 ↔ 패널 하단 크롬의 «여유 14»
 *
 *   node tools/verify747.js
 *
 * 등재(2026-09-01, 713 비평 1회차 ⓐ): 713 비평가 2인이 **독립으로 최대 감점**을 준 자리다 —
 *   A ③ 4점 «레퍼런스 88 → 8px, 91% 부족» · B ③ 5점 «1px, 목표 36 대비 97% 미달».
 *   띠 [15,113] = 98px 이 공용 셸 높이와 **정확히 같아** 여유가 구조적으로 0 이었다.
 *   747 은 띠를 [15,127] = 112 로 넓히고 그 14 를 **전부 바 아래**로 줬다.
 *
 * ⚑ **왜 자가 또 있나 — `verify713` [A7] 과 무엇이 다른가**
 *   [A7] 은 **DOM 상자**(getBoundingClientRect)로 잰다. 그런데 비평가가 본 것은 상자가 아니라
 *   **그려진 화소**다 — 셸의 검은 외곽선·그림자가 상자 밖으로 나오면 상자는 14 인데 눈에는 붙어
 *   보일 수 있다. 그래서 이 자는 **칠해진 픽셀만** 센다: 크롬 금띠 바로 위에 패널 본문색
 *   (#2A2835)이 **연속 몇 줄** 남는가. 지적이 «눈에 붙어 보인다» 였으니 자도 눈과 같은 것을 재야 한다.
 *   (LESSONS 667-④ — 자기 값을 지키는 자가 없는 작업은 회귀를 남이 뒤집어쓴다.)
 *
 * 절:
 *   [1] 화소 여유 — 바 아래 패널색이 **정확히 14줄**(두 프레임 · 바 밑 두 x 좌표)
 *   [2] 짝       — 오른쪽 «연출 스킵» 토글 밑이 바보다 넓다(둘의 세로 중심이 같은 결과)
 *   [3] 위쪽     — 그 대가로 위가 안 깨졌다: 리본 하변 ↔ 그리드 상변이 66px 남는다
 *   [R] 되돌림   — 713 자리(bottom 15/36)로 되돌린 사본에서는 화소 여유가 **0줄**이 된다
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.resolve(ROOT, 'index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

const GAP = 14;                       /* 747 이 넣은 여유(= padding-bottom 127 − 크롬 15 − 셸 98) */
const CHROME = 15;                    /* `.sm-panel::after` 하단 크롬 — verify713 [A6] 과 한 벌 */
const RIBBON_GAP = 66;                /* 리본 하변 ↔ 그리드 상변 — 위에서 14 를 빼 온 대가의 잔량 */
const PANEL = (p) => Math.abs(p[0] - 42) <= 3 && Math.abs(p[1] - 40) <= 3 && Math.abs(p[2] - 53) <= 3;
const GOLD  = (p) => p[0] > 220 && p[1] > 180 && p[2] < 110;

/* 팝업을 레퍼런스와 같은 판(6열 2행 10칸)으로 띄우고 `#app` 을 찍는다. */
async function shot(browser, H, css) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof showSummonResult === 'function');
  await page.waitForTimeout(300);
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => {
    S.dia = 1e12;
    const res = [], seen = new Set();
    for (let i = 0; i < 4000 && res.length < 10; i++) {
      const r = summonOne('weapon');
      if (!r || !r.it || seen.has(r.it.id)) continue;
      seen.add(r.it.id); res.push(r);
    }
    showSummonResult('weapon', 10, res, false);
  });
  await page.waitForTimeout(1600);                 /* 등장 애니메이션이 끝난 뒤에 찍는다(713 [F1] 교훈) */
  const geo = await page.evaluate(() => {
    const R = e => { const b = e.getBoundingClientRect();
      return { l: +b.left.toFixed(1), t: +b.top.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1) }; };
    return { panel: R(document.querySelector('.sm-panel')), bar: R(document.getElementById('sumMulBar')),
             skip: R(document.getElementById('sumSkip')), grid: R(document.querySelector('.sm-grid')),
             band: R(document.querySelector('#sumw .sm-band')) };
  });
  const buf = await page.locator('#app').screenshot();
  await ctx.close();
  return { buf, geo, errs };
}

/* 하단 크롬 **바로 위**에 «패널 본문색» 이 연속 몇 줄 남는가 — 칠해진 것만 센다.
   ⚠ 크롬 상변에서 «위로 올라가며 세기» 시작해야 한다. «금띠를 찾아 패널색이 나올 때까지 올라간 뒤
     세면» 붙어 있는 판(여유 0)에서 바를 통째로 지나쳐 그 **위** 빈 면 288줄을 세고 만다(1회차 오답). */
function gapRows(px, x, panelBot) {
  const chromeTop = Math.round(panelBot) - CHROME;      /* ::after 15px — verify713 [A6] 이 재는 값 */
  let gold = false;
  for (let y = chromeTop; y < Math.min(Math.round(panelBot), px.height); y++) {
    if (GOLD(px.at(x, y))) { gold = true; break; }
  }
  let rows = 0, y = chromeTop - 1;
  while (y > 0 && PANEL(px.at(x, y))) { rows++; y--; }
  return { rows, gold, chromeTop };
}

(async () => {
  const { PNG } = (() => { try { return { PNG: require('pngjs').PNG }; } catch (e) { return {}; } })();
  const decode = PNG ? (buf) => {
    const p = PNG.sync.read(buf);
    return { width: p.width, height: p.height,
      at: (x, y) => [p.data[(y * p.width + x) * 4], p.data[(y * p.width + x) * 4 + 1], p.data[(y * p.width + x) * 4 + 2]] };
  } : null;

  const browser = await launch(chromium);

  /* pngjs 가 없으면 python3(PIL)로 내려간다 — 이 저장소의 스캐너들이 이미 쓰는 경로다 */
  const fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
  const readPx = (buf) => {
    if (decode) return decode(buf);
    const f = path.join(os.tmpdir(), 'v747-' + process.pid + '.png');
    fs.writeFileSync(f, buf);
    const out = execFileSync('python3', ['-c',
      'import sys;from PIL import Image;im=Image.open(sys.argv[1]).convert("RGB");' +
      'print(im.width, im.height);sys.stdout.write(" ".join(str(v) for p in im.getdata() for v in p))',
      f], { encoding: 'utf8', maxBuffer: 1 << 30 });
    const nl = out.indexOf('\n');
    const [w, h] = out.slice(0, nl).trim().split(/\s+/).map(Number);
    const d = out.slice(nl + 1).trim().split(/\s+/);
    fs.unlinkSync(f);
    return { width: w, height: h, at: (x, y) => { const i = (y * w + x) * 3; return [+d[i], +d[i + 1], +d[i + 2]]; } };
  };

  for (const H of [2280, 1600]) {
    const { buf, geo, errs } = await shot(browser, H);
    const px = readPx(buf);
    const tag = '(' + H + ') ';

    /* [1] 바 밑 — 왼쪽 끝 칸(x100)과 가운데(x300) 두 곳에서 같은 값이어야 한다 */
    const a = gapRows(px, 100, geo.panel.b), b2 = gapRows(px, 300, geo.panel.b);
    ok(a.rows === GAP && b2.rows === GAP && a.gold && b2.gold,
      tag + '[1] 바 아래 패널색이 정확히 ' + GAP + '줄 남는다(칠해진 화소로 잰다)',
      'x100 ' + a.rows + '줄 · x300 ' + b2.rows + '줄 (크롬 상변 ' + a.chromeTop + ' · 금띠 확인 '
      + (a.gold && b2.gold) + ')');

    /* [2] 짝 — 토글 밑은 «바와 같은 중심» 규약이라 더 넓다. 둘이 같아지면 그건 «띠 한가운데» 로
       되돌아간 것이고, 그러면 `verify713` [B1](세로 중심 일치)이 빨개진다. */
    const s = gapRows(px, 980, geo.panel.b);
    ok(s.rows > GAP, tag + '[2] 스킵 토글(트랙) 아래는 바보다 넓다 — 토글이 바보다 크롬에 가깝지 않다',
      'x980 ' + s.rows + '줄 > 바 ' + GAP + '줄');
    ok(Math.abs((geo.bar.t + geo.bar.b) / 2 - (geo.skip.t + geo.skip.b) / 2) <= .5,
      tag + '[2b] 그 «같은 중심» 이 실제로 같다(짝 단언 — 위 두 값이 갈리는 이유)',
      '바 ' + ((geo.bar.t + geo.bar.b) / 2).toFixed(1) + ' ↔ 토글 ' + ((geo.skip.t + geo.skip.b) / 2).toFixed(1));

    /* [3] 위쪽 — 14 를 위 여백에서 가져왔으므로 «리본을 밟지 않는가» 가 이 수리의 유일한 실질 위험 */
    ok(Math.abs((geo.grid.t - geo.band.b) - RIBBON_GAP) <= 1,
      tag + '[3] 리본 하변 ↔ 그리드 상변 ' + RIBBON_GAP + 'px (위에서 14 를 빼 온 대가의 잔량)',
      (geo.grid.t - geo.band.b).toFixed(1) + 'px');
    ok(errs.length === 0, tag + '[Z] 콘솔 에러 0건', errs.length + '건');
  }

  /* [R] 되돌림 — 713 자리로 되돌리면 «붙었다» 가 화소로 그대로 재현된다.
     이 항이 빨개지지 «않으면» [1] 은 이미 참인 것을 세고 있는 것이다(338 규칙). */
  {
    const { buf, geo } = await shot(browser, 2280,
      '#sumMulBar{bottom:15px !important}#sumSkip{bottom:36px !important}');
    const px = readPx(buf);
    const r = gapRows(px, 300, geo.panel.b);
    ok(r.rows === 0, '[R] 713 자리(bottom 15)로 되돌린 사본에서는 여유가 0줄이다(747 이 무르지 않다)',
      'x300 ' + r.rows + '줄');
  }

  await browser.close();
  console.log('\nVERIFY747 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS'));
  process.exit(fail ? 1 : 0);
})();
