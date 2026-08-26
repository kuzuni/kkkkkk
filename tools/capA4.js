/* A4 스킬 슬롯 — 캡처 하네스 (1080×2280, 2026-08-25 기준 해상도)
   실행: node tools/capA4.js <회차>
     → docs/review/A4-r<회차>.png       (전체 프레임 1080×2280)
     → docs/review/A4-r<회차>-crop.png  (슬롯 행만 잘라낸 확대 대조용)

   레퍼런스 `docs/ref/02-기본-메인-화면.jpg` 와 같은 «상태» 로 맞춘다:
     1번 = 활성(골드) · 2·3번 = 대기(시안) · 4~8번 = 잠금(회색 자물쇠)

   ⚠ 앞 세션들이 두 번 밟은 하네스 함정(review/A4-스킬슬롯.md 1·2회차):
     ① 잠금 슬롯에 쿨타임 오버레이를 강제하면 4·5번만 어두워져 «8칸 중 2칸이 다른 색» 오채점을 부른다.
     ② 대기 슬롯을 만들 때 `.ready` 만 벗기고 자물쇠 DOM 을 그대로 두면 «시안 링 + 흰 자물쇠» 가 된다.
   → 여기서는 **게임 코드 그대로 `buildSlots()` 로 만들고**(장착 3 + 빈칸 5), `drawSlots` 를 잠시 멈춘 뒤
     1번만 `.ready` 를 켠다. 쿨타임 판(`.cdv`)은 레퍼런스에 없으므로 전부 0% 로 둔다. */
const { chromium } = require('playwright');
const path = require('path');
const r = process.argv[2] || '1';
const out = path.resolve(__dirname, '../docs/review/A4-r' + r + '.png');
const outc = path.resolve(__dirname, '../docs/review/A4-r' + r + '-crop.png');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);
  /* 58 연출 파티클(#fxl)·60 쥬시 잔상은 정지 레퍼런스와 대조할 때 오염원이다 — 캡처에서만 끈다 */
  await p.addStyleTag({ content: '#fxl{display:none!important}' });

  await p.evaluate(() => {
    gmCloseAll(); closeModal();
    Object.assign(S, DEF());
    S.stage = 37; S.best = 37;
    /* 장착 3칸(레퍼런스와 같은 분포) — 나머지 5칸은 빈칸 = 잠금 */
    const ids = Object.keys(SK).slice(0, 3);
    S.eqSkill = ids.concat([null, null, null, null, null]).slice(0, 8);
    if (panelOpen) { panelOpen = false; syncPanel(); }
    uiDirty = true; renderUI(); drawHud(); drawTuto();
    buildSlots();
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    /* 게임 루프가 매 프레임 상태를 되돌리므로 채점 캡처 동안만 멈춘다 */
    window.drawSlots = function () {};
    const s = document.querySelectorAll('#slots .slot2');
    s.forEach((e, i) => { e.classList.toggle('ready', i === 0); });
    document.querySelectorAll('#slots .cdv').forEach(e => { e.style.height = '0%'; });
  });
  await p.waitForTimeout(250);
  await p.screenshot({ path: out });

  const geo = await p.evaluate(() => {
    const rc = e => { const b = e.getBoundingClientRect();
      return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const box = document.getElementById('slots');
    const sl = Array.prototype.slice.call(box.querySelectorAll('.slot2')).map(rc);
    return {
      slots: rc(box), tabbar: rc(document.getElementById('tabbar')),
      battlefoot: rc(document.getElementById('battlefoot')),
      hpwrap: rc(document.getElementById('hpwrap')), app: rc(document.getElementById('app')),
      slot: sl
    };
  });
  /* 대조용 크롭 — 슬롯 행 위아래로 60px 여유 */
  const y0 = Math.max(0, Math.round(geo.slots.y) - 60);
  await p.screenshot({ path: outc, clip: { x: 0, y: y0, width: 1080, height: Math.round(geo.slots.h) + 120 } });
  await b.close();
  console.log('CAPA4 r' + r + ' →', path.basename(out), '/', path.basename(outc), '(crop y0=' + y0 + ')');
  console.log('errors:', errs.length ? errs : 0);
  console.log(JSON.stringify(geo, null, 1));
})();
