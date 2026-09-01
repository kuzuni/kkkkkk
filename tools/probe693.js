#!/usr/bin/env node
/* 작업 693 — `verify491` [R-c] 플레이키의 뿌리 가르기 (344 선례)
 *
 *   node tools/probe693.js [반복수]
 *
 * 등재문(693)은 «[6-f] 가 간헐적이다(68/72 ↔ 69/72)» 로 적었지만, 실측은 [6-f] 가 **예외 없이**
 * 빨갛고(폐지된 부품을 센다 — review 693 §1) 흔들리는 항은 **[R-c]** 임을 가렸다.
 * 이 프로브는 그 [R-c] 가 «무엇 때문에» 흔들리는지를 §R 과 **같은 사본·같은 코드**로 되풀이해 잰다.
 *
 * 가설 ⓐ 룬 강화는 **확률**이라(`runeTry`) 성공한 실행에서만 카드 숫자가 갈리고,
 *        되돌림 사본은 «누른 노드가 죽는» 사본이라 그 갈림이 그대로 버튼 상자 픽셀이 된다.
 * 가설 ⓑ 619 이펙트가 가림(`#fxl{visibility:hidden}`)을 새는 자리가 있다.
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const NEG = path.join(ROOT, `.p693-neg-${process.pid}.html`);
const N = Math.max(1, parseInt(process.argv[2] || '8', 10));

const src = fs.readFileSync(SRC, 'utf8');
/* verify491 §R 과 **글자 그대로 같은** 되돌림(옛 순서 + 4회차 가드 제거) */
const revert0 = src.replace(
  /  rtHold = \{ tag:o\.tag[\s\S]*?rtHold\.timer = setTimeout\(rtHoldTick, TR_HOLD_DELAY\);/,
  `  if(!o.once()){ o.end(0, false); rtShake(o.sel); return; }
  o.live();
  rtHold = { tag:o.tag, sel:o.sel, once:o.once, live:o.live, end:o.end, n:1, iv:TR_HOLD_IV0, timer:0 };
  rtHold.timer = setTimeout(rtHoldTick, TR_HOLD_DELAY);`);
const revert = revert0
  .replace("if(rtHoldOn('temper') || rtDownIn('#trTemper')){ liveTemper(); rtPendRender = 1; return; }",
           "if(rtHoldOn('temper')){ liveTemper(); return; }")
  .replace("if(rtHoldOn('rune') || rtDownIn('#trRunes')){ liveRunes(curId); rtPendRender = 1; return; }",
           "if(rtHoldOn('rune')){ liveRunes(curId); return; }");

async function diffPct(page, a, b) {
  return await page.evaluate(async ([da, db]) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const ia = await load(da), ib = await load(db);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    if (!w || !h) return 0;
    const px = im => { const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      return x.getImageData(0, 0, w, h).data; };
    const A = px(ia), B = px(ib);
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < A.length; i += 4)
      if (Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i+1] - B[i+1]), Math.abs(A[i+2] - B[i+2])) > 12) {
        n++; const q = i / 4, X = q % w, Y = (q / w) | 0;
        if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
      }
    let dR = 0, dG = 0, dB = 0, m = 0;
    for (let i = 0; i < A.length; i += 4) {
      dR += B[i] - A[i]; dG += B[i+1] - A[i+1]; dB += B[i+2] - A[i+2]; m++;
    }
    const at = (X, Y) => { const i = (Y * w + X) * 4; return [A[i], A[i+1], A[i+2]] + ' → ' + [B[i], B[i+1], B[i+2]]; };
    return { pct: n / (w * h) * 100, box: n ? [x0, y0, x1, y1] : null, w, h,
             d: [dR / m, dG / m, dB / m].map(v => Math.round(v * 10) / 10),
             s1: at(10, 10), s2: at((w / 2) | 0, 8), s3: at((w / 2) | 0, (h / 2) | 0) };
  }, [a.toString('base64'), b.toString('base64')]);
}

(async () => {
  fs.writeFileSync(NEG, revert);
  const browser = await launch(chromium);
  const rows = [];
  try {
    for (let i = 0; i < N; i++) {
      const ctx = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto('file://' + NEG);
      await page.waitForFunction(() => typeof S !== 'undefined' && typeof openTrain === 'function');
      await page.waitForTimeout(700);
      await page.evaluate(() => {
        const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
        S.gold = 1e18; S.dia = 1e9; S.rstone = 1e6; S.tstone = 1e6; openTrain();
      });
      await page.waitForTimeout(500);
      /* verify491 pixelRun 과 같은 가림 */
      await page.evaluate(() => {
        const st = document.createElement('style'); st.id = 'p693mask';
        st.textContent = '#fxl{visibility:hidden!important}.fx-holding{outline:0!important}';
        document.head.appendChild(st);
        setTrSub('rune'); if (typeof setRuneSub === 'function') setRuneSub('r1'); renderTrain();
      });
      await page.waitForTimeout(420);
      const g = await page.evaluate(() => {
        const e = document.querySelector('#trRunes .rbt.b1'); if (!e) return null;
        const b = e.getBoundingClientRect();
        const card = e.closest('.tr-rn');
        const id = card && card.dataset ? card.dataset.rune : null;
        return { x: b.x, y: b.y, w: b.width, h: b.height, id, lv: id ? runeLvOf(id) : null,
                 txt: (card ? card.innerText : '').replace(/\s+/g, ' ').slice(0, 90) };
      });
      const clip = { x: Math.max(0, g.x - 4), y: Math.max(0, g.y - 4), width: g.w + 8, height: g.h + 8 };
      const before = await page.screenshot({ clip });
      await page.mouse.move(g.x + g.w / 2, g.y + g.h / 2);
      await page.mouse.down();
      await page.waitForTimeout(60);
      const st = await page.evaluate(() => {
        const e = document.querySelector('#trRunes .rbt.b1');
        const card = e && e.closest('.tr-rn');
        const cs = e ? getComputedStyle(e) : null, cc = card ? getComputedStyle(card) : null;
        const b = e ? e.getBoundingClientRect() : null;
        return { btf: cs ? cs.transform : null, bsc: cs ? cs.scale : null,
                 ctf: cc ? cc.transform : null, ccls: card ? card.className : null,
                 bx: b ? Math.round(b.x * 100) / 100 : null, by: b ? Math.round(b.y * 100) / 100 : null,
                 bw: b ? Math.round(b.width * 100) / 100 : null };
      });
      const down = await page.screenshot({ clip });
      const after = await page.evaluate(id => ({ lv: runeLvOf(id),
        txt: (document.querySelector('#trRunes .tr-rn[data-rune="' + CSS.escape(id) + '"]') || { innerText: '' })
               .innerText.replace(/\s+/g, ' ').slice(0, 90) }), g.id);
      await page.mouse.up();
      const dd = await diffPct(page, before, down); const px = dd.pct;
      rows.push({ px: Math.round(px * 100) / 100, up: after.lv !== g.lv,
                  lv: g.lv + '→' + after.lv, same: after.txt === g.txt, st, dd,
                  dx: st.bx === null ? null : Math.round((st.bx - g.x) * 100) / 100,
                  dw: st.bw === null ? null : Math.round((st.bw - g.w) * 100) / 100 });
      await ctx.close();
    }
  } finally {
    try { fs.unlinkSync(NEG); } catch (_) {}
  }
  await browser.close();

  console.log('\n[693] 되돌림 사본 · 룬 [강화] «누른 채» 픽셀 ' + N + '회');
  console.log('  #  px%      레벨      글자동일  판정');
  rows.forEach((r, i) => console.log('  ' + String(i + 1).padStart(2) + ' ' + String(r.px).padStart(6)
    + '   ' + r.lv.padEnd(8) + '  ' + (r.same ? 'Y' : 'N') + '        ' + (r.px < 8 ? 'R-c 초록' : 'R-c 빨강')
    + '   Δx=' + String(r.dx).padStart(7) + ' Δw=' + String(r.dw).padStart(7)
    + ' bbox=' + JSON.stringify(r.dd.box) + ' 평균Δrgb=' + JSON.stringify(r.dd.d)
    + '\n         모서리 ' + r.dd.s1 + ' | 상변 ' + r.dd.s2 + ' | 한복판 ' + r.dd.s3));
  const up = rows.filter(r => r.up), no = rows.filter(r => !r.up);
  const avg = a => a.length ? Math.round(a.reduce((s, r) => s + r.px, 0) / a.length * 100) / 100 : '—';
  console.log('\n  성공(레벨 오름) ' + up.length + '회 — px 평균 ' + avg(up) + ' · 최대 ' + (up.length ? Math.max(...up.map(r => r.px)) : '—'));
  console.log('  실패(레벨 그대로) ' + no.length + '회 — px 평균 ' + avg(no) + ' · 최대 ' + (no.length ? Math.max(...no.map(r => r.px)) : '—'));
  const red = rows.filter(r => r.px >= 8);
  console.log('  [R-c] 빨강 ' + red.length + '/' + N + ' — 그중 «레벨 오름» ' + red.filter(r => r.up).length + '건');
  console.log(red.length && red.every(r => r.up)
    ? '\n  ⇒ 가설 ⓐ 확정 — 빨간 실행은 예외 없이 «룬 강화가 성공한» 실행이다(확률 축).'
    : (red.length ? '\n  ⇒ 가설 ⓐ 미확정 — 레벨이 안 오른 실행도 빨갛다(가림 누수 = ⓑ 를 볼 것).'
                  : '\n  ⇒ 이번 표본에서는 빨강 0건 — 반복수를 늘려라.'));
})().catch(e => { console.error(e); try { fs.unlinkSync(NEG); } catch (_) {} process.exit(1); });
