#!/usr/bin/env node
/* 477 검증 — 10 상점 «이용권» 탭 하단 안내문이 잘리지 않는다
 * (저장소 주인 보고 2026-08-30 «상점에 이용권부분 하단에 설명이 짤려있음»)
 *
 *   node tools/verify477.js   →  마지막 줄이 `VERIFY477 n/n PASS` 여야 한다.
 *
 * 결손(재현 `tools/probe477.js`): `.pv-bt`(x 111..969 · `nowrap`)에 이용권 3종의
 * 이름 + 다이아 아이콘 + 금액을 한 줄로 이어 붙여 잉크가 **1277.72px** 이 됐다 —
 * 상자를 419.72px, 프레임(1080)을 **308.72px** 넘어 오른쪽이 잘렸다.
 * ⚑ 등재문 정정: 왼쪽은 «잘린» 것이 아니라 넘친 줄이 좌측 정렬돼 상자 좌변에 붙은 것이다.
 *
 * 처방(등재문 ⓐ): 하단은 **총론 한 줄**만 두고, 각 카드의 대체가는 그 카드의
 * 가격 버튼 **밖**(바로 위) `.pvd` 로 옮긴다. 이용권이 늘어도 하단 줄은 안 늘어난다.
 *
 * 검사 항목:
 *   [A] 하단 안내문 — `.pv-bt` 전 노드의 **글자 잉크**가 상자 111..969 안(좌우 여백 ≥ 0).
 *       보유 없음 / 자동 축복 보유 두 상태 다(후자는 줄 수가 하나 늘고 문구가 바뀐다).
 *   [B] 찍힌 픽셀(350 처방) — 안내문 띠를 캡처해 페이지로 되돌려 흰 잉크의 실제 좌우 끝이
 *       프레임 안(테 6px 여유)인지. 클립 밖은 아예 안 찍히므로 «잘림» 이 픽셀로 잡힌다.
 *   [C] 서브탭과 안 겹친다 — 안내문 하변 ↔ `#shopw .stabs` 상변 ≥ 8px.
 *   [D] 카드별 대체가 — `.pvd` 가 이용권 수만큼 있고, 금액이 제품 상수(`PASS_ITEMS[].dia`)에서
 *       나오며, 잉크가 제 상자 안이고, **원화 버튼·리본·일러스트와 겹침 0**.
 *   [E] 늘어나도 안 잘린다(등재문 ②) — 이름을 가장 길게·금액을 9자리로 키워 다시 그려도
 *       ⓐ 하단 줄은 **폭이 그대로**(총론이라 파생이 없다) ⓑ `.pvd` 잉크가 제 상자 안.
 *   [F] 두 프레임(2280 · 1600) 다 — [A]~[D] 를 프레임마다 돈다.
 *   [R] 되돌림 시험 — 무르게 푼 수리가 아님을 못박는다:
 *       R1 옛 «3종 한 줄» 문자열을 도로 주입하면 [A] 의 자가 **빨개진다**
 *          (지금 초록인 것이 «자가 아무것도 안 보고 있어서» 가 아니다)
 *       R2 `.pvd` 를 지우면 [D] 의 자가 못 찾는다
 *       R3 `.pvd` 상자를 버튼 위로 내리면 [D] 의 겹침 탐지기가 실제로 잡는다
 *   [H] 콘솔·페이지 에러 0.
 */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const BOX = { x1: 111, x2: 969 };      /* `.pv-bt` 상자 — CSS left 111 / width 858 */
const STROKE = 6;                       /* `-webkit-text-stroke` — 잉크 밖으로 이만큼 검정이 번진다 */
let pass = 0, fail = 0;
const ok = (b, name, detail) => {
  console.log((b ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  b ? pass++ : fail++;
};

/* 페이지 안에서 쓰는 공용 헬퍼 — rect·글자 잉크(Range) */
const HELPERS = `
  const R = el => { const r = el.getBoundingClientRect();
    return { x1:+r.left.toFixed(2), x2:+r.right.toFixed(2), y1:+r.top.toFixed(2), y2:+r.bottom.toFixed(2),
             w:+r.width.toFixed(2), h:+r.height.toFixed(2) }; };
  const INK = el => { const rg = document.createRange(); rg.selectNodeContents(el);
    const rs = [...rg.getClientRects()]; if(!rs.length) return null;
    const x1 = Math.min(...rs.map(r=>r.left)), x2 = Math.max(...rs.map(r=>r.right));
    const y1 = Math.min(...rs.map(r=>r.top)), y2 = Math.max(...rs.map(r=>r.bottom));
    return { x1:+x1.toFixed(2), x2:+x2.toFixed(2), y1:+y1.toFixed(2), y2:+y2.toFixed(2), w:+(x2-x1).toFixed(2) }; };
`;

const openPass = async (page) => {
  await page.evaluate(() => { S.dia = 2e6; S.gold = 1e9; openShopPage(null, 'pass'); });
  await page.waitForTimeout(450);
  await page.evaluate(() => {
    try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
    const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    const li = document.getElementById('shopList'); li.scrollTop = li.scrollHeight;
  });
  await page.waitForTimeout(250);
};

/* 안내문 띠를 캡처해 페이지로 되돌리고 «찍힌» 흰 잉크의 좌우 끝을 잰다(350 처방) */
async function paintedInk(page, band, H) {
  const y = Math.max(0, Math.floor(band.y1 - 10));
  const clip = { x: 0, y, width: 1080, height: Math.min(H - y, Math.ceil(band.h) + 20) };
  const b64 = (await page.screenshot({ clip })).toString('base64');
  return page.evaluate(async ({ b64, w, h }) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    let x1 = 1e9, x2 = -1e9, n = 0;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const i = (yy * w + xx) * 4;
      if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) { n++; if (xx < x1) x1 = xx; if (xx > x2) x2 = xx; }
    }
    return { x1, x2, n };
  }, { b64, w: clip.width, h: clip.height });
}

(async () => {
  const browser = await launch(chromium);
  const errs = [];

  /* ── [A]~[D] · [F] 두 프레임 ─────────────────────────────────────── */
  for (const H of [2280, 1600]) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push('H' + H + ' ' + e));
    page.on('console', m => { if (m.type() === 'error') errs.push('H' + H + ' ' + m.text()); });
    await page.goto(URL);
    await page.waitForTimeout(900);
    await openPass(page);

    console.log('');
    console.log('[A/B/C/D] 프레임 1080×' + H);

    const st = await page.evaluate(`(() => { ${HELPERS}
      const bts = [...document.querySelectorAll('.pv-bt')];
      const stabs = document.querySelector('#shopw .stabs');
      return {
        bt: bts.map(el => ({ txt: el.textContent.trim(), rect: R(el), ink: INK(el) })),
        pvd: [...document.querySelectorAll('.pvc>.pvd')].map(el => ({ txt: el.textContent.trim(), rect: R(el), ink: INK(el) })),
        buy: [...document.querySelectorAll('.pvc>.bt')].map(el => R(el)),
        rb:  [...document.querySelectorAll('.pvc>.rb')].map(el => R(el)),
        art: [...document.querySelectorAll('.pvc>.art')].map(el => R(el)),
        dia: PASS_ITEMS.map(q => fmt(q.dia)),
        stabs: stabs ? R(stabs) : null,
      };
    })()`);

    /* [A] 잉크가 상자 안 */
    st.bt.forEach((x, i) => {
      const l = x.ink ? +(x.ink.x1 - BOX.x1).toFixed(2) : -1;
      const r = x.ink ? +(BOX.x2 - x.ink.x2).toFixed(2) : -1;
      ok(!!x.ink && l >= 0 && r >= 0, 'A' + (i + 1) + ' H' + H + ' `.pv-bt` 잉크가 상자 111..969 안',
        '"' + x.txt.slice(0, 34) + '…" 여백 좌 ' + l + ' · 우 ' + r + 'px');
    });
    ok(st.bt.length >= 2, 'A0 H' + H + ' 하단 안내문 줄 수', st.bt.length + '줄');

    /* [B] 찍힌 픽셀 */
    const band = st.bt[st.bt.length - 1].rect;
    const px = await paintedInk(page, band, H);
    ok(px.n > 300 && px.x1 >= BOX.x1 - STROKE && px.x2 <= BOX.x2 + STROKE,
      'B1 H' + H + ' 찍힌 흰 잉크가 상자 안(테 ' + STROKE + 'px 여유)',
      'x ' + px.x1 + '..' + px.x2 + ' (' + px.n + 'px)');
    ok(px.x1 > 0 && px.x2 < 1079, 'B2 H' + H + ' 프레임 좌우 끝에 잉크가 닿지 않는다(=안 잘렸다)',
      'x ' + px.x1 + '..' + px.x2);

    /* [C] 서브탭과의 여유 */
    const gap = st.stabs ? +(st.stabs.y1 - band.y2).toFixed(2) : null;
    ok(gap !== null && gap >= 8, 'C1 H' + H + ' 안내문 하변 ↔ 서브탭 상변 ≥ 8px', gap + 'px');

    /* [D] 카드별 대체가 */
    ok(st.pvd.length === st.dia.length, 'D1 H' + H + ' `.pvd` 가 이용권 수만큼 있다',
      st.pvd.length + ' / ' + st.dia.length);
    ok(st.pvd.every((d, i) => d.txt.replace(/\s+/g, '').includes(st.dia[i].replace(/\s+/g, ''))),
      'D2 H' + H + ' 금액이 제품 상수(`PASS_ITEMS[].dia`)에서 나온다',
      st.pvd.map(d => d.txt).join(' / '));
    const outD = st.pvd.map(d => d.ink ? Math.max(+(d.rect.x1 - d.ink.x1).toFixed(2), +(d.ink.x2 - d.rect.x2).toFixed(2)) : 99);
    ok(outD.every(v => v <= 0), 'D3 H' + H + ' `.pvd` 잉크가 제 상자(308px) 안',
      '초과 ' + outD.join(' / ') + 'px');
    const hit = (a, c) => !(a.x2 <= c.x1 || a.x1 >= c.x2 || a.y2 <= c.y1 || a.y1 >= c.y2);
    const bad = [];
    st.pvd.forEach((d, i) => {
      st.buy.forEach((q, j) => { if (hit(d.rect, q)) bad.push('pvd' + i + '×원화버튼' + j); });
      st.rb.forEach((q, j) => { if (hit(d.rect, q)) bad.push('pvd' + i + '×리본' + j); });
      st.art.forEach((q, j) => { if (hit(d.rect, q)) bad.push('pvd' + i + '×일러스트' + j); });
    });
    ok(bad.length === 0, 'D4 H' + H + ' `.pvd` 가 원화 버튼·리본·일러스트와 겹침 0', bad.join(', ') || '0건');

    /* [A] 자동 축복 보유 상태 — 줄이 하나 늘고 문구가 바뀐다 */
    const own = await page.evaluate(`(() => { ${HELPERS}
      S.pass = S.pass || {}; S.pass.autoBlessUntil = Date.now() + PASS_ABLESS_DAYS * PASS_DAY_MS;
      renderShopPage();
      const li = document.getElementById('shopList'); li.scrollTop = li.scrollHeight;
      return { on: (typeof autoBlessOn === 'function') && autoBlessOn(),
               bt: [...document.querySelectorAll('.pv-bt')].map(el => ({ txt: el.textContent.trim(), rect: R(el), ink: INK(el) })) };
    })()`);
    if (own.on) {
      own.bt.forEach((x, i) => {
        const l = x.ink ? +(x.ink.x1 - BOX.x1).toFixed(2) : -1;
        const r = x.ink ? +(BOX.x2 - x.ink.x2).toFixed(2) : -1;
        ok(!!x.ink && l >= 0 && r >= 0, 'A' + (i + 1) + 'b H' + H + ' (자동 축복 보유) `.pv-bt` 잉크가 상자 안',
          '"' + x.txt.slice(0, 30) + '…" 여백 좌 ' + l + ' · 우 ' + r + 'px');
      });
    } else {
      ok(false, 'Ab H' + H + ' 자동 축복 보유 상태를 만들지 못했다(자가 그 분기를 못 본다)');
    }
    await page.evaluate(() => { if (S.pass) delete S.pass.autoBlessUntil; renderShopPage(); });

    await ctx.close();
  }

  /* ── [E] 이름·금액이 늘어도 안 잘린다 ────────────────────────────── */
  console.log('');
  console.log('[E] 이름 최장 · 금액 9자리로 다시 그려도 안 잘린다(등재문 ②)');
  const ctxE = await browser.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const pageE = await ctxE.newPage();
  pageE.on('pageerror', e => errs.push('E ' + e));
  await pageE.goto(URL);
  await pageE.waitForTimeout(900);
  await openPass(pageE);
  const E = await pageE.evaluate(`(() => { ${HELPERS}
    const before = INK([...document.querySelectorAll('.pv-bt')].pop());
    const keepN = PASS_ITEMS.map(q => q.n), keepD = PASS_ITEMS.map(q => q.dia);
    PASS_ITEMS.forEach(q => { q.n = '아주아주긴이용권이름스무자넘김'; q.dia = 999999999; });
    renderShopPage();
    const li = document.getElementById('shopList'); li.scrollTop = li.scrollHeight;
    const after = INK([...document.querySelectorAll('.pv-bt')].pop());
    const pvd = [...document.querySelectorAll('.pvc>.pvd')].map(el => ({ rect: R(el), ink: INK(el) }));
    PASS_ITEMS.forEach((q, i) => { q.n = keepN[i]; q.dia = keepD[i]; });
    renderShopPage();
    return { before, after, pvd };
  })()`);
  ok(Math.abs(E.after.w - E.before.w) < 0.5, 'E1 하단 줄 폭이 이용권 이름·금액에 안 딸린다(총론)',
    '수리 후 ' + E.before.w + ' → 이름/금액 확대 후 ' + E.after.w);
  ok(E.after.x1 >= BOX.x1 && E.after.x2 <= BOX.x2, 'E2 그 상태에서도 하단 줄이 상자 안',
    E.after.x1 + '..' + E.after.x2);
  const outE = E.pvd.map(d => d.ink ? Math.max(+(d.rect.x1 - d.ink.x1).toFixed(2), +(d.ink.x2 - d.rect.x2).toFixed(2)) : 99);
  ok(outE.every(v => v <= 0), 'E3 금액 9자리에서도 `.pvd` 잉크가 제 상자 안', '초과 ' + outE.join(' / ') + 'px');

  /* ── [R] 되돌림 시험 ──────────────────────────────────────────────── */
  console.log('');
  console.log('[R] 되돌림 시험 — 자가 실제로 무엇을 보는지');
  const R1 = await pageE.evaluate(`(() => { ${HELPERS}
    const el = [...document.querySelectorAll('.pv-bt')].pop();
    const keep = el.innerHTML;
    /* 수리 전 문자열 그대로 — 3종 이름 + 아이콘 + 금액을 한 줄로 */
    el.innerHTML = '결제 미연동 — 구매 시 '
      + PASS_ITEMS.map(q => q.n + ' ' + curIc('dia') + ' ' + fmt(q.dia)).join(' · ')
      + ' 로 대체 결제됩니다';
    const bad = INK(el), box = R(el);
    el.innerHTML = keep;
    const good = INK(el);
    return { bad, box, good };
  })()`);
  ok(R1.bad.x2 > BOX.x2, 'R1 옛 «3종 한 줄» 을 도로 주입하면 [A] 의 자가 빨개진다',
    '잉크 우끝 ' + R1.bad.x2 + ' > 상자 우변 ' + BOX.x2 + ' (초과 ' + (R1.bad.x2 - BOX.x2).toFixed(2) + 'px)');
  ok(R1.bad.x2 > 1080, 'R1b 그 줄은 프레임(1080) 밖으로도 나간다 = 주인이 본 잘림',
    '초과 ' + (R1.bad.x2 - 1080).toFixed(2) + 'px');
  ok(R1.good.x2 <= BOX.x2, 'R1c 되돌리면 도로 초록', '잉크 우끝 ' + R1.good.x2);

  const R2 = await pageE.evaluate(`(() => { ${HELPERS}
    const before = document.querySelectorAll('.pvc>.pvd').length;
    document.querySelectorAll('.pvc>.pvd').forEach(el => el.remove());
    const gone = document.querySelectorAll('.pvc>.pvd').length;
    renderShopPage();
    const back = document.querySelectorAll('.pvc>.pvd').length;
    return { before, gone, back };
  })()`);
  ok(R2.before === 3 && R2.gone === 0 && R2.back === 3,
    'R2 `.pvd` 를 지우면 [D] 의 자가 못 찾는다(헛초록 아님)',
    R2.before + ' → ' + R2.gone + ' → ' + R2.back);

  const R3 = await pageE.evaluate(`(() => { ${HELPERS}
    const hit = (a,c) => !(a.x2<=c.x1 || a.x1>=c.x2 || a.y2<=c.y1 || a.y1>=c.y2);
    const d = document.querySelector('.pvc>.pvd'), b = d.parentElement.querySelector('.bt');
    const before = hit(R(d), R(b));
    d.style.bottom = '60px';                     /* 버튼 위로 내려앉힌다 */
    const after = hit(R(d), R(b));
    d.style.bottom = '';
    return { before, after };
  })()`);
  ok(R3.before === false && R3.after === true,
    'R3 `.pvd` 를 버튼 위로 내리면 [D4] 겹침 탐지기가 실제로 잡는다',
    '원 자리 겹침 ' + R3.before + ' → 내린 뒤 ' + R3.after);

  ok(errs.length === 0, 'H1 콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await ctxE.close();
  await browser.close();
  const line = 'VERIFY477 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS');
  console.log('\n' + line);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
