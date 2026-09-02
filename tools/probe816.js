#!/usr/bin/env node
/* 작업 816 재현기 — 「훈련 카드 버스트가 그 카드의 «비용 숫자» 를 가린다」
 *
 *   node tools/probe816.js
 *
 * 등재문(681 1~5회차 비평에서 여섯 사람이 반복 관측 — CF·CG·CJ·CM·CO)이 말한 것을
 * **찍힌 값**으로 잰다(338 규칙 — 처방 전에 재현):
 *   ⓐ 훈련 강화 버튼(`.cb` 310×106)의 «가격 잉크»(코인 53×53 · 숫자 55×46)를 알이 덮는다.
 *   ⓑ 그 덮임이 수명의 절반가량(CO «380ms 중 205ms = 54%») 이어진다.
 *
 * ⚠ 이 자는 «지금 무엇인가» 를 찍을 뿐 통과·실패를 말하지 않는다(판정은 `tools/verify816.js`).
 * ⚠ 트리거는 실제 사용자 경로다(카드 pointerdown 홀드) — `fxBurst` 를 직접 부르지 않는다.
 * ⚠ **수리 뒤에도 [P] 가 성립하게 짰다**(803 «옛 재현이 굳는» 함정 회피) — 등재문 재현은
 *   **수리 전 사본**(`--burst-keep:none` 주입 = 816 이전의 «구멍 0개» 상태)에서 잰다.
 *   세 상태를 같은 자로 나란히 잰다: [P] 수리 전 · [N] 지금(숫자만 신고) · [S] 대안(코인까지 신고).
 * ⚠ **비교군을 같이 잰다** — 단련(`.tb`)·룬(`.rbt.b1`) 버튼의 라벨도 같은 자로 재서
 *   «660 의 전제(버튼 안에는 가릴 정보가 없다)가 훈련에서만 거짓» 인지 확인한다.
 *   그 둘은 «가격» 이 아니라 고정 라벨이라 덮여도 정보가 안 사라진다(660 근거 ①).
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const SRC = path.resolve(__dirname, '../index.html');
const URL = 'file://' + SRC;
const HOLD_MS = Number(process.env.P816_HOLD || 1400);   /* 홀드 길이 — 연속 강화 구간 */
const STEP_MS = Number(process.env.P816_STEP || 16);     /* 표본 간격 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m + (d ? '  [' + d + ']' : '')); };
const info = (k, v) => console.log('       · ' + k + ': ' + v);
const p1 = n => Math.round(n * 10) / 10;

/* 한 표본 = «지금 화면에 살아 있는 알들이 이 잉크 상자를 몇 % 덮는가».
   알(`.fx-spark`)은 transform 으로 움직이므로 `getBoundingClientRect` 가 곧 «지금 자리» 다.
   겹치는 알끼리 두 번 세지 않게 잉크 상자를 1px 격자로 훑는다(잉크 55×46 = 2,530칸 · 싸다). */
const SAMPLE = () => {
  const inkOf = (host, sel) => {
    const el = host && host.querySelector(sel); if (!el) return null;
    let has = false; for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) has = true;
    if (has) { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); }
    return el.getBoundingClientRect();
  };
  const cov = (ink, eggs) => {
    if (!ink || !ink.width || !ink.height) return 0;
    const x0 = Math.floor(ink.left), y0 = Math.floor(ink.top);
    const w = Math.ceil(ink.width), h = Math.ceil(ink.height);
    let n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x0 + x + 0.5, py = y0 + y + 0.5;
      for (const e of eggs) if (px > e.left && px < e.right && py > e.top && py < e.bottom) { n++; break; }
    }
    return n / (w * h);
  };
  const L = document.getElementById('fxl');
  const eggs = L ? [...L.children].filter(nd => /fx-spark/.test(nd.className + ''))
                     .map(nd => nd.getBoundingClientRect()) : [];
  const card = document.querySelector('#trCards [data-tr]');
  const cb = card && card.querySelector('.cb');
  /* 뭉침 — 서로 «한 덩이» 로 읽히는 거리(반지름합 × 1.30 = `FXB_SEP`) 안에 이웃이 있는 알의 비율.
     구멍을 넓히면 알이 양 끝으로 몰리므로 그 대가를 이 축으로 잰다. */
  let fused = 0;
  for (let i = 0; i < eggs.length; i++) {
    const a = eggs[i], ax = (a.left + a.right) / 2, ay = (a.top + a.bottom) / 2, ar = a.width / 2;
    for (let j = 0; j < eggs.length; j++) {
      if (i === j) continue;
      const b = eggs[j], bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2, br = b.width / 2;
      const m = (ar + br) * 1.30;
      if ((ax - bx) * (ax - bx) + (ay - by) * (ay - by) < m * m) { fused++; break; }
    }
  }
  return {
    t: Math.round(performance.now()),
    n: eggs.length,
    fused: eggs.length ? fused / eggs.length : 0,
    num: cov(inkOf(cb, 'i'), eggs),
    coin: cov(inkOf(cb, 's'), eggs),
    /* 알 중심이 버튼 밖으로 나갔는가 — 660 [C1]«스폰은 버튼뿐» 의 재현판 */
    out: cb ? eggs.filter(e => {
      const b = cb.getBoundingClientRect(), cx = (e.left + e.right) / 2, cy = (e.top + e.bottom) / 2;
      return cx < b.left || cx > b.right || cy < b.top || cy > b.bottom;
    }).length : 0
  };
};

async function holdSample(page, ms, step) {
  const g = await page.evaluate(() => {
    const h = document.querySelector('#trCards [data-tr]'); if (!h) return null;
    const b = (h.querySelector('.cb') || h).getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  if (!g) return null;
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  const rows = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    rows.push(await page.evaluate(SAMPLE));
    await page.waitForTimeout(step);
  }
  await page.mouse.up();
  await page.waitForTimeout(60);
  return rows;
}

function digest(rows, key) {
  const live = rows.filter(r => r.n > 0);
  const vals = live.map(r => r[key]);
  const max = vals.length ? Math.max(...vals) : 0;
  const n25 = live.filter(r => r[key] >= 0.25).length;
  const n05 = live.filter(r => r[key] >= 0.05).length;
  return { max, pct25: live.length ? n25 / live.length : 0, pct05: live.length ? n05 / live.length : 0,
           frames: live.length, n25, n05 };
}

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', e => { if (e.type() === 'error') errs.push(e.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    openTrain();
  });
  await page.waitForTimeout(400);

  console.log('[D] 선언 — 훈련 카드가 신고한 버스트 자리와 그 안의 «가격 잉크»');
  const d = await page.evaluate(() => {
    const f = fxSc(), card = document.querySelector('#trCards [data-tr]'), cb = card.querySelector('.cb');
    const cv = r => [+((r.left - f.x) / f.s).toFixed(1), +((r.top - f.y) / f.s).toFixed(1),
                     +(r.width / f.s).toFixed(1), +(r.height / f.s).toFixed(1)];
    const rg = document.createRange(); rg.selectNodeContents(cb.querySelector('i'));
    return { to: getComputedStyle(card).getPropertyValue('--burst-to').trim(),
             keep: getComputedStyle(card).getPropertyValue('--burst-keep').trim(),
             cb: cv(cb.getBoundingClientRect()),
             coin: cv(cb.querySelector('s').getBoundingClientRect()),
             num: cv(rg.getBoundingClientRect()), txt: cb.querySelector('i').textContent };
  });
  info('--burst-to', d.to + '  (660 — 훈련의 «강화 버튼» = 하단 비용 바)');
  info('--burst-keep', d.keep || '(신고 없음)');
  info('.cb 상자', d.cb.join(' / '));
  info('코인 잉크', d.coin.join(' / '));
  info('숫자 잉크', d.num.join(' / ') + '  «' + d.txt + '»');

  /* 세 상태를 같은 자로 잰다. 주입은 **선언 한 줄**(`--burst-keep`)뿐이고 제품 코드는 안 건드린다 —
     `none` 은 «아무 요소에도 안 걸리는 타입 셀렉터» 라 구멍이 0개 = 정확히 816 이전 상태다. */
  const setKeep = v => page.evaluate(v => {
    for (const c of document.querySelectorAll('#trCards [data-tr]')) c.style.setProperty('--burst-keep', v);
  }, v);
  const runState = async (label, keep) => {
    await setKeep(keep);
    /* ⚠ 앞 상태의 알이 아직 살아 있으면(수명 380ms) 다음 상태의 첫 표본에 섞인다 —
       실제로 1차 시도에서 그 잔류가 «수리 뒤에도 60% 덮임» 으로 읽혔다. 비고 다 지고 시작한다. */
    await page.waitForFunction(() => {
      const L = document.getElementById('fxl');
      return !L || ![...L.children].some(nd => /fx-spark/.test(nd.className + ''));
    }, null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(120);
    const rows = await holdSample(page, HOLD_MS, STEP_MS);
    const num = digest(rows, 'num'), coin = digest(rows, 'coin');
    const live = rows.filter(r => r.n > 0);
    const st = { label, keep, rows, num, coin,
      eggs: rows.reduce((a, r) => a + r.n, 0) / Math.max(1, rows.length),
      fused: live.length ? live.reduce((a, r) => a + r.fused, 0) / live.length : 0,
      out: Math.max(0, ...rows.map(r => r.out)) };
    console.log('  · ' + label + '  (--burst-keep: ' + keep + ')');
    info('숫자 덮임 최대 / ≥25% 표본 / ≥5% 표본',
         p1(num.max * 100) + '% / ' + p1(num.pct25 * 100) + '% / ' + p1(num.pct05 * 100) + '%');
    info('코인 덮임 최대 / ≥25% 표본', p1(coin.max * 100) + '% / ' + p1(coin.pct25 * 100) + '%');
    info('동시 알 수 평균 / 뭉친 알 비율', p1(st.eggs) + '알 / ' + p1(st.fused * 100) + '%');
    info('알 중심이 버튼 밖', st.out + '개(최대 표본)');
    return st;
  };

  console.log('\n[P] 재현 — 홀드(연속 강화) ' + HOLD_MS + 'ms · 표본 간격 ' + STEP_MS + 'ms');
  const pre  = await runState('P 수리 전 사본 — 816 이전(아이콘 버스트는 구멍을 안 판다)', 'none');
  const now  = await runState('N 지금 트리 — 숫자만 신고', 'i');
  const both = await runState('S 대안 — 코인까지 신고(대가 측정용 · 채택 안 함)', 's,i');

  ok(pre.num.frames > 0, 'P1 홀드 중 알이 실제로 태어난다(발화 0 이면 이 재현은 무효다)',
     pre.num.frames + '표본');
  ok(pre.num.max >= 0.25, 'P2 등재문 재현 — 수리 전 사본에서 숫자 잉크가 25% 이상 덮인다',
     '최대 ' + p1(pre.num.max * 100) + '%');
  ok(pre.num.pct05 >= 0.30, 'P3 등재문 재현 — 그 덮임이 «수명의 절반가량» 이어진다(CO 54%)',
     '≥5% 표본 ' + p1(pre.num.pct05 * 100) + '%');
  ok(now.num.max < 0.05, 'P4 지금 트리 — 숫자 잉크 덮임이 사라졌다',
     '최대 ' + p1(now.num.max * 100) + '%');
  ok(now.eggs >= pre.eggs * 0.85, 'P5 밀도를 대가로 치르지 않았다(동시 알 수 ≥ 수리 전의 85%)',
     p1(now.eggs) + '알 ↔ 수리 전 ' + p1(pre.eggs) + '알');
  ok(both.eggs < now.eggs * 0.75, 'P6 대안(코인까지)은 밀도를 통째로 깎는다 — 신고를 숫자 하나로 둔 근거',
     '동시 ' + p1(both.eggs) + '알 ↔ 지금 ' + p1(now.eggs) + '알 (뭉침 '
     + p1(both.fused * 100) + '% ↔ ' + p1(now.fused * 100) + '%)');
  await setKeep('');                                  /* 원복 — 아래 비교군은 선언 그대로 본다 */

  console.log('\n[C] 비교군 — 660 의 전제가 참인 자리(고정 라벨 버튼)');
  const lab = await page.evaluate(() => {
    const one = (host, sel) => {
      const h = document.querySelector(host); if (!h) return null;
      const b = h.querySelector(sel); if (!b) return null;
      return { sel, txt: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24),
               num: /[0-9]/.test((b.textContent || '')) };
    };
    return { tb: one('#trw', '.tb'), rbt: one('#trw', '.rbt.b1'),
             cb: (() => { const c = document.querySelector('#trCards [data-tr] .cb');
                          return c ? { sel: '.cb', txt: c.textContent.trim(), num: /[0-9]/.test(c.textContent) } : null; })() };
  });
  for (const k of ['cb', 'tb', 'rbt']) {
    const v = lab[k];
    info(k, v ? (v.sel + ' «' + v.txt + '» — 숫자를 이고 있는가: ' + (v.num ? '예' : '아니오')) : '(이 탭에서 안 보임)');
  }
  ok(lab.cb && lab.cb.num, 'C1 훈련 버튼만 «누르는 순간의 가격» 을 이고 있다(660 근거 ① 가 훈련에서 거짓)',
     lab.cb ? '«' + lab.cb.txt + '»' : '-');

  ok(errs.length === 0, 'C2 콘솔 에러 0건', errs.slice(0, 2).join(' | ') || '0');

  await browser.close();
  console.log('\nPROBE816 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
