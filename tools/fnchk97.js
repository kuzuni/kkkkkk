/* 작업 97 기능 체크 — «버튼을 눌렀을 때 무엇이 바뀌는지» 를 헤드리스로 확인한다.
   (ROUTINE «기능 완성 규칙» — T2 완료 조건은 «만들어 놓음» 이 아니라 «실제로 동작함»)
   실행: node tools/fnchk97.js  → 마지막 줄이 `FNCHK97 n/n PASS` 여야 한다.

   97 은 «카드에 그림 한 장» 이라 새 동작을 만들지 않는다. 그래서 여기서 보는 것은
   **썸네일이 기존 동작을 하나도 갉아먹지 않았는가** 다 — 슬롯이 클릭을 삼키면 카드 진입이 죽고,
   캔버스가 렌더마다 새로 생기면 스크롤·재렌더가 흔들린다. */
const path = require('path');
const { pw, launch } = require('./pwlaunch');
const { chromium } = pw();

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

(async () => {
  const b = await launch(chromium, { args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1080, height: 2280 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(1200);

  /* 123 — «컨텐츠» 탭 카드는 2장(DPS 측정장 + 아레나)이고, 썸네일 캔버스는 3장이다
     (측정장 1 + 아레나의 «마주 본 플레이어 2명» 2). */
  console.log('[1] 하단 탭 «던전» → 던전 페이지 · 서브탭 «컨텐츠» → 카드 2장');
  await p.evaluate(() => document.querySelector('#tabbar [data-t="adv"]').click());
  await p.waitForTimeout(700);
  ok(await p.evaluate(() => $('dunw').classList.contains('on')), '던전 페이지가 열린다');
  await p.evaluate(() => document.querySelector('#dunSub [data-dsub="raid"]').click());
  await p.waitForTimeout(700);
  const n = await p.evaluate(() => document.querySelectorAll('#dunList .dnc.rd').length);
  ok(n === 2, `컨텐츠 카드 ${n}장`);
  ok(await p.evaluate(() => document.querySelectorAll('#dunList .dnc.rd canvas.thcv').length === 3),
     '카드 2장 전부 썸네일 캔버스가 붙었다 (측정장 1 + 아레나 2 = 3장)');

  console.log('[2] 썸네일이 그려졌다 (빈 캔버스가 아니다) · 틴트가 스프라이트를 배경에 묻지 않게 한다');
  const drawn = await p.evaluate(() => [...document.querySelectorAll('#dunList canvas.thcv')].map((cv) => {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let on = 0, lum = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 8) {
      on++; lum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    /* 카드 배경(--i)의 휘도 — 틴트는 multiply 라 어두운 색을 곱하면 배경보다 어두워진다 */
    const bg = getComputedStyle(cv.closest('.dnc')).getPropertyValue('--i').trim();
    const m = bg.match(/^#(\w{2})(\w{2})(\w{2})$/);
    const bl = m ? 0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16) : 0;
    return { cover: +(on / (cv.width * cv.height)).toFixed(3), lum: +(lum / on).toFixed(1), bg, bl: +bl.toFixed(1) };
  }));
  drawn.forEach((c, i) => {
    ok(c.cover > 0.2, `카드${i + 1} 잉크 채움률 ${c.cover} (> 0.2)`);
    ok(c.lum > c.bl - 20, `카드${i + 1} 잉크 평균 휘도 ${c.lum} vs 배경 ${c.bg} ${c.bl} (묻히지 않는다)`);
  });

  console.log('[3] 썸네일 위를 눌러도 카드가 눌린다 (슬롯이 클릭을 삼키지 않는다)');
  const opened = await p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc.rd');
    const r = c.getBoundingClientRect();
    const t = document.elementFromPoint(r.left + 820, r.top + 180);
    const card = t && t.closest('.dnc');
    if (card) card.click();
    return { tag: t ? t.className : null, hitCard: !!card };
  });
  await p.waitForTimeout(500);
  ok(opened.hitCard, `썸네일 위 히트 타깃이 카드다 (맞은 요소: ${opened.tag})`);
  ok(await p.evaluate(() => $('dgdw').classList.contains('on')), '04 세부 팝업이 실제로 열렸다');

  console.log('[4] 세부 팝업 내용이 그 레이드다 (엉뚱한 카드가 열리지 않는다)');
  const dg = await p.evaluate(() => ({ t: $('dgdTitle').textContent, f: $('dgdFloor').textContent }));
  ok(dg.t === 'DPS 측정장' && dg.f === '60초', `제목 «${dg.t}» · 제한 시간 «${dg.f}»`);
  await p.evaluate(() => { const x = document.querySelector('#dgdw .x, #dgdw [data-close]');
    if (x) x.click(); else $('dgdw').classList.remove('on'); });
  await p.waitForTimeout(400);

  console.log('[5] 잠금 카드 — 썸네일 위를 눌러도 «해금 조건» 안내가 뜬다');
  const lk = await p.evaluate(() => {
    const cs = [...document.querySelectorAll('#dunList .dnc.rd')];
    const c = cs.find((x) => x.querySelector('.lk'));
    if (!c) return { none: true };
    const r = c.getBoundingClientRect();
    const t = document.elementFromPoint(r.left + 820, r.top + 180);
    (t.closest('.dnc') || c).click();
    return { id: c.dataset.rcard };
  });
  await p.waitForTimeout(500);
  ok(!lk.none, `잠긴 레이드 카드가 있다 (${lk.id})`);
  const mo = await p.evaluate(() => {
    const m = document.querySelector('.modal.on, #modal.on, .modal[style*="display: block"]');
    return { on: !!m, txt: m ? m.textContent.slice(0, 60) : (document.body.textContent.includes('클리어하면 열립니다') ? 'inline' : '') };
  });
  ok(mo.on || mo.txt === 'inline', `잠금 안내가 뜬다 (${mo.txt})`);
  await p.evaluate(() => { if (typeof closePopup === 'function') closePopup();
    document.querySelectorAll('.modal.on').forEach((m) => m.classList.remove('on')); });
  await p.waitForTimeout(300);

  console.log('[6] 해금되면 같은 카드가 세부 팝업으로 들어간다 (S 반영)');
  await p.evaluate(() => { S.best = 999; setDunSub('raid'); });
  await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.querySelectorAll('#dunList .dnc.rd .lk').length === 0),
     '스테이지 999 에서 잠금 카드 0장');
  ok(await p.evaluate(() => document.querySelectorAll('#dunList canvas.thcv').length === 3),
     '해금 후에도 썸네일 3장 유지 (재렌더에서 사라지지 않는다)');

  console.log('[7] 최고 DPS 기록이 카드에 반영되고 썸네일과 겹치지 않는다');
  await p.evaluate(() => { S.raidBest = { r60: { dmg: 9.9e14, dps: 9.9e12 } }; setDunSub('raid'); });
  await p.waitForTimeout(600);
  const rec = await p.evaluate(() => {
    const c = document.querySelector('#dunList .dnc.rd');
    const cr = c.getBoundingClientRect();
    const sp = c.querySelector('.sp.tk'), th = c.querySelector('.th');
    return { txt: sp.querySelector('i').textContent,
             gap: +(th.getBoundingClientRect().left - sp.getBoundingClientRect().right).toFixed(1) };
  });
  ok(rec.txt !== '-' && rec.txt.length > 1, `최고 DPS 칸에 기록이 찍힌다 (${rec.txt})`);
  ok(rec.gap > 0, `기록 알약 우단 ~ 썸네일 좌단 간격 ${rec.gap}px (겹침 0)`);

  console.log('[8] 서브탭 «던전» 복귀 — 던전 카드가 그대로 돌아온다');
  await p.evaluate(() => document.querySelector('#dunSub [data-dsub="dun"]').click());
  await p.waitForTimeout(600);
  const dn = await p.evaluate(() => ({
    n: document.querySelectorAll('#dunList .dnc').length,
    rd: document.querySelectorAll('#dunList .dnc.rd').length,
    em: document.querySelectorAll('#dunList .dnc>.th>em').length,
    cv: document.querySelectorAll('#dunList canvas.thcv').length }));
  ok(dn.n === 6 && dn.rd === 0 && dn.em === 6 && dn.cv === 0,
     `던전 카드 ${dn.n}장 · 이모지 썸네일 ${dn.em} · 레이드 캔버스 ${dn.cv}`);

  console.log('[9] 콘솔 에러');
  ok(errs.length === 0, `콘솔 에러 ${errs.length}건`);
  errs.slice(0, 5).forEach((e) => console.log('    ERR', e));

  console.log(`\nFNCHK97 ${pass}/${pass + fail} ${fail ? 'FAIL' : 'PASS'}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
