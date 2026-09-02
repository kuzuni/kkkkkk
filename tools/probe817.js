/* 작업 817 재현 프로브 — «유물 소환 버스트가 뷰포트 상단(y=0)에서 잘린다»
 *
 *   node tools/probe817.js
 *
 * 338·341·350·363·368·372·429·654·655·682·683 규칙 — **처방을 따르기 전에 등재문의 주장이
 * 참인지 제품에게 직접 묻는다.** 등재문(2026-09-02, sess-1058-31626 워커 D · 681 8회차 §6)의 주장:
 *   ⓐ 유물 소환 버스트의 알이 **프레임 상단(y=0) 밖으로 나간다**
 *     (CF «5번(150ms)부터 8번까지 상단 y=0 에 잘린다 = 380ms 중 230ms(61%) · 10개 중 약 2개» ·
 *      CK «검출 f4 12 → f6 10 → f7 8 → f8 0» · CN «11 → 9(250ms) → 8(320ms)»).
 *   ⓑ 씬 A(훈련)에서는 **0건** — 요소(bbox) 대상이라 619 28회차의 가둠이 잡는다.
 *   ⇒ 등재문의 처방 후보 셋(ⓐ 세로 클램프를 84px 까지 · ⓑ 위쪽 사거리 축소 · ⓒ 발원점 하강)은
 *      전부 **제품을 고치는 길**이다.
 *
 * ⚑⚑ **이 자는 ⓐ 를 기각한다.** 세는 것은 픽셀이 아니라 **알의 궤적**이다 — 캡처로 세면
 *   «알 8개» 가 «겹쳤다»·«희미해졌다»·«밖으로 나갔다» 중 어느 것인지 못 가른다
 *   (CK 의 «f8 0» 이 그 모호함이다 — 봉투 끝의 α=0 도 같은 숫자를 낸다).
 *   알 하나하나의 시작점(`style.left/top`) · 이동량(`--dx/--dy`) · 잉크 지름(`width`)을 읽어
 *   **궤적 전 구간의 잉크 상·하변** `min/max(top, top+dy) ∓ sz/2` 을 프레임 좌표로 계산한다.
 *   `@keyframes fxSpark` 의 어느 지점도 `--dx/--dy` 를 넘지 않으므로 두 끝이 곧 궤적의 극값이다.
 *   좌표계는 셋 다 프레임 px 라 보정이 없다(619 12회차·682·683 과 같은 자리).
 *
 * 절:
 *   [1] 제품 — 지원 프레임 5종에서 프레임 밖 알 0건 (**등재문 ⓐ 가 참이면 여기가 빨갛다**)
 *   [2] 크롭 — 종전 `cap681` 클립(손 상수 M=160)이 알을 자른다 (**여기가 빨간 것이 «주인이 본 그림»**)
 *   [3] 씬 A(훈련) 대조 — 요소 대상은 프레임·크롭 둘 다 0건 (등재문 ⓑ 는 참이나 **이유가 다르다**)
 *   [4] 666 규약 — 지불 알의 발원은 버튼 대역
 *   [5] 상향 원뿔이 살아 있다 (682 · 666 4회차)
 *   [6] 콘솔 에러 0
 *
 * ⚑ **[1] 과 [2] 가 이 작업의 갈림점이다.** [1] 초록 + [2] 빨강 = «잘린 것은 화면이 아니라 캡처» =
 *   제품 0줄 · 하네스 수리. 둘이 뒤집히면 등재문의 처방으로 돌아가라(그 경우 `cap681` 은 무죄다).
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = path.resolve(__dirname, '..', 'index.html');
const URL = 'file://' + SRC.replace(/\\/g, '/');
const HS = [1600, 1780, 1920, 2280, 2600];   /* 지원 프레임(#app clamp 1600~2600) */
const BURSTS = 12;                            /* 프레임마다 버스트 12회 = 알 120개 */
const M_OLD = 160;                            /* 817 이전 `cap681` 의 손 상수 클립 여유 */

let pass = 0, fail = 0;
const ok = (c, m, d) => { c ? pass++ : fail++; console.log((c ? '  ✅ ' : '  ❌ ') + m + (d !== undefined && d !== '' ? ' — ' + d : '')); };
const info = (m, d) => console.log('  ·  ' + m + (d !== undefined ? ' — ' + d : ''));
const blk = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 62 - t.length)));
const ev = async (page, fn, arg) => {
  try { return await page.evaluate(fn, arg); }
  catch (e) { console.log('  ⚠ evaluate 예외: ' + e.message.split('\n')[0]); return null; }
};

/* 한 화면에서 버스트를 N 회 굴려 알의 «궤적 상자» 를 전부 걷어 온다.
   `sel` 을 누르고 `#fxl` 에 새로 붙은 `.fx-spark` 를 그 자리에서 훑는다(683·682 와 같은 이유로
   MutationObserver 를 안 쓴다 — 트리거는 동기라 버스트 경계가 정확하다). */
const RUN = ({ sel, open, n }) => {
  const out = { frameH: 0, host: null, born: [], err: '' };
  try {
    const num = v => { const q = parseFloat(v); return Number.isFinite(q) ? q : null; };
    try { closeModal(); } catch (_) {}
    S.relic = 1e12; S.gold = 1e18; S.dia = 1e9; S.rstone = 1e9; S.tstone = 1e9;
    if (S.temper) S.temper.pts = 1e6;
    (new Function(open))();
    const f = (typeof fxSc === 'function') ? fxSc() : null;
    const app = document.getElementById('app');
    out.frameH = app ? app.getBoundingClientRect().height / (f ? f.s : 1) : 0;
    const L = document.getElementById('fxl');
    const el = document.querySelector(sel);
    if (!el) { out.err = '대상 없음: ' + sel; return out; }
    out.host = (typeof fxRect === 'function') ? fxRect(el) : null;
    while (L.firstChild) L.removeChild(L.firstChild);
    for (let k = 0; k < n; k++) {
      const seen = new Set(L.children);
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      for (const nd of L.children) {
        if (seen.has(nd)) continue;
        const c = nd.className + '';
        if (!/fx-spark/.test(c)) continue;
        const x = num(nd.style.left), y = num(nd.style.top);
        if (x === null || y === null) continue;
        const sz = num(nd.style.width) || parseFloat(getComputedStyle(nd).width) || 26;
        out.born.push({ x, y,
          dx: num(nd.style.getPropertyValue('--dx')) || 0,
          dy: num(nd.style.getPropertyValue('--dy')) || 0,
          sz, rlic: /fx-rlic/.test(c) });
      }
      while (L.firstChild) L.removeChild(L.firstChild);
    }
  } catch (e) { out.err = String(e).split('\n')[0]; }
  return out;
};

const top = q => Math.min(q.y, q.y + q.dy) - q.sz / 2;
const bot = q => Math.max(q.y, q.y + q.dy) + q.sz / 2;
const lft = q => Math.min(q.x, q.x + q.dx) - q.sz / 2;
const rgt = q => Math.max(q.x, q.x + q.dx) + q.sz / 2;

(async () => {
  const browser = await launch(chromium);
  const errs = [];

  /* ── [1] 제품 — 지원 프레임 5종 ── */
  blk('[1] 제품 — 프레임 밖으로 나간 알 (등재문 ⓐ 가 참이면 빨갛다)');
  const rows = [];
  for (const VH of HS) {
    const p = await browser.newPage({ viewport: { width: 1080, height: VH } });
    p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
    await p.goto(URL, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    const r = await ev(p, RUN, { sel: '#rwBasin', open: 'openRelw()', n: BURSTS });
    await p.close();
    if (!r || r.err) { ok(false, '[1-' + VH + '] 표본 수집', (r && r.err) || '실패'); continue; }
    const pay = r.born.filter(q => !q.rlic);
    const mnT = Math.min(...pay.map(top)), mxB = Math.max(...pay.map(bot));
    rows.push({ VH, fh: r.frameH, host: r.host, pay, mnT, mxB });
    info('frameH ' + Math.round(r.frameH), '알 ' + pay.length
       + ' · 잉크 상변 최소 ' + mnT.toFixed(1) + ' · 하변 최대 ' + mxB.toFixed(1)
       + ' · 최대 상향 도달 ' + (r.host ? (r.host.y + r.host.h * 0.28 - mnT).toFixed(0) + 'px' : '-'));
  }
  ok(rows.length === HS.length, '[1-pre] 지원 프레임 5종 표본', rows.length + '/' + HS.length);
  const outFr = rows.reduce((s, r) => s + r.pay.filter(q => top(q) < 0 || bot(q) > r.fh).length, 0);
  const totFr = rows.reduce((s, r) => s + r.pay.length, 0);
  ok(outFr === 0, '[1-a] 프레임 밖(상·하) 알 0건 — **등재문 ⓐ 기각**', outFr + '/' + totFr);
  const mL = rows.length ? Math.min(...rows.map(r => Math.min(...r.pay.map(lft)))) : 0;
  const mR = rows.length ? Math.max(...rows.map(r => Math.max(...r.pay.map(rgt)))) : 0;
  ok(mL >= 0 && mR <= 1080, '[1-b] 프레임 밖(좌·우) 알 0건 — 짝 항',
     'x ' + mL.toFixed(1) + '..' + mR.toFixed(1));

  /* ── [2] 크롭 — 종전 손 상수 클립 ── */
  blk('[2] 크롭 — 종전 `cap681` 클립(M=' + M_OLD + ')이 알을 자른다 (**여기가 «본 그림»**)');
  let cut = 0, cutFull = 0, totC = 0, worst = 0, reqM = 0;
  for (const r of rows) {
    if (!r.host) continue;
    const cy = Math.max(0, r.host.y - M_OLD);
    for (const q of r.pay) {
      totC++;
      /* 이 알을 담으려면 호스트 상변에서 몇 px 을 더 열어야 하는가 = «필요한 여유» */
      reqM = Math.max(reqM, r.host.y - top(q));
      if (top(q) < cy) { cut++; worst = Math.max(worst, cy - top(q)); }
      if (bot(q) <= cy) cutFull++;
    }
  }
  info('종전 크롭 위끝을 넘는 알', cut + '/' + totC + ' · 최대 초과 ' + worst.toFixed(0) + 'px'
     + ' · 크롭 밖 완전 소실 ' + cutFull);
  info('필요한 클립 여유', reqM.toFixed(0) + 'px (손 상수 ' + M_OLD + ' 의 '
     + (reqM / M_OLD).toFixed(2) + '배)');
  ok(cut > 0, '[2-a] 종전 클립은 알을 잘랐다 (등재문이 본 «y=0» 의 출처)', cut + '/' + totC);
  ok(reqM > M_OLD, '[2-b] 필요한 여유가 손 상수 ' + M_OLD + ' 를 넘는다 — 뿌리는 «손으로 적은 값»',
     reqM.toFixed(0) + 'px > ' + M_OLD);

  /* ── [3] 씬 A(훈련) 대조 ── */
  blk('[3] 씬 A(훈련) 대조 — 요소(bbox) 대상 (등재문 ⓑ · 이유는 프레임이 아니라 619 가둠)');
  const p3 = await browser.newPage({ viewport: { width: 1080, height: 2280 } });
  p3.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  p3.on('console', m => { if (m.type() === 'error') errs.push(m.text().split('\n')[0]); });
  await p3.goto(URL, { waitUntil: 'load' });
  await p3.waitForTimeout(900);
  const rA = await ev(p3, RUN, { sel: '#trCards [data-tr] .cb', open: 'openTrain()', n: 6 });
  await p3.close();
  ok(!!rA && !rA.err && rA.born.length > 0, '[3-pre] 훈련 카드 버스트 표본',
     rA ? (rA.err || rA.born.length + '알') : '실패');
  if (rA && rA.born.length && rA.host) {
    const eOut = rA.born.filter(q => top(q) < 0 || bot(q) > rA.frameH).length;
    ok(eOut === 0, '[3-a] 프레임 밖 알 0건', eOut + '/' + rA.born.length);
    const cy = Math.max(0, rA.host.y - M_OLD);
    const cx1 = Math.max(0, rA.host.x - M_OLD);
    const eCut = rA.born.filter(q => top(q) < cy || lft(q) < cx1).length;
    ok(eCut === 0, '[3-b] 종전 크롭(M=' + M_OLD + ')에서도 0건 — 619 가둠이 알을 카드 안에 묶는다',
       eCut + '/' + rA.born.length);
  }

  /* ── [4] 666 규약 ── */
  blk('[4] 666 규약 — 지불 알 발원 = 버튼 대역');
  let inB = 0, totB = 0;
  const RAD = 200;   /* 탄생 링 = 반경 FXB_RMIN(22) × 지터 1.18 · 여유 포함 */
  for (const r of rows) {
    if (!r.host) continue;
    const cx = r.host.x + r.host.w / 2, cy = r.host.y + r.host.h * 0.28;
    for (const q of r.pay) { totB++; if (Math.hypot(q.x - cx, q.y - cy) <= RAD) inB++; }
  }
  ok(totB > 0 && inB === totB, '[4-a] 지불 알 발원이 전부 버튼 대역 안', inB + '/' + totB);

  /* ── [5] 상향 원뿔 ── */
  blk('[5] 상향 원뿔이 살아 있다 (682 · 666 4회차)');
  let up = 0, upTot = 0;
  for (const r of rows) for (const q of r.pay) { upTot++; if (q.dy < 0) up++; }
  info('위로 나는 알', up + '/' + upTot);
  ok(upTot > 0 && up / upTot >= 0.8, '[5-a] 지불 알의 80% 이상이 위로 난다',
     (100 * up / Math.max(1, upTot)).toFixed(0) + '%');

  /* ── [6] 콘솔 ── */
  blk('[6] 콘솔');
  ok(errs.length === 0, '[6-a] 콘솔 에러 0건', errs.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\nPROBE817 ' + pass + '/' + (pass + fail) + (fail ? ' FAIL' : ' PASS'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
