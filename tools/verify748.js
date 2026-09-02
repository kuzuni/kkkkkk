#!/usr/bin/env node
/* 748 게이트 — «12 소환 결과 팝업이 짧은 프레임에서 팝업 **밖** 을 침범하지 않는가»
 *
 *   node tools/verify748.js
 *
 * 이 자가 지키는 것은 셋이다.
 *  [A] **사슬이 하나다** — `--sm-floor`(패널 하변의 하한) 한 곳에서 `--sm-bot`·`.sm-btns`·`.sm-close`
 *      가 파생된다. 수리 전에는 같은 값이 1248·1416·1475 **세 벌**로 적혀 있었고(서로를 되푼 사본),
 *      한 벌만 고치면 나머지가 조용히 어긋난다(402 «표가 아니라 파생으로»).
 *  [B] **짧은 프레임에서 팝업 밖 침범이 레퍼런스 접점 이하다** — «터치하여 닫기» 가 탭바를 무는 양이
 *      2280(레퍼런스 그림)의 접점보다 크면 빨갛다. ⚠ «0» 이 아니라 «2280 이하» 인 것이 핵심이다:
 *      2280 에서도 잉크가 10px 스치고 그것이 레퍼런스가 허용한 자리다(`probe748` [2-a]).
 *      «0» 으로 못박으면 **이미 거짓인 것**을 요구하게 된다(338).
 *  [C] **긴 프레임은 Δ0px** — 2280·1920 은 자연 앵커(426/170)가 이겨 한 픽셀도 안 움직인다.
 *      327(패널 1080 · 그리드 868 · 가려짐 0)도 두 프레임 다 그대로다.
 *
 * §R 되돌림 시험 — `--sm-floor` 를 옛 값(1248)으로 되돌리면 [B] 가 즉시 빨개져야 한다.
 *   안 빨개지면 이 게이트는 아무것도 안 지키는 것이다.
 *
 * ⚠ ③(재소환 버튼 ↔ 스킬 슬롯 겹침)은 **여기서 안 묻는다** — 1600 의 세로 예산상 리본을 프레임
 *   밖으로 내보내지 않고는 0 이 될 수 없고(`probe748` [4-c] · 118 → 96px 로 줄기만 한다),
 *   그 잔여는 «팝업 밖 HUD 가 딤 너머로 비친다» 는 **811** 의 축이다. 여기서 0 을 요구하면
 *   811 이 그 자리를 다른 방법으로 닫았을 때 이 자가 거짓으로 빨개진다.
 */
const path = require('path');
const fs = require('fs');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'index.html');
const URL = 'file://' + FILE.replace(/\\/g, '/');

let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? '✓' : '✗') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};
const near = (a, b, t) => Math.abs(a - b) <= t;

/* 사슬 산수 — 이 셋은 CSS 주석과 같은 값이어야 한다 */
const GAP_PANEL = 20;      /* 패널 하변 ↔ 버튼 상변 */
const BTN_H = 148;         /* 버튼 줄 높이 */
const GAP_CLOSE = 15;      /* 버튼 하변 ↔ 닫기 상변 */
const CLOSE_H = 44;        /* 닫기 잉크 높이(= line-height) */
const CLOSE_BOT = 170;     /* 84·126 이 정한 자연 앵커 */
const FLOOR = 1203;        /* = 1600 − (20 + 148 + 15 + 44 + 170) */

const GEO = `(() => {
  S.dia = 1e12;
  const res = [], seen = new Set();
  for (const bk of BKEYS) {
    for (let i = 0; i < 20000 && res.length < 30; i++) {
      const r = summonOne(bk);
      if (!r || !r.it || seen.has(r.it.id)) continue;
      seen.add(r.it.id); res.push(r);
    }
    if (res.length >= 30) break;
  }
  showSummonResult('weapon', res.length, res, false);
  const A = document.getElementById('app').getBoundingClientRect();
  const R = s => { const e = document.querySelector(s); if(!e) return null;
    const b = e.getBoundingClientRect();
    return { t: +(b.top - A.top).toFixed(2), b: +(b.bottom - A.top).toFixed(2),
             l: +(b.left - A.left).toFixed(2), r: +(b.right - A.left).toFixed(2),
             h: +b.height.toFixed(2) }; };
  const INK = s => { const n = document.querySelector(s); if(!n) return null;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const b = rg.getBoundingClientRect();
    return { t: +(b.top - A.top).toFixed(2), b: +(b.bottom - A.top).toFixed(2),
             l: +(b.left - A.left).toFixed(2), r: +(b.right - A.left).toFixed(2),
             h: +b.height.toFixed(2) }; };
  const grid = document.getElementById('sumGrid');
  const cards = [...document.getElementById('sumGridIn').children];
  const gb = grid.getBoundingClientRect();
  const full = cards.filter(c => { const b = c.getBoundingClientRect();
    return b.top >= gb.top - 0.5 && b.bottom <= gb.bottom + 0.5; });
  const cs = getComputedStyle(document.getElementById('sumw'));
  return {
    frameH: +A.height.toFixed(1),
    panel: R('.sm-panel'), rb: R('.sm-rb'), band: R('#sumw .sm-band'),
    btns: R('.sm-btns'), close: INK('#sumw .sm-close > i'), bar: R('#tabbar'),
    grid: R('#sumGrid'),
    cards: cards.length, fullCards: full.length,
    over: +(grid.scrollHeight - gb.height).toFixed(1),
    floor: cs.getPropertyValue('--sm-floor').trim(),
    cssBtns: getComputedStyle(document.querySelector('.sm-btns')).bottom,
    cssClose: getComputedStyle(document.querySelector('.sm-close')).bottom
  };
})()`;

const open = async (browser, h, css) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof showSummonResult === 'function');
  await page.waitForTimeout(800);
  await page.evaluate(() => { S.guide.idx = GUIDE.length; if (typeof gmStart === 'function') gmStart(); });
  if (css) await page.addStyleTag({ content: css });
  const g = await page.evaluate(GEO);
  return { ctx, page, g, errs };
};

(async () => {
  /* ══ [A] 사슬 — 소스에 사본이 없다 ══════════════════════════════════════ */
  const src = fs.readFileSync(FILE, 'utf8');
  const declFloor = (src.match(/--sm-floor:\s*([0-9]+)px/g) || []);
  const declBot = (src.match(/--sm-bot:[^;}]*/) || [''])[0];
  const declBtns = (src.match(/\n\s*\.sm-btns\{[^}]*\}/) || [''])[0].replace(/\s+/g, ' ').trim();
  const declClose = (src.match(/\n\s*\.sm-close\{[^}]*/) || [''])[0].replace(/\s+/g, ' ').trim();

  ok(declFloor.length === 1 && declFloor[0] === '--sm-floor:' + FLOOR + 'px',
    '[A1] `--sm-floor` 선언이 정확히 한 곳이다', declFloor.join(' / ') || '없음');
  ok(/var\(--sm-floor\)/.test(declBot) && !/1248px/.test(declBot),
    '[A2] `--sm-bot` 이 floor 에서 파생된다(옛 사본 1248 없음)', declBot);
  ok(/var\(--sm-floor\)/.test(declBtns) && !/1416px/.test(declBtns)
     && /bottom:\s*min\(426px/.test(declBtns) && !/(^|[;{])\s*top:/.test(declBtns),
    '[A3] `.sm-btns` 가 floor 파생이고 84 의 bottom 앵커·426 은 그대로다(옛 사본 1416 없음)', declBtns);
  ok(/var\(--sm-floor\)/.test(declClose) && !/1475px/.test(declClose)
     && /bottom:\s*min\(170px/.test(declClose),
    '[A4] `.sm-close` 가 floor 파생이고 126 의 앵커 170 은 그대로다(옛 사본 1475 없음)', declClose);
  ok(FLOOR === 1600 - (GAP_PANEL + BTN_H + GAP_CLOSE + CLOSE_H + CLOSE_BOT),
    '[A5] floor 산수 — 1600 − (20 + 148 + 15 + 44 + 170)',
    FLOOR + ' = ' + (1600 - (GAP_PANEL + BTN_H + GAP_CLOSE + CLOSE_H + CLOSE_BOT)));

  const browser = await launch(chromium);

  /* ══ [B] 짧은 프레임(1600) ═════════════════════════════════════════════ */
  const S16 = await open(browser, 1600);
  const g = S16.g;
  const barHit = +(g.close.b - g.bar.t).toFixed(2);      /* 닫기 잉크가 탭바 띠를 무는 양 */
  ok(near(g.frameH, 1600, .5), '[B0] [전제] clamp 하한 프레임', g.frameH + '');
  ok(near(g.panel.b, FLOOR, .5), '[B1] 패널 하변이 floor 에 선다', g.panel.b + ' / ' + FLOOR);
  ok(near(g.btns.t - g.panel.b, GAP_PANEL, .5),
    '[B2] 패널 하변 ↔ 버튼 상변 20 (레퍼런스 관계가 짧은 프레임에서도 선다)',
    (g.btns.t - g.panel.b).toFixed(2) + 'px');
  ok(near(g.close.t - g.btns.b, GAP_CLOSE, 1),
    '[B3] 버튼 하변 ↔ 닫기 잉크 상변 15', (g.close.t - g.btns.b).toFixed(2) + 'px');
  ok(g.cssClose === CLOSE_BOT + 'px',
    '[B4] 닫기가 제 자연 앵커(170)에 앉는다 — 보호항이 더 이상 끌어올리지 않는다', g.cssClose);
  ok(g.close.b <= g.frameH + .5 && g.btns.b < g.close.t,
    '[B5] 닫기가 프레임 안이고 버튼과 안 겹친다',
    '닫기 ' + g.close.t + '..' + g.close.b + ' ⊂ 0..' + g.frameH);
  await S16.ctx.close();

  /* ══ [C] 긴 프레임 — Δ0px ═════════════════════════════════════════════ */
  const S22 = await open(browser, 2280);
  const S19 = await open(browser, 1920);
  const barHit22 = +(S22.g.close.b - S22.g.bar.t).toFixed(2);
  ok(S22.g.cssBtns === '426px' && S22.g.cssClose === '170px'
     && S19.g.cssBtns === '426px' && S19.g.cssClose === '170px',
    '[C1] 2280·1920 은 자연 앵커가 이긴다(426/170) — 수리 전과 같은 값',
    '2280 ' + S22.g.cssBtns + '/' + S22.g.cssClose + ' · 1920 ' + S19.g.cssBtns + '/' + S19.g.cssClose);
  ok(near(S22.g.rb.t, 538, .5) && near(S19.g.rb.t, 178, .5),
    '[C2] 2280 리본 538 · 1920 리본 178 — 긴 프레임 기하 Δ0px',
    S22.g.rb.t + ' / ' + S19.g.rb.t);
  ok(near(S22.g.btns.b, 2280 - 426, 1) && near(S19.g.btns.b, 1920 - 426, 1),
    '[C3] 84 앵커 — 버튼 하변 = 프레임 − 426', S22.g.btns.b + ' / ' + S19.g.btns.b);

  /* ⚑ [B6] 이 이 작업의 본체다 — «0» 이 아니라 «레퍼런스 접점 이하» 로 묻는다 */
  ok(barHit <= barHit22 + .5,
    '[B6] 1600 의 탭바 침범이 2280(레퍼런스 접점) 이하다',
    '1600 ' + barHit + 'px ≤ 2280 ' + barHit22 + 'px');
  ok(barHit22 > 0 && barHit22 < 20,
    '[B7] [전제] 그 2280 접점 자체는 작고 0 이 아니다(레퍼런스 그림 — 338)', barHit22 + 'px');

  /* ══ [D] 327 무손실 — 짧은 프레임에서도 패널·그리드·가려짐 0 ══════════ */
  for (const [tag, s] of [['1600', S16], ['2280', S22], ['1920', S19]]) {
    if (tag === '1600') continue;                        /* S16 은 위에서 이미 닫았다 */
    ok(near(s.g.panel.h, 1080, .5) && near(s.g.grid.h, 868, .5),
      '[D-' + tag + '] 327 — 패널 1080 · 그리드 868', s.g.panel.h + ' / ' + s.g.grid.h);
  }
  const S16b = await open(browser, 1600);
  ok(near(S16b.g.panel.h, 1080, .5) && near(S16b.g.grid.h, 868, .5),
    '[D-1600] 327 — 짧은 프레임에서도 패널 1080 · 그리드 868(패널이 위로 갔지 줄지 않았다)',
    S16b.g.panel.h + ' / ' + S16b.g.grid.h);
  ok(S16b.g.fullCards === S16b.g.cards && S16b.g.over <= .5,
    '[D-1600b] 30 고유 판이 스크롤 없이 다 보인다(327 «가려짐 0»)',
    S16b.g.fullCards + '/' + S16b.g.cards + ' · 넘침 ' + S16b.g.over + 'px');
  ok(S16b.g.rb.t >= 0,
    '[D-1600c] 리본이 프레임 안이다(floor 를 더 내리면 여기가 먼저 빨개진다)', S16b.g.rb.t + '');

  const errs = S16.errs.concat(S22.errs, S19.errs, S16b.errs);
  ok(errs.length === 0, '[D-err] 콘솔 에러 0', errs.join(' | ') || '0건');
  await S22.ctx.close(); await S19.ctx.close(); await S16b.ctx.close();

  /* ══ §R 되돌림 시험 — floor 를 옛 값으로 되돌리면 [B6] 이 빨개지는가 ══ */
  const R16 = await open(browser, 1600, '#sumw{--sm-floor:1248px}');
  const rHit = +(R16.g.close.b - R16.g.bar.t).toFixed(2);
  ok(rHit > barHit22 * 3,
    '[R1] floor 를 1248 로 되돌리면 탭바 침범이 레퍼런스 접점의 3배를 넘는다(= 게이트가 실제로 뭔가를 지킨다)',
    barHit + 'px → ' + rHit + 'px (2280 접점 ' + barHit22 + 'px)');
  ok(R16.g.cssClose !== '170px',
    '[R2] 그때는 닫기가 제 앵커에서 끌려 올라간다', R16.g.cssClose);
  await R16.ctx.close();

  await browser.close();
  console.log('\nVERIFY748 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
