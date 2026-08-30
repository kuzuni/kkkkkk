/* 작업 477 재현 — 10 상점 «이용권» 탭 하단 안내문(«결제 미연동 — …») 잘림.
 *
 * 338 규칙: 등재문의 처방을 따르기 전에 «주인이 본 그림» 을 픽셀로 먼저 재현한다.
 *
 * ⚑ 재현이 등재문을 **한 칸 정정했다**. 등재문은 «왼쪽 «결제 미연동» 앞과 오른쪽 «오프라인 보상
 *   증가» 뒤가 밖으로 나가 잘린다»(양쪽) 라고 적었지만, 실제로 잘리는 것은 **오른쪽 한쪽뿐**이다:
 *     · `.pv-bt` 상자 = x 111..969(폭 858) · `text-align:center` + `white-space:nowrap`
 *     · 수리 전 안내문 잉크 = x **111..1388.72**(폭 **1277.72**) — 상자보다 **419.72px** 넓다
 *     · 넘친 줄은 가운데가 아니라 **좌측 정렬**된다(A1 이 적어 둔 CSS 함정: 글리프 advance 보다
 *       좁은 박스의 `text-align:center` 는 넘칠 때 좌측으로 붙는다) ⇒ 왼끝은 상자 좌변 111 에
 *       딱 맞고 **오른쪽만** 프레임(1080)을 308.7px 넘어 잘린다.
 *     · 잘리는 주체는 `.pv-bt` 자신도 `#shopList`(가로 `overflow:hidden`)도 아닌 **둘 다**이고,
 *       리스트 상자가 프레임 폭과 같아(0..1080) 결과가 «프레임에서 잘린 그림» 으로 보인다.
 *   ⇒ 주인이 본 «오프라인 보상 증가» 뒤 잘림은 그대로 참이고, 왼쪽은 잘린 것이 아니라
 *     «가운데 정렬이 깨져 좌변에 붙은» 것이다. 처방(한 줄에 다 담지 않는다)은 어느 쪽이든 같다.
 *
 * 재는 것(프레임 2280 · 1600 둘 다):
 *   ① 수리 전 문자열을 그대로 주입해 잉크 bbox·프레임 초과분을 잰다(회귀용 — 문자열이 사라져도
 *      «3종을 한 줄에 이어 붙이면 넘친다» 는 사실은 이 스크립트가 계속 재현한다)
 *   ② 현행 `.pv-bt` 두 줄의 잉크가 858 상자 안인지
 *   ③ 찍힌 픽셀 — 안내문 띠를 캡처해 페이지로 되돌리고(350 처방) 흰 잉크의 실제 좌우 끝을 잰다
 *   ④ 카드별 대체가 `.pvd` 가 가격 버튼·리본과 안 겹치는지
 *
 * 실행: node tools/probe477.js
 */
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();
const path = require('path');

const FRAMES = [2280, 1600];
/* 수리 전 문자열 그대로 — 이용권 3종 이름 + 다이아 아이콘 + 금액을 한 줄에 이어 붙인 것 */
const OLD_HTML = items => '결제 미연동 — 구매 시 '
  + items.map(q => q.n + ' ' + q.ic + ' ' + q.v).join(' · ') + ' 로 대체 결제됩니다';

(async () => {
  const b = await launch(chromium);
  let pass = 0, fail = 0;
  const ck = (name, ok, msg) => { (ok ? pass++ : fail++); console.log((ok ? '  ok  ' : ' FAIL ') + name + (msg ? ' — ' + msg : '')); };

  for (const H of FRAMES) {
    const ctx = await b.newContext({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto('file://' + path.resolve(__dirname, '../index.html'));
    await p.waitForTimeout(900);

    await p.evaluate(() => { S.dia = 2e6; S.gold = 1e9; openShopPage(null, 'pass'); });
    await p.waitForTimeout(600);
    /* 유휴 루프·상시 연출 정지(LESSONS 28-③ · 51-③) */
    await p.evaluate(() => {
      try { if (window.raf) cancelAnimationFrame(window.raf); } catch (e) {}
      const v = document.getElementById('view'); if (v) v.style.visibility = 'hidden';
    });
    /* 안내문은 페이지 맨 아래다 — 스크롤을 끝까지 내려야 보인다 */
    await p.evaluate(() => { const li = document.getElementById('shopList'); li.scrollTop = li.scrollHeight; });
    await p.waitForTimeout(350);

    console.log('');
    console.log('═══ 프레임 1080×' + H + ' ═══');
    console.log('  pageerror: ' + errs.length + (errs.length ? ' — ' + errs[0] : ''));

    const base = await p.evaluate(() => {
      const R = el => { const r = el.getBoundingClientRect(); return { x1: +r.left.toFixed(2), x2: +r.right.toFixed(2), y1: +r.top.toFixed(2), y2: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
      const ink = el => {
        const rg = document.createRange(); rg.selectNodeContents(el);
        const rs = [...rg.getClientRects()];
        if (!rs.length) return null;
        const x1 = Math.min(...rs.map(r => r.left)), x2 = Math.max(...rs.map(r => r.right));
        return { x1: +x1.toFixed(2), x2: +x2.toFixed(2), w: +(x2 - x1).toFixed(2) };
      };
      const chain = el => {
        const out = []; let n = el.parentElement;
        while (n && n !== document.documentElement) {
          const cs = getComputedStyle(n);
          if (cs.overflowX !== 'visible') out.push(n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).trim().split(/\s+/).join('.') : '') + ' [' + cs.overflowX + '] ' + JSON.stringify(R(n)));
          n = n.parentElement;
        }
        return out;
      };
      const bts = [...document.querySelectorAll('.pv-bt')];
      return {
        items: PASS_ITEMS.map(q => ({ n: q.n, ic: curIc('dia'), v: fmt(q.dia) })),
        bt: bts.map(el => ({ txt: el.textContent.trim().slice(0, 70), rect: R(el), ink: ink(el), ws: getComputedStyle(el).whiteSpace })),
        chain: chain(bts[0]),
        pvd: [...document.querySelectorAll('.pvc>.pvd')].map(el => ({ txt: el.textContent.trim(), rect: R(el), ink: ink(el) })),
        buy: [...document.querySelectorAll('.pvc>.bt')].map(el => ({ txt: el.textContent.trim(), rect: R(el) })),
        rb: [...document.querySelectorAll('.pvc>.rb')].map(el => R(el)),
        stabs: (() => { const s = document.querySelector('.stabs'); return s ? R(s) : null; })(),
        list: R(document.getElementById('shopList')),
      };
    });

    console.log('  #shopList ' + JSON.stringify(base.list));
    console.log('  가로 클리핑 조상: ' + (base.chain.length ? '' : '없음'));
    base.chain.forEach(c => console.log('    · ' + c));
    console.log('  .pv-bt ' + base.bt.length + '줄(현행):');
    base.bt.forEach((x, i) => console.log('    [' + i + '] "' + x.txt + '"  상자 ' + x.rect.x1 + '..' + x.rect.x2
      + '  잉크 ' + (x.ink ? x.ink.x1 + '..' + x.ink.x2 + ' (w' + x.ink.w + ')' : '—')));
    console.log('  .pvd(카드별 대체가) ' + base.pvd.length + '개:');
    base.pvd.forEach((x, i) => console.log('    [' + i + '] "' + x.txt + '"  상자 ' + JSON.stringify(x.rect)
      + '  잉크 ' + (x.ink ? x.ink.x1 + '..' + x.ink.x2 : '—')));
    base.buy.forEach((x, i) => console.log('    [구매버튼 ' + i + '] "' + x.txt + '" ' + JSON.stringify(x.rect)));

    /* ---- ① 수리 전 문자열 주입 ---- */
    const old = await p.evaluate(html => {
      const el = document.querySelectorAll('.pv-bt');
      const t = el[el.length - 1];
      const keep = t.innerHTML;
      t.innerHTML = html;
      const r = t.getBoundingClientRect();
      const rg = document.createRange(); rg.selectNodeContents(t);
      const rs = [...rg.getClientRects()];
      const x1 = Math.min(...rs.map(q => q.left)), x2 = Math.max(...rs.map(q => q.right));
      const out = { box: { x1: +r.left.toFixed(2), x2: +r.right.toFixed(2) }, ink: { x1: +x1.toFixed(2), x2: +x2.toFixed(2), w: +(x2 - x1).toFixed(2) } };
      t.innerHTML = keep;
      return out;
    }, OLD_HTML(base.items));
    console.log('  ① 수리 전 한 줄 주입 — 상자 ' + old.box.x1 + '..' + old.box.x2
      + ' · 잉크 ' + old.ink.x1 + '..' + old.ink.x2 + ' (w' + old.ink.w + ')');
    ck('H' + H + ' ① 3종을 한 줄에 이어 붙이면 858 상자를 넘는다(등재문 가설)',
      old.ink.w > 858, '잉크 폭 ' + old.ink.w + ' > 858 (초과 ' + (old.ink.w - 858).toFixed(2) + 'px)');
    ck('H' + H + ' ① 그 줄은 프레임(1080) 오른쪽 밖으로 나간다 = 주인이 본 잘림',
      old.ink.x2 > 1080, '잉크 우끝 ' + old.ink.x2 + ' > 1080 (초과 ' + (old.ink.x2 - 1080).toFixed(2) + 'px)');
    ck('H' + H + ' ① 왼끝은 잘린 것이 아니라 상자 좌변에 붙은 것(등재문 정정)',
      Math.abs(old.ink.x1 - old.box.x1) < 1, '잉크 좌끝 ' + old.ink.x1 + ' ≈ 상자 좌변 ' + old.box.x1);

    /* ---- ② 현행 두 줄이 상자 안 ---- */
    const over = base.bt.map(x => x.ink ? Math.max(x.rect.x1 - x.ink.x1, x.ink.x2 - x.rect.x2) : -1);
    ck('H' + H + ' ② 현행 `.pv-bt` 두 줄 다 858 상자 안', over.every(v => v <= 0),
      '상자 초과 ' + over.map(v => v.toFixed(2)).join(' / ') + 'px');

    /* ---- ③ 찍힌 픽셀 ---- */
    const band = base.bt[base.bt.length - 1].rect;
    const clipY = Math.max(0, band.y1 - 10);
    const clip = { x: 0, y: clipY, width: 1080, height: Math.min(H - clipY, band.h + 20) };
    const shot = (await p.screenshot({ clip })).toString('base64');
    const px = await p.evaluate(async ({ b64, w, h }) => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, w, h).data;
      let x1 = 1e9, x2 = -1e9, n = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) { n++; if (x < x1) x1 = x; if (x > x2) x2 = x; }
      }
      return { x1, x2, n };
    }, { b64: shot, w: clip.width, h: Math.round(clip.height) });
    console.log('  ③ 찍힌 픽셀(흰 잉크) x ' + px.x1 + '..' + px.x2 + ' (' + px.n + 'px)');
    ck('H' + H + ' ③ 찍힌 잉크가 프레임 안쪽에서 끝난다(잘린 글자 없음)',
      px.x1 > 111 - 7 && px.x2 < 969 + 7, '좌 ' + px.x1 + ' · 우 ' + px.x2 + ' (상자 111..969, 테 6px)');

    /* ---- ④ 카드별 대체가가 버튼·리본과 안 겹친다 ---- */
    const hit = (a, c) => !(a.x2 <= c.x1 || a.x1 >= c.x2 || a.y2 <= c.y1 || a.y1 >= c.y2);
    let bad = [];
    base.pvd.forEach((d, i) => {
      base.buy.forEach((q, j) => { if (hit(d.rect, q.rect)) bad.push('pvd' + i + '×buy' + j); });
      base.rb.forEach((q, j) => { if (hit(d.rect, q)) bad.push('pvd' + i + '×rb' + j); });
    });
    ck('H' + H + ' ④ `.pvd` 3개가 가격 버튼·리본과 겹침 0', base.pvd.length === 3 && bad.length === 0,
      base.pvd.length + '개 · 겹침 ' + (bad.join(',') || '0'));

    if (base.stabs) console.log('  안내문 하변 ' + band.y2 + ' ↔ .stabs 상변 ' + base.stabs.y1
      + '  여유 ' + (base.stabs.y1 - band.y2).toFixed(2) + 'px');
    ck('H' + H + ' pageerror 0', errs.length === 0, errs[0] || '');

    await ctx.close();
  }

  await b.close();
  console.log('');
  console.log('PROBE477 ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
