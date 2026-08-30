/* 437 게이트 — 서브탭 셸(`.stabs`)의 «테두리 7 · 칸 84 · 바깥 98» 세 값이 **한 덩어리**인가.
 *
 *   실행: node tools/verify437.js   (1080x2280 · 헤드리스)
 *
 * 왜 새 게이트가 필요한가 — 이 셋은 47·352·337 에 **따로따로** 흩어져 있었고, 그래서
 * «하나만 옮기고 나머지 둘을 안 옮기는» 사고가 실제로 났다(437 착수 직후 47 28건 · 352 20건 ·
 * 337 17건 · 379 31건 · 384 9건 · 409 1건 · 271 1건 · 389 2건이 한꺼번에 빨개졌다).
 * 값을 다시 적어 초록으로 되돌리는 것만으로 끝내면 **셋이 서로 어긋나도 초록인 게이트**가 된다
 * (LESSONS 328-330). 그래서 이 파일이 무는 것은 세 «값» 이 아니라 그 **결속**이다:
 *
 *   [G] 바깥 = 테두리×2 + 칸           — 셋 중 하나만 움직이면 즉시 빨강
 *   [P] 찍힌 픽셀로 검정 런 = 테두리   — 선언이 아니라 그림(350 처방: 캡처를 되돌려 읽는다)
 *   [S] `--sb` 가 진짜 손잡이인가       — 값을 주입하면 테두리도 **격자도** 같이 따라오는가
 *   [R] 되돌림 시험                     — 옛 셋(97/6/85)·부분 되돌림 셋 다 빨개져야 한다
 *
 * 근거(`python3 tools/probe437.py`): 자 넷(순검정·느슨·50%교차·커버리지 적분)을 **우리 캡처로
 * 먼저 검산**하니 넷 다 오차 0.00 이었다(우리 쪽 진실은 CSS 가 안다). 문턱 싸움은 ref(JPEG)
 * 에서만 벌어지므로 ref 는 문턱이 아니라 **색 분류**로 읽었다 —
 *     ref 07 x330(알약 열) K2021..2027(7) B(7) F(63) B(7) D(7) K2112..2117(6+AA)
 * ⇒ 테두리 7 · 칸 84 · 바깥 98(부분화소 98.02). 06·07·23 세 스크린샷이 소수 둘째 자리까지 같다.
 * ⚠ 비평가 CV·CW 의 «7.91» 은 **테두리 7 + 셸 안쪽 어두운 립 1.4** 였다(활성 알약이 닿는
 *   면에서는 7.0 으로 읽힌다) — 그 립은 이 게이트의 범위가 아니라 **450** 으로 따로 등재했다.
 *
 * [3]-(가) 기계적 검증: DOM·픽셀 실측 판정이라 비평가를 안 띄운다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.resolve(ROOT, 'docs/review/437-shot.png');

const BORDER = 7, CELL_H = 84, BAR_H = 98;

/* 호스트 일곱 — 96 이 «부품 하나 · 호스트는 위치만» 으로 합쳐 둔 그대로 */
const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }],
  ['06 장비', '#eqTabs', () => heroSubGo('eq')],
  ['26 펫', '#bPet .stabs', () => heroSubGo('pet')],
  ['50 코스튬', '#bCos .stabs', () => heroSubGo('cos')],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }],
  ['10 상점', '#shopCats', () => openShopPage()],
  ['13 재화', '#shopCats', () => document.querySelector('#shopCats [data-cat="coin"]').click()],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }],
];

let bad = 0, tot = 0;
const ok = (name, cond, got) => {
  tot++;
  if (cond) console.log('  PASS ' + name + (got === undefined ? '' : ' — ' + got));
  else { bad++; console.log('  FAIL ' + name + (got === undefined ? '' : ' — ' + got)); }
};
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);
const near = (a, b, t) => Math.abs(a - b) <= t;

const READ = (sel) => {
  const bar = document.querySelector(sel);
  if (!bar || !bar.offsetParent) return null;
  const bb = bar.getBoundingClientRect();
  const cs = getComputedStyle(bar);
  const cells = [...bar.querySelectorAll(':scope > .stab')].map(e => {
    const r = e.getBoundingClientRect();
    return { l: r.x - bb.x, w: r.width, h: r.height, on: e.classList.contains('on') };
  });
  return {
    x: bb.x, y: bb.y, w: bb.width, h: bb.height,
    bw: parseFloat(cs.borderTopWidth),
    borders: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].join('/'),
    sb: cs.getPropertyValue('--sb').trim(),
    box: cs.boxSizing,
    cells,
  };
};

/* 찍힌 픽셀 — 캡처를 data URL 로 페이지에 되돌려 읽는다(350 처방) */
async function readCol(page, x, ys) {
  fs.mkdirSync(path.dirname(SHOT), { recursive: true });
  await page.screenshot({ path: SHOT });
  const b64 = fs.readFileSync(SHOT).toString('base64');
  return page.evaluate(([data, xx, yy]) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      res(yy.map(y => {
        const d = g.getImageData(xx, y, 1, 1).data;
        return [d[0], d[1], d[2]];
      }));
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), [b64, x, ys]);
}

/* «검정 런» — 코너 반경 밖 열에서 위/아래로 이어지는 순검정 화소 수.
   ⚠ 문턱은 8 로 넉넉히 잡되 **런**으로 센다(단일 화소 판정은 라벨 잉크에 걸린다). */
const isBlack = c => c[0] <= 8 && c[1] <= 8 && c[2] <= 8;
const runFrom = (cols, from, step) => {
  let n = 0, i = from;
  while (i >= 0 && i < cols.length && isBlack(cols[i])) { n++; i += step; }
  return n;
};

(async () => {
  const browser = await launch(chromium);
  const errs = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push(String(e.message || e)));
    await page.goto('file://' + path.resolve(ROOT, 'index.html'));
    await page.waitForTimeout(1400);
    await page.evaluate(() => { const m = document.getElementById('msg'); if (m) m.style.display = 'none'; });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });

    /* ⚠ settle — 60·122 쥬시의 입장 연출(`jzPgIn`·`jzSheetIn`)과 알약 전환 트랜지션이
       도는 동안 읽으면 칸 높이가 84 ↔ 89 로 흔들린다(1회차에 «13 재화 89.0» 로 한 번
       빨갰다). 무한 루프 연출은 `finished` 가 영영 안 오므로 이름으로 걸러낸다.
       47·337 이 쓰는 것과 같은 자다 — **플레이키 게이트를 새로 만들지 않는다**. */
    /* ⚠ settle — 60·122 쥬시의 입장 연출과 알약 전환이 도는 동안 읽으면 칸 높이가 84 ↔ 89 로
       흔들린다(1회차에 «13 재화 89.0» 로 한 번 빨갰다). **`getAnimations().finished` 를 기다리면 안 된다** —
       이 페이지에는 무한 루프 연출이 여럿이라(레드닷 점멸·썸네일 bob …) 이름으로 다 못 걸러내고
       하나라도 걸리면 **영영 안 끝난다**(실제로 16분을 매달렸다). 대신 **읽은 값이 두 번 같을 때까지**
       다시 읽는다 — 상한(10회)이 있어 매달릴 수 없고, 무엇이 흔들리든 상관없다. */
    const readStable = async (sel) => {
      let prev = null;
      for (let i = 0; i < 10; i++) {
        const g = await page.evaluate(READ, sel);
        const k = g && JSON.stringify([g.h, g.bw, g.cells.map(c => [f1(c.l), f1(c.w), f1(c.h)])]);
        if (prev !== null && k === prev) return g;
        prev = k;
        await page.waitForTimeout(160);
      }
      return page.evaluate(READ, sel);
    };
    const snap = {};
    for (const [name, sel, open] of HOSTS) {
      await page.evaluate(open);
      await page.waitForTimeout(320);
      snap[name] = await readStable(sel);
    }

    /* ── [G] 결속 — 이 게이트의 본체 ─────────────────────────────────────── */
    console.log('\n[G] 셋은 한 덩어리다 — 바깥 = 테두리×2 + 칸');
    let seen = 0;
    for (const [name] of HOSTS) {
      const g = snap[name];
      if (!g) { ok(name + ' 바가 보인다', false, '없음'); continue; }
      seen++;
      ok(name + ' 테두리 ' + BORDER + ' (네 면 한 줄)',
        g.borders === (BORDER + 'px/').repeat(3) + BORDER + 'px', g.borders);
      ok(name + ' 바깥 높이 ' + BAR_H + ' · border-box',
        near(g.h, BAR_H, 0.6) && g.box === 'border-box', f1(g.h) + ' / ' + g.box);
      ok(name + ' 칸 높이 ' + CELL_H + ' (n=' + g.cells.length + ')',
        g.cells.length > 0 && g.cells.every(c => near(c.h, CELL_H, 0.6)),
        g.cells.map(c => f1(c.h)).join(' '));
      /* ★ 이 한 줄이 «따로 적힌 세 상수» 를 «한 규약» 으로 묶는다 */
      const cell = g.cells[0] ? g.cells[0].h : NaN;
      ok(name + ' ★ 바깥 − 칸 = 테두리×2',
        near(g.h - cell, g.bw * 2, 0.6), f1(g.h) + ' − ' + f1(cell) + ' = ' + f1(g.h - cell)
        + ' vs ' + f1(g.bw * 2));
    }
    ok('실제로 읽은 호스트 ≥ 7', seen >= 7, seen + '곳');

    /* ── [P] 찍힌 픽셀 ───────────────────────────────────────────────────── */
    console.log('\n[P] 찍힌 픽셀 — 검정 런이 테두리와 같은가 (선언이 아니라 그림)');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(500);
    const g7 = await readStable('#bSk .stabs');
    /* 코너 반경 43 밖 · 활성 알약(가운데 칸) 밖 · 구분선 밖인 열 */
    const XCOL = Math.round(g7.x + g7.w - 90);
    const ys = [];
    for (let i = -4; i < BAR_H + 4; i++) ys.push(Math.round(g7.y) + i);
    const col = await readCol(page, XCOL, ys);
    const top = runFrom(col, 4, +1);
    const bot = runFrom(col, ys.length - 5, -1);
    ok('07 상변 검정 런 = ' + BORDER, top === BORDER, top + 'px @x' + XCOL);
    ok('07 하변 검정 런 = ' + BORDER, bot === BORDER, bot + 'px @x' + XCOL);
    ok('07 검정 사이(칸 자리)가 ' + CELL_H + ' 이다',
      col.length - 8 - top - bot === CELL_H, (col.length - 8 - top - bot) + 'px');
    /* 음성항 — 바 바깥 한 줄은 검정이 아니다(런이 «바 밖까지» 새고 있지 않다) */
    ok('[P-음성] 바 바로 위·아래 한 줄은 검정이 아니다',
      !isBlack(col[3]) && !isBlack(col[ys.length - 4]),
      col[3].join(',') + ' / ' + col[ys.length - 4].join(','));

    /* ── [S] `--sb` 가 진짜 손잡이인가 ───────────────────────────────────── */
    console.log('\n[S] `--sb` 한 손잡이 — 값을 바꾸면 테두리도 **격자도** 같이 따라오는가');
    ok('선언된 --sb = ' + BORDER + 'px', g7.sb === BORDER + 'px', g7.sb || '(없음)');
    const gridErr = (g) => {
      /* 칸 k 는 바 **바깥** 상자를 n 등분한 자리에 앉아야 한다(379 규약).
         활성 알약은 오버행 11.75 를 갖고 있으므로 **비활성 칸으로만** 잰다. */
      const n = g.cells.length, C = g.w / n;
      let e = 0;
      /* c.l 은 바 **바깥** 상자 기준이므로 기대값은 그대로 i·C 다
         (CSS 의 left 는 패딩 기준 `i·C − bw` 이고 둘의 차 bw 가 여기서 상쇄된다). */
      g.cells.forEach((c, i) => { if (!c.on) e = Math.max(e, Math.abs(c.l - i * C), Math.abs(c.w - C)); });
      return e;
    };
    ok('격자가 바깥 ÷n 위에 앉는다 (비활성 칸)', gridErr(g7) <= 0.8, 'Δ ' + f2(gridErr(g7)));
    const st = await page.addStyleTag({ content: '#bSk .stabs{--sb:11px!important}' });
    await page.waitForTimeout(200);
    const gS = await page.evaluate(READ, '#bSk .stabs');
    ok('[S] --sb:11 을 주입하면 테두리가 11 이 된다', near(gS.bw, 11, 0.01), f1(gS.bw));
    ok('[S] --sb:11 에서도 칸 = 바깥 − 22', near(gS.cells[0].h, gS.h - 22, 0.6),
      f1(gS.cells[0].h) + ' vs ' + f1(gS.h - 22));
    ok('[S] ★ --sb:11 에서도 격자가 바깥 ÷n 위에 그대로 앉는다 (손잡이가 하나다)',
      gridErr(gS) <= 0.8, 'Δ ' + f2(gridErr(gS)));
    await page.evaluate(el => el.remove(), st);
    await page.waitForTimeout(200);

    /* ── [R] 되돌림 시험 ─────────────────────────────────────────────────── */
    console.log('\n[R] 되돌림 시험 — 옛 값·부분 되돌림이 전부 빨개져야 한다');
    const inject = async (css) => {
      const h = await page.addStyleTag({ content: css });
      await page.waitForTimeout(200);
      const g = await page.evaluate(READ, '#bSk .stabs');
      await page.evaluate(el => el.remove(), h);
      await page.waitForTimeout(150);
      return g;
    };
    const bound = g => near(g.h - g.cells[0].h, g.bw * 2, 0.6);

    const rAll = await inject('#bSk .stabs{--sb:6px!important;height:97px!important}'
      + '#bSk .stabs>*{height:85px!important}');
    ok('[R-a] 옛 셋(97/6/85)을 통째로 되돌리면 [G] 값 항이 빨개진다',
      !near(rAll.h, BAR_H, 0.6) && !near(rAll.bw, BORDER, 0.01)
      && !near(rAll.cells[0].h, CELL_H, 0.6),
      f1(rAll.h) + '/' + f1(rAll.bw) + '/' + f1(rAll.cells[0].h));
    /* ⚠ 옛 셋은 **자기들끼리는** 결속이 맞다(97 = 6×2 + 85) — 그래서 [R-a] 를 결속으로 걸면
       안 잡힌다. 결속 항이 잡는 것은 «셋 중 하나만» 움직이는 사고이고, 그게 [R-b~d] 다. */
    ok('[R-a2] 그 옛 셋은 자기들끼리 결속은 맞다 (그래서 [G] 값 항이 따로 필요하다)',
      bound(rAll), f1(rAll.h - rAll.cells[0].h) + ' vs ' + f1(rAll.bw * 2));

    /* ⚑ 437 이 칸 높이를 `height:100%`(패딩 상자 파생)로 바꾼 뒤로 ★ 결속은 **CSS 안의
       항등식**이다 — 테두리나 바깥을 혼자 되돌려도 칸이 따라와서 결속은 안 깨진다.
       그것이 개선의 내용이므로 여기서는 «따라오는가» 를 **양성으로** 묻고(R-b·R-c),
       결속을 깰 수 있는 유일한 길인 **칸 높이 리터럴 부활**을 R-d 가 문다.
       ⚠ 이 둘을 «빨개져야 한다» 로 남겨 두면 게이트가 제 개선을 결함으로 읽는다. */
    const rB = await inject('#bSk .stabs{--sb:6px!important}');
    ok('[R-b] 테두리만 6 으로 되돌리면 칸이 **따라와** 86 이 된다 (파생이 살아 있다)',
      bound(rB) && near(rB.cells[0].h, rB.h - 12, 0.6) && !near(rB.cells[0].h, CELL_H, 0.6),
      '테두리 ' + f1(rB.bw) + ' · 칸 ' + f1(rB.cells[0].h));
    const rC = await inject('#bSk .stabs{height:97px!important}');
    ok('[R-c] 바깥만 97 로 되돌리면 칸이 **따라와** 83 이 된다 (파생이 살아 있다)',
      bound(rC) && near(rC.cells[0].h, 97 - 2 * BORDER, 0.6) && !near(rC.cells[0].h, CELL_H, 0.6),
      '바깥 ' + f1(rC.h) + ' · 칸 ' + f1(rC.cells[0].h));
    const rD = await inject('#bSk .stabs>*{height:85px!important}');
    ok('[R-d] 칸 높이 리터럴(85)을 되살리면 ★ 결속이 깨진다 — 유일하게 남은 길이다', !bound(rD),
      f1(rD.h - rD.cells[0].h) + ' vs ' + f1(rD.bw * 2));
    /* --sb 를 안 쓰고 border 만 직접 되돌리면 격자가 어긋나야 한다 —
       «손잡이를 우회하면 티가 난다» 가 [S] 의 음성항이다. */
    const rE = await inject('#bSk .stabs{border-width:6px!important}');
    ok('[R-e] --sb 를 우회해 border 만 6 으로 바꾸면 격자가 어긋난다',
      gridErr(rE) > 0.8, 'Δ ' + f2(gridErr(rE)));

    const back = await page.evaluate(READ, '#bSk .stabs');
    ok('[R-f] 주입을 걷으면 원래대로', near(back.h, BAR_H, 0.6) && near(back.bw, BORDER, 0.01)
      && near(back.cells[0].h, CELL_H, 0.6) && gridErr(back) <= 0.8,
      f1(back.h) + '/' + f1(back.bw) + '/' + f1(back.cells[0].h));

    console.log('\n[E] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
    try { fs.unlinkSync(SHOT); } catch (_) {}
  }
  console.log('\nVERIFY437 ' + (tot - bad) + '/' + tot + (bad ? '  FAIL ' + bad : '  ALL PASS'));
  process.exit(bad ? 1 : 0);
})();
