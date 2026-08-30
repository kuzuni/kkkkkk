/* 작업 450 — 서브탭 셸(`.stabs`) **안쪽 어두운 립** 게이트.
 *
 *   node tools/verify450.js
 *
 * 잡는 것 하나(면마다 다르다는 것이 본체다):
 *   ref 는 셸 검정 뒤에 곧바로 림(#705F4B)이 오지 않는다 — **검정과 같은 색의 립 1.5px** 이
 *   한 겹 더 있고, **활성 알약이 닿는 면에서만** 알약이 그것을 덮는다. 그래서 같은 자로 재면
 *   면마다 갈린다(`python3 tools/probe450.py` ⓐ — 06·07·23 세 스크린샷 × 다섯 면, 예외 없음):
 *       알약이 안 닿는 면 8.48~8.51   ↔   닿는 면 6.97~6.99   ↔   **하변 6.98(립 없음)**
 *   우리는 립이 0 이라 네 면이 전부 7.00 이었다 = ref 의 «상 8.50 / 하 6.98» 비대칭이 없었다.
 *
 * ⚑ **림 두께(7)는 안 바뀐다.** 437 review 가 «ref 림 6» 이라 적은 것은 **순수 화소만** 센 값이고,
 *    부분화소까지 밝기 축으로 풀면 6.94~7.03 이다(`probe450` ⓑ — K→R→S 를 «두 축» 으로 가르면
 *    K·R 섞임 화소가 셸바닥보다 어두워 «림 1.0» 이라는 헛값이 나온다. 한 축(α = c·R/R·R)으로 읽는다).
 *    ⇒ 이 작업은 «림을 깎는» 것이 아니라 **검정을 립만큼 안으로 들이고 림을 그만큼 미는** 것이다.
 *
 * ⚑ **네 갈래를 다 문다.** 한 갈래만 물면 «립이 통째로 사라져도 초록» 이거나 «네 면에 다 세워도
 *    초록» 이 된다(LESSONS 328-330·334):
 *      [G] 선언 — `--sl` 한 손잡이 · 상·좌·우 검정 립 · 림은 립 + 7 자리
 *      [P] 찍힌 픽셀 — 안 닿는 면 = 테두리 + 립 · **닿는 면 = 테두리** · **하변 = 테두리**
 *      [S] `--sl` 이 진짜 손잡이인가 — 값을 주입하면 검정도 림 시작도 같이 따라오는가
 *      [R] 되돌림 — 립을 빼면(`--sl:0`) 안 닿는 면이 테두리로 **돌아가야** 하고,
 *          하변에 립을 세우면(네 면 대칭) 하변 항이 **빨개져야** 한다
 *
 * ⚑ **찍힌 픽셀로 본다**(350 처방) — `box-shadow` 선언만 보면 알약이 덮은 자리를 못 본다.
 * ⚠ settle 은 437 의 것을 그대로 쓴다 — `getAnimations().finished` 를 기다리지 않는다
 *   (무한 루프 연출이 여럿이라 영영 안 끝난다). «읽은 값이 두 번 같을 때까지» 다시 읽는다.
 *
 * [3]-(가) 기계적 검증: DOM·픽셀 실측 판정이라 비평가를 안 띄운다.
 */
const fs = require('fs');
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const ROOT = path.resolve(__dirname, '..');
const SHOT = path.resolve(ROOT, 'docs/review/450-shot.png');

const BORDER = 7;           /* 셸 검정 테두리 (437) */
const LIP = 1.5;            /* 셸 안쪽 어두운 립 (450) — 상·좌·우 세 면 */
const RIM = 7;              /* 셸 안쪽 밝은 림 (352 ⓓ) — 두께는 불변, 자리만 립만큼 밀린다 */
const RIM_HEX = [112, 95, 75];
const FACE_HEX = [97, 82, 61];      /* 셸 바닥 #61523D */
const BEVEL_HEX = [99, 79, 55];     /* 활성 알약 베벨 #634F37 — 알약 열에서는 림 대신 이것이 온다 */

/* 호스트 — 96 이 «부품 하나 · 호스트는 위치만» 으로 합쳐 둔 그대로(437·352 와 같은 진입 경로).
   `end` = 활성 칸이 끝 칸이라 **좌(또는 우) 변에 닿는** 호스트인가 (378 규약). */
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
const near = (a, b, t) => Math.abs(a - b) <= t;
const isBlack = c => c[0] <= 8 && c[1] <= 8 && c[2] <= 8;
const close = (c, t, tol) => Math.abs(c[0] - t[0]) <= tol && Math.abs(c[1] - t[1]) <= tol
  && Math.abs(c[2] - t[2]) <= tol;

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
    sl: cs.getPropertyValue('--sl').trim(),
    shadow: cs.boxShadow,
    bg: cs.backgroundImage,
    cells,
  };
};

/* 찍힌 픽셀 — 캡처를 data URL 로 페이지에 되돌려 읽는다(350 처방) */
async function readPix(page, pts) {
  fs.mkdirSync(path.dirname(SHOT), { recursive: true });
  await page.screenshot({ path: SHOT });
  const b64 = fs.readFileSync(SHOT).toString('base64');
  return page.evaluate(([data, ps]) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      res(ps.map(([x, y]) => {
        const d = g.getImageData(x, y, 1, 1).data;
        return [d[0], d[1], d[2]];
      }));
    };
    im.onerror = () => rej(new Error('이미지 로드 실패'));
    im.src = 'data:image/png;base64,' + data;
  }), [b64, pts]);
}

/* 한 면의 «검정 런 → (보간 한 칸) → 림 런» 을 센다.
   ⚠ 립 경계가 반화소라 검정과 림 사이에 **보간 한 칸**이 낀다 — 그 한 칸은 건너뛰되
   **두 칸 이상이면 건너뛰지 않는다**(그러면 «림이 밀렸다» 를 못 본다). */
const scan = (line) => {
  let i = 0;
  while (i < line.length && !isBlack(line[i])) i++;
  const at = i;
  let nb = 0;
  while (i < line.length && isBlack(line[i])) { nb++; i++; }
  let skip = 0;
  while (i < line.length && !close(line[i], RIM_HEX, 8) && skip < 2) { skip++; i++; }
  const rimAt = i - at;
  let nr = 0;
  while (i < line.length && close(line[i], RIM_HEX, 8)) { nr++; i++; }
  return { at, nb, skip, rimAt, nr, after: line.slice(i, i + 2) };
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
      try { await page.evaluate(open); } catch (e) { ok(name + ' 진입', false, e.message.slice(0, 50)); continue; }
      await page.waitForTimeout(320);
      snap[name] = await readStable(sel);
    }

    /* ── [G] 선언 ────────────────────────────────────────────────────────── */
    console.log('\n[G] 선언 — `--sl` 한 손잡이로 립(상·좌·우 검정)과 림(립 + ' + RIM + ')이 조립된다');
    let seen = 0;
    for (const [name] of HOSTS) {
      const g = snap[name];
      if (!g) { ok(name + ' 바가 보인다', false, '없음'); continue; }
      seen++;
      ok(name + ' 선언된 --sl = ' + LIP + 'px', g.sl === LIP + 'px', g.sl || '(없음)');
      ok(name + ' 검정 립 그림자 상·좌·우 (하변 없음)',
        new RegExp('rgb\\(0, 0, 0\\) 0px ' + LIP + 'px 0px 0px inset').test(g.shadow)
        && new RegExp('rgb\\(0, 0, 0\\) ' + LIP + 'px 0px 0px 0px inset').test(g.shadow)
        && new RegExp('rgb\\(0, 0, 0\\) -' + LIP + 'px 0px 0px 0px inset').test(g.shadow)
        && !new RegExp('rgb\\(0, 0, 0\\) 0px -' + LIP + 'px').test(g.shadow),
        (g.shadow || 'none').slice(0, 80));
      ok(name + ' 림은 립만큼 안으로 밀린다 (' + (LIP + RIM) + 'px)',
        new RegExp('rgb\\(112, 95, 75\\) 0px ' + (LIP + RIM) + 'px 0px 0px inset').test(g.shadow)
        && new RegExp('rgb\\(112, 95, 75\\) ' + (LIP + RIM) + 'px 0px 0px 0px inset').test(g.shadow)
        && new RegExp('rgb\\(112, 95, 75\\) -' + (LIP + RIM) + 'px 0px 0px 0px inset').test(g.shadow),
        (g.shadow || 'none').slice(0, 120));
      /* ★ 하변은 그라데이션 몫이고 거기에는 립이 없다 — 첫 정지점이 **셸 바닥**이어야 한다
         (립을 그라데이션으로 세우면 좌·우가 빠지고, 네 면 대칭으로 세우면 하변이 틀어진다). */
      ok(name + ' ★ 하변에는 립이 없다 (그라데이션 첫 정지점 = 셸 바닥 #61523D)',
        /linear-gradient\(rgb\(97, 82, 61\) 0px/.test(g.bg.replace(/\s+/g, ' ')),
        (g.bg || '').slice(0, 60));
    }
    ok('실제로 읽은 호스트 ≥ 7', seen >= 7, seen + '곳');

    /* ── [P] 찍힌 픽셀 — 면마다 갈린다 ──────────────────────────────────── */
    console.log('\n[P] 찍힌 픽셀 — 안 닿는 면 = 테두리 + 립 ' + (BORDER + LIP)
      + ' · 닿는 면 = 테두리 ' + BORDER + ' · 하변 = ' + BORDER);
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(500);
    const g7 = await readStable('#bSk .stabs');
    const on = g7.cells.find(c => c.on);
    ok('[전제] 07 은 **가운데 칸**이 활성이다 (좌·우 끝이 둘 다 «안 닿는 면»)',
      !!on && on.l > 1 && on.l + on.w < g7.w - 1, on ? f1(on.l) + '..' + f1(on.l + on.w) + ' / ' + f1(g7.w) : '없음');

    const xOn = Math.round(g7.x + on.l + on.w / 2);          /* 알약 한복판 열 */
    const xFree = Math.round(g7.x + g7.w - 90);              /* 알약이 안 닿는 열(코너 반경 밖) */
    const yMid = Math.round(g7.y + g7.h / 2);
    const N = 22;   /* 검정 8 + 보간 1 + 림 7 + 그 다음 2 가 다 들어가야 한다 (--sl:5 주입까지) */
    const pts = [];
    for (let i = 0; i < N; i++) pts.push([xOn, Math.round(g7.y) + i]);            /* 0 상(알약 열) */
    for (let i = 0; i < N; i++) pts.push([xFree, Math.round(g7.y) + i]);          /* 1 상(비알약) */
    for (let i = 0; i < N; i++) pts.push([xFree, Math.round(g7.y + g7.h) - 1 - i]); /* 2 하 */
    for (let i = 0; i < N; i++) pts.push([Math.round(g7.x) + i, yMid]);           /* 3 좌 */
    for (let i = 0; i < N; i++) pts.push([Math.round(g7.x + g7.w) - 1 - i, yMid]); /* 4 우 */
    const raw = await readPix(page, pts);
    const lines = [0, 1, 2, 3, 4].map(k => raw.slice(k * N, k * N + N));
    /* 기대값은 둘로 적는다 — **순검정 화소 수**(반화소 몫은 못 세므로 내림)와 **림 시작**(반화소째).
       ⚠ 순검정만 ±1 로 물면 «립 없는 면에 립이 생겨도» 초록이다(7 ↔ 8 이 ±1 안이다).
       우리 렌더는 정수 좌표·DSF1 이라 흔들리지 않으므로 **±0.5(사실상 등호)** 로 문다. */
    const PIX = BORDER + Math.floor(LIP);      /* 립 면의 순검정 화소 수 = 8 */
    /* ⚠ **알약 열에는 셸 림이 없다** — 테두리 다음이 곧 알약 베벨(#634F37)이다.
       그 열에 «림 7칸» 을 요구하면 게이트가 제 손으로 빨개진다(1회차에 그랬다). 면마다
       «다음에 무엇이 와야 하는가» 를 같이 적는다. */
    const FACES = [
      ['상(알약 열)', 0, BORDER, null, false, BEVEL_HEX, '알약 베벨 #634F37'],
      ['상(비알약)', 1, PIX, BORDER + LIP, true, FACE_HEX, '셸 바닥 #61523D'],
      ['하(비알약)', 2, BORDER, BORDER, false, FACE_HEX, '셸 바닥 #61523D'],
      ['좌(끝 칸 비활성)', 3, PIX, BORDER + LIP, true, FACE_HEX, '셸 바닥 #61523D'],
      ['우(끝 칸 비활성)', 4, PIX, BORDER + LIP, true, FACE_HEX, '셸 바닥 #61523D'],
    ];
    for (const [tag, k, wantPix, wantRim, hasLip, nextHex, nextName] of FACES) {
      const z = scan(lines[k]);
      console.log('   ' + tag + ' — 검정 ' + z.nb + '칸(시작 ' + z.at + ') · 보간 ' + z.skip
        + ' · 림 ' + z.nr + '칸@' + z.rimAt + ' → ' + z.after.map(c => c.join(',')).join(' | '));
      ok('07 ' + tag + ' 순검정 = ' + wantPix + (hasLip ? ' (테두리 + 립)' : ' (테두리뿐 — 립 없음)'),
        near(z.at + z.nb, wantPix, 0.5) && z.at <= 1, '시작 ' + z.at + ' · ' + z.nb + '칸');
      if (wantRim !== null) {
        ok('07 ' + tag + ' 림 ' + RIM + '칸 @' + wantRim + ' (두께는 립과 무관하다)',
          Math.abs(z.nr - RIM) <= 1 && Math.abs(z.rimAt - wantRim) <= 1, z.nr + '칸 @' + z.rimAt);
        ok('07 ' + tag + ' 림 다음이 ' + nextName,
          z.after.some(c => close(c, nextHex, 6)), z.after.map(c => c.join(',')).join(' | '));
      } else {
        ok('07 ' + tag + ' 검정 다음이 곧 ' + nextName + ' (이 열에는 셸 림이 없다)',
          close(lines[k][z.at + z.nb], nextHex, 6),
          (lines[k][z.at + z.nb] || []).join(','));
      }
    }
    /* ★ 비대칭 자체를 한 항으로 — 두 면의 차가 립이다(둘 다 7 이거나 둘 다 8.5 면 빨갛다) */
    const zTop = scan(lines[1]), zBot = scan(lines[2]), zOn = scan(lines[0]);
    ok('★ 상(비알약) − 하 = 립 ' + LIP + ' (보간 ±1)', near(zTop.nb - zBot.nb, LIP, 1),
      zTop.nb + ' − ' + zBot.nb + ' = ' + (zTop.nb - zBot.nb));
    ok('★ 상(비알약) − 상(알약 열) = 립 ' + LIP + ' — 알약이 덮는다 (378 규약과 같은 자리)',
      near(zTop.nb - zOn.nb, LIP, 1), zTop.nb + ' − ' + zOn.nb + ' = ' + (zTop.nb - zOn.nb));

    /* ── [E] 끝 칸이 활성인 호스트 — 닿는 변에서는 립이 덮인다 (378 규약 교차) ── */
    console.log('\n[E] 끝 칸이 활성인 호스트 — 닿는 변은 ' + BORDER + ' · 반대 변은 ' + (BORDER + LIP));
    await page.evaluate(() => heroSubGo('eq'));
    await page.waitForTimeout(500);
    const g6 = await readStable('#eqTabs');
    const on6 = g6.cells.find(c => c.on);
    /* ⚠ 칸의 left 는 바 **바깥 상자** 기준이라 «패딩 변에 붙은 칸» 은 0 이 아니라 테두리 폭이다. */
    ok('[전제] 06 은 **첫 칸**이 활성이다 (좌변에 닿는다)', !!on6 && on6.l <= g6.bw + 0.6,
      on6 ? f1(on6.l) + ' (테두리 ' + f1(g6.bw) + ')' : '없음');
    const y6 = Math.round(g6.y + g6.h / 2);
    const pts6 = [];
    for (let i = 0; i < N; i++) pts6.push([Math.round(g6.x) + i, y6]);
    for (let i = 0; i < N; i++) pts6.push([Math.round(g6.x + g6.w) - 1 - i, y6]);
    const raw6 = await readPix(page, pts6);
    const zL = scan(raw6.slice(0, N)), zR = scan(raw6.slice(N, 2 * N));
    console.log('   좌(닿음) 검정 ' + zL.nb + ' · 우(안 닿음) 검정 ' + zR.nb);
    ok('06 좌(활성 알약이 닿는 변) 검정 = ' + BORDER + ' — 립을 알약이 덮는다',
      near(zL.nb, BORDER, 1), zL.nb + '칸');
    ok('06 우(안 닿는 변) 검정 = ' + (BORDER + LIP), near(zR.nb, BORDER + LIP, 1), zR.nb + '칸');

    /* ── [S] `--sl` 이 진짜 손잡이인가 ──────────────────────────────────── */
    console.log('\n[S] `--sl` 한 손잡이 — 값을 주입하면 검정도 **림 시작도** 같이 따라온다');
    await page.evaluate(() => { goTab('hero', true); heroSubGo('sk'); });
    await page.waitForTimeout(400);
    const st = await page.addStyleTag({ content: '#bSk .stabs{--sl:5px!important}' });
    await page.waitForTimeout(240);
    const rawS = await readPix(page, pts.slice(N, 2 * N));
    const zS = scan(rawS);
    ok('--sl:5 → 상(비알약) 검정 ' + (BORDER + 5) + ' (보간 ±1)', near(zS.nb, BORDER + 5, 1), zS.nb + '칸');
    ok('--sl:5 → 림 시작도 ' + (BORDER + 5) + ' 로 따라온다 (두께 ' + RIM + ' 유지)',
      Math.abs(zS.rimAt - (BORDER + 5)) <= 1 && Math.abs(zS.nr - RIM) <= 1,
      zS.nr + '칸 @' + zS.rimAt);
    await page.evaluate(el => el.remove(), st);
    await page.waitForTimeout(240);

    /* ── [R] 되돌림 시험 ─────────────────────────────────────────────────── */
    console.log('\n[R] 되돌림 시험 — 립을 빼거나 네 면 대칭으로 세우면 빨개져야 한다');
    const inject = async (css) => {
      const h = await page.addStyleTag({ content: css });
      await page.waitForTimeout(240);
      const r = await readPix(page, pts);
      await page.evaluate(el => el.remove(), h);
      await page.waitForTimeout(240);
      return [0, 1, 2, 3, 4].map(k => scan(r.slice(k * N, k * N + N)));
    };
    /* R-a — 립 0 = 450 이전 그림. 안 닿는 세 면이 테두리로 **돌아가야** 한다. */
    const ra = await inject('#bSk .stabs{--sl:0px!important}');
    ok('[R-a] --sl:0 (450 이전) → 상(비알약)·좌·우가 ' + BORDER + ' 로 돌아간다 = [P] 가 빨개진다',
      near(ra[1].nb, BORDER, 0.5) && near(ra[3].nb, BORDER, 0.5) && near(ra[4].nb, BORDER, 0.5),
      [ra[1].nb, ra[3].nb, ra[4].nb].join(' / '));
    ok('[R-a2] 그때 하변은 **안 변한다** — 원래 립이 없던 면이다 (음성 대조)',
      near(ra[2].nb, BORDER, 0.5), ra[2].nb + '칸');
    /* R-b — 네 면 대칭(하변에도 립)은 ref 와 다르다. 하변 항이 빨개져야 한다. */
    const rb = await inject('#bSk .stabs{box-shadow:inset 0 ' + LIP + 'px 0 #000,inset 0 -' + LIP
      + 'px 0 #000,inset ' + LIP + 'px 0 0 #000,inset -' + LIP + 'px 0 0 #000,'
      + 'inset 0 ' + (LIP + RIM) + 'px 0 #705F4B,inset 0 -' + (LIP + RIM) + 'px 0 #705F4B,'
      + 'inset ' + (LIP + RIM) + 'px 0 0 #705F4B,inset -' + (LIP + RIM) + 'px 0 0 #705F4B!important}');
    ok('[R-b] 네 면 대칭으로 세우면 **하변**이 ' + (BORDER + LIP) + ' 이 되어 빨개진다',
      rb[2].nb - BORDER >= 1, rb[2].nb + '칸');
    /* R-c — 그라데이션으로만 세우면 좌·우가 빠진다(첫 판에 실제로 겪은 함정: 세로 하드 스톱이
       정수로 스냅돼 상변 립이 1.0 으로 깎이고, 좌·우는 아예 없다). */
    const rc = await inject('#bSk .stabs{box-shadow:none!important;'
      + 'background:linear-gradient(180deg,#000 0 ' + LIP + 'px,#705F4B ' + LIP + 'px '
      + (LIP + RIM) + 'px,#61523D ' + (LIP + RIM) + 'px 77px,#705F4B 77px 84px,#61523D 84px)!important}');
    ok('[R-c] 그라데이션으로만 세우면 좌·우 립이 사라져 빨개진다',
      rc[3].nb <= BORDER + 0.5 && rc[4].nb <= BORDER + 0.5, rc[3].nb + ' / ' + rc[4].nb);
    /* R-d — 원복 */
    const rd = await readPix(page, pts);
    const zd = [0, 1, 2, 3, 4].map(k => scan(rd.slice(k * N, k * N + N)));
    ok('[R-d] 주입을 걷으면 원래대로 (상 ' + (BORDER + LIP) + ' · 하 ' + BORDER + ')',
      near(zd[1].nb, BORDER + LIP, 1) && near(zd[2].nb, BORDER, 0.5) && near(zd[0].nb, BORDER, 0.5),
      zd[1].nb + ' / ' + zd[2].nb + ' / ' + zd[0].nb);

    console.log('\n[C] 콘솔');
    ok('콘솔 에러 0건', errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) {
    ok('실행', false, String(e.message || e));
  } finally {
    await browser.close();
  }
  console.log('\nVERIFY450 ' + (tot - bad) + '/' + tot + (bad ? '  FAIL ' + bad : '  ALL PASS'));
  process.exit(bad ? 1 : 0);
})();
