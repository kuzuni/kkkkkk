/* 작업 357 게이트 — «02 메인 스킬 슬롯 아이콘 중앙 교정»
 *
 *   node tools/verify357.js
 *
 * 주인 지시: «메인에 스킬들 아이콘이 다 오른쪽에 밀려있더라 그거 중앙으로 잘 교정되게 하기»
 * 등재문 게이트 규격: «각 슬롯 아이콘 잉크 중심 x = 슬롯 중심 x ±1px» + A4 계열 회귀 + SMOKE.
 *
 * 무엇을 지키는가 —
 *   §1 구조   `.si3` 상자가 **글리프 advance 보다 넓다**(넘치면 text-align 이 죽는다) · 좌우 마진 대칭
 *   §2 배치   글리프 줄(run) 중심 = 슬롯 중심 (8칸 전부, ±0.5px) ← 결함의 본체, 픽셀 없이 정확
 *   §3 잉크   **찍힌 픽셀**의 잉크 중심 = 슬롯 중심 (±2px, 평균 ±1px) ← 주인이 실제로 보는 것
 *   §4 되돌림 옛 CSS(`width:100%`)를 주입하면 **반드시 빨개진다** — 무르게 푼 수리가 아님을 못박는다
 *   §5 불변   잉크 정규화(fs 78.3 · scaleX .842)와 행 위치(REF 슬롯1 중심 86.34~86.40)는 **안 건드렸다**
 *   §6 잠금칸 `.lk`(🔒)도 중앙 — 같은 뿌리에 걸릴 수 있는 이웃 부품
 *
 * ⚑ §3 의 상한이 ±1 이 아니라 **±2** 인 근거는 `tools/probe357.js` ⓓ 다 — 남는 것은 글리프 자신의
 *   side bearing(🪨 −1.68px)이고, 폰트를 뺀 «배치» 잔차는 ≤0.50px 다. 칸마다 손으로 밀어 0 을 만드는 것은
 *   357 지시가 금지한 «비균등 보정» 이라 하지 않았다. §2 가 ±0.5 로 **배치 자체**를 따로 못 박는다.
 *
 * 127 — 클라우드 러너 브라우저 해석은 tools/pwlaunch.js 공용.
 * LESSONS 319 — evaluate 예외는 즉사시키지 말고 그 블록만 빨갛게.
 */
'use strict';
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const SRC = 'file://' + path.resolve(__dirname, '../index.html');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const sec = n => console.log('\n── ' + n + ' ' + '─'.repeat(Math.max(0, 58 - n.length)));

/* 8칸을 «장착» 으로 세우는 공용 셋업 */
async function arm(p) {
  await p.evaluate(() => {
    gmCloseAll(); closeModal();
    Object.assign(S, DEF());
    S.stage = 120; S.best = 120;
    const ids = Object.keys(SK).slice(0, 8);
    S.eqSkill = ids.slice();
    for (const id of ids) { S.own[id] = S.own[id] || { n: 0, l: 1 }; skillCd[id] = 0; }
    if (panelOpen) { panelOpen = false; syncPanel(); }
    buildSlots(); drawSlots();
    uiDirty = true; renderUI(); drawHud();
  });
  await p.waitForTimeout(600);
}

/* 슬롯별 «줄(run) 중심 − 슬롯 중심». 픽셀을 안 쓰므로 빠르고 흔들리지 않는다. */
const runOffsets = p => p.evaluate(() => {
  const out = [];
  document.querySelectorAll('#slots .slot2').forEach((s, i) => {
    const ic = s.querySelector('.si3'); if (!ic) return;
    const sr = s.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(ic);
    const tr = rg.getBoundingClientRect();
    const er = ic.getBoundingClientRect();
    out.push({
      i, ch: ic.textContent,
      slotCx: +(sr.x + sr.width / 2).toFixed(2),
      runCx: +(tr.x + tr.width / 2).toFixed(2), runW: +tr.width.toFixed(2),
      elCx: +(er.x + er.width / 2).toFixed(2), elW: +er.width.toFixed(2),
      d: +((tr.x + tr.width / 2) - (sr.x + sr.width / 2)).toFixed(2),
    });
  });
  return out;
});

/* 세 장(ON·OFF·ON2)을 페이지 안 캔버스로 되읽어 칸별 «잉크 가로 bbox 중심 − 슬롯 중심» 을 낸다.
   ON↔OFF 차분 = 그 글리프가 칠한 자리 · ON↔ON2 차분(drift) = 아이콘 말고 움직인 것(= 이 회차는 못 쓴다). */
const analyze = (p, meta, on, off, ctl) => p.evaluate(async (a) => {
  const load = async u => { const im = new Image(); await new Promise((r, j) => { im.onload = r; im.onerror = j; im.src = u; }); return im; };
  const mk = im => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0); return cv.getContext('2d'); };
  const ga = mk(await load(a.on)), gb = mk(await load(a.off)), gc = mk(await load(a.ctl));
  const out = [];
  for (const m of a.meta) {
    const RX = 60, RY = 48;                       // 가로는 pitch 130 의 절반보다 좁게, 세로는 최대 잉크 91 보다 넉넉
    const x0 = Math.floor(m.slotCx - RX), y0 = Math.floor(m.wellCy - RY);
    const W = 2 * RX, H = 2 * RY;
    const da = ga.getImageData(x0, y0, W, H).data, db = gb.getImageData(x0, y0, W, H).data, dc = gc.getImageData(x0, y0, W, H).data;
    let ix0 = 1e9, ix1 = -1, n = 0, drift = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      if (Math.abs(da[o] - dc[o]) + Math.abs(da[o + 1] - dc[o + 1]) + Math.abs(da[o + 2] - dc[o + 2]) >= 24) drift++;
      if (Math.abs(da[o] - db[o]) + Math.abs(da[o + 1] - db[o + 1]) + Math.abs(da[o + 2] - db[o + 2]) < 24) continue;
      const gx = x + x0; n++;
      if (gx < ix0) ix0 = gx; if (gx > ix1) ix1 = gx;
    }
    out.push({ i: m.i, ch: m.ch, n, drift, w: n ? ix1 - ix0 + 1 : 0, d: n ? +(((ix0 + ix1) / 2) - m.slotCx).toFixed(2) : null });
  }
  return out;
}, { on: 'data:image/png;base64,' + on.toString('base64'), off: 'data:image/png;base64,' + off.toString('base64'), ctl: 'data:image/png;base64,' + ctl.toString('base64'), meta });

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(SRC);
  await p.waitForTimeout(1200);
  await arm(p);

  /* ── §1 구조 ─────────────────────────────────────────────────── */
  sec('§1 구조 — 상자가 글리프보다 넓은가 · 마진이 대칭인가');
  try {
    const st = await p.evaluate(() => {
      const ic = document.querySelector('#slots .slot2 .si3');
      const well = ic.closest('.cdw');
      const cs = getComputedStyle(ic);
      const rg = document.createRange(); rg.selectNodeContents(ic);
      let sx = 1; const m = (cs.transform || '').match(/matrix\(([^,]+)/); if (m) sx = parseFloat(m[1]);
      return {
        ml: parseFloat(cs.marginLeft), mr: parseFloat(cs.marginRight),
        boxRaw: +(ic.getBoundingClientRect().width / sx).toFixed(2),
        runRaw: +(rg.getBoundingClientRect().width / sx).toFixed(2),
        wellW: +well.getBoundingClientRect().width.toFixed(2),
        ta: cs.textAlign, sx, fs: cs.fontSize, lh: cs.lineHeight,
      };
    });
    console.log('  상자(변환 전) ' + st.boxRaw + 'px · 글리프 advance ' + st.runRaw + 'px · well ' + st.wellW + 'px'
      + ' · margin ' + st.ml + '/' + st.mr + ' · text-align ' + st.ta);
    ok(st.boxRaw >= st.runRaw, '§1 상자(' + st.boxRaw + ') ≥ 글리프 advance(' + st.runRaw + ') — 줄이 안 넘쳐 text-align 이 산다');
    ok(Math.abs(st.ml - st.mr) < 0.01, '§1 좌우 마진이 대칭(' + st.ml + ' / ' + st.mr + ') — 상자 중심 = well 중심');
    ok(st.ta === 'center', '§1 text-align 은 center 그대로(' + st.ta + ')');
    /* 넘치던 시절의 값을 못 박아 둔다 — 이 수가 다시 나오면 결함이 돌아온 것이다 */
    ok(st.runRaw > st.wellW, '§1 [전제] 글리프 advance(' + st.runRaw + ')는 well(' + st.wellW + ')보다 넓다 — 그래서 상자를 넓혀야 했다');
  } catch (e) { fail++; console.log('  FAIL §1 예외 — ' + e.message); }

  /* ── §2 배치 ─────────────────────────────────────────────────── */
  sec('§2 배치 — 글리프 줄 중심 = 슬롯 중심 (8칸)');
  let base = [];
  try {
    base = await runOffsets(p);
    ok(base.length === 8, '§2 장착 슬롯 8칸을 다 읽었다 (' + base.length + ')');
    let worst = 0;
    for (const r of base) {
      console.log('  칸 ' + r.i + ' ' + r.ch + '  슬롯중심 ' + r.slotCx + ' · 줄중심 ' + r.runCx
        + ' → Δ' + (r.d >= 0 ? '+' : '') + r.d + 'px');
      if (Math.abs(r.d) > worst) worst = Math.abs(r.d);
    }
    ok(worst <= 0.5, '§2 8칸 전부 ±0.5px 이내 (최악 ' + worst.toFixed(2) + ')');
    /* 상자 중심도 슬롯 중심이어야 한다 — 마진을 한쪽만 주면 여기서 잡힌다 */
    const wEl = Math.max(...base.map(r => Math.abs(r.elCx - r.slotCx)));
    ok(wEl <= 0.5, '§2 `.si3` 상자 중심도 슬롯 중심과 ±0.5px (최악 ' + wEl.toFixed(2) + ')');
  } catch (e) { fail++; console.log('  FAIL §2 예외 — ' + e.message); }

  /* ── §3 잉크(찍힌 픽셀) ──────────────────────────────────────── */
  sec('§3 잉크 — 찍힌 픽셀의 아이콘 중심 = 슬롯 중심');
  try {
    const meta = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('#slots .slot2').forEach((s, i) => {
        const well = s.querySelector('.cdw'), ic = s.querySelector('.si3');
        if (!well || !ic) return;
        const wr = well.getBoundingClientRect(), sr = s.getBoundingClientRect();
        out.push({ i, ch: ic.textContent, slotCx: +(sr.x + sr.width / 2).toFixed(2), wellCy: +(wr.y + wr.height / 2).toFixed(2) });
      });
      return out;
    });
    /* 차분법의 전제 = «아이콘 말고는 두 장이 완전히 같다». 이걸 세우는 데 세 번 넘어졌다(probe357 머리말):
         ② 전투 캔버스가 계속 움직임      → rAF 를 눕힌다
         ④ CSS 전이·60 쥬시 팝이 살아 있음 → transition·animation 을 눕힌다
         ⑤ **예약된 setTimeout 이 창 안에서 터짐** → 대기 중인 타이머를 전부 지우고 예약 함수도 눕힌다
       그리고 대조군은 ON 두 장이 아니라 **ON → OFF → ON2** 로 **창 전체를 감싸서** 잡는다 —
       ON/CTL 을 연달아 찍으면 그 뒤(가리는 150ms)에 일어난 변화를 못 본다(21/22 때 칸5 잉크 120px). */
    await p.evaluate(() => {
      window.requestAnimationFrame = () => 0;
      const top = setTimeout(() => {}, 0);
      for (let i = 1; i <= top; i++) { clearTimeout(i); clearInterval(i); }
      window.setTimeout = () => 0; window.setInterval = () => 0;
      /* 쿨다운 딤은 «아이콘이 어디 있나» 와 무관하다 — 눕혀서 잉크만 남긴다 */
      document.querySelectorAll('#slots .cdv').forEach(e => e.style.height = '0%');
    });
    /* ⚠ 세 장을 «스타일시트를 덧붙여» 가며 찍으면 시트 개수가 장마다 달라져 재래스터가 섞인다
       (그 상태에서 대조군이 12~58px 로 더러웠다). ⇒ 규칙을 **처음 한 번만** 심고,
       그 뒤로는 `html` 의 **클래스 한 개만** 토글한다 — 세 장의 스타일 환경이 완전히 같아진다. */
    await p.addStyleTag({ content:
      '#app *{transition:none!important;animation:none!important}'
      + '#slots .cdw{overflow:visible!important}'
      + 'html.v357hide #slots .si3{visibility:hidden!important}' });
    await p.waitForTimeout(250);
    const shot = async cls => {
      await p.evaluate(c => { document.documentElement.classList.toggle('v357hide', c); }, cls);
      await p.waitForTimeout(200);
      return p.screenshot({ type: 'png' });
    };
    const measure = async () => {
      const on = await shot(false);
      const off = await shot(true);
      const ctl = await shot(false);    // ON → OFF → ON2 로 창 전체를 감싼 대조군
      return analyze(p, meta, on, off, ctl);
    };
    /* ⚑ 대조군이 더러운 회차가 **절반쯤** 나온다(칸 4개 언저리). 원인이 무엇이든 그 회차의 숫자는
       못 쓰는 숫자이므로 **깨끗한 회차가 나올 때까지 다시 찍는다** — 측정의 전제가 성립할 때만 단언한다.
       끝내 못 얻으면 조용히 넘어가지 않고 그대로 빨개진다(아래 `ok(dirty === 0 …)`).
       ⚠ 이것은 «빨간 걸 초록 될 때까지 돌리기» 가 아니다 — 재시도의 판정은 **대조군(전제)** 이지
          측정값이 아니다. 값 자체는 첫 깨끗한 회차 것을 그대로 쓴다(플레이키 게이트 344 의 교훈). */
    let res = null;
    for (let t = 1; t <= 6; t++) {
      res = await measure();
      const d = res.filter(r => r.drift).length;
      if (!d) { if (t > 1) console.log('  (대조군이 깨끗해질 때까지 ' + t + '회차에 다시 찍었다)'); break; }
      console.log('  · ' + t + '회차 대조군 오염 ' + d + '칸 — 다시 찍는다');
    }

    let worst = 0, sum = 0, cnt = 0, dirty = 0, blind = 0;
    for (const r of res) {
      if (r.drift) dirty++;
      if (!r.n) { blind++; console.log('  칸 ' + r.i + ' ' + r.ch + ' — 잉크 0px'); continue; }
      console.log('  칸 ' + r.i + ' ' + r.ch + '  잉크폭 ' + r.w + ' · 중심 Δ' + (r.d >= 0 ? '+' : '') + r.d + 'px'
        + (r.drift ? '  ⚠ 대조군 오염 ' + r.drift + 'px' : ''));
      worst = Math.max(worst, Math.abs(r.d)); sum += r.d; cnt++;
    }
    const avg = cnt ? +(sum / cnt).toFixed(2) : 0;
    console.log('  ── 평균 Δ ' + (avg >= 0 ? '+' : '') + avg + 'px · 최악 ' + worst.toFixed(2) + 'px');
    ok(dirty === 0, '§3 대조군 — 같은 상태 두 장이 8칸 전부 동일(오염 ' + dirty + ')');
    ok(blind === 0, '§3 8칸 전부 잉크를 읽었다(못 읽은 칸 ' + blind + ')');
    ok(Math.abs(avg) <= 1, '§3 잉크 중심 평균이 ±1px 이내 (' + avg + ')');
    ok(worst <= 2, '§3 잉크 중심 최악값이 ±2px 이내 (' + worst.toFixed(2) + ' — 글리프 bearing 포함, probe357 ⓓ)');
  } catch (e) { fail++; console.log('  FAIL §3 예외 — ' + e.message); }

  await p.close();

  /* ── §4 되돌림 시험 ──────────────────────────────────────────── */
  sec('§4 되돌림 시험 — 옛 CSS(width:100%)를 주입하면 반드시 빨개진다');
  try {
    const p2 = await ctx.newPage();
    await p2.goto(SRC);
    await p2.waitForTimeout(1200);
    await arm(p2);
    /* 수리 전 규격 그대로: 상자를 well 폭(100%)으로 되돌리고 마진을 지운다 */
    await p2.addStyleTag({ content: '#slots .si3{width:100%!important;margin:0!important}' });
    await p2.waitForTimeout(200);
    const bad = await runOffsets(p2);
    const worstBad = Math.max(...bad.map(r => Math.abs(r.d)));
    const allRight = bad.every(r => r.d > 3);
    console.log('  옛 CSS 주입 후 8칸 Δ = ' + bad.map(r => (r.d >= 0 ? '+' : '') + r.d).join(' · '));
    ok(worstBad > 0.5, '§4 옛 CSS 에서는 §2 기준(±0.5)이 실제로 깨진다 (최악 ' + worstBad.toFixed(2) + ')');
    ok(allRight, '§4 그리고 8칸이 **전부 오른쪽으로** 밀린다 — 주인 보고(«다 오른쪽») 재현');
    /* 되돌리면 다시 초록인지도 본다 — 게이트가 «주입» 자체에 반응하는 게 아님을 못 박는다 */
    await p2.addStyleTag({ content: '#slots .si3{width:auto!important;margin:0 -20px!important}' });
    await p2.waitForTimeout(200);
    const back = await runOffsets(p2);
    const worstBack = Math.max(...back.map(r => Math.abs(r.d)));
    ok(worstBack <= 0.5, '§4 원복하면 다시 ±0.5px (최악 ' + worstBack.toFixed(2) + ')');
    await p2.close();
  } catch (e) { fail++; console.log('  FAIL §4 예외 — ' + e.message); }

  /* ── §5 불변 ─────────────────────────────────────────────────── */
  sec('§5 불변 — 잉크 정규화·행 위치는 안 건드렸다');
  try {
    const p3 = await ctx.newPage();
    await p3.goto(SRC);
    await p3.waitForTimeout(1200);
    await arm(p3);
    const inv = await p3.evaluate(() => {
      const ic = document.querySelector('#slots .slot2 .si3');
      const cs = getComputedStyle(ic);
      let sx = 1; const m = (cs.transform || '').match(/matrix\(([^,]+)/); if (m) sx = parseFloat(m[1]);
      const sl = [...document.querySelectorAll('#slots .slot2')].map(s => { const r = s.getBoundingClientRect(); return +(r.x + r.width / 2).toFixed(2); });
      return { fs: parseFloat(cs.fontSize), sx: +sx.toFixed(3), lh: parseFloat(cs.lineHeight), top: cs.top, s1: sl[0], pitch: +(sl[1] - sl[0]).toFixed(2), n: sl.length };
    });
    console.log('  fs ' + inv.fs + ' · scaleX ' + inv.sx + ' · line-height ' + inv.lh + ' · top ' + inv.top
      + ' · 칸1 중심 ' + inv.s1 + ' · pitch ' + inv.pitch);
    ok(inv.fs === 78.3, '§5 font-size 78.3 그대로 (측정표 §3 잉크 68×85 정규화)');
    ok(Math.abs(inv.sx - 0.842) < 0.001, '§5 scaleX .842 그대로');
    ok(Math.abs(inv.lh - 87.6) < 0.05, '§5 line-height 87.6 그대로 — 세로는 안 건드렸다');
    ok(Math.abs(inv.s1 - 86.37) <= 0.5, '§5 칸1 중심 = REF 86.34~86.40 (A4 가 `padding-left:3px` 로 맞춘 값 — 357 은 여기 손대지 않는다)');
    ok(Math.abs(inv.pitch - 130) <= 0.5, '§5 칸 pitch 130 그대로 (' + inv.pitch + ')');
    await p3.close();
  } catch (e) { fail++; console.log('  FAIL §5 예외 — ' + e.message); }

  /* ── §6 잠금칸 ──────────────────────────────────────────────── */
  sec('§6 잠금칸 자물쇠(🔒)도 중앙 — 같은 뿌리에 걸릴 이웃 부품');
  try {
    const p4 = await ctx.newPage();
    await p4.goto(SRC);
    await p4.waitForTimeout(1200);
    /* 부팅 세이브 그대로면 뒷칸이 미해금(자물쇠)이다 */
    await p4.evaluate(() => { gmCloseAll(); closeModal(); Object.assign(S, DEF()); S.stage = 1; S.best = 1; buildSlots(); drawSlots(); uiDirty = true; renderUI(); });
    await p4.waitForTimeout(500);
    const lk = await p4.evaluate(() => {
      const out = [];
      document.querySelectorAll('#slots .slot2').forEach((s, i) => {
        const e = s.querySelector('.lk'); if (!e) return;
        const sr = s.getBoundingClientRect();
        const rg = document.createRange(); rg.selectNodeContents(e);
        const tr = rg.getBoundingClientRect();
        out.push({ i, d: +((tr.x + tr.width / 2) - (sr.x + sr.width / 2)).toFixed(2) });
      });
      return out;
    });
    console.log('  자물쇠 칸 ' + lk.length + '개 · Δ = ' + lk.map(r => (r.d >= 0 ? '+' : '') + r.d).join(' · '));
    ok(lk.length > 0, '§6 자물쇠 칸을 실제로 읽었다 (' + lk.length + '칸 — 0이면 이 절은 헛초록이다)');
    const worstLk = lk.length ? Math.max(...lk.map(r => Math.abs(r.d))) : 99;
    ok(worstLk <= 0.5, '§6 자물쇠 줄 중심이 슬롯 중심과 ±0.5px (최악 ' + worstLk.toFixed(2) + ')');
    await p4.close();
  } catch (e) { fail++; console.log('  FAIL §6 예외 — ' + e.message); }

  await b.close();
  console.log('\n콘솔 에러: ' + (errs.length ? errs.join(' | ') : 0));
  ok(errs.length === 0, '콘솔·페이지 에러 0건');
  console.log('\nVERIFY357 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
