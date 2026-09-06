/* 작업 352 — 공용 서브탭 부품 «337 이 남긴 넷» 게이트.
 *
 *   node tools/verify352.js
 *
 * 잡는 것 넷(등재문 순서):
 *   ⓐ 활성 알약 코너 반경  36 → **32**            (`.stab.on{border-radius}`)
 *   ⓑ 셸 좌·우 검정 테두리 6 → 8                  → **기각**. 여기서는 «6 이 맞다» 를 못박는다.
 *   ⓒ `.stab-sep` 구분선   top 18→16 · h 54→55
 *   ⓓ 셸 좌·우 안쪽 밝은 림 7px                    (`.stabs{box-shadow:inset ±7 #705F4B}`)
 *
 * ⚑ ⓓ 는 **찍힌 픽셀**로 본다(350 처방) — `box-shadow` 선언만 보면 자식(`.stab`)이 덮어
 *    실제로는 안 보이는데도 초록일 수 있다. 캡처를 data URL 로 페이지에 되돌려 읽는다.
 * ⚑ ⓑ 는 «안 고쳤다» 를 적어 두는 자리가 아니라 **다음 세션이 다시 8 로 밀지 못하게 하는 못**이다.
 *    근거는 자를 안 대도 성립하는 항등식이다 — 셸 97 · 알약 85 가 둘 다 ref 와 Δ0(337) 이므로
 *    상·하 테두리는 (97−85)/2 = **6** 이고, 네 면이 같은 `border` 한 줄이므로 좌·우도 6 이다.
 *    ref 가 8 로 «보이는» 것은 JPEG AA 한 줄이 검정 바깥에 붙기 때문이다
 *    (`python3 tools/probe352.py` ⓑ — 순검정 문턱 ≤4 로 세면 6).
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.join(ROOT, 'docs', 'shots', '352.png');

/* ⚑⚑ 968 (2026-09-06) — 이 30 은 **제품 선언**이지 «ref 반경» 이 아니다. `probe352.py` ⓐ 가
   내는 수(옛 자 32.0 · 새 자 30.6)는 rx 가 아니라 **타원 코너에 원 모델을 씌운 «원호지수»** 이고,
   참값이 30 인 우리 캡처를 같은 자로 재면 **28.1** 이다(모델 예측 28.03 · Δ0.07). 그래서
   «30.6 ↔ 선언 30» 을 빼서 «Δ0.6» 이라고 적으면 두 자를 섞은 것이다 — 같은 자끼리는
   ref 30.6 ↔ 우리 28.1 = **Δ+2.5**, 모델 역산으로는 **ref rx = 32.7 ± 1.3**.
   제품을 옮길지는 409 코너 장치를 다시 세우는 레이아웃 판단이라 **970** 으로 등재했다(969 는 등재 경쟁으로 남에게 갔다).
   상세·못은 `tools/verify968.js` · `docs/review/968-스탭스과녁재수립.md`. */
const RADIUS = 30;          /* ⓐ — 제품 선언 */
/* 437 (2026-08-30) 이관 — BORDER 6 → **7** · BAR_H 97 → **98** · CELL_H 85 → **84**.
   352 가 8 을 기각한 근거(«ref 순검정 6 + AA 한 줄»)와 409·384 비평가의 7.91 을 `probe437.py`
   가 **자 검산**으로 갈랐다 — 자 넷을 우리 캡처(진실은 CSS 가 안다)에 대니 넷 다 오차 0.00 이라
   문턱은 ref 에서만 갈린다. 그래서 ref 를 **색 분류**로 읽으니 K7·B7·F63·B7·D7·K6(+AA) 이고,
   테두리 7 · 칸 84 · 바깥 98 이 7+84+7 로 서로를 검산한다. «8» 은 **테두리 7 + 셸 안쪽 립 1.4**
   였고(활성 알약이 닿는 면에서는 7.0), 그 립은 **450** 으로 따로 등재했다.
   ⚠ 아래 [2] 항등식은 그대로 살아 있다 — 셋 중 하나만 되돌아가면 그 항이 곧바로 빨개진다. */
const BORDER = 7, BAR_H = 98, CELL_H = 84;
const SEP_TOP = 16, SEP_H = 54, SEP_W = 6, SEP_CX = 706;  /* ⓒ — left 가 아니라 **중심**을 묻는다 */
const RIM = 7, RIM_HEX = '#705F4B';                       /* ⓓ */
/* 450 이관 (2026-08-30) — 셸 안쪽 **어두운 립** `--sl`. 437 이 «검정 7» 을 확정하며 곁다리로
   남긴 자리다: ref 는 검정 뒤에 곧바로 림이 오지 않고 검정과 같은 색이 1.5px 더 있고,
   **활성 알약이 닿는 면에서만** 알약이 그것을 덮는다(`probe450` ⓐ — 안 닿는 면 8.48~8.51 ↔
   닿는 면 6.97~6.99 · 하변은 어디서나 6.98 = 립 없음). ⇒ 이 게이트가 재는 «알약 없는 변» 은
   검정이 BORDER + LIP 이고 림은 그만큼 **안으로 밀린다**(두께 7 은 불변). */
const LIP = 1.5;
const FACE_HEX = '#61523D';

const HOSTS = [
  ['07 스킬', '#bSk .stabs', () => { goTab('hero', true); heroSubGo('sk'); }, true],
  ['06 장비', '#eqTabs', () => heroSubGo('eq'), true],
  ['03 던전', '#dunSub', () => { goTab('hero'); openDungeon(); }, false],
  ['10 상점', '#shopCats', () => openShopPage(), false],
  ['13 재화', '#shopCats', () => document.querySelector('#shopCats [data-cat="coin"]').click(), false],
  ['23 훈련', '#trSubs', () => { goTab('grow'); }, false],
];

let bad = 0, tot = 0;
const ok = (name, cond, got) => {
  tot++;
  if (cond) console.log('  PASS ' + name + (got === undefined ? '' : ' — ' + got));
  else { bad++; console.log('  FAIL ' + name + (got === undefined ? '' : ' — ' + got)); }
};
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
const near = (a, b, t) => Math.abs(a - b) <= t;

const READ = (sel) => {
  const bar = document.querySelector(sel);
  if (!bar || !bar.offsetParent) return null;
  const bb = bar.getBoundingClientRect();
  const cs = getComputedStyle(bar);
  const on = bar.querySelector('.stab.on');
  const ob = on && on.getBoundingClientRect();
  const seps = [...bar.querySelectorAll(':scope > .stab-sep')].map(e => {
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  return {
    bar: { x: bb.x, y: bb.y, w: bb.width, h: bb.height },
    border: parseFloat(cs.borderLeftWidth),
    borders: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].join('/'),
    shadow: cs.boxShadow,
    onH: ob ? ob.height : null,
    onRadius: on ? getComputedStyle(on).borderTopLeftRadius : null,
    seps,
  };
};

/* 찍힌 픽셀 — 캡처를 data URL 로 페이지에 되돌려 읽는다(350 처방). */
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
        return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      }));
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), [b64, x, ys]);
}

async function readRow(page, y, xs) {
  fs.mkdirSync(path.dirname(SHOT), { recursive: true });
  await page.screenshot({ path: SHOT });
  const b64 = fs.readFileSync(SHOT).toString('base64');
  return page.evaluate(([data, yy, xx]) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      res(xx.map(x => {
        const d = g.getImageData(x, yy, 1, 1).data;
        return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      }));
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), [b64, y, xs]);
}

/* 색 비교는 «정확한 hex» 가 아니라 채널 오차로 한다 — 둥근 모서리의 가장자리 열은
   0.5px 보간이 섞여 #61523D 가 #62523E 로 찍힌다(1회차에 이것 때문에 3항이 빨갰다). */
const chan = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const close = (h, t, tol) => chan(h).every((v, i) => Math.abs(v - chan(t)[i]) <= tol);
const isBlack = h => close(h, '#000000', 8);

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
    await page.evaluate(() => {
      const m = document.getElementById('msg'); if (m) m.style.display = 'none';
    });
    await page.addStyleTag({ content: '.fx-fly,.fx-plus,.fx-spark,.fx-toast,.fx-check,.fx-flash{display:none!important}' });

    const snap = {};
    console.log('\n[1] 부품 동시성 — 6 호스트가 같은 셸·같은 알약을 쓴다');
    for (const [name, sel, setup] of HOSTS) {
      try { await page.evaluate(setup); } catch (e) { ok(name + ' 진입', false, e.message.slice(0, 60)); continue; }
      await page.waitForTimeout(700);
      const g = await page.evaluate(READ, sel);
      snap[name] = g;
      if (!g) { ok(name + ' 바가 보인다', false, '없음'); continue; }
      ok(name + ' 셸 높이 ' + BAR_H + ' · 테두리 ' + BORDER,
        near(g.bar.h, BAR_H, 0.6) && near(g.border, BORDER, 0.01),
        f1(g.bar.h) + ' / ' + g.borders);
      ok(name + ' 활성 알약 반경 ' + RADIUS + 'px', g.onRadius === RADIUS + 'px', g.onRadius);
      /* 450 — 림은 립만큼 안으로 밀리므로 그림자 오프셋은 LIP + RIM 이고, 그 앞에 검정 립
         그림자가 좌·우로 하나씩 더 있다. **둘을 같이 물어야** 한쪽이 사라져도 빨개진다. */
      const RS = LIP + RIM;
      ok(name + ' 셸 안쪽 림 그림자 좌·우 ' + RS + 'px = 립 ' + LIP + ' + 림 ' + RIM + ' (352 ⓓ · 450)',
        new RegExp('rgb\\(112, 95, 75\\) ' + RS + 'px 0px 0px 0px inset').test(g.shadow)
        && new RegExp('rgb\\(112, 95, 75\\) -' + RS + 'px 0px 0px 0px inset').test(g.shadow),
        (g.shadow || 'none').slice(0, 70));
      ok(name + ' 셸 안쪽 어두운 립 그림자 상·좌·우 ' + LIP + 'px (450)',
        new RegExp('rgb\\(0, 0, 0\\) 0px ' + LIP + 'px 0px 0px inset').test(g.shadow)
        && new RegExp('rgb\\(0, 0, 0\\) ' + LIP + 'px 0px 0px 0px inset').test(g.shadow)
        && new RegExp('rgb\\(0, 0, 0\\) -' + LIP + 'px 0px 0px 0px inset').test(g.shadow),
        (g.shadow || 'none').slice(0, 100));
    }

    console.log('\n[2] ⓑ 셸 테두리 = (셸 − 알약)/2 — 셋이 한 덩어리임을 항등식으로 못박는다 (437)');
    for (const [name] of HOSTS) {
      const g = snap[name];
      if (!g || g.onH == null) continue;
      ok(name + ' (셸 ' + f1(g.bar.h) + ' − 알약 ' + f1(g.onH) + ') / 2 = 테두리 ' + BORDER,
        near((g.bar.h - g.onH) / 2, BORDER, 0.6), f1((g.bar.h - g.onH) / 2));
      ok(name + ' 네 면이 같은 테두리 한 줄', g.borders === (BORDER + 'px/').repeat(3) + BORDER + 'px', g.borders);
    }

    console.log('\n[3] ⓒ `.stab-sep` — 4칸 격자 호스트(06·07)만');
    for (const [name] of HOSTS) {
      const g = snap[name];
      if (!g) continue;
      const four = name.startsWith('06') || name.startsWith('07');
      if (!four) { ok(name + ' 구분선 0개 (균등분할 바)', g.seps.length === 0, g.seps.length + '개'); continue; }
      const cx = g.bar.x + g.border, cy = g.bar.y + g.border;
      ok(name + ' 구분선 1개', g.seps.length === 1, g.seps.length + '개');
      if (!g.seps.length) continue;
      const s = g.seps[0];
      ok(name + ' 구분선 ' + SEP_W + 'x' + SEP_H, near(s.w, SEP_W, 0.6) && near(s.h, SEP_H, 0.6), f1(s.w) + 'x' + f1(s.h));
      ok(name + ' 구분선 상변 = 콘텐츠 상변 + ' + SEP_TOP, near(s.y - cy, SEP_TOP, 0.6), f1(s.y - cy));
      /* 352 5회차 — left 가 아니라 **중심**을 묻는다. 폭이 바뀌면 left 는 따라 움직여야 하는데
         left 만 묻는 게이트는 «중심이 밀린 것» 을 못 본다(ref 중심 = 콘텐츠 좌변 + 706.43). */
      ok(name + ' 구분선 중심 = 콘텐츠 좌변 + ' + SEP_CX, near(s.x + s.w / 2 - cx, SEP_CX, 0.6), f1(s.x + s.w / 2 - cx));
      ok(name + ' 구분선 하변이 알약 하변 안 (돌출 0)',
        s.y + s.h <= g.bar.y + g.border + CELL_H + 0.6, f1(s.y + s.h - (g.bar.y + g.border)));
    }

    console.log('\n[4] ⓓ 찍힌 픽셀 — 검정 ' + BORDER + ' → 림 ' + RIM + ' → 바 면 (선언이 아니라 그림)');
    /* 07 스킬로 돌아가 한 장 찍는다 — 활성 칸이 «가운데» 라 좌·우 끝이 둘 다 비활성이다
       (끝 칸이 활성이면 알약이 림을 덮는 것이 ref 와 같은 그림이라 표본이 못 된다). */
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(900);
    const g7 = await page.evaluate(READ, '#bSk .stabs');
    const y = Math.round(g7.bar.y + g7.bar.h / 2);
    const L = Math.round(g7.bar.x), R = Math.round(g7.bar.x + g7.bar.w) - 1;
    const xsL = [], xsR = [];
    for (let i = 0; i < 18; i++) { xsL.push(L + i); xsR.push(R - i); }
    const rowL = await readRow(page, y, xsL);
    const rowR = await readRow(page, y, xsR);
    /* 띠의 «칸 수» 를 센다 — 절대 인덱스로 읽으면 셸 바깥 가장자리 1px 의 보간
       (#0F0D0B) 때문에 전부 한 칸씩 밀린다. 검정 → 림 → 면 **순서와 길이**가 본체다. */
    const bands = row => {
      const b = row.filter(isBlack).length ? row.findIndex(isBlack) : -1;
      let i = b, nb = 0;
      while (i < row.length && isBlack(row[i])) { nb++; i++; }
      let nr = 0, j = i;
      while (j < row.length && !close(row[j], RIM_HEX, 6)) j++;   /* 보간 한 칸 건너뛴다 */
      const rimStart = j;
      while (j < row.length && close(row[j], RIM_HEX, 6)) { nr++; j++; }
      return { b, nb, rimStart, nr, after: row.slice(j, j + 3) };
    };
    for (const [tag, row] of [['좌', rowL], ['우', rowR]]) {
      const z = bands(row);
      console.log('   ' + tag + ' ' + row.join(' '));
      console.log('     검정 %d칸(시작 %d) → 림 %d칸(시작 %d) → %s'.replace('%d칸(시작 %d)', z.nb + '칸(시작 ' + z.b + ')')
        .replace('%d칸(시작 %d)', z.nr + '칸(시작 ' + z.rimStart + ')').replace('%s', z.after.join(' ')));
      /* 450 — 여기 좌·우는 «알약이 안 닿는» 바 변이라 검정 = 테두리 + 립이고 림은 그만큼 밀린다.
         ⚠ 문턱을 BORDER 로 두면 립이 통째로 사라져도(7) ±1 안이라 초록이다 — 기대값을 옮긴다. */
      ok('07 ' + tag + ' 검정 띠 = 테두리 ' + BORDER + ' + 립 ' + LIP + ' (보간 ±1)',
        z.b <= 1 && Math.abs(z.b + z.nb - (BORDER + LIP)) <= 1, '시작 ' + z.b + ' · ' + z.nb + '칸');
      ok('07 ' + tag + ' 림 ' + RIM_HEX + ' 이 ' + RIM + '칸 @' + (BORDER + LIP) + ' (보간 ±1)',
        Math.abs(z.nr - RIM) <= 1 && Math.abs(z.rimStart - (BORDER + LIP)) <= 1,
        z.nr + '칸 @' + z.rimStart);
      ok('07 ' + tag + ' 림 다음이 바 면 ' + FACE_HEX,
        z.after.some(h => close(h, FACE_HEX, 4)), z.after.join(' '));
    }

    /* 352 2회차 — «네 면이 한 규약(7px)» 을 세로로도 묻는다. 상 8 / 하 6 이던 것을
       7 / 7 로 맞춘 자리다(비평가 AT·AU 2인 일치 + 측정표 07 §9 행 구간). */
    const xin = Math.round(g7.bar.x + g7.bar.w * 0.62);     /* 비활성 «코스튬» 칸 한복판 */
    const ysT = [], ysB = [];
    for (let i = 0; i < 18; i++) { ysT.push(Math.round(g7.bar.y) + i); ysB.push(Math.round(g7.bar.y + g7.bar.h) - 1 - i); }
    const colT = await readCol(page, xin, ysT);
    const colB = await readCol(page, xin, ysB);
    for (const [tag, col] of [['상', colT], ['하', colB]]) {
      let i = 0; while (i < col.length && !isBlack(col[i])) i++;
      let nb = 0; while (i + nb < col.length && isBlack(col[i + nb])) nb++;
      let j = i + nb, nr = 0;
      while (j < col.length && !close(col[j], RIM_HEX, 8)) j++;
      const st = j;
      while (j < col.length && close(col[j], RIM_HEX, 8)) { nr++; j++; }
      console.log('   ' + tag + ' ' + col.slice(0, 16).join(' '));
      /* 450 — **상변에는 립이 있고 하변에는 없다**(ref 8.50 ↔ 6.98, 세 스크린샷 예외 없음).
         네 면을 한 기대값으로 묶어 두면 그 비대칭이 게이트에 안 보인다 — 면마다 갈라 묻는다. */
      const blk = tag === '상' ? BORDER + LIP : BORDER;
      ok('07 ' + tag + ' 검정 띠 = ' + blk + (tag === '상' ? ' (테두리 + 립)' : ' (테두리 · 립 없음)')
        + ' (보간 ±1)', Math.abs(i + nb - blk) <= 1, i + '+' + nb);
      ok('07 ' + tag + ' 밝은 띠 ' + RIM + 'px ' + RIM_HEX + ' @' + blk
        + ' — 네 면이 한 규약(색까지) (보간 ±1)',
        Math.abs(nr - RIM) <= 1 && Math.abs(st - blk) <= 1, nr + '칸 @' + st);
    }

    /* 352 4회차 — 활성 알약 «내부 3띠» 도 같은 7px 규약이다(비평가 AW 커버리지 적분:
       ref 6.75 / 6.86 / 7.03 ↔ 수리 전 우리 8.52 / 5.00 / 8.00). 알약 한복판 열에서 잰다. */
    const onb = await page.evaluate(() => {
      const on = document.querySelector('#bSk .stabs .stab.on').getBoundingClientRect();
      return { x: on.x, y: on.y, w: on.width, h: on.height };
    });
    const xp = Math.round(onb.x + onb.w * 0.22);          /* 라벨 잉크를 피한 알약 안쪽 열 */
    const ysP = [];
    for (let i = -2; i < 92; i++) ysP.push(Math.round(onb.y) + i);
    const colP = await readCol(page, xp, ysP);
    /* 알약 국소좌표 0..CELL_H — 앞 2칸은 셸 테두리라 건너뛴다 */
    const seg = (from, hex, tol) => {
      let i = from, n = 0;
      while (i < colP.length && !close(colP[i], hex, tol)) i++;
      const st = i;
      while (i < colP.length && close(colP[i], hex, tol)) { n++; i++; }
      return { st: st - 2, n, end: i };
    };
    const t1 = seg(2, '#634F37', 5);
    const t2 = seg(t1.end, '#634F37', 5);
    const t3 = seg(t2.end, '#413122', 5);
    console.log('   알약 열 x' + xp + ' — 상단띠 ' + t1.n + '칸@' + t1.st
      + ' · 하단밝은띠 ' + t2.n + '칸@' + t2.st + ' · 하단어두운띠 ' + t3.n + '칸@' + t3.st);
    ok('07 알약 상단 하이라이트 띠 7px @0', t1.n === 7 && t1.st === 0, t1.n + '칸@' + t1.st);
    /* 437 — 띠 **두께 7 은 그대로**이고 시작점만 칸 상자 85 → 84 를 따라 한 칸씩 당겨진다.
       ref 실측(probe437 ⓑ)도 rel 70..77 · 77..84 다. */
    ok('07 알약 하단 밝은 띠 7px @' + (CELL_H - 14), t2.n === 7 && t2.st === CELL_H - 14, t2.n + '칸@' + t2.st);
    ok('07 알약 하단 어두운 띠 7px @' + (CELL_H - 7), t3.n === 7 && t3.st === CELL_H - 7, t3.n + '칸@' + t3.st);

    console.log('\n[R] 되돌림 시험 — 옛 값을 주입하면 빨개져야 한다');
    /* ⚠ `addStyleTag` 은 id 를 안 받는다 — 1회차에 R4(원복)가 그것 때문에 빨갰다.
       걷을 수 있게 직접 심는다. */
    await page.evaluate(() => {
      const s = document.createElement('style');
      s.id = 'r352';
      s.textContent = '.stab.on{border-radius:36px!important}.stab-sep{top:18px!important;height:50px!important}.stabs{box-shadow:none!important}';
      document.head.appendChild(s);
    });
    await page.waitForTimeout(400);
    const gr = await page.evaluate(READ, '#bSk .stabs');
    ok('R1 반경 36 을 되돌리면 ⓐ 가 깨진다', gr.onRadius !== RADIUS + 'px', gr.onRadius);
    ok('R2 구분선 18/54 를 되돌리면 ⓒ 가 깨진다',
      !near(gr.seps[0].y - (gr.bar.y + gr.border), SEP_TOP, 0.6) || !near(gr.seps[0].h, SEP_H, 0.6),
      f1(gr.seps[0].y - (gr.bar.y + gr.border)) + ' / ' + f1(gr.seps[0].h));
    const rowL2 = await readRow(page, y, xsL);
    ok('R3 림 그림자를 빼면 ⓓ 픽셀이 깨진다',
      rowL2.slice(BORDER + 1, BORDER + RIM).some(h => h !== RIM_HEX),
      rowL2.slice(BORDER, BORDER + RIM + 1).join(' '));
    await page.evaluate(() => { const e = document.getElementById('r352'); if (e) e.remove(); });
    await page.waitForTimeout(400);
    const gb = await page.evaluate(READ, '#bSk .stabs');
    ok('R4 주입을 걷으면 전부 원래대로',
      gb.onRadius === RADIUS + 'px' && near(gb.seps[0].h, SEP_H, 0.6)
      && new RegExp('rgb\\(112, 95, 75\\) ' + (LIP + RIM) + 'px').test(gb.shadow),   /* 450 이관 */
      gb.onRadius + ' / h' + f1(gb.seps[0].h));

    console.log('\n[5] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 2).join(' | ') || '0건');
  } finally { await browser.close(); }
  console.log('\nVERIFY352 ' + (tot - bad) + '/' + tot + '  ' + (bad ? 'FAIL ' + bad : 'PASS'));
  process.exit(bad ? 1 : 0);
})();
