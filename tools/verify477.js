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
 *   [D] **588 이관** — 카드에 «다이아 대체가» 가 **0건**이다. 477 이 이 절에서 소유한 성질은
 *       «카드의 값은 카드 안에서 말한다(하단 줄에 안 이어 붙인다)» 였고, 588 이 그 값을 통째로
 *       없앴다(주인 «그 이용권들은 다이아로 못사게 하기»). 자리를 비우지 않고(333 처방) 반대
 *       방향으로 묻는다: `.pvd` 0개 · 카드/하단 어디에도 «대체» 문구 0건 · 그래도 가격 버튼은 살아 있다.
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
        diaField: PASS_ITEMS.filter(q => 'dia' in q).length,
        won: [...document.querySelectorAll('.pvc>.bt>i')].map(el => el.textContent),
        pageTxt: (document.getElementById('shopList') || document.body).innerText,
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

    /* [D] 588 — «다이아 대체가» 가 화면 어디에도 없다 */
    ok(st.pvd.length === 0, 'D1 H' + H + ' 588 — `.pvd`(다이아 대체가) 0개', st.pvd.length + '개');
    ok(st.diaField === 0, 'D2 H' + H + ' 588 — 상품표에 `dia` 필드 0건', st.diaField + '건');
    ok(!/대체/.test(st.pageTxt), 'D3 H' + H + ' 588 — 이용권 탭 글자에 «대체» 0건',
      (st.pageTxt.match(/[^\s]{0,6}대체[^\s]{0,6}/g) || []).join(' / ') || '0건');
    /* ⚠ 짝 — 588 이 «못 사는 상품» 을 만들지 않았다는 것까지가 이 절이다(589 가 그 자리를 받는다) */
    ok(st.buy.length === 3 && st.won.every(t => /원$/.test(t.trim())),
      'D4 H' + H + ' 588 이후에도 가격 버튼 3개가 원화로 살아 있다', st.won.join(' | '));

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
    /* 588 — 늘릴 것이 «이름·원화가» 로 줄었다(대체가가 없다). 하단 줄이 그 둘에도 안 딸리는지 본다 */
    /* 588 이관 — «카드의 값은 카드 안에서 말한다» 를 재는 상자는 이제 카드(.pvc) 다.
       버튼 상자로 재면 라벨 잉크가 원래부터 좌우 7.3px 씩 넘는다(테 6px + 자간 — 588 이전에도
       같았다). 그건 이 작업이 만든 것도, 477 이 소유한 것도 아니다. */
    const buyInk0 = [...document.querySelectorAll('.pvc>.bt')]
      .map(el => ({ rect: R(el.closest('.pvc')), ink: INK(el) }));
    const keepN = PASS_ITEMS.map(q => q.n), keepW = PASS_ITEMS.map(q => q.won);
    PASS_ITEMS.forEach(q => { q.n = '아주아주긴이용권이름스무자넘김'; q.won = 999999999; });
    renderShopPage();
    const li = document.getElementById('shopList'); li.scrollTop = li.scrollHeight;
    const after = INK([...document.querySelectorAll('.pv-bt')].pop());
    const buyInk = [...document.querySelectorAll('.pvc>.bt')].map(el => ({ rect: R(el), ink: INK(el) }));
    PASS_ITEMS.forEach((q, i) => { q.n = keepN[i]; q.won = keepW[i]; });
    renderShopPage();
    return { before, after, buyInk, buyInk0 };
  })()`);
  ok(Math.abs(E.after.w - E.before.w) < 0.5, 'E1 하단 줄 폭이 이용권 이름·금액에 안 딸린다(총론)',
    '수리 후 ' + E.before.w + ' → 이름/금액 확대 후 ' + E.after.w);
  ok(E.after.x1 >= BOX.x1 && E.after.x2 <= BOX.x2, 'E2 그 상태에서도 하단 줄이 상자 안',
    E.after.x1 + '..' + E.after.x2);
  /* 588 이관 — 옛 E3 은 `.pvd`(대체가) 잉크가 제 308px 상자 안인지를 봤다. 그 노드가 사라졌으니
     같은 성질(«카드의 값은 카드 안에서 다 말해진다»)을 **가격 버튼**으로 옮겨 잰다.
     ⚠ 9자리 확대판은 여기 안 쓴다 — `.pvd` 는 `nowrap` + 고정 308 상자라 9자리를 견뎠지만
        `.pvc>.bt` 는 그런 상자가 아니고(버튼 라벨), 실제 원화가는 5자리다. 없는 상품으로
        만든 초과폭을 결함으로 세면 «그 버튼을 고쳐라» 라는 거짓 신호가 된다(A3-ⓑ 교훈).
        9자리에서 지켜야 하는 것은 **하단 총론 줄**이고 그건 E1·E2 가 이미 잰다. */
  const outE = E.buyInk0.map(d => d.ink ? Math.max(+(d.rect.x1 - d.ink.x1).toFixed(2), +(d.ink.x2 - d.rect.x2).toFixed(2)) : 99);
  ok(outE.every(v => v <= 0), 'E3 실제 원화가에서 가격 잉크가 **카드** 안', '초과 ' + outE.join(' / ') + 'px');
  /* 그 «9자리» 실측은 버리지 않고 기록으로 남긴다 — 상품이 커지면 무엇이 먼저 깨지는지의 자료다 */
  const out9 = E.buyInk.map(d => d.ink ? +(Math.max(d.rect.x1 - d.ink.x1, d.ink.x2 - d.rect.x2)).toFixed(2) : 99);
  console.log('  (참고) 원화가 9자리 가정 시 가격 버튼 잉크가 버튼 상자를 넘는 폭: ' + out9.join(' / ')
    + 'px — 실제 5자리에서는 7.32px(테 6 + 자간)이고, 하단 총론 줄은 E1·E2 로 불변이다');

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

  /* 588 이관 — 옛 R2·R3 은 `.pvd` 가 **있다**는 전제 위에 서 있었다. 그 전제가 죽었으므로
     되돌림도 방향을 뒤집는다: 대체가를 **도로 주입**하면 새 [D] 가 실제로 빨개지는가. */
  const R2 = await pageE.evaluate(`(() => { ${HELPERS}
    const c = document.querySelector('.pvc');
    const before = { pvd: document.querySelectorAll('.pvc>.pvd').length,
                     txt: /대체/.test(document.getElementById('shopList').innerText) };
    const el = document.createElement('div');
    el.className = 'pvd'; el.textContent = '대체 ' + curIc('dia') + ' 75,000';
    c.appendChild(el);
    const hurt = { pvd: document.querySelectorAll('.pvc>.pvd').length,
                   txt: /대체/.test(document.getElementById('shopList').innerText) };
    renderShopPage();
    const back = { pvd: document.querySelectorAll('.pvc>.pvd').length,
                   txt: /대체/.test(document.getElementById('shopList').innerText) };
    return { before, hurt, back };
  })()`);
  ok(R2.before.pvd === 0 && R2.before.txt === false,
    'R2 588 — 지금은 `.pvd` 0개 · «대체» 문구 0건', JSON.stringify(R2.before));
  ok(R2.hurt.pvd === 1 && R2.hurt.txt === true,
    'R2b 대체가를 도로 주입하면 [D1]·[D3] 이 그것을 본다(헛초록 아님)', JSON.stringify(R2.hurt));
  ok(R2.back.pvd === 0 && R2.back.txt === false,
    'R2c 재렌더하면 도로 초록 — 제품이 그것을 다시 그리지 않는다', JSON.stringify(R2.back));

  /* 589 되돌림 — 588 이 «못 사는 상품» 을 만들지 않았음을 실동작으로 못박는다.
     ⚠ 다이아를 **0** 으로 두고 산다: 옛 경로가 되살아나면 «부족» 으로 막혀 여기가 빨개진다. */
  const R3 = await pageE.evaluate(`(() => {
    S.pass = { prem:{}, got:{}, noAds:false, autoBlessUntil:0, offPlus:false, dailyAt:{} };
    S.dia = 0; S.mailx = []; S.mailSeq = 0; S.mail = {};
    const p0 = S.cnt.paid | 0, r = buyPass('noads');
    return { r, dia: S.dia, own: passOwned('noads'), once: (PASS_ITEMS.find(x => x.id === 'noads') || {}).once | 0,
             dPaid: (S.cnt.paid | 0) - p0, mails: (S.mailx || []).length };
  })()`);
  /* 697 이관 — 지급이 우편 한 통에서 «그 틱의 즉시 보석» 으로 옮겨졌다. 588 축(«부족으로 안 막힌다»)은
     다이아 0 에서 출발해 +once 로 끝나는 이 등식이 그대로 진다. */
  ok(R3.r === true && R3.dia === R3.once && R3.own === true && R3.dPaid === 1 && R3.mails === 0,
    'R3 589·697 — 다이아 0 에서도 구매된다(결제 1건 · 즉시 보석 +once · 새 우편 0 · 권한 즉시)', JSON.stringify(R3));

  ok(errs.length === 0, 'H1 콘솔·페이지 에러 0건', errs.slice(0, 3).join(' | ') || '0건');

  await ctxE.close();
  await browser.close();
  const line = 'VERIFY477 ' + pass + '/' + (pass + fail) + ' ' + (fail ? 'FAIL' : 'PASS');
  console.log('\n' + line);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
