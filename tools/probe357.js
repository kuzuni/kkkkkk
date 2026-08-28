/* 작업 357 재현 프로브 — «02 메인 스킬 슬롯 아이콘이 전부 오른쪽으로 밀림»
 *
 *   node tools/probe357.js
 *
 * 주인 원문: «메인에 스킬들 아이콘이 다 오른쪽에 밀려있더라 그거 중앙으로 잘 교정되게 하기»
 *
 * 이 파일은 «고쳤다» 를 재는 게이트가 아니라(그건 `tools/verify357.js`) **무엇이 얼마나
 * 어긋났는가를 눈으로 보는** 자리다. 338·341·350 규칙대로 등재문의 처방을 따르기 **전에** 재현한다.
 *
 * 등재문의 의심 셋을 각각 «잴 수 있는 축» 으로 갈라 놓고 전부 찍는다:
 *   ⓐ `#slots{padding-left:3px}` → **행 전체**가 앱 중심에서 몇 px 밀렸는가
 *   ⓑ 슬롯 안 부품 사슬(`.slot2` → `.cdw` → `.si3` advance 박스) 중심이 어디서 갈라지는가
 *   ⓒ **찍힌 픽셀의 잉크 중심** — advance 박스가 맞아도 글리프 side bearing 이 비대칭이면 밀린다
 *
 * ⚠ DOM 의 getBoundingClientRect 는 글리프 **advance 박스**라 «잉크» 가 아니다(A1·A4 가 밟은 함정).
 *    그래서 ⓒ 는 스크린샷을 data URL 로 페이지에 되돌려 **찍힌 픽셀**을 읽는다(350 처방).
 *    well 배경(#367cc1)·안쪽 노란 링(#fefe0c)·쿨다운 딤을 뺀 나머지가 아이콘 잉크다.
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
const blk = async (name, fn) => {
  console.log('\n── ' + name + ' ' + '─'.repeat(Math.max(0, 60 - name.length)));
  try { await fn(); } catch (e) { fail++; console.log('  FAIL 블록 예외 — ' + (e && e.message || e)); }
};

(async () => {
  const b = await launch(chromium);
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(SRC);
  await p.waitForTimeout(1200);

  /* 8칸 전부 «장착» 상태로 만든다 — 잠금칸(🔒)은 이 작업의 축이 아니다.
     쿨다운은 0 으로 눕혀 `.cdv` 딤이 잉크 측정을 오염시키지 않게 한다. */
  const setup = await p.evaluate(() => {
    try {
      gmCloseAll(); closeModal();
      Object.assign(S, DEF());
      S.stage = 120; S.best = 120;
      const ids = Object.keys(SK).slice(0, 8);
      S.eqSkill = ids.slice();
      for (const id of ids) { S.own[id] = S.own[id] || { n: 0, l: 1 }; skillCd[id] = 0; }
      if (panelOpen) { panelOpen = false; syncPanel(); }
      buildSlots(); drawSlots();
      uiDirty = true; renderUI(); drawHud();
      return { ids, open: skSlotMax() };
    } catch (e) { return { err: String(e) }; }
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => { try { document.querySelectorAll('#slots .cdv').forEach(e => e.style.height = '0%'); } catch (e) {} });
  await p.waitForTimeout(120);

  console.log('셋업:', JSON.stringify(setup));

  /* ── ⓐ 행 전체가 밀렸는가 ───────────────────────────────────────── */
  const geo = await p.evaluate(() => {
    const R = e => { const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(2), w: +r.width.toFixed(2), cx: +(r.x + r.width / 2).toFixed(2) }; };
    const app = document.getElementById('app'), slots = document.getElementById('slots');
    const cs = getComputedStyle(slots);
    const rows = [];
    slots.querySelectorAll('.slot2').forEach((s, i) => {
      const well = s.querySelector('.cdw'), ic = s.querySelector('.si3');
      rows.push({
        i, cls: s.className,
        slot: R(s), well: well ? R(well) : null, adv: ic ? R(ic) : null,
        ch: ic ? ic.textContent : null,
      });
    });
    return {
      app: R(app), slots: R(slots),
      padL: cs.paddingLeft, padR: cs.paddingRight, just: cs.justifyContent, gap: cs.gap,
      rows,
    };
  });

  await blk('ⓐ 행 전체 — `#slots` 의 padding-left 가 행을 미는가', async () => {
    console.log('  #app  x=' + geo.app.x + ' w=' + geo.app.w + ' 중심=' + geo.app.cx);
    console.log('  #slots x=' + geo.slots.x + ' w=' + geo.slots.w + ' 중심=' + geo.slots.cx
      + '  (padding-left=' + geo.padL + ' · padding-right=' + geo.padR + ' · ' + geo.just + ')');
    const first = geo.rows[0].slot, last = geo.rows[geo.rows.length - 1].slot;
    const rowCx = +((first.x + last.x + last.w) / 2).toFixed(2);
    const d = +(rowCx - geo.app.cx).toFixed(2);
    console.log('  칸 8개가 실제로 차지한 구간 중심 = ' + rowCx + '  → 앱 중심 대비 Δ = ' + (d >= 0 ? '+' : '') + d + 'px');
    /* ⚠ 이 +1.5px 는 **결함이 아니다.** `padding-left:3px` 은 A4 2차 라운드가 레퍼런스를 재서 박은 값이고
       (`docs/review/A4-스킬슬롯.md` — «REF 슬롯1 중심 86.34/86.36/86.4», 4→2.7→3 으로 두 번 조정),
       레퍼런스 자신이 앱 기하 중심에서 그만큼 오른쪽에 있다. 여기서 «중앙» 을 앱 중심으로 잡아 되돌리면
       `verifyA4` 가 빨개지고 주인이 못 박은 레퍼런스 일치가 깨진다 — 그래서 축은 **REF 슬롯1 중심**이다. */
    const s1 = +geo.rows[0].slot.cx.toFixed(2);
    console.log('  칸1 중심 = ' + s1 + '  (REF 실측 86.34~86.40 — A4 2차 라운드가 padding-left 로 맞춘 값)');
    ok(Math.abs(s1 - 86.37) <= 0.5, 'ⓐ 칸1 중심이 REF 86.34~86.40 과 ±0.5px 이내 (실측 ' + s1 + ')');
  });

  /* ── ⓑ 부품 사슬 — 어디서 중심이 갈라지는가 ─────────────────────── */
  await blk('ⓑ 부품 사슬 — .slot2 → .cdw → .si3(advance 박스) 중심', async () => {
    for (const r of geo.rows) {
      if (!r.well || !r.adv) { console.log('  칸 ' + r.i + ' — 아이콘 없음(' + r.cls + ')'); continue; }
      const dW = +(r.well.cx - r.slot.cx).toFixed(2);
      const dA = +(r.adv.cx - r.slot.cx).toFixed(2);
      console.log('  칸 ' + r.i + ' ' + r.ch + '  슬롯중심 ' + r.slot.cx
        + ' · well Δ' + (dW >= 0 ? '+' : '') + dW
        + ' · advance Δ' + (dA >= 0 ? '+' : '') + dA + '  (advance w=' + r.adv.w + ')');
    }
    const worst = Math.max(...geo.rows.filter(r => r.adv).map(r => Math.abs(r.adv.cx - r.slot.cx)));
    ok(worst <= 0.5, 'ⓑ advance 박스 중심이 슬롯 중심과 ±0.5px 이내 (최악 ' + worst.toFixed(2) + ')');
  });

  /* ── ⓒ 찍힌 픽셀의 잉크 중심 ─────────────────────────────────────
     ⚠ 1회차에 «well 배경색에서 먼 픽셀 = 잉크» 로 쟀다가 **측정창 자체를 쟀다** —
        잉크(68×85)가 창(Ø69.6)보다 커서 8칸 전부 «70×70» 이 나왔다.
     ⇒ **차분 이미지**로 바꾼다: `.si3` 를 숨긴 화면과 보인 화면을 같은 자리에서 찍어
        **달라진 픽셀** 만 모으면 그것이 정확히 «그 글리프가 칠한 자리»(well 의 원형 클립까지 반영)다. */
  const rowMeta = await p.evaluate(() => {
    const R = e => { const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(2), w: +r.width.toFixed(2), cx: +(r.x + r.width / 2).toFixed(2) }; };
    const out = [];
    document.querySelectorAll('#slots .slot2').forEach((s, i) => {
      const well = s.querySelector('.cdw'), ic = s.querySelector('.si3');
      if (!well || !ic) return;
      const wr = well.getBoundingClientRect();
      out.push({ i, ch: ic.textContent, slot: R(s), well: R(well), wellCy: +(wr.y + wr.height / 2).toFixed(2), wellW: +wr.width.toFixed(2) });
    });
    return out;
  });

  /* ⚠ 2회차 사고 — 두 장 사이에 **전투 캔버스가 계속 움직여** 차분이 창 전체를 덮었다(잉크 128×104).
     차분법은 «두 장이 아이콘 말고는 같다» 를 전제로 하므로 **프레임을 세운다**:
     메인 루프가 스스로 `requestAnimationFrame(loop)` 로 재예약하는 구조라 rAF 를 눕히면 화면이 언다.
     그리고 창은 **well 안쪽**으로 자른다 — `.cdw{overflow:hidden}` 이라 잉크는 절대 well 을 못 넘는다. */
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await p.waitForTimeout(250);

  /* ⚠ 3회차 사고 — 프레임은 얼었는데(대조군 0px 확인) 잉크 bbox 가 8칸 전부 «well 폭» 으로 나왔다.
     `.cdw{overflow:hidden}` 이 글리프를 **원으로 잘라서** bbox 가 well 에 물린 것이다.
     클립은 well 중심에 대칭이라 «아이콘이 어디에 있나» 는 **자르기 전 잉크**로 재야 한다
     → 측정 동안만 `overflow:visible`. 제품 CSS 는 한 글자도 안 건드린다(343 §R 처방). */
  /* ⚠ 4회차 사고 — rAF 를 눕혀도 **CSS 전이·60 쥬시 팝**은 계속 산다(그건 setTimeout·transition 이다).
     스킬이 하나 터진 칸 언저리만 두 장 사이에 달라져 칸 4·5·6 잉크가 «112·122·111» 로 부풀었다.
     ⇒ ① 전이·애니메이션을 눕히고 ② **대조군 한 장을 더 찍어** «아이콘 말고는 같다» 를 매 실행 검산한다.
        대조군이 더러우면 그 칸은 «측정 불가» 로 빨개진다 — 조용히 틀린 숫자를 내놓지 않는다. */
  await p.addStyleTag({ content: '#app *{transition:none!important;animation:none!important}' });
  await p.addStyleTag({ content: '#slots .cdw{overflow:visible!important}' });
  await p.waitForTimeout(200);
  const shotOn = await p.screenshot({ type: 'png' });
  const shotCtl = await p.screenshot({ type: 'png' });
  await p.addStyleTag({ content: '#slots .si3{visibility:hidden!important}' });
  await p.waitForTimeout(150);
  const shotOff = await p.screenshot({ type: 'png' });

  const ink = await p.evaluate(async (arg) => {
    const { on, off, ctl, rows } = arg;
    try {
      const load = async url => { const im = new Image(); await new Promise((r, j) => { im.onload = r; im.onerror = j; im.src = url; }); return im; };
      const a = await load(on), b2 = await load(off), c2 = await load(ctl);
      const mk = im => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0); return cv.getContext('2d'); };
      const ga = mk(a), gb = mk(b2), gc = mk(c2);
      const out = [];
      for (const r of rows) {
        /* 창 — 가로 ±60(칸 pitch 130 의 절반보다 좁게 = 이웃 글리프 불침범),
           세로 ±48(최대 잉크 91 의 절반 45.5 보다 넉넉, `.lvv2` 레벨 뱃지는 제외).
           창이 잉크보다 작으면 **창을 재게 된다**(1회차 사고) — 두 축 다 잉크보다 크게 잡았다. */
        const cx = r.slot.cx, cy = r.wellCy, RX = 60, RY = 48;
        const x0 = Math.max(0, Math.floor(cx - RX)), x1 = Math.ceil(cx + RX);
        const y0 = Math.max(0, Math.floor(cy - RY)), y1 = Math.ceil(cy + RY);
        const W = x1 - x0 + 1, H = y1 - y0 + 1;
        const da = ga.getImageData(x0, y0, W, H).data;
        const db = gb.getImageData(x0, y0, W, H).data;
        const dc = gc.getImageData(x0, y0, W, H).data;
        let sx = 0, sw = 0, ix0 = 1e9, ix1 = -1, iy0 = 1e9, iy1 = -1, n = 0, drift = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const o = (y * W + x) * 4;
          /* 대조군(같은 상태 두 장) — 여기서 달라진 픽셀은 아이콘이 아니라 «움직이는 것» 이다 */
          if (Math.abs(da[o] - dc[o]) + Math.abs(da[o + 1] - dc[o + 1]) + Math.abs(da[o + 2] - dc[o + 2]) >= 24) drift++;
          const dr = da[o] - db[o], dg = da[o + 1] - db[o + 1], dbb = da[o + 2] - db[o + 2];
          const diff = Math.abs(dr) + Math.abs(dg) + Math.abs(dbb);
          if (diff < 24) continue;                       // 안티에일리어싱 잡음 컷
          const gx = x + x0;
          sx += gx * diff; sw += diff; n++;              // 변화량 가중 무게중심
          if (gx < ix0) ix0 = gx; if (gx > ix1) ix1 = gx;
          if (y + y0 < iy0) iy0 = y + y0; if (y + y0 > iy1) iy1 = y + y0;
        }
        out.push(n ? {
          i: r.i, ch: r.ch, n,
          cxInk: +(sx / sw).toFixed(2),
          bboxCx: +((ix0 + ix1) / 2).toFixed(2),
          w: ix1 - ix0 + 1, h: iy1 - iy0 + 1,
          box: [ix0, ix1, iy0, iy1], drift,
          slotCx: r.slot.cx, wellCx: r.well.cx,
        } : { i: r.i, ch: r.ch, n: 0, drift });
      }
      return { out };
    } catch (e) { return { err: String(e) }; }
  }, {
    on: 'data:image/png;base64,' + shotOn.toString('base64'),
    off: 'data:image/png;base64,' + shotOff.toString('base64'),
    ctl: 'data:image/png;base64,' + shotCtl.toString('base64'),
    rows: rowMeta,
  });

  await blk('ⓒ 찍힌 픽셀 — 아이콘 잉크 중심 vs 슬롯 기하 중심', async () => {
    if (ink.err) { ok(false, 'ⓒ 픽셀 판독 예외 — ' + ink.err); return; }
    let worst = 0, worstCh = '', dirty = 0;
    const ds = [];
    for (const r of ink.out) {
      if (r.drift) { dirty++; console.log('  칸 ' + r.i + ' ' + r.ch + ' — ⚠ 대조군 오염 ' + r.drift + 'px (움직이는 것이 창에 들어왔다 — 이 칸은 못 잰다)'); }
      if (!r.n) { console.log('  칸 ' + r.i + ' ' + r.ch + ' — 잉크 0px (판독 실패)'); continue; }
      const dC = +(r.cxInk - r.slotCx).toFixed(2);
      const dB = +(r.bboxCx - r.slotCx).toFixed(2);
      ds.push(dB);
      if (Math.abs(dB) > worst) { worst = Math.abs(dB); worstCh = r.ch; }
      console.log('  칸 ' + r.i + ' ' + r.ch + '  잉크 ' + r.w + '×' + r.h
        + ' · bbox[x' + r.box[0] + '..' + r.box[1] + ' y' + r.box[2] + '..' + r.box[3] + ']'
        + ' · bbox중심 Δ' + (dB >= 0 ? '+' : '') + dB
        + ' · 무게중심 Δ' + (dC >= 0 ? '+' : '') + dC + 'px');
    }
    const avg = ds.length ? +(ds.reduce((a, c) => a + c, 0) / ds.length).toFixed(2) : 0;
    console.log('  ── 8칸 평균 bbox 중심 Δ = ' + (avg >= 0 ? '+' : '') + avg + 'px · 최악 ' + worst.toFixed(2) + 'px (' + worstCh + ')');
    ok(dirty === 0, 'ⓒ 대조군 — 같은 상태 두 장이 8칸 전부 동일(오염 칸 ' + dirty + ')');
    ok(Math.abs(avg) <= 1, 'ⓒ 잉크 중심 평균이 슬롯 중심 ±1px 이내 (평균 ' + avg + ')');
    /* 칸별 상한이 ±2 인 이유는 ⓓ 가 못 박는다 — 남는 것은 **글리프 자신의 side bearing**(🪨 −1.68px)이고
       폰트를 뺀 «배치» 잔차는 ≤0.5px 다. 칸마다 손으로 밀어 되돌리는 것은 357 지시가 금지한 «비균등 보정». */
    ok(worst <= 2, 'ⓒ 잉크 중심 최악값이 슬롯 중심 ±2px 이내 (최악 ' + worst.toFixed(2) + ' — 폰트 bearing 포함)');
  });

  /* ── ⓓ 남은 ±1.5px 이 «우리 배치» 인가 «폰트» 인가 ─────────────────
     수리 뒤에도 칸마다 0 ~ −1.5px 이 남는다. 이것이 레이아웃 잔차라면 더 고쳐야 하고,
     글리프 자신의 side bearing 비대칭이라면 **CSS 로 회수할 자리가 아니다**(칸마다 다른 값을
     손으로 밀어 넣는 것은 357 지시가 금지한 «비균등 보정» 이다).
     ⇒ 같은 규격으로 오프스크린에 그려 **펜 중심 대비 잉크 중심**을 잰다(inkA4 와 같은 자).
        캔버스 `textAlign:'center'` 는 advance 를 펜에 정확히 맞추므로, 남는 dx = 순수 bearing 비대칭이다. */
  const bearing = await p.evaluate((chars) => {
    try {
      const probe = document.createElement('span'); probe.className = 'si3';
      const host = document.createElement('div'); host.className = 'slot2';
      host.style.cssText = 'position:absolute;left:-9999px';
      const well = document.createElement('div'); well.className = 'cdw';
      well.appendChild(probe); host.appendChild(well); document.body.appendChild(host);
      const cs = getComputedStyle(probe);
      const fs = parseFloat(cs.fontSize), fam = cs.fontFamily;
      let sx = 1; const m = (cs.transform || '').match(/matrix\(([^,]+)/); if (m) sx = parseFloat(m[1]);
      document.body.removeChild(host);
      const SZ = 300, cv = document.createElement('canvas'); cv.width = SZ; cv.height = SZ;
      const g = cv.getContext('2d');
      const out = [];
      for (const ch of chars) {
        g.clearRect(0, 0, SZ, SZ);
        g.font = fs + 'px ' + fam; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(ch, SZ / 2, SZ / 2);
        const d = g.getImageData(0, 0, SZ, SZ).data;
        let x0 = 1e9, x1 = -1;
        for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) {
          if (d[(y * SZ + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
        }
        out.push({ ch, dxRaw: x1 < 0 ? null : +(((x0 + x1) / 2) - SZ / 2).toFixed(2), sx });
      }
      return { out, sx };
    } catch (e) { return { err: String(e) }; }
  }, rowMeta.map(r => r.ch));

  await blk('ⓓ 남은 잔차의 정체 — 글리프 side bearing (오프스크린 독립 측정)', async () => {
    if (bearing.err) { ok(false, 'ⓓ 예외 — ' + bearing.err); return; }
    let worst = 0;
    for (let i = 0; i < bearing.out.length; i++) {
      const bp = bearing.out[i], pg = ink.out[i];
      if (!bp || bp.dxRaw === null || !pg || !pg.n) continue;
      const expect = +(bp.dxRaw * bearing.sx).toFixed(2);       // 화면 px 로 환산
      const actual = +(pg.bboxCx - pg.slotCx).toFixed(2);
      const resid = +(actual - expect).toFixed(2);
      if (Math.abs(resid) > worst) worst = Math.abs(resid);
      console.log('  칸 ' + i + ' ' + bp.ch + '  폰트 bearing 예상 Δ' + (expect >= 0 ? '+' : '') + expect
        + ' · 화면 실측 Δ' + (actual >= 0 ? '+' : '') + actual
        + ' → 설명 안 되는 잔차 ' + (resid >= 0 ? '+' : '') + resid + 'px');
    }
    console.log('  ── 배치가 만든 잔차(폰트를 뺀 뒤) 최악 = ' + worst.toFixed(2) + 'px');
    ok(worst <= 1, 'ⓓ 폰트 bearing 을 뺀 «배치» 잔차가 ±1px 이내 (최악 ' + worst.toFixed(2) + ')');
  });

  await b.close();
  console.log('\n콘솔 에러: ' + (errs.length ? errs.join(' | ') : 0));
  console.log('PROBE357 ' + pass + '/' + (pass + fail) + (fail ? ' — FAIL ' + fail : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
